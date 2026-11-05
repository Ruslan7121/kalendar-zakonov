#!/usr/bin/env python3
"""Пункт «О проекте федерального закона»: загрузить ВСЕ законопроекты дня без пропусков.
Для каждого номера: страница sozd (сохраняется), пояснительная записка (docx/pdf -> текст).
Ошибки: out/logs/bills_fail.log (номер, причина). Итог: out/extracts/bills/<номер>.json
Запуск: python3 bills.py [DD.MM.YYYY ...]   (без аргументов — все дни из canvas)"""
import sys, os, re, json, zipfile, subprocess
sys.path.insert(0, os.path.dirname(__file__)); import common as C
D = os.path.join(C.EXTR, 'bills'); os.makedirs(D, exist_ok=True)

def note_text(path):
    b = open(path, 'rb').read(4)
    if b == b'PK\x03\x04':
        x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8', 'ignore')
        return '\n'.join(re.sub(r'\s+', ' ', ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip() for p in re.findall(r'<w:p[ >].*?</w:p>', x, re.S))
    if b[:4] == b'%PDF':
        r = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True); return r.stdout
    return ''

def one(n, day, vid):
    out = os.path.join(D, n + '.json')
    if os.path.exists(out): return 'cached'
    h = f'/tmp/sozd_{n}.html'
    if not C.fetch(f'https://sozd.duma.gov.ru/bill/{n}', h):
        C.log('bills_fail.log', f'{day} {vid} {n}: sozd не ответил'); return 'fail'
    src = open(h, errors='ignore').read()
    if '404 Страница не найдена' in src:
        C.log('bills_fail.log', f'{day} {vid} {n}: sozd 404'); return 'fail'
    t = C.text(src)
    m = re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S)
    rec = {'n': n, 'day': day, 'vote': vid, 'title': C.text(m.group(1)).strip() if m else '', 'note': '', 'note_url': ''}
    dl = [(u, C.text(a)) for u, a in re.findall(r'href="(/download/[^"]+)"[^>]*>(.{0,400}?)</a>', src, re.S)]
    pz = next((u for u, a in dl if 'ояснительн' in a), None)
    if pz:
        f = f'/tmp/pz_{n}.bin'
        if C.fetch('https://sozd.duma.gov.ru' + pz, f, 150):
            rec['note'] = note_text(f)[:60000]; rec['note_url'] = 'https://sozd.duma.gov.ru' + pz
            if not rec['note']: C.log('bills_fail.log', f'{day} {vid} {n}: записка не читается (скан/формат)')
        else: C.log('bills_fail.log', f'{day} {vid} {n}: записка не скачалась')
    else: C.log('bills_fail.log', f'{day} {vid} {n}: на sozd нет пояснительной записки')
    rec['amend'] = bool(re.match(r'О внесении изменени', rec['title'] or ''))
    json.dump(rec, open(out, 'w'), ensure_ascii=False, indent=1); return 'ok'

if __name__ == '__main__':
    src = C.read_canvas(); days = sys.argv[1:]
    items = [(d, v, n) for d, v, n, q, r in C.votes(src) if re.fullmatch(r'\d+-\d+', n) and (not days or d in days)]
    seen = set(); st = {}
    for d, v, n in items:
        if n in seen: continue
        seen.add(n); r = one(n, d, v); st[r] = st.get(r, 0) + 1
    print('законопроектов:', len(seen), st)
