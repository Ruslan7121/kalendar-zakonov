#!/usr/bin/env python3
"""Готовы ли тексты дня (правила 13 и 15): у каждого голосования дня по законопроекту — своё короткое название (SHORT),
у каждого законопроекта — «Суть» и «Кого коснётся» (BP) и полное название (INFO/INIC t или полная повестка);
у каждого документа органа (указ, постановление, распоряжение, приказ, указание, письмо ЦБ и т. д.) — свои «Суть» и «Кого коснётся».
Заседания и новости органов этих текстов не требуют. Документ без обоих текстов прогон собирает в данные, но на сайт он
не попадает, пока тексты не написаны (плитки без «Сути» и «Кого коснётся» не выводятся).
19.11.2026: ежедневный прогон в Actions загружает только голосования и документы; этот шаг ничего не пишет в canvas, а только
сообщает «тексты не готовы» (код выхода 1) — пометка уходит в сообщение коммита прогона, бот пишет тексты по out/TODO.md.
Запуск: python3 texts_check.py ДД.ММ.ГГГГ"""
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
    if no_short or no_sut or og:
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
    bits.append(f'документы органов готовы')
    print(f'texts_check: тексты за {day} готовы ({", ".join(bits)})')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]) if len(sys.argv) > 1 else 2)
