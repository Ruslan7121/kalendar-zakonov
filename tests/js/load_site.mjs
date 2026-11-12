// 12.11.2026 (пункт 10): сайт как в браузере, но в Node — загрузчик web/gdx.ts + web/gen/app.tsx (код без данных)
// с данными из web/dist/data/*.json (их пишет pipeline/split_data.mjs --dist). fetch подменён чтением файлов,
// window.location — из параметров (?d=&v=), чтобы проверить, какие месяцы грузятся и что видит код сайта.
// Запуск сборки данных: buildSite() (= первый шаг web/build.sh в отдельную папку).
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT } from './load_canvas.mjs';

export function buildData(dist) { execFileSync('node', [path.join(ROOT, 'pipeline/split_data.mjs'), '--dist', dist], { stdio: ['ignore', 'pipe', 'inherit'] }); return path.join(dist, 'data'); }

let bundled = null;
async function bundle(names) {
  const key = names.join(','); if (bundled && bundled.key === key) return bundled.file;
  const G = path.join(ROOT, 'web', 'gen'); const tmp = path.join(G, `.tmp-app-${process.pid}.tsx`);
  fs.writeFileSync(tmp, fs.readFileSync(path.join(G, 'app.tsx'), 'utf8') + `\nexport const __T = { ${names.join(', ')} };\n`);
  try {
    const entry = `import { boot, firstMonths } from ${JSON.stringify(path.join(ROOT, 'web/gdx.ts'))};\nexport { boot, firstMonths };\nexport const app = () => import(${JSON.stringify(tmp)});\n`;
    const r = await build({ stdin: { contents: entry, loader: 'ts', resolveDir: G }, bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', charset: 'utf8',
      alias: { 'grok/canvas': path.join(ROOT, 'web', 'grok-canvas.tsx') }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'error' });
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gd-site-node-')), 'site.mjs'); fs.writeFileSync(out, r.outputFiles[0].text);
    bundled = { key, file: out }; return out;
  } finally { fs.rmSync(tmp, { force: true }); }
}
let n = 0;
// сообщения загрузчика об ошибках месяцев (в тестах с 404 они ожидаемы) — в LOG, а не в вывод теста
export const LOG = []; const cerr = console.error; console.error = (...a) => { if (String(a[0]) === 'gdx') LOG.push(a.map(String).join(' ')); else cerr(...a); };
// search: '?d=…&v=…'; fail: месяцы ММ.ГГГГ, файлы которых «не отдаются» (404); prefetch: ждать фоновую подгрузку соседей
export async function loadSite({ dataDir, names, search = '', hash = '', fail = [], wait = 0 }) {
  const file = await bundle(names);
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/gen/manifest.json'), 'utf8'));
  const bad = new Set(fail.map((k) => man.file[k]));
  const got = [];
  globalThis.window = { location: { search, hash, href: 'http://127.0.0.1/' + search }, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { baseURI: 'http://127.0.0.1/' };
  globalThis.fetch = async (u) => { const f = String(u).split('/data/')[1]; got.push(f);
    if (bad.has(f) || !fs.existsSync(path.join(dataDir, f))) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
    const s = fs.readFileSync(path.join(dataDir, f), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(s) }; };
  const mod = await import(pathToFileURL(file).href + '?n=' + (++n));
  await mod.boot(); const G = globalThis.__GDX; const first = G.loaded();
  const A = await mod.app();
  if (wait) await new Promise((r) => setTimeout(r, wait));
  return { T: A.__T, G, first, got, man };
}
// дождаться загрузки месяцев (как экран через GDX.need)
export async function need(G, ms) { G.need(ms); for (let i = 0; i < 200 && ms.some((k) => !G.has(k) && !G.err[k]); i++) await new Promise((r) => setTimeout(r, 5)); await new Promise((r) => setTimeout(r, 5)); }
