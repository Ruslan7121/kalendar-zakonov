import React from 'react';
import { createRoot } from 'react-dom/client';
import { boot } from './gdx';
// 12.11.2026 (пункт 10): данные — в data/*.json (pipeline/merge/split_data.mjs). Код сайта (web/gen/app.tsx = src/canvas.tsx
// без встроенных данных) выполняется только после загрузки общего файла и месяца первой отрисовки.
const root = document.getElementById('root')!;
/* 15.11.2026: внутри Telegram — дождаться скрипта Telegram (index.html, не дольше 2,5 с), чтобы сайт открылся с темой и кнопками Telegram */
const tgP: Promise<unknown> = (window as any).__tgP || Promise.resolve();
Promise.all([boot(), tgP])
  .then(() => import('./gen/app.tsx'))
  .then(({ default: App }) => {
    createRoot(root).render(<App />);
  })
  .catch((e) => {
    console.error(e);
    root.innerHTML =
      '<div role="alert" data-gd-load="fatal" style="max-width:640px;margin:40px auto;padding:16px 18px;border:1px solid #F0ABAB;border-radius:12px;background:#FDECEC;color:#1D1D1F;font:15px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif"><b>Календарь законов: не удалось загрузить данные.</b><div style="margin-top:6px;color:#4E4E55"></div><button type="button" style="margin-top:10px;min-height:40px;padding:0 16px;border-radius:10px;border:1px solid #D9D9DE;background:#fff;color:#0A66D6;font-weight:600">Обновить страницу</button></div>';
    // элементы могут отсутствовать, если страницу в этот момент перезагружают или закрывают
    const msg = root.querySelector('div div');
    if (msg) msg.textContent = String((e && e.message) || e);
    const btn = root.querySelector('button');
    if (btn) btn.onclick = () => location.reload();
  });
