#!/usr/bin/env python3
"""Разбор устройства страницы источника (для написания парсера): скачать напрямую (как organs.py) и через RU-прокси
(как остальной конвейер), напечатать статус, размер, заголовок, ссылки с текстом и найденные даты.
Запуск: python3 probe.py URL [URL ...]; страницы сохраняются в out/probe/ (артефакт запуска probe)."""
import sys, os, re, html
sys.path.insert(0, os.path.dirname(__file__)); import common as C, organs as O

DIR = os.path.join(C.OUT, 'probe'); os.makedirs(DIR, exist_ok=True)
DATE = re.compile(r'\d{1,2}\s+(?:' + '|'.join(O.MONTHS) + r')\s+\d{4}|\d\d\.\d\d\.\d{4}')


def show(url, body, how):
    t = re.search(r'(?is)<title[^>]*>(.*?)</title>', body)
    print(f'--- {how}: {len(body)} байт, title: {O.clean(t.group(1)) if t else "—"}')
    rss = re.findall(r'(?i)<link[^>]+type="application/rss\+xml"[^>]*>', body)
    for r in rss[:5]: print('  RSS:', r)
    n = 0
    for m in re.finditer(r'(?is)<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', body):
        txt = O.clean(re.sub(r'<[^>]+>', ' ', m.group(2)))
        if len(txt) < 25: continue
        near = O.clean(re.sub(r'<[^>]+>', ' ', body[max(0, m.start() - 300):m.end() + 300]))
        d = DATE.findall(near)
        print(f'  {m.group(1)[:90]} | {txt[:110]} | даты рядом: {d[:2]}'); n += 1
        if n >= 60: break
    i = body.find(DATE.findall(body)[0]) if DATE.findall(body) else -1
    if i >= 0: print('  фрагмент HTML у первой даты:', re.sub(r'\s+', ' ', body[max(0, i - 400):i + 400]))


for k, url in enumerate(sys.argv[1:]):
    print(f'=== {url}')
    st, body = O.get(url)
    print(f'напрямую: {st}')
    if st == 'ok' or body: open(os.path.join(DIR, f'{k}_direct.html'), 'w').write(body); show(url, body, 'напрямую')
    f = os.path.join(DIR, f'{k}_proxy.html')
    if C.fetch(url, f, 90):
        show(url, open(f, errors='ignore').read(), 'через прокси')
    else:
        print('через прокси: не загрузилось')
