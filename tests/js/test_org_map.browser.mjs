// 21.11.2026: «Работа госорганов» — карта органов (решение владельца), 390 и 1366 px: плитки без новостей, период День/Неделя/Месяц, календарь месяца,
// лента органа с короткими названиями без «Кого коснётся», окно документа, переключатель «По дням». Без Chrome — SKIP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { siteServer } from './site_server.mjs';

const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 3 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];
const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_org_map.browser: нет Chrome'); process.exit(0); }

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
      await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s); await cmd('Network.enable', {}, s); await cmd('Network.setCacheDisabled', { cacheDisabled: true }, s);
      await cmd('Emulation.setDeviceMetricsOverride', { width: W.w, height: W.h, deviceScaleFactor: W.dpr, mobile: W.mobile }, s);
      if (W.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
      await cmd('Page.navigate', { url: BASE + url }, s);
      return { s, close: () => cmd('Target.closeTarget', { targetId }) }; };
    const click = (p, sel) => ev(p.s, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.click(); return true; })()`);
    const tiles = (p) => ev(p.s, `[...document.querySelectorAll('[data-omtile]')].map((e) => ({ o: e.dataset.omtile, n: +(e.innerText.match(/(\\d+)\\s*$/m) || [0, 0])[1], t: e.innerText.replace(/\\n/g, ' ') }))`);
    { const p = await open('/?tab=c'); // по умолчанию — карта органов
      chk(await until(p.s, `!!document.querySelector('[data-cpane="map"] [data-omtile]')`), 'нет карты органов с плитками по умолчанию');
      const tl = await tiles(p) || []; chk(tl.length >= 2, `плиток ${tl.length}`);
      chk(!tl.some((x) => /новост/i.test(x.t)), 'в плитках есть «новости»');
      chk(await ev(p.s, `!document.querySelector('[data-omday], [data-omweek]')`), 'на карте осталась полоса дней недели');
      const dayN = tl.reduce((a, x) => a + x.n, 0);
      // неделя и месяц: документов не меньше, чем за день; подпись периода и стрелки
      await click(p, '[data-ommode="week"]'); await sleep(400); const wk = (await tiles(p) || []).reduce((a, x) => a + x.n, 0); chk(wk >= dayN, `за неделю ${wk} меньше, чем за день ${dayN}`);
      const wl = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); chk(/\d+[–-]\d+ [а-я]+|\d+ [а-я]{3} – /.test(wl || ''), `подпись недели: ${wl}`);
      await click(p, '[data-ommode="month"]'); await sleep(400); const mn = (await tiles(p) || []).reduce((a, x) => a + x.n, 0); chk(mn >= wk, `за месяц ${mn} меньше, чем за неделю ${wk}`);
      const ml = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); chk(/^[А-Я][а-я]+ \d{4}/.test(ml || ''), `подпись месяца: ${ml}`);
      { const l0 = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); await click(p, '[data-omprev]'); await sleep(300); const l1 = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); chk(l1 !== l0, 'стрелка ‹ не листает период'); await click(p, '[data-omnext]'); await sleep(300); chk((await ev(p.s, `document.querySelector('[data-omlabel]').innerText`)) === l0, 'стрелка › не вернула период'); chk(await ev(p.s, `(() => { const b = document.querySelector('[data-omprev]'); const c = getComputedStyle(b); return c.borderTopWidth === '0px' && b.offsetWidth === 36; })()`), 'стрелки не такие, как в календаре месяца (без рамки, 36 px)'); }
      chk(await ev(p.s, `!document.querySelector('[data-calfab]') || getComputedStyle(document.querySelector('[data-calfab]')).visibility === 'hidden'`), 'в карте видна плавающая кнопка «Календарь»');
      chk(await ev(p.s, `!/Нажмите на плитку/.test(document.body.innerText)`), 'в карте есть подсказка «Нажмите на плитку»');
      chk(await ev(p.s, `![...document.querySelectorAll('[data-omtile]')].some((e) => e.innerText.split('\\n').length > 3)`), 'число и слово в плитке не в одну строку');
      // календарь месяца открывается по подписи, день выбирается нажатием
      await click(p, '[data-ommode="day"]'); await sleep(300); await click(p, '[data-omlabel]'); await sleep(300);
      chk(await ev(p.s, `!!document.querySelector('[data-ommonth] [data-omcell]')`), 'календарь месяца не открылся');
      chk(await ev(p.s, `!!document.querySelector('[data-phhint]') && /Можно выбрать несколько дней/.test(document.querySelector('[data-phhint]').innerText)`), 'в календаре нет пояснения про выбор нескольких дней');
      { const c0 = await ev(p.s, `[...document.querySelectorAll('[data-omcell][aria-pressed="true"]')].length`);
        await ev(p.s, `(() => { const c = [...document.querySelectorAll('[data-omcell]')].find((e) => e.getAttribute('aria-pressed') === 'false' && e.querySelector('i')); if (c) c.click(); })()`); await sleep(300);
        chk(await ev(p.s, `!!document.querySelector('[data-ommonth]')`) && await ev(p.s, `document.querySelectorAll('[data-omcell][aria-pressed="true"]').length`) > c0, 'в календаре нельзя отметить несколько дней'); }
      chk(await ev(p.s, `!!document.querySelector('[data-omdone]')`), 'в раскрытом календаре нет кнопки, которая его сворачивает');
      await click(p, '[data-omdone]'); await sleep(300);
      chk(await ev(p.s, `!document.querySelector('[data-ommonth]')`), 'кнопка в календаре не свернула его');
      // лента органа: названия короткие, без «Кого коснётся», окно документа
      const first = await ev(p.s, `(document.querySelector('[data-omtile]') || {}).dataset && document.querySelector('[data-omtile]').dataset.omtile`); chk(!!first, 'нет первой плитки');
      await click(p, '[data-omtile]'); await sleep(500);
      chk(await ev(p.s, `!!document.querySelector('[data-orgmap="feed"]')`), 'лента органа не открылась');
      const cards = await ev(p.s, `[...document.querySelectorAll('[data-omdoc]')].map((e) => ({ t: (e.querySelector('[data-omtitle]') || {}).innerText || '', all: e.innerText }))`) || [];
      chk(cards.length > 0, 'в ленте нет карточек');
      chk(cards.every((c) => c.t.length >= 8 && c.t.length <= 100), `названия не 8–100 знаков: ${JSON.stringify(cards.filter((c) => c.t.length < 8 || c.t.length > 100).map((c) => c.t.length))}`);
      chk(cards.every((c) => !/Кого коснётся/i.test(c.all)), 'в превью есть «Кого коснётся»');
      chk(cards.every((c) => !/…$|\.\.\.$/.test(c.t) && (c.t.match(/«/g) || []).length === (c.t.match(/»/g) || []).length && (c.t.match(/\(/g) || []).length === (c.t.match(/\)/g) || []).length), `название обрезано с многоточием или незакрытой кавычкой: ${JSON.stringify(cards.filter((c) => /…$|\.\.\.$/.test(c.t) || (c.t.match(/«/g) || []).length !== (c.t.match(/»/g) || []).length).map((c) => c.t).slice(0, 3))}`);
      chk(cards.every((c) => !/Новость/.test(c.all)), 'в ленте есть новости');
      await click(p, '[data-omdoc]'); await sleep(700);
      const win = await ev(p.s, `(document.querySelector('[data-orgdocwin]') || {}).innerText || ''`); chk(/суть/i.test(win) && /полное название/i.test(win), 'в окне документа нет «Сути» или полного названия');
      chk(await ev(p.s, `document.documentElement.scrollWidth <= innerWidth + 1`), 'горизонтальная прокрутка');
      await click(p, '[data-gdclose]'); await sleep(500); chk(await ev(p.s, `!document.querySelector('[data-orgdocwin]')`), 'окно документа не закрылось');
      chk(await ev(p.s, `getComputedStyle(document.querySelector('[data-ombar]')).position === 'sticky'`), 'строка с кнопкой «назад» не закреплена');
      chk(await ev(p.s, `!!document.querySelector('[data-orgmap="feed"][data-noswipe]')`), 'лента органа не защищена от листания вкладок (data-noswipe): свайп назад не сработает');
      // слайд слева направо по ленте возвращает на карту
      // жест с пустой области экрана ниже списка и под углом (dy до трети dx): тоже возвращает на карту
      await ev(p.s, `(() => { const el = document.body; const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(80, innerHeight - 30)], changedTouches: [mk(80, innerHeight - 30)] })); el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(230, innerHeight - 90)] })); })()`); await sleep(400);
      chk(await ev(p.s, `!!document.querySelector('[data-orgmap="map"]')`), 'слайд (с пустой области, под углом) не вернул на карту');
      await click(p, '[data-omtile]'); await sleep(500);
      await ev(p.s, `(() => { const el = document.querySelector('[data-omdoc]'); const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(60, 300)], changedTouches: [mk(60, 300)] })); el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(280, 306)] })); })()`); await sleep(400);
      chk(await ev(p.s, `!!document.querySelector('[data-orgmap="map"]')`), 'слайд слева направо не вернул на карту');
      await click(p, '[data-omtile]'); await sleep(500);
      await click(p, '[data-omtile]'); await sleep(400);
      chk(await ev(p.s, `(() => { const b = document.querySelector('[data-omback]'); return getComputedStyle(b).borderTopWidth === '0px'; })()`), 'кнопка «назад» с рамкой (старый вид)');
      await ev(p.s, `window.scrollTo(0, 400)`); await sleep(200); chk(await ev(p.s, `document.querySelector('[data-omback]').getBoundingClientRect().top < 140`), 'кнопка «назад» уехала при прокрутке ленты'); await ev(p.s, `window.scrollTo(0, 0)`);
      await click(p, '[data-omback]'); await sleep(300); chk(await ev(p.s, `!!document.querySelector('[data-orgmap="map"]')`), 'кнопка «назад» не вернула карту');
      // «По дням» — прежний календарь
      chk(await ev(p.s, `!document.querySelector('[data-omduma]')`), 'на карте осталась плитка «Госдума и заседания»');
      await p.close(); }
    { const p = await open('/?tab=c&view=days'); chk(await until(p.s, `!!document.querySelector('[data-cpane="days"] [data-day]')`), '?view=days не открыл «По дням»');
      await click(p, '[data-cview="map"]'); chk(await until(p.s, `!!document.querySelector('[data-cpane="map"] [data-omtile]')`, 8000), 'кнопка «Карта органов» не вернула карту'); await p.close(); }
    { const p = await open('/?tab=c&org=none'); await sleep(1500);
      chk(await ev(p.s, `document.querySelectorAll('[data-omtile]').length === 0`), 'фильтр «Убрать все» не скрыл плитки карты');
      await p.close(); }
    { const p = await open('/?tab=c'); chk(await until(p.s, `!!document.querySelector('[data-omtile]')`, 8000), 'нет плиток');
      await click(p, '[data-omtile]'); await sleep(60);
      chk(await ev(p.s, `/omIn/.test(getComputedStyle(document.querySelector('[data-orgmap="feed"]')).animationName)`), 'у перехода в ленту нет анимации');
      await sleep(500); await click(p, '[data-omback]'); await sleep(60);
      chk(await ev(p.s, `/omBack/.test(getComputedStyle(document.querySelector('[data-orgmap="map"]')).animationName)`), 'у возврата на карту нет анимации');
      await p.close(); }
    { const p = await open('/?tab=c'); chk(await until(p.s, `!!document.querySelector('[data-omtile]')`, 8000), 'нет плиток для кнопки «Сегодня»');
      // на другом дне вместо «День» — «Сегодня»; нажатие возвращает на сегодня
      await click(p, '[data-omprev]'); await sleep(300);
      chk(await ev(p.s, `!!document.querySelector('[data-omtoday]')`), 'на другом дне нет кнопки «Сегодня»');
      await click(p, '[data-omtoday]'); await sleep(300);
      const t1 = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`);
      chk(await ev(p.s, `!document.querySelector('[data-omtoday]')`) && !/суббот|воскресен/i.test(t1), 'кнопка «Сегодня» откинула на выходной или не вернула на сегодня: ' + t1);
      await p.close(); }
    { const p = await open('/?tab=c'); chk(await until(p.s, `!!document.querySelector('[data-omtile]')`, 8000), 'нет плиток для фильтра');
      // плитка открывает документы органа только за выбранный день
      const dayTxt = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`);
      await click(p, '[data-zbar-open]'); await sleep(400);
      chk(await ev(p.s, `(() => { const g = document.querySelector('[data-zgroups]'); return !g || getComputedStyle(g).display === 'none'; })()`), 'на карте в «Фильтрах» остались метки «Для кого / Тема / Что меняется»');
      chk(await ev(p.s, `!!document.querySelector('[data-calorg]')`), 'в «Фильтрах» нет блока органов');
      chk(await ev(p.s, `!document.querySelector('[data-cof="gd"]')`), 'в фильтре органов есть Госдума');
      await click(p, '[data-cofnone], [data-calorg] button:nth-of-type(2)'); await sleep(150);
      const org = await ev(p.s, `(() => { const l = [...document.querySelectorAll('label[data-cof]')].find((x) => x.getAttribute('data-cof') !== 'gov' && x.getAttribute('data-cof') !== 'sf'); return l ? l.getAttribute('data-cof') : ''; })()`);
      await click(p, `label[data-cof="${org}"]`); await sleep(200);
      chk(await ev(p.s, `!document.querySelector('[data-omperiod]') && !document.querySelector('[data-ompmode]')`), 'период остался в «Фильтрах»: он должен быть на странице');
      await click(p, '[data-zclose]'); await sleep(300);
      { const cnt = async () => { await click(p, '[data-zbar-open]'); await until(p.s, `/\\d/.test((document.querySelector('[data-zapply]') || {}).innerText || '')`, 8000); const n = Number(((await ev(p.s, `document.querySelector('[data-zapply]').innerText`)).match(/\d+/) || [0])[0]); await click(p, '[data-zclose]'); await sleep(250); return n; };
        await click(p, '[data-ommode="day"]'); await sleep(300); const nd = await cnt();
        await click(p, '[data-ommode="month"]'); await sleep(300); const nm = await cnt();
        await click(p, '[data-ommode="year"]'); await sleep(500); const ny = await cnt();
        chk(nm >= nd && ny >= nm, `период на странице не влияет на число карточек в «Фильтрах»: день ${nd}, месяц ${nm}, год ${ny}`);
        // как в «Итогах»: месяц раскрывается списком, в нём отмечают несколько месяцев
        await click(p, '[data-ommode="month"]'); await sleep(300); await click(p, '[data-omlabel]'); await sleep(300);
        chk(await ev(p.s, `document.querySelectorAll('[data-omitem]').length >= 2 && !!document.querySelector('[data-omlist] [role=listbox][aria-multiselectable="true"]')`), 'месяц не раскрылся списком с множественным выбором');
        await ev(p.s, `(() => { const o = [...document.querySelectorAll('[data-omitem]')].find((b) => b.getAttribute('aria-pressed') === 'false'); if (o) o.click(); })()`); await sleep(400);
        chk(await ev(p.s, `[...document.querySelectorAll('[data-omitem]')].filter((b) => b.getAttribute('aria-pressed') === 'true').length >= 2`), 'отметка нескольких месяцев не работает');
        await click(p, '[data-omlabel]'); await sleep(200);
        await click(p, '[data-zbar-open]'); await sleep(400);
      }
      const cta = await ev(p.s, `document.querySelector('[data-zapply]').innerText`);
      chk(/^Показать \d+ карточ/.test(cta), 'кнопка фильтра не показывает число карточек: ' + cta);
      await click(p, '[data-zapply]'); await sleep(700);
      chk(await ev(p.s, `!!document.querySelector('[data-orgmap="feed"]')`), 'после «Показать N карточек» нет ленты');
      chk(await ev(p.s, `!document.querySelector('[data-ommode]') && !document.querySelector('[data-ommonth]')`), 'в ленте фильтра остались День/Неделя/Месяц или календарь');
      chk(await ev(p.s, `document.querySelectorAll('[data-omdayhdr]').length >= 1 && /\\d+ [а-яё]+/i.test(document.querySelector('[data-omdayhdr]').textContent)`), 'в ленте нет дат над карточками');
      { const want = Number((cta.match(/\d+/) || [0])[0]); const got = await ev(p.s, `document.querySelectorAll('[data-omdoc]').length`); chk(got === want, `число карточек в ленте (${got}) не равно числу на кнопке (${want})`); }
      await click(p, '[data-omback]'); await sleep(500);
      chk(await ev(p.s, `!!document.querySelector('[data-orgmap="map"]') && !!document.querySelector('[data-omtile]')`), 'назад из ленты фильтра не вернул карту со всеми органами');
      await p.close(); }
    { const p = await open('/?tab=i'); chk(await until(p.s, `!!document.querySelector('[data-immode]')`, 10000), 'на «Пленарных заседаниях» нет единого выбора периода');
      chk(await ev(p.s, `['day', 'week', 'month', 'year'].every((k) => !!document.querySelector('[data-immode="' + k + '"]'))`), 'на «Пленарных заседаниях» нет кнопок День / Неделя / Месяц / Год');
      await click(p, '[data-imprev]'); await sleep(400);
      chk(await ev(p.s, `!!document.querySelector('[data-imtoday]')`), 'на «Пленарных заседаниях» на другом дне нет кнопки «Сегодня»');
      await click(p, '[data-imtoday]'); await sleep(400);
      chk(await ev(p.s, `!document.querySelector('[data-imtoday]')`), 'кнопка «Сегодня» не вернула на последний день голосований');
      await click(p, '[data-imlabel]'); await sleep(300);
      chk(await ev(p.s, `!!document.querySelector('[data-immonth] [data-imcell]') && !!document.querySelector('[data-phhint]')`), 'на «Пленарных заседаниях» подпись периода не открыла календарь');
      await click(p, '[data-imdone]'); await sleep(300);
      chk(await ev(p.s, `!document.querySelector('[data-immonth]')`), 'на «Пленарных заседаниях» кнопка не свернула календарь');
      await p.close(); }
    /* порядок вкладок: «Пленарные заседания» перед «Работой госорганов»; «Наверх» над звёздочкой интересов */
    { const p = await open('/?tab=l'); chk(await until(p.s, `!!document.querySelector('[data-myfab]')`, 10000), 'нет звёздочки на «Вступают в силу»');
      const names = await ev(p.s, `[...document.querySelectorAll('[role=tablist] [role=tab]')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim()).slice(0, 4)`) || [];
      chk(names.length === 4 && /Вступают/.test(names[0]) && /Пленарные/.test(names[1]) && /Работа/.test(names[2]) && /Новости/.test(names[3]), `порядок вкладок: ${JSON.stringify(names)}`);
      if (W.mobile) { await ev(p.s, `window.scrollTo(0, 600)`); await sleep(700);
        const r = await ev(p.s, `(() => { const u = document.querySelector('[aria-label="Наверх"]'); const f = document.querySelector('[data-myfab]'); if (!u || !f) return null; const a = u.getBoundingClientRect(), b = f.getBoundingClientRect(); return { ub: a.bottom, ft: b.top, vis: getComputedStyle(u).visibility }; })()`);
        chk(r && r.vis === 'visible' && r.ub <= r.ft + 1, `кнопка «Наверх» не выше звёздочки: ${JSON.stringify(r)}`); }
      await p.close(); }
    /* несколько недель: нажатие на день добавляет его неделю, итоги суммируются (обе страницы) */
    for (const [url, ns, ready] of [['/?tab=c', 'om', '[data-omtile]'], ['/?tab=i', 'im', '[data-itile]']]) {
      const p = await open(url); chk(await until(p.s, `!!document.querySelector('${ready}')`, 10000), `нет данных для проверки недель (${ns})`);
      await click(p, `[data-${ns}mode="week"]`); await sleep(400); await click(p, `[data-${ns}label]`); await sleep(300);
      const one = await ev(p.s, `document.querySelector('[data-${ns}label]').innerText`);
      await ev(p.s, `(() => { const c = [...document.querySelectorAll('[data-${ns}cell]')].filter((e) => e.getAttribute('aria-pressed') === 'false'); if (c[0]) c[0].click(); })()`); await sleep(250);
      await ev(p.s, `(() => { const c = [...document.querySelectorAll('[data-${ns}cell]')].filter((e) => e.getAttribute('aria-pressed') === 'false'); if (c[7]) c[7].click(); })()`); await sleep(350);
      const many = await ev(p.s, `document.querySelector('[data-${ns}label]').innerText`);
      chk(/недел/.test(many) && many !== one, `выбор нескольких недель не суммируется (${ns}): «${one}» → «${many}»`);
      chk(await ev(p.s, `document.querySelectorAll('[data-${ns}cell][aria-pressed="true"]').length >= 14`), `в календаре не подсвечены несколько недель (${ns})`);
      await click(p, `[data-${ns}done]`); await sleep(250); await p.close(); }
    /* пустые состояния с подсказкой и «назад» от левого края окна */
    { const p = await open('/?tab=c'); chk(await until(p.s, `!!document.querySelector('[data-omtile]')`, 8000), 'нет плиток для проверки пустого состояния');
      await click(p, '[data-omnext]'); await sleep(500);
      chk(await ev(p.s, `!!document.querySelector('[data-empty="map"]') && /документов нет/.test(document.querySelector('[data-empty="map"]').innerText)`), 'в день без документов нет пустого состояния');
      chk(await ev(p.s, `/Открыть \\d+ [а-я]+/.test((document.querySelector('[data-empty="map"] [data-emptybtn]') || {}).innerText || '')`), 'в пустом состоянии нет кнопки «Открыть <день>»');
      await click(p, '[data-empty="map"] [data-emptybtn]'); await sleep(500);
      chk(await ev(p.s, `!document.querySelector('[data-empty="map"]') && document.querySelectorAll('[data-omtile]').length > 0`), 'кнопка пустого состояния не открыла день с документами');
      await p.close(); }
    { const p = await open('/?tab=i'); chk(await until(p.s, `!!document.querySelector('[data-immode]')`, 10000), 'нет «Пленарных заседаний» для проверки пустого состояния');
      await click(p, '[data-immode="week"]'); await sleep(300);
      for (let i = 0; i < 14; i++) { await click(p, '[data-imprev]'); await sleep(60); }
      await sleep(400);
      chk(await ev(p.s, `!!document.querySelector('[data-empty="plen"]')`), 'в период без голосований нет пустого состояния');
      await click(p, '[data-empty="plen"] [data-emptybtn]'); await sleep(500);
      chk(await ev(p.s, `!document.querySelector('[data-empty="plen"]')`), 'кнопка «К последнему дню» не вернула к данным');
      if (W.mobile) { // свайп от левого края окна вправо закрывает карточку
        await click(p, '[data-itile]'); await until(p.s, `!!document.querySelector('[data-gdwin]')`, 6000); await sleep(500);
        await ev(p.s, `(() => { const w = document.querySelector('[data-gdwin]'); const r = w.getBoundingClientRect(); const mk = (x, y) => new Touch({ identifier: 7, target: w, clientX: x, clientY: y }); const x0 = r.left + 8, y0 = r.top + 200; w.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(x0, y0)], changedTouches: [mk(x0, y0)] })); w.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(x0 + 60, y0 + 4)], changedTouches: [mk(x0 + 60, y0 + 4)] })); w.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(x0 + 130, y0 + 6)], changedTouches: [mk(x0 + 130, y0 + 6)] })); w.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [mk(x0 + 130, y0 + 6)] })); })()`);
        await sleep(600);
        chk(await ev(p.s, `!document.querySelector('[data-gdwin]')`), 'свайп от левого края не закрыл окно карточки'); }
      await p.close(); }
    /* «Мои интересы»: явный выбор меток, «Только моё», звёздочка «Для вас», запоминание */
    { let p = await open('/?tab=i'); chk(await until(p.s, `!!document.querySelector('[data-itile]') && !!document.querySelector('[data-myfab]')`, 10000), 'на «Пленарных заседаниях» нет звёздочки «Мои интересы»');
      await ev(p.s, `localStorage.removeItem('kz_my_v1')`);
      await click(p, '[data-myfab]'); await until(p.s, `!!document.querySelector('[data-mysheet]')`, 6000); await sleep(400); // без меток звёздочка сразу открывает выбор
      chk(await ev(p.s, `/Откройте приложение в боте/.test(document.querySelector('[data-mynotif]').innerText)`), 'вне Telegram нет подсказки про уведомления');
      const tag = await ev(p.s, `(() => { const b = [...document.querySelectorAll('[data-mysheet] button[aria-pressed]')][0]; if (!b) return ''; b.click(); return b.textContent.trim(); })()`); await sleep(200);
      chk(!!tag, 'в окне «Мои интересы» нет меток');
      await click(p, '[data-mydone]'); await sleep(600);
      await click(p, '[data-myfab]'); await until(p.s, `!!document.querySelector('[data-mypop]')`, 4000);
      chk(await ev(p.s, `!!document.querySelector('[data-mycount]') && document.querySelector('[data-mycount]').innerText === '1'`), 'на звёздочке нет счётчика меток');
      await click(p, '[data-myon]'); await sleep(200); await click(p, '[data-myfab]'); await sleep(400);
      const n0 = await ev(p.s, `document.querySelectorAll('[data-itile]').length`);
      await sleep(300);
      const n1 = await ev(p.s, `document.querySelectorAll('[data-itile]').length`);
      chk(n1 <= n0, `«Только моё» не сузило список: ${n0} → ${n1}`);
      chk(await ev(p.s, `[...document.querySelectorAll('[data-itile]')].every((e) => !!e.querySelector('[data-mystar]'))`), 'не на всех оставшихся плитках звёздочка «Для вас»');
      chk(await ev(p.s, `(JSON.parse(localStorage.getItem('kz_my_v1') || '{}').tags || []).length === 1 && JSON.parse(localStorage.getItem('kz_my_v1')).on === true`), 'интересы не записались в память');
      await p.close();
      p = await open('/?tab=i', true); await until(p.s, `!!document.querySelector('[data-myfab]')`, 10000); await sleep(600);
      await click(p, '[data-myfab]'); await until(p.s, `!!document.querySelector('[data-mypop]')`, 4000);
      chk(await ev(p.s, `document.querySelector('[data-myon]').getAttribute('aria-checked') === 'true' && document.querySelector('[data-mysum]').innerText.includes(${JSON.stringify(tag)})`), 'после повторного открытия интересы не запомнились');
      await ev(p.s, `localStorage.removeItem('kz_my_v1')`); await p.close();
      p = await open('/?tab=l', true); chk(await until(p.s, `!!document.querySelector('[data-myfab]')`, 10000), 'во вкладке «Вступают в силу» нет звёздочки «Мои интересы»');
      await ev(p.s, `localStorage.setItem('kz_my_v1', JSON.stringify({ t: 1, on: true, tags: [${JSON.stringify(tag)}], n: {} }))`); await p.close();
      p = await open('/?tab=l', true); await until(p.s, `!!document.querySelector('[data-myfab]')`, 10000); await sleep(800);
      chk(await ev(p.s, `!!document.querySelector('[data-lfound]') || !!document.querySelector('[data-empty="laws"]')`), 'в «Вступают в силу» «Только моё» не включил подбор по меткам');
      await ev(p.s, `localStorage.removeItem('kz_my_v1')`); await p.close(); }
    { const p = await open('/?tab=c&d=22.10.2026&v=136156'); chk(await until(p.s, `!!document.querySelector('[data-cpane="days"]')`), 'ссылка ?d=&v= не открыла «По дням»'); await p.close(); }
    rep.push(tag('карта органов, период, лента, окно документа'));
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
assert.deepEqual(fails, [], 'карта органов:\n  ' + fails.join('\n  '));
console.log('OK test_org_map.browser: ' + rep.join('; '));
