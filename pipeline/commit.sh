#!/bin/bash
# commit.sh — автокоммит изменений после работы бота
# Запуск: ./commit.sh "сообщение"
# По умолчанию: "Обновление календаря законов"

set -e
cd "$(dirname "$0")/.."
MSG="${1:-Обновление календаря законов}"

# очистка «ё» перед коммитом
python3 pipeline/clean_yo.py || true

# подготовка code-only
python3 pipeline/strip_code_only.py || true

# что коммитить
git add src/canvas.tsx src/canvas.code-only.tsx out/days/ docs/ 2>/dev/null || true
git add -u extracts/ 2>/dev/null || true

if git diff --cached --quiet; then
  echo "нет изменений для коммита"
  exit 0
fi

git commit -m "$MSG"
git push
echo "закоммичено: $MSG"
