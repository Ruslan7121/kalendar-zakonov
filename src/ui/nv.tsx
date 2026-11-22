// Базовые элементы карточек и окон: кольца, плитки, значки, модальное окно (NvModal).
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.

export type Fr = { v: number[]; size: number };
export type Vote = { id: string; doc: string; q: string; full: string; reading: string; ok: boolean; total: number[]; fr: Record<string, Fr> | null };
export const nums = (s: string) => s.split('/').map(Number);
/* ===== Новый вид (14.11.2026, по сводному макету владельца) =====
   Плитка без рамки, приподнятая тенью; итог — свечение внутрь от краёв (зелёное — принят, красное — отклонен, у органов — цвет органа);
   стадия — рамка своим цветом; карточка открывается отдельным окном со светящейся кромкой. */
export const NV_STG: Record<string, [string, string]> = { r1: ['#8A6E00', '#D9BE45'], r2: ['#7F5AB5', '#B69CE6'], r3: ['#0A66D6', '#5AA2FF'], rat: ['#0B7C93', '#4FC3D9'], o: ['#5F5F66', '#A5A5AD'] };
export const nvMix = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
export const nvPill = (c: string): any => ({ display: 'inline-block', fontSize: 11.5, fontWeight: 600, lineHeight: 1.3, padding: '1px 9px', borderRadius: 9999, border: `1.5px solid ${c}`, color: c, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' });
/* Окно карточки: лист снизу на телефоне, окно по центру на компьютере; кромка светится цветом c. Закрытие: крестик, фон, Escape, «назад». */
/* 14.11.2026 (6А): «уменьшение движения» в системе — окна без анимации */
export const RMO = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
export const OBOX = (t: any, m?: boolean) => ({ background: t.bg.base, border: `1px solid ${t.border.subtle}`, borderRadius: 12, padding: m ? '10px 10px' : '12px 14px', minWidth: 0 }) as const;
export const OBODY = (t: any, m?: boolean) => ({ padding: m ? '10px 10px 12px' : '14px 16px 16px', background: t.bg.subtle, borderTop: `1px solid ${t.border.subtle}` }) as const;
