// 16.11.2026: оперативные новости на сайте (data/live.json → вкладка «Новости»), 390 px:
// 1) новость из live.json видна в ленте дня со временем публикации; та же ссылка, что уже есть в данных дня, второй раз не показывается;
// 2) новость, пришедшая после открытия (GDX.pollLive — то же, что опрос раз в 2 минуты), не вставляется под палец: видна плашка «N новая новость»;
// 3) нажатие плашки показывает новость наверху, плашка исчезает;
// 4) календарь: новостей нет (они только во вкладке «Новости»); при фильтре органа его заседания и приказы по всем дням сразу раскрыты.
// Как test_org_filter.browser.mjs: без Chrome — SKIP (при GD_REQUIRE_BROWSER=1 — падает). Запуск: node tests/js/test_live_news.browser.mjs
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
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log('SKIP test_live_news.browser: нет Chrome'); process.exit(0); }


const SITE = await siteServer(); const BASE = SITE.BASE; // сайт как web/build.sh: код + data/*.json по месяцам (пункт 10)

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-chrome-'));
const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${prof}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, no) => { let b = ''; const t = setTimeout(() => no(new Error('Chrome не запустился: ' + b)), 60000);
  ch.stderr.on('data', (x) => { b += x; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } }); });

const ws = new WebSocket(wsUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let seq = 0; const wait = new Map(); const evs = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const [ok, no] = wait.get(m.id); wait.delete(m.id); m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result); } else if (m.method) evs.push(m); };
const cmd = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++seq; wait.set(id, [ok, no]); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const now = new Date(); const D = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
const LIVE = (items) => fs.writeFileSync(path.join(SITE.dir, 'data', 'live.json'), JSON.stringify({ upd: D + ' 12:00', items }));
const A = { o: 'gov', d: D, tm: '07:15', t: 'Тест: оперативная новость Правительства, уже опубликованная к открытию страницы', u: 'http://government.ru/news/999001/' };
const B = { o: 'gd', d: D, tm: '07:40', t: 'Тест: новость Госдумы, пришедшая после открытия страницы', u: 'http://duma.gov.ru/news/999002/' };
LIVE([A]);
const ST = `(() => ({ day: (document.querySelector('[data-nday]') || {}).textContent || '', items: [...document.querySelectorAll('[data-newsitem]')].map((e) => e.innerText.replace(/\\n/g, ' | ')),
  nnew: (document.querySelector('[data-nnew]') || {}).textContent || '' }))()`;
const fails = []; const rep = []; const chk = (c, msg) => { if (!c) fails.push(msg); };
try {
  const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
  await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s);
  await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, s);
  const ev = async (x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s)).result.value;
  await cmd('Page.navigate', { url: `${BASE}/?tab=d` }, s);
  const t0 = Date.now(); while (!(await ev(`[...document.querySelectorAll('[data-newsitem]')].some((e) => e.innerText.includes('999001') || e.getAttribute('href') === ${JSON.stringify(A.u)})`)) && Date.now() - t0 < 20000) await sleep(300);
  let r = await ev(ST); rep.push(`открытие: ${r.day} · ${r.items.length} новостей, плашка «${r.nnew}»`);
  const a = r.items.find((x) => x.includes('оперативная новость Правительства'));
  chk(!!a, `новость из live.json не показана: ${JSON.stringify(r.items.slice(0, 3))}`);
  chk(a && a.includes('07:15'), `у оперативной новости нет времени: ${a}`);
  chk(!r.nnew, `плашка видна сразу при открытии: «${r.nnew}»`);
  /* пришла новая */
  LIVE([B, A]); await ev('window.__GDX.pollLive()'); await sleep(500);
  r = await ev(ST); rep.push(`после опроса: плашка «${r.nnew}», в ленте новая: ${r.items.some((x) => x.includes('пришедшая после открытия'))}`);
  chk(/1 новая новость/.test(r.nnew), `нет плашки «1 новая новость»: «${r.nnew}»`);
  chk(!r.items.some((x) => x.includes('пришедшая после открытия')), 'новая новость вставилась в ленту до нажатия плашки');
  await ev(`document.querySelector('[data-nnew]').click()`); await sleep(600);
  r = await ev(ST); rep.push(`после нажатия: первая «${(r.items[0] || '').slice(0, 60)}», плашка «${r.nnew}»`);
  chk((r.items[0] || '').includes('пришедшая после открытия'), `после нажатия новая новость не наверху: ${r.items[0]}`);
  chk(!r.nnew, 'плашка не исчезла после нажатия');
  /* повтор той же ссылки (новость уже в live) не дублируется */
  chk(r.items.filter((x) => x.includes('пришедшая после открытия')).length === 1, 'новость показана дважды');
  /* календарь (решение владельца 16.11.2026): новостей в календаре нет — только заседания, приказы, указания;
     при фильтре органа его события по всем дням сразу раскрыты, без нажатия на день */
  await cmd('Page.navigate', { url: `${BASE}/?tab=c&view=days` }, s);
  const t1 = Date.now(); while (!(await ev(`!!document.querySelector('[data-calgrid]')`)) && Date.now() - t1 < 20000) await sleep(300); await sleep(1500);
  const cn = await ev(`({ txt: document.body.innerText.includes('оперативная новость Правительства'), mk: document.querySelectorAll('[data-mk=news],[data-daynews],[data-newsitem]').length })`);
  rep.push(`календарь: новостей ${cn.mk}, текст новости ${cn.txt}`);
  chk(!cn.txt && cn.mk === 0, 'в календаре показаны новости — они должны быть только во вкладке «Новости»');
  await cmd('Page.navigate', { url: `${BASE}/?tab=c&view=days&org=minfin` }, s);
  const t2 = Date.now(); while (!(await ev(`!!document.querySelector('[data-orgfeed] [data-day]')`)) && Date.now() - t2 < 20000) await sleep(300);
  const of = await ev(`(() => { const ds = [...document.querySelectorAll('[data-orgfeed] [data-day]')]; return { n: ds.length, open: ds.filter((d) => d.getAttribute('data-dayopen') === '1').length, orgs: [...new Set([...document.querySelectorAll('[data-orgfeed] [data-dayorg]')].map((e) => e.getAttribute('data-dayorg')))], news: document.querySelectorAll('[data-orgfeed] [data-newsitem]').length }; })()`);
  rep.push(`календарь, фильтр «Минфин»: ${JSON.stringify(of)}`);
  chk(of.n > 0 && of.open === of.n, `при фильтре органа дни не раскрыты: ${JSON.stringify(of)}`);
  chk(of.orgs.length === 1 && of.orgs[0] === 'minfin' && of.news === 0, `при фильтре органа чужие органы или новости: ${JSON.stringify(of)}`);
  await cmd('Target.closeTarget', { targetId });
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
rep.forEach((x) => console.log('  ' + x));
assert.deepEqual(fails, [], 'оперативные новости:\n  ' + fails.join('\n  '));
console.log('OK test_live_news.browser: новости из live.json со временем, плашка «новые», без вставки под палец');
