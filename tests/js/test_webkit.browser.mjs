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
let pw = null;
for (const p of [ROOT, '/opt/node-tools/node_modules', process.env.PW_NODE_PATH].filter(Boolean)) {
  try {
    pw = req(req.resolve('playwright', { paths: [p] }));
    break;
  } catch {}
}
const skip = (why) => {
  if (process.env.GD_REQUIRE_WEBKIT === '1') throw new Error('WebKit: ' + why);
  console.log('SKIP test_webkit.browser: ' + why);
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
const rep = [];
const chk = (c, m) => {
  if (!c) fails.push(m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const ctx = await browser.newContext({
    ...pw.devices['iPhone 13'],
    colorScheme: 'dark',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  });
  const openOnce = async (url) => {
    const p = await ctx.newPage();
    const errs = [];
    let listening = false; // ошибки считаются только после повторной загрузки: при перезагрузке страница, которую закрывают, может выдавать лишнее
    p.on('pageerror', (e) => {
      if (listening && !/access control checks/.test(e.message)) errs.push(e.message);
    });
    /* локальный сервер отвечает 404 на live.json и отсутствующие месяцы — WebKit пишет это как «access control checks» */ p.__errs =
      errs;
    try {
      await p.goto(SITE.BASE + url, { waitUntil: 'load' });
      await p.evaluate(() => {
        try {
          localStorage.removeItem('kz_state_v1');
          localStorage.removeItem('kz_my_v1');
        } catch (e) {}
      });
      await p.reload({ waitUntil: 'load' });
    } catch (e) {
      await p.close().catch(() => {});
      throw e;
    }
    listening = true;
    return p;
  };
  // WebKit при нагрузке (весь набор тестов идет параллельно с другими браузерами) иногда сообщает о внутренней ошибке загрузки — пробуем заново
  const open = async (url) => {
    for (let k = 1; ; k++) {
      try {
        return await openOnce(url);
      } catch (e) {
        if (k >= 3 || !/internal error|Target (page|closed)|Timeout/.test(String(e.message))) throw e;
        await sleep(500);
      }
    }
  };
  const tab = (p, name) =>
    p.evaluate((n) => {
      const b = [...document.querySelectorAll('[role=tab]')]
        .reverse()
        .find((e) => e.textContent.replace(/\s+/g, '') === n.replace(/\s+/g, ''));
      if (!b) return false;
      b.click();
      return true;
    }, name);
  const until = async (p, fn, ms = 3000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await p.evaluate(fn)) return true;
      await sleep(100);
    }
    return false;
  };
  const focused = (p, sel) => p.evaluate((s) => document.activeElement === document.querySelector(s), sel);

  // 1–2. загрузка и горизонтальная прокрутка на всех вкладках
  for (const [t, sel] of [
    ['l', '[data-lq]'],
    ['i', '[data-iq]'],
    ['c', '[data-cq]'],
    ['d', '[data-nq]'],
  ]) {
    const p = await open('/?tab=' + t);
    await p.waitForSelector(sel, { timeout: 15000 });
    await sleep(600);
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    chk(w[0] <= w[1] + 1, `вкладка ${t}: горизонтальная прокрутка (${w[0]} > ${w[1]})`);
    chk(p.__errs.length === 0, `вкладка ${t}: ошибки страницы: ${p.__errs.slice(0, 2).join(' | ')}`);
    // 3. фокус не теряется на первой букве; нижняя панель скрыта при наборе и возвращается
    await p.tap(sel);
    await p.keyboard.type('б', { delay: 40 });
    await sleep(500);
    chk(await focused(p, sel), `вкладка ${t}: поле поиска потеряло фокус после первой буквы`);
    chk(
      await p.evaluate(
        () =>
          document.documentElement.hasAttribute('data-kb') &&
          getComputedStyle(document.querySelector('[data-mnavbar]')).visibility === 'visible' &&
          document.documentElement.style.getPropertyValue('--gd-kbo') === '0px',
      ),
      `вкладка ${t}: при наборе (без изменения высоты окна) нижняя панель пропала или сдвинута`,
    );
    await p.evaluate(() => document.activeElement.blur());
    chk(
      await until(
        p,
        () =>
          !document.documentElement.hasAttribute('data-kb') &&
          getComputedStyle(document.querySelector('[data-mnavbar]')).visibility === 'visible',
        3000,
      ),
      `вкладка ${t}: после поиска нижняя панель не на месте за 3 с`,
    );
    await p.close();
  }
  rep.push('4 вкладки: нет горизонтальной прокрутки и ошибок, фокус и нижняя панель при наборе');

  // 4. поиск сбрасывается при смене вкладки; панель на своем месте (прижата к низу видимой области)
  {
    const p = await open('/?tab=i');
    await p.waitForSelector('[data-iq]', { timeout: 15000 });
    await sleep(500);
    await p.fill('[data-iq]', 'Республикой Беларусь');
    await sleep(1500);
    chk(
      await p.evaluate(() => document.body.innerText.includes('Исполнительные документы, Беларусь')),
      'поиск «Пленарных» не нашел законопроект другого дня',
    );
    await p.evaluate(() => document.activeElement.blur());
    await sleep(900);
    chk(await tab(p, 'Новости'), 'нет вкладки «Новости»');
    await p.waitForSelector('[data-nq]', { timeout: 8000 });
    await sleep(400);
    chk(await p.$eval('[data-nq]', (e) => e.value === ''), 'поиск «Новостей» не пустой после смены вкладки');
    chk(await tab(p, 'Пленарные заседания'), 'нет вкладки «Пленарные»');
    await p.waitForSelector('[data-iq]', { timeout: 8000 });
    await sleep(400);
    chk(await p.$eval('[data-iq]', (e) => e.value === ''), 'поиск «Пленарных» не сбросился');
    const g = await p.evaluate(() => {
      const b = document.querySelector('[data-mnavbar]').getBoundingClientRect();
      const v = window.visualViewport;
      return [Math.round(b.bottom), Math.round(v.height + v.offsetTop)];
    });
    chk(Math.abs(g[0] - g[1]) <= 2, `нижняя панель не у нижнего края видимой области (${g[0]} против ${g[1]})`);
    await p.close();
    rep.push('поиск по всем дням и сброс при смене вкладки, панель у нижнего края');
  }

  // 5. карточка по ссылке открывается один раз
  {
    const p = await open('/?d=17.11.2026&v=136467');
    await p.waitForSelector('[data-gdwin], [data-vid]', { timeout: 15000 });
    await sleep(1200);
    const had = await p.evaluate(() => !!document.querySelector('[data-gdwin]'));
    chk(had, 'карточка по ссылке ?d=&v= не открылась');
    await p.keyboard.press('Escape');
    await sleep(600);
    chk(await tab(p, 'Работа госорганов'), 'нет вкладки «Работа госорганов»');
    await sleep(900);
    chk(await tab(p, 'Пленарные заседания'), 'нет вкладки «Пленарные»');
    await sleep(1200);
    chk(await p.evaluate(() => !document.querySelector('[data-gdwin]')), 'карточка из ссылки открылась повторно');
    await p.close();
    rep.push('карточка из ссылки открывается один раз');
  }

  // 6. звёздочка и «Наверх» не заходят на нижнюю панель
  {
    const p = await open('/?tab=i');
    await p.waitForSelector('[data-myfab]', { timeout: 15000 });
    await sleep(800);
    const r = await p.evaluate(() => {
      const f = document.querySelector('[data-myfab]').getBoundingClientRect(),
        n = document.querySelector('[data-mnavbar]').getBoundingClientRect();
      return [Math.round(f.bottom), Math.round(n.top)];
    });
    chk(r[0] <= r[1], `звёздочка заходит на нижнюю панель (${r[0]} > ${r[1]})`);
    await p.close();
    rep.push('звёздочка над панелью');
  }

  // 7. имитация экранной клавиатуры: окно становится ниже, пока поле в фокусе; панель и «Наверх» скрыты, поле видно; потом все возвращается
  {
    const p = await open('/?tab=i');
    await p.waitForSelector('[data-iq]', { timeout: 15000 });
    await sleep(600);
    const full = p.viewportSize();
    await p.tap('[data-iq]');
    // в момент фокуса (до подъема клавиатуры) кнопки внизу прозрачны, чтобы не мигать над клавиатурой
    chk(
      await p.evaluate(
        () =>
          document.documentElement.hasAttribute('data-kbf') &&
          getComputedStyle(document.querySelector('[data-mnavbar]')).opacity === '0',
      ),
      'при фокусе нижняя панель не стала прозрачной (мигание при подъеме клавиатуры)',
    );
    const kbH = Math.round(full.height * 0.45);
    await p.setViewportSize({ width: full.width, height: full.height - kbH }); // как будто поднялась клавиатура
    await sleep(500);
    const under = () =>
      p.evaluate(() => {
        const b = document.querySelector('[data-mnavbar]').getBoundingClientRect();
        return {
          top: Math.round(b.top),
          ih: window.innerHeight,
          kbo: parseInt(document.documentElement.style.getPropertyValue('--gd-kbo')) || 0,
        };
      });
    let u = await under();
    chk(
      u.kbo >= kbH - 4 && u.top >= u.ih,
      `с клавиатурой: панель должна быть под клавиатурой (сдвиг ${u.kbo}, верх ${u.top}, окно ${u.ih})`,
    );
    chk(
      await p.evaluate(() => {
        const r = document.querySelector('[data-iq]').getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      }),
      'с клавиатурой: поле поиска вышло за видимую область',
    );
    // «Готово/Найти»: Enter в поле снимает фокус, окно еще низкое (клавиатура уезжает) — панель по-прежнему под клавиатурой, а не появляется позже
    await p.keyboard.press('Enter');
    await sleep(150);
    chk(
      await p.evaluate(() => getComputedStyle(document.querySelector('[data-mnavbar]')).opacity === '1'),
      'после снятия фокуса панель осталась прозрачной (должна быть видна под уходящей клавиатурой)',
    );
    u = await under();
    chk(u.top >= u.ih, `клавиатура уходит: панель не под ней (верх ${u.top}, окно ${u.ih})`);
    // окно вернулось: панель сразу на своем месте (у нижнего края), без задержки
    await p.setViewportSize(full);
    await sleep(120);
    const g = await p.evaluate(() => {
      const b = document.querySelector('[data-mnavbar]').getBoundingClientRect();
      return [Math.round(b.bottom), window.innerHeight, !document.documentElement.hasAttribute('data-kb')];
    });
    chk(
      Math.abs(g[0] - g[1]) <= 2 && g[2],
      `после клавиатуры панель не сразу у нижнего края (${g[0]} против ${g[1]}, data-kb снят: ${g[2]})`,
    );
    await p.close();
    rep.push('имитация клавиатуры: панель под ней, при закрытии уже на месте');
  }

  // 7б. клавиатура закрылась прокруткой (не кнопкой «Готово»): пока окно не вернулось, кнопки внизу прозрачны (иначе на секунду мелькают по центру экрана)
  {
    const p = await open('/?tab=i');
    await p.waitForSelector('[data-iq]', { timeout: 15000 });
    await sleep(600);
    const full = p.viewportSize();
    await p.tap('[data-iq]');
    await p.setViewportSize({ width: full.width, height: Math.round(full.height * 0.55) });
    await sleep(400);
    await p.evaluate(() => document.activeElement.blur()); // как при прокрутке: без Enter
    let seen = false;
    for (let k = 0; k < 8; k++) {
      await sleep(50);
      if (await p.evaluate(() => getComputedStyle(document.querySelector('[data-mnavbar]')).opacity !== '0'))
        seen = true;
    }
    chk(!seen, 'клавиатура закрыта прокруткой: панель мелькнула, пока окно еще низкое');
    await p.setViewportSize(full);
    chk(
      await until(
        p,
        () =>
          getComputedStyle(document.querySelector('[data-mnavbar]')).opacity === '1' &&
          !document.documentElement.hasAttribute('data-kbf'),
        2500,
      ),
      'после прокрутки панель не вернулась, когда окно стало прежним',
    );
    await p.close();
    rep.push('закрытие прокруткой: без мелькания, возврат после восстановления окна');
  }

  // 7в. Telegram: окно после клавиатуры осталось низким (так бывает на iPhone до следующего касания) — кнопки внизу
  // видны и сдвинуты к нижнему краю экрана, а не висят посреди экрана; когда окно вернулось — на месте без сдвига
  {
    const tctx = await browser.newContext({
      ...pw.devices['iPhone 13'],
      colorScheme: 'dark',
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
    });
    await tctx.addInitScript(() => {
      const noop = () => {};
      const deep = (o) =>
        new Proxy(o, {
          get: (t, k) =>
            k in t
              ? t[k]
              : k === 'then'
                ? undefined
                : (...a) => (a.length === 1 && typeof a[0] === 'function' ? undefined : noop),
        });
      window.Telegram = {
        WebApp: deep({
          platform: 'ios',
          version: '7.0',
          initData: '',
          initDataUnsafe: {},
          themeParams: {},
          colorScheme: 'dark',
          isVersionAtLeast: () => false,
          BackButton: deep({ show: noop, hide: noop, onClick: noop, offClick: noop }),
          onEvent: noop,
          offEvent: noop,
        }),
      };
    });
    const p = await tctx.newPage();
    await p.goto(SITE.BASE + '/?tab=i', { waitUntil: 'load' });
    await p.waitForSelector('[data-iq]', { timeout: 15000 });
    await sleep(800);
    const full = p.viewportSize();
    await p.tap('[data-iq]');
    const kbH = Math.round(full.height * 0.45);
    await p.setViewportSize({ width: full.width, height: full.height - kbH });
    await sleep(400);
    await p.evaluate(() => document.activeElement.blur()); // закрыли прокруткой
    await sleep(2300); // окно так и не вернулось
    const st = await p.evaluate(() => {
      const b = document.querySelector('[data-mnavbar]').getBoundingClientRect();
      return {
        op: getComputedStyle(document.querySelector('[data-mnavbar]')).opacity,
        top: Math.round(b.top),
        ih: window.innerHeight,
        kbo: parseInt(document.documentElement.style.getPropertyValue('--gd-kbo')) || 0,
      };
    });
    chk(st.op === '1', 'Telegram, окно осталось низким: панель должна быть видна');
    chk(
      st.kbo >= kbH - 4 && st.top >= st.ih,
      `Telegram, окно осталось низким: панель не сдвинута к нижнему краю экрана (${JSON.stringify(st)})`,
    );
    await p.setViewportSize(full);
    chk(
      await until(p, () => parseInt(document.documentElement.style.getPropertyValue('--gd-kbo')) === 0, 2000),
      'Telegram: когда окно вернулось, сдвиг панели не снялся',
    );
    await p.close();
    await tctx.close();
    rep.push('Telegram, окно осталось низким: панель у нижнего края экрана');
  }

  // 8. стек слоев: Escape закрывает только верхний слой (документ → лента органа → карта)
  {
    const p = await open('/?tab=c');
    await p.waitForSelector('[data-omtile]', { timeout: 15000 });
    await sleep(500);
    await p.evaluate(() => document.querySelector('[data-omtile]').click());
    await p.waitForSelector('[data-orgmap="feed"]', { timeout: 8000 });
    await p.waitForSelector('[data-omdoc]', { timeout: 8000 });
    await p.evaluate(() => document.querySelector('[data-omdoc]').click());
    await p.waitForSelector('[data-gdwin]', { timeout: 8000 });
    await sleep(400);
    await p.keyboard.press('Escape');
    chk(await until(p, () => !document.querySelector('[data-gdwin]'), 2500), 'Escape не закрыл окно документа');
    chk(
      await p.evaluate(() => !!document.querySelector('[data-orgmap="feed"]')),
      'Escape закрыл ленту органа вместе с окном документа',
    );
    await p.keyboard.press('Escape');
    chk(
      await until(p, () => !document.querySelector('[data-orgmap="feed"]'), 2500),
      'второй Escape не вернул из ленты органа на карту',
    );
    await p.close();
    rep.push('Escape закрывает слои по одному');
  }
} finally {
  await browser.close();
  SITE.close();
}
assert.deepEqual(fails, [], 'WebKit:\n  ' + fails.join('\n  '));
console.log('OK test_webkit.browser: ' + rep.join('; '));
