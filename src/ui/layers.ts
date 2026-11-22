// Стек слоев: окна, ленты и панели закрываются по Escape (и по кнопке «назад» Telegram, которая шлет Escape) по одному, сверху вниз.
// Раньше у каждого слоя был свой обработчик, и одно нажатие могло закрыть сразу несколько слоев или не тот.
// Использование: useEscape(слой_открыт, () => закрыть()). Закрывается только последний открытый слой.
import { useEffect, useRef } from 'react';

type Layer = { id: number; close: () => void };
const stack: Layer[] = [];
let seq = 0;
let bound = false;

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  if (top) top.close();
}

/** Число открытых слоев (для тестов и отладки). */
export function layerDepth(): number {
  return stack.length;
}

export function useEscape(active: boolean, close: () => void) {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!active) return;
    const layer: Layer = { id: ++seq, close: () => ref.current() };
    stack.push(layer);
    if (!bound) {
      document.addEventListener('keydown', onKey);
      bound = true;
    }
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length && bound) {
        document.removeEventListener('keydown', onKey);
        bound = false;
      }
    };
  }, [active]);
}
