# Программа (pipeline/)

Переменные: GD_ROOT (по умолчанию /workspace; canvas — $GD_ROOT/out/canvas.tsx), GD_DUMA (каталог со списками прокси lists/), GD_FETCH (путь к fetch.sh).

| Скрипт | Что делает | Пишет |
|---|---|---|
| run_daily.sh [ДД.ММ.ГГГГ] | весь прогон за день | — |
| calendar_update.py, embed_calendar.py | календарь (CAL) | out/calendar.json, canvas |
| bills.py [дни] | все законопроекты: sozd + пояснительная записка (docx/pdf) | out/extracts/bills/*.json, logs/bills_fail.log |
| vote_times.py [дни] | время голосования с vote.duma.gov.ru | блок VT, logs/vote_time_fail.log |
| track.py [номера] [--refresh] | все этапы (in/kom/r1/r2/r3/sf/sign/pub/force) с sozd; отклонение = дата голосования; force с kremlin.ru при совпадении номера и даты. Без аргументов — все bills из DATA. TRACK_QUICK=1 — только локальный кэш duma/bills. | блок TRACK, LAWS (auto), logs/track_fail.log, logs/laws_auto.log |
| budget.py [номер] [docx] | бюджетный блок из пояснительной записки | блок BUDGET |
| todo.py | список текстов для бота | out/TODO.md |
| bp_merge.py | перенос текстов бота (out/days/*.json) в BP/PROC | canvas |
| strip_code_only.py | src/canvas.code-only.tsx | out/canvas.code-only.tsx |
| fetch.sh, testdom.sh | загрузка через RU-прокси, проверка прокси | — |

Блоки в canvas.tsx, которые переписывает программа: `/* VT:start */…/* VT:end */`, `/* TRACK:start */…/* TRACK:end */`, `/* BUDGET:start */…/* BUDGET:end */`.

## Ограничения (05.11.2026)
- vote.duma.gov.ru не ответил через прокси — время голосований пока «нет данных».
- Дата вступления в силу: поиск kremlin.ru не находит свежие законы; текст по ссылке используется только при совпадении номера ФЗ и даты подписания. Пока ни одна дата не подтверждена.
- Бюджет: суммы по разделам есть только на 2027–2029 (законопроект). За 2025 (отчет) и 2026 (оценка) в записке — только основные характеристики (доходы, расходы, дефицит); суммы по разделам за прошлые бюджеты не загружены.
- bills.py: загрузка 209 законопроектов через бесплатные прокси идет часами; повторный запуск продолжает с места остановки (готовые json пропускаются).
