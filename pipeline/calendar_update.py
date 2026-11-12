#!/usr/bin/env python3
"""Refresh $GD_ROOT/out/calendar.json (calendar of Duma plenary days + Government meetings).
Usage: python3 calendar_update.py [--days-back 4]
Sources (via pipeline/fetch.sh, RU proxies from $GD_DUMA/lists):
 1. sozd.duma.gov.ru/calendar/b/day/D/D for today and previous N days -> bills with Совет Думы decision
    «включить законопроект в проект порядка работы Государственной Думы (DD.MM.YYYY)».
 2. sozd.duma.gov.ru/bill/<n> for each such bill -> title, plenary date (in parentheses), reading (from committee proposal).
 3. government.ru/meetings/ -> Government meetings (only announced/held ones; nothing is guessed).
 4. $GD_DUMA/calendar_static.json -> session schedule (week types) and manually confirmed facts with sources.
Existing bill entries are kept if a fetch fails (no data is invented; unknown -> agenda_status 'not_published').
The canvas is not touched here: CAL is merged into $CANVAS by cal_merge.py (next step of run_daily.sh)."""
import json, re, os, sys, html, subprocess, datetime as dt
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C
FETCH = os.environ.get('GD_FETCH') or os.path.join(C.HERE, 'fetch.sh'); CACHE = os.path.join(C.DUMA, 'cal_cache')
OUT = os.path.join(C.OUT, 'calendar.json'); STATIC = os.path.join(C.DUMA, 'calendar_static.json')
os.makedirs(CACHE, exist_ok=True)
CODES = [('административных правонарушениях', 'КоАП'), ('Налоговый кодекс', 'НК'), ('Гражданский кодекс', 'ГК'), ('Уголовный кодекс', 'УК'),
 ('Уголовно-процессуальный', 'УПК'), ('Бюджетный кодекс', 'БК'), ('Жилищный кодекс', 'ЖК'), ('Земельный кодекс', 'ЗК'), ('Трудовой кодекс', 'ТК'),
 ('административного судопроизводства', 'КАС'), ('Гражданский процессуальный', 'ГПК'), ('Арбитражный процессуальный', 'АПК'), ('Семейный кодекс', 'СК'),
 ('Градостроительный кодекс', 'ГрК'), ('Лесной кодекс', 'ЛК'), ('Водный кодекс', 'ВК'), ('Воздушный кодекс', 'ВзК')]
STOP = set("""о об в во и на по с со к за от для при целях части статью статьи статей внесении изменений изменения изменение отдельные отдельных законодательные акты российской федерации федеральный закон федерального закона
уточнения уточнение уточнении установления установлении установление совершенствования правового регулирования вопросам вопросу вопросов положений отношений связи порядка порядке
расширения предоставления обеспечения осуществления увеличения изменении дополнительного дополнительном дополнения законодательства законодательном урегулировании правил права круга лиц которые
особых сфере некоторых также либо или их его её а между который которые могут связанных случае дающего период протокола соглашения договор договора федерацией республикой""".split())

def short(name, comment):
    if name.lower().startswith('о ратификации'):
        w = [x for x in re.findall(r'[\w-]+', name)[2:] if x.lower() not in STOP][:2]
        return 'Ратификация: ' + ' '.join(w)
    lab = next((ab for k, ab in CODES if k in name), None)
    q = re.findall(r'[«"]([^»"]+)[»"]', name)
    src = (comment or '').strip('() ') or (re.search(r'\((.*)\)\s*$', name) or [None, ''])[1] or (q[0] if q else name)
    w = [x for x in re.findall(r'[\w-]+', src) if x.lower() not in STOP and not x.isdigit()][:2 if lab else 3]
    if not w and q: w = [x for x in re.findall(r'[\w-]+', q[0]) if x.lower() not in STOP][:3]
    s = ' '.join(w)
    s = s[:1].upper() + s[1:]
    return f'{lab}: {s[:1].lower() + s[1:]}' if lab and s else (lab or s)

def fetch(url, out, deadline=150):
    if os.environ.get('CAL_OFFLINE') and os.path.exists(out): return True
    env = dict(os.environ, FETCH_DEADLINE=str(deadline))
    r = subprocess.run(['bash', FETCH, url, out], env=env, capture_output=True)
    return r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 2000

def text(s):
    t = html.unescape(re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)); t = re.sub(r'<[^>]+>', '|', t)
    return re.sub(r'(\s*\|\s*)+', '|', re.sub(r'[ \t\r\n]+', ' ', t))

def bill(n):
    f = f'{CACHE}/bill_{n}.html'
    ok = fetch(f'https://sozd.duma.gov.ru/bill/{n}', f)
    if not ok and not os.path.exists(f): return None
    s = open(f, errors='ignore').read(); t = text(s)
    nm = re.search(r'id="oz_name"[^>]*>([^<]+)', s); nm = html.unescape(nm.group(1)).strip() if nm else ''
    cm = re.search(r'id="oz_name_comment"[^>]*>\s*([^<]*)', s); cm = html.unescape(cm.group(1)).strip() if cm else ''
    inc = re.findall(r'\|(\d\d\.\d\d\.\d{4})\|[^|]*\|включить законопроект в проект порядка работы Государственной Думы \((\d\d\.\d\d\.\d{4})\)', t)
    if not inc: inc = [(None, d) for d in re.findall(r'включить законопроект в проект порядка работы Государственной Думы \((\d\d\.\d\d\.\d{4})\)', t)]
    if not inc: return None
    dec, date = inc[-1]
    prop = re.findall(r'предложить ([^;|]{0,160}?)\((?:Предлагаемая|Рекомендуемая) дата рассмотрения Государственной Думой ' + re.escape(date), t)
    p = prop[-1] if prop else ''
    rd = ('3-е' if 'третьем' in p else '2-е' if ('втором' in p or 'принятый в первом' in p) else '1-е' if 'первом' in p else
          'ратификация' if 'ратиф' in nm.lower() else None)
    return {'doc': n, 'title': nm + (f' {cm}' if cm else ''), 'short': short(nm, cm), 'reading': rd, 'proposal': p.strip() or None,
            'council_decision': dec, 'url': f'https://sozd.duma.gov.ru/bill/{n}', 'date': date}

def council_bills(day):
    d = day.strftime('%Y-%m-%d'); f = f'{CACHE}/sozdcal_{d}.html'
    if not fetch(f'https://sozd.duma.gov.ru/calendar/b/day/{d}/{d}', f) and not os.path.exists(f): return []
    t = text(open(f, errors='ignore').read()); res = []; cur = None
    for x in t.split('|'):
        x = x.strip()
        if re.fullmatch(r'\d{1,7}-\d', x): cur = x
        elif cur and 'включить законопроект в проект порядка работы' in x and cur not in res: res.append(cur)
    return res

def gov_meetings():
    f = f'{CACHE}/gov_meetings.html'
    if not fetch('http://government.ru/meetings/', f) and not os.path.exists(f): return []
    s = open(f, errors='ignore').read(); out = []
    for m in re.finditer(r'href="(/meetings/\d+/)"[^>]*>(.*?)</a>', s, re.S):
        t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', m.group(2)))).strip()
        # дата стоит ПЕРЕД заголовком; для свежих записей вместо даты «N час(ов) назад» -> сегодня (фикс 03.11.2026)
        w = s[max(0, m.start()-600):m.start()]
        ds = list(re.finditer(r'(\d{1,2}) (января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря) (\d{4})', w))
        rel = [x.start() for x in re.finditer(r'назад|[Сс]егодня', w)]
        d = ds[-1] if ds else None
        if 'аседани' in t and (d or rel):
            MON = 'января февраля марта апреля мая июня июля августа сентября октября ноября декабря'.split()
            if rel and (not d or rel[-1] > d.start()): date = dt.date.today().strftime('%d.%m.%Y')
            else: date = f'{int(d.group(1)):02d}.{MON.index(d.group(2))+1:02d}.{d.group(3)}'
            if not any(o['date'] == date for o in out): out.append({'date': date, 'title': t[:160], 'url': 'http://government.ru' + m.group(1), 'source': 'government.ru/meetings/'})
    return out

def main():
    back = int(sys.argv[sys.argv.index('--days-back') + 1]) if '--days-back' in sys.argv else 4
    today = dt.date.today()
    old = json.load(open(OUT)) if os.path.exists(OUT) else {}
    st = json.load(open(STATIC))
    nums = []
    for i in range(back, -1, -1):
        for n in council_bills(today - dt.timedelta(days=i)):
            if n not in nums: nums.append(n)
    nums += [n for n in st.get('extra_bills', []) if n not in nums]
    with ThreadPoolExecutor(12) as ex: bills = [b for b in ex.map(bill, nums) if b]
    agenda = {}
    for d in old.get('days', []):  # keep previously known items
        for it in d.get('agenda', []): agenda.setdefault(d['date'], {})[it['doc'] if it['doc'] != '—' else '—' + it['title']] = it
    for b in bills:
        it = {k: b[k] for k in ('doc', 'short', 'title', 'reading', 'url')}; it['source'] = f"sozd.duma.gov.ru (решение Совета ГД {b['council_decision'] or ''})".replace(' )', ')')
        agenda.setdefault(b['date'], {})[b['doc']] = it
    for date, items in st.get('manual_agenda', {}).items():
        for it in items:
            k = it['doc'] if it['doc'] != '—' else '—' + it['title']  # несколько пунктов без номера (фикс 10.11.2026)
            agenda.setdefault(date, {})[k] = {**agenda.get(date, {}).get(k, {}), **it}
    days = []
    for p in st['plenary_days']:
        a = list(agenda.get(p['date'], {}).values())
        days.append({**p, 'agenda': a, 'agenda_status': 'published' if a else 'not_published'})
    gov = gov_meetings() or old.get('gov_meetings', [])
    gov = sorted({g['date']: g for g in gov + st.get('gov_manual', [])}.values(), key=lambda g: dt.datetime.strptime(g['date'], '%d.%m.%Y'))
    out = {'updated': dt.datetime.now().strftime('%d.%m.%Y %H:%M'), 'weeks': st['weeks'], 'days': days, 'gov_meetings': gov,
           'notes': [], 'sources': st.get('sources', [])}
    json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print(f"calendar.json: {len(days)} plenary days, {sum(len(d['agenda']) for d in days)} agenda items, {len(gov)} gov meetings")

if __name__ == '__main__': main()
