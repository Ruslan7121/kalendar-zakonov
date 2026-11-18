// 18.11.2026: окно дня «Работа госорганов» — органы собраны в группы (вариант 2, решение владельца), 390 px и 1366 px:
//  — день 17.11 открывается группами, в строке дня «Парламент N · Президент и Правительство N …»;
//  — все группы закрыты (сам день ничего не разворачивает); нажатие на другую открывает ее и закрывает прежнюю;
//  — в сетке календаря отметки идут по группам (data-mk). Каркас — как в test_search_url.browser.mjs; без Chrome — SKIP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { siteServer } from './site_server.mjs';

const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 3 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];
const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_day_groups.browser: нет Chrome'); process.exit(0); }

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

const FOUND = `(() => { const m = document.body.innerText.match(/Найдено: (\\d+)/); return m ? +m[1] : null; })()`;
const CQ = `(document.querySelector('input[data-cq]') || {}).value`;
const TYPE = (v) => `(() => { const i = document.querySelector('input[data-cq]'); if (!i) return false; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(v)}); i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
const OPENF = `(() => { const b = [...document.querySelectorAll('button')].find((x) => /^☰?Фильтры/.test((x.textContent || '').trim())); if (!b) return false; b.click(); return true; })()`;
const ZC = (k, v) => `(() => { const b = document.querySelector('[data-zk="${k}"][data-zv="${v}"]'); return b ? b.getAttribute('data-zc') : 'нет кнопки'; })()`;
const LOC = `decodeURIComponent(location.search.replace(/\\+/g, ' '))`;
const fails = []; const rep = [];
try {
  for (const W of WIDTHS) {
    const tag = (x) => `${W.w}px ${x}`; const chk = (c, m) => { if (!c) fails.push(tag(m)); };
    const open = async (url) => { const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' }); const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
      await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s); await cmd('Network.enable', {}, s); await cmd('Network.setCacheDisabled', { cacheDisabled: true }, s); // как test_months: без кэша — закрытая вкладка не держит запись кэша
      await cmd('Emulation.setDeviceMetricsOverride', { width: W.w, height: W.h, deviceScaleFactor: W.dpr, mobile: W.mobile }, s);
      if (W.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
      await cmd('Page.navigate', { url: BASE + url }, s);
      // если страница всё же пустая (данные не пришли) — одна перезагрузка, с отметкой в отчёте
      if (!(await until(s, `!!document.querySelector('main') && !document.querySelector('[data-gd-load]')`))) { rep.push(tag(`${url}: пустая страница, перезагрузка`)); await cmd('Page.reload', { ignoreCache: true }, s); await until(s, `!!document.querySelector('main') && !document.querySelector('[data-gd-load]')`); }
      return { s, close: () => cmd('Target.closeTarget', { targetId }) }; };
    { const p = await open('/?tab=c');
      const hdr = await until(p.s, `!!document.querySelector('[data-day="17.11.2026"] [data-dayhdr]')`); chk(hdr, 'нет дня 17.11.2026'); 
      const line = await ev(p.s, `(document.querySelector('[data-day="17.11.2026"] [data-dayorgs]') || {}).textContent`); chk(/Парламент \d+ · Президент и Правительство \d+/.test(line || ''), `строка дня: «${line}»`);
      await ev(p.s, `document.querySelector('[data-day="17.11.2026"] [data-dayhdr]').click()`); await sleep(700);
      const st = () => ev(p.s, `[...document.querySelectorAll('[data-day="17.11.2026"] [data-grphdr]')].map((h) => h.getAttribute('aria-expanded') === 'true' ? 1 : 0).join('')`);
      const s0 = await st(); chk(/^0+$/.test(s0), `день открылся с уже развернутой группой (разворачивать не должно): ${s0}`);
      await ev(p.s, `document.querySelectorAll('[data-day="17.11.2026"] [data-grphdr]')[0].click()`); await sleep(700);
      const s1 = await st(); chk(/^10+$/.test(s1), `после нажатия на первую группу: ${s1}`);
      await ev(p.s, `document.querySelectorAll('[data-day="17.11.2026"] [data-grphdr]')[1].click()`); await sleep(900);
      const s2 = await st(); chk(s2.startsWith('01') && !s2.slice(2).includes('1'), `после нажатия на вторую группу: ${s2}`);
      const gone = await ev(p.s, `!document.querySelector('[data-day="17.11.2026"] [data-daygrp="par"] [data-grpbody]')`); chk(gone, 'прежняя группа не убрана сразу');
      const hy = await ev(p.s, `Math.round(document.querySelector('[data-day="17.11.2026"] [data-daygrp="pg"]').getBoundingClientRect().top)`); chk(hy >= 0 && hy < 260, `заголовок открытой группы ушел с экрана: top=${hy}`);
      const mk = await ev(p.s, `new Set([...document.querySelectorAll('[data-mk]')].map((i) => i.getAttribute('data-mk'))).size`); chk(mk >= 2, `отметки сетки по группам: ${mk}`);
      rep.push(tag(`17.11: «${line}», открыта группа ${s1} → ${s2}, отметок-групп в сетке ${mk}`)); await p.close(); }
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'группы органов:\n  ' + fails.join('\n  '));
console.log(`OK test_day_groups.browser: группы органов в окне дня, аккордеон (${WIDTHS.map((w) => w.w + 'px').join(', ')})`);
