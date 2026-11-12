#!/usr/bin/env python3
"""cal_merge.py [canvas.tsx] — шаг CAL после calendar_update.py: заменяет строку `const CAL: any = …;` в $CANVAS
($GD_ROOT/src/canvas.tsx) данными из $GD_ROOT/out/calendar.json, НЕ теряя прошлых повесток: для каждого дня берется
объединение пунктов (старые short сохраняются), заседания Правительства — объединение старых и новых; статус дня
не понижается. Проверка (assert): ни один старый пункт не потерян. Сериализация компактная — как в текущей строке CAL.
Нет out/calendar.json — выход 1, canvas не меняется. Заменяет устаревший embed_calendar.py (pipeline/legacy/)."""
import json,sys,os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C
P=sys.argv[1] if len(sys.argv)>1 else C.CANVAS
CJ=os.path.join(C.OUT,'calendar.json')
if not os.path.exists(CJ): print('cal_merge: нет', CJ, '— CAL не изменён', file=sys.stderr); sys.exit(1)
s=open(P).read(); pre='const CAL: any = '
i=s.find(pre); e=s.find('\n',i); old=json.loads(s[i+len(pre):e].rstrip(';'))
c=json.load(open(CJ))
O={p['d']:p for p in old['p']}
def key(d): return d[6:]+d[3:5]+d[:2]
ps={}
for d in c['days']:
    na=[[a['doc'],a['short'],a.get('reading'),a['url'],a['title']] for a in d['agenda']]
    o=O.get(d['date'])
    if o:
        oa=o['a']; od={(x[0],x[4]) for x in oa}
        a=oa+[x for x in na if (x[0],x[4]) not in od]
        st=d['status']
        if o['s']=='held' or (o['s']=='confirmed' and st=='expected'): st=o['s']   # не понижать статус
        ps[d['date']]={'d':d['date'],'s':st,'t':d.get('time') or o.get('t'),'src':d['source'] if len(a)==len(na) or not oa else o['src'],'a':a}
        if a==oa: ps[d['date']]['src']=o['src']; ps[d['date']]['t']=o.get('t')
    else:
        ps[d['date']]={'d':d['date'],'s':d['status'],'t':d.get('time'),'src':d['source'],'a':na}
for k,o in O.items():
    if k not in ps: ps[k]=o
g={x[0]:x for x in old['g']}
for x in c['gov_meetings']: g[x['date']]=[x['date'],x['title'],x['url']]
cal={'u':c['updated'],'w':[[w['from'],w['to'],w['type']] for w in c['weeks']],
     'p':[ps[k] for k in sorted(ps,key=key)],'g':[g[k] for k in sorted(g,key=key)],'n':old.get('n',[])}
# проверка: ничего из старых повесток не потеряно
for k,o in O.items():
    for x in o['a']: assert x in ps[k]['a'], (k,x)
for x in old['g']: assert x[0] in g
new=s[:i]+pre+json.dumps(cal,ensure_ascii=False,separators=(',',':'))+';'+s[e:]
if new==s: print('CAL: без изменений'); sys.exit(0)
C.write_canvas(new, P); print('CAL ok: days',len(cal['p']),'items',sum(len(p['a']) for p in cal['p']),'gov',len(cal['g']))
