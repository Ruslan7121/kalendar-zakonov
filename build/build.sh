#!/bin/bash
# Сборка: исходник — src/canvas.tsx в ветке main; актуальный скрипт — web/build.sh (npm run build) в main.
set -e
esbuild src/main.tsx --bundle --minify --charset=utf8 --format=iife --jsx=automatic --alias:grok/canvas=./src/grok-canvas.tsx --define:process.env.NODE_ENV='"production"' --outfile=dist/app.js
