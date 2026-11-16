// 16.11.2026: мини-приложение Telegram — сигнал «готова» (web_app_ready) уходит первой строкой страницы, до загрузки скрипта Telegram
// и кода сайта: иначе Telegram долго держит свою заглушку (серые квадраты) и закрывает ею заставку. Проверка без браузера:
// первый <script> в web/index.html выполняется с подставным мостом Telegram (TelegramWebviewProxy, как в iOS/Android).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './load_canvas.mjs';

const html = fs.readFileSync(path.join(ROOT, 'web/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
assert.ok(scripts.length > 0, 'в index.html нет скриптов');
assert.ok(html.indexOf(scripts[0][0]) < html.indexOf('<link'), 'сигнал Telegram должен стоять в <head> раньше стилей и ссылок');
const first = scripts[0][1];
assert.match(first, /web_app_ready/, 'первый скрипт страницы не отправляет web_app_ready');

const run = (hash, proxy = true) => { const ev = []; const de = { className: '' };
  const ctx = { location: { hash, search: '' }, URLSearchParams, JSON, parseFloat, document: { documentElement: de }, window: {} };
  ctx.window = ctx; if (proxy) ctx.TelegramWebviewProxy = { postEvent: (t) => ev.push(t) }; ctx.window.parent = ctx.window;
  vm.runInNewContext(first, ctx); return { ev, cls: de.className }; };
let r = run('#tgWebAppPlatform=ios&tgWebAppVersion=8.0');
assert.deepEqual(r.ev, ['web_app_ready', 'web_app_expand', 'web_app_request_fullscreen'], `iOS: ${r.ev}`);
assert.match(r.cls, /\btg\b/, 'нет класса tg — заставка в Telegram не будет видна сразу');
r = run('#tgWebAppPlatform=tdesktop&tgWebAppVersion=8.0');
assert.deepEqual(r.ev, ['web_app_ready', 'web_app_expand'], `на компьютере без полноэкранного режима: ${r.ev}`);
r = run('#tgWebAppPlatform=android&tgWebAppVersion=7.10');
assert.deepEqual(r.ev, ['web_app_ready', 'web_app_expand'], `старый Telegram без Bot API 8.0: ${r.ev}`);
r = run('', false);
assert.deepEqual(r.ev, [], 'обычный браузер: событий Telegram быть не должно'); assert.equal(r.cls, '');
assert.match(html, /\.tg #gd-splash\{opacity:1!important/, 'заставка в Telegram должна быть видна сразу');
console.log('OK test_tg_boot: web_app_ready — первой строкой страницы, заставка в Telegram сразу');
