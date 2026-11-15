#!/usr/bin/env python3
"""Сформировать out/TODO.md — список того, что ДОЛЖЕН написать бот (текст, который программа не придумывает):
 - sut/who для голосований без описания (cardText);
 - bs («Что сейчас» / «Что предлагалось изменить») для законопроектов «О внесении изменений»;
 - sut для законов, автоматически добавленных в «Вступают в силу» (auto: 1);
 - ошибки загрузки (logs/*.log).
К каждому пункту — путь к выжимке из пояснительной записки (extracts/bills/<номер>.json).
 - tg (метки «Для кого», «Тема», «Что меняется» из ZW/ZT/ZC) для законов «Вступают в силу» — по ним закон попадает в RSS-ленты меток."""
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
# 15.11.2026: процедурные голосования без документа (doc «—»: порядок работы, Счетная комиссия) текста не требуют — в TODO не идут;
# постановления — отдельным разделом (по желанию); все списки — сначала свежие дни (бот успевает главное).
_dk = lambda l: tuple(reversed(re.search(r'(\d\d)\.(\d\d)\.(\d{4})', l).groups()))
miss_s = [l for l in miss_s if '(—)' not in l]; miss_p = sorted([l for l in miss_s if '(Пост.' in l], key=_dk, reverse=True)
miss_s = sorted([l for l in miss_s if '(Пост.' not in l], key=_dk, reverse=True); _seen = set(); miss_b = [l for l in sorted(miss_b, key=_dk, reverse=True) if '(Пост.' not in l and not (re.search(r'\(([^)]+)\): bs', l).group(1) in _seen or _seen.add(re.search(r'\(([^)]+)\): bs', l).group(1)))]  # bs — один раз на законопроект
L += ['## Суть и кого касается — законопроекты', ''] + (miss_s or ['нет']) + ['', '## Что сейчас / что предлагалось изменить (сначала свежие)', ''] + (miss_b or ['нет'])
L += ['', '## Постановления Госдумы — суть (по желанию)', ''] + (miss_p or ['нет'])
# 15.11.2026: метки ZTAG у законопроектов повестки (CAL.p): без них падает tests/js/test_search_tags.mjs и ежедневный прогон
# не публикуется — ставить первыми, сразу после сбора (новые повестки приходят заранее, на ближайшие заседания)
ZT = jobj('ZTAG:'); _ci = src.index('const CAL: any = ') + 17; CALJ = json.loads(src[_ci:src.index('\n', _ci)].rstrip(';'))
miss_t = []
for p in sorted(CALJ.get('p', []), key=lambda p: tuple(reversed(p['d'].split('.'))), reverse=True):
    for a in p.get('a') or []:
        if re.match(r'^\d+-\d+$', a[0] or '') and not (ZT.get(a[0]) and all(ZT[a[0]])) and not any(f' {a[0]} ' in l for l in miss_t):
            miss_t.append(f"- [ ] {p['d']} {a[0]} «{(a[1] or a[4] or '')[:80]}»: ZTAG — [[«Для кого»], [«Тема»], [«Что меняется»]] из ZW/ZT/ZC")
try: _za = json.loads(src[src.index('const ZAUTO: string[] = ') + 24:src.index('\n', src.index('const ZAUTO: string[] = '))].rstrip(';'))
except ValueError: _za = []
miss_t += [f"- [ ] {n}: метки временные (pipeline/auto_ztag.py, по словам названия) — уточнить по записке extracts/bills/{n}.json, затем убрать номер из ZAUTO: {ZT.get(n)}" for n in _za]
L[L.index('## Суть и кого касается — законопроекты'):L.index('## Суть и кого касается — законопроекты')] = ['## Метки законопроектов (ZTAG) — первыми: без них ежедневный прогон не публикуется', ''] + (miss_t or ['нет']) + ['']
i = src.index('const LAWS: any = ') + 18; LW = json.loads(src[i:src.index(';\n', i)])
auto = [f"- [ ] {x['d']} {x['law']} (законопроект {x.get('bill','')}): заголовок и sut" for mk in LW['months'].values() for x in mk if x.get('auto') and not x.get('sut')]
L += ['', '## Вступают в силу — автодобавленные законы', ''] + (auto or ['нет'])
# 15.11.2026: метки законов (tg) — без них закон не попадает в ленты feed/<метка>.xml (web/extras.mjs)
notg = [f"- [ ] {x['d']} {x.get('law','')} — «{x.get('title','')}»: tg = [[«Для кого»…], [«Тема»…], [«Что меняется»…]] из ZW/ZT/ZC" for mk in LW['months'].values() for x in mk if not (x.get('tg') and all(x['tg']))]
L += ['', '## Вступают в силу — метки законов (tg)', ''] + (notg or ['нет'])
L += ['', '## Ошибки загрузки', '']
for f in sorted(glob.glob(os.path.join(C.LOGS, '*.log'))):
    ls = open(f).read().strip().splitlines(); L.append(f'- {os.path.basename(f)}: {len(ls)} строк')
# Т1 (13.11.2026): законы «Вступают в силу» без ссылки на официальный источник — проверить по kremlin.ru / publication.pravo.gov.ru
OFF = ('duma.gov.ru', 'council.gov.ru', 'government.ru', 'kremlin.ru', 'pravo.gov.ru', 'cbr.ru', 'gov.ru')
host = lambda u: re.sub(r'^https?://', '', u or '').split('/')[0]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# ссылки законов и карточки органов — как на сайте: из data/ (split_data.mjs добавляет к LAWS официальные ссылки, ORG собирает по месяцам)
try: LWD = json.load(open(os.path.join(ROOT, 'data', 'core.json'))).get('LAWS') or LW
except Exception: LWD = LW
ORGD = []
for fp in glob.glob(os.path.join(ROOT, 'data', 'months', '*.json')):
    try: ORGD += json.load(open(fp)).get('ORG') or []
    except Exception: pass
nosrc = [f"- [ ] {x['d']} {x.get('law') or x.get('title')}: нет ссылки на официальный источник (сейчас: {', '.join(host(l.get('u')) for l in x.get('src', [])) or 'нет ссылок'})"
         for mk in LWD['months'].values() for x in mk if not any(host(l.get('u')).endswith(OFF) for l in x.get('src', []))]
L += ['', '## Вступают в силу — нет официальной ссылки', ''] + (nosrc or ['нет'])
# Т3 (13.11.2026): проверка полноты — у Совета Федерации число карточек заседания против «Сенаторы рассмотрели N вопросов»
part = []
try:
    i = src.index('const SFM'); i = src.index('= ', i) + 2; SFM = json.loads(src[i:src.index('\n', i)].rstrip().rstrip(';'))
    ORG = ORGD
    for d, m in SFM.items():
        mm = re.search(r'(\d+)\s+вопрос', m.get('lead', '')); have = sum(1 for o in ORG if o.get('o') == 'sf' and o.get('d') == d)
        if mm and int(mm.group(1)) > have: part.append(f"- [ ] {d} Совет Федерации: собрано {have} из {mm.group(1)} вопросов заседания ({m.get('u', '')})")
except Exception as e: part.append(f'- проверка полноты СФ не выполнена: {e}')
L += ['', '## Полнота сбора', ''] + (part or ['расхождений нет'])
open(os.path.join(C.OUT, 'TODO.md'), 'w').write('\n'.join(L) + '\n')
# Т5 (13.11.2026): docs/STATUS.md — сводка «что не заполнено» (в git, обновляется при каждом прогоне)
bills = {}
for d, vid, doc, q, rd in C.votes(src):
    if re.match(r'^\d+-\d+$', doc): bills.setdefault(d[3:], set()).add(doc)
def infos():
    out = {}
    for fpath in glob.glob(os.path.join(ROOT, 'data', 'core.json')) + glob.glob(os.path.join(ROOT, 'data', 'months', '*.json')):
        try: J = json.load(open(fpath))
        except Exception: continue
        for k in ('INFO', 'BP'):
            for b, v in (J.get(k) or {}).items(): out.setdefault(b, {}).update({kk: vv for kk, vv in v.items() if vv})
    return out
INFO = infos()
S = ['# Что не заполнено', '', 'Файл пишет `pipeline/todo.py` при каждом прогоне. Подробный список задач — в `out/TODO.md` (в git не хранится).', '',
     '| Месяц | Законопроектов с голосованиями | Без «Сути» | Без «Кого коснётся» | Без инициатора | Без комитета |', '|---|---|---|---|---|---|']
for mk in sorted(bills, key=lambda x: (x[3:], x[:2]), reverse=True):
    b = bills[mk]; cnt = lambda k: sum(1 for x in b if not INFO.get(x, {}).get(k))
    S.append(f"| {mk} | {len(b)} | {cnt('sut')} | {cnt('who')} | {cnt('ini')} | {cnt('com')} |")
S += ['', f'- Законы «Вступают в силу» без официальной ссылки: {len(nosrc)}', f'- Автодобавленные законы без текста: {len(auto)}', f'- Расхождения полноты сбора: {len([p for p in part if p.startswith("- [ ]")])}', '']
if part: S += ['## Полнота сбора', ''] + part + ['']
if nosrc: S += ['## Нет официальной ссылки', ''] + nosrc + ['']
open(os.path.join(ROOT, 'docs', 'STATUS.md'), 'w').write('\n'.join(S))
print('TODO:', len(miss_s), 'sut,', len(miss_p), 'постановлений,', len(miss_t), 'без меток ZTAG,', len(miss_b), 'bs,', len(auto), 'законов,', len(notg), 'без меток tg')
