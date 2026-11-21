// Правило 15: до ORG_HIDE_FROM плитка без текстов видна, пустых блоков «Суть»/«Кого коснётся» нет;
// с этой даты плитка без текстов скрыта. 390 и 1366 px. Без Chrome — SKIP (при GD_REQUIRE_BROWSER=1 — падает).
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
    const p = await open('/?tab=c&view=days');

    // 05.11 — день до границы: приказ № 131н без «Кого коснётся» виден; в карточке есть «Суть», пустого блока who нет
    const d05 = await until(p.s, `!!document.querySelector('[data-day="05.11.2026"] [data-dayhdr]')`);
    chk(d05, 'нет дня 05.11.2026');
    await ev(p.s, `document.querySelector('[data-day="05.11.2026"] [data-dayhdr]').scrollIntoView()`);
    await ev(p.s, `document.querySelector('[data-day="05.11.2026"] [data-dayhdr]').click()`); await sleep(800);
    // в дне открыта одна группа: «Экономика» — там Минфин и приказ № 131н
    const eco = await ev(p.s, `(() => { const h = document.querySelector('[data-day="05.11.2026"] [data-daygrp="eco"] [data-grphdr]'); if (!h) return false; if (h.getAttribute('aria-expanded') !== 'true') h.click(); return true; })()`);
    chk(eco, '05.11: нет группы «Экономика»');
    // плитка показывает краткое название (st), не номер «131н» из полного заголовка
    const TILE = '/бюджетной отчетности об исполнении бюджетов/';
    await until(p.s, `document.querySelector('[data-day="05.11.2026"] [data-daygrp="eco"] [data-grphdr]')?.getAttribute('aria-expanded') === 'true'`, 5000);
    await until(p.s, `[...document.querySelectorAll('[data-day="05.11.2026"] [data-orgitem]')].some((e) => ${TILE}.test(e.innerText || ''))`, 5000);
    const hit = await ev(p.s, `(() => { const tiles = [...document.querySelectorAll('[data-day="05.11.2026"] [data-orgitem]')].filter((e) => ${TILE}.test(e.innerText || '')); if (!tiles.length) return { n: 0, titles: [...document.querySelectorAll('[data-day="05.11.2026"] [data-orgitem]')].map((e) => (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 80)) }; tiles[0].querySelector('[data-orgrow]')?.click(); return { n: tiles.length }; })()`);
    chk(hit && hit.n > 0, `05.11: плитки приказа № 131н нет (${JSON.stringify(hit)})`);
    await sleep(700);
    const card = await ev(p.s, `(() => { const b = document.querySelector('[data-orgbody]'); if (!b) return { err: 'нет окна' }; const sut = !!b.querySelector('[data-orgsut]'); const who = !!b.querySelector('[data-orgwho]'); const empty = /кого косн[её]тся/i.test(b.innerText || '') && !who; return { sut, who, empty, t: (b.innerText || '').slice(0, 200) }; })()`);
    chk(card && card.sut && !card.who && !card.empty, `05.11 № 131н: ожидалась «Суть» без пустого «Кого коснётся»: ${JSON.stringify(card)}`);
    await ev(p.s, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await sleep(400);

    // с 19.11: если есть плитка документа (приказ/указ/…), в карточке должны быть оба текста
    await ev(p.s, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await sleep(300);
    const lateDoc = await ev(p.s, `(() => {
      const kinds = /приказ|указ|постановление|распоряжение|указание|письмо/i;
      const tiles = [...document.querySelectorAll('[data-day] [data-orgitem]')].filter((e) => {
        const d = e.closest('[data-day]')?.getAttribute('data-day') || '';
        return d.slice(6) + d.slice(3, 5) + d.slice(0, 2) >= '20261119' && kinds.test(e.innerText || '');
      });
      if (!tiles.length) return { n: 0 };
      tiles[0].querySelector('[data-orgrow]')?.click();
      return { n: tiles.length, t: (tiles[0].innerText || '').slice(0, 80) };
    })()`);
    await sleep(700);
    let lateCard = { n: lateDoc && lateDoc.n };
    if (lateDoc && lateDoc.n > 0) {
      lateCard = await ev(p.s, `(() => { const b = document.querySelector('[data-orgbody]'); if (!b) return { err: 'нет окна' }; return { sut: !!b.querySelector('[data-orgsut]'), who: !!b.querySelector('[data-orgwho]'), t: (b.innerText || '').slice(0, 120) }; })()`);
      chk(lateCard && lateCard.sut && lateCard.who, `с 19.11 открыта плитка документа без обоих текстов: ${JSON.stringify(lateCard)} / ${JSON.stringify(lateDoc)}`);
      await ev(p.s, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    }
    rep.push(tag(`05.11 131н плиток ${hit && hit.n}, карточка ${JSON.stringify(card && { sut: card.sut, who: card.who, empty: card.empty })}, с 19.11 док. плиток ${lateDoc && lateDoc.n}`));
    await p.close();
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'плитки ORG по правилу 15:\n  ' + fails.join('\n  '));
console.log(`OK test_org_texts.browser: до 19.11 плитки без текстов видны без пустых блоков; с 19.11 скрыты (${WIDTHS.map((w) => w.w + 'px').join(', ')})`);
