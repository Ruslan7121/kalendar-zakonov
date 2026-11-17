#!/bin/bash
# 17.11.2026: сбор без опоры на расписание GitHub. Его запуски по cron задерживаются на часы и пропадают (16.11 «daily» в 21:17
# сработал только в 01:51 МСК, утреннее расписание news 17.11 не сработало совсем, сбор стоял с 21:44 до 12:33). Поэтому цепочка
# запусков news теперь не прерывается ни ночью: один запуск живет почти 6 часов (лимит GitHub), перед концом сам запускает
# следующий (gh workflow run, GH_TOKEN), а cron в news.yml остался только запасным, чтобы поднять цепочку, если она порвалась.
# Что делает цикл:
#   * новости (pipeline/news_live.py → data/live.json): каждые NEWS_EVERY минут (20) с 8:00 до 22:00 МСК, ночью раз в NEWS_NIGHT (60);
#   * в 10, 13, 16 и 19 часов МСК запускает workflow organs (документы органов), по разу на каждый час;
#   * по будням с 21:17 МСК запускает workflow daily (ежедневный сбор), если за сегодня он еще не шел и не успешен;
#   * в первом круге каждого запуска проверяет, что daily/organs не пропущены сегодня, и догоняет (organs — после 10:00 МСК, если не было ни одного).
# Ошибка источника или публикации не останавливает цикл — повтор в следующем круге.
# Запуск: bash pipeline/news_loop.sh (из корня клона). NEWS_ONCE=1 — один круг (проверка).
set -u
cd "$(dirname "$0")/.."
EVERY=${NEWS_EVERY:-20}; NIGHT=${NEWS_NIGHT:-60}; SPAN=${NEWS_SPAN:-340}
END=$(( $(date +%s) + SPAN * 60 ))
hour() { TZ=Europe/Moscow date +%-H; }
minute_of_day() { TZ=Europe/Moscow date +%-H:%-M | awk -F: '{print $1*60+$2}'; }
in_hours() { local h; h=$(hour); [ "$h" -ge 8 ] && [ "$h" -lt 22 ]; }
weekday() { TZ=Europe/Moscow date +%u; }
# есть ли запуск workflow $1 (за последние 3 часа или с времени $2) в состоянии queued / in_progress / success (чтобы не запускать повторно)
recent_run() { local since; since=${2:-$(date -u -d '3 hours ago' +%Y-%m-%dT%H:%M:%SZ)}
  local n; n=$(gh run list --workflow "$1" --created ">=$since" --json status,conclusion -q '[.[] | select(.status=="queued" or .status=="in_progress" or .conclusion=="success")] | length' 2>/dev/null || echo 0)
  [ "${n:-0}" -gt 0 ]; }
kick() { # kick <workflow> <причина>
  gh workflow run "$1" --ref main && echo "news_loop: запущен $1 ($2)" || echo "news_loop: не удалось запустить $1"; }
FIRST=1
while :; do
  echo "=== $(TZ=Europe/Moscow date '+%d.%m.%Y %H:%M') МСК"
  if in_hours || [ "$FIRST" = 1 ]; then
    git fetch -q --depth=1 origin gh-pages && git show origin/gh-pages:data/live.json > prev.json 2>/dev/null || echo '{"items":[]}' > prev.json
    ( cd pipeline && python3 news_live.py --prev ../prev.json ) || echo "news_loop: сбор завершился с ошибкой — повтор в следующем круге"
    bash pipeline/publish.sh --live out/live/live.json || echo "news_loop: публикация не удалась — повтор в следующем круге"
  fi
  [ "${NEWS_ONCE:-0}" = 1 ] && exit 0
  h=$(hour); m=$(minute_of_day)
  # документы органов: в 10, 13, 16 и 19 часов МСК, по разу; после 10:00 — догоняем, если за последние 3 часа запусков не было
  case "$h" in 10|13|16|19) if [ "${ORG_DONE:-}" != "$h" ]; then
    kick organs.yml "документы органов, $h ч" && ORG_DONE=$h; fi;; esac
  if [ "$FIRST" = 1 ] && [ "$h" -ge 10 ] && [ "$h" -lt 22 ] && [ "${ORG_DONE:-}" = "" ] && ! recent_run organs.yml; then
    kick organs.yml "догон: сегодня еще не было" && ORG_DONE=$h; fi
  # ежедневный сбор: будни, с 21:17 МСК (расписание daily в GitHub задерживается), по разу
  if [ "$(weekday)" -le 5 ] && [ "$m" -ge $((21*60+17)) ] && [ "${DAILY_DONE:-}" != "$(TZ=Europe/Moscow date +%F)" ]; then
    # учитываем только запуски после 21:00 МСК: дневной ручной прогон не отменяет вечерний (голосования идут до вечера)
    if recent_run daily.yml "$(date -u +%Y-%m-%dT18:00:00Z)"; then DAILY_DONE=$(TZ=Europe/Moscow date +%F); echo "news_loop: daily сегодня уже запущен/успешен"
    else kick daily.yml "ежедневный сбор, будни после 21:17" && DAILY_DONE=$(TZ=Europe/Moscow date +%F); fi
  fi
  FIRST=0
  if in_hours; then S=$EVERY; else S=$NIGHT; fi
  [ $(( $(date +%s) + S * 60 )) -lt "$END" ] || break
  sleep $(( S * 60 ))
done
kick news.yml "продолжение цепочки"
