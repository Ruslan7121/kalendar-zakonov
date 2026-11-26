// 16.11.2026: шапка телефона (390 px) в настоящем браузере.
// 1) На всех четырех вкладках под вкладками — строка «поиск + Фильтры», промежутки между строками шапки одинаковые, шапка одной высоты.
// 2) При прокрутке шапка не сдвигается (строка «Календарь законов» не уходит вверх).
// 3) «Итоги»: в «Фильтрах» есть период; месяцы выбираются по нескольку и суммируются; поиск сужает список.
// 4) «Новости»: в «Фильтрах» выбирается орган — показаны его новости за все загруженные дни.
// 5) Клавиатура: когда список листают пальцем, поле поиска теряет фокус.
// 8) Строка «… ещё собирается» одинакова при переходе с главной и по ссылке ?tab=c (пересчет после загрузки месяца).
// 7) Нажатие «Календарь» на «Вступают в силу»: сетка календаря не подпрыгивает.
// 6) С первого кадра загрузки шапка и список стоят на месте, строка поиска «Итогов» и «Новостей» не мигает, общий h1 не мелькает.
// Как test_org_filter.browser.mjs: без Chrome — SKIP (при GD_REQUIRE_BROWSER=1 — падает). Запуск: node tests/js/test_mobile_head.browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { siteServer } from './site_server.mjs';

const which = (c) => {
  try {
    return execFileSync('sh', ['-c', `command -v ${c}`])
      .toString()
      .trim();
  } catch {
    return '';
  }
};
const CHROME =
  process.env.CHROME ||
  ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) {
  if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден');
  console.log('SKIP test_mobile_head.browser: нет Chrome');
  process.exit(0);
}

const SITE = await siteServer();
const BASE = SITE.BASE; // сайт как web/build.sh: код + data/*.json по месяцам (пункт 10)

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-chrome-'));
const ch = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${prof}`,
    '--remote-debugging-port=0',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
const wsUrl = await new Promise((ok, no) => {
  let b = '';
  const t = setTimeout(() => no(new Error('Chrome не запустился: ' + b)), 60000);
  ch.stderr.on('data', (x) => {
    b += x;
    const m = b.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) {
      clearTimeout(t);
      ok(m[1]);
    }
  });
});

const ws = new WebSocket(wsUrl);
await new Promise((ok, no) => {
  ws.onopen = ok;
  ws.onerror = no;
});
let seq = 0;
const wait = new Map();
const evs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && wait.has(m.id)) {
    const [ok, no] = wait.get(m.id);
    wait.delete(m.id);
    m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result);
  } else if (m.method) evs.push(m);
};
const cmd = (method, params = {}, sessionId) =>
  new Promise((ok, no) => {
    const id = ++seq;
    wait.set(id, [ok, no]);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEAD = `(() => { const mt = document.querySelector('[data-mtop]'); if (!mt) return null; const k = [...mt.children].filter((e) => !e.hasAttribute('data-mnav') && e.getBoundingClientRect().height > 0).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; });
  const row = mt.querySelector('[data-msearch], [data-hslot]'); return { k, top: Math.round(mt.getBoundingClientRect().top), h: Math.round(document.querySelector('[data-gdbar]').getBoundingClientRect().height),
  input: !!(row && row.querySelector('input')), fbtn: !!(row && [...row.querySelectorAll('button')].some((b) => /Фильтры/.test(b.textContent))) }; })()`;
const CLICK = (sel) =>
  `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`;
const TYPE = (sel, v) =>
  `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const st = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; st.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
const fails = [];
const rep = [];
const chk = (c, msg) => {
  if (!c) fails.push(msg);
};
try {
  const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
  await cmd('Page.enable', {}, s);
  await cmd('Runtime.enable', {}, s);
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, s);
  await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true }, s)).result.value;
  const open = async (tab, sel) => {
    await cmd('Page.navigate', { url: `${BASE}/?tab=${tab}&view=days` }, s);
    const t0 = Date.now();
    while (!(await ev(`!!document.querySelector(${JSON.stringify(sel)})`)) && Date.now() - t0 < 20000) await sleep(300);
    await sleep(600);
  };
  /* кадры с самого начала загрузки: шапка, список и строка поиска не прыгают и не мигают */
  await cmd(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source: `window.__fr = []; (function f() { const b = document.querySelector('[data-gdbar]'), w = document.querySelector('[data-swipe]'), sl = document.querySelector('[data-hslot]'), h1 = document.querySelector('main>h1');
    if (b && w) window.__fr.push([Math.round(b.getBoundingClientRect().top), Math.round(w.getBoundingClientRect().top), sl ? sl.childElementCount : -1, h1 ? h1.getBoundingClientRect().height : 0]); requestAnimationFrame(f); })();`,
    },
    s,
  );
  const H = {};
  for (const [tab, sel] of [
    ['l', '[data-lq]'],
    ['c', '[data-cq]'],
    ['i', '[data-iq]'],
    ['d', '[data-nq]'],
  ]) {
    await open(tab, sel);
    const h = await ev(HEAD);
    H[tab] = h;
    rep.push(`${tab}: ${JSON.stringify(h)}`);
    const fr = await ev('window.__fr');
    const bt = new Set(fr.map((x) => x[0])),
      wt = new Set(fr.map((x) => x[1]));
    chk(
      bt.size === 1 && wt.size === 1,
      `${tab}: при открытии шапка или список сдвигаются (шапка ${[...bt]}, список ${[...wt]})`,
    );
    chk(
      fr.every((x) => x[3] === 0),
      `${tab}: при открытии мелькает общий заголовок страницы`,
    );
    if (tab === 'i' || tab === 'd')
      chk(
        fr.every((x) => x[2] === 1),
        `${tab}: строка поиска в шапке мигает (${fr.map((x) => x[2]).join('')})`,
      );
    chk(h && h.input && h.fbtn, `${tab}: в шапке нет строки «поиск + Фильтры» ${JSON.stringify(h)}`);
    if (h) {
      const gaps = h.k.slice(1).map((r, i) => r[0] - h.k[i][1]);
      chk(
        gaps.every((g) => g === gaps[0]),
        `${tab}: разные промежутки в шапке ${gaps}`,
      );
    }
    await ev('window.scrollTo(0, 600)');
    await sleep(400);
    const h2 = await ev(HEAD);
    chk(h && h2 && h2.top === h.top, `${tab}: шапка сдвинулась при прокрутке (${h && h.top} → ${h2 && h2.top})`);
  }
  chk(
    new Set(Object.values(H).map((h) => h && h.h)).size === 1,
    `шапка разной высоты на вкладках ${JSON.stringify(Object.fromEntries(Object.entries(H).map(([k, h]) => [k, h && h.h])))}`,
  );
  /* нажатие «Календарь» на «Вступают в силу»: выезжающая сетка и вставшая на место — на одной высоте (раньше прыжок на 2 px вверх) */
  await open('l', '[data-lq]');
  await ev(
    `window.__cg = []; (function f() { const k = document.querySelector('[data-swpeek] [data-calmrow]'), g = document.querySelector('[data-swipe] [data-calmrow]'); const e = k || g; if (e) window.__cg.push(Math.round(e.getBoundingClientRect().top)); if (window.__cg.length < 400) requestAnimationFrame(f); })()`,
  );
  /* 16.11.2026 (решение владельца): разделы — внизу экрана, «Календарь» называется «Работа министерств», сетка — в окне у кнопки; над списком — строка месяца */
  const nav = await ev(
    `(() => { const n = document.querySelector('[data-mnav]'); if (!n) return null; const r = n.getBoundingClientRect(); return { fixed: getComputedStyle(n).position, gap: Math.round(window.innerHeight - r.bottom), tabs: n.querySelectorAll('[role=tab]').length, ic: n.querySelectorAll('[role=tab] svg').length }; })()`,
  );
  rep.push(`панель разделов: ${JSON.stringify(nav)}`);
  chk(
    nav && nav.fixed === 'fixed' && nav.gap === 0 && nav.tabs === 4 && nav.ic === 4,
    `панель разделов не внизу экрана или без значков: ${JSON.stringify(nav)}`,
  );
  await ev(
    `[...document.querySelectorAll('[data-mnav] [role=tab]')].find((b) => /Работа/.test(b.textContent)).click()`,
  );
  await sleep(1500); /* 21.11.2026: по умолчанию — карта органов, сетка месяца — в режиме «По дням» */
  const cg = await ev('window.__cg');
  const cgs = [...new Set(cg)];
  rep.push(`строка месяца при переходе: ${cgs}`);
  chk(cg.length > 0 && cgs.length === 1, `календарь подпрыгивает при нажатии «Календарь»: ${cgs}`);
  /* окно календаря: закрыто — скрыто, кнопка открывает его над панелью, в нем целый месяц */
  const POP = `(() => { const c = document.querySelector('[data-swipe] [data-calcol]'), f = document.querySelector('[data-calfab]'); if (!c || !f) return null; const r = c.getBoundingClientRect(); return { vis: getComputedStyle(c).visibility, cells: c.querySelectorAll('[data-calgrid] [role=button]').length, bottom: Math.round(r.bottom), fabTop: Math.round(f.getBoundingClientRect().top) }; })()`;
  const p0 = await ev(POP);
  chk(await ev(CLICK('[data-calfab]')), 'нет кнопки календаря');
  await sleep(1100);
  const p1 = await ev(POP);
  rep.push(`окно календаря: ${JSON.stringify(p0)} → ${JSON.stringify(p1)}`);
  chk(p0 && p0.vis === 'hidden', `окно календаря видно до нажатия кнопки: ${JSON.stringify(p0)}`);
  chk(
    p1 && p1.vis === 'visible' && p1.cells >= 28 && p1.bottom <= p1.fabTop,
    `окно календаря не открылось над кнопкой или в нем не весь месяц: ${JSON.stringify(p1)}`,
  );
  /* 17.11.2026: «Что значат цвета?» — легенда раскрывается, календарь сверху сужается и окно не уходит под шапку; позиция легенды подсвечивает дни, при закрытии окна все сбрасывается */
  const LG = `(() => { const c = document.querySelector('[data-swipe] [data-calcol]'), b = document.querySelector('[data-lgbar]'), hd = document.querySelector('[data-gdbar]'); if (!c || !b) return null; const cells = [...c.querySelectorAll('[data-calgrid] [role=button]')].filter((e) => getComputedStyle(e).pointerEvents !== 'none'); return { open: b.getAttribute('aria-expanded'), top: Math.round(c.getBoundingClientRect().top), hdr: Math.round(hd.getBoundingClientRect().bottom), ch: Math.round(cells[0].getBoundingClientRect().height), items: c.querySelectorAll('[data-lgi]').length, dim: cells.filter((e) => getComputedStyle(e).opacity !== '1').length, on: c.querySelectorAll('[data-lgi][aria-pressed=true]').length }; })()`;
  const l0 = await ev(LG);
  chk(await ev(CLICK('[data-lgbar]')), 'нет кнопки «Что значат цвета?»');
  await sleep(900);
  const l1 = await ev(LG);
  chk(await ev(CLICK('[data-lgi="pg"]')), 'нет позиции «Президент и Правительство» в легенде');
  await sleep(500);
  const l2 = await ev(LG);
  rep.push(`легенда: ${JSON.stringify(l0)} → ${JSON.stringify(l1)} → ${JSON.stringify(l2)}`);
  chk(l0 && l0.open === 'false' && l0.dim === 0, `легенда закрыта по умолчанию: ${JSON.stringify(l0)}`);
  chk(
    l1 && l1.open === 'true' && l1.items === 10 && l1.ch < l0.ch && l1.top >= l1.hdr - 2,
    `легенда не раскрылась / календарь не сузился / окно под шапкой: ${JSON.stringify(l1)}`,
  );
  chk(l2 && l2.on === 1 && l2.dim > 0 && l2.dim < 30, `позиция легенды не подсветила дни: ${JSON.stringify(l2)}`);
  await ev(CLICK('[data-calback]'));
  await sleep(900);
  const p2 = await ev(POP);
  chk(p2 && p2.vis === 'hidden', `окно календаря не закрылось по нажатию мимо: ${JSON.stringify(p2)}`);
  const PL = `(() => { const l = document.querySelector('[data-pendline]'); return l ? l.textContent : ''; })()`;
  const plTap = await ev(PL);
  await open('c', '[data-cq]');
  const plDirect = await ev(PL);
  rep.push(`«ещё собирается»: с главной «${plTap}», по ссылке «${plDirect}»`);
  chk(
    plTap === plDirect,
    `строка «ещё собирается» зависит от того, как открыт календарь: с главной «${plTap}», по ссылке «${plDirect}» (не пересчитана после загрузки месяца)`,
  );
  /* Итоги: два месяца суммируются */
  await open('i', '[data-iq]');
  /* 21.11.2026: период — на странице (единый PeriodHead), в «Фильтрах» его нет */
  chk(await ev(CLICK('[data-ifopen]')), 'Итоги: нет кнопки «Фильтры»');
  await sleep(400);
  chk(await ev(`!document.querySelector('[data-iperiod]')`), 'Итоги: период остался в «Фильтрах»');
  await ev(`[...document.querySelectorAll('.gd-sheet button')].find((b) => /Показать/.test(b.textContent)).click()`);
  await sleep(300);
  chk(
    await ev(`(() => { const t = document.querySelector('[data-imweek], [data-imlabel]'); return !!t; })()`),
    'Итоги: на странице нет выбора периода',
  );
  chk(
    await ev(
      `(() => { const t = document.querySelector('[data-immode="month"]'); if (!t) return false; t.click(); return true; })()`,
    ),
    'Итоги: нет периода «Месяц»',
  );
  await sleep(300);
  await ev(`document.querySelector('[data-imlabel]').click()`);
  await sleep(300);
  const cnt = `document.querySelectorAll('[data-itile]').length`; /* 22.11.2026: считаем плитки законопроектов (строки «законопроектов: N» под датой больше нет) */
  const n1 = await ev(cnt);
  const nm = await ev(`document.querySelectorAll('[data-imitem]').length`);
  /* 27.11.2026: будущие месяцы с назначенными заседаниями (CAL.p, например декабрь по календарю ГД) есть в списке, но итогов
     в них еще нет — для проверки суммирования берется прошедший или текущий месяц */
  const pastM = `[...document.querySelectorAll('[data-imitem]')].find((b) => { const k = b.getAttribute('data-imitem'); const n = new Date(); return b.getAttribute('aria-pressed') === 'false' && k.slice(3) + k.slice(0, 2) <= String(n.getFullYear()) + String(n.getMonth() + 1).padStart(2, '0'); })`;
  if (nm > 1 && (await ev(`!!${pastM}`))) {
    await ev(`${pastM}.click()`);
    await sleep(400);
    const n2 = await ev(cnt);
    const on = await ev(`document.querySelectorAll('[data-imitem][aria-pressed=true]').length`);
    rep.push(`Итоги: один месяц ${n1}, два месяца ${n2}`);
    chk(on === 2 && n2 > n1, `Итоги: месяцы не суммируются (${n1} → ${n2}, выбрано ${on})`);
  }
  await ev(`document.querySelector('[data-imlabel]').click()`);
  await sleep(200);
  const nAll = await ev(cnt);
  await ev(TYPE('[data-iq]', 'бюджет'));
  await sleep(400);
  const nQ = await ev(cnt);
  rep.push(`Итоги: поиск «бюджет» ${nAll} → ${nQ}`);
  chk(nQ >= 0 && nQ < nAll, `Итоги: поиск не сужает список (${nAll} → ${nQ})`);
  /* клавиатура: поле в фокусе, палец ведет по списку — фокус снимается */
  await ev(`document.querySelector('[data-iq]').focus()`);
  chk(
    await ev(`document.activeElement === document.querySelector('[data-iq]')`),
    'Итоги: поле поиска не получило фокус',
  );
  await cmd('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 600 }] }, s);
  for (let i = 1; i <= 5; i++)
    await cmd('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 600 - i * 12 }] }, s);
  await cmd('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, s);
  await sleep(200);
  chk(
    await ev(`document.activeElement !== document.querySelector('[data-iq]')`),
    'клавиатура не прячется при листании (поле осталось в фокусе)',
  );
  /* Новости: орган за все дни */
  await open('d', '[data-nq]');
  chk(await ev(CLICK('[data-nfopen]')), 'Новости: нет кнопки «Фильтры»');
  await sleep(400);
  const org = await ev(
    `(() => { const b = document.querySelector('.gd-sheet [data-zk=nsrc]'); if (!b) return null; b.click(); return b.getAttribute('data-zv'); })()`,
  );
  await sleep(300);
  chk(!!org, 'Новости: в фильтрах нет органов');
  await ev(
    `[...document.querySelectorAll('.gd-sheet button')].find((b) => /Показать|Готово/.test(b.textContent)).click()`,
  );
  await sleep(400);
  const nr = await ev(
    `(() => { const r = document.querySelector('[data-nall]'); if (!r) return null; const it = [...r.querySelectorAll('[data-newsitem]')]; return { n: it.length, orgs: [...new Set(it.map((e) => e.getAttribute('data-newsitem')))], days: r.querySelectorAll('[data-newsday]').length }; })()`,
  );
  rep.push(`Новости: ${org} → ${JSON.stringify(nr)}`);
  chk(nr && nr.n > 0 && nr.orgs.length === 1, `Новости: выбор органа не показал его новости ${JSON.stringify(nr)}`);
  await cmd('Target.closeTarget', { targetId });
} finally {
  try {
    ws.close();
  } catch {}
  ch.kill('SIGKILL');
  SITE.close();
  setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500);
}
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'шапка телефона:\n  ' + fails.join('\n  '));
console.log(
  'OK test_mobile_head.browser: поиск и «Фильтры» на всех вкладках, шапка на месте, периоды суммируются, органы в новостях, клавиатура',
);
