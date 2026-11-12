# pipeline/legacy — не входит в ежедневный прогон

Скрипты сохранены для истории, их не запускает `run_daily.sh` и на них нельзя опираться. Пути в них жёстко заданы
под старую раскладку `/workspace/out` и `/workspace/duma`, поэтому на текущем `src/canvas.tsx` они не работают.

| Скрипт | Почему выведен | Чем заменён |
|---|---|---|
| `embed_calendar.py` | разовая правка старого шаблона календаря (вставлял компонент `Calendar` целиком, читал `/workspace/social/out`, писал `/workspace/out/canvas.tsx` и `/tmp/cv/eds.json` для EditCanvas). На текущем коде падает. | `pipeline/cal_merge.py` — объединяет `out/calendar.json` со строкой `CAL` в `src/canvas.tsx`, ничего не теряя |
| `gen.py` | старая сборка `DATA`/`SUM` в `/workspace/duma/data.ts` из `days/*.json` | `pipeline/votes_day.py` (шаг 1, аддитивная запись в `DATA`) |
