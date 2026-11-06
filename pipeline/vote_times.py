#!/usr/bin/env python3
"""Время голосования (до секунды) со страницы депутата Абакарова на vote.duma.gov.ru.
Источник: http://vote.duma.gov.ru/?convocation=AAAAAAA9&deputy=99113478 (пагинация page=,
фильтр from/to). Не выдумывать: если сайт недоступен — лог и выход.
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

def fetch_vote_direct(vid):
    """Запасной способ: прямой запрос к /vote/{id}."""
    for scheme in ('http', 'https'):
        url = f'{scheme}://vote.duma.gov.ru/vote/{vid}'
        out = f'/tmp/vt_{vid}_{scheme}.html'
        if C.fetch(url, out, 60):
            html = open(out, errors='ignore').read()
            m = re.search(r'(\d\d\.\d\d\.\d{4}).{0,80}?(\d\d:\d\d:\d\d)', html)
            if m:
                return m.group(1), m.group(2)
    return None, None

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

if __name__ == '__main__':
    src = C.read_canvas()
    VT = C.get_block(src, 'VT')
    days = sys.argv[1:]
    need = {}
    for d, vid, *_ in C.votes(src):
        if days and d not in days:
            continue
        need[vid] = d
    mp, status = load_all(set(need.values()) if need else None)
    if mp is None:
        C.log('vote_time_fail.log', f'ABORT: {status}')
        print('FAIL:', status)
        # запасной режим: пробуем по одному голосованию
        mp = {}
        for vid, want_day in need.items():
            day, tm = fetch_vote_direct(vid)
            if day and tm and day == want_day:
                mp[vid] = (day, tm)
            else:
                C.log('vote_time_fail.log', f'{want_day} {vid}: нет данных (прямой запрос)')
        if not mp:
            sys.exit(1)
        status = 'fallback direct'
    n = 0
    for vid, want_day in need.items():
        if vid not in mp:
            C.log('vote_time_fail.log', f'{want_day} {vid}: нет на странице депутата')
            continue
        day, tm = mp[vid]
        if day != want_day:
            C.log('vote_time_fail.log', f'{want_day} {vid}: день на странице {day} ≠ {want_day}')
            continue
        if VT.get(vid) != tm:
            VT[vid] = tm
            n += 1
    C.write_canvas(C.set_block(src, 'VT', 'const VT: Record<string, string>', VT))
    print('status:', status)
    print('новых/обновленных времен:', n, 'всего VT:', len(VT), 'нужно было:', len(need))
