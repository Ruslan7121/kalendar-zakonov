import React, { useState, useMemo, useRef, useEffect } from 'react';
export { useState, useMemo, useRef, useEffect };
const T = {
  bg: { base: '#FFFFFF', subtle: '#F4F4F6' },
  border: { default: '#D9D9DE', subtle: '#E8E8EC' },
  fill: { accentSubtle: '#E8F0FE' },
  text: { primary: '#1D1D1F', secondary: '#5F5F66', tertiary: '#8E8E93', accent: '#0A66D6' },
  font: { family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', body1: { fontSize: '15px' }, table: { fontSize: '14px' }, caption: { fontSize: '12px' } },
  weight: { regular: 400, semibold: 600 },
  radius: { md: 8 },
  dataviz: { categorical: ['#34C759', '#FF9F0A'], negative: '#FF3B30', other: '#C7C7CC' },
};
import { useState as _uS, useEffect as _uE } from 'react';
export function useGrokTheme(): any { const q = window.matchMedia('(prefers-color-scheme: dark)'); const [d, sd] = _uS(q.matches); _uE(() => { const f = () => sd(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []); return { ...T, kind: d ? 'dark' : 'light' }; }
export function Page({ title, children }: any) {
  return <main style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 20px 40px', fontFamily: T.font.family, color: T.text.primary, fontSize: 15 }}>
    <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 18px' }}>{title}</h1>{children}</main>;
}
export function Text({ children }: any) { return <p style={{ fontSize: 14, color: T.text.secondary, lineHeight: 1.5 }}>{children}</p>; }
export function Segmented({ value, onChange, options }: any) {
  return <div role="tablist" style={{ display: 'inline-flex', padding: 3, gap: 2, borderRadius: 10, background: T.bg.subtle, border: `1px solid ${T.border.subtle}`, flexWrap: 'wrap' }}>
    {options.map((o: any) => { const on = o.value === value; return <button key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)} style={{ border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontFamily: T.font.family, fontSize: 14, fontWeight: on ? 600 : 400, background: on ? T.bg.base : 'transparent', boxShadow: on ? `0 1px 3px ${T.border.default}` : 'none', color: T.text.primary }}>{o.label}{o.count != null && <span style={{ color: T.text.tertiary, marginLeft: 6 }}>{o.count}</span>}</button>; })}
  </div>;
}
export function Input({ value, onChange, placeholder }: any) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${T.border.default}`, fontFamily: T.font.family, fontSize: 14, color: T.text.primary, background: T.bg.base }} />;
}
export function Status({ tone, children }: any) {
  const c = tone === 'success' ? ['#E8F7EC', '#248A3D'] : ['#FDECEC', '#D70015'];
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 9999, background: c[0], color: c[1], fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', justifySelf: 'start' }}>{children}</span>;
}
export function LinkCards({ links }: any) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{links.map((l: any, i: number) => <a key={i} href={l.href} target="_blank" rel="noreferrer" style={{ flex: '1 1 14rem', display: 'block', padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border.subtle}`, background: T.bg.base, textDecoration: 'none', color: T.text.primary }}><div style={{ fontWeight: 600, fontSize: 14 }}>{l.title} ↗</div><div style={{ fontSize: 12, color: T.text.secondary }}>{l.site}</div></a>)}</div>;
}
// Not used by CalendarApp; stand-ins kept for the paused maket (maket/maket.tsx), should it be restored.
export function Section({ children }: any) { return <section>{children}</section>; }
export function Table(_p: any) { return null; }
export function Rows(_p: any) { return null; }
export type { ChangeEvent, CSSProperties, ReactNode, KeyboardEvent } from 'react';
