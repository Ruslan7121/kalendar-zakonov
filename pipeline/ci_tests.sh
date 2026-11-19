#!/bin/bash
# ci_tests.sh — проверка типов и все тесты для workflow (19.11.2026). Запуск из корня клона: bash pipeline/ci_tests.sh
# Код выхода: 0 — всё OK; 3 — упали только проверки готовности текстов (SHORT, «Суть», метки, тексты органов:
# тесты с кодом 3, см. tests/run_all.sh) — данные коммитятся и публикуются, тексты бот дописывает отдельным проходом;
# 1 — настоящая ошибка (проверка типов или любой другой тест) — публикации нет, в main уходят только сырые данные (commit_raw.sh).
# В GitHub Actions пишет в $GITHUB_OUTPUT: ok=1|0 (можно ли коммитить и публиковать всё), texts=1, если тексты не готовы.
cd "$(dirname "$0")/.."
LOG="${CI_TESTS_LOG:-${RUNNER_TEMP:-/tmp}/ci_tests.log}"
npm run typecheck; tc=$?
bash tests/run_all.sh 2>&1 | tee "$LOG"; rc=${PIPESTATUS[0]}
out() { [ -n "$GITHUB_OUTPUT" ] && echo "$1" >> "$GITHUB_OUTPUT"; return 0; }
TCM=""; if [ $tc != 0 ]; then rc=1; TCM=" typecheck"; echo "ci_tests: проверка типов не прошла"; fi
case $rc in
  0) out ok=1; out texts=0; echo "ci_tests: всё OK" ;;
  3) out ok=1; out texts=1; echo "::warning::Тексты не готовы ($(grep '^TEXTS: ' "$LOG" | sed 's/^TEXTS: //' | tr '\n' ';')) — данные коммитятся и публикуются, тексты допишет бот" ;;
  *) rc=1; out ok=0; out texts=0; echo "::error::Тесты не прошли: $(grep '^FAIL: ' "$LOG" | sed 's/^FAIL: //' | tr '\n' ';')$TCM" ;;
esac
exit $rc
