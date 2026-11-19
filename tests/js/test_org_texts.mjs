// Правило 15: плитки документов органов без «Сути» и «Кого коснётся» скрываются только с ORG_HIDE_FROM
// (src/canvas.tsx / pipeline/common.py). Более ранние дни видны и входят в cnt месяца.
// Запуск: node tests/js/test_org_texts.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCanvas, ROOT } from './load_canvas.mjs';

const T = await loadCanvas(['ORG_HIDE_FROM', 'orgPub', 'orgNoText', 'orgHasTexts', 'orgHideFrom']);
assert.equal(T.ORG_HIDE_FROM, '19.11.2026');
assert.equal(T.orgHideFrom('18.11.2026'), false);
assert.equal(T.orgHideFrom('19.11.2026'), true);
assert.equal(T.orgPub({ ty: 'решение', d: '18.11.2026', sut: '', who: '' }), true, 'до границы плитка без текстов видна');
assert.equal(T.orgPub({ ty: 'решение', d: '05.11.2026', sut: 'Есть суть.', who: '' }), true);
assert.equal(T.orgPub({ ty: 'решение', d: '19.11.2026', sut: '', who: '' }), false, 'с границы плитка без текстов скрыта');
assert.equal(T.orgPub({ ty: 'решение', d: '19.11.2026', sut: 'Суть.', who: 'Все.' }), true);
assert.equal(T.orgPub({ ty: 'заседание', d: '19.11.2026' }), true);
assert.equal(T.orgPub({ ty: 'решение', d: '18.11.2026', nt: 1, sut: '', who: '' }), false, 'nt — строка, не плитка');
assert.equal(T.orgNoText({ ty: 'решение', d: '18.11.2026', nt: 1 }), true);

const orgSut = (x) => (Array.isArray(x.sut) ? x.sut : typeof x.sut === 'string' ? x.sut.split(/\n\s*\n|\n/) : []).map((q) => String(q).trim()).filter(Boolean);
const orgWho = (x) => (typeof x.who === 'string' ? x.who : Array.isArray(x.who) ? x.who.join('\n') : '').trim();
const orgIsDoc = (x) => x.ty !== 'новость' && x.ty !== 'заседание';
const orgHasTexts = (x) => orgSut(x).length > 0 && !!orgWho(x);
const orgShow = (x) => T.orgPub(x) || T.orgNoText(x);

const monthsDir = path.join(ROOT, 'data', 'months');
const orgs = [];
for (const f of fs.readdirSync(monthsDir).filter((n) => n.endsWith('.json'))) {
  const J = JSON.parse(fs.readFileSync(path.join(monthsDir, f), 'utf8'));
  for (const e of J.ORG || []) orgs.push(e);
}
const docs = orgs.filter(orgIsDoc);
const debt = docs.filter((x) => !orgHasTexts(x));
const shown = docs.filter((x) => T.orgPub(x));
const hidden = docs.filter((x) => !T.orgPub(x));
assert.ok(docs.length > 0, 'в data/ нет документов ORG');
const p131 = docs.find((x) => x.d === '05.11.2026' && /131н/.test(x.t || ''));
assert.ok(p131 && orgSut(p131).length && !orgWho(p131), 'ожидался приказ № 131н за 05.11 без «Кого коснётся»');
assert.equal(T.orgPub(p131), true, 'приказ № 131н за 05.11 должен быть виден как плитка');
for (const x of hidden) {
  assert.ok(T.orgHideFrom(x.d) || T.orgNoText(x), `скрыт документ до границы без nt: ${x.d} ${x.t}`);
}
const hiddenFrom = hidden.filter((x) => T.orgHideFrom(x.d) && !T.orgNoText(x));

const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index.json'), 'utf8'));
const by = {};
for (const x of orgs) {
  if (!orgShow(x)) continue;
  const mk = x.d.slice(3);
  ((by[mk] ??= {})[x.o] ??= new Set()).add(x.d);
}
for (const [mk, os] of Object.entries(idx.cnt || {})) {
  for (const [o, days] of Object.entries(os.o || {})) {
    const want = [...(by[mk]?.[o] || [])].sort();
    const got = [...days].sort();
    assert.deepEqual(got, want, `index.cnt[${mk}].o[${o}]: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  }
}
for (const [mk, os] of Object.entries(by)) {
  for (const [o, days] of Object.entries(os)) {
    const got = [...((idx.cnt[mk] || {}).o || {})[o] || []].sort();
    assert.deepEqual(got, [...days].sort(), `в cnt нет дней ${mk} ${o}: ${[...days]} vs ${got}`);
  }
}

console.log(`OK test_org_texts: документов ${docs.length}, плиток ${shown.length}, долг без текстов ${debt.length}, скрыто с ${T.ORG_HIDE_FROM} ${hiddenFrom.length}; cnt совпадает`);
