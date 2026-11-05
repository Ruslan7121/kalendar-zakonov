import re
s=open('/workspace/out/canvas.tsx').read()
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
open('/workspace/out/canvas.code-only.tsx','w').write(s); print(len(s), s.count('\n'))
