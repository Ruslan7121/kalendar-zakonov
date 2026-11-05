# Календарь законов

Страница о работе Госдумы и Правительства: календарь пленарных дней, карточки голосований, законы, вступающие в силу.

## Структура
- src/canvas.tsx — исходник страницы (canvas); src/canvas.code-only.tsx — то же без больших блоков данных.
- pipeline/ — программа сбора данных (Python + fetch.sh через RU-прокси). Точка входа: pipeline/run_daily.sh.
- extracts/ — выжимки из официальных источников (пояснительные записки и т.п.).
- docs/ — заметки о доступе к сайтам и форматах данных (docs/ACCESS.md, docs/PIPELINE.md).
- BOT_PROMPT.md — что делает бот после программы (тексты, публикация, коммит).

## Источники
vote.duma.gov.ru, sozd.duma.gov.ru, duma.gov.ru, government.ru, kremlin.ru, publication.pravo.gov.ru.
