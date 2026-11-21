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
      const days = await ev(p.s, `[...document.querySelectorAll('[data-omday]')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())`) || [];
      chk(days.length === 7 && days.every((x) => /^[А-Яа-я]{2} \d{1,2}$/.test(x)), `полоса дней без цифр документов: ${JSON.stringify(days)}`);
      const dayN = tl.reduce((a, x) => a + x.n, 0);
      // неделя и месяц: документов не меньше, чем за день; подпись периода и стрелки
      await click(p, '[data-ommode="week"]'); await sleep(400); const wk = (await tiles(p) || []).reduce((a, x) => a + x.n, 0); chk(wk >= dayN, `за неделю ${wk} меньше, чем за день ${dayN}`);
      const wl = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); chk(/\d+[–-]\d+ [а-я]+|\d+ [а-я]{3} – /.test(wl || ''), `подпись недели: ${wl}`);
      await click(p, '[data-ommode="month"]'); await sleep(400); const mn = (await tiles(p) || []).reduce((a, x) => a + x.n, 0); chk(mn >= wk, `за месяц ${mn} меньше, чем за неделю ${wk}`);
      const ml = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); chk(/^[А-Я][а-я]+ \d{4}/.test(ml || ''), `подпись месяца: ${ml}`);
      { const l0 = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); await click(p, '[data-omprev]'); await sleep(300); const l1 = await ev(p.s, `document.querySelector('[data-omlabel]').innerText`); chk(l1 !== l0, 'стрелка ‹ не листает период'); await click(p, '[data-omnext]'); await sleep(300); chk((await ev(p.s, `document.querySelector('[data-omlabel]').innerText`)) === l0, 'стрелка › не вернула период'); chk(await ev(p.s, `(() => { const b = document.querySelector('[data-omprev]'); const c = getComputedStyle(b); return c.borderTopWidth === '0px' && b.offsetWidth === 34; })()`), 'стрелки не такие, как в календаре месяца (без рамки, 34 px)'); }
      chk(await ev(p.s, `!document.querySelector('[data-calfab]') || getComputedStyle(document.querySelector('[data-calfab]')).visibility === 'hidden'`), 'в карте видна плавающая кнопка «Календарь»');
      chk(await ev(p.s, `!/Нажмите на плитку/.test(document.body.innerText)`), 'в карте есть подсказка «Нажмите на плитку»');
      chk(await ev(p.s, `![...document.querySelectorAll('[data-omtile]')].some((e) => e.innerText.split('\\n').length > 3)`), 'число и слово в плитке не в одну строку');
      // календарь месяца открывается по подписи, день выбирается нажатием
      await click(p, '[data-ommode="day"]'); await sleep(300); await click(p, '[data-omlabel]'); await sleep(300);
      chk(await ev(p.s, `!!document.querySelector('[data-ommonth] [data-omcell]')`), 'календарь месяца не открылся');
      chk(await ev(p.s, `!!document.querySelector('[data-ommonthhint]') && /Показать \\(\\d+\\)|Закрыть/.test((document.querySelector('[data-omshow]') || {}).innerText || '')`), 'в календаре нет пояснения и кнопки «Показать»');
      await ev(p.s, `(() => { const c = [...document.querySelectorAll('[data-omcell]')].find((e) => e.querySelector('i')); if (c) c.click(); })()`); await sleep(300);
      chk(await ev(p.s, `!document.querySelector('[data-ommonth]')`), 'календарь не закрылся после выбора дня');
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
      await ev(p.s, `(() => { const el = document.querySelector('[data-omdoc]'); const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(60, 300)], changedTouches: [mk(60, 300)] })); el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(280, 306)] })); })()`); await sleep(400);
      chk(await ev(p.s, `!!document.querySelector('[data-orgmap="map"]')`), 'слайд слева направо не вернул на карту');
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
      chk(await ev(p.s, `!!document.querySelector('[data-omperiod]') && /Выбрано:/.test(document.querySelector('[data-ompsel]').innerText)`), 'в «Фильтрах» нет блока «Период» с подписью «Выбрано:»');
      { const cnt = async () => Number(((await ev(p.s, `document.querySelector('[data-zapply]').innerText`)).match(/\d+/) || [0])[0]);
        await click(p, '[data-ompmode="day"]'); await sleep(300); const nd = await cnt();
        await click(p, '[data-ompmode="month"]'); await until(p.s, `/\d/.test(document.querySelector('[data-zapply]').innerText)`, 6000); const nm = await cnt();
        await click(p, '[data-ompmode="year"]'); await until(p.s, `/\d/.test(document.querySelector('[data-zapply]').innerText)`, 8000); const ny = await cnt();
        chk(nm >= nd && ny >= nm, `период в фильтрах не расширяет число карточек: день ${nd}, месяц ${nm}, год ${ny}`);
        // как в «Итогах»: месяц раскрывается списком, в нём отмечают несколько месяцев
        await click(p, '[data-ompmode="month"]'); await sleep(200);
        if (!(await ev(p.s, `!!document.querySelector('[data-ompick]')`))) await click(p, '[data-ompmode="month"]');
        await sleep(300);
        chk(await ev(p.s, `document.querySelectorAll('[data-ompitem]').length >= 2 && document.querySelector('[data-ompick]').getAttribute('aria-multiselectable') === 'true'`), 'месяц не раскрылся списком с множественным выбором');
        const n1 = await cnt();
        await ev(p.s, `(() => { const o = [...document.querySelectorAll('[data-ompitem]')].find((b) => b.getAttribute('aria-pressed') === 'false'); if (o) o.click(); })()`); await sleep(400);
        chk((await cnt()) >= n1, 'второй месяц не добавился к выбору');
        chk(await ev(p.s, `[...document.querySelectorAll('[data-ompitem]')].filter((b) => b.getAttribute('aria-pressed') === 'true').length >= 2`), 'отметка нескольких месяцев не работает');
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
    { const p = await open('/?tab=c&d=22.10.2026&v=136156'); chk(await until(p.s, `!!document.querySelector('[data-cpane="days"]')`), 'ссылка ?d=&v= не открыла «По дням»'); await p.close(); }
    rep.push(tag('карта органов, период, лента, окно документа'));
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
assert.deepEqual(fails, [], 'карта органов:\n  ' + fails.join('\n  '));
console.log('OK test_org_map.browser: ' + rep.join('; '));
