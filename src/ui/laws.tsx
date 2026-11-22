// Законы «Вступают в силу»: идентификаторы, ссылки, поиск.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.
import { MONN, isOff } from './misc';
import { SITE } from './telegram';

export const LCUR = (() => { const n = new Date(); return `${String(n.getMonth() + 1).padStart(2, '0')}.${n.getFullYear()}`; })();
/* 14.11.2026: постоянный номер закона (FNV-1a от даты, реквизитов и названия; тот же расчёт в web/extras.mjs) — для ссылки на карточку ?tab=l&law=… и файла ics/law/<номер>.ics */
export const lawId = (x: any) => { if (x.lid) return String(x.lid) /* 17.11.2026: заголовок закона можно менять без смены адреса его карточки */; let h = 0x811c9dc5; for (const ch of `${x.d}|${x.law || ''}|${x.title || ''}`) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
/* 14.11.2026: ссылки закона — только официальные; если в данных их нет, вместо главной страницы портала — поиск закона по номеру
   на kremlin.ru (тот же поиск, по которому pipeline/laws_src.py находит прямую ссылку kremlin.ru/acts/bank/<id> при ежедневном сборе) */
export const lawSearch = (x: any) => { const n = /№\s*(\d+-ФЗ)/.exec(x.law || ''); return n ? 'http://kremlin.ru/acts/bank/search?query=' + encodeURIComponent('№ ' + n[1]) : ''; };
/* 15.11.2026: прямая ссылка на текст акта (kremlin.ru/acts/bank, publication.pravo.gov.ru/document) — кнопка «Официальный текст», первой */
export const isAct = (u: string) => /kremlin\.ru\/acts\/bank\/\d+|publication\.pravo\.gov\.ru\/document\/\d+/.test(u || '');
export const lawLinks = (x: any): { t: string; u: string }[] => { const off = (x.src || []).filter((l: any) => l && isOff(l.u)); const act = off.find((l: any) => isAct(l.u)); if (act) return [{ t: 'Официальный текст', u: act.u }, ...off.filter((l: any) => !isAct(l.u))]; if (off.length) return off; const q = lawSearch(x); return q ? [{ t: 'Найти официальный текст', u: q }] : []; };
/* страница закона со своим адресом (web/extras.mjs: law/<lawId>/) */
/* 15.11.2026: «Поделиться» у закона — ссылка в приложение: вкладка «Вступают в силу» с открытой карточкой закона (как ссылка на карточку календаря); статическая страница law/<id>/ остается для поисковиков */
export const lawShare = (x: any) => `${SITE}/law/${lawId(x)}/`;
export const lmname = (k: string) => `${MONN[+k.slice(0, 2) - 1]} ${k.slice(3)}`;
export const MPR = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
export const plz = (n: number, a: string, b: string, c: string) => { const d = n % 100, e = n % 10; return d >= 11 && d <= 14 ? c : e === 1 ? a : e >= 2 && e <= 4 ? b : c; };
