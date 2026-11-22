// Тема оформления: палитры светлой и тёмной темы, цвета, общие стили и CSS страницы.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.
import { useState, useRef, useEffect } from 'grok/canvas';
import { RMO } from './nv';

export const LIGHT = {
  bg: { base: '#FFFFFF', subtle: '#F4F4F6' },
  border: { default: '#D9D9DE', subtle: '#E8E8EC' },
  fill: { accentSubtle: '#DDE9FD' },
  text: { primary: '#1D1D1F', secondary: '#4E4E55', tertiary: '#6E6E75', accent: '#0A66D6' },
};
export const DARK = {
  bg: { base: '#1C1C1E', subtle: '#2C2C30' },
  border: { default: 'rgba(255,255,255,0.28)', subtle: 'rgba(255,255,255,0.2)' },
  fill: { accentSubtle: '#14365C' },
  text: { primary: '#F5F5F7', secondary: '#D6D6DB', tertiary: '#A5A5AD', accent: '#409CFF' },
};
export const SYS_L = ['#34C759', '#FF3B30', '#FF9F0A', '#9A9AA1'],
  SYS_D = ['#30D158', '#FF453A', '#FF9F0A', '#8E8E93'];
/* 14.11.2026 (Ц2): кольца плиток, свечение, кружочки фракций и легенда — одни и те же яркие зелёный/красный/оранжевый */
export const INK_L = ['#34C759', '#FF3B30', '#FF9F0A', '#6E6E73'],
  INK_D = ['#30D158', '#FF453A', '#FF9F0A', '#AEAEB2'];
export const SYS: string[] = [...SYS_L];
export const INK: string[] = [...INK_L];
export function Exp({ on, children }: { on: boolean; children: () => any }) {
  /* 19.11.2026: одна анимация высоты (grid 0fr→1fr) и прозрачности, без translateY и без сброса стилей в конце — иначе карточки «выпадают», а высота в конце анимации скачет */ const [
    st,
    setSt,
  ] = useState(on ? 2 : 0);
  const [o, setO] = useState(on);
  const fr = useRef(true);
  const kr = useRef<any>(null);
  if (on) kr.current = children();
  useEffect(() => {
    if (fr.current) {
      fr.current = false;
      return;
    }
    if (RMO()) {
      setO(on);
      setSt(on ? 2 : 0);
      return;
    }
    setSt(1);
    if (on) {
      setO(false);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setO(true)));
      const tm = setTimeout(() => setSt(2), 320);
      return () => {
        cancelAnimationFrame(r);
        clearTimeout(tm);
      };
    }
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setO(false)));
    const tm = setTimeout(() => setSt(0), 360);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(tm);
    };
  }, [on]);
  if (!on && st === 0) return null;
  const sd = on && st === 2;
  return (
    <div
      data-xa={sd ? undefined : '1'}
      style={{
        display: 'grid',
        gridTemplateRows: o || sd ? '1fr' : '0fr',
        transition: sd ? undefined : 'grid-template-rows .32s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <div
        style={{
          overflow: sd ? 'visible' : 'clip',
          minHeight: 0,
          opacity: o || sd ? 1 : 0,
          transition: sd ? undefined : 'opacity .32s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {kr.current}
      </div>
    </div>
  );
}
export const DKCSS =
  '[role=tablist]{background:#2C2C30!important;border-color:rgba(255,255,255,.2)!important}[role=tab]{color:#E5E5EA!important}[role=tab][aria-selected=true]{background:#55555C!important;color:#FFFFFF!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3),0 1px 3px rgba(0,0,0,.5)!important}[data-df=all][aria-selected=true]{background:rgba(64,156,255,.24)!important;box-shadow:inset 0 0 0 1.5px #409CFF!important}[data-df=acc][aria-selected=true]{background:rgba(48,209,88,.2)!important;box-shadow:inset 0 0 0 1.5px #30D158!important}[data-df=rej][aria-selected=true]{background:rgba(255,69,58,.2)!important;box-shadow:inset 0 0 0 1.5px #FF453A!important}input{color:#F5F5F7!important}input::placeholder{color:#AEAEB2!important}button[style*="background: rgb(28, 28, 30)"][style*="border: 1px solid"],button[style*="background: rgb(28, 28, 30)"][style*="border-radius: 9px"],input[style*="background: rgb(28, 28, 30)"],[data-gdbar] div[style*="background: rgb(28, 28, 30)"][style*="border-radius"]{background:#36363B!important}button[style*="border: 1px solid"]:not([style*="border-top"]),input,[data-gdbar] div[style*="border: 1px solid"]{border-color:rgba(255,255,255,.28)!important}';
