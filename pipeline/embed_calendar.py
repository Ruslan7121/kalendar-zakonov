import json, os
c = json.load(open('/workspace/out/calendar.json'))
cal = {'u': c['updated'], 'w': [[w['from'], w['to'], w['type']] for w in c['weeks']],
       'p': [{'d': d['date'], 's': d['status'], 't': d.get('time'), 'src': d['source'], 'a': [[a['doc'], a['short'], a.get('reading'), a['url'], a['title']] for a in d['agenda']]} for d in c['days']],
       'g': [[g['date'], g['title'], g['url']] for g in c['gov_meetings']], 'n': []}
cards = sorted(f[:-4] for f in os.listdir('/workspace/social/out') if f.endswith('.2026.png'))
CALC = "const CAL: any = " + json.dumps(cal, ensure_ascii=False) + ";\nconst CARDS: string[] = " + json.dumps(cards) + ";\nconst SITE = 'https://duma-svodki.netlify.app';\n"
COMP = r'''
const WDS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WDL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const pd = (s: string) => new Date(+s.slice(6, 10), +s.slice(3, 5) - 1, +s.slice(0, 2));
const fd = (x: Date) => `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
function Calendar({ m, openDay }: { m: boolean; openDay: (d: string) => void }) {
  const t = useGrokTheme();
  const [ex, setEx] = useState<string | null>(null);
  const now = new Date(); const today = fd(now);
  const P: Record<string, any> = Object.fromEntries(CAL.p.map((x: any) => [x.d, x]));
  const G: Record<string, any> = Object.fromEntries(CAL.g.map((x: any) => [x[0], x]));
  const wk = (d: Date) => { const x = CAL.w.find((w: any) => pd(w[0]) <= d && d <= pd(w[1])); return x ? x[2] : null; };
  const blue = t.text.accent, green = INK[0], amber = INK[2];
  const months = [0, 1].map((k) => new Date(now.getFullYear(), now.getMonth() + k, 1));
  const cell = (d: Date, inM: boolean) => {
    const s = fd(d); const p = P[s]; const g = G[s]; const has = DAYS.includes(s); const w = wk(d); const isT = s === today;
    const click = has ? () => openDay(s) : p && p.s !== 'held' ? () => { setEx(s); requestAnimationFrame(() => { const el = document.getElementById('ev-' + s); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); }); } : undefined;
    return (
      <div key={s} role={click ? 'button' : undefined} tabIndex={click ? 0 : undefined} onClick={click} onKeyDown={(e) => { if (click && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); click(); } }}
        title={[p ? `Пленарное заседание${p.s === 'expected' ? ' (ожидается по распорядку)' : ''}` : '', g ? 'Заседание Правительства' : '', w === 'regional' ? 'Региональная неделя' : '', has ? 'Открыть итоги дня' : ''].filter(Boolean).join(' · ')}
        style={{ minWidth: 0, minHeight: m ? 46 : 58, padding: m ? '4px 3px' : '6px 8px', borderRadius: 9, cursor: click ? 'pointer' : 'default', opacity: inM ? 1 : 0, pointerEvents: inM ? 'auto' : 'none',
          background: w === 'regional' ? 'rgba(178,80,0,0.07)' : p ? (p.s === 'expected' ? 'transparent' : t.fill.accentSubtle) : 'transparent',
          border: isT ? `2px solid ${blue}` : p && p.s === 'expected' ? `1px dashed ${blue}` : `1px solid ${has ? t.border.default : 'transparent'}`, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: m ? 14 : 15, fontWeight: p || isT ? t.weight.semibold : t.weight.regular, color: d.getDay() === 0 || d.getDay() === 6 ? t.text.tertiary : t.text.primary, fontVariantNumeric: 'tabular-nums' }}>{d.getDate()}</span>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          {p && (m ? <i style={{ width: 7, height: 7, borderRadius: 4, background: p.s === 'expected' ? 'transparent' : blue, border: `1.5px solid ${blue}` }} /> : <span style={{ fontSize: 11, color: blue, fontWeight: t.weight.semibold }}>{p.s === 'expected' ? 'пленарн.?' : 'пленарн.'}</span>)}
          {g && (m ? <i style={{ width: 7, height: 7, borderRadius: 4, background: green }} /> : <span style={{ fontSize: 11, color: green, fontWeight: t.weight.semibold }}>Прав-во</span>)}
          {has && !m && <span style={{ fontSize: 11, color: t.text.tertiary }}>итоги ›</span>}
        </span>
      </div>);
  };
  const grid = (first: Date) => {
    const off = (first.getDay() + 6) % 7; const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const ds: [Date, boolean][] = [];
    for (let i = 0; i < off; i++) ds.push([new Date(first.getFullYear(), first.getMonth(), i - off + 1), false]);
    for (let i = 1; i <= n; i++) ds.push([new Date(first.getFullYear(), first.getMonth(), i), true]);
    return (
      <div key={first.getMonth()} style={{ ...card(t), padding: m ? '12px 10px' : '14px 16px', flex: m ? '1 1 100%' : '1 1 22rem', minWidth: 0 }}>
        <div style={{ fontWeight: t.weight.semibold, marginBottom: 8, color: t.text.primary }}>{MONN[first.getMonth()]} {first.getFullYear()}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: m ? 3 : 4 }}>
          {WDS.map((x, i) => <span key={x} style={{ fontSize: 12, textAlign: 'center', color: i > 4 ? t.text.tertiary : t.text.secondary, paddingBottom: 2 }}>{x}</span>)}
          {ds.map(([d, inM]) => cell(d, inM))}
        </div>
      </div>);
  };
  const lg = (c: React.ReactNode, l: string) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{c}{l}</span>;
  const sq = (st: any) => <i style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', ...st }} />;
  const ev: any[] = [
    ...CAL.p.filter((p: any) => pd(p.d) >= pd(today)).map((p: any) => ({ d: p.d, k: 'p', p })),
    ...CAL.g.filter((g: any) => pd(g[0]) >= pd(today)).map((g: any) => ({ d: g[0], k: 'g', g })),
    ...CAL.w.filter((w: any) => w[2] === 'regional' && pd(w[0]) >= pd(today)).map((w: any) => ({ d: w[0], k: 'r', w })),
  ].sort((a, b) => +pd(a.d) - +pd(b.d)).slice(0, 14);
  const lastG = CAL.g.length ? CAL.g[CAL.g.length - 1] : null;
  const pill = (txt: string, c: string, dashed?: boolean) => <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 10, border: `1px ${dashed ? 'dashed' : 'solid'} ${c}`, color: c, whiteSpace: 'nowrap' }}>{txt}</span>;
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>{months.map(grid)}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12, color: t.text.secondary, marginBottom: 16 }}>
        {lg(sq({ background: t.fill.accentSubtle, border: `1px solid ${blue}` }), 'пленарное заседание')}
        {lg(sq({ border: `1px dashed ${blue}` }), 'ожидается по распорядку')}
        {lg(sq({ background: green, borderRadius: 6, width: 8, height: 8 }), 'заседание Правительства')}
        {lg(sq({ background: 'rgba(178,80,0,0.15)' }), 'региональная неделя')}
        {lg(sq({ border: `2px solid ${blue}` }), 'сегодня')}
        <span>Дни с итогами кликабельны</span>
      </div>
      <div style={{ fontWeight: t.weight.semibold, fontSize: 17, marginBottom: 8, color: t.text.primary }}>Ближайшие события</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ev.map((e) => {
          const d = pd(e.d); const head = `${d.getDate()} ${MON[d.getMonth()]}, ${WDL[d.getDay()]}`;
          if (e.k === 'r') return <div key={'r' + e.d} style={{ ...card(t), padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', background: 'rgba(178,80,0,0.05)' }}><span style={{ fontWeight: t.weight.semibold }}>{e.w[0].slice(0, 5)}–{e.w[1].slice(0, 5)}</span><span>Региональная неделя (работа с избирателями)</span>{pill('по распорядку', amber, true)}</div>;
          if (e.k === 'g') return <div key={'g' + e.d} style={{ ...card(t), padding: '10px 14px' }}><b>{head}</b> · <a href={e.g[2]} target="_blank" rel="noreferrer" style={{ color: t.text.accent }}>{e.g[1]}</a></div>;
          const p = e.p; const on = ex === p.d; const a = p.a || [];
          return (
            <div key={'p' + p.d} id={'ev-' + p.d} style={{ ...card(t), overflow: 'hidden' }}>
              <div role={a.length ? 'button' : undefined} tabIndex={a.length ? 0 : undefined} aria-expanded={a.length ? on : undefined} onClick={() => a.length && setEx(on ? null : p.d)} onKeyDown={(k) => { if (a.length && (k.key === 'Enter' || k.key === ' ')) { k.preventDefault(); setEx(on ? null : p.d); } }}
                style={{ padding: '10px 14px', minHeight: 44, cursor: a.length ? 'pointer' : 'default', display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'center', background: on ? t.fill.accentSubtle : 'transparent' }}>
                <span style={{ fontWeight: t.weight.semibold }}>{head}{p.t ? `, ${p.t}` : ''}</span>
                <span>Пленарное заседание</span>
                {p.s === 'expected' ? pill('ожидается', amber, true) : pill(p.d === today ? 'сегодня' : 'подтверждено', blue)}
                <span style={{ flex: '1 1 auto' }} />
                <span style={{ fontSize: 13, color: a.length ? t.text.accent : t.text.tertiary }}>{a.length ? `Повестка: ${a.length} ${on ? '▾' : '▸'}` : 'повестка ещё не опубликована'}</span>
              </div>
              {on && <div style={{ borderTop: `1px solid ${t.border.subtle}` }}>
                {a.map((x: any) => (
                  <div key={x[0] + x[1]} style={{ display: 'flex', flexWrap: m ? 'wrap' : 'nowrap', gap: '2px 10px', padding: '8px 14px', borderBottom: `1px solid ${t.border.subtle}`, fontSize: 14, alignItems: 'baseline' }} title={x[4]}>
                    <a href={x[3]} target="_blank" rel="noreferrer" style={{ fontFamily: t.font.mono, color: t.text.accent, flexShrink: 0, minWidth: m ? 0 : '6.5rem' }}>{x[0]}</a>
                    <span style={{ flex: '1 1 12rem', minWidth: 0, color: t.text.primary, overflowWrap: 'anywhere' }}>{x[1]}{m ? null : <span style={{ color: t.text.tertiary }}> — {x[4].length > 140 ? x[4].slice(0, 139) + '…' : x[4]}</span>}</span>
                    <span style={{ color: t.text.secondary, flexShrink: 0 }}>{x[2] || '—'}</span>
                  </div>))}
                <div style={{ padding: '6px 14px', fontSize: 12, color: t.text.tertiary }}>Источник: {p.src}</div>
              </div>}
            </div>);
        })}
        {!ev.length && <div style={{ ...card(t), padding: 14, color: t.text.secondary }}>Нет запланированных событий</div>}
      </div>
    </div>);
}

'''
tab = "(st: boolean) => ({ flex: 1, minWidth: 0, minHeight: m ? 40 : 34, padding: '0 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: t.font.family, fontSize: 15, fontWeight: st ? t.weight.semibold : t.weight.regular, background: st ? t.bg.base : 'transparent', boxShadow: st ? `0 1px 3px ${t.border.default}` : 'none', color: t.text.primary })"
modeBar = "\n      <div role=\"tablist\" style={{ display: m ? 'flex' : 'inline-flex', marginBottom: m ? 8 : 12, padding: 3, gap: 2, borderRadius: 10, background: t.bg.subtle, border: `1px solid ${t.border.subtle}` }}>{([['d', 'Итоги дня'], ['c', 'Календарь']] as const).map(([k, l]) => <button key={k} role=\"tab\" aria-selected={mode === k} onClick={() => { setMode(k); window.scrollTo(0, 0); }} style={mt(mode === k)}>{l}</button>)}</div>\n      {mode === 'd' && <>"
E = [
 ("export default function App() {", CALC + COMP + "export default function App() {"),
 ("  const [view, setView] = useState<'v' | 's'>(", "  const [mode, setMode] = useState<'d' | 'c'>('d');\n  const [view, setView] = useState<'v' | 's'>("),
 ("  const months = Array.from(new Set(DAYS.map((d) => d.slice(3))));\n", "  const months = Array.from(new Set(DAYS.map((d) => d.slice(3))));\n  const mt = " + tab + ";\n"),
 (": { display: 'contents' }}>\n      <div style={m ? { display: 'flex', gap: 2,", ": { display: 'contents' }}>" + modeBar + "\n      <div style={m ? { display: 'flex', gap: 2,"),
 ("</button>)}</div>}\n      </div>\n      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px'", "</button>)}</div>}\n      </>}\n      </div>\n      {mode === 'c' ? <Calendar m={m} openDay={(d) => { setMode('d'); go(d); window.scrollTo(0, 0); }} /> : <>\n      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px'"),
 ("        {!list.length && <div style={{ padding: 12, color: t.text.secondary }}>Ничего не найдено</div>}\n      </div>}\n      <div style={{ height: 8 }} />", "        {!list.length && <div style={{ padding: 12, color: t.text.secondary }}>Ничего не найдено</div>}\n      </div>}\n      </>}\n      <div style={{ height: 8 }} />"),
 ("<div style={{ fontWeight: t.weight.semibold, letterSpacing: '-0.01em', marginBottom: votes.length ? 10 : 2 }}>{votes.length ? `Пленарное заседание ${day}` : day}</div>",
  "<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: votes.length ? 10 : 2 }}><span style={{ fontWeight: t.weight.semibold, letterSpacing: '-0.01em' }}>{votes.length ? `Пленарное заседание ${day}` : day}</span>{CARDS.includes(day) && <a href={`${SITE}/cards/${day}.png`} download={`duma-${day}.png`} target=\"_blank\" rel=\"noreferrer\" title=\"PNG 1080×1350 для соцсетей (квадрат 1080×1080: _sq.png)\" style={{ fontSize: 13, fontWeight: t.weight.semibold, color: t.text.accent, textDecoration: 'none', padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.border.default}`, whiteSpace: 'nowrap' }}>⤓ Карточка дня</a>}</div>"),
]
s = open('/workspace/out/canvas.tsx').read()
for a, b in E:
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)
open('/workspace/out/canvas.tsx', 'w').write(s)
json.dump([{'old_string': a, 'new_string': b} for a, b in E], open('/tmp/cv/eds.json', 'w'), ensure_ascii=False)
print('ok', len(s))
