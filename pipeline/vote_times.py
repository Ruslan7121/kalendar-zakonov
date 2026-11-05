#!/usr/bin/env python3
"""Время голосования (до секунды) с vote.duma.gov.ru/vote/<id> -> блок VT в canvas.tsx.
Нет данных -> id попадает в out/logs/vote_time_fail.log, в карточке пишется «нет данных».
Запуск: python3 vote_times.py [DD.MM.YYYY ...]"""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__)); import common as C
src = C.read_canvas(); VT = C.get_block(src, 'VT'); days = sys.argv[1:]; n = 0
for d, vid, *_ in C.votes(src):
    if (days and d not in days) or vid in VT: continue
    h = f'/tmp/vote_{vid}.html'
    if not C.fetch(f'http://vote.duma.gov.ru/vote/{vid}', h, 60):
        C.log('vote_time_fail.log', f'{d} {vid}: vote.duma.gov.ru не ответил'); continue
    m = re.search(r'(\d\d\.\d\d\.\d{4})\s+(\d\d:\d\d:\d\d)', C.text(open(h, errors='ignore').read()))
    if m and m.group(1) == d: VT[vid] = m.group(2); n += 1
    else: C.log('vote_time_fail.log', f'{d} {vid}: время не найдено на странице')
C.write_canvas(C.set_block(src, 'VT', 'const VT: Record<string, string>', VT)); print('новых времен:', n, 'всего:', len(VT))
