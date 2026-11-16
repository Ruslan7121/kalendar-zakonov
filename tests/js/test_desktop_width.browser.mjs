// 16.11.2026: компьютер (1366 px) с настоящей полосой прокрутки: ширина страницы одинакова на всех вкладках (полоса видна всегда),
// при открытии карточки страница сзади не сдвигается, затемнение — на весь экран; после закрытия все как было.
// Как test_org_filter.browser.mjs: без Chrome — SKIP (при GD_REQUIRE_BROWSER=1 — падает). Запуск: node tests/js/test_desktop_width.browser.mjs
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
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_desktop_width.browser: нет Chrome'); process.exit(0); }


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

const ST = `(() => { const t = document.querySelector('[data-gdtop]'); return { cw: document.documentElement.clientWidth, iw: innerWidth, left: t ? Math.round(t.getBoundingClientRect().left) : null, right: t ? Math.round(t.getBoundingClientRect().right) : null, win: !!document.querySelector('[data-gdwin]') }; })()`;
const fails = []; const rep = []; const chk = (c, msg) => { if (!c) fails.push(msg); };
try {
  const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
  await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s);
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1366, height: 700, deviceScaleFactor: 1, mobile: false }, s);
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true }, s)).result.value;
  const open = async (q) => { await cmd('Page.navigate', { url: `${BASE}/${q}` }, s); const t0 = Date.now(); while (!(await ev('!!document.querySelector("[data-gdtop]")')) && Date.now() - t0 < 20000) await sleep(300); await sleep(1200); };
  const W = {};
  for (const tab of ['l', 'c', 'i', 'd']) { await open(`?tab=${tab}`); W[tab] = await ev(ST); rep.push(`${tab}: ${JSON.stringify(W[tab])}`); }
  const cws = new Set(Object.values(W).map((x) => x.cw)), rs = new Set(Object.values(W).map((x) => x.right));
  chk(cws.size === 1 && rs.size === 1, `ширина страницы разная на вкладках: ${JSON.stringify(W)}`);
  const sb = W.c.iw - W.c.cw; rep.push(`полоса прокрутки: ${sb}px`);
  /* карточка по ссылке: фон не сдвигается */
  await open('?tab=c'); const before = await ev(ST);
  await open('?d=11.11.2026&v=136361'); /* та же карточка, что в test_share_scroll */ const t1 = Date.now(); while (!(await ev('!!document.querySelector("[data-gdwin]")')) && Date.now() - t1 < 10000) await sleep(300);
  const st = await ev(ST);
  rep.push(`окно: ${JSON.stringify(st)} (до: ${JSON.stringify(before)})`);
  if (st.win) {
    chk(st.left === before.left, `при открытии карточки страница сзади сдвинулась: ${before.left} → ${st.left}`);
    const bd = await ev(`(() => { const w = document.querySelector('[data-gdwin]'); let e = w; while (e && e.parentElement && getComputedStyle(e).position !== 'fixed') e = e.parentElement; const f = [...document.querySelectorAll('body *')].find((x) => getComputedStyle(x).position === 'fixed' && x.getBoundingClientRect().width >= innerWidth - 1 && x.getBoundingClientRect().height >= innerHeight - 1); return !!f; })()`);
    chk(bd, 'затемнение не на весь экран');
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await sleep(800);
    const after = await ev(ST); rep.push(`после закрытия: ${JSON.stringify(after)}`);
    chk(!after.win && after.left === before.left && after.cw === before.cw, `после закрытия карточки раскладка изменилась ${JSON.stringify(after)}`);
  } else fails.push('окно карточки 11.11.2026:136361 не открылось');
  await cmd('Target.closeTarget', { targetId });
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'компьютер, ширина страницы:\n  ' + fails.join('\n  '));
console.log('OK test_desktop_width.browser: ширина одинакова на всех вкладках, карточка без сдвига фона');
