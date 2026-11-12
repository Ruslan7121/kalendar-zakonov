"""Общие функции конвейера: загрузка страниц, работа с блоками canvas.tsx."""
import os, re, json, subprocess, html, datetime as dt
# Канон путей (одна точка для всех скриптов конвейера, см. docs/PIPELINE.md):
#   GD_ROOT — git-клон github.com/Ruslan7121/kalendar-zakonov (по умолчанию — каталог над pipeline/);
#   CANVAS  — исходник сайта $GD_ROOT/src/canvas.tsx (его собирает web/build.sh → gh-pages);
#             out/canvas.tsx и *.code-only.tsx — производные копии, их пересобирает strip_code_only.py;
#   GD_DUMA — внешний вспомогательный каталог вне клона (списки RU-прокси lists/, кэши sozd bills/, cal_cache/,
#             calendar_static.json, days/*.json голосований); по умолчанию /workspace/duma.
# Устаревший /workspace/out/canvas.tsx больше не используется по умолчанию.
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.environ.get('GD_ROOT') or os.path.dirname(HERE))
DUMA = os.environ.get('GD_DUMA') or '/workspace/duma'
OUT = os.path.join(ROOT, 'out')
CANVAS = os.environ.get('CANVAS') or os.path.join(ROOT, 'src', 'canvas.tsx')
EXTR = os.path.join(ROOT, 'extracts'); LOGS = os.path.join(OUT, 'logs')
for d in (EXTR, LOGS): os.makedirs(d, exist_ok=True)

def fetch(url, out, deadline=120):
    """Скачать страницу через pipeline/fetch.sh (RU-прокси из $GD_DUMA/lists). True при успехе."""
    env = dict(os.environ, FETCH_DEADLINE=str(deadline))
    here = os.path.join(HERE, 'fetch.sh')
    fs = os.environ.get('GD_FETCH') or (here if os.path.exists(here) else os.path.join(DUMA, 'fetch.sh'))
    r = subprocess.run(['bash', fs, url, out], cwd=os.path.dirname(fs), env=env, capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 2000

def text(h):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', re.sub(r'(?is)<(script|style).*?</\1>', ' ', h))))

def log(name, line):
    with open(os.path.join(LOGS, name), 'a') as f:
        f.write(f"{dt.datetime.now():%Y-%m-%d %H:%M:%S} {line}\n")

def read_canvas():
    return open(CANVAS).read()

def set_block(src, name, ts_decl, value):
    """Заменить /* NAME:start */...;/* NAME:end */ на новое значение (идемпотентно)."""
    a, b = f'/* {name}:start */', f'/* {name}:end */'
    i, j = src.index(a), src.index(b)
    return src[:i + len(a)] + f"{ts_decl} = {json.dumps(value, ensure_ascii=False)};" + src[j:]

def get_block(src, name):
    a, b = f'/* {name}:start */', f'/* {name}:end */'
    seg = src[src.index(a) + len(a):src.index(b)]
    return json.loads(seg[seg.index('=') + 1:].rstrip().rstrip(';'))

def votes(src, day=None):
    """Голосования из DATA: [(day, id, doc, question, reading)]."""
    res = []
    for m in re.finditer(r"(?:DATA\['|^')(\d\d\.\d\d\.\d{4})'\]?(?: =|:) `(.*?)`", src, re.S | re.M):
        if day and m.group(1) != day: continue
        for ln in m.group(2).split('\n'):
            p = ln.split('|')
            if len(p) >= 4 and p[0].isdigit(): res.append((m.group(1), p[0], p[1], p[2], p[3]))
    return res

def write_canvas(src):
    open(CANVAS, 'w').write(src)
