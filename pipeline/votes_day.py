#!/usr/bin/env python3
"""Шаг 1 ежедневного прогона: голосования Госдумы за день с vote.duma.gov.ru → days/ДД.ММ.ГГГГ.json → DATA (+ VT).

Источник (только официальный):
  список дня   http://vote.duma.gov.ru/?from=ДД.ММ.ГГГГ&to=ДД.ММ.ГГГГ[&page=N]  (по 20 голосований на страницу)
  голосование  http://vote.duma.gov.ru/vote/<id>  — дата и время, итог «за/против/воздержались/не голосовали»,
               поимённые результаты (deputiesData) → разбивка по фракциям.
Загрузка — через pipeline/fetch.sh (RU-прокси, см. $GD_DUMA/lists). Ничего не выдумываем: если страница не загрузилась
или не разобралась, голосование записывается в gaps[] и в DATA НЕ попадает; при недоступном списке дня — выход 2.

Запуск:
  python3 votes_day.py 11.11.2026                  # один день: days/11.11.2026.json + DATA + VT
  python3 votes_day.py 10.11.2026 11.11.2026       # диапазон from..to (каждый день отдельно)
  python3 votes_day.py 11.11.2026 --dry-run        # только загрузить, разобрать и сравнить с DATA; canvas не трогать
  python3 votes_day.py 11.11.2026 --canvas путь.tsx # другой файл canvas (по умолчанию $CANVAS = $GD_ROOT/src/canvas.tsx)

Правила записи в DATA (аддитивно и идемпотентно):
  * строка с уже существующим id голосования не меняется (расхождения цифр — только в отчёт out/logs/votes_day_<день>.json);
  * новые id вставляются в строку дня по порядку id; Суть, TRACK, ZTAG, постановления и прочие блоки не трогаются;
  * день без голосований (официально «ничего не найдено») в DATA не добавляется — только days/<день>.json с novotes=1.
VT: время берётся со страницы самого голосования (/vote/<id>), при её недоступности — из официального списка дня;
  запасной путь через страницу депутата остаётся в vote_times.py.
Формат строки DATA: id|номер|краткое название|чтение|1/0 принят|за/против/возд/не голос.|фракции ЕР;КПРФ;ЛДПР;НЛ;СРЗП;Вне
"""
import sys, os, re, json, time, argparse, datetime as dt, html as H
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

BASE = 'http://vote.duma.gov.ru'
F = ['ЕР', 'КПРФ', 'ЛДПР', 'НЛ', 'СРЗП', 'Вне']
DEF = {'ЕР': 350, 'КПРФ': 37, 'ЛДПР': 24, 'НЛ': 20, 'СРЗП': 17, 'Вне': 2}
FMAP = {'ЕР': 'ЕР', 'КПРФ': 'КПРФ', 'ЛДПР': 'ЛДПР', 'НЛ': 'НЛ', 'СР': 'СРЗП', 'СРЗП': 'СРЗП', 'Вне фракций': 'Вне'}
SEATS = 450
DAYS_DIR = os.environ.get('GD_DAYS') or os.path.join(C.DUMA, 'days')
CACHE = os.path.join(C.OUT, 'cache', 'vote')   # итоги голосований неизменны → кэшируем только разобранные страницы

# ---------- разбор ----------
def parse_list(h):
    """Страница списка дня → (rows, max_page, empty). rows: dict(day,time,id,title,ok,for,against,abst)."""
    empty = 'ничего не найдено' in h
    rows, cur = [], None
    for m in re.finditer(r'class="date-head"><div>(\d\d\.\d\d\.\d{4})</div>|<div class="item[^"]*"><div>(.*?)</div></div>', h, re.S):
        if m.group(1):
            cur = m.group(1); continue
        b = m.group(2)
        t = re.search(r'class="time">(\d\d:\d\d:\d\d)</div>\s*<a href="/vote/(\d+)">(.*?)</a>', b, re.S)
        if not (t and cur):
            continue
        r = {'day': cur, 'time': t.group(1), 'id': t.group(2), 'title': H.unescape(re.sub(r'\s+', ' ', t.group(3))).strip()}
        okm = re.search(r'<b>(Принят|Не принят|Отклонен|Отклонён)[^<]*</b>', b)
        r['ok'] = (okm.group(1) == 'Принят') if okm else None
        n = re.search(r'За:\s*(\d+)', b); a = re.search(r'Против:\s*(\d+)', b); w = re.search(r'Воздержалось:\s*(\d+)', b)
        r['for'], r['against'], r['abst'] = [int(x.group(1)) if x else None for x in (n, a, w)]
        rows.append(r)
    pages = [int(x) for x in re.findall(r'[?&](?:amp;)?page=(\d+)', h)]
    return rows, (max(pages) if pages else 1), empty

def parse_vote(h):
    """Страница /vote/<id> → dict(day,time,title,ok,total[4],fr{F:{v[4],size}}) или None, если это не справка о голосовании."""
    if 'Справка о результатах голосования' not in h:
        return None
    d = {}
    m = re.search(r'class="date-p">\s*<span>(\d\d\.\d\d\.\d{4})\s+(\d\d:\d\d:\d\d)</span>', h)
    if not m:
        return None
    d['day'], d['time'] = m.group(1), m.group(2)
    t = re.search(r'<h1>(.*?)</h1>', h, re.S)
    d['title'] = H.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', t.group(1)))).strip() if t else ''
    r = re.search(r'Результат голосования:\s*<b class="(\w+)">\s*([^<(]+)', h)
    d['ok'] = None if not r else r.group(2).strip().lower().startswith('принят')
    def num(lbl):
        x = re.search(r'<b>' + lbl + r':</b>\s*(\d+)', h)
        return int(x.group(1)) if x else None
    tot = [num('За'), num('Против'), num('Воздержалось'), num('Не голосовало')]
    if None in tot:
        return None
    d['total'] = tot
    dm = re.search(r'deputiesData\s*=\s*(\[.*?\]);', h, re.S)
    fr = {}
    if dm:
        try:
            deps = json.loads(dm.group(1))
        except ValueError:
            deps = []
        for x in deps:
            k = FMAP.get(x.get('faction', ''))
            if not k:
                fr.setdefault('?', 0); continue
            e = fr.setdefault(k, {'v': [0, 0, 0, 0], 'size': 0})
            e['size'] += 1
            i = {'for': 0, 'against': 1, 'abstain': 2}.get(x.get('result'), 3)
            e['v'][i] += 1
        if '?' in fr:          # неизвестная фракция — разбивку не публикуем, чтобы не врать
            fr = {}
        # сверка с общим итогом (за/против/возд. должны совпасть)
        if fr and [sum(fr[k]['v'][i] for k in fr) for i in range(3)] != tot[:3]:
            fr = {}
    d['fr'] = {k: fr[k] for k in F if k in fr} if fr and all(k in fr for k in F) else {}
    return d

# ---------- поля строки DATA ----------
QRE = re.compile(r'^О проекте (федерального закона|постановления Государственной Думы|федерального конституционного закона)\s*(№\s*([\d-]+))?\s*')
def split_title(title):
    """'(первое чтение) О проекте федерального закона № 1-9 "…"' → (reading, doc, short, q)."""
    m = re.match(r'^\(([^)]*)\)\s*', title)
    reading = m.group(1).strip() if m else ''
    q = title[m.end():] if m else title
    if reading == 'к отклонению':            # как в DATA: чтение законопроекта, ok=0 (отклонён), UI покажет «За отклонение»
        reading = 'к отклонению:' + ('2-е' if re.search(r'принят в 1 чтении', q) else '1-е')
    reading = {'первое чтение': '1-е', 'второе чтение': '2-е', 'третье чтение': '3-е', '': '—'}.get(reading, reading).replace('ё', 'е').replace('Ё', 'Е')
    qm = QRE.match(q)
    if qm and qm.group(3):
        doc = ('Пост. ' if qm.group(1).startswith('постановления') else '') + qm.group(3)
    else:
        doc = '—'
    return reading, doc, short(q), q

def short(q, n=97):
    m = QRE.match(q)
    s = q[m.end():] if m else q
    s = re.sub(r'\s*\((?:первое|второе|третье) чтение\)\s*$', '', s.strip())   # дубль чтения в конце названия
    if s[:1] in '"«“':                       # внешние кавычки названия: «"Название" (в части …)» → «Название (в части …)»
        s = s[1:]
        if s.count('"') % 2:                 # непарная закрывающая кавычка — снять последнюю
            k = s.rfind('"'); s = s[:k] + s[k + 1:]
        s = s.rstrip('»”')
    s = re.sub(r'\s+', ' ', s).strip().replace('|', '/').replace('`', "'").replace('${', '$ {')
    return (s[:n - 2].rstrip() + '…') if len(s) > n else s

def data_line(v):
    fr = ';'.join('/'.join(map(str, v['fr'][k]['v'])) + ('' if v['fr'][k]['size'] == DEF[k] else ':' + str(v['fr'][k]['size'])) for k in F) if v.get('fr') else ''
    return '|'.join([v['id'], v['doc'], v['short'], v['reading'], '1' if v['ok'] else '0', '/'.join(map(str, v['total'])), fr])

# ---------- загрузка ----------
def get(url, out, deadline=150, tries=2):
    for a in range(tries):
        if C.fetch(url, out, deadline):
            return open(out, errors='ignore').read()
        time.sleep(2 * (a + 1))
    return ''

def fetch_list(day):
    """Все страницы списка дня. Возвращает (rows, status) ; rows=None — список недоступен."""
    tmp = f'/tmp/votes_day_{day}'
    url = f'{BASE}/?from={day}&to={day}'
    h = get(url, f'{tmp}_p1.html')
    if not h or ('date-head' not in h and 'ничего не найдено' not in h):
        return None, f'список дня недоступен: {url}'
    rows, maxp, empty = parse_list(h)
    if empty and not rows:
        return [], 'novotes'
    lost = []
    for p in range(2, maxp + 1):
        hp = get(f'{url}&page={p}', f'{tmp}_p{p}.html')
        r, _, _ = parse_list(hp) if hp else ([], 0, False)
        if not r:
            lost.append(p)
        rows.extend(r)
    rows = [r for r in rows if r['day'] == day]
    uniq = {}
    for r in rows:
        uniq.setdefault(r['id'], r)
    st = f'ok pages={maxp} votes={len(uniq)}' + (f' LOST pages={lost}' if lost else '')
    return list(uniq.values()), st

def fetch_vote(vid):
    os.makedirs(CACHE, exist_ok=True)
    cp = os.path.join(CACHE, f'{vid}.html')
    if os.path.exists(cp):
        d = parse_vote(open(cp, errors='ignore').read())
        if d:
            return d
    out = f'/tmp/votes_day_v{vid}.html'
    h = get(f'{BASE}/vote/{vid}', out, 120)
    d = parse_vote(h) if h else None
    if d:
        open(cp, 'w').write(h)
    return d

# ---------- DATA в canvas ----------
DAY_RE = r"(?:^DATA\['{d}'\] = |^'{d}': )(`(?:[^`]*)`|'')"
def day_segment(src, day):
    m = re.search(DAY_RE.format(d=re.escape(day)), src, re.M)
    return m

def merge_day(src, day, votes):
    """Аддитивно добавить строки голосований дня в DATA. → (src, added_ids, kept_ids, diffs)."""
    new_lines = {v['id']: data_line(v) for v in votes}
    m = day_segment(src, day)
    if m:
        body = m.group(1)[1:-1] if m.group(1).startswith('`') else ''
        lines = [ln for ln in body.split('\n') if ln.strip()]
    else:
        lines = []
    have = {ln.split('|')[0]: ln for ln in lines}
    diffs = []
    for vid, ln in new_lines.items():
        if vid in have:
            a, b = have[vid].split('|'), ln.split('|')
            if a[4:7] != b[4:7]:
                diffs.append({'id': vid, 'DATA': '|'.join(a[4:7]), 'vote.duma.gov.ru': '|'.join(b[4:7])})
    add = sorted((v for v in new_lines if v not in have), key=int)
    for vid in add:
        pos = next((i for i, ln in enumerate(lines) if ln.split('|')[0].isdigit() and int(ln.split('|')[0]) > int(vid)), len(lines))
        lines.insert(pos, new_lines[vid])
    if not add:
        return src, [], list(have), diffs
    val = '`' + '\n'.join(lines) + '`'
    if m:
        src = src[:m.start(1)] + val + src[m.end(1):]
    else:
        last = None
        for mm in re.finditer(r"^DATA\['\d\d\.\d\d\.\d{4}'\] = (?:`[^`]*`|'');", src, re.M):
            last = mm
        stmt = f"DATA['{day}'] = {val};"
        if last:
            src = src[:last.end()] + '\n' + stmt + src[last.end():]
        else:
            i = src.index('const DATA: Record<string,string> = {')
            j = src.index('\n};', i) + 3
            src = src[:j] + '\n' + stmt + src[j:]
    return src, add, list(have), diffs

def daterange(a, b):
    p = lambda s: dt.datetime.strptime(s, '%d.%m.%Y').date()
    x, y = p(a), p(b)
    while x <= y:
        yield x.strftime('%d.%m.%Y'); x += dt.timedelta(days=1)

def run_day(day, args, src, VT):
    report = {'day': day, 'source': f'{BASE}/?from={day}&to={day}', 'fetched_at': dt.datetime.now().isoformat(timespec='seconds')}
    rows, st = fetch_list(day)
    report['list_status'] = st
    if rows is None:
        C.log('votes_day_fail.log', f'{day} {st}')
        print(f'[{day}] ОШИБКА: {st}')
        return src, report, 2
    if not rows:
        os.makedirs(DAYS_DIR, exist_ok=True)
        json.dump({'date': day, 'novotes': 1, 'source': report['source'], 'fetched_at': report['fetched_at'], 'votes': [], 'gaps': []},
                  open(os.path.join(DAYS_DIR, f'{day}.json'), 'w'), ensure_ascii=False, indent=1)
        print(f'[{day}] голосований нет (официально: «ничего не найдено»)')
        return src, report, 0
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        det = dict(zip([r['id'] for r in rows], ex.map(fetch_vote, [r['id'] for r in rows])))
    votes, gaps = [], []
    for r in sorted(rows, key=lambda r: int(r['id'])):
        d = det.get(r['id'])
        if not d or d['day'] != day:
            gaps.append({'id': r['id'], 'time_list': r['time'], 'why': 'страница голосования не загрузилась/не разобралась' if not d else f"дата на странице {d['day']}"})
            continue
        reading, doc, sh, q = split_title(d['title'] or r['title'])
        ok = d['ok'] if d['ok'] is not None else bool(r['ok'])
        if reading.startswith('к отклонению:'):   # принято предложение отклонить → законопроект отклонён
            reading, ok = reading.split(':', 1)[1], (not ok)
        v = {'id': r['id'], 'doc': doc, 'short': sh, 'reading': reading, 'ok': ok,
             'total': d['total'], 'fr': d['fr'], 'q': q, 'time': d['time'], 'time_src': 'vote', 'time_list': r['time']}
        if not d['fr']:
            gaps.append({'id': r['id'], 'why': 'нет поимённой разбивки по фракциям — строка без фракций'})
        votes.append(v)
    os.makedirs(DAYS_DIR, exist_ok=True)
    jpath = os.path.join(DAYS_DIR, f'{day}.json')
    json.dump({'date': day, 'source': report['source'], 'fetched_at': report['fetched_at'], 'list_status': st,
               'votes': votes, 'gaps': gaps}, open(jpath, 'w'), ensure_ascii=False, indent=1)
    src2, added, kept, diffs = merge_day(src, day, votes)
    vt_new, vt_diff = 0, []
    for v in votes:
        if VT.get(v['id']) != v['time']:
            if v['id'] in VT:
                vt_diff.append({'id': v['id'], 'было': VT[v['id']], 'vote.duma.gov.ru': v['time']})
            VT[v['id']] = v['time']; vt_new += 1
    report.update({'json': jpath, 'list_votes': len(rows), 'parsed': len(votes), 'gaps': gaps, 'data_existing': len(kept),
                   'data_added': added, 'data_diffs': diffs, 'vt_set': vt_new, 'vt_diffs': vt_diff})
    for g in gaps:
        C.log('votes_day_fail.log', f"{day} {g['id']}: {g['why']}")
    print(f"[{day}] {st}; разобрано {len(votes)}/{len(rows)}; в DATA было {len(kept)}, добавлено {len(added)}"
          f"{' ' + str(added) if added else ''}; расхождений цифр {len(diffs)}; VT +{vt_new} (изменено {len(vt_diff)}); пробелы {len(gaps)}")
    return src2, report, (1 if gaps else 0)

def main():
    ap = argparse.ArgumentParser(description='vote.duma.gov.ru → days/*.json → DATA')
    ap.add_argument('day_from'); ap.add_argument('day_to', nargs='?')
    ap.add_argument('--dry-run', action='store_true', help='не записывать canvas (days/*.json и отчёт пишутся)')
    ap.add_argument('--canvas', default=C.CANVAS)
    ap.add_argument('--workers', type=int, default=6)
    a = ap.parse_args()
    src0 = open(a.canvas).read()
    src = src0
    VT = C.get_block(src, 'VT')
    rc = 0
    for day in daterange(a.day_from, a.day_to or a.day_from):
        src, rep, r = run_day(day, a, src, VT)
        rc = max(rc, r)
        json.dump(rep, open(os.path.join(C.LOGS, f'votes_day_{day}.json'), 'w'), ensure_ascii=False, indent=1)
    src = C.set_block(src, 'VT', 'const VT: Record<string, string>', VT)
    if src == src0:
        print('canvas: без изменений')
    elif a.dry_run:
        print('canvas: --dry-run, изменения НЕ записаны (см. out/logs/votes_day_<день>.json)')
    else:
        open(a.canvas, 'w').write(src)
        print('canvas: записан', a.canvas)
    sys.exit(rc)

if __name__ == '__main__':
    main()
