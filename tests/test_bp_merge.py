#!/usr/bin/env python3
"""bp_merge.py (15.11.2026): поля «Суть»/«Кого коснется»/«Было-стало» сливаются по одному — файл дня с одними bs не стирает
sut; без списка файлов заполняются только пустые поля; «ё» → «е». Работает на копии канона во временном каталоге."""
import os, sys, json, shutil, tempfile, subprocess
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
tmp = tempfile.mkdtemp(); cv = os.path.join(tmp, 'canvas.tsx'); shutil.copy(os.path.join(R, 'src', 'canvas.tsx'), cv)
pre = 'const BP: Record<string, { sut?: string[]; who?: string; bs?: [string, string][] }> = '
def bp():
    l = next(x for x in open(cv).read().split('\n') if x.startswith(pre)); return json.loads(l[len(pre):-1])
k, v0 = next((k, v) for k, v in bp().items() if v.get('sut'))
day = os.path.join(tmp, 'd.json'); json.dump({'bp': {k: {'bs': [['Сейчас всё так', 'Предлагалось иначе']]}}}, open(day, 'w'), ensure_ascii=False)
env = {**os.environ, 'GD_ROOT': tmp}; os.makedirs(os.path.join(tmp, 'out', 'cache'), exist_ok=True)
r = subprocess.run([sys.executable, os.path.join(R, 'pipeline', 'bp_merge.py'), cv, day], capture_output=True, text=True, env=env)
assert r.returncode == 0, r.stderr
v1 = bp()[k]
assert v1['sut'] == v0['sut'], 'sut стерт файлом с одними bs'
assert v1['bs'] == [['Сейчас все так', 'Предлагалось иначе']], v1.get('bs')
print('OK test_bp_merge: поля сливаются, «ё» → «е», sut не стирается')
