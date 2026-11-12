#!/bin/bash
# Все тесты без сети (12.11.2026, пункт 8). Из корня репозитория: bash tests/run_all.sh
#   TEST_BROWSER=0 — без теста в headless Chrome (правило 11); GD_REQUIRE_BROWSER=1 — падать, если Chrome нет (так в CI).
# Публикацию (pipeline/publish.sh) и коммит данных (pipeline/commit.sh) тесты не запускают — они остаются ручными.
set -u
cd "$(dirname "$0")/.."
export GD_ROOT="${GD_ROOT_TEST:-$(mktemp -d /tmp/gd-test-root.XXXXXX)}"; mkdir -p "$GD_ROOT/out"
fail=0; run() { echo "== $*"; if "$@"; then :; else echo "FAIL: $*"; fail=1; fi; }
for t in tests/test_*.py; do run python3 "$t"; done
[ -d node_modules ] || npm install --no-audit --no-fund
for t in tests/js/test_*.mjs; do
  case "$t" in *.browser.mjs) [ "${TEST_BROWSER:-1}" = 0 ] && { echo "== $t: пропущен (TEST_BROWSER=0)"; continue; } ;; esac
  run node "$t"
done
[ $fail = 0 ] && echo "ВСЕ ТЕСТЫ OK" || echo "ЕСТЬ ОШИБКИ"
exit $fail
