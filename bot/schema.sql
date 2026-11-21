-- 15.11.2026: статистика пользователей бота и мини-приложения @kalendar_zakonov_bot.
-- Храним только хэш Telegram id (sha256 с солью из meta), без имен и логинов; время — секунды Unix.
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  src TEXT NOT NULL DEFAULT 'app'
);
CREATE INDEX IF NOT EXISTS users_last ON users(last_seen);
CREATE INDEX IF NOT EXISTS users_first ON users(first_seen);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
-- 21.11.2026: уведомления. Только у тех, кто сам включил их в приложении: chat_id (нужен, чтобы написать), метки и настройки. Отключил в приложении — строка удаляется.
CREATE TABLE IF NOT EXISTS subs (
  chat_id INTEGER PRIMARY KEY,
  tags TEXT NOT NULL,
  prefs TEXT NOT NULL,
  since INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sent (
  chat_id INTEGER NOT NULL,
  ev TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (chat_id, ev)
);
