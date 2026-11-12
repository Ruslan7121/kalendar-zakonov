#!/usr/bin/env bash
# Ежедневный прогон программной части. Первый шаг — votes_day.py (голосования дня с vote.duma.gov.ru в DATA).
# Канон: GD_ROOT = git-клон kalendar-zakonov (по умолчанию каталог над pipeline/), CANVAS = $GD_ROOT/src/canvas.tsx.
# Вспомогательный каталог вне клона: GD_DUMA (по умолчанию /workspace/duma) — списки RU-прокси и кэши.
# Бот после прогона: пишет тексты по out/TODO.md, коммитит в main (commit.sh) и публикует сайт
# на GitHub Pages (ветка gh-pages) — см. BOT_PROMPT.md, docs/PIPELINE.md. Страницу Cursor не трогать, Netlify не использовать.
set -u
cd "$(dirname "$0")"
export GD_ROOT="${GD_ROOT:-$(cd .. && pwd)}"
export CANVAS="${CANVAS:-$GD_ROOT/src/canvas.tsx}"
[ -f "$CANVAS" ] || { echo "run_daily: нет canvas $CANVAS (GD_ROOT=$GD_ROOT)" >&2; exit 2; }
echo "[канон] GD_ROOT=$GD_ROOT CANVAS=$CANVAS GD_DUMA=${GD_DUMA:-/workspace/duma}"
DAY="${1:-$(date +%d.%m.%Y)}"
echo "[голосования vote.duma.gov.ru → days/$DAY.json → DATA, VT] $DAY"
# Шаг 1: всё дальнейшее (bills, vote_times, track, audit) опирается на DATA этого дня.
python3 votes_day.py "$DAY"; rc=$?
case $rc in
  0) ;;
  1) echo "votes_day: день загружен с пробелами — см. out/logs/votes_day_$DAY.json, logs/votes_day_fail.log" >&2;;
  *) echo "votes_day: ОШИБКА — список голосований за $DAY не загружен, DATA не изменён (logs/votes_day_fail.log)" >&2;;
esac
echo "[календарь] $DAY"
if python3 calendar_update.py; then
  python3 cal_merge.py || echo "cal_merge: ошибка — CAL не изменён" >&2
else
  echo "calendar_update: ошибка — CAL не изменён" >&2
fi
echo "[законопроекты] $DAY"
python3 bills.py "$DAY"
echo "[время голосований] $DAY"
python3 vote_times.py "$DAY"
echo "[органы власти: СФ, Минфин, Минтруд, Минюст, ЦБ] $DAY"
python3 organs.py --day "$DAY" --embed || echo "organs: ошибка (см. out/organs/status.json)" >&2
echo "[путь закона]"
python3 track.py
echo "[аудит] $DAY"
python3 audit.py --day "$DAY" --fix
echo "[список задач]"
python3 todo.py
echo "[копии: src/canvas.code-only.tsx, out/canvas.tsx, out/canvas.code-only.tsx]"
python3 strip_code_only.py || echo "strip_code_only: ошибка" >&2
echo ""
echo "=== Сводка ==="
bash summary.sh "$DAY"
echo "Готово: out/TODO.md, out/logs/ (в $GD_ROOT). Дальше: тексты бота → commit.sh → публикация gh-pages (docs/PIPELINE.md)"
