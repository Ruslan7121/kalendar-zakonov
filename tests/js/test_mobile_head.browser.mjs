// 16.11.2026: шапка телефона (390 px) в настоящем браузере.
// 1) На всех четырех вкладках под вкладками — строка «поиск + Фильтры», промежутки между строками шапки одинаковые, шапка одной высоты.
// 2) При прокрутке шапка не сдвигается (строка «Календарь законов» не уходит вверх).
// 3) «Итоги»: в «Фильтрах» есть период; месяцы выбираются по нескольку и суммируются; поиск сужает список.
// 4) «Новости»: в «Фильтрах» выбирается орган — показаны его новости за все загруженные дни.
// 5) Клавиатура: когда список листают пальцем, поле поиска теряет фокус.
// Как test_org_filter.browser.mjs: без Chrome — SKIP (при GD_REQUIRE_BROWSER=1 — падает). Запуск: node tests/js/test_mobile_head.browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { loadCanvas, ROOT } from './load_canvas.mjs';
import { siteServer } from './site_server.mjs';


const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_mobile_head.browser: нет Chrome'); process.exit(0); }


const SITE = await siteServer(); const BASE = SITE.BASE; // сайт как web/build.sh: код + data/*.json по месяцам (пункт 10)

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-chrome-'));
const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${prof}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, no) => { let b = ''; const t = setTimeout(() => no(new Error('Chrome не запустился: ' + b)), 20000);
  ch.stderr.on('data', (x) => { b += x; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } }); });

const ws = new WebSocket(wsUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let seq = 0; const wait = new Map(); const evs = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const [ok, no] = wait.get(m.id); wait.delete(m.id); m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result); } else if (m.method) evs.push(m); };
const cmd = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++seq; wait.set(id, [ok, no]); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEAD = `(() => { const mt = document.querySelector('[data-mtop]'); if (!mt) return null; const k = [...mt.children].filter((e) => e.getBoundingClientRect().height > 0).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; });
  const row = mt.querySelector('[data-msearch], [data-hslot]'); return { k, top: Math.round(mt.getBoundingClientRect().top), h: Math.round(document.querySelector('[data-gdbar]').getBoundingClientRect().height),
  input: !!(row && row.querySelector('input')), fbtn: !!(row && [...row.querySelectorAll('button')].some((b) => /Фильтры/.test(b.textContent))) }; })()`;
const CLICK = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`;
const TYPE = (sel, v) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const st = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; st.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
const fails = []; const rep = []; const chk = (c, msg) => { if (!c) fails.push(msg); };
try {
  const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
  await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s);
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, s);
  await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true }, s)).result.value;
  const open = async (tab, sel) => { await cmd('Page.navigate', { url: `${BASE}/?tab=${tab}` }, s); const t0 = Date.now(); while (!(await ev(`!!document.querySelector(${JSON.stringify(sel)})`)) && Date.now() - t0 < 20000) await sleep(300); await sleep(600); };
  const H = {};
  for (const [tab, sel] of [['l', '[data-lq]'], ['c', '[data-cq]'], ['i', '[data-iq]'], ['d', '[data-nq]']]) {
    await open(tab, sel); const h = await ev(HEAD); H[tab] = h; rep.push(`${tab}: ${JSON.stringify(h)}`);
    chk(h && h.input && h.fbtn, `${tab}: в шапке нет строки «поиск + Фильтры» ${JSON.stringify(h)}`);
    if (h) { const gaps = h.k.slice(1).map((r, i) => r[0] - h.k[i][1]); chk(gaps.every((g) => g === gaps[0]), `${tab}: разные промежутки в шапке ${gaps}`); }
    await ev('window.scrollTo(0, 600)'); await sleep(400); const h2 = await ev(HEAD);
    chk(h && h2 && h2.top === h.top, `${tab}: шапка сдвинулась при прокрутке (${h && h.top} → ${h2 && h2.top})`);
  }
  chk(new Set(Object.values(H).map((h) => h && h.h)).size === 1, `шапка разной высоты на вкладках ${JSON.stringify(Object.fromEntries(Object.entries(H).map(([k, h]) => [k, h && h.h])))}`);
  /* Итоги: два месяца суммируются */
  await open('i', '[data-iq]');
  chk(await ev(CLICK('[data-ifopen]')), 'Итоги: нет кнопки «Фильтры»'); await sleep(400);
  chk(await ev(`(() => { const t = [...document.querySelectorAll('[data-iperiod] [role=tab]')].find((b) => /Месяц/.test(b.textContent)); if (!t) return false; t.click(); return true; })()`), 'Итоги: в фильтрах нет периода «Месяц»'); await sleep(300);
  const cnt = `(() => { const m = (document.querySelector('[data-itogi]').innerText.match(/законопроектов: (\\d+)/) || [])[1]; return m == null ? -1 : +m; })()`;
  const n1 = await ev(cnt); const nm = await ev(`document.querySelectorAll('[data-iper] button').length`);
  if (nm > 1) { await ev(`document.querySelectorAll('[data-iper] button')[1].click()`); await sleep(400); const n2 = await ev(cnt); const on = await ev(`document.querySelectorAll('[data-iper] button[aria-pressed=true]').length`);
    rep.push(`Итоги: один месяц ${n1}, два месяца ${n2}`); chk(on === 2 && n2 > n1, `Итоги: месяцы не суммируются (${n1} → ${n2}, выбрано ${on})`); }
  await ev(`[...document.querySelectorAll('.gd-sheet button')].find((b) => /Показать/.test(b.textContent)).click()`); await sleep(300);
  const nAll = await ev(cnt); await ev(TYPE('[data-iq]', 'бюджет')); await sleep(400); const nQ = await ev(cnt);
  rep.push(`Итоги: поиск «бюджет» ${nAll} → ${nQ}`); chk(nQ >= 0 && nQ < nAll, `Итоги: поиск не сужает список (${nAll} → ${nQ})`);
  /* клавиатура: поле в фокусе, палец ведет по списку — фокус снимается */
  await ev(`document.querySelector('[data-iq]').focus()`); chk(await ev(`document.activeElement === document.querySelector('[data-iq]')`), 'Итоги: поле поиска не получило фокус');
  await cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 600 }] }, s);
  for (let i = 1; i <= 5; i++) await cmd('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 600 - i * 12 }] }, s);
  await cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, s); await sleep(200);
  chk(await ev(`document.activeElement !== document.querySelector('[data-iq]')`), 'клавиатура не прячется при листании (поле осталось в фокусе)');
  /* Новости: орган за все дни */
  await open('d', '[data-nq]');
  chk(await ev(CLICK('[data-nfopen]')), 'Новости: нет кнопки «Фильтры»'); await sleep(400);
  const org = await ev(`(() => { const b = document.querySelector('.gd-sheet [data-zk=nsrc]'); if (!b) return null; b.click(); return b.getAttribute('data-zv'); })()`); await sleep(300);
  chk(!!org, 'Новости: в фильтрах нет органов');
  await ev(`[...document.querySelectorAll('.gd-sheet button')].find((b) => /Показать|Готово/.test(b.textContent)).click()`); await sleep(400);
  const nr = await ev(`(() => { const r = document.querySelector('[data-nall]'); if (!r) return null; const it = [...r.querySelectorAll('[data-newsitem]')]; return { n: it.length, orgs: [...new Set(it.map((e) => e.getAttribute('data-newsitem')))], days: r.querySelectorAll('[data-newsday]').length }; })()`);
  rep.push(`Новости: ${org} → ${JSON.stringify(nr)}`); chk(nr && nr.n > 0 && nr.orgs.length === 1, `Новости: выбор органа не показал его новости ${JSON.stringify(nr)}`);
  await cmd('Target.closeTarget', { targetId });
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'шапка телефона:\n  ' + fails.join('\n  '));
console.log('OK test_mobile_head.browser: поиск и «Фильтры» на всех вкладках, шапка на месте, периоды суммируются, органы в новостях, клавиатура');
