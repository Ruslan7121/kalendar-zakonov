"""Производные копии канона $CANVAS (= $GD_ROOT/src/canvas.tsx), запускается после любых правок canvas (commit.sh, run_daily.sh):
  src/canvas.code-only.tsx — тот же файл, крупные константы данных заменены заглушками (для чтения кода);
  out/canvas.tsx, out/canvas.code-only.tsx — копии в репозитории без строки «import React from "react";»
  (форма прежней страницы; сайт из них НЕ собирается, web/build.sh берёт src/canvas.tsx).
Запуск: python3 pipeline/strip_code_only.py"""
import re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C
SRC = C.CANVAS
s = open(SRC).read(); full = s
def end_of(s,i):
    d=0;q=None
    while i<len(s):
        c=s[i]
        if q:
            if c=='\\': i+=2; continue
            if c==q: q=None
        elif c in '\'"`': q=c
        elif c in '([{': d+=1
        elif c in ')]}': d-=1
        elif c==';' and d==0: return i
        i+=1
    raise Exception
for n,rep in [(x,'{} as any') for x in 'SUM NV DEP_RAW BP LAWS LAWS_FIX CAL GOVA ZTAG'.split()]+[('INFO_RAW',"'{}'")]:
    m=re.search(r'^const '+n+r'\b[^=]*= ',s,re.M); a=m.end(); e=end_of(s,a)
    s=s[:a]+rep+s[e:]
IMP = 'import React from "react";\n'
def mirror(t): return t[len(IMP):] if t.startswith(IMP) else t
co = os.path.join(os.path.dirname(SRC), 'canvas.code-only.tsx')
open(co, 'w').write(s); print(co, len(s), s.count('\n'))
if os.path.realpath(SRC) == os.path.realpath(os.path.join(C.ROOT, 'src', 'canvas.tsx')):
    os.makedirs(os.path.join(C.ROOT, 'out'), exist_ok=True)
    open(os.path.join(C.ROOT, 'out', 'canvas.tsx'), 'w').write(mirror(full))
    open(os.path.join(C.ROOT, 'out', 'canvas.code-only.tsx'), 'w').write(mirror(s))
    print('out/canvas.tsx, out/canvas.code-only.tsx: синхронизированы с src/')
