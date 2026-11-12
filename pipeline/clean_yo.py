#!/usr/bin/env python3
"""Автоочистка «ё» → «е» в готовых текстах бота.
Обрабатывает out/days/*.json и блоки BP/PROC/ORG в canvas.tsx.
Запуск: python3 clean_yo.py"""
import os, json, glob, re, sys
sys.path.insert(0, os.path.dirname(__file__)); import common as C

def clean(s):
    if not isinstance(s, str):
        return s
    return s.replace('ё', 'е').replace('Ё', 'Е')

def clean_obj(obj):
    if isinstance(obj, str):
        return clean(obj)
    if isinstance(obj, list):
        return [clean_obj(x) for x in obj]
    if isinstance(obj, dict):
        return {k: clean_obj(v) for k, v in obj.items()}
    return obj

# очистка days/*.json
n_files = 0
for f in sorted(glob.glob(os.path.join(C.OUT, 'days', '*.json'))):
    d = json.load(open(f))
    cleaned = clean_obj(d)
    if cleaned != d:
        json.dump(cleaned, open(f, 'w'), ensure_ascii=False, indent=1)
        n_files += 1
        print(f'cleaned: {os.path.basename(f)}')

# очистка блоков в canvas
src = C.read_canvas()
changed = False
for name in ('BP', 'PROC', 'ORG', 'ORGX'):
    try:
        block = C.get_block(src, name)
        cleaned = clean_obj(block)
        if cleaned != block:
            src = C.set_block(src, name, 'const ORG: any[]' if name == 'ORG' else f'const {name}: Record<string, any>', cleaned)
            changed = True
            print(f'cleaned block: {name}')
    except Exception:
        pass

if changed:
    C.write_canvas(src)

print(f'готово: файлов {n_files}, canvas {"изменён" if changed else "без изменений"}')
