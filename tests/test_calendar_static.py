#!/usr/bin/env python3
"""calendar_update.load_static: без $GD_DUMA/calendar_static.json распорядок берется из CAL в src/canvas.tsx (15.11.2026:
кэш Actions из запусков laws/organs без этого файла ломал обновление календаря в ежедневном прогоне)."""
import os, sys, json, tempfile
os.environ['GD_DUMA'] = tempfile.mkdtemp()  # calendar_update создает $GD_DUMA/cal_cache при импорте; в CI /workspace недоступен
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pipeline'))
import common as C, calendar_update as U

s = C.read_canvas(); i = s.index('const CAL: any = ') + len('const CAL: any = '); cal = json.loads(s[i:s.index('\n', i)].rstrip(';'))
st = U.load_static('/nonexistent/calendar_static.json')
assert [[w['from'], w['to'], w['type']] for w in st['weeks']] == cal['w']
assert [p['date'] for p in st['plenary_days']] == [p['d'] for p in cal['p']]
assert all(p['status'] in ('expected', 'confirmed', 'held') and p['source'] for p in st['plenary_days'])
print(f'OK test_calendar_static: распорядок из CAL — {len(st["weeks"])} недель, {len(st["plenary_days"])} пленарных дней')
