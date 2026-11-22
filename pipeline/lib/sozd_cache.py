"""Единый кэш HTML-страниц законопроектов sozd.duma.gov.ru (пункт 6).

Один файл на страницу: $GD_SOZD_HTML/<номер>.html (по умолчанию $GD_DUMA/bills/, т.е. /workspace/duma/bills/).
Его читают и пишут bills.py, track.py, track_fast.py и audit.py — второго хранилища нет
(бывший extracts/bills_html/ при первом обращении переносится сюда, если там страница новее).

Свежесть:
  * успешная страница живёт SOZD_TTL_HOURS (по умолчанию 48 ч) — по mtime файла; после этого
    её перезапрашивают;
  * неудача (504/таймаут/обрезанная или чужая страница) пишется маркером <номер>.fail (время попытки,
    причина). Маркер живёт SOZD_FAIL_TTL_HOURS (по умолчанию 1 ч): в пределах одного прогона
    повторно не долбим, на следующем ежедневном прогоне — снова пробуем;
  * при неудаче последняя хорошая страница НЕ удаляется и не перезаписывается — её возвращают
    со статусом 'stale'; запись идёт атомарно (tmp + os.replace) только после проверки valid().
Ничего не выдумывается: нет страницы — возвращается None, вызывающий оставляет поле пустым.
"""
import os, re, json, time, shutil, tempfile
import common as C

DIR = os.environ.get('GD_SOZD_HTML') or os.path.join(C.DUMA, 'bills')
LEGACY_DIRS = [os.path.join(C.EXTR, 'bills_html')]  # старый второй кэш bills.py — только чтение для переноса
TTL_OK = float(os.environ.get('SOZD_TTL_HOURS', '48')) * 3600
TTL_FAIL = float(os.environ.get('SOZD_FAIL_TTL_HOURS', '1')) * 3600
# track.py без аргументов проходит все ~300 законопроектов DATA: TTL применяется только к тем, за которые
# голосовали в последние SOZD_ACTIVE_DAYS дней (по умолчанию 14); старше — кэш без срока (как раньше),
# обновить вручную: track.py --refresh [номер ...]. Законопроект без кэша запрашивается всегда.
ACTIVE_DAYS = int(os.environ.get('SOZD_ACTIVE_DAYS', '14'))
NEVER = float('inf')
NOT_FOUND = '404 Страница не найдена'


def path(n):
    return os.path.join(DIR, f'{n}.html')


def fail_path(n):
    return os.path.join(DIR, f'{n}.fail')


def urls(n):
    return [f'https://sozd.duma.gov.ru/bill/{n}', f'http://sozd.duma.gov.ru/bill/{n}',
            f'https://sozd.duma.gov.ru/bill/{n}/', f'https://www.duma.gov.ru/legislative/consideration/{n}/']


def valid(src):
    """Похоже на настоящую карточку законопроекта (не 404, не заглушка прокси, не обрезок)."""
    return bool(src) and len(src) > 2000 and NOT_FOUND not in src and ('законопроект' in src.lower() or '<h1' in src)


def _read(p):
    try:
        return open(p, errors='ignore').read()
    except OSError:
        return ''


def _migrate(n):
    """Перенести страницу из старого extracts/bills_html/, если она валидна и новее единого кэша."""
    cur = path(n)
    for d in LEGACY_DIRS:
        old = os.path.join(d, f'{n}.html')
        if not os.path.exists(old) or not valid(_read(old)):
            continue
        if not os.path.exists(cur) or os.path.getmtime(old) > os.path.getmtime(cur) or not valid(_read(cur)):
            os.makedirs(DIR, exist_ok=True)
            shutil.copy2(old, cur)


def ttl_for_day(day):
    """TTL для законопроекта по дню последнего голосования DD.MM.YYYY: недавний — TTL_OK, старый — NEVER."""
    import datetime as dt
    try:
        d = dt.datetime.strptime(day, '%d.%m.%Y')
    except (TypeError, ValueError):
        return TTL_OK
    return TTL_OK if (dt.datetime.now() - d).days <= ACTIVE_DAYS else NEVER


def age(n):
    p = path(n)
    return time.time() - os.path.getmtime(p) if os.path.exists(p) else None


def cached(n):
    """Последняя хорошая страница из кэша (любой давности) или ''."""
    _migrate(n)
    src = _read(path(n)) if os.path.exists(path(n)) else ''
    return src if valid(src) else ''


def fresh(n, ttl=None):
    a = age(n)
    return a is not None and a < (TTL_OK if ttl is None else ttl) and bool(cached(n))


def recent_fail(n):
    p = fail_path(n)
    return os.path.exists(p) and time.time() - os.path.getmtime(p) < TTL_FAIL


def _mark_fail(n, why):
    try:
        os.makedirs(DIR, exist_ok=True)
        json.dump({'n': n, 'at': time.strftime('%Y-%m-%d %H:%M:%S'), 'why': why}, open(fail_path(n), 'w'), ensure_ascii=False)
    except OSError:
        pass


def _store(n, src):
    os.makedirs(DIR, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=DIR, suffix='.tmp'); os.close(fd)
    open(tmp, 'w').write(src)
    os.chmod(tmp, 0o644); os.replace(tmp, path(n))
    if os.path.exists(fail_path(n)):
        os.remove(fail_path(n))


def get(n, refresh=False, offline=False, deadline=90, fetcher=None, log='sozd_cache.log', ttl=None):
    """Вернуть (html, status):
       'fresh'   — из кэша, моложе TTL;
       'fetched' — только что скачано и записано в кэш;
       'stale'   — сеть не дала валидную страницу (или offline/недавняя неудача), отдана последняя хорошая;
       '404'     — sozd ответил «страница не найдена» (кэш не трогается);
       ''        — ничего нет (html='').
    refresh=True — игнорировать TTL и маркер неудачи; ttl — своё время жизни в секундах (NEVER — бессрочно); offline=True — сеть не трогать (TRACK_QUICK)."""
    fetcher = fetcher or C.fetch
    have = cached(n)
    if have and not refresh and fresh(n, ttl):
        return have, 'fresh'
    if offline or (not refresh and recent_fail(n)):
        return (have, 'stale') if have else ('', '')
    tmp = f'/tmp/sozd_{n}_{os.getpid()}.html'
    saw404, why = False, 'нет ответа'
    for u in urls(n):
        try:
            ok = fetcher(u, tmp, deadline)
        except Exception as e:  # сеть/прокси — это неудача, не падение конвейера
            ok, why = False, f'exception {e}'
        src = _read(tmp) if ok and os.path.exists(tmp) else ''
        if os.path.exists(tmp):
            os.remove(tmp)
        if NOT_FOUND in src:
            saw404 = True; continue
        if valid(src):
            _store(n, src)
            return src, 'fetched'
        if src:
            why = 'невалидная страница'
    _mark_fail(n, '404' if saw404 else why)
    C.log(log, f'{n}: sozd {"404" if saw404 else why}; ' + ('отдан прошлый кэш' if have else 'кэша нет'))
    if have:
        return have, 'stale'
    return ('', '404') if saw404 else ('', '')
