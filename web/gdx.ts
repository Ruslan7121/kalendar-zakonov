// 12.11.2026 (пункт 10): загрузчик данных сайта по месяцам (data/*.json, их пишет pipeline/merge/split_data.mjs).
// До первой отрисовки: core + месяц дня из ссылки ?d= (иначе последний день с голосованиями) + текущий месяц календаря.
// Остальные месяцы — когда экран их просит (GDX.need из canvas), соседние с открытым — заранее, в фоне.
// Объекты GDX.S.* — те самые константы DATA, CAL, ORG, … кода сайта: месяц вливается в них на месте, в порядке ключей и
// элементов canvas (оглавление ko/ord), после чего подписчики (useGDV) перерисовывают экран. Не загрузился месяц —
// GDX.err[месяц], экран показывает ошибку и «Повторить», а не пустой календарь.
import M0 from './gen/manifest.json';

type Man = { months: string[]; file: Record<string, string>; DAYS: string[]; COUNT: Record<string, number>; ko: Record<string, string[]>; ord: Record<string, string>; cnt: Record<string, any>; split: { day: string[]; bill: string[]; arr: string[]; core: string[] } };
const M = M0 as unknown as Man;
const S: any = {};
const loaded = new Set<string>(); const err: Record<string, string> = {}; const busy: Record<string, Promise<void>> = {};
const subs = new Set<() => void>(); const chunks: Record<string, Record<string, any[]>> = {};
const base = () => new URL('data/', document.baseURI).href;
let tick = 0;
const notify = () => { if (tick) return; tick = setTimeout(() => { tick = 0; G.v++; subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }, 0) as unknown as number; };

async function getJSON(f: string) {
  const r = await fetch(base() + f, { cache: 'default' });
  if (!r.ok) throw new Error(`data/${f}: HTTP ${r.status}`);
  try { return await r.json(); } catch (e) { throw new Error(`data/${f}: файл повреждён (${(e as Error).message})`); }
}
const arrRef = (p: string) => (p === 'CAL.p' ? S.CAL.p : p === 'CAL.g' ? S.CAL.g : S[p]);
function merge(mk: string, J: any) {
  const mi = M.months.indexOf(mk);
  for (const n of M.split.day) if (J[n]) { const o = S[n]; Object.assign(o, J[n]); const ks = M.ko[n].filter((k) => k in o); const v = ks.map((k) => o[k]); for (const k of Object.keys(o)) delete o[k]; ks.forEach((k, i) => { o[k] = v[i]; }); }
  for (const n of M.split.bill) if (J[n]) Object.assign(S[n], J[n]);
  for (const p of M.split.arr) { (chunks[p] = chunks[p] || {})[mi] = J[p] || [];
    const a = arrRef(p); const c: Record<string, number> = {}; a.length = 0;
    for (const ch of M.ord[p]) { const k = parseInt(ch, 36); const src = chunks[p][k]; if (!src) continue; const i = c[k] || 0; c[k] = i + 1; a.push(src[i]); } }
  loaded.add(mk); delete err[mk];
  try { G.onMerge && G.onMerge(); } catch (e) { console.error(e); }
}
function load(mk: string): Promise<void> {
  if (loaded.has(mk)) return Promise.resolve();
  if (!busy[mk]) busy[mk] = getJSON(M.file[mk]).then((J) => { merge(mk, J); }, (e) => { err[mk] = (e && e.message) || String(e); console.error('gdx', mk, e); })
    .finally(() => { delete busy[mk]; notify(); });
  return busy[mk];
}
function prefetch(ms: string[]) {
  const nb = new Set<string>(); ms.forEach((k) => { const i = M.months.indexOf(k); [i - 1, i + 1].forEach((j) => { if (j >= 0 && j < M.months.length) nb.add(M.months[j]); }); });
  const go = () => nb.forEach((k) => { if (!loaded.has(k) && !err[k]) load(k); });
  const ric = (window as any).requestIdleCallback; ric ? ric(go, { timeout: 1500 }) : setTimeout(go, 300);
}
// 16.11.2026: оперативные новости — data/live.json (пишет pipeline/collect/news_live.py по расписанию workflow news, публикует publish.sh --live).
// Имя постоянное, кэш CDN обходится параметром ?t=. Первый ответ — то, что уже было на момент открытия; всё, что пришло позже,
// попадает в fresh: экран показывает плашку «N новых» и не вставляет их под палец, пока пользователь не нажмет ее.
const live: { items: any[]; upd: string; fresh: Set<string>; base: boolean } = { items: [], upd: '', fresh: new Set(), base: false };
async function pollLive() {
  try {
    const r = await fetch(base() + 'live.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const J = await r.json(); const items = Array.isArray(J && J.items) ? J.items.filter((x: any) => x && x.u && x.t && x.o && x.d) : [];
    const had = new Set(live.items.map((x) => x.u)); let ch = items.length !== live.items.length;
    for (const x of items) if (!had.has(x.u)) { ch = true; if (live.base) live.fresh.add(x.u); }
    live.items = items; live.upd = (J && J.upd) || ''; live.base = true; if (ch) notify();
  } catch (e) { /* нет файла или сети — новости остаются как были */ }
}
function startLive() {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function' || typeof fetch !== 'function') return; // без браузера (тесты на Node) — не опрашиваем
  pollLive(); let t = 0 as unknown as number;
  const arm = () => { clearInterval(t); if (document.visibilityState === 'visible') t = setInterval(pollLive, 120000) as unknown as number; };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pollLive(); arm(); }); arm();
}
const G: any = {
  S, M, err, v: 0, onMerge: null as null | (() => void), live,
  ackLive() { if (live.fresh.size) { live.fresh.clear(); notify(); } },
  pollLive: () => pollLive(), // проверить сейчас (тесты; плашку «N новых» показывает только то, что пришло после первого ответа)
  has: (mk: string) => loaded.has(mk),
  // вызывается из render: только запускает загрузку, синхронно ничего не перерисовывает
  need(ms: string[]) { const want = ms.filter((k) => M.file[k] && !loaded.has(k) && !err[k] && !busy[k]); want.forEach((k) => { load(k).then(() => { if (loaded.has(k)) prefetch([k]); }); }); },
  retry(ms: string[]) { ms.forEach((k) => { delete err[k]; }); notify(); G.need(ms); },
  sub(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
  loaded: () => [...loaded],
};

// Месяцы первой отрисовки — те же правила, что у canvas: QS = ?query + #hash; день из ?d= (если он есть в DAYS),
// иначе последний день; календарь — месяц дня из ссылки ?d=&v=, иначе текущий месяц (по часам браузера, как calCk(new Date())).
export function firstMonths(loc: { search: string; hash: string }, now = new Date()): string[] {
  const q = new URLSearchParams(loc.search); try { new URLSearchParams((loc.hash || '').replace(/^#/, '')).forEach((v, k) => { if (!q.has(k)) q.set(k, v); }); } catch (e) { /* как в canvas */ }
  /* 16.11.2026: без ссылки сайт открывается на «Вступают в силу» (данные — в core), месяцы календаря грузятся уже после первой отрисовки.
     До отрисовки месяц нужен только ссылкам в календарь: ?d=, поиск/фильтры (q, w, t, c, org), ?tab=c|d|i, startapp Telegram d…_v… / itogi / news. */
  const sp = q.get('tgWebAppStartParam') || ''; const spm = sp.match(/^d(\d{2})(\d{2})(\d{4})_v\d+$/);
  const d = q.get('d') || (spm ? `${spm[1]}.${spm[2]}.${spm[3]}` : null); const ms: string[] = [];
  const cal = !!d || ['q', 'w', 't', 'c', 'org'].some((k) => q.has(k)) || ['c', 'd', 'i'].includes(q.get('tab') || '') || sp === 'itogi' || sp === 'news';
  if (!cal) return [];
  if (d && M.DAYS.includes(d)) ms.push(d.slice(3));
  if (M.DAYS.length) ms.push(M.DAYS[M.DAYS.length - 1].slice(3));
  ms.push(`${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`);
  return [...new Set(ms)].filter((k) => M.file[k]);
}
export async function boot(): Promise<void> {
  const core = await getJSON(M.file.core);   // без общего файла сайт не работает — ошибку покажет main.tsx
  for (const n of M.split.core) S[n] = core[n];
  for (const n of [...M.split.day, ...M.split.bill]) S[n] = core[n] || {};
  S.CAL = core.CAL; S.CAL.p = []; S.CAL.g = []; S.ORG = []; S.ORGNEWS = [];
  (globalThis as any).__GDX = G;
  const ms = firstMonths(window.location);
  await Promise.all(ms.map(load));            // ошибка месяца не роняет страницу: экран покажет её и «Повторить»
  if (tick) { clearTimeout(tick); tick = 0; }
  prefetch(ms.filter((k) => loaded.has(k)));
  // 16.11.2026: открытие без месяцев («Вступают в силу») — последний месяц календаря подгружается в фоне, когда страница уже показана
  // 16.11.2026: скачивание начинается сразу (раньше ждало простоя до 2,5 с — в Telegram «Календарь» долго висел на «Загружаю данные»);
  // страница не ждет его: запрос уходит сразу после boot (до отрисовки по-прежнему только core), месяц вливается, когда придет
  if (!ms.length && M.DAYS.length) { const lm = M.DAYS[M.DAYS.length - 1].slice(3); setTimeout(() => G.need([lm]), 0); }
  setTimeout(startLive, 0); // оперативные новости — после первой отрисовки, раз в 2 минуты, пока вкладка видна
}
