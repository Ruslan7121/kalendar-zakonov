// Бот @kalendar_zakonov_bot (15.11.2026): Cloudflare Worker + база D1.
//   POST /tg     — webhook Telegram: /start — приветствие и кнопка «Открыть календарь»; /stats — статистика, только владельцу (OWNER_ID).
//   POST /hit    — мини-приложение при открытии присылает Telegram.WebApp.initData; подпись проверяется по токену бота.
//   GET  /setup  — один раз после деплоя: webhook и меню команд (/stats видно только владельцу). Ключ — секрет webhook.
// Храним только хэш Telegram id (sha256 с солью), без имен. Секреты: BOT_TOKEN, OWNER_ID (wrangler secret put).
const SITE = 'https://ruslan7121.github.io/kalendar-zakonov/';
const ORIGIN = 'https://ruslan7121.github.io';
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}
export const webhookSecret = async (token) => hex(await hmac(token, 'webhook')).slice(0, 32);

// Проверка initData мини-приложения: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export async function checkInit(initData, token, now = Date.now() / 1000) {
  const p = new URLSearchParams(initData || ''); const hash = p.get('hash'); if (!hash) return null; p.delete('hash');
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const calc = hex(await hmac(await hmac('WebAppData', token), dcs)); if (calc !== hash) return null;
  if (now - (+p.get('auth_date') || 0) > 86400) return null;
  try { const u = JSON.parse(p.get('user') || 'null'); return u && u.id ? u : null; } catch { return null; }
}

async function salt(db) {
  const r = await db.prepare('SELECT v FROM meta WHERE k = ?').bind('salt').first(); if (r) return r.v;
  const v = hex(crypto.getRandomValues(new Uint8Array(16)));
  await db.prepare('INSERT OR IGNORE INTO meta(k, v) VALUES(?, ?)').bind('salt', v).run();
  return (await db.prepare('SELECT v FROM meta WHERE k = ?').bind('salt').first()).v;
}
export async function record(db, id, src, now = Math.floor(Date.now() / 1000)) {
  const uid = hex(await crypto.subtle.digest('SHA-256', enc.encode(`${await salt(db)}:${id}`)));
  await db.prepare('INSERT INTO users(uid, first_seen, last_seen, src) VALUES(?, ?, ?, ?) ON CONFLICT(uid) DO UPDATE SET last_seen = excluded.last_seen').bind(uid, now, now, src).run();
}
// начало суток по Москве (UTC+3)
const dayStart = (now) => { const m = now + 3 * 3600; return m - (m % 86400) - 3 * 3600; };
export async function stats(db, now = Math.floor(Date.now() / 1000)) {
  const d = dayStart(now);
  const r = await db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(first_seen >= ?1), 0) AS new_today, COALESCE(SUM(last_seen >= ?1), 0) AS day, COALESCE(SUM(last_seen >= ?2), 0) AS week, COALESCE(SUM(last_seen >= ?3), 0) AS month FROM users')
    .bind(d, now - 7 * 86400, now - 30 * 86400).first();
  return { total: +r.total, new_today: +r.new_today, day: +r.day, week: +r.week, month: +r.month };
}
export function statsText(s, now = Date.now()) {
  const t = new Date(now + 3 * 3600 * 1000).toISOString(); const when = `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}, ${t.slice(11, 16)} МСК`;
  return `📊 Пользователи — ${when}\n\nНовые за сегодня: ${s.new_today}\nАктивные за сегодня: ${s.day}\nАктивные за 7 дней: ${s.week}\nАктивные за 30 дней: ${s.month}\nВсего пользователей: ${s.total}`;
}

// ---- Уведомления (21.11.2026) ----
// POST /sub  — мини-приложение присылает {initData, w, t, prefs}: подписка по меткам «Для кого» (w) и «Тема» (t); метки двух групп работают вместе. Хранится chat_id (только у подписавшихся), метки и настройки.
// cron (каждые 15 минут) — берёт feed/events.json сайта и пишет подписчикам: результат рассмотрения законопроекта (чтение, итог, суть), закон вступает в силу завтра. Тихие часы настраиваются.
const HM = /^(\d\d):(\d\d)$/;
const mins = (v, d) => { const m = HM.exec(v || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : d; };
// тихие часы: с qs до qe по времени пользователя (tz — смещение от UTC в минутах; по умолчанию Москва); qs = qe — тихих часов нет
export const quietNow = (now, p = {}) => {
  const tz = Number.isFinite(p.tz) ? Math.max(-720, Math.min(840, p.tz)) : 180; const m = ((Math.floor(now / 60000) + tz) % 1440 + 1440) % 1440;
  const a = mins(p.qs, 22 * 60), b = mins(p.qe, 8 * 60); if (a === b) return false; return a < b ? m >= a && m < b : m >= a || m < b;
};
const KINDS = ['vote', 'soon'];
// какие события отправить подписчику: включённый вид, пересечение меток, не раньше подписки, ещё не отправлено, не в тихие часы; не больше 5 за раз
export function pickEvents(events, sub, now, sent = new Set()) {
  if ((!sub.w.length && !sub.t.length) || (sub.prefs.quiet && quietNow(now, sub.prefs))) return [];
  // как в приложении: внутри группы достаточно любой метки, между группами «Для кого» и «Тема» нужны обе
  const ok = (e) => (!sub.w.length || (e.tw || []).some((g) => sub.w.includes(g))) && (!sub.t.length || (e.tt || []).some((g) => sub.t.includes(g)));
  return events.filter((e) => KINDS.includes(e.k) && sub.prefs[e.k] && e.ts <= now && e.ts >= sub.since && !sent.has(e.id) && ok(e)).sort((a, b) => a.ts - b.ts).slice(0, 5);
}
const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function eventText(e, sub) {
  const mine = [...(e.tw || []), ...(e.tt || [])].filter((g) => sub.w.includes(g) || sub.t.includes(g)); const tail = mine.length ? `\n\n★ ${esc(mine.join(', '))}` : '';
  if (e.k === 'vote') { const z = Array.isArray(e.z) ? `\nЗа ${+e.z[0] || 0}, против ${+e.z[1] || 0}, воздержались ${+e.z[2] || 0}` : '';
    return `🗳 Рассмотрение законопроекта\n\n<b>${esc(String(e.t).slice(0, 200))}</b>\n${esc(e.r || 'Чтение')}: ${e.ok ? '✅ принят' : '❌ отклонён'}${z}${e.x ? `\n\n${esc(String(e.x).slice(0, 280))}` : ''}${tail}`; }
  return `⏰ Завтра вступает в силу\n\n<b>${esc(String(e.t).slice(0, 200))}</b>${e.x ? `\n${esc(String(e.x).slice(0, 220))}` : ''}${tail}`;
}
const cleanTags = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 60))].slice(0, 60) : []);
export async function saveSub(db, id, body, now = Math.floor(Date.now() / 1000)) {
  const w = cleanTags(body.w); const t = cleanTags(body.t); const p = body.prefs || {}; const prefs = { vote: !!p.vote, soon: !!p.soon, quiet: p.quiet !== false, qs: mins(p.qs, -1) >= 0 ? p.qs : '22:00', qe: mins(p.qe, -1) >= 0 ? p.qe : '08:00', tz: Number.isFinite(p.tz) ? Math.max(-720, Math.min(840, Math.round(p.tz))) : 180 };
  if ((!w.length && !t.length) || !(prefs.vote || prefs.soon)) { await db.prepare('DELETE FROM subs WHERE chat_id = ?').bind(id).run(); await db.prepare('DELETE FROM sent WHERE chat_id = ?').bind(id).run(); return false; }
  await db.prepare('INSERT INTO subs(chat_id, tags, prefs, since, updated) VALUES(?, ?, ?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET tags = excluded.tags, prefs = excluded.prefs, updated = excluded.updated').bind(id, JSON.stringify({ w, t }), JSON.stringify(prefs), now, now).run();
  return true;
}
export async function notify(env, events, now = Date.now(), send) {
  const subs = (await env.DB.prepare('SELECT chat_id, tags, prefs, since FROM subs LIMIT 2000').all()).results || []; let n = 0;
  for (const s of subs) {
    const tg0 = JSON.parse(s.tags); const sub = { w: tg0.w || [], t: tg0.t || [], prefs: JSON.parse(s.prefs), since: s.since * 1000 };
    const sent = new Set(((await env.DB.prepare('SELECT ev FROM sent WHERE chat_id = ?').bind(s.chat_id).all()).results || []).map((r) => r.ev));
    for (const e of pickEvents(events, sub, now, sent)) {
      const btn = e.u && e.u.startsWith(SITE) ? { text: e.k === 'vote' ? 'Открыть карточку' : 'Открыть в календаре', web_app: { url: e.u } } : { text: 'Открыть', url: e.u };
      const r = await send({ chat_id: s.chat_id, text: eventText(e, sub), parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: e.u ? [[btn]] : [] } });
      if (r && r.ok) { await env.DB.prepare('INSERT OR IGNORE INTO sent(chat_id, ev, ts) VALUES(?, ?, ?)').bind(s.chat_id, e.id, Math.floor(now / 1000)).run(); n++; }
      else if (r && (r.error_code === 403 || r.error_code === 400)) { await env.DB.prepare('DELETE FROM subs WHERE chat_id = ?').bind(s.chat_id).run(); break; } // бот заблокирован или чат недоступен
    }
  }
  await env.DB.prepare('DELETE FROM sent WHERE ts < ?').bind(Math.floor(now / 1000) - 30 * 86400).run();
  return n;
}
const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
const WELCOME = 'Что приняла Госдума и кого это коснется — каждый день, простым языком.\n\nГолосования по фракциям, суть законопроектов, законы, вступающие в силу. Только официальные источники.';
const cors = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/hit') {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (req.method !== 'POST') return new Response('method', { status: 405, headers: cors });
      const u = await checkInit((await req.text()).slice(0, 4096), env.BOT_TOKEN);
      if (u && !u.is_bot) await record(env.DB, String(u.id), 'app');
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname === '/sub') {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      if (req.method !== 'POST') return new Response('method', { status: 405, headers: cors });
      let body = {}; try { body = JSON.parse((await req.text()).slice(0, 16384)); } catch {}
      const u = await checkInit(String(body.initData || '').slice(0, 4096), env.BOT_TOKEN);
      if (!u || u.is_bot) return new Response('forbidden', { status: 403, headers: cors });
      const on = await saveSub(env.DB, u.id, body);
      return new Response(JSON.stringify({ ok: true, on }), { headers: { ...cors, 'content-type': 'application/json' } });
    }
    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('x-telegram-bot-api-secret-token') !== (await webhookSecret(env.BOT_TOKEN))) return new Response('forbidden', { status: 403 });
      const up = await req.json().catch(() => ({})); const msg = up.message; if (!msg || !msg.from || msg.from.is_bot) return new Response('ok');
      await record(env.DB, String(msg.from.id), 'bot');
      const text = String(msg.text || '');
      if (/^\/start\b/.test(text)) await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: WELCOME, reply_markup: { inline_keyboard: [[{ text: '📅 Открыть календарь', web_app: { url: SITE } }]] } });
      else if (/^\/stats\b/.test(text) && String(msg.from.id) === String(env.OWNER_ID)) await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: statsText(await stats(env.DB)) });
      return new Response('ok');
    }
    if (url.pathname === '/setup' && url.searchParams.get('key') === (await webhookSecret(env.BOT_TOKEN))) {
      const out = {};
      out.webhook = await tg(env, 'setWebhook', { url: `${url.origin}/tg`, secret_token: await webhookSecret(env.BOT_TOKEN), allowed_updates: ['message'], drop_pending_updates: true });
      out.cmd_all = await tg(env, 'setMyCommands', { commands: [{ command: 'start', description: 'Открыть календарь законов' }] });
      out.cmd_owner = await tg(env, 'setMyCommands', { scope: { type: 'chat', chat_id: Number(env.OWNER_ID) }, commands: [{ command: 'start', description: 'Открыть календарь законов' }, { command: 'stats', description: 'Статистика пользователей' }] });
      return new Response(JSON.stringify(out, null, 1), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('Календарь законов: бот', { status: 404 });
  },
  // cron каждые 15 минут: уведомления подписчикам (wrangler.toml → [triggers])
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const r = await fetch(`${SITE}feed/events.json`, { cf: { cacheTtl: 120 } }); if (!r.ok) return;
      const j = await r.json().catch(() => ({})); await notify(env, Array.isArray(j.ev) ? j.ev : [], Date.now(), (b) => tg(env, 'sendMessage', b));
    })());
  },
};
