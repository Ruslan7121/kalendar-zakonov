// Пункт 9 (12.11.2026): приостановленный «Новый вид» (maket/maket.tsx) не входит в сборку сайта.
// Собирает web/main.tsx теми же флагами, что web/build.sh, во временный файл и ищет отличительные признаки макета.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url'; import { build } from 'esbuild';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gd-nomaket-')), 'app.js');
await build({ entryPoints: [path.join(ROOT, 'web/main.tsx')], bundle: true, minify: true, charset: 'utf8', format: 'iife', jsx: 'automatic',
  alias: { 'grok/canvas': path.join(ROOT, 'web/grok-canvas.tsx') }, define: { 'process.env.NODE_ENV': '"production"' }, outfile: out, logLevel: 'warning', absWorkingDir: ROOT });
const js = fs.readFileSync(out, 'utf8');
// идентификаторы и данные, которые есть только в коде макета (минификатор имена переименовывает, строки — нет)
const MARK = ['ShablonApp', 'MaketApp', 'buildMkD', 'ViewToggle', 'MK_EXTRA', 'MK_X', 'Новый вид', 'Прежний вид', 'kz_new_saved', 'gd-1327114-8', 'accSoft', 'greenSoft', '10 ноября, вторник'];
for (const m of MARK) assert.ok(!js.includes(m), `в сборке сайта найден признак макета «${m}»`);
const src = fs.readFileSync(path.join(ROOT, 'src/canvas.tsx'), 'utf8') + fs.readFileSync(path.join(ROOT, 'web/main.tsx'), 'utf8');
assert.ok(!/from\s+['"][^'"]*maket/.test(src), 'src/canvas.tsx или web/main.tsx импортирует maket/');
for (const m of ['const ShablonApp', 'const MaketApp', 'function buildMkD', 'const MK_EXTRA', 'const MK_X', 'function ViewToggle']) assert.ok(!src.includes(m), `«${m}» снова в src/canvas.tsx`);
assert.ok(/export default function App\(\) \{\s*return <CalendarApp \/>;/.test(src), 'экспорт по умолчанию должен быть <CalendarApp />');
assert.ok(js.includes('ruslan7121.github.io/kalendar-zakonov'), 'в сборке нет CalendarApp (адрес сайта для «Поделиться»)');
console.log(`OK test_no_maket: сборка ${js.length} символов, признаков макета нет (${MARK.length})`);
