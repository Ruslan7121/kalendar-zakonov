// П11, П13 (12.11.2026): web/extras.mjs — у каждого законопроекта из DATA есть страница bill/<номер>/ с его голосованиями,
// RSS-ленты — корректный RSS 2.0 с элементами, ведущими на страницы законопроектов, календари .ics — парные BEGIN/END VEVENT
// и строки не длиннее 75 байт; ленты меток совпадают по адресу с tagSlug из canvas (ссылка «RSS по меткам» в панели фильтров).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, loadCanvas } from './load_canvas.mjs';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-extras-'));
try {
  execFileSync('node', [path.join(ROOT, 'web', 'extras.mjs'), out], { stdio: 'pipe' });
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index.json'), 'utf8'));
  const bills = new Map(); // номер → id голосований
  for (const mk of idx.months) {
    const J = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', idx.file[mk]), 'utf8'));
    for (const v of Object.values(J.DATA || {})) for (const ln of String(v).split('\n')) {
      const f = ln.split('|'); if (/^\d+$/.test(f[0]) && /^\d+-\d+$/.test(f[1] || '')) (bills.get(f[1]) || bills.set(f[1], []).get(f[1])).push(f[0]);
    }
  }
  assert.ok(bills.size > 100, `мало законопроектов в DATA: ${bills.size}`);
  for (const [no, ids] of bills) {
    const f = path.join(out, 'bill', no, 'index.html'); assert.ok(fs.existsSync(f), `нет страницы bill/${no}/`);
    const h = fs.readFileSync(f, 'utf8');
    for (const id of ids) assert.ok(h.includes(`vote.duma.gov.ru/vote/${id}`), `bill/${no}/: нет голосования ${id}`);
    assert.ok(h.includes(`<link rel="canonical" href="https://ruslan7121.github.io/kalendar-zakonov/bill/${no}/">`), `bill/${no}/: нет canonical`);
    assert.ok(/<meta property="og:title" content="[^"]+">/.test(h), `bill/${no}/: нет og:title`);
    assert.ok(!/undefined|null<|NaN/.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), `bill/${no}/: undefined/null/NaN в тексте`);
  }
  const list = fs.readFileSync(path.join(out, 'bill', 'index.html'), 'utf8');
  assert.equal((list.match(/class="row"/g) || []).length, bills.size, 'bill/: не все законопроекты в списке');

  const T = await loadCanvas(['tagSlug', 'ZTAG', 'lawId']);
  const feeds = fs.readdirSync(path.join(out, 'feed')).filter((f) => f.endsWith('.xml') && !f.startsWith('org-'));
  // 14.11.2026: ленты органов feed/org-<орган>.xml — корректный RSS, ссылки только на официальные сайты
  for (const o of ['gov', 'sf', 'cbr', 'minfin', 'mintrud', 'minjust']) {
    const x = fs.readFileSync(path.join(out, 'feed', `org-${o}.xml`), 'utf8');
    assert.ok(x.startsWith('<?xml') && x.includes('<rss version="2.0"') && x.trim().endsWith('</channel></rss>'), `feed/org-${o}.xml: обёртка RSS`);
    for (const l of x.match(/<item>.*?<\/item>/gs) || []) { const u = (l.match(/<link>([^<]+)<\/link>/) || [])[1] || ''; assert.ok(/^https?:\/\/([a-z0-9-]+\.)*(gov\.ru|kremlin\.ru|government\.ru|cbr\.ru)(\/|$)/i.test(u.replace(/&amp;/g, '&')), `feed/org-${o}.xml: ссылка не на официальный сайт: ${u}`); }
  }
  for (const f of feeds) {
    const x = fs.readFileSync(path.join(out, 'feed', f), 'utf8');
    assert.ok(x.startsWith('<?xml') && x.includes('<rss version="2.0"') && x.trim().endsWith('</rss>'), `feed/${f}: не RSS 2.0`);
    const items = x.match(/<item>[\s\S]*?<\/item>/g) || [];
    // 14.11.2026: главная лента метки — принятые законопроекты и законы, вступающие в силу (может быть пустой, если все голосования
    // отклонены); feed/<метка>-all.xml и gd.xml — все голосования, не пустые
    const all = f === 'gd.xml' || f.endsWith('-all.xml');
    if (all) assert.ok(items.length > 0, `feed/${f}: пусто`); else assert.ok(fs.existsSync(path.join(out, 'feed', f.replace(/\.xml$/, '-all.xml'))), `feed/${f}: нет варианта -all.xml`);
    for (const it of items) { const l = it.match(/<link>([^<]+)<\/link>/); const law = it.includes(':law:') || /kalendar-zakonov:(sf|gov|minfin|mintrud|minjust|cbr):/.test(it); // законы и документы органов (15.11.2026) — официальная ссылка
      if (!all) assert.ok(!/отклонен<\/title>/.test(it), `feed/${f}: в главной ленте метки отклоненный законопроект`);
      if (law) assert.ok(l && /^https?:\/\/([a-z0-9-]+\.)*(gov\.ru|kremlin\.ru|government\.ru|cbr\.ru)(\/|$)/i.test(l[1].replace(/&amp;/g, '&')) && /Официальный источник: /.test(it), `feed/${f}: закон или документ органа без официальной ссылки`);
      else { assert.ok(l && /\/bill\/\d+-\d+\/$/.test(l[1]), `feed/${f}: ссылка не на страницу законопроекта`); assert.ok(/Официальный источник: https:\/\/sozd\.duma\.gov\.ru\/bill\//.test(it), `feed/${f}: нет ссылки на sozd`); } assert.ok(/<pubDate>[A-Z][a-z]{2}, \d\d [A-Z][a-z]{2} \d{4} \d\d:\d\d:\d\d GMT<\/pubDate>/.test(it), `feed/${f}: pubDate`); }
  }
  const tags = new Set(); for (const [k, g] of Object.entries(T.ZTAG)) if (/^\d+-\d+$/.test(k) && bills.has(k)) g.flat().forEach((v) => tags.add(v));
  for (const v of tags) assert.ok(feeds.includes(T.tagSlug(v) + '.xml'), `нет ленты для метки «${v}» (feed/${T.tagSlug(v)}.xml)`);

  for (const f of ['laws.ics', 'plenary.ics']) {
    const x = fs.readFileSync(path.join(out, 'ics', f), 'utf8'); const ls = x.split('\r\n');
    assert.ok(x.startsWith('BEGIN:VCALENDAR\r\n') && x.endsWith('END:VCALENDAR\r\n'), `ics/${f}: обёртка`);
    const b = ls.filter((l) => l === 'BEGIN:VEVENT').length; assert.ok(b > 0 && b === ls.filter((l) => l === 'END:VEVENT').length, `ics/${f}: VEVENT`);
    for (const l of ls) assert.ok(Buffer.byteLength(l) <= 75, `ics/${f}: строка длиннее 75 байт`);
    const uids = ls.filter((l) => l.startsWith('UID:')); assert.equal(new Set(uids).size, uids.length, `ics/${f}: повторяется UID`);
  }
  // 14.11.2026: у каждого закона «Вступают в силу» свой файл ics/law/<lawId>.ics (кнопка «Добавить в календарь»), в событии — ссылка на официальный источник
  const LAWS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'core.json'), 'utf8')).LAWS || { months: {} };
  const lawId = (x) => { let h = 0x811c9dc5; for (const ch of `${x.d}|${x.law || ''}|${x.title || ''}`) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const LL = Object.values(LAWS.months).flat().filter((x) => x && x.d && x.title); const lids = LL.map(lawId);
  assert.equal(new Set(lids).size, lids.length, 'lawId повторяется у разных законов');
  for (const x of LL) assert.equal(T.lawId(x), lawId(x), `lawId в canvas.tsx и web/extras.mjs расходятся: ${x.title}`);
  for (const id of lids) { const x = fs.readFileSync(path.join(out, 'ics', 'law', id + '.ics'), 'utf8'); const ls = x.split('\r\n');
    assert.equal(ls.filter((l) => l === 'BEGIN:VEVENT').length, 1, `ics/law/${id}.ics: одно событие`);
    const url = (x.replace(/\r\n /g, '').match(/\r\nURL:([^\r\n]+)/) || [])[1] || ''; const host = url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    assert.ok(/\.gov\.ru$/.test(host) || ['kremlin.ru', 'government.ru', 'cbr.ru'].includes(host), `ics/law/${id}.ics: ссылка не на официальный источник: ${url}`);
    assert.ok(!/ruslan7121\.github\.io/.test(x.replace(/\r\n /g, '')), `ics/law/${id}.ics: в событии ссылка на карточку сайта, а нужна на официальный источник`);
    for (const l of ls) assert.ok(Buffer.byteLength(l) <= 75, `ics/law/${id}.ics: строка длиннее 75 байт`); }
  // 15.11.2026: страница закона law/<lawId>/ — «Официальный текст» на официальный сайт, без пути закона; в sitemap
  const sm = fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
  for (const id of lids) { const h = fs.readFileSync(path.join(out, 'law', id, 'index.html'), 'utf8');
    const m = h.match(/<a [^>]*href="([^"]+)"[^>]*>(?:Официальный текст|Найти официальный текст) ↗<\/a>/); assert.ok(m, `law/${id}/: нет кнопки «Официальный текст»`);
    const host = m[1].replace(/&amp;/g, '&').replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    assert.ok(/\.gov\.ru$/.test(host) || ['kremlin.ru', 'government.ru', 'cbr.ru'].includes(host), `law/${id}/: «Официальный текст» не на официальный сайт: ${m[1]}`);
    assert.ok(!/Путь закона/.test(h), `law/${id}/: путь закона на странице закона не показываем`);
    assert.ok(sm.includes(`law/${id}/`), `law/${id}/ нет в sitemap.xml`); }
  assert.ok(fs.existsSync(path.join(out, 'law', 'index.html')), 'нет law/index.html');
  // 15.11.2026: v/<id>/ — страница «Поделиться» с превью для каждого голосования по законопроекту: og:title/og:description,
  // noindex, не в sitemap, человека переводит в карточку ?d=…&v=…; страница закона переводит в карточку закона.
  let nv = 0;
  for (const [d, txt] of idx.months.flatMap((mk) => Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', idx.file[mk]), 'utf8')).DATA || {}))) for (const l of String(txt).split('\n')) {
    const f = l.split('|'); if (f.length < 6 || !/^\d+$/.test(f[0]) || !/^\d+-\d+$/.test(f[1])) continue;
    const fp = path.join(out, 'v', f[0], 'index.html'); assert.ok(fs.existsSync(fp), `нет v/${f[0]}/`); const h = fs.readFileSync(fp, 'utf8');
    assert.ok(/<meta property="og:title" content="[^"]+ — (принят|отклонен)">/.test(h), `v/${f[0]}/: нет og:title с итогом`);
    assert.ok(/<meta property="og:description" content="[^"]*за \d+, против \d+/.test(h), `v/${f[0]}/: нет голосов в og:description`);
    assert.ok(h.includes(`location.replace("../../?d=${d}&v=${f[0]}")`), `v/${f[0]}/: не переводит в карточку`);
    assert.ok(/<meta name="robots" content="noindex">/.test(h), `v/${f[0]}/: должна быть noindex`);
    assert.ok(!sm.includes(`/v/${f[0]}/`), `v/${f[0]}/ не должна быть в sitemap.xml`); nv++; }
  assert.ok(nv > 300, `мало страниц v/: ${nv}`);
  for (const id of lids) assert.ok(fs.readFileSync(path.join(out, 'law', id, 'index.html'), 'utf8').includes(`location.replace("../../?tab=l&law=${id}")`), `law/${id}/: не переводит в карточку закона`);
  for (const f of ['sitemap.xml', 'robots.txt', 'feed/index.html']) assert.ok(fs.existsSync(path.join(out, f)), `нет ${f}`);
  console.log(`OK test_extras: ${bills.size} страниц законопроектов, ${feeds.length} лент RSS, ${tags.size} меток, .ics laws/plenary и ${lids.length} файлов ics/law`);
} finally { fs.rmSync(out, { recursive: true, force: true }); }
