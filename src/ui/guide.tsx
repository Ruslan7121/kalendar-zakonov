// Интерактивная справка с подсветкой элементов (spotlight-тур).
// Кнопка «?» запускает пошаговый тур: экран затемняется, нужный элемент подсвечивается,
// рядом появляется пояснение. Старая многосекционная панель заменена.
import { useState, useEffect, useRef } from 'grok/canvas';
import { useEscape } from './layers';

type Step = {
  title: string;
  text: string;
  /** CSS-селектор или специальный: tab:Текст, btn:Текст */
  sel: string;
  position?: 'top' | 'bottom';
};

const STEPS: Step[] = [
  {
    title: 'Кнопка справки',
    text: 'Нажмите «?», чтобы в любой момент запустить этот тур и вспомнить, что делает каждый элемент.',
    sel: '[data-guidebtn]',
    position: 'bottom',
  },
  {
    title: 'Разделы календаря',
    text: 'Переключайтесь между «Вступают в силу», «Пленарные заседания», «Работа госорганов» и «Новости». Каждый раздел показывает свой тип событий.',
    sel: '[role="tablist"], header',
    position: 'bottom',
  },
  {
    title: 'Переключение месяцев',
    text: 'Стрелки ‹ › переключают месяц. Здесь отображаются события, которые вступают в силу или обсуждаются в выбранном месяце.',
    sel: '[data-lmonth], [data-imlabel]',
    position: 'bottom',
  },
  {
    title: 'Фильтры',
    text: 'Отфильтруйте события по типу, органу власти или интересующим вас темам.',
    sel: 'btn:Фильтры',
    position: 'bottom',
  },
  {
    title: 'Мои интересы',
    text: 'Отметьте темы, которые вам важны — календарь будет подсвечивать только релевантные события.',
    sel: 'btn:Мои интересы',
    position: 'bottom',
  },
  {
    title: 'Список событий',
    text: 'Каждая карточка — закон, голосование или документ. Нажмите на карточку, чтобы увидеть подробности и ссылку на официальный источник.',
    sel: '[data-ltl], [data-itile], main',
    position: 'top',
  },
  {
    title: 'Источники',
    text: 'Все данные берутся только с официальных сайтов: Госдума, Правительство, министерства, ЦБ и т.д.',
    sel: 'a:vote.duma.gov.ru',
    position: 'top',
  },
  {
    title: 'Тёмная тема',
    text: 'Переключите оформление. Тема запоминается и применяется автоматически.',
    sel: 'btn:Темная тема',
    position: 'bottom',
  },
];

function findEl(sel: string): HTMLElement | null {
  if (sel.startsWith('tab:')) {
    const n = sel.slice(4).replace(/\s+/g, '');
    return (
      ([...document.querySelectorAll('[role="tab"], header button')].find((e) =>
        (e.textContent || '').replace(/\s+/g, '').startsWith(n),
      ) as HTMLElement) || null
    );
  }
  if (sel.startsWith('btn:')) {
    const n = sel.slice(4);
    return (
      ([...document.querySelectorAll('button')].find(
        (e) => (e.textContent || '').includes(n) || (e.getAttribute('title') || '').includes(n),
      ) as HTMLElement) || null
    );
  }
  if (sel.startsWith('a:')) {
    const n = sel.slice(2);
    return ([...document.querySelectorAll('a')].find((e) => (e.textContent || '').includes(n)) as HTMLElement) || null;
  }
  for (const s of sel.split(',').map((x) => x.trim())) {
    const el = document.querySelector(s) as HTMLElement | null;
    if (el && el.getBoundingClientRect().width > 0) return el;
  }
  return null;
}

export function Guide({ t, m, go, onClose }: { t: any; m: boolean; go: (k: string) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tok = useRef(0);
  useEscape(true, onClose);

  useEffect(() => {
    const my = ++tok.current;
    const s = STEPS[step];
    if (!s) return;

    const update = () => {
      if (my !== tok.current) return;
      const el = findEl(s.sel);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        if (r.top < 80 || r.bottom > window.innerHeight - 40) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(update, 350);
        }
      } else {
        if (step < STEPS.length - 1) setStep(step + 1);
        else onClose();
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  const s = STEPS[step];
  if (!s || !rect) return null;

  const pad = 6;
  const spotStyle: React.CSSProperties = {
    position: 'fixed',
    left: rect.left - pad,
    top: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    borderRadius: 12,
    boxShadow: '0 0 0 9999px rgba(0,0,0,.55)',
    pointerEvents: 'none',
    zIndex: 10001,
    transition: 'all .3s ease',
  };

  const tipW = 280;
  let tipTop = s.position === 'top' ? rect.top - 180 : rect.bottom + 12;
  let tipLeft = rect.left + rect.width / 2 - tipW / 2;
  tipLeft = Math.max(12, Math.min(tipLeft, window.innerWidth - tipW - 12));
  tipTop = Math.max(12, Math.min(tipTop, window.innerHeight - 180));

  const tipStyle: React.CSSProperties = {
    position: 'fixed',
    left: tipLeft,
    top: tipTop,
    width: tipW,
    background: t?.bg || '#fff',
    color: t?.fg || '#1d1d1f',
    borderRadius: 14,
    padding: '16px 18px',
    boxShadow: '0 10px 40px rgba(0,0,0,.25)',
    zIndex: 10002,
    fontSize: 14,
    lineHeight: 1.45,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.55)',
          zIndex: 10000,
        }}
      />
      <div style={spotStyle} />
      <div style={tipStyle} data-guide="1">
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{s.title}</div>
        <div style={{ color: t?.sec || '#6e6e73' }}>{s.text}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: t?.sec || '#6e6e73' }}>
            {step + 1} / {STEPS.length}
          </span>
          <div>
            {step > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStep(step - 1);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: t?.sec || '#6e6e73',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Назад
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (step >= STEPS.length - 1) onClose();
                else setStep(step + 1);
              }}
              style={{
                background: t?.accent || '#0a64d6',
                color: '#fff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {step >= STEPS.length - 1 ? 'Готово' : 'Далее'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function GuideBtn({ t, m, onClick }: { t: any; m: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-guidebtn="1"
      aria-label="Как пользоваться сайтом"
      title="Как пользоваться сайтом"
      style={{
        width: 36,
        height: 36,
        border: 'none',
        background: t?.surface || '#f5f5f7',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: t?.fg || '#1d1d1f',
      }}
    >
      ?
    </button>
  );
}
