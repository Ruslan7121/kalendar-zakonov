#!/usr/bin/env python3
"""Пункт «О проекте федерального закона»: загрузить ВСЕ законопроекты дня без пропусков.
Для каждого номера: страница sozd (сохраняется), пояснительная записка (docx/pdf -> текст).
Улучшения: concurrency + polite rate limit, retries/backoff, timeouts, resume, alt endpoints, cache.
Ошибки: out/logs/bills_fail.log (номер, причина). Итог: out/extracts/bills/<номер>.json
Запуск: python3 bills.py [DD.MM.YYYY ...]   (без аргументов — все дни из canvas)
         python3 bills.py --one 123456-8   (ручная догрузка одного)"""
import sys, os, re, json, zipfile, subprocess, time, threading
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.insert(0, os.path.dirname(__file__)); import common as C
D = os.path.join(C.EXTR, 'bills'); os.makedirs(D, exist_ok=True)
CACHE = os.path.join(C.EXTR, 'bills_html'); os.makedirs(CACHE, exist_ok=True)

# ускорено: больше воркеров, меньше задержка
WORKERS = int(os.environ.get('BILLS_WORKERS', '10'))
MIN_GAP = float(os.environ.get('BILLS_GAP', '0.12'))
_lock = threading.Lock()
_last = [0.0]

def note_text(path):
    b = open(path, 'rb').read(4)
    if b == b'PK\x03\x04':
        x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8', 'ignore')
        return '\n'.join(re.sub(r'\s+', ' ', ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip() for p in re.findall(r'<w:p[ >].*?</w:p>', x, re.S))
    if b[:4] == b'%PDF':
        r = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True); return r.stdout
    return ''

def polite_wait():
    with _lock:
        now = time.time()
        wait = MIN_GAP - (now - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()

def fetch_retry(url, out, deadline=90, tries=3):
    for i in range(tries):
        polite_wait()
        if C.fetch(url, out, deadline):
            return True
        time.sleep(1.2 * (2 ** i))
    return False

def sozd_urls(n):
    """Alternative endpoints for a bill page."""
    return [
        f'https://sozd.duma.gov.ru/bill/{n}',
        f'http://sozd.duma.gov.ru/bill/{n}',
        f'https://sozd.duma.gov.ru/bill/{n}/',
        f'https://www.duma.gov.ru/legislative/consideration/{n}/',
    ]

def load_sozd(n):
    """Return html or '' ; prefer cached html if fresh-looking."""
    cached = os.path.join(CACHE, n + '.html')
    if os.path.exists(cached) and os.path.getsize(cached) > 2000:
        src = open(cached, errors='ignore').read()
        if '404 Страница не найдена' not in src and ('законопроект' in src.lower() or '<h1' in src):
            return src
    h = f'/tmp/sozd_{n}.html'
    last_src = ''
    for url in sozd_urls(n):
        if fetch_retry(url, h, 90, 3):
            src = open(h, errors='ignore').read()
            last_src = src
            if '404 Страница не найдена' in src:
                continue
            if len(src) > 2000:
                open(cached, 'w').write(src)
                return src
    return last_src

def one(n, day, vid):
    out = os.path.join(D, n + '.json')
    if os.path.exists(out) and os.path.getsize(out) > 50:
        return 'cached'
    src = load_sozd(n)
    if not src:
        C.log('bills_fail.log', f'{day} {vid} {n}: sozd/duma не ответил (все endpoints)')
        return 'fail'
    if '404 Страница не найдена' in src:
        C.log('bills_fail.log', f'{day} {vid} {n}: sozd 404')
        return 'fail'
    m = re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S)
    rec = {'n': n, 'day': day, 'vote': vid, 'title': C.text(m.group(1)).strip() if m else '', 'note': '', 'note_url': ''}
    dl = [(u, C.text(a)) for u, a in re.findall(r'href="(/download/[^"]+)"[^>]*>(.{0,400}?)</a>', src, re.S)]
    pz = next((u for u, a in dl if 'ояснительн' in a), None)
    if pz:
        f = f'/tmp/pz_{n}.bin'
        if fetch_retry('https://sozd.duma.gov.ru' + pz, f, 150, 3):
            rec['note'] = note_text(f)[:60000]
            rec['note_url'] = 'https://sozd.duma.gov.ru' + pz
            if not rec['note']:
                C.log('bills_fail.log', f'{day} {vid} {n}: записка не читается (скан/формат)')
        else:
            C.log('bills_fail.log', f'{day} {vid} {n}: записка не скачалась')
    else:
        C.log('bills_fail.log', f'{day} {vid} {n}: на sozd нет пояснительной записки')
    rec['amend'] = bool(re.match(r'О внесении изменени', rec['title'] or ''))
    json.dump(rec, open(out, 'w'), ensure_ascii=False, indent=1)
    return 'ok'

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == '--one':
        n = sys.argv[2]
        print(f'Ручная догрузка: {n}')
        r = one(n, 'manual', '0')
        print(n, r)
        sys.exit(0 if r != 'fail' else 1)

    src = C.read_canvas(); days = sys.argv[1:]
    items = [(d, v, n) for d, v, n, q, r in C.votes(src) if re.fullmatch(r'\d+-\d+', n) and (not days or d in days)]
    seen = {}
    for d, v, n in items:
        if n not in seen:
            seen[n] = (d, v)
    todo = [(n, d, v) for n, (d, v) in seen.items() if not (os.path.exists(os.path.join(D, n + '.json')) and os.path.getsize(os.path.join(D, n + '.json')) > 50)]
    st = {'cached': len(seen) - len(todo)}
    print(f'unique={len(seen)} todo={len(todo)} workers={WORKERS} gap={MIN_GAP}', flush=True)
    if todo:
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(one, n, d, v): n for n, d, v in todo}
            for fut in as_completed(futs):
                n = futs[fut]
                try:
                    r = fut.result()
                except Exception as e:
                    r = 'fail'
                    C.log('bills_fail.log', f'{n}: exception {e}')
                st[r] = st.get(r, 0) + 1
                print(n, r, flush=True)
    print('законопроектов:', len(seen), st, flush=True)
