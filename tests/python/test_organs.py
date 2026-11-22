#!/usr/bin/env python3
"""Проверка парсеров и проверенных полей на сохраненных ответах. Из корня репозитория: python3 tests/python/test_organs.py"""

import os, sys, json, re

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('GD_ROOT', '/tmp/gd-test-root')
os.makedirs(os.environ['GD_ROOT'] + '/out', exist_ok=True)
sys.path[:0] = [os.path.join(os.path.join(R, 'pipeline'), d) for d in ('lib', 'collect', 'merge', 'check')]
import organs as O

F = lambda n: open(os.path.join(R, 'tests', 'fixtures', n)).read()
cb = O.parse_cbr_news(F('cbr_RssNews.xml'))
assert any(e['t'] == 'Указание № 7453-У от 23.09.2026' and e['d'] == '09.11.2026' for e in cb)
assert all(e['ty'] == 'разъяснение' for e in cb if e['k'] in ('Информационное письмо', 'Ответы на запросы'))
assert any('Криптовалюта' in e['t'] for e in O.parse_cbr_events(F('cbr_eventrss.xml')))
assert any(
    e['t'].startswith('Приказ № 357н') and e['d'] == '06.11.2026'
    for e in O.parse_mintrud_docs(F('mintrud_document_rss.xml'))
)
assert any(
    e['ty'] == 'заседание' and e['d'] == '23.10.2026' for e in O.parse_minjust_events(F('minjust_events_list.html'))
)
mf = O.parse_pravo_list(F('minfin_pravo_monthly.webfetch.md'))
assert [e['d'] for e in mf] == ['05.11.2026'] * 2
sf = O.parse_sf_meetings(F('sf_meetings.webfetch.md'))
assert sf[0]['d'] == '10.11.2026' and sf[0]['u'].endswith('/178174/agenda/')
assert O.cut('альфа бета гамма', 9) == 'альфа…'

# Проверенные поля (enrich.json) и то, что опубликовано в canvas (блоки ORG/ORGX).
# 12.11.2026 (п. 8): прежняя проверка set(enr) == ids событий устарела — по модели organs.py (load_enrich) запись в
# enrich.json необязательна: новое событие из ленты показывается по данным ленты, пока его не проверят вручную, так что
# ежедневный сбор неизбежно делал бы тест красным. Реальная ошибка была другой: «Суть» для указаний ЦБ 7466-У, 7457-У,
# 7438-У и новости 32972 (11.11) и тип «новость» для 32959/32964 внесли прямо в ORGX canvas (56653f5), не в enrich.json,
# и organs.py --embed молча стёр бы их. Теперь проверяем: в enrich.json нет записей без события, ORGX в canvas
# совпадает с enrich.json, ORG совпадает с events.json; --embed не теряет записи, которых нет в enrich.json.
import common as C

ev = json.load(open(os.path.join(R, 'out/organs/events.json')))
enr = json.load(open(os.path.join(R, 'out/organs/enrich.json')))
ids = {e['id'] for e in ev}
assert len(ids) == len(ev), 'дубли id в events.json'
assert set(enr) <= ids, f'в enrich.json записи без события: {sorted(set(enr) - ids)}'
assert not re.search(r'неквал(?!иф)', json.dumps(enr, ensure_ascii=False))
FIELDS = {'st', 'kind', 'stt', 'no', 'full', 'sut', 'who', 'dl', 'nb', 'ps', 'ty', 'k', 'ti'}
for k, v in enr.items():
    assert set(v) <= FIELDS, f'{k}: неизвестные поля {set(v) - FIELDS}'
    assert v.get('ty', 'новость') in set(O.TYPES) | {'новость'}, f'{k}: тип {v.get("ty")}'
    for u, _ in v.get('ps', []):
        assert u.startswith(('http://', 'https://')), f'{k}: источник без ссылки {u}'
canvas = open(os.path.join(R, 'src', 'canvas.tsx')).read()
orgx = C.get_block(canvas, 'ORGX')
org = C.get_block(canvas, 'ORG')
assert orgx == {k: v for k, v in enr.items() if k in ids}, (
    'ORGX в src/canvas.tsx расходится с out/organs/enrich.json '
    f'(только в canvas: {sorted(set(orgx) - set(enr))}; разные: {sorted(k for k in orgx if k in enr and orgx[k] != enr[k])}) — правки вносить в enrich.json и organs.py --embed'
)
assert org == [{k: v for k, v in e.items() if k != 'id'} for e in ev], (
    'ORG в src/canvas.tsx расходится с out/organs/events.json'
)

# --embed во временной копии: запись, которой нет в enrich.json, но есть в ORGX canvas, не теряется; enrich.json главнее.
import shutil, tempfile, contextlib, io

T = tempfile.mkdtemp(prefix='gd-organs-')
try:
    od = os.path.join(T, 'organs')
    os.makedirs(od)
    shutil.copy(os.path.join(R, 'out/organs/events.json'), od)
    k0, k1 = sorted(enr)[:2]
    json.dump(
        {k: v for k, v in enr.items() if k != k0} | {k1: {**enr[k1], 'nb': 'из enrich.json'}},
        open(os.path.join(od, 'enrich.json'), 'w'),
        ensure_ascii=False,
    )
    cv = os.path.join(T, 'canvas.tsx')
    open(cv, 'w').write(
        f'/* ORG:start */const ORG: any[] = [];/* ORG:end */\n/* ORGX:start */const ORGX: Record<string, any> = {json.dumps(orgx, ensure_ascii=False)};/* ORGX:end */\n'
    )
    saved = (O.ODIR, O.ENRICH, C.CANVAS)
    O.ODIR, O.ENRICH, C.CANVAS = od, os.path.join(od, 'enrich.json'), cv
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as er:
            O.main(
                [
                    '--offline',
                    os.path.join(R, 'tests', 'fixtures'),
                    '--from',
                    '01.01.2099',
                    '--to',
                    '02.01.2099',
                    '--ahead',
                    '0',
                    '--embed',
                ]
            )
    finally:
        O.ODIR, O.ENRICH, C.CANVAS = saved
    x2 = C.get_block(open(cv).read(), 'ORGX')
    assert x2[k0] == orgx[k0] and k0 in er.getvalue(), '--embed стёр запись ORGX, которой нет в enrich.json'
    assert x2[k1]['nb'] == 'из enrich.json', '--embed: enrich.json должен быть главнее ORGX'
    assert len(C.get_block(open(cv).read(), 'ORG')) == len(ev)
finally:
    shutil.rmtree(T, ignore_errors=True)
# 14.11.2026: новости Минюста — все материалы ленты, кроме коллегий и проектов, идут как «новость» (вкладка «Новости»)
mj = O.parse_minjust_events(open(os.path.join(R, 'tests', 'fixtures', 'minjust_events_list.html')).read())
mjn = [e for e in mj if e['ty'] == 'новость']
assert mjn and all(e['u'].startswith('https://minjust.gov.ru/ru/events/') for e in mjn), 'новости Минюста не разобраны'
assert any(e['d'] == '03.11.2026' and e['t'].startswith('Константин Чуйченко совершил рабочую поездку') for e in mjn)
assert not any('коллеги' in e['t'].lower() for e in mjn), 'коллегия — заседание, не новость'
# 14.11.2026: новости Минтруда — «Картина дня»: заголовок и дата в одной ссылке, видеобанк и разделы без даты пропускаются
mt = O.parse_mintrud_news(open(os.path.join(R, 'tests', 'fixtures', 'mintrud_news_list.html')).read())
assert [e['d'] for e in mt] == ['13.11.2026', '05.11.2026', '11.11.2026', '06.11.2026'], [e['d'] for e in mt]
assert all(e['ty'] == 'новость' and e['o'] == 'mintrud' and e['u'].startswith('https://mintrud.gov.ru/') for e in mt)
assert not any('videobank' in e['u'] or 'event-profi' in e['u'] for e in mt)
# 14.11.2026: новости Минфина — список пресс-центра (без дат) + дата со страницы новости
ml = O.parse_minfin_list(open(os.path.join(R, 'tests', 'fixtures', 'minfin_press_list.html')).read())
assert [u.split('id_4=')[1][:5] for u, _ in ml] == ['40752', '40751'], ml
art = open(os.path.join(R, 'tests', 'fixtures', 'minfin_press_article.html')).read()
t_, d_ = O.parse_minfin_article(art)
assert d_ and O.d2s(d_) == '14.11.2026' and t_.startswith('В поправках Правительства'), (t_, d_)
got = O.collect_minfin_news(
    open(os.path.join(R, 'tests', 'fixtures', 'minfin_press_list.html')).read(),
    fetch=lambda u: ('ok', art) if '40752' in u else ('error:HTTP 404', ''),
)
assert len(got) == 1 and got[0]['ty'] == 'новость' and got[0]['o'] == 'minfin' and got[0]['d'] == '14.11.2026', got
# 16.11.2026: указы Президента и акты Правительства — API publication.pravo.gov.ru (без ИИ, официальное опубликование)
import json as _j

_fx = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fixtures')
_p = O.parse_pravo_api(open(os.path.join(_fx, 'pravo_api_pres.json')).read(), 'pres')
assert [e['t'] for e in _p] == [
    'Указ № 848 от 14.11.2026: О помиловании Чекалиной В.В.',
    'Указ № 841 от 10.11.2026: О Чрезвычайном и Полномочном После Российской Федерации в Габонской Республике',
], _p
assert all(
    e['o'] == 'pres'
    and e['ty'] == 'решение'
    and e['k'] == 'Указ'
    and e['u'].startswith('http://publication.pravo.gov.ru/document/000120261')
    for e in _p
), _p
_g = O.parse_pravo_api(open(os.path.join(_fx, 'pravo_api_gov.json')).read(), 'gov')
assert [(e['k'], e['d']) for e in _g] == [('Постановление', '14.11.2026'), ('Распоряжение', '14.11.2026')], _g
assert _g[1]['t'] == 'Распоряжение № 3383-р от 14.11.2026' and _g[1].get('x') == 'Опубликован 16.11.2026', _g[1]
# 18.11.2026: восемь министерств — приказы с официального опубликования; событие стоит на дне опубликования, не подписания
assert set(O.MIN8) == {'economy', 'promtorg', 'minzdrav', 'mintrans', 'digital', 'mvd', 'mnr', 'minstroy'} and all(
    O.SOURCES[o + '_pravo'].endswith(i) and 'block=federal_authorities' in O.SOURCES[o + '_pravo']
    for o, i in O.MIN8.items()
)
_e = O.parse_pravo_api(open(os.path.join(_fx, 'pravo_api_economy.json')).read(), 'economy', True)
assert [(e['k'], e['d']) for e in _e] == [('Приказ', '10.11.2026'), ('Приказ', '06.11.2026')], _e
assert (
    _e[0]['t']
    == 'Приказ № 689 от 05.10.2026: О внесении изменения в пункт 2 приказа Минэкономразвития России от 14 октября 2020 г. № 678'
), _e[0]['t']
assert (
    _e[0]['x'] == 'Зарегистрирован Минюстом 09.11.2026 № 89097. Опубликован 10.11.2026'
    and _e[0]['u'] == 'http://publication.pravo.gov.ru/document/0001202611100011'
), _e[0]
# 19.11.2026: пропуск приказов за 19.11 (МВД № 801, Минюст № 325, Минздрав № 878н, Минтруд № 483н/482н). Фикстура — настоящий ответ API
# «опубликовано сегодня» (periodType=daily, блок federal_authorities) за 19.11.2026: 18 приказов, из них 5 — органов из нашего списка.
assert (
    set(O.FOIV) == set(O.MIN8) | {'mintrud', 'minjust'}
    and O.SOURCES['mintrud_pravo'].endswith(O.FOIV['mintrud'])
    and O.SOURCES['minjust_pravo'].endswith(O.FOIV['minjust'])
)
_dj = open(os.path.join(_fx, 'pravo_api_daily.json')).read()
_d = O.parse_pravo_daily(_dj)
assert sorted((e['o'], e['t'].split(':')[0]) for e in _d) == [
    ('minjust', 'Приказ № 325 от 13.11.2026'),
    ('mintrud', 'Приказ № 482н от 15.10.2026'),
    ('mintrud', 'Приказ № 483н от 15.10.2026'),
    ('minzdrav', 'Приказ № 878н от 15.10.2026'),
    ('mvd', 'Приказ № 801 от 06.10.2026'),
], _d
assert all(e['d'] == '19.11.2026' and e['ty'] == 'решение' and e['k'] == 'Приказ' for e in _d), (
    _d
)  # день опубликования, не подписания
assert {e['u'] for e in _d if e['o'] == 'mvd'} == {'http://publication.pravo.gov.ru/document/0001202611190013'}
assert not any('спорта' in e['t'] or 'антимонопольн' in e['t'] for e in _d), (
    'органы вне списка (Минспорт, ФАС …) не собираются'
)
# тот же документ из сбора по органу и из ленты «сегодня» — один id (при слиянии в events.json дубля нет)
_one = O.parse_pravo_api(_j.dumps({'items': [x for x in _j.loads(_dj)['items'] if x['number'] == '801']}), 'mvd', True)
assert [e['id'] for e in _one] == [e['id'] for e in _d if e['o'] == 'mvd']
_dc = []


def _fd(u):
    _dc.append(u)
    return 'ok', _dj


_r, _st = O.collect_pravo_daily(fetch=_fd)
assert (
    _st == 'ok' and len(_r) == 5 and len(_dc) == 1 and 'periodType=daily' in _dc[0] and 'PageSize=200&Index=1' in _dc[0]
), (_st, _dc)
# сбор по органу: API отдает документы от новых к старым по дню опубликования — свежий приказ (подписан в октябре) в окне 12–19.11 не теряется
O.WIN_FROM = O.dt.date(2026, 11, 12)
_r, _st = O.collect_pravo_api(
    'mvd_pravo',
    'mvd',
    fetch=lambda u: (
        'ok',
        _j.dumps({'items': [x for x in _j.loads(_dj)['items'] if x['number'] == '801'], 'pagesTotalCount': 1}),
    ),
)
assert _st == 'ok' and [e['d'] for e in _r] == ['19.11.2026'], _r
# приказ Минтруда и в RSS сайта, и на опубликовании — остается один, с опубликования
_rss = O.ev(
    'mintrud',
    O.dt.date(2026, 11, 18),
    'решение',
    'Приказ № 483н от 15.10.2026: Об утверждении Порядка',
    'https://mintrud.gov.ru/docs/mintrud/orders/9999',
    'Приказ',
)
_keep = O.ev(
    'mintrud',
    O.dt.date(2026, 11, 18),
    'решение',
    'Приказ № 506 от 09.11.2026: О внесении',
    'https://mintrud.gov.ru/docs/mintrud/orders/3278',
    'Приказ',
)
_dd = O.drop_rss_dupes(_d + [_rss, _keep])
assert _rss not in _dd and _keep in _dd and len(_dd) == 6, _dd
# 18.11.2026: проверка схемы (validate_data.mjs) знает каждый орган из ORGS — иначе сбор нового органа роняет весь прогон (так упал первый запуск organs с министерствами)
_vd = open(os.path.join(R, 'pipeline', 'check', 'validate_data.mjs'), encoding='utf-8').read()
assert all(f"'{k}'" in _vd for k in O.ORGS), [k for k in O.ORGS if f"'{k}'" not in _vd]
# обход страниц: 400 на PageSize=100 → переход на 10; остановка, когда документы старше начала окна
_calls = []


def _fetch(u):
    _calls.append(u)
    if 'PageSize=100' in u:
        return 'error:HTTP 400', ''
    return 'ok', open(os.path.join(_fx, 'pravo_api_pres.json')).read()


O.WIN_FROM = O.dt.date(2026, 11, 12)
_r, _st = O.collect_pravo_api('pres_pravo', 'pres', fetch=_fetch)
assert _st == 'ok' and len(_r) == 2 and len(_calls) == 2 and 'PageSize=10&Index=1' in _calls[1], (_st, _calls)
# 17.11.2026: --only pres — длинный сбор только указов Президента (без Правительства и остальных органов), с уже имеющимися событиями не теряется
_T2 = tempfile.mkdtemp(prefix='gd-organs-only-')
try:
    _od = os.path.join(_T2, 'organs')
    os.makedirs(_od)
    _saved = O.ODIR
    json.dump(
        [
            {
                'id': 'gov:keep',
                'o': 'gov',
                'd': '10.11.2026',
                'ty': 'решение',
                't': 'Постановление № 1 от 10.11.2026',
                'u': 'http://x',
                'k': 'Постановление',
            }
        ],
        open(os.path.join(_od, 'events.json'), 'w'),
        ensure_ascii=False,
    )
    O.ODIR = _od
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            _ev, _run = O.main(
                [
                    '--offline',
                    os.path.join(R, 'tests', 'fixtures'),
                    '--from',
                    '01.11.2026',
                    '--to',
                    '16.11.2026',
                    '--ahead',
                    '0',
                    '--only',
                    'pres',
                    '--pages',
                    '40',
                ]
            )
    finally:
        O.ODIR = _saved
    assert set(_run['sources']) == {'pres_pravo'} and _run['sources']['pres_pravo']['n'] == 2, _run['sources']
    assert sorted(e['o'] for e in _ev) == ['gov', 'pres', 'pres'], [
        e['o'] for e in _ev
    ]  # чужое событие осталось, добавлены два указа
finally:
    shutil.rmtree(_T2, ignore_errors=True)
# 18.11.2026: сайт министерства закрыт для GitHub (blocked) → при ORGANS_PROXY=1 страница берется через RU-прокси; без переменной — как раньше
_d, _f = O._direct, O.C.fetch
O._direct = lambda u, t=25: ('blocked:HTTP 503, страница ограничения доступа', '')


def _fake_fetch(u, out, deadline=120):
    open(out, 'w', encoding='utf-8').write('<html>' + 'Приказ ' * 400 + '</html>')
    return True


O.C.fetch = _fake_fetch
os.environ.pop('ORGANS_PROXY', None)
assert O.get('https://minfin.gov.ru/x')[0].startswith('blocked')
os.environ['ORGANS_PROXY'] = '1'
st, b = O.get('https://minfin.gov.ru/x')
assert st == 'ok' and 'Приказ' in b, (st, b[:40])
O.C.fetch = lambda u, out, deadline=120: False
assert O.get('https://minfin.gov.ru/x')[0].startswith('blocked')
os.environ.pop('ORGANS_PROXY', None)
O._direct, O.C.fetch = _d, _f
print(f'OK test_organs: событий {len(ev)}, с проверенными полями {len(enr)}, ORG/ORGX в canvas совпадают с out/organs')
