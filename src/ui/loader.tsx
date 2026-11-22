// Загрузчик данных по месяцам (GDX): подписка компонентов и ожидание загрузки.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.
import { TG } from './telegram';

/* 15.11.2026: в Telegram тема по умолчанию — из Telegram; кнопкой можно переключить (выбор держится до закрытия приложения) */
export const THO0 = TG
  ? (() => {
      try {
        const v = sessionStorage.getItem('gd_theme');
        return v === 'dark' || v === 'light' ? v : null;
      } catch (e) {
        return null;
      }
    })() || (TG.colorScheme === 'dark' ? 'dark' : 'light')
  : (() => {
      try {
        localStorage.removeItem('gd_theme');
      } catch (e) {
        /* нет хранилища */
      }
      try {
        const v = sessionStorage.getItem('gd_theme');
        return v === 'dark' || v === 'light' ? v : null;
      } catch (e) {
        return null;
      }
    })();
export const F = ['ЕР', 'КПРФ', 'ЛДПР', 'НЛ', 'СРЗП', 'Вне'];
export const DEF: Record<string, number> = { ЕР: 350, КПРФ: 37, ЛДПР: 24, НЛ: 20, СРЗП: 17, Вне: 2 };
export const FNAME: Record<string, string> = {
  ЕР: 'Единая Россия',
  КПРФ: 'КПРФ',
  ЛДПР: 'ЛДПР',
  НЛ: 'Новые люди',
  СРЗП: 'СРЗП',
  Вне: 'Вне фракций',
};
export const gdMk = (d: string) => (d || '').slice(3);
