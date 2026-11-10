#!/usr/bin/env bash
# Ежедневный прогон программной части. Бот после него: пишет тексты по out/TODO.md,
# публикует страницу (EditCanvas) и делает коммит в репозиторий — см. BOT_PROMPT.md.
set -u
cd "$(dirname "$0")"
DAY="${1:-$(date +%d.%m.%Y)}"
echo "[календарь] $DAY"
python3 calendar_update.py || echo "calendar_update: ошибка" >&2
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
echo ""
echo "=== Сводка ==="
bash summary.sh "$DAY"
echo "Готово: out/TODO.md, out/logs/"
