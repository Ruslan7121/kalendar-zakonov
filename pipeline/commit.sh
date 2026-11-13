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
# 13.11.2026: out/organs/ (статусы и выжимки органов) и out/full/ тоже пишет run_daily.sh — без них publish.sh видел «незакоммиченные изменения»
git add src/canvas.tsx src/canvas.code-only.tsx out/canvas.tsx out/canvas.code-only.tsx data/ out/days/ out/organs/ out/full/ docs/ 2>/dev/null || true
git add -u extracts/ 2>/dev/null || true

if git diff --cached --quiet; then
  echo "нет изменений для коммита"
  exit 0
fi

git commit -m "$MSG"
# 13.11.2026: если ветка на сервере ушла вперёд (например, слили PR, пока шёл прогон), push отклоняется.
# Тогда: подтянуть, влить; производные файлы (data/, *.code-only.tsx, out/canvas*.tsx) не сливаем, а пересобираем
# из объединённого src/canvas.tsx. Конфликт в самом src/canvas.tsx — стоп: человек/агент разбирает вручную.
BR=$(git rev-parse --abbrev-ref HEAD)
for try in 1 2 3; do
  git push && break
  [ $try = 3 ] && { echo "commit.sh: push не прошёл после 3 попыток" >&2; exit 1; }
  echo "commit.sh: на сервере новые коммиты — подтягиваю и вливаю (попытка $try)"
  git fetch -q origin "$BR"
  if ! git merge -q --no-edit "origin/$BR"; then
    if git diff --name-only --diff-filter=U | grep -qx 'src/canvas.tsx'; then
      git merge --abort; echo "commit.sh: конфликт в src/canvas.tsx — нужен ручной разбор" >&2; exit 1
    fi
    git checkout --ours -- data/ src/canvas.code-only.tsx out/canvas.tsx out/canvas.code-only.tsx 2>/dev/null || true
  fi
  python3 pipeline/strip_code_only.py && node pipeline/split_data.mjs
  git add src/canvas.code-only.tsx out/canvas.tsx out/canvas.code-only.tsx data/ 2>/dev/null || true
  if [ -f .git/MERGE_HEAD ]; then git commit -q --no-edit; elif ! git diff --cached --quiet; then git commit -q -m "Пересборка производных файлов после слияния"; fi
done
echo "закоммичено: $MSG"
