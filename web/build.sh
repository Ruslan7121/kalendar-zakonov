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
# статические файлы (П5): favicon, превью для ссылок, manifest; extras.txt — список для pipeline/publish.sh
cp -r web/static/. web/dist/
# П11, П13: страницы законопроектов bill/, RSS feed/, календари ics/, sitemap.xml — из data/*.json
node web/extras.mjs web/dist
( cd web/dist && find . -type f ! -name app.js ! -name index.html ! -name extras.txt ! -path './data/*' | sed 's#^\./##' | sort > extras.txt )
ls -la web/dist web/dist/data
