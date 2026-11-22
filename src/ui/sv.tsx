// Блоки окна законопроекта: «Путь закона», разделы, прокрутка к блоку.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.
import React from 'react';
import { useState, useEffect } from 'grok/canvas';

export const TRK: [string, string][] = [['in', 'Внесен'], ['kom', 'Комитет'], ['r1', '1 чтение'], ['r2', '2 чтение'], ['r3', '3 чтение'], ['sf', 'Совет Федерации'], ['sign', 'Президент'], ['pub', 'Опубликован'], ['force', 'Вступает в силу']];
export function readStage(rd: string): number {
  const r = (rd || '').toLowerCase();
  if (/вступ|сил/.test(r)) return 8;
  if (/опублик/.test(r)) return 7;
  if (/президент|подписан/.test(r)) return 6;
  if (/совет федерац|\bсф\b/.test(r)) return 5;
  if (/3\s*чтен|3-е/.test(r)) return 4;
  if (/2\s*чтен|2-е/.test(r)) return 3;
  if (/1\s*чтен|1-е/.test(r)) return 2;
  if (/комитет/.test(r)) return 1;
  if (/внесен/.test(r)) return 0;
  return -1;
}
export function splitTag(x: string): [string | null, string] {
  const i = x.indexOf(': ');
  return i > 0 && i <= 30 && !/[.!?«]/.test(x.slice(0, i)) ? [x.slice(0, i), x.slice(i + 2)] : [null, x];
}
export type Rep = (id: string, o: boolean) => void;
export const MH = (t: any) => ({ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 44, padding: '10px 2px', position: 'sticky', top: 'var(--gd-top, 0px)', zIndex: 5, background: t.bg.base, border: 'none', borderBottom: `1px solid ${t.border.subtle}`, cursor: 'pointer', fontFamily: t.font.family, fontSize: 16, fontWeight: t.weight.semibold, color: t.text.primary, textAlign: 'left' }) as const;
export type FSub = [string, [string, string][]];
export function parseFull(s: string): Record<string, FSub[]> {
  const out: Record<string, FSub[]> = {};
  let h = '';
  s.split('\n').forEach((l) => {
    if (l.startsWith('##')) (out[h] = out[h] || []).push([l.slice(2), []]);
    else if (l.startsWith('#')) { h = l.slice(1); out[h] = out[h] || []; }
    else if (l && out[h] && out[h].length) { const i = l.lastIndexOf('|'); out[h][out[h].length - 1][1].push([l.slice(0, i), l.slice(i + 1)]); }
  });
  return out;
}
export const svTop = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gd-top')) || 0;
export const scrollPar = (e: HTMLElement | null): HTMLElement | null => { let p = e && e.parentElement; while (p && p !== document.body && p !== document.documentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p; p = p.parentElement; } return null; };
export const svScroller = (el: HTMLElement): HTMLElement | null => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p; } return null; };
export const svPin = () => { let b = svTop(); const bar = document.querySelector('[data-gdbar]') as HTMLElement | null; if (bar) { const r = bar.getBoundingClientRect(); if (r.height > 0 && r.top <= 1) b = Math.max(b, r.bottom); } return b; };
export const svBack = (el: HTMLElement | null) => { if (!el) return; requestAnimationFrame(() => requestAnimationFrame(() => { const root = (el.closest('[data-svroot]') as HTMLElement | null) || el; const tg = root.getBoundingClientRect().top - (svPin() + 12); if (tg >= 0) return; const sc = svScroller(root); if (sc) sc.scrollBy({ top: tg, behavior: 'smooth' }); else { const y = window.scrollY + tg; window.scrollTo({ top: y < svPin() ? 0 : y, behavior: 'smooth' }); } })); };
export function useFloat(ref: React.RefObject<HTMLDivElement>, open: boolean) {
  const [f, setF] = useState(false);
  useEffect(() => { if (!open) { setF(false); return; } const on = () => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); setF(r.top < svTop() - 20 && r.bottom > window.innerHeight + 10); }; on(); window.addEventListener('scroll', on, true); window.addEventListener('resize', on); return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); }; }, [open]);
  return f;
}
