#!/usr/bin/env node
// П6 (12.11.2026): проверка схемы данных сайта data/*.json (их пишет split_data.mjs из src/canvas.tsx).
// Ошибка формата — выход 1 и список в out/logs/validate_data.txt; run_daily.sh сообщает «публиковать нельзя»,
// publish.sh останавливается, тест tests/js/test_schema.mjs падает. Только проверка: ничего не исправляет.
// Запуск: node pipeline/validate_data.mjs [каталог data] (по умолчанию data/ клона)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.resolve(process.argv[2] || path.join(ROOT, 'data'));
const errs = []; const E = (w, m) => { if (errs.length < 500) errs.push(`${w}: ${m}`); };
const DATE = /^\d\d\.\d\d\.\d{4}$/;
const okDate = (s) => { if (!DATE.test(s || '')) return false; const [d, m, y] = s.split('.').map(Number); const x = new Date(Date.UTC(y, m - 1, d)); return x.getUTCDate() === d && x.getUTCMonth() === m - 1; };
const isStr = (x) => typeof x === 'string';
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { E(f, `не читается как JSON (${e.message})`); return null; } };

const IDX = rd('index.json'); const CORE = rd('core.json');
if (!IDX || !CORE) finish();
if (!Array.isArray(IDX.months) || !IDX.months.length) E('index.json', 'нет списка месяцев');
const months = {};
for (const mk of IDX.months || []) {
  if (!/^\d\d\.\d{4}$/.test(mk)) E('index.json', `месяц «${mk}»`);
  const f = IDX.file && IDX.file[mk]; if (!f) { E('index.json', `нет файла месяца ${mk}`); continue; }
  const J = rd(f); if (J) months[mk] = J;
}

// DATA: строки голосований id|номер|название|чтение|1/0|за/против/возд/не голос.|фракции
const ids = new Map(); const FR = /^\d+\/\d+\/\d+\/\d+$/;
for (const [mk, J] of Object.entries(months)) {
  for (const [day, s] of Object.entries(J.DATA || {})) {
    const w = `DATA[${day}]`;
    if (!okDate(day)) E(w, 'ключ — не дата ДД.ММ.ГГГГ'); else if (day.slice(3) !== mk) E(w, `лежит в месяце ${mk}`);
    if (!isStr(s)) { E(w, 'не строка'); continue; }
    for (const ln of s.split('\n')) {
      if (!ln.trim()) continue; const f = ln.split('|'); const id = f[0];
      if (f.length < 6 || f.length > 7) { E(w, `строка ${id}: ${f.length} полей вместо 6–7`); continue; }
      if (!/^\d+$/.test(id)) E(w, `id «${id}» не число`);
      if (ids.has(id)) E(w, `голосование ${id} уже есть в ${ids.get(id)} (дубль)`); else ids.set(id, day);
      if (!(f[1] === '—' || /^\d+-\d+$/.test(f[1]) || /^Пост\. \d+-\d+$/.test(f[1]))) E(w, `строка ${id}: номер «${f[1]}»`);
      if (!f[2].trim()) E(w, `строка ${id}: пустое название`);
      if (f[4] !== '0' && f[4] !== '1') E(w, `строка ${id}: итог «${f[4]}» (нужно 0/1)`);
      if (!FR.test(f[5])) E(w, `строка ${id}: голоса «${f[5]}»`);
      else { const n = f[5].split('/').map(Number); if (n.reduce((a, b) => a + b, 0) > 450) E(w, `строка ${id}: сумма голосов > 450`); }
      if (f[6] && !f[6].split(';').every((x) => /^\d+\/\d+\/\d+\/\d+(:\d+)?$/.test(x))) E(w, `строка ${id}: фракции «${f[6]}»`);
    }
  }
  for (const [k, v] of Object.entries(J.VT || {})) if (!/^\d+$/.test(k) || !/^\d\d:\d\d:\d\d$/.test(v)) E(`VT[${k}]`, `время «${v}»`);
  for (const [i, p] of (J['CAL.p'] || []).entries()) {
    const w = `CAL.p[${mk}#${i}]`;
    if (!okDate(p.d)) E(w, `дата «${p.d}»`);
    if (!['held', 'confirmed', 'expected'].includes(p.s)) E(w, `статус «${p.s}»`);
    if (!Array.isArray(p.a)) E(w, 'нет повестки a[]'); else p.a.forEach((a, j) => { if (!Array.isArray(a) || (a.length !== 5 && a.length !== 6) || !isStr(a[0]) || !isStr(a[1])) E(w, `пункт ${j}: нужно [номер, кратко, чтение, ссылка, название]`); else if (a[3] && !/^https?:\/\//.test(a[3])) E(w, `пункт ${j}: ссылка «${a[3]}»`); });
  }
  for (const [i, o] of (J.ORG || []).entries()) {
    const w = `ORG[${mk}#${i}]`;
    if (!['sf', 'minfin', 'mintrud', 'minjust', 'cbr'].includes(o.o)) E(w, `орган «${o.o}»`);
    if (!okDate(o.d)) E(w, `дата «${o.d}»`); if (!isStr(o.t) || !o.t.trim()) E(w, 'нет заголовка t'); if (!/^https?:\/\//.test(o.u || '')) E(w, `ссылка «${o.u}»`);
  }
}

// карточки законопроектов: BP, INFO (месяцы и core), PLAIN, ZTAG, TRACK
const each = (name, f) => { for (const src of [CORE, ...Object.values(months)]) for (const [k, v] of Object.entries((src && src[name]) || {})) f(k, v); };
const sutOk = (x) => x === undefined || isStr(x) || (Array.isArray(x) && x.every(isStr));
each('BP', (k, v) => { if (!isObj(v)) return E(`BP[${k}]`, 'не объект'); if (!sutOk(v.sut)) E(`BP[${k}]`, 'sut — не строки'); if (v.who !== undefined && !isStr(v.who)) E(`BP[${k}]`, 'who — не строка'); if (v.bs !== undefined && !(Array.isArray(v.bs) && v.bs.every((p) => Array.isArray(p) && p.length === 2 && p.every(isStr)))) E(`BP[${k}]`, 'bs — нужны пары [«было», «стало»]'); });
each('INFO', (k, v) => { if (!isObj(v)) return E(`INFO[${k}]`, 'не объект'); if (!sutOk(v.sut)) E(`INFO[${k}]`, 'sut — не строки'); for (const f of ['t', 'ini', 'com', 'who']) if (v[f] !== undefined && !isStr(v[f])) E(`INFO[${k}]`, `${f} — не строка`); });
each('PLAIN', (k, v) => { if (!/^\d+$/.test(k)) E(`PLAIN[${k}]`, 'ключ — не id голосования'); if (!isObj(v) || !sutOk(v.sut)) E(`PLAIN[${k}]`, 'формат'); });
each('TRACK', (k, v) => { if (!isObj(v)) return E(`TRACK[${k}]`, 'не объект'); for (const [f, d] of Object.entries(v)) if (f === 'law' ? !/^\d+-ФЗ$/.test(d) : f !== 'src' && !okDate(d)) E(`TRACK[${k}]`, `${f}: «${d}» не дата`); });
for (const [k, g] of Object.entries(CORE.ZTAG || {})) if (!(Array.isArray(g) && g.length === 3 && g.every((a) => Array.isArray(a) && a.every((x) => isStr(x) && x.trim())))) E(`ZTAG[${k}]`, 'нужно [[для кого], [тема], [что меняется]]');
for (const [mk, a] of Object.entries((CORE.LAWS && CORE.LAWS.months) || {})) (a || []).forEach((x, i) => { const w = `LAWS[${mk}#${i}]`; if (!okDate(x.d)) E(w, `дата «${x.d}»`); if (!isStr(x.title) || !x.title.trim()) E(w, 'нет title'); if (!isStr(x.law) || !x.law.trim()) E(w, 'нет law'); });
if (!ids.size) E('DATA', 'нет ни одного голосования');
finish();

function finish() {
  const out = path.join(ROOT, 'out', 'logs'); fs.mkdirSync(out, { recursive: true });
  const rep = errs.length ? errs.join('\n') + '\n' : 'OK\n'; fs.writeFileSync(path.join(out, 'validate_data.txt'), rep);
  if (errs.length) { console.error(`validate_data: ${errs.length} ошибок схемы данных (out/logs/validate_data.txt):\n  ` + errs.slice(0, 30).join('\n  ')); process.exit(1); }
  console.log(`validate_data: OK — ${ids.size} голосований, ${Object.keys(months).length} месяцев`);
  process.exit(0);
}
