#!/usr/bin/env python3
"""Переносит «Суть / Кого коснется / Было-Стало» из out/days/*.json в canvas.tsx.
Схема в days/YYYY-MM-DD.json:
  "bp":   {"<номер законопроекта>": {"sut": [str], "who": str, "bs": [[было, стало], ...]}}
  "proc": {"<id голосования>": [суть, кого коснется]}   # процедурные голосования
Запуск: python3 bp_merge.py [canvas.tsx] [days/*.json ...]  (по умолчанию $CANVAS = $GD_ROOT/src/canvas.tsx и все $GD_ROOT/out/days/*.json).
15.11.2026: поля сливаются по одному (sut, who, bs): файл с одними bs не стирает уже написанную «Суть». Файлы, названные
в командной строке, перезаписывают поля; без списка файлов (все out/days/*.json) заполняются только пустые поля — старые
файлы дней не затирают более новые тексты. «ё» заменяется на «е». Запись — через common.write_canvas (проверка и резервная копия)."""

import json, sys, glob, os

sys.path[:0] = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'),
]
import common as C

cv = sys.argv[1] if len(sys.argv) > 1 else C.CANVAS
files = sys.argv[2:] or sorted(glob.glob(os.path.join(C.OUT, 'days', '*.json')))
FILL_ONLY = not sys.argv[2:]
L = open(cv).read().split('\n')
yo = lambda x: json.loads(json.dumps(x, ensure_ascii=False).replace('ё', 'е').replace('Ё', 'Е'))


def find(pre):
    for i, l in enumerate(L):
        if l.startswith(pre):
            return i
    raise SystemExit('нет строки ' + pre)


bpre = 'const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = '
ppre = 'const PROC: Record<string, string[]> = '
bi, pi = find(bpre), find(ppre)
bp = json.loads(L[bi][len(bpre) : -1])
pr = json.loads(L[pi][len(ppre) : -1])
n = 0
for f in files:
    d = json.load(open(f))
    for k, v in (d.get('bp') or {}).items():
        v = {x: v[x] for x in ('sut', 'who', 'bs') if v.get(x)}
        v = yo(v)
        old = bp.get(k) or {}
        new = {**v, **old} if FILL_ONLY else {**old, **v}
        if new != old:
            bp[k] = new
            n += 1
    for k, v in (d.get('proc') or {}).items():
        v = yo(v)
        if pr.get(k) != v and not (FILL_ONLY and pr.get(k)):
            pr[k] = v
            n += 1
L[bi] = bpre + json.dumps(bp, ensure_ascii=False) + ';'
L[pi] = ppre + json.dumps(pr, ensure_ascii=False) + ';'
C.write_canvas('\n'.join(L), cv)
print('изменено записей:', n)
