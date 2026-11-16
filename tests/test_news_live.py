#!/usr/bin/env python3
"""16.11.2026: оперативные новости (pipeline/news_live.py) без сети — на сохраненных ответах tests/fixtures/live/.
Проверяет: разбор каждого источника (заголовок, дата, время, официальная ссылка), окно 7 дней, слияние с прежним файлом
без повторов по ссылке и сохранение прежних новостей, когда источник не ответил."""
import os, sys, json, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'pipeline'))
import news_live as N

FIX = os.path.join(ROOT, 'tests', 'fixtures', 'live')
tmp = tempfile.mkdtemp(); out = os.path.join(tmp, 'live.json')
J, new = N.main(['--offline', FIX, '--today', '16.11.2026', '--out', out])
items = J['items']; by = {}
for x in items: by.setdefault(x['o'], []).append(x)

# 1) каждый источник разобран, поля на месте
for o in ('gd', 'gov', 'sf', 'cbr', 'mintrud'):
    assert by.get(o), f'{o}: нет новостей; status={J["status"]}'
for x in items:
    assert x['u'].startswith('http') and x['t'] and len(x['t']) >= 10 and x['d'], x
    assert 'ё' not in x['t'], x
host = {'gd': 'duma.gov.ru', 'gov': 'government.ru', 'sf': 'council.gov.ru', 'cbr': 'cbr.ru', 'mintrud': 'mintrud.gov.ru', 'minjust': 'minjust.gov.ru'}
for x in items: assert host[x['o']] in x['u'], f'чужая ссылка у {x["o"]}: {x["u"]}'

# 2) Госдума: только статьи списка (не пункты меню), время из datetime, &laquo; раскрыт
gd = {x['u']: x for x in by['gd']}
assert set(gd) == {'http://duma.gov.ru/news/64487/', 'http://duma.gov.ru/news/64490/'}, gd.keys()
assert gd['http://duma.gov.ru/news/64490/']['tm'] == '09:05' and gd['http://duma.gov.ru/news/64490/']['d'] == '16.11.2026'
assert '«цифровом рубле»' in gd['http://duma.gov.ru/news/64490/']['t']
# 3) СФ: время — цифры атрибута как есть (московское), без повтора ссылки из картинки
sf = {x['u']: x for x in by['sf']}
assert sf['http://council.gov.ru/events/news/178366/']['tm'] == '19:28' and len(sf) == 2, sf
# 4) Правительство и ЦБ: RSS, время по Москве
gov = {x['u']: x for x in by['gov']}
assert gov['http://government.ru/news/60463/']['tm'] == '12:00' and gov['http://government.ru/news/60463/']['d'] == '16.11.2026'
assert by['cbr'][0]['tm'] == '18:37' and by['cbr'][0]['d'] == '13.11.2026'
# 5) порядок — от новых к старым
key = [(x['d'][6:] + x['d'][3:5] + x['d'][:2], x['tm']) for x in items]
assert key == sorted(key, reverse=True), key
# 6) окно 7 дней: ничего старше 10.11.2026
assert all(x['d'][6:] + x['d'][3:5] + x['d'][:2] >= '20261110' for x in items)

# 7) слияние: прежний файл + источник не ответил — прежние новости остаются; новый прогон без изменений — новых нет
prev = os.path.join(tmp, 'prev.json')
old = {'items': [{'o': 'minfin', 'd': '15.11.2026', 'tm': '13:48', 't': 'Минфин: новость, собранная прошлым запуском', 'u': 'https://minfin.gov.ru/ru/press-center/?id_4=1'},
                 {'o': 'gd', 'd': '01.11.2026', 'tm': '', 't': 'Слишком старая новость за пределами окна', 'u': 'http://duma.gov.ru/news/1/'}] + items[:2]}
json.dump(old, open(prev, 'w'), ensure_ascii=False)
J2, new2 = N.main(['--offline', FIX, '--today', '16.11.2026', '--prev', prev, '--out', out])
u2 = [x['u'] for x in J2['items']]
assert 'https://minfin.gov.ru/ru/press-center/?id_4=1' in u2, 'новость прежнего запуска потерялась'
assert 'http://duma.gov.ru/news/1/' not in u2, 'старая новость не убрана из окна'
assert len(u2) == len(set(u2)), 'повторы по ссылке'
assert {x['u'] for x in new2} == {x['u'] for x in J2['items']} - {x['u'] for x in old['items']}, 'новыми считаются только ссылки, которых не было в прежнем файле'
print(f'OK test_news_live: {len(items)} новостей ({", ".join(f"{o} {len(v)}" for o, v in by.items())}); слияние и окно 7 дней')
