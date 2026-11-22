// Видимая область экрана и экранная клавиатура (iPhone, Telegram): единое место, где это определяется.
// Зачем: на iPhone окно Telegram становится ниже на высоту клавиатуры, и закрепленные внизу элементы (нижняя панель вкладок,
// «Наверх», звёздочка) поднимались бы над ней. Мы сдвигаем их вниз ровно на эту разницу: они остаются под клавиатурой.
// Результат — переменные CSS на <html> и атрибут data-kb (есть, пока клавиатура открыта или закрывается):
//   --gd-vh  — высота видимой области, px;  --gd-kb — 1 или 0;
//   --gd-kbo — на сколько px сдвинуть вниз закрепленное у нижнего края (высота клавиатуры): панель остается под клавиатурой
//              и не «выезжает» после нее, а стоит на месте, когда клавиатура уходит.
// Источники событий: visualViewport (resize, scroll), прокрутка окна, события Telegram (viewportChanged, safeAreaChanged), фокус полей.
import { useEffect } from 'react';
import { TG } from './telegram';

const isTextInput = (e: any) =>
  !!e &&
  (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA') &&
  !['checkbox', 'radio', 'button', 'range'].includes(e.type);

/** Допуск: на сколько видимая область может быть ниже окна, чтобы это еще считалось нормой (px). */
export const KB_GAP = 60;
/** Через сколько мс после закрытия клавиатуры повторно проверяем, что область вернулась в норму. */
export const KB_RECHECK_MS = [150, 450, 900, 1600];

export function useViewport(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const de = document.documentElement;
    const vv: any = window.visualViewport;
    const tg: any = TG;
    let focused = false;
    let closing = false; // клавиатура закрывается: окно еще не вернулось к полной высоте
    let base = window.innerHeight; // полная высота окна без клавиатуры
    let baseW = window.innerWidth;
    const timers: any[] = [];
    const clearTimers = () => timers.splice(0).forEach(clearTimeout);
    const update = () => {
      const h = window.innerHeight;
      if (window.innerWidth !== baseW) {
        baseW = window.innerWidth; // поворот экрана: старая высота не годится
        base = h;
      }
      const active = focused || closing;
      if (!active) base = h; // клавиатуры нет: следим за высотой (панели Safari, поворот)
      if (closing && !focused && h >= base - 2) closing = false;
      // Пока клавиатура открыта или закрывается, закрепленные внизу элементы остаются на своем месте под ней:
      // окно Telegram стало ниже на высоту клавиатуры, и панель сдвигается вниз ровно на эту разницу.
      const offset = active ? Math.max(0, base - h) : 0;
      de.style.setProperty('--gd-vh', Math.round(vv ? vv.height : h) + 'px');
      de.style.setProperty('--gd-kbo', Math.round(offset) + 'px');
      const kb = focused || closing;
      de.style.setProperty('--gd-kb', kb ? '1' : '0');
      if (kb) de.setAttribute('data-kb', '1');
      else de.removeAttribute('data-kb');
    };
    const recheck = () => {
      clearTimers();
      KB_RECHECK_MS.forEach((ms) =>
        timers.push(
          setTimeout(() => {
            if (focused) return;
            if (ms === KB_RECHECK_MS[KB_RECHECK_MS.length - 1]) closing = false; // дольше не ждем: считаем текущую высоту нормой
            update();
          }, ms),
        ),
      );
    };
    const onFocusIn = (e: any) => {
      if (!isTextInput(e.target)) return;
      if (!focused && !closing) base = window.innerHeight;
      focused = true;
      closing = false;
      clearTimers();
      update();
    };
    const onFocusOut = () => {
      setTimeout(() => {
        if (isTextInput(document.activeElement)) return;
        focused = false;
        closing = true;
        update();
        recheck();
      }, 60);
    };
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('resize', update);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    // события Telegram: окно мини-приложения изменило высоту или безопасные зоны
    const tgEvents = ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged'];
    const tgHandler = () => {
      update();
      if (!focused && closing) recheck();
    };
    try {
      tgEvents.forEach((n) => tg && tg.onEvent && tg.onEvent(n, tgHandler));
    } catch (e) {
      /* Telegram недоступен */
    }
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      clearTimers();
      try {
        tgEvents.forEach((n) => tg && tg.offEvent && tg.offEvent(n, tgHandler));
      } catch (e) {
        /* Telegram недоступен */
      }
      de.removeAttribute('data-kb');
      de.style.removeProperty('--gd-kb');
      de.style.removeProperty('--gd-kbo');
    };
  }, [on]);
}
