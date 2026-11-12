// П11 и П13 (12.11.2026): статические файлы сайта из data/*.json (их пишет pipeline/split_data.mjs).
//   bill/<номер>/index.html — страница законопроекта со своим адресом: название, «Суть», «Кого коснётся», метки, все голосования
//                             по нему в календаре, путь закона, ссылки на sozd/vote; Open Graph для превью в мессенджерах.
//   bill/index.html         — список всех законопроектов (последнее голосование сверху).
//   feed/gd.xml             — RSS: голосования Госдумы по законопроектам (последние 100).
//   feed/<метка>.xml        — RSS по каждой метке «Для кого» / «Тема» / «Что меняется»; feed/index.html — список лент.
//   ics/laws.ics            — календарь (.ics): законы, вступающие в силу («Вступают в силу»).
//   ics/plenary.ics         — календарь (.ics): пленарные заседания Госдумы (прошедшие и запланированные).
//   sitemap.xml, robots.txt
// Только данные из data/*.json; если поля нет — оно не выводится. Запуск: node web/extras.mjs [каталог] (по умолчанию web/dist).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'web', 'dist'));
const SITE = 'https://ruslan7121.github.io/kalendar-zakonov/';
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

// ---------- данные ----------
const IDX = rd('index.json');
const CORE = rd('core.json');
const M = {}; // имя блока → объединённые значения всех месяцев
const CALP = [];
for (const mk of IDX.months) {
  const J = rd(IDX.file[mk]);
  for (const [k, v] of Object.entries(J)) {
    if (k === 'CAL.p') { CALP.push(...v); continue; }
    if (Array.isArray(v)) continue;
    if (v && typeof v === 'object') M[k] = Object.assign(M[k] || {}, v);
  }
}
const pick = (n) => Object.assign({}, CORE[n] || {}, M[n] || {});
const DATA = M.DATA || {}; const VT = pick('VT'); const BP = pick('BP'); const INFO = pick('INFO'); const PLAIN = pick('PLAIN');
const TRACK = pick('TRACK'); const ZTAG = CORE.ZTAG || {}; const LAWS = CORE.LAWS || { months: {} };

const pd = (d) => { const [a, b, c] = d.split('.').map(Number); return new Date(Date.UTC(c, b - 1, a)); };
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const hd = (d) => { const x = pd(d); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RDW = { '1-е': '1-е чтение', '2-е': '2-е чтение', '3-е': '3-е чтение' };
const readW = (r) => { r = (r || '').replace(/ё/g, 'е').trim(); if (/^к отклонению/.test(r)) return 'отклонение';
  const m = r.match(/^(\d)(?:-е)? чтение(?: таб\. \d+ (принятые|отклоненные) поправки)?$/); if (m) return `${m[1]}-е чтение${m[2] ? `: ${m[2]} поправки` : ''}`;
  for (const k of Object.keys(RDW)) if (r.startsWith(k)) return RDW[k]; return r && r !== '—' ? r : ''; };

// голосования по законопроектам
const BILLS = {}; // номер → { votes: [...], agenda: {short, full, url} }
for (const day of Object.keys(DATA).sort((a, b) => pd(a) - pd(b))) {
  for (const ln of String(DATA[day]).split('\n')) {
    const f = ln.split('|'); if (f.length < 6 || !/^\d+$/.test(f[0])) continue;
    const no = f[1]; if (!/^\d+-\d+$/.test(no)) continue;
    const [za, pr, vz, ng] = (f[5] || '').split('/').map((x) => +x);
    (BILLS[no] = BILLS[no] || { no, votes: [] }).votes.push({ id: f[0], day, time: VT[f[0]] || '', q: f[2], read: readW(f[3]), ok: f[4] === '1', za, pr, vz, ng });
  }
}
for (const p of CALP) for (const a of p.a || []) { const b = BILLS[a[0]]; if (b && !b.ag) b.ag = { short: a[1], url: a[3], full: a[4] }; }
const billOf = (no) => {
  const b = BILLS[no]; const inf = INFO[no] || {}; const bp = BP[no] || {}; const last = b.votes[b.votes.length - 1];
  const pl = b.votes.map((v) => PLAIN[v.id]).find((x) => x && (x.sut || x.title)) || {};
  const full = (b.ag && b.ag.full) || inf.t || pl.title || last.q;
  const short = (b.ag && b.ag.short) || '';
  const sut = (bp.sut && bp.sut.length ? bp.sut : inf.sut && inf.sut.length ? inf.sut : pl.sut) || [];
  const who = bp.who || inf.who || pl.who || '';
  return { ...b, last, full, short, title: short || full, sut: Array.isArray(sut) ? sut : [sut], who, ini: inf.ini || '', com: inf.com || '', tags: ZTAG[no] || [[], [], []], tr: TRACK[no] || null };
};
const ALL = Object.keys(BILLS).map(billOf).sort((a, b) => pd(b.last.day) - pd(a.last.day) || +b.last.id - +a.last.id);

// ---------- оформление ----------
const CSS = `:root{--bg:#fff;--sub:#F4F4F6;--bd:#E2E2E7;--tx:#1D1D1F;--tx2:#4E4E55;--tx3:#6E6E73;--ac:#0A66D6;--ok:#1B7A3A;--okb:#E3F4E8;--no:#C42B2B;--nob:#FDE8E8}
@media(prefers-color-scheme:dark){:root{--bg:#1C1C1E;--sub:#2C2C30;--bd:rgba(255,255,255,.18);--tx:#F5F5F7;--tx2:#C7C7CC;--tx3:#A1A1A6;--ac:#4DA3FF;--ok:#30D158;--okb:rgba(48,209,88,.16);--no:#FF6961;--nob:rgba(255,69,58,.18)}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;-webkit-text-size-adjust:100%}
main{max-width:820px;margin:0 auto;padding:20px 16px 48px}a{color:var(--ac)}h1{font-size:26px;line-height:1.25;margin:6px 0 10px;letter-spacing:-.01em}
h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--ac);margin:26px 0 8px}.top{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:14px}
.no{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ac)}.full{color:var(--tx2);margin:0 0 10px}.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.chip{font-size:13px;padding:2px 10px;border-radius:999px;background:var(--sub);border:1px solid var(--bd);color:var(--tx2);text-decoration:none}a.chip:hover{border-color:var(--ac);color:var(--ac)}
.box{background:var(--sub);border-radius:14px;padding:14px 16px}.box p{margin:0 0 8px}.box p:last-child{margin:0}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;padding:8px 6px;border-bottom:1px solid var(--bd);vertical-align:top}th{font-weight:600;color:var(--tx3);font-size:12px}
.ok{color:var(--ok);background:var(--okb)}.rej{color:var(--no);background:var(--nob)}.st{display:inline-block;font-size:12px;font-weight:600;padding:1px 8px;border-radius:999px}
.meta{font-size:14px;color:var(--tx3)}.list a.row{display:block;padding:10px 0;border-bottom:1px solid var(--bd);text-decoration:none;color:inherit}.list .row b{display:block;color:var(--tx)}
footer{margin-top:32px;font-size:13px;color:var(--tx3)}nav{font-size:14px;margin-bottom:10px;line-height:1.7}
@media(max-width:640px){table,tbody,tr,td{display:block}thead{display:none}tr{padding:10px 0;border-bottom:1px solid var(--bd)}td{border:0;padding:2px 0}td:first-child{font-weight:600}td:first-child br{display:none}td:first-child .meta{margin-left:8px;font-weight:400}h1{font-size:23px}}`;
const page = ({ title, desc, url, body, depth }) => {
  const up = '../'.repeat(depth);
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} — Календарь законов</title>
<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}"><link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="Календарь законов"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${SITE}og.png"><meta property="og:locale" content="ru_RU"><meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="Календарь законов: Госдума" href="${up}feed/gd.xml"><style>${CSS}</style></head>
<body><main><nav><a href="${up}">← Календарь законов</a> · <a href="${up}bill/">Все законопроекты</a> · <a href="${up}feed/">Подписки</a></nav>${body}
<footer>Только официальные источники: sozd.duma.gov.ru, vote.duma.gov.ru, duma.gov.ru. Страница собрана автоматически из данных календаря.</footer></main></body></html>`;
};
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const share = (v) => `${SITE}?d=${v.day}&v=${v.id}`;

// ---------- slug для меток ----------
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const slug = (s) => s.toLowerCase().split('').map((c) => (c in TR ? TR[c] : /[a-z0-9]/.test(c) ? c : '-')).join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
const GRP = [['w', 'Для кого'], ['t', 'Тема'], ['c', 'Что меняется']];
const TAGS = {}; // slug → { name, grp, bills }
for (const b of ALL) b.tags.forEach((g, gi) => (g || []).forEach((v) => { const k = slug(v); (TAGS[k] = TAGS[k] || { name: v, grp: GRP[gi][1], q: GRP[gi][0], bills: [] }).bills.push(b); }));

// ---------- запись ----------
const files = [];
const put = (rel, s) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); files.push(rel); };
for (const d of ['bill', 'feed', 'ics']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });

// страницы законопроектов
const TRK = [['in', 'Внесен'], ['kom', 'Комитет'], ['r1', '1-е чтение'], ['r2', '2-е чтение'], ['r3', '3-е чтение'], ['sf', 'Совет Федерации'], ['pr', 'Подписан']];
for (const b of ALL) {
  const url = `${SITE}bill/${b.no}/`; const v = b.last;
  const desc = cut(b.sut.join(' ') || b.full, 220);
  const tags = b.tags.flatMap((g, gi) => (g || []).map((x) => `<a class="chip" href="../../feed/${slug(x)}.xml" title="${esc(GRP[gi][1])}: RSS по метке">${esc(x)}</a>`)).join('');
  const rows = [...b.votes].reverse().map((x) => `<tr><td>${esc(hd(x.day))}${x.time ? `<br><span class="meta">${esc(x.time)}</span>` : ''}</td><td>${esc(x.read || '—')}</td><td><span class="st ${x.ok ? 'ok' : 'rej'}">${x.ok ? 'принят' : 'отклонен'}</span></td><td>за ${x.za}, против ${x.pr}, возд. ${x.vz}</td><td><a href="${esc(share(x))}">в календаре</a> · <a href="http://vote.duma.gov.ru/vote/${x.id}" rel="noopener">vote.duma.gov.ru</a></td></tr>`).join('');
  const tr = b.tr ? TRK.filter(([k]) => b.tr[k]).map(([k, l]) => `<span class="chip">${esc(l)}: ${esc(b.tr[k])}</span>`).join('') : '';
  const body = `<div class="top"><span class="no">${esc(b.no)}</span>${v.read ? `<span>${esc(v.read)}</span>` : ''}<span class="st ${v.ok ? 'ok' : 'rej'}">${v.ok ? 'принят' : 'отклонен'}</span><span class="meta">последнее голосование ${esc(hd(v.day))}</span></div>
<h1>${esc(b.title)}</h1>${b.short ? `<p class="full">${esc(b.full)}</p>` : ''}${tags ? `<div class="chips">${tags}</div>` : ''}
${b.sut.length || b.who ? `<h2>${b.votes.every((x) => !x.ok) ? 'Суть (предлагалось)' : 'Суть'}</h2><div class="box">${b.sut.map((p) => `<p>${esc(p)}</p>`).join('')}${b.who ? `<p><b>${b.votes.every((x) => !x.ok) ? 'Кого коснулось бы' : 'Кого коснётся'}:</b> ${esc(b.who)}</p>` : ''}</div>` : ''}
<h2>Голосования в Госдуме</h2><table><thead><tr><th>Дата</th><th>Стадия</th><th>Итог</th><th>Голоса</th><th></th></tr></thead><tbody>${rows}</tbody></table>
${tr ? `<h2>Путь закона</h2><div class="chips">${tr}</div>` : ''}
${b.ini || b.com ? `<h2>Кто внёс и ведёт</h2><div class="box">${b.ini ? `<p><b>Инициатор:</b> ${esc(b.ini)}</p>` : ''}${b.com ? `<p><b>Ответственный комитет:</b> ${esc(b.com)}</p>` : ''}</div>` : ''}
<h2>Источники</h2><p><a href="https://sozd.duma.gov.ru/bill/${esc(b.no)}" rel="noopener">Законопроект на sozd.duma.gov.ru</a> · <a href="${esc(share(v))}">Карточка в календаре</a></p>`;
  put(`bill/${b.no}/index.html`, page({ title: `${b.title} (${b.no})`, desc, url, body, depth: 2 }));
}
put('bill/index.html', page({ title: 'Все законопроекты', desc: `Законопроекты, по которым голосовала Госдума: ${ALL.length}.`, url: `${SITE}bill/`, depth: 1,
  body: `<h1>Все законопроекты</h1><p class="meta">${ALL.length} законопроектов, по которым есть голосования в календаре; последнее голосование — сверху.</p><div class="list">${ALL.map((b) => `<a class="row" href="${esc(b.no)}/"><span class="no">${esc(b.no)}</span> · ${esc(b.last.read || '')} · <span class="st ${b.last.ok ? 'ok' : 'rej'}">${b.last.ok ? 'принят' : 'отклонен'}</span> · <span class="meta">${esc(hd(b.last.day))}</span><b>${esc(b.title)}</b></a>`).join('')}</div>` }));

// RSS
const rfc = (day, time) => { const [h, m, s] = (time || '12:00:00').split(':').map(Number); const x = pd(day); x.setUTCHours(h - 3, m, s || 0); return x.toUTCString(); };
const items = (bs, n) => bs.flatMap((b) => b.votes.map((v) => ({ b, v }))).sort((x, y) => pd(y.v.day) - pd(x.v.day) || +y.v.id - +x.v.id).slice(0, n);
const rss = (title, desc, link, self, list) => `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(title)}</title><link>${esc(link)}</link><description>${esc(desc)}</description><language>ru</language><atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
${list.map(({ b, v }) => `<item><title>${esc(`${b.title} — ${v.read ? v.read + ', ' : ''}${v.ok ? 'принят' : 'отклонен'}`)}</title><link>${SITE}bill/${b.no}/</link><guid isPermaLink="false">kalendar-zakonov:vote:${v.id}</guid><pubDate>${rfc(v.day, v.time)}</pubDate><description>${esc(`${b.no}. ${b.sut.join(' ') || b.full} За ${v.za}, против ${v.pr}, воздержались ${v.vz}.`)}</description></item>`).join('\n')}
</channel></rss>`;
put('feed/gd.xml', rss('Календарь законов: голосования Госдумы', 'Голосования Госдумы по законопроектам: стадия, итог, суть — по официальным данным.', SITE, `${SITE}feed/gd.xml`, items(ALL, 100)));
for (const [k, tg] of Object.entries(TAGS)) put(`feed/${k}.xml`, rss(`Календарь законов: ${tg.name}`, `Голосования Госдумы по законопроектам с меткой «${tg.name}» (${tg.grp}).`, `${SITE}?${tg.q}=${encodeURIComponent(tg.name)}`, `${SITE}feed/${k}.xml`, items(tg.bills, 60)));
put('feed/index.html', page({ title: 'Подписки', desc: 'RSS-ленты и календари .ics «Календаря законов».', url: `${SITE}feed/`, depth: 1,
  body: `<h1>Подписки</h1><p>Добавьте адрес ленты в RSS-читалку (Feedly, Inoreader, NetNewsWire, Telegram-бот для RSS) или календарь .ics в Google / Apple / Яндекс Календарь (пункт «Подписаться по URL»).</p>
<h2>Календари .ics</h2><div class="list"><a class="row" href="../ics/laws.ics"><b>Законы вступают в силу</b><span class="meta">${SITE}ics/laws.ics</span></a><a class="row" href="../ics/plenary.ics"><b>Пленарные заседания Госдумы</b><span class="meta">${SITE}ics/plenary.ics</span></a></div>
<h2>RSS</h2><div class="list"><a class="row" href="gd.xml"><b>Все голосования Госдумы по законопроектам</b><span class="meta">${SITE}feed/gd.xml</span></a></div>
${GRP.map(([q, l]) => `<h2>${esc(l)}</h2><div class="chips">${Object.entries(TAGS).filter(([, x]) => x.q === q).sort((a, b) => b[1].bills.length - a[1].bills.length).map(([k, x]) => `<a class="chip" href="${k}.xml">${esc(x.name)} · ${x.bills.length}</a>`).join('')}</div>`).join('')}` }));

// .ics
const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (l) => { const out = []; let cur = ''; for (const ch of l) { if (Buffer.byteLength(cur + ch) > 73) { out.push(cur); cur = ' ' + ch; } else cur += ch; } out.push(cur); return out.join('\r\n'); };
const ymd = (d) => d.split('.').reverse().join('');
const nextDay = (d) => { const x = pd(d); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10).replace(/-/g, ''); };
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const ics = (name, evs) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kalendar-zakonov//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', fold(`X-WR-CALNAME:${icsEsc(name)}`), 'X-WR-TIMEZONE:Europe/Moscow',
  ...evs.flatMap((e) => ['BEGIN:VEVENT', fold(`UID:${e.uid}@kalendar-zakonov`), `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(e.d)}`, `DTEND;VALUE=DATE:${nextDay(e.d)}`, fold(`SUMMARY:${icsEsc(e.s)}`), fold(`DESCRIPTION:${icsEsc(e.x)}`), ...(e.u ? [fold(`URL:${e.u}`)] : []), 'TRANSP:TRANSPARENT', 'END:VEVENT']),
  'END:VCALENDAR'].join('\r\n') + '\r\n';
const lawEv = Object.values(LAWS.months || {}).flat().filter((x) => x && x.d && x.title).map((x, i) => ({ uid: `law-${ymd(x.d)}-${slug(x.law || x.title).slice(0, 60)}-${i}`, d: x.d, s: `Вступает в силу: ${x.title}`, x: [x.law, x.sut, x.who ? `Кого коснётся: ${x.who}` : ''].filter(Boolean).join('\n'), u: `${SITE}?tab=l` }));
put('ics/laws.ics', ics('Законы вступают в силу', lawEv));
const PST = { held: 'состоялось', confirmed: 'назначено', expected: 'ожидается по распорядку' };
const plEv = CALP.filter((p) => p && p.d).map((p) => ({ uid: `gd-${ymd(p.d)}`, d: p.d, s: `Пленарное заседание Госдумы${p.s && p.s !== 'held' ? ` (${PST[p.s] || p.s})` : ''}`, x: [(p.a || []).length ? `Законопроектов в повестке: ${p.a.length}` : '', p.src ? `Источник: ${p.src}` : ''].filter(Boolean).join('\n'), u: `${SITE}?d=${p.d}` }));
put('ics/plenary.ics', ics('Пленарные заседания Госдумы', plEv));

// sitemap, robots
put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[SITE, `${SITE}bill/`, ...ALL.map((b) => `${SITE}bill/${b.no}/`)].map((u) => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
put('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
console.log(`extras: ${ALL.length} страниц законопроектов, ${Object.keys(TAGS).length + 1} лент RSS, ${lawEv.length} законов и ${plEv.length} заседаний в .ics → ${path.relative(ROOT, OUT)}`);
