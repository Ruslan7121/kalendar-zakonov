# Программа (pipeline/)

## Канон путей (с 12.11.2026, пункт 4)
Один конвейер и один файл данных — **git-клон этого репозитория**. Отдельного «рабочего» canvas вне клона больше нет.

| Переменная | Значение по умолчанию | Что это |
|---|---|---|
| `GD_ROOT` | каталог над `pipeline/` (корень клона), например `/workspace/kalendar-zakonov` | git-клон github.com/Ruslan7121/kalendar-zakonov |
| `CANVAS` | `$GD_ROOT/src/canvas.tsx` | **единственный канон** кода и данных сайта (DATA, VT, TRACK, CAL, BP, ZTAG…). Его пишут все скрипты и его собирает `web/build.sh` |
| `GD_DUMA` | `/workspace/duma` | внешний вспомогательный каталог **вне клона** (не второй конвейер): `lists/*.txt` — списки RU-прокси для `fetch.sh`; кэши `bills/` (sozd), `cal_cache/`, `sep/`, `chk/`; `calendar_static.json` (распорядок сессии); `days/` |
| `GD_DAYS` | `$GD_DUMA/days` | `ДД.ММ.ГГГГ.json` от `votes_day.py` (их читает `vote_times.py`) |
| `GD_FETCH` | `pipeline/fetch.sh` | загрузчик через RU-прокси |

Производные копии канона (их не правят руками, их пересобирает `strip_code_only.py`, его вызывают `run_daily.sh` и `commit.sh`):
`src/canvas.code-only.tsx` (крупные константы данных → заглушки, для чтения кода), `out/canvas.tsx` и `out/canvas.code-only.tsx` (те же файлы без строки `import React from "react";`, прежняя форма страницы; сайт из них не собирается).

Рабочие файлы прогона пишутся внутрь клона и в git не идут (`.gitignore`): `out/logs/`, `out/cache/`, `out/TODO.md`, `out/calendar.json`, `extracts/bills_html/`. Выжимки законопроектов — `extracts/bills/<номер>.json`.

Изменение по сравнению с прежней раскладкой: раньше `GD_ROOT` по умолчанию был `/workspace`, и скрипты писали в `/workspace/out/canvas.tsx` — устаревшую копию (≈1,28 МБ против ≈1,8 МБ канона). Теперь **по умолчанию `votes_day.py` и все остальные шаги пишут в `src/canvas.tsx` клона**. `/workspace/out/canvas.tsx` переименован в `canvas.tsx.STALE-20261112` и нигде не используется. Старая копия скриптов `/workspace/duma/pipeline/` выведена (`pipeline.STALE-20261112`): единственный конвейер — `pipeline/` в клоне.

## Ежедневный прогон
```bash
cd "$GD_ROOT" && git pull --ff-only
bash pipeline/run_daily.sh [ДД.ММ.ГГГГ]
```
Порядок шагов `run_daily.sh`:
1. **`votes_day.py ДЕНЬ`** — голосования дня с vote.duma.gov.ru → `$GD_DAYS/ДД.ММ.ГГГГ.json` → `DATA` + `VT`.
2. `calendar_update.py` → `out/calendar.json`; при успехе **`cal_merge.py`** → строка `CAL` в canvas (объединение, ничего не теряется).
3. `bills.py ДЕНЬ` — sozd + пояснительные записки → `extracts/bills/`.
4. `vote_times.py ДЕНЬ` — недостающее время → `VT`.
5. `organs.py --day ДЕНЬ --embed` — СФ, Минфин, Минтруд, Минюст, ЦБ → `ORG`/`ORGX`.
6. `track.py` — путь закона → `TRACK`, `LAWS` (auto).
7. `audit.py --day ДЕНЬ --fix` — дневной аудит.
8. `todo.py` → `out/TODO.md`.
9. `strip_code_only.py` — производные копии (`src/canvas.code-only.tsx`, `out/canvas*.tsx`).
10. `summary.sh ДЕНЬ` — сводка логов.

Дальше бот пишет тексты (BOT_PROMPT.md), коммитит в `main` (`pipeline/commit.sh`) и публикует сайт (ниже).

## Публикация
- Публичный сайт — **только GitHub Pages**: https://ruslan7121.github.io/kalendar-zakonov/ (ветка `gh-pages`).
- Страницу Cursor не редактировать (EditCanvas/WriteCanvas не использовать). Netlify (duma-svodki.netlify.app) — не публичный сайт, туда не выкладывать.
- Публикация — одна команда после `commit.sh` (он коммитит и отправляет main): `./pipeline/publish.sh "что изменилось"`. Скрипт: проверяет, что main чистый и уже в `origin/main`; собирает `web/build.sh` (`src/canvas.tsx` → `web/dist/`); переименовывает JS в `app.<hash>.js` (первые 10 знаков sha256 содержимого) и подставляет его в `index.html`; во временном worktree от `origin/gh-pages` кладёт `index.html`, `app.<hash>.js`, копию в `app.js`, README ветки; удаляет хешированные файлы старше трёх прошлых сборок; отказывается коммитить, если в коммит попали другие файлы; делает обычный коммит «Сборка из main <sha>: … (app.<hash>.js)» и `git push` без --force (не fast-forward → ошибка); ждёт до 10 минут, пока живой `index.html` начнёт ссылаться на новый `app.<hash>.js`, и проверяет, что файл отдаёт 200. Если сборка не изменилась — коммита нет.
- Варианты: `./pipeline/publish.sh --dry-run` — собрать и показать, что уйдёт в gh-pages, без коммита; `PUBLISH_NO_VERIFY=1` — не ждать живую страницу; `PUBLISH_KEEP=N` — сколько прежних `app.<hash>.js` хранить.
- Кэш: GitHub Pages отдаёт все файлы с `Cache-Control: max-age=600`, заголовки настроить нельзя (meta-теги браузер для HTTP-кэша не учитывает). Хешированное имя JS гарантирует, что новый `index.html` не возьмёт старый JS из кэша. Остаётся только кэш самого `index.html`: тот, кто открывал сайт за последние 10 минут до выкладки, может до 10 минут видеть прежнюю версию целиком (старый `index.html` + свой старый `app.<hash>.js`, он в ветке сохранён), но не «смесь». Жёсткое обновление больше не нужно — через ≤10 минут обычная перезагрузка подхватит новую сборку. `app.js` без хеша — копия последней сборки только для `index.html`, закэшированных до перехода на хеши; новый `index.html` на него не ссылается.
- `commit.sh` коммитит только `main` и сайт не публикует. Ветку `gh-pages` руками не править.

## Скрипты
| Скрипт | Что делает | Пишет |
|---|---|---|
| run_daily.sh [ДД.ММ.ГГГГ] | прогон за день: **votes_day (шаг 1)** → calendar_update + cal_merge → bills → vote_times → organs → track → **audit.py --day** → todo → strip_code_only → сводка (см. выше). | — |
| votes_day.py ДД.ММ.ГГГГ [ДД.ММ.ГГГГ] [--dry-run] [--canvas файл] | **шаг 1.** Голосования дня с vote.duma.gov.ru: список `?from=&to=` (все страницы `page=`) + страница каждого голосования `/vote/<id>` (итог, поимённо → фракции, дата и время). Пишет days/ДД.ММ.ГГГГ.json, затем аддитивно DATA: новые id вставляются по порядку, существующие строки не меняются (расхождения цифр — в отчёт), Суть/TRACK/ZTAG/постановления не трогаются. VT — время со страницы голосования. День без голосований (официально «ничего не найдено») в DATA не добавляется. Код выхода: 0 — ок, 1 — есть пробелы (голосования не попали в DATA), 2 — список дня недоступен, DATA не изменён. | $GD_DAYS/ДД.ММ.ГГГГ.json, DATA, блок VT, out/cache/vote/<id>.html, out/logs/votes_day_<день>.json, out/logs/votes_day_fail.log |
| calendar_update.py | календарь пленарных дней (sozd), заседаний Правительства, распорядок из `$GD_DUMA/calendar_static.json`; canvas не трогает | out/calendar.json, `$GD_DUMA/cal_cache/` |
| cal_merge.py [canvas] | шаг CAL: объединяет `out/calendar.json` со строкой `CAL` в canvas — старые пункты повесток и short сохраняются, статус дня не понижается, проверка «ничего не потеряно»; нет calendar.json — выход 1 без изменений | строка `CAL` |
| bills.py [дни] | все законопроекты: sozd + пояснительная записка (docx/pdf). **Ускорено:** 10 воркеров, задержка 0.12 с. | extracts/bills/*.json, extracts/bills_html/, out/logs/bills_fail.log |
| bills.py --one <номер> | ручная догрузка одного законопроекта | extracts/bills/<номер>.json |
| vote_times.py [дни] | время голосования для всех id из DATA. Источники по порядку: days/*.json (от votes_day.py) → страница голосования `/vote/<id>` → **запасной путь:** страница депутата (Абакаров, 99113478; не даёт времени, если депутат отсутствовал). Время берётся только при совпадении даты. | блок VT, logs/vote_time_fail.log |
| track.py [номера] [--refresh] | все этапы (in/kom/r1/r2/r3/sf/sign/pub/force) с sozd; отклонение = дата голосования; force с kremlin.ru при совпадении номера и даты. Без аргументов — все bills из DATA. TRACK_QUICK=1 — только локальный кэш `$GD_DUMA/bills`. | блок TRACK, LAWS (auto), logs/track_fail.log, logs/laws_auto.log |
| audit.py [--day ДД.ММ.ГГГГ] [--fix] | независимый аудит canvas vs sozd/vote: метка чтения, TRACK-даты (только полный прогон), день DATA vs дата голосования, card_vs_share (карточка и шаринг — одна SoT чтения). В daily — только `--day`. | out/logs/audit_*.json |
| budget.py [номер] [docx] | бюджетный блок из пояснительной записки | блок BUDGET |
| todo.py | список текстов для бота | out/TODO.md |
| bp_merge.py [canvas] [days/*.json] | перенос текстов бота (out/days/*.json) в BP/PROC | canvas |
| strip_code_only.py | производные копии канона | src/canvas.code-only.tsx, out/canvas.tsx, out/canvas.code-only.tsx |
| commit.sh [сообщение] | clean_yo → strip_code_only → обычный коммит и push в `main`; сайт не публикует | git |
| publish.sh [сообщение] [--dry-run] | сборка → `app.<hash>.js` + `index.html` → обычный коммит в `gh-pages` → push без --force → проверка живого сайта | gh-pages |
| clean_yo.py | «ё» → «е» в out/days/*.json и блоках BP/PROC/ORG/ORGX | canvas, out/days |
| track_fast.py | быстрый «Путь закона» по дню | блок TRACK |
| summary.sh [день] | сводка по логам парсинга | — |
| fetch.sh | загрузка через RU-прокси (`$GD_DUMA/lists/<домен>.txt`) | `$GD_DUMA/lists/` |
| legacy/ | `embed_calendar.py`, `gen.py` — выведены из прогона, на текущем коде не работают (см. legacy/README.md) | — |

Строка DATA (votes_day.py): `id|номер (или «Пост. N», «—»)|краткое название|чтение|1/0|за/против/возд./не голос.|ЕР;КПРФ;ЛДПР;НЛ;СРЗП;Вне` (размер фракции через «:», если отличается от 350/37/24/20/17/2). Для «к отклонению» — чтение законопроекта и 0 (законопроект отклонён), как в существующих строках.

Блоки в src/canvas.tsx, которые переписывает программа: `DATA` (только добавление новых id, votes_day.py), `/* VT:start */…/* VT:end */`, `/* TRACK:start */…/* TRACK:end */`, `/* BUDGET:start */…/* BUDGET:end */`, `/* ORG:start */`/`/* ORGX:start */`, строка `const CAL: any = …;` (cal_merge.py), `BP`/`PROC` (bp_merge.py).

## Ограничения (06.11.2026)
- vote.duma.gov.ru не ответил через прокси — время голосований пока «нет данных». Добавлен запасной способ через прямой запрос. *(12.11.2026: через fetch.sh и RU-прокси vote.duma.gov.ru отвечает; проверка votes_day.py за 10.11 и 11.11 — 64/64 и 71/71 голосований, цифры и VT совпали с DATA, кроме флага «принят» у трёх «к отклонению», учтено.)*
- Дата вступления в силу: поиск kremlin.ru не находит свежие законы; текст по ссылке используется только при совпадении номера ФЗ и даты подписания. Пока ни одна дата не подтверждена.
- Бюджет: суммы по разделам есть только на 2027–2029 (законопроект). За 2025 (отчет) и 2026 (оценка) в записке — только основные характеристики (доходы, расходы, дефицит); суммы по разделам за прошлые бюджеты не загружены.
- bills.py: ускорен до 10 воркеров и задержки 0.12 с. Повторный запуск продолжает с места остановки (готовые json пропускаются).
