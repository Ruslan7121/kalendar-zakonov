#!/usr/bin/env python3
"""Разбор устройства страницы источника (для написания парсера): скачать напрямую (как organs.py) и через RU-прокси
(как остальной конвейер), напечатать статус, размер, заголовок, ссылки с текстом и найденные даты.
Запуск: python3 probe.py URL [URL ...]; страницы сохраняются в out/probe/ (артефакт запуска probe)."""
import sys, os, re, html, json
sys.path[:0] = [os.path.dirname(os.path.abspath(__file__)), os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib')]; import common as C, organs as O

DIR = os.path.join(C.OUT, 'probe'); os.makedirs(DIR, exist_ok=True)
DATE = re.compile(r'\d{1,2}\s+(?:' + '|'.join(O.MONTHS) + r')\s+\d{4}|\d\d\.\d\d\.\d{4}')


def show(url, body, how):
    if body.lstrip()[:1] in '{[':  # 15.11.2026: ответ API (JSON) — печатаем начало как есть
        print(f'--- {how}: JSON {len(body)} байт:', body[:2500]); return
    t = re.search(r'(?is)<title[^>]*>(.*?)</title>', body)
    print(f'--- {how}: {len(body)} байт, title: {O.clean(t.group(1)) if t else "—"}')
    # 15.11.2026: заголовки и описание страницы (на sozd — название законопроекта в элементе с классом oz_naimen)
    for m in re.finditer(r'(?is)<h1[^>]*>(.*?)</h1>|<meta[^>]+name="description"[^>]+content="([^"]*)"|<[a-z]+[^>]+(?:class|id)="[^"]*(?:naimen|oz_name)[^"]*"[^>]*>(.*?)</', body):
        t = O.clean(re.sub(r'<[^>]+>', ' ', next(g for g in m.groups() if g is not None)))
        if t: print('  заголовок:', t[:400])
    rss = re.findall(r'(?i)<link[^>]+type="application/rss\+xml"[^>]*>', body)
    for r in rss[:5]: print('  RSS:', r)
    n = 0
    for m in re.finditer(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', body):
        txt = O.clean(re.sub(r'<[^>]+>', ' ', m.group(2)))
        if len(txt) < 25: continue
        near = O.clean(re.sub(r'<[^>]+>', ' ', body[max(0, m.start() - 300):m.end() + 300]))
        d = DATE.findall(near)
        if DATED:  # 18.11.2026: --dated — только ссылки с датой рядом, коротко (карточки новостей)
            if not d: continue
            print(f'  {m.group(1)[:80]} | {txt[:70]} | {d[:1]}'); n += 1
            if n >= 25: break
            continue
        print(f'  {m.group(1)[:90]} | {txt[:110]} | даты рядом: {d[:2]}'); n += 1
        if n >= 60: break
    i = body.find(DATE.findall(body)[0]) if DATE.findall(body) else -1
    if i >= 0 and not DATED: print('  фрагмент HTML у первой даты:', re.sub(r'\s+', ' ', body[max(0, i - 400):i + 400]))


# 16.11.2026: --grep ШАБЛОН — для каждой страницы напечатать сырой HTML вокруг первых 4 совпадений (разметка элементов списка новостей);
# --head — первые 2500 символов ответа (RSS). Ключи действуют на все адреса после них.
ARGS = sys.argv[1:]; DATED = '--dated' in ARGS; ARGS = [a for a in ARGS if a != '--dated']; GREP = None; HEAD = False; FIND = None; MANY = False; URLS = []
i = 0
while i < len(ARGS):
    if ARGS[i] == '--grep': GREP = ARGS[i + 1]; i += 2; continue
    if ARGS[i] == '--head': HEAD = True; i += 1; continue
    if ARGS[i] == '--many': MANY = True; i += 1; continue  # 18.11.2026: --grep печатает до 80 совпадений, только сами совпадения
    if ARGS[i] == '--find': FIND = ARGS[i + 1]; i += 2; continue  # 18.11.2026: JSON-ответ — напечатать объекты, где любое строковое поле подходит под шаблон
    URLS.append(ARGS[i]); i += 1
if GREP or HEAD or FIND:
    for url in URLS:
        st, body = O.get(url); print(f'=== {url}: {st}, {len(body)} байт')
        if FIND:
            try:
                def walk(o):
                    if isinstance(o, dict):
                        if any(isinstance(v, str) and re.search(FIND, v, re.I) for v in o.values()): print('  ', json.dumps(o, ensure_ascii=False)[:600])
                        for v in o.values(): walk(v)
                    elif isinstance(o, list):
                        for v in o: walk(v)
                walk(json.loads(body))
            except Exception as e: print('  не JSON:', e, body[:300])
        if HEAD: print(body[:2500])
        if GREP:
            for n, m in enumerate(re.finditer(GREP, body)):
                if MANY:
                    if n >= 80: break
                    print('  ', m.group(0)[:300]); continue
                if n >= 4: break
                print(f'--- совпадение {n + 1}:', re.sub(r'\s+', ' ', body[max(0, m.start() - 600):m.end() + 900]))
    sys.exit(0)

for k, url in enumerate(ARGS):
    print(f'=== {url}')
    st, body = O.get(url)
    print(f'напрямую: {st}')
    if st == 'ok' or body: open(os.path.join(DIR, f'{k}_direct.html'), 'w').write(body); show(url, body, 'напрямую')
    if DATED and st == 'ok': continue
    f = os.path.join(DIR, f'{k}_proxy.html')
    if C.fetch(url, f, 90):
        show(url, open(f, errors='ignore').read(), 'через прокси')
    else:
        print('через прокси: не загрузилось')
