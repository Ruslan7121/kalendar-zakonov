#!/usr/bin/env python3
"""Переносит «Суть / Кого коснется / Было-Стало» из out/days/*.json в canvas.tsx.
Схема в days/YYYY-MM-DD.json:
  "bp":   {"<номер законопроекта>": {"sut": [str], "who": str, "bs": [[было, стало], ...]}}
  "proc": {"<id голосования>": [суть, кого коснется]}   # процедурные голосования
Запуск: python3 bp_merge.py [canvas.tsx] [days/*.json ...]  (по умолчанию все дни)."""
import json, sys, glob
cv = sys.argv[1] if len(sys.argv) > 1 else '/workspace/out/canvas.tsx'
files = sys.argv[2:] or sorted(glob.glob('/workspace/out/days/*.json'))
L = open(cv).read().split('\n')
def find(pre):
    for i, l in enumerate(L):
        if l.startswith(pre): return i
    raise SystemExit('нет строки ' + pre)
bpre = 'const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = '
ppre = 'const PROC: Record<string, string[]> = '
bi, pi = find(bpre), find(ppre)
bp = json.loads(L[bi][len(bpre):-1]); pr = json.loads(L[pi][len(ppre):-1])
n = 0
for f in files:
    d = json.load(open(f))
    for k, v in (d.get('bp') or {}).items():
        v = {x: v[x] for x in ('sut', 'who', 'bs') if v.get(x)}
        s = json.dumps(v, ensure_ascii=False)
        assert 'ё' not in s and 'Ё' not in s, f'{f}: ё в {k}'
        if bp.get(k) != v: bp[k] = v; n += 1
    for k, v in (d.get('proc') or {}).items():
        if pr.get(k) != v: pr[k] = v; n += 1
L[bi] = bpre + json.dumps(bp, ensure_ascii=False) + ';'
L[pi] = ppre + json.dumps(pr, ensure_ascii=False) + ';'
open(cv, 'w').write('\n'.join(L))
print('изменено записей:', n)
