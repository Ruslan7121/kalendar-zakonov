#!/usr/bin/env python3
"""19.11.2026: полное название законопроекта с sozd (bills.sozd_title → bill_titles.py → INIC.t) и проверка «тексты не готовы»
(texts_check.py, правило 13). Сеть не нужна. Из корня репозитория: python3 tests/test_bill_titles.py"""
import os, sys, json, tempfile
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = tempfile.mkdtemp(prefix='gd-titles-')
os.makedirs(T + '/duma/bills', exist_ok=True); os.makedirs(T + '/out/logs', exist_ok=True); os.makedirs(T + '/extracts/bills', exist_ok=True)
CV = T + '/canvas.tsx'
os.environ.update(GD_ROOT=T, GD_DUMA=T + '/duma', CANVAS=CV, GD_SOZD_HTML=T + '/duma/bills')
sys.path.insert(0, os.path.join(R, 'pipeline'))
import bills, bill_titles, texts_check
import common as C

PAGE = ('<html><h1 class="h4"><i class="material-icons">&#xE80D;</i> Законопроект № 1-8</h1>'
        '<span id="oz_name" class="oz_naimen">О внесении изменения в Федеральный закон "О страховых пенсиях"</span></p>\n'
        '<p id="oz_name_comment" class="p_namecomment">\n(об особенностях индексации сумм страховой пенсии)\n</p>' + ' законопроект ' * 300 + '</html>')
assert bills.sozd_title(PAGE) == 'О внесении изменения в Федеральный закон "О страховых пенсиях" (об особенностях индексации сумм страховой пенсии)', bills.sozd_title(PAGE)
assert bills.sozd_title('<h1>О законе</h1>') == 'О законе'   # нет oz_name — как раньше, <h1>
open(T + '/duma/bills/1-8.html', 'w').write(PAGE)
json.dump({'n': '2-8', 'title': 'О внесении изменений в статью 5 (о сроках…'}, open(T + '/extracts/bills/2-8.json', 'w'))
BP = 'const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = '
SRC = ("const DATA: Record<string,string> = {};\n"
       "DATA['18.11.2026'] = `10|1-8|О внесении изменения в Федеральный закон \"О страховых…|3-е|1|400/0/0/50|\n11|2-8|О внесении…|1-е|0|10/0/0/440|`;\n"
       "const SHORT_RAW = `9|Порядок работы`;\n"
       + BP + json.dumps({'1-8': {'sut': ['Суть.'], 'who': 'Пенсионеры.'}}, ensure_ascii=False) + ";\n"
       "/* INIC:start */const INIC: Record<string, { ini?: string; com?: string; t?: string }> = {\"2-8\": {\"ini\": \"Депутаты\"}};/* INIC:end */\n")
open(CV, 'w').write(SRC)
C.CANVAS = CV
assert bill_titles.main(['18.11.2026']) == 0
IN = C.get_block(open(CV).read(), 'INIC')
assert IN['1-8']['t'].endswith('(об особенностях индексации сумм страховой пенсии)'), IN
assert 't' not in IN['2-8'] and IN['2-8']['ini'] == 'Депутаты', IN    # название с многоточием не записывается, ini не теряется
# тексты дня: нет SHORT у голосований и нет «Сути» у 2-8 → «не готовы» (1); дописали — готовы (0)
assert texts_check.main('18.11.2026') == 1
s = open(CV).read().replace('`9|Порядок работы`', '`9|Порядок работы\n10|Индексация пенсий\n11|Пример`')
s = s.replace(json.dumps({'1-8': {'sut': ['Суть.'], 'who': 'Пенсионеры.'}}, ensure_ascii=False), json.dumps({'1-8': {'sut': ['Суть.'], 'who': 'Пенсионеры.'}, '2-8': {'sut': ['С.'], 'who': 'Все.'}}, ensure_ascii=False))
open(CV, 'w').write(s)
assert texts_check.main('18.11.2026') == 0
print('test_bill_titles: OK')
