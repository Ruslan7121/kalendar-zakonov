#!/usr/bin/env python3
"""Временные метки «Для кого» / «Тема» / «Что меняется» для законопроектов повестки и голосований без ZTAG (15.11.2026,
решение владельца). Новая повестка приходит заранее; без меток падает tests/js/test_search_tags.mjs, и ежедневный прогон
не публикуется, пока бот не расставит метки. Этот шаг ставит метки по словам в официальном названии законопроекта
(CAL.p, DATA) и его «Сути» (BP) — по тем же правилам AUTOZ, что сайт использует для документов органов (src/canvas.tsx).
Номера с такими метками записываются в ZAUTO: бот их уточняет по пояснительной записке (раздел TODO «Метки законопроектов»)
и убирает номер из ZAUTO. Метки, поставленные вручную, не трогаются.
Запуск: python3 auto_ztag.py [--dry]"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import common as C

# Тема по кодексу/закону в названии — если правила AUTOZ ничего не нашли (группа «Тема» не может быть пустой)
CODE_TOPIC = [(r'Налогов', 'Налоги'), (r'Уголовн|административных правонарушени', 'Штрафы и уголовная ответственность'),
              (r'процессуальн|судопроизводств|суд', 'Суды и правосудие'), (r'Бюджетн|бюджет', 'Финансы и банки'),
              (r'Трудов', 'Работа и зарплата'), (r'Жилищн', 'Жилье и ЖКХ'), (r'Земельн', 'Земля и сельское хозяйство'),
              (r'ратификац|Договор|Соглашени', 'Международные отношения')]


def rules(src):
    """AUTOZ из канона: [группа, метка, /регулярное выражение/] → [(группа, метка, re)]."""
    a = src.index('const AUTOZ: [number, string, RegExp][] = ['); b = src.index('\n];', a)
    return [(int(g), v, re.compile(r)) for g, v, r in re.findall(r"\[(\d), '([^']+)', /((?:\\/|[^/])+)/\]", src[a:b])]


def vocab(src, name):
    import ast
    line = next(l for l in src.split('\n') if l.startswith(f'const {name} = ['))
    return ast.literal_eval(line[line.index('['):line.rindex(']') + 1])


def tags(txt, R, voc):
    txt = txt + ' ' + txt.lower()  # правила AUTOZ в нижнем регистре, а в названиях «Уголовный», «Налоговый»; сокращения (НДС) — в исходном
    g = [[], [], []]
    for i, v, rx in R:
        if rx.search(txt) and v not in g[i] and v in voc[i]: g[i].append(v)
    if not g[0]: g[0].append('Все граждане')
    if not g[1]:
        g[1].append(next((v for p, v in CODE_TOPIC if re.search(p, txt) and v in voc[1]), 'Госуправление и местная власть'))
    if not g[2]: g[2].append('Изменение порядка и процедур')
    return [a[:3] for a in g]


def main(dry=False):
    src = C.read_canvas(); R = rules(src); voc = [vocab(src, 'ZW'), vocab(src, 'ZT'), vocab(src, 'ZC')]
    zi = src.index('const ZTAG'); zi = src.index('= ', zi) + 2; zj = src.index('\n', zi); Z = json.loads(src[zi:zj].rstrip(';'))
    ci = src.index('const CAL: any = ') + 17; CAL = json.loads(src[ci:src.index('\n', ci)].rstrip(';'))
    bi = src.index('const BP: '); bi = src.index('= ', bi) + 2; BP = json.loads(src[bi:src.index('\n', bi)].rstrip(';'))
    texts = {}
    for p in CAL.get('p', []):
        for a in p.get('a') or []:
            if re.match(r'^\d+-\d+$', a[0] or ''): texts.setdefault(a[0], []).extend([a[1] or '', a[4] or ''])
    for d, vid, doc, q, rd in C.votes(src):
        if re.match(r'^\d+-\d+$', doc or ''): texts.setdefault(doc, []).append(q or '')
    new = {}
    for n, tt in texts.items():
        if Z.get(n) and all(Z[n]): continue
        txt = ' '.join(tt + (BP.get(n, {}).get('sut') or []) + [BP.get(n, {}).get('who') or ''])
        new[n] = tags(txt, R, voc)
    for n, g in new.items(): print(f'auto_ztag: {n} → {g}')
    print(f'auto_ztag: временные метки {len(new)}')
    if not new or dry: return
    Z.update(new); out = src[:zi] + json.dumps(Z, ensure_ascii=False) + ';' + src[zj:]
    pre = 'const ZAUTO: string[] = '
    if pre in out:
        ai = out.index(pre) + len(pre); aj = out.index('\n', ai); A = json.loads(out[ai:aj].rstrip(';'))
        out = out[:ai] + json.dumps(sorted(set(A) | set(new)), ensure_ascii=False) + ';' + out[aj:]
    else:
        k = out.index('\n', out.index('const ZTAG')) + 1
        out = out[:k] + '/* 15.11.2026: законопроекты с временными метками (pipeline/auto_ztag.py) — бот уточняет метки и убирает номер */\n' + pre + json.dumps(sorted(new), ensure_ascii=False) + ';\n' + out[k:]
    C.write_canvas(out)


if __name__ == '__main__':
    main('--dry' in sys.argv)
