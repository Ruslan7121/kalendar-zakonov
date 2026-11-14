#!/bin/bash
# Сборка сайта (то, что лежит в ветке gh-pages):
#   1) pipeline/split_data.mjs: src/canvas.tsx → data/*.json (в git), web/gen/app.tsx + web/gen/manifest.json (код без данных),
#      web/dist/data/*.<хеш>.json (данные по месяцам для сайта);
#   2) esbuild web/main.tsx (загрузчик web/gdx.ts + web/gen/app.tsx) → web/dist/app.js; web/index.html → web/dist/index.html.
set -e
cd "$(dirname "$0")/.."
[ -d node_modules ] || npm install --no-audit --no-fund
mkdir -p web/dist
node pipeline/split_data.mjs --dist web/dist
npx esbuild web/main.tsx --bundle --minify --charset=utf8 --format=iife --jsx=automatic \
  --alias:grok/canvas=./web/grok-canvas.tsx --define:process.env.NODE_ENV='"production"' \
  --outfile=web/dist/app.js --log-level=warning
cp web/index.html web/dist/index.html
# Т2 (13.11.2026): «Данные обновлены …» — время последнего коммита в data/ (в git), сайт показывает его внизу страницы
UPD="$(git log -1 --format=%cI -- data/ 2>/dev/null || true)"
sed -i "s#<script src=\"app.js\"></script>#<script>window.__GD_UPD=\"$UPD\"</script><script src=\"app.js\"></script>#" web/dist/index.html
# 14.11.2026: данные первой отрисовки (core + месяц из ?d= / последний день / текущий месяц — как firstMonths в web/gdx.ts)
# начинают скачиваться сразу, параллельно с app.js, а не после его запуска (было три запроса подряд — заметно на медленной сети).
# Тот же запрос fetch(..., cors, same-origin) из gdx.ts берёт уже скачанный ответ.
node -e '
const fs = require("fs"); const M = JSON.parse(fs.readFileSync("web/gen/manifest.json", "utf8"));
const F = {}; for (const k of ["core", ...M.months]) F[k] = M.file[k]; const last = M.DAYS.length ? M.DAYS[M.DAYS.length - 1].slice(3) : "";
const js = `(function(){try{var F=${JSON.stringify(F)},q=new URLSearchParams(location.search+"&"+location.hash.replace(/^#/,"")),d=q.get("d"),n=new Date(),m=[],seen={};function p(f){if(!f||seen[f])return;seen[f]=1;var l=document.createElement("link");l.rel="preload";l.as="fetch";l.crossOrigin="anonymous";l.href="data/"+f;document.head.appendChild(l);}p(F.core);if(d&&/^\\d\\d\.\\d\\d\.\\d{4}$/.test(d))m.push(d.slice(3));m.push(${JSON.stringify(last)});m.push(("0"+(n.getMonth()+1)).slice(-2)+"."+n.getFullYear());m.forEach(function(k){p(F[k]);});}catch(e){}})();`;
const f = "web/dist/index.html"; let h = fs.readFileSync(f, "utf8"); h = h.replace("</head>", `<script>${js}</script></head>`); fs.writeFileSync(f, h);'
# статические файлы (П5): favicon, превью для ссылок, manifest; extras.txt — список для pipeline/publish.sh
cp -r web/static/. web/dist/
# П11, П13: страницы законопроектов bill/, RSS feed/, календари ics/, sitemap.xml — из data/*.json
node web/extras.mjs web/dist
( cd web/dist && find . -type f ! -path ./app.js ! -path ./index.html ! -path ./extras.txt ! -path './data/*' | sed 's#^\./##' | sort > extras.txt )
ls -la web/dist web/dist/data
