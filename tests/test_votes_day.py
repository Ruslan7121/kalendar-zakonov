#!/usr/bin/env python3
"""Проверка votes_day.py на сохранённых официальных страницах vote.duma.gov.ru. Из корня репозитория: python3 tests/test_votes_day.py"""
import os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('GD_ROOT', '/tmp/gd-test-root'); os.makedirs(os.environ['GD_ROOT'] + '/out', exist_ok=True)
sys.path.insert(0, os.path.join(R, 'pipeline'))
import votes_day as V
F = lambda n: open(os.path.join(R, 'tests', 'fixtures', n)).read()

rows, maxp, empty = V.parse_list(F('vote_list_11.11.2026_p1.html'))
assert len(rows) == 20 and maxp == 4 and not empty
assert rows[0] == {'day': '11.11.2026', 'time': '12:08:32', 'id': '136341', 'ok': True, 'for': 422, 'against': 0, 'abst': 0,
                   'title': '(за основу) О проекте порядка работы Государственной Думы на 11 ноября 2026 года'}
r, _, empty = V.parse_list(F('vote_list_empty.html')); assert r == [] and empty

def line(page):
    d = V.parse_vote(F(page)); reading, doc, sh, q = V.split_title(d['title']); ok = d['ok']
    if reading.startswith('к отклонению:'): reading, ok = reading.split(':', 1)[1], not ok
    return d, V.data_line({'id': page.split('_')[1].split('.')[0], 'doc': doc, 'short': sh, 'reading': reading, 'ok': ok, 'total': d['total'], 'fr': d['fr']})

d, ln = line('vote_136343.html')
assert (d['day'], d['time']) == ('11.11.2026', '12:17:11')          # VT — со страницы самого голосования
assert ln == '136343|25978-9|О ратификации Договора между Российской Федерацией и Королевством Камбоджа о передаче лиц, осуж…|—|1|422/0/0/28|329/0/0/21;35/0/0/2;21/0/0/3;20/0/0/0;15/0/0/2;2/0/0/0', ln
d, ln = line('vote_136301_reject.html')                              # «к отклонению»: законопроект отклонён (ok=0), чтение 2-е
assert ln.startswith('136301|386704-8|') and '|2-е|0|332/14/0/104|' in ln, ln
assert V.parse_vote('<html>504 Gateway Time-out</html>') is None    # сбой — не строка DATA

src = "const DATA: Record<string,string> = {\n'01.11.2026': `1|—|a|—|1|1/0/0/449|`\n};\nDATA['02.11.2026'] = '';\nconst VT = {};"
v = {'id': '5', 'doc': '—', 'short': 'b', 'reading': '—', 'ok': True, 'total': [1, 0, 0, 449], 'fr': {}}
s2, add, kept, _ = V.merge_day(src, '01.11.2026', [v, {**v, 'id': '1', 'short': 'ИЗМЕНЕНО'}])
assert add == ['5'] and "`1|—|a|—|1|1/0/0/449|\n5|—|b|" in s2                # существующая строка не тронута
assert V.merge_day(s2, '01.11.2026', [v])[0] == s2                          # идемпотентно
s3, add, _, _ = V.merge_day(src, '02.11.2026', [v]); assert "DATA['02.11.2026'] = `5|" in s3
s4, add, _, _ = V.merge_day(src, '03.11.2026', [v]); assert "DATA['02.11.2026'] = '';\nDATA['03.11.2026'] = `5|" in s4
print('OK')
