#!/bin/bash
# 16.11.2026: оперативные новости без опоры на частое расписание GitHub (его запуски «каждые 20 минут» задерживаются и пропадают).
# Один запуск workflow news сам повторяет сбор каждые NEWS_EVERY минут (20) с 8:00 до 22:00 МСК, не дольше NEWS_SPAN минут (340:
# у GitHub лимит задания 6 часов), а перед концом запускает следующий news (gh workflow run, GH_TOKEN). Расписанию достаточно
# сработать хотя бы раз за день. Ошибка источника или публикации не останавливает цикл — повтор через 20 минут.
# Заодно в 10, 13, 16 и 19 часов МСК запускает workflow organs (документы органов).
# Запуск: bash pipeline/news_loop.sh (из корня клона). NEWS_ONCE=1 — один круг (проверка).
set -u
cd "$(dirname "$0")/.."
EVERY=${NEWS_EVERY:-20}; SPAN=${NEWS_SPAN:-340}
END=$(( $(date +%s) + SPAN * 60 ))
hour() { TZ=Europe/Moscow date +%-H; }
in_hours() { local h; h=$(hour); [ "$h" -ge 8 ] && [ "$h" -lt 22 ]; }
in_hours || { echo "news_loop: вне часов сбора (8–22 МСК), выход"; exit 0; }
while :; do
  echo "=== $(TZ=Europe/Moscow date '+%d.%m.%Y %H:%M') МСК"
  git fetch -q --depth=1 origin gh-pages && git show origin/gh-pages:data/live.json > prev.json 2>/dev/null || echo '{"items":[]}' > prev.json
  ( cd pipeline && python3 news_live.py --prev ../prev.json ) || echo "news_loop: сбор завершился с ошибкой — повтор в следующем круге"
  bash pipeline/publish.sh --live out/live/live.json || echo "news_loop: публикация не удалась — повтор в следующем круге"
  [ "${NEWS_ONCE:-0}" = 1 ] && exit 0
  # 17.11.2026: расписание organs GitHub тоже задерживает на часы (16.11 сработало один раз, в 23:32 МСК) — документы органов
  # запускает этот же цикл: в 10, 13, 16 и 19 часов МСК, по разу на каждый час. Расписание в organs.yml остается запасным.
  h=$(hour); case "$h" in 10|13|16|19) if [ "${ORG_DONE:-}" != "$h" ]; then
    gh workflow run organs.yml --ref main && { ORG_DONE=$h; echo "news_loop: запущен сбор документов органов (organs)"; } || echo "news_loop: не удалось запустить organs"; fi;; esac
  [ $(( $(date +%s) + EVERY * 60 )) -lt "$END" ] || break
  sleep $(( EVERY * 60 ))
  in_hours || { echo "news_loop: 22:00 МСК — сбор на сегодня закончен"; exit 0; }
done
if in_hours; then
  gh workflow run news.yml --ref main && echo "news_loop: запущено продолжение (новый запуск news)" || echo "news_loop: не удалось запустить продолжение"
fi
