// Обучение по сайту (23.11.2026): кнопка «?» в шапке и окно с пятью разделами.
// Первый раздел — обзор, остальные четыре — по одному на страницу. Код не зависит от данных сайта.
import { useState, useEffect } from 'grok/canvas';
import { useEscape } from './layers';

type Step = { tx: string; sel?: string; tab?: string };
type Part = { n: string; tab: string; steps: Step[] };

export const GUIDE: Part[] = [
  {
    n: 'Зачем это приложение и что на каждой странице',
    tab: 'i',
    steps: [
      {
        tx: 'Госдума, Совет Федерации, Правительство, министерства и Банк России публикуют решения в виде таблиц и PDF-файлов. Приложение собирает их в одном месте, раскладывает по дням и объясняет простым языком. Только официальные источники: если данных нет, поле остаётся пустым.',
      },
      {
        tab: 'i',
        tx: 'Пленарные заседания: что рассматривала Госдума, как голосовала и что из этого коснётся лично вас.',
      },
      {
        tab: 'c',
        tx: 'Работа госорганов: документы Правительства, министерств и Банка России, с кратким объяснением сути каждого.',
      },
      { tab: 'l', tx: 'Вступают в силу: когда принятый закон начнёт действовать и кого он коснётся.' },
      {
        tab: 'd',
        tx: 'Новости: оперативные официальные новости органов власти с заголовком, временем и ссылкой на источник.',
      },
    ],
  },
  {
    n: 'Пленарные заседания: подробно',
    tab: 'i',
    steps: [
      {
        tab: 'i',
        sel: '[data-periodhead]',
        tx: 'Здесь выбирается период: день, неделя, месяц или год. Стрелки «‹ ›» листают дни, в которые были заседания.',
      },
      {
        tab: 'i',
        sel: '[data-iq]',
        tx: 'Поиск находит законопроект по номеру, названию или слову. Строка очищается при смене страницы.',
      },
      {
        tab: 'i',
        tx: 'В каждой карточке законопроекта: номер, название, метки «Для кого», «Тема», «Что меняется», итог голосования и его время.',
      },
      {
        tab: 'i',
        tx: 'Нажмите карточку: откроются «Суть», «Кого коснётся», голоса фракций и «Путь закона» — пройденные шаги отмечены сплошной линией, следующий шаг пунктиром.',
      },
      { tab: 'i', tx: 'Кнопка «Поделиться карточкой» отправляет ссылку именно на это голосование.' },
    ],
  },
  {
    n: 'Работа госорганов: подробно',
    tab: 'c',
    steps: [
      {
        tab: 'c',
        sel: '[data-orgmap]',
        tx: 'Карта органов: каждая плитка — один орган, число — сколько документов за выбранный период (день, неделя, месяц).',
      },
      { tab: 'c', tx: 'Нажмите плитку: откроется лента документов этого органа.' },
      {
        tab: 'c',
        tx: 'Документ показан коротким названием. В его окне: суть, кого коснётся и ссылка на официальный текст.',
      },
      {
        tab: 'c',
        tx: 'Режим «По дням» показывает документы и заседания, сгруппированные по датам, включая заседания Госдумы.',
      },
    ],
  },
  {
    n: 'Вступают в силу: подробно',
    tab: 'l',
    steps: [
      {
        tab: 'l',
        sel: '[data-lmonth]',
        tx: 'Лента законов по месяцам: у каждого закона дата, с которой он начинает действовать.',
      },
      { tab: 'l', sel: '[data-lq]', tx: 'Поиск по названию, номеру или слову помогает быстро найти нужный закон.' },
      {
        tab: 'l',
        tx: 'В карточке закона: суть, кого коснётся и ссылки на официальный текст. Уже действующие законы отмечены.',
      },
      { tab: 'l', tx: 'Фильтры «Для кого», «Тема», «Что меняется» оставляют только подходящие вам законы.' },
    ],
  },
  {
    n: 'Новости: подробно',
    tab: 'd',
    steps: [
      {
        tab: 'd',
        sel: '[data-nq]',
        tx: 'Новости собираются с официальных сайтов органов власти в течение дня. Поиск находит нужную по слову.',
      },
      {
        tab: 'd',
        tx: 'У каждой новости: заголовок, время и ссылка на источник. Документ органа в календаре и новость о нём не дублируются.',
      },
      { tab: 'd', sel: '[data-nchips]', tx: 'Фильтры оставляют новости нужных органов.' },
    ],
  },
];

const CLR = () => {
  document.querySelectorAll('[data-gdhl]').forEach((e) => {
    const h = e as HTMLElement;
    h.style.outline = '';
    h.style.outlineOffset = '';
    h.removeAttribute('data-gdhl');
  });
};

/** Окно обучения. go — переход на страницу сайта, t — цвета темы, m — телефон. */
export function Guide({ t, m, go, onClose }: { t: any; m: boolean; go: (k: string) => void; onClose: () => void }) {
  const [g, setG] = useState(-1);
  const [st, setSt] = useState(0);
  useEscape(true, onClose);
  const step = g >= 0 ? GUIDE[g].steps[st] : null;
  useEffect(() => {
    CLR();
    if (!step) return;
    if (step.tab) go(step.tab);
    if (!step.sel) return;
    const id = setTimeout(() => {
      const el = document.querySelector(step.sel!) as HTMLElement | null;
      if (!el) return;
      el.setAttribute('data-gdhl', '1');
      el.style.outline = `2px solid ${t.text.accent}`;
      el.style.outlineOffset = '2px';
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);
    return () => clearTimeout(id);
  }, [g, st]);
  useEffect(() => CLR, []);
  const btn = (primary: boolean): any => ({
    flex: 1,
    border: primary ? 'none' : `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: '11px 10px',
    fontSize: 14,
    fontFamily: 'inherit',
    cursor: 'pointer',
    background: primary ? t.text.accent : t.bg.subtle,
    color: primary ? '#fff' : t.text.primary,
    WebkitTapHighlightColor: 'transparent',
  });
  const part = g >= 0 ? GUIDE[g] : null;
  const mv = (d: number) => {
    if (!part) return;
    if (st + d >= part.steps.length) {
      setG(-1);
      return;
    }
    setSt(Math.max(0, st + d));
  };
  return (
    <div
      data-guide="1"
      role="dialog"
      aria-label="Как пользоваться сайтом"
      style={{
        position: 'fixed',
        zIndex: 2147483000,
        left: m ? 0 : undefined,
        right: m ? 0 : 20,
        bottom: m ? 0 : 20,
        width: m ? undefined : 380,
        boxSizing: 'border-box',
        background: t.bg.base,
        color: t.text.primary,
        border: `1px solid ${t.border.default}`,
        borderRadius: m ? '18px 18px 0 0' : 18,
        boxShadow: '0 10px 40px rgba(0,0,0,.35)',
        padding: `14px 14px ${m ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : '16px'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <b style={{ fontSize: 16 }}>{part ? part.n : 'Как пользоваться сайтом'}</b>
        <button
          aria-label="Закрыть"
          onClick={onClose}
          style={{
            flex: 'none',
            width: 30,
            height: 30,
            borderRadius: 9999,
            border: 'none',
            background: t.bg.subtle,
            color: t.text.primary,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      {!part && (
        <div>
          {GUIDE.map((x, i) => (
            <button
              key={i}
              onClick={() => {
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
                padding: '11px 12px',
                marginBottom: 8,
                fontSize: 14,
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
                }}
              >
                {i + 1}
              </span>
              {x.n}
            </button>
          ))}
        </div>
      )}
      {part && step && (
        <div>
          <div style={{ minHeight: 84, fontSize: 14, lineHeight: 1.45 }}>{step.tx}</div>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', margin: '8px 0' }}>
            {part.steps.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 9999,
                  background: i === st ? t.text.accent : t.border.default,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setG(-1)} style={btn(false)}>
              ☰ Меню
            </button>
            <button onClick={() => mv(-1)} disabled={st === 0} style={{ ...btn(false), opacity: st === 0 ? 0.5 : 1 }}>
              ‹ Назад
            </button>
            <button onClick={() => mv(1)} style={btn(true)}>
              {st === part.steps.length - 1 ? 'Готово' : 'Дальше ›'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
