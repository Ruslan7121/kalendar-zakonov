#!/usr/bin/env node
// 12.11.2026 (пункт 10): данные сайта — из src/canvas.tsx в JSON с подгрузкой по месяцам.
//
// Канон данных по-прежнему src/canvas.tsx (его пишет конвейер: votes_day, cal_merge, track, organs, bp_merge, …;
// он же — самодостаточная форма страницы). Этот генератор запускается после каждой правки canvas
// (pipeline/commit.sh, run_daily.sh, web/build.sh) и ничего не выдумывает: он выполняет тот же код загрузки, что и страница
// (объединение CAL.p ∪ DATA, ORGX, BP1112, TRACK1112, LAWS_FIX, …), и раскладывает получившиеся значения:
//   data/core.json            — общее: законы месяца (LAWS), ZTAG, PLAIN, PROC, RES_T, депутаты, бюджет, CAL.u/w/n и
//                               записи о законопроектах/голосованиях, на которые ссылается код или общие данные;
//   data/months/ГГГГ-ММ.json  — всё, что относится к дням месяца: DATA, SUM (с NV), FULL, GOVA, SFN, CAL.p, CAL.g, ORG,
//                               ORGNEWS и записи SHORT/TX/VT/TRACK/INFO/BP о голосованиях и законопроектах этого месяца;
//   data/index.json           — оглавление: месяцы, файлы и их хеши, DAYS/COUNT, порядок ключей и элементов массивов
//                               (после подгрузки любых месяцев объекты совпадают с canvas по содержимому и порядку).
//   web/gen/app.tsx           — код сайта = src/canvas.tsx, где эти константы взяты из загрузчика web/gdx.ts (GDX.S.*),
//                               а шаги, уже выполненные здесь, убраны; web/gen/manifest.json — оглавление с именами файлов.
//   --dist DIR                — ещё и копии DIR/data/<имя>.<хеш>.json для GitHub Pages (так делает web/build.sh).
//   --check                   — data/ не писать, только сравнить с тем, что получилось бы (код 1, если data/ устарела);
//                               web/gen/ пишется и при --check (он не в git, его читают сборка и тесты).
// Запуск: node pipeline/split_data.mjs [--dist web/dist] [--check]
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANVAS = path.resolve(process.env.CANVAS || path.join(ROOT, 'src', 'canvas.tsx'));
// data/ — рядом с каноном: <клон>/src/canvas.tsx → <клон>/data (как $GD_ROOT/data у run_daily.sh); web/gen — в этом клоне
const DATA_DIR = path.join(path.dirname(path.dirname(CANVAS)), 'data');

// ---------- что выносится ----------
const DAYREC = ['DATA', 'SUM', 'FULL', 'GOVA', 'SFN'];           // ключ — день ДД.ММ.ГГГГ → месяц
const BILLREC = ['SHORT', 'TX', 'VT', 'TRACK', 'INFO', 'BP'];   // ключ — голосование/законопроект → месяцы, где он упомянут
const ARR = { 'CAL.p': (x) => x.d, 'CAL.g': (x) => x[0], ORG: (x) => x.d, ORGNEWS: (x) => x.d };
const CORE = ['DEP_RAW', 'DEP8', 'PLAIN', 'PROC', 'LAWS', 'RES_T', 'ZTAG', 'BUDGET', 'SFM'];
export const NAMES = [...DAYREC, ...BILLREC, 'CAL', 'ORG', 'ORGNEWS', ...CORE];

// ---------- разбор исходника: конец верхнеуровневого оператора (строки, шаблоны с ${}, комментарии, скобки) ----------
function endOf(s, i) {
  let d = 0;
  const skipStr = (q) => { i++; while (i < s.length) { const c = s[i]; if (c === '\\') { i += 2; continue; } if (c === q) return; if (q === '`' && c === '$' && s[i + 1] === '{') { i += 2; let dd = 1; while (i < s.length && dd) { const cc = s[i]; if (cc === '\'' || cc === '"' || cc === '`') { skipStr(cc); i++; continue; } if (cc === '{') dd++; else if (cc === '}') dd--; if (dd) i++; } i++; continue; } i++; } };
  while (i < s.length) {
    const c = s[i];
    if (c === '\'' || c === '"' || c === '`') skipStr(c);
    else if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; }
    else if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; }
    else if (c === '(' || c === '[' || c === '{') d++;
    else if (c === ')' || c === ']' || c === '}') d--;
    else if (c === ';' && d === 0) return i;
    i++;
  }
  throw new Error('split_data: не найден конец оператора с позиции ' + i);
}
// Правки исходника для web/gen/app.tsx. Каждая правка обязана найтись ровно столько раз, сколько указано, —
// если конвейер или правка кода изменили форму canvas, сборка падает, а не выпускает сайт с неполными данными.
function transform(src) {
  const ed = [];
  const find = (re, what, n = 1) => { const g = new RegExp(re.source, 'gm'); const ms = [...src.matchAll(g)]; if (ms.length !== n && !(n === -1 && ms.length)) throw new Error(`split_data: «${what}» найдено ${ms.length} раз (нужно ${n === -1 ? '≥1' : n}) — форма src/canvas.tsx изменилась, обновите pipeline/split_data.mjs`); return ms; };
  const stmt = (m) => { const a = m.index; const e = endOf(src, a + m[0].length); return [a, e + 1]; };
  // const NAME…= <данные>;  →  const NAME…= GDX.S.NAME;
  const decl = (name, rep) => { const [m] = find(new RegExp(String.raw`^(?:/\* ${name}:start \*/)?const ${name}\b[^=\n]*= `), 'const ' + name); const [a, e] = stmt(m); ed.push([a + m[0].length, e, rep ?? `GDX.S.${name};`]); };
  const drop = (re, what, n = 1) => { for (const m of find(re, what, n)) { const a = m.index, e = endOf(src, a) + 1; ed.push([a, e + (src[e] === '\n' ? 1 : 0), '']); } };
  decl('DATA'); drop(/^DATA\['\d\d\.\d\d\.\d{4}'\] = /, "DATA['день'] = …", -1);
  decl('SUM'); drop(/^const NV\b/, 'const NV'); drop(/^Object\.assign\(SUM, NV\)/, 'Object.assign(SUM, NV)');
  drop(/^const SHORT_RAW\b/, 'const SHORT_RAW'); decl('SHORT');
  decl('FULL'); drop(/^FULL\['\d\d\.\d\d\.\d{4}'\] = /, "FULL['день'] = …", -1);
  drop(/^const TX_RAW\b/, 'const TX_RAW'); decl('TX');
  decl('DAYS', 'GDX.M.DAYS;'); decl('COUNT', 'GDX.M.COUNT;');
  decl('VT'); decl('TRACK'); drop(/^const TRACK1112\b/, 'const TRACK1112'); drop(/^Object\.keys\(TRACK1112\)\.forEach/, 'TRACK1112 → TRACK');
  decl('BUDGET'); decl('DEP_RAW'); decl('DEP8');
  drop(/^const INFO_RAW\b/, 'const INFO_RAW'); decl('PLAIN'); decl('BP'); drop(/^const BP1112\b/, 'const BP1112'); drop(/^Object\.keys\(BP1112\)\.forEach/, 'BP1112 → BP');
  decl('PROC'); decl('INFO');
  drop(/^\/\* INIC:start \*\/const INIC\b/, 'const INIC'); drop(/^Object\.keys\(INIC\)\.forEach/, 'INIC → INFO');   // 13.11.2026: инициатор/комитет с sozd уже влиты в INFO
  decl('LAWS'); drop(/^const LAWS_FIX\b/, 'const LAWS_FIX'); drop(/^for \(const k in LAWS_FIX\)/, 'LAWS_FIX → LAWS');
  decl('CAL'); decl('RES_T'); drop(/^\(\(\) => \{ const byD: Record<string, any> = Object\.fromEntries\(CAL\.p\.map/, 'объединение CAL.p ∪ DATA');
  decl('GOVA'); decl('ORG'); drop(/^\/\* ORGX:start \*\/const ORGX\b/, 'const ORGX'); drop(/^ORG\.forEach\(\(x: any\) => \{ const e = ORGX\[/, 'ORGX → ORG');
  { const [m] = find(/^const ORGNEWS: any\[\] = /, 'const ORGNEWS'); const [a, e] = stmt(m); ed.push([a + m[0].length, e, 'GDX.S.ORGNEWS;']);
    const [m2] = find(/^const ORGNEWS: any\[\] = ORG\.filter\(\(x: any\) => x\.ty === 'новость'\); for \(let i = ORG\.length - 1; i >= 0; i--\) if \(ORG\[i\]\.ty === 'новость'\) ORG\.splice\(i, 1\);/, 'ORGNEWS из ORG');
    const a2 = e + 1, e2 = endOf(src, a2); ed.push([a2, e2 + 1, '']); void m2; }
  decl('SFM'); drop(/^const SFI\b/, 'const SFI'); drop(/^for \(let i = ORG\.length - 1; i >= 0; i--\) if \(ORG\[i\]\.o === 'sf' && SFM\[/, 'SFI: замена заседаний СФ'); drop(/^ORG\.push\(\.\.\.SFI\)/, 'ORG.push(...SFI)');
  decl('SFN'); decl('ZTAG');
  ed.sort((x, y) => x[0] - y[0]); for (let k = 1; k < ed.length; k++) if (ed[k][0] < ed[k - 1][1]) throw new Error('split_data: правки пересекаются: ' + JSON.stringify([src.slice(ed[k - 1][0], ed[k - 1][0] + 60), ed[k - 1][1], src.slice(ed[k][0], ed[k][0] + 60), ed[k][0]]));
  let out = ''; let p = 0; for (const [a, e, r] of ed) { out += src.slice(p, a) + r; p = e; } out += src.slice(p);
  if (!/^const GDX: any = /m.test(out)) throw new Error('split_data: в src/canvas.tsx нет const GDX (загрузчик данных)');
  return '// СГЕНЕРИРОВАНО pipeline/split_data.mjs из src/canvas.tsx — не править вручную (данные: data/*.json).\n' + out;
}

// ---------- значения: выполнить настоящий код canvas в Node ----------
export async function evalCanvas(file, names, extraSrc = '') {
  const src = fs.readFileSync(file, 'utf8') + extraSrc + `\nexport const __T = { ${names.join(', ')} };\n`;
  const r = await build({ stdin: { contents: src, loader: 'tsx', resolveDir: path.dirname(file), sourcefile: path.basename(file) },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', charset: 'utf8',
    alias: { 'grok/canvas': path.join(ROOT, 'web', 'grok-canvas.tsx') }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'error' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-split-')); const out = path.join(dir, 'c.mjs'); fs.writeFileSync(out, r.outputFiles[0].text);
  try { return (await import(pathToFileURL(out).href)).__T; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const mkOf = (d) => { if (!/^\d\d\.\d\d\.\d{4}$/.test(d || '')) throw new Error('split_data: не дата ДД.ММ.ГГГГ: ' + JSON.stringify(d)); return d.slice(3); };
const mkSort = (a, b) => (a.slice(3) + a.slice(0, 2)).localeCompare(b.slice(3) + b.slice(0, 2));
const mkFile = (mk) => `${mk.slice(3)}-${mk.slice(0, 2)}`;
const j = (x) => JSON.parse(JSON.stringify(x));
// один ключ верхнего уровня на строку: читаемые диффы в git, почти без лишних байт
const dump = (o) => '{\n' + Object.entries(o).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') + '\n}\n';
const h10 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);

export async function split(file = CANVAS) {
  const src = fs.readFileSync(file, 'utf8');
  const app = transform(src);
  const T = j(await evalCanvas(file, [...NAMES, 'DAYS', 'COUNT']));
  const months = new Set();
  for (const n of DAYREC) Object.keys(T[n]).forEach((d) => months.add(mkOf(d)));
  for (const [p, f] of Object.entries(ARR)) { const a = p === 'CAL.p' ? T.CAL.p : p === 'CAL.g' ? T.CAL.g : T[p]; a.forEach((x) => months.add(mkOf(f(x)))); }
  const MS = [...months].sort(mkSort); const mi = Object.fromEntries(MS.map((m, i) => [m, i]));
  const M = Object.fromEntries(MS.map((m) => [m, {}]));
  const core = {};
  const ko = {}, ord = {};
  for (const n of DAYREC) { ko[n] = Object.keys(T[n]); for (const m of MS) M[m][n] = {}; for (const [d, v] of Object.entries(T[n])) M[mkOf(d)][n][d] = v; }
  const arrOf = (p) => (p === 'CAL.p' ? T.CAL.p : p === 'CAL.g' ? T.CAL.g : T[p]);
  for (const [p, f] of Object.entries(ARR)) { const a = arrOf(p); ord[p] = a.map((x) => mi[mkOf(f(x))].toString(36)).join(''); for (const m of MS) M[m][p] = []; a.forEach((x) => M[mkOf(f(x))][p].push(x)); }
  if (MS.length > 36) throw new Error('split_data: больше 36 месяцев — расширьте кодировку порядка');
  core.CAL = { ...T.CAL, p: [], g: [] };   // p, g — по месяцам; порядок ключей CAL как в canvas
  for (const n of CORE) core[n] = T[n];
  // записи о голосованиях/законопроектах: в месяц, где ключ встречается в данных месяца; в core — если он есть в общих данных или коде (или нигде)
  // «общими» считаются только ссылки из кода и из данных, которые показываются без месяца (законы месяца LAWS, CAL.u/w/n);
  // ZTAG, PLAIN, PROC, RES_T, BUDGET — справочники по ключу: их записи показываются только в карточках дней, т. е. вместе с месяцем.
  const coreText = app + JSON.stringify([core.LAWS, core.CAL]);
  const mText = Object.fromEntries(MS.map((m) => [m, JSON.stringify(M[m])]));
  for (const n of BILLREC) { core[n] = {}; for (const m of MS) M[m][n] = {};
    for (const [k, v] of Object.entries(T[n])) { const ms = coreText.includes(k) ? [] : MS.filter((m) => mText[m].includes(k)); if (!ms.length) core[n][k] = v; else ms.forEach((m) => { M[m][n][k] = v; }); } }
  for (const m of MS) for (const n of Object.keys(M[m])) if (Array.isArray(M[m][n]) ? !M[m][n].length : !Object.keys(M[m][n]).length) delete M[m][n];
  // счётчики месяца для переключателя месяцев, пока сам месяц не загружен (та же формула, что calCnt в canvas)
  const cnt = Object.fromEntries(MS.map((m) => { const o = {}; T.ORG.filter((x) => mkOf(x.d) === m).forEach((x) => { (o[x.o] = o[x.o] || []); if (!o[x.o].includes(x.d)) o[x.o].push(x.d); });
    return [m, { p: T.CAL.p.filter((x) => mkOf(x.d) === m).length, g: T.CAL.g.filter((x) => mkOf(x[0]) === m).length, o }]; }));
  const files = { core: dump(core) }; for (const m of MS) files[m] = dump(M[m]);
  const hash = Object.fromEntries(Object.entries(files).map(([k, s]) => [k, h10(s)]));
  const idx = { v: 1, src: 'src/canvas.tsx', months: MS, file: Object.fromEntries([['core', 'core.json'], ...MS.map((m) => [m, `months/${mkFile(m)}.json`])]), hash,
    DAYS: T.DAYS, COUNT: T.COUNT, ko, ord, cnt, split: { day: DAYREC, bill: BILLREC, arr: Object.keys(ARR), core: CORE } };
  return { app, idx, files, T };
}

async function main() {
  const a = process.argv.slice(2); const dist = a.includes('--dist') ? a[a.indexOf('--dist') + 1] : null; const check = a.includes('--check');
  const { app, idx, files } = await split();
  const DD = DATA_DIR;
  const want = { 'index.json': JSON.stringify(idx, null, 1) + '\n' }; for (const [k, s] of Object.entries(files)) want[idx.file[k]] = s;
  // код сайта и оглавление для сборки (web/gen в git не идёт)
  const G = path.join(ROOT, 'web', 'gen'); fs.mkdirSync(G, { recursive: true });
  const pub = (k) => (k === 'core' ? `core.${idx.hash.core}.json` : `m-${mkFile(k)}.${idx.hash[k]}.json`);
  const man = { ...idx, file: Object.fromEntries(Object.keys(files).map((k) => [k, pub(k)])) };
  fs.writeFileSync(path.join(G, 'app.tsx'), app); fs.writeFileSync(path.join(G, 'manifest.json'), JSON.stringify(man));
  if (check) {
    const bad = Object.entries(want).filter(([f, s]) => { try { return fs.readFileSync(path.join(DD, f), 'utf8') !== s; } catch { return true; } }).map(([f]) => f);
    const extra = fs.existsSync(path.join(DD, 'months')) ? fs.readdirSync(path.join(DD, 'months')).map((f) => 'months/' + f).filter((f) => !(f in want)) : [];
    if (bad.length || extra.length) { console.error(`split_data --check: data/ не совпадает с src/canvas.tsx: ${[...bad, ...extra.map((f) => f + ' (лишний)')].join(', ')} — запустите node pipeline/split_data.mjs`); process.exit(1); }
    console.log(`split_data --check: data/ совпадает с ${path.relative(process.cwd(), CANVAS) || CANVAS} (${Object.keys(want).length} файлов)`); return;
  }
  fs.mkdirSync(path.join(DD, 'months'), { recursive: true });
  for (const f of fs.readdirSync(path.join(DD, 'months'))) if (!(('months/' + f) in want)) fs.rmSync(path.join(DD, 'months', f));
  for (const [f, s] of Object.entries(want)) { const p = path.join(DD, f); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== s) fs.writeFileSync(p, s); }
  if (dist) { const O = path.join(dist, 'data'); fs.rmSync(O, { recursive: true, force: true }); fs.mkdirSync(O, { recursive: true }); for (const [k, s] of Object.entries(files)) fs.writeFileSync(path.join(O, pub(k)), s); }
  const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' КБ';
  console.log(`split_data: core ${kb(files.core)}; ${idx.months.map((m) => `${m} ${kb(files[m])}`).join(', ')}; web/gen/app.tsx ${kb(app)}${dist ? `; ${dist}/data/` : ''}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
