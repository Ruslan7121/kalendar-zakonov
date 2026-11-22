#!/bin/bash
# Все тесты без сети (12.11.2026, пункты 8, 10). Из корня репозитория: bash tests/run_all.sh
#   TEST_BROWSER=0 — без теста в headless Chrome (правило 11); GD_REQUIRE_BROWSER=1 — падать, если Chrome нет (так в CI).
# Публикацию (pipeline/publish/publish.sh) и коммит данных (pipeline/publish/commit.sh) тесты не запускают — они остаются ручными.
set -u
cd "$(dirname "$0")/.."
export GD_ROOT="${GD_ROOT_TEST:-$(mktemp -d /tmp/gd-test-root.XXXXXX)}"; mkdir -p "$GD_ROOT/out"
# 19.11.2026: код выхода теста 3 = «тексты не готовы» (SHORT, «Суть», метки, тексты органов пишет бот после прогона) —
# строка TEXTS:, а не FAIL:. Итог run_all.sh: 0 — всё OK, 3 — только тексты не готовы, 1 — есть настоящие ошибки.
# Workflow daily и organs при коде 3 коммитят и публикуют данные, при коде 1 — коммитят только сырые данные и не публикуют.
fail=0; texts=0; run() { echo "== $*"; "$@"; local rc=$?; [ $rc = 0 ] && return; if [ $rc = 3 ]; then echo "TEXTS: $*"; texts=1; else echo "FAIL: $*"; fail=1; fi; }
for t in tests/python/test_*.py; do run python3 "$t"; done
[ -d node_modules ] || npm install --no-audit --no-fund
# пункт 10: data/*.json совпадают с src/canvas.tsx; заодно пишется web/gen/ (код сайта без данных), его собирают тесты сайта
run node pipeline/merge/split_data.mjs --check
for t in tests/js/test_*.mjs; do
  case "$t" in *.browser.mjs) [ "${TEST_BROWSER:-1}" = 0 ] && { echo "== $t: пропущен (TEST_BROWSER=0)"; continue; } ;; esac
  run node "$t"
done
if [ $fail = 1 ]; then echo "ЕСТЬ ОШИБКИ"; exit 1; fi
if [ $texts = 1 ]; then echo "ТЕСТЫ OK, ТЕКСТЫ НЕ ГОТОВЫ (код 3)"; exit 3; fi
echo "ВСЕ ТЕСТЫ OK"; exit 0
