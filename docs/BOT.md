# Бот @kalendar_zakonov_bot

Сервер бота — Cloudflare Worker `bot/worker.mjs` с базой D1 (`bot/schema.sql`). Сайт и мини-приложение работают и без него: сервер нужен для ответов бота и статистики.

| Что | Как |
|---|---|
| `/start` | приветствие и кнопка «📅 Открыть календарь» (мини-приложение) |
| `/stats` | только владельцу (`OWNER_ID`), в меню команд видна только ему: новые за сегодня, активные за сегодня / 7 дней / 30 дней, всего |
| Учет | пользователь бота (любое сообщение) или мини-приложения (при открытии сайт отправляет `Telegram.WebApp.initData` на `/hit`, подпись проверяется по токену). Хранится только `sha256(соль:id)`, первый и последний визит; имен и логинов нет |
| Сутки | по Москве; «активные за 7 / 30 дней» — последний визит не раньше 7 / 30 суток назад |

## Развернуть (один раз, потом — при изменении `bot/`)

1. Cloudflare: зарегистрироваться на dash.cloudflare.com, открыть **Workers & Pages** (при первом входе Cloudflare предложит выбрать поддомен `*.workers.dev`).
2. Cloudflare → **My Profile → API Tokens → Create Token** → шаблон **Edit Cloudflare Workers**, добавить право **Account → D1 → Edit** → создать, скопировать токен. **Account ID** — на главной странице аккаунта справа.
3. GitHub → репозиторий → **Settings → Secrets and variables → Actions → New repository secret**:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `BOT_TOKEN` (новый токен из @BotFather), `OWNER_ID` (ваш числовой id — пришлет @userinfobot).
4. GitHub → **Actions → bot → Run workflow**. В итогах запуска — адрес сервера `https://kalendar-zakonov-bot.<поддомен>.workers.dev`.
5. Адрес вписать в `STATS_URL` в `src/canvas.tsx` (рядом с `TG_APP`) и опубликовать сайт — с этого момента мини-приложение отправляет отметки об открытии.

Токены — только в секретах GitHub и Cloudflare, не в коде и не в чатах. Тест без сети: `node tests/js/test_bot.mjs`.
