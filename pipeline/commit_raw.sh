#!/bin/bash
# commit_raw.sh "сообщение" [ДЕНЬ] — 19.11.2026: если тесты или проверка схемы упали, собранное за прогон не теряется.
# В main уходят только сырые данные сбора — без src/canvas.tsx и data/ (сайт не публикуется, там может быть ошибка):
#   out/organs/events.json, out/organs/status.json, extracts/organs/*.json, extracts/bills/*.json, out/days/,
#   out/raw/days/ДД.ММ.ГГГГ.json — ответ vote.duma.gov.ru за день (копия $GD_DUMA/days, из нее votes_day.py/vote_times.py
#   повторно соберут DATA и VT без сети). Обычный коммит; перед push — git pull --rebase. Без --force/--amend/--no-verify.
set -u
cd "$(dirname "$0")/.."
MSG="${1:-Сырые данные прогона без публикации (тесты не прошли)}"; DAY="${2:-}"
git reset -q
if [ -n "$DAY" ] && [ -f "${GD_DUMA:-/workspace/duma}/days/$DAY.json" ]; then
  mkdir -p out/raw/days && cp "${GD_DUMA:-/workspace/duma}/days/$DAY.json" "out/raw/days/$DAY.json"
fi
for p in out/organs/events.json out/organs/status.json out/raw/ out/days/; do [ -e "$p" ] && git add -- "$p"; done
git add extracts/organs/*.json extracts/bills/*.json 2>/dev/null || true
if git diff --cached --quiet; then echo "commit_raw: нет сырых данных для коммита"; exit 0; fi
git commit -q -m "$MSG"
git stash -q --include-untracked || true
for try in 1 2 3; do
  git pull -q --rebase origin main && git push -q origin main && { echo "commit_raw: закоммичено и отправлено: $MSG"; exit 0; }
  git rebase --abort 2>/dev/null; sleep 5
done
echo "commit_raw: push не прошел" >&2; exit 1
