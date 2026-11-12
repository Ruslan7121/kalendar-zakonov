#!/usr/bin/env python3
"""Быстрый «путь закона»: параллельная загрузка sozd + track.py по кэшу.

  python3 track_fast.py --day 10.11.2026 [--day 11.11.2026] [--workers 10] [--all]

1. Из DATA выбираются законопроекты дня. Полная загрузка sozd — только для тех, кому
   нужна дорожная карта: принят (любое чтение), ратифицирован, отклонен после 1-го чтения.
   Отклоненные в 1-м чтении берутся только из кэша (флаг --all загружает и их).
2. Загрузка — ThreadPool (по умолчанию 10 потоков, пауза 0.12 с между запусками),
   страница берётся из единого кэша sozd_cache ($GD_DUMA/bills/<номер>.html): моложе TTL (48 ч) — без сети;
   иначе перезапрос, при неудаче — прошлая хорошая страница остаётся (--refresh — мимо TTL).
3. track.py запускается с TRACK_QUICK=1 (только кэш) порциями по 20 законопроектов —
   блок TRACK записывается после каждой порции. Даты не придумываются: нет в sozd — нет в TRACK.
"""
import os, sys, time, json, argparse, subprocess, shutil, tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C
import sozd_cache as S
HERE = os.path.dirname(os.path.abspath(__file__)); BILLS = S.DIR

def day_bills(src, days, all_):
    need, cache_only = [], []
    data = {}
    import re
    for d in days:
        m = re.search(r"DATA\['%s'\] = `(.*?)`" % re.escape(d), src, re.S)
        if not m: continue
        for l in m.group(1).split('\n'):
            p = l.split('|')
            if len(p) < 5 or not re.match(r'^\d+-\d+$', p[1]): continue
            ok = p[4] == '1'; rd = p[3]
            want = ok or rd.startswith('2-е') or rd.startswith('отклон')
            st = data.setdefault(p[1], False); data[p[1]] = st or want
    for n, w in data.items():
        (need if (w or all_) else cache_only).append(n)
    return need, cache_only

def fetch_one(n, i, delay, refresh=False):
    if S.fresh(n) and not refresh:
        return n, 'fresh', 0.0
    time.sleep(i * delay)
    t0 = time.time(); _, st = S.get(n, refresh=refresh, deadline=150, log='track_fail.log')
    return n, st or 'нет', time.time() - t0

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--day', action='append', required=True)
    ap.add_argument('--workers', type=int, default=10); ap.add_argument('--delay', type=float, default=0.12)
    ap.add_argument('--all', action='store_true'); ap.add_argument('--skip-fetch', action='store_true')
    ap.add_argument('--refresh', action='store_true')
    a = ap.parse_args(); t0 = time.time()
    need, cache_only = day_bills(C.read_canvas(), a.day, a.all)
    print(f'нужна дорожная карта: {len(need)}; только кэш: {len(cache_only)}', flush=True)
    fails = []
    if not a.skip_fetch:
        with ThreadPoolExecutor(a.workers) as ex:
            fs = [ex.submit(fetch_one, n, i % a.workers, a.delay, a.refresh) for i, n in enumerate(need)]
            for f in as_completed(fs):
                n, st, dt_ = f.result(); print(f'  sozd {n}: {st} ({dt_:.0f} с)', flush=True)
                if st not in ('fresh', 'fetched'): fails.append(n)
    have = [n for n in need + cache_only if S.cached(n)]
    env = dict(os.environ, TRACK_QUICK='1')
    for i in range(0, len(have), 20):
        part = have[i:i + 20]
        r = subprocess.run([sys.executable, os.path.join(HERE, 'track.py')] + part, env=env, capture_output=True, text=True)
        print(f'  track.py порция {i // 20 + 1}: {len(part)} → {r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-300:]}', flush=True)
    print(json.dumps({'tracked': have, 'sozd_fail': fails, 'no_cache': [n for n in need + cache_only if n not in have],
                      'sec': round(time.time() - t0)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
