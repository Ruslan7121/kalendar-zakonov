#!/usr/bin/env python3
"""Ставит метки законопроектов в ZTAG из out/days/*.json (поле "ztag": {"<номер>": [[для кого], [тема], [что меняется]]}) и убирает номер из ZAUTO.
Метки проверяются по спискам ZW / ZT / ZC из canvas.tsx; неизвестная метка — ошибка, запись не делается.
Запуск: python3 pipeline/merge/ztag_merge.py src/canvas.tsx out/days/ГГГГ-ММ-ДД.json. Запись — через common.write_canvas (проверка и резервная копия)."""

import json, sys, os

sys.path[:0] = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'),
]
import common as C

cv = sys.argv[1]
files = sys.argv[2:]
L = open(cv).read().split('\n')


def find(pre):
    for i, l in enumerate(L):
        if l.startswith(pre):
            return i
    raise SystemExit('нет строки ' + pre)


def lst(name):
    i = find('const ' + name + ' = [')
    return set(json.loads(L[i][len('const ' + name + ' = ') : -1].replace("'", '"')))


ok = [lst('ZW'), lst('ZT'), lst('ZC')]
zpre = 'const ZTAG: Record<string, [string[], string[], string[]]> = '
apre = 'const ZAUTO: string[] = '
zi, ai = find(zpre), find(apre)
zt = json.loads(L[zi][len(zpre) : -1])
za = json.loads(L[ai][len(apre) : -1])
n = 0
for f in files:
    for k, v in (json.load(open(f)).get('ztag') or {}).items():
        if len(v) != 3 or any(not a or any(x not in ok[i] for x in a) for i, a in enumerate(v)):
            raise SystemExit(f'ztag {k}: неизвестная или пустая метка: {v}')
        if zt.get(k) != v:
            zt[k] = v
            n += 1
        if k in za:
            za.remove(k)
L[zi] = zpre + json.dumps(zt, ensure_ascii=False) + ';'
L[ai] = apre + json.dumps(za, ensure_ascii=False) + ';'
C.write_canvas('\n'.join(L), cv)
print('меток записано:', n, '; осталось во временных (ZAUTO):', len(za))
