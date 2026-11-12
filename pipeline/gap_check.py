#!/usr/bin/env python3
"""gap_check.py — проверка пропусков (пункт 7): прогон по всем рабочим дням окна и отчёт о днях без DATA и/или CAL.
Только детектор и отчёт: canvas НЕ меняется, ничего не дозаполняется. Дозагрузка — отдельным запуском
votes_day.py ДЕНЬ (DATA) или calendar_update.py + cal_merge.py (CAL).

Рабочий день (правило): понедельник–пятница, кроме нерабочих праздников ст. 112 ТК РФ
(1–8 января, 23 февраля, 8 марта, 1 и 9 мая, 12 июня, 4 ноября). Переносы выходных постановлением Правительства
не моделируются (дополнительные дни можно исключить ключом --skip). Политический календарь не выдумывается:
пленарные/региональные недели и пленарные дни берутся только из того, что уже есть в canvas (CAL.w, CAL.p) и
из официальных источников (days/*.json от votes_day.py, vote.duma.gov.ru при --online).

Окно: от начала покрытия (самая ранняя дата в DATA или CAL.p; можно задать --from) до сегодняшней даты по Москве
(--to). Сегодняшний день без DATA — «ещё не собран», не пропуск (если только официальный список уже не показывает голосования).

Что считается пропуском (код выхода 1):
  DATA  · vote.duma.gov.ru (days/<день>.json или --online) показывает голосования, а в DATA их нет / меньше;
        · день в CAL.p со статусом held/confirmed уже прошёл, а в DATA голосований нет и нет подтверждения «голосований не было»;
        · прошедший рабочий день без ключа в DATA и без официального подтверждения, что голосований не было
          (подтверждение: NV в canvas, days/<день>.json с novotes=1 или «ничего не найдено» на vote.duma.gov.ru при --online).
  CAL   · рабочий день не покрыт ни одной неделей CAL.w (тип недели неизвестен);
        · в день есть голосования (DATA или официальный список), а записи CAL.p нет.
Предупреждения (код выхода не меняют): CAL.p прошедшего дня в статусе expected/confirmed (не обновлён до held);
  рабочая неделя без заседания Правительства в CAL.g (заседания не строго еженедельные — только сигнал проверить government.ru).
Если источник недоступен — так и пишется («не проверено: источник недоступен»), DATA не дополняется.

Запуск (из корня клона):
  python3 pipeline/gap_check.py                      # окно от начала покрытия до сегодня (МСК), без сети
  python3 pipeline/gap_check.py --online             # + список дня vote.duma.gov.ru для дней без DATA (1-я страница)
  python3 pipeline/gap_check.py --from 01.11.2026 --to 12.11.2026 [--canvas файл] [--skip ДД.ММ.ГГГГ ...]
Отчёт: stdout + out/logs/gaps_<ГГГГ-ММ-ДД>.txt и .json (out/logs/ в git не идёт).
Код выхода: 0 — пропусков нет, 1 — есть пропуски DATA/CAL, 2 — canvas не прочитан.
"""
import sys, os, re, json, argparse, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

DAYS_DIR = os.environ.get('GD_DAYS') or os.path.join(C.DUMA, 'days')
HOLIDAYS = {(1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1), (7, 1), (8, 1), (23, 2), (8, 3), (1, 5), (9, 5), (12, 6), (4, 11)}
WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

def pdate(s): return dt.datetime.strptime(s, '%d.%m.%Y').date()
def fdate(d): return d.strftime('%d.%m.%Y')

def moscow_today():
    try:
        from zoneinfo import ZoneInfo
        return dt.datetime.now(ZoneInfo('Europe/Moscow')).date()
    except Exception:
        return (dt.datetime.utcnow() + dt.timedelta(hours=3)).date()

def is_working(d, skip=()):
    return d.weekday() < 5 and (d.day, d.month) not in HOLIDAYS and fdate(d) not in skip

def load_canvas(src):
    """→ data{день: число строк голосований (0 — пустой ключ)}, nv{день}, cal{w,p,g}."""
    data = {}
    i = src.find('const DATA'); j = src.find('\n};', i)
    if i < 0 or j < 0: raise ValueError('нет блока const DATA')
    for m in re.finditer(r"^'(\d\d\.\d\d\.\d{4})':", src[i:j], re.M): data[m.group(1)] = 0
    for m in re.finditer(r"^DATA\['(\d\d\.\d\d\.\d{4})'\] =", src, re.M): data[m.group(1)] = 0
    for v in C.votes(src): data[v[0]] = data.get(v[0], 0) + 1
    nv = set()
    k = src.find('const NV: Record<string, any> = ')
    if k >= 0:
        e = src.find('\n', k); nv = set(json.loads(src[k + len('const NV: Record<string, any> = '):e].rstrip().rstrip(';')))
    k = src.find('const CAL: any = ')
    if k < 0: raise ValueError('нет строки const CAL')
    e = src.find('\n', k); cal = json.loads(src[k + len('const CAL: any = '):e].rstrip().rstrip(';'))
    return data, nv, cal

def official_day(day, online, state):
    """Официальные сведения о голосованиях дня: dict(src, n|None, none:bool) или None.
    days/<день>.json (votes_day.py) → при --online первая страница списка vote.duma.gov.ru."""
    p = os.path.join(DAYS_DIR, f'{day}.json')
    if os.path.exists(p):
        try:
            j = json.load(open(p))
            if j.get('novotes'): return {'src': p, 'n': 0, 'none': True}
            return {'src': p, 'n': len(j.get('votes', [])) + len(j.get('gaps', [])), 'none': False}
        except Exception:
            pass
    if not online: return None
    if state.get('down'): return {'src': 'vote.duma.gov.ru', 'n': None, 'none': False, 'err': 'не проверено: источник недоступен (см. выше)'}
    import votes_day as V
    url = f'{V.BASE}/?from={day}&to={day}'
    out = f'/tmp/gap_check_{day}.html'
    h = open(out, errors='ignore').read() if C.fetch(url, out, int(os.environ.get('GAP_FETCH_DEADLINE', '60'))) else ''
    if not h or ('date-head' not in h and 'ничего не найдено' not in h):
        state['down'] = True; C.log('gap_check_fail.log', f'{day} список дня недоступен: {url}')
        return {'src': url, 'n': None, 'none': False, 'err': f'не проверено: источник недоступен ({url})'}
    rows, maxp, empty = V.parse_list(h)
    rows = [r for r in rows if r['day'] == day]
    if empty and not rows: return {'src': url, 'n': 0, 'none': True}
    return {'src': url, 'n': len(rows) if maxp == 1 else None, 'pages': maxp, 'none': False}

def check(src, d_from=None, d_to=None, online=False, skip=(), today=None):
    data, nv, cal = load_canvas(src)
    today = today or moscow_today()
    P = {p['d']: p for p in cal.get('p', [])}
    G = {x[0] for x in cal.get('g', [])}
    weeks = [(pdate(a), pdate(b), t) for a, b, t in cal.get('w', [])]
    covered = sorted({pdate(x) for x in list(data) + list(P)} - set(), key=lambda x: x)
    start = pdate(d_from) if d_from else (min(x for x in covered if x <= today) if covered else today)
    end = pdate(d_to) if d_to else today
    last_both = max((x for x in covered if x <= today and fdate(x) in data and fdate(x) in P), default=None)
    state, days, warn = {}, [], []
    d = start
    while d <= end:
        if not is_working(d, skip):
            d += dt.timedelta(days=1); continue
        s = fdate(d); is_today = d == today
        wk = next((t for a, b, t in weeks if a <= d <= b), None)
        p = P.get(s); n = data.get(s); in_data = s in data
        need = os.path.exists(os.path.join(DAYS_DIR, f'{s}.json')) or (not n and s not in nv)   # сеть — только для дней без голосований в DATA и без NV
        off = official_day(s, online and need, state) if need else None
        confirmed_none = s in nv or bool(off and off.get('none'))
        has_off_votes = bool(off and not off.get('none') and not off.get('err'))
        gd, gc, info = [], [], []
        # DATA
        if has_off_votes and (n or 0) < (off['n'] or 1):
            gd.append(f"vote.duma.gov.ru: голосований {off['n'] if off['n'] is not None else 'есть (страниц: %s)' % off.get('pages')}, в DATA {n or 0}{' (сегодня: заседание может ещё идти)' if is_today else ''} → votes_day.py {s}")
        elif not is_today and not n and p and p.get('s') in ('held', 'confirmed') and not confirmed_none:
            gd.append(f"CAL.p: заседание ({p.get('s')}), а в DATA голосований нет" + (f"; {off['err']}" if off and off.get('err') else ' → votes_day.py ' + s))
        elif not is_today and not in_data and not confirmed_none:
            gd.append('нет DATA и нет официального подтверждения, что голосований не было'
                      + (f"; {off['err']}" if off and off.get('err') else ('' if online else ' (проверить: --online или votes_day.py ' + s + ')')))
        if is_today and not in_data and not has_off_votes:
            info.append('сегодня: DATA ещё не собран (не пропуск)')
        if confirmed_none and not in_data:
            info.append('голосований не было (официально), ключа DATA нет — так и задумано')
        # CAL
        if wk is None and not p:
            gc.append('день не покрыт CAL.w (тип недели неизвестен) и нет CAL.p → calendar_update.py + cal_merge.py')
        if (n or has_off_votes) and not p:
            gc.append('голосования есть, записи CAL.p нет')
        if p and d < today and p.get('s') in ('expected', 'confirmed') and (n or has_off_votes):
            warn.append(f"{s}: CAL.p статус «{p.get('s')}», хотя голосования прошли — статус не обновлён до held")
        elif p and d < today and p.get('s') == 'expected':
            warn.append(f"{s}: CAL.p статус «expected» в прошлом — проверить, было ли заседание")
        days.append({'d': s, 'wd': WD[d.weekday()], 'week': wk, 'cal_p': p.get('s') if p else None, 'data': n if in_data else None,
                     'nv': s in nv, 'official': off, 'gap_data': gd, 'gap_cal': gc, 'info': info})
        d += dt.timedelta(days=1)
    # Правительство: рабочие недели окна без заседания в CAL.g
    mon = start - dt.timedelta(days=start.weekday())
    while mon <= end:
        wdays = [mon + dt.timedelta(days=k) for k in range(5)]
        if not any(fdate(x) in G for x in wdays) and wdays[-1] < today:
            warn.append(f"неделя {fdate(mon)}–{fdate(wdays[-1])}: нет заседания Правительства в CAL.g (проверить government.ru; заседания не строго еженедельные)")
        mon += dt.timedelta(days=7)
    return {'from': fdate(start), 'to': fdate(end), 'today_msk': fdate(today), 'online': online,
            'last_data_and_cal': fdate(last_both) if last_both else None,
            'last_data': max((x for x in data), key=lambda x: pdate(x), default=None),
            'cal_updated': cal.get('u'), 'days': days, 'warnings': warn,
            'source_down': bool(state.get('down'))}

def render(r):
    L = [f"Проверка пропусков DATA/CAL: {r['from']} — {r['to']} (сегодня МСК {r['today_msk']}), "
         f"{'с проверкой vote.duma.gov.ru' if r['online'] else 'без сети (days/*.json и canvas)'}",
         f"Правило: рабочий день = пн–пт, кроме праздников ст. 112 ТК РФ; переносы не учитываются.",
         f"Последний день с DATA и CAL.p: {r['last_data_and_cal']}; последняя дата в DATA: {r['last_data']}; CAL обновлён: {r['cal_updated']}"]
    gd = [x for x in r['days'] if x['gap_data']]; gc = [x for x in r['days'] if x['gap_cal']]
    both = [x for x in r['days'] if x['gap_data'] and x['gap_cal']]
    L.append(f"Рабочих дней: {len(r['days'])}; без DATA: {len(gd)}; без CAL: {len(gc)}; без обоих: {len(both)}")
    if r['source_down']: L.append('ВНИМАНИЕ: vote.duma.gov.ru недоступен — часть дней не проверена, DATA не дополнялся.')
    for x in r['days']:
        if not (x['gap_data'] or x['gap_cal'] or x['info']): continue
        tag = 'DATA+CAL' if x['gap_data'] and x['gap_cal'] else 'DATA' if x['gap_data'] else 'CAL' if x['gap_cal'] else 'инфо'
        L.append(f"  [{tag}] {x['d']} ({x['wd']}, неделя: {x['week'] or '—'}, CAL.p: {x['cal_p'] or '—'}, DATA: {'нет' if x['data'] is None else x['data']})")
        for t in x['gap_data'] + x['gap_cal'] + x['info']: L.append(f"      - {t}")
    if r['warnings']:
        L.append('Предупреждения:'); L += [f"  ! {w}" for w in r['warnings']]
    if not gd and not gc: L.append('Пропусков DATA/CAL нет.')
    return '\n'.join(L)

def main():
    ap = argparse.ArgumentParser(description='Пропуски DATA/CAL по рабочим дням (только отчёт)')
    ap.add_argument('--from', dest='d_from'); ap.add_argument('--to', dest='d_to')
    ap.add_argument('--online', action='store_true', help='проверить дни без DATA по списку vote.duma.gov.ru (1-я страница)')
    ap.add_argument('--skip', nargs='*', default=[], help='доп. нерабочие дни ДД.ММ.ГГГГ (переносы)')
    ap.add_argument('--canvas', default=C.CANVAS)
    a = ap.parse_args()
    try:
        r = check(open(a.canvas).read(), a.d_from, a.d_to, a.online, set(a.skip))
    except Exception as e:
        print(f'gap_check: canvas не прочитан ({a.canvas}): {e}', file=sys.stderr); sys.exit(2)
    txt = render(r); print(txt)
    stamp = dt.date.today().isoformat()
    open(os.path.join(C.LOGS, f'gaps_{stamp}.txt'), 'w').write(txt + '\n')
    json.dump(r, open(os.path.join(C.LOGS, f'gaps_{stamp}.json'), 'w'), ensure_ascii=False, indent=1)
    sys.exit(1 if any(x['gap_data'] or x['gap_cal'] for x in r['days']) else 0)

if __name__ == '__main__':
    main()
