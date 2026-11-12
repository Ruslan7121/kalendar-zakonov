// Пункт 11 (12.11.2026) в настоящем браузере, 390 px (мобильный, touch) и 1366 px:
//  — поиск из адреса ?q= находит законопроект по «Сути» (форели → 1276697-8) и документы других органов (Колокольцев → Совет Федерации);
//  — фильтры из адреса ?w=&c= применяются, счётчики меток в панели «Фильтры» совпадают с «Найдено», поиск + фильтр сужают вместе;
//  — ввод в поиск и выбор метки пишут адрес (q, w/t/c), а параметры d и v старой ссылки убираются;
//  — ссылка «Поделиться» ?d=&v= с лишними параметрами всё равно открывает карточку с шапкой вверху (правило 11), фильтры из адреса не применяются;
//  — октябрьская карточка (22.10.2026, 851582-8) показывает метки.
// Сборка и сервер как в test_org_filter.browser.mjs; без Chrome — SKIP (GD_REQUIRE_BROWSER=1 — падает).
// Запуск: node tests/js/test_search_url.browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { siteServer } from './site_server.mjs';

const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 3 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];
const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_search_url.browser: нет Chrome'); process.exit(0); }

const SITE = await siteServer(); const BASE = SITE.BASE;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-chrome-'));
const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${prof}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, no) => { let b = ''; const t = setTimeout(() => no(new Error('Chrome не запустился: ' + b)), 20000);
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
    // 1) поиск по «Сути» законопроекта и по документам органов
    { const p = await open('/?q=' + encodeURIComponent('форели'));
      const ok = await until(p.s, `document.body.innerText.includes('1276697-8') && /Найдено по запросу/.test(document.body.innerText)`);
      chk(ok, '?q=форели: законопроект 1276697-8 (слово только в «Сути») не найден'); chk((await ev(p.s, CQ)) === 'форели', '?q=: строка поиска не заполнена');
      rep.push(tag(`?q=форели: ${ok ? 'найден 1276697-8' : 'НЕТ'}`)); await p.close(); }
    { const p = await open('/?q=' + encodeURIComponent('Колокольцев'));
      const n = await until(p.s, `document.querySelectorAll('[data-orgitem]').length`);
      chk(n > 0, '?q=Колокольцев: документы Совета Федерации не найдены'); rep.push(tag(`?q=Колокольцев: документов органов ${n}`)); await p.close();
      const p2 = await open('/?q=' + encodeURIComponent('Колокольцев') + '&org=sf'); const n2 = await until(p2.s, `document.querySelectorAll('[data-orgitem]').length`);
      chk(n2 === n && !(await ev(p2.s, `!!document.querySelector('[data-dayorg="gd"]')`)), `?org=sf: фильтр органов из адреса не применён (${n2}/${n})`); await p2.close(); }
    // 2) фильтры из адреса, счётчики, поиск + фильтр
    { const p = await open('/?w=' + encodeURIComponent('Пенсионеры') + '&c=' + encodeURIComponent('Новая выплата или льгота'));
      const N = await until(p.s, FOUND); chk(N > 0, `?w=&c=: нет «Найдено: N» (${N})`);
      chk(await ev(p.s, OPENF), 'нет кнопки «Фильтры»'); await until(p.s, `!!document.querySelector('[data-zc]')`);
      const a = await ev(p.s, ZC('w', 'Пенсионеры')), b = await ev(p.s, ZC('c', 'Новая выплата или льгота'));
      chk(+a === N && +b === N, `счётчики выбранных меток (${a}, ${b}) не равны «Найдено: ${N}»`);
      const sh = await ev(p.s, `(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Показать/.test(x.textContent)); return b ? b.textContent : ''; })()`); chk(sh === `Показать ${N}`, `кнопка «${sh}» ≠ «Показать ${N}»`);
      const tc = +(await ev(p.s, ZC('t', 'Пособия и выплаты'))); chk(tc > 0 && tc <= N, `счётчик «Пособия и выплаты» ${tc}`);
      await ev(p.s, `document.querySelector('[data-zk="t"][data-zv="Пособия и выплаты"]').click()`); await sleep(400);
      const N2 = await ev(p.s, FOUND); chk(N2 === tc, `после выбора «Пособия и выплаты» найдено ${N2}, счётчик был ${tc}`);
      chk((await ev(p.s, LOC)).includes('t=Пособия и выплаты'), `адрес без t=: ${await ev(p.s, LOC)}`);
      const zero = await ev(p.s, `[...document.querySelectorAll('[data-zc]')].filter((b) => b.getAttribute('data-zc') === '0').length`);
      rep.push(tag(`?w=Пенсионеры&c=Новая выплата: найдено ${N}, счётчики ${a}/${b}, «Пособия и выплаты» ${tc} → ${N2}; нулевых меток ${zero}`));
      // поиск + фильтр сужают вместе
      chk(await ev(p.s, TYPE('пенсии')), 'нет строки поиска'); await sleep(500); const N3 = await ev(p.s, FOUND);
      chk(N3 != null && N3 <= N2 && (await ev(p.s, ZC('t', 'Пособия и выплаты'))) === String(N3), `поиск + фильтр: найдено ${N3}, счётчик ${await ev(p.s, ZC('t', 'Пособия и выплаты'))}`);
      chk((await ev(p.s, LOC)).includes('q=пенсии') && (await ev(p.s, LOC)).includes('w=Пенсионеры'), `адрес не обновлён: ${await ev(p.s, LOC)}`);
      rep.push(tag(`+ «пенсии»: ${N3}; адрес ${await ev(p.s, LOC)}`)); await p.close(); }
    // 3) ввод на странице со ссылкой «Поделиться»: d и v уходят из адреса
    { const p = await open('/?d=11.11.2026&v=136361&q=zzzz&w=' + encodeURIComponent('Пенсионеры'));
      const k = '11.11.20261059864-7'; const ok = await until(p.s, `!!document.querySelector('[data-ivk="${k}"] [data-ivs]')`);
      chk(ok, '?d=&v= с лишними параметрами: карточка не раскрыта'); await sleep(1500);
      const m = await ev(p.s, `(() => { const w = document.querySelector('[data-ivk="${k}"]'); const h = w && w.querySelector('[data-ivs]'); if (!h) return null; const r = h.getBoundingClientRect(); return { top: r.top, bot: r.bottom, wTop: w.getBoundingClientRect().top, vh: innerHeight }; })()`);
      chk(m && m.top >= 0 && m.bot <= m.vh && Math.abs(m.wTop - m.top) < 4, `шапка карточки не вверху: ${JSON.stringify(m)}`);
      chk((await ev(p.s, CQ)) === '' && (await ev(p.s, FOUND)) == null, 'параметры фильтров применены вместе со ссылкой «Поделиться»');
      chk(await ev(p.s, TYPE('форели')), 'нет строки поиска'); await sleep(500); const L = await ev(p.s, LOC);
      chk(L.includes('q=форели') && !/[?&](d|v)=/.test(L), `после ввода адрес ${L}`); rep.push(tag(`share+лишние: ${ok ? 'карточка открыта' : 'НЕТ'} ${JSON.stringify(m)}; после ввода ${L}`)); await p.close(); }
    // 4) октябрьская карточка с метками
    { const p = await open('/?d=22.10.2026&v=136156'); const n = await until(p.s, `(() => { const z = document.querySelector('[data-ivk="22.10.2026851582-8"] [data-ztags]'); return z ? z.children.length : 0; })()`);
      chk(n >= 3, `22.10.2026 851582-8: меток ${n}`); rep.push(tag(`22.10.2026 851582-8: меток ${n}`)); await p.close(); }
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'пункт 11:\n  ' + fails.join('\n  '));
console.log(`OK test_search_url.browser: поиск, фильтры в адресе, счётчики (${WIDTHS.map((w) => w.w + 'px').join(', ')})`);
