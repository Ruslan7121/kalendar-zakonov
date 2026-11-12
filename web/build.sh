#!/bin/bash
# Сборка сайта: src/canvas.tsx → web/dist/app.js + web/dist/index.html (то, что лежит в ветке gh-pages).
set -e
cd "$(dirname "$0")/.."
[ -d node_modules ] || npm install --no-audit --no-fund
mkdir -p web/dist
npx esbuild web/main.tsx --bundle --minify --charset=utf8 --format=iife --jsx=automatic \
  --alias:grok/canvas=./web/grok-canvas.tsx --define:process.env.NODE_ENV='"production"' \
  --outfile=web/dist/app.js --log-level=warning
cp web/index.html web/dist/index.html
ls -la web/dist
