// 12.11.2026 (пункт 10): сайт для браузерных тестов — так же, как web/build.sh: pipeline/split_data.mjs --dist (data/*.<хеш>.json)
// и esbuild web/main.tsx, во временную папку; раздаётся локально (127.0.0.1) как статический сайт GitHub Pages.
// fail: имена файлов data/ (или префиксы, напр. 'm-2026-10.'), на которые сервер отвечает 404 — проверка ошибки загрузки месяца.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { build } from 'esbuild';
import { ROOT } from './load_canvas.mjs';
import { buildData } from './load_site.mjs';

export async function siteServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-site-'));
  buildData(dir);
  await build({ entryPoints: [path.join(ROOT, 'web/main.tsx')], bundle: true, minify: true, charset: 'utf8', format: 'iife', jsx: 'automatic',
    alias: { 'grok/canvas': path.join(ROOT, 'web/grok-canvas.tsx') }, define: { 'process.env.NODE_ENV': '"production"' }, outfile: path.join(dir, 'app.js'), logLevel: 'error' });
  fs.copyFileSync(path.join(ROOT, 'web/index.html'), path.join(dir, 'index.html'));
  const S = { dir, fail: [], log: [] };
  const srv = http.createServer((q, r) => { const p = new URL(q.url, 'http://x').pathname; S.log.push(p);
    const f = p.startsWith('/data/') ? path.join(dir, 'data', path.basename(p)) : path.join(dir, p.endsWith('.js') ? 'app.js' : 'index.html');
    if (p.startsWith('/data/') && (S.fail.some((x) => path.basename(p).startsWith(x)) || !fs.existsSync(f))) { r.writeHead(404); r.end('not found'); return; }
    r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript; charset=utf-8' : f.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(r); });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  S.BASE = `http://127.0.0.1:${srv.address().port}`;
  S.close = () => { srv.close(); fs.rmSync(dir, { recursive: true, force: true }); };
  return S;
}
