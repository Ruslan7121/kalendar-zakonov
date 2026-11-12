#!/usr/bin/env python3
"""П6 (12.11.2026): pipeline/common.write_canvas — проверяет блоки перед записью (битый JSON → ValueError, файл не тронут),
пишет атомарно (нет временных файлов рядом), прежнюю версию кладёт в out/cache/canvas.prev.tsx. Без сети."""
import os, sys, tempfile, shutil
root = tempfile.mkdtemp(prefix='gd-wc-'); os.environ['GD_ROOT'] = root
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'pipeline'))
import common as C
try:
    p = os.path.join(root, 'canvas.tsx')
    good = 'const DATA: Record<string,string> = {};\nconst CAL: any = {"p":[],"g":[]};\n/* VT:start */const VT: Record<string, string> = {"1": "12:00:00"};/* VT:end */\n'
    open(p, 'w').write(good)
    bad = good.replace('"12:00:00"}', '"12:00:00"')
    try:
        C.write_canvas(bad, p); raise SystemExit('FAIL: битый блок VT записан')
    except ValueError as e:
        assert 'VT' in str(e), e
    assert open(p).read() == good, 'файл изменён несмотря на ошибку'
    new = C.set_block(good, 'VT', 'const VT: Record<string, string>', {'1': '12:00:00', '2': '13:00:00'})
    assert C.write_canvas(new, p) is True and open(p).read() == new
    assert open(os.path.join(C.OUT, 'cache', 'canvas.prev.tsx')).read() == good, 'нет резервной копии'
    assert C.write_canvas(new, p) is False, 'повторная запись того же текста'
    assert not [f for f in os.listdir(root) if f.endswith('.tmp')], 'остались временные файлы'
    try:
        C.write_canvas(new.replace('const CAL: any = ', 'const CAL2: any = '), p); raise SystemExit('FAIL: canvas без CAL записан')
    except ValueError:
        pass
    print('OK test_write_canvas: проверка блоков, атомарная запись, резервная копия')
finally:
    shutil.rmtree(root, ignore_errors=True)
