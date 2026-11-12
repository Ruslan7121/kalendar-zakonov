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
ev = json.load(open(os.path.join(R, 'out/organs/events.json'))); enr = json.load(open(os.path.join(R, 'out/organs/enrich.json')))
assert set(enr) == {e['id'] for e in ev} and not re.search(r'неквал(?!иф)', json.dumps(enr, ensure_ascii=False))
print('OK')
