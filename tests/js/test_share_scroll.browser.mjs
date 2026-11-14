// Правило 11 в настоящем браузере: ссылка «Поделиться» ?d=&v= открывает карточку законопроекта отдельным окном (лист снизу
// на телефоне, окно по центру на компьютере) с начала — шапка [data-ivs] целиком в окне, окно в пределах экрана, есть затемнение
// и кнопка закрытия; окно закрывается Escape, крестиком и нажатием на затемнение. 390 px (touch), 1100 и 1366 px.
// Там же — кнопки карточки: на телефоне «Поделиться карточкой» внизу, без «Скопировать ссылку на голосование» и сырого адреса.
// Сайт собирается как web/build.sh (код + data/*.json по месяцам, tests/js/site_server.mjs) во временную папку и раздаётся локально (127.0.0.1).
// Нужен Chrome/Chromium: $CHROME или google-chrome / chromium в PATH; без браузера тест пропускается (код 0, «SKIP»),
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

const CASES = ['11.11.2026:136361', '10.11.2026:136304', '11.11.2026:136349', '11.11.2026:136378', '10.11.2026:136283', '10.11.2026:136277', '22.10.2026:136156'];
// 390 / 1100 / 1366 px: карточка открывается отдельным окном поверх списка (новый вид, решение владельца 14.11.2026).
const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 3 }, { w: 1100, h: 900, mobile: false, dpr: 1 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];

const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_share_scroll.browser: нет Chrome'); process.exit(0); }

const T = await loadCanvas(['DATA']);
const bill = (d, v) => ((T.DATA[d] || '').split('\n').find((l) => l.split('|')[0] === v) || '').split('|')[1];

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

const MEASURE = (k) => `(() => {
  const w = document.querySelector('[data-gdwin] [data-ivk="${k}"]'); if (!w) return { err: 'нет окна карточки [data-gdwin] с [data-ivk=${k}]' };
  const win = w.closest('[data-gdwin]'); const h = w.querySelector('[data-ivs]'); if (!h) return { err: 'в окне нет шапки [data-ivs]' };
  const hr = h.getBoundingClientRect(), wr = win.getBoundingClientRect();
  const p = w.querySelector('[data-panel]'); const vis = (e) => !!e.offsetParent; const tx = (e) => (e.textContent || '').trim();
  const bs = p ? [...p.querySelectorAll('button,a')].filter(vis) : [];
  const copy = bs.filter((e) => /Скопировать ссылку|Ссылка скопирована/.test(tx(e))).length;
  const raw = p ? [...p.querySelectorAll('*')].filter((e) => vis(e) && !e.children.length && /^https:\\/\\/ruslan7121\\.github\\.io\\/kalendar-zakonov\\/\\?d=/.test(tx(e))).length : 0;
  const sh = bs.filter((e) => /Поделиться карточкой/.test(tx(e))); const s0 = sh[0];
  const lk = bs.filter((e) => /^(Законопроект|Голосование)/.test(tx(e)));
  const sr = s0 && s0.getBoundingClientRect(); const pr = p && p.getBoundingClientRect();
  const share = s0 ? { n: sh.length, bottom: !!s0.closest('[data-share-bottom]'), inRow: lk.some((l) => l.parentElement === s0.parentElement.parentElement), last: lk.every((l) => l.getBoundingClientRect().bottom <= sr.top + 1), gap: pr.bottom - sr.bottom } : null;
  const bd = document.querySelector('[data-gdmodal]'); const br = bd && bd.getBoundingClientRect();
  return { hTop: hr.top, hBot: hr.bottom, wTop: wr.top, wBot: wr.bottom, wH: wr.height, st: win.scrollTop, vh: innerHeight, copy, raw, share, links: lk.length, closeBtn: !!win.querySelector('[data-gdclose]'), backdrop: !!br && br.width >= innerWidth - 1 && br.height >= innerHeight - 1, sheet: wr.bottom >= innerHeight - 1 };
})()`;

const fails = []; const rep = [];
try {
  for (const W of WIDTHS) for (const c of CASES) {
    const [d, v] = c.split(':'); const b = bill(d, v); assert.ok(/^\d+-\d+$/.test(b || ''), `${c}: нет законопроекта в DATA`);
    const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' });
    const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
    await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s);
    await cmd('Emulation.setDeviceMetricsOverride', { width: W.w, height: W.h, deviceScaleFactor: W.dpr, mobile: W.mobile }, s);
    if (W.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
    await cmd('Page.navigate', { url: `${BASE}/?d=${d}&v=${v}` }, s);
    let r; const t0 = Date.now();
    await sleep(3600); // alignDeep повторяет выравнивание до 3 с
    for (;;) { r = (await cmd('Runtime.evaluate', { expression: MEASURE(d + b), returnByValue: true }, s)).result.value; if (!r.err || Date.now() - t0 > 15000) break; await sleep(300); }
    const err = (await cmd('Runtime.evaluate', { expression: 'document.getElementById("root").childElementCount', returnByValue: true }, s)).result.value ? '' : ' (страница не отрисовалась)';
    const tag = `${W.w}px ${c} (${b})`;
    if (r.err) fails.push(`${tag}: ${r.err}${err}`);
    else {
      rep.push(`${tag}: окно ${r.wTop.toFixed(0)}–${r.wBot.toFixed(0)} из ${r.vh}, шапка ${r.hTop.toFixed(0)}–${r.hBot.toFixed(0)}, высота окна ${r.wH.toFixed(0)}`);
      // новый вид: карточка — отдельное окно поверх затемнённого списка; открыта с начала и целиком в пределах экрана
      if (r.st > 1) fails.push(`${tag}: окно открыто не с начала (прокрутка ${r.st})`);
      if (r.hTop < r.wTop - 1 || r.hBot > r.vh + 0.5) fails.push(`${tag}: шапка карточки не в окне (${r.hTop.toFixed(1)}–${r.hBot.toFixed(1)}, окно ${r.vh})`);
      if (r.wTop < -1 || r.wBot > r.vh + 1) fails.push(`${tag}: окно выходит за экран (${r.wTop.toFixed(1)}–${r.wBot.toFixed(1)})`);
      if (!r.backdrop) fails.push(`${tag}: нет затемнения на весь экран`);
      if (!r.closeBtn) fails.push(`${tag}: нет кнопки закрытия`);
      if (W.mobile && !r.sheet) fails.push(`${tag}: на телефоне окно должно быть листом, прижатым к низу экрана`);
      // Правило 11, мобильная версия: на телефоне нет «Скопировать ссылку на голосование» и сырого адреса,
      // «Поделиться карточкой» — одна кнопка внизу карточки, ниже ссылок; на широкой версии кнопка в том же блоке ссылок.
      if (!r.share) fails.push(`${tag}: нет кнопки «Поделиться карточкой»`);
      else if (W.mobile) {
        if (r.copy) fails.push(`${tag}: на телефоне видна «Скопировать ссылку на голосование»`);
        if (r.raw) fails.push(`${tag}: на телефоне виден сырой адрес ссылки`);
        if (r.share.n !== 1 || !r.share.bottom || r.share.inRow || !r.share.last || r.share.gap > 40) fails.push(`${tag}: «Поделиться карточкой» не внизу карточки ${JSON.stringify(r.share)}`);
      } else if (r.share.bottom || !r.share.inRow) fails.push(`${tag}: на широкой версии «Поделиться карточкой» не в блоке ссылок ${JSON.stringify(r.share)}`);
      if (!r.links) fails.push(`${tag}: нет ссылок «Законопроект»/«Голосование»`);
      // закрытие: поочередно Escape, крестик, нажатие на затемнение
      const how = CASES.indexOf(c) % 3; const closeJs = how === 0 ? `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))` : how === 1 ? `document.querySelector('[data-gdclose]').click()` : `document.querySelector('[data-gdmodal]').click()`;
      await cmd('Runtime.evaluate', { expression: closeJs }, s); await sleep(500);
      const still = (await cmd('Runtime.evaluate', { expression: `!!document.querySelector('[data-gdwin]')`, returnByValue: true }, s)).result.value;
      if (still) fails.push(`${tag}: окно не закрылось (${['Escape', 'крестик', 'затемнение'][how]})`);
    }
    await cmd('Target.closeTarget', { targetId });
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'правило 11 нарушено:\n  ' + fails.join('\n  '));
console.log(`OK test_share_scroll.browser: ${rep.length} открытий (${WIDTHS.map((w) => w.w + 'px').join(', ')})`);
