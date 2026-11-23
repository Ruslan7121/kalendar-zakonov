// Обучение по сайту (23.11.2026): кнопка «?» в шапке и панель с пятью разделами.
// Панель стоит внизу и ничего не перекрывает: страница и окна получают снизу запас, а подсвеченное место
// прокручивается в видимую область над панелью. Подсветка — отдельная рамка поверх элемента,
// поэтому её не обрезают чужие границы. Шаги сами открывают и закрывают календарь, карточку и фильтры
// на настоящей странице (нажатиями на её кнопки), а при выходе возвращают всё как было.
// Код не зависит от данных сайта.
import { useState, useEffect, useRef } from 'grok/canvas';
import { useEscape } from './layers';

/**
 * sel — что подсвечивать: CSS-селектор; `tab:Название` (вкладка разделов); `btn:Текст` (кнопка);
 * `a:Текст` (ссылка); `par:селектор` (родитель элемента); `h:Заголовок` (блок с таким заголовком в окне);
 * `up:Текст:N` (элемент с таким текстом и его N-й родитель).
 * need — что должно быть открыто на странице: card (карточка), cal (календарь), flt (фильтры).
 * act — демонстрация по главной кнопке: day (выбрать ещё один день), search (ввести слово q).
 */
type Step = {
  h: string;
  tx: string;
  b?: string;
  sel?: string;
  tab?: string;
  need?: 'card' | 'cal' | 'flt';
  act?: 'day' | 'search';
  q?: string;
};
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
        h: 'Эта страница',
        tab: 'i',
        sel: 'par:[data-immode]',
        b: 'Начать',
        tx: 'Здесь видно, что обсуждала Госдума. Для каждого дня: какие законопроекты рассматривали, чем закончилось голосование и как проголосовала каждая фракция.',
      },
      {
        h: 'Периоды',
        tab: 'i',
        sel: 'par:[data-immode]',
        tx: 'Выбирайте период: день, неделя, месяц или год. Итоги ниже пересчитаются за весь выбранный период.',
      },
      {
        h: 'Листайте дни',
        tab: 'i',
        sel: 'par:[data-imlabel]',
        b: 'Открыть календарь',
        tx: 'Стрелки «‹ ›» переходят к ближайшему дню с заседанием. Нажмите на дату, чтобы открыть календарь.',
      },
      {
        h: 'Календарь',
        tab: 'i',
        sel: '[data-immonth]',
        need: 'cal',
        b: 'Выбрать ещё один день',
        act: 'day',
        tx: 'Точка под числом: в этот день есть голосования. Можно выбрать несколько дней, и итоги сложатся.',
      },
      {
        h: 'Итоги по фракциям',
        tab: 'i',
        sel: '[data-ifr]',
        tx: 'Сколько законопроектов за период и как проголосовала каждая фракция: «N из M» значит, что из M законопроектов фракция поддержала N. Полоса показывает долю «за».',
      },
      {
        h: 'Всего, принято, отклонено',
        tab: 'i',
        sel: '[data-itot]',
        tx: 'Нажмите на плитку, и в списке останутся только такие законопроекты: все рассмотренные, принятые или отклонённые.',
      },
      {
        h: 'Карточка в списке',
        tab: 'i',
        sel: '[data-itile]',
        b: 'Открыть карточку',
        tx: 'Чтение законопроекта, краткое название, число голосов «за» в кольце и фракции, которые поддержали. Нажмите карточку, чтобы открыть её.',
      },
      {
        h: 'Шапка карточки',
        tab: 'i',
        sel: 'up:принят:3',
        need: 'card',
        tx: 'Номер законопроекта, чтение, статус, полное название и метки: кого касается, о чём и что меняется.',
      },
      {
        h: 'Суть и «Кого коснётся»',
        tab: 'i',
        sel: 'h:Суть',
        need: 'card',
        tx: 'Коротко: о чём законопроект и на кого он повлияет.',
      },
      {
        h: 'Итоги голосования',
        tab: 'i',
        sel: 'h:Итоги голосования',
        need: 'card',
        tx: 'Время голосования и сколько голосов «за», «против», воздержавшихся и не голосовавших.',
      },
      {
        h: 'По фракциям',
        tab: 'i',
        sel: 'h:По фракциям',
        need: 'card',
        tx: 'Как проголосовала каждая фракция: сколько её депутатов поддержали законопроект.',
      },
      {
        h: 'Путь закона',
        tab: 'i',
        sel: 'h:Путь закона',
        need: 'card',
        tx: 'Какие этапы пройдены (сплошная линия) и какой следующий (пунктир).',
      },
      {
        h: 'Инициатор и ссылки',
        tab: 'i',
        sel: 'h:Инициатор',
        need: 'card',
        tx: 'Кто внёс законопроект, какой комитет отвечает за него и ссылки на официальные сайты и документы.',
      },
      {
        h: 'Поделиться',
        tab: 'i',
        sel: 'up:Поделиться:1',
        need: 'card',
        b: 'Закрыть карточку',
        tx: '«Поделиться» отправляет ссылку именно на это голосование. Ниже готовые картинки-карточки для соцсетей: нажмите на картинку и удерживайте, чтобы сохранить.',
      },
      {
        h: 'Поиск',
        tab: 'i',
        sel: '[data-iq]',
        b: 'Ввести «налог»',
        act: 'search',
        q: 'налог',
        tx: 'Ищите по ключевым словам или по номеру законопроекта: в списке останутся только подходящие.',
      },
      {
        h: 'Фильтры',
        tab: 'i',
        sel: 'btn:Фильтры',
        b: 'Открыть фильтры',
        tx: 'Метки помогают найти законопроекты для вас. Откройте фильтры и посмотрите.',
      },
      {
        h: 'Метки',
        tab: 'i',
        sel: 'h:Для кого',
        need: 'flt',
        b: 'Готово',
        tx: '«Для кого», «Тема», «Что меняется»: отметьте нужные, и останутся только такие законопроекты. Число рядом — сколько их за период.',
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
        h: 'Лента по датам',
        tab: 'l',
        sel: '[data-ltl]',
        b: 'Начать',
        tx: 'Законы идут по датам вступления в силу: ближайшие сверху. Слева дата, справа название закона.',
      },
      {
        h: 'Что значат пометки',
        tab: 'l',
        sel: '[data-ltl]',
        tx: '«Через N дней» — закон скоро начнёт действовать. «Сегодня» — граница между будущим и прошлым. «Действует» — закон уже в силе.',
      },
      {
        h: 'Месяцы',
        tab: 'l',
        sel: '[data-lmonth]',
        tx: 'Стрелки «‹ ›» листают месяцы. Название над лентой показывает, где вы сейчас.',
      },
      {
        h: 'Откройте закон',
        tab: 'l',
        sel: '[data-lo]',
        b: 'Открыть закон',
        tx: 'Нажмите на любой закон: он откроется в отдельном окне.',
      },
      {
        h: 'Суть и «Кого коснётся»',
        tab: 'l',
        sel: 'h:Суть',
        need: 'card',
        tx: 'Коротко: о чём закон и на кого он распространяется. Если закон про вас, это видно сразу.',
      },
      {
        h: 'Ссылка и действия',
        tab: 'l',
        sel: 'up:Официальный текст:1',
        need: 'card',
        b: 'Закрыть закон',
        tx: '«Официальный текст» открывает закон на официальном сайте. «Поделиться» отправляет ссылку на закон. «Добавить в календарь» ставит дату вступления в силу в ваш календарь.',
      },
      {
        h: 'Поиск',
        tab: 'l',
        sel: '[data-lq]',
        b: 'Ввести «кредит»',
        act: 'search',
        q: 'кредит',
        tx: 'Введите слово из названия или номер закона: в ленте останутся только подходящие.',
      },
      {
        h: 'Фильтры',
        tab: 'l',
        sel: 'btn:Фильтры',
        b: 'Открыть фильтры',
        tx: 'Метки помогают найти законы для вас. Откройте фильтры и посмотрите.',
      },
      {
        h: 'Метки',
        tab: 'l',
        sel: 'h:Для кого',
        need: 'flt',
        b: 'Закрыть фильтры',
        tx: '«Для кого», «Тема», «Что меняется»: отметьте нужные, и лента покажет только такие законы. Число рядом — сколько законов с этой меткой.',
      },
      {
        h: 'Подписки',
        tab: 'l',
        sel: 'a:Подписки',
        b: 'Готово',
        tx: 'Внизу страницы можно подписаться на новые законы по RSS или добавить даты в календарь (.ics).',
      },
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

/* ---------- поиск элементов страницы ---------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const vis = (e: Element | null): HTMLElement | null =>
  e && (e as HTMLElement).getBoundingClientRect().width > 0 ? (e as HTMLElement) : null;
const norm = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const pinned = (el: Element) =>
  !!el.closest('[data-mnavbar],[data-gdbar]') || getComputedStyle(el).position === 'fixed';

/** Окна сайта (карточка, фильтры), кроме самой панели обучения. */
const dlgs = (): HTMLElement[] =>
  [...document.querySelectorAll('[role="dialog"]')].filter((d) => !d.hasAttribute('data-guide')) as HTMLElement[];
const isFlt = () => dlgs().some((d) => (d.textContent || '').includes('Сбросить'));
const isCard = () => dlgs().some((d) => !(d.textContent || '').includes('Сбросить'));

/** Ближайший предок-блок: со скруглением и фоном или рамкой. */
function blockOf(el: HTMLElement, root: Element): HTMLElement {
  let n: HTMLElement | null = el;
  for (let i = 0; i < 7 && n && n !== root; i++, n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (
      parseFloat(cs.borderTopLeftRadius) >= 10 &&
      (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0)
    )
      return n;
  }
  return el.parentElement || el;
}

function leafByText(text: string): { el: HTMLElement; root: Element } | null {
  const d = dlgs();
  const root: Element = d.length ? d[d.length - 1] : document.body;
  const t = norm(text);
  const own = (x: Element) =>
    norm(
      [...x.childNodes]
        .filter((c) => c.nodeType === 3)
        .map((c) => c.textContent)
        .join(' '),
    );
  const el = [...root.querySelectorAll('*')].find(
    (x) => own(x).startsWith(t) && (x as HTMLElement).getBoundingClientRect().width > 0,
  ) as HTMLElement | undefined;
  return el ? { el, root } : null;
}

function find(sel: string): HTMLElement | null {
  if (sel.startsWith('tab:')) {
    const n = sel.slice(4).replace(/\s+/g, '');
    return vis(
      [...document.querySelectorAll('[role="tab"], header button, [data-gdbar] button')].find((e) =>
        (e.textContent || '').replace(/\s+/g, '').startsWith(n),
      ) || null,
    );
  }
  if (sel.startsWith('btn:')) {
    const n = sel.slice(4);
    return vis(
      [...document.querySelectorAll('button')].find(
        (e) => (e.textContent || '').includes(n) && !e.closest('[data-guide]'),
      ) || null,
    );
  }
  if (sel.startsWith('a:')) {
    const n = sel.slice(2);
    return vis([...document.querySelectorAll('a')].find((e) => (e.textContent || '').includes(n)) || null);
  }
  if (sel.startsWith('par:')) {
    const e = document.querySelector(sel.slice(4));
    return vis(e && e.parentElement);
  }
  if (sel.startsWith('h:')) {
    const f = leafByText(sel.slice(2));
    return f ? vis(blockOf(f.el, f.root)) : null;
  }
  if (sel.startsWith('up:')) {
    const [, text, n] = sel.split(':');
    const f = leafByText(text);
    if (!f) return null;
    let e: HTMLElement = f.el;
    for (let i = 0; i < +n && e.parentElement; i++) e = e.parentElement;
    return vis(e);
  }
  return vis(document.querySelector(sel));
}

/** Ближайший прокручиваемый предок (null — прокручивается сама страница). */
function scroller(el: HTMLElement): HTMLElement | null {
  const dlg = el.closest('[role="dialog"]');
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY;
    /* в окне прокручиваемый контейнер берём даже если всё помещается: ему добавится запас под панель */
    if ((o === 'auto' || o === 'scroll') && (n.scrollHeight > n.clientHeight + 4 || (dlg && dlg.contains(n)))) return n;
  }
  return null;
}

/** Нижняя граница закреплённой шапки (если она закреплена), иначе 0. */
function headerBottom(): number {
  const h = document.querySelector('[data-gdbar]') as HTMLElement | null;
  if (!h) return 0;
  const r = h.getBoundingClientRect();
  return r.top <= 1 && r.height > 0 ? r.bottom : 0;
}

/* ---------- действия на настоящей странице ---------- */

const click = (e: Element | null) => {
  if (!e) return;
  /* нажатие в центр элемента: обработчик может стоять на вложенном элементе */
  const r = (e as HTMLElement).getBoundingClientRect();
  const t = r.width > 0 ? document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 40)) : null;
  ((t && e.contains(t) ? t : e) as HTMLElement).click();
};
let extraDay: string | null = null; /* день, добавленный в календарь при показе */

async function closeFlt() {
  const d = dlgs().find((x) => (x.textContent || '').includes('Сбросить'));
  if (d) click(d.querySelector('button[aria-label="Закрыть"]'));
  await sleep(350);
}
async function closeCard() {
  if (isCard()) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(450);
}
async function closeCal() {
  if (document.querySelector('[data-immonth]')) click(document.querySelector('[data-imdone]'));
  await sleep(350);
}
async function openCal() {
  if (!document.querySelector('[data-immonth]')) click(document.querySelector('[data-imlabel]'));
  await sleep(450);
}
async function openCard() {
  if (!isCard()) click(document.querySelector('[data-itile], [data-lo]'));
  await sleep(700);
}
async function openFlt() {
  if (!isFlt())
    click(
      [...document.querySelectorAll('button')].find(
        (e) => (e.textContent || '').includes('Фильтры') && !e.closest('[data-guide]'),
      ) || null,
    );
  await sleep(600);
}
function setSearch(v: string) {
  const i = document.querySelector('[data-iq], [data-lq]') as HTMLInputElement | null;
  if (!i || i.value === v) return;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  set.call(i, v);
  i.dispatchEvent(new Event('input', { bubbles: true }));
}
async function pickDay() {
  const cell = [...document.querySelectorAll('[data-imcell]')].find(
    (c) => c.getAttribute('aria-pressed') === 'false' && c.children.length > 0,
  ) as HTMLElement | undefined;
  if (!cell) return;
  extraDay = cell.getAttribute('data-imcell');
  click(cell);
  await sleep(400);
}

/** Приводит страницу к нужному шагу: лишнее закрывает, нужное открывает. */
async function ensure(need: Step['need'], tab: string | undefined, go: (k: string) => void) {
  if (tab) {
    go(tab);
    await sleep(450);
  }
  if (need !== 'flt' && isFlt()) await closeFlt();
  if (need !== 'card' && isCard()) await closeCard();
  if (need !== 'cal') await closeCal();
  if (need === 'cal') await openCal();
  if (need === 'card') await openCard();
  if (need === 'flt') await openFlt();
}

/** Возвращает страницу как была: закрывает окна, очищает поиск, убирает добавленный день. */
let restoring: Promise<void> | null = null;
function restore(): Promise<void> {
  /* один возврат за раз: меню и выход могут вызвать его подряд, а день нельзя снять дважды */
  if (restoring) return restoring;
  restoring = (async () => {
    setSearch('');
    if (isFlt()) await closeFlt();
    if (isCard()) await closeCard();
    const day = extraDay;
    extraDay = null;
    if (day) {
      await openCal();
      for (let n = 0; n < 15; n++) {
        const c = document.querySelector(`[data-imcell="${day}"]`);
        if (c && c.getAttribute('aria-pressed') === 'true') {
          click(c);
          await sleep(300);
          break;
        }
        await sleep(200);
      }
    }
    await closeCal();
  })().finally(() => {
    restoring = null;
  });
  return restoring;
}

/* ---------- панель ---------- */

/** Панель обучения. go — переход на страницу сайта, t — цвета темы, m — телефон. */
export function Guide({ t, m, go, onClose }: { t: any; m: boolean; go: (k: string) => void; onClose: () => void }) {
  const [g, setG] = useState(-1);
  const [st, setSt] = useState(0);
  const [lift, setLift] = useState(0);
  const dock = useRef<HTMLDivElement | null>(null);
  const spot = useRef<HTMLDivElement | null>(null);
  const tgt = useRef<HTMLElement | null>(null);
  const dir = useRef(1);
  const tok = useRef(0);
  const padded = useRef<HTMLElement[]>([]);
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
      padded.current.forEach((e) => (e.style.paddingBottom = ''));
      void restore();
    };
  }, [m]);

  // шаг: страница приводится к нужному виду, затем находится подсвечиваемое место
  useEffect(() => {
    const my = ++tok.current;
    tgt.current = null;
    if (!step) {
      void restore();
      return;
    }
    (async () => {
      await ensure(step.need, step.tab, go);
      if (my !== tok.current || !step.sel) return;
      for (let n = 0; n < 20; n++) {
        const el = find(step.sel);
        if (el) {
          tgt.current = el;
          const d = dock.current;
          const dt = d ? d.getBoundingClientRect().top : window.innerHeight;
          const sc = scroller(el);
          if (sc && !pinned(el)) {
            /* запас внизу контейнера: от его нижнего края до верха панели, чтобы последний блок поднимался над панелью */
            const sb = Math.min(sc.getBoundingClientRect().bottom, window.innerHeight);
            sc.style.paddingBottom = `${Math.round(Math.max(0, sb - dt) + 16)}px`;
            if (!padded.current.includes(sc)) padded.current.push(sc);
          }
          const top = (sc ? sc.getBoundingClientRect().top : headerBottom()) + 10;
          const bot = dt - 10;
          const r = el.getBoundingClientRect();
          if (!pinned(el) && (r.top < top || r.bottom > bot)) {
            const delta = r.top - top;
            if (sc) sc.scrollTo({ top: sc.scrollTop + delta, behavior: 'smooth' });
            else window.scrollTo({ top: window.scrollY + delta, behavior: 'smooth' });
          }
          return;
        }
        await sleep(100);
        if (my !== tok.current) return;
      }
      /* на этой ширине экрана такого элемента нет — шаг пропускается */
      if (dir.current > 0) mv(1);
      else if (st > 0) mv(-1);
    })();
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
          const dt = d ? d.getBoundingClientRect().top : window.innerHeight;
          const pin = pinned(el);
          const sc = scroller(el);
          const lim = pin ? 0 : sc ? sc.getBoundingClientRect().top + 2 : headerBottom() + 2;
          const top = pin ? r.top : Math.max(r.top, lim);
          const bot = pin ? r.bottom : Math.min(r.bottom, dt - 4);
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
  const main = async () => {
    if (!step) return;
    if (step.act === 'day') await pickDay();
    if (step.act === 'search') {
      setSearch(step.q || '');
      await sleep(1100);
    }
    mv(1);
  };
  const btn = (primary: boolean, off?: boolean): any => ({
    flex: primary ? 1.6 : 1,
    border: primary ? 'none' : `1px solid ${t.border.default}`,
    borderRadius: 12,
    height: 44,
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
  const last = !!part && st === part.steps.length - 1;
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
          padding: '10px 14px 14px',
        }}
      >
        {part && (
          <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
            {part.steps.map((_, i) => (
              <button
                key={i}
                aria-label={`Шаг ${i + 1}`}
                onClick={() => {
                  dir.current = i >= st ? 1 : -1;
                  setSt(i);
                }}
                style={{
                  flex: 1,
                  height: 6,
                  border: 'none',
                  borderRadius: 3,
                  padding: 0,
                  cursor: 'pointer',
                  position: 'relative',
                  background: i === st ? t.text.accent : i < st ? t.text.accent + '88' : t.border.default,
                }}
              >
                <span style={{ position: 'absolute', inset: '-8px -1px' }} />
              </button>
            ))}
          </div>
        )}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}
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
            {part ? `${part.n} · ${st + 1} из ${part.steps.length}` : 'Как пользоваться сайтом'}
          </span>
          <button
            onClick={onClose}
            style={{
              flex: 'none',
              border: 'none',
              background: 'none',
              color: t.text.tertiary,
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              padding: '4px 0 4px 8px',
            }}
          >
            Выйти
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
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{step.h}</div>
            <div style={{ fontSize: 14, lineHeight: 1.42, marginBottom: 10 }}>{step.tx}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => (st > 0 ? mv(-1) : setG(-1))}
                aria-label={st > 0 ? 'Назад' : 'К разделам'}
                style={{ ...btn(false), flex: 'none', width: 44, padding: 0, fontSize: 18 }}
              >
                {st > 0 ? '‹' : '☰'}
              </button>
              <button onClick={() => void main()} style={btn(true)}>
                {(step.b || (last ? 'Готово' : 'Понятно')) + (last ? '' : ' →')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
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
