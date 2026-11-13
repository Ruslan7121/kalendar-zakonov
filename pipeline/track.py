#!/usr/bin/env python3
"""Путь закона: Внесен → Комитет → 1/2/3 чтение → СФ → подписание → опубликование → вступление в силу.
Источники: sozd.duma.gov.ru (этапы, номер ФЗ), kremlin.ru/acts/bank (вступление в силу).
Пишет блок TRACK в canvas.tsx. Ничего не выдумывается — нет даты в источнике → поле пустое + log.
Отклонённый этап: дата = дата голосования (sozd «отклонить» или день из DATA).
Запуск: python3 track.py [номер ...]  (без аргументов — все законопроекты из DATA).
"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(__file__)); import common as C
import sozd_cache as S
MON = {m: i + 1 for i, m in enumerate('января февраля марта апреля мая июня июля августа сентября октября ноября декабря'.split())}
STAGES = ('in', 'kom', 'r1', 'r2', 'r3', 'sf', 'sign', 'pub', 'force')
BILLS_DIR = S.DIR  # единый кэш HTML sozd (sozd_cache.py)
# sozd: "19.09.2023 19.09.23 16:30 действие" или "22.10.2026 22.10.26 действие"
DT = r'(\d\d\.\d\d\.\d{4}) \d\d\.\d\d\.\d\d(?: \d\d:\d\d)?'


def stage(t, pat):
    m = re.search(pat + r'.{0,200}?(\d\d\.\d\d\.\d{4})', t)
    return m.group(1) if m else ''


def act_date(t, action):
    """Дата решения ГД/события: DATE SHORT[ TIME] ACTION — без «предложить»."""
    m = re.search(DT + r' ' + action, t)
    return m.group(1) if m else ''


def force_date(n_law, pub, sign=''):
    h = f'/tmp/kr_{n_law}.html'
    if not C.fetch('http://kremlin.ru/acts/bank/search?query=' + n_law.replace(' ', '+'), h, 60):
        return '', ''
    m = re.search(r'href="(/acts/bank/\d+)"', open(h, errors='ignore').read())
    if not m:
        return '', ''
    url = 'http://kremlin.ru' + m.group(1)
    h2 = h + '.doc'
    if not C.fetch(url + '/page/1', h2, 60):
        return '', ''
    t = re.sub(r'\s+', ' ', C.text(open(h2, errors='ignore').read()))
    if n_law.replace('№ ', '') not in t or (sign and sign not in t):
        return '', ''
    m = re.search(r'вступает в силу (?:с|со) (\d{1,2}) (' + '|'.join(MON) + r') (\d{4})', t)
    if m:
        return f'{int(m.group(1)):02d}.{MON[m.group(2)]:02d}.{m.group(3)}', url
    if re.search(r'вступает в силу со дня (?:его )?официального опубликования', t) and pub:
        return pub, url
    return '', url


def load_sozd(n, refresh=False, day=''):
    """HTML sozd из единого кэша sozd_cache ($GD_DUMA/bills/, общий с bills.py): моложе TTL — без сети,
    старше — перезапрос; при 504 — последняя хорошая страница. TRACK_QUICK=1 — только кэш, без сети."""
    quick = bool(os.environ.get('TRACK_QUICK'))
    raw, st = S.get(n, refresh=refresh, offline=quick and not refresh, deadline=120, log='track_fail.log',
                    ttl=S.ttl_for_day(day))
    if not raw:
        C.log('track_fail.log', f'{n}: ' + ('нет локального sozd html (TRACK_QUICK)' if quick and not refresh else 'sozd не ответил, кэша нет'))
        return None
    if st == 'stale' and not quick:
        C.log('track_fail.log', f'{n}: sozd fetch fail, using cache')
    t = re.sub(r'\s+', ' ', C.text(raw))
    if 'По событиям' in t:
        t = t[t.find('По событиям'):]
    return t


def one(n, vote_day='', vote_rd='', rejected=False, refresh=False):
    t = load_sozd(n, refresh=refresh, day=vote_day)
    if t is None:
        return None
    r = {}
    r['in'] = act_date(t, r'зарегистрирован и направлен Председателю')
    r['kom'] = act_date(t, r'направлен в комитет\(ы\) Государственной Думы')
    if not r['kom']:
        r['kom'] = act_date(t, r'назначить ответственный комитет')

    # Фактические решения ГД (не «предложить …»)
    r['r1'] = act_date(t, r'принять законопроект в первом чтении')
    r['r2'] = act_date(t, r'принять законопроект во втором чтении')
    r['r3'] = stage(t, r'третьем чтении Рассмотрение законопроекта Государственной Думой')
    if not r['r3']:
        # «принять закон» на 3-м чтении (не «принять законопроект»)
        r['r3'] = act_date(t, r'принять закон\b')

    r['sf'] = stage(t, r'Рассмотрение закона на заседании Совета Федерации')
    if not r['sf']:
        r['sf'] = act_date(t, r'одобрить закон')
    r['sign'] = stage(t, r'Рассмотрение закона Президентом Российской Федерации')
    if not r['sign']:
        r['sign'] = act_date(t, r'закон подписан Президентом') or act_date(t, r'подписан Президентом')
    r['pub'] = stage(t, r'Опубликование закона Опубликование закона')
    if not r['pub']:
        r['pub'] = act_date(t, r'закон опубликован') or stage(t, r'Опубликование закона')

    # Отклонение на чтении = дата голосования на том этапе, который голосовали
    # (не на более раннем принятом чтении). «отклонить … принятый в первом чтении»
    # → красный r2; «… во втором» → красный r3.
    rej = act_date(t, r'отклонить законопроект')
    if rejected and vote_day and not rej:
        rej = vote_day
    if rej:
        rd = (vote_rd or '').lower()
        # sozd: какой принятый текст отклонили
        if re.search(r'отклонить законопроект,?\s*принятый во втором чтении', t, re.I):
            stage_k = 'r3'
        elif re.search(r'отклонить законопроект,?\s*принятый в первом чтении', t, re.I):
            stage_k = 'r2'
        elif re.search(r'3\s*чтен|3-е', rd):
            stage_k = 'r3'
        elif re.search(r'2\s*чтен|2-е', rd):
            stage_k = 'r2'
        elif re.search(r'1\s*чтен|1-е', rd) and not r.get('r1'):
            stage_k = 'r1'
        elif r.get('r2') and not r.get('r3'):
            stage_k = 'r3'  # уже было 2-е принятие → отклонили на 3-м
        elif r.get('r1') and not r.get('r2'):
            stage_k = 'r2'  # уже было 1-е → отклонили при рассмотрении во 2-м
        else:
            stage_k = 'r1'
        if not r.get(stage_k):
            r[stage_k] = rej

    m = re.search(r'закон подписан (\d+-ФЗ)', t) or re.search(r'Федеральный закон.*?(\d+-ФЗ)', t)
    if not m:
        m = re.search(r'(\d+-ФЗ)', t)
        # только если рядом «подписан»/«опубликован»
        if m and not re.search(r'.{0,40}' + re.escape(m.group(1)) + r'.{0,20}(подписан|опубликован)|(подписан|опубликован).{0,40}' + re.escape(m.group(1)), t):
            m = None
    if m:
        r['law'] = m.group(1) if m.lastindex else m.group(0)
        # normalize group
        law_m = re.search(r'(\d+-ФЗ)', m.group(0) if not m.lastindex else m.group(1))
        if law_m:
            r['law'] = law_m.group(1)

    if r.get('law') and r.get('sign') and not os.environ.get('TRACK_QUICK'):
        f, u = force_date(f"№ {r['law']}", r.get('pub', ''), r['sign'])
        if f:
            r['force'] = f
        if u:
            r['kremlin'] = u
    r['src'] = 'sozd.duma.gov.ru' + (', kremlin.ru' if r.get('kremlin') else '')

    # Лог дыр по достигнутым этапам
    reached = ['in', 'kom']
    if r.get('r1') or r.get('r2') or r.get('r3') or rejected or re.search(r'чтен|1-е|2-е|3-е', vote_rd or '', re.I):
        reached.append('r1')
    if r.get('r2') or r.get('r3') or re.search(r'2\s*чтен|2-е|3\s*чтен|3-е', vote_rd or '', re.I):
        reached.append('r2')
    if r.get('r3') or re.search(r'3\s*чтен|3-е', vote_rd or '', re.I):
        reached.append('r3')
    for k in ('sf', 'sign', 'pub', 'force'):
        if r.get(k):
            # все предыдущие поздние тоже «достигнуты»
            for prev in ('sf', 'sign', 'pub', 'force'):
                if prev not in reached:
                    reached.append(prev)
                if prev == k:
                    break
    missing = [k for k in reached if k in STAGES and not r.get(k)]
    # force часто отсутствует в тексте — не шумим, если нет law
    missing = [k for k in missing if k != 'force' or r.get('law')]
    if missing:
        C.log('track_fail.log', f'{n}: нет дат в sozd для {",".join(missing)}')

    return {k: v for k, v in r.items() if v}


def add_law(src, n, tr, title):
    i = src.index('const LAWS: any = ') + len('const LAWS: any = ')
    j = src.index(';\n', i)
    L = json.loads(src[i:j])
    d = tr['force']
    mk = d[3:]
    law = f"Федеральный закон от {tr['sign']} № {tr['law']}"
    arr = L['months'].setdefault(mk, [])
    if any(tr['law'] in x.get('law', '') for x in arr):
        return src
    arr.append({'d': d, 'law': law, 'title': title, 'sut': '', 'auto': 1, 'bill': n})
    arr.sort(key=lambda x: x['d'][:2])
    C.log('laws_auto.log', f'{n}: {law}, вступает {d}')
    return src[:i] + json.dumps(L, ensure_ascii=False) + src[j:]


def votes_ex(src):
    res = []
    for m in re.finditer(r"(?:DATA\['|^')(\d\d\.\d\d\.\d{4})'\]?(?: =|:) `(.*?)`", src, re.S | re.M):
        for ln in m.group(2).split('\n'):
            p = ln.split('|')
            if len(p) >= 5 and p[0].isdigit():
                res.append((m.group(1), p[0], p[1], p[2], p[3], p[4] == '1'))
    return res


def merge_track(old, new):
    """Новые непустые поля перекрывают; старые поздние этапы сохраняем, если sozd-кэш их ещё не видит."""
    out = dict(old or {})
    for k, v in (new or {}).items():
        if v:
            out[k] = v
    # src: отметить sozd
    if new and new.get('src'):
        parts = []
        for s in (out.get('src', ''), new['src']):
            for p in s.split(','):
                p = p.strip()
                if p and p not in parts:
                    parts.append(p)
        out['src'] = ', '.join(parts) if parts else 'sozd.duma.gov.ru'
    return out


if __name__ == '__main__':
    src = C.read_canvas()
    T = C.get_block(src, 'TRACK')
    titles = {}
    bill_meta = {}
    for d, v, doc, q, rd, ok in votes_ex(src):
        titles.setdefault(doc, q)
        if doc == '—' or not re.match(r'\d+-\d+$', doc):
            continue
        meta = bill_meta.setdefault(doc, {'day': d, 'rd': rd, 'rejected': False})
        # «отклонение» / отклонённый вопрос — тоже rejected (не только 1-е/2-е/3-е)
        is_rej = (not ok) and bool(re.search(r'чтен|1-е|2-е|3-е|отклон', rd, re.I))
        if is_rej:
            meta['rejected'] = True
            meta['day'] = d
            meta['rd'] = rd
        elif not meta['rejected']:
            meta['day'] = d
            meta['rd'] = rd

    ns = sys.argv[1:] or sorted(bill_meta)
    refresh_set = set()
    # Обновить с сети те, у кого в TRACK уже есть sf/sign/pub, а кэш старый — или явный --refresh
    if '--refresh' in ns:
        ns = [x for x in ns if x != '--refresh']
        refresh_set = set(ns) if ns else set(bill_meta)
        ns = sorted(refresh_set) if not sys.argv[1:] or sys.argv[1:] == ['--refresh'] else [x for x in sys.argv[1:] if x != '--refresh']

    # 13.11.2026: ежедневный прогон (CI) — TRACK_DAYS=N: только законопроекты, голосовавшиеся за последние N дней, и «в пути»
    # (есть r3/sf/sign/law, но нет force); у остальных TRACK уже есть. TRACK_BUDGET_SEC=S: после S секунд цикл
    # останавливается, собранное записывается, остальное — в следующий прогон (прогон не упирается в лимит времени CI).
    import time, datetime as _dt
    days_lim = int(os.environ.get('TRACK_DAYS', '0') or 0)
    if days_lim > 0 and not sys.argv[1:]:
        today = _dt.date.today()
        def _recent(d):
            try: return (today - _dt.datetime.strptime(d, '%d.%m.%Y').date()).days <= days_lim
            except ValueError: return False
        moving = {n for n, v in T.items() if not v.get('force') and any(v.get(k) for k in ('r3', 'sf', 'sign', 'law'))}
        ns = [n for n in ns if _recent(bill_meta.get(n, {}).get('day', '')) or n in moving or n not in T]
    budget = float(os.environ.get('TRACK_BUDGET_SEC', '0') or 0); t0 = time.time()
    print(f'track: {len(ns)} bills' + (f' (последние {days_lim} дн. и «в пути»)' if days_lim > 0 else '') + (f', бюджет {int(budget)} с' if budget else ''), flush=True)
    for i, n in enumerate(ns, 1):
        if budget and time.time() - t0 > budget:
            print(f'track: бюджет времени исчерпан на {i - 1} из {len(ns)} — остальные в следующий прогон', flush=True)
            C.log('track_fail.log', f'бюджет {int(budget)} с исчерпан: обработано {i - 1} из {len(ns)}')
            break
        meta = bill_meta.get(n, {})
        old = T.get(n, {})
        # если кэш без поздних дат, а старый TRACK их имел — попробовать refresh один раз
        need_refresh = n in refresh_set
        tr = one(n, vote_day=meta.get('day', ''), vote_rd=meta.get('rd', ''),
                 rejected=meta.get('rejected', False), refresh=need_refresh)
        if not tr:
            continue
        merged = merge_track(old, tr)
        # если после кэша нет sf/sign/pub, а голос уже 3-е/закон — refresh
        if (not os.environ.get('TRACK_QUICK') and not need_refresh
                and not any(merged.get(k) for k in ('sf', 'sign', 'pub'))):
            if re.search(r'3\s*чтен|3-е', meta.get('rd', ''), re.I) or old.get('sf') or old.get('law'):
                tr2 = one(n, vote_day=meta.get('day', ''), vote_rd=meta.get('rd', ''),
                          rejected=meta.get('rejected', False), refresh=True)
                if tr2:
                    merged = merge_track(merged, tr2)
        T[n] = {k: v for k, v in merged.items() if v}
        if T[n].get('force') and T[n].get('law') and T[n].get('sign'):
            src = add_law(src, n, T[n], titles.get(n, ''))
        if i % 25 == 0 or n in ('1071863-8', '1081963-8', '443614-8'):
            print(i, n, {k: T[n][k] for k in STAGES if k in T[n]}, flush=True)
    C.write_canvas(C.set_block(src, 'TRACK', 'const TRACK: Record<string, Record<string, string>>', T))
    print('TRACK written', len(T), flush=True)
