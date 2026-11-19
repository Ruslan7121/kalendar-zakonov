// 19.11.2026 (правило 15): в данных сайта документ органа без «Сути» и «Кого коснётся» не считается видимой плиткой;
// счётчики месяца (data/index.json cnt) не включают такие дни; texts_check это видит.
// Запуск: node tests/js/test_org_texts.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './load_canvas.mjs';

const orgSut = (x) => (Array.isArray(x.sut) ? x.sut : typeof x.sut === 'string' ? x.sut.split(/\n\s*\n|\n/) : []).map((q) => String(q).trim()).filter(Boolean);
const orgWho = (x) => (typeof x.who === 'string' ? x.who : Array.isArray(x.who) ? x.who.join('\n') : '').trim();
const orgIsDoc = (x) => x.ty !== 'новость' && x.ty !== 'заседание';
const orgHasTexts = (x) => orgSut(x).length > 0 && !!orgWho(x);
const orgPub = (x) => !orgIsDoc(x) || orgHasTexts(x);
const orgNoText = (x) => orgIsDoc(x) && !!x.nt && !orgHasTexts(x);
const orgShow = (x) => orgPub(x) || orgNoText(x);

const monthsDir = path.join(ROOT, 'data', 'months');
const orgs = [];
for (const f of fs.readdirSync(monthsDir).filter((n) => n.endsWith('.json'))) {
  const J = JSON.parse(fs.readFileSync(path.join(monthsDir, f), 'utf8'));
  for (const e of J.ORG || []) orgs.push(e);
}
const docs = orgs.filter(orgIsDoc);
const hidden = docs.filter((x) => !orgHasTexts(x));
const visible = docs.filter(orgHasTexts);
assert.ok(docs.length > 0, 'в data/ нет документов ORG');
assert.ok(hidden.some((x) => x.d === '05.11.2026' && /131н/.test(x.t || '') && orgSut(x).length > 0 && !orgWho(x)),
  'ожидался приказ № 131н за 05.11 без «Кого коснётся» — он должен остаться в данных, но не как плитка');
for (const x of visible) {
  assert.ok(orgPub(x), `видимый документ без правила публикации: ${x.d} ${x.t}`);
}
for (const x of hidden) {
  assert.equal(orgPub(x), false, `скрытый документ не должен быть плиткой: ${x.d} ${x.t}`);
}

const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index.json'), 'utf8'));
// день органа в cnt — только если есть видимая плитка или строка «без текста»
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
// обратная сторона: все видимые дни есть в cnt
for (const [mk, os] of Object.entries(by)) {
  for (const [o, days] of Object.entries(os)) {
    const got = [...((idx.cnt[mk] || {}).o || {})[o] || []].sort();
    assert.deepEqual(got, [...days].sort(), `в cnt нет дней ${mk} ${o}: ${[...days]} vs ${got}`);
  }
}

console.log(`OK test_org_texts: документов ${docs.length}, с текстами ${visible.length}, скрыто ${hidden.length}; cnt совпадает с правилом 15`);
