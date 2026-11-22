"""Производная копия канона $CANVAS (= $GD_ROOT/src/canvas.tsx) для чтения кода: src/canvas.code-only.tsx — тот же файл,
крупные константы данных заменены заглушками. В git не хранится (.gitignore), сайт из него не собирается (web/build.sh берет src/canvas.tsx).
Запуск: python3 pipeline/merge/strip_code_only.py (его вызывают run_daily.sh и commit.sh)"""

import re, os, sys

sys.path[:0] = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'),
]
import common as C

SRC = C.CANVAS
s = open(SRC).read()
full = s


def end_of(s, i):
    d = 0
    q = None
    while i < len(s):
        c = s[i]
        if q:
            if c == '\\':
                i += 2
                continue
            if c == q:
                q = None
        elif c in '\'"`':
            q = c
        elif c in '([{':
            d += 1
        elif c in ')]}':
            d -= 1
        elif c == ';' and d == 0:
            return i
        i += 1
    raise Exception


for n, rep in [(x, '{} as any') for x in 'SUM NV DEP_RAW BP LAWS LAWS_FIX CAL GOVA ZTAG'.split()] + [
    ('INFO_RAW', "'{}'")
]:
    m = re.search(r'^const ' + n + r'\b[^=]*= ', s, re.M)
    a = m.end()
    e = end_of(s, a)
    s = s[:a] + rep + s[e:]
co = os.path.join(os.path.dirname(SRC), 'canvas.code-only.tsx')
open(co, 'w').write(s)
print(co, len(s), s.count('\n'))
