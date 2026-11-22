// Фильтры и метки: «Для кого / Тема / Что меняется», фильтр органов, «Мои интересы», избранное.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.
import React from 'react';
import { ReactNode, useState } from 'grok/canvas';
import { billNo } from './misc';
import { ORGG } from './orgs';

export function hlq(s: string, q: string): any {
  if (!q || !s) return s;
  const lo = s.toLowerCase().replace(/ё/g, 'е');
  let i = -1,
    L = 0;
  for (const w of q.split(/\s+/)) {
    if (!w) continue;
    const j = lo.indexOf(w);
    if (j >= 0 && (i < 0 || j < i)) {
      i = j;
      L = w.length;
    }
  }
  if (i < 0) return s;
  return (
    <>
      {s.slice(0, i)}
      <mark style={{ background: '#FFE58A', color: 'inherit', borderRadius: 3, padding: '0 1px' }}>
        {s.slice(i, i + L)}
      </mark>
      {hlq(s.slice(i + L), q)}
    </>
  );
}
export const ZL = new Set<() => void>();
export const FAV_KEY = 'gd_favs';
export const FL = new Set<() => void>();
export function lawNo(s: string) {
  if (!s) return null;
  const b = billNo(s);
  if (b) return b;
  const m = s.match(/№\s*(\d+-ФЗ)/i) || s.match(/\b(\d+-ФЗ)\b/i);
  return m ? m[1] : null;
}
export const STAR_Y = '#F5C400';
/* 12.11.2026: сохранение без регистрации не работает — кнопка «Сохраненные» и звездочки скрыты (код оставлен). */
export const NOFAV = true;
export const zKeyR = (n: string) => 'Пост. ' + n;
export const qHit = (txt: string, q: string) => {
  if (!q) return true;
  const s = normQ(txt || '');
  return q.split(/\s+/).every((w) => !w || s.includes(w));
};
export const gaTxt = (x: any) =>
  [x[0], x[1], x[2], ...(Array.isArray(x[3]) ? x[3] : [])].filter((z) => typeof z === 'string').join(' ');
export function ZChip({ on, l, onClick, x, t, n, zk, pressed, none }: any) {
  return (
    <button
      aria-pressed={pressed == null ? undefined : !!pressed}
      data-cofnone={none ? '1' : undefined}
      data-zk={zk}
      data-zv={zk ? l : undefined}
      data-zc={n == null ? undefined : n}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 1,
        maxWidth: '100%',
        minHeight: 34,
        padding: '4px 12px',
        borderRadius: 17,
        border: `1px solid ${on ? t.text.accent : t.border.default}`,
        background: on ? t.fill.accentSubtle : t.bg.base,
        color: on ? t.text.accent : t.text.primary,
        fontFamily: t.font.family,
        fontSize: 14,
        fontWeight: on ? 600 : 400,
        cursor: 'pointer',
        whiteSpace: 'normal',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      {l}
      {n != null && (
        <span
          aria-label={`карточек: ${n}`}
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: on ? t.text.accent : n ? t.text.tertiary : t.border.default,
          }}
        >
          {n}
        </span>
      )}
      {x && (
        <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
          ×
        </span>
      )}
    </button>
  );
}
export const COK = ORGG.flatMap((g) => g[2]);
export const COL = new Set<() => void>();
/* 21.11.2026: «Мои интересы» — явный выбор меток «Для кого» и «Тема»: переключатель «Только моё» и звёздочка «Для вас» на карточках, уведомления в Telegram.
   Хранится в localStorage и в Telegram.CloudStorage (у пользователя в Telegram, на всех его устройствах). Обычные «Фильтры» ничего не запоминают. */
export const MYK = 'kz_my_v1';
export type MyN = { vote: boolean; new: boolean; soon: boolean; quiet: boolean; qs: string; qe: string };
export type MyS = { t: number; on: boolean; tags: string[]; n: MyN };
export const MYL = new Set<() => void>();
export const normQ = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
export function FPill({
  k,
  on,
  c,
  tint,
  set,
  children,
}: {
  k: string;
  on: boolean;
  c: string;
  tint: string;
  set: (k: any) => void;
  children: React.ReactNode;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      data-f={k}
      aria-pressed={on}
      onClick={() => set(k)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        font: 'inherit',
        color: 'inherit',
        letterSpacing: 'inherit',
        border: 'none',
        margin: '0 1px',
        padding: '1px 7px',
        borderRadius: 9999,
        cursor: 'pointer',
        background: on ? tint : h ? 'rgba(120,120,128,0.12)' : 'transparent',
        boxShadow: on ? `inset 0 0 0 1px ${c}33` : 'none',
        textDecoration: !on && h ? 'underline dotted' : 'none',
        textUnderlineOffset: 3,
        transition: 'background .15s',
      }}
    >
      {children}
    </button>
  );
}
