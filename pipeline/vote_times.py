#!/usr/bin/env python3
"""Время голосования (до секунды) для блока VT. Порядок источников (все официальные, vote.duma.gov.ru):
  1) days/<день>.json, записанный votes_day.py (время со страницы самого голосования /vote/<id>);
  2) страница самого голосования http://vote.duma.gov.ru/vote/<id> (поле даты/времени справки);
  3) ЗАПАСНОЙ путь — страница депутата Абакарова ?convocation=AAAAAAA9&deputy=99113478 (пагинация page=,
     фильтр from/to); работает, только если депутат был в списке (если отсутствовал — времени там нет).
Не выдумывать: если ни один источник не дал время с совпадающей датой — лог vote_time_fail.log.
Запуск: python3 vote_times.py [DD.MM.YYYY ...]"""
import sys, os, re, time
sys.path.insert(0, os.path.dirname(__file__)); import common as C

DEPUTY = '99113478'
CONVOC = 'AAAAAAA9'
UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
]

def parse_page(html):
    """[(day, vid, time)] from deputy list HTML."""
    cur, rows = None, []
    for m in re.finditer(
        r'class="date-head"><div>(\d\d\.\d\d\.\d{4})</div>|class="time">(\d\d:\d\d:\d\d)</div>\s*<a href="/vote/(\d+)"',
        html,
    ):
        if m.group(1):
            cur = m.group(1)
        elif cur:
            rows.append((cur, m.group(3), m.group(2)))
    pages = [int(x) for x in re.findall(r'[?&]page=(\d+)', html)]
    return rows, (max(pages) if pages else 1)

def fetch_deputy(page=1, day_from='', day_to='', tries=3):
    """Fetch one deputy page via http then https; UAs via env for fetch.sh (fixed UA inside).
    Returns html or ''."""
    qs = f'convocation={CONVOC}&deputy={DEPUTY}&sort=date_desc'
    if page > 1:
        qs += f'&page={page}'
    if day_from:
        qs += f'&from={day_from}'
    if day_to:
        qs += f'&to={day_to}'
    for scheme in ('http', 'https'):
        url = f'{scheme}://vote.duma.gov.ru/?{qs}'
        out = f'/tmp/vt_dep_p{page}_{scheme}.html'
        for attempt in range(tries):
            if C.fetch(url, out, 90):
                html = open(out, errors='ignore').read()
                if '/vote/' in html and 'date-head' in html:
                    return html
            time.sleep(1.5 * (attempt + 1))
    return ''

def load_all(need_days=None):
    """Paginate deputy pages; optionally narrow by from/to covering need_days."""
    day_from = day_to = ''
    if need_days:
        # DD.MM.YYYY lexicographic sort wrong — sort by ymd
        def key(d):
            dd, mm, yy = d.split('.')
            return (yy, mm, dd)
        days = sorted(need_days, key=key)
        day_from, day_to = days[0], days[-1]
    html = fetch_deputy(1, day_from, day_to)
    if not html:
        return None, 'deputy page unreachable (http+https, retries, RU proxies)'
    rows, max_page = parse_page(html)
    all_rows = list(rows)
    for p in range(2, max_page + 1):
        h = fetch_deputy(p, day_from, day_to)
        if not h:
            C.log('vote_time_fail.log', f'page {p}: не загрузилась')
            continue
        rows, _ = parse_page(h)
        all_rows.extend(rows)
        time.sleep(0.4)  # polite
    # map vid -> (day, time); last wins
    mp = {vid: (day, tm) for day, vid, tm in all_rows}
    return mp, f'ok pages~{max_page} rows={len(all_rows)} unique={len(mp)}'

def from_vote_pages(need):
    """1) days/*.json от votes_day.py; 2) /vote/<id>. → {vid: (day, time, src)}"""
    import json, votes_day as V
    mp = {}
    for d in set(need.values()):
        jp = os.path.join(V.DAYS_DIR, f'{d}.json')
        if os.path.exists(jp):
            try:
                for v in json.load(open(jp)).get('votes', []):
                    if v.get('time') and v['id'] in need:
                        mp[v['id']] = (d, v['time'], 'days/' + d + '.json')
            except ValueError:
                C.log('vote_time_fail.log', f'{jp}: битый json')
    rest = [vid for vid in need if vid not in mp]
    if rest:
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=6) as ex:
            for vid, r in zip(rest, ex.map(V.fetch_vote, rest)):
                if r:
                    mp[vid] = (r['day'], r['time'], 'vote/' + vid)
    return mp

if __name__ == '__main__':
    src = C.read_canvas()
    VT = C.get_block(src, 'VT')
    days = sys.argv[1:]
    need = {}
    for d, vid, *_ in C.votes(src):
        if days and d not in days:
            continue
        need[vid] = d
    mp = {}
    if need:
        for vid, (day, tm, srcname) in from_vote_pages(need).items():
            if day == need[vid]:
                mp[vid] = (day, tm)
            else:
                C.log('vote_time_fail.log', f'{need[vid]} {vid}: на странице голосования дата {day}')
    miss = {vid: d for vid, d in need.items() if vid not in mp}
    status = f'страницы голосований: {len(mp)}/{len(need)}'
    if miss:
        # запасной путь: страница депутата
        dep, st = load_all(set(miss.values()))
        status += f'; запасной (депутат): {st}'
        if dep is None:
            C.log('vote_time_fail.log', f'запасной путь (депутат) недоступен: {st}')
        else:
            for vid, want_day in miss.items():
                if vid in dep and dep[vid][0] == want_day:
                    mp[vid] = dep[vid]
    n = 0
    for vid, want_day in need.items():
        if vid not in mp:
            C.log('vote_time_fail.log', f'{want_day} {vid}: нет данных (страница голосования и страница депутата)')
            continue
        day, tm = mp[vid]
        if VT.get(vid) != tm:
            VT[vid] = tm
            n += 1
    C.write_canvas(C.set_block(src, 'VT', 'const VT: Record<string, string>', VT))
    print('status:', status)
    print('новых/обновленных времен:', n, 'всего VT:', len(VT), 'нужно было:', len(need), 'без времени:', len(need) - len(mp))
    if need and not mp:
        sys.exit(1)
