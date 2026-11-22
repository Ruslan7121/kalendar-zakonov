#!/usr/bin/env python3
"""22.11.2026: компактные запросы к канону и данным — чтобы не печатать в диалог строки по 100 КБ (src/canvas.tsx — это
несколько огромных строк с данными). Каждая команда выводит коротко; длинные поля обрезаются.

  python3 pipeline/peek.py map                     карта кода: функции и константы верхнего уровня с номерами строк
  python3 pipeline/peek.py find ШАБЛОН [ФАЙЛ] [N]  первые N (20) совпадений: номер строки и ±70 символов вокруг
  python3 pipeline/peek.py bill НОМЕР              законопроект: BP (Суть, Кого, что сейчас), метки, запись в TRACK, голосования
  python3 pipeline/peek.py note НОМЕР [СИМВОЛОВ]   ключевые предложения пояснительной записки из extracts/bills (по умолчанию 1200)
  python3 pipeline/peek.py org ПОДСТРОКА [N]       документы органов по подстроке заголовка/ссылки: есть ли Суть/Кого/название
  python3 pipeline/peek.py text ЧИСЛО_ИЛИ_КЛЮЧ [С [ДО]]  фрагмент официального текста из extracts/organs (по ключу файла или подстроке)
  python3 pipeline/peek.py debt                    долг по текстам: сводка по месяцам (счетчики, без перечисления)
  python3 pipeline/peek.py ci [SHA]                состояние проверок GitHub для коммита (по умолчанию HEAD)
"""
import os, re, sys, json, glob, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
CANVAS = os.path.join(ROOT, 'src', 'canvas.tsx')
sq = lambda s, n=220: (re.sub(r'\s+', ' ', str(s)).strip()[:n] + ('…' if len(re.sub(r'\s+', ' ', str(s)).strip()) > n else ''))


def blk(name):
    import common as C
    return C.get_block(C.read_canvas(), name)


def line_json(prefix):
    """Объявление вида `const NAME: ... = {...};` на одной строке (BP, ZTAG, SFI …)."""
    for ln in open(CANVAS, encoding='utf-8'):
        if ln.startswith(prefix):
            return json.loads(ln.split('= ', 1)[1].rstrip().rstrip(';'))
    raise SystemExit(f'peek: не найдено «{prefix}»')


def cmd_map(_):
    out = []
    for i, ln in enumerate(open(CANVAS, encoding='utf-8'), 1):
        m = re.match(r'(?:export )?(?:async )?function (\w+)', ln) or re.match(r'(?:export )?const ([A-Z][A-Za-z0-9_]*)\b', ln)
        if m: out.append(f'{m.group(1)}:{i}')
    print(', '.join(out))


def cmd_find(a):
    pat = a[0]; f = os.path.join(ROOT, a[1]) if len(a) > 1 and not a[1].isdigit() else CANVAS; n = int(a[-1]) if a[-1].isdigit() and len(a) > 1 else 20
    r = subprocess.run(['rg', '-n', '-o', '--no-heading', '-e', '.{0,70}(?:' + pat + ').{0,70}', f], capture_output=True, text=True)
    ls = r.stdout.splitlines()
    for x in ls[:n]: print(x[:260])
    if len(ls) > n: print(f'… еще {len(ls) - n} совпадений')


def cmd_bill(a):
    n = a[0]; BP = line_json('const BP:'); Z = line_json('const ZTAG:'); A = set(line_json('const ZAUTO:'))
    b = BP.get(n)
    print('BP:', 'нет' if not b else json.dumps({k: (sq(v, 400) if isinstance(v, (str, list)) else v) for k, v in b.items()}, ensure_ascii=False))
    print('метки:', Z.get(n), '(временные)' if n in A else '')
    try:
        T = blk('TRACK'); t = T.get(n); print('TRACK:', sq(t, 500) if t else 'нет')
    except Exception: pass
    f = os.path.join(ROOT, 'extracts', 'bills', n + '.json')
    print('выжимка:', 'есть' if os.path.exists(f) else 'нет')


def cmd_note(a):
    n = a[0]; lim = int(a[1]) if len(a) > 1 else 1200
    d = json.load(open(os.path.join(ROOT, 'extracts', 'bills', n + '.json'), encoding='utf-8'))
    t = re.sub(r'\s+', ' ', d.get('note') or '')
    sents = re.split(r'(?<=[.;])\s+', t); keep = [s for s in sents if re.search(r'в настоящее время|действующ|в соответствии с|предлагается|предусматрива|законопроектом|вносятся|устанавлива|в связи с', s, re.I)]
    print('заголовок:', sq(t[:300], 300)); print('ключевое:', (' '.join(keep) or t)[:lim]); print('ФЭО:', sq(d.get('fin') or '', 260)); print('статус:', d.get('status'), '| длина записки:', len(t))


def orgs():
    O = []
    for fp in sorted(glob.glob(os.path.join(ROOT, 'data', 'months', '*.json'))): O += json.load(open(fp, encoding='utf-8')).get('ORG', [])
    return O


def cmd_org(a):
    s = a[0].lower(); n = int(a[1]) if len(a) > 1 else 15; k = 0
    for x in orgs():
        if s in (x.get('t', '') + ' ' + x.get('u', '')).lower():
            ex = os.path.exists(os.path.join(ROOT, 'extracts', 'organs', x['u'].rstrip('/').split('/')[-1] + '.json'))
            print(f"{x['o']} {x['d']} | {sq(x.get('t'), 90)} | суть:{'да' if x.get('sut') else 'НЕТ'} кого:{'да' if x.get('who') else 'НЕТ'} назв:{'да' if x.get('ti') else 'НЕТ'} текст:{'есть' if ex else 'нет'} | {x['u'].rstrip('/').split('/')[-1]}")
            k += 1
            if k >= n: break


def cmd_text(a):
    key = a[0]; lo = int(a[1]) if len(a) > 1 else 0; hi = int(a[2]) if len(a) > 2 else lo + 1500
    fs = glob.glob(os.path.join(ROOT, 'extracts', 'organs', f'*{key}*.json'))
    if not fs: raise SystemExit('peek: нет файла текста')
    d = json.load(open(fs[0], encoding='utf-8')); t = re.sub(r'\s+', ' ', d.get('text') or '')
    print(os.path.basename(fs[0]), d.get('kind'), len(t), 'симв.'); print(t[lo:hi])


def cmd_debt(_):
    import collections
    O = orgs(); c = collections.defaultdict(lambda: collections.Counter())
    for x in O:
        m = x['d'][3:]; c[m]['всего'] += 1
        for f, nm in (('sut', 'без Сути'), ('who', 'без Кого'), ('ti', 'без названия')):
            if not x.get(f): c[m][nm] += 1
    print('документы органов:')
    for m in sorted(c, key=lambda s: (s[3:], s[:2])): print(' ', m, dict(c[m]))
    BP = line_json('const BP:'); Z = line_json('const ZAUTO:')
    print('законопроекты: BP', len(BP), '| без bs', sum(1 for v in BP.values() if not v.get('bs')), '| временных меток', len(Z))
    t = os.path.join(ROOT, 'out', 'TODO.md')
    if os.path.exists(t):
        sec = None; cnt = collections.Counter()
        for ln in open(t, encoding='utf-8'):
            if ln.startswith('## '): sec = ln[3:60].strip()
            elif ln.startswith('- ') and sec: cnt[sec] += 1
        print('out/TODO.md:', dict(cnt))


def cmd_ci(a):
    sha = a[0] if a else subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    r = subprocess.run(['gh', 'api', f'repos/Ruslan7121/kalendar-zakonov/commits/{sha}/check-runs', '--jq', '[.check_runs[]|.name+":"+.status+":"+(.conclusion//"")]|join(", ")'], capture_output=True, text=True)
    print(sha[:8], r.stdout.strip() or r.stderr.strip()[:200])


C = {'map': cmd_map, 'find': cmd_find, 'bill': cmd_bill, 'note': cmd_note, 'org': cmd_org, 'text': cmd_text, 'debt': cmd_debt, 'ci': cmd_ci}
if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in C: print(__doc__); sys.exit(0 if len(sys.argv) < 2 else 2)
    C[sys.argv[1]](sys.argv[2:])
