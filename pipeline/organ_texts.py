#!/usr/bin/env python3
"""19.11.2026: официальные тексты документов органов (блок ORG) — основа для «Сути» в 3–4 абзаца и «Кого коснется».

Для каждого документа органа (кроме новостей и заседаний) за окно дат скачивает официальный текст:
  - publication.pravo.gov.ru/document/<eoNumber> → PDF /file/pdf?eoNumber=<eoNumber>;
  - ссылки на PDF (cbr.ru/Queries/UniDbQuery/File/…, *.pdf) → этот PDF;
  - остальные официальные страницы (cbr.ru, council.gov.ru …) → текст HTML-страницы.
Текст PDF — pdftotext; если PDF — скан (текста нет), распознавание tesseract (rus) первых --ocr-pages страниц.
Результат: extracts/organs/<ключ>.json {id, o, d, t, u, src, kind: text|ocr|html|fail, pages, text, why}.
Уже полученные тексты повторно не скачиваются (кроме kind=fail старше суток).

Запуск:
  python3 organ_texts.py                         # документы за последние 7 дней
  python3 organ_texts.py --from 01.10.2026 [--to 19.11.2026] [--limit 50]
Сеть: прямой запрос; если сайт закрыт, через RU-прокси конвейера (fetch.sh), как organs.py (ORGANS_PROXY=1).
«Суть» этот скрипт не пишет (без ИИ): документы без «Сути» попадают в out/TODO.md (pipeline/todo.py), раздел
«Суть документов органов», с путем к тексту; тексты переносятся в канон через pipeline/orgx_merge.py.
"""
import os, re, sys, json, glob, shutil, hashlib, argparse, tempfile, subprocess, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import organs as O

TDIR = os.path.join(C.EXTR, 'organs')
SKIP_TY = ('новость', 'заседание')
MAXC = 60000  # символов текста в файле (для «Сути» хватает начала документа и приложений)

def key(e):
    m = re.search(r'publication\.pravo\.gov\.ru/document/(\d{10,})', e['u'])
    return m.group(1) if m else e['o'] + '-' + hashlib.md5((e['u'] + '#' + e['d']).encode()).hexdigest()[:12]  # одна страница (ленты ЦБ) бывает в разные дни

def src_url(u):
    m = re.search(r'publication\.pravo\.gov\.ru/document/(\d{10,})', u)
    if m: return f'http://publication.pravo.gov.ru/file/pdf?eoNumber={m.group(1)}', 'pdf'
    if re.search(r'(\.pdf($|\?))|/Queries/UniDbQuery/File/', u, re.I): return u, 'pdf'
    return u, 'html'

def need(e):
    return e.get('ty') not in SKIP_TY and str(e.get('u', '')).startswith('http')

def download(url, path, timeout=90):
    """Прямой GET (бинарно); при отказе и ORGANS_PROXY=1 — fetch.sh. True при успехе."""
    r = subprocess.run(['curl', '-s', '-L', '--compressed', '-m', str(timeout), '-A', O.UA, '-o', path, '-w', '%{http_code}', url], capture_output=True, text=True)
    if r.stdout.strip() == '200' and os.path.exists(path) and os.path.getsize(path) > 500: return True
    if os.environ.get('ORGANS_PROXY') == '1' or os.environ.get('ORGTEXT_PROXY') == '1':
        return C.fetch(url, path, int(os.environ.get('ORGANS_PROXY_DEADLINE', '120')))
    return False

def pdf_text(path, ocr_pages):
    """(kind, pages, text): pdftotext; скан — tesseract rus по страницам (300 dpi, оттенки серого)."""
    try: pages = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout).group(1))
    except Exception: pages = 0
    t = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout
    if len(re.sub(r'\s+', '', t)) > 200 * max(1, min(pages, 3)) // 3: return 'text', pages, t
    if not shutil.which('tesseract'): return 'fail', pages, ''
    out = []
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(['pdftoppm', '-r', '300', '-gray', '-png', '-l', str(ocr_pages), path, os.path.join(td, 'p')], capture_output=True)
        for png in sorted(glob.glob(os.path.join(td, 'p*.png'))):
            out.append(subprocess.run(['tesseract', png, '-', '-l', 'rus'], capture_output=True, text=True).stdout)
    return 'ocr', pages, '\n\f'.join(out)

def tidy(t):
    t = t.replace('ё', 'е').replace('Ё', 'Е')
    t = re.sub(r'[ \t]+', ' ', t); t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()[:MAXC]

def one(e, ocr_pages=12):
    url, how = src_url(e['u']); rec = {'id': f"{e['o']}:{e['u']}#{e['d']}", 'o': e['o'], 'd': e['d'], 't': e['t'], 'u': e['u'], 'src': url,
                                      'got': dt.datetime.now(O.MSK).strftime('%d.%m.%Y %H:%M')}
    with tempfile.TemporaryDirectory() as td:
        f = os.path.join(td, 'doc')
        if not download(url, f): return {**rec, 'kind': 'fail', 'why': 'источник недоступен'}
        head = open(f, 'rb').read(5)
        if how == 'pdf' or head.startswith(b'%PDF'):
            if not head.startswith(b'%PDF'): return {**rec, 'kind': 'fail', 'why': 'вместо PDF пришла страница'}
            kind, pages, t = pdf_text(f, ocr_pages)
            if kind == 'fail' or len(t.strip()) < 100: return {**rec, 'kind': 'fail', 'pages': pages, 'why': 'скан, распознать не удалось'}
            return {**rec, 'kind': kind, 'pages': pages, 'text': tidy(t)}
        h = open(f, encoding='utf-8', errors='replace').read()
        if any(m in h for m in O.BLOCK_MARKERS): return {**rec, 'kind': 'fail', 'why': 'страница ограничения доступа'}
        t = C.text(re.sub(r'(?is)<(nav|header|footer)\b.*?</\1>', ' ', h))
        return {**rec, 'kind': 'html', 'text': tidy(t)}

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='frm'); ap.add_argument('--to'); ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--ocr-pages', type=int, default=12); ap.add_argument('--retry', action='store_true', help='повторить и неудачные (kind=fail)')
    a = ap.parse_args(argv)
    today = dt.datetime.now(O.MSK).date()
    lo = O.s2d(a.frm) if a.frm else today - dt.timedelta(days=7); hi = O.s2d(a.to) if a.to else today
    org = C.get_block(C.read_canvas(), 'ORG'); os.makedirs(TDIR, exist_ok=True)
    todo = [e for e in org if need(e) and lo <= O.s2d(e['d']) <= hi]
    todo.sort(key=lambda e: O.s2d(e['d']), reverse=True)
    n = {'ok': 0, 'fail': 0, 'skip': 0}
    for e in todo:
        fp = os.path.join(TDIR, key(e) + '.json')
        if os.path.exists(fp):
            try: old = json.load(open(fp))
            except ValueError: old = {}
            if old.get('kind') and old['kind'] != 'fail' and not a.retry: n['skip'] += 1; continue
            if old.get('kind') == 'fail' and not a.retry: n['skip'] += 1; continue
        if a.limit and n['ok'] + n['fail'] >= a.limit: break
        try: r = one(e, a.ocr_pages)
        except Exception as x: r = {'id': f"{e['o']}:{e['u']}#{e['d']}", 'o': e['o'], 'd': e['d'], 't': e['t'], 'u': e['u'], 'kind': 'fail', 'why': f'ошибка: {x}'}
        json.dump(r, open(fp, 'w'), ensure_ascii=False, indent=1)
        n['fail' if r['kind'] == 'fail' else 'ok'] += 1
        print(f"{r['kind']:5} {e['d']} {e['o']:9} {e['t'][:80]}" + (f"  ({r.get('why')})" if r.get('why') else ''), flush=True)
    msg = f"тексты органов {O.d2s(lo)}–{O.d2s(hi)}: получено {n['ok']}, не удалось {n['fail']}, уже были {n['skip']}"
    print(msg); C.log('organ_texts.log', msg)
    return n

if __name__ == '__main__':
    main()
