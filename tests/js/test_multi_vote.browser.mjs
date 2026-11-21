// 19.11.2026 (решение владельца): если по законопроекту за день было несколько голосований (таблицы поправок, 2-е и 3-е чтение),
// ссылка «Поделиться» ?d=&v= открывает карточку именно этого голосования: значок чтения, «принят/отклонен», кольцо «за»,
// вопрос, время и разбивка по фракциям — этого v=, а не первого голосования дня. В карточке — переключатель «Голосования за день»
// (выбрано голосование из v=), нажатие на другое голосование показывает его. Без v= выбрано итоговое голосование дня.
// Проверяются ВСЕ такие случаи во всех днях DATA, на 390 px (телефон, touch) и 1366 px.
// Сайт собирается как web/build.sh (tests/js/site_server.mjs). Нужен Chrome; без него — SKIP, при GD_REQUIRE_BROWSER=1 (CI) — падает.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { loadCanvas } from './load_canvas.mjs';
import { siteServer } from './site_server.mjs';

const T = await loadCanvas(['DATA', 'parse', 'normRead', 'RD', 'VT', 'billVote', 'voteQ']);
// все пары день + законопроект с несколькими голосованиями
const CASES = [];
for (const d of Object.keys(T.DATA)) { const by = {}; for (const v of T.parse(T.DATA[d])) { if (!/^\d+-\d+$/.test(v.doc)) continue; (by[v.doc] = by[v.doc] || []).push(v); }
  for (const [bn, vs] of Object.entries(by)) if (vs.length > 1) CASES.push({ d, bn, vs }); }
const NV = CASES.reduce((a, c) => a + c.vs.length, 0);
assert.ok(CASES.length >= 20, `мало случаев с несколькими голосованиями: ${CASES.length}`);
const chip = (v) => { const r = T.RD[T.normRead(v.reading || '')]; return r && r !== 'ратификация' ? r : ''; };

// без v= — итоговое голосование дня: последнее не по таблице поправок
for (const c of CASES) { const fin = [...c.vs].reverse().find((v) => !/таб\./.test(v.reading)) || c.vs[c.vs.length - 1]; const bv = T.billVote(c.bn, c.d);
  assert.deepEqual(bv, [c.d, fin.id], `${c.d} ${c.bn}: без v= должно быть выбрано итоговое голосование ${fin.id} (${fin.reading})`); }

const which = (c) => { try { return execFileSync('sh', ['-c', `command -v ${c}`]).toString().trim(); } catch { return ''; } };
const CHROME = process.env.CHROME || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
if (!CHROME) { if (process.env.GD_REQUIRE_BROWSER === '1') throw new Error('Chrome не найден'); console.log(`SKIP test_multi_vote.browser: нет Chrome (без браузера проверен выбор без v= для ${CASES.length} случаев)`); process.exit(0); }

const SITE = await siteServer(); const BASE = SITE.BASE;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'gd-chrome-'));
const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${prof}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, no) => { let b = ''; const t = setTimeout(() => no(new Error('Chrome не запустился: ' + b)), 60000);
  ch.stderr.on('data', (x) => { b += x; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } }); });
const ws = new WebSocket(wsUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let seq = 0; const wait = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const [ok, no] = wait.get(m.id); wait.delete(m.id); m.error ? no(new Error(JSON.stringify(m.error))) : ok(m.result); } };
const cmd = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++seq; wait.set(id, [ok, no]); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (s, x) => (await cmd('Runtime.evaluate', { expression: x, returnByValue: true }, s)).result.value;

// что показывает открытое окно карточки k = день + законопроект
const READ = (k) => `(() => { const w = document.querySelector('[data-gdwin] [data-ivk="${k}"]'); if (!w) return null; const p = w.querySelector('[data-panel]'); if (!p) return null;
  const tx = (e) => e ? (e.textContent || '').trim() : ''; const tabs = [...w.querySelectorAll('[data-vsw] [data-vid]')];
  return { panel: p.dataset.panel, ty: tx(w.querySelector('[data-ivty]')), res: (w.querySelector('[data-ivres]') || {}).dataset?.ivres || '', head: tx(w.querySelector('[data-ivs]')),
    q: tx(p.querySelector('[data-voteq]')), time: tx(p.querySelector('[data-vtime]')), fr: [...p.querySelectorAll('[data-frv]')].map((e) => e.dataset.frv),
    tabs: tabs.map((e) => e.dataset.vid), sel: tabs.filter((e) => e.getAttribute('aria-selected') === 'true').map((e) => e.dataset.vid),
    shareBottom: !!p.querySelector('[data-share-bottom]'), share: [...p.querySelectorAll('button')].some((e) => /^Поделиться/.test(tx(e))) }; })()`;

const check = (tag, r, c, v, mobile, fails) => {
  if (!r) { fails.push(`${tag}: карточка не открылась`); return; }
  if (r.panel !== v.id) fails.push(`${tag}: показано голосование ${r.panel}, а не ${v.id}`);
  const swIds = c.vs.filter((z) => !/таб\./.test(z.reading)).map((z) => z.id); const shown = swIds.length >= 2 ? swIds : []; // 20.11.2026: голосования по таблицам поправок в переключателе не показываются
  const wantSel = shown.includes(v.id) ? [v.id] : [];
  if (r.sel.join() !== wantSel.join()) fails.push(`${tag}: в переключателе выбрано ${JSON.stringify(r.sel)}, ждали ${JSON.stringify(wantSel)}`);
  if (r.tabs.join() !== shown.join()) fails.push(`${tag}: в переключателе ${JSON.stringify(r.tabs)}, ждали ${JSON.stringify(shown)}`);
  const cp = chip(v); if (cp && r.ty !== cp) fails.push(`${tag}: значок чтения «${r.ty}», ждали «${cp}» (${v.reading})`);
  if (r.res !== (v.ok ? 'ok' : 'no')) fails.push(`${tag}: итог «${r.res}», ждали ${v.ok ? 'принят' : 'отклонен'}`);
  if (!r.head.startsWith(String(v.total[0] || 0) + c.bn)) fails.push(`${tag}: кольцо «за» не ${v.total[0]}: «${r.head.slice(0, 30)}»`);
  const q0 = T.voteQ(v); if (q0 && r.q.replace(/^Вопрос голосования/, '') !== q0) fails.push(`${tag}: вопрос «${r.q.slice(0, 80)}», ждали «${q0}»`);
  const vt = T.VT[v.id]; if (vt && !r.time.includes(vt.slice(0, 5))) fails.push(`${tag}: время «${r.time}», ждали ${vt}`);
  if (v.fr) { const exp = Object.entries(v.fr).map(([f, z]) => `${f}:${z.v.join(',')}`); if (!r.fr.length) fails.push(`${tag}: нет разбивки по фракциям`); for (const f of r.fr) if (!exp.includes(f)) fails.push(`${tag}: фракция ${f} не из этого голосования`); }
  if (!r.share) fails.push(`${tag}: нет «Поделиться»`);
};
const until = async (s, k, id, ms = 15000) => { const t0 = Date.now(); let r; for (;;) { r = await ev(s, READ(k)); if ((r && r.panel === id) || Date.now() - t0 > ms) return r; await sleep(250); } };

const WIDTHS = [{ w: 390, h: 844, mobile: true, dpr: 2 }, { w: 1366, h: 900, mobile: false, dpr: 1 }];
const fails = []; let opens = 0, clicks = 0;
try {
  for (const W of WIDTHS) {
    const { targetId } = await cmd('Target.createTarget', { url: 'about:blank' }); const { sessionId: s } = await cmd('Target.attachToTarget', { targetId, flatten: true });
    await cmd('Page.enable', {}, s); await cmd('Runtime.enable', {}, s);
    await cmd('Emulation.setDeviceMetricsOverride', { width: W.w, height: W.h, deviceScaleFactor: W.dpr, mobile: W.mobile }, s);
    if (W.mobile) await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
    for (const c of CASES) {
      const k = c.d + c.bn;
      for (const v of c.vs) { // открытие по каждому v=
        await cmd('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.removeItem('kz_state_v1')}catch(e){}" }, s); await cmd('Page.navigate', { url: `${BASE}/?d=${c.d}&v=${v.id}` }, s); await sleep(400);
        check(`${W.w}px ?d=${c.d}&v=${v.id} (${c.bn})`, await until(s, k, v.id), c, v, W.mobile, fails); opens++;
      }
      // переключатель: из последнего открытого — нажатием на первое голосование дня
      // 20.11.2026 (владелец): в переключателе только чтения, голосований по таблицам поправок там нет
      const sw = c.vs.filter((v) => !/таб\./.test(v.reading));
      const ids = await ev(s, `[...document.querySelectorAll('[data-gdwin] [data-ivk="${k}"] [data-vsw] [data-vid]')].map(b => b.dataset.vid)`);
      if (sw.length < 2) { if ((ids || []).length) fails.push(`${W.w}px ${c.d} ${c.bn}: переключатель не должен показываться, а в нем ${ids.length} кнопок`); continue; }
      if (JSON.stringify(ids) !== JSON.stringify(sw.map((v) => v.id))) fails.push(`${W.w}px ${c.d} ${c.bn}: в переключателе ${ids}, ждали ${sw.map((v) => v.id)}`);
      const v0 = sw[0]; await ev(s, `document.querySelector('[data-gdwin] [data-ivk="${k}"] [data-vsw] [data-vid="${v0.id}"]')?.click()`);
      check(`${W.w}px ${c.d} ${c.bn}: нажатие на ${v0.id}`, await until(s, k, v0.id, 5000), c, v0, W.mobile, fails); clicks++;
    }
    await cmd('Target.closeTarget', { targetId });
  }
} finally { try { ws.close(); } catch {} ch.kill('SIGKILL'); SITE.close(); setTimeout(() => fs.rmSync(prof, { recursive: true, force: true }), 500); }
assert.deepEqual(fails, [], 'карточка показывает не то голосование:\n  ' + fails.join('\n  '));
console.log(`OK test_multi_vote.browser: ${CASES.length} случаев (законопроект + день), ${NV} голосований; ${opens} открытий по v= и ${clicks} переключений (390 и 1366 px)`);
