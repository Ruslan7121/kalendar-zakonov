#!/usr/bin/env python3
"""auto_ztag.py (15.11.2026): временные метки по правилам AUTOZ из канона — все три группы непустые, только из словарей ZW/ZT/ZC."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pipeline'))
import common as C, auto_ztag as A
C.CANVAS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'canvas.tsx')
s = C.read_canvas(); R = A.rules(s); voc = [A.vocab(s, 'ZW'), A.vocab(s, 'ZT'), A.vocab(s, 'ZC')]
assert len(R) >= 40, len(R)
g = A.tags('О внесении изменений в Уголовный кодекс Российской Федерации (ответственность за воспрепятствование деятельности временной администрации иностранного банка)', R, voc)
assert 'Штрафы и уголовная ответственность' in g[1], g
g2 = A.tags('О внесении изменений в статью 217-1 части второй Налогового кодекса Российской Федерации', R, voc)
assert g2[1] == ['Налоги'] and g2[0] == ['Все граждане'], g2
for x in (g, g2): assert all(x) and all(v in voc[i] for i, a in enumerate(x) for v in a), x
print('OK test_auto_ztag: временные метки — три группы, словари ZW/ZT/ZC')
