#!/usr/bin/env python3
"""Путь закона: 2-е чтение -> 3-е -> СФ -> подписание -> опубликование -> вступление в силу.
Источники: sozd.duma.gov.ru (этапы, номер ФЗ, публикация), publication.pravo.gov.ru (номер публикации),
kremlin.ru/acts/bank (поиск текста о вступлении в силу). Пишет блок TRACK в canvas.tsx.
Если есть дата вступления в силу и номер ФЗ — закон автоматически добавляется в LAWS (раздел
«Вступают в силу») с пустыми sut/who: их пишет бот по out/TODO.md. Ничего не выдумывается.
Запуск: python3 track.py [номер ...]  (без аргументов — все законопроекты 2-го/3-го чтения из canvas)"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__)); import common as C
MON = {m: i + 1 for i, m in enumerate('января февраля марта апреля мая июня июля августа сентября октября ноября декабря'.split())}

def stage(t, pat):
    m = re.search(pat + r'.{0,200}?(\d\d\.\d\d\.\d{4})', t); return m.group(1) if m else ''

def force_date(n_law, pub, sign=''):
    """Дата вступления в силу из текста закона на kremlin.ru; '' если явно не указана."""
    h = f'/tmp/kr_{n_law}.html'
    if not C.fetch('http://kremlin.ru/acts/bank/search?query=' + n_law.replace(' ', '+'), h, 60): return '', ''
    m = re.search(r'href="(/acts/bank/\d+)"', open(h, errors='ignore').read())
    if not m: return '', ''
    url = 'http://kremlin.ru' + m.group(1); h2 = h + '.doc'
    if not C.fetch(url + '/page/1', h2, 60): return '', ''
    t = re.sub(r'\s+', ' ', C.text(open(h2, errors='ignore').read()))
    if n_law.replace('№ ', '') not in t or (sign and sign not in t):
        return '', ''  # поиск kremlin.ru нашел не тот акт — не используем
    m = re.search(r'вступает в силу (?:с|со) (\d{1,2}) (' + '|'.join(MON) + r') (\d{4})', t)
    if m: return f'{int(m.group(1)):02d}.{MON[m.group(2)]:02d}.{m.group(3)}', url
    if re.search(r'вступает в силу со дня (?:его )?официального опубликования', t) and pub: return pub, url
    return '', url  # «по истечении N дней» и т.п. — оставить боту/вручную

def one(n):
    h = f'/tmp/sozd_{n}.html'
    if not C.fetch(f'https://sozd.duma.gov.ru/bill/{n}', h):
        C.log('track_fail.log', f'{n}: sozd не ответил'); return None
    t = C.text(open(h, errors='ignore').read()); t = re.sub(r'\s+', ' ', t)
    t = t[t.find('По событиям'):] if 'По событиям' in t else t
    m2 = re.search(r'(\d\d\.\d\d\.\d{4}) \d\d\.\d\d\.\d\d +принять законопроект во втором чтении', t)
    r = {'r2': m2.group(1) if m2 else '',
         'r3': stage(t, r'третьем чтении Рассмотрение законопроекта Государственной Думой'),
         'sf': stage(t, r'Рассмотрение закона на заседании Совета Федерации'),
         'sign': stage(t, r'Рассмотрение закона Президентом Российской Федерации'),
         'pub': stage(t, r'Опубликование закона Опубликование закона')}
    m = re.search(r'закон подписан (\d+-ФЗ)', t); law = m.group(1) if m else ''
    if law: r['law'] = law
    if law and r['sign']:
        f, u = force_date(f"№ {law}", r['pub'], r['sign'])
        if f: r['force'] = f
        if u: r['kremlin'] = u
    r['src'] = 'sozd.duma.gov.ru' + (', kremlin.ru' if r.get('kremlin') else '')
    return {k: v for k, v in r.items() if v}

def add_law(src, n, tr, title):
    """Авто-добавление в «Вступают в силу», если есть дата и номер ФЗ."""
    i = src.index('const LAWS: any = ') + len('const LAWS: any = '); j = src.index(';\n', i)
    L = json.loads(src[i:j]); d = tr['force']; mk = d[3:]
    law = f"Федеральный закон от {tr['sign']} № {tr['law']}"
    arr = L['months'].setdefault(mk, [])
    if any(tr['law'] in x.get('law', '') for x in arr): return src
    arr.append({'d': d, 'law': law, 'title': title, 'sut': '', 'auto': 1, 'bill': n})
    arr.sort(key=lambda x: x['d'][:2])
    C.log('laws_auto.log', f'{n}: {law}, вступает {d}')
    return src[:i] + json.dumps(L, ensure_ascii=False) + src[j:]

if __name__ == '__main__':
    src = C.read_canvas(); T = C.get_block(src, 'TRACK'); titles = {}
    ns = sys.argv[1:] or sorted({doc for d, v, doc, q, rd in C.votes(src) if doc != '—' and re.search(r'[23]', rd)})
    for d, v, doc, q, rd in C.votes(src): titles.setdefault(doc, q)
    for n in ns:
        tr = one(n)
        if not tr: continue
        T[n] = tr
        if tr.get('force') and tr.get('law'): src = add_law(src, n, tr, titles.get(n, ''))
        print(n, tr)
    C.write_canvas(C.set_block(src, 'TRACK', 'const TRACK: Record<string, Record<string, string>>', T))
