#!/bin/bash
# summary.sh — краткая сводка по логам парсинга
# Запуск: ./summary.sh [день]

ROOT="${GD_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"   # git-клон kalendar-zakonov
LOGS="$ROOT/out/logs"
DAY="${1:-}"

echo "=== Сводка парсинга ${DAY:+(день $DAY)} ==="
echo

if [ -f "$LOGS/bills_fail.log" ]; then
  fails=$(wc -l < "$LOGS/bills_fail.log")
  echo "bills_fail.log: $fails ошибок"
  if [ -n "$DAY" ]; then
    grep -c "$DAY" "$LOGS/bills_fail.log" 2>/dev/null || echo "  за день: 0"
  fi
else
  echo "bills_fail.log: нет"
fi

if [ -f "$LOGS/votes_day_fail.log" ]; then
  echo "votes_day_fail.log: $(wc -l < "$LOGS/votes_day_fail.log") записей${DAY:+, за день: $(grep -c "$DAY" "$LOGS/votes_day_fail.log")}"
else
  echo "votes_day_fail.log: нет"
fi

if [ -f "$LOGS/vote_time_fail.log" ]; then
  fails=$(wc -l < "$LOGS/vote_time_fail.log")
  echo "vote_time_fail.log: $fails ошибок"
else
  echo "vote_time_fail.log: нет"
fi

if [ -f "$LOGS/track_fail.log" ]; then
  fails=$(wc -l < "$LOGS/track_fail.log")
  echo "track_fail.log: $fails ошибок"
else
  echo "track_fail.log: нет"
fi

echo
echo "Готовые выжимки:"
find "$ROOT/out/extracts/bills" -name "*.json" -size +50c 2>/dev/null | wc -l
