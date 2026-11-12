// Пункт 11 (12.11.2026), без сети и браузера: настоящий код src/canvas.tsx в Node (tests/js/load_canvas.mjs).
//  1) метки: у каждой строки списка дня Госдумы за октябрь и ноябрь 2026 (законопроекты CAL.p[].a, в т. ч. 54 вне повестки)
//     есть метки всех трёх групп «Для кого» / «Тема» / «Что меняется»; у 7 постановлений с предметом — тоже; все метки есть в панели (ZW/ZT/ZC);
//  2) поиск (qHit + тексты карточек): находит законопроект по «Сути» (BP/PLAIN), документ органа по «Сути», вопрос повестки
//     Правительства; ё/е и регистр не мешают; несколько слов — все должны быть; пустая строка не сужает, мусор ничего не находит.
// Запуск: node tests/js/test_search_tags.mjs
import assert from 'node:assert/strict';
import { loadCanvas } from './load_canvas.mjs';

const T = await loadCanvas(['CAL', 'ZTAG', 'ZW', 'ZT', 'ZC', 'qHit', 'bTxt', 'rTxt', 'oTxt', 'gaTxt', 'normQ', 'ORG', 'GOVA', 'zKeyR', 'BP']);
const L = [new Set(T.ZW), new Set(T.ZT), new Set(T.ZC)];
const isBill = (s) => /^\d+-\d+$/.test(s || '');

// 1) метки
const miss = []; const bad = []; let rows = 0;
for (const p of T.CAL.p) {
  if (!/\.(10|11)\.2026$/.test(p.d)) continue;
  for (const x of p.a || []) { if (!isBill(x[0])) continue; rows++; const g = T.ZTAG[x[0]];
    if (!g || !g.every((a) => a.length)) miss.push(`${p.d} ${x[0]} ${JSON.stringify(g || null)}`); }
}
for (const [k, g] of Object.entries(T.ZTAG)) {
  assert.ok(Array.isArray(g) && g.length === 3, `ZTAG[${k}] не из трёх групп`);
  g.forEach((a, i) => a.forEach((v) => { if (!L[i].has(v)) bad.push(`${k}: «${v}» нет в группе ${['Для кого', 'Тема', 'Что меняется'][i]}`); }));
}
assert.deepEqual(miss, [], 'карточки без меток всех трёх групп:\n  ' + miss.join('\n  '));
assert.deepEqual(bad, [], 'метки, которых нет в панели «Фильтры»:\n  ' + bad.join('\n  '));
assert.ok(rows >= 351, `слишком мало строк законопроектов за октябрь–ноябрь: ${rows}`);
const SUBJ = ['14664-9', '14596-9', '14329-9', '14577-9', '14590-9', '16574-9', '28821-9'];
const resAll = new Set(T.CAL.p.flatMap((p) => (p.r || []).map((g) => g.n)));
for (const n of SUBJ) { assert.ok(resAll.has(n), `постановление ${n} не в календаре`); const g = T.ZTAG[T.zKeyR(n)]; assert.ok(g && g.every((a) => a.length), `постановление ${n}: нет меток трёх групп`); }
for (const g of [...T.CAL.p].flatMap((p) => p.r || [])) { const z = T.ZTAG[T.zKeyR(g.n)]; if (z) assert.ok(z.every((a) => a.length), `постановление ${g.n}: метки неполные`); }

// 2) поиск
const Q = (s) => T.normQ(s.trim());
const bills = T.CAL.p.flatMap((p) => (p.a || []).map((x) => ({ d: p.d, x })));
const findB = (q) => bills.filter(({ x }) => T.qHit(T.bTxt(x), Q(q))).map(({ x }) => x[0]);
// законопроект находится по слову только из «Сути» (BP), которого нет в названии
const b1 = bills.find(({ x }) => x[0] === '1276697-8'); assert.ok(b1, '1276697-8 нет в календаре');
assert.ok(!/форел/i.test((b1.x[4] || '') + b1.x[1]), 'тестовое слово есть в названии — тест не про «Суть»');
assert.ok(findB('форели').includes('1276697-8'), 'поиск не нашёл законопроект по «Сути» (форели → 1276697-8)');
// ё/е и регистр
const yo = bills.find(({ x }) => /ё/.test(x[4] || '')); assert.ok(yo, 'нет названия с ё');
const w = (yo.x[4].match(/[А-Яа-яЁё]*ё[А-Яа-яЁё]*/) || [])[0];
assert.ok(findB(w.replace(/ё/g, 'е').toUpperCase()).includes(yo.x[0]), `ё/е: «${w}» не находится через «е»`);
// несколько слов — все должны быть
assert.ok(findB('форели Главрыбвод').includes('1276697-8'));
assert.equal(findB('форели zzzqqq').length, 0, 'слово без совпадений не должно давать находок');
assert.equal(findB('qqqzzzxx').length, 0, 'мусорный запрос нашёл законопроекты');
assert.equal(findB('').length, bills.length, 'пустой запрос должен не сужать список');
// документы органов: «Суть» / описание
const org = T.ORG.find((x) => x.o === 'sf' && /Колокольцев/.test((x.sut || '') + (x.x || '')) && !/Колокольцев/.test(x.t || ''));
assert.ok(org, 'нет новости СФ с «Колокольцев» только в описании');
assert.ok(T.qHit(T.oTxt(org), Q('колокольцев')), 'документ органа не находится по «Сути»/описанию');
const cbr = T.ORG.find((x) => x.o === 'cbr' && x.no); assert.ok(T.qHit(T.oTxt(cbr), Q(cbr.no.match(/\d+-У/)[0])), 'указание ЦБ не находится по номеру');
assert.ok(T.qHit(T.oTxt(cbr), Q('банк россии')), 'поиск по названию органа не работает');
// Правительство: вопрос повестки
const [gd, ga] = Object.entries(T.GOVA).find(([, a]) => a.length); const word = ga[0][0].split(/\s+/).find((z) => z.length > 7);
assert.ok(T.qHit(T.gaTxt(ga[0]), Q(word)), `вопрос повестки Правительства ${gd} не находится по слову «${word}»`);
// постановление — по номеру и названию
const res = T.CAL.p.flatMap((p) => p.r || []).find((g) => g.n === '28821-9');
assert.ok(T.qHit(T.rTxt(res), Q('28821-9')) && T.qHit(T.rTxt(res), Q('Генеральной Ассамблее')), 'постановление не находится');
console.log(`OK test_search_tags: ${rows} строк законопроектов за октябрь–ноябрь с метками трёх групп, ${SUBJ.length} постановлений с метками; поиск по «Сути», органам, ё/е`);
