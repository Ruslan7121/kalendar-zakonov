#!/usr/bin/env python3
"""Бюджетный блок для законопроекта о федеральном бюджете (по умолчанию 615-9).
Источник — только официальная пояснительная записка с sozd.duma.gov.ru (docx).
Таблица 1 записки: основные характеристики — 2025 (отчет об исполнении), 2026 (оценка исполнения
закона), 2027 по закону № 426-ФЗ, 2027–2029 по законопроекту. Таблицы разделов: расходы по разделам
классификации на 2027–2029 по законопроекту. Числа переносятся как есть, ничего не досчитывается.
Запуск: python3 budget.py [номер] [путь_к_docx]"""
import sys, os, re, zipfile
sys.path.insert(0, os.path.dirname(__file__)); import common as C
SECT = ['Общегосударственные вопросы', 'Национальная оборона', 'Национальная безопасность и правоохранительная деятельность',
        'Национальная экономика', 'Жилищно-коммунальное хозяйство', 'Охрана окружающей среды', 'Образование',
        'Культура, кинематография', 'Здравоохранение', 'Социальная политика', 'Физическая культура и спорт', 'Средства массовой информации']
n = sys.argv[1] if len(sys.argv) > 1 else '615-9'
f = sys.argv[2] if len(sys.argv) > 2 else f'/tmp/pz{n.split("-")[0]}.bin'
url = ''
if not os.path.exists(f):
    h = f'/tmp/sozd_{n}.html'; C.fetch(f'https://sozd.duma.gov.ru/bill/{n}', h)
    src_h = open(h, errors='ignore').read()
    pz = next((u for u, a in re.findall(r'href="(/download/[^"]+)"[^>]*>(.{0,400}?)</a>', src_h, re.S) if 'ояснительн' in C.text(a)), None)
    if not pz or not C.fetch('https://sozd.duma.gov.ru' + pz, f, 300): C.log('budget_fail.log', f'{n}: записка не скачалась'); sys.exit(1)
    url = 'https://sozd.duma.gov.ru' + pz
url = url or os.environ.get('PZ_URL', 'https://sozd.duma.gov.ru/download/1f1bd6e8-b820-6280-9df9-5b2013674d7f')
x = zipfile.ZipFile(f).read('word/document.xml').decode()
body = re.findall(r'<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>', x, re.S)
cell = lambda c: re.sub(r'\s+', ' ', ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', c))).strip()
rows = lambda t: [[cell(c) for c in re.findall(r'<w:tc>.*?</w:tc>', r, re.S)] for r in re.findall(r'<w:tr[ >].*?</w:tr>', t, re.S)]
tabs, prev = [], []
for b in body:
    if b.startswith('<w:tbl>'): tabs.append((' '.join(prev[-3:]), rows(b)))
    else:
        p = cell(b)
        if p: prev.append(p)
# 1) основные характеристики
main = next(R for _, R in tabs if R and R[0][:3] == ['Наименование', '2025 год (отчет)', '2026 год(оценка)'] and any(r[0] == 'Расходы, всего' for r in R))
pick = {r[0]: r for r in main if r[0] in ('Доходы, всего', 'Расходы, всего', 'Дефицит (–) / Профицит (+)')}
t1 = {'title': 'Основные характеристики, млрд рублей', 'cols': ['2025 (отчет)', '2026 (оценка)', '2027 по закону № 426-ФЗ', '2027 проект', '2028 проект', '2029 проект'],
      'rows': [[k.replace(' (–) / Профицит (+)', ' (–) / профицит (+)')] + [r[1], r[2], r[3], r[4], r[7], r[10]] for k, r in pick.items()],
      'note': '2025 — отчет об исполнении бюджета, 2026 — оценка исполнения, 2027 по закону № 426-ФЗ — действующий бюджет на 2026–2028 годы (таблица 1 пояснительной записки).'}
# 2) расходы по разделам
sec = []
for p, R in tabs:
    if len(R) > 2 and R[0] == ['Наименование', '2027 год', '2028 год', '2029 год'] and R[2][0] == 'ВСЕГО':
        nm = next((s for s in SECT if s.lower() in p.lower()), None)
        if nm and nm not in [s[0] for s in sec]: sec.append([nm] + R[2][1:4])
sec.sort(key=lambda r: -float(r[1].replace(' ', '').replace(',', '.')))
t2 = {'title': 'Расходы по разделам, млн рублей', 'cols': ['2027', '2028', '2029'], 'rows': sec,
      'note': 'Суммы по разделам за 2025 и 2026 годы в записке не приводятся; в блоке не показываются, пока не загружены из официального источника.'}
BUD = {n: {'src': [['Пояснительная записка (sozd.duma.gov.ru)', url], ['Карточка законопроекта', f'https://sozd.duma.gov.ru/bill/{n}']], 't': [t1, t2]}}
src = C.read_canvas(); old = C.get_block(src, 'BUDGET'); old.update(BUD)
decl = 'const BUDGET: Record<string, { src: [string, string][]; t: { title: string; cols: string[]; rows: string[][]; note?: string }[] }>'
C.write_canvas(C.set_block(src, 'BUDGET', decl, old)); print(n, 'разделов:', len(sec), 'характеристик:', len(t1['rows']))
