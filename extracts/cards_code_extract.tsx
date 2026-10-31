/* =====================================================================
 * «Календарь законов» — extract of card / open-close / sticky code (READ-ONLY copy)
 * Stack: React (TSX) single-file Cursor Canvas page; imports Page/Text/Segmented/Input/
 *   LinkCards/useGrokTheme/useState/useMemo/useRef/useEffect from 'grok/canvas'.
 *   All styling is inline style objects + a few injected <style> strings (css(t), DKCSS, ADAPT).
 *   No CSS modules / Tailwind. Desktop is rendered with CSS `zoom: Z` (GZ) on the content wrapper.
 * Hosting: published as Cursor canvas bf62072d-8b34-4818-be9f-ff23bf0abe68; the mirror
 *   https://golosovaniya-gosdumy-22-10-2026-54jr.pages.grok.bot/ serves the published canvas inside a
 *   sandboxed iframe (/__cursor/frame), no separate build/deploy.
 * Source: /workspace/out/canvas.tsx (2679 lines, ~1.0 MB; code identical to published revision
 *   as of 31.10.2026 03:4x Europe/Warsaw — only data constants differ / were refreshed).
 * Line numbers below ("L1234") are original line numbers in canvas.tsx.
 * Data constants (DATA, NV, SUM, FULL, ZTAG, CAL, ...) are stripped.
 * ===================================================================== */


// ===== Imports, theme palette, ADAPT/theme override — L1-L14 =====
/*L1*/ import { Page, Text, Segmented, Input, Status as Status0, LinkCards, useGrokTheme as useGT0, useState, useMemo, useRef, useEffect } from 'grok/canvas';
/*L2*/ const LIGHT = { bg: { base: '#FFFFFF', subtle: '#F4F4F6' }, border: { default: '#D9D9DE', subtle: '#E8E8EC' }, fill: { accentSubtle: '#E8F0FE' }, text: { primary: '#1D1D1F', secondary: '#5F5F66', tertiary: '#8E8E93', accent: '#0A66D6' } };
/*L3*/ const DARK = { bg: { base: '#1C1C1E', subtle: '#2C2C30' }, border: { default: 'rgba(255,255,255,0.22)', subtle: 'rgba(255,255,255,0.15)' }, fill: { accentSubtle: '#0F2A47' }, text: { primary: '#F5F5F7', secondary: '#C7C7CC', tertiary: '#8E8E93', accent: '#409CFF' } };
/*L4*/ let DK = false;
/*L5*/ const SYS_L = ['#34C759', '#FF3B30', '#FF9F0A', '#9A9AA1'], SYS_D = ['#30D158', '#FF453A', '#FF9F0A', '#8E8E93'];
/*L6*/ const INK_L = ['#248A3D', '#D70015', '#B25000', '#6E6E73'], INK_D = ['#30D158', '#FF6961', '#FFB340', '#AEAEB2'];
/*L7*/ const SYS: string[] = [...SYS_L];
/*L8*/ const INK: string[] = [...INK_L];
/*L9*/ function setPal(d: boolean) { DK = d; SYS.splice(0, 4, ...(d ? SYS_D : SYS_L)); INK.splice(0, 4, ...(d ? INK_D : INK_L)); }
/*L10*/ const FLASH = () => DK ? 'rgba(64,156,255,0.28)' : 'rgba(10,102,214,0.14)';
/*L11*/ function useGrokTheme(): any { const t: any = useGT0(); return { ...t, ...(DK ? DARK : LIGHT), kind: DK ? 'dark' : 'light' }; }
/*L12*/ const ADAPT = () => { const P: any = DK ? DARK : LIGHT; const v: any = { base: P.bg.base, subtle: P.bg.subtle, primary: P.text.primary, secondary: P.text.secondary, tertiary: P.text.tertiary }; const r = (a: string, k: string, prop: string, val: string) => `html #root [data-grok-adapt-${a}="${k}"]{${prop}:${val}!important}`; let c = ['base', 'subtle'].map((k) => r('bg', k, 'background-color', v[k])).join('') + ['primary', 'secondary', 'tertiary'].map((k) => r('ink', k, 'color', v[k])).join('') + r('border', 'default', 'border-color', P.border.default) + r('border', 'strong', 'border-color', P.border.default); ['fill', 'stroke', 'stop-color', 'flood-color'].forEach((pr) => { [['paper-base', v.base], ['paper-subtle', v.subtle], ['ink-primary', v.primary], ['ink-secondary', v.secondary], ['ink-tertiary', v.tertiary]].forEach(([k, val]) => { c += r(pr, k, pr, val); }); }); return c; };
/*L13*/ const THO0 = (() => { try { const v = localStorage.getItem('gd_theme'); return v === 'dark' || v === 'light' ? v : null; } catch (e) { return null; } })();
/*L14*/ function Status({ tone, children, b }: { tone: string; children: React.ReactNode; b?: boolean }) { const ok = tone === 'success'; return <span style={{ border: `1px solid ${DK ? (ok ? 'rgba(48,209,88,0.45)' : 'rgba(255,105,97,0.45)') : (ok ? '#9FD6AE' : '#F0ABAB')}`, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', padding: b ? '2px 8px' : '1px 7px', borderRadius: 9999, fontSize: 12, fontWeight: 600, lineHeight: 1.4, whiteSpace: 'nowrap', background: DK ? (ok ? 'rgba(48,209,88,0.18)' : 'rgba(255,69,58,0.2)') : (ok ? '#E3F4E8' : '#FDE8E8'), color: DK ? (ok ? '#30D158' : '#FF6961') : (ok ? '#1B7A3A' : '#C42B2B') }}>{children}</span>; }

// ===== card style, Exp (height animation via grid-template-rows), css(t) global styles — L1556-L1558 =====
/*L1556*/ const card = (t: any) => ({ background: t.bg.base, border: `1px solid ${t.border.subtle}`, borderRadius: 16, boxShadow: DK ? 'none' : `0 1px 2px ${t.border.subtle}, 0 8px 24px ${t.border.subtle}` }) as const;
/*L1557*/ function Exp({ on, children }: { on: boolean; children: () => any }) { const [st, setSt] = useState(on ? 2 : 0); const [o, setO] = useState(on); const fr = useRef(true); const kr = useRef<any>(null); if (on) kr.current = children(); useEffect(() => { if (fr.current) { fr.current = false; return; } setSt(1); setO(false); if (on) { const r = requestAnimationFrame(() => requestAnimationFrame(() => setO(true))); const tm = setTimeout(() => setSt(2), 320); return () => { cancelAnimationFrame(r); clearTimeout(tm); }; } const tm = setTimeout(() => setSt(0), 320); return () => clearTimeout(tm); }, [on]); if (!on && st === 0) return null; const sd = on && st === 2; return <div data-xa={sd ? undefined : '1'} style={sd ? undefined : { display: 'grid', gridTemplateRows: o ? '1fr' : '0fr', transition: 'grid-template-rows .3s ease' }}><div style={sd ? undefined : { overflow: 'clip', minHeight: 0 }}>{kr.current}</div></div>; }
/*L1558*/ const css = (t: any) => `:root,html,body{color-scheme:${DK ? 'dark' : 'light'}!important;background:${DK ? '#000000' : '#FFFFFF'}!important;color:${DK ? '#F5F5F7' : '#1D1D1F'}}@keyframes gdIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}.gd-anim{animation:gdIn .22s cubic-bezier(.2,.8,.2,1)}.gd-row{transition:background-color .15s ease}.gd-chip:hover{filter:brightness(0.95)}.gd-chip:active{transform:scale(0.97)}.gd-row:hover{background-color:${t.bg.subtle}!important}.gd-rw{-webkit-tap-highlight-color:transparent;transition:background-color .15s ease}@media (hover:hover){.gd-rw:hover{background-color:${t.bg.subtle}}.gd-rw:hover .gd-bc{color:${t.text.accent}!important}}.gd-cl2{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.gd-cl1{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}[data-xa] [data-fb],[data-xa] [data-ivs]{position:relative!important;top:auto!important}.gd-bt{-webkit-tap-highlight-color:transparent;transition:background-color .15s ease,border-color .15s ease}.gd-bt:focus-visible{outline:1.5px solid ${t.text.accent}}@media (hover:hover){.gd-bt:hover{background-color:${DK ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.045)'}!important;border-color:${t.border.default}!important}.gd-bt:hover>.gd-bc{color:${t.text.accent}!important}}.gd-tap{transition:background-color .15s ease,opacity .15s}.gd-tap:hover{background-color:${t.bg.subtle}!important}.gd-tap:focus-visible,.gd-row:focus-visible{outline:1.5px solid ${t.text.accent};outline-offset:2px;border-radius:12px}html,body{overflow-anchor:none}@media (prefers-reduced-motion: reduce){.gd-anim{animation:none}.gd-row,.gd-tap{transition:none}}`;

// ===== revealCard (scroll a vote row into view) — L1676-L1683 =====
/*L1676*/ const revealCard = (id: string, again = true) => {
/*L1677*/   if (again) setTimeout(() => revealCard(id, false), 160);
/*L1678*/   const wr = document.querySelector(`[data-vid="${id}"]`) as HTMLElement | null; const row = wr && wr.firstElementChild as HTMLElement | null; if (!wr || !row) return;
/*L1679*/   let bx = wr.parentElement; while (bx && bx !== document.body) { const o = getComputedStyle(bx).overflowY; if ((o === 'auto' || o === 'scroll') && bx.scrollHeight > bx.clientHeight) break; bx = bx.parentElement; }
/*L1680*/   const bar = document.querySelector('[data-gdbar]') as HTMLElement | null; const barB = () => { if (!bar) return 0; const r = bar.getBoundingClientRect(); return r.top <= 1 && r.height > 0 ? r.bottom : 0; };
/*L1681*/   if (bx && bx !== document.body) { const d = bx.getBoundingClientRect().top - barB(); if (d < 0) window.scrollBy(0, d); const hd = bx.querySelector('[data-colhead]') as HTMLElement | null; bx.scrollTop += (wr.getBoundingClientRect().top - Math.max(bx.getBoundingClientRect().top, barB())) / GZ - (hd ? hd.offsetHeight : 0); }
/*L1682*/   else { const tp = Math.max(barB(), parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gd-top')) || 0); window.scrollBy(0, wr.getBoundingClientRect().top - tp); }
/*L1683*/ };

// ===== Panel (expanded vote card body; DEEP scroll) — L1882-L1959 =====
/*L1882*/ function Panel({ v, m, day, inl }: { v: Vote; m?: boolean; day: string; inl?: boolean }) {
/*L1883*/   const t = useGrokTheme();
/*L1884*/   const b = billNo(v.doc);
/*L1885*/   const tx = b ? TX[b] : undefined;
/*L1886*/   const pl = PLAIN[v.id] || {};
/*L1887*/   const inf = INFO[billNo(v.doc) || ''] || {};
/*L1888*/   const yo = (x: any) => typeof x === 'string' ? x.replace(/ё/g, 'е').replace(/Ё/g, 'Е') : x;
/*L1889*/   const title = yo(fullT(b, pl.title, inf.t, v.full));
/*L1890*/   const rw = readWord(v.reading);
/*L1891*/   const dt = new Date(+day.slice(6, 10), +day.slice(3, 5) - 1, +day.slice(0, 2));
/*L1892*/   const tot = v.total[0];
/*L1893*/   const ctx = cardText(v, day);
/*L1894*/   const secs: [string, string[]][] = [
/*L1895*/     ...(ctx.sut ? [['Суть', ctx.sut.map(yo)] as [string, string[]]] : []),
/*L1896*/     ...(ctx.who ? [[v.ok ? 'Кого коснется' : 'Кого коснулось бы', [yo(ctx.who)]] as [string, string[]]] : []),
/*L1897*/     ...(ctx.next.length ? [[v.ok ? 'Что дальше' : 'Почему отклонили', ctx.next.map(yo)] as [string, string[]]] : []),
/*L1898*/   ];
/*L1899*/   const ini = yo(inf.ini || INI_ADD[b || '']) as string | undefined;
/*L1900*/   const iv = iniView(ini, b || undefined);
/*L1901*/   const iniM = ini && !ini.includes(';') ? ini.match(/^(Депутаты Государственной Думы|Депутат Государственной Думы|Сенаторы Российской Федерации|Сенатор Российской Федерации)[\s,:]*/) : null;
/*L1902*/   const iniL: Record<string, string> = { 'Депутаты Государственной Думы': 'Инициаторы — депутаты Государственной Думы', 'Депутат Государственной Думы': 'Инициатор — депутат Государственной Думы', 'Сенаторы Российской Федерации': 'Инициаторы — сенаторы Российской Федерации', 'Сенатор Российской Федерации': 'Инициатор — сенатор Российской Федерации' };
/*L1903*/   const pass: [string, any][] = [...(iv ? [iv] : []), ['Ответственный комитет', yo(inf.com)]];
/*L1904*/   const links = [
/*L1905*/     ...(b ? [{ title: 'Законопроект', href: `https://sozd.duma.gov.ru/bill/${b}` }] : []),
/*L1906*/     ...(b && tx ? [{ title: `Текст (${FMT[tx.fmt] || 'файл'})`, href: `https://sozd.duma.gov.ru/download/${tx.id}` }] : []),
/*L1907*/     { title: `Голосование № ${v.id}`, href: `http://vote.duma.gov.ru/vote/${v.id}` },
/*L1908*/   ];
/*L1909*/   const CAP = ['за', 'против', 'воздержались', 'не голосовали'];
/*L1910*/   const okC = v.ok ? ['rgba(52,199,89,0.16)', INK[0]] : ['rgba(255,59,48,0.13)', INK[1]];
/*L1911*/   const box = { background: t.bg.base, border: `1px solid ${t.border.subtle}`, borderRadius: 12, padding: m ? '10px 10px' : '12px 14px', minWidth: 0 } as const;
/*L1912*/   const h = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: (DK ? '#409CFF' : 'rgb(10,100,214)'), marginBottom: 4 } as const;
/*L1913*/   const left = (
/*L1914*/     <div style={{ display: 'flex', flexDirection: 'column', gap: m ? 8 : 10, minWidth: 0 }}>
/*L1915*/       <div style={{ ...box, display: 'flex', alignItems: 'center', gap: m ? 12 : 16 }}>
/*L1916*/         <div style={{ width: m ? 76 : 112, flexShrink: 0 }}><Donut v={v.total} size={m ? 76 : 112} center={String(tot)} sub="за" /></div>
/*L1917*/         <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: m ? 1 : 5 }}>{CATS.map((n, i) => (
/*L1918*/           <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: m ? 14 : 14 }}>
/*L1919*/             <span style={{ width: 9, height: 9, borderRadius: 9, background: SYS[i], flexShrink: 0 }} />
/*L1920*/             <span style={{ flex: 1, color: t.text.secondary }}>{n}</span>
/*L1921*/             <b style={{ fontVariantNumeric: 'tabular-nums', color: SYS[i] }}>{v.total[i]}</b>
/*L1922*/           </div>))}</div>
/*L1923*/       </div>
/*L1924*/       {v.fr ? (
/*L1925*/         <div style={box}>
/*L1926*/           <div style={h}>По фракциям</div>
/*L1927*/           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: m ? 12 : 13, color: t.text.secondary, margin: '2px 0 8px' }}>{['За', 'Против', 'Воздержались', 'Не голосовали'].map((c, j) => <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}><span style={{ width: 9, height: 9, borderRadius: 9, background: SYS[j] }} />{c}</span>)}</div>
/*L1928*/           <div style={{ display: 'grid', gridTemplateColumns: inl && !m ? 'repeat(auto-fit, minmax(88px, 1fr))' : 'repeat(6, minmax(0, 1fr))', gap: m ? '4px 2px' : '6px 4px' }}>{F.map((f) => { const fv = v.fr![f].v; const p = pos(fv); let k = 0; fv.forEach((q, j) => { if (q > fv[k]) k = j; }); return (
/*L1929*/             <div key={f} style={{ textAlign: 'center', minWidth: 0 }}>
/*L1930*/               <div style={{ fontSize: m ? 11 : 12, fontWeight: 700, color: t.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}{m ? <div style={{ fontWeight: 400, color: t.text.tertiary, fontSize: 10 }}>({v.fr![f].size})</div> : <span style={{ fontWeight: 400, color: t.text.tertiary }}> ({v.fr![f].size})</span>}</div>
/*L1931*/               <div style={{ width: m ? 50 : 80, margin: '2px auto 0' }}><Donut v={fv} size={m ? 50 : 80} center={p.pct} sub={m ? undefined : CAP[k]} /></div>
/*L1932*/               <div title={fv.map((q, j) => `${CAP[j]}: ${q}`).join(', ')} style={{ display: 'flex', justifyContent: 'center', gap: m ? 3 : 6, fontSize: m ? 11 : 13, fontWeight: 700, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums', marginTop: 3, whiteSpace: 'nowrap' }}>{fv.map((q, j) => <span key={j} style={{ color: SYS[j] }}>{q}</span>)}</div>
/*L1933*/             </div>); })}</div>
/*L1934*/         </div>
/*L1935*/       ) : <div style={{ ...box, fontSize: 13, color: t.text.secondary }}>Разбивки по фракциям в источнике нет — показан только общий итог.</div>}
/*L1936*/       {!m && pass.some(([, x]) => x) && <div style={{ ...box, display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '4px 12px', fontSize: 14, lineHeight: 1.45 }}>{pass.filter(([, x]) => x).map(([k, x]) => [<span key={k + 'k'} style={{ color: t.text.tertiary, maxWidth: 172 }}>{k}</span>, <span key={k} style={{ color: t.text.primary }}>{x}</span>])}</div>}
/*L1937*/     </div>);
/*L1938*/   const right = (
/*L1939*/     <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: m ? 8 : 10 }}>
/*L1940*/       {secs.map(([hd, ps]) => (
/*L1941*/         <div key={hd}><div style={h}>{hd}</div>{ps.map((p, i) => <p key={i} style={{ margin: i ? '6px 0 0' : 0, fontSize: 15, lineHeight: 1.55, color: t.text.primary }}>{yo(p)}</p>)}</div>))}
/*L1942*/       {m && pass.some(([, x]) => x) && <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'auto minmax(0, 1fr)', gap: m ? '2px 0' : '4px 12px', fontSize: 14, lineHeight: 1.45, paddingTop: 8, borderTop: `1px solid ${t.border.subtle}` }}>{pass.filter(([, x]) => x).map(([k, x]) => [<span key={k + 'k'} style={{ color: t.text.tertiary, marginTop: m ? 4 : 0 }}>{k}</span>, <span key={k} style={{ color: t.text.primary }}>{x}</span>])}</div>}
/*L1943*/       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>{links.map((l, i) => <a key={i} href={l.href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 10px', borderRadius: 14, border: `1px solid ${t.border.default}`, fontSize: 13, color: t.text.accent, textDecoration: 'none', whiteSpace: 'nowrap' }}>{l.title} ↗</a>)}</div>
/*L1944*/       {!m && <ShareVote v={v} day={day} />}
/*L1945*/     </div>);
/*L1946*/   return (
/*L1947*/     <div ref={(el) => { if (el && DEEP === v.id) { DEEP = null; setTimeout(() => { const w = el.parentElement as HTMLElement | null; if (w) { const r = w.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.6) w.scrollIntoView({ block: 'start' }); } revealCard(v.id); }, 250); } }} data-panel={v.id} className="gd-anim" style={{ padding: m ? '10px 10px 12px' : '14px 16px 16px', background: t.bg.subtle, borderBottom: `1px solid ${t.border.subtle}` }}>
/*L1948*/       {!inl && <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', marginBottom: 4 }}>
/*L1949*/         {(!m || inl) && <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', background: okC[0], color: okC[1] }}>{v.ok ? 'ПРИНЯТ' : 'ОТКЛОНЕН'}</span>}
/*L1950*/         <span style={{ fontSize: m ? 12 : 13, color: t.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{[`${dt.getDate()} ${MON[dt.getMonth()]} ${dt.getFullYear()}, ${WDN[dt.getDay()]}`].filter(Boolean).join(' · ')}</span>
/*L1951*/       </div>}
/*L1952*/       {inl ? null : <>{!m && <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: t.text.primary, letterSpacing: '-0.01em' }}>{yo(v.q)}</div>}
/*L1953*/       <div style={{ fontSize: m ? 14 : 15, lineHeight: 1.45, color: t.text.secondary, margin: m ? '2px 0 10px' : '4px 0 12px', maxWidth: '72rem', whiteSpace: 'normal' }}>{title}</div></>}
/*L1954*/       <div style={m ? { display: 'flex', flexDirection: 'column', gap: 8 } : { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, alignItems: 'start' }}>{left}{right}</div>
/*L1955*/       {m && <ShareVote v={v} day={day} m />}
/*L1956*/     </div>
/*L1957*/   );
/*L1958*/ }
/*L1959*/ 

// ===== MH sticky section header + Coll accordion — L1976-L1989 =====
/*L1976*/ const MH = (t: any) => ({ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44, padding: '10px 2px', position: 'sticky', top: 'var(--gd-top, 0px)', zIndex: 5, background: t.bg.base, border: 'none', borderBottom: `1px solid ${t.border.subtle}`, cursor: 'pointer', fontFamily: t.font.family, fontSize: 16, fontWeight: t.weight.semibold, color: t.text.primary, textAlign: 'left' }) as const;
/*L1977*/ function Coll({ title, n, def, children, id, rep, m }: { title: React.ReactNode; n: number; def: boolean; children: React.ReactNode; id: string; rep: Rep; m?: boolean }) {
/*L1978*/   const t = useGrokTheme();
/*L1979*/   const [o, setO] = useState(def);
/*L1980*/   return (
/*L1981*/     <div style={{ marginTop: 6 }}>
/*L1982*/       <button onClick={() => { setO(!o); rep(id, !o); }} style={m ? MH(t) : { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: t.font.family, fontSize: t.font.table.fontSize, fontWeight: t.weight.semibold, color: t.text.primary, textAlign: 'left' }}>
/*L1983*/         {m ? <><span style={{ flex: 1, minWidth: 0 }}>{title} <span style={{ color: t.text.tertiary, fontWeight: t.weight.regular }}>{n}</span></span><span aria-hidden style={{ color: t.text.tertiary, transition: 'transform .2s', transform: o ? 'rotate(90deg)' : 'none' }}>›</span></> : <>{o ? '▾' : '▸'} {title} ({n})</>}
/*L1984*/       </button>
/*L1985*/       {o && <div className="gd-anim" style={{ marginLeft: m ? 0 : 14 }}>{children}</div>}
/*L1986*/     </div>
/*L1987*/   );
/*L1988*/ }
/*L1989*/ type FSub = [string, [string, string][]];

// ===== FullSubs / --gd-top helpers / anchorTo scroll anchoring / Sv* (news accordions, sticky, float) — L2000-L2072 =====
/*L2000*/ function FullSubs({ subs, def, id, rep, m }: { subs: FSub[]; def: boolean; id: string; rep: Rep; m?: boolean }) {
/*L2001*/   const t = useGrokTheme();
/*L2002*/   const [op, setOp] = useState<Record<number, boolean>>({});
/*L2003*/   const site = (u: string) => u.replace(/^https?:\/\//, '').split('/')[0];
/*L2004*/   const a = { color: t.text.accent, textDecoration: 'none', whiteSpace: 'nowrap' } as const;
/*L2005*/   return (<>{subs.map(([title, items], k) => {
/*L2006*/     const o = op[k] ?? def;
/*L2007*/     return (
/*L2008*/       <div key={k} style={{ marginTop: 6 }}>
/*L2009*/         <button onClick={() => { setOp({ ...op, [k]: !o }); rep(`${id}${k}`, !o); }} style={m ? MH(t) : { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: t.font.family, fontSize: t.font.table.fontSize, fontWeight: t.weight.semibold, color: t.text.primary, textAlign: 'left' }}>
/*L2010*/           {m ? <><span style={{ flex: 1, minWidth: 0 }}>{title} <span style={{ color: t.text.tertiary, fontWeight: t.weight.regular }}>{items.length}</span></span><span aria-hidden style={{ color: t.text.tertiary, transition: 'transform .2s', transform: o ? 'rotate(90deg)' : 'none' }}>›</span></> : <>{o ? '▾' : '▸'} {title} ({items.length})</>}
/*L2011*/         </button>
/*L2012*/         {o && <div className="gd-anim" style={{ marginLeft: m ? 0 : 14 }}>{items.map(([x, u], i) => { const [tg, tx] = /Главное|Постановления/.test(title) ? splitTag(x) : [null, x]; return <Item m={m} key={i} tag={tg} text={tx} href={u || undefined} />; })}</div>}
/*L2013*/       </div>
/*L2014*/     );
/*L2015*/   })}</>);
/*L2016*/ }
/*L2017*/ 
/*L2018*/ const BLUE_ = () => (DK ? '#409CFF' : 'rgb(10,100,214)');
/*L2019*/ const svTop = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gd-top')) || 0;
/*L2020*/ let anchorGen = 0;
/*L2021*/ const scrollPar = (e: HTMLElement | null): HTMLElement | null => { let p = e && e.parentElement; while (p && p !== document.body && p !== document.documentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p; p = p.parentElement; } return null; };
/*L2022*/ const anchorTo = (get: () => HTMLElement | null, tgt: number, zoom = 1) => {
/*L2023*/   const g = ++anchorGen; let user = false; const stop = () => { user = true; };
/*L2024*/   window.addEventListener('touchmove', stop, { passive: true, once: true }); window.addEventListener('wheel', stop, { passive: true, once: true });
/*L2025*/   const fix = () => { if (g !== anchorGen || user) return; const r = get(); if (!r) return; const d = r.getBoundingClientRect().top - tgt; if (Math.abs(d) <= 3) return;
/*L2026*/     const sp = scrollPar(r); if (sp) sp.scrollTop += d / zoom; else { const se = document.scrollingElement || document.documentElement; window.scrollTo({ top: se.scrollTop + d, behavior: 'auto' }); }
/*L2027*/     const d2 = r.getBoundingClientRect().top - tgt; if (Math.abs(d2) > 3 && !sp) { r.style.scrollMarginTop = tgt + 'px'; r.scrollIntoView({ block: 'start', behavior: 'auto' }); } };
/*L2028*/   requestAnimationFrame(() => requestAnimationFrame(fix)); [50, 200, 450].forEach((ms) => setTimeout(fix, ms));
/*L2029*/   setTimeout(() => { window.removeEventListener('touchmove', stop); window.removeEventListener('wheel', stop); }, 500);
/*L2030*/ };
/*L2031*/ const svScroller = (el: HTMLElement): HTMLElement | null => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p; } return null; };
/*L2032*/ const svPin = () => { let b = svTop(); const bar = document.querySelector('[data-gdbar]') as HTMLElement | null; if (bar) { const r = bar.getBoundingClientRect(); if (r.height > 0 && r.top <= 1) b = Math.max(b, r.bottom); } return b; };
/*L2033*/ const svBack = (el: HTMLElement | null) => { if (!el) return; requestAnimationFrame(() => requestAnimationFrame(() => { const root = (el.closest('[data-svroot]') as HTMLElement | null) || el; const tg = root.getBoundingClientRect().top - (svPin() + 12); if (tg >= 0) return; const sc = svScroller(root); if (sc) sc.scrollBy({ top: tg, behavior: 'smooth' }); else { const y = window.scrollY + tg; window.scrollTo({ top: y < svPin() ? 0 : y, behavior: 'smooth' }); } })); };
/*L2034*/ function SvPill({ n }: { n: number }) { const t = useGrokTheme(); return <span style={{ display: 'inline-block', minWidth: 22, textAlign: 'center', padding: '1px 7px', borderRadius: 9999, background: t.bg.subtle, border: `1px solid ${t.border.subtle}`, color: t.text.secondary, fontSize: t.font.caption.fontSize, fontWeight: t.weight.regular, lineHeight: 1.5 }}>{n}</span>; }
/*L2035*/ function SvLabel({ children }: { children: React.ReactNode }) { const t = useGrokTheme(); return <div style={{ color: BLUE_(), fontSize: t.font.caption.fontSize, fontWeight: t.weight.semibold, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{children}</div>; }
/*L2036*/ function SvItems({ title, items, m }: { title: string; items: [string, string][]; m?: boolean }) {
/*L2037*/   return <>{items.map(([x, u], i) => { const [tg, tx] = /Главное|Постановления|Законопроекты/.test(title) ? splitTag(x) : [null, x]; return <Item m={m} key={i} tag={tg} text={tx} href={u || undefined} />; })}</>;
/*L2038*/ }
/*L2039*/ function SvFold({ onClick }: { onClick: () => void }) {
/*L2040*/   const t = useGrokTheme();
/*L2041*/   return <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 4px' }}><button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '0 16px', borderRadius: 9999, border: `1px solid ${t.border.subtle}`, background: t.bg.base, color: BLUE_(), fontFamily: t.font.family, fontSize: t.font.table.fontSize, fontWeight: t.weight.semibold, cursor: 'pointer' }}>Свернуть ↑</button></div>;
/*L2042*/ }
/*L2043*/ function useFloat(ref: React.RefObject<HTMLDivElement>, open: boolean) {
/*L2044*/   const [f, setF] = useState(false);
/*L2045*/   useEffect(() => { if (!open) { setF(false); return; } const on = () => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); setF(r.top < svTop() - 20 && r.bottom > window.innerHeight + 10); }; on(); window.addEventListener('scroll', on, true); window.addEventListener('resize', on); return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); }; }, [open]);
/*L2046*/   return f;
/*L2047*/ }
/*L2048*/ function SvFloat({ title, onClick }: { title: string; onClick: () => void }) {
/*L2049*/   const t = useGrokTheme();
/*L2050*/   return <button onClick={onClick} style={{ position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 50, display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: typeof window !== 'undefined' && window.innerWidth <= 700 ? 'calc(100vw - 136px)' : 'calc(100vw - 32px)', minHeight: 40, padding: '0 18px', borderRadius: 9999, border: `1px solid ${t.border.subtle}`, background: t.bg.base, boxShadow: `0 4px 16px ${t.border.subtle}, 0 1px 3px ${t.border.subtle}`, color: BLUE_(), fontFamily: t.font.family, fontSize: t.font.table.fontSize, fontWeight: t.weight.semibold, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Свернуть ↑ <span style={{ color: t.text.secondary, fontWeight: t.weight.regular, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span></button>;
/*L2051*/ }
/*L2052*/ function SvAcc({ sub, open, set, m, last }: { sub: FSub; open: boolean; set: (o: boolean) => void; m?: boolean; last?: boolean }) {
/*L2053*/   const t = useGrokTheme();
/*L2054*/   const ref = useRef<HTMLDivElement>(null);
/*L2055*/   const [title, items] = sub;
/*L2056*/   const close = () => { set(false); svBack(ref.current); };
/*L2057*/   const fl = useFloat(ref, open);
/*L2058*/   return (
/*L2059*/     <div ref={ref} style={{ borderBottom: last && !open ? 'none' : `1px solid ${t.border.subtle}` }}>
/*L2060*/       <button aria-expanded={open} onClick={() => { if (open) { close(); return; } const tg = ref.current ? Math.max(ref.current.getBoundingClientRect().top, svPin()) : 0; set(true); anchorTo(() => ref.current, tg, GZ); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: m ? 48 : 42, padding: m ? '10px 2px' : '8px 2px', position: 'static', top: 'var(--gd-top, 0px)', zIndex: 4, background: t.bg.base, border: 'none', boxShadow: 'none', cursor: 'pointer', fontFamily: t.font.family, fontSize: m ? 16 : t.font.table.fontSize, fontWeight: t.weight.semibold, color: open ? BLUE_() : t.text.primary, textAlign: 'left' }}>
/*L2061*/         <span style={{ flex: 1, minWidth: 0 }}>{title}</span>
/*L2062*/         <SvPill n={items.length} />
/*L2063*/         <span aria-hidden style={{ color: t.text.tertiary, width: 14, textAlign: 'center', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
/*L2064*/       </button>
/*L2065*/       {open && <div className="gd-anim" style={{ paddingBottom: 6 }}><SvItems title={title} items={items} m={m} /><SvFold onClick={close} /></div>}
/*L2066*/       {fl && <SvFloat title={title} onClick={close} />}
/*L2067*/     </div>
/*L2068*/   );
/*L2069*/ }
/*L2070*/ function SvSection({ subs, m, idp, cur, setCur }: { subs: FSub[]; m?: boolean; idp: string; cur: string | null; setCur: (k: string | null) => void }) {
/*L2071*/   return <div>{subs.map((s, k) => <SvAcc key={idp + k} sub={s} m={m} last={k === subs.length - 1} open={cur === idp + '#' + k} set={(o) => setCur(o ? idp + '#' + k : null)} />)}</div>;
/*L2072*/ }

// ===== Calendar component (day cards, agenda «Повестка», bill rows, inline vote card, mobile-only dayGo/pin, desktop 300px sticky left calendar) — L2240-L2404 =====
/*L2240*/ function Calendar({ m, openDay: openDay0, openVote, cm, setCm, day, cq }: { cq?: string; m: boolean; openDay: (d: string) => void; openVote?: (d: string, id: string) => void; cm: string; setCm: (k: string) => void; day?: string }) {
/*L2241*/   const t = useGrokTheme();
/*L2242*/   const rs = useRef(CSNAP && CSNAP.d === day && CSNAP.cm === cm ? CSNAP : null);
/*L2243*/   const [ex, setEx] = useState<string | null>(rs.current ? rs.current.ex : null);
/*L2244*/   const [ivo, setIvo0] = useState<string | null>(null); const setIvo = (nx: string | null) => { const pv = ivo; setIvo0(nx); const num = (el: Element, k: string, d: number) => { const q = parseFloat(getComputedStyle(el).getPropertyValue(k)); return isNaN(q) ? d : q; }; const pin = (k: string, sm: boolean) => { const w = document.querySelector(`[data-ivk="${k}"]`) as HTMLElement | null; if (!w) return; const c = w.closest('[id^="ev-"]') as HTMLElement | null; const off = (num(document.documentElement, '--gd-top', 0) + (c ? num(c, '--gd-dh', 45) + num(c, '--gd-fb', 0) : 0) - 2) * GZ; const dy = w.getBoundingClientRect().top - off; if (Math.abs(dy) <= 3) return; const y = Math.max(0, window.scrollY + dy); if (sm && 'scrollBehavior' in document.documentElement.style) window.scrollTo({ top: y, behavior: 'smooth' }); else window.scrollTo(0, y); }; const k = m ? (nx || pv) : null; if (k) { const sm = !!nx; requestAnimationFrame(() => requestAnimationFrame(() => pin(k, sm))); [450, 900].forEach((ms) => setTimeout(() => pin(k, false), ms)); } if (pv && pv !== nx) requestAnimationFrame(() => requestAnimationFrame(() => { const w = document.querySelector(`[data-ivk="${pv}"]`) as HTMLElement | null; const r = w && w.firstElementChild as HTMLElement | null; if (r && r.animate) r.animate([{ backgroundColor: FLASH() }, { backgroundColor: 'rgba(10,102,214,0)' }], { duration: 1800, easing: 'ease-out' }); })); };
/*L2245*/   const dayGo = (el: HTMLElement | null, op: boolean) => { if (!m || !el) return; const pin = (sm: boolean) => { if (!el.isConnected) return; const off = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gd-top')) || 0) * GZ; const dy = el.getBoundingClientRect().top - off; if (Math.abs(dy) <= 3) return; const y = Math.max(0, window.scrollY + dy); if (sm && 'scrollBehavior' in document.documentElement.style) window.scrollTo({ top: y, behavior: 'smooth' }); else window.scrollTo(0, y); }; requestAnimationFrame(() => requestAnimationFrame(() => pin(op))); [450, 900].forEach((ms) => setTimeout(() => pin(false), ms)); }; const [df, setDf] = useState<'all' | 'acc' | 'rej'>('all'); useEffect(() => setDf('all'), [ex]);
/*L2246*/   const plv = (n: number) => { const a = n % 10, b = n % 100; return `${n} ${a === 1 && b !== 11 ? 'голосование' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'голосования' : 'голосований'}`; };
/*L2247*/   const qn = (cq || '').trim().toLowerCase(); useZS(); const fon = zN() > 0;
/*L2248*/   const lv = (bn: string, d: string) => { const bv = billVote(bn, d); return bv ? parse(DATA[bv[0]]).find((z) => z.id === bv[1]) || null : null; };
/*L2249*/   const mq = (x: any) => !qn || [x[0], agShort(x[0], x[1]), x[1], x[4] || ''].some((z) => (z || '').toLowerCase().includes(qn));
/*L2250*/   const [noV, setNoV] = useState<string | null>(null); const noT = useRef<any>(null);
/*L2251*/   const [sd, setSd] = useState<string | null>(null); useEffect(() => setSd(null), [cm, qn, fon]);
/*L2252*/   useEffect(() => { const s = rs.current; CSNAP = null; if (!s) return; let n = 0; const f = () => { window.scrollTo(0, s.y); if (Math.abs(window.scrollY - s.y) > 2 && n++ < 30) requestAnimationFrame(f); }; requestAnimationFrame(f); }, []);
/*L2253*/   const now = new Date(); const today = fd(now);
/*L2254*/   const P: Record<string, any> = Object.fromEntries(CAL.p.map((x: any) => [x.d, x]));
/*L2255*/   const G: Record<string, any> = Object.fromEntries(CAL.g.map((x: any) => [x[0], x]));
/*L2256*/   const wk = (d: Date) => { const x = CAL.w.find((w: any) => pd(w[0]) <= d && d <= pd(w[1])); return x ? x[2] : null; };
/*L2257*/   const dk = t.kind ? t.kind === 'dark' : DK;
/*L2258*/   const blue = t.text.accent, green = dk ? '#3CCB9C' : '#009E73', amber = dk ? '#F2B53A' : '#E69F00'; const SELC = dk ? '#C4A5FF' : '#6A3FD1', SELB = dk ? 'rgba(160,120,255,0.24)' : 'rgba(110,60,220,0.13)'; const neu = 'rgba(120,120,128,0.10)', reg = neu, regD = dk ? '#E58BC2' : '#CC5A9E', comD = dk ? '#9AA7C7' : '#6B7A99', grey = t.text.tertiary;
/*L2259*/   const [inf, setInf] = useState(rs.current ? rs.current.inf : false);
/*L2260*/   const openDay = (d: string) => { CSNAP = { ex, inf, y: window.scrollY, d, cm }; try { history.pushState({ gdc: 1 }, ''); } catch (e) {} openDay0(d); };
/*L2261*/   const jumpVote = (d: string, id: string) => { CSNAP = { ex, inf, y: window.scrollY, d, cm }; try { history.pushState({ gdc: 1 }, ''); } catch (e) {} openVote && openVote(d, id); };
/*L2262*/   const ck = calCk;
/*L2263*/   const cks = useMemo(() => calCks(), []);
/*L2264*/   const cell = (d: Date, inM: boolean) => {
/*L2265*/     const s = fd(d); const p = P[s]; const g = G[s]; const has = DAYS.includes(s); const w = wk(d); const isT = s === today;
/*L2266*/     const isS = sd === s; const click: (() => void) | undefined = () => { setSd(isS ? null : s); setEx(null); if (m && !isS) requestAnimationFrame(() => requestAnimationFrame(() => { const el = document.querySelector('[data-evh]') as HTMLElement | null; if (!el) return; const off = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gd-top')) || 0) * GZ; const dy = el.getBoundingClientRect().top - off - 8; if (dy > 0) window.scrollTo({ top: window.scrollY + dy, behavior: 'smooth' }); })); };
/*L2267*/     const bud = p && (!!BUDP[s] || (p.a || []).some((a: any) => /^Федеральный бюджет/.test(a[1] || '')));
/*L2268*/     const exp = p && p.s === 'expected'; const wd = d.getDay() % 6 !== 0; const com = wd && (!p || exp) && w !== 'regional';
/*L2269*/     return (
/*L2270*/       <div key={s} role="button" tabIndex={0} onClick={click} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } }}
/*L2271*/         aria-pressed={isS} title={[p && !exp ? 'Пленарное заседание Госдумы' : '', bud ? 'Рассмотрение бюджета' : '', g ? 'Заседание Правительства РФ' : '', com ? 'Работа в комитетах' : '', w === 'regional' ? 'Работа в регионах' : '', isS ? 'Снять выбор' : 'Показать события дня'].filter(Boolean).join(' · ')}
/*L2272*/         style={{ position: 'relative', minWidth: 0, height: m ? 44 : 32, borderRadius: 8, cursor: 'pointer', opacity: inM ? 1 : 0, pointerEvents: inM ? 'auto' : 'none',
/*L2273*/           background: isS ? SELB : wd ? (w === 'regional' ? reg : neu) : 'transparent',
/*L2274*/           boxShadow: isS ? `inset 0 0 0 2px ${SELC}${isT ? `, inset 0 0 0 3.5px ${blue}` : ''}` : isT ? `inset 0 0 0 1.5px ${blue}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
/*L2275*/         <span style={{ fontSize: m ? 14 : 15, fontWeight: isT ? t.weight.semibold : t.weight.regular, color: isS ? SELC : wd ? t.text.primary : t.text.tertiary, ...(isS ? { fontWeight: 700 } : {}), fontVariantNumeric: 'tabular-nums' }}>{d.getDate()}</span>
/*L2276*/         {(com || (wd && w === 'regional') || p || g || bud) && <span style={{ position: 'absolute', bottom: 3, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: m ? 2 : 3 }}>
/*L2277*/           {wd && w === 'regional' && <i style={{ width: 12, height: 5, borderRadius: 1.5, flex: 'none', background: regD }} />}
/*L2278*/           {com && <i style={{ width: 12, height: 5, borderRadius: 1.5, flex: 'none', background: comD }} />}
/*L2279*/           {p && !exp && <i style={{ width: 12, height: 5, borderRadius: 1.5, flex: 'none', background: blue }} />}
/*L2280*/           {g && <i style={{ width: 12, height: 5, borderRadius: 1.5, flex: 'none', background: green }} />}
/*L2281*/           {bud && <i style={{ width: 12, height: 5, borderRadius: 1.5, flex: 'none', background: amber }} />}
/*L2282*/         </span>}
/*L2283*/       </div>);
/*L2284*/   };
/*L2285*/   const grid = (first: Date) => {
/*L2286*/     const off = (first.getDay() + 6) % 7; const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
/*L2287*/     const ds: [Date, boolean][] = [];
/*L2288*/     for (let i = 0; i < off; i++) ds.push([new Date(first.getFullYear(), first.getMonth(), i - off + 1), false]);
/*L2289*/     for (let i = 1; i <= n; i++) ds.push([new Date(first.getFullYear(), first.getMonth(), i), true]);
/*L2290*/     return (
/*L2291*/       <div key={first.getMonth()} style={{ ...card(t), padding: m ? '14px 12px' : '14px 16px', flex: m ? '1 1 100%' : '1 1 22rem', minWidth: 0 }}>
/*L2292*/         {!m && <div style={{ fontWeight: t.weight.semibold, fontSize: 15, marginBottom: 8, color: t.text.primary }}>{MONN[first.getMonth()]} {first.getFullYear()}</div>}
/*L2293*/         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
/*L2294*/           {WDS.map((x, i) => <span key={x} style={{ fontSize: 12, textAlign: 'center', color: i > 4 ? t.text.tertiary : t.text.secondary, paddingBottom: 2 }}>{x}</span>)}
/*L2295*/           {ds.map(([d, inM]) => cell(d, inM))}
/*L2296*/         </div>
/*L2297*/       </div>);
/*L2298*/   };
/*L2299*/   const lg = (c: React.ReactNode, l: string) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{c}{l}</span>;
/*L2300*/   const sq = (st: any) => <i style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', ...st }} />;
/*L2301*/   const isCur = cm === ck(now); const inM = (d: string, e?: string) => ck(pd(d)) === cm || (!!e && ck(pd(e)) === cm);
/*L2302*/   const nk = (k: string) => ck(new Date(+k.slice(3), +k.slice(0, 2), 1));
/*L2303*/   const evOf = (mk: string): any[] => { const okD = (d: string, e?: string) => ck(pd(d)) === mk || (!!e && ck(pd(e)) === mk); return [
/*L2304*/     ...CAL.p.filter((p: any) => okD(p.d)).map((p: any) => ({ d: p.d, k: 'p', p })),
/*L2305*/     ...CAL.g.filter((g: any) => okD(g[0])).map((g: any) => ({ d: g[0], k: 'g', g })),
/*L2306*/     ...CAL.w.filter((w: any) => w[2] === 'regional' && okD(w[0], w[1])).map((w: any) => ({ d: w[0], k: 'r', w })),
/*L2307*/   ].sort((a, b) => +pd(b.d) - +pd(a.d)); };
/*L2308*/   const tchip = (ty: string) => ty ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600, lineHeight: 1.4, whiteSpace: 'nowrap', background: t.bg.subtle, color: t.text.secondary, border: `1px solid ${t.border.subtle}` }}>{ty}</span> : null;
/*L2309*/   const pill = (txt: string, c: string, dashed?: boolean) => <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 10, border: `1px ${dashed ? 'dashed' : 'solid'} ${c}`, color: c, whiteSpace: 'nowrap' }}>{txt}</span>;
/*L2310*/   const evList = (mk: string, dv?: boolean) => { const ev = evOf(mk).filter((e: any) => (!qn || (e.k === 'p' && (e.p.a || []).some(mq))) && (!fon || (e.k === 'p' && (e.p.a || []).some((x: any) => mq(x) && zOk(x[0]))))).filter((e: any) => dv || !sd || (e.k === 'r' ? pd(e.w[0]) <= pd(sd) && pd(sd) <= pd(e.w[1]) : e.d === sd)); if (dv && !ev.length) return null; return <div key={'e' + mk} style={{ flex: m ? '1 1 100%' : '1 1 22rem', minWidth: 0 }}>
/*L2311*/       {dv ? <div style={{ fontSize: 13, fontWeight: t.weight.semibold, color: t.text.secondary, margin: '6px 2px 8px' }}>{`${MONN[+mk.slice(0, 2) - 1]} ${mk.slice(3)}`}</div> : <div data-evh="1" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 8 }}><span style={{ fontWeight: t.weight.semibold, fontSize: 17, color: t.text.primary }}>{sd ? `События ${pd(sd).getDate()} ${MON[pd(sd).getMonth()]}, ${WDL[pd(sd).getDay()]}` : `События ${MON[+mk.slice(0, 2) - 1]}`}</span>{sd && <button className="gd-tap" onClick={() => setSd(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, boxSizing: 'border-box', padding: '0 8px 0 10px', borderRadius: 9999, border: `1px solid ${t.border.default}`, background: t.bg.subtle, color: t.text.secondary, fontFamily: t.font.family, fontSize: 13, fontWeight: t.weight.medium, lineHeight: 1, cursor: 'pointer', alignSelf: 'center' }}>Сбросить<span aria-hidden style={{ fontSize: 12, lineHeight: 1, opacity: 0.7 }}>×</span></button>}</div>}
/*L2312*/       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
/*L2313*/         {!ev.length && <div style={{ ...card(t), padding: '14px 16px', color: t.text.secondary }}>{qn || fon ? 'Ничего не найдено' : sd ? 'В этот день событий нет' : 'Событий нет'}</div>}
/*L2314*/         {ev.map((e) => <div key={e.k + e.d}>{(() => {
/*L2315*/           const d = pd(e.d); const head = `${d.getDate()} ${MON[d.getMonth()]}, ${WDL[d.getDay()]}`;
/*L2316*/           if (e.k === 'r') return <div key={'r' + e.d} style={{ ...card(t), padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', borderLeft: `3px solid ${regD}` }}><span style={{ fontWeight: t.weight.semibold }}>{e.w[0].slice(0, 5)}–{e.w[1].slice(0, 5)}</span><span>Работа в регионах (встречи с избирателями)</span>{pill('по распорядку', regD, true)}</div>;
/*L2317*/           if (e.k === 'g') { const ga = fon ? [] : GOVA[e.d] || []; const gk = 'g' + e.d; const gon = ex === gk; return (
/*L2318*/             <div key={gk} style={{ ...card(t), overflow: gon ? 'clip' : 'hidden', borderLeft: `3px solid ${green}`, ...(fon ? { opacity: 0.4 } : {}) }}>
/*L2319*/               <div role={ga.length ? 'button' : undefined} tabIndex={ga.length ? 0 : undefined} aria-expanded={ga.length ? gon : undefined} onClick={(ev0: any) => { if (ga.length) { dayGo((ev0.currentTarget as HTMLElement).parentElement, !gon); setEx(gon ? null : gk); } }} onKeyDown={(k) => { if (ga.length && (k.key === 'Enter' || k.key === ' ')) { k.preventDefault(); setEx(gon ? null : gk); } }}
/*L2320*/                 style={{ padding: '10px 14px', minHeight: 44, cursor: ga.length ? 'pointer' : 'default', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center', background: gon ? `linear-gradient(${dk ? 'rgba(60,203,156,0.10)' : 'rgba(0,158,115,0.08)'}, ${dk ? 'rgba(60,203,156,0.10)' : 'rgba(0,158,115,0.08)'}), ${t.bg.base}` : 'transparent', ...(gon ? { position: 'sticky', top: 'var(--gd-top, 0px)', zIndex: 4, borderBottom: `1px solid ${t.border.subtle}`, boxShadow: `-3px -10px 0 0 ${t.bg.base}` } : {}) }}>
/*L2321*/                 <span style={{ fontWeight: t.weight.semibold }}>{head}</span>
/*L2322*/                 <span>Заседание Правительства РФ</span>
/*L2323*/                 <a href={e.g[2]} target="_blank" rel="noreferrer" onClick={(k) => k.stopPropagation()} style={{ textDecoration: 'none', ...(m ? { order: 3 } : {}) }}>{pill(e.g[1].replace(/^Заседание Правительства \(2026 год, (№\d+)\).*$/, '$1'), green)}</a>
/*L2324*/                 <span style={m ? { flexBasis: '100%', height: 0 } : { flex: '1 1 auto' }} />
/*L2325*/                 <span style={{ ...(m ? { order: 2 } : {}), fontSize: 13, color: ga.length ? t.text.accent : t.text.tertiary }}>{ga.length ? `Повестка: ${ga.length} ${gon ? '▾' : '▸'}` : fon ? 'нет совпадений' : (pd(e.d) < pd(today) ? 'повестка недоступна' : 'повестка еще не опубликована')}</span>
/*L2326*/               </div>
/*L2327*/               {gon && <div>
/*L2328*/                 {ga.map((x, i) => (
/*L2329*/                   <div key={i} style={{ display: 'flex', flexWrap: 'nowrap', gap: '2px 10px', padding: '8px 14px', borderBottom: `1px solid ${t.border.subtle}`, fontSize: 14, alignItems: 'baseline' }}>
/*L2330*/                     <a href={e.g[2]} target="_blank" rel="noreferrer" style={{ fontFamily: t.font.mono, color: t.text.accent, flexShrink: 0, minWidth: '2rem' }}>{i + 1}.</a>
/*L2331*/                     <span style={{ flex: '1 1 12rem', minWidth: 0, color: t.text.primary, overflowWrap: 'anywhere' }}>{x[0]}<span style={{ color: t.text.tertiary }}> — {x[1]}</span></span>
/*L2332*/                   </div>))}
/*L2333*/                 <div style={{ padding: '8px 14px', fontSize: 13 }}><a href={e.g[2]} target="_blank" rel="noreferrer" style={{ color: t.text.accent }}>Материалы заседания на government.ru ↗</a></div>
/*L2334*/               </div>}
/*L2335*/             </div>); }
/*L2336*/           const p = e.p; const a0 = (p.a || []).filter(mq).filter((x: any) => zOk(x[0])); const on = ex === p.d || ((!!qn || fon) && a0.length > 0); const dv = DATA[p.d] ? parse(DATA[p.d]) : []; const aV = a0.map((x: any) => lv(x[0], p.d)); const dAcc = aV.filter((z: any) => z && z.ok).length; const dRej = aV.filter((z: any) => z && !z.ok).length; const a = df === 'all' || ex !== p.d || fon ? a0 : a0.filter((x: any) => { const vv = lv(x[0], p.d); return vv && (df === 'acc') === vv.ok; });
/*L2337*/           return (
/*L2338*/             <div key={'p' + p.d} id={'ev-' + p.d} style={{ ...card(t), overflow: on ? 'visible' : 'hidden', borderLeft: `3px solid ${blue}`, ...(fon && !a0.length ? { opacity: 0.4 } : {}), ...(dAcc + dRej > 0 && !qn && !fon ? {} : { '--gd-fb': '0px' }) } as any}>
/*L2339*/               <div role={a.length ? 'button' : undefined} tabIndex={a.length ? 0 : undefined} aria-expanded={a.length ? on : undefined} ref={(el: any) => { if (el && on && el.parentElement) el.parentElement.style.setProperty('--gd-dh', el.offsetHeight + 'px'); }} onClick={(ev0: any) => { if (a.length) { dayGo((ev0.currentTarget as HTMLElement).parentElement, !on); setEx(on ? null : p.d); } }} onKeyDown={(k) => { if (a.length && (k.key === 'Enter' || k.key === ' ')) { k.preventDefault(); setEx(on ? null : p.d); } }}
/*L2340*/                 style={{ padding: '10px 14px', minHeight: 44, cursor: a.length ? 'pointer' : 'default', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center', background: on ? `linear-gradient(${t.fill.accentSubtle}, ${t.fill.accentSubtle}), ${t.bg.base}` : 'transparent', ...(on ? { position: 'sticky', top: 'var(--gd-top, 0px)', zIndex: 4, borderBottom: `1px solid ${t.border.subtle}`, boxShadow: `0 -10px 0 0 ${t.bg.base}, 0 4px 6px -4px rgba(0,0,0,.25)` } : {}) }}>{on && stuckFrame(t.bg.base, t.border.subtle, 16, 1, 3, blue)}
/*L2341*/                 <span style={{ fontWeight: t.weight.semibold }}>{head}{p.t ? `, ${p.t}` : ''}</span>
/*L2342*/                 <span>Пленарное заседание</span>
/*L2343*/                 {p.s !== 'expected' && p.d === today ? pill('сегодня', blue) : null}
/*L2344*/                 {BUDP[p.d] && <a href={BUDP[p.d][1]} target="_blank" rel="noreferrer" onClick={(k) => k.stopPropagation()} style={{ textDecoration: 'none' }}>{pill(BUDP[p.d][0], amber)}</a>}
/*L2345*/                 <span style={{ flex: '1 1 auto' }} />
/*L2346*/                 <span style={{ fontSize: 13, color: a.length ? t.text.accent : t.text.tertiary }}>{a.length ? `Повестка: ${a.length} ${on ? '▾' : '▸'}` : fon && (p.a || []).length ? 'нет совпадений' : (pd(p.d) < pd(today) ? 'повестка недоступна' : 'повестка еще не опубликована')}</span>
/*L2347*/                 {!a.length && pd(p.d) < pd(today) && DAYS.includes(p.d) && <button onClick={(k) => { k.stopPropagation(); openDay(p.d); }} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: 13, color: t.text.accent, fontFamily: t.font.family }}>Сводка дня ›</button>}
/*L2348*/               </div>
/*L2349*/               <Exp on={on}>{() => <div style={{ borderTop: `1px solid ${t.border.subtle}` }}>
/*L2350*/                 {dAcc + dRej > 0 && !qn && !fon && <div data-fb="1" ref={(el: any) => { const c = el && el.closest('[id^="ev-"]'); if (c) c.style.setProperty('--gd-fb', el.offsetHeight + 'px'); }} style={{ position: 'sticky', top: 'calc(var(--gd-top, 0px) + var(--gd-dh, 45px) - 1px)', zIndex: 4, background: t.bg.base, padding: m ? '8px 8px 4px' : '10px 14px 6px', borderBottom: `1px solid ${t.border.subtle}` }}><div role="tablist" style={{ display: 'flex', margin: 0, padding: 3, gap: 2, height: m ? 50 : 44, boxSizing: 'border-box', borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}` }}>{([['all', a0.length, plv(a0.length).replace(/^\d+ /, ''), t.text.primary], ['acc', dAcc, 'принято', INK[0]], ['rej', dRej, 'отклонено', dRej ? INK[1] : t.text.primary]] as const).map(([k, n, l, c]) => <button key={k} data-df={k} role="tab" aria-selected={df === k} onClick={() => setDf(k)} style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', minHeight: m ? 42 : 36, padding: m ? '0 4px' : '0 8px', ...(m ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, lineHeight: 1.1 } : {}), border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: t.font.family, fontSize: m ? 12.5 : 15, fontWeight: df === k ? t.weight.semibold : t.weight.regular, background: df === k ? t.bg.base : 'transparent', boxShadow: df === k ? `0 1px 3px ${t.border.default}` : 'none', color: t.text.primary }}>{m ? <><b style={{ color: c, fontSize: 16 }}>{n}</b><span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</span></> : <><b style={{ color: c }}>{n}</b> {l}</>}</button>)}</div></div>}
/*L2351*/                 {!a.length && <div style={{ padding: '10px 14px', fontSize: 14, color: t.text.secondary }}>{df === 'acc' ? 'Принятых законопроектов в повестке нет' : 'Отклоненных законопроектов в повестке нет'}</div>}
/*L2352*/                 {a.map((x: any) => { const io = ivo === p.d + x[0]; const tapRow = () => { const sl = window.getSelection && window.getSelection(); if (sl && String(sl).length) return; if (billVote(x[0], p.d)) setIvo(io ? null : p.d + x[0]); else { setNoV(p.d + x[0]); if (noT.current) clearTimeout(noT.current); noT.current = setTimeout(() => setNoV(null), 2500); } }; const tags = ZTAG[x[0]] ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>{[...ZTAG[x[0]][0], ...ZTAG[x[0]][1], ...ZTAG[x[0]][2]].map((g) => { const hit = ZS.w.includes(g) || ZS.t.includes(g) || ZS.c.includes(g); return <span key={g} style={{ fontSize: 12, lineHeight: 1.4, padding: '1px 8px', borderRadius: 9999, border: `1px solid ${hit ? t.text.accent : t.border.subtle}`, background: hit ? t.fill.accentSubtle : t.bg.subtle, color: hit ? t.text.accent : t.text.secondary, fontWeight: hit ? 600 : 400 }}>{g}</span>; })}</span> : null; const hv = io ? billVote(x[0], p.d) : null; const v = hv ? parse(DATA[hv[0]]).find((z) => z.id === hv[1]) : null; return (<div key={x[0] + x[1]} data-iv={io ? '1' : undefined} data-ivk={p.d + x[0]} style={io ? { margin: m ? '6px 6px 8px' : '8px 10px 10px', borderRadius: 12, overflow: 'visible', border: `1.5px solid ${t.text.accent}` } : undefined}>
/*L2353*/                   {io && <div data-ivs="1" onClick={() => setIvo(null)} title="Свернуть" style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent', position: 'sticky', top: 'calc(var(--gd-top, 0px) + var(--gd-dh, 45px) + var(--gd-fb, 0px) + 5px)', zIndex: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '8px 12px', minWidth: 0, background: `linear-gradient(${t.fill.accentSubtle}, ${t.fill.accentSubtle}), ${t.bg.base}`, borderBottom: `1px solid ${t.border.subtle}`, boxShadow: '0 4px 6px -4px rgba(0,0,0,.25)', fontSize: 14 }}>{stuckFrame(t.bg.base, t.text.accent, 12, 1.5, 1.5, t.text.accent, m ? 6 : 10)}
/*L2354*/                     <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, height: 24, boxSizing: 'border-box', padding: '0 8px', borderRadius: 9999, border: `1px solid ${t.border.subtle}`, background: t.bg.subtle, color: t.text.accent, fontFamily: t.font.mono, fontSize: 12.5, whiteSpace: 'nowrap' }}>{x[0]}</span>
/*L2355*/                     {tchip(billType(x[0], p.d, x[2] || '', x[4] || x[1] || ''))}
/*L2356*/                     {v && <Status b tone={v.ok ? 'success' : 'danger'}>{v.ok ? 'принят' : 'отклонен'}</Status>}
/*L2357*/                     <span style={{ flex: m ? '1 1 0' : '1 1 12rem', minWidth: m ? '60%' : 0, overflowWrap: 'anywhere', fontWeight: t.weight.semibold, color: t.text.primary } as any}>{hlq(agShort(x[0], x[1]), qn)}</span><span aria-hidden="true" style={{ marginLeft: 'auto', flexShrink: 0, alignSelf: 'center', fontSize: 12, color: t.text.accent }}>▴</span>
/*L2358*/                   </div>}
/*L2359*/                   {io && (x[4] || ZTAG[x[0]]) && <div onClick={tapRow} style={{ padding: '8px 12px 10px', fontSize: 14, borderBottom: `1px solid ${t.border.subtle}`, overflowWrap: 'anywhere', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' } as any}>{x[4] && <span style={{ color: t.text.tertiary }}>— {hlq(x[4], qn)}</span>}{tags}</div>}
/*L2360*/                   {!io && (() => { const bv = billVote(x[0], p.d); const vv = bv ? parse(DATA[bv[0]]).find((z) => z.id === bv[1]) : null; const ty = billType(x[0], p.d, x[2] || '', x[4] || x[1] || ''); const sc = vv ? (vv.ok ? INK[0] : INK[1]) : t.text.tertiary; const nov = noV === p.d + x[0] ? <span style={{ fontSize: 12, padding: '1px 6px', borderRadius: 6, background: t.bg.subtle, color: t.text.secondary, whiteSpace: 'nowrap' }}>Голосования еще не было</span> : null; const chev = bv ? <span className="gd-bc" aria-hidden="true" style={{ flexShrink: 0, alignSelf: 'center', fontSize: 20, lineHeight: 1, color: t.text.tertiary, transition: 'color .15s' }}>›</span> : null; const num = (st: any) => <button className="gd-chip" onClick={(e) => { e.stopPropagation(); tapRow(); }} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: t.font.mono, fontSize: 13, color: bv ? t.text.accent : t.text.tertiary, whiteSpace: 'nowrap', ...st }}>{x[0]}</button>; const name = <span style={{ fontWeight: t.weight.semibold, color: t.text.primary }}>{hlq(agShort(x[0], x[1]), qn)}</span>; const row = { display: 'flex', alignItems: 'flex-start', gap: m ? 10 : 14, padding: m ? '12px 12px' : '10px 14px', borderBottom: `1px solid ${t.border.subtle}`, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' } as any; const cw = m ? 108 : 116; const cb = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: cw, height: 24, boxSizing: 'border-box', padding: '0 6px', borderRadius: 9999, fontSize: 12, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as any; const left = <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, flexShrink: 0, width: cw }}><span style={{ ...cb, fontFamily: t.font.mono, fontSize: 12.5, fontWeight: 400, border: `1px solid ${t.border.subtle}`, background: t.bg.subtle, color: bv ? t.text.accent : t.text.tertiary }}>{x[0]}</span>{ty && <span style={{ ...cb, background: t.bg.subtle, color: t.text.secondary, border: `1px solid ${t.border.subtle}` }}>{ty}</span>}{vv && <span style={{ ...cb, border: `1px solid ${DK ? (vv.ok ? 'rgba(48,209,88,0.45)' : 'rgba(255,105,97,0.45)') : (vv.ok ? '#9FD6AE' : '#F0ABAB')}`, background: DK ? (vv.ok ? 'rgba(48,209,88,0.18)' : 'rgba(255,69,58,0.2)') : (vv.ok ? '#E3F4E8' : '#FDE8E8'), color: DK ? (vv.ok ? '#30D158' : '#FF6961') : (vv.ok ? '#1B7A3A' : '#C42B2B') }}>{vv.ok ? 'принят' : 'отклонен'}</span>}{nov && <span style={{ fontSize: 12, color: t.text.tertiary, lineHeight: 1.3, whiteSpace: 'normal' }}>Голосования еще не было</span>}</span>; return (<div className="gd-rw" onClick={tapRow} title={x[4]} style={{ ...row, flexWrap: 'nowrap' }}>{left}<span style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 15, lineHeight: 1.35 }}>{name}</span>{x[4] && <span className="gd-cl2" style={{ fontSize: 13, lineHeight: 1.4, color: t.text.tertiary }}>{hlq(x[4], qn)}</span>}{tags}</span>{chev}</div>);})()}
/*L2361*/                   <Exp on={!!(io && v)}>{() => <><Panel v={v!} m={m} day={hv![0]} inl /><button onClick={() => setIvo(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 44, border: 'none', borderRadius: '0 0 10.5px 10.5px', background: t.fill.accentSubtle, color: t.text.accent, fontFamily: t.font.family, fontSize: 14, fontWeight: t.weight.semibold, cursor: 'pointer' }}>Свернуть ▴</button></>}</Exp>
/*L2362*/                 </div>); })}
/*L2363*/                 <div style={{ padding: '6px 14px', fontSize: 12, color: t.text.tertiary }}>Источник: {p.src}</div>
/*L2364*/               </div>}</Exp>
/*L2365*/             </div>);
/*L2366*/         })()}</div>)}
/*L2367*/       </div>
/*L2368*/       </div>; };
/*L2369*/   return (
/*L2370*/     <div>
/*L2371*/       {m && !(fon || !!qn) && <div style={{ display: 'flex', marginBottom: 12 }}><LawsSw m mk={cm} setMk={setCm} ks={cks} cnt={calCnt} /></div>}
/*L2372*/       <div style={!m ? { display: 'flex', gap: 20, alignItems: 'flex-start' } : undefined}>
/*L2373*/       <div style={fon || !!qn ? { display: 'none' } : !m ? { flex: '0 0 300px', position: 'sticky', top: 'calc(var(--gd-top, 0px) + 8px)', maxHeight: 'calc(100vh - var(--gd-top, 0px) - 16px)', overflowY: 'auto', alignSelf: 'flex-start' } : undefined}>
/*L2374*/       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>{[cm].map((k) => grid(new Date(+k.slice(3), +k.slice(0, 2) - 1, 1)))}</div>
/*L2375*/       <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: inf ? 8 : 16, transition: 'margin .25s ease' }}>
/*L2376*/         <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, fontSize: m ? 13 : 12, lineHeight: '16px', color: t.text.secondary, paddingTop: m ? 14 : 6 }}>
/*L2377*/         {lg(<i style={{ width: 14, height: 6, borderRadius: 1.5, display: 'inline-block', background: regD }} />, 'Работа в регионах')}
/*L2378*/         {lg(<i style={{ width: 14, height: 6, borderRadius: 1.5, display: 'inline-block', background: comD }} />, 'Работа в комитетах')}
/*L2379*/         {lg(<i style={{ width: 14, height: 6, borderRadius: 1.5, display: 'inline-block', background: amber }} />, 'Рассмотрение бюджета')}
/*L2380*/         {lg(<i style={{ width: 14, height: 6, borderRadius: 1.5, display: 'inline-block', background: green }} />, 'Заседание Правительства РФ')}
/*L2381*/         {lg(<i style={{ width: 14, height: 6, borderRadius: 1.5, display: 'inline-block', background: blue }} />, 'Пленарное заседание Госдумы')}
/*L2382*/         </div>
/*L2383*/         <button aria-expanded={inf} aria-label="Что означают отметки" onClick={() => setInf(!inf)} style={{ flex: 'none', minWidth: 44, minHeight: m ? 44 : 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
/*L2384*/           <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px', borderRadius: 13, border: `1px solid ${inf ? blue : t.border.default}`, color: inf ? blue : t.text.secondary, background: inf ? t.fill.accentSubtle : t.bg.base, fontFamily: t.font.family, fontSize: 12, fontWeight: t.weight.semibold, whiteSpace: 'nowrap', transition: 'all .2s ease' }}>Что это?<span style={{ display: 'inline-block', transition: 'transform .25s ease', transform: inf ? 'rotate(180deg)' : 'none' }}>▾</span></span>
/*L2385*/         </button>
/*L2386*/       </div>
/*L2387*/       <div style={{ display: 'grid', gridTemplateRows: inf ? '1fr' : '0fr', opacity: inf ? 1 : 0, transition: 'grid-template-rows .3s ease, opacity .3s ease, margin .3s ease', marginBottom: inf ? 16 : 0 }}>
/*L2388*/         <div style={{ overflow: 'hidden', minHeight: 0 }}>
/*L2389*/           <div style={{ padding: '10px 14px', borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}`, fontSize: 13, lineHeight: 1.5, color: t.text.secondary, display: 'flex', flexDirection: 'column', gap: 4 }}>
/*L2390*/             <div style={{ color: t.text.primary, fontWeight: t.weight.semibold }}>Госдума работает каждый будний день.</div>
/*L2391*/             <div>Работа в регионах: региональная неделя, депутаты встречаются с избирателями.</div>
/*L2392*/             <div>Работа в комитетах: в остальные будни готовят законопроекты в комитетах и фракциях.</div>
/*L2393*/             <div>Рассмотрение бюджета: дни, когда в повестке федеральный бюджет.</div>
/*L2394*/             <div>Заседание Правительства РФ: на нем принимают постановления и распоряжения.</div>
/*L2395*/             <div>Пленарное заседание: депутаты голосуют в зале.</div>
/*L2396*/           </div>
/*L2397*/         </div>
/*L2398*/       </div>
/*L2399*/       </div>
/*L2400*/       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', flex: '1 1 0', minWidth: 0 }}>{fon || !!qn ? (() => { const L = [...cks].reverse().map((k) => evList(k, true)).filter(Boolean); const nQ = qn ? CAL.p.reduce((s: number, p: any) => s + (p.a || []).filter((x: any) => mq(x) && zOk(x[0])).length, 0) : 0; return <>{qn && <div style={{ flex: '1 1 100%', fontSize: 14, color: t.text.secondary }}>Найдено по запросу: <b style={{ color: t.text.primary }}>{nQ}</b></div>}{L.length ? L : <div style={{ flex: '1 1 100%', ...card(t), padding: '14px 16px', color: t.text.secondary }}>Ничего не найдено</div>}</>; })() : [cm].map((k) => evList(k))}</div>
/*L2401*/       </div>
/*L2402*/     </div>);
/*L2403*/ }
/*L2404*/ 

// ===== DKCSS, stuckFrame/pinCorners (sticky corner overlays), PinSpacer, ToTop — L2410-L2428 =====
/*L2410*/ const DKCSS = '[role=tablist]{background:#2C2C30!important;border-color:rgba(255,255,255,.2)!important}[role=tab]{color:#E5E5EA!important}[role=tab][aria-selected=true]{background:#55555C!important;color:#FFFFFF!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3),0 1px 3px rgba(0,0,0,.5)!important}[data-df=all][aria-selected=true]{background:rgba(64,156,255,.24)!important;box-shadow:inset 0 0 0 1.5px #409CFF!important}[data-df=acc][aria-selected=true]{background:rgba(48,209,88,.2)!important;box-shadow:inset 0 0 0 1.5px #30D158!important}[data-df=rej][aria-selected=true]{background:rgba(255,69,58,.2)!important;box-shadow:inset 0 0 0 1.5px #FF453A!important}input{color:#F5F5F7!important}input::placeholder{color:#AEAEB2!important}button[style*="background: rgb(28, 28, 30)"][style*="border: 1px solid"],button[style*="background: rgb(28, 28, 30)"][style*="border-radius: 9px"],input[style*="background: rgb(28, 28, 30)"],[data-gdbar] div[style*="background: rgb(28, 28, 30)"][style*="border-radius"]{background:#36363B!important}button[style*="border: 1px solid"]:not([style*="border-top"]),input,[data-gdbar] div[style*="border: 1px solid"]{border-color:rgba(255,255,255,.28)!important}';
/*L2411*/ const stuckFrame = (bg: string, col: string, r: number, bw: number, lw: number, lcol: string, gut = 0) => [...(gut ? [0, 1].map((q) => <span key={'g' + q} aria-hidden style={{ position: 'absolute', top: -bw - 8, bottom: 0, [q ? 'right' : 'left']: -(q ? bw : lw) - gut, width: gut, background: bg, pointerEvents: 'none' }} />) : []), ...(gut ? [<span key="gt" aria-hidden style={{ position: 'absolute', top: -bw - 8, height: 8, left: -lw, right: -bw, background: bg, pointerEvents: 'none' }} />] : []), ...[0, 1].map((q) => <span key={'c' + q} aria-hidden style={{ position: 'absolute', top: -bw, [q ? 'right' : 'left']: q ? -bw : -lw, width: r, height: r, pointerEvents: 'none', background: `radial-gradient(circle at ${q ? 0 : r}px ${r}px, transparent ${r - 0.5}px, ${bg} ${r}px)` }} />), <span key="b" aria-hidden style={{ position: 'absolute', top: -bw, left: -lw, right: -bw, bottom: 0, boxSizing: 'border-box', borderTop: `${bw}px solid ${col}`, borderLeft: `${lw}px solid ${lcol}`, borderRight: `${bw}px solid ${col}`, borderRadius: `${r}px ${r}px 0 0`, pointerEvents: 'none' }} />];
/*L2412*/ const pinCorners = (bg: string, u = 0) => [0, 1].map((r) => <span key={r} aria-hidden style={{ position: 'absolute', top: -u, [r ? 'right' : 'left']: 0, width: 12, height: 12 + u, pointerEvents: 'none', background: `radial-gradient(circle at ${r ? '0' : '12px'} ${12 + u}px, transparent 11.5px, ${bg} 12px)` }} />);
/*L2413*/ function PinSpacer({ q }: { q: string }) {
/*L2414*/   const ref = useRef<HTMLDivElement | null>(null);
/*L2415*/   useEffect(() => { const sp = ref.current; if (!sp) return; let last = -1;
/*L2416*/     const f = () => { const c = document.querySelector(q) as HTMLElement | null; const pe = sp.parentElement; if (!c || !pe) return; const pr = pe.getBoundingClientRect(); const k = pe.offsetWidth ? pr.width / pe.offsetWidth : 1; const se = document.scrollingElement || document.documentElement; const sr = sp.getBoundingClientRect(); const tail = se.scrollHeight - (sr.bottom + window.scrollY); const need = Math.max(0, window.innerHeight - svTop() - (sr.top - c.getBoundingClientRect().top) - tail); const h = Math.ceil(need / k); if (h !== last) { last = h; sp.style.height = h + 'px'; } };
/*L2417*/     f(); const ro = new ResizeObserver(f); const c = document.querySelector(q); if (c) ro.observe(c); window.addEventListener('resize', f); return () => { ro.disconnect(); window.removeEventListener('resize', f); }; }, [q]);
/*L2418*/   return <div ref={ref} aria-hidden style={{ height: 0 }} />;
/*L2419*/ }
/*L2420*/ function ToTop({ t }: { t: any }) {
/*L2421*/   const [sh, setSh] = useState(false); const [kb, setKb] = useState(false);
/*L2422*/   useEffect(() => { const se = () => document.scrollingElement || document.documentElement; const f = () => { const pv = [...document.querySelectorAll('button')].find((b) => b.textContent === '‹') as HTMLElement | undefined; const sw = pv && pv.parentElement; if (!sw) { setSh(se().scrollTop > window.innerHeight * 1.5); return; } setSh(sw.getBoundingClientRect().bottom <= svPin()); }; const fi = (e: any) => { const g = e.target as HTMLElement; if (g && (g.tagName === 'INPUT' || g.tagName === 'TEXTAREA')) setKb(true); }; const fo = () => setKb(false); f(); window.addEventListener('scroll', f, { passive: true }); const fc = () => setTimeout(f, 120); document.addEventListener('click', fc); document.addEventListener('focusin', fi); document.addEventListener('focusout', fo); return () => { window.removeEventListener('scroll', f); document.removeEventListener('click', fc); document.removeEventListener('focusin', fi); document.removeEventListener('focusout', fo); }; }, []);
/*L2423*/   const on = sh && !kb;
/*L2424*/   return <button aria-label="Наверх" title="Наверх" tabIndex={on ? 0 : -1} onClick={() => { anchorGen++; window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ position: 'fixed', right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', zIndex: 49, width: 44, height: 44, padding: 2, border: 'none', background: 'transparent', cursor: 'pointer', opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden', pointerEvents: on ? 'auto' : 'none', transform: on ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.92)', transition: on ? 'opacity 280ms cubic-bezier(.4,0,.2,1), transform 280ms cubic-bezier(.4,0,.2,1), visibility 0s linear 0s' : 'opacity 280ms cubic-bezier(.4,0,.2,1), transform 280ms cubic-bezier(.4,0,.2,1), visibility 0s linear 280ms', willChange: 'opacity, transform', WebkitTapHighlightColor: 'transparent' }} className="gtt"><style>{'@media (prefers-reduced-motion: reduce){.gtt{transition:none!important;transform:none!important}}'}</style>
/*L2425*/     <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 9999, background: DK ? 'rgba(44,44,46,0.88)' : 'rgba(255,255,255,0.9)', border: `1px solid ${t.border.default}`, boxShadow: DK ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any}>
/*L2426*/       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.text.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
/*L2427*/     </span></button>;
/*L2428*/ }

// ===== App: --gd-top ResizeObserver, openHit/toggle/fold (Голосования tab), sticky bar, layout — L2429-L2679 =====
/*L2429*/ export default function App() {
/*L2430*/   const gk: any = useGT0();
/*L2431*/   const [tho, setTho] = useState<string | null>(THO0);
/*L2432*/   setPal(tho ? tho === 'dark' : !!gk && gk.kind === 'dark' && (typeof window !== 'undefined' ? window.innerWidth : 1200) <= 700);
/*L2433*/   const t = useGrokTheme(); useZS();
/*L2434*/   const [filter, setFilter] = useState<'all' | 'acc' | 'rej'>('all');
/*L2435*/   const [q, setQ] = useState(''); const [cq, setCq] = useState(''); zClrQ = () => setCq('');
/*L2436*/   const [day, setDay] = useState(QS && QS.get('d') && DAYS.includes(QS.get('d')!) ? QS.get('d')! : DAYS[DAYS.length - 1]);
/*L2437*/   const [open, setOpen] = useState<string | null>(QS ? QS.get('v') : null);
/*L2438*/   const [dd, setDd] = useState(false);
/*L2439*/   const [sOpen, setSOpen] = useState(false);
/*L2440*/   const box = useRef<HTMLDivElement>(null);
/*L2441*/   const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
/*L2442*/   const ro = useRef<any>(null);
/*L2443*/   const measure = (el: HTMLDivElement | null) => {
/*L2444*/     if (!el || ro.current || typeof ResizeObserver === 'undefined') return;
/*L2445*/     ro.current = new ResizeObserver((e) => { const x = Math.round(e[0].contentRect.width); setW((p) => (p === x ? p : x)); });
/*L2446*/     ro.current.observe(el);
/*L2447*/   };
/*L2448*/   const m = w <= 700;
/*L2449*/   const Z = m ? 1 : 0.8; GZ = Z;
/*L2450*/   const [mode, setMode] = useState<'d' | 'c' | 'l'>(QS && QS.get('tab') === 'l' ? 'l' : QS && QS.get('tab') === 'd' ? 'd' : 'c');
/*L2451*/   const [lmk, setLmk] = useState(LMK0);
/*L2452*/   const [cmk, setCmk] = useState(() => calCk(new Date()));
/*L2453*/   useEffect(() => { const h = () => { if (CSNAP) setMode('c'); }; window.addEventListener('popstate', h); return () => window.removeEventListener('popstate', h); }, []);
/*L2454*/   const [view, setView] = useState<'v' | 's'>(COUNT[day] ? 'v' : 's');
/*L2455*/   const [topH, setTopH] = useState(0);
/*L2456*/   const [hid, setHid] = useState(false);
/*L2457*/   useMemo(() => setTimeout(() => { const h = Array.from(document.querySelectorAll('h1')).find((e) => (e.textContent || '').trim() === 'Календарь законов') as HTMLElement | undefined; if (!h) { setHid(false); return; } h.style.display = 'none'; setHid(true); }, 0), [m]);
/*L2458*/   const ro2 = useRef<any>(null);
/*L2459*/   const bar = (el: HTMLDivElement | null) => {
/*L2460*/     if (!el || ro2.current || typeof ResizeObserver === 'undefined') return;
/*L2461*/     ro2.current = new ResizeObserver(() => { const h = Math.round(el.offsetHeight); setTopH((p) => (p === h ? p : h)); document.documentElement.style.setProperty('--gd-top', h + 'px'); });
/*L2462*/     ro2.current.observe(el);
/*L2463*/   };
/*L2464*/   const ph = useRef<HTMLDivElement>(null);
/*L2465*/   const barEl = useRef<HTMLDivElement | null>(null);
/*L2466*/   const [fx, setFx] = useState<null | { l: number; w: number }>(null);
/*L2467*/   useEffect(() => {
/*L2468*/     let broken = false;
/*L2469*/     const on = () => {
/*L2470*/       const p = ph.current; if (!p || broken) return;
/*L2471*/       const r = p.getBoundingClientRect();
/*L2472*/       if (r.top < 0) setFx((o) => (o && o.l === r.left && o.w === r.width ? o : { l: r.left, w: r.width }));
/*L2473*/       else setFx((o) => (o ? null : o));
/*L2474*/       requestAnimationFrame(() => { const b = barEl.current; if (b && b.style.position === 'fixed' && Math.abs(b.getBoundingClientRect().top) > 2) { broken = true; setFx(null); } });
/*L2475*/     };
/*L2476*/     window.addEventListener('scroll', on, true); window.addEventListener('resize', on); on();
/*L2477*/     return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); };
/*L2478*/   }, []);
/*L2479*/   const votes = useMemo(() => parse(DATA[day]), [day]);
/*L2480*/   const list = useMemo(() => votes.filter((v) =>
/*L2481*/     (filter === 'all' || (filter === 'acc') === v.ok) &&
/*L2482*/     true), [votes, filter]);
/*L2483*/   const nAcc = votes.filter((v) => v.ok).length;
/*L2484*/   const qq = normQ(q.trim());
/*L2485*/   const hits = useMemo(() => { if (!qq) return []; const out: { d: string; v: Vote[] }[] = []; for (const d of [...DAYS].reverse()) { const vs = parse(DATA[d]).filter((v) => normQ([v.id, v.doc, v.q, v.full, (PLAIN[v.id] || {}).title || ''].join(' ')).includes(qq)); if (vs.length) out.push({ d, v: vs }); } return out; }, [qq]);
/*L2486*/   const nHits = hits.reduce((a, h) => a + h.v.length, 0);
/*L2487*/   const openHit = (d: string, id: string) => { const hv = parse(DATA[d]).find((x) => x.id === id); if (filter !== 'all' && (!hv || (filter === 'acc') !== hv.ok)) setFilter('all'); setQ(''); setMode('d'); go(d, true); setView('v'); setOpen(id); if (m) { const ae = document.activeElement as HTMLElement | null; if (ae && ae.blur) ae.blur(); const vv = (window as any).visualViewport; let done = false, tries = 0; const q = () => document.querySelector(`[data-vid="${id}"]`) as HTMLElement | null; const go2 = () => { if (done) return; done = true; if (vv) vv.removeEventListener('resize', onR); const run = () => { const el = q(); if (!el) { if (++tries < 20) setTimeout(run, 60); return; } anchorTo(q, svTop()); }; run(); }; let rt: any = 0; const onR = () => { clearTimeout(rt); rt = setTimeout(go2, 120); }; if (vv) vv.addEventListener('resize', onR); setTimeout(go2, 320); return; } let tries = 0; const seek = () => { const el = document.querySelector(`[data-vid="${id}"]`) as HTMLElement | null; if (el) { el.scrollIntoView({ block: 'start' }); revealCard(id); } else if (++tries < 20) setTimeout(seek, 60); }; setTimeout(seek, 60); };
/*L2488*/   const toggle = (id: string, idx: number) => {
/*L2489*/     const el = box.current; const q = () => document.querySelector(`[data-vid="${id}"]`) as HTMLElement | null;
/*L2490*/     const pin = () => { if (m || !el) return svTop(); const hd = el.querySelector('[data-colhead]') as HTMLElement | null; return Math.max(el.getBoundingClientRect().top, svTop()) + (hd ? hd.getBoundingClientRect().height : 0); };
/*L2491*/     const r0 = q(); const y0 = r0 ? r0.getBoundingClientRect().top : 0; const tgt = r0 ? (!m && open !== id ? y0 : open !== id ? pin() : Math.max(y0, pin())) : null;
/*L2492*/     setOpen(open === id ? null : id);
/*L2493*/     if (open) requestAnimationFrame(() => { const w = document.querySelector(`[data-vid="${open}"]`) as HTMLElement | null; const r = w && w.firstElementChild as HTMLElement | null; if (r && r.animate) r.animate([{ backgroundColor: FLASH() }, { backgroundColor: 'rgba(10,102,214,0)' }], { duration: 1800, easing: 'ease-out' }); });
/*L2494*/     if (tgt != null) anchorTo(q, tgt, m ? 1 : GZ);
/*L2495*/   };
/*L2496*/   const fold = (id: string, idx: number) => toggle(id, idx);
/*L2497*/   const foldBtn = (id: string, idx: number) => <button className="gd-tap" onClick={() => fold(id, idx)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 44, border: 'none', borderTop: `1px solid ${t.border.subtle}`, background: t.fill.accentSubtle, color: t.text.accent, fontFamily: t.font.family, fontSize: 14, fontWeight: t.weight.semibold, cursor: 'pointer', position: 'sticky', left: 0 }}>Свернуть ↑</button>;
/*L2498*/   const ring = <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '0 0 12px 12px', border: `2px solid ${t.text.accent}`, borderTop: 'none', zIndex: 4, pointerEvents: 'none' }} data-ring="1" />;
/*L2499*/   const ringD = <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '0 0 12px 12px', border: `2.5px solid ${t.text.accent}`, borderTop: 'none', zIndex: 4, pointerEvents: 'none' }} data-ring="1" />;
/*L2500*/   const strip = <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: t.text.accent, zIndex: 3, pointerEvents: 'none' }} />;
/*L2501*/   useEffect(() => {
/*L2502*/     const mk = (z: number) => { const w = document.createElement('div'); w.setAttribute('data-gdpin', '1'); w.style.cssText = `position:fixed;overflow:hidden;z-index:${z};display:none;pointer-events:auto;`; document.body.appendChild(w); return w; };
/*L2503*/     const ph = mk(60), pr = mk(59); let src: Element | null = null, srcH: Element | null = null, raf = 0;
/*L2504*/     const put = (w: HTMLDivElement, el: HTMLElement | null, top: number, clipL: number, clipW: number, key: 'r' | 'h') => {
/*L2505*/       if (!el) { w.style.display = 'none'; return; }
/*L2506*/       const r = el.getBoundingClientRect();
/*L2507*/       if ((key === 'r' ? src : srcH) !== el || !w.firstChild) { w.replaceChildren(); const c = el.cloneNode(true) as HTMLElement; c.style.position = 'static'; c.style.margin = '0'; c.style.boxSizing = 'border-box'; c.style.boxShadow = '0 4px 6px -4px rgba(0,0,0,.25)'; w.appendChild(c); if (key === 'r') src = el; else srcH = el; }
/*L2508*/       const cs = getComputedStyle(el); Object.assign(w.style, { fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeight: cs.lineHeight, color: cs.color, letterSpacing: cs.letterSpacing }); const c = w.firstChild as HTMLElement; c.style.zoom = String(GZ); c.style.width = r.width / GZ + 'px'; c.style.transform = `translateX(${(r.left - clipL) / GZ}px)`;
/*L2509*/       Object.assign(w.style, { display: 'block', top: top + 'px', left: clipL + 'px', width: clipW + 'px', height: r.height + 'px' });
/*L2510*/     };
/*L2511*/     const tick = () => { raf = 0; if (m) { ph.style.display = 'none'; pr.style.display = 'none'; return; }
/*L2512*/       const b = barEl.current as HTMLElement | null; let top = 0;
/*L2513*/       if (b) { const br = b.getBoundingClientRect(); if (br.top <= 1 && br.bottom > 0) top = br.bottom; }
/*L2514*/       const bx = box.current as HTMLElement | null; const bxr = bx ? bx.getBoundingClientRect() : null;
/*L2515*/       const cl = bxr ? Math.max(0, bxr.left) : 0, cw = bxr ? Math.min(window.innerWidth, bxr.right) - cl : window.innerWidth;
/*L2516*/       const hd = bx ? bx.querySelector('[data-colhead]') as HTMLElement | null : null;
/*L2517*/       if (hd && bxr) { const hr = hd.getBoundingClientRect(); if (hr.top < top - 1 && bxr.bottom > top + hr.height * 2) { put(ph, hd, top, cl, cw, 'h'); top += hr.height; } else { ph.style.display = 'none'; if (hr.bottom > top && hr.top <= top + 1 && bxr.top < top) top = hr.bottom; } } else ph.style.display = 'none';
/*L2518*/       const wr = open ? document.querySelector(`[data-vid="${open}"]`) as HTMLElement | null : null; const row = wr ? wr.firstElementChild as HTMLElement | null : null;
/*L2519*/       if (wr && row) { const rr = row.getBoundingClientRect(), wrr = wr.getBoundingClientRect(); if (rr.top < top - 1 && wrr.bottom > top + rr.height) put(pr, row, top, cl, cw, 'r'); else pr.style.display = 'none'; } else pr.style.display = 'none';
/*L2520*/     };
/*L2521*/     const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
/*L2522*/     pr.onclick = () => { if (src) (src as HTMLElement).click(); pr.style.display = 'none'; };
/*L2523*/     window.addEventListener('scroll', on, true); window.addEventListener('resize', on); on();
/*L2524*/     return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); ph.remove(); pr.remove(); };
/*L2525*/   }, [open, day, filter, view, m]);
/*L2526*/   const pick = (k: 'all' | 'acc' | 'rej') => { setFilter(k); setOpen(null); requestAnimationFrame(() => { const el = box.current; if (!el) return; window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - topH - 8), behavior: 'smooth' }); }); };
/*L2527*/   const [sc, setSc] = useState(false);
/*L2528*/   useEffect(() => { const f = () => setSc(window.scrollY > 4); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
/*L2529*/   const setF = (k: any) => { setFilter(k); setOpen(null); };
/*L2530*/   const plv = (n: number) => { const a = n % 10, b = n % 100; return `${n} ${a === 1 && b !== 11 ? 'голосование' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'голосования' : 'голосований'}`; };
/*L2531*/   const badge = (n: number, full?: boolean) => n ? <span title={plv(n)} aria-label={plv(n)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 22, padding: '1px 8px', borderRadius: 999, fontSize: 12, fontWeight: t.weight.semibold, lineHeight: '18px', whiteSpace: 'nowrap', background: t.fill.accentSubtle, color: t.text.accent, fontVariantNumeric: 'tabular-nums' }}>{full ? plv(n) : n}</span> : null;
/*L2532*/   const go = (d: string, keep?: boolean) => { if (!keep) { CSNAP = null; setCmk(calCk(new Date())); } setDay(d); setOpen(null); setDd(false); setView(COUNT[d] ? 'v' : 's'); if (box.current) box.current.scrollTop = 0; if (m && box.current && box.current.getBoundingClientRect().top < 0) window.scrollTo(0, 0); };
/*L2533*/   const di = DAYS.indexOf(day);
/*L2534*/   const cap = { fontSize: t.font.caption.fontSize, color: t.text.secondary } as const;
/*L2535*/   const btn = (dis: boolean) => ({ width: 36, height: 32, padding: 0, borderRadius: 9, cursor: dis ? 'default' : 'pointer', fontFamily: t.font.family, fontSize: 18, lineHeight: 1, border: 'none', background: 'transparent', color: dis ? t.text.tertiary : t.text.primary, opacity: dis ? 0.5 : 1 }) as const;
/*L2536*/   const stat = (n: number, label: string, c?: string) => (<div style={{ minWidth: m ? 0 : '5.5rem' }}><div style={{ fontSize: m ? 22 : 24, fontWeight: t.weight.semibold, letterSpacing: '-0.02em', lineHeight: 1.1, color: c || t.text.primary, fontVariantNumeric: 'tabular-nums' }}>{n}</div><div style={{ ...cap, marginTop: 2 }}>{label}</div></div>);
/*L2537*/   const months = Array.from(new Set([...DAYS].reverse().map((d) => d.slice(3))));
/*L2538*/   const mt = (st: boolean) => ({ flex: '0 0 auto', minWidth: 'max-content', whiteSpace: 'nowrap', minHeight: m ? 40 : 36, padding: '0 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ${t.font.family}`, lineHeight: '20px', fontSize: 15, fontWeight: st ? t.weight.semibold : t.weight.regular, background: st ? t.bg.base : 'transparent', boxShadow: st ? `0 1px 3px ${t.border.default}` : 'none', color: t.text.primary });
/*L2539*/   const sbox = (
/*L2540*/     <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 44, boxSizing: 'border-box', padding: '0 14px', borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}`, cursor: 'text' }}>
/*L2541*/       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.text.tertiary} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4.2-4.2" /></svg>
/*L2542*/       <input value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Поиск" aria-label="Поиск" style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', padding: 0, fontFamily: t.font.family, fontSize: 16, color: t.text.primary }} />
/*L2543*/       {q && <button aria-label="Очистить" onClick={() => setQ('')} style={{ flexShrink: 0, width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', color: t.text.tertiary, fontSize: 18, lineHeight: 1 }}>×</button>}
/*L2544*/     </label>);
/*L2545*/   const cbox = (
/*L2546*/     <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: 44, boxSizing: 'border-box', padding: '0 14px', borderRadius: 10, background: `linear-gradient(${t.bg.subtle}, ${t.bg.subtle}), ${t.bg.base}`, border: `1px solid ${t.border.subtle}`, cursor: 'text' }}>
/*L2547*/       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.text.tertiary} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4.2-4.2" /></svg>
/*L2548*/       <input data-cq="1" value={cq} onChange={(e: any) => { if (e.target.value.trim() && zN()) setZS({ w: [], t: [], c: [] }); setCq(e.target.value); }} placeholder="Поиск" aria-label="Поиск" style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent', padding: 0, fontFamily: t.font.family, fontSize: 16, color: t.text.primary }} />
/*L2549*/       {cq && <button aria-label="Очистить" onClick={() => setCq('')} style={{ flexShrink: 0, width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', color: t.text.tertiary, fontSize: 18, lineHeight: 1 }}>×</button>}
/*L2550*/     </label>);
/*L2551*/   const mt2 = (x: boolean) => ({ ...mt(x), flex: 1 });
/*L2552*/   const dateSw = (
/*L2553*/       <div style={{ display: 'flex', flex: 1, verticalAlign: 'middle', flexWrap: 'nowrap', gap: 2, alignItems: 'center', marginBottom: 0, padding: 3, height: m ? 50 : 44, boxSizing: 'border-box', borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}`, maxWidth: '100%' }}>
/*L2554*/         <button className="gd-tap" aria-label="Предыдущий день" disabled={di <= 0} onClick={() => go(DAYS[di - 1])} style={{ ...btn(di <= 0), ...(m ? { width: 44, height: 44 } : { height: 36 }) }}>‹</button>
/*L2555*/         <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
/*L2556*/           <button aria-label="Дата" aria-haspopup="listbox" aria-expanded={dd} onClick={() => setDd(!dd)} style={{ width: '100%', minWidth: m ? 0 : 168, height: m ? 44 : 36, padding: '0 12px', borderRadius: 9, fontFamily: t.font.family, fontSize: m ? 16 : t.font.table.fontSize, fontWeight: t.weight.semibold, border: 'none', background: t.bg.base, boxShadow: `0 1px 3px ${t.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: t.text.primary, cursor: 'pointer', whiteSpace: 'nowrap' }}>
/*L2557*/             <span>{dayLabel(day)}</span>{badge(COUNT[day])}
/*L2558*/           </button>
/*L2559*/           {dd && <>
/*L2560*/             <div onClick={() => setDd(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
/*L2561*/             <div role="listbox" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6, zIndex: 41, width: m ? 'min(300px, calc(100vw - 24px))' : 260, maxHeight: '60vh', overflowY: 'auto', padding: 6, borderRadius: 12, background: t.bg.base, boxShadow: '0 8px 28px rgba(0,0,0,0.18)', border: `1px solid ${t.border.subtle}` }}>
/*L2562*/               {months.map((mm) => (
/*L2563*/                 <div key={mm}>
/*L2564*/                   <div style={{ fontSize: 12, fontWeight: t.weight.semibold, color: t.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '8px 10px 4px' }}>{MONN[Number(mm.slice(0, 2)) - 1]} {mm.slice(3)}</div>
/*L2565*/                   {[...DAYS].reverse().filter((d) => d.slice(3) === mm).map((d) => <button key={d} role="option" aria-selected={d === day} onClick={() => go(d)} style={{ width: '100%', minHeight: 40, padding: '0 10px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: t.font.family, fontSize: 15, fontWeight: d === day ? t.weight.semibold : t.weight.regular, background: d === day ? t.bg.subtle : 'transparent', color: t.text.primary, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><span>{dayLabel(d)}</span>{badge(COUNT[d], true)}</button>)}
/*L2566*/                 </div>
/*L2567*/               ))}
/*L2568*/             </div>
/*L2569*/           </>}
/*L2570*/         </div>
/*L2571*/         <button className="gd-tap" aria-label="Следующий день" disabled={di >= DAYS.length - 1} onClick={() => go(DAYS[di + 1])} style={{ ...btn(di >= DAYS.length - 1), ...(m ? { width: 44, height: 44 } : { height: 36 }) }}>›</button>
/*L2572*/       </div>);
/*L2573*/   const thBtn = <button aria-label={DK ? 'Светлая тема' : 'Темная тема'} title={DK ? 'Светлая тема' : 'Темная тема'} onClick={() => { const n = DK ? 'light' : 'dark'; setTho(n); try { localStorage.setItem('gd_theme', n); } catch (e) {} }} style={{ flexShrink: 0, width: 32, height: 32, padding: 0, borderRadius: 9999, border: `1px solid ${t.border.default}`, background: t.bg.subtle, color: t.text.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{DK ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>}</button>;
/*L2574*/   return (
/*L2575*/     <Page title="Календарь законов" width="wide">
/*L2576*/       <style>{css(t) + `#root,#root>div{background:${DK ? '#000000' : '#FFFFFF'}!important;color:${DK ? '#F5F5F7' : '#1D1D1F'}!important}#root>div{min-height:100vh}` + (tho ? ADAPT() : '') + (DK ? DKCSS : '')}</style>
/*L2577*/       <div ref={measure} style={{ width: '100%', height: 0 }} />
/*L2578*/       <div style={{ zoom: String(Z), color: t.text.primary }}>
/*L2579*/       {m && <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '0 0 12px' }}>{hid && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '2px 2px 0' }}><div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: t.text.primary }}>Календарь законов</div>{thBtn}</div>}<div role="tablist" style={{ display: 'flex', padding: 3, gap: 2, height: 50, boxSizing: 'border-box', borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}` }}>{([['c', 'Календарь'], ['l', w < 370 ? 'Законы' : 'Вступают в силу'], ['d', 'Новости']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} onClick={() => { if (k === 'l') { CSNAP = null; setCmk(calCk(new Date())); } setMode(k); setView('v'); window.scrollTo(0, 0); }} style={{ ...mt2(mode === k), minWidth: 0, minHeight: 44, padding: '0 4px', fontSize: 14, letterSpacing: '-0.01em' }}>{l}</button>)}</div>{mode === 'd' && dateSw}{mode === 'l' && <LawsSw m={m} mk={lmk} setMk={setLmk} />}</div>}
/*L2580*/       <div ref={ph} style={{ width: '100%', height: fx ? topH / Z + (m ? 4 : 14) : 0 }} />
/*L2581*/       <div data-gdbar="1" ref={(el) => { barEl.current = el; bar(el); }} style={{ ...(m ? (mode === 'c' ? { position: 'sticky', top: 0, zIndex: 20, margin: 0, padding: '8px 0 0', background: t.bg.base } : { padding: 0, margin: 0 }) : { position: 'sticky', top: 0, zIndex: 20, margin: 0, padding: '14px 0 12px', background: t.bg.base, boxShadow: sc ? '0 6px 8px -8px rgba(0,0,0,0.25)' : 'none', transition: 'box-shadow .15s' }), ...(fx ? { position: 'fixed', top: 0, left: fx.l / Z, width: fx.w / Z, margin: 0, boxSizing: 'border-box' } : {}) } as any}>
/*L2582*/       {false && m && mode === 'd' && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{mode === 'd' && votes.length > 0 && <div role="tablist" style={{ display: 'flex', padding: 3, gap: 2, height: 50, boxSizing: 'border-box', borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}` }}>{([['all', votes.length, plv(votes.length).replace(/^\d+ /, ''), t.text.primary], ['acc', nAcc, 'принято', INK[0]], ['rej', votes.length - nAcc, 'отклонено', votes.length - nAcc ? INK[1] : t.text.primary]] as const).map(([k, n, l, c]) => <button key={k} data-f={k} role="tab" aria-selected={filter === k} onClick={() => setF(k)} style={{ ...mt2(filter === k), minWidth: 0, minHeight: 44, padding: '0 2px', fontSize: w < 370 ? 13 : 14, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis' }}><b style={{ color: c }}>{n}</b> {l}</button>)}</div>}{mode === 'd' && <div style={{ height: 44, display: 'flex' }}>{sbox}</div>}{mode === 'd' && (!!qq || !votes.length) && <div style={{ fontSize: 14, color: t.text.secondary, padding: '0 2px', fontVariantNumeric: 'tabular-nums' }}>{qq ? <>Найдено: <b style={{ color: t.text.primary }}>{nHits}</b> {plv(nHits).replace(/^\d+ /, '')} за все дни</> : 'Пленарного заседания не было'}</div>}</div>}
/*L2583*/       {!m && hid && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '0 0 12px' }}><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: t.text.primary }}>Календарь законов</div>{thBtn}</div>}
/*L2584*/       {!m && <div style={{ display: 'inline-grid', gap: 12 }}><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
/*L2585*/         <div role="tablist" style={{ display: 'flex', flex: 1, padding: 3, height: 44, boxSizing: 'border-box', gap: 2, borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}` }}>{([['c', 'Календарь'], ['l', 'Вступают в силу'], ['d', 'Новости']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} onClick={() => { if (k === 'l') { CSNAP = null; setCmk(calCk(new Date())); } setMode(k); window.scrollTo(0, 0); }} style={mt2(mode === k)}>{l}</button>)}</div>
/*L2586*/         {mode === 'd' && dateSw}
/*L2587*/         {mode === 'l' && <LawsSw m={m} mk={lmk} setMk={setLmk} />}
/*L2588*/         {mode === 'c' && !cq.trim() && !zN() && <LawsSw m={m} mk={cmk} setMk={setCmk} ks={calCks()} cnt={calCnt} />}
/*L2589*/       </div>{false && votes.length > 0 && <div role="tablist" style={{ display: 'flex', padding: 3, gap: 2, height: 44, boxSizing: 'border-box', borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}` }}>{([['all', votes.length, plv(votes.length).replace(/^\d+ /, ''), t.text.primary], ['acc', nAcc, 'принято', INK[0]], ['rej', votes.length - nAcc, 'отклонено', votes.length - nAcc ? INK[1] : t.text.primary]] as const).map(([k, n, l, c]) => <button key={k} data-f={k} role="tab" aria-selected={filter === k} onClick={() => setF(k)} style={mt2(filter === k)}><b style={{ color: c }}>{n}</b> {l}</button>)}</div>}</div>}
/*L2590*/       
/*L2591*/       {mode === 'c' && <div style={{ marginTop: m ? 0 : 12, paddingBottom: m ? 10 : 0, background: t.bg.base }}>{cbox}<ZBar m={m} /></div>}
/*L2592*/       {mode === 'd' && <>
/*L2593*/       {false && (!!qq || !votes.length) && <div style={{ marginTop: 12, fontSize: 14, color: t.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{qq ? <>Найдено: <b style={{ color: t.text.primary }}>{nHits}</b> {plv(nHits).replace(/^\d+ /, '')} за все дни</> : votes.length ? null : 'Пленарного заседания не было'}</div>}
/*L2594*/       {false && <div role="tablist" style={{ display: 'flex', marginTop: 8, padding: 3, gap: 2, borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}` }}>{([['v', 'Голосования', votes.length], ['s', 'Сводка', null]] as const).map(([k, l, c]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => { setView(k); window.scrollTo(0, 0); }} style={{ flex: 1, minWidth: 0, minHeight: 40, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: t.font.family, fontSize: 15, fontWeight: view === k ? t.weight.semibold : t.weight.regular, background: view === k ? t.bg.base : 'transparent', boxShadow: view === k ? `0 1px 3px ${t.border.default}` : 'none', color: t.text.primary }}>{l}{c != null && <span style={{ color: t.text.tertiary }}> {c}</span>}</button>)}</div>}
/*L2595*/       </>}
/*L2596*/       </div>
/*L2597*/       {mode === 'l' ? <Laws m={m} mk={lmk} /> : mode === 'c' ? <Calendar cq={cq} m={m} day={day} openVote={openHit} cm={cmk} setCm={setCmk} openDay={(d) => { setMode('d'); go(d, true); window.scrollTo(0, 0); }} /> : <><Summary key={day} day={day} votes={votes} m={m} />{false && <>
/*L2598*/       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px', alignItems: 'stretch', marginBottom: !m && !votes.length ? 12 : 0 }}>
/*L2599*/         {true ? false && <div style={{ flex: '1 1 100%', fontSize: 14, color: t.text.secondary, padding: '0 2px', fontVariantNumeric: 'tabular-nums' }}>{votes.length ? <><b style={{ color: t.text.primary }}>{votes.length}</b> {plv(votes.length).replace(/^\d+ /, '')} · <b style={{ color: INK[0] }}>{nAcc}</b> принято · <b style={{ color: votes.length - nAcc ? INK[1] : t.text.primary }}>{votes.length - nAcc}</b> отклонено</> : 'Пленарного заседания не было'}</div> :
/*L2600*/         <div style={{ ...card(t), padding: m ? '12px 14px' : '14px 18px', color: t.text.primary, lineHeight: 1.45, flex: m ? '1 1 100%' : '0 1 auto' }}>
/*L2601*/           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: votes.length ? 10 : 2 }}><span style={{ fontWeight: t.weight.semibold, letterSpacing: '-0.01em' }}>{votes.length ? `Пленарное заседание ${day}` : day}</span></div>
/*L2602*/           {votes.length ? (<>
/*L2603*/           <div style={m ? { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 } : { display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>{stat(votes.length, 'Голосований')}{stat(nAcc, 'Принятых решений', INK[0])}{stat(votes.length - nAcc, 'Отклонено', votes.length - nAcc ? INK[1] : undefined)}</div>
/*L2604*/           {!m && <div style={{ ...cap, marginTop: 10 }}>Нажмите на строку, чтобы увидеть результаты</div>}</>) : <div style={{ color: t.text.secondary }}>Пленарного заседания не было</div>}
/*L2605*/         </div>}
/*L2606*/         {false && <div style={{ flex: m ? '1 1 100%' : '1 1 24rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
/*L2607*/           <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
/*L2608*/             {m ? <div style={{ display: 'flex', width: '100%', flexDirection: 'column', gap: 8 }}><div role="tablist" style={{ display: 'flex', flex: 1, minWidth: 0, padding: 2, gap: 2, borderRadius: 10, background: t.bg.subtle }}>{([['all', 'Все', votes.length], ['acc', 'Принятые', nAcc], ['rej', 'Отклоненные', votes.length - nAcc]] as const).map(([k, l, c]) => <button key={k} role="tab" aria-selected={filter === k} onClick={() => pick(k)} style={{ flex: 1, minWidth: 0, minHeight: 38, padding: '0 2px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: t.font.family, fontSize: w < 380 ? 13 : 14, letterSpacing: '-0.02em', fontWeight: filter === k ? t.weight.semibold : t.weight.regular, background: filter === k ? t.bg.base : 'transparent', boxShadow: filter === k ? `0 1px 3px ${t.border.default}` : 'none', color: t.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l} <span style={{ color: t.text.tertiary }}>{c}</span></button>)}</div>{sbox}</div>
/*L2609*/             : <Segmented value={filter} onChange={(x) => setFilter(x as any)} options={[{ value: 'all', label: 'Все', count: votes.length }, { value: 'acc', label: 'Принятые', count: nAcc }, { value: 'rej', label: 'Отклоненные', count: votes.length - nAcc }]} />}
/*L2610*/             {!m && <div style={{ flex: m ? '1 1 100%' : '1 1 14rem', fontSize: m ? 16 : undefined }}><Input value={q} onChange={setQ} placeholder="Поиск" /></div>}
/*L2611*/           </div>
/*L2612*/         </div>}
/*L2613*/       </div>
/*L2614*/       {qq ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
/*L2615*/         {false && <div style={{ fontSize: 14, color: t.text.secondary, padding: '0 2px' }}>Найдено: <b style={{ color: t.text.primary }}>{nHits}</b> {plv(nHits).replace(/^\d+ /, '')} за все дни</div>}
/*L2616*/         {hits.map((h) => <div key={h.d} style={{ ...card(t), padding: 0, overflow: 'hidden' }}>
/*L2617*/           <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: t.weight.semibold, color: t.text.secondary, background: t.bg.subtle, borderBottom: `1px solid ${t.border.subtle}` }}>{dayLabel(h.d)}</div>
/*L2618*/           {h.v.map((v) => <div key={v.id} role="button" tabIndex={0} className="gd-row" onClick={() => openHit(h.d, v.id)} onKeyDown={(e) => { if (e.key === 'Enter') openHit(h.d, v.id); }} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px', minHeight: 44, cursor: 'pointer', borderBottom: `1px solid ${t.border.subtle}` }}>
/*L2619*/             <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: m ? 16 : 15, color: t.text.primary, overflowWrap: 'anywhere' }}>{v.q}</div><div style={{ marginTop: 3, fontSize: 13, color: t.text.secondary, overflowWrap: 'anywhere' }}>{v.doc !== '—' && <span style={{ fontFamily: t.font.mono, color: t.text.accent }}>{v.doc}</span>}{normRead(v.reading) !== '—' && <> · {normRead(v.reading)}</>} · за {v.total[0]}{v.full !== v.q && <span style={{ color: t.text.tertiary }}> — {v.full}</span>}</div></div>
/*L2620*/             <div style={{ flexShrink: 0 }}><Status tone={v.ok ? 'success' : 'danger'}>{v.ok ? 'принят' : 'отклонен'}</Status></div>
/*L2621*/           </div>)}
/*L2622*/         </div>)}
/*L2623*/         {!hits.length && <div style={{ ...card(t), padding: 14, color: t.text.secondary }}>Ничего не найдено</div>}
/*L2624*/       </div> : <>
/*L2625*/       {<Summary key={day} day={day} votes={votes} m={m} />}
/*L2626*/       {!votes.length ? <div style={{ ...card(t), padding: '16px 18px', color: t.text.secondary }}>Голосований не было</div> : m ? <div ref={box} style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowAnchor: 'none' }}>
/*L2627*/         {list.map((v, idx) => {
/*L2628*/           const on = open === v.id;
/*L2629*/           return (
/*L2630*/             <div key={v.id} data-vid={v.id} style={{ borderRadius: 12, overflow: 'clip', background: t.bg.subtle, position: 'relative' }}>{on && ring}
/*L2631*/               <div role="button" tabIndex={0} aria-expanded={on} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(v.id, idx); } }} onClick={() => toggle(v.id, idx)} style={{ padding: '12px 14px', minHeight: 44, cursor: 'pointer', background: on ? `linear-gradient(${t.fill.accentSubtle}, ${t.fill.accentSubtle}), ${t.bg.subtle}` : 'transparent', ...(on ? { position: 'sticky', top: 'var(--gd-top, 0px)', zIndex: 4, borderRadius: '12px 12px 0 0', boxShadow: `inset 0 2px 0 0 ${t.text.accent}, inset 2px 0 0 ${t.text.accent}, inset -2px 0 0 ${t.text.accent}, 0 4px 6px -4px rgba(0,0,0,.25)` } : {}), WebkitTapHighlightColor: 'transparent' }}>{on && pinCorners(t.bg.base)}
/*L2632*/                 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
/*L2633*/                   <div style={{ flex: 1, minWidth: 0, fontSize: 16, lineHeight: 1.35, fontWeight: on ? t.weight.semibold : t.weight.regular, color: t.text.primary, ...(on ? { overflowWrap: 'anywhere' } : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }} title={v.full}>{v.q}</div>
/*L2634*/                   <div style={{ flexShrink: 0, marginTop: 1 }}><Status tone={v.ok ? 'success' : 'danger'}>{v.ok ? 'принят' : 'отклонен'}</Status></div>
/*L2635*/                 </div>
/*L2636*/                 <div style={{ display: on ? 'block' : 'none', marginTop: 4, fontSize: 13, color: t.text.secondary, overflowWrap: 'anywhere' }}><span style={{ fontFamily: t.font.mono }}>№ {v.id}</span>{v.doc !== '—' && <> · <span style={{ fontFamily: t.font.mono, color: t.text.accent }}>{v.doc}</span></>}{normRead(v.reading) !== '—' && <> · {normRead(v.reading)}</>}</div>
/*L2637*/                 <div style={{ marginTop: 8 }}><Bar v={v.total} /></div>
/*L2638*/                 <div style={{ marginTop: 6, display: 'flex', overflow: 'hidden', gap: w < 380 ? 6 : 8, fontSize: w < 380 ? 11 : 12, letterSpacing: '-0.01em', whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>{v.total.map((x, i) => <span key={i} style={{ color: SYS[i], fontWeight: i === 0 ? t.weight.semibold : t.weight.regular }}>{['за', 'против', 'воздержались', 'не голосовали'][i]} <b style={{ fontVariantNumeric: 'tabular-nums' }}>{x}</b></span>)}</div>
/*L2639*/               </div>
/*L2640*/               {on && <><Panel v={v} m day={day} />{foldBtn(v.id, idx)}</>}
/*L2641*/             </div>
/*L2642*/           );
/*L2643*/         })}
/*L2644*/         {!list.length && <div style={{ ...card(t), padding: 14, color: t.text.secondary }}>Ничего не найдено</div>}
/*L2645*/         {open && <PinSpacer q={`[data-vid="${open}"]`} />}
/*L2646*/       </div> : <div ref={box} style={{ ...card(t), maxHeight: `calc(${100 / Z}vh - 11.5rem)`, minHeight: '18rem', overflowY: 'auto', overflowX: 'auto', overflowAnchor: 'none', position: 'relative' }}>
/*L2647*/         <div data-colhead="1" ref={(el) => { if (el && el.parentElement) el.parentElement.style.setProperty('--gd-th', el.offsetHeight + 'px'); }} style={{ display: 'grid', gridTemplateColumns: COLS, gap: '0 8px', alignItems: 'center', padding: '10px 16px', minWidth: '60rem', position: 'sticky', top: 0, zIndex: 5, background: t.bg.base, borderBottom: `1px solid ${t.border.default}`, fontSize: 11, fontWeight: t.weight.semibold, letterSpacing: 0, whiteSpace: 'nowrap', textTransform: 'uppercase', color: t.text.secondary }}>
/*L2648*/           <span /><span>№</span><span>Законопроект</span><span style={{ textAlign: 'center' }}>Краткое название</span><span>Чтение</span><span style={{ textAlign: 'center' }}>Итог</span><span style={{ textAlign: 'center' }}>Распределение</span><span style={{ textAlign: 'center' }}>За</span><span style={{ textAlign: 'center' }}>Против</span><span style={{ textAlign: 'center' }}>Воздержались</span><span style={{ textAlign: 'center' }}>Не голосовали</span>
/*L2649*/         </div>
/*L2650*/         {list.map((v, idx) => {
/*L2651*/           const on = open === v.id;
/*L2652*/           return (
/*L2653*/             <div key={v.id} data-vid={v.id} style={{ position: 'relative', ...(on ? { borderRadius: 12, overflow: 'clip', margin: '4px 0' } : {}) }}>{on && ringD}
/*L2654*/               <div className="gd-row" role="button" tabIndex={0} aria-expanded={on} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(v.id, idx); } }} onClick={() => toggle(v.id, idx)} title={v.full} style={{ display: 'grid', gridTemplateColumns: COLS, gap: '0 8px', alignItems: 'center', padding: '0 16px', minWidth: '60rem', height: 46, boxSizing: 'border-box', whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: `1px solid ${t.border.subtle}`, background: on ? `linear-gradient(${t.fill.accentSubtle}, ${t.fill.accentSubtle}), ${t.bg.base}` : 'transparent', ...(on ? { position: 'sticky', top: 'var(--gd-th, 37px)', zIndex: 4, borderRadius: '12px 12px 0 0', boxShadow: `inset 0 2.5px 0 0 ${t.text.accent}, inset 2.5px 0 0 ${t.text.accent}, inset -2.5px 0 0 ${t.text.accent}` } : {}), fontSize: t.font.table.fontSize, color: t.text.primary }}>{on && pinCorners(t.bg.base, 3)}
/*L2655*/                 <span style={{ color: t.text.tertiary, display: 'inline-block', transition: 'transform .2s ease', transform: on ? 'rotate(90deg)' : 'none' }}>▸</span>
/*L2656*/                 <span style={{ fontFamily: t.font.mono, color: t.text.secondary }}>{v.id}</span>
/*L2657*/                 <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: t.font.mono, color: t.text.accent }}>{v.doc}</span>
/*L2658*/                 <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: on ? t.weight.semibold : t.weight.regular }}>{v.q}</span>
/*L2659*/                 <span title={normRead(v.reading)} style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: t.text.secondary }}>{normRead(v.reading)}</span>
/*L2660*/                 <span style={{ display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap' }}><Status tone={v.ok ? 'success' : 'danger'}>{v.ok ? 'принят' : 'отклонен'}</Status></span>
/*L2661*/                 <Bar v={v.total} />
/*L2662*/                 {v.total.map((x, i) => <span key={i} style={{ fontFamily: t.font.mono, textAlign: 'center', color: SYS[i], fontWeight: x ? t.weight.semibold : t.weight.regular }}>{x}</span>)}
/*L2663*/               </div>
/*L2664*/               {on && <div style={{ position: 'relative' }}><Panel v={v} day={day} />{foldBtn(v.id, idx)}</div>}
/*L2665*/             </div>
/*L2666*/           );
/*L2667*/         })}
/*L2668*/         {!list.length && <div style={{ padding: 12, color: t.text.secondary }}>Ничего не найдено</div>}
/*L2669*/       </div>}
/*L2670*/       </>}
/*L2671*/       </>}</>}
/*L2672*/       <div style={{ height: 8 }} />
/*L2673*/       <p style={{ fontSize: 14, color: t.text.secondary, lineHeight: 1.5 }}>Источники: {['vote.duma.gov.ru', 'sozd.duma.gov.ru', 'duma.gov.ru', 'government.ru'].map((s, i) => <span key={s}>{i ? ', ' : ''}<a href={`http://${s}/`} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{s}</a></span>)}</p>
/*L2674*/       {m && <div style={{ height: 64 }} />}
/*L2675*/       </div>
/*L2676*/       {m && <ToTop t={t} />}
/*L2677*/     </Page>
/*L2678*/   );
/*L2679*/ }
