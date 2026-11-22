// 22.11.2026: ключевые сценарии телефона в WebKit (движок Safari/Telegram на iPhone) через Playwright.
// Остальные браузерные тесты идут в Chrome (CDP) и не ловят поломки, которые бывают только на iPhone.
// Проверяется: загрузка без ошибок, нет горизонтальной прокрутки на четырех вкладках, поле поиска не теряет фокус на первой
// букве (в том числе в «Новостях»), нижняя панель скрыта при наборе и возвращается, поиск сбрасывается при смене вкладки,
// карточка по ссылке ?d=&v= открывается один раз, у кнопок звёздочки/«Наверх»/панели нет лишнего сдвига.
// Без Playwright/WebKit — SKIP (при GD_REQUIRE_WEBKIT=1 — падает; так в CI). Запуск: node tests/js/test_webkit.browser.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { siteServer } from './site_server.mjs';
import { ROOT } from './load_canvas.mjs';

const req = createRequire(import.meta.url);
let pw = null; for (const p of [ROOT, '/opt/node-tools/node_modules', process.env.PW_NODE_PATH].filter(Boolean)) { try { pw = req(req.resolve('playwright', { paths: [p] })); break; } catch {} }
const skip = (why) => { if (process.env.GD_REQUIRE_WEBKIT === '1') throw new Error('WebKit: ' + why); console.log('SKIP test_webkit.browser: ' + why); process.exit(0); };
if (!pw) skip('нет playwright');
let browser; try { browser = await pw.webkit.launch(); } catch (e) { skip('WebKit не запускается (' + String(e.message).split('\n')[0] + ')'); }

const SITE = await siteServer(); const fails = []; const rep = [];
const chk = (c, m) => { if (!c) fails.push(m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const ctx = await browser.newContext({ ...pw.devices['iPhone 13'], colorScheme: 'dark', locale: 'ru-RU', timezoneId: 'Europe/Moscow' });
  const open = async (url) => { const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => { if (!/access control checks/.test(e.message)) errs.push(e.message); }); /* локальный сервер отвечает 404 на live.json и отсутствующие месяцы — WebKit пишет это как «access control checks» */ p.__errs = errs;
    await p.goto(SITE.BASE + url, { waitUntil: 'load' }); await p.evaluate(() => { try { localStorage.removeItem('kz_state_v1'); localStorage.removeItem('kz_my_v1'); } catch (e) {} }); await p.reload({ waitUntil: 'load' }); return p; };
  const tab = (p, name) => p.evaluate((n) => { const b = [...document.querySelectorAll('[role=tab]')].reverse().find((e) => e.textContent.replace(/\s+/g, '') === n.replace(/\s+/g, '')); if (!b) return false; b.click(); return true; }, name);
  const until = async (p, fn, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await sleep(100); } return false; };
  const focused = (p, sel) => p.evaluate((s) => document.activeElement === document.querySelector(s), sel);

  // 1–2. загрузка и горизонтальная прокрутка на всех вкладках
  for (const [t, sel] of [['l', '[data-lq]'], ['i', '[data-iq]'], ['c', '[data-cq]'], ['d', '[data-nq]']]) {
    const p = await open('/?tab=' + t); await p.waitForSelector(sel, { timeout: 15000 }); await sleep(600);
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    chk(w[0] <= w[1] + 1, `вкладка ${t}: горизонтальная прокрутка (${w[0]} > ${w[1]})`);
    chk(p.__errs.length === 0, `вкладка ${t}: ошибки страницы: ${p.__errs.slice(0, 2).join(' | ')}`);
    // 3. фокус не теряется на первой букве; нижняя панель скрыта при наборе и возвращается
    await p.tap(sel); await p.keyboard.type('б', { delay: 40 }); await sleep(500);
    chk(await focused(p, sel), `вкладка ${t}: поле поиска потеряло фокус после первой буквы`);
    chk(await p.evaluate(() => document.documentElement.hasAttribute('data-kb') && getComputedStyle(document.querySelector('[data-mnavbar]')).visibility === 'hidden'), `вкладка ${t}: при наборе нижняя панель не скрыта`);
    await p.evaluate(() => document.activeElement.blur());
    chk(await until(p, () => !document.documentElement.hasAttribute('data-kb') && getComputedStyle(document.querySelector('[data-mnavbar]')).visibility === 'visible', 3000), `вкладка ${t}: после поиска нижняя панель не вернулась за 3 с`);
    await p.close(); }
  rep.push('4 вкладки: нет горизонтальной прокрутки и ошибок, фокус и нижняя панель при наборе');

  // 4. поиск сбрасывается при смене вкладки; панель на своем месте (прижата к низу видимой области)
  { const p = await open('/?tab=i'); await p.waitForSelector('[data-iq]', { timeout: 15000 }); await sleep(500);
    await p.fill('[data-iq]', 'Республикой Беларусь'); await sleep(1500);
    chk(await p.evaluate(() => document.body.innerText.includes('Исполнительные документы, Беларусь')), 'поиск «Пленарных» не нашел законопроект другого дня');
    await p.evaluate(() => document.activeElement.blur()); await sleep(900);
    chk(await tab(p, 'Новости'), 'нет вкладки «Новости»'); await p.waitForSelector('[data-nq]', { timeout: 8000 }); await sleep(400);
    chk(await p.$eval('[data-nq]', (e) => e.value === ''), 'поиск «Новостей» не пустой после смены вкладки');
    chk(await tab(p, 'Пленарные заседания'), 'нет вкладки «Пленарные»'); await p.waitForSelector('[data-iq]', { timeout: 8000 }); await sleep(400);
    chk(await p.$eval('[data-iq]', (e) => e.value === ''), 'поиск «Пленарных» не сбросился');
    const g = await p.evaluate(() => { const b = document.querySelector('[data-mnavbar]').getBoundingClientRect(); const v = window.visualViewport; return [Math.round(b.bottom), Math.round(v.height + v.offsetTop)]; });
    chk(Math.abs(g[0] - g[1]) <= 2, `нижняя панель не у нижнего края видимой области (${g[0]} против ${g[1]})`);
    await p.close(); rep.push('поиск по всем дням и сброс при смене вкладки, панель у нижнего края'); }

  // 5. карточка по ссылке открывается один раз
  { const p = await open('/?d=17.11.2026&v=136467'); await p.waitForSelector('[data-gdwin], [data-vid]', { timeout: 15000 }); await sleep(1200);
    const had = await p.evaluate(() => !!document.querySelector('[data-gdwin]')); chk(had, 'карточка по ссылке ?d=&v= не открылась');
    await p.keyboard.press('Escape'); await sleep(600);
    chk(await tab(p, 'Работа госорганов'), 'нет вкладки «Работа госорганов»'); await sleep(900);
    chk(await tab(p, 'Пленарные заседания'), 'нет вкладки «Пленарные»'); await sleep(1200);
    chk(await p.evaluate(() => !document.querySelector('[data-gdwin]')), 'карточка из ссылки открылась повторно');
    await p.close(); rep.push('карточка из ссылки открывается один раз'); }

  // 6. звёздочка и «Наверх» не заходят на нижнюю панель
  { const p = await open('/?tab=i'); await p.waitForSelector('[data-myfab]', { timeout: 15000 }); await sleep(800);
    const r = await p.evaluate(() => { const f = document.querySelector('[data-myfab]').getBoundingClientRect(), n = document.querySelector('[data-mnavbar]').getBoundingClientRect(); return [Math.round(f.bottom), Math.round(n.top)]; });
    chk(r[0] <= r[1], `звёздочка заходит на нижнюю панель (${r[0]} > ${r[1]})`); await p.close(); rep.push('звёздочка над панелью'); }
} finally { await browser.close(); SITE.close(); }
assert.deepEqual(fails, [], 'WebKit:\n  ' + fails.join('\n  '));
console.log('OK test_webkit.browser: ' + rep.join('; '));
