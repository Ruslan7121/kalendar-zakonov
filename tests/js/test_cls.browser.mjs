// 22.11.2026: стабильность макета — сдвиг элементов (CLS, layout-shift) при загрузке, переключении вкладок и открытии/закрытии окон.
// Измеряется в Chromium через Playwright на эмуляции iPhone 13 (в WebKit такого счетчика нет). Замер 22.11.2026: 0,000 на всех сценариях; порог 0,05.
// Без Playwright или Chrome — SKIP (при GD_REQUIRE_BROWSER=1 — падает). Запуск: node tests/js/test_cls.browser.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { siteServer } from './site_server.mjs';
import { ROOT } from './load_canvas.mjs';

const req = createRequire(import.meta.url);
let pw = null;
for (const p of [ROOT, '/opt/node-tools/node_modules', process.env.PW_NODE_PATH].filter(Boolean)) {
  try {
    pw = req(req.resolve('playwright', { paths: [p] }));
    break;
  } catch {
    /* следующий путь */
  }
}
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
const skip = (why) => {
  if (process.env.GD_REQUIRE_BROWSER === '1' && process.env.GD_REQUIRE_WEBKIT === '1') throw new Error('CLS: ' + why);
  console.log('SKIP test_cls.browser: ' + why);
  process.exit(0);
};
if (!pw) skip('нет playwright');
if (!CHROME) skip('нет Chrome');

const LIMIT = Number(process.env.CLS_LIMIT || 0.05); // суммарный сдвиг за сценарий
const SITE = await siteServer();
const browser = await pw.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
try {
  const ctx = await browser.newContext({ ...pw.devices['iPhone 13'], locale: 'ru-RU', timezoneId: 'Europe/Moscow' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__cls = 0;
    window.__shifts = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (!e.hadRecentInput) {
          window.__cls += e.value;
          window.__shifts.push([
            Math.round(e.value * 1000) / 1000,
            (e.sources || [])
              .map((s) => (s.node && (s.node.dataset ? Object.keys(s.node.dataset)[0] : s.node.nodeName)) || '?')
              .join(','),
          ]);
        }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const cls = () => p.evaluate(() => window.__cls);
  await p.goto(SITE.BASE + '/?tab=i', { waitUntil: 'load' });
  await p.waitForSelector('[data-itile]', { timeout: 15000 });
  await sleep(1200);
  const load = await cls();
  // контроль: счетчик действительно видит сдвиг (иначе нули ничего не доказывают)
  await p.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__cls_probe';
    d.style.cssText = 'height:120px';
    document.body.prepend(d);
  });
  await sleep(400);
  const probe = await cls();
  assert.ok(probe > 0, 'счетчик сдвига макета не работает: контрольный сдвиг не замечен');
  await p.evaluate(() => document.getElementById('__cls_probe').remove());
  await sleep(400);
  const base = await cls(); // с учетом контрольного сдвига: он не входит в оценку
  const tab = (name) =>
    p.evaluate((n) => {
      const b = [...document.querySelectorAll('[role=tab]')]
        .reverse()
        .find((e) => e.textContent.replace(/\s+/g, '') === n.replace(/\s+/g, ''));
      if (b) b.click();
      return !!b;
    }, name);
  for (const n of ['Работа госорганов', 'Новости', 'Вступают в силу', 'Пленарные заседания']) {
    assert.ok(await tab(n), `нет вкладки «${n}»`);
    await sleep(1200);
  }
  const tabs = (await cls()) - base;
  await p.evaluate(() => document.querySelector('[data-itile]').click());
  await p.waitForSelector('[data-gdwin]', { timeout: 8000 });
  await sleep(600);
  await p.keyboard.press('Escape');
  await sleep(800);
  const total = load + ((await cls()) - base);
  out.push(
    `загрузка ${load.toFixed(3)}, вкладки ${tabs.toFixed(3)}, окно ${(total - load - tabs).toFixed(3)}, всего ${total.toFixed(3)}`,
  );
  const shifts = await p.evaluate(() => window.__shifts.filter((x) => x[0] > 0.02));
  assert.ok(
    total <= LIMIT,
    `сдвиг макета ${total.toFixed(3)} больше допустимого ${LIMIT}: ${JSON.stringify(shifts.slice(0, 6))}`,
  );
} finally {
  await browser.close();
  SITE.close();
}
console.log('OK test_cls.browser: ' + out.join('; '));
