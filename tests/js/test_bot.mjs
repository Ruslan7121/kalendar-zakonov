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
const DB = { prepare: (q) => { const st = sq.prepare(q.replace(/\?(\d)/g, '?$1')); const mk = (args) => ({ first: async () => st.get(...conv(args)) || null, run: async () => st.run(...conv(args)), all: async () => ({ results: st.all(...conv(args)) }) }); return { bind: (...a) => mk(a), ...mk([]) }; } };
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
// ---- уведомления (21.11.2026) ----
const T0 = Date.UTC(2026, 10, 20, 9, 0, 0); // 20.11.2026 12:00 МСК — день, не тихие часы
assert.equal(W.quietNow(Date.UTC(2026, 10, 20, 19, 30)), true, '22:30 МСК — тихие часы');
assert.equal(W.quietNow(Date.UTC(2026, 10, 20, 4, 59)), true, '07:59 МСК — тихие часы');
assert.equal(W.quietNow(T0), false, '12:00 МСК — не тихие часы');
const EV = [
  { id: 'v:1', k: 'law', ts: T0 - 3600e3, t: 'Страховые пенсии', x: 'Индексация', u: 'https://ruslan7121.github.io/kalendar-zakonov/?d=19.11.2026&v=1', tg: ['Пенсионеры', 'Бюджет'] },
  { id: 'v:2', k: 'law', ts: T0 - 3600e3, t: 'Курьеры', x: '', u: 'https://ruslan7121.github.io/kalendar-zakonov/?d=19.11.2026&v=2', tg: ['Работники'] },
  { id: 's:1', k: 'soon', ts: T0 - 1800e3, t: 'Приставы', x: 'Кредитная история', u: 'https://ruslan7121.github.io/kalendar-zakonov/law/a/', tg: ['Все граждане', 'Пенсионеры'] },
  { id: 'd:1', k: 'docs', ts: T0 - 600e3, t: 'Минфин: приказ', x: '', u: 'https://publication.pravo.gov.ru/x', tg: ['Налоги'] },
  { id: 'f:1', k: 'law', ts: T0 + 3600e3, t: 'Будущее', x: '', u: '', tg: ['Пенсионеры'] },
  { id: 'o:1', k: 'law', ts: T0 - 9 * 86400e3, t: 'Старое', x: '', u: '', tg: ['Пенсионеры'] }];
const sub = { tags: ['Пенсионеры'], prefs: { law: true, soon: true, docs: false, quiet: true }, since: T0 - 86400e3 };
let pk = W.pickEvents(EV, sub, T0).map((e) => e.id); assert.deepEqual(pk, ['v:1', 's:1'], 'пересечение меток, вид, время, подписка: ' + pk);
assert.deepEqual(W.pickEvents(EV, { ...sub, prefs: { ...sub.prefs, law: false } }, T0).map((e) => e.id), ['s:1'], 'выключенный вид отправлен');
assert.deepEqual(W.pickEvents(EV, sub, T0, new Set(['v:1'])).map((e) => e.id), ['s:1'], 'уже отправленное отправлено снова');
assert.deepEqual(W.pickEvents(EV, sub, Date.UTC(2026, 10, 20, 20, 0)), [], 'в тихие часы отправлено');
assert.equal(W.pickEvents(EV, { ...sub, prefs: { ...sub.prefs, quiet: false } }, Date.UTC(2026, 10, 20, 20, 0)).length >= 1, true, 'без тихих часов не отправлено');
assert.deepEqual(W.pickEvents(EV, { ...sub, tags: [] }, T0), [], 'без меток отправлено');
assert.match(W.eventText(EV[0], sub), /Принят закон\n\n<b>Страховые пенсии<\/b>\nИндексация\n\n★ Пенсионеры/, W.eventText(EV[0], sub));
assert.ok(!/<script/.test(W.eventText({ ...EV[0], t: '<script>x</script>' }, sub)), 'html не экранирован');
// /sub: подписка только с подписанной initData; отключение удаляет запись
const subReq = async (body) => W.default.fetch(new Request('https://bot.example/sub', { method: 'POST', body: JSON.stringify(body) }), env);
assert.equal((await subReq({ initData: 'user=%7B%22id%22%3A1%7D&hash=bad', tags: ['Пенсионеры'], prefs: { law: true } })).status, 403, 'подписка с поддельной initData принята');
assert.equal((await subReq({ initData: await init(501), tags: ['Пенсионеры', 'Налоги'], prefs: { law: true, soon: true, docs: false, quiet: true } })).status, 200);
let row = sq.prepare('SELECT * FROM subs WHERE chat_id = 501').get(); assert.deepEqual(JSON.parse(row.tags), ['Пенсионеры', 'Налоги']); assert.equal(JSON.parse(row.prefs).docs, false);
const since0 = row.since; await subReq({ initData: await init(501), tags: ['Налоги'], prefs: { law: true, soon: false, docs: true, quiet: false } });
row = sq.prepare('SELECT * FROM subs WHERE chat_id = 501').get(); assert.deepEqual(JSON.parse(row.tags), ['Налоги']); assert.equal(row.since, since0, 'повторная настройка сдвинула «с какого момента»');
// рассылка: сообщение уходит один раз, повтор того же события не отправляется
await subReq({ initData: await init(502), tags: ['Пенсионеры'], prefs: { law: true, soon: true, docs: false, quiet: false } });
sq.exec(`UPDATE subs SET since = ${Math.floor(T0 / 1000) - 86400}`);
const out = []; const send = async (b) => { out.push(b); return { ok: true }; };
assert.equal(await W.notify(env, EV, T0, send), 3, 'рассылка: ждали 3 сообщения (v:1 и s:1 для 502, d:1 для 501)');
const to502 = out.filter((b) => b.chat_id === 502); assert.equal(to502.length, 2); assert.ok(to502.some((b) => /Принят закон/.test(b.text)) && to502.some((b) => /Завтра вступает/.test(b.text)), 'не те сообщения у 502');
assert.equal(out.filter((b) => b.chat_id === 501).length, 1);
assert.equal(to502[0].reply_markup.inline_keyboard[0][0].web_app.url.startsWith('https://ruslan7121.github.io/'), true, 'кнопка закона не открывает мини-приложение');
out.length = 0; assert.equal(await W.notify(env, EV, T0, send), 0, 'повторная рассылка отправила уже отправленное');
// бот заблокирован — подписка удаляется
sq.exec('DELETE FROM sent'); const blocked = async () => ({ ok: false, error_code: 403 }); await W.notify(env, EV, T0, blocked);
assert.equal(sq.prepare('SELECT COUNT(*) AS n FROM subs').get().n, 0, 'подписки заблокировавших бота не удалены');
console.log('OK test_bot: подпись initData, учет по хэшу, счетчики, /stats только владельцу, /start, /setup, подписки и рассылка уведомлений');
