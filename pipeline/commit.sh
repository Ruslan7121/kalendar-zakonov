#!/bin/bash
# commit.sh — автокоммит изменений после работы бота в main (обычный коммит + push, без --force/--amend)
# Запуск: ./commit.sh "сообщение"
# По умолчанию: "Обновление календаря законов"
# Канон: src/canvas.tsx в этом клоне; out/canvas*.tsx и src/canvas.code-only.tsx пересобираются strip_code_only.py,
# data/*.json (данные сайта по месяцам) — split_data.mjs.
# Сайт этот скрипт НЕ публикует: публикация — только GitHub Pages (ветка gh-pages, сборка web/build.sh),
# см. docs/PIPELINE.md «Публикация». Страницу Cursor не трогать, Netlify не использовать.

set -e
cd "$(dirname "$0")/.."
MSG="${1:-Обновление календаря законов}"

# очистка «ё» перед коммитом
python3 pipeline/clean_yo.py || true

# производные копии канона: src/canvas.code-only.tsx, out/canvas.tsx, out/canvas.code-only.tsx
python3 pipeline/strip_code_only.py
# данные сайта по месяцам (п. 10): data/core.json, data/months/ГГГГ-ММ.json, data/index.json — из того же canvas
node pipeline/split_data.mjs

# что коммитить
git add src/canvas.tsx src/canvas.code-only.tsx out/canvas.tsx out/canvas.code-only.tsx data/ out/days/ docs/ 2>/dev/null || true
git add -u extracts/ 2>/dev/null || true

if git diff --cached --quiet; then
  echo "нет изменений для коммита"
  exit 0
fi

git commit -m "$MSG"
git push
echo "закоммичено: $MSG"
