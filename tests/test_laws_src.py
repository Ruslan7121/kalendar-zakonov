#!/usr/bin/env python3
"""14.11.2026: pipeline/laws_src.py — разбор реквизитов закона, ссылок из поиска kremlin.ru и проверка страницы акта.
Страница считается нужной только при совпадении и номера, и даты подписания; неофициальные ссылки не считаются официальными."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pipeline'))
import laws_src as L

assert L.law_key('Федеральный закон от 28.11.2025 № 425-ФЗ (отдельные положения)') == ('425-ФЗ', '28.11.2025')
assert L.law_key('Номер закона в источнике не указан') is None
assert L.date_words('07.06.2025') == ['07.06.2025', '7 июня 2025']
assert L.candidates('<a href="/acts/bank/52001">x</a><a href="/acts/bank/52001">x</a><a href="/acts/bank/49999">y</a>') == ['/acts/bank/52001', '/acts/bank/49999']
assert L.matches('Федеральный закон от 28.11.2025 г. № 425-ФЗ О внесении изменений', '425-ФЗ', '28.11.2025')
assert L.matches('Федеральный закон от 28 ноября 2025 года № 425-ФЗ', '425-ФЗ', '28.11.2025')
assert not L.matches('Федеральный закон от 28.11.2024 № 425-ФЗ', '425-ФЗ', '28.11.2025'), 'другой год — не тот закон'
assert not L.matches('Федеральный закон от 28.11.2025 № 4251-ФЗ', '425-ФЗ', '28.11.2025'), 'другой номер — не тот закон'
for u, ok in [('http://kremlin.ru/acts/bank/1', True), ('https://www.kremlin.ru/acts/bank/1', True), ('http://publication.pravo.gov.ru/document/1', True),
              ('http://www.cbr.ru/x', True), ('https://www.pnp.ru/x', False), ('https://www.consultant.ru/x', False), ('https://actrf.ru/x', False)]:
    assert L.is_off(u) == ok, u
# 14.11.2026: страница старого акта, у которой в ленте сбоку есть «№ 425-ФЗ от 28.11.2025», — не наш закон
side = '<html><head><title>Федеральный закон от 12.02.1998 г. № 28-ФЗ • Президент России</title></head><body><h1>Федеральный закон от 12.02.1998 г. № 28-ФЗ</h1><aside>Федеральный закон от 28.11.2025 г. № 425-ФЗ</aside></body></html>'
assert not L.page_ok(side, '425-ФЗ', '28.11.2025'), 'номер и дата только в боковой ленте — страница не того закона'
own = '<html><head><title>Федеральный закон от 28.11.2025 г. № 425-ФЗ • Президент России</title></head><body><h1>Федеральный закон от 28.11.2025 г. № 425-ФЗ</h1></body></html>'
assert L.page_ok(own, '425-ФЗ', '28.11.2025')
print('OK test_laws_src: реквизиты, поиск kremlin.ru, сверка номера и даты по заголовку акта, официальные хосты')
