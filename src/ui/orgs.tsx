// Работа госорганов: карта органов, документы, период (PeriodHead), новости, пустые состояния.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.
import { useState, useLayoutEffect } from 'grok/canvas';
import { nvMix } from './nv';
import { FSub } from './sv';

/* 14.11.2026 (вариант В): знак органа в тонированном кружке без толстого кольца — вместо номера документа и сокращений (ГД, СФ, ЦБ…).
   Знаки свои (здания, ₽, монеты, каска, весы), не официальные эмблемы. Размер один везде — в плитках, шапке окна и новостях. */
export const ORGI: Record<string, string> = {
  gd: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5', /* 18.11.2026: значок выбран владельцем */
  sf: 'M5 9a3 3 0 1 0 6 0a3 3 0 1 0-6 0M13 9a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3 19c0-3 2.5-5 5-5s5 2 5 5M11 19c0-3 2.5-5 5-5s5 2 5 5', /* 18.11.2026: значок выбран владельцем */
  gov: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16M11 13v2h2v-2', /* 18.11.2026: значок выбран владельцем */
  pres: 'M7 3h8l4 4v14H7zM15 3v4h4M12 11.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z', /* 18.11.2026: значок выбран владельцем */
  cbr: 'M4 5h16v14H4zM8 19v2M16 19v2M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12 10.5V12l1 1', /* 18.11.2026: значок выбран владельцем */
  minfin: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M10 17V7h3.5a2.5 2.5 0 0 1 0 5H8M8 15h6', /* 18.11.2026: значок выбран владельцем */
  mintrud: 'M6 3h11a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 3v18M11 8h5M11 12h5', /* 18.11.2026: значок выбран владельцем */
  minjust: 'M8 3h8l3 3v15H5V6zM9 12h6M9 16h4M15 3v3h3', /* 18.11.2026: значок выбран владельцем */
  /* 18.11.2026: значки восьми новых министерств */
  economy: 'M4 17l5-5 4 4 7-8M15 8h5v5', /* 18.11.2026: значок выбран владельцем */
  promtorg: 'M3 21h18M5 21V11l5 3v-3l5 3V5h4v16M8 17h1M12 17h1M16 17h1', /* 18.11.2026: значок выбран владельцем */
  minzdrav: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM12 8.5v7M8.5 12h7', /* 18.11.2026: значок выбран владельцем */
  mintrans: 'M12 3c1 0 2 1 2 3v5l7 4v2l-7-2v4l2 2v1l-4-1-4 1v-1l2-2v-4l-7 2v-2l7-4V6c0-2 1-3 2-3z', /* 18.11.2026: значок выбран владельцем */
  digital: 'M12 20v.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M2 9.5a15 15 0 0 1 20 0', /* 18.11.2026: значок выбран владельцем */
  mvd: 'M7 20h10M8 20v-5a4 4 0 0 1 8 0v5M12 5V3M4.5 7L6 8.5M19.5 7L18 8.5M3 12h2M19 12h2', /* 18.11.2026: значок выбран владельцем */
  mnr: 'M12 3l5 8h-3.5l4 6H7.5l4-6H8zM12 17v4', /* 18.11.2026: значок выбран владельцем */
  minstroy: 'M6 21V3M6 5h14l-14 3M17 5v6M16 11h2v2h-2zM3 21h6', /* 18.11.2026: значок выбран владельцем */
};
export const ORGNM: Record<string, string> = { gd: 'Госдума', sf: 'Совет Федерации', pres: 'Президент', gov: 'Правительство', cbr: 'Банк России', minfin: 'Минфин', mintrud: 'Минтруд', minjust: 'Минюст', economy: 'Минэкономразвития', promtorg: 'Минпромторг', minzdrav: 'Минздрав', mintrans: 'Минтранс', digital: 'Минцифры', mvd: 'МВД', mnr: 'Минприроды', minstroy: 'Минстрой' };
export const OMZ = 48;
export function OrgMark({ o, c }: { o: string; c: string }) { const d = ORGI[o]; return <span data-orgmarkb={o} role="img" aria-label={ORGNM[o] || ''} style={{ width: OMZ, height: OMZ, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: nvMix(c, 18), boxShadow: `inset 0 0 0 1px ${nvMix(c, 40)}` }}>{d ? <svg width={25} height={25} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg> : null}</span>; }
export const WDN = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
/* 12.11.2026: во вкладке «Новости» — только материалы лент новостей (duma.gov.ru/news, government.ru/news, kremlin.ru/events, council.gov.ru/events/news). Голосования, акты и заседания — в календаре, здесь не дублируются. */
export const NEWSU = /^https?:\/\/(www\.)?(duma\.gov\.ru\/news\/|government\.ru\/news\/|kremlin\.ru\/events\/|council\.gov\.ru\/events\/news\/)/;
export const newsOnly = (fs: Record<string, FSub[]>): Record<string, FSub[]> => { const r: Record<string, FSub[]> = {}; for (const k of Object.keys(fs)) r[k] = fs[k].map(([h, it]) => [h, it.filter((x) => NEWSU.test(x[1] || ''))] as FSub).filter(([, it]) => it.length > 0); return r; };
/* 12.11.2026: раздел «Новости» — лента официальных новостей по дням (новые сверху) с фильтром по источнику;
   вместо переключателя дня и «Сводки дня». Месяцы подгружаются кнопкой «Показать ранее». */
export const NSRC: [string, string][] = [['gd', 'Госдума'], ['gov', 'Правительство'], ['sf', 'Совет Федерации'], ['cbr', 'Банк России'], ['minfin', 'Минфин'], ['mintrud', 'Минтруд'], ['minjust', 'Минюст'], ['economy', 'Минэкономразвития'], ['promtorg', 'Минпромторг'], ['minzdrav', 'Минздрав'], ['mintrans', 'Минтранс'], ['digital', 'Минцифры'], ['mvd', 'МВД'], ['mnr', 'Минприроды'], ['minstroy', 'Минстрой']];
export type NItem = { o: string; sec: string; tag: string | null; text: string; sub: string; u: string; tm?: string; live?: boolean; b?: string[]; d?: string };
/* Новости: каждый орган — отдельная карточка в том же оформлении, что «Госдума» и «Правительство» (заголовок, счетчик, разделы-аккордеоны). */
export const ORGTY: [string, string][] = [['новость', 'Новости дня'], ['заседание', 'Заседания'], ['решение', 'Решения и документы'], ['разъяснение', 'Разъяснения и рекомендации']];
/* 19.11.2026: абзацы «Сути» документа органа: массив или строка с пустой строкой между абзацами */
export const orgSut = (x: any): string[] => (Array.isArray(x.sut) ? x.sut : typeof x.sut === 'string' ? x.sut.split(/\n\s*\n|\n/) : []).map((q: any) => String(q).trim()).filter(Boolean);
export const orgWho = (x: any) => (typeof x.who === 'string' ? x.who : Array.isArray(x.who) ? x.who.join('\n') : '').trim();
export const orgDayKey = (d: string) => (d || '').slice(6, 10) + (d || '').slice(3, 5) + (d || '').slice(0, 2);
export const orgIsDoc = (x: any) => x.ty !== 'новость' && x.ty !== 'заседание';
export const orgHasTexts = (x: any) => orgSut(x).length > 0 && !!orgWho(x);
export const orgNoText = (x: any) => orgIsDoc(x) && !!x.nt && !orgHasTexts(x);
export const orgNo = (x: any) => { const r = /№\s*([^\s,;:]+)/.exec(x.no || x.st || x.t || ''); return r ? '№ ' + r[1] : ''; };
/* 21.11.2026 (решение владельца): «Работа госорганов» — карта органов. Плитки органов за выбранный период (день, неделя, месяц) → лента документов органа →
   документ окном. Без новостей и без «Кого коснётся» в превью; название документа короткое (ORGX.ti, пишет бот; иначе по «Сути»). Заседания и голосования Госдумы — в режиме «По дням». */
export const OMD = (d: string) => new Date(+d.slice(6, 10), +d.slice(3, 5) - 1, +d.slice(0, 2));
export const OMF = (x: Date) => `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
export const OMA = (x: Date, n: number) => { const y = new Date(x); y.setDate(y.getDate() + n); return y; };
export const OMMON = (x: Date) => OMA(x, -((x.getDay() + 6) % 7));
export const OMWD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const OMMN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const OMMI = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const OMPL = (n: number, a: [string, string, string]) => { const m = n % 100, k = n % 10; return `${n} ${m > 10 && m < 20 ? a[2] : k === 1 ? a[0] : k > 1 && k < 5 ? a[1] : a[2]}`; };
export const OMKN: Record<string, string> = { 'Постановление': 'постановления', 'Распоряжение': 'распоряжения', 'Приказ': 'приказы', 'Указ': 'указы', 'Указание': 'указания', 'Информационное письмо': 'информационные письма', 'Ответы на запросы': 'ответы на запросы' };
export const OMKP: Record<string, [string, string, string]> = { 'Постановление': ['постановление', 'постановления', 'постановлений'], 'Распоряжение': ['распоряжение', 'распоряжения', 'распоряжений'], 'Приказ': ['приказ', 'приказа', 'приказов'], 'Указ': ['указ', 'указа', 'указов'], 'Указание': ['указание', 'указания', 'указаний'], 'Информационное письмо': ['информационное письмо', 'информационных письма', 'информационных писем'] };
export const omKind = (x: any): string => String(x.kind || x.k || x.ty || 'Документ');
export const omKP = (k: string, n: number) => OMKP[k] ? OMPL(n, OMKP[k]) : `${n} ${k.toLowerCase()}`;
/* короткое название: ORGX.ti; иначе первое предложение «Сути», сжатое до смысловой границы; иначе официальное название без «Приказ № … от …:» */
export const OMNOM: Record<string, string> = { 'Порядка': 'Порядок', 'Правил': 'Правила', 'Положения': 'Положение', 'Методики': 'Методика', 'Перечня': 'Перечень', 'Требований': 'Требования', 'Стандарта': 'Стандарт', 'Инструкции': 'Инструкция', 'Формы': 'Форма', 'Норм': 'Нормы', 'Нормативов': 'Нормативы', 'Регламента': 'Регламент', 'Административного регламента': 'Административный регламент', 'Классификатора': 'Классификатор' };
/* обрезка по смысловой границе без многоточия: перед запятой, «на», «для», «по», «при», «в том числе», тире, скобкой; висячие «№ / от / и / в …» в конце убираются */
export function omCut(t: string, MAX = 84): string {
  t = t.trim(); if (t.length <= MAX) return t;
  const w = t.slice(0, MAX + 1); const bs = [', ', ' — ', ': ', ' (', ' на ', ' для ', ' по ', ' при ', ' в том числе', ' и ', ' в ', ' от ', ' о ', ' об ']; let k = 0; for (const b of bs) k = Math.max(k, w.lastIndexOf(b));
  if (k < 30) k = Math.max(w.lastIndexOf(' '), 30);
  t = t.slice(0, k); for (let n = 0; n < 4; n++) { const t2 = t.replace(/[,;:\s—-]+$/, '').replace(/\s+(№|от|г\.|года|и|в|на|по|для|при|о|об|с|со|к|за|из)$/i, ''); if (t2 === t) break; t = t2; }
  if ((t.match(/«/g) || []).length > (t.match(/»/g) || []).length) t = t.slice(0, t.lastIndexOf('«')).replace(/[,;:\s—-]+$/, '').replace(/\s+(№|от|г\.|года|и|в|на|по|для|при|о|об|с|со|к|за|из)$/i, ''); /* незакрытая кавычка — отрезать вместе с ней */
  if ((t.match(/\(/g) || []).length > (t.match(/\)/g) || []).length) t = t.slice(0, t.lastIndexOf('(')).replace(/[,;:\s—-]+$/, '');
  return t;
}
/* официальное название без «Приказ № …:» в короткий вид: «Об утверждении Порядка …» → «Порядок …», «О внесении изменений в …» → «Изменения в …»; обрезка — по смысловой границе, без многоточия */
export function omLegal(t0: string): string {
  let t = String(t0 || ''); const i = t.indexOf(':'); if (i > 0 && i < 70 && /№/.test(t.slice(0, i))) t = t.slice(i + 1).trim();
  const trunc = /[…]$|\.\.\.$/.test(t); t = t.replace(/(…|\.\.\.)$/, '').trim();
  let m = /^Об утверждении (Административного регламента|[А-ЯЁ][а-яё]+) (.+)$/.exec(t); if (m && OMNOM[m[1]]) t = `${OMNOM[m[1]]} ${m[2]}`;
  else if ((m = /^О внесении изменени(?:й|я|е) в (.+)$/.exec(t))) t = `Изменения в ${m[1]}`;
  else if ((m = /^О признании утратившим(?:и)? силу (.+)$/.exec(t))) t = `Признание утратившими силу ${m[1]}`;
  if (trunc && t.length <= 84) { const q = Math.max(t.lastIndexOf(', '), t.lastIndexOf(' на '), t.lastIndexOf(' для '), t.lastIndexOf(' в '), t.lastIndexOf(' по '), t.lastIndexOf(' при ')); if (q >= 28) t = t.slice(0, q); else t = t.slice(0, t.lastIndexOf(' ')); }
  t = omCut(t);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export const OMTC = new WeakMap<object, string>();
export function omTitle(x: any): string { const c = OMTC.get(x); if (c !== undefined) return c; const r = omTitle0(x); OMTC.set(x, r); return r; }
export function omTitle0(x: any): string {
  if (x.ti) return x.ti;
  let s = orgSut(x)[0] || ''; if (s) { const m = /[.!?](\s+)(?=[«"A-ZА-ЯЁ])/.exec(s); if (m) s = s.slice(0, m.index + 1); s = s.replace(/[.]$/, ''); }
  if (!s) return omLegal(String(x.tf || x.st || x.t || ''));
  s = omCut(s, 90); return s.charAt(0).toUpperCase() + s.slice(1);
}
/* 21.11.2026: связь панели «Фильтры» и карты органов: map — открыта карта; feed — после «Показать N карточек» лента выбранных органов за все дни */
export type OMM = 'day' | 'week' | 'month' | 'year';
export const OMS: { map: boolean; feed: boolean; mode: OMM; cur: Date | null; ds: string[]; ms: string[]; ys: number[]; ws: string[] } = { map: false, feed: false, mode: 'day', cur: null, ds: [], ms: [], ys: [], ws: [] };
export const OML = new Set<() => void>();
export const omMkD = (x: Date) => `${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
export const omRng = (mode: OMM, c0: Date): [Date, Date] => mode === 'day' ? [c0, c0] : mode === 'week' ? [OMMON(c0), OMA(OMMON(c0), 6)] : mode === 'month' ? [new Date(c0.getFullYear(), c0.getMonth(), 1), new Date(c0.getFullYear(), c0.getMonth() + 1, 0)] : [new Date(c0.getFullYear(), 0, 1), new Date(c0.getFullYear(), 11, 31)];
export const OMPER: [OMM, string][] = [['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']];
/* 21.11.2026: пустое состояние с подсказкой (макет «Пустые состояния»): иконка в акцентном круге, причина, одно главное действие. Один вид на всех вкладках. */
export const WDF = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export const EMI: Record<string, string> = {
  cal: 'M3 8a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V8zM3 10h18M8 3v4M16 3v4M9 15h6',
  find: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5M8.5 11h5',
  bars: 'M6 20V10M12 20V4M18 20v-7',
  news: 'M5 7a3 3 0 013-3h8a3 3 0 013 3v10a3 3 0 01-3 3H8a3 3 0 01-3-3V7zM9 9h6M9 13h6M9 17h3' };
/* 21.11.2026: единый выбор периода для «Работы госорганов» и «Пленарных заседаний» (вариант A макета): переключатель День / Неделя / Месяц / Год,
   стрелки с подписью, «Сегодня», полоса дней и календарь или список выбора. Страницы дают только данные и обработчики, вид один. */
export const WD7 = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export type PHItem = { k: string; l: string; on: boolean; f: () => void };
/* 15.11.2026: вкладка «Итоги» (макет владельца, п. 4): сначала период (последний день с заседанием, его неделя, месяц, все),
   затем метки «Для кого» / «Тема» / «Что меняется»; итог — всего / принято / отклонено; сколько законопроектов поддержала каждая
   фракция (большинство фракции «за»); «Законопроекты» — плитками, как в календаре (сначала принятые, затем отклоненные).
   Законопроекты — строки дня Госдумы (CAL.p[].a) с итоговым голосованием дня (billVote), как в календаре; нажатие — карточка голосования. */
/* 15.11.2026: виды документов органа за день для подзаголовка строки органа: «указания · разъяснения» (несколько — множественное число) */
export const KPL: Record<string, string> = { 'указ': 'указы', 'приказ': 'приказы', 'указание': 'указания', 'разъяснение': 'разъяснения', 'разъяснения': 'разъяснения', 'информационное письмо': 'информационные письма', 'письмо': 'письма', 'постановление': 'постановления', 'распоряжение': 'распоряжения', 'решение совета директоров': 'решения Совета директоров', 'решение': 'решения', 'положение': 'положения', 'новость': 'новости', 'сообщение': 'сообщения' };
export const orgKinds = (ek: any[]) => { const c: Record<string, number> = {}; const ord: string[] = []; ek.forEach((e: any) => (e.k === 'o' ? e.o : []).forEach((x: any) => { const v = String(x.kind || x.k || '').trim(); if (!v) return; const l = v.toLowerCase(); if (!(l in c)) { c[l] = 0; ord.push(l); } c[l]++; })); return ord.map((l) => (c[l] > 1 ? KPL[l] || l : l.replace('совета директоров', 'Совета директоров'))).join(' · '); };
export const FRO = ['ЕР', 'КПРФ', 'ЛДПР', 'НЛ', 'СРЗП', 'Вне'];
export const mqOk = (q: string, hay: string) => { const h = hay.toLowerCase().replace(/ё/g, 'е'); return q.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(Boolean).every((w) => h.includes(w)); };
/* 16.11.2026: useLayoutEffect — строка встает в шапку до первой отрисовки, без мигания */
export function useHSlot(on: boolean) { const [el, setEl] = useState<HTMLElement | null>(null); useLayoutEffect(() => { const x = on ? document.querySelector('[data-hslot]') as HTMLElement | null : null; if (x !== el) setEl(x); }); return el; }
export const COLS = '1rem 4rem 6rem minmax(7.25rem, 1fr) 6.75rem 6.5rem minmax(4.5rem, 7rem) 2.5rem 3.75rem 6rem 6.5rem';
export const RES_SKIP = /способ голос|выбор способа/;
export const BUDP: Record<string, [string, string]> = { '19.11.2026': ['бюджет: второе чтение (план)', 'https://www.pnp.ru/economics/volodin-vtoroe-chtenie-proekta-byudzheta-mozhet-sostoyatsya-19-noyabrya.html'], '24.11.2026': ['бюджет: третье чтение (план)', 'https://www.pnp.ru/economics/volodin-vtoroe-chtenie-proekta-byudzheta-mozhet-sostoyatsya-19-noyabrya.html'] };
/* 16.11.2026: pres — указы и распоряжения Президента (publication.pravo.gov.ru, organs.py); постановления и распоряжения Правительства лежат в ORG с o: 'gov' и показываются вместе с его заседаниями (ORGKG) */
export const ORGK = ['sf', 'pres', 'minfin', 'economy', 'promtorg', 'cbr', 'mintrans', 'minstroy', 'digital', 'mnr', 'mintrud', 'minzdrav', 'minjust', 'mvd'];
export const ORGKG = [...ORGK, 'gov'];
/* 18.11.2026: органы собраны в шесть групп (решение владельца): окно дня раскрывает одну группу, цвета календаря и легенды — по группам */
export const ORGG: [string, string, string[]][] = [['par', 'Парламент', ['gd', 'sf']], ['pg', 'Президент и Правительство', ['pres', 'gov']], ['eco', 'Экономика и финансы', ['minfin', 'economy', 'promtorg', 'cbr']], ['inf', 'Инфраструктура и природа', ['mintrans', 'minstroy', 'digital', 'mnr']], ['soc', 'Социальный блок', ['mintrud', 'minzdrav']], ['law', 'Право и безопасность', ['minjust', 'mvd']]];
/* 18.11.2026 (выбор владельца): короткие названия групп — под датой, в заголовке группы и в легенде */
export const ORGGS: Record<string, string> = { par: 'Парламент', pg: 'Власть', eco: 'Экономика', inf: 'Инфраструктура', soc: 'Соцблок', law: 'Право' };
export const ORGGO: Record<string, string> = {};
export const ORGC = (dk: boolean) => (dk ? '#4FC3D9' : '#0B7C93');
/* П14 (12.11.2026): цвета органов разведены по оттенку (палитра Окабэ–Ито, различима при дальтонизме): Минюст — пурпурный вместо второго оливкового */
export const ORGGC: Record<string, [string, string]> = { par: ['#0B7C93', '#4FC3D9'], pg: ['#A3302A', '#FF8A80'], eco: ['#7F5AB5', '#B69CE6'], inf: ['#C2570C', '#FF9A57'], soc: ['#8A6E00', '#D9BE45'], law: ['#B8407A', '#F08DC0'] };
export const grpCol = (g: string, dk: boolean) => (ORGGC[g] ? ORGGC[g][dk ? 1 : 0] : ORGC(dk));
export const orgCol = (o: string, dk: boolean) => grpCol(ORGGO[o], dk);
export const CARDS: string[] = ["01.10.2026", "13.10.2026", "14.10.2026", "15.10.2026", "20.10.2026", "21.10.2026", "22.10.2026", "23.10.2026", "25.10.2026", "26.10.2026", "30.09.2026"];
export const WDS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const WDL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
