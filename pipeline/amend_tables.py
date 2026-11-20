#!/usr/bin/env python3
"""20.11.2026: таблицы поправок ко второму чтению (sozd.duma.gov.ru) — что предлагалось изменить в каждой поправке.
Для бюджета и других законопроектов с поправками: в карточке голосований нужна конкретика («Поправка № 14: было … — предлагалось …»),
а в протоколе голосования ее нет. Берет из extracts/bills/<номер>.json список документов (поле docs), выбирает «Таблица поправок …»
и «Приложения к таблице поправок …», скачивает (docx/doc/pdf → текст, как у пояснительных записок) и пишет extracts/amend/<номер>.json.
Запуск: python3 amend_tables.py 615-9   (нужен доступ к sozd: с GitHub — workflow amend)."""
import sys, os, re, json, ast, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C, bills as B

OUT = os.path.join(C.EXTR, 'amend'); os.makedirs(OUT, exist_ok=True)
TAB = re.compile(r'(?i)таблиц\w* поправок')

def pick(docs):
    """Документы-таблицы без повторов по ссылке (в карточке sozd документы дублируются), в порядке появления."""
    seen, res = set(), []
    for x in docs:
        u = x.get('url') or ''; lb = x.get('label') or ''
        if u and u not in seen and TAB.search(lb): seen.add(u); res.append({'label': re.sub(r'\s+', ' ', lb).strip(), 'url': u})
    return res

def main(n):
    rec = json.load(open(os.path.join(B.D, f'{n}.json')))
    docs = rec.get('docs') or []; docs = ast.literal_eval(docs) if isinstance(docs, str) else docs
    items = pick(docs); got = []; tmp = os.path.join(C.OUT, 'cache', 'amend'); os.makedirs(tmp, exist_ok=True)
    for it in items:
        p = os.path.join(tmp, hashlib.md5(it['url'].encode()).hexdigest())
        ok = os.path.exists(p) and os.path.getsize(p) > 0 or B.fetch_retry(it['url'], p, 120)
        text = B.note_text(p) if ok else ''
        got.append({**it, 'ok': bool(text.strip()), 'n': len(text), 'text': text})
        print(f"  {it['label'][:60]:62} {'ok' if text.strip() else 'нет текста'} {len(text)}")
    json.dump({'bill': n, 'docs': got}, open(os.path.join(OUT, f'{n}.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'amend_tables: {n}: документов {len(got)}, с текстом {sum(1 for g in got if g["ok"])}')

if __name__ == '__main__':
    for a in sys.argv[1:]: main(a)
