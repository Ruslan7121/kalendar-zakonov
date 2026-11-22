#!/usr/bin/env python3
"""Полные официальные названия законопроектов с sozd.duma.gov.ru → INIC[номер].t в canvas (на сайте — INFO[номер].t).
19.11.2026: vote.duma.gov.ru отдаёт название вопроса с многоточием («…»), и без этого шага в раскрытой карточке нового дня
было обрезанное название. Источник — страница законопроекта на sozd (кэш sozd_cache.py, его заполняет bills.py) или
extracts/bills/<номер>.json (поле title). Название берётся только целиком: с многоточием, пустое или «Законопроект № …»
не записывается. Уже записанные названия не меняются. Ничего не скачивает — только читает кэш.
Запуск: python3 bill_titles.py [ДД.ММ.ГГГГ ...]  (без аргументов — все дни DATA)."""

import sys, os, re, json

sys.path[:0] = [
    os.path.dirname(os.path.abspath(__file__)),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'),
]
import common as C
import sozd_cache as S
from bills import sozd_title

OK = re.compile(r'^(О|Об|Обо)\s')


def good(t):
    return bool(t) and bool(OK.match(t)) and '…' not in t and '...' not in t and 'Законопроект №' not in t


def title_of(n):
    src = S.cached(n)
    t = sozd_title(src) if src else ''
    if good(t):
        return t
    p = os.path.join(C.EXTR, 'bills', f'{n}.json')
    if os.path.exists(p):
        try:
            t = re.sub(r'\s+', ' ', json.load(open(p)).get('title') or '').strip()
        except (OSError, ValueError):
            t = ''
        if good(t):
            return t
    return ''


def main(days):
    src = C.read_canvas()
    if '/* INIC:start */' not in src:
        print('bill_titles: в canvas нет блока INIC — пропуск')
        return 0
    ns = []
    for d, v, n, q, r in C.votes(src):
        if re.fullmatch(r'\d+-\d+', n) and (not days or d in days) and n not in ns:
            ns.append(n)
    IN = C.get_block(src, 'INIC')
    add = 0
    miss = []
    for n in ns:
        if (IN.get(n) or {}).get('t'):
            continue
        t = title_of(n)
        if t:
            IN[n] = {**IN.get(n, {}), 't': t}
            add += 1
        else:
            miss.append(n)
    if add:
        src = C.set_block(src, 'INIC', 'const INIC: Record<string, { ini?: string; com?: string; t?: string }>', IN)
        C.write_canvas(src)
    if miss:
        C.log('bill_titles.log', f'нет полного названия (sozd не в кэше): {" ".join(miss)}')
    print(f'bill_titles: законопроектов {len(ns)}, записано названий {add}, без названия {len(miss)}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
