#!/usr/bin/env python3
"""Сформировать out/TODO.md — список того, что ДОЛЖЕН написать бот (текст, который программа не придумывает):
 - sut/who для голосований без описания (cardText);
 - bs («Что сейчас» / «Что предлагалось изменить») для законопроектов «О внесении изменений»;
 - sut для законов, автоматически добавленных в «Вступают в силу» (auto: 1);
 - ошибки загрузки (logs/*.log).
К каждому пункту — путь к выжимке из пояснительной записки (out/extracts/bills/<номер>.json)."""
import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(__file__)); import common as C
src = C.read_canvas()
def jobj(name):
    i = src.index(f'const {name}'); i = src.index('= ', i) + 2; j = src.index('\n', i)
    try: return json.loads(src[i:j].rstrip(';'))
    except Exception: return {}
BP, PROC = jobj('BP:'), jobj('PROC:')
a = src.index('const PLAIN'); PL = src[a:src.index('\n};', a)]
PLS = set(re.findall(r"^  '(\d+)': \{[^\n]*\b\"?sut\"?\s*:", PL, re.M))
try: INF = set(k for k, v in json.loads(re.findall(r'const INFO_RAW = \[`(.*?)`', src, re.S)[0]).items() if v.get('sut'))
except Exception: INF = set()
def has(key, vid, doc):
    if key == 'sut': return vid in PLS or vid in PROC or bool(BP.get(doc, {}).get('sut')) or doc in INF
    return bool(BP.get(doc, {}).get('bs'))
L = ['# TODO для бота', '', 'Писать только по выжимкам и официальным источникам. Без «ё» в карточках. Ничего не придумывать.', '']
miss_s, miss_b = [], []
for d, vid, doc, q, rd in C.votes(src):
    ex = os.path.join(C.EXTR, 'bills', doc + '.json') if doc != '—' else ''
    ex = ex if ex and os.path.exists(ex) else '(выжимки нет — см. logs/bills_fail.log)' if doc != '—' else '—'
    if not has('sut', vid, doc): miss_s.append(f'- [ ] {d} голосование {vid} ({doc}): sut, who — «{q[:90]}» · выжимка: {ex}')
    if doc != '—' and q.startswith('О внесении изменени') and not has('bs', vid, doc):
        miss_b.append(f'- [ ] {d} голосование {vid} ({doc}): bs — пары [«Что сейчас», «Что предлагалось изменить»] · выжимка: {ex}')
L += ['## Суть и кого касается', ''] + (miss_s or ['нет']) + ['', '## Что сейчас / что предлагалось изменить', ''] + (miss_b or ['нет'])
i = src.index('const LAWS: any = ') + 18; LW = json.loads(src[i:src.index(';\n', i)])
auto = [f"- [ ] {x['d']} {x['law']} (законопроект {x.get('bill','')}): заголовок и sut" for mk in LW['months'].values() for x in mk if x.get('auto') and not x.get('sut')]
L += ['', '## Вступают в силу — автодобавленные законы', ''] + (auto or ['нет'])
L += ['', '## Ошибки загрузки', '']
for f in sorted(glob.glob(os.path.join(C.LOGS, '*.log'))):
    ls = open(f).read().strip().splitlines(); L.append(f'- {os.path.basename(f)}: {len(ls)} строк')
open(os.path.join(C.OUT, 'TODO.md'), 'w').write('\n'.join(L) + '\n')
print('TODO:', len(miss_s), 'sut,', len(miss_b), 'bs,', len(auto), 'законов')
