// Пункт 10 (12.11.2026): данные сайта вынесены из JS в data/*.json и грузятся по месяцам (pipeline/split_data.mjs, web/gdx.ts).
// Проверяется без сети и браузера (fetch подменён чтением файлов):
//  1) data/ в git совпадает с тем, что генератор получает из src/canvas.tsx (конвейер не оставил данные только в canvas);
//  2) после подгрузки всех месяцев код сайта видит те же DATA, CAL, ORG, SUM, FULL, … что и canvas (по содержимому;
//     у объектов по дням — и по порядку ключей), а также DAYS/COUNT;
//  3) каждый месяц отдельно (только core + этот месяц): все законопроекты и постановления DATA этого месяца видны в
//     календаре (CAL.p[].a ∪ голосования, p.r), в т. ч. октябрьские вне повестки (инвариант пункта 2);
//  4) первая отрисовка грузит только нужные месяцы; ссылка ?d=&v= в другой месяц грузит этот месяц, и DLD/DLK — как в canvas;
//  5) месяц не загрузился — ошибка в GDX.err, его дни не появляются (ничего не выдумывается), остальное работает;
//  6) в собранном app.js нет встроенных DATA/CAL/FULL/NV/INFO, размер — заметно меньше прежних 1 733 631 байт.
// Запуск: node tests/js/test_data_split.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { loadCanvas, ROOT } from './load_canvas.mjs';
import { loadSite, need, buildData } from './load_site.mjs';

// 1) data/ актуальна
execFileSync('node', [path.join(ROOT, 'pipeline/split_data.mjs'), '--check'], { stdio: 'inherit' });

const DAYREC = ['DATA', 'SUM', 'FULL', 'GOVA', 'SFN'], BILLREC = ['SHORT', 'TX', 'VT', 'TRACK', 'INFO', 'BP'];
const NAMES = [...DAYREC, ...BILLREC, 'CAL', 'ORG', 'ORGNEWS', 'DEP_RAW', 'DEP8', 'DEP', 'PLAIN', 'PROC', 'LAWS', 'LKEYS', 'RES_T', 'ZTAG', 'BUDGET', 'SFM', 'DAYS', 'COUNT', 'DLD', 'DLB', 'DLK'];
const O = await loadCanvas(NAMES);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-split-test-')); const dd = buildData(tmp);
const plain = (x) => JSON.parse(JSON.stringify(x));
const MS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/index.json'), 'utf8')).months;

// 2) все месяцы → то же, что canvas
{ const r = await loadSite({ dataDir: dd, names: NAMES }); await need(r.G, MS);
  assert.deepEqual(r.G.loaded().sort(), [...MS].sort(), 'загрузились не все месяцы');
  for (const n of NAMES.filter((n) => !/^DL/.test(n))) {
    assert.deepEqual(plain(r.T[n]), plain(O[n]), `${n}: после подгрузки всех месяцев отличается от src/canvas.tsx`);
    if (!BILLREC.includes(n) && r.T[n] && typeof r.T[n] === 'object') assert.deepEqual(Object.keys(r.T[n]), Object.keys(O[n]), `${n}: порядок ключей`);
  }
  console.log(`  все ${MS.length} мес.: ${NAMES.length - 3} объектов совпадают с canvas`); }

// 3) каждый месяц отдельно
const isBill = (s) => /^\d+-\d+$/.test(s || ''); const isRes = (s) => /^Пост\.\s*\d+-\d+$/.test(s || '');
const rowsOf = (raw) => (raw || '').split('\n').map((l) => l.split('|')).filter((r) => /^\d+$/.test(r[0] || ''));
let tot = 0, totV = 0;
for (const mk of MS) {
  const days = O.DAYS.filter((d) => d.slice(3) === mk); const d0 = days[0];
  const r = await loadSite({ dataDir: dd, names: NAMES, search: d0 ? `?d=${d0}&tab=d` : '', fail: MS.filter((k) => k !== mk) });
  await need(r.G, [mk]);
  assert.ok(r.G.has(mk), `${mk}: месяц не загрузился`);
  assert.deepEqual(r.G.loaded(), [mk], `${mk}: загружены лишние месяцы ${r.G.loaded()}`);
  const byD = Object.fromEntries(r.T.CAL.p.map((p) => [p.d, p])); const miss = [];
  for (const d of days) for (const row of rowsOf(r.T.DATA[d])) {
    if (isBill(row[1])) { tot++; if (!(byD[d] && (byD[d].a || []).some((x) => x[0] === row[1]))) miss.push(`${d} ${row[1]}`); }
    else if (isRes(row[1])) { const n = row[1].replace(/^Пост\.\s*/, ''); if (!(byD[d] && (byD[d].r || []).some((g) => g.n === n && g.ids.includes(row[0])))) miss.push(`${d} ${row[1]}`); }
  }
  for (const d of days) assert.equal(r.T.DATA[d], O.DATA[d], `${d}: DATA месяца ${mk} отличается от canvas`);
  assert.ok(Object.keys(r.T.DATA).every((d) => d.slice(3) === mk), `${mk}: в DATA дни других месяцев`);
  assert.deepEqual(miss, [], `${mk}: законопроекты DATA не видны в календаре при загрузке одного месяца:\n  ${miss.join('\n  ')}`);
  for (const p of r.T.CAL.p) assert.deepEqual(plain(p), plain(O.CAL.p.find((x) => x.d === p.d)), `${p.d}: CAL.p отличается`);
  totV += r.T.CAL.p.reduce((s, p) => s + (p.a || []).filter((x) => x[5] === 'v').length, 0);
  // записи о законопроектах дня есть в загруженном месяце (карточка не останется без «Сути»/пути закона)
  for (const d of days) for (const row of rowsOf(r.T.DATA[d])) { const b = row[1];
    for (const n of ['INFO', 'BP', 'TRACK', 'TX']) if (O[n][b]) assert.deepEqual(plain(r.T[n][b]), plain(O[n][b]), `${d} ${b}: нет ${n} при загрузке только ${mk}`);
    for (const n of ['SHORT', 'VT']) if (O[n][row[0]] != null) assert.equal(r.T[n][row[0]], O[n][row[0]], `${d} голосование ${row[0]}: нет ${n}`); }
}
assert.ok(totV >= 54, `октябрьские и др. законопроекты вне повестки: ${totV}`);
console.log(`  по одному месяцу: ${tot} голосований по законопроектам видны в календаре, вне повестки ${totV}`);

// 4) первая отрисовка и ссылки в другой месяц
const last = O.DAYS[O.DAYS.length - 1].slice(3);
{ const r = await loadSite({ dataDir: dd, names: NAMES }); const now = new Date(); const cur = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  const exp = [...new Set([last, cur])].filter((k) => MS.includes(k)).sort();
  assert.deepEqual([...r.first].sort(), exp, `без ссылки до отрисовки грузятся ${r.first}, ожидалось ${exp}`);
  assert.equal(r.got.length, 1 + exp.length, `до отрисовки запрошено ${r.got}`);
  console.log(`  без ссылки: до отрисовки core + ${r.first.join(', ')} (${r.got.length} файла)`); }
for (const [d, v] of [['22.10.2026', '136156'], ['10.11.2026', '136304'], ['11.11.2026', '136361'], ['30.09.2026', '135960']]) {
  const r = await loadSite({ dataDir: dd, names: NAMES, search: `?d=${d}&v=${v}` });
  assert.ok(r.first.includes(d.slice(3)), `?d=${d}: месяц ${d.slice(3)} не загружен до отрисовки (${r.first})`);
  assert.equal(r.T.DLD, d, `?d=${d}&v=${v}: DLD`);
  const b = ((O.DATA[d] || '').split('\n').find((l) => l.split('|')[0] === v) || '').split('|')[1] || null;
  assert.equal(r.T.DLB, b, `?d=${d}&v=${v}: DLB`); assert.equal(r.T.DLK, b && isBill(b) ? d + b : null, `?d=${d}&v=${v}: DLK`);
}
console.log('  ссылки ?d=&v= в октябрь, ноябрь, сентябрь: месяц грузится до отрисовки, день и карточка (DLD/DLK) — как в canvas');

// 5) месяц не загрузился
{ const r = await loadSite({ dataDir: dd, names: NAMES, search: '?d=22.10.2026&v=136156', fail: ['10.2026'] });
  assert.ok(!r.G.has('10.2026') && /HTTP 404/.test(r.G.err['10.2026'] || ''), `ошибка месяца не записана: ${JSON.stringify(r.G.err)}`);
  assert.ok(!Object.keys(r.T.DATA).some((d) => d.slice(3) === '10.2026') && !r.T.CAL.p.some((p) => p.d.slice(3) === '10.2026'), 'октябрь появился без файла');
  assert.equal(r.T.DLD, null, 'ссылка в незагруженный месяц не должна открывать выдуманный день');
  assert.ok(r.G.has('11.2026'), 'ноябрь должен загрузиться, несмотря на ошибку октября');
  console.log(`  нет файла октября: GDX.err = «${r.G.err['10.2026']}», октябрьских дней нет, ноябрь загружен`); }

// 6) сборка
const out = path.join(tmp, 'app.js');
await build({ entryPoints: [path.join(ROOT, 'web/main.tsx')], bundle: true, minify: true, charset: 'utf8', format: 'iife', jsx: 'automatic',
  alias: { 'grok/canvas': path.join(ROOT, 'web/grok-canvas.tsx') }, define: { 'process.env.NODE_ENV': '"production"' }, outfile: out, logLevel: 'warning', absWorkingDir: ROOT });
const js = fs.readFileSync(out, 'utf8'); const sz = fs.statSync(out).size;
const pick = (s) => s.split('\n').find((l) => l.length > 40) || s; // характерные строки данных
const MARKS = { DATA: pick(O.DATA['11.11.2026']).split('|')[2], FULL: '##Главное за день', NV: 'Пленарного заседания не было", "Региональная', CAL: O.CAL.p.find((p) => p.a && p.a.length).a[0][4], INFO: Object.values(O.INFO).find((x) => x.ini && x.ini.length > 40).ini.slice(2, 40), BP: Object.values(O.BP).find((x) => x.sut && x.sut[0]).sut[0].slice(0, 40), GOVA: Object.values(O.GOVA)[0][0][0].slice(0, 40), ORG: O.ORG[0].t };
for (const [n, m] of Object.entries(MARKS)) { assert.ok(m && m.length > 10, `нет образца ${n}`); assert.ok(!js.includes(m), `в app.js остались встроенные данные ${n}: «${m.slice(0, 60)}»`); }
assert.ok(sz < 700000, `app.js ${sz} байт — данные снова встроены? (было 1 733 631)`);
const ds = fs.readdirSync(dd).map((f) => [f, fs.statSync(path.join(dd, f)).size]);
console.log(`  app.js ${sz} байт (до пункта 10: 1 733 631); data: ${ds.map(([f, s]) => `${f} ${s}`).join(', ')}`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('OK test_data_split');
