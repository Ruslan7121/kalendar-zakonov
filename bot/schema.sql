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
