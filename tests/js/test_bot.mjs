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
// настраиваемые тихие часы и часовой пояс
assert.equal(W.quietNow(T0, { qs: '11:00', qe: '13:00', tz: 180 }), true, 'тихие часы 11–13 МСК: 12:00 тихо');
assert.equal(W.quietNow(T0, { qs: '11:00', qe: '13:00', tz: 0 }), false, 'у пользователя UTC сейчас 09:00 — не тихо');
assert.equal(W.quietNow(T0, { qs: '08:00', qe: '08:00' }), false, 'начало = конец: тихих часов нет');
assert.equal(W.quietNow(Date.UTC(2026, 10, 20, 23, 30), { qs: '23:00', qe: '06:00', tz: 0 }), true, 'через полночь: 23:30');
assert.equal(W.quietNow(Date.UTC(2026, 10, 20, 7, 0), { qs: '23:00', qe: '06:00', tz: 0 }), false, 'через полночь: 07:00');
const U = 'https://ruslan7121.github.io/kalendar-zakonov/';
const EV = [
  { id: 'v:1', k: 'vote', ts: T0 - 3600e3, t: 'Страховые пенсии', x: 'Индексация пенсий', r: '2-е чтение', ok: true, z: [372, 40, 3], u: `${U}?d=19.11.2026&v=1`, tg: ['Пенсионеры', 'Бюджет'], tw: ['Пенсионеры'], tt: ['Бюджет'] },
  { id: 'v:2', k: 'vote', ts: T0 - 3600e3, t: 'Курьеры', x: '', r: '1-е чтение', ok: false, z: [121, 200, 0], u: `${U}?d=19.11.2026&v=2`, tg: ['Работники'], tw: ['Работники'], tt: [] },
  { id: 's:1', k: 'soon', ts: T0 - 1800e3, t: 'Приставы', x: 'Кредитная история', u: `${U}law/a/`, tg: ['Все граждане', 'Пенсионеры'], tw: ['Все граждане', 'Пенсионеры'], tt: [] },
  { id: 'n:1', k: 'new', ts: T0 - 1200e3, t: 'Новый закон', x: 'Суть закона', due: '1 января 2027', u: `${U}law/b/`, tg: ['Пенсионеры'], tw: ['Пенсионеры'], tt: [] },
  { id: 'f:1', k: 'vote', ts: T0 + 3600e3, t: 'Будущее', x: '', r: '3-е чтение', ok: true, z: [1, 1, 1], u: '', tg: ['Пенсионеры'], tw: ['Пенсионеры'], tt: [] },
  { id: 'o:1', k: 'vote', ts: T0 - 9 * 86400e3, t: 'Старое', x: '', r: '3-е чтение', ok: true, z: [1, 1, 1], u: '', tg: ['Пенсионеры'], tw: ['Пенсионеры'], tt: [] },
  { id: 'x:1', k: 'docs', ts: T0 - 600e3, t: 'Документ органа', x: '', u: '', tg: ['Пенсионеры'], tw: ['Пенсионеры'], tt: [] }];
const sub = { w: ['Пенсионеры'], t: [], prefs: { vote: true, new: true, soon: true, quiet: true, qs: '22:00', qe: '08:00', tz: 180 }, since: T0 - 86400e3 };
let pk = W.pickEvents(EV, sub, T0).map((e) => e.id); assert.deepEqual(pk, ['v:1', 's:1', 'n:1'], 'пересечение меток, вид, время, подписка: ' + pk + ' (документы органов не отправляются)');
assert.deepEqual(W.pickEvents(EV, { ...sub, prefs: { ...sub.prefs, vote: false } }, T0).map((e) => e.id), ['s:1', 'n:1'], 'выключенный вид отправлен');
assert.deepEqual(W.pickEvents(EV, sub, T0, new Set(['v:1'])).map((e) => e.id), ['s:1', 'n:1'], 'уже отправленное отправлено снова');
assert.deepEqual(W.pickEvents(EV, sub, Date.UTC(2026, 10, 20, 20, 0)), [], 'в тихие часы отправлено');
assert.equal(W.pickEvents(EV, { ...sub, prefs: { ...sub.prefs, quiet: false } }, Date.UTC(2026, 10, 20, 20, 0)).length >= 1, true, 'без тихих часов не отправлено');
assert.deepEqual(W.pickEvents(EV, { ...sub, prefs: { ...sub.prefs, qs: '12:00', qe: '13:00' } }, T0), [], 'свои тихие часы 12–13 МСК не учтены');
assert.deepEqual(W.pickEvents(EV, { ...sub, w: [] }, T0), [], 'без меток отправлено');
// «Для кого» и «Тема» работают вместе
const E2 = [{ id: 'a', k: 'vote', ts: T0 - 1000, t: 'A', x: '', r: '1-е чтение', ok: true, u: '', tg: [], tw: ['Семьи с детьми'], tt: ['Выплаты'] }, { id: 'b', k: 'vote', ts: T0 - 1000, t: 'B', x: '', r: '1-е чтение', ok: true, u: '', tg: [], tw: ['Военнослужащие'], tt: ['Выплаты'] }, { id: 'c', k: 'vote', ts: T0 - 1000, t: 'C', x: '', r: '1-е чтение', ok: true, u: '', tg: [], tw: ['Семьи с детьми'], tt: ['Налоги'] }];
assert.deepEqual(W.pickEvents(E2, { ...sub, w: ['Семьи с детьми'], t: ['Выплаты'] }, T0).map((e) => e.id), ['a'], 'метки двух групп должны работать вместе');
assert.deepEqual(W.pickEvents(E2, { ...sub, w: [], t: ['Выплаты'] }, T0).map((e) => e.id), ['a', 'b'], 'одна группа: подходит любое «Для кого»');
assert.deepEqual(W.pickEvents(E2, { ...sub, w: ['Семьи с детьми'], t: ['Выплаты', 'Налоги'] }, T0).map((e) => e.id), ['a', 'c'], 'внутри группы достаточно любой метки');
// карточка законопроекта в сообщении: чтение, итог, голоса, суть, метки
const txt = W.eventText(EV[0], sub); assert.match(txt, /Рассмотрение законопроекта\n\n<b>Страховые пенсии<\/b>\n2-е чтение: ✅ принят\nЗа 372, против 40, воздержались 3\n\nИндексация пенсий\n\n★ Пенсионеры/, txt);
assert.match(W.eventText(EV[1], sub), /1-е чтение: ❌ отклонён/, 'отклонённый законопроект без статуса');
assert.match(W.eventText(EV[2], sub), /Завтра вступает в силу\n\n<b>Приставы<\/b>\nКредитная история/);
assert.match(W.eventText(EV[3], sub), /Новый закон в «Вступают в силу»\n\n<b>Новый закон<\/b>\nВступает в силу: 1 января 2027\n\nСуть закона\n\n★ Пенсионеры/, W.eventText(EV[3], sub));
assert.deepEqual(W.pickEvents(EV, { ...sub, prefs: { ...sub.prefs, new: false } }, T0).map((e) => e.id), ['v:1', 's:1'], 'выключенный «новый закон» отправлен');
assert.ok(!/<script/.test(W.eventText({ ...EV[0], t: '<script>x</script>' }, sub)), 'html не экранирован');
// /sub: подписка только с подписанной initData; отключение удаляет запись
const subReq = async (body) => W.default.fetch(new Request('https://bot.example/sub', { method: 'POST', body: JSON.stringify(body) }), env);
assert.equal((await subReq({ initData: 'user=%7B%22id%22%3A1%7D&hash=bad', w: ['Пенсионеры'], prefs: { vote: true } })).status, 403, 'подписка с поддельной initData принята');
assert.equal((await subReq({ initData: await init(501), w: ['Пенсионеры'], t: ['Налоги'], prefs: { vote: true, new: false, soon: true, quiet: true, qs: '23:00', qe: '07:30', tz: 300 } })).status, 200);
let row = sq.prepare('SELECT * FROM subs WHERE chat_id = 501').get(); assert.deepEqual(JSON.parse(row.tags), { w: ['Пенсионеры'], t: ['Налоги'] });
assert.deepEqual(JSON.parse(row.prefs), { vote: true, new: false, soon: true, quiet: true, qs: '23:00', qe: '07:30', tz: 300 }, 'настройки тихих часов не сохранились: ' + row.prefs);
const since0 = row.since; await subReq({ initData: await init(501), t: ['Налоги'], prefs: { vote: true, soon: false, quiet: false, qs: 'bad', qe: '99:99', tz: 9999 } });
row = sq.prepare('SELECT * FROM subs WHERE chat_id = 501').get(); assert.deepEqual(JSON.parse(row.tags), { w: [], t: ['Налоги'] }); assert.equal(row.since, since0, 'повторная настройка сдвинула «с какого момента»');
assert.deepEqual(JSON.parse(row.prefs), { vote: true, new: false, soon: false, quiet: false, qs: '22:00', qe: '08:00', tz: 840 }, 'некорректное время/пояс не заменены: ' + row.prefs);
// рассылка: сообщение уходит один раз, повтор того же события не отправляется
await subReq({ initData: await init(502), w: ['Пенсионеры'], prefs: { vote: true, new: true, soon: true, quiet: false } });
sq.exec(`UPDATE subs SET since = ${Math.floor(T0 / 1000) - 86400}`);
const out = []; const send = async (b) => { out.push(b); return { ok: true }; };
assert.equal(await W.notify(env, EV, T0, send), 3, 'рассылка: ждали 3 сообщения (v:1, s:1 и n:1 для 502; у 501 метка «Налоги» без событий)');
const to502 = out.filter((b) => b.chat_id === 502); assert.equal(to502.length, 3); assert.ok(to502.some((b) => /Рассмотрение законопроекта/.test(b.text)) && to502.some((b) => /Завтра вступает/.test(b.text)), 'не те сообщения у 502');
assert.equal(to502.find((b) => /Рассмотрение/.test(b.text)).reply_markup.inline_keyboard[0][0].text, 'Открыть карточку');
assert.equal(to502[0].reply_markup.inline_keyboard[0][0].web_app.url.startsWith('https://ruslan7121.github.io/'), true, 'кнопка законопроекта не открывает мини-приложение');
out.length = 0; assert.equal(await W.notify(env, EV, T0, send), 0, 'повторная рассылка отправила уже отправленное');
// бот заблокирован — подписка удаляется
sq.exec('DELETE FROM sent'); const blocked = async () => ({ ok: false, error_code: 403 }); await W.notify(env, EV, T0, blocked);
assert.equal(sq.prepare('SELECT COUNT(*) AS n FROM subs WHERE chat_id = 502').get().n, 0, 'подписка заблокировавшего бота не удалена');
assert.equal(sq.prepare('SELECT COUNT(*) AS n FROM subs WHERE chat_id = 501').get().n, 1, 'удалена подписка, которой ничего не отправляли');
console.log('OK test_bot: подпись initData, учет по хэшу, счетчики, /stats только владельцу, /start, /setup, подписки и рассылка уведомлений');
