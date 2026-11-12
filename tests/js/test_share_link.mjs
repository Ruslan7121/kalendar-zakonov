// Ссылка «Поделиться» (12.11.2026, пункт 8; правило 11): публичный адрес только
// https://ruslan7121.github.io/kalendar-zakonov/?d=ДД.ММ.ГГГГ&v=<номер голосования>; ни Cursor, ни Netlify в исходниках сайта.
// Без сети и браузера. Запуск: node tests/js/test_share_link.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCanvas, ROOT } from './load_canvas.mjs';

const RX = /^https:\/\/ruslan7121\.github\.io\/kalendar-zakonov\/\?d=(\d\d)\.(\d\d)\.(\d{4})&v=(\d+)$/;
const BAD = /cursor\.(com|sh|so|app)|cursor-?canvas|netlify|\/canvases?\//i;
const T = await loadCanvas(['shareLink', 'SITE', 'DATA']);
assert.equal(T.SITE, 'https://ruslan7121.github.io/kalendar-zakonov');

let n = 0;
for (const d of Object.keys(T.DATA)) for (const l of (T.DATA[d] || '').split('\n')) {
  const id = l.split('|')[0]; if (!/^\d+$/.test(id)) continue;
  const u = T.shareLink(d, id); const m = u.match(RX);
  assert.ok(m, `shareLink(${d}, ${id}) = ${u}`);
  assert.equal(`${m[1]}.${m[2]}.${m[3]}`, d); assert.equal(m[4], id);
  const q = new URL(u); assert.deepEqual([...q.searchParams.keys()], ['d', 'v']); assert.equal(q.hash, '');
  n++;
}
assert.ok(n > 300, `мало голосований для проверки ссылок: ${n}`);
assert.equal(T.shareLink('11.11.2026', '136361'), 'https://ruslan7121.github.io/kalendar-zakonov/?d=11.11.2026&v=136361');

// Все места, где сайт строит ссылку «Поделиться», идут через shareLink, и других адресов сайта в коде нет.
const files = ['src/canvas.tsx', 'src/canvas.code-only.tsx', 'web/main.tsx', 'web/grok-canvas.tsx', 'web/index.html'];
if (fs.existsSync(path.join(ROOT, 'web/dist/app.js'))) files.push('web/dist/app.js');
for (const f of files) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const bad = s.match(BAD); assert.equal(bad, null, `${f}: найден запрещённый адрес «${bad && bad[0]}» (Cursor/Netlify)`);
  for (const m of s.matchAll(/https?:\/\/[^\s'"`)<>]*github\.io[^\s'"`)<>]*/g)) assert.match(m[0], /^https:\/\/ruslan7121\.github\.io\/kalendar-zakonov\/?$/, `${f}: чужой адрес github.io ${m[0]}`);
}
const src = fs.readFileSync(path.join(ROOT, 'src/canvas.tsx'), 'utf8');
assert.equal((src.match(/[?&]d=\$\{/g) || []).length, 1, 'ссылка ?d=…&v=… должна собираться только в shareLink');
assert.ok(/navigator\.clipboard\.writeText\(url\)/.test(src) && /const url = shareLink\(day, v\.id\)/.test(src), 'кнопка копирования ссылки не использует shareLink');
assert.ok(/const u = shareLink\(day, id\)/.test(src), 'кнопка «Поделиться» не использует shareLink');
console.log(`OK test_share_link: ${n} ссылок по формату, без Cursor/Netlify в ${files.length} файлах`);
