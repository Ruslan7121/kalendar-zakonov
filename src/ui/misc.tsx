// Вспомогательные функции и константы интерфейса: даты, форматирование, мелкие компоненты.
// Вынесено из src/canvas.tsx (рефакторинг 22.11.2026): код не зависит от данных сайта.
import { useState, useEffect, useRef } from 'grok/canvas';
import { SITE, TG } from './telegram';
import { F } from './loader';
import { Vote } from './nv';
import { OML, OMS } from './orgs';
import { svTop } from './sv';

export const MON = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
export const pendTxt = (ds: string[]) => {
  if (!ds.length) return '';
  const mo = ds.map((d) => +d.slice(3, 5) - 1);
  const same = mo.every((x) => x === mo[0]);
  const nm = ds.map((d) => String(+d.slice(0, 2)) + (same ? '' : ' ' + MON[+d.slice(3, 5) - 1]));
  const j = nm.length > 1 ? nm.slice(0, -1).join(', ') + ' и ' + nm[nm.length - 1] : nm[0];
  return `${j}${same ? ' ' + MON[mo[0]] : ''} ${ds.length > 1 ? 'ещё собираются' : 'ещё собирается'}`;
};
export const MONN = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
export const dayLabel = (d: string) => `${Number(d.slice(0, 2))} ${MON[Number(d.slice(3, 5)) - 1]}`;
export const FMT: Record<string, string> = { msword: 'DOC', pdf: 'PDF', rtf: 'RTF' };
export const CATS = ['За', 'Против', 'Воздержались', 'Не голосовали'];
export const T300 = new Set(['29.10.2026', '30.10.2026']);
export const CATS_S = ['За', 'Против', 'Воздер.', 'Не голос.'];
export const WORD = ['За', 'Против', 'Воздержались', 'Не голосовали'];
/* 14.11.2026: в кружочке фракции — доля «за» от состава фракции (раньше — процент самого крупного ответа с подписью «за»: у ЕР было «за 100%», когда никто не голосовал) */
export const pZa = (v: number[]) => `${Math.round(((v[0] || 0) / (v.reduce((a, b) => a + b, 0) || 1)) * 100)}%`;
export function pos(v: number[]) {
  const s = v.reduce((a, b) => a + b, 0) || 1;
  let m = 0;
  v.forEach((x, i) => {
    if (x > v[m]) m = i;
  });
  return { pct: `${Math.round((v[m] / s) * 100)}%`, word: WORD[m] };
}
/* 14.11.2026: только официальные источники (правило проекта): *.gov.ru (Госдума, СФ, pravo.gov.ru, министерства), kremlin.ru, government.ru, cbr.ru */
export const isOff = (u: string) => {
  const h = String(u || '')
    .replace(/^https?:\/\//i, '')
    .split(/[/?#]/)[0]
    .toLowerCase()
    .replace(/^www\./, '');
  return (
    /\.gov\.ru$/.test(h) || h === 'kremlin.ru' || h === 'government.ru' || h === 'cbr.ru' || h === 'xn--b1aew.xn--p1ai'
  );
};
export function billNo(doc: string) {
  const m = doc.match(/(\d+-\d+)/);
  return m ? m[1] : null;
}
export const normRead = (r: string) =>
  r === '2 чтение' ? '2-е' : r === '3 чтение' ? '3-е' : r.startsWith('2 чтение таб') ? '2-е, поправки' : r;
export const QS =
  typeof window !== 'undefined'
    ? (() => {
        const q = new URLSearchParams(window.location.search);
        try {
          const h = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
          h.forEach((val, k) => {
            if (!q.has(k)) q.set(k, val);
          });
        } catch (e) {}
        /* 15.11.2026: Telegram передает только startapp (до 64 символов): d11112026_v136349 — голосование, law_<id> — закон, laws / itogi / news — вкладка */
        try {
          const sp = q.get('tgWebAppStartParam') || (TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param) || '';
          let mm: any;
          if ((mm = sp.match(/^d(\d{2})(\d{2})(\d{4})_v(\d+)$/))) {
            q.set('d', `${mm[1]}.${mm[2]}.${mm[3]}`);
            q.set('v', mm[4]);
          } else if ((mm = sp.match(/^law_([0-9a-f]{8})$/))) {
            q.set('tab', 'l');
            q.set('law', mm[1]);
          } else if (sp === 'laws') q.set('tab', 'l');
          else if (sp === 'itogi') q.set('tab', 'i');
          else if (sp === 'news') q.set('tab', 'd');
        } catch (e) {}
        return q;
      })()
    : null;
export const PIN: string | null = QS ? QS.get('v') : null;
/* Deep-link: публичный сайт на GitHub Pages; при открытии QS читает ?d=&v= (и hash, если есть) и раскрывает день и карточку. */
export function shareLink(day: string, id: string) {
  return `${SITE}/?d=${encodeURIComponent(day)}&v=${encodeURIComponent(id)}`;
}
/* 15.11.2026: ссылка «Поделиться» с превью — страница v/<id>/ (web/extras.mjs): в Telegram, WhatsApp, VK видно название, итог, голоса и суть;
   открывшего она сразу переводит в карточку (shareLink). Голосования без законопроекта (процедурные) — прямой shareLink. */
/* 18.11.2026: версия превью — Telegram запоминает карточку-превью адреса; при смене оформления превью (og-теги страницы v/<id>/) число увеличивают, и ссылки получают свежую карточку */
export const SHARE_PV = '2';
export function qrMatrix(text: string): boolean[][] {
  const data = Array.from(new TextEncoder().encode(text));
  const ECW = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    NB = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const rawMods = (v: number) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  };
  let ver = 1;
  for (; ver <= 10; ver++) {
    const cap = Math.floor(rawMods(ver) / 8) - ECW[ver - 1] * NB[ver - 1];
    if (4 + (ver < 10 ? 8 : 16) + data.length * 8 <= cap * 8) break;
  }
  if (ver > 10) throw new Error('qr too long');
  const total = Math.floor(rawMods(ver) / 8),
    ecl = ECW[ver - 1],
    nb = NB[ver - 1],
    dcw = total - ecl * nb;
  const bits: number[] = [];
  const put = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  put(4, 4);
  put(data.length, ver < 10 ? 8 : 16);
  data.forEach((b) => put(b, 8));
  put(0, Math.min(4, dcw * 8 - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let p = 0xec; bits.length < dcw * 8; p ^= 0xec ^ 0x11) put(p, 8);
  const dc: number[] = [];
  for (let i = 0; i < bits.length; i += 8) dc.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const mul = (x: number, y: number) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 255;
  };
  const gen: number[] = [];
  for (let i = 0; i < ecl - 1; i++) gen.push(0);
  gen.push(1);
  let root = 1;
  for (let i = 0; i < ecl; i++) {
    for (let j = 0; j < gen.length; j++) {
      gen[j] = mul(gen[j], root);
      if (j + 1 < gen.length) gen[j] ^= gen[j + 1];
    }
    root = mul(root, 2);
  }
  const rem = (d: number[]) => {
    const r = gen.map(() => 0);
    for (const b of d) {
      const f = b ^ (r.shift() as number);
      r.push(0);
      gen.forEach((g, i) => (r[i] ^= mul(g, f)));
    }
    return r;
  };
  const nShort = nb - (total % nb),
    shortLen = Math.floor(total / nb);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dl = shortLen - ecl + (i < nShort ? 0 : 1);
    const d = dc.slice(k, k + dl);
    k += dl;
    const e = rem(d);
    if (i < nShort) d.push(0);
    blocks.push(d.concat(e));
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[0].length; i++)
    blocks.forEach((b, j) => {
      if (i !== shortLen - ecl || j >= nShort) all.push(b[i]);
    });
  const S = ver * 4 + 17;
  const M: boolean[][] = [],
    F: boolean[][] = [];
  for (let i = 0; i < S; i++) {
    M.push(new Array(S).fill(false));
    F.push(new Array(S).fill(false));
  }
  const set = (x: number, y: number, d: boolean) => {
    M[y][x] = d;
    F[y][x] = true;
  };
  for (let i = 0; i < S; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (x: number, y: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx,
          yy = y + dy;
        if (xx >= 0 && xx < S && yy >= 0 && yy < S) set(xx, yy, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(S - 4, 3);
  finder(3, S - 4);
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2,
      step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    const pos = [6];
    for (let p = S - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
    pos.forEach((a, i) =>
      pos.forEach((b, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }),
    );
  }
  const fmt = (mask: number) => {
    const d = (0 << 3) | mask;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    const g = (i: number) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i));
    set(8, 7, g(6));
    set(8, 8, g(7));
    set(7, 8, g(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(S - 1 - i, 8, g(i));
    for (let i = 8; i < 15; i++) set(8, S - 15 + i, g(i));
    set(8, S - 8, true);
  };
  fmt(0);
  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const bt = ((b >>> i) & 1) === 1,
        a = S - 11 + (i % 3),
        c = Math.floor(i / 3);
      set(a, c, bt);
      set(c, a, bt);
    }
  }
  let i = 0;
  for (let right = S - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < S; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j,
          up = ((right + 1) & 2) === 0,
          y = up ? S - 1 - vert : vert;
        if (!F[y][x] && i < all.length * 8) {
          M[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (!F[y][x] && (x + y) % 2 === 0) M[y][x] = !M[y][x];
  return M;
}
export const DEP: Record<string, string> = {};
export const DEP7: Record<string, string> = {
  'Афонский В.И.': 'ЕР',
  'Гартунг В.К.': 'СРЗП',
  'Драпеко Е.Г.': 'СРЗП',
  'Емельянов М.В.': 'СРЗП',
  'Епифанова О.Н.': 'СРЗП',
  'Ионин Д.А.': 'СРЗП',
  'Казакова О.М.': 'ЕР',
  'Качкаев П.Р.': 'ЕР',
  'Миронов С.М.': 'СРЗП',
  'Нилов О.А.': 'СРЗП',
  'Хованская Г.П.': 'СРЗП',
  'Шолохов А.М.': 'ЕР',
};
export const INI_ADD: Record<string, string> = {
  '8112-9': 'Правительство Российской Федерации',
  '1327147-8': 'Правительство Российской Федерации',
  '1327029-8': 'Правительство Российской Федерации',
  '1342004-8': 'Правительство Российской Федерации',
  '1306034-8': 'Правительство Российской Федерации',
  '1327132-8': 'Правительство Российской Федерации',
  '1336427-8': 'Правительство Российской Федерации',
  '1336436-8': 'Правительство Российской Федерации',
  '1298223-8': 'Правительство Российской Федерации',
  '1180448-7':
    'Депутаты Государственной Думы Е.Г.Драпеко, Г.П.Хованская, В.И.Афонский, Д.А.Ионин, О.М.Казакова, П.Р.Качкаев, А.М.Шолохов',
};
export const iniInfo = (
  s?: string,
): {
  label: string;
  segs: { k: 'dep' | 'sen' | 'org'; pl: boolean; body: string; orgs: string[] }[];
  solo: boolean;
} | null => {
  if (!s || !s.trim()) return null;
  const segs = s
    .split(/;\s*/)
    .filter((x) => x.trim())
    .map((seg) => {
      const mm = seg.match(
        /^(Депутаты Государственной Думы|Депутат Государственной Думы|Сенаторы Российской Федерации|Сенатор Российской Федерации)[\s,:]*/,
      );
      if (mm)
        return {
          k: (/^Депутат/.test(mm[1]) ? 'dep' : 'sen') as 'dep' | 'sen',
          pl: /^(Депутаты|Сенаторы)/.test(mm[1]),
          body: seg.slice(mm[0].length).trim(),
          orgs: [] as string[],
        };
      const orgs = seg
        .split(/,\s*(?=[А-ЯЁ])/)
        .map((x) => x.trim())
        .filter(Boolean);
      return { k: 'org' as const, pl: orgs.length > 1, body: seg.trim(), orgs };
    });
  const ord = { dep: 0, sen: 1, org: 2 } as const;
  segs.sort((x, y) => ord[x.k] - ord[y.k]);
  const fed = (o: string) =>
    /^(Правительство|Президент|Верховный Суд|Конституционный Суд|Совет Федерации|Генеральный прокурор|Центральная избирательная|Счетная палата|Уполномоченный)/.test(
      o,
    );
  const n = segs.reduce((a, g) => a + (g.k === 'org' ? g.orgs.length : g.pl ? 2 : 1), 0);
  const solo = segs.length === 1 && segs[0].k === 'org' && segs[0].orgs.length === 1;
  const types: string[] = [];
  segs.forEach((g) => {
    if (g.k === 'dep') types.push(g.pl ? 'депутаты Государственной Думы' : 'депутат Государственной Думы');
    else if (g.k === 'sen') types.push(g.pl ? 'сенаторы Российской Федерации' : 'сенатор Российской Федерации');
    else if (solo) types.push(g.orgs[0]);
    else {
      const f = g.orgs.filter(fed),
        r = g.orgs.filter((o) => !fed(o));
      f.forEach((o) => types.push(o));
      if (r.length)
        types.push(
          r.length > 1
            ? 'законодательные органы субъектов Российской Федерации'
            : 'законодательный орган субъекта Российской Федерации',
        );
    }
  });
  const tt = types.length > 1 ? types.slice(0, -1).join(', ') + ' и ' + types[types.length - 1] : types[0];
  return { label: (n > 1 ? 'Инициаторы' : 'Инициатор') + ' — ' + tt, segs, solo };
};
export const FT: Record<string, string> = {};
export function ftScan(o: any): void {
  if (Array.isArray(o)) {
    if (
      typeof o[0] === 'string' &&
      /^\d+-\d$/.test(o[0]) &&
      typeof o[4] === 'string' &&
      !/…$/.test(o[4]) &&
      o[4].length > (FT[o[0]] || '').length
    )
      FT[o[0]] = o[4];
    else o.forEach(ftScan);
  } else if (o && typeof o === 'object') Object.values(o).forEach(ftScan);
}
export const FFULL: Record<string, string> = {
  ЕР: '«Единая Россия»',
  КПРФ: 'КПРФ',
  ЛДПР: 'ЛДПР',
  НЛ: '«Новые люди»',
  СРЗП: '«Справедливая Россия — За правду»',
};
/* 13.11.2026: голосование об отклонении законопроекта — пометка «к отклонению» (vote.duma.gov.ru) или итог «отклонен» при «за» не меньше
   нужного числа голосов: тогда «за» — это «за отклонение», и карточка так и подписывает голоса */
export function rejMot(v: Vote): boolean {
  if (/^к отклонению/.test(v.reading || '')) return true;
  const need = /федеральн\S* конституционн/i.test(v.full || '') ? 300 : 226;
  return !v.ok && (v.total[0] || 0) >= need;
}
/* 16.11.2026: «Вопрос голосования» в карточке — что именно решали этим голосованием, по стадии на vote.duma.gov.ru
   (поле «чтение») и признаку голосования об отклонении (rejMot). Для неизвестной стадии («—») вопрос не показываем. */
export function voteQ(v: Vote): string | null {
  const r = (v.reading || '').trim();
  const n = (r.match(/^(\d)/) || [])[1];
  if (rejMot(v))
    return n === '2' || n === '3' ? 'Отклонить законопроект, принятый в первом чтении' : 'Отклонить законопроект';
  const tb = r.match(/таб\.\s*(\d+)\s*(принятые|отклоненные)/);
  if (tb)
    return `Одобрить таблицу поправок № ${tb[1]}, рекомендованных к ${tb[2] === 'принятые' ? 'принятию' : 'отклонению'}`;
  if (n === '1') return 'Принять законопроект в первом чтении';
  if (n === '2') return 'Принять законопроект во втором чтении';
  if (n === '3') return 'Принять закон в третьем чтении';
  return null;
}
export const REJ_CATS = ['За отклонение', 'Против отклонения', 'Воздержались', 'Не голосовали'];
export const REJ_CATS_S = ['За откл.', 'Против', 'Воздер.', 'Не голос.'];
export const READW: Record<string, string> = {
  '1-е': 'первое чтение',
  '2-е': 'второе чтение',
  '3-е': 'третье чтение',
  '2-е, поправки': 'второе чтение',
};
export const readWord = (r: string) => {
  const n = normRead(r);
  return (n && READW[n]) || '';
};
export const setOMS = (p: Partial<typeof OMS>) => {
  Object.assign(OMS, p);
  OML.forEach((f) => f());
};
export function useOMS() {
  const [, u] = useState(0);
  useEffect(() => {
    const f = () => u((x: number) => x + 1);
    OML.add(f);
    return () => {
      OML.delete(f);
    };
  }, []);
  return OMS;
}
/* П5 (12.11.2026): все официальные источники сайта — для подвала */
/* П13 (12.11.2026): адрес RSS-ленты метки — тот же slug, что в web/extras.mjs */
export const TRL: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};
export const tagSlug = (v: string) =>
  v
    .toLowerCase()
    .split('')
    .map((c) => (c in TRL ? TRL[c] : /[a-z0-9]/.test(c) ? c : '-'))
    .join('')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
export const SRCS: [string, string][] = [
  ['vote.duma.gov.ru', 'http://vote.duma.gov.ru/'],
  ['sozd.duma.gov.ru', 'https://sozd.duma.gov.ru/'],
  ['duma.gov.ru', 'http://duma.gov.ru/'],
  ['council.gov.ru', 'http://council.gov.ru/'],
  ['government.ru', 'http://government.ru/'],
  ['kremlin.ru', 'http://kremlin.ru/'],
  ['publication.pravo.gov.ru', 'http://publication.pravo.gov.ru/'],
  ['cbr.ru', 'https://www.cbr.ru/'],
  ['minfin.gov.ru', 'https://minfin.gov.ru/'],
  ['mintrud.gov.ru', 'https://mintrud.gov.ru/'],
  ['minjust.gov.ru', 'https://minjust.gov.ru/'],
];
export const pd = (s: string) => new Date(+s.slice(6, 10), +s.slice(3, 5) - 1, +s.slice(0, 2));
export const fd = (x: Date) =>
  `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`;
export const calCk = (dt: Date) => `${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
export const AGSH: Record<string, string> = {
  '1291843-8': 'Больничные для иностранцев',
  '1205970-8': 'Сервис рассрочки',
  '1246473-8': 'Централизованная кадровая работа',
  '332027-8': 'Продажа вина через Почту России',
  '332033-8': 'Дистанционная продажа вина',
  '1327114-8': 'Архивное дело',
  '1249111-8': 'Ответственность почты за платежки',
  '1240307-8': 'Права на секреты производства',
  '1155849-8': 'Воспрепятствование временной администрации банка',
  '1285685-8': 'Арбитражные суды: дела суда по интеллектуальным правам',
  '1285676-8': 'Подсудность дел суду по интеллектуальным правам',
  '1244384-8': 'Закупки в новых регионах: продление особого порядка',
  '1291625-8': 'Вознаграждение экспертам в судах',
  '1342002-8': 'Совершенствование исполнительного производства',
  '460-9': 'Биометрические данные подозреваемых и осужденных',
  '1336581-8': 'Цифровизация субсидий госкорпорациям',
  '12840-9': 'Персонифицированный учет: статья 16',
  '12837-9': 'Генотерапевтические и биотехнологические препараты',
  '1342000-8': 'Незаконная добыча драгоценных металлов',
  '6473-9': 'Зачет выслуги лет: статья 18',
  '1280069-8': 'Ценообразование в сфере культурного наследия',
  '1346901-8': 'Терминология в космической деятельности',
  '1261472-8': 'Меры пресечения в УПК',
  '879295-8': 'Фиктивный брак иностранца: штраф',
  '1180161-8': 'Штрафы по статье 18.8: рост в десять раз',
  '641658-8': 'Избирательные гарантии: изменения законов о выборах',
  '1034862-8': 'Ограничение пассивного избирательного права',
  '1271176-8': 'Субсидиарная ответственность при банкротстве',
  '1013677-8': 'Повышение фиксированной выплаты: право установления',
  '1050712-8': 'Повышение фиксированной выплаты к пенсии',
  '1291541-8': 'Ежегодная доплата к страховой пенсии',
  '1215364-8': 'Льготы чернобыльцам: статьи 14 и 15',
  '1234743-8': 'Трудовые отношения и занятость',
  '1235026-8': 'Ветераны труда: многодетные матери',
  '875729-8': 'Гарантии детям-сиротам: перечень категорий',
  '1283105-8': 'Материнский капитал: направление на услуги',
  '818602-8': 'Назначение пособия при рождении ребенка',
  '960784-8': 'Продление выплаты пособия на ребенка',
  '1188714-8': 'Мораторий на цены лекарств до 2028 года',
  '1251624-8': 'Компенсация стоимости лекарств пенсионерам',
  '1245142-8': 'Поддержка ремесленной деятельности',
  '1221581-8': 'Платные парковки: использование',
  '1211219-8': 'Плата за пользование парковками',
  '1165791-8': 'Запрет менять тарифы авиаперевозчиков',
  '978982-8': 'Снятие охраны с объектов наследия',
  '1156949-8': 'Противогололедные химические вещества',
  '1035023-8': 'Запрещенная информация: статьи 10.6 и 15.1',
  '705555-8': 'Нежелательность пребывания иностранца',
  '685603-8': 'Упрощенное проживание членов семей иностранцев',
  '966300-8': 'Требования к въезжающим иностранцам',
  '1012282-8': 'Въезд членов семей иностранных работников',
  '944410-8': 'Последствия выдворения и депортации',
  '486510-8': 'Отмена патентной системы для иностранцев',
  '1261454-8': 'Сроки внешнего управления и банкротства',
};
/* 19.11.2026 (решение владельца): у законопроекта бывает несколько голосований за день (таблицы поправок, 2-е и 3-е чтение). Карточка показывает выбранное: по ссылке ?d=&v= — именно это голосование, иначе — итоговое за день (последнее не по таблице поправок); переключатель VoteSw в карточке меняет выбор (VSEL). */
export const VSEL: Record<string, string> = {};
export const VSUB = new Set<() => void>();
export function setVsel(d: string, bn: string, id: string) {
  VSEL[d + '|' + bn] = id;
  VSUB.forEach((f) => f());
}
export function useVsel(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const f = () => setN((x) => x + 1);
    VSUB.add(f);
    return () => {
      VSUB.delete(f);
    };
  }, []);
  return n;
}
export const voteLbl = (r: string): string => {
  const m = /таб\.\s*(\d+)\s*(\S+)?/.exec(r || '');
  if (m) return `Поправки, табл. ${m[1]}${m[2] ? ` (${m[2]})` : ''}`;
  const n = normRead(r || '');
  return RD[n] || n || 'голосование';
};
export const RD: Record<string, string> = {
  '1-е': '1-е чтение',
  '2-е': '2-е чтение',
  '3-е': '3-е чтение',
  '2-е, поправки': '2-е чтение',
  отклонение: 'отклонение',
  ратификация: 'ратификация',
};
export const RSTAT: Record<string, number> = {};
/* 12.11.2026 (пункт 11): фильтры и поиск в адресе страницы — ?q=слова&w=Для кого&t=Тема&c=Что меняется (каждое значение отдельным параметром)&org=gd,sf (органы; org=none — ни одного).
   Ссылка «Поделиться» ?d=ДД.ММ.ГГГГ&v=номер главнее: если в адресе есть d и v, параметры фильтров при открытии не применяются (карточка всегда открывается). */
export const URLF = !!QS && !(QS.get('d') && QS.get('v'));
export const stuckFrame = (bg: string, col: string, r: number, bw: number, lw: number, lcol: string, gut = 0) => [
  ...(gut
    ? [0, 1].map((q) => (
        <span
          key={'g' + q}
          aria-hidden
          style={{
            position: 'absolute',
            top: -bw - 8,
            bottom: 0,
            [q ? 'right' : 'left']: -(q ? bw : lw) - gut,
            width: gut,
            background: bg,
            pointerEvents: 'none',
          }}
        />
      ))
    : []),
  ...(gut
    ? [
        <span
          key="gt"
          aria-hidden
          style={{
            position: 'absolute',
            top: -bw - 8,
            height: 8,
            left: -lw,
            right: -bw,
            background: bg,
            pointerEvents: 'none',
          }}
        />,
      ]
    : []),
  ...[0, 1].map((q) => (
    <span
      key={'c' + q}
      aria-hidden
      style={{
        position: 'absolute',
        top: -bw,
        [q ? 'right' : 'left']: q ? -bw : -lw,
        width: r,
        height: r,
        pointerEvents: 'none',
        background: `radial-gradient(circle at ${q ? 0 : r}px ${r}px, transparent ${r - 0.5}px, ${bg} ${r}px)`,
      }}
    />
  )),
  <span
    key="b"
    aria-hidden
    style={{
      position: 'absolute',
      top: -bw,
      left: -lw,
      right: -bw,
      bottom: 0,
      boxSizing: 'border-box',
      borderTop: `${bw}px solid ${col}`,
      borderLeft: `${lw}px solid ${lcol}`,
      borderRight: `${bw}px solid ${col}`,
      borderRadius: `${r}px ${r}px 0 0`,
      pointerEvents: 'none',
    }}
  />,
];
export const pinCorners = (bg: string, u = 0) =>
  [0, 1].map((r) => (
    <span
      key={r}
      aria-hidden
      style={{
        position: 'absolute',
        top: -u,
        [r ? 'right' : 'left']: 0,
        width: 12,
        height: 12 + u,
        pointerEvents: 'none',
        background: `radial-gradient(circle at ${r ? '0' : '12px'} ${12 + u}px, transparent 11.5px, ${bg} 12px)`,
      }}
    />
  ));
export function PinSpacer({ q }: { q: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sp = ref.current;
    if (!sp) return;
    let last = -1;
    const f = () => {
      const c = document.querySelector(q) as HTMLElement | null;
      const pe = sp.parentElement;
      if (!c || !pe) return;
      const pr = pe.getBoundingClientRect();
      const k = pe.offsetWidth ? pr.width / pe.offsetWidth : 1;
      const se = document.scrollingElement || document.documentElement;
      const sr = sp.getBoundingClientRect();
      const tail = se.scrollHeight - (sr.bottom + window.scrollY);
      const need = Math.max(0, window.innerHeight - svTop() - (sr.top - c.getBoundingClientRect().top) - tail);
      const h = Math.ceil(need / k);
      if (h !== last) {
        last = h;
        sp.style.height = h + 'px';
      }
    };
    f();
    const ro = new ResizeObserver(f);
    const c = document.querySelector(q);
    if (c) ro.observe(c);
    window.addEventListener('resize', f);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', f);
    };
  }, [q]);
  return <div ref={ref} aria-hidden style={{ height: 0 }} />;
}
/* 16.11.2026 (решение владельца): на телефоне сетка календаря — не над списком, а в окне у круглой кнопки справа внизу.
   Окно «вытягивается» из кнопки и «втягивается» обратно (как окно в док macOS): само окно сужается к кнопке, клетки дней летят в нее по очереди. */
export const GEN0 = {
  clipPath: 'polygon(84% 100%,100% 100%,100% 100%,84% 100%)',
  transform: 'translateY(46px) scale(.16,.04)',
  opacity: 0.15,
};
export const GEN1 = {
  clipPath: 'polygon(52% 0%,100% 0%,100% 100%,78% 100%)',
  transform: 'translateY(14px) scale(.62,.78)',
  opacity: 1,
};
export const GEN2 = { clipPath: 'polygon(0% 0%,100% 0%,100% 100%,0% 100%)', transform: 'none', opacity: 1 };
export function calGenie(c: HTMLElement, out: boolean, done: () => void) {
  let rm = false;
  try {
    rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    /* нет matchMedia */
  }
  if (rm || typeof c.animate !== 'function') {
    done();
    return;
  }
  const fab = document.querySelector('[data-calfab]') as HTMLElement | null;
  const f = fab ? fab.getBoundingClientRect() : c.getBoundingClientRect();
  const fx = f.left + f.width / 2,
    fy = f.top + f.height / 2;
  /* только видимые клетки: дни соседнего месяца в сетке скрыты и мигать не должны */
  const els = ([...c.querySelectorAll('[data-calgrid] [role=button]')] as HTMLElement[]).filter((e) => {
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.opacity !== '0' && e.offsetWidth > 0;
  });
  const ds = els.map((e) => {
    const r = e.getBoundingClientRect();
    return { e, o: +getComputedStyle(e).opacity, dx: fx - (r.left + r.width / 2), dy: fy - (r.top + r.height / 2) };
  });
  const mx = Math.max(1, ...ds.map((d) => Math.hypot(d.dx, d.dy)));
  const span = out ? 170 : 230;
  const cs = ds.map((d) => {
    const k = Math.hypot(d.dx, d.dy) / mx;
    const gone = { transform: `translate(${d.dx * 0.55}px,${d.dy * 0.55}px) scale(.1)`, opacity: 0 },
      here = { transform: 'none', opacity: d.o };
    return d.e.animate(out ? [here, gone] : [gone, here], {
      duration: out ? 230 : 300,
      delay: (out ? 0 : 150) + k * span,
      easing: out ? 'cubic-bezier(.5,0,.9,.4)' : 'cubic-bezier(.2,.8,.2,1.1)',
      fill: 'both',
    });
  });
  const a = c.animate(out ? [GEN2, { ...GEN1, offset: 0.45 }, GEN0] : [GEN0, { ...GEN1, offset: 0.5 }, GEN2], {
    duration: out ? 380 : 460,
    delay: out ? 170 : 0,
    easing: out ? 'cubic-bezier(.5,0,.8,.4)' : 'cubic-bezier(.2,.7,.2,1)',
    fill: out ? 'forwards' : 'none',
  });
  let fin = false;
  const end = () => {
    if (fin) return;
    fin = true;
    done();
    a.cancel();
    cs.forEach((x) => x.cancel());
  };
  if (out) {
    a.onfinish = end;
    a.oncancel = end;
  } else setTimeout(end, 720);
}
