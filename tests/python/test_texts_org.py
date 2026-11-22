#!/usr/bin/env python3
"""Правило 15: texts_check.py видит документы ORG без «Сути»/«Кого коснётся»;
todo.py пишет их в out/TODO.md в раздел «Документы органов».
Суффикс «— тексты не готовы» из‑за органов — только для дней с ORG_HIDE_FROM.
Сеть не нужна. Запуск из корня репозитория: python3 tests/python/test_texts_org.py"""
import os, sys, json, tempfile, subprocess, shutil, re
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path[:0] = [os.path.join(os.path.join(R, 'pipeline'), d) for d in ('lib', 'collect', 'merge', 'check')]
import common as C
import texts_check

# --- помощники и одна константа во всех слоях ---
assert C.ORG_HIDE_FROM == '19.11.2026'
assert not C.org_hide_from('18.11.2026') and C.org_hide_from('19.11.2026')
cv = open(os.path.join(R, 'src', 'canvas.tsx'), encoding='utf-8').read()
assert f"const ORG_HIDE_FROM = '{C.ORG_HIDE_FROM}'" in cv
sd = open(os.path.join(R, 'pipeline', 'merge', 'split_data.mjs'), encoding='utf-8').read()
assert f"ORG_HIDE_FROM = '{C.ORG_HIDE_FROM}'" in sd

assert C.org_missing({'ty': 'решение', 'sut': ['А.'], 'who': 'Все.'}) == []
assert C.org_missing({'ty': 'решение', 'sut': 'А.'}) == ['«Кого коснётся»']
assert C.org_missing({'ty': 'заседание'}) == []
assert C.org_no({'t': 'Приказ № 131н от 01.09.2026: Тема'}) == '№ 131н'

# --- texts_check на синтетическом canvas ---
T = tempfile.mkdtemp(prefix='gd-org-texts-')
os.makedirs(T + '/out/logs', exist_ok=True)
CV = T + '/canvas.tsx'
os.environ.update(GD_ROOT=T, CANVAS=CV)
C.CANVAS, C.ROOT, C.OUT, C.LOGS = CV, T, T + '/out', T + '/out/logs'

def write(day, org, short=True, bp_ok=True):
    bp = {'1-8': {'sut': ['Суть.'], 'who': 'Все.'}} if bp_ok else {'1-8': {'sut': ['Суть.']}}
    short_raw = '10|Короткое' if short else '9|Порядок'
    open(CV, 'w').write(
        "const DATA: Record<string,string> = {};\n"
        f"DATA['{day}'] = `10|1-8|О законе|3-е|1|400/0/0/50|`;\n"
        f"const SHORT_RAW = `{short_raw}`;\n"
        "const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = "
        + json.dumps(bp, ensure_ascii=False) + ";\n"
        "/* ORG:start */const ORG: any[] = " + json.dumps(org, ensure_ascii=False) + ";/* ORG:end */\n"
        "/* ORGX:start */const ORGX: Record<string, any> = {};/* ORGX:end */\n"
    )

old = [
    {'o': 'minfin', 'd': '05.11.2026', 'ty': 'решение', 'k': 'Приказ', 't': 'Приказ № 131н от 01.09.2026: Формы отчетности', 'u': 'http://example/1', 'sut': 'Утверждены формы.', 'who': ''},
    {'o': 'gov', 'd': '05.11.2026', 'ty': 'решение', 'k': 'Распоряжение', 't': 'Распоряжение № 1-р от 05.11.2026: О назначении', 'u': 'http://example/2', 'sut': ['Первый абзац.', 'Второй.'], 'who': 'Кадры.'},
    {'o': 'sf', 'd': '05.11.2026', 'ty': 'заседание', 'k': 'Заседание', 't': 'Заседание Совета Федерации', 'u': 'http://example/3'},
]
write('05.11.2026', old)
gap = texts_check.org_gap(open(CV).read(), '05.11.2026')
assert len(gap) == 1 and gap[0][1] == ['«Кого коснётся»'], gap
assert texts_check.main('05.11.2026') == 0, 'долг до 19.11 не ставит суффикс, если законопроекты готовы'

new = [
    {'o': 'minfin', 'd': '19.11.2026', 'ty': 'решение', 'k': 'Приказ', 't': 'Приказ № 1 от 19.11.2026: Новая форма', 'u': 'http://example/n', 'sut': 'Текст.', 'who': ''},
]
write('19.11.2026', new)
assert texts_check.main('19.11.2026') == 1, 'с 19.11 документ без who — тексты не готовы'
new[0]['who'] = 'Распорядители бюджета.'
write('19.11.2026', new)
assert texts_check.main('19.11.2026') == 0, 'после «Кого коснётся» тексты за 19.11 готовы'

# --- todo.py на синтетическом canvas: ранние документы остаются в долге ---
# 19.11.2026: раньше эта часть шла по настоящему src/canvas.tsx и ждала долг у Приказа № 131н за 05.11 —
# тест ломался бы, как только этот долг допишут. Теперь только синтетические данные.
write('05.11.2026', old)
# заглушки блоков, которые читает todo.py (на синтетическом canvas их нет)
open(CV, 'a').write("const PROC: Record<string, any> = {};\nconst PLAIN: Record<string, any> = {\n};\n"
    "const ZTAG: Record<string, any> = {};\nconst CAL: any = {\"p\": []};\nconst ZAUTO: string[] = [];\nconst LAWS: any = {\"months\": {}};\n"
    "const ORGN: Record<string, string> = { minfin: 'Минфин', gov: 'Правительство', sf: 'Совет Федерации' };\nconst SFM: any = {};\n")
env = dict(os.environ, GD_ROOT=T, CANVAS=CV)
status = os.path.join(R, 'docs', 'STATUS.md')  # todo.py дописывает docs/STATUS.md клона — вернуть как было
prev = open(status).read() if os.path.exists(status) else None
r = subprocess.run([sys.executable, os.path.join(R, 'pipeline', 'check', 'todo.py')], cwd=T, env=env, capture_output=True, text=True)
if prev is not None:
    open(status, 'w').write(prev)
assert r.returncode == 0, r.stderr
todo = open(os.path.join(T, 'out', 'TODO.md')).read()
assert '## Документы органов' in todo, 'в TODO.md нет раздела «Документы органов»'
assert 'Приказ № 131н' in todo and '05.11.2026' in todo and 'Кого коснётся' in todo
assert texts_check.org_gap(open(CV, encoding='utf-8').read(), '05.11.2026')
assert texts_check.main('05.11.2026') == 0  # долг есть, суффикса нет
shutil.rmtree(T, ignore_errors=True)
print('test_texts_org: OK')
