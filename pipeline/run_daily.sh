#!/usr/bin/env bash
# Ежедневный прогон программной части. Бот после него: пишет тексты по out/TODO.md,
# публикует страницу (EditCanvas) и делает коммит в репозиторий — см. BOT_PROMPT.md.
set -u
cd "$(dirname "$0")"
DAY="${1:-$(date +%d.%m.%Y)}"
python3 calendar_update.py || echo "calendar_update: ошибка" >&2
python3 bills.py "$DAY"
python3 vote_times.py "$DAY"
python3 track.py
python3 todo.py
echo "Готово: out/TODO.md, out/logs/"
