#!/usr/bin/env python3
"""cal_merge.py: повестка duma.gov.ru не дублирует пункты, которые уже есть в CAL под тем же номером документа
(20.11.2026: вечерний daily упал на test_calendar_visible — «19.11.2026: законопроект дважды в списке дня»: семь
законопроектов 19.11 были внесены с полными названиями sozd, повестка дала их же с другим написанием). Без сети."""
import os, sys, json, shutil, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
tmp = tempfile.mkdtemp(); os.makedirs(os.path.join(tmp, 'out', 'cache'))
cv = os.path.join(tmp, 'canvas.tsx'); shutil.copy(os.path.join(ROOT, 'src', 'canvas.tsx'), cv)
s = open(cv).read(); pre = 'const CAL: any = '; i = s.index(pre) + len(pre); cal = json.loads(s[i:s.index('\n', i)].rstrip(';'))
old = {p['d']: p for p in cal['p']}; D = '19.11.2026'; assert D in old and old[D]['a'], 'в CAL нет повестки 19.11.2026'
ag = [{'doc': x[0], 'short': x[1], 'reading': x[2], 'url': x[3], 'title': x[4] + ' (другое написание)'} for x in old[D]['a']]
ag.append({'doc': '999903-9', 'short': 'Новый', 'reading': '1-е', 'url': 'https://sozd.duma.gov.ru/bill/999903-9', 'title': 'Новый пункт'})
nd = [{'doc': '999904-9', 'short': 'A', 'reading': '1-е', 'url': 'u', 'title': 'A'}, {'doc': '999904-9', 'short': 'A', 'reading': '1-е', 'url': 'u', 'title': 'A2'}]
c = {'updated': '20.11.2026 21:49', 'weeks': [{'from': w[0], 'to': w[1], 'type': w[2]} for w in cal['w']], 'gov_meetings': [],
     'days': [{'date': D, 'status': 'confirmed', 'source': 'test', 'agenda': ag}, {'date': '31.12.2026', 'status': 'expected', 'source': 'test', 'agenda': nd}]}
json.dump(c, open(os.path.join(tmp, 'out', 'calendar.json'), 'w'), ensure_ascii=False)
r = subprocess.run([sys.executable, os.path.join(ROOT, 'pipeline', 'cal_merge.py'), cv], env={**os.environ, 'GD_ROOT': tmp, 'CANVAS': cv}, capture_output=True, text=True)
assert r.returncode == 0, r.stdout + r.stderr
s = open(cv).read(); i = s.index(pre) + len(pre); new = {p['d']: p for p in json.loads(s[i:s.index('\n', i)].rstrip(';'))['p']}
ids = [x[0] for x in new[D]['a']]
assert len(ids) == len(set(ids)), f'{D}: пункт дважды: {ids}'
assert new[D]['a'][:len(old[D]['a'])] == old[D]['a'], f'{D}: старые пункты изменены'
assert ids[-1] == '999903-9' and len(ids) == len(old[D]['a']) + 1, f'{D}: новый пункт повестки не добавлен: {ids}'
assert new[D]['s'] == 'held', 'статус дня понижен'
assert [x[0] for x in new['31.12.2026']['a']] == ['999904-9'], 'новый день: пункт дважды'
print(f'OK test_cal_merge: {D} — {len(ids)} пунктов без дублей, новый пункт добавлен, новый день без дублей')
