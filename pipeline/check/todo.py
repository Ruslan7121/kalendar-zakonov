#!/usr/bin/env python3
"""Сформировать out/TODO.md — список того, что ДОЛЖЕН написать бот (текст, который программа не придумывает):
 - sut/who для голосований без описания (cardText);
 - bs («Что сейчас» / «Что предлагалось изменить») для законопроектов «О внесении изменений»;
 - sut для законов, автоматически добавленных в «Вступают в силу» (auto: 1);
 - ошибки загрузки (logs/*.log).
К каждому пункту — путь к выжимке из пояснительной записки (extracts/bills/<номер>.json).
 - tg (метки «Для кого», «Тема», «Что меняется» из ZW/ZT/ZC) для законов «Вступают в силу» — по ним закон попадает в RSS-ленты меток."""

import sys, os, re, json, glob

sys.path[:0] = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'),
]
import common as C

src = C.read_canvas()


def jobj(name):
    i = src.index(f'const {name}')
    i = src.index('= ', i) + 2
    j = src.index('\n', i)
    try:
        return json.loads(src[i:j].rstrip(';'))
    except Exception:
        return {}


BP, PROC = jobj('BP:'), jobj('PROC:')
a = src.index('const PLAIN')
PL = src[a : src.index('\n};', a)]
PLS = set(re.findall(r"^  '(\d+)': \{[^\n]*\b\"?sut\"?\s*:", PL, re.M))
try:
    INF = set(k for k, v in json.loads(re.findall(r'const INFO_RAW = \[`(.*?)`', src, re.S)[0]).items() if v.get('sut'))
except Exception:
    INF = set()


def has(key, vid, doc):
    if key == 'sut':
        return vid in PLS or vid in PROC or bool(BP.get(doc, {}).get('sut')) or doc in INF
    return bool(BP.get(doc, {}).get('bs'))


L = [
    '# TODO для бота',
    '',
    'Писать только по выжимкам и официальным источникам. Без «ё» в карточках. Ничего не придумывать.',
    '',
]
miss_s, miss_b = [], []


def dinfo(n):
    """18.11.2026: какие документы карточки уже скачаны (единый сбор): таблица, ФЭО, заключение комитета, вид текста."""
    try:
        r = json.load(open(os.path.join(C.EXTR, 'bills', n + '.json')))
    except (OSError, ValueError):
        return ''
    t = [('таблица', 'table'), ('ФЭО', 'fin'), ('заключение комитета', 'committee')]
    got = [a for a, k in t if (r.get(k) or '').strip()]
    k = r.get('note_kind') or ('записка' if (r.get('note') or '').strip() else 'текста нет')
    return f' · текст: {k}' + (f'; есть: {", ".join(got)}' if got else '')


for d, vid, doc, q, rd in C.votes(src):
    ex = os.path.join(C.EXTR, 'bills', doc + '.json') if doc != '—' else ''
    ex = ex if ex and os.path.exists(ex) else '(выжимки нет — см. logs/bills_fail.log)' if doc != '—' else '—'
    if not has('sut', vid, doc):
        miss_s.append(f'- [ ] {d} голосование {vid} ({doc}): sut, who — «{q[:90]}» · выжимка: {ex}{dinfo(doc)}')
    if doc != '—' and q.startswith('О внесении изменени') and not has('bs', vid, doc):
        miss_b.append(
            f'- [ ] {d} голосование {vid} ({doc}): bs — пары [«Что сейчас», «Что предлагалось изменить»] · выжимка: {ex}{dinfo(doc)}'
        )
# 18.11.2026: законопроекты повестки без голосования («не рассматривались») — тоже нужна «Суть» (по записке или тексту законопроекта к 1-му чтению)
_voted = {x[2] for x in C.votes(src)}
try:
    _cal = json.loads(re.search(r'const CAL: any = (\{.*\});', src).group(1))
except Exception:
    _cal = {'p': []}
_seen = set()
for _p in _cal.get('p', []):
    for _a in _p.get('a') or []:
        _n = _a[0] if _a else ''
        if not re.fullmatch(r'\d+-\d+', _n or '') or _n in _voted or _n in _seen:
            continue
        _seen.add(_n)
        _t = _a[4] if len(_a) > 4 and _a[4] else _a[1]
        if _t.startswith('О внесении изменени') and not BP.get(_n, {}).get('bs'):
            miss_b.append(
                f'- [ ] {_p["d"]} не рассматривался ({_n}): bs — пары [«Что сейчас», «Что предлагалось изменить»] · выжимка: {os.path.join(C.EXTR, "bills", _n + ".json")}{dinfo(_n)}'
            )
        if not BP.get(_n, {}).get('sut'):
            _ex = os.path.join(C.EXTR, 'bills', _n + '.json')
            miss_s.append(
                f'- [ ] {_p["d"]} не рассматривался ({_n}): sut, who — «{(_a[4] if len(_a) > 4 and _a[4] else _a[1])[:90]}» · выжимка: {_ex if os.path.exists(_ex) else "(выжимки нет — запусти notes)"}{dinfo(_n)}'
            )
# 15.11.2026: процедурные голосования без документа (doc «—»: порядок работы, Счетная комиссия) текста не требуют — в TODO не идут;
# постановления — отдельным разделом (по желанию); все списки — сначала свежие дни (бот успевает главное).
_dk = lambda l: tuple(reversed(re.search(r'(\d\d)\.(\d\d)\.(\d{4})', l).groups()))
miss_s = [l for l in miss_s if '(—)' not in l]
miss_p = sorted([l for l in miss_s if '(Пост.' in l], key=_dk, reverse=True)
miss_s = sorted([l for l in miss_s if '(Пост.' not in l], key=_dk, reverse=True)
_seen = set()
miss_b = [
    l
    for l in sorted(miss_b, key=_dk, reverse=True)
    if '(Пост.' not in l
    and not (re.search(r'\(([^)]+)\): bs', l).group(1) in _seen or _seen.add(re.search(r'\(([^)]+)\): bs', l).group(1)))
]  # bs — один раз на законопроект
L += (
    ['## Суть и кого касается — законопроекты', '']
    + (miss_s or ['нет'])
    + ['', '## Что сейчас / что предлагалось изменить (сначала свежие)', '']
    + (miss_b or ['нет'])
)
L += ['', '## Постановления Госдумы — суть (по желанию)', ''] + (miss_p or ['нет'])
# 15.11.2026: метки ZTAG у законопроектов повестки (CAL.p): без них падает tests/js/test_search_tags.mjs и ежедневный прогон
# не публикуется — ставить первыми, сразу после сбора (новые повестки приходят заранее, на ближайшие заседания)
ZT = jobj('ZTAG:')
_ci = src.index('const CAL: any = ') + 17
CALJ = json.loads(src[_ci : src.index('\n', _ci)].rstrip(';'))
miss_t = []
for p in sorted(CALJ.get('p', []), key=lambda p: tuple(reversed(p['d'].split('.'))), reverse=True):
    for a in p.get('a') or []:
        if (
            re.match(r'^\d+-\d+$', a[0] or '')
            and not (ZT.get(a[0]) and all(ZT[a[0]]))
            and not any(f' {a[0]} ' in l for l in miss_t)
        ):
            miss_t.append(
                f'- [ ] {p["d"]} {a[0]} «{(a[1] or a[4] or "")[:80]}»: ZTAG — [[«Для кого»], [«Тема»], [«Что меняется»]] из ZW/ZT/ZC'
            )
try:
    _za = json.loads(
        src[src.index('const ZAUTO: string[] = ') + 24 : src.index('\n', src.index('const ZAUTO: string[] = '))].rstrip(
            ';'
        )
    )
except ValueError:
    _za = []
miss_t += [
    f'- [ ] {n}: метки временные (pipeline/merge/auto_ztag.py, по словам названия) — уточнить по записке extracts/bills/{n}.json, затем убрать номер из ZAUTO: {ZT.get(n)}'
    for n in _za
]
L[L.index('## Суть и кого касается — законопроекты') : L.index('## Суть и кого касается — законопроекты')] = (
    ['## Метки законопроектов (ZTAG) — первыми: без них ежедневный прогон не публикуется', '']
    + (miss_t or ['нет'])
    + ['']
)
i = src.index('const LAWS: any = ') + 18
LW = json.loads(src[i : src.index(';\n', i)])
auto = [
    f'- [ ] {x["d"]} {x["law"]} (законопроект {x.get("bill", "")}): заголовок и sut'
    for mk in LW['months'].values()
    for x in mk
    if x.get('auto') and not x.get('sut')
]
L += ['', '## Вступают в силу — автодобавленные законы', ''] + (auto or ['нет'])
# 15.11.2026: метки законов (tg) — без них закон не попадает в ленты feed/<метка>.xml (web/extras.mjs)
notg = [
    f'- [ ] {x["d"]} {x.get("law", "")} — «{x.get("title", "")}»: tg = [[«Для кого»…], [«Тема»…], [«Что меняется»…]] из ZW/ZT/ZC'
    for mk in LW['months'].values()
    for x in mk
    if not (x.get('tg') and all(x['tg']))
]
L += ['', '## Вступают в силу — метки законов (tg)', ''] + (notg or ['нет'])


# 19.11.2026 (правило 15): документы органов без «Сути» или «Кого коснётся» — обязательные тексты дня
# (на сайт документ попадает только с обоими текстами). Дата, орган, номер, название, чего не хватает.
def _org_names():
    try:
        i = src.index('const ORGN: Record<string, string> = ')
        chunk = src[i : src.index('};', i) + 1]
        return dict(re.findall(r"(\w+): '([^']+)'", chunk))
    except Exception:
        return {}


def _org_docs_todo():
    import datetime as _dt

    names = _org_names()
    out = []
    for e in sorted(C.org_items(src), key=lambda e: _dt.datetime.strptime(e['d'], '%d.%m.%Y'), reverse=True):
        miss = C.org_missing(e)
        if not miss:
            continue
        organ = names.get(e.get('o'), e.get('o') or '')
        no = C.org_no(e)
        title = (e.get('t') or e.get('st') or '').replace('\n', ' ')
        if len(title) > 140:
            title = title[:137] + '…'
        why = 'нет ' + ' и '.join(miss)
        bit = (', ' + no) if no else ''
        out.append(f'- [ ] {e["d"]} {organ}{bit}: «{title}» — {why}')
    return out


_od = _org_docs_todo()
L += ['', f'## Документы органов ({len(_od)})', ''] + (_od or ['нет']) + ['']


# 19.11.2026: документы органов (кроме Госдумы) без подробной «Сути» (3–4 абзаца по официальному тексту) — свежие сначала.
# Текст документа — extracts/organs/<ключ>.json (pipeline/collect/organ_texts.py); перенос — pipeline/merge/orgx_merge.py.
def _org_todo():
    import datetime as _dt

    try:
        org = C.get_block(src, 'ORG')
        ox = C.get_block(src, 'ORGX')
    except Exception:
        return []
    tx = {}
    for f in glob.glob(os.path.join(C.EXTR, 'organs', '*.json')):
        try:
            r = json.load(open(f))
            tx[r['id']] = (os.path.relpath(f, C.ROOT), r.get('kind'), r.get('why', ''))
        except Exception:
            pass
    out = []
    for e in sorted(org, key=lambda e: _dt.datetime.strptime(e['d'], '%d.%m.%Y'), reverse=True):
        if e.get('ty') in ('новость', 'заседание'):
            continue
        k = f'{e["o"]}:{e["u"]}#{e["d"]}'
        sut = (ox.get(k) or {}).get('sut') or ''
        if isinstance(sut, list):
            sut = '\n\n'.join(sut)
        if len([q for q in re.split(r'\n\s*\n', sut) if q.strip()]) >= 3:
            continue
        t = tx.get(k)
        src_ = (
            f'текст: {t[0]} ({t[1]}' + (f', {t[2]}' if t[2] else '') + ')'
            if t
            else 'текста нет — pipeline/collect/organ_texts.py'
        )
        out.append(f'- {e["d"]} {e["o"]}: {e["t"][:110]} — id `{k}`; {src_}')
    return out


_ot = _org_todo()
L += (
    ['', f'## Суть документов органов — 3–4 абзаца по официальному тексту ({len(_ot)})', '']
    + (_ot[:150] or ['нет'])
    + ([f'… и еще {len(_ot) - 150}'] if len(_ot) > 150 else [])
)
L += ['', '## Ошибки загрузки', '']
for f in sorted(glob.glob(os.path.join(C.LOGS, '*.log'))):
    ls = open(f).read().strip().splitlines()
    L.append(f'- {os.path.basename(f)}: {len(ls)} строк')
# Т1 (13.11.2026): законы «Вступают в силу» без ссылки на официальный источник — проверить по kremlin.ru / publication.pravo.gov.ru
OFF = ('duma.gov.ru', 'council.gov.ru', 'government.ru', 'kremlin.ru', 'pravo.gov.ru', 'cbr.ru', 'gov.ru')
host = lambda u: re.sub(r'^https?://', '', u or '').split('/')[0]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# ссылки законов и карточки органов — как на сайте: из data/ (split_data.mjs добавляет к LAWS официальные ссылки, ORG собирает по месяцам)
try:
    LWD = json.load(open(os.path.join(ROOT, 'data', 'core.json'))).get('LAWS') or LW
except Exception:
    LWD = LW
ORGD = []
for fp in glob.glob(os.path.join(ROOT, 'data', 'months', '*.json')):
    try:
        ORGD += json.load(open(fp)).get('ORG') or []
    except Exception:
        pass
nosrc = [
    f'- [ ] {x["d"]} {x.get("law") or x.get("title")}: нет ссылки на официальный источник (сейчас: {", ".join(host(l.get("u")) for l in x.get("src", [])) or "нет ссылок"})'
    for mk in LWD['months'].values()
    for x in mk
    if not any(host(l.get('u')).endswith(OFF) for l in x.get('src', []))
]
L += ['', '## Вступают в силу — нет официальной ссылки', ''] + (nosrc or ['нет'])
# Т3 (13.11.2026): проверка полноты — у Совета Федерации число карточек заседания против «Сенаторы рассмотрели N вопросов»
part = []
try:
    i = src.index('const SFM')
    i = src.index('= ', i) + 2
    SFM = json.loads(src[i : src.index('\n', i)].rstrip().rstrip(';'))
    ORG = ORGD
    for d, m in SFM.items():
        mm = re.search(r'(\d+)\s+вопрос', m.get('lead', ''))
        have = sum(1 for o in ORG if o.get('o') == 'sf' and o.get('d') == d)
        if mm and int(mm.group(1)) > have:
            part.append(
                f'- [ ] {d} Совет Федерации: собрано {have} из {mm.group(1)} вопросов заседания ({m.get("u", "")})'
            )
except Exception as e:
    part.append(f'- проверка полноты СФ не выполнена: {e}')
L += ['', '## Полнота сбора', ''] + (part or ['расхождений нет'])
open(os.path.join(C.OUT, 'TODO.md'), 'w').write('\n'.join(L) + '\n')
# Т5 (13.11.2026): docs/STATUS.md — сводка «что не заполнено» (в git, обновляется при каждом прогоне)
bills = {}
for d, vid, doc, q, rd in C.votes(src):
    if re.match(r'^\d+-\d+$', doc):
        bills.setdefault(d[3:], set()).add(doc)


def infos():
    out = {}
    for fpath in glob.glob(os.path.join(ROOT, 'data', 'core.json')) + glob.glob(
        os.path.join(ROOT, 'data', 'months', '*.json')
    ):
        try:
            J = json.load(open(fpath))
        except Exception:
            continue
        for k in ('INFO', 'BP'):
            for b, v in (J.get(k) or {}).items():
                out.setdefault(b, {}).update({kk: vv for kk, vv in v.items() if vv})
    return out


INFO = infos()
S = [
    '# Что не заполнено',
    '',
    'Файл пишет `pipeline/check/todo.py` при каждом прогоне. Подробный список задач — в `out/TODO.md` (в git не хранится).',
    '',
    '| Месяц | Законопроектов с голосованиями | Без «Сути» | Без «Кого коснётся» | Без инициатора | Без комитета |',
    '|---|---|---|---|---|---|',
]
for mk in sorted(bills, key=lambda x: (x[3:], x[:2]), reverse=True):
    b = bills[mk]
    cnt = lambda k: sum(1 for x in b if not INFO.get(x, {}).get(k))
    S.append(f'| {mk} | {len(b)} | {cnt("sut")} | {cnt("who")} | {cnt("ini")} | {cnt("com")} |')
S += [
    '',
    f'- Законы «Вступают в силу» без официальной ссылки: {len(nosrc)}',
    f'- Автодобавленные законы без текста: {len(auto)}',
    f'- Расхождения полноты сбора: {len([p for p in part if p.startswith("- [ ]")])}',
    '',
]
if part:
    S += ['## Полнота сбора', ''] + part + ['']
if nosrc:
    S += ['## Нет официальной ссылки', ''] + nosrc + ['']
open(os.path.join(ROOT, 'docs', 'STATUS.md'), 'w').write('\n'.join(S))
print(
    'TODO:',
    len(miss_s),
    'sut,',
    len(miss_p),
    'постановлений,',
    len(miss_t),
    'без меток ZTAG,',
    len(miss_b),
    'bs,',
    len(auto),
    'законов,',
    len(notg),
    'без меток tg',
)
