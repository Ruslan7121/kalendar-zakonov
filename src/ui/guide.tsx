// Обучение по сайту (23.11.2026): кнопка «?» в шапке и панель с пятью разделами.
// Панель стоит внизу и ничего не перекрывает: страница получает снизу запас, а подсвеченное место
// прокручивается в видимую область над панелью. Подсветка — отдельная рамка поверх элемента,
// поэтому её не обрезают чужие границы. Код не зависит от данных сайта.
import { useState, useEffect, useRef } from 'grok/canvas';
import { useEscape } from './layers';

/** sel: CSS-селектор, `tab:Название` (вкладка разделов) или `btn:Текст` (кнопка с таким текстом). */
type Step = { h: string; tx: string; sel?: string; tab?: string };
type Part = { n: string; d: string; tab: string; steps: Step[] };

export const GUIDE: Part[] = [
  {
    n: 'Зачем это приложение',
    d: 'Для чего сайт и что на каждой странице',
    tab: 'l',
    steps: [
      {
        h: 'Для чего это приложение',
        tx: 'Новые законы, голосования по законопроектам, приказы министерств и новости органов власти выходят постоянно. Многие из них касаются каждого: вашей работы, вашего дома, ваших близких. Приложение собирает всё это из официальных источников в одном месте, чтобы вы были в курсе.',
      },
      {
        h: 'Вступают в силу',
        tab: 'l',
        sel: 'tab:Вступают в силу',
        tx: 'На этой странице законы выстроены по датам вступления в силу. Принятый закон начинает действовать не сразу, а с определённой даты: одни уже действуют, другие вот-вот начнут.',
      },
      {
        h: 'Пленарные заседания',
        tab: 'i',
        sel: 'tab:Пленарные заседания',
        tx: 'На этой странице видно, что обсуждала Госдума. Для каждого дня: какие законопроекты рассматривали, чем закончилось голосование и как проголосовала каждая фракция.',
      },
      {
        h: 'Работа госорганов',
        tab: 'c',
        sel: 'tab:Работа госорганов',
        tx: 'На этой странице собраны документы органов власти: указы Президента, постановления Правительства, приказы министерств, указания Банка России. Выберите орган, чтобы увидеть, что он выпустил.',
      },
      {
        h: 'Новости',
        tab: 'd',
        sel: 'tab:Новости',
        tx: 'На этой странице собраны новости органов власти: Госдумы, Правительства, министерств, Банка России. Выберите нужные органы, чтобы видеть только их новости.',
      },
    ],
  },
  {
    n: 'Пленарные заседания',
    d: 'Заседания Госдумы, голосования, законопроекты',
    tab: 'i',
    steps: [
      {
        h: 'Выбор дня',
        tab: 'i',
        sel: '[data-periodhead]',
        tx: 'Период: день, неделя, месяц или год. Стрелки «‹ ›» листают дни, в которые были заседания.',
      },
      { h: 'Поиск', tab: 'i', sel: '[data-iq]', tx: 'Находит законопроект по номеру, названию или слову.' },
      {
        h: 'Фильтры',
        tab: 'i',
        sel: 'btn:Фильтры',
        tx: 'Оставляют законопроекты по меткам: «Для кого», «Тема», «Что меняется».',
      },
      {
        h: 'Итоги периода',
        tab: 'i',
        sel: '[data-itot]',
        tx: 'Сколько законопроектов рассмотрено, принято и отклонено за выбранный период.',
      },
      { h: 'Фракции', tab: 'i', sel: '[data-ifr]', tx: 'Сколько голосований поддержала каждая фракция.' },
      {
        h: 'Законопроект',
        tab: 'i',
        sel: '[data-itile]',
        tx: 'Номер, название, метки, итог голосования и его время. Нажмите карточку: откроются «Суть», «Кого коснётся», голоса фракций и «Путь закона». «Поделиться» отправляет ссылку на это голосование.',
      },
    ],
  },
  {
    n: 'Работа госорганов',
    d: 'Документы Правительства, министерств, ЦБ',
    tab: 'c',
    steps: [
      {
        h: 'Карта органов',
        tab: 'c',
        sel: '[data-orgmap]',
        tx: 'Плитка — один орган, число — сколько у него документов за период: день, неделя или месяц.',
      },
      {
        h: 'Лента органа',
        tab: 'c',
        sel: '[data-orgmap]',
        tx: 'Нажмите плитку: откроется лента документов этого органа, новые сверху.',
      },
      {
        h: 'Документ',
        tab: 'c',
        tx: 'Показан коротким названием. В его окне: суть, кого коснётся и ссылка на официальный текст.',
      },
      {
        h: 'Режим «По дням»',
        tab: 'c',
        tx: 'Показывает документы и заседания по датам, в том числе заседания и голосования Госдумы.',
      },
    ],
  },
  {
    n: 'Вступают в силу',
    d: 'Когда закон начнёт действовать',
    tab: 'l',
    steps: [
      {
        h: 'Лента по месяцам',
        tab: 'l',
        sel: '[data-lmonth]',
        tx: 'Законы по датам вступления в силу. Метка «действует» — закон уже в силе, «через N дней» — скоро начнёт.',
      },
      { h: 'Поиск', tab: 'l', sel: '[data-lq]', tx: 'Находит закон по названию, номеру или слову.' },
      {
        h: 'Фильтры',
        tab: 'l',
        sel: 'btn:Фильтры',
        tx: 'Оставляют законы, подходящие вам: «Для кого», «Тема», «Что меняется».',
      },
      { h: 'Карточка закона', tab: 'l', tx: 'Нажмите закон: суть, кого коснётся и ссылки на официальный текст.' },
    ],
  },
  {
    n: 'Новости',
    d: 'Официальные новости органов власти',
    tab: 'd',
    steps: [
      {
        h: 'Лента новостей',
        tab: 'd',
        sel: '[data-nq]',
        tx: 'Собирается с официальных сайтов в течение дня. Поиск находит новость по слову.',
      },
      {
        h: 'Органы',
        tab: 'd',
        sel: '[data-nchips]',
        tx: 'Выберите органы, чьи новости нужны. «Убрать все» сбрасывает выбор.',
      },
      {
        h: 'Новость',
        tab: 'd',
        sel: '[data-newsitem]',
        tx: 'Заголовок, время и ссылка на источник. Документ органа и новость о нём не дублируются: документ в календаре, новость здесь.',
      },
    ],
  },
];

const find = (sel: string): HTMLElement | null => {
  const vis = (e: Element | null) =>
    e && (e as HTMLElement).getBoundingClientRect().width > 0 ? (e as HTMLElement) : null;
  if (sel.startsWith('tab:')) {
    const n = sel.slice(4);
    return vis(
      [...document.querySelectorAll('[role="tab"], header button, [data-gdbar] button')].find((e) =>
        (e.textContent || '').replace(/\s+/g, '').startsWith(n.replace(/\s+/g, '')),
      ) || null,
    );
  }
  if (sel.startsWith('btn:')) {
    const n = sel.slice(4);
    return vis(
      [...document.querySelectorAll('button')].find(
        (e) => (e.textContent || '').trim().includes(n) && !e.closest('[data-guide]'),
      ) || null,
    );
  }
  return vis(document.querySelector(sel));
};

/** Панель обучения. go — переход на страницу сайта, t — цвета темы, m — телефон. */
export function Guide({ t, m, go, onClose }: { t: any; m: boolean; go: (k: string) => void; onClose: () => void }) {
  const [g, setG] = useState(-1);
  const [st, setSt] = useState(0);
  const [lift, setLift] = useState(0);
  const dock = useRef<HTMLDivElement | null>(null);
  const spot = useRef<HTMLDivElement | null>(null);
  const tgt = useRef<HTMLElement | null>(null);
  const dir = useRef(1);
  useEscape(true, onClose);
  const part = g >= 0 ? GUIDE[g] : null;
  const step = part ? part.steps[st] : null;

  // запас снизу под панель, чтобы она не закрывала конец страницы
  useEffect(() => {
    const b = document.body;
    const old = b.style.paddingBottom;
    const upd = () => {
      const d = dock.current;
      const nv = m ? (document.querySelector('[data-mnavbar]') as HTMLElement | null) : null;
      const nh = nv ? Math.max(0, window.innerHeight - nv.getBoundingClientRect().top) : 0;
      setLift(nh);
      if (d) b.style.paddingBottom = `${Math.round(d.offsetHeight + nh + 16)}px`;
    };
    upd();
    const ro = new ResizeObserver(upd);
    if (dock.current) ro.observe(dock.current);
    window.addEventListener('resize', upd);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', upd);
      b.style.paddingBottom = old;
    };
  }, [m]);

  // переход на страницу и поиск места для подсветки (страница может подгружаться)
  useEffect(() => {
    tgt.current = null;
    if (!step) return;
    if (step.tab) go(step.tab);
    if (!step.sel) return;
    let n = 0;
    const id = setInterval(() => {
      const el = find(step.sel!);
      if (el || ++n > 20) {
        clearInterval(id);
        if (!el) {
          /* на этой ширине экрана такого элемента нет — шаг пропускается */
          if (dir.current > 0) mv(1);
          else if (st > 0) mv(-1);
          return;
        }
        tgt.current = el;
        const d = dock.current;
        const top = headerBottom() + 10;
        const bot = (d ? d.getBoundingClientRect().top : window.innerHeight) - 10;
        const r = el.getBoundingClientRect();
        const fixed = pinned(el);
        if (!fixed && (r.top < top || r.bottom > bot))
          window.scrollTo({ top: window.scrollY + r.top - top, behavior: 'smooth' });
      }
    }, 100);
    return () => clearInterval(id);
  }, [g, st]);

  // рамка-подсветка поверх элемента: следует за ним при прокрутке, обрезается по видимой области
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = spot.current;
      const el = tgt.current;
      if (s) {
        if (!el || !el.isConnected) s.style.display = 'none';
        else {
          const r = el.getBoundingClientRect();
          const d = dock.current;
          const top = pinned(el) ? r.top : Math.max(r.top, headerBottom() + 2);
          const bot = el.closest('[data-mnavbar]')
            ? r.bottom
            : Math.min(r.bottom, (d ? d.getBoundingClientRect().top : window.innerHeight) - 4);
          if (bot - top < 8 || r.width < 4) s.style.display = 'none';
          else {
            const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8;
            s.style.display = 'block';
            s.style.left = `${r.left - 4}px`;
            s.style.top = `${top - 4}px`;
            s.style.width = `${r.width + 8}px`;
            s.style.height = `${bot - top + 8}px`;
            s.style.borderRadius = `${Math.min(rad + 4, 18)}px`;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const mv = (d: number) => {
    if (!part) return;
    dir.current = d;
    if (st + d >= part.steps.length) {
      setG(-1);
      return;
    }
    setSt(Math.max(0, st + d));
  };
  const btn = (primary: boolean, off?: boolean): any => ({
    flex: primary ? 1.3 : 1,
    border: primary ? 'none' : `1px solid ${t.border.default}`,
    borderRadius: 12,
    height: 42,
    padding: '0 10px',
    fontSize: 14,
    fontWeight: primary ? 600 : 500,
    fontFamily: 'inherit',
    cursor: off ? 'default' : 'pointer',
    opacity: off ? 0.45 : 1,
    background: primary ? t.text.accent : t.bg.subtle,
    color: primary ? '#fff' : t.text.primary,
    WebkitTapHighlightColor: 'transparent',
  });
  return (
    <>
      <div
        ref={spot}
        aria-hidden
        style={{
          position: 'fixed',
          zIndex: 2147482999,
          display: 'none',
          pointerEvents: 'none',
          boxSizing: 'border-box',
          border: `3px solid ${t.text.accent}`,
          boxShadow: '0 0 0 9999px rgba(0,0,0,.42)',
          transition: 'left .15s, top .15s, width .15s, height .15s',
        }}
      />
      <div
        ref={dock}
        data-guide="1"
        role="dialog"
        aria-label="Как пользоваться сайтом"
        style={{
          position: 'fixed',
          zIndex: 2147483000,
          left: m ? 0 : '50%',
          right: m ? 0 : undefined,
          width: m ? undefined : 'min(640px, calc(100% - 32px))',
          transform: m ? undefined : 'translateX(-50%)',
          bottom: m ? lift : 16,
          boxSizing: 'border-box',
          background: t.bg.base,
          color: t.text.primary,
          border: `1px solid ${t.border.default}`,
          borderRadius: m ? '18px 18px 0 0' : 18,
          boxShadow: '0 -6px 30px rgba(0,0,0,.25)',
          padding: '12px 14px 14px',
        }}
      >
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}
        >
          <span
            style={{
              fontSize: 12,
              color: t.text.tertiary,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {part ? `${part.n} · шаг ${st + 1} из ${part.steps.length}` : 'Как пользоваться сайтом'}
          </span>
          <button
            aria-label="Закрыть"
            onClick={onClose}
            style={{
              flex: 'none',
              width: 28,
              height: 28,
              borderRadius: 9999,
              border: 'none',
              background: t.bg.subtle,
              color: t.text.primary,
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
        {!part && (
          <div style={{ display: 'grid', gap: 6 }}>
            {GUIDE.map((x, i) => (
              <button
                key={i}
                onClick={() => {
                  dir.current = 1;
                  setG(i);
                  setSt(0);
                }}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: t.bg.subtle,
                  color: t.text.primary,
                  borderRadius: 12,
                  padding: '8px 10px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    flex: 'none',
                    width: 26,
                    height: 26,
                    borderRadius: 9999,
                    background: t.text.accent,
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{x.n}</span>
                  <span style={{ display: 'block', fontSize: 12, color: t.text.tertiary }}>{x.d}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {part && step && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{step.h}</div>
            <div style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 12 }}>{step.tx}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setG(-1)} style={btn(false)}>
                ☰ Разделы
              </button>
              <button onClick={() => st > 0 && mv(-1)} disabled={st === 0} style={btn(false, st === 0)}>
                ‹ Назад
              </button>
              <button onClick={() => mv(1)} style={btn(true)}>
                {st === part.steps.length - 1 ? 'Готово' : 'Дальше ›'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const pinned = (el: Element) =>
  !!el.closest('[data-mnavbar],[data-gdbar]') || getComputedStyle(el).position === 'fixed';

/** Нижняя граница закреплённой шапки (если она закреплена), иначе 0. */
function headerBottom(): number {
  const h = document.querySelector('[data-gdbar]') as HTMLElement | null;
  if (!h) return 0;
  const r = h.getBoundingClientRect();
  return r.top <= 1 && r.height > 0 ? r.bottom : 0;
}

/** Круглая кнопка «?» — того же вида, что кнопка смены темы. */
export function GuideBtn({ t, m, onClick }: { t: any; m: boolean; onClick: () => void }) {
  return (
    <button
      aria-label="Как пользоваться сайтом"
      title="Как пользоваться сайтом"
      data-guidebtn="1"
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: m ? 32 : 44,
        height: m ? 32 : 44,
        padding: 0,
        borderRadius: 9999,
        border: `1px solid ${t.border.default}`,
        background: t.bg.subtle,
        color: t.text.primary,
        fontSize: 16,
        fontWeight: 600,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      ?
    </button>
  );
}
