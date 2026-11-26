#!/usr/bin/env python3
"""Оперативные новости для вкладки «Новости» (16.11.2026): заголовок, дата, время и ссылка ровно как у органа, без пересказа.

Запуск:
  python3 news_live.py                    # собрать, слить с прежним файлом, записать out/live/live.json
  python3 news_live.py --prev FILE        # прежний опубликованный live.json (его скачивает workflow news из gh-pages)
  python3 news_live.py --offline DIR      # разбор сохраненных ответов (tests/fixtures/live/*), без сети
  python3 news_live.py --days 7           # сколько дней хранить (по умолчанию 7)

Источники — только официальные сайты, прямые запросы (как organs.py; с серверов GitHub все они отвечают без прокси):
  Госдума — duma.gov.ru/news/; Правительство — RSS government.ru/all/rss/; Совет Федерации — council.gov.ru/events/news/;
  Банк России — RSS пресс-релизов; Минфин, Минтруд, Минюст — те же ленты, что в organs.py.
Не ответил источник — его новости берутся из прежнего файла (ничего не пропадает), в status отмечается ошибка.
Публикация: pipeline/publish/publish.sh --live out/live/live.json (меняется только data/live.json в gh-pages).
"""

import os, re, sys, json, argparse, datetime as dt
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

sys.path[:0] = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'),
]
import common as C, organs as O

MSK = O.MSK
ODIR = os.path.join(C.OUT, 'live')
SRC = {
    'gd': 'http://duma.gov.ru/news/',
    'gov': 'http://government.ru/all/rss/',
    'sf': 'http://council.gov.ru/events/news/',
    'cbr': 'https://www.cbr.ru/rss/RssPress',
    'minfin': O.SOURCES['minfin_news'],
    'mintrud': O.SOURCES['mintrud_news'],
    'minjust': O.SOURCES['minjust_events'],
    # 18.11.2026: новостные разделы сайтов восьми министерств (решение владельца: «с каждого новостного раздела сайта именно этого органа»)
    'minzdrav': 'https://minzdrav.gov.ru/news',
    'economy': 'https://economy.gov.ru/material/news/',
}
FIX = {
    'economy': 'economy_news.html',
    'minzdrav': 'minzdrav_news.html',
    'gd': 'duma_news.html',
    'gov': 'gov_all_rss.xml',
    'sf': 'council_news.html',
    'cbr': 'cbr_RssPress.xml',
    'mintrud': 'mintrud_news_list.html',
    'minjust': 'minjust_events_list.html',
}


def item(o, d, t, u, tm=''):
    t = O.cut(t, 300)
    return {'o': o, 'd': d.strftime('%d.%m.%Y') if isinstance(d, dt.date) else d, 'tm': tm, 't': t, 'u': u}


def rss(xml, o, host=''):
    """RSS 2.0: title, link, pubDate (время — по Москве)."""
    res = []
    for it in ET.fromstring(xml.encode()).iter('item'):
        t, u, pd = O.clean(it.findtext('title')), (it.findtext('link') or '').strip(), it.findtext('pubDate')
        if not t or not u.startswith('http') or (host and host not in u) or not pd:
            continue
        w = parsedate_to_datetime(pd).astimezone(MSK)
        res.append(item(o, w.date(), t, u, w.strftime('%H:%M')))
    return res


TIME = re.compile(r'datetime="(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)')


def p_gd(h):
    """duma.gov.ru/news/: <article class="article--post"> — <a href="/news/64487/"> … <time datetime="2026-11-15 18:58:00"> … <h6 class="article--post__title">.
    Новости комитетов (поддомены komitet-*.duma.gov.ru) пока не берем: в ссылке заголовок слит с анонсом без разделителя."""
    res, seen = [], set()
    for blk in re.split(r'<article\b', h)[1:]:
        a = re.search(r'href="(/news/\d+/)"', blk)
        tm = TIME.search(blk)
        t = re.search(r'(?is)<h\d[^>]*class="[^"]*__title[^"]*"[^>]*>(.*?)</h\d>', blk)
        if not a or not tm or not t:
            continue
        u = 'http://duma.gov.ru' + a.group(1)
        title = O.clean(re.sub(r'<[^>]+>', ' ', t.group(1)))
        if u in seen or len(title) < 10:
            continue
        seen.add(u)
        res.append(
            item(
                'gd',
                dt.date(int(tm.group(1)), int(tm.group(2)), int(tm.group(3))),
                title,
                u,
                f'{tm.group(4)}:{tm.group(5)}',
            )
        )
    return res


GD_PAGE = 'http://duma.gov.ru/news/page/{}/'
GD_MAXP = 30


def gd_all(fetch, lo, maxp=GD_MAXP):
    """26.11.2026: лента duma.gov.ru/news/ отдает по 15 новостей на страницу, за день их бывает 20–40, и одна первая страница
    теряла новости (21.11 и 24–25.11). Читаем страницы /news/, /news/page/2/, … пока на странице есть новости не старше lo
    (дата; по умолчанию — вчера, чтобы весь вчерашний и сегодняшний день попали целиком), не больше maxp страниц.
    fetch(n) → (статус, html) для страницы n (1 — сама /news/). Возвращает (новости без повторов, число прочитанных страниц, статус)."""
    res, seen, n, st0 = [], set(), 0, 'ok'
    for n in range(1, maxp + 1):
        st, body = fetch(n)
        if st != 'ok':
            if n == 1:
                return [], 0, st
            st0 = f'page{n}: {st}'
            n -= 1
            break
        page = p_gd(body)
        if not page:
            break
        for x in page:
            if x['u'] not in seen:
                seen.add(x['u'])
                res.append(x)
        oldest = min(dt.datetime.strptime(x['d'], '%d.%m.%Y').date() for x in page)
        if oldest < lo:
            break
    return res, n, st0


def p_sf(h):
    """council.gov.ru/events/news/: карточки <div class="hentry_event …"> — <h3 class="hentry__title"><a href="/events/news/N/">заголовок</a></h3>
    и ниже <time class="dt-published" datetime="2026-11-13T19:28:00+04:00">. Время берем цифрами как есть (это московское время;
    смещение в атрибуте сайт пишет неверно — на government.ru то же: в RSS 12:00 +0300, на странице 12:00+04:00)."""
    res, seen = [], set()
    for blk in re.split(r'class="hentry_event', h)[1:]:
        a = re.search(r'(?is)class="hentry__title[^"]*"[^>]*>\s*<a[^>]+href="(/events/news/\d+/)"[^>]*>(.*?)</a>', blk)
        tm = TIME.search(blk)
        if not a or not tm:
            continue
        u = 'http://council.gov.ru' + a.group(1)
        t = O.clean(re.sub(r'<[^>]+>', ' ', a.group(2)))
        if u in seen or len(t) < 10:
            continue
        seen.add(u)
        res.append(
            item(
                'sf',
                dt.date(int(tm.group(1)), int(tm.group(2)), int(tm.group(3))),
                t,
                u,
                f'{tm.group(4)}:{tm.group(5)}',
            )
        )
    return res


def p_gov(x):
    return rss(x, 'gov', 'government.ru')


def p_cbr(x):
    return rss(x, 'cbr', 'cbr.ru')


def p_minjust(h):
    return [item('minjust', e['d'], e['t'], e['u']) for e in O.parse_minjust_events(h)]


def p_mintrud(h):
    return [item('mintrud', e['d'], e['t'], e['u']) for e in O.parse_mintrud_news(h)]


def p_minfin(h, known):
    """Минфин: в списке пресс-центра нет даты — ее берем со страницы новости, но только для новых адресов (известные — из прежнего файла)."""
    res = []
    for u, t in O.parse_minfin_list(h)[:20]:
        if u in known:
            res.append(known[u])
            continue
        st, a = O.get(u)
        if st != 'ok':
            continue
        t2, d = O.parse_minfin_article(a)
        tmm = re.search(r'class="presscenter_event_date[^"]*"[^>]*>[^<]*?(\d{1,2}:\d\d)', a)
        if d:
            res.append(item('minfin', d, t2 or t, u, tmm.group(1).zfill(5) if tmm else ''))
    return res


RU_DATE = re.compile(r'(\d{1,2})\s+(' + '|'.join(O.MONTHS) + r')\s+(\d{4})|(\d\d)\.(\d\d)\.(\d{4})')


def links(h, o, base, rx, near=420):
    """Новости министерства из списка на странице: ссылки <a href> по шаблону rx (адрес новости), заголовок — текст ссылки; дата — из адреса
    (…/2026/11/18/…) или из текста рядом со ссылкой («18 ноября 2026», «18.11.2026»); времени нет (рядом может стоять время чужой новости). Без даты запись пропускаем."""
    res, seen = [], set()
    for m in re.finditer(r'(?is)<a\b[^>]*href="([^"#]+)"[^>]*>(.*?)</a>', h):
        href = m.group(1)
        if not re.search(rx, href):
            continue
        t = O.clean(re.sub(r'<[^>]+>', ' ', m.group(2)))
        if len(t) < 15:
            continue
        u = href if href.startswith('http') else base.rstrip('/') + '/' + href.lstrip('/')
        if u in seen:
            continue
        d = None
        dm = re.search(r'/(20\d\d)/(\d\d)/(\d\d)/', href)
        if dm:
            d = dt.date(int(dm.group(1)), int(dm.group(2)), int(dm.group(3)))
        if not d:  # дата рядом с ссылкой: берем ближайшую к заголовку (до или после него — у сайтов по-разному)
            a0 = max(0, m.start() - near)
            near_txt = O.clean(re.sub(r'<[^>]+>', ' ', h[a0 : m.end() + near]))
            ti = near_txt.find(t[:30])
            ti = ti if ti >= 0 else len(near_txt) // 2
            best = None
            for r in RU_DATE.finditer(near_txt):
                try:
                    dd = (
                        dt.date(int(r.group(3)), O.MONTHS[r.group(2)], int(r.group(1)))
                        if r.group(1)
                        else dt.date(int(r.group(6)), int(r.group(5)), int(r.group(4)))
                    )
                except Exception:
                    continue
                dist = abs(r.start() - ti)
                if best is None or dist < best[0]:
                    best = (dist, dd)
            d = best[1] if best else None
        if not d:
            continue
        seen.add(u)
        res.append(item(o, d, t, u))  # время не берем: рядом может стоять время другой новости
    return res


def p_economy(h):
    """economy.gov.ru/material/news/: <article class="e-news__item"> … <div class="e-date e-news__date"> 18 ноября 2026 16:44 </div> …
    <header class="e-title e-news__title"><a href="/material/news/<адрес>.html" title="…">заголовок</a>. Дата и время стоят перед заголовком в той же карточке."""
    res, seen = [], set()
    for blk in re.split(r'<article\b[^>]*e-news__item', h)[1:]:
        dm = re.search(
            r'e-news__date[^>]*>\s*(\d{1,2})\s+(' + '|'.join(O.MONTHS) + r')\s+(\d{4})(?:\s+(\d{1,2}:\d\d))?', blk
        )
        a = re.search(r'(?is)<a[^>]+href="(/material/news/[^"]+\.html)"[^>]*>(.*?)</a>', blk)
        if not dm or not a:
            continue
        t = O.clean(re.sub(r'<[^>]+>', ' ', a.group(2)))
        u = 'https://economy.gov.ru' + a.group(1)
        if u in seen or len(t) < 10:
            continue
        seen.add(u)
        res.append(
            item(
                'economy',
                dt.date(int(dm.group(3)), O.MONTHS[dm.group(2)], int(dm.group(1))),
                t,
                u,
                (dm.group(4) or '').zfill(5) if dm.group(4) else '',
            )
        )
    return res


def p_minzdrav(h):
    return links(h, 'minzdrav', 'https://minzdrav.gov.ru', r'^/news/20\d\d/\d\d/\d\d/\d+')


PARSE = {
    'economy': p_economy,
    'minzdrav': p_minzdrav,
    'gd': p_gd,
    'gov': p_gov,
    'sf': p_sf,
    'cbr': p_cbr,
    'minjust': p_minjust,
    'mintrud': p_mintrud,
}


def collect(prev, offline=None, today=None):
    known = {x['u']: x for x in prev}
    got, status = [], {}
    for o, url in SRC.items():
        try:
            if offline:
                if o not in FIX or not os.path.exists(os.path.join(offline, FIX[o])):
                    status[o] = 'no-fixture'
                    continue
                body, st = open(os.path.join(offline, FIX[o]), encoding='utf-8').read(), 'ok'
            else:
                st, body = O.get(url)
            if st != 'ok':
                status[o] = st
                continue
            if o == 'gd':  # все страницы ленты за вчера и сегодня (см. gd_all)
                first = body

                def fetch(n):
                    if n == 1:
                        return 'ok', first
                    if offline:
                        f = os.path.join(offline, f'duma_news_p{n}.html')
                        return ('ok', open(f, encoding='utf-8').read()) if os.path.exists(f) else ('no-fixture', '')
                    return O.get(GD_PAGE.format(n))

                r, pages, pst = gd_all(fetch, (today or dt.datetime.now(MSK).date()) - dt.timedelta(days=1))
                status[o] = f'ok n={len(r)} pages={pages}' + ('' if pst == 'ok' else f' ({pst})')
                got += r
                continue
            r = p_minfin(body, known) if o == 'minfin' else PARSE[o](body)
            status[o] = f'ok n={len(r)}'
            got += r
        except Exception as e:  # разбор одного источника не роняет остальные
            status[o] = f'parse-error: {e}'
    return got, status


def merge(prev, got, days, today):
    """Прежние + новые без повторов по ссылке; новое значение записи заменяет старое (заголовок могли поправить); только за последние days дней.
    Порядок — от новых к старым (день, затем время)."""
    lo = today - dt.timedelta(days=days - 1)
    by = {}
    for x in prev + got:
        try:
            d = dt.datetime.strptime(x['d'], '%d.%m.%Y').date()
        except Exception:
            continue
        if d < lo or d > today:
            continue
        if not (x.get('u', '').startswith('http') and x.get('t') and x.get('o') in SRC):
            continue
        y = {**by.get(x['u'], {}), **{k: v for k, v in x.items() if v}}
        y.setdefault('tm', '')
        by[x['u']] = y
    key = lambda x: (dt.datetime.strptime(x['d'], '%d.%m.%Y').date(), x.get('tm') or '')
    return sorted(by.values(), key=key, reverse=True)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--prev')
    ap.add_argument('--offline')
    ap.add_argument('--days', type=int, default=7)
    ap.add_argument('--out', default=os.path.join(ODIR, 'live.json'))
    ap.add_argument('--today')
    a = ap.parse_args(argv)
    prev = []
    if a.prev and os.path.exists(a.prev):
        try:
            prev = json.load(open(a.prev, encoding='utf-8')).get('items', [])
        except Exception as e:
            print(f'прежний файл не прочитан: {e}', file=sys.stderr)
    today = dt.datetime.strptime(a.today, '%d.%m.%Y').date() if a.today else dt.datetime.now(MSK).date()
    got, status = collect(prev, a.offline, today)
    items = merge(prev, got, a.days, today)
    old = {x['u'] for x in prev}
    new = [x for x in items if x['u'] not in old]
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    out = {'upd': dt.datetime.now(MSK).strftime('%d.%m.%Y %H:%M'), 'status': status, 'items': items}
    json.dump(out, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    for o, s in status.items():
        print(f'  {o:8} {s}')
    print(f'новостей за {a.days} дн.: {len(items)}, новых: {len(new)} → {a.out}')
    for x in new[:15]:
        print(f'  + {x["d"]} {x.get("tm") or "     "} {x["o"]:7} {x["t"][:100]}')
    return out, new


if __name__ == '__main__':
    main()
