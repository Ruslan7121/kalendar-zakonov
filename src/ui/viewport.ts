// Видимая область экрана и экранная клавиатура (iPhone, Telegram): единое место, где это определяется.
// Зачем: на iPhone окно Telegram и «видимая область» (visualViewport) меняются не одновременно, поэтому закрепленные элементы
// (нижняя панель вкладок, «Наверх», звёздочка) не сдвигаются вслед за клавиатурой, а скрываются и возвращаются, когда экран в норме.
// Результат — атрибут data-kb на <html> (есть, пока набирается текст или область «съехала») и переменные CSS:
//   --gd-vh  — высота видимой области, px;  --gd-kb — 1 или 0.
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
    const timers: any[] = [];
    const clearTimers = () => timers.splice(0).forEach(clearTimeout);
    const update = () => {
      const h = vv ? vv.height : window.innerHeight;
      const abnormal =
        !!vv && vv.scale < 1.02 && (window.innerHeight - vv.height - vv.offsetTop > KB_GAP || vv.offsetTop > 2);
      const kb = focused || abnormal;
      de.style.setProperty('--gd-vh', Math.round(h) + 'px');
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
            update();
            if (ms === 450) {
              try {
                window.scrollTo(window.scrollX, window.scrollY);
              } catch (e) {
                /* прокрутка недоступна */
              }
            }
          }, ms),
        ),
      );
    };
    const onFocusIn = (e: any) => {
      if (!isTextInput(e.target)) return;
      focused = true;
      clearTimers();
      update();
    };
    const onFocusOut = () => {
      setTimeout(() => {
        if (isTextInput(document.activeElement)) return;
        focused = false;
        update();
        recheck();
      }, 60);
    };
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    // события Telegram: окно мини-приложения изменило высоту или безопасные зоны
    const tgEvents = ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged'];
    const tgHandler = () => {
      update();
      if (!focused) recheck();
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
      window.removeEventListener('scroll', update);
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
    };
  }, [on]);
}
