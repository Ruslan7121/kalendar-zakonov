// П6 (12.11.2026): pipeline/validate_data.mjs — данные сайта проходят проверку схемы, а испорченные (дубль голосования,
// битый итог, неверная дата, сломанный JSON) — нет. Без сети.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './load_canvas.mjs';

const V = path.join(ROOT, 'pipeline', 'validate_data.mjs');
const run = (dir) => spawnSync('node', [V, dir], { encoding: 'utf8' });
const ok = run(path.join(ROOT, 'data')); assert.equal(ok.status, 0, 'данные data/ не прошли проверку:\n' + ok.stderr);
const bad = (name, f) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-schema-')); fs.cpSync(path.join(ROOT, 'data'), d, { recursive: true });
  try { f(d); const r = run(d); assert.equal(r.status, 1, `${name}: порча не замечена`); return r.stderr; } finally { fs.rmSync(d, { recursive: true, force: true }); }
};
const nov = (d) => path.join(d, 'months', '2026-11.json');
const edit = (d, g) => { const J = JSON.parse(fs.readFileSync(nov(d), 'utf8')); g(J); fs.writeFileSync(nov(d), JSON.stringify(J)); };
assert.match(bad('дубль', (d) => edit(d, (J) => { const k = Object.keys(J.DATA).find((x) => J.DATA[x]); J.DATA[k] += '\n' + J.DATA[k].split('\n')[0]; })), /дубль/);
assert.match(bad('итог', (d) => edit(d, (J) => { const k = Object.keys(J.DATA).find((x) => J.DATA[x]); const l = J.DATA[k].split('\n'); const f = l[0].split('|'); f[4] = 'да'; l[0] = f.join('|'); J.DATA[k] = l.join('\n'); })), /итог/);
assert.match(bad('дата', (d) => edit(d, (J) => { J['CAL.p'][0].d = '31.11.2026'; })), /дата/);
assert.match(bad('JSON', (d) => fs.writeFileSync(nov(d), '{"DATA": ')), /JSON/);
console.log('OK test_schema: data/ проходит проверку; дубль, неверный итог, несуществующая дата и битый JSON отклоняются');
