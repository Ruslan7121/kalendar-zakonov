#!/usr/bin/env python3
"""20.11.2026: pipeline/collect/amend_tables.py — выбор документов «Таблица поправок …» из списка документов sozd (без сети)."""

import os, sys

sys.path[:0] = [
    os.path.join(
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'pipeline'), d
    )
    for d in ('lib', 'collect', 'merge', 'check')
]
import amend_tables as A

docs = [
    {'label': 'Пояснительная записка', 'url': 'u0'},
    {'label': 'Таблица поправок № 1 (Комитет Государственной Думы по бюджету и налогам)', 'url': 'u1'},
    {'label': 'Таблица поправок № 1 (Комитет Государственной Думы по бюджету и налогам)', 'url': 'u1'},
    {'label': 'Приложения к таблице поправок № 1', 'url': 'u2'},
    {'label': 'Приложение к таблице поправок № 2', 'url': 'u3'},
    {'label': 'Приложение 6 к постановлению Государственной Думы (Форма поправки)', 'url': 'u4'},
    {'label': 'Таблица поправок № 2.1', 'url': ''},
]
p = A.pick(docs)
assert [x['url'] for x in p] == ['u1', 'u2', 'u3'], (
    p
)  # повторы по ссылке и документы без ссылки отброшены, «приложения к таблице» взяты
print('OK test_amend_tables: выбор таблиц поправок и приложений')
