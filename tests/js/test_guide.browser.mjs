// 23.11.2026: обучение по сайту («?» в шапке) в WebKit на телефоне.
// Проверяется: кнопка «?» есть; разделы «Пленарные заседания» и «Вступают в силу» проходятся по шагам;
// на каждом шаге с подсветкой рамка видна и лежит над панелью (не перекрыта ею); шаги с карточкой, календарём
// и фильтрами сами открывают нужное; после выхода окна закрыты, поиск пуст, выбранный день возвращён.
// Без Playwright/WebKit — SKIP (при GD_REQUIRE_WEBKIT=1 — падает; так в CI). Запуск: node tests/js/test_guide.browser.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { siteServer } from './site_server.mjs';
import { ROOT } from './load_canvas.mjs';

const req = createRequire(import.meta.url);
let pw = null;
for (const p of [ROOT, '/opt/node-tools/node_modules', process.env.PW_NODE_PATH].filter(Boolean)) {
  try {
    pw = req(req.resolve('playwright', { paths: [p] }));
    break;
  } catch {}
}
const skip = (why) => {
  if (process.env.GD_REQUIRE_WEBKIT === '1') throw new Error('WebKit: ' + why);
  console.log('SKIP test_guide.browser: ' + why);
  process.exit(0);
};
if (!pw) skip('нет playwright');
let browser;
try {
  browser = await pw.webkit.launch();
} catch (e) {
  skip('WebKit не запускается (' + String(e.message).split('\n')[0] + ')');
}

const SITE = await siteServer();
const fails = [];
const chk = (c, m) => {
  if (!c) fails.push(m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (p, fn, ms = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.evaluate(fn).catch(() => false)) return true;
    await sleep(150);
  }
  return false;
};
/** Состояние панели и рамки на странице. */
const state = () => {
  const d = document.querySelector('[data-guide]');
  if (!d) return null;
  const dr = d.getBoundingClientRect();
  let sp = null;
  for (const x of document.querySelectorAll('[aria-hidden]')) {
    if (x.style.boxShadow.includes('9999')) {
      const r = x.getBoundingClientRect();
      sp = x.style.display === 'none' ? null : { top: r.top, bottom: r.bottom, w: r.width };
    }
  }
  const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter((e) => !e.hasAttribute('data-guide')).length;
  const q = document.querySelector('[data-iq], [data-lq]');
  const tot = document.querySelector('[data-itot]');
  return { dockTop: dr.top, sp, dialogs, q: q ? q.value : '', tot: tot ? tot.textContent : '' };
};
const rep = [];
try {
  const ctx = await browser.newContext({ ...pw.devices['iPhone 13'], locale: 'ru-RU', timezoneId: 'Europe/Moscow' });
  for (const [idx, tab, name, steps, needCard] of [
    [1, 'i', 'Пленарные заседания', 17, [8, 9, 10, 11, 12, 13, 14]],
    [3, 'l', 'Вступают в силу', 10, [5, 6]],
  ]) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => {
      if (!/access control checks/.test(e.message)) errs.push(e.message);
    });
    await p.goto(SITE.BASE + '?tab=' + tab, { waitUntil: 'load' });
    await until(p, () => document.querySelector('[data-guidebtn]'), 15000);
    await sleep(800);
    const before = {
      tot: await p.evaluate(() => (document.querySelector('[data-itot]') || { textContent: '' }).textContent),
    };
    await p.locator('[data-guidebtn]').first().click();
    chk(await until(p, () => !!document.querySelector('[data-guide]')), name + ': панель не открылась');
    await p
      .locator('[data-guide] button')
      .nth(1 + idx)
      .click();
    for (let k = 1; k <= steps; k++) {
      chk(await until(p, () => !!document.querySelector('[data-guide]'), 3000), `${name}: панель пропала на шаге ${k}`);
      const hasSel = await until(
        p,
        () => {
          for (const x of document.querySelectorAll('[aria-hidden]')) {
            if (x.style.boxShadow.includes('9999') && x.style.display !== 'none') return true;
          }
          return false;
        },
        6000,
      );
      const s = await p.evaluate(state);
      if (!s) break;
      chk(hasSel, `${name}: шаг ${k} — рамки подсветки нет`);
      if (s.sp)
        chk(
          s.sp.bottom <= s.dockTop + 6,
          `${name}: шаг ${k} — подсветка уходит под панель (${s.sp.bottom} > ${s.dockTop})`,
        );
      if (needCard.includes(k)) chk(s.dialogs >= 1, `${name}: шаг ${k} — карточка не открыта`);
      const last = await p.locator('[data-guide] button').last();
      await last.click();
      await sleep(250);
    }
    // выход: панель закрывается, окна закрыты, поиск пуст, итоги как были
    await p
      .locator('[data-guide] button', { hasText: 'Выйти' })
      .click()
      .catch(() => {});
    await sleep(400);
    await p.evaluate(() => {
      const g = document.querySelector('[data-guide]');
      if (g) g.querySelectorAll('button').forEach((b) => b.textContent === 'Выйти' && b.click());
    });
    chk(await until(p, () => !document.querySelector('[data-guide]'), 3000), name + ': панель не закрылась');
    await until(p, () => !document.querySelector('[data-immonth]') && !document.querySelector('[role="dialog"]'), 8000);
    await sleep(600);
    const after = await p.evaluate(state);
    chk(after === null, name + ': панель осталась после выхода');
    const dl = await p.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].length);
    const q = await p.evaluate(() => (document.querySelector('[data-iq], [data-lq]') || { value: '' }).value);
    const tot = await p.evaluate(() => (document.querySelector('[data-itot]') || { textContent: '' }).textContent);
    chk(dl === 0, `${name}: после выхода остались окна (${dl})`);
    chk(q === '', `${name}: после выхода в поиске «${q}»`);
    chk(tot === (before ? before.tot : ''), `${name}: итоги после выхода «${tot}» не как до «${before && before.tot}»`);
    chk(errs.length === 0, `${name}: ошибки страницы: ${errs.join(' | ')}`);
    await p.close();
    rep.push(name + ' — ' + steps + ' шагов');
  }
} finally {
  await browser.close();
  SITE.close();
}
assert.deepEqual(fails, [], 'Обучение:\n  ' + fails.join('\n  '));
console.log('OK test_guide.browser: ' + rep.join('; '));
