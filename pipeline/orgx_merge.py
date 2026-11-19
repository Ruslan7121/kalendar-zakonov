#!/usr/bin/env python3
"""19.11.2026: перенос «Сути» и «Кого коснется» документов органов в канон.

  python3 pipeline/orgx_merge.py FILE.json [FILE2.json …]

FILE.json: {"<id события ORG: орган:ссылка#ДД.ММ.ГГГГ>": {"sut": ["абзац 1", "абзац 2", …] | "текст", "who": "…", …}, …}
(id — как в out/organs/events.json; путь к официальному тексту — extracts/organs/<ключ>.json, поле id).
Поля сливаются по одному в out/organs/enrich.json (источник блока ORGX при organs.py --embed) и в блок ORGX src/canvas.tsx.
«Суть» хранится строкой, абзацы — через пустую строку; служебные строки о регистрации и опубликовании не принимаются.
Писать только по официальному тексту документа (AGENTS.md, раздел 2)."""
import os, re, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

ENRICH = os.path.join(C.OUT, 'organs', 'enrich.json')
SERVICE = re.compile(r'^(Зарегистрирован|Опубликован)\S*\s')

def norm(v):
    v = dict(v)
    if 'sut' in v:
        ps = v['sut'] if isinstance(v['sut'], list) else re.split(r'\n\s*\n', str(v['sut']))
        ps = [re.sub(r'\s+', ' ', p).strip().replace('ё', 'е').replace('Ё', 'Е') for p in ps if str(p).strip()]
        if not ps or SERVICE.match(ps[0]): raise SystemExit(f'orgx_merge: «Суть» пустая или служебная строка: {ps[:1]}')
        v['sut'] = '\n\n'.join(ps)
    for k in ('who', 'st', 'full', 'no', 'nb'):
        if k in v: v[k] = re.sub(r'\s+', ' ', str(v[k])).strip().replace('ё', 'е').replace('Ё', 'Е')
    return v

def main(files):
    src = C.read_canvas(); ids = {f"{e['o']}:{e['u']}#{e['d']}" for e in C.get_block(src, 'ORG')}
    enr = json.load(open(ENRICH)) if os.path.exists(ENRICH) else {}
    orgx = C.get_block(src, 'ORGX'); n = 0; miss = []
    for f in files:
        for k, v in json.load(open(f)).items():
            if k not in ids: miss.append(k); continue
            v = norm(v); enr[k] = {**enr.get(k, {}), **v}; orgx[k] = {**orgx.get(k, {}), **v}; n += 1
    json.dump(enr, open(ENRICH, 'w'), ensure_ascii=False, indent=1)
    C.write_canvas(C.set_block(src, 'ORGX', 'const ORGX: Record<string, any>', orgx))
    print(f'orgx_merge: обновлено {n}' + (f'; нет в ORG ({len(miss)}): ' + ', '.join(miss[:5]) if miss else ''))
    return n, miss

if __name__ == '__main__':
    if len(sys.argv) < 2: print(__doc__); sys.exit(1)
    main(sys.argv[1:])
