#!/usr/bin/env python3
"""События органов власти для «Календаря законов»: Минфин, Минтруд, Минюст, Банк России, Совет Федерации.

Запуск:
  python3 organs.py                       # за вчерашний день (Europe/Moscow) + ближайшие заседания СФ
  python3 organs.py --day 09.11.2026      # за один день
  python3 organs.py --from 05.11.2026 --to 10.11.2026
  python3 organs.py --snapshot sf_meetings=FILE --snapshot minfin_pravo=FILE   # текст публичной страницы,
                                          # сохраненный вручную, если сайт недоступен с этой машины
  python3 organs.py --offline DIR         # разбор сохраненных ответов (fixtures), без сети
  python3 organs.py --embed               # записать события в блок ORG (и проверенные поля из out/organs/enrich.json в ORGX) в $CANVAS (src/canvas.tsx)

Результат (накопительно, без дублей по id=орган+ссылка):
  out/organs/events.json  — все события; out/organs/status.json — состояние каждого источника;
  out/logs/organs.log     — журнал.
Только прямые запросы к официальным сайтам. Прокси и обход блокировок не используются:
если сайт недоступен или отвечает страницей ограничения доступа, источник помечается blocked.
"""
import os, re, sys, json, html, argparse, datetime as dt, subprocess, hashlib
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

MSK = dt.timezone(dt.timedelta(hours=3))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
ODIR = os.path.join(C.OUT, 'organs')
ORGS = {'minfin': 'Минфин', 'mintrud': 'Минтруд', 'minjust': 'Минюст', 'cbr': 'Банк России', 'sf': 'Совет Федерации'}
TYPES = ('заседание', 'проект', 'решение', 'разъяснение', 'новость')  # «новость» — во вкладку «Новости» (ORGNEWS), не в календарь
MONTHS = {m: i + 1 for i, m in enumerate(['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'])}
SOURCES = {
    'cbr_news': 'https://www.cbr.ru/rss/RssNews',
    'cbr_events': 'https://www.cbr.ru/rss/eventrss',
    'mintrud_docs': 'https://mintrud.gov.ru/document/rss',
    'mintrud_news': 'https://mintrud.gov.ru/news/news/list',
    'mintrud_profstandards': 'https://regulation.gov.ru/',
    'minjust_events': 'https://minjust.gov.ru/ru/events/list/',
    'minjust_projects': 'https://minjust.gov.ru/ru/documents/projects/',
    'minjust_registration': 'http://publication.pravo.gov.ru/',
    'minfin_projects': 'https://minfin.gov.ru/ru/document/npa_projects/',
    'minfin_pravo': 'http://publication.pravo.gov.ru/documents/foiv283/monthly',
    'sf_meetings': 'http://council.gov.ru/activity/meetings/',
}
FIX = {'cbr_news': 'cbr_RssNews.xml', 'cbr_events': 'cbr_eventrss.xml', 'mintrud_docs': 'mintrud_document_rss.xml', 'mintrud_news': 'mintrud_news_list.html',
       'minjust_events': 'minjust_events_list.html', 'minjust_projects': 'minjust_projects.html',
       'minfin_pravo': 'minfin_pravo_monthly.webfetch.md', 'sf_meetings': 'sf_meetings.webfetch.md'}

def d2s(d): return d.strftime('%d.%m.%Y')
def s2d(s): return dt.datetime.strptime(s, '%d.%m.%Y').date()
def clean(s): return re.sub(r'\s+', ' ', html.unescape(s or '')).strip().replace('ё', 'е').replace('Ё', 'Е')  # стиль страницы: без «ё»
def ru_date(s):
    m = re.search(r'(\d{1,2})\s+(' + '|'.join(MONTHS) + r')\s+(\d{4})', s)
    return dt.date(int(m.group(3)), MONTHS[m.group(2)], int(m.group(1))) if m else None
def rss_date(s): return parsedate_to_datetime(s).astimezone(MSK).date()
def cut(s, n):
    """Обрезать по границе слова/предложения, без разрыва слова; добавить «…» только если текст обрезан."""
    s = clean(s)
    if len(s) <= n: return s
    w = s[:n + 1]; i = max(w.rfind('. '), w.rfind('; '))
    if i >= n * 0.6: return w[:i + 1].rstrip(' ;')
    j = w.rfind(' ')
    return (w[:j] if j > 0 else s[:n]).rstrip(' ,;:—–-') + '…'

def ev(o, d, ty, t, u, k='', x=''):
    assert o in ORGS and ty in TYPES and u.startswith('http')
    e = {'id': f'{o}:{u}#{d2s(d)}', 'o': o, 'd': d2s(d), 'ty': ty, 'k': k, 't': cut(t, 220), 'u': u}
    if x: e['x'] = cut(x, 600)
    return e

BLOCK_MARKERS = ('Доступ временно ограничен', 'Access denied', 'UserGate', '<h1>Forbidden')
def get(url, timeout=25):
    """Прямой GET. Возвращает (status, text). status: ok | blocked:<причина> | error:<код>."""
    r = subprocess.run(['curl', '-s', '-L', '--compressed', '-m', str(timeout), '-A', UA, '-H', 'Accept-Language: ru-RU,ru;q=0.9',
                        '-w', '\n__HTTP__%{http_code}', url], capture_output=True)
    out = r.stdout.decode('utf-8', 'replace'); i = out.rfind('\n__HTTP__'); code = out[i + 9:].strip() if i >= 0 else '000'; body = out[:i] if i >= 0 else out
    if code == '000': return f'blocked:нет соединения (curl {r.returncode})', ''
    if any(b in body for b in BLOCK_MARKERS): return f'blocked:HTTP {code}, страница ограничения доступа', body
    if code != '200': return f'error:HTTP {code}', body
    return 'ok', body

# ---------- парсеры (принимают текст ответа, не ходят в сеть) ----------
def parse_cbr_news(xml):
    res = []
    for it in ET.fromstring(xml.encode()).iter('item'):
        t, u, d = clean(it.findtext('title')), it.findtext('link') or '', rss_date(it.findtext('pubDate'))
        m = re.match(r'Указание Банка России от (\d\d\.\d\d\.\d{4}) № (\S+)', t)
        if m: res.append(ev('cbr', d, 'решение', f'Указание № {m.group(2)} от {m.group(1)}', u, 'Указание')); continue
        if t.startswith('Решение Совета директоров'): res.append(ev('cbr', d, 'решение', t, u, 'Решение Совета директоров')); continue
        m = re.match(r'Информационное письмо от (\d\d\.\d\d\.\d{4}) № (\S+)', t)
        if m: res.append(ev('cbr', d, 'разъяснение', f'Информационное письмо № {m.group(2)} от {m.group(1)}', u, 'Информационное письмо')); continue
        if t.startswith('Ответы на типовые запросы'): res.append(ev('cbr', d, 'разъяснение', t, u, 'Ответы на запросы'))
    return res

def parse_cbr_events(xml):
    res = []
    for it in ET.fromstring(xml.encode()).iter('item'):
        t, u, d = clean(it.findtext('title')), it.findtext('link') or '', rss_date(it.findtext('pubDate'))
        lt = t.lower()
        if re.search(r'ключев\w+ ставк', lt) and re.search(r'решени|повысил|понизил|сохранил|снизил', lt) and 'резюме' not in lt:
            res.append(ev('cbr', d, 'решение', t, u, 'Решение Совета директоров'))
        elif re.search(r'\bуказани', lt): res.append(ev('cbr', d, 'решение', t, u, 'Указание'))
        elif re.search(r'рекомендует|разъясн', lt): res.append(ev('cbr', d, 'разъяснение', t, u, 'Рекомендации'))
        elif re.search(r'\bпроект', lt) and 'конференц' not in lt: res.append(ev('cbr', d, 'проект', t, u, 'Проект'))
    return res

def parse_mintrud_docs(xml):
    res = []
    for it in ET.fromstring(xml.encode()).iter('item'):
        t, u, d, x = clean(it.findtext('title')), it.findtext('link') or '', rss_date(it.findtext('pubDate')), clean(it.findtext('description'))
        if re.search(r'профессиональн\w+ стандарт', t + ' ' + x, re.I) and re.search(r'проект', t, re.I):
            res.append(ev('mintrud', d, 'проект', t, u, 'Проект профстандарта', x)); continue
        if t.startswith('Приказ'):
            m = re.search(r'№\s*(\S+)', t); dm = ru_date(t)
            short = (f"Приказ № {m.group(1)}" + (f" от {d2s(dm)}" if dm else '') if m else t) + (f': {x}' if x else '')
            res.append(ev('mintrud', d, 'решение', short, u, 'Приказ'))
    return res

def parse_minjust_events(h):
    """Лента /ru/events/list/: заголовки дат «6 ноября 2026 год» и ссылки /ru/events/N/. Коллегии — заседание,
    разработанные проекты — проект (они же в календаре); 14.11.2026: остальные материалы ленты — «новость» (вкладка «Новости»)."""
    res, cur = [], None
    h = re.sub(r'<div class="day">\s*(\d{1,2})(?:&nbsp;|\s)+(\w+)\s*</div>\s*<div class="year">\s*(\d{4})\s*год', r'\1 \2 \3 год', h)
    for m in re.finditer(r'(\d{1,2}\s+(?:' + '|'.join(MONTHS) + r')\s+\d{4})\s*год|<a[^>]+href="(/ru/events/\d+/)"[^>]*>(.*?)</a>', h, re.S):
        if m.group(1): cur = ru_date(m.group(1)); continue
        t = clean(re.sub(r'<[^>]+>', ' ', m.group(3)))
        if not cur or not t: continue
        u = 'https://minjust.gov.ru' + m.group(2); lt = t.lower()
        if 'коллеги' in lt: res.append(ev('minjust', cur, 'заседание', t, u, 'Коллегия'))
        elif re.search(r'разработан\w* (законопроект|проект)|проект\w* приказ', lt): res.append(ev('minjust', cur, 'проект', t, u, 'Проект'))
        else: res.append(ev('minjust', cur, 'новость', t, u, 'Новость'))
    seen, out = set(), []
    for e in res:
        if e['id'] not in seen: seen.add(e['id']); out.append(e)
    return out

def parse_mintrud_news(h):
    """14.11.2026: «Картина дня» Минтруда (mintrud.gov.ru/news/news/list). Каждая новость — ссылка, в тексте которой
    заголовок и дата («… 13 ноября 2026») или дата и заголовок (карточки вверху страницы). Видеобанк и разделы без даты пропускаем."""
    res, seen = [], set()
    D = r'(\d{1,2}\s+(?:' + '|'.join(MONTHS) + r')\s+\d{4})'
    for m in re.finditer(r'(?is)<a[^>]+href="(/[^"#]+)"[^>]*>(.*?)</a>', h):
        href, t = m.group(1), clean(re.sub(r'<[^>]+>', ' ', m.group(2)))
        if href.startswith(('/videobank', '/events/event-profi')) or href in seen: continue
        a = re.match(r'^(.{15,}?)\s+' + D + r'$', t) or re.match(r'^' + D + r'\s+(.{15,})$', t)
        if not a: continue
        title, d = (a.group(1), a.group(2)) if not re.match(D, t) else (a.group(2), a.group(1))
        dd = ru_date(d)
        if not dd: continue
        seen.add(href); res.append(ev('mintrud', dd, 'новость', title, 'https://mintrud.gov.ru' + href, 'Новость'))
    return res

def parse_pravo_list(txt, org='minfin'):
    """Список «Официальное опубликование правовых актов» по органу (HTML→текст или сохраненный текст страницы).
    Дата события — дата официального опубликования; в названии — дата и номер регистрации в Минюсте."""
    t = clean(re.sub(r'<[^>]+>', ' ', txt)); res = []
    for m in re.finditer(r'(Приказ [^"«]*?от (\d\d\.\d\d\.\d{4}) № (\S+?)\s*["«](.+?)["»]\s*\(Зарегистрирован (\d\d\.\d\d\.\d{4}) № (\d+)\))\s*Номер опубликования:\s*(\d{16})\s*Дата опубликования:\s*(\d\d\.\d\d\.\d{4})', t):
        u = f'http://publication.pravo.gov.ru/document/{m.group(7)}'
        res.append(ev(org, s2d(m.group(8)), 'решение', f'Приказ № {m.group(3)} от {m.group(2)}: {m.group(4)}', u, 'Приказ',
                      f'Зарегистрирован Минюстом {m.group(5)} № {m.group(6)}'))
    return res

def parse_sf_meetings(txt):
    """Список заседаний СФ (HTML→текст или сохраненный текст): «622 заседание Совета Федерации 10 ноября 2026 г.», «621 28 октября 2026 г.»."""
    t = clean(re.sub(r'<[^>]+>', ' ', txt)); res = []
    for m in re.finditer(r'(?:^|\s|#)(\d{3})(?: заседание Совета Федерации)?\s+(\d{1,2}\s+(?:' + '|'.join(MONTHS) + r')\s+\d{4}) г\.', t):
        d = ru_date(m.group(2)); n = m.group(1)
        u, x = SF_AGENDA.get(n, (SOURCES['sf_meetings'], ''))
        res.append(ev('sf', d, 'заседание', f'{n}-е заседание Совета Федерации', u, 'Заседание, рассмотрение законов' if x else 'Заседание', x))
    return res

# Повестки заседаний СФ: официальная страница повестки council.gov.ru и законы, вынесенные на рассмотрение.
# 622: http://council.gov.ru/activity/meetings/178174/agenda/ (проект повестки от 09.11.2026) и анонс
# http://council.gov.ru/events/smi/announcements/178175/ — прочитаны 10.11.2026 через публичный поиск, т. к. с box сайт недоступен.
SF_AGENDA = {'622': ('http://council.gov.ru/activity/meetings/178174/agenda/',
    'Рассмотрение законов о ратификации: договор с Зимбабве о правовой помощи по уголовным делам; соглашение с Камбоджей '
    'о защите граждан в области международной уголовной юстиции; два договора с Никарагуа (о выдаче и о передаче осужденных); '
    'протокол с Беларусью о косвенных налогах; соглашение с Южной Осетией о зачете выслуги в таможенных органах. '
    'Консультации по кандидатуре заместителя Генпрокурора; «правительственный час» с министром внутренних дел.')}

PARSERS = {'cbr_news': parse_cbr_news, 'cbr_events': parse_cbr_events, 'mintrud_docs': parse_mintrud_docs, 'mintrud_news': parse_mintrud_news,
           'minjust_events': parse_minjust_events, 'minfin_pravo': parse_pravo_list, 'sf_meetings': parse_sf_meetings}
NOT_PARSED = {'mintrud_profstandards': 'проекты профстандартов публикуются на regulation.gov.ru — с этой машины нет соединения',
              'minjust_projects': 'страница проектов документов Минюста отдается без списка (пустая выдача)',
              'minjust_registration': 'реестр регистрации НПА (publication.pravo.gov.ru, pravo.minjust.ru) — с этой машины нет соединения/HTTP 500',
              'minfin_projects': 'minfin.gov.ru отвечает HTTP 503 «Доступ временно ограничен»'}

def collect(args):
    status, events = {}, []
    snaps = dict(s.split('=', 1) for s in args.snapshot)
    for key, fn in PARSERS.items():
        src = SOURCES[key]
        if key in snaps:
            body, st = open(snaps[key]).read(), 'snapshot:' + os.path.basename(snaps[key])
        elif args.offline:
            p = os.path.join(args.offline, FIX[key])
            if not os.path.exists(p): status[key] = {'url': src, 'status': 'no-fixture'}; continue
            body, st = open(p).read(), 'offline'
        else:
            st, body = get(src)
            if st != 'ok': status[key] = {'url': src, 'status': st, 'n': 0}; C.log('organs.log', f'{key} {st} {src}'); continue
        try:
            got = fn(body)
        except Exception as e:
            status[key] = {'url': src, 'status': f'parse-error: {e}', 'n': 0}; C.log('organs.log', f'{key} parse-error {e}'); continue
        status[key] = {'url': src, 'status': st, 'n': len(got)}; events += got
    if not args.offline and 'minfin_projects' not in snaps:
        st, _ = get(SOURCES['minfin_projects']); status['minfin_projects'] = {'url': SOURCES['minfin_projects'], 'status': st if st != 'ok' else 'ok (разбор не реализован)'}
    for k, why in NOT_PARSED.items(): status.setdefault(k, {'url': SOURCES[k], 'status': 'not-collected', 'why': why})
    return events, status

ENRICH = os.path.join(ODIR, 'enrich.json')
def load_enrich():
    """Проверенные вручную по первоисточникам поля (st, kind, stt, no, full, sut, who, dl, nb, ps) по ключу «орган:ссылка#дата».
    Файл ведется отдельно и сбором НЕ перезаписывается; события без записи показываются по данным ленты.
    Источник правды для ORGX — этот файл: правки «Сути» и т. п. вносятся сюда, затем organs.py --embed."""
    return json.load(open(ENRICH)) if os.path.exists(ENRICH) else {}

def in_window(e, a, b, ahead):
    d = s2d(e['d'])
    return a <= d <= b or (e['ty'] == 'заседание' and b < d <= ahead)

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--day'); ap.add_argument('--from', dest='frm'); ap.add_argument('--to')
    ap.add_argument('--snapshot', action='append', default=[]); ap.add_argument('--offline')
    ap.add_argument('--embed', action='store_true'); ap.add_argument('--ahead', type=int, default=3, help='дней вперед для объявленных заседаний')
    args = ap.parse_args(argv)
    today = dt.datetime.now(MSK).date()
    if args.day: a = b = s2d(args.day)
    elif args.frm: a, b = s2d(args.frm), s2d(args.to) if args.to else today
    else: a = b = today - dt.timedelta(days=1)
    ahead = max(b, today) + dt.timedelta(days=args.ahead)
    found, status = collect(args)
    found = [e for e in found if in_window(e, a, b, ahead)]
    os.makedirs(ODIR, exist_ok=True); fp = os.path.join(ODIR, 'events.json')
    old = json.load(open(fp)) if os.path.exists(fp) else []
    by = {e['id']: e for e in old}; new = 0
    for e in found:
        if e['id'] not in by: new += 1
        by[e['id']] = {**by.get(e['id'], {}), **e}
    allv = sorted(by.values(), key=lambda e: (s2d(e['d']), e['o'], e['t']), reverse=True)
    json.dump(allv, open(fp, 'w'), ensure_ascii=False, indent=1)
    run = {'run': dt.datetime.now(MSK).strftime('%d.%m.%Y %H:%M МСК'), 'window': [d2s(a), d2s(b)], 'ahead_to': d2s(ahead), 'sources': status, 'new': new, 'total': len(allv)}
    json.dump(run, open(os.path.join(ODIR, 'status.json'), 'w'), ensure_ascii=False, indent=1)
    C.log('organs.log', f"окно {d2s(a)}–{d2s(b)}: найдено {len(found)}, новых {new}, всего {len(allv)}")
    for k, s in status.items(): print(f"  {k:24} {s['status']}" + (f"  n={s['n']}" if 'n' in s else '') + (f"  ({s['why']})" if 'why' in s else ''))
    print(f'окно {d2s(a)}–{d2s(b)} (+заседания до {d2s(ahead)}): найдено {len(found)}, новых {new}, всего {len(allv)} → {fp}')
    if args.embed:
        src = C.read_canvas(); src = C.set_block(src, 'ORG', 'const ORG: any[]', [{k: v for k, v in e.items() if k != 'id'} for e in allv])
        if '/* ORGX:start */' in src:
            ids = {e['id'] for e in allv}; enr = load_enrich()
            # 12.11.2026 (п. 8): проверенные поля, внесенные прямо в ORGX canvas, но не перенесенные в enrich.json,
            # при --embed не теряются (раньше блок ORGX перестраивался только из enrich.json и молча стирал их).
            old_x = C.get_block(src, 'ORGX'); keep = {k: v for k, v in old_x.items() if k in ids and k not in enr}
            if keep:
                msg = f"ORGX: {len(keep)} записей есть в canvas, но нет в {ENRICH} — оставлены; перенесите их в enrich.json: " + ', '.join(sorted(keep))
                print('ВНИМАНИЕ: ' + msg, file=sys.stderr); C.log('organs.log', msg)
            src = C.set_block(src, 'ORGX', 'const ORGX: Record<string, any>', {**{k: v for k, v in enr.items() if k in ids}, **keep})
        C.write_canvas(src)
        print('canvas: блоки ORG/ORGX обновлены')
    return allv, run

if __name__ == '__main__':
    main()
