#!/usr/bin/env python3
"""16.11.2026: оперативные новости (pipeline/collect/news_live.py) без сети — на сохраненных ответах tests/fixtures/live/.
Проверяет: разбор каждого источника (заголовок, дата, время, официальная ссылка), окно 7 дней, слияние с прежним файлом
без повторов по ссылке и сохранение прежних новостей, когда источник не ответил."""

import os, sys, json, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path[:0] = [os.path.join(os.path.join(ROOT, 'pipeline'), d) for d in ('lib', 'collect', 'merge', 'check')]
import news_live as N

FIX = os.path.join(ROOT, 'tests', 'fixtures', 'live')
tmp = tempfile.mkdtemp()
out = os.path.join(tmp, 'live.json')
J, new = N.main(['--offline', FIX, '--today', '16.11.2026', '--out', out])
items = J['items']
by = {}
for x in items:
    by.setdefault(x['o'], []).append(x)

# 1) каждый источник разобран, поля на месте
for o in ('gd', 'gov', 'sf', 'cbr', 'mintrud'):
    assert by.get(o), f'{o}: нет новостей; status={J["status"]}'
for x in items:
    assert x['u'].startswith('http') and x['t'] and len(x['t']) >= 10 and x['d'], x
    assert 'ё' not in x['t'], x
host = {
    'economy': 'economy.gov.ru',
    'minzdrav': 'minzdrav.gov.ru',
    'gd': 'duma.gov.ru',
    'gov': 'government.ru',
    'sf': 'council.gov.ru',
    'cbr': 'cbr.ru',
    'mintrud': 'mintrud.gov.ru',
    'minjust': 'minjust.gov.ru',
}
for x in items:
    assert host[x['o']] in x['u'], f'чужая ссылка у {x["o"]}: {x["u"]}'

# 1а) 18.11.2026: Минэкономразвития (дата и время в карточке) и Минздрав (дата в адресе новости) — парсеры на сохраненных страницах
# (в общий файл за окно «сегодня 16.11» они не попадают: новости от 18.11 — позже «сегодня»); пункты меню и формы не попадают
ec = {x['u']: x for x in N.p_economy(open(os.path.join(FIX, 'economy_news.html'), encoding='utf-8').read())}
assert len(ec) == 2, ec
e1 = ec['https://economy.gov.ru/material/news/pravitelstvo_vvodit_obyazatelnuyu_ocenku_koncessiy.html']
assert (e1['d'], e1['tm'], e1['o']) == ('18.11.2026', '16:44', 'economy'), e1
mz = {x['u']: x for x in N.p_minzdrav(open(os.path.join(FIX, 'minzdrav_news.html'), encoding='utf-8').read())}
assert len(mz) == 3, mz
assert mz[
    'https://minzdrav.gov.ru/news/2026/11/14/33398-mihail-murashko-otkryl-novyy-korpus-detskoy-bolnitsy-v-stavropolsko'
]['d'] == '14.11.2026' and all(not x['tm'] for x in mz.values()), mz
# 2) Госдума: только статьи списка (не пункты меню), время из datetime, &laquo; раскрыт
gd = {x['u']: x for x in by['gd']}
assert set(gd) == {'http://duma.gov.ru/news/64487/', 'http://duma.gov.ru/news/64490/'}, gd.keys()
assert (
    gd['http://duma.gov.ru/news/64490/']['tm'] == '09:05' and gd['http://duma.gov.ru/news/64490/']['d'] == '16.11.2026'
)
assert '«цифровом рубле»' in gd['http://duma.gov.ru/news/64490/']['t']
# 3) СФ: время — цифры атрибута как есть (московское), без повтора ссылки из картинки
sf = {x['u']: x for x in by['sf']}
assert sf['http://council.gov.ru/events/news/178366/']['tm'] == '19:28' and len(sf) == 2, sf
# 4) Правительство и ЦБ: RSS, время по Москве
gov = {x['u']: x for x in by['gov']}
assert (
    gov['http://government.ru/news/60463/']['tm'] == '12:00'
    and gov['http://government.ru/news/60463/']['d'] == '16.11.2026'
)
assert by['cbr'][0]['tm'] == '18:37' and by['cbr'][0]['d'] == '13.11.2026'
# 5) порядок — от новых к старым
key = [(x['d'][6:] + x['d'][3:5] + x['d'][:2], x['tm']) for x in items]
assert key == sorted(key, reverse=True), key
# 6) окно 7 дней: ничего старше 10.11.2026
assert all(x['d'][6:] + x['d'][3:5] + x['d'][:2] >= '20261110' for x in items)

# 7) слияние: прежний файл + источник не ответил — прежние новости остаются; новый прогон без изменений — новых нет
prev = os.path.join(tmp, 'prev.json')
old = {
    'items': [
        {
            'o': 'minfin',
            'd': '15.11.2026',
            'tm': '13:48',
            't': 'Минфин: новость, собранная прошлым запуском',
            'u': 'https://minfin.gov.ru/ru/press-center/?id_4=1',
        },
        {
            'o': 'gd',
            'd': '01.11.2026',
            'tm': '',
            't': 'Слишком старая новость за пределами окна',
            'u': 'http://duma.gov.ru/news/1/',
        },
    ]
    + items[:2]
}
json.dump(old, open(prev, 'w'), ensure_ascii=False)
J2, new2 = N.main(['--offline', FIX, '--today', '16.11.2026', '--prev', prev, '--out', out])
u2 = [x['u'] for x in J2['items']]
assert 'https://minfin.gov.ru/ru/press-center/?id_4=1' in u2, 'новость прежнего запуска потерялась'
assert 'http://duma.gov.ru/news/1/' not in u2, 'старая новость не убрана из окна'
assert len(u2) == len(set(u2)), 'повторы по ссылке'
assert {x['u'] for x in new2} == {x['u'] for x in J2['items']} - {x['u'] for x in old['items']}, (
    'новыми считаются только ссылки, которых не было в прежнем файле'
)
print(
    f'OK test_news_live: {len(items)} новостей ({", ".join(f"{o} {len(v)}" for o, v in by.items())}); слияние и окно 7 дней'
)

# 26.11.2026: лента Госдумы читается постранично (/news/, /news/page/2/, …), пока на странице есть новости не старше lo;
# раньше бралась только первая страница (15 новостей) и терялись новости дня (21.11, 24–25.11)
import datetime as _dt


def _page(items):
    return ''.join(
        f'<article class="article--post"><a href="/news/{i}/">x</a><time datetime="{d} {tm}:00"></time>'
        f'<h6 class="article--post__title">Новость номер {i} для проверки</h6></article>'
        for i, d, tm in items
    )


PAGES = {
    1: _page([(64600 - k, '2026-11-25', f'{20 - k // 2:02d}:00') for k in range(15)]),
    2: _page(
        [(64585 - k, '2026-11-25', '09:00') for k in range(10)] + [(64575 - k, '2026-11-24', '18:00') for k in range(5)]
    ),
    3: _page(
        [(64570 - k, '2026-11-24', '12:00') for k in range(10)] + [(64560 - k, '2026-11-23', '18:00') for k in range(5)]
    ),
    4: _page([(64555 - k, '2026-11-23', '10:00') for k in range(15)]),
}
calls = []


def _fetch(n):
    calls.append(n)
    return ('ok', PAGES[n]) if n in PAGES else ('error 404', '')


r, pages, st = N.gd_all(_fetch, _dt.date(2026, 11, 24))
assert calls == [1, 2, 3] and pages == 3 and st == 'ok', (calls, pages, st)
us = {x['u'] for x in r}
assert len(r) == 45 == len(us), len(r)
assert 'http://duma.gov.ru/news/64571/' in us and 'http://duma.gov.ru/news/64575/' in us  # вторая и третья страницы
assert sum(x['d'] == '24.11.2026' for x in r) == 15 and sum(x['d'] == '25.11.2026' for x in r) == 25
# страница не ответила — берем, что прочитано, и пишем это в статус; первая не ответила — источник недоступен
calls.clear()
r2, p2, st2 = N.gd_all(lambda n: _fetch(n) if n < 3 else ('error 500', ''), _dt.date(2026, 11, 20))
assert p2 == 2 and len(r2) == 30 and st2 == 'page3: error 500', (p2, len(r2), st2)
assert N.gd_all(lambda n: ('error 500', ''), _dt.date(2026, 11, 24)) == ([], 0, 'error 500')
# пустая страница — конец ленты; предел страниц
assert N.gd_all(lambda n: ('ok', PAGES.get(n, '')), _dt.date(2026, 1, 1))[1] == 5
assert N.gd_all(lambda n: ('ok', PAGES[1]), _dt.date(2026, 1, 1), maxp=4)[1] == 4
print('test_news_live: постраничный сбор Госдумы OK')
