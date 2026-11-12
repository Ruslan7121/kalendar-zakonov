// Инвариант (12.11.2026, пункт 8): каждый законопроект из DATA виден в календаре.
// Проверяется настоящий код загрузки сайта (src/canvas.tsx): список дня Госдумы = повестка CAL.p[].a ∪ голосования DATA,
// постановления «Пост. N» — отдельные карточки p.r. Без сети. Запуск: node tests/js/test_calendar_visible.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCanvas, ROOT } from './load_canvas.mjs';

const isBill = (s) => /^\d+-\d+$/.test(s || '');
const isRes = (s) => /^Пост\.\s*\d+-\d+$/.test(s || '');
const rowsOf = (raw) => (raw || '').split('\n').map((l) => l.split('|')).filter((r) => /^\d+$/.test(r[0] || ''));

function check(T, label) {
  const byD = Object.fromEntries(T.CAL.p.map((p) => [p.d, p]));
  const miss = []; let bills = 0, res = 0;
  for (const d of Object.keys(T.DATA)) {
    const p = byD[d];
    for (const r of rowsOf(T.DATA[d])) {
      if (isBill(r[1])) { bills++; if (!p || !(p.a || []).some((x) => x[0] === r[1])) miss.push(`${d} ${r[1]} (голосование ${r[0]})`); }
      else if (isRes(r[1])) { res++; const n = r[1].replace(/^Пост\.\s*/, ''); if (!p || !(p.r || []).some((g) => g.n === n && g.ids.includes(r[0]))) miss.push(`${d} ${r[1]} (голосование ${r[0]})`); }
    }
    if (p) { // одна строка на законопроект, постановления не попадают в список законопроектов
      const ids = (p.a || []).map((x) => x[0]);
      assert.equal(new Set(ids).size, ids.length, `${label}: ${d}: законопроект дважды в списке дня`);
      assert.ok(!ids.some(isRes), `${label}: ${d}: постановление в списке законопроектов`);
    }
  }
  assert.deepEqual(miss, [], `${label}: законопроекты из DATA не видны в календаре:\n  ` + miss.join('\n  '));
  return { bills, res };
}

// 1) Продовый canvas: все голосования DATA видны после загрузки.
const T = await loadCanvas(['CAL', 'DATA']);
const st = check(T, 'src/canvas.tsx');
assert.ok(st.bills > 300, `слишком мало голосований по законопроектам в DATA (${st.bills}) — DATA не прочитан?`);

// 2) Октябрьский случай: законопроекты, по которым голосовали, но которых нет в опубликованной повестке
//    (до пункта 2 их было 54 и они не показывались). Берём «сырую» повестку из исходника до объединения.
const src = fs.readFileSync(path.join(ROOT, 'src', 'canvas.tsx'), 'utf8');
const m = src.match(/^const CAL: any = (\{.*\});$/m); assert.ok(m, 'не найден литерал const CAL в src/canvas.tsx');
const raw = Object.fromEntries(JSON.parse(m[1]).p.map((p) => [p.d, new Set((p.a || []).map((x) => x[0]))]));
const octHidden = [];
for (const d of Object.keys(T.DATA)) if (d.endsWith('.10.2026'))
  for (const b of new Set(rowsOf(T.DATA[d]).map((r) => r[1]).filter(isBill))) if (!(raw[d] && raw[d].has(b))) octHidden.push(d + ' ' + b);
assert.ok(octHidden.length >= 54, `октябрьский случай не покрыт: вне повестки только ${octHidden.length} законопроектов (ожидалось ≥ 54)`);
const byD = Object.fromEntries(T.CAL.p.map((p) => [p.d, p]));
for (const k of octHidden) { const [d, b] = k.split(' '); const e = byD[d].a.find((x) => x[0] === b); assert.ok(e && e[5] === 'v', `${k}: нет строки «по голосованию» (x[5]='v')`); }
const vx = T.CAL.p.filter((p) => p.d.endsWith('.10.2026')).reduce((s, p) => s + (p.vx || 0), 0);
assert.equal(vx, octHidden.length, 'p.vx за октябрь не совпадает с числом законопроектов вне повестки');

// 3) Регрессия на синтетике: день без CAL.p и законопроект вне повестки дня с повесткой должны появиться;
//    если объединение сломать (убрать IIFE), проверка обязана упасть.
const inject = (s) => s.replace('const isResDoc =', "DATA['31.12.2026'] = `900001|999901-9|Тестовый законопроект вне календаря|1-е|1|300/0/0/150|\\n900002|Пост. 999-9|Тестовое постановление|—|1|300/0/0/150|`;\n"
  + "DATA['01.10.2026'] = (DATA['01.10.2026'] || '') + `\\n900003|999902-9|Тестовый законопроект вне повестки|1-е|1|300/0/0/150|`;\nconst isResDoc =");
const fx = path.join(fs.mkdtempSync(path.join(path.dirname(new URL(import.meta.url).pathname), '.tmp-')), 'canvas.tsx');
try {
  fs.writeFileSync(fx, inject(src));
  const S = await loadCanvas(['CAL', 'DATA'], fx); check(S, 'синтетика');
  const p31 = S.CAL.p.find((p) => p.d === '31.12.2026'); assert.ok(p31 && p31.a.some((x) => x[0] === '999901-9') && p31.r.some((g) => g.n === '999-9'));
  assert.equal(S.CAL.p[S.CAL.p.length - 1].d, '31.12.2026', 'CAL.p не отсортирован по дате после объединения');
  fs.writeFileSync(fx, inject(src).replace(/\n\(\(\) => \{ const byD: Record<string, any> = Object\.fromEntries\(CAL\.p\.map/, '\n(() => { return; const byD: Record<string, any> = Object.fromEntries(CAL.p.map'));
  const B = await loadCanvas(['CAL', 'DATA'], fx);
  assert.throws(() => check(B, 'без объединения'), /не видны в календаре/, 'инвариант не ловит отключённое объединение');
} finally { fs.rmSync(path.dirname(fx), { recursive: true, force: true }); }

console.log(`OK test_calendar_visible: ${st.bills} голосований по законопроектам и ${st.res} по постановлениям видны; октябрь вне повестки — ${octHidden.length}`);
