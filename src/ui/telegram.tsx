// Интеграция с Telegram (мини-приложение, «Поделиться») и настройки адреса службы уведомлений.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.

/* 14.11.2026: ручной выбор темы (кнопка с луной) действует только до закрытия вкладки и сбрасывается, когда меняется тема телефона;
   раньше он сохранялся навсегда, и сайт переставал следовать теме телефона. Старый постоянный выбор удаляем. */
/* 15.11.2026: мини-приложение Telegram (@kalendar_zakonov_bot, t.me/kalendar_zakonov_bot/app). Скрипт Telegram подключается
   в web/index.html только внутри Telegram; в обычном браузере TG = null и сайт работает как прежде. Внутри Telegram:
   тема — из Telegram (своя кнопка темы скрыта), родная кнопка «Назад» закрывает окна, внешние ссылки и .ics открываются
   во внешнем браузере, «Поделиться» — выбор чата Telegram со ссылкой t.me/…/app?startapp=… на ту же карточку. */
export const TG: any = (() => {
  try {
    const w: any = typeof window !== 'undefined' ? (window as any).Telegram : null;
    const a = w && w.WebApp;
    return a && a.platform && a.platform !== 'unknown' ? a : null;
  } catch (e) {
    return null;
  }
})();
export const TG_APP = 'https://t.me/kalendar_zakonov_bot/app';
/* 15.11.2026: статистика пользователей для команды /stats бота (bot/worker.mjs, Cloudflare). При открытии в Telegram приложение
   один раз отправляет подписанные Telegram данные запуска (initData); сервер проверяет подпись и хранит только хэш id.
   Пустой адрес — ничего не отправляется (сервер еще не развернут: Actions → bot). */
export const STATS_URL = '';
export const NOTIF_UI = false;
/* 18.11.2026 (решение владельца): сообщение при «Поделиться» из Telegram — две строки «Открыть в браузере: …» и «Открыть в Telegram: …».
   Ссылка на сайт стоит первой: Telegram строит карточку-превью (название, этап и дата, «Что предлагалось изменить») по первой ссылке сообщения, а ее данные берутся из og-тегов страницы v/<id>/. */
export const tgShare = (web: string, tg: string) => {
  try {
    TG.openTelegramLink(
      `https://t.me/share/url?url=&text=${encodeURIComponent(`Открыть в браузере: ${web}\nОткрыть в Telegram: ${tg}`)}`,
    );
  } catch (e) {
    try {
      TG.openLink(web);
    } catch (e2) {}
  }
};
export const tgLinkVote = (day: string, id: string) => `${TG_APP}?startapp=d${day.replace(/\./g, '')}_v${id}`;
export const ON_SITE =
  typeof window !== 'undefined' && /(^|\.)github\.io$|^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
export const SITE = 'https://ruslan7121.github.io/kalendar-zakonov';
