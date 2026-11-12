// Загружает настоящий код сайта src/canvas.tsx в Node (без браузера и сети), чтобы тесты проверяли
// те же правила, что выполняет страница при загрузке (объединение CAL.p ∪ DATA, shareLink и т. д.).
// Код не дублируется: к исходнику дописывается только строка export с нужными внутренними константами.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function loadCanvas(names, file = path.join(ROOT, 'src', 'canvas.tsx')) {
  const src = fs.readFileSync(file, 'utf8') + `\nexport const __T = { ${names.join(', ')} };\n`;
  const r = await build({
    stdin: { contents: src, loader: 'tsx', resolveDir: path.dirname(file), sourcefile: path.basename(file) },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', charset: 'utf8',
    alias: { 'grok/canvas': path.join(ROOT, 'web', 'grok-canvas.tsx') },
    define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'error',
  });
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gd-canvas-')), 'canvas.mjs');
  fs.writeFileSync(out, r.outputFiles[0].text);
  try { return (await import(pathToFileURL(out).href)).__T; } finally { fs.rmSync(path.dirname(out), { recursive: true, force: true }); }
}
