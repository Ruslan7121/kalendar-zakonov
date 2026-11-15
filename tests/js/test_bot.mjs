// 15.11.2026: бот @kalendar_zakonov_bot (bot/worker.mjs) — проверка без сети: подпись initData мини-приложения, учет пользователей
// (только хэш id), счетчики «новые / сегодня / 7 дней / 30 дней / всего», /stats только владельцу, /start с кнопкой приложения,
// webhook без секрета отклоняется. D1 подменяется встроенной SQLite (node:sqlite), Telegram API — заглушкой fetch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ROOT } from './load_canvas.mjs';
const W = await import(path.join(ROOT, 'bot', 'worker.mjs'));
const sq = new DatabaseSync(':memory:'); sq.exec(fs.readFileSync(path.join(ROOT, 'bot', 'schema.sql'), 'utf8'));
const conv = (a) => a.map((x) => (typeof x === 'boolean' ? +x : x));
const DB = { prepare: (q) => { const st = sq.prepare(q.replace(/\?(\d)/g, '?$1')); const mk = (args) => ({ first: async () => st.get(...conv(args)) || null, run: async () => st.run(...conv(args)) }); return { bind: (...a) => mk(a), ...mk([]) }; } };
const TOKEN = '123456:TEST-token'; const OWNER = '777';
const env = { DB, BOT_TOKEN: TOKEN, OWNER_ID: OWNER };
const sent = []; globalThis.fetch = async (u, o) => { sent.push({ u: String(u), b: JSON.parse(o.body) }); return { json: async () => ({ ok: true }) }; };
// подпись initData так, как ее делает Telegram
const enc = new TextEncoder(); const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const hm = async (k, d) => new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', typeof k === 'string' ? enc.encode(k) : k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(d)));
const init = async (id, auth = Math.floor(Date.now() / 1000), token = TOKEN) => { const p = new URLSearchParams({ auth_date: String(auth), query_id: 'AAA', user: JSON.stringify({ id, first_name: 'Тест' }) });
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n'); p.set('hash', hex(await hm(await hm('WebAppData', token), dcs))); return p.toString(); };
const hit = async (body) => W.default.fetch(new Request('https://bot.example/hit', { method: 'POST', body }), env);

// подпись
assert.equal((await W.checkInit(await init(1), TOKEN)).id, 1, 'верная подпись initData не принята');
assert.equal(await W.checkInit(await init(1, undefined, '999:other'), TOKEN), null, 'чужая подпись принята');
assert.equal(await W.checkInit((await init(1)).replace('%22id%22%3A1', '%22id%22%3A2'), TOKEN), null, 'подмененный id принят');
assert.equal(await W.checkInit(await init(1, Math.floor(Date.now() / 1000) - 2 * 86400), TOKEN), null, 'просроченная (2 суток) initData принята');

// учет: 3 человека, один дважды, плюс поддельный
for (const id of [11, 12, 13, 11]) assert.equal((await hit(await init(id))).status, 204);
await hit('user=%7B%22id%22%3A99%7D&hash=deadbeef');
let s = await W.stats(DB); assert.deepEqual(s, { total: 3, new_today: 3, day: 3, week: 3, month: 3 }, JSON.stringify(s));
assert.ok(!sq.prepare('SELECT uid FROM users').all().some((r) => /^(11|12|13)$/.test(r.uid)), 'в базе хранится id, а не хэш');
// давние пользователи: был 10 дней назад, был 40 дней назад
const now = Math.floor(Date.now() / 1000);
await W.record(DB, '21', 'app', now - 10 * 86400); await W.record(DB, '22', 'app', now - 40 * 86400);
s = await W.stats(DB, now); assert.deepEqual(s, { total: 5, new_today: 3, day: 3, week: 3, month: 4 }, JSON.stringify(s));
// старый пользователь вернулся сегодня — активен, но не новый
await W.record(DB, '22', 'app', now); s = await W.stats(DB, now); assert.deepEqual(s, { total: 5, new_today: 3, day: 4, week: 4, month: 5 }, JSON.stringify(s));
assert.match(W.statsText(s), /Новые за сегодня: 3\nАктивные за сегодня: 4\nАктивные за 7 дней: 4\nАктивные за 30 дней: 5\nВсего пользователей: 5/);

// webhook
const sec = await W.webhookSecret(TOKEN);
const upd = (from, text, secret = sec) => W.default.fetch(new Request('https://bot.example/tg', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify({ message: { from: { id: from, is_bot: false }, chat: { id: from }, text } }) }), env);
assert.equal((await upd(1, '/stats', 'wrong')).status, 403, 'webhook без секрета принят');
sent.length = 0; await upd(5, '/stats'); assert.equal(sent.length, 0, '/stats ответил не владельцу');
await upd(+OWNER, '/stats'); assert.equal(sent.length, 1); assert.match(sent[0].b.text, /Всего пользователей: 7/, 'в /stats нет пользователей бота (5 и владельца)');
sent.length = 0; await upd(8, '/start'); assert.equal(sent[0].b.reply_markup.inline_keyboard[0][0].web_app.url, 'https://ruslan7121.github.io/kalendar-zakonov/', '/start без кнопки приложения');
// /setup: /stats в меню только у владельца
sent.length = 0; const r = await W.default.fetch(new Request(`https://bot.example/setup?key=${sec}`), env); assert.equal(r.status, 200);
const own = sent.find((x) => x.b.scope); assert.equal(own.b.scope.chat_id, 777); assert.ok(own.b.commands.some((c) => c.command === 'stats'));
assert.ok(!sent.find((x) => /setMyCommands/.test(x.u) && !x.b.scope).b.commands.some((c) => c.command === 'stats'), '/stats видна всем');
assert.equal((await W.default.fetch(new Request('https://bot.example/setup?key=x'), env)).status, 404, '/setup без ключа');
console.log('OK test_bot: подпись initData, учет по хэшу, счетчики, /stats только владельцу, /start, /setup');
