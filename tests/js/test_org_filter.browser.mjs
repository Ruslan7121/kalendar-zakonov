// Правило 12 в настоящем браузере (12.11.2026): в выпадающем фильтре органов календаря есть «Убрать все» (снимает все галочки)
// и «Все» (отмечает все органы); после «Убрать все» календарь показывает подсказку [data-cofempty], список остаётся открытым,
// отдельная галочка по-прежнему переключается. 390 px (мобильный, touch) и 1366 px.
// Как test_share_scroll.browser.mjs: сборка во временную папку, локальный сервер, Chrome по DevTools; без Chrome — SKIP
// (при GD_REQUIRE_BROWSER=1 — падает). GD_SHOTS=<папка> — сохранить снимки открытого списка.
// Запуск: node tests/js/test_org_filter.browser.mjs
// при GD_REQUIRE_BROWSER=1 (CI) — падает. Зависимостей нет: протокол DevTools через встроенный WebSocket Node ≥ 22.
// Запуск: node tests/js/test_share_scroll.browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { loadCanvas, ROOT } from './load_canvas.mjs';
import { siteServer } from './site_server.mjs';

const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 3 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];

const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_org_filter.browser: нет Chrome'); process.exit(0); }


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

const ST = `(() => { const g = document.querySelector('[data-calorg] [role=group]'); const bx = g ? [...g.querySelectorAll('input[type=checkbox]')] : [];
  const tg = document.querySelector('[data-calorg] [aria-haspopup]');
  return { open: !!g, n: bx.length, on: bx.filter((b) => b.checked).length, none: !!(g && g.querySelector('[data-cofnone]')), allP: g ? g.querySelector('button[aria-pressed]:not([data-cofnone])')?.getAttribute('aria-pressed') : null,
    noneP: g ? g.querySelector('[data-cofnone]')?.getAttribute('aria-pressed') : null, empty: !!document.querySelector('[data-cofempty]'), label: tg ? tg.textContent : '' }; })()`;
const CLICK = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`;
const ALLBTN = '[data-calorg] [role=group] button:not([data-cofnone])';
const fails = []; const rep = [];
try {
  for (const W of WIDTHS) {
    const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' });
    const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
    await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s);
    await cmd('Emulation.setDeviceMetricsOverride', { width: W.w, height: W.h, deviceScaleFactor: W.dpr, mobile: W.mobile }, s);
    if (W.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
    await cmd('Page.navigate', { url: `${BASE}/` }, s);
    const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true }, s)).result.value;
    const t0 = Date.now(); while (!(await ev('!!document.querySelector("[data-calorg] [aria-haspopup]")')) && Date.now() - t0 < 15000) await sleep(300);
    const tag = `${W.w}px`; const chk = (c, msg) => { if (!c) fails.push(`${tag}: ${msg}`); };
    const shot = async (n) => { if (!process.env.GD_SHOTS) return; await cmd('Runtime.evaluate', { expression: `document.querySelector('[data-calorg]').scrollIntoView({block:'start'}); window.scrollBy(0, -${W.mobile ? 160 : 140})` }, s); await sleep(300);
      const p = await cmd('Page.captureScreenshot', { format: 'png' }, s); fs.mkdirSync(process.env.GD_SHOTS, { recursive: true }); fs.writeFileSync(path.join(process.env.GD_SHOTS, `orgfilter_${W.w}_${n}.png`), Buffer.from(p.data, 'base64')); };
    chk(await ev(CLICK('[data-calorg] [aria-haspopup]')), 'нет кнопки «Фильтр»'); await sleep(400);
    let r = await ev(ST); rep.push(`${tag} открыт: ${JSON.stringify(r)}`);
    chk(r.open && r.n === 8 && r.on === 8 && r.none, `список не открылся или нет «Убрать все» ${JSON.stringify(r)}`);
    chk(await ev(`[...document.querySelectorAll('[data-calorg] [role=group] button')].some((b) => /^Убрать все/.test(b.textContent))`), 'нет текста «Убрать все»');
    await shot('1_open');
    chk(await ev(CLICK('[data-cofnone]')), 'нет [data-cofnone]'); await sleep(400);
    r = await ev(ST); rep.push(`${tag} после «Убрать все»: ${JSON.stringify(r)}`);
    chk(r.open && r.on === 0 && r.noneP === 'true' && r.allP === 'false' && r.empty && /не выбрано/.test(r.label), `«Убрать все» не сняло все галочки ${JSON.stringify(r)}`);
    await shot('2_none');
    chk(await ev(CLICK('[data-calorg] [role=group] label:nth-of-type(1) input')), 'нет галочки'); await sleep(300);
    r = await ev(ST); chk(r.on === 1 && !r.empty, `одна галочка не включилась ${JSON.stringify(r)}`);
    chk(await ev(CLICK(ALLBTN)), 'нет «Все»'); await sleep(400);
    r = await ev(ST); rep.push(`${tag} после «Все»: ${JSON.stringify(r)}`);
    chk(r.open && r.on === 8 && r.allP === 'true' && r.noneP === 'false' && !r.empty && /все/.test(r.label), `«Все» не отметило все органы ${JSON.stringify(r)}`);
    await shot('3_all');
    await cmd('Target.closeTarget', { targetId });
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'правило 12 нарушено:\n  ' + fails.join('\n  '));
console.log(`OK test_org_filter.browser: «Убрать все» / «Все» (${WIDTHS.map((w) => w.w + 'px').join(', ')})`);
