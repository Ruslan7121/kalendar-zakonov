// Пункт 10 (12.11.2026) в настоящем браузере: данные по месяцам (data/*.json, web/gdx.ts).
//  — главная без ссылки: до показа календаря запрошены только core и месяц последнего дня/текущий, сентябрь не грузится;
//  — ссылка в другой месяц (?d=30.09.2026&tab=d) подгружает этот месяц и показывает его день;
//  — ссылка ?d=22.10.2026&v=136156: октябрьская карточка открыта; в списке дня есть законопроекты вне повестки (пункт 2);
//  — нет файла месяца (404): плашка «Не удалось загрузить данные: октябрь 2026» вместо пустого календаря, «Повторить» —
//    после восстановления файла месяц показывается.
// 390 px и 1366 px. Нужен Chrome (как test_share_scroll.browser). Запуск: node tests/js/test_months.browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { loadCanvas } from './load_canvas.mjs';
import { siteServer } from './site_server.mjs';

const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_months.browser: нет Chrome'); process.exit(0); }
const T = await loadCanvas(['CAL', 'DAYS']);
const SITE = await siteServer(); const BASE = SITE.BASE;
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
const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 3 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];
const ev = async (s, e) => (await cmd('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, s)).result.value;
const until = async (s, e, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await ev(s, e); if (v || Date.now() - t0 > ms) return v; await sleep(200); } };
const months = () => SITE.log.filter((p) => p.startsWith('/data/')).map((p) => path.basename(p).replace(/\.[0-9a-f]{10}\.json$/, ''));
const off = T.CAL.p.find((p) => p.d === '22.10.2026').a.filter((x) => x[5] === 'v').map((x) => x[0]);
const fails = []; const rep = [];
try {
  for (const W of WIDTHS) {
    const open = async (url) => { const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' }); const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
      await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s); await cmd('Network.enable', {}, s); await cmd('Network.setCacheDisabled', { cacheDisabled: true }, s);
      await cmd('Emulation.setDeviceMetricsOverride', { width: W.w, height: W.h, deviceScaleFactor: W.dpr, mobile: W.mobile }, s);
      if (W.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
      SITE.log.length = 0; await cmd('Page.navigate', { url: BASE + url }, s); return { s, close: () => cmd('Target.closeTarget', { targetId }) }; };
    const tag = (x) => `${W.w}px ${x}`;
    // 1) главная
    { const p = await open('/'); const ok = await until(p.s, `!!document.querySelector('main') && document.body.innerText.includes('Календарь законов') && !document.querySelector('[data-gd-load]')`);
      await sleep(2500); const got = months();
      if (!ok) fails.push(tag('/: страница не отрисовалась'));
      if (!got.includes('core') || !got.includes('m-2026-11')) fails.push(tag(`/: не запрошены core и ноябрь: ${got}`));
      if (got.includes('m-2026-09')) fails.push(tag(`/: сентябрь загружен без запроса: ${got}`));
      rep.push(tag(`/: запрошено ${got.join(', ')}`)); await p.close(); }
    // 2) день другого месяца
    { const p = await open('/?d=30.09.2026&tab=d'); const ok = await until(p.s, `!!document.querySelector('[data-newsday="30.09.2026"]') && document.querySelector('[data-newsday="30.09.2026"]').innerText.includes('Госдума')`); // раздел «Новости» — лента по дням
      if (!ok) fails.push(tag('?d=30.09.2026&tab=d: день 30.09.2026 не показан ' + JSON.stringify(await ev(p.s, `document.body.innerText.slice(0, 300)`))));
      if (!months().includes('m-2026-09')) fails.push(tag(`?d=30.09.2026: сентябрь не запрошен: ${months()}`));
      rep.push(tag(`?d=30.09.2026&tab=d: ${months().join(', ')}`)); await p.close(); }
    // 3) октябрьская карточка и законопроекты вне повестки
    { const p = await open('/?d=22.10.2026&v=136156'); const ok = await until(p.s, `!!document.querySelector('[data-ivk="22.10.2026851582-8"] [data-ivs]') || (!!document.querySelector('[data-ivk="22.10.2026851582-8"][data-ivside]') && !!document.querySelector('[data-cardpane] [data-panecard="851582-8"]'))`); // П12: от 1200 px карточка — в панели справа
      if (!ok) fails.push(tag('?d=22.10.2026&v=136156: карточка 851582-8 не раскрыта'));
      const seen = await ev(p.s, `(() => { const t = document.body.innerText; return ${JSON.stringify(off)}.filter((b) => t.includes(b)).length; })()`);
      if (seen !== off.length) fails.push(tag(`22.10.2026: видно ${seen} из ${off.length} законопроектов вне повестки`));
      rep.push(tag(`?d=22.10.2026&v=136156: карточка открыта, вне повестки видно ${seen}/${off.length}`)); await p.close(); }
    // 4) нет файла октября → ошибка, затем «Повторить»
    { SITE.fail = ['m-2026-10.']; const p = await open('/?d=22.10.2026&v=136156');
      const e = await until(p.s, `(() => { const x = document.querySelector('[data-gd-load="err"]'); return x ? x.innerText : ''; })()`);
      if (!/Не удалось загрузить данные: октябрь 2026/.test(e || '')) fails.push(tag(`нет файла октября: нет плашки ошибки (${JSON.stringify(e)})`));
      const cal = await ev(p.s, `!!document.body.innerText.includes('22.10.2026') && !document.querySelector('[data-gd-load]')`); if (cal) fails.push(tag('нет файла октября: показан календарь без данных'));
      SITE.fail = []; await ev(p.s, `(() => { const b = [...document.querySelectorAll('[data-gd-load="err"] button')].find((x) => /Повторить/.test(x.textContent)); b && b.click(); return !!b; })()`);
      const back = await until(p.s, `!document.querySelector('[data-gd-load]') && document.body.innerText.includes('851582-8')`);
      if (!back) fails.push(tag('«Повторить»: октябрь не показан после восстановления файла'));
      rep.push(tag(`нет файла октября: «${(e || '').split('\n')[0]}»; после «Повторить» — ${back ? 'день показан' : 'НЕТ'}`)); await p.close(); }
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'подгрузка по месяцам:\n  ' + fails.join('\n  '));
console.log(`OK test_months.browser: ${rep.length} проверок (${WIDTHS.map((w) => w.w + 'px').join(', ')})`);
