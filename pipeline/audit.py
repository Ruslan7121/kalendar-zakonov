#!/usr/bin/env python3
"""Независимый аудит canvas vs sozd/vote (не rerun track.py).
(a) метка чтения на карточке vs формулировка голосования/sozd
    («в первом чтении»→1-е, «принятый в первом чтении»→2-е, …)
(b) каждая дата TRACK vs события sozd
(c) день DATA vs дата голосования (vote HTML / sozd событие дня)
Фикс только при доказательстве. Ничего не выдумывать.
Запуск: python3 audit.py [--fix]
"""
from __future__ import annotations
import sys, os, re, json, html as H
sys.path.insert(0, os.path.dirname(__file__))
import common as C

STAGES = ('in', 'kom', 'r1', 'r2', 'r3', 'sf', 'sign', 'pub', 'force')
BILLS = os.path.join(C.DUMA, 'bills')
VOTE_DIRS = [
    os.path.join(C.DUMA, 'sep'),
    os.path.join(C.DUMA, 'chk'),
    os.path.join(C.DUMA),
    '/workspace/out/votes',
]
DT = r'(\d\d\.\d\d\.\d{4}) \d\d\.\d\d\.\d\d(?: \d\d:\d\d)?'
RD_MAP = {
    'первое чтение': '1-е', 'второе чтение': '2-е', 'третье чтение': '3-е',
    'за основу': 'за основу', 'в целом': 'в целом', 'процедура': 'процедура',
    'выбор способа голосования': 'способ голос.', 'способ голосования - открытое': 'способ голос.',
    'отклонение': 'отклонение',
}


def canon_rd(rd: str) -> str:
    s = (rd or '').strip().lower()
    if not s or s in ('—', '-', '–'):
        return '—'
    if re.search(r'3\s*чтен|3-е', s):
        return '3-е'
    if re.search(r'2\s*чтен|2-е', s):
        return '2-е'
    if re.search(r'1\s*чтен|1-е', s):
        return '1-е'
    if 'отклон' in s:
        return 'отклонение'
    if 'основ' in s:
        return 'за основу'
    if 'целом' in s:
        return 'в целом'
    if 'способ' in s:
        return 'способ голос.'
    if 'процедур' in s:
        return 'процедура'
    if 'ратификац' in s:
        return 'ратификация'
    return s


def sozd_text(n: str) -> str | None:
    local = os.path.join(BILLS, f'{n}.html')
    if not (os.path.exists(local) and os.path.getsize(local) > 2000):
        return None
    raw = open(local, errors='ignore').read()
    t = re.sub(r'\s+', ' ', C.text(raw))
    if 'По событиям' in t:
        t = t[t.find('По событиям'):]
    return t


def act_date(t: str, action: str) -> str:
    m = re.search(DT + r' ' + action, t)
    return m.group(1) if m else ''


def stage_date(t: str, pat: str) -> str:
    m = re.search(pat + r'.{0,200}?(\d\d\.\d\d\.\d{4})', t)
    return m.group(1) if m else ''


def parse_sozd_stages(t: str) -> dict:
    r = {}
    r['in'] = act_date(t, r'зарегистрирован и направлен Председателю')
    r['kom'] = act_date(t, r'направлен в комитет\(ы\) Государственной Думы') or act_date(t, r'назначить ответственный комитет')
    r['r1'] = act_date(t, r'принять законопроект в первом чтении')
    r['r2'] = act_date(t, r'принять законопроект во втором чтении')
    r['r3'] = stage_date(t, r'третьем чтении Рассмотрение законопроекта Государственной Думой') or act_date(t, r'принять закон\b')
    r['sf'] = stage_date(t, r'Рассмотрение закона на заседании Совета Федерации') or act_date(t, r'одобрить закон')
    r['sign'] = stage_date(t, r'Рассмотрение закона Президентом Российской Федерации') or act_date(t, r'закон подписан Президентом') or act_date(t, r'подписан Президентом')
    r['pub'] = stage_date(t, r'Опубликование закона Опубликование закона') or act_date(t, r'закон опубликован') or stage_date(t, r'Опубликование закона')
    rej = act_date(t, r'отклонить законопроект')
    rej_stage = None
    if rej:
        if re.search(r'отклонить законопроект,?\s*принятый во втором чтении', t, re.I):
            rej_stage = 'r3'
        elif re.search(r'отклонить законопроект,?\s*принятый в первом чтении', t, re.I):
            rej_stage = 'r2'
        elif re.search(r'отклонить[^.]{0,40}в третьем чтении', t, re.I):
            rej_stage = 'r3'
        elif re.search(r'отклонить[^.]{0,40}во втором чтении', t, re.I):
            rej_stage = 'r2'
        elif re.search(r'отклонить[^.]{0,40}в первом чтении', t, re.I):
            rej_stage = 'r1'
        elif r.get('r1') and not r.get('r2'):
            rej_stage = 'r2'
        elif r.get('r2') and not r.get('r3'):
            rej_stage = 'r3'
        else:
            rej_stage = 'r1'
        if rej_stage and not r.get(rej_stage):
            r[rej_stage] = rej
    r['_rej'] = rej
    r['_rej_stage'] = rej_stage
    return {k: v for k, v in r.items() if v}


def sozd_rejection_stage_label(t: str) -> str | None:
    """Если sozd однозначно указывает этап отклонения через «принятый в …»."""
    if re.search(r'отклонить законопроект,?\s*принятый во втором чтении', t, re.I):
        return '3-е'
    if re.search(r'отклонить законопроект,?\s*принятый в первом чтении', t, re.I):
        return '2-е'
    # «отклонить принятый в первом чтении законопроект»
    if re.search(r'отклонить\s+принятый\s+во\s+втором\s+чтении', t, re.I):
        return '3-е'
    if re.search(r'отклонить\s+принятый\s+в\s+первом\s+чтении', t, re.I):
        return '2-е'
    return None


def sozd_day_actions(t: str, day: str) -> list[str]:
    """Список действий ГД в конкретный день (фрагменты)."""
    out = []
    for m in re.finditer(re.escape(day) + r'[^\d]{0,5}\d\d\.\d\d\.\d\d(?: \d\d:\d\d)? ([^.]{5,160})', t):
        out.append(m.group(1).strip())
    # fallback: DATE near action without short-date
    for m in re.finditer(re.escape(day) + r'.{0,120}?(принять законопроект в[^\d]{0,40}|принять закон\b|отклонить[^\d]{0,80})', t, re.I):
        out.append(m.group(0))
    return out


def expected_reading_from_vote_title(title: str) -> str | None:
    if not title:
        return None
    m = re.match(r'\(([^)]*)\)\s*', title)
    paren = m.group(1).strip().lower() if m else ''
    body = title[m.end():] if m else title
    body_l = body.lower()
    if 'принятый во втором чтении' in body_l or 'принятого во втором чтении' in body_l:
        return '3-е'
    if 'принятый в первом чтении' in body_l or 'принятого в первом чтении' in body_l:
        return '2-е'
    if paren in RD_MAP:
        return RD_MAP[paren]
    # «2 чтение» / «2 чтение таб. …» в скобках
    if re.search(r'3\s*чтен', paren):
        return '3-е'
    if re.search(r'2\s*чтен', paren):
        return '2-е'
    if re.search(r'1\s*чтен|первое', paren):
        return '1-е'
    if 'третье' in paren or 'третьем' in paren:
        return '3-е'
    if 'второе' in paren or 'втором' in paren:
        return '2-е'
    if 'первое' in paren or 'первом' in paren:
        return '1-е'
    if 'отклон' in paren:
        # если в теле «принятый в первом» — уже обработано выше
        return 'отклонение'
    m2 = re.search(r'\((первое|второе|третье) чтение\)\s*$', body_l)
    if m2:
        return {'первое': '1-е', 'второе': '2-е', 'третье': '3-е'}[m2.group(1)]
    return None


def load_vote_html(vid: str) -> str | None:
    for d in VOTE_DIRS:
        for name in (f'v{vid}.html', f'{vid}.html'):
            p = os.path.join(d, name)
            if os.path.exists(p) and os.path.getsize(p) > 500:
                return open(p, errors='ignore').read()
    return None


def parse_vote_meta(raw: str) -> dict:
    t = C.text(raw)
    lines = [ln.strip() for ln in re.sub(r'\s*\n\s*', '\n', t).split('\n') if ln.strip()]
    title = day = None
    for i, ln in enumerate(lines):
        if 'Справка о результатах голосования по вопросу' in ln and i + 2 < len(lines):
            title = lines[i + 1]
            m = re.match(r'(\d\d\.\d\d\.\d{4})', lines[i + 2])
            if m:
                day = m.group(1)
            break
    if not title:
        m = re.search(r'<title>([^<]+)', raw, re.I)
        if m:
            title = H.unescape(m.group(1)).split('–')[0].strip()
    if not day:
        m = re.search(r'(\d\d\.\d\d\.\d{4})\s+\d\d:\d\d', t)
        if m:
            day = m.group(1)
    return {'title': title or '', 'day': day or ''}


def votes_full(src: str):
    res = []
    for m in re.finditer(r"(?:DATA\['|^')(\d\d\.\d\d\.\d{4})'\]?(?: =|:) `(.*?)`", src, re.S | re.M):
        for ln in m.group(2).split('\n'):
            p = ln.split('|')
            if len(p) >= 5 and p[0].isdigit():
                res.append((m.group(1), p[0], p[1], p[2], p[3], p[4] == '1'))
    return res


def fix_reading_in_src(src: str, day: str, vid: str, new_rd: str) -> str:
    a = f"'{day}': `"
    i = src.find(a)
    if i < 0:
        a = f"DATA['{day}'] = `"
        i = src.find(a)
        if i < 0:
            return src
    j = src.find('`', i + len(a))
    block = src[i + len(a):j]
    lines = block.split('\n')
    out = []
    for ln in lines:
        p = ln.split('|')
        if len(p) >= 5 and p[0] == vid:
            p[3] = new_rd
            ln = '|'.join(p)
        out.append(ln)
    return src[:i + len(a)] + '\n'.join(out) + src[j:]


def reading_mismatch(have: str, ok: bool, title: str, sozd: str | None, day: str) -> dict | None:
    """Вернуть mismatch dict или None. Только доказанные случаи."""
    cur = canon_rd(have)
    exp_vote = expected_reading_from_vote_title(title) if title else None

    # 1) vote title — главный источник метки карточки
    if exp_vote:
        exp_c = canon_rd(exp_vote)
        if cur != exp_c:
            # не считаем mismatch, если have — детализация «2 чтение таб.» а exp=2-е
            if cur == exp_c:
                return None
            return {
                'have_canon': cur, 'expected': exp_vote, 'exp_canon': exp_c,
                'from': 'vote_title', 'title': title[:160],
            }
        return None

    # 2) без vote title: sozd только для явных «принятый в …» при отклонении
    if not sozd:
        return None
    rej_lab = sozd_rejection_stage_label(sozd)
    rejected = (not ok) and bool(re.search(r'чтен|1-е|2-е|3-е|отклон', have, re.I))
    if rejected and rej_lab:
        exp_c = canon_rd(rej_lab)
        # карточное «отклонение» / неверный этап vs «принятый в первом»→2-е
        if cur != exp_c:
            # не переписывать корректное 1-е, если sozd говорит отклонить без «принятый»
            # (rej_lab уже только от «принятый в …»)
            return {
                'have_canon': cur, 'expected': rej_lab, 'exp_canon': exp_c,
                'from': 'sozd_rejection_wording', 'title': '',
            }
    return None


def main():
    fix = '--fix' in sys.argv
    src = C.read_canvas()
    TRACK = C.get_block(src, 'TRACK')
    votes = votes_full(src)

    report = {
        'checked_votes': 0,
        'checked_bills_track': 0,
        'mismatches': {'reading': [], 'track_date': [], 'vote_day': []},
        'fixed': [],
        'unverifiable': [],
    }

    bill_votes = {}
    for day, vid, doc, q, rd, ok in votes:
        report['checked_votes'] += 1
        is_bill = bool(re.fullmatch(r'\d+-\d+', doc))
        title = ''
        vote_day_src = None
        raw = load_vote_html(vid)
        if raw:
            meta = parse_vote_meta(raw)
            title = meta['title']
            vote_day_src = meta['day']

        sozd = sozd_text(doc) if is_bill else None

        if is_bill:
            mm = reading_mismatch(rd, ok, title, sozd, day)
            if mm:
                item = {'day': day, 'vid': vid, 'doc': doc, 'have': rd, **mm}
                report['mismatches']['reading'].append(item)
                if fix:
                    new_rd = mm['exp_canon'] if mm['exp_canon'] in ('1-е', '2-е', '3-е') else mm['expected']
                    src = fix_reading_in_src(src, day, vid, new_rd)
                    report['fixed'].append({
                        'doc': doc, 'vid': vid,
                        'what': f"reading {rd!r} → {new_rd!r}",
                        'evidence': mm['from'],
                    })
            elif not raw and not sozd and re.search(r'чтен|отклон|1-е|2-е|3-е', rd, re.I):
                report['unverifiable'].append({'doc': doc, 'vid': vid, 'why': 'no vote/sozd html for reading'})

        if vote_day_src and vote_day_src != day:
            report['mismatches']['vote_day'].append({
                'vid': vid, 'doc': doc, 'data_day': day, 'vote_page_day': vote_day_src,
            })
        elif is_bill and not raw and not sozd:
            report['unverifiable'].append({'doc': doc, 'vid': vid, 'why': 'vote day unverifiable'})

        if is_bill:
            bill_votes.setdefault(doc, []).append({
                'day': day, 'vid': vid, 'rd': rd, 'ok': ok,
                'rejected': (not ok) and bool(re.search(r'чтен|1-е|2-е|3-е|отклон', rd, re.I)),
            })

    for doc, tr in TRACK.items():
        if not re.fullmatch(r'\d+-\d+', doc):
            continue
        report['checked_bills_track'] += 1
        sozd = sozd_text(doc)
        if not sozd:
            report['unverifiable'].append({'doc': doc, 'why': 'TRACK: no local sozd html'})
            continue
        parsed = parse_sozd_stages(sozd)
        for k in STAGES:
            if k == 'force':
                continue
            have = (tr or {}).get(k, '')
            exp = parsed.get(k, '')
            if have and exp and have != exp:
                report['mismatches']['track_date'].append({
                    'doc': doc, 'stage': k, 'have': have, 'sozd': exp,
                })
                if fix:
                    tr = dict(tr)
                    tr[k] = exp
                    TRACK[doc] = {kk: vv for kk, vv in tr.items() if vv}
                    report['fixed'].append({
                        'doc': doc, 'what': f'TRACK.{k} {have} → {exp}', 'evidence': 'sozd',
                    })
            elif exp and not have:
                report['mismatches']['track_date'].append({
                    'doc': doc, 'stage': k, 'have': '', 'sozd': exp, 'kind': 'missing_in_track',
                })
                if fix:
                    tr = dict(tr or {})
                    tr[k] = exp
                    TRACK[doc] = {kk: vv for kk, vv in tr.items() if vv}
                    report['fixed'].append({
                        'doc': doc, 'what': f'TRACK.{k} filled {exp}', 'evidence': 'sozd',
                    })

    if fix:
        src = C.set_block(src, 'TRACK', 'const TRACK: Record<string, Record<string, string>>', TRACK)
        C.write_canvas(src)

    out_path = os.path.join(C.LOGS, 'audit_report.json')
    json.dump(report, open(out_path, 'w'), ensure_ascii=False, indent=2)
    print(f"checked_votes={report['checked_votes']} checked_track_bills={report['checked_bills_track']}")
    print(f"mismatches: reading={len(report['mismatches']['reading'])} track_date={len(report['mismatches']['track_date'])} vote_day={len(report['mismatches']['vote_day'])}")
    print(f"fixed={len(report['fixed'])} unverifiable={len(report['unverifiable'])}")
    for kind, items in report['mismatches'].items():
        for it in items[:40]:
            print(f'  [{kind}]', it)
        if len(items) > 40:
            print(f'  [{kind}] ... +{len(items)-40} more')
    for it in report['fixed']:
        print('  FIXED', it)
    print('report:', out_path)
    return 0


if __name__ == '__main__':
    sys.exit(main() or 0)
