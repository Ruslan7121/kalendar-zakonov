#!/usr/bin/env python3
"""Пункт «О проекте федерального закона»: загрузить ВСЕ законопроекты дня без пропусков.
Для каждого номера: страница sozd (сохраняется), пояснительная записка (docx/pdf -> текст).
Улучшения: concurrency + polite rate limit, retries/backoff, timeouts, resume, alt endpoints, cache.
Ошибки: out/logs/bills_fail.log (номер, причина). Итог: extracts/bills/<номер>.json
HTML sozd — единый кэш sozd_cache ($GD_DUMA/bills/<номер>.html, TTL 48 ч, неудача — повтор через 1 ч).
Повтор (пункт 6): JSON без непустой записки или со status != 'ok' перезапрашивается (note_fail/sozd_fail — каждый прогон,
note_unreadable/no_note — не чаще раза в SOZD_TTL_HOURS);
полная запись не трогается; уже полученный текст записки неудачной загрузкой не затирается.
запасные документы (FALLBACK) при скане записки: note_kind в записи; fb=1 — уже пробовали.
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

# запасные документы (подпись файла на sozd) по порядку предпочтения
# версия формата записи: 2 — сохранены все документы карточки и тексты таблицы/ФЭО/заключения (единый сбор для всех карточек)
REC_V = 2
# дополнительные документы: поле записи, подпись на sozd, предел текста
EXTRA = [('table', r'равнительн|соответствия', 'сравнительная таблица'),
         ('fin', r'Финансово-экономическ', 'финансово-экономическое обоснование'),
         ('committee', r'Заключение ответственного комитета', 'заключение ответственного комитета')]

FALLBACK = [('текст законопроекта к первому чтению', r'Текст законопроекта, подготовленного к рассмотрению'),
            ('текст внесенного законопроекта', r'Текст внесенного законопроекта|Текст законопроекта, внесенного'),
            ('заключение ответственного комитета', r'Заключение ответственного комитета')]


def sozd_title(src):
    """19.11.2026: полное официальное название со страницы sozd — «наименование» (oz_name) и уточнение в скобках
    (oz_name_comment). Раньше бралось содержимое <h1> («Законопроект № …» со значками кнопок), а не название."""
    a = re.search(r'id="oz_name"[^>]*>(.*?)</span>', src, re.S)
    if not a:
        m = re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S)
        return C.text(m.group(1)).strip() if m else ''
    t = C.text(a.group(1)).strip()
    b = re.search(r'id="oz_name_comment"[^>]*>(.*?)</p>', src, re.S)
    c = C.text(b.group(1)).strip() if b else ''
    return re.sub(r'\s+', ' ', f'{t} {c}' if c else t).strip()

def note_text(path):
    b = open(path, 'rb').read(4)
    if b == b'PK\x03\x04':
        x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8', 'ignore')
        return '\n'.join(re.sub(r'\s+', ' ', ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip() for p in re.findall(r'<w:p[ >].*?</w:p>', x, re.S))
    if b == b'\xd0\xcf\x11\xe0':  # старый .doc (OLE): antiword, затем catdoc, затем LibreOffice
        for cmd in (['antiword', '-w', '0', path], ['catdoc', '-w', path]):
            try:
                r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                if r.returncode == 0 and r.stdout.strip(): return r.stdout
            except (OSError, subprocess.SubprocessError): pass
        try:
            import tempfile, shutil
            with tempfile.TemporaryDirectory() as td:
                src = os.path.join(td, 'x.doc'); shutil.copy(path, src)
                subprocess.run(['soffice', '--headless', '--convert-to', 'txt:Text', '--outdir', td, src], capture_output=True, timeout=120)
                t = os.path.join(td, 'x.txt')
                return open(t, encoding='utf8', errors='ignore').read() if os.path.exists(t) else ''
        except (OSError, subprocess.SubprocessError): return ''
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
    if rec.get('v', 1) < REC_V:
        return True  # запись старого формата: один раз перезапросить ради docs/таблицы/ФЭО/заключения (даже если записка — скан)
    if note_ok(rec) and rec.get('status', 'ok') == 'ok':
        return False
    # скан без текстового слоя / записки на sozd нет: повтор не чаще раза в SOZD_TTL_HOURS (страница успеет обновиться);
    # note_fail, sozd_fail и старые записи без status — на каждом прогоне
    if rec.get('status') in ('note_unreadable', 'no_note') and not rec.get('fb'):
        return True  # запасные документы еще не пробовали
    if rec.get('status') in ('note_unreadable', 'no_note') and rec.get('tried_at'):
        try:
            return time.time() - time.mktime(time.strptime(rec['tried_at'], '%Y-%m-%d %H:%M:%S')) >= S.TTL_OK
        except ValueError:
            return True
    return True


def agenda_items(src, days, have):
    """18.11.2026: законопроекты повестки, по которым голосования не было («не рассматривались»): (день, '0', номер).
    Для них тоже нужен текст (записка или запасные документы), чтобы написать «Суть»."""
    m = re.search(r'const CAL: any = (\{.*\});', src)
    if not m: return []
    try: cal = json.loads(m.group(1))
    except ValueError: return []
    voted = {n for _, _, n, _, _ in C.votes(src)} | set(have)
    res = []
    for p in cal.get('p', []):
        if days and p.get('d') not in days: continue
        for a in p.get('a') or []:
            n = a[0] if a else ''
            if re.fullmatch(r'\d+-\d+', n or '') and n not in voted and n not in {r[2] for r in res}:
                res.append((p['d'], '0', n))
    return res


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
    rec = {'n': n, 'day': old.get('day') if old.get('day') not in (None, '', 'manual') else day,
           'vote': old.get('vote') if old.get('vote') not in (None, '', '0') else vid,
           'title': sozd_title(src), 'note': '', 'note_url': ''}
    # подпись файла на sozd обёрнута в div-ы с ~500 пробелами — окно 400 символов её не видело (пустые записки)
    dl = [(u, C.text(a)) for u, a in re.findall(r'href="(/download/[^"]+)"[^>]*>(.{0,3000}?)</a>', src, re.S)]
    pz = next((u for u, a in dl if 'ояснительн' in a), None)
    status = 'ok'
    fb_done = False
    if note_ok(old) and not force:  # текст записки уже есть — не скачиваем заново (повтор только ради дополнительных документов)
        rec['note'], rec['note_url'] = old['note'], old.get('note_url', '')
        if old.get('note_kind'): rec['note_kind'] = old['note_kind']
    elif pz:
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
    # 18.11.2026: записка — скан или ее нет → берем другие официальные документы той же карточки sozd:
    # текст законопроекта к первому чтению, внесенный текст, заключение ответственного комитета
    if status in ('note_unreadable', 'no_note'):
        fb_done = True
        for kind, pat in FALLBACK:
            u = next((u for u, a in dl if re.search(pat, a, re.I) and u != pz), None)
            if not u:
                continue
            f = f'/tmp/fb_{n}.bin'
            if not fetch_retry('https://sozd.duma.gov.ru' + u, f, 150, 2):
                continue
            tx = note_text(f)[:60000]
            if tx.strip():
                rec['note'], rec['note_url'], rec['note_kind'] = tx, 'https://sozd.duma.gov.ru' + u, kind
                C.log('bills_fail.log', f'{day} {vid} {n}: записка не читается, взят документ «{kind}»')
                break
    # 18.11.2026: единый сбор для всех карточек — все документы карточки (тип, подпись, ссылка) и тексты
    # сравнительной таблицы, ФЭО и заключения комитета (ничего не затирается пустым результатом)
    rec['docs'] = [{'label': re.sub(r'\s+', ' ', a).strip()[:200], 'url': 'https://sozd.duma.gov.ru' + u} for u, a in dl]
    for fld, pat, kind in EXTRA:
        u = next((u for u, a in dl if re.search(pat, a, re.I)), None)
        if not u:
            if old.get(fld): rec[fld] = old[fld]
            continue
        f = f'/tmp/x_{fld}_{n}.bin'
        tx = ''
        if fetch_retry('https://sozd.duma.gov.ru' + u, f, 150, 2):
            tx = note_text(f)[:30000].strip()
        if tx: rec[fld], rec[fld + '_url'] = tx, 'https://sozd.duma.gov.ru' + u
        elif old.get(fld): rec[fld], rec[fld + '_url'] = old[fld], old.get(fld + '_url', '')
        else: rec[fld + '_url'] = 'https://sozd.duma.gov.ru' + u  # документ есть, текст не прочитан (скан)
    rec['v'] = REC_V
    # не затирать уже полученный официальный текст неудачной/пустой загрузкой
    if note_ok(old) and not note_ok(rec):
        rec['note'], rec['note_url'] = old['note'], old.get('note_url', '')
        status = 'ok'
    if not rec['title'] and old.get('title'):
        rec['title'] = old['title']
    rec['status'] = status if not note_ok(rec) else 'ok'
    rec['sozd'] = st
    if fb_done or old.get('fb'):
        rec['fb'] = 1
    if note_ok(old) and not rec.get('note_kind') and old.get('note_kind') and rec['note'] == old.get('note'):
        rec['note_kind'] = old['note_kind']
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
    items += agenda_items(src, days, {n for _, _, n in items})
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
