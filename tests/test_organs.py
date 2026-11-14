#!/usr/bin/env python3
"""Проверка парсеров и проверенных полей на сохраненных ответах. Из корня репозитория: python3 tests/test_organs.py"""
import os, sys, json, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('GD_ROOT', '/tmp/gd-test-root'); os.makedirs(os.environ['GD_ROOT'] + '/out', exist_ok=True)
sys.path.insert(0, os.path.join(R, 'pipeline'))
import organs as O
F = lambda n: open(os.path.join(R, 'tests', 'fixtures', n)).read()
cb = O.parse_cbr_news(F('cbr_RssNews.xml')); assert any(e['t'] == 'Указание № 7453-У от 23.09.2026' and e['d'] == '09.11.2026' for e in cb)
assert all(e['ty'] == 'разъяснение' for e in cb if e['k'] in ('Информационное письмо', 'Ответы на запросы'))
assert any('Криптовалюта' in e['t'] for e in O.parse_cbr_events(F('cbr_eventrss.xml')))
assert any(e['t'].startswith('Приказ № 357н') and e['d'] == '06.11.2026' for e in O.parse_mintrud_docs(F('mintrud_document_rss.xml')))
assert any(e['ty'] == 'заседание' and e['d'] == '23.10.2026' for e in O.parse_minjust_events(F('minjust_events_list.html')))
mf = O.parse_pravo_list(F('minfin_pravo_monthly.webfetch.md')); assert [e['d'] for e in mf] == ['05.11.2026'] * 2
sf = O.parse_sf_meetings(F('sf_meetings.webfetch.md')); assert sf[0]['d'] == '10.11.2026' and sf[0]['u'].endswith('/178174/agenda/')
assert O.cut('альфа бета гамма', 9) == 'альфа…'

# Проверенные поля (enrich.json) и то, что опубликовано в canvas (блоки ORG/ORGX).
# 12.11.2026 (п. 8): прежняя проверка set(enr) == ids событий устарела — по модели organs.py (load_enrich) запись в
# enrich.json необязательна: новое событие из ленты показывается по данным ленты, пока его не проверят вручную, так что
# ежедневный сбор неизбежно делал бы тест красным. Реальная ошибка была другой: «Суть» для указаний ЦБ 7466-У, 7457-У,
# 7438-У и новости 32972 (11.11) и тип «новость» для 32959/32964 внесли прямо в ORGX canvas (56653f5), не в enrich.json,
# и organs.py --embed молча стёр бы их. Теперь проверяем: в enrich.json нет записей без события, ORGX в canvas
# совпадает с enrich.json, ORG совпадает с events.json; --embed не теряет записи, которых нет в enrich.json.
import common as C
ev = json.load(open(os.path.join(R, 'out/organs/events.json'))); enr = json.load(open(os.path.join(R, 'out/organs/enrich.json')))
ids = {e['id'] for e in ev}
assert len(ids) == len(ev), 'дубли id в events.json'
assert set(enr) <= ids, f'в enrich.json записи без события: {sorted(set(enr) - ids)}'
assert not re.search(r'неквал(?!иф)', json.dumps(enr, ensure_ascii=False))
FIELDS = {'st', 'kind', 'stt', 'no', 'full', 'sut', 'who', 'dl', 'nb', 'ps', 'ty', 'k'}
for k, v in enr.items():
    assert set(v) <= FIELDS, f'{k}: неизвестные поля {set(v) - FIELDS}'
    assert v.get('ty', 'новость') in set(O.TYPES) | {'новость'}, f'{k}: тип {v.get("ty")}'
    for u, _ in v.get('ps', []): assert u.startswith(('http://', 'https://')), f'{k}: источник без ссылки {u}'
canvas = open(os.path.join(R, 'src', 'canvas.tsx')).read()
orgx = C.get_block(canvas, 'ORGX'); org = C.get_block(canvas, 'ORG')
assert orgx == {k: v for k, v in enr.items() if k in ids}, ('ORGX в src/canvas.tsx расходится с out/organs/enrich.json '
    f'(только в canvas: {sorted(set(orgx) - set(enr))}; разные: {sorted(k for k in orgx if k in enr and orgx[k] != enr[k])}) — правки вносить в enrich.json и organs.py --embed')
assert org == [{k: v for k, v in e.items() if k != 'id'} for e in ev], 'ORG в src/canvas.tsx расходится с out/organs/events.json'

# --embed во временной копии: запись, которой нет в enrich.json, но есть в ORGX canvas, не теряется; enrich.json главнее.
import shutil, tempfile, contextlib, io
T = tempfile.mkdtemp(prefix='gd-organs-')
try:
    od = os.path.join(T, 'organs'); os.makedirs(od); shutil.copy(os.path.join(R, 'out/organs/events.json'), od)
    k0, k1 = sorted(enr)[:2]
    json.dump({k: v for k, v in enr.items() if k != k0} | {k1: {**enr[k1], 'nb': 'из enrich.json'}}, open(os.path.join(od, 'enrich.json'), 'w'), ensure_ascii=False)
    cv = os.path.join(T, 'canvas.tsx'); open(cv, 'w').write(f"/* ORG:start */const ORG: any[] = [];/* ORG:end */\n/* ORGX:start */const ORGX: Record<string, any> = {json.dumps(orgx, ensure_ascii=False)};/* ORGX:end */\n")
    saved = (O.ODIR, O.ENRICH, C.CANVAS); O.ODIR, O.ENRICH, C.CANVAS = od, os.path.join(od, 'enrich.json'), cv
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as er:
            O.main(['--offline', os.path.join(R, 'tests', 'fixtures'), '--from', '01.01.2099', '--to', '02.01.2099', '--ahead', '0', '--embed'])
    finally: O.ODIR, O.ENRICH, C.CANVAS = saved
    x2 = C.get_block(open(cv).read(), 'ORGX')
    assert x2[k0] == orgx[k0] and k0 in er.getvalue(), '--embed стёр запись ORGX, которой нет в enrich.json'
    assert x2[k1]['nb'] == 'из enrich.json', '--embed: enrich.json должен быть главнее ORGX'
    assert len(C.get_block(open(cv).read(), 'ORG')) == len(ev)
finally: shutil.rmtree(T, ignore_errors=True)
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
print(f'OK test_organs: событий {len(ev)}, с проверенными полями {len(enr)}, ORG/ORGX в canvas совпадают с out/organs')
