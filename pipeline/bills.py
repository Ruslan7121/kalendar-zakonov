#!/usr/bin/env python3
"""Пункт «О проекте федерального закона»: загрузить ВСЕ законопроекты дня без пропусков.
Для каждого номера: страница sozd (сохраняется), пояснительная записка (docx/pdf -> текст).
Улучшения: concurrency + polite rate limit, retries/backoff, timeouts, resume, alt endpoints, cache.
Ошибки: out/logs/bills_fail.log (номер, причина). Итог: extracts/bills/<номер>.json
HTML sozd — единый кэш sozd_cache ($GD_DUMA/bills/<номер>.html, TTL 48 ч, неудача — повтор через 1 ч).
Повтор (пункт 6): JSON без непустой записки или со status != 'ok' перезапрашивается (note_fail/sozd_fail — каждый прогон,
note_unreadable/no_note — не чаще раза в SOZD_TTL_HOURS);
полная запись не трогается; уже полученный текст записки неудачной загрузкой не затирается.
status: ok | note_fail (не скачалась) | note_unreadable (скан) | no_note (нет на sozd) | sozd_fail.
Запуск: python3 bills.py [DD.MM.YYYY ...]   (без аргументов — все дни из canvas)
         python3 bills.py --one 123456-8 [--force]   (ручная догрузка одного; --force — мимо TTL)"""
import sys, os, re, json, zipfile, subprocess, time, threading
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.insert(0, os.path.dirname(__file__)); import common as C
import sozd_cache as S
D = os.path.join(C.EXTR, 'bills'); os.makedirs(D, exist_ok=True)
# HTML sozd — единый кэш sozd_cache.DIR ($GD_DUMA/bills/), общий с track.py (пункт 6)

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

def note_ok(rec):
    """Запись завершена: есть непустой текст официальной записки (пробелы не в счёт)."""
    return bool((rec or {}).get('note', '').strip())


def load_rec(n):
    try:
        return json.load(open(os.path.join(D, n + '.json')))
    except (OSError, ValueError):
        return None


def needs_fetch(n, force=False):
    """Пункт 6: размер файла больше не признак готовности. Повтор, если JSON нет/битый,
    записка пустая или запись помечена неполной (status != 'ok'). Полная запись не перезапрашивается
    (кроме --force), и даже тогда старый непустой текст не затирается пустым."""
    rec = load_rec(n)
    if force or not rec:
        return True
    if note_ok(rec) and rec.get('status', 'ok') == 'ok':
        return False
    # скан без текстового слоя / записки на sozd нет: повтор не чаще раза в SOZD_TTL_HOURS (страница успеет обновиться);
    # note_fail, sozd_fail и старые записи без status — на каждом прогоне
    if rec.get('status') in ('note_unreadable', 'no_note') and rec.get('tried_at'):
        try:
            return time.time() - time.mktime(time.strptime(rec['tried_at'], '%Y-%m-%d %H:%M:%S')) >= S.TTL_OK
        except ValueError:
            return True
    return True


def load_sozd(n, refresh=False):
    """HTML карточки sozd из единого кэша sozd_cache (TTL, маркер неудачи, прошлый хороший HTML при 504)."""
    src, st = S.get(n, refresh=refresh, deadline=90, fetcher=lambda u, o, d: fetch_retry(u, o, d, 3), log='bills_fail.log')
    return src, st


def one(n, day, vid, force=False):
    out = os.path.join(D, n + '.json')
    old = load_rec(n) or {}
    if not needs_fetch(n, force):
        return 'cached'
    # повтор пустой записки: HTML мог устареть/быть битым — берём свежий, если кэш старше TTL
    src, st = load_sozd(n, refresh=force)
    if st == '404':
        C.log('bills_fail.log', f'{day} {vid} {n}: sozd 404')
        return 'fail'
    if not src:
        C.log('bills_fail.log', f'{day} {vid} {n}: sozd/duma не ответил (все endpoints), повтор на следующем прогоне')
        if old:  # не затираем, только отмечаем попытку
            old['status'] = old.get('status') if note_ok(old) else 'sozd_fail'
            old['tried_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
            json.dump(old, open(out, 'w'), ensure_ascii=False, indent=1)
        return 'fail'
    m = re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S)
    rec = {'n': n, 'day': old.get('day') if old.get('day') not in (None, '', 'manual') else day,
           'vote': old.get('vote') if old.get('vote') not in (None, '', '0') else vid,
           'title': C.text(m.group(1)).strip() if m else '', 'note': '', 'note_url': ''}
    # подпись файла на sozd обёрнута в div-ы с ~500 пробелами — окно 400 символов её не видело (пустые записки)
    dl = [(u, C.text(a)) for u, a in re.findall(r'href="(/download/[^"]+)"[^>]*>(.{0,3000}?)</a>', src, re.S)]
    pz = next((u for u, a in dl if 'ояснительн' in a), None)
    status = 'ok'
    if pz:
        f = f'/tmp/pz_{n}.bin'
        rec['note_url'] = 'https://sozd.duma.gov.ru' + pz
        if fetch_retry(rec['note_url'], f, 150, 3):
            rec['note'] = note_text(f)[:60000]
            if not rec['note'].strip():
                status = 'note_unreadable'
                C.log('bills_fail.log', f'{day} {vid} {n}: записка не читается (скан/формат)')
        else:
            status = 'note_fail'
            C.log('bills_fail.log', f'{day} {vid} {n}: записка не скачалась, повтор на следующем прогоне')
    else:
        status = 'no_note'
        C.log('bills_fail.log', f'{day} {vid} {n}: на sozd нет пояснительной записки (sozd: {st})')
    # не затирать уже полученный официальный текст неудачной/пустой загрузкой
    if note_ok(old) and not note_ok(rec):
        rec['note'], rec['note_url'] = old['note'], old.get('note_url', '')
        status = 'ok'
    if not rec['title'] and old.get('title'):
        rec['title'] = old['title']
    rec['status'] = status if not note_ok(rec) else 'ok'
    rec['sozd'] = st
    rec['tried_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
    rec['amend'] = bool(re.match(r'О внесении изменени', rec['title'] or ''))
    json.dump(rec, open(out, 'w'), ensure_ascii=False, indent=1)
    return 'ok' if rec['status'] == 'ok' else 'partial'

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == '--one':
        n = sys.argv[2]; force = '--force' in sys.argv
        print(f'Ручная догрузка: {n}' + (' (--force: свежий sozd и записка)' if force else ''))
        r = one(n, 'manual', '0', force=force)
        print(n, r)
        sys.exit(0 if r != 'fail' else 1)

    src = C.read_canvas(); days = sys.argv[1:]
    items = [(d, v, n) for d, v, n, q, r in C.votes(src) if re.fullmatch(r'\d+-\d+', n) and (not days or d in days)]
    seen = {}
    for d, v, n in items:
        if n not in seen:
            seen[n] = (d, v)
    todo = [(n, d, v) for n, (d, v) in seen.items() if needs_fetch(n)]
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
