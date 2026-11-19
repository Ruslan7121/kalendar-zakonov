#!/usr/bin/env python3
"""19.11.2026 (правило 15): texts_check.py видит документы ORG без «Сути»/«Кого коснётся»;
todo.py пишет их в out/TODO.md в раздел «Документы органов». Сеть не нужна.
Запуск из корня репозитория: python3 tests/test_texts_org.py"""
import os, sys, json, tempfile, subprocess, shutil
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, 'pipeline'))
import common as C
import texts_check

# --- помощники ---
assert C.org_missing({'ty': 'решение', 'sut': ['А.'], 'who': 'Все.'}) == []
assert C.org_missing({'ty': 'решение', 'sut': 'А.'}) == ['«Кого коснётся»']
assert C.org_missing({'ty': 'решение', 'who': 'Все.'}) == ['«Суть»']
assert C.org_missing({'ty': 'решение'}) == ['«Суть»', '«Кого коснётся»']
assert C.org_missing({'ty': 'заседание'}) == []
assert C.org_missing({'ty': 'новость', 't': 'Новость'}) == []
assert C.org_no({'t': 'Приказ № 131н от 01.09.2026: Тема'}) == '№ 131н'
assert C.org_has_texts({'sut': 'А.\n\nБ.', 'who': 'Кто.'})

# --- texts_check на синтетическом canvas (документы органов + голосования) ---
T = tempfile.mkdtemp(prefix='gd-org-texts-')
os.makedirs(T + '/out/logs', exist_ok=True)
CV = T + '/canvas.tsx'
os.environ.update(GD_ROOT=T, CANVAS=CV)
C.CANVAS, C.ROOT, C.OUT, C.LOGS = CV, T, T + '/out', T + '/out/logs'
ORG = [
    {'o': 'minfin', 'd': '05.11.2026', 'ty': 'решение', 'k': 'Приказ', 't': 'Приказ № 131н от 01.09.2026: Формы отчетности', 'u': 'http://example/1', 'sut': 'Утверждены формы.', 'who': ''},
    {'o': 'gov', 'd': '05.11.2026', 'ty': 'решение', 'k': 'Распоряжение', 't': 'Распоряжение № 1-р от 05.11.2026: О назначении', 'u': 'http://example/2', 'sut': ['Первый абзац.', 'Второй.'], 'who': 'Кадры.'},
    {'o': 'sf', 'd': '05.11.2026', 'ty': 'заседание', 'k': 'Заседание', 't': 'Заседание Совета Федерации', 'u': 'http://example/3'},
]
SRC = (
    "const DATA: Record<string,string> = {};\n"
    "DATA['05.11.2026'] = `10|1-8|О законе|3-е|1|400/0/0/50|`;\n"
    "const SHORT_RAW = `10|Короткое`;\n"
    "const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = "
    + json.dumps({'1-8': {'sut': ['Суть.'], 'who': 'Все.'}}, ensure_ascii=False) + ";\n"
    "/* ORG:start */const ORG: any[] = " + json.dumps(ORG, ensure_ascii=False) + ";/* ORG:end */\n"
    "/* ORGX:start */const ORGX: Record<string, any> = {};/* ORGX:end */\n"
    "const ORGN: Record<string, string> = { minfin: 'Минфин', gov: 'Правительство', sf: 'Совет Федерации' };\n"
)
open(CV, 'w').write(SRC)
assert texts_check.main('05.11.2026') == 1, 'нет who у приказа — тексты не готовы'
# дописали «Кого коснётся» — готовы (заседание без текстов не мешает)
ORG[0]['who'] = 'Распорядители бюджета.'
open(CV, 'w').write(SRC.replace(
    json.dumps(ORG, ensure_ascii=False).replace('Распорядители бюджета.', ''),
    json.dumps(ORG, ensure_ascii=False),
) if False else
    "const DATA: Record<string,string> = {};\n"
    "DATA['05.11.2026'] = `10|1-8|О законе|3-е|1|400/0/0/50|`;\n"
    "const SHORT_RAW = `10|Короткое`;\n"
    "const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = "
    + json.dumps({'1-8': {'sut': ['Суть.'], 'who': 'Все.'}}, ensure_ascii=False) + ";\n"
    "/* ORG:start */const ORG: any[] = " + json.dumps(ORG, ensure_ascii=False) + ";/* ORG:end */\n"
    "/* ORGX:start */const ORGX: Record<string, any> = {};/* ORGX:end */\n"
)
assert texts_check.main('05.11.2026') == 0, 'после «Кого коснётся» тексты должны быть готовы'

# --- todo.py: раздел «Документы органов» по настоящему canvas ---
env = dict(os.environ, GD_ROOT=R, CANVAS=os.path.join(R, 'src', 'canvas.tsx'))
# todo.py пишет в $GD_ROOT/out/TODO.md и docs/STATUS.md — STATUS оставляем как был
status = os.path.join(R, 'docs', 'STATUS.md')
prev = open(status).read() if os.path.exists(status) else None
r = subprocess.run([sys.executable, os.path.join(R, 'pipeline', 'todo.py')], cwd=R, env=env, capture_output=True, text=True)
if prev is not None:
    open(status, 'w').write(prev)
assert r.returncode == 0, r.stderr
todo = open(os.path.join(R, 'out', 'TODO.md')).read()
assert '## Документы органов' in todo, 'в TODO.md нет раздела «Документы органов»'
assert 'Приказ № 131н' in todo and '05.11.2026' in todo and 'Кого коснётся' in todo, todo[todo.find('## Документы органов'):todo.find('## Документы органов')+800]
# живой texts_check на день с документом без who
C.CANVAS = os.path.join(R, 'src', 'canvas.tsx')
C.ROOT = R
C.OUT = os.path.join(R, 'out')
C.LOGS = os.path.join(R, 'out', 'logs')
os.makedirs(C.LOGS, exist_ok=True)
assert texts_check.main('05.11.2026') == 1
# 18.11: все документы органов с текстами — если законопроекты тоже готовы, код 0, иначе в сообщении органов «0»
code = texts_check.main('18.11.2026')
# органы 18.11 заполнены: в сообщении о неготовности не должно быть «документов органов без … N» с N>0
# (если код 1 — только из‑за законопроектов/SHORT)
if code == 1:
    # перехватить последний вывод нельзя; проверим напрямую
    src = open(C.CANVAS, encoding='utf-8').read()
    assert texts_check.org_gap(src, '18.11.2026') == []
shutil.rmtree(T, ignore_errors=True)
print('test_texts_org: OK')
