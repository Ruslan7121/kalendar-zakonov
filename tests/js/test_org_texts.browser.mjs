// 19.11.2026 (правило 15): на странице нет видимой плитки документа органа без «Сути» и «Кого коснётся».
// 390 px и 1366 px. Каркас — как test_day_groups.browser.mjs. Без Chrome — SKIP (при GD_REQUIRE_BROWSER=1 — падает).
// Запуск: node tests/js/test_org_texts.browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { siteServer } from './site_server.mjs';

const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 3 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];
const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_org_texts.browser: нет Chrome'); process.exit(0); }

const SITE = await siteServer(); const BASE = SITE.BASE;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-chrome-'));
const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${prof}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, no) => { let b = ''; const t = setTimeout(() => no(new Error('Chrome не запустился: ' + b)), 60000);
  ch.stderr.on('data', (x) => { b += x; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } }); });

const ws = new WebSocket(wsUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let seq = 0; const wait = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const [ok, no] = wait.get(m.id); wait.delete(m.id); m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result); } };
const cmd = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++seq; wait.set(id, [ok, no]); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (s, x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true }, s)).result.value;
const until = async (s, x, ms = 20000) => { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await ev(s, x); if (v) return v; await sleep(250); } return v; };

const fails = []; const rep = [];
try {
  for (const W of WIDTHS) {
    const tag = (x) => `${W.w}px ${x}`; const chk = (c, m) => { if (!c) fails.push(tag(m)); };
    const open = async (url) => { const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' }); const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
      await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s); await cmd('Network.enable', {}, s); await cmd('Network.setCacheDisabled', { cacheDisabled: true }, s);
      await cmd('Emulation.setDeviceMetricsOverride', { width: W.w, height: W.h, deviceScaleFactor: W.dpr, mobile: W.mobile }, s);
      if (W.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
      await cmd('Page.navigate', { url: BASE + url }, s);
      if (!(await until(s, `!!document.querySelector('main') && !document.querySelector('[data-gd-load]')`))) { rep.push(tag(`${url}: пустая страница, перезагрузка`)); await cmd('Page.reload', { ignoreCache: true }, s); await until(s, `!!document.querySelector('main') && !document.querySelector('[data-gd-load]')`); }
      return { s, close: () => cmd('Target.closeTarget', { targetId }) }; };
    const p = await open('/?tab=c');
    // 17.11 — все документы с текстами: раскрыть день и группы, открыть плитку, проверить «Суть» и «Кого коснётся»
    const hdr = await until(p.s, `!!document.querySelector('[data-day="17.11.2026"] [data-dayhdr]')`);
    chk(hdr, 'нет дня 17.11.2026');
    await ev(p.s, `document.querySelector('[data-day="17.11.2026"] [data-dayhdr]').click()`); await sleep(700);
    await ev(p.s, `[...document.querySelectorAll('[data-day="17.11.2026"] [data-grphdr]')].forEach((h) => { if (h.getAttribute('aria-expanded') !== 'true') h.click(); })`); await sleep(1200);
    const n17 = await ev(p.s, `document.querySelectorAll('[data-day="17.11.2026"] [data-orgitem]').length`);
    chk(n17 > 0, `17.11: нет плиток органов (${n17})`);
    const row = await ev(p.s, `(() => { const r = document.querySelector('[data-day="17.11.2026"] [data-orgrow]'); if (!r) return false; r.click(); return true; })()`);
    chk(row, '17.11: не нажалась плитка органа');
    await sleep(700);
    const card = await ev(p.s, `(() => { const b = document.querySelector('[data-orgbody]'); if (!b) return { err: 'нет окна' }; const sut = !!b.querySelector('[data-orgsut]'); const who = /кого косн[её]тся/i.test(b.innerText || ''); return { sut, who, t: (b.innerText || '').slice(0, 180) }; })()`);
    chk(card && card.sut && card.who, `17.11: в карточке нет «Сути» и «Кого коснётся»: ${JSON.stringify(card)}`);
    await ev(p.s, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await sleep(400);

    // 05.11: приказ № 131н без «Кого коснётся» в данных есть, на странице плитки быть не должно
    const d05 = await ev(p.s, `!!document.querySelector('[data-day="05.11.2026"]')`);
    if (d05) {
      await ev(p.s, `document.querySelector('[data-day="05.11.2026"] [data-dayhdr]').click()`); await sleep(700);
      await ev(p.s, `[...document.querySelectorAll('[data-day="05.11.2026"] [data-grphdr]')].forEach((h) => { if (h.getAttribute('aria-expanded') !== 'true') h.click(); })`); await sleep(1200);
    }
    const hit = await ev(p.s, `(() => { const t = [...document.querySelectorAll('[data-day="05.11.2026"] [data-orgitem], [data-orgitem]')].map((e) => e.innerText || '').join('\\n'); return /131н/.test(t); })()`);
    chk(!hit, '05.11: на странице видна плитка приказа № 131н без «Кого коснётся»');
    // поиск по номеру тоже не должен открывать скрытую плитку
    await ev(p.s, `(() => { const i = document.querySelector('input[data-cq]'); if (!i) return false; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '131н'); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await sleep(900);
    const sh = await ev(p.s, `(() => { const tiles = [...document.querySelectorAll('[data-orgitem]')].filter((e) => /131н/.test(e.innerText || '')); return tiles.length; })()`);
    chk(sh === 0, `поиск «131н» показал скрытую плитку: ${sh}`);
    rep.push(tag(`17.11 плиток ${n17}, карточка ${JSON.stringify(card && { sut: card.sut, who: card.who })}, 131н на странице ${hit}, в поиске ${sh}`));
    await p.close();
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'плитки ORG без текстов:\n  ' + fails.join('\n  '));
console.log(`OK test_org_texts.browser: нет видимых плиток без «Сути» и «Кого коснётся» (${WIDTHS.map((w) => w.w + 'px').join(', ')})`);
