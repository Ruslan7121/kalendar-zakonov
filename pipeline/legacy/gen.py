# LEGACY: не запускать — см. pipeline/legacy/README.md (заменён pipeline/votes_day.py).
import json,glob,re,datetime
DEF={'ЕР':350,'КПРФ':37,'ЛДПР':24,'НЛ':20,'СРЗП':17,'Вне':2}
F=['ЕР','КПРФ','ЛДПР','НЛ','СРЗП','Вне']
def key(f): return datetime.datetime.strptime(f.split('/')[-1][:10],'%d.%m.%Y')
days=sorted(glob.glob('days/*.json'),key=key)
def short(q,n=97):
  m=re.match(r'^О проекте (федерального закона|постановления Государственной Думы|федерального конституционного закона)\s*(№\s*[\d-]+)?\s*',q)
  s=q[m.end():] if m else q
  s=s.strip().strip('"«»“”').replace('|','/').replace('`',"'")
  return (s[:n-2].rstrip()+'…') if len(s)>n else s
out=[];sums={}
for f in days:
  d=json.load(open(f));D=d['date'];L=[]
  for v in d['votes']:
    fr=';'.join('/'.join(map(str,v['fr'][k]['v']))+('' if v['fr'][k]['size']==DEF[k] else ':'+str(v['fr'][k]['size'])) for k in F) if v.get('fr') else ''
    L.append('|'.join([v['id'],v['doc'],v['short'].replace('|','/'),v['reading'],'1' if v['ok'] else '0','/'.join(map(str,v['total'])),fr,short(v['q'],180)]))
  out.append((D,'\n'.join(L)))
  s=d['summary'];du=s['duma']
  if d.get('novotes'):
    sums[D]={'nv':1,'d':s['duma'],'g':s['gov']};continue
  sums[D]={'g':[[a,b,u.split('/news/')[1].strip('/')] for a,b,u in s['gov']]}
  X={'l':{k:[[a,short(b),u.rsplit('/',1)[1]] for a,b,u in x] for k,x in du['laws'].items()},'p':[[a,short(b),u.rsplit('/',1)[1]] for a,b,u in du['decisions']],'r':du['rejected'],'g':[[a,b,u.split('/news/')[1].strip('/')] for a,b,u in s['gov']]}
tx=json.load(open('texts.json'))
TX='\n'.join(f"{b}|{x['url'].rsplit('/',1)[1]}|{x['fmt']}" for b,x in sorted(tx.items()))
data="const DATA: Record<string,string> = {\n"+',\n'.join(f"'{D}': `{s}`" for D,s in out)+"\n};\n"
data+="const SUM: Record<string, any> = "+json.dumps(sums,ensure_ascii=False)+";\n"
data+="const TX_RAW = `"+TX+"`;\n"
open('/workspace/duma/data.ts','w').write(data)
print(len(data.encode()),len(data))
