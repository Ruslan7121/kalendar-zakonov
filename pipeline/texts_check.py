#!/usr/bin/env python3
"""Готовы ли тексты дня (правила 13 и 15): у каждого голосования дня по законопроекту — своё короткое название (SHORT),
у каждого законопроекта — «Суть» и «Кого коснётся» (BP) и полное название (INFO/INIC t или полная повестка);
у каждого документа органа (указ, постановление, распоряжение, приказ, указание, письмо ЦБ и т. д.) — свои «Суть» и «Кого коснётся».
Заседания и новости органов этих текстов не требуют.
Правило 15: документы без обоих текстов прогон собирает в данные и пишет в out/TODO.md за любой день.
На сайте плитка без текстов скрывается только для дней с ORG_HIDE_FROM (19.11.2026) и позже; более ранние дни
показываются как раньше (без пустых блоков «Суть»/«Кого коснётся»). Суффикс коммита Actions «— тексты не готовы»
из‑за документов органов ставится только для дней с этой даты; по законопроектам (правило 13) — как раньше.
Этот шаг ничего не пишет в canvas. Запуск: python3 texts_check.py ДД.ММ.ГГГГ"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C


def org_gap(src, day):
    """Документы органов дня без «Сути» или «Кого коснётся»: [(запись, [чего нет])]."""
    out = []
    for e in C.org_items(src, day):
        miss = C.org_missing(e)
        if miss:
            out.append((e, miss))
    return out


def main(day):
    src = C.read_canvas()
    m = re.search(r'^const SHORT_RAW = `(.*?)`;', src, re.S | re.M)
    short = dict(l.split('|', 1) for l in (m.group(1).split('\n') if m else []) if '|' in l)
    pre = 'const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = '
    bl = next((l for l in src.split('\n') if l.startswith(pre)), '')
    bp = json.loads(bl[len(pre):].rstrip(';')) if bl else {}
    vs = [(v, n) for d, v, n, q, r in C.votes(src, day) if re.fullmatch(r'\d+-\d+', n)]
    no_short = [v for v, n in vs if not short.get(v)]
    bills = sorted({n for v, n in vs})
    no_sut = [n for n in bills if not (bp.get(n) or {}).get('sut') or not (bp.get(n) or {}).get('who')]
    og = org_gap(src, day)
    org_block = C.org_hide_from(day)  # суффикс из‑за органов — только с ORG_HIDE_FROM
    if no_short or no_sut or (og and org_block):
        parts = []
        if vs or no_short or no_sut:
            parts.append(f"голосований без SHORT {len(no_short)} из {len(vs)}, законопроектов без «Сути»/«Кого коснётся» {len(no_sut)} из {len(bills)}")
        parts.append(f"документов органов без «Сути»/«Кого коснётся» {len(og)}")
        msg = f'ТЕКСТЫ НЕ ГОТОВЫ за {day}: ' + ', '.join(parts)
        print(msg, flush=True); C.log('texts_check.log', msg)
        return 1
    bits = []
    if vs:
        bits.append(f'{len(vs)} голосований, {len(bills)} законопроектов')
    if og:
        msg = f'texts_check: за {day} долг документов органов без «Сути»/«Кого коснётся»: {len(og)} (до {C.ORG_HIDE_FROM}, на суффикс коммита не влияет)'
        if bits:
            msg = f'texts_check: тексты законопроектов за {day} готовы ({", ".join(bits)}); ' + msg[len('texts_check: '):]
        print(msg, flush=True); C.log('texts_check.log', msg)
        return 0
    bits.append('документы органов готовы')
    print(f'texts_check: тексты за {day} готовы ({", ".join(bits)})')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]) if len(sys.argv) > 1 else 2)
