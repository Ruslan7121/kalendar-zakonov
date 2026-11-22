#!/usr/bin/env python3
"""22.11.2026: pipeline/peek.py — команды работают и выводят коротко (не больше 20 КБ каждая)."""
import os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def run(*a):
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'pipeline', 'peek.py'), *a], capture_output=True, text=True, cwd=ROOT)
    assert r.returncode == 0, f'peek {a}: код {r.returncode}: {r.stderr[:300]}'
    assert len(r.stdout) < 20000, f'peek {a}: вывод {len(r.stdout)} символов — слишком длинный'
    return r.stdout
assert 'PeriodHead:' in run('map')
assert run('find', 'PeriodHead', 'src/canvas.tsx', '3').count('\n') <= 5
assert 'BP:' in run('bill', '64-9')
assert 'документы органов' in run('debt')
assert 'суть:' in run('org', 'Постановление', '2')
print('OK test_peek: map, find, bill, org, debt работают и выводят коротко')
