// Вспомогательный скрипт скриншотов (не тест): node tests/js/shot.mjs OUTDIR NAME WIDTH URL [JS-шаги через ;;] [clipSelector]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { siteServer } from './site_server.mjs';
const [OUT, NAME, WS, URL0, STEPS = '', CLIP = ''] = process.argv.slice(2);
const W = +WS; const mobile = W < 800;
const SITE = process.env.BASE ? { BASE: process.env.BASE, close() {} } : await siteServer();
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-shot-'));
const ch = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${prof}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok) => { let b = ''; ch.stderr.on('data', (x) => { b += x; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); }); });
const ws = new WebSocket(wsUrl); await new Promise((ok) => (ws.onopen = ok));
let seq = 0; const wait = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const [ok, no] = wait.get(m.id); wait.delete(m.id); m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result); } };
const cmd = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++seq; wait.set(id, [ok, no]); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (s, x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s)).result.value;
try {
  const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' }); const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
  await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s);
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: mobile ? 844 : 900, deviceScaleFactor: mobile ? 2 : 1, mobile }, s);
  if (mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
  await cmd('Page.navigate', { url: SITE.BASE + URL0 }, s); await sleep(3000);
  for (const st of STEPS.split(';;').filter(Boolean)) { if (/^wait:\d+$/.test(st)) { await sleep(+st.slice(5)); continue; } const r = await ev(s, st); if (r !== undefined) console.log('step →', JSON.stringify(r).slice(0, 400)); await sleep(900); }
  const p = { format: 'png' };
  const shot = await cmd('Page.captureScreenshot', p, s);
  fs.writeFileSync(path.join(OUT, `${NAME}-${W}.png`), Buffer.from(shot.data, 'base64')); console.log('saved', path.join(OUT, `${NAME}-${W}.png`));
} finally { ws.close(); ch.kill('SIGKILL'); SITE.close(); }
