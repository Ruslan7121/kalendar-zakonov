#!/usr/bin/env python3
"""Пункт 7: gap_check.py — пропуски DATA/CAL по рабочим дням. Сеть не нужна (синтетический canvas, без --online).
Из корня репозитория: python3 tests/test_gap_check.py"""
import os, sys, json, tempfile, datetime as dt
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = tempfile.mkdtemp(prefix='gd-gap-')
os.environ.update(GD_ROOT=T, GD_DUMA=T + '/duma', GD_DAYS=T + '/days')
os.makedirs(T + '/days', exist_ok=True)
sys.path.insert(0, os.path.join(R, 'pipeline'))
import gap_check as G

CAL = {'u': '11.11.2026 07:30', 'w': [['02.11.2026', '08.11.2026', 'regional'], ['09.11.2026', '15.11.2026', 'plenary']],
       'p': [{'d': '10.11.2026', 's': 'confirmed', 'a': []}, {'d': '11.11.2026', 's': 'held', 'a': []}], 'g': [['05.11.2026', 'x', 'u']], 'n': []}
SRC = ("const DATA: Record<string,string> = {\n'27.10.2026': `1|1-8|Т|в целом|1|400/0/0/50|`,\n};\n"
       "const NV: Record<string, any> = " + json.dumps({'03.11.2026': {'nv': 1}}) + ";\n"
       "DATA['03.11.2026'] = '';\n"
       "DATA['10.11.2026'] = `2|2-8|Т|в целом|1|400/0/0/50|`;\n"
       "const CAL: any = " + json.dumps(CAL) + ";\n")
# 13.11 — сегодня; 12.11 — официально голосовали (days json), но DATA нет; 05.11 — официально «ничего не найдено»
json.dump({'date': '12.11.2026', 'votes': [{'id': '3'}, {'id': '4'}], 'gaps': []}, open(T + '/days/12.11.2026.json', 'w'))
json.dump({'date': '05.11.2026', 'novotes': 1, 'votes': []}, open(T + '/days/05.11.2026.json', 'w'))
r = G.check(SRC, today=dt.date(2026, 11, 13))
D = {x['d']: x for x in r['days']}
assert r['from'] == '27.10.2026' and r['to'] == '13.11.2026', r
assert '04.11.2026' not in D and '31.10.2026' not in D            # праздник ст. 112 и суббота — не рабочие
assert not D['27.10.2026']['gap_data'] and D['27.10.2026']['gap_cal']   # голосования есть, CAL.w/CAL.p нет
assert D['28.10.2026']['gap_data'] and D['28.10.2026']['gap_cal']       # ни DATA, ни CAL
assert not D['03.11.2026']['gap_data'] and not D['03.11.2026']['gap_cal']   # NV — подтверждено, неделя regional
assert not D['05.11.2026']['gap_data'] and D['05.11.2026']['info']     # novotes в days json
assert D['06.11.2026']['gap_data'] and not D['06.11.2026']['gap_cal']   # неделя известна, DATA не подтверждён
assert not D['10.11.2026']['gap_data']
assert D['11.11.2026']['gap_data'] and 'CAL.p' in D['11.11.2026']['gap_data'][0]   # заседание held, DATA нет
assert D['12.11.2026']['gap_data'] and 'vote.duma.gov.ru' in D['12.11.2026']['gap_data'][0] and D['12.11.2026']['gap_cal']
assert not D['13.11.2026']['gap_data'] and 'сегодня' in D['13.11.2026']['info'][0]
assert any('10.11.2026' in w and 'held' in w for w in r['warnings'])    # confirmed в прошлом при голосованиях
assert any('26.10.2026' in w and 'Правительства' in w for w in r['warnings'])
assert G.check(SRC, d_from='09.11.2026', today=dt.date(2026, 11, 13))['from'] == '09.11.2026'
print(G.render(r)); print('OK test_gap_check')
