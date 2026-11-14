#!/usr/bin/env python3
"""«Вступают в силу»: прямая ссылка на официальный текст закона (kremlin.ru/acts/bank/<id>).

Для каждого закона из LAWS без официальной ссылки (*.gov.ru, kremlin.ru, government.ru, cbr.ru) берём номер и дату из поля
law («Федеральный закон от 28.11.2025 № 425-ФЗ …»), ищем его на kremlin.ru/acts/bank/search (тот же поиск, что в track.py),
открываем найденные страницы и оставляем только ту, где номер и дата подписания стоят в заголовке самого акта
(<title>, og:title, <h1>) — не во всём тексте: на страницах kremlin.ru есть ленты других документов. Найденная ссылка
добавляется в src закона (и в LAWS_FIX, если он подменяет src этого закона). Не нашлось или источник недоступен — ничего
не меняем, пишем в out/logs/laws_src.log; на сайте остаётся ссылка на поиск закона на kremlin.ru.
Запуск: python3 laws_src.py [--dry]
"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__)); import common as C

MON = 'января февраля марта апреля мая июня июля августа сентября октября ноября декабря'.split()
OFF = re.compile(r'(\.gov\.ru|^kremlin\.ru|^government\.ru|^cbr\.ru)$')


def host(u):
    return re.sub(r'^https?://', '', u or '').split('/')[0].split('?')[0].lower().removeprefix('www.')


def is_off(u):
    return bool(OFF.search(host(u)))


def law_key(law):
    """«Федеральный закон от 28.11.2025 № 425-ФЗ (…)» → ('425-ФЗ', '28.11.2025'); нет номера или даты — None."""
    n = re.search(r'№\s*(\d+-ФЗ)', law or ''); d = re.search(r'от\s+(\d\d\.\d\d\.\d{4})', law or '')
    return (n.group(1), d.group(1)) if n and d else None


def date_words(d):
    """28.11.2025 → ['28.11.2025', '28 ноября 2025'] — как дата может быть записана на странице акта."""
    dd, mm, yy = d.split('.')
    return [d, f'{int(dd)} {MON[int(mm) - 1]} {yy}']


def candidates(html):
    """Ссылки на акты из страницы поиска kremlin.ru (в порядке появления, без повторов)."""
    out = []
    for m in re.finditer(r'href="(/acts/bank/\d+)"', html):
        if m.group(1) not in out: out.append(m.group(1))
    return out


def matches(text, num, d):
    """Строка (заголовок акта) — нужный закон: есть номер «№ 425-ФЗ» и дата подписания."""
    t = re.sub(r'\s+', ' ', text)
    return bool(re.search(r'№\s*' + re.escape(num) + r'(?!\d)', t)) and any(w in t for w in date_words(d))


def heads(html):
    """Заголовки страницы акта: <title>, og:title, <h1>. Только по ним сверяем номер и дату — в тексте страницы kremlin.ru
    есть ленты других документов, и сверка по всему тексту (14.11.2026) приняла старые акты 8506, 12755… за законы 2025–2026 годов."""
    out = [m.group(1) for m in re.finditer(r'(?is)<title[^>]*>(.*?)</title>', html)]
    out += [m.group(1) for m in re.finditer(r'(?is)<meta[^>]+property="og:title"[^>]+content="([^"]*)"', html)]
    out += [m.group(1) for m in re.finditer(r'(?is)<h1[^>]*>(.*?)</h1>', html)]
    return [C.text(h) for h in out]


def page_ok(html, num, d):
    """Страница — нужный закон, только если номер и дата есть в одном из её заголовков."""
    return any(matches(h, num, d) for h in heads(html))


def find(num, d):
    h = f'/tmp/lawsrc_{num}.html'
    if not C.fetch('http://kremlin.ru/acts/bank/search?query=' + ('№ ' + num).replace(' ', '+'), h, 60):
        return None, 'поиск kremlin.ru недоступен'
    for path in candidates(open(h, errors='ignore').read())[:5]:
        h2 = h + path.rsplit('/', 1)[1]
        if not C.fetch('http://kremlin.ru' + path, h2, 60): continue
        if page_ok(open(h2, errors='ignore').read(), num, d):
            return 'http://kremlin.ru' + path, ''
    return None, 'в поиске kremlin.ru нет страницы с этим номером и датой'


def main(dry=False):
    src = C.read_canvas()
    i = src.index('const LAWS: any = ') + len('const LAWS: any = '); j = src.index(';\n', i); L = json.loads(src[i:j])
    fi = src.find('const LAWS_FIX: any = '); F = None
    if fi >= 0: fi += len('const LAWS_FIX: any = '); fj = src.index(';\n', fi); F = json.loads(src[fi:fj])
    found = 0
    for mk, arr in L['months'].items():
        for k, x in enumerate(arr):
            fx = (F or {}).get(mk, {}).get(str(k), {})
            cur = fx.get('src', x.get('src', []))
            if any(is_off(l.get('u')) for l in cur): continue
            key = law_key(fx.get('law', x.get('law', '')))
            if not key: C.log('laws_src.log', f"{x['d']} {x.get('title')}: в реквизитах нет номера или даты"); continue
            url, why = find(*key)
            if not url: C.log('laws_src.log', f"{x['d']} № {key[0]} от {key[1]}: {why}"); continue
            link = {'t': 'kremlin.ru', 'u': url}
            x['src'] = [link] + list(x.get('src', []))
            if 'src' in fx: fx['src'] = [link] + list(fx['src'])
            found += 1; C.log('laws_src.log', f"{x['d']} № {key[0]} от {key[1]}: {url}")
    print(f'laws_src: найдено прямых ссылок {found}')
    if not found or dry: return
    out = src[:i] + json.dumps(L, ensure_ascii=False) + src[j:]
    if F is not None:
        a = out.index('const LAWS_FIX: any = ') + len('const LAWS_FIX: any = '); b = out.index(';\n', a)
        out = out[:a] + json.dumps(F, ensure_ascii=False) + out[b:]
    C.write_canvas(out)


if __name__ == '__main__':
    main('--dry' in sys.argv)
