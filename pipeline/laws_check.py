#!/usr/bin/env python3
"""Сверка полноты «Вступают в силу» с официальными подборками Госдумы «Какие законы вступают в силу в <месяце>» (duma.gov.ru/news).

Скачивает подборки (адреса — аргументы; кроме них — подборки, на которые ссылаются скачанные страницы), выписывает из текста
номера законов «№ N-ФЗ» и сравнивает с LAWS в src/canvas.tsx. Печатает: каких законов из подборки нет на сайте и каких законов
сайта нет в подборке. Данные не меняет — это отчет для ручного дополнения (тексты «Суть» пишутся по официальным источникам).
Запуск: python3 laws_check.py URL [URL ...]
"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__)); import common as C

MON = 'январе феврале марте апреле мае июне июле августе сентябре октябре ноябре декабре'.split()
DIR = os.path.join(C.OUT, 'laws_check'); os.makedirs(DIR, exist_ok=True)


def digest_links(html):
    """Ссылки на другие подборки «… законы вступают в силу в <месяце>» на странице duma.gov.ru."""
    out = []
    for m in re.finditer(r'(?is)<a[^>]+href="(/news/\d+/)"[^>]*>(.*?)</a>', html):
        t = C.text(m.group(2))
        if re.search(r'закон\w* вступа\w* в силу', t, re.I): out.append(('http://duma.gov.ru' + m.group(1), t.strip()))
    return out


def laws_in(text):
    """Номера законов из текста подборки: «№ 425-ФЗ», «Федеральный закон № 425-ФЗ от …» — с фрагментом вокруг."""
    res = {}
    for m in re.finditer(r'№\s*(\d+-ФЗ)', text):
        res.setdefault(m.group(1), re.sub(r'\s+', ' ', text[max(0, m.start() - 160):m.end() + 60]))
    return res


def items_in(html):
    """15.11.2026: пункты подборки — подзаголовки и выделенные строки статьи (<h2>-<h4>, <strong>, <b>): в подборках
    duma.gov.ru законы описаны простым языком, номеров «№ N-ФЗ» в тексте нет."""
    h = re.search(r'(?is)<h1[^>]*>.*?</h1>(.*)', html); body = h.group(1) if h else html
    for stop in ('Читайте также', 'Подписывайтесь', 'Новости по теме'):
        j = body.find(stop)
        if j > 0: body = body[:j]
    out = []
    for m in re.finditer(r'(?is)<(h[2-4]|strong|b)[^>]*>(.*?)</\1>', body):
        t = re.sub(r'\s+', ' ', C.text(m.group(2))).strip(' :.—-')
        if 12 <= len(t) <= 220 and t not in out: out.append(t)
    return out


STOPW = set('закон законы федеральный федерального вступает вступают силу которые будет будут могут также после году года'.split())


def words(t):
    return {w[:6] for w in re.findall(r'[а-яёa-z0-9]+', (t or '').lower()) if len(w) >= 5 and w not in STOPW}


def best(item, site):
    """Самый похожий закон сайта по общим основам слов (первые 6 букв): (доля, заголовок)."""
    a = words(item); r = (0.0, '')
    for t, w in site:
        if a and w:
            k = len(a & w) / min(len(a), len(w))
            if k > r[0]: r = (k, t)
    return r


def body_text(html):
    """Текст статьи без меню и подвала: от заголовка <h1> до блока «Читайте также»/подвала, если найдутся."""
    t = C.text(html); h = re.search(r'(?is)<h1[^>]*>(.*?)</h1>', html)
    if h:
        i = t.find(C.text(h.group(1)).strip()[:40])
        if i > 0: t = t[i:]
    for stop in ('Читайте также', 'Подписывайтесь', 'Новости по теме'):
        j = t.find(stop)
        if j > 0: t = t[:j]
    return t


def main(urls):
    src = C.read_canvas(); i = src.index('const LAWS: any = ') + len('const LAWS: any = '); L = json.loads(src[i:src.index(';\n', i)])
    fi = src.find('const LAWS_FIX: any = '); F = json.loads(src[fi + 22:src.index(';\n', fi)]) if fi >= 0 else {}
    site = {}
    for mk, arr in L['months'].items():
        for k, x in enumerate(arr):
            law = (F.get(mk, {}).get(str(k), {}).get('law') or x.get('law') or '')
            for n in re.findall(r'№\s*(\d+-ФЗ)', law): site.setdefault(n, []).append(f"{x['d']} {x['title']}")
    sitew = [(f"{x['d']} {x['title']}", words(' '.join([x.get('title', ''), x.get('sut', '') if isinstance(x.get('sut'), str) else ' '.join(x.get('sut') or []), x.get('who', '')]))) for arr in L['months'].values() for x in arr]
    miss_items = []
    queue, seen, total = list(urls), set(), {}
    while queue and len(seen) < 8:
        u = queue.pop(0)
        if u in seen: continue
        seen.add(u); h = os.path.join(DIR, re.sub(r'\W+', '_', u)[-50:] + '.html')
        if not C.fetch(u, h, 90): print(f'=== {u}: не загрузилась'); continue
        html = open(h, errors='ignore').read(); title = (re.search(r'(?is)<title[^>]*>(.*?)</title>', html) or [None, ''])[1]
        found = laws_in(body_text(html)); print(f'=== {u}\n    {C.text(title).strip()}\n    законов в подборке: {len(found)}')
        for n, ctx in found.items():
            print(f"    {'есть на сайте' if n in site else 'НЕТ НА САЙТЕ'}: № {n} — {ctx[-200:]}")
        total.update(found)
        its = items_in(html); print(f'    пунктов подборки (подзаголовки): {len(its)}')
        for it in its:
            k, t = best(it, sitew)
            print(f"    {'есть' if k >= 0.34 else 'НЕТ НА САЙТЕ?'} ({k:.2f}): {it[:120]}" + (f'  ≈ {t[:80]}' if k >= 0.34 else ''))
            if k < 0.34: miss_items.append(f'{it[:150]} ({u})')
        for v, t in digest_links(html):
            if v not in seen and re.search(r'в (октябре|ноябре|декабре)', t): queue.append(v); print(f'    → подборка: {t} {v}')
    print(f'\nПункты подборок без похожего закона на сайте ({len(miss_items)}), проверить вручную по официальному тексту:'); [print('   ', m) for m in miss_items]
    miss = [n for n in total if n not in site]
    print(f'\nИТОГО: в подборках {len(total)} законов, нет на сайте {len(miss)}: {", ".join(miss) or "—"}')
    extra = [f'№ {n}: {"; ".join(v)}' for n, v in site.items() if n not in total]
    print(f'Законы сайта, которых нет в скачанных подборках ({len(extra)}; для сентября и декабря — ожидаемо):'); [print('   ', e) for e in extra]


if __name__ == '__main__':
    main(sys.argv[1:] or ['http://duma.gov.ru/news/64396/'])
