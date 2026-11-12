/* Приостановленный «Новый вид» (MaketApp, ShablonApp, buildMkD, MK_EXTRA, MK_X, ViewToggle).
 * Вынесен из src/canvas.tsx 12.11.2026 (пункт 9), чтобы не попадать в сборку сайта (web/build.sh → app.<hash>.js).
 * Этот файл НИКУДА не импортируется и не собирается: это фрагмент src/canvas.tsx, он использует его внутренние
 * константы и функции (cardText, fullT, parse, iniView, INI_ADD, billNo, NV, VT, TRACK, T300, ORG, ORGN, DATA,
 * INFO, LAWS, CAL, ZTAG, PLAIN, TX, F, Segmented, useGT0, MkSection/MkTable/MkRows).
 * Данные MK_EXTRA — срез на 12.11.2026, конвейер их не обновляет.
 *
 * Как вернуть (пункт 14, только по решению пользователя):
 *   1) вставить содержимое ниже в src/canvas.tsx перед «export default function App»;
 *   2) вернуть в импорт из 'grok/canvas': Section as MkSection, Table as MkTable, Rows as MkRows
 *      (заглушки Section/Table/Rows остались в web/grok-canvas.tsx);
 *   3) отрисовать <ViewToggle/> и <ShablonApp/> в App.
 */
// ===== Вкладка «Новый вид (макет)»: макет Нового бота в собственной области видимости =====
const MaketApp = (() => {
const Section = MkSection, Table = MkTable, Rows = MkRows, useGrokTheme = useGT0;

type Org = 'gd' | 'sf' | 'gov' | 'pres' | 'minfin' | 'mintrud' | 'minjust' | 'cbr';
type Tone2 = 'plan' | 'ok' | 'rej' | 'force' | 'pub';
type Bill = { no: string; short: string; full: string; rd: string; sut: string[]; who: string; ini: string; com: string; inD: string; komD: string; tags: string[] };
type Doc = { id: string; day: string; org: Org; work: string; workMeta?: string; topic: string; kind: string; no?: string; title: string; st: string; tone: Tone2; sut?: string[]; who?: string; note?: string; dates: [string, string][]; src: [string, string][]; bill?: Bill };

const COK: Org[] = ['gd', 'sf', 'gov', 'pres', 'minfin', 'mintrud', 'minjust', 'cbr'];
const CON: Record<Org, string> = { gd: 'Госдума', sf: 'Совет Федерации', gov: 'Правительство', pres: 'Президент', minfin: 'Минфин', mintrud: 'Минтруд', minjust: 'Минюст', cbr: 'Банк России' };
const DAYS = ['10.11.2026', '06.11.2026', '03.11.2026'];
const DAYL: Record<string, string> = { '10.11.2026': '10 ноября, вторник', '06.11.2026': '6 ноября, пятница', '03.11.2026': '3 ноября, вторник' };
const TOPICS = ['Законопроекты', 'Заседания', 'Приказы и указания', 'Решения Правительства', 'Новости ведомств'];
const DUMA_SRC = 'sozd: решение Совета ГД 26.10 включить законопроект 1249111-8 в порядок работы на 10.11.2026';
const GOV_URL = 'http://government.ru/meetings/60350/';

const BILLS: Bill[] = [
  { no: '1327114-8', short: 'Архивное дело', full: 'О внесении изменений в Федеральный закон "Об архивном деле в Российской Федерации" (в части уточнения отдельных положений Федерального закона)', rd: '1-е чтение',
    sut: ['Законопроект уточняет отдельные положения Федерального закона «Об архивном деле в Российской Федерации». Он подготовлен в связи с вступлением в силу с 1 января 2028 года Федерального закона от 20 марта 2025 года № 33-ФЗ «Об общих принципах организации местного самоуправления в единой системе публичной власти».', 'В пояснительной записке отдельно описаны особенности архивного дела в городах федерального значения Москве, Санкт-Петербурге и Севастополе, где самостоятельные муниципальные архивы не созданы, а документы Архивного фонда поступают в государственные архивы этих субъектов.'],
    who: 'Муниципальные архивы и органы местного самоуправления, в том числе во внутригородских муниципальных образованиях Москвы, Санкт-Петербурга и Севастополя.', ini: 'Правительство Российской Федерации', com: 'Комитет по культуре', inD: '27.08.2026', komD: '31.08.2026', tags: [] },
  { no: '1249111-8', short: 'Ответственность почты за платежки', full: 'О внесении изменений в Кодекс Российской Федерации об административных правонарушениях (об установлении ответственности за нарушение организацией федеральной почтовой связи порядка направления платежных документов и информации о размере платы)', rd: '1-е чтение',
    sut: ['Законопроектом предлагается внести изменения в Кодекс Российской Федерации об административных правонарушениях, в том числе дополнить главу 13 статьей 13.19.7. Эта статья вводит административную ответственность за нарушение организациями федеральной почтовой связи порядка направления платежных документов и информации о размере платы, предусмотренных жилищным законодательством.', 'Особый порядок вступления в силу нужен, чтобы дать переходный период на обеспечение работы информационной системы организации федеральной почтовой связи по направлению таких документов.'],
    who: 'Организации федеральной почтовой связи, в том числе АО «Почта России». Собственники жилых помещений, которым направляют платежные документы и сведения о размере платы.', ini: 'Правительство Российской Федерации', com: 'Комитет по уголовному и административному законодательству', inD: '01.06.2026', komD: '03.06.2026', tags: ['Владельцы жилья и арендаторы', 'Жилье и ЖКХ'] },
  { no: '1240307-8', short: 'Права на секреты производства', full: 'О внесении изменений в статью 1471 части четвертой Гражданского кодекса Российской Федерации (о правах на секреты производства, полученные при выполнении договоров)', rd: '1-е чтение',
    sut: ['Законопроект меняет статью 1471 Гражданского кодекса Российской Федерации: стороны договора подряда или договора на выполнение научно-исследовательских, опытно-конструкторских и технологических работ (далее - договор НИОКТР), если это не государственный или муниципальный контракт, смогут сами определить в договоре, кому принадлежит исключительное право на секрет производства (ноу-хау), полученный при выполнении работ.', 'Сейчас такое право по общему правилу всегда у подрядчика (исполнителя). Для изобретений, промышленных образцов, полезных моделей и топологий интегральных микросхем такой выбор в договоре уже предусмотрен. Для контрактов на государственные или муниципальные нужды действующий порядок сохраняется.'],
    who: 'Заказчики и подрядчики (исполнители) по договорам подряда и договорам НИОКТР между частными лицами. На распределение прав по государственным и муниципальным контрактам это не распространяется.', ini: 'Правительство Российской Федерации', com: 'Комитет по конституционному, гражданскому законодательству и судоустройству', inD: '21.05.2026', komD: '22.05.2026', tags: [] },
];

const gq = (n: number, short: string, q: string, dec: string, st: string, extra?: string[], who?: string, src2?: [string, string]): Doc => ({
  id: 'gov37-' + n, day: '03.11.2026', org: 'gov', work: 'Заседание Правительства № 37', workMeta: 'повестка: 6 вопросов', topic: 'Решения Правительства',
  kind: 'Вопрос повестки заседания', no: 'п. ' + n, title: short, st, tone: 'ok', sut: [q, 'Решение: ' + dec, ...(extra || [])], who,
  dates: [['Заседание Правительства', '03.11.2026']], src: [[GOV_URL, 'Материалы заседания на government.ru'], ...(src2 ? [src2] : [])],
});

const DOCS: Doc[] = [
  ...BILLS.map((b): Doc => ({ id: 'gd-' + b.no, day: '10.11.2026', org: 'gd', work: 'Пленарное заседание', workMeta: 'повестка: 3 законопроекта', topic: 'Законопроекты', kind: 'Законопроект', no: b.no, title: b.short, st: 'запланировано', tone: 'plan', sut: b.sut, who: b.who, dates: [['Внесен', b.inD], ['1-е чтение (план)', '10.11.2026']], src: [['https://sozd.duma.gov.ru/bill/' + b.no, 'sozd.duma.gov.ru']], bill: b })),
  { id: 'sf622', day: '10.11.2026', org: 'sf', work: '622-е заседание Совета Федерации', workMeta: 'начало в 11:00', topic: 'Заседания', kind: 'Заседание Совета Федерации', no: '№ 622',
    title: 'Законы о ратификации, консультации по кандидатуре заместителя Генпрокурора, «правительственный час»', st: 'запланировано', tone: 'plan',
    sut: ['В повестке — 6 федеральных законов о ратификации международных договоров (с Зимбабве, Камбоджей, два с Никарагуа, протокол с Беларусью о косвенных налогах, соглашение с Южной Осетией), консультации по кандидатуре заместителя Генпрокурора и «правительственный час» с министром внутренних дел о противодействии незаконной миграции.'],
    note: 'Повестка — проект от 09.11.2026. Итоги голосования на момент сбора не опубликованы; это не означает, что законы одобрены.',
    dates: [['Заседание', '10.11.2026'], ['Проект повестки', '09.11.2026']],
    src: [['http://council.gov.ru/activity/meetings/178174/agenda/', 'Повестка заседания, проект: пункты 3–8 — федеральные законы о ратификации'], ['http://council.gov.ru/events/smi/announcements/178175/', '«Состоится 622 заседание… Начало в 11:00»']] },
  { id: 'mt500', day: '06.11.2026', org: 'mintrud', work: 'Приказы Минтруда', topic: 'Приказы и указания', kind: 'Приказ Минтруда России от 05.11.2026', no: '№ 500', title: 'Изменен состав коллегии Минтруда', st: 'издан', tone: 'ok',
    sut: ['О внесении изменений в состав коллегии Министерства труда и социальной защиты Российской Федерации.', 'В коллегию министерства включены директора департаментов И. А. Пархоменко, А. М. Соколов и А. В. Терехина; из состава исключена С. В. Привезенцева.'],
    who: 'Касается только состава коллегии министерства.', dates: [['Подписан', '05.11.2026'], ['Опубликован на сайте Минтруда', '06.11.2026']],
    src: [['https://mintrud.gov.ru/docs/mintrud/orders/3276', '«а) включить в состав коллегии… б) исключить из состава коллегии Привезенцеву С.В.»']] },
  { id: 'mt357', day: '06.11.2026', org: 'mintrud', work: 'Приказы Минтруда', topic: 'Приказы и указания', kind: 'Приказ Минтруда России от 17.08.2026', no: '№ 357н', title: 'Новая форма сведений о лицевом счете (СЗИ-ИЛСЗЛ)', st: 'вступает в силу 01.01.2027', tone: 'force',
    sut: ['Утверждена форма СЗИ-ИЛСЗЛ «Сведения о состоянии индивидуального лицевого счета зарегистрированного лица». Прежняя форма СЗИ-ИЛС (приказ № 2н от 2019 года и изменения к нему № 93н и № 154н) утрачивает силу.'],
    who: 'Зарегистрированные лица в системе индивидуального (персонифицированного) учета — форма сведений об их лицевом счете.', dates: [['Подписан', '17.08.2026'], ['Опубликован на сайте Минтруда', '06.11.2026'], ['Вступает в силу', '01.01.2027']],
    src: [['https://mintrud.gov.ru/docs/mintrud/orders/3277', '«Утвердить форму… (форма СЗИ-ИЛСЗЛ)… Установить, что настоящий приказ вступает в силу с 1 января 2027 года»']] },
  { id: 'cb7441', day: '06.11.2026', org: 'cbr', work: 'Документы Банка России', topic: 'Приказы и указания', kind: 'Указание Банка России от 11.09.2026', no: '№ 7441-У', title: 'Покупка криптовалют неквалифицированными инвесторами через брокера', st: 'издано, зарегистрировано', tone: 'ok',
    sut: ['Определяет, как считать стоимость криптовалют, купленных через брокера неквалифицированным инвестором за календарный год, и предельную сумму таких покупок; устанавливает перечень криптовалют и иностранных цифровых инструментов, которые организатор торговли может допустить к публичному обращению.'],
    who: 'Неквалифицированные инвесторы — резиденты, брокеры и организаторы торгов.', dates: [['Подписано', '11.09.2026'], ['Зарегистрировано Минюстом', '30.10.2026, № 88991'], ['Опубликовано на сайте ЦБ', '06.11.2026']],
    src: [['https://www.cbr.ru/Queries/UniDbQuery/File/90134/8618', 'PDF, с. 1: заголовок, № 7441-У от 11.09.2026, штамп «Зарегистрировано № 88991 от 30 октября 2026»']] },
  { id: 'cbnews', day: '06.11.2026', org: 'cbr', work: 'Документы Банка России', topic: 'Новости ведомств', kind: 'Новость Банка России', title: 'Какие криптовалюты станут доступны неквалифицированным инвесторам', st: 'опубликовано', tone: 'pub',
    sut: ['В перечень вошли биткоин, эфир и USD Tether. Указание вступает в силу с 17 ноября: с этого дня биржи вправе допускать эти активы к публичному обращению. Покупать можно через брокера, управляющего или криптообменник — не более 300 тыс. рублей в год через одного посредника; перед сделкой нужно пройти тестирование.'],
    who: 'Неквалифицированные инвесторы, биржи и посредники: брокеры, управляющие, криптообменники.', dates: [['Опубликовано на сайте ЦБ', '06.11.2026'], ['Указание вступает в силу', '17.11.2026']],
    src: [['https://www.cbr.ru/press/event/?id=32964', '«В него вошли биткоин (Bitcoin), эфир (Ethereum Ether) и «Ю Эс Ди Тезер» (USD Tether)… не более 300 тыс. рублей в год»']] },
  gq(1, 'Изменение постановления Правительства от 2 июня 2008 года № 418', 'О внесении изменения в постановление Правительства Российской Федерации от 2 июня 2008 года №418', 'Принять проект постановления Правительства Российской Федерации по данному вопросу.', 'принят'),
  gq(2, 'Субсидия ДОМ.РФ: возмещение доходов по IT-ипотеке', 'О выделении Минцифры России в 2026 году из резервного фонда Правительства Российской Федерации бюджетных ассигнований для предоставления публичному акционерному обществу «ДОМ.РФ» субсидии в виде вклада в имущество, не увеличивающего его уставный капитал, на цели возмещения кредитным и иным организациям недополученных доходов по жилищным (ипотечным) кредитам (займам), выданным работникам аккредитованных организаций, осуществляющих деятельность в области информационных технологий', 'Принять проект распоряжения Правительства Российской Федерации по данному вопросу.', 'принят'),
  gq(3, 'Восстановление дорог в Дагестане и Чечне после паводков 2026 года', 'О выделении Росавтодору в 2026 году из резервного фонда Правительства Российской Федерации бюджетных ассигнований на предоставление иных межбюджетных трансфертов из федерального бюджета бюджетам Республики Дагестан и Чеченской Республики на реализацию мероприятий по восстановлению автомобильных дорог регионального или межмуниципального и местного значения, поврежденных в результате паводков, произошедших в 2026 году', 'Принять проект распоряжения Правительства Российской Федерации по данному вопросу.', 'принят'),
  gq(4, 'Поправки Правительства к законопроекту № 1209623-8 об охране здоровья', 'О проекте поправок Правительства Российской Федерации к проекту федерального закона №1209623-8 «О внесении изменений в Федеральный закон “Об основах охраны здоровья граждан в Российской Федерации”»', 'Одобрить проект поправок и направить их в Государственную Думу в установленном порядке.', 'одобрено'),
  gq(5, 'Отмена актов в части Положения о Минтруде', 'О признании утратившими силу некоторых актов Правительства Российской Федерации (в части внесения изменений в Положение о Министерстве труда и социальной защиты Российской Федерации)', 'Принять проект постановления Правительства Российской Федерации по данному вопросу.', 'принят'),
  gq(6, 'Субсидии регионам на озимые под урожай 2027 года', 'О выделении Минсельхозу России в 2026 году из резервного фонда Правительства Российской Федерации бюджетных ассигнований на предоставление субсидий бюджетам субъектов Российской Федерации на возмещение сельхозпроизводителям части затрат на агротехнологические работы при возделывании озимых зерновых культур под урожай 2027 года', 'Принять проект распоряжения Правительства Российской Федерации по данному вопросу.', 'принят', ['Более 13 млрд руб. на агротехнологические работы под озимые для 22 регионов (более 5,5 млн га).'], 'Аграрии, пострадавшие от сбоев логистики в Азово-Черноморском бассейне.', ['http://government.ru/news/60357/', 'Новость о заседании на government.ru']),
  { id: 'gov-radio', day: '03.11.2026', org: 'gov', work: 'Решения и распоряжения', topic: 'Решения Правительства', kind: 'Решение Правительства', title: 'Расширен перечень продукции для налогового режима производителей радиоэлектроники', st: 'принято', tone: 'ok',
    sut: ['Расширен перечень продукции для налогового режима производителей радиоэлектроники (пониженная ставка налога на прибыль и страховых взносов): оборудование для печатных пластин, полупроводниковые слитки и пластины, интегральные схемы, дисплеи; льготы по взносам — для производителей ряда лазерных систем.'],
    who: 'Производители радиоэлектроники, в том числе ряда лазерных систем.', dates: [['Сообщено на government.ru', '03.11.2026']], src: [['http://government.ru/news/60357/', 'government.ru/news/60357']] },
  { id: 'gov-3166', day: '03.11.2026', org: 'gov', work: 'Решения и распоряжения', topic: 'Решения Правительства', kind: 'Распоряжение Правительства', no: '№ 3166-р', title: 'Около 600 млн руб. на завершение рыбного порта в Корсакове', st: 'подписано', tone: 'ok',
    sut: ['Около 600 млн руб. на завершение строительства рыбного порта в морском порту Корсаков (Сахалинская область); порт войдет в Трансарктический транспортный коридор.'],
    dates: [['Подписано', '31.10.2026']], src: [['http://government.ru/docs/60356/', 'government.ru/docs/60356']] },
];

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
const hay = (d: Doc) => norm([d.no || '', d.title, d.kind, d.work, ...(d.sut || []), d.who || '', d.note || '', d.bill ? d.bill.full + ' ' + d.bill.tags.join(' ') : ''].join(' '));
const plural = (n: number, a: string, b: string, c: string) => { const x = n % 100, y = n % 10; return x >= 11 && x <= 14 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; };
const pad = (n: number) => String(n).padStart(2, '0');
const nowD = new Date();
const TODAY = `${pad(nowD.getDate())}.${pad(nowD.getMonth() + 1)}.${nowD.getFullYear()}`;

function App() {
  const [view, setView] = useState<'desk' | 'phone'>('desk');
  return (
    <Page title="Календарь законов — строгий макет" summary="Концепция нового вида на реальных данных за 10, 6 и 3 ноября 2026: иерархия, фильтр органов и поиск работают. Карточки Госдумы показаны без изменений." width="wide">
      <Section heading="Макет" actions={<Segmented options={[{ value: 'desk', label: 'Компьютер' }, { value: 'phone', label: 'Телефон' }]} value={view} onChange={(v: string) => setView(v as 'desk' | 'phone')} />}>
        {view === 'desk' ? <Mock key="d" m={false} /> : <PhoneFrame />}
      </Section>
      <Section heading="Что меняется">
        <Table columns={['Элемент', 'Сейчас', 'В макете']} align={['start', 'start', 'start']} rows={[
          ['Масштаб', 'общее уменьшение страницы (zoom)', 'без zoom: текст 16 px, заголовки карточек 17 px, подписи от 13 px'],
          ['Цвет', 'синие, зеленые, бирюзовые, розовые и янтарные рамки и плашки', 'нейтральная бумага, один синий акцент, цвет статуса только рядом с подписью'],
          ['Поиск', 'при поиске в ленте остаются только события Госдумы', 'единый поиск по всем 8 органам; поиск и типы документов складываются'],
          ['Пустые результаты', '«Ничего не найдено» или «Событий нет»', 'три сообщения: событий нет, данные не собраны, скрыто фильтром'],
          ['Карточки других органов', 'разный порядок полей у Правительства, Совфеда и ведомств', 'один порядок: что это, статус, суть, кого касается, даты, источник'],
          ['Телефон', 'полный месяц над лентой', 'полоса недели, месяц по нажатию, нажимаемые элементы от 44×44 px'],
        ]} />
      </Section>
      <Section heading="Голосование по фракциям: образец таблицы">
        <Table columns={['Фракция', 'За', 'Против', 'Возд.', 'Не голос.', 'Состав']} rows={[
          ['Единая Россия', '327', '0', '0', '23', '350'], ['КПРФ', '0', '0', '1', '36', '37'], ['ЛДПР', '23', '0', '0', '1', '24'],
          ['Новые люди', '19', '0', '0', '1', '20'], ['СРЗП', '14', '0', '0', '3', '17'], ['Вне фракций', '2', '0', '0', '0', '2'],
          [{ text: 'Итого · принят', tone: 'success' }, '385', '0', '1', '64', '450'],
        ]} />
        <Text>Реальное голосование 22.10.2026 по `1272483-8` (Гражданский кодекс, 1-е чтение): 10, 6 и 3 ноября голосований не было. Таблица для сводки дня; панель голосования внутри карточек Госдумы остается прежней.</Text>
      </Section>
      <Section heading="Пустые состояния">
        <Rows rows={[
          { lead: '1', title: 'Событий нет', detail: 'Данные за день собраны, но выбранные органы ничего не опубликовали.' },
          { lead: '2', title: 'Данные по органу не собраны', detail: 'Сбор по органу за дату не проводился или не завершен; рядом дата последней выгрузки.' },
          { lead: '3', title: 'Скрыто фильтром', detail: 'Записи есть, но не подходят под поиск, тип документа или выбор органов; показываем, сколько скрыто.' },
        ]} />
      </Section>
      <Section heading="Что сохраняется">
        <Rows rows={[
          { title: 'Данные и порядок', detail: 'Дни от поздних к ранним, внутри: день → орган → работа → карточка; все уровни изначально свернуты.' },
          { title: 'Фильтр органов', detail: 'По умолчанию выбраны все 8; снятие последней галочки оставляет календарь пустым с подсказкой; «Сбросить» включает все.' },
          { title: 'Карточки Госдумы', detail: 'Вид, номер, тип чтения, звезда, теги, «Суть», трек и «Свернуть» не меняются.' },
        ]} />
      </Section>
    </Page>
  );
}

function PhoneFrame() {
  const t = useGrokTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 390, border: `1px solid ${t.border.strong}`, borderRadius: 32, padding: 8, boxSizing: 'border-box', background: t.bg.subtle }}>
        <div style={{ height: 760, overflowY: 'auto', borderRadius: 26, background: t.bg.base, border: `1px solid ${t.border.subtle}` }}>
          <Mock key="m" m={true} />
        </div>
      </div>
    </div>
  );
}

function StatusLabel({ tone, label }: { tone: Tone2; label: string }) {
  const t = useGrokTheme();
  const c = tone === 'ok' ? t.text.success : tone === 'rej' ? t.text.danger : tone === 'force' ? t.text.accent : tone === 'plan' ? t.text.tertiary : t.text.secondary;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: t.text.secondary, lineHeight: 1.3 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block', flex: 'none' }} />{label}</span>;
}

function Hl({ s, q }: { s: string; q: string }) {
  const t = useGrokTheme();
  if (!q) return <>{s}</>;
  const i = norm(s).indexOf(q);
  if (i < 0) return <>{s}</>;
  return <>{s.slice(0, i)}<mark style={{ background: t.fill.accentSubtle, color: 'inherit', borderRadius: 2 }}>{s.slice(i, i + q.length)}</mark>{s.slice(i + q.length)}</>;
}

function Chev({ open }: { open: boolean }) {
  const t = useGrokTheme();
  return <span aria-hidden style={{ fontSize: 20, lineHeight: 1, color: open ? t.text.accent : t.text.tertiary, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flex: 'none' }}>›</span>;
}

function Mock({ m }: { m: boolean }) {
  const t = useGrokTheme();
  const [q0, setQ] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<Org[]>(COK.slice());
  const [sel, setSel] = useState<string | null>(null);
  const [op, setOp] = useState<Record<string, boolean>>({});
  const [fOpen, setFOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [wk, setWk] = useState(2);
  const q = norm(q0.trim());
  const auto = !!q || topics.length > 0;
  const isOpen = (k: string) => (k in op ? op[k] : auto);
  const tog = (k: string) => setOp({ ...op, [k]: !isOpen(k) });
  const passQT = (d: Doc) => (!topics.length || topics.includes(d.topic)) && (!q || hay(d).includes(q));
  const pass = (d: Doc) => orgs.includes(d.org) && passQT(d);
  const visAll = DOCS.filter(pass);
  const days = DAYS.filter((d) => !sel || d === sel);
  const shown = visAll.filter((d) => days.includes(d.day));
  const markDays = new Set(visAll.map((d) => d.day));
  const allOrg = orgs.length === COK.length;
  const togOrg = (k: Org) => setOrgs(orgs.includes(k) ? orgs.filter((x) => x !== k) : COK.filter((x) => x === k || orgs.includes(x)));
  const togTopic = (k: string) => setTopics(topics.includes(k) ? topics.filter((x) => x !== k) : [...topics, k]);
  const fs = { fontFamily: t.font.family } as CSSProperties;
  const mono = { fontFamily: t.font.mono, fontVariantNumeric: 'tabular-nums' } as CSSProperties;
  const tap = m ? 44 : 36;
  const btn = (on: boolean): CSSProperties => ({ ...fs, minHeight: tap, padding: '0 12px', borderRadius: 8, border: `1px solid ${on ? t.text.accent : t.border.default}`, background: on ? t.fill.accentSubtle : t.bg.base, color: on ? t.text.accent : t.text.primary, fontSize: m ? 15 : 14, cursor: 'pointer' });

  const updLine = <div style={{ fontSize: 13, color: t.text.tertiary, lineHeight: 1.45 }}>Данные обновлены <span style={mono}>10.11.2026</span> · источники: duma.gov.ru, sozd.duma.gov.ru, council.gov.ru, government.ru, mintrud.gov.ru, cbr.ru</div>;

  const search = (
    <div style={{ position: 'relative', flex: '1 1 16rem', minWidth: 0 }}>
      <input value={q0} onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} placeholder="Поиск по всем органам: номер, название, суть" aria-label="Поиск"
        style={{ ...fs, width: '100%', boxSizing: 'border-box', height: m ? 44 : 40, padding: '0 40px 0 12px', fontSize: 16, borderRadius: 8, border: `1px solid ${t.border.default}`, background: t.bg.base, color: t.text.primary, outline: 'none' }} />
      {q0 && <button aria-label="Очистить поиск" onClick={() => setQ('')} style={{ ...fs, position: 'absolute', right: 0, top: 0, width: 44, height: m ? 44 : 40, border: 'none', background: 'transparent', color: t.text.tertiary, fontSize: 18, cursor: 'pointer' }}>×</button>}
    </div>);

  const topicRow = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {TOPICS.map((k) => { const on = topics.includes(k); return <button key={k} aria-pressed={on} onClick={() => togTopic(k)} style={btn(on)}>{k}</button>; })}
    </div>);

  const orgFilter = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: t.weight.semibold, color: t.text.secondary }}>Органы · {allOrg ? 'все' : orgs.length ? `${orgs.length} из 8` : 'не выбрано'}</span>
        <button disabled={allOrg} onClick={() => setOrgs(COK.slice())} style={{ ...btn(false), minHeight: tap, color: allOrg ? t.text.tertiary : t.text.accent, cursor: allOrg ? 'default' : 'pointer', border: 'none', background: 'transparent' }}>Сбросить</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {COK.map((k) => { const n = DOCS.filter((d) => d.org === k && passQT(d)).length; return (
          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: m ? 44 : 34, borderTop: `1px solid ${t.border.subtle}`, cursor: 'pointer', fontSize: m ? 16 : 15, color: t.text.primary }}>
            <input type="checkbox" checked={orgs.includes(k)} onChange={() => togOrg(k)} style={{ width: 18, height: 18, margin: 0, accentColor: t.text.accent }} />
            <span style={{ flex: 1 }}>{CON[k]}</span><span style={{ ...mono, fontSize: 13, color: t.text.tertiary }}>{n || '—'}</span>
          </label>); })}
      </div>
    </div>);

  const legend = <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}><StatusLabel tone="plan" label="запланировано" /><StatusLabel tone="ok" label="принят" /><StatusLabel tone="rej" label="отклонён" /><StatusLabel tone="force" label="вступает в силу" /></div>;

  const dayCell = (dd: number, h: number) => {
    const s = `${pad(dd)}.11.2026`; const on = sel === s; const has = markDays.has(s); const isT = s === TODAY; const we = [6, 0].includes(new Date(2026, 10, dd).getDay());
    return <button key={dd} aria-pressed={on} onClick={() => setSel(on ? null : s)} title={has ? 'Показать события дня' : 'Нет записей в макете'}
      style={{ ...fs, ...mono, position: 'relative', height: h, minWidth: 0, borderRadius: 6, border: isT ? `1px solid ${t.text.accent}` : '1px solid transparent', background: on ? t.text.accent : 'transparent', color: on ? t.text.onColor : we ? t.text.tertiary : t.text.primary, fontSize: 14, cursor: 'pointer', fontWeight: has ? t.weight.semibold : t.weight.regular }}>
      {dd}{has && <i style={{ position: 'absolute', left: '50%', bottom: 5, width: 4, height: 4, marginLeft: -2, borderRadius: 2, background: on ? t.text.onColor : t.text.accent }} />}
    </button>;
  };
  const month = (
    <div>
      {!m && <div style={{ fontSize: 15, fontWeight: t.weight.semibold, marginBottom: 8, color: t.text.primary }}>Ноябрь 2026</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}>
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => <span key={w} style={{ fontSize: 13, textAlign: 'center', color: t.text.tertiary, paddingBottom: 4 }}>{w}</span>)}
        {Array.from({ length: 6 }).map((_, i) => <span key={'e' + i} />)}
        {Array.from({ length: 30 }).map((_, i) => dayCell(i + 1, m ? 44 : 38))}
      </div>
    </div>);
  // weeks of November 2026 starting Mondays: 26.10, 02.11, 09.11, 16.11, 23.11, 30.11
  const wkStart = [-5, 2, 9, 16, 23, 30][wk];
  const weekStrip = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button aria-label="Предыдущая неделя" disabled={wk === 0} onClick={() => setWk(wk - 1)} style={{ ...fs, width: 44, height: 44, border: 'none', background: 'transparent', color: wk === 0 ? t.text.tertiary : t.text.accent, fontSize: 20, cursor: 'pointer', flex: 'none' }}>‹</button>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}>
        {Array.from({ length: 7 }).map((_, i) => { const dd = wkStart + i; const wl = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]; return <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}><span style={{ fontSize: 13, textAlign: 'center', color: t.text.tertiary }}>{wl}</span>{dd >= 1 && dd <= 30 ? dayCell(dd, 44) : <span style={{ ...mono, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: t.text.tertiary }}>{dd < 1 ? 31 + dd : dd - 30}</span>}</div>; })}
      </div>
      <button aria-label="Следующая неделя" disabled={wk === 5} onClick={() => setWk(wk + 1)} style={{ ...fs, width: 44, height: 44, border: 'none', background: 'transparent', color: wk === 5 ? t.text.tertiary : t.text.accent, fontSize: 20, cursor: 'pointer', flex: 'none' }}>›</button>
    </div>);

  const nHidden = (dd: string) => DOCS.filter((d) => d.day === dd).length - DOCS.filter((d) => d.day === dd && pass(d)).length;
  const countLine = <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 12px', fontSize: 13, color: t.text.secondary }}>
    <span>Найдено: <span style={mono}>{shown.length}</span> {plural(shown.length, 'запись', 'записи', 'записей')}{sel ? ` · ${DAYL[sel] || sel}` : ' · 3 дня'}</span>
    {sel && <button onClick={() => setSel(null)} style={{ ...fs, border: 'none', background: 'transparent', color: t.text.accent, fontSize: 13, cursor: 'pointer', minHeight: m ? 44 : 24, padding: 0 }}>Все дни ×</button>}
  </div>;

  const empty = (title: string, detail: string) => <div style={{ padding: '16px 0', borderTop: `1px solid ${t.border.subtle}` }}><div style={{ fontSize: 16, fontWeight: t.weight.semibold, color: t.text.primary }}>{title}</div><div style={{ fontSize: 14, color: t.text.secondary, marginTop: 4, lineHeight: 1.5 }}>{detail}</div></div>;

  const feedBody = (() => {
    if (!orgs.length) return empty('Не выбран ни один орган', 'Календарь пуст. Отметьте хотя бы один орган или нажмите «Сбросить», чтобы снова выбрать все.');
    if (sel && !DAYS.includes(sel)) return empty('Событий нет', `За ${sel.slice(0, 5)} в макете нет записей ни по одному органу.`);
    const out: ReactNode[] = [];
    days.forEach((dd) => {
      const vis = DOCS.filter((d) => d.day === dd && pass(d)); const hid = nHidden(dd);
      if (!vis.length) { if (hid) out.push(<div key={dd} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'baseline', padding: '12px 0', borderTop: `1px solid ${t.border.subtle}`, color: t.text.tertiary }}><span style={{ fontSize: 16 }}>{DAYL[dd]}</span><span style={{ fontSize: 13 }}>скрыто фильтром: {hid}</span></div>); return; }
      const dk = dd; const dO = isOpen(dk); const ks = COK.filter((k) => vis.some((d) => d.org === k));
      out.push(<div key={dd} style={{ borderTop: `1px solid ${t.border.default}` }}>
        <div role="button" tabIndex={0} aria-expanded={dO} onClick={() => tog(dk)} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 12px', minHeight: m ? 56 : 52, padding: '8px 0', cursor: 'pointer' }}>
          <span style={{ fontSize: m ? 17 : 18, fontWeight: t.weight.semibold, color: t.text.primary }}>{DAYL[dd]}</span>
          {dd === TODAY && <span style={{ fontSize: 13, color: t.text.accent }}>сегодня</span>}
          <span style={{ flex: '1 1 10rem', minWidth: 0, fontSize: 13, color: t.text.tertiary }}>{ks.map((k) => CON[k]).join(' · ')}{hid ? ` · скрыто фильтром: ${hid}` : ''}</span>
          <span style={{ ...mono, fontSize: 13, color: t.text.tertiary }}>{vis.length}</span><Chev open={dO} />
        </div>
        {dO && <div style={{ paddingBottom: 12 }}>{ks.map((k) => {
          const ok = dd + '|' + k; const oO = isOpen(ok); const od = vis.filter((d) => d.org === k); const works = Array.from(new Set(od.map((d) => d.work)));
          return <div key={k} style={{ borderTop: `1px solid ${t.border.subtle}`, marginLeft: m ? 0 : 4 }}>
            <div role="button" tabIndex={0} aria-expanded={oO} onClick={() => tog(ok)} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '6px 0', cursor: 'pointer' }}>
              <span style={{ width: 3, alignSelf: 'stretch', background: oO ? t.text.accent : t.border.default, borderRadius: 2, flex: 'none' }} />
              <span style={{ flex: 1, fontSize: 16, fontWeight: t.weight.semibold, color: oO ? t.text.accent : t.text.primary }}>{CON[k]}</span>
              <span style={{ ...mono, fontSize: 13, color: t.text.tertiary }}>{od.length}</span><Chev open={oO} />
            </div>
            {oO && <div style={{ paddingLeft: m ? 0 : 13, paddingBottom: 8 }}>{works.map((w) => {
              const wkk = ok + '|' + w; const wO = isOpen(wkk); const wd = od.filter((d) => d.work === w);
              return <div key={w} style={{ borderTop: `1px solid ${t.border.subtle}` }}>
                <div role="button" tabIndex={0} aria-expanded={wO} onClick={() => tog(wkk)} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px 10px', minHeight: 44, padding: '6px 0', cursor: 'pointer' }}>
                  <span style={{ flex: '1 1 12rem', minWidth: 0, fontSize: 16, color: t.text.primary }}>{w}</span>
                  {wd[0].workMeta && <span style={{ fontSize: 13, color: t.text.tertiary }}>{wd[0].workMeta}</span>}
                  <Chev open={wO} />
                </div>
                {wO && (k === 'gd'
                  ? <div style={{ padding: '4px 0 10px' }}><div style={{ fontSize: 13, color: t.text.tertiary, margin: '0 0 6px' }}>Карточка Госдумы — без изменений</div><DumaCard bills={wd.map((d) => d.bill as Bill)} m={m} q={q} /></div>
                  : <div style={{ paddingBottom: 6 }}>{wd.map((d) => <DocCard key={d.id} d={d} m={m} q={q} open={!!op['c|' + d.id]} toggle={() => setOp({ ...op, ['c|' + d.id]: !op['c|' + d.id] })} />)}</div>)}
              </div>; })}</div>}
          </div>; })}</div>}
      </div>);
    });
    const shownDocs = days.flatMap((dd) => DOCS.filter((d) => d.day === dd));
    const noRec = orgs.filter((k) => !shownDocs.some((d) => d.org === k));
    if (!shown.length) out.unshift(<div key="nf">{empty(q || topics.length ? 'Ничего не найдено' : 'Событий нет', q || topics.length ? `Скрыто фильтром: ${shownDocs.filter((d) => orgs.includes(d.org)).length}. Поиск и типы документов работают вместе: уберите один из них, чтобы расширить выдачу.` : 'По выбранным органам за этот период записей нет.')}</div>);
    if (noRec.length) out.push(<div key="nr" style={{ padding: '12px 0', borderTop: `1px solid ${t.border.default}`, fontSize: 13, color: t.text.tertiary, lineHeight: 1.5 }}>Событий нет за {sel ? sel.slice(0, 5) : '10, 6 и 3 ноября'}: {noRec.map((k) => CON[k]).join(', ')}.</div>);
    return out;
  })();

  if (m) return (
    <div style={{ ...fs, color: t.text.primary, fontSize: 16, padding: '14px 14px 24px' }}>
      <div style={{ fontSize: 20, fontWeight: t.weight.semibold, marginBottom: 4 }}>Календарь законов</div>
      {updLine}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {search}
        <button aria-expanded={fOpen} onClick={() => setFOpen(!fOpen)} style={{ ...btn(fOpen || !allOrg || topics.length > 0), flex: 'none' }}>Фильтры{!allOrg || topics.length ? ` · ${(allOrg ? 0 : 1) + topics.length}` : ''}</button>
      </div>
      {fOpen && <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '12px 0', borderBottom: `1px solid ${t.border.default}` }}>
        <div><div style={{ fontSize: 13, fontWeight: t.weight.semibold, color: t.text.secondary, marginBottom: 6 }}>Тип документа</div>{topicRow}</div>
        {orgFilter}
      </div>}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: t.weight.semibold }}>Ноябрь 2026</span>
          <button aria-expanded={monthOpen} onClick={() => setMonthOpen(!monthOpen)} style={{ ...fs, minHeight: 44, padding: '0 4px', border: 'none', background: 'transparent', color: t.text.accent, fontSize: 15, cursor: 'pointer' }}>{monthOpen ? 'Неделя ▴' : 'Месяц ▾'}</button>
        </div>
        {monthOpen ? month : weekStrip}
      </div>
      <div style={{ margin: '12px 0 4px' }}>{countLine}</div>
      {feedBody}
    </div>);

  return (
    <div style={{ ...fs, color: t.text.primary, fontSize: 16 }}>
      <div style={{ paddingBottom: 12, marginBottom: 16, borderBottom: `1px solid ${t.border.default}` }}>{updLine}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        <aside style={{ flex: '0 1 280px', minWidth: 240, position: 'sticky', top: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {month}
          {orgFilter}
          <div><div style={{ fontSize: 13, fontWeight: t.weight.semibold, color: t.text.secondary, marginBottom: 6 }}>Статусы</div>{legend}</div>
        </aside>
        <main style={{ flex: '1 1 480px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {search}
            {topicRow}
            {countLine}
          </div>
          {feedBody}
        </main>
      </div>
    </div>);
}

function DocCard({ d, m, q, open, toggle }: { d: Doc; m: boolean; q: string; open: boolean; toggle: () => void }) {
  const t = useGrokTheme();
  const mono = { fontFamily: t.font.mono, fontVariantNumeric: 'tabular-nums' } as CSSProperties;
  const field = (label: string, body: ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '150px minmax(0, 1fr)', gap: m ? 2 : 16, padding: '10px 0', borderTop: `1px solid ${t.border.subtle}` }}>
      <div style={{ fontSize: 13, color: t.text.tertiary, paddingTop: 2 }}>{label}</div><div style={{ fontSize: 16, lineHeight: 1.55, color: t.text.primary, minWidth: 0, overflowWrap: 'anywhere' }}>{body}</div>
    </div>);
  return (
    <div style={{ borderTop: `1px solid ${t.border.subtle}` }}>
      <div role="button" tabIndex={0} aria-expanded={open} onClick={toggle} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', minHeight: 44, cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 12px', marginBottom: 4 }}>
            {d.no && <span style={{ ...mono, fontSize: 13, color: t.text.secondary }}>{d.no}</span>}
            <StatusLabel tone={d.tone} label={d.st} />
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.35, fontWeight: t.weight.semibold, color: t.text.primary }}><Hl s={d.title} q={q} /></div>
          <div style={{ fontSize: 13, color: t.text.tertiary, marginTop: 3 }}>{d.kind}</div>
        </div>
        <Chev open={open} />
      </div>
      {open && <div style={{ padding: m ? '0 0 12px' : '0 0 14px 0' }}>
        {field('Что это', <>{d.kind}{d.no ? <> · <span style={mono}>{d.no}</span></> : null}</>)}
        {field('Статус', <StatusLabel tone={d.tone} label={d.st} />)}
        {d.sut && field('Суть', d.sut.map((p, i) => <p key={i} style={{ margin: i ? '6px 0 0' : 0 }}><Hl s={p} q={q} /></p>))}
        {d.who && field('Кого касается', d.who)}
        {field('Даты', <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 14px' }}>{d.dates.map(([l, v]) => <Fragment2 key={l} l={l} v={v} />)}</div>)}
        {d.note && field('Примечание', <span style={{ color: t.text.secondary }}>{d.note}</span>)}
        {field('Источник', <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{d.src.map(([u, l]) => <a key={u} href={u} target="_blank" rel="noreferrer" style={{ color: t.text.accent, textDecoration: 'none', fontSize: 15 }}>{l} ↗</a>)}</div>)}
      </div>}
    </div>);
}

function Fragment2({ l, v }: { l: string; v: string }) {
  const t = useGrokTheme();
  return <><span style={{ fontFamily: t.font.mono, fontSize: 15, color: t.text.primary, whiteSpace: 'nowrap' }}>{v}</span><span style={{ fontSize: 15, color: t.text.secondary }}>{l}</span></>;
}

// Карточка Госдумы — воспроизведение текущего оформления (не меняется)
function DumaCard({ bills, m, q }: { bills: Bill[]; m: boolean; q: string }) {
  const t = useGrokTheme();
  const [io, setIo] = useState<string | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const light = t.kind !== 'dark';
  const cw = m ? 108 : 116;
  const cb: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: cw, height: 24, boxSizing: 'border-box', padding: '0 6px', borderRadius: 9999, fontSize: 12, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  const h: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text.accent, marginBottom: 4 };
  const box: CSSProperties = { background: t.bg.base, border: `1px solid ${t.border.subtle}`, borderRadius: 12, padding: m ? '10px 10px' : '12px 14px', minWidth: 0 };
  const star = (b: string) => { const on = favs.includes(b); return <button type="button" aria-label={on ? 'Убрать из сохраненных' : 'Сохранить'} aria-pressed={on} onClick={(e) => { e.stopPropagation(); setFavs(on ? favs.filter((x) => x !== b) : [...favs, b]); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', flex: 'none', lineHeight: 0 }}><svg width={15} height={15} viewBox="0 0 24 24" aria-hidden fill={on ? '#F5C400' : 'none'} stroke="#F5C400" strokeWidth="2" strokeLinejoin="round"><path d="M12 3.2l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 18.3 6.1 21.38l1.13-6.58L2.45 10.14l6.6-.96L12 3.2z" /></svg></button>; };
  const tags = (b: Bill) => b.tags.length ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>{b.tags.map((g) => <span key={g} style={{ fontSize: 12, lineHeight: 1.4, padding: '1px 8px', borderRadius: 9999, border: `1px solid ${t.border.subtle}`, background: t.bg.subtle, color: t.text.secondary }}>{g}</span>)}</span> : null;
  const track = (b: Bill) => {
    const st: [string, string, number][] = [['Внесен', b.inD, 2], ['Комитет', b.komD, 2], ['1 чтение', '10.11.2026', 1], ['2 чтение', '', 0], ['3 чтение', '', 0], ['Совет Федерации', '', 0], ['Президент', '', 0], ['Опубликован', '', 0], ['Вступает в силу', '', 0]];
    const gn = t.text.success; const mute = t.border.strong;
    return <div style={{ ...box, marginTop: 12, overflowX: 'auto' }}><div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 640 }}>{st.map(([l, d, s], i) => <div key={l} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 16 }}><span style={{ width: s === 1 ? 16 : 12, height: s === 1 ? 16 : 12, boxSizing: 'border-box', borderRadius: 9999, border: `2px solid ${s ? gn : mute}`, background: s === 2 ? gn : t.bg.base, flex: 'none' }} />{i < st.length - 1 && <span style={{ flex: 1, marginLeft: 4, height: s === 2 ? 2 : 0, background: s === 2 && st[i + 1][2] === 2 ? gn : 'transparent', borderTop: s === 2 && st[i + 1][2] === 2 ? 'none' : `2px dashed ${s ? gn : mute}` }} />}</div>
      <span style={{ fontSize: 12, color: s ? t.text.primary : t.text.tertiary, paddingRight: 4 }}>{l}</span>{d && <span style={{ fontSize: 12, color: t.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{d}</span>}
    </div>)}</div></div>;
  };
  return (
    <div style={{ background: t.bg.base, border: `1px solid ${t.border.subtle}`, borderRadius: 16, boxShadow: light ? `0 1px 2px ${t.border.subtle}` : 'none', borderLeft: `3px solid ${t.text.accent}`, overflow: 'hidden', fontSize: 14 }}>
      {bills.map((b) => {
        const open = io === b.no;
        if (open) return (
          <div key={b.no} style={{ margin: m ? '6px 6px 8px' : '8px 10px 10px', borderRadius: 12, border: `1.5px solid ${t.text.accent}`, overflow: 'hidden' }}>
            <div onClick={() => setIo(null)} style={{ cursor: 'pointer', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '8px 12px', background: t.fill.accentSubtle, borderBottom: `1px solid ${t.border.subtle}`, fontSize: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, boxSizing: 'border-box', padding: '0 8px', borderRadius: 9999, border: `1px solid ${t.border.subtle}`, background: t.bg.subtle, color: t.text.accent, fontFamily: t.font.mono, fontSize: 12.5, whiteSpace: 'nowrap' }}>{b.no}</span>
              {star(b.no)}
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600, lineHeight: 1.4, whiteSpace: 'nowrap', background: t.bg.subtle, color: t.text.secondary, border: `1px solid ${t.border.subtle}` }}>{b.rd}</span>
              <span style={{ flex: m ? '1 1 0' : '1 1 12rem', minWidth: m ? '60%' : 0, fontWeight: t.weight.semibold, color: t.text.primary }}><Hl s={b.short} q={q} /></span>
              <span aria-hidden style={{ marginLeft: 'auto', fontSize: 12, color: t.text.accent }}>▴</span>
            </div>
            <div style={{ padding: '8px 12px 10px', fontSize: 14, borderBottom: `1px solid ${t.border.subtle}` }}><span style={{ color: t.text.tertiary }}>— <Hl s={b.full} q={q} /></span>{tags(b)}</div>
            <div style={{ padding: m ? '10px 10px 12px' : '14px 16px 16px', background: t.bg.subtle, borderBottom: `1px solid ${t.border.subtle}` }}>
              <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: m ? 12 : 16 }}>
                <div><div style={h}>Суть</div>{b.sut.map((p, i) => <p key={i} style={{ margin: i ? '6px 0 0' : 0, fontSize: 15, lineHeight: 1.55, color: t.text.primary }}>{p}</p>)}</div>
                <div><div style={h}>Кого может коснуться</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: t.text.primary }}>{b.who}</p></div>
              </div>
              {track(b)}
              <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: m ? 12 : 16, marginTop: 12 }}>
                <div><div style={h}>Инициатор</div><div style={{ fontSize: 15, lineHeight: 1.55, color: t.text.primary }}>{b.ini}</div></div>
                <div><div style={h}>Ответственный комитет</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: t.text.primary }}>{b.com}</p></div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}><a href={`https://sozd.duma.gov.ru/bill/${b.no}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 10px', borderRadius: 14, border: `1px solid ${t.border.default}`, fontSize: 13, color: t.text.accent, textDecoration: 'none', whiteSpace: 'nowrap' }}>Законопроект ↗</a></div>
            </div>
            <button onClick={() => setIo(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 44, border: 'none', borderRadius: '0 0 10.5px 10.5px', background: t.fill.accentSubtle, color: t.text.accent, fontFamily: t.font.family, fontSize: 14, fontWeight: t.weight.semibold, cursor: 'pointer' }}>Свернуть ▴</button>
          </div>);
        return (
          <div key={b.no} onClick={() => setIo(b.no)} title={b.full} style={{ display: 'flex', alignItems: 'flex-start', gap: m ? 10 : 14, padding: m ? '12px 12px' : '10px 14px', borderBottom: `1px solid ${t.border.subtle}`, fontSize: 14, cursor: 'pointer' }}>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, flexShrink: 0, width: cw }}>
              <span style={{ ...cb, fontFamily: t.font.mono, fontSize: 12.5, fontWeight: 400, border: `1px solid ${t.border.subtle}`, background: t.bg.subtle, color: t.text.tertiary }}>{b.no}</span>
              <span style={{ ...cb, background: t.bg.subtle, color: t.text.secondary, border: `1px solid ${t.border.subtle}` }}>{b.rd}</span>
            </span>
            {star(b.no)}
            <span style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 15, lineHeight: 1.35, fontWeight: t.weight.semibold, color: t.text.primary }}><Hl s={b.short} q={q} /></span>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: t.text.tertiary, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}><Hl s={b.full} q={q} /></span>
              {tags(b)}
            </span>
            <span aria-hidden style={{ flexShrink: 0, alignSelf: 'center', fontSize: 20, lineHeight: 1, color: t.text.tertiary }}>›</span>
          </div>);
      })}
      <div style={{ padding: '6px 14px', fontSize: 12, color: t.text.tertiary }}>Источник: {DUMA_SRC}</div>
    </div>);
}

return App;
})();


/* Данные для нового вида: собираются из базы этой страницы при загрузке. */
const MK_EXTRA: any = /*MKX*/{"PL": [{"id": "gd-1327114-8", "d": "10.11.2026", "b": "1327114-8", "q": "Архивное дело", "t": "О внесении изменений в Федеральный закон \"Об архивном деле в Российской Федерации\" (в части уточнения отдельных положений Федерального закона)", "rd": "1-е чтение", "sut": ["Законопроект уточняет отдельные положения Федерального закона «Об архивном деле в Российской Федерации». Он подготовлен в связи с вступлением в силу с 1 января 2028 года Федерального закона от 20 марта 2025 года № 33-ФЗ «Об общих принципах организации местного самоуправления в единой системе публичной власти».", "В пояснительной записке отдельно описаны особенности архивного дела в городах федерального значения Москве, Санкт-Петербурге и Севастополе, где самостоятельные муниципальные архивы не созданы, а документы Архивного фонда поступают в государственные архивы этих субъектов."], "who": "Муниципальные архивы и органы местного самоуправления, в том числе во внутригородских муниципальных образованиях Москвы, Санкт-Петербурга и Севастополя.", "src": [["https://sozd.duma.gov.ru/bill/1327114-8", "sozd.duma.gov.ru"]]}, {"id": "gd-1249111-8", "d": "10.11.2026", "b": "1249111-8", "q": "Ответственность почты за платежки", "t": "О внесении изменений в Кодекс Российской Федерации об административных правонарушениях (об установлении ответственности за нарушение организацией федеральной почтовой связи порядка направления платежных документов и информации о размере платы)", "rd": "1-е чтение", "sut": ["Законопроектом предлагается внести изменения в Кодекс Российской Федерации об административных правонарушениях, в том числе дополнить главу 13 статьей 13.19.7. Эта статья вводит административную ответственность за нарушение организациями федеральной почтовой связи порядка направления платежных документов и информации о размере платы, предусмотренных жилищным законодательством.", "Особый порядок вступления в силу нужен, чтобы дать переходный период на обеспечение работы информационной системы организации федеральной почтовой связи по направлению таких документов."], "who": "Организации федеральной почтовой связи, в том числе АО «Почта России». Собственники жилых помещений, которым направляют платежные документы и сведения о размере платы.", "src": [["https://sozd.duma.gov.ru/bill/1249111-8", "sozd.duma.gov.ru"]]}, {"id": "gd-1240307-8", "d": "10.11.2026", "b": "1240307-8", "q": "Права на секреты производства", "t": "О внесении изменений в статью 1471 части четвертой Гражданского кодекса Российской Федерации (о правах на секреты производства, полученные при выполнении договоров)", "rd": "1-е чтение", "sut": ["Законопроект меняет статью 1471 Гражданского кодекса Российской Федерации: стороны договора подряда или договора на выполнение научно-исследовательских, опытно-конструкторских и технологических работ (далее - договор НИОКТР), если это не государственный или муниципальный контракт, смогут сами определить в договоре, кому принадлежит исключительное право на секрет производства (ноу-хау), полученный при выполнении работ.", "Сейчас такое право по общему правилу всегда у подрядчика (исполнителя). Для изобретений, промышленных образцов, полезных моделей и топологий интегральных микросхем такой выбор в договоре уже предусмотрен. Для контрактов на государственные или муниципальные нужды действующий порядок сохраняется."], "who": "Заказчики и подрядчики (исполнители) по договорам подряда и договорам НИОКТР между частными лицами. На распределение прав по государственным и муниципальным контрактам это не распространяется.", "src": [["https://sozd.duma.gov.ru/bill/1240307-8", "sozd.duma.gov.ru"]]}], "IT": [{"id": "gov37-1", "d": "03.11.2026", "o": "gov", "w": "Заседание Правительства № 37 · повестка: 6 вопросов", "k": "Вопрос повестки заседания", "no": "п. 1", "t": "Изменение постановления Правительства от 2 июня 2008 года № 418", "st": "принят", "sut": ["О внесении изменения в постановление Правительства Российской Федерации от 2 июня 2008 года №418", "Решение: Принять проект постановления Правительства Российской Федерации по данному вопросу."], "who": null, "nb": null, "dl": [["Заседание Правительства", "03.11.2026"]], "src": [["http://government.ru/meetings/60350/", "Материалы заседания на government.ru"]]}, {"id": "gov37-2", "d": "03.11.2026", "o": "gov", "w": "Заседание Правительства № 37 · повестка: 6 вопросов", "k": "Вопрос повестки заседания", "no": "п. 2", "t": "Субсидия ДОМ.РФ: возмещение доходов по IT-ипотеке", "st": "принят", "sut": ["О выделении Минцифры России в 2026 году из резервного фонда Правительства Российской Федерации бюджетных ассигнований для предоставления публичному акционерному обществу «ДОМ.РФ» субсидии в виде вклада в имущество, не увеличивающего его уставный капитал, на цели возмещения кредитным и иным организациям недополученных доходов по жилищным (ипотечным) кредитам (займам), выданным работникам аккредитованных организаций, осуществляющих деятельность в области информационных технологий", "Решение: Принять проект распоряжения Правительства Российской Федерации по данному вопросу."], "who": null, "nb": null, "dl": [["Заседание Правительства", "03.11.2026"]], "src": [["http://government.ru/meetings/60350/", "Материалы заседания на government.ru"]]}, {"id": "gov37-3", "d": "03.11.2026", "o": "gov", "w": "Заседание Правительства № 37 · повестка: 6 вопросов", "k": "Вопрос повестки заседания", "no": "п. 3", "t": "Восстановление дорог в Дагестане и Чечне после паводков 2026 года", "st": "принят", "sut": ["О выделении Росавтодору в 2026 году из резервного фонда Правительства Российской Федерации бюджетных ассигнований на предоставление иных межбюджетных трансфертов из федерального бюджета бюджетам Республики Дагестан и Чеченской Республики на реализацию мероприятий по восстановлению автомобильных дорог регионального или межмуниципального и местного значения, поврежденных в результате паводков, произошедших в 2026 году", "Решение: Принять проект распоряжения Правительства Российской Федерации по данному вопросу."], "who": null, "nb": null, "dl": [["Заседание Правительства", "03.11.2026"]], "src": [["http://government.ru/meetings/60350/", "Материалы заседания на government.ru"]]}, {"id": "gov37-4", "d": "03.11.2026", "o": "gov", "w": "Заседание Правительства № 37 · повестка: 6 вопросов", "k": "Вопрос повестки заседания", "no": "п. 4", "t": "Поправки Правительства к законопроекту № 1209623-8 об охране здоровья", "st": "одобрено", "sut": ["О проекте поправок Правительства Российской Федерации к проекту федерального закона №1209623-8 «О внесении изменений в Федеральный закон “Об основах охраны здоровья граждан в Российской Федерации”»", "Решение: Одобрить проект поправок и направить их в Государственную Думу в установленном порядке."], "who": null, "nb": null, "dl": [["Заседание Правительства", "03.11.2026"]], "src": [["http://government.ru/meetings/60350/", "Материалы заседания на government.ru"]]}, {"id": "gov37-5", "d": "03.11.2026", "o": "gov", "w": "Заседание Правительства № 37 · повестка: 6 вопросов", "k": "Вопрос повестки заседания", "no": "п. 5", "t": "Отмена актов в части Положения о Минтруде", "st": "принят", "sut": ["О признании утратившими силу некоторых актов Правительства Российской Федерации (в части внесения изменений в Положение о Министерстве труда и социальной защиты Российской Федерации)", "Решение: Принять проект постановления Правительства Российской Федерации по данному вопросу."], "who": null, "nb": null, "dl": [["Заседание Правительства", "03.11.2026"]], "src": [["http://government.ru/meetings/60350/", "Материалы заседания на government.ru"]]}, {"id": "gov37-6", "d": "03.11.2026", "o": "gov", "w": "Заседание Правительства № 37 · повестка: 6 вопросов", "k": "Вопрос повестки заседания", "no": "п. 6", "t": "Субсидии регионам на озимые под урожай 2027 года", "st": "принят", "sut": ["О выделении Минсельхозу России в 2026 году из резервного фонда Правительства Российской Федерации бюджетных ассигнований на предоставление субсидий бюджетам субъектов Российской Федерации на возмещение сельхозпроизводителям части затрат на агротехнологические работы при возделывании озимых зерновых культур под урожай 2027 года", "Решение: Принять проект распоряжения Правительства Российской Федерации по данному вопросу.", "Более 13 млрд руб. на агротехнологические работы под озимые для 22 регионов (более 5,5 млн га)."], "who": "Аграрии, пострадавшие от сбоев логистики в Азово-Черноморском бассейне.", "nb": null, "dl": [["Заседание Правительства", "03.11.2026"]], "src": [["http://government.ru/meetings/60350/", "Материалы заседания на government.ru"], ["http://government.ru/news/60357/", "Новость о заседании на government.ru"]]}, {"id": "gov-radio", "d": "03.11.2026", "o": "gov", "w": "Решения и распоряжения", "k": "Решение Правительства", "no": null, "t": "Расширен перечень продукции для налогового режима производителей радиоэлектроники", "st": "принято", "sut": ["Расширен перечень продукции для налогового режима производителей радиоэлектроники (пониженная ставка налога на прибыль и страховых взносов): оборудование для печатных пластин, полупроводниковые слитки и пластины, интегральные схемы, дисплеи; льготы по взносам — для производителей ряда лазерных систем."], "who": "Производители радиоэлектроники, в том числе ряда лазерных систем.", "nb": null, "dl": [["Сообщено на government.ru", "03.11.2026"]], "src": [["http://government.ru/news/60357/", "government.ru/news/60357"]]}, {"id": "gov-3166", "d": "03.11.2026", "o": "gov", "w": "Решения и распоряжения", "k": "Распоряжение Правительства", "no": "№ 3166-р", "t": "Около 600 млн руб. на завершение рыбного порта в Корсакове", "st": "подписано", "sut": ["Около 600 млн руб. на завершение строительства рыбного порта в морском порту Корсаков (Сахалинская область); порт войдет в Трансарктический транспортный коридор."], "who": null, "nb": null, "dl": [["Подписано", "31.10.2026"]], "src": [["http://government.ru/docs/60356/", "government.ru/docs/60356"]]}], "B": {"1249111-8": {"ini": ["Инициатор — Правительство Российской Федерации", ""], "com": "Комитет Государственной Думы по уголовному и административному законодательству", "tags": [["Владельцы жилья и арендаторы"], ["Жилье и ЖКХ"], []], "tr": {"in": "01.06.2026", "kom": "03.06.2026", "src": "sozd.duma.gov.ru"}, "tx": null, "otr": null}, "1240307-8": {"ini": ["Инициатор — Правительство Российской Федерации", ""], "com": "Комитет Государственной Думы по конституционному, гражданскому законодательству и судоустройству", "tags": [[], [], []], "tr": {"in": "21.05.2026", "kom": "22.05.2026", "src": "sozd.duma.gov.ru"}, "tx": null, "otr": null}, "1327114-8": {"ini": ["Инициатор — Правительство Российской Федерации", ""], "com": "Комитет Государственной Думы по культуре", "tags": [[], [], []], "tr": {"in": "27.08.2026", "kom": "31.08.2026", "src": "sozd.duma.gov.ru"}, "tx": null, "otr": null}}}/*MKXEND*/;
const MK_X: any = { cardText, fullT, parse, iniView, INI_ADD, billNo, NV, VT, TRACK, T300, ORG, ORGN, DATA, INFO, LAWS, CAL, ZTAG, PLAIN, TX, F };
function buildMkD(): any {
  const X: any = MK_X;
  const txt = (n: any): string => n == null || n === false || n === true ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(txt).join('') : n.props ? txt(n.props.children) : '';
  const yo = (s: any) => s == null ? s : (typeof s === 'string' ? s : txt(s)).replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  const key = (d: string) => d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);
  const hostOf = (u: string) => u.replace(/^https?:\/\//, '').split('/')[0];
  const V: any[] = [], B: Record<string, any> = {}, IT: any[] = [];
  const addBill = (b: any) => {
    if (!b || B[b]) return; const inf = X.INFO[b] || {}; const iv = X.iniView(yo(inf.ini || X.INI_ADD[b]), b);
    B[b] = { ini: iv ? [txt(iv[0]), txt(iv[1]).trim().replace(/([а-яёА-ЯЁ.])(ЕР|КПРФ|ЛДПР|НЛ|СРЗП|Вне фракций|Новые люди|Справедливая Россия):/g, '$1; $2:')] : null, com: yo(inf.com) || null, tags: X.ZTAG[b] || null, tr: X.TRACK[b] || null, tx: X.TX[b] || null, otr: inf.otr || null };
  };
  for (const d of Object.keys(X.DATA)) {
    if (!X.DATA[d]) continue;
    for (const v of X.parse(X.DATA[d]) as any[]) {
      const b = X.billNo(v.doc); const pl = X.PLAIN[v.id] || {}; const inf = X.INFO[b || ''] || {};
      const ct = X.cardText(v, d) || {};
      const t = yo(X.fullT(b, pl.title, inf.t, v.full));
      if (b) addBill(b);
      V.push({ id: v.id, d, b, doc: v.doc, q: yo(v.q), t, rd: v.reading, ok: v.ok, tot: v.total, fr: v.fr ? X.F.map((f: any) => [...v.fr[f].v, v.fr[f].size]) : null, tm: X.VT[v.id] || null, sut: (ct.sut || []).map(yo), who: yo(ct.who) || null, nx: (ct.next || []).map(yo) });
    }
  }
  for (const d in X.NV) {
    const o = X.NV[d];
    (o.d || []).forEach((x: any, i: number) => IT.push({ id: 'nvd' + key(d) + i, d, o: 'gd', w: x[0], k: x[0], t: yo(x[1]), src: [[x[2], hostOf(x[2])]] }));
    (o.g || []).forEach((x: any, i: number) => { if (d === '03.11.2026' && /60357|60356/.test(x[2])) return; IT.push({ id: 'nvg' + key(d) + i, d, o: 'gov', w: 'Решения и новости Правительства', k: x[0], t: yo(x[1]), src: [[x[2], hostOf(x[2])]] }); });
  }
  for (const g of X.CAL.g as any[]) {
    if (key(g[0]) < '20260930' || g[0] === '03.11.2026') continue; const m = g[1].match(/№\s*(\d+)/);
    const [, ...rest] = g[1].split(') ');
    IT.push({ id: 'calg' + key(g[0]), d: g[0], o: 'gov', w: 'Заседание Правительства' + (m ? ' № ' + m[1] : ''), k: 'Заседание Правительства', t: (rest.join(') ') || g[1]).trim(), src: [[g[2], 'government.ru']] });
  }
  (X.ORG as any[]).forEach((x: any, i: number) => IT.push({ id: 'org' + i, d: x.d, o: x.o, w: x.ty === 'заседание' ? x.t : 'Документы: ' + X.ORGN[x.o], k: x.kind, no: x.no || null, t: yo(x.st || x.t), st: x.stt || null, sut: x.sut ? [yo(x.sut)] : (x.x ? [yo(x.x)] : []), who: yo(x.who) || null, nb: yo(x.nb) || null, dl: x.dl || [], src: (x.ps && x.ps.length ? x.ps : [[x.u, hostOf(x.u)]]) }));
  const PL: any[] = MK_EXTRA.PL;
  PL.forEach((p: any) => { addBill(p.b); const bb = B[p.b], eb = MK_EXTRA.B[p.b] || {}; Object.keys(eb).forEach((k: string) => { if (bb[k] == null) bb[k] = eb[k]; }); });
  (MK_EXTRA.IT as any[]).forEach((i: any) => IT.push(i));
  for (const p of X.CAL.p as any[]) if (p.d === '11.11.2026') p.a.forEach((a: any, i: number) => IT.push({ id: 'calp' + i, d: p.d, o: 'gd', w: 'Пленарное заседание (план)', k: a[1], t: yo(a[4]), st: 'запланировано', nb: 'Источник: ' + p.src, src: [[a[3], 'pnp.ru']] }));
  const LAWS: any[] = []; for (const k of Object.keys(X.LAWS.months)) X.LAWS.months[k].forEach((l: any) => LAWS.push({ d: l.d, law: l.law, t: yo(l.title), sut: yo(l.sut), who: yo(l.who), was: yo(l.was) || null, now: yo(l.now) || null, src: (l.src || []).map((s: any) => [s.u, s.t]) }));
  const CAL = { w: X.CAL.w, p: (X.CAL.p as any[]).map((p: any) => [p.d, p.s]) };
  return { V, B, IT, PL, LAWS, CAL, T300: [...X.T300], SCOPE: '' };
}

const ShablonApp = (() => {
const useGrokTheme = useGT0;

/* Данные: реальный срез из «Календаря законов» (голосования Госдумы 27–28.10.2026, повестка 10–11.11.2026, документы органов 03–10.11.2026, законы, вступающие в силу в ноябре–декабре 2026). Ничего не придумано. */
const D: any = buildMkD();

type Pal = Record<string, string>;
const DARK: Pal = { page: '#0e1118', hdr: '#12161f', panel: '#161a23', card: '#191f2b', card2: '#1e2430', pill: '#232a3a', line: '#232a3a', soft: '#1c2330', track: '#3a4151', text: '#e9ecf3', text2: '#9ba4b4', text3: '#959eb0', acc: '#3870dc', accSoft: '#1e2a42', accLine: '#22324e', accText: '#8fb0f2', gT: '#40b950', rT: '#f2848d', yT: '#e5a53c', pT: '#f37daf', bT: '#56a6ff', aT: '#79a5f6', green: '#40b950', greenSoft: '#1f3630', greenBox: '#1a2e26', red: '#ee5e6a', redSoft: '#382933', redBox: '#392934', yellow: '#e5a53c', yellowSoft: '#3a3224', pink: '#f37daf', blue: '#56a6ff', gray: '#6b7380', mark: '#4a515d', overlay: 'rgba(8,9,13,0.86)' };
const LIGHT: Pal = { page: '#f5f6f8', hdr: '#ffffff', panel: '#ffffff', card: '#ffffff', card2: '#f5f6f8', pill: '#eef0f4', line: '#e3e6ec', soft: '#eceef2', track: '#e3e6ec', text: '#19202a', text2: '#4b5465', text3: '#5f687a', acc: '#306adf', accSoft: '#e6eefb', accLine: '#c4d5f5', accText: '#2a5fcf', gT: '#1a7535', rT: '#c0353f', yT: '#8f5d08', pT: '#b52d6b', bT: '#2a5fcf', aT: '#2a5fcf', green: '#2ba64c', greenSoft: '#e4f4e9', greenBox: '#eef8f1', red: '#d54750', redSoft: '#fbedec', redBox: '#fdf3f2', yellow: '#c98a1c', yellowSoft: '#fbf1de', pink: '#e2508f', blue: '#306adf', gray: '#8991a1', mark: '#b3b9c4', overlay: 'rgba(20,24,32,0.55)' };
let C: Pal = DARK;
let M = false;
let FF = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const V: any[] = D.V; const B: Record<string, any> = D.B; const IT: any[] = D.IT; const PL: any[] = D.PL; const LAWS: any[] = D.LAWS;
const pad = (n: number) => String(n).padStart(2, '0');
const k8 = (d: string) => d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);
const toD = (d: string) => new Date(+d.slice(6, 10), +d.slice(3, 5) - 1, +d.slice(0, 2));
const fmtD = (x: Date) => `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;
const MONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONN = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const MONS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WDL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const WDS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const dLong = (d: string) => `${+d.slice(0, 2)} ${MONG[+d.slice(3, 5) - 1]}`;
const wd = (d: string) => WDL[toD(d).getDay()];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const TODAY = fmtD(new Date());
const plural = (n: number, a: string, b: string, c: string) => { const x = n % 100, y = n % 10; return x >= 11 && x <= 14 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; };
const norm = (s: string) => (s || '').toLowerCase().replace(/ё/g, 'е');
const host = (u: string) => u.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const daysBetween = (a: string, b: string) => Math.round((toD(b).getTime() - toD(a).getTime()) / 86400000);

const ORGS: [string, string][] = [['gd', 'Госдума'], ['sf', 'Совет Федерации'], ['gov', 'Правительство'], ['pres', 'Президент'], ['minfin', 'Минфин'], ['mintrud', 'Минтруд'], ['minjust', 'Минюст'], ['cbr', 'Банк России']];
const ORGN: Record<string, string> = Object.fromEntries(ORGS);
const ALL = ORGS.map((o: [string, string]) => o[0]);
const FR: [string, string][] = [['ЕР', 'Единая Россия'], ['КПРФ', 'КПРФ'], ['ЛДПР', 'ЛДПР'], ['НЛ', 'Новые люди'], ['СРЗП', 'СРЗП'], ['Вне', 'Вне фракций']];
const ZG: [string, string, string[]][] = [
  ['w', 'Для кого', ['Семьи с детьми', 'Пенсионеры', 'Военнослужащие и участники СВО', 'Студенты и молодежь', 'Работники', 'Предприниматели и самозанятые', 'Автомобилисты', 'Владельцы жилья и арендаторы', 'Люди с инвалидностью', 'Сельские жители', 'Избиратели', 'Иностранные граждане', 'Нотариусы и адвокаты', 'Подозреваемые и осужденные', 'Пациенты', 'Пассажиры', 'Малоимущие', 'Пострадавшие от терактов и ЧС', 'Органы власти и госкомпании', 'Садоводы', 'Фермеры и аграрии', 'Заемщики и должники', 'Владельцы оружия', 'Владельцы животных', 'Инвесторы', 'Все граждане']],
  ['t', 'Тема', ['Налоги', 'Пособия и выплаты', 'Жилье и ЖКХ', 'Работа и зарплата', 'Здравоохранение', 'Образование', 'Транспорт и ПДД', 'Интернет и связь', 'Штрафы и уголовная ответственность', 'Финансы и банки', 'Миграция', 'Выборы', 'Нотариат и юридическая помощь', 'Земля и сельское хозяйство', 'Госуправление и местная власть', 'Оружие', 'Бизнес и инвестиции', 'Алкоголь, табак и азартные игры']],
  ['c', 'Что меняется', ['Новая выплата или льгота', 'Новый запрет или штраф', 'Рост или снижение платежей', 'Новые права', 'Новые обязанности или документы', 'Изменение порядка и процедур', 'Новые полномочия госорганов', 'Смягчение наказания', 'Международный договор']],
];
const MONTHS = ['09.2026', '10.2026', '11.2026', '12.2026'];

const tagsOf = (b?: string | null): string[] => { const t = b && B[b] && B[b].tags; return t ? [...t[0], ...t[1], ...t[2]] : []; };
const RDL: Record<string, string> = { '1-е': '1-е чтение', '2-е': '2-е чтение', '3-е': '3-е чтение' };
const rdL = (rd: string) => RDL[rd] || (/чтени/.test(rd || '') ? rd : '');
const thr = (v: any) => ((D.T300 || []) as string[]).includes(v.d) ? 300 : 226;
const forRej = (v: any) => !v.ok && v.tot[0] >= thr(v);
const hm = (v: any) => (v && v.tm ? String(v.tm).slice(0, 5) : '');
const hayV = (v: any) => { const b = B[v.b] || {}; return norm([v.doc, v.q, v.t, ...(v.sut || []), v.who || '', ...(v.nx || []), ...tagsOf(v.b), ...(b.ini || []), b.com || ''].join(' ')); };
const hayP = (p: any) => { const b = B[p.b] || {}; return norm([p.b, p.q, p.t, ...(p.sut || []), p.who || '', ...tagsOf(p.b), ...(b.ini || []), b.com || ''].join(' ')); };
const hayI = (i: any) => norm([i.k, i.no || '', i.t, i.w, ...(i.sut || []), i.who || '', i.nb || '', ORGN[i.o]].join(' '));
const lk = (l: any) => l.d + '|' + l.t;
const lawNo = (s: string) => { const n = s.match(/№\s*(\d+-ФЗ)/); const d = s.match(/от (\d\d\.\d\d\.\d{4})/); return n ? `№ ${n[1]}${d ? ' · ' + d[1] : ''}` : s; };
const partial = (s: string) => /отдельные положения/.test(s);
const regWeek = (d: string): [string, string] | null => { for (const w of D.CAL.w) if (w[2] === 'regional' && k8(w[0]) <= k8(d) && k8(d) <= k8(w[1])) return [w[0], w[1]]; return null; };
const planDay = (d: string): any => (D.CAL.p as any[]).find((p: any) => p[0] === d);
const DAYS: string[] = Array.from(new Set<string>([...V.map((v: any) => v.d), ...PL.map((p: any) => p.d), ...IT.map((i: any) => i.d)])).sort((a: string, b: string) => k8(b).localeCompare(k8(a)));
const VDAYS: string[] = Array.from(new Set<string>([...V.map((v: any) => v.d), ...PL.map((p: any) => p.d)])).sort((a: string, b: string) => k8(b).localeCompare(k8(a)));
const SEED: string[] = [];

type Flt = { q: string; orgs: string[]; zs: Record<string, string[]> };
const anyTags = (f: Flt) => f.zs.w.length + f.zs.t.length + f.zs.c.length > 0;
const passTags = (f: Flt, b?: string | null) => { const t = b && B[b] && B[b].tags; return ['w', 't', 'c'].every((g: string, gi: number) => !f.zs[g].length || (!!t && f.zs[g].some((x: string) => t[gi].includes(x)))); };
const okV = (f: Flt, v: any) => f.orgs.includes('gd') && passTags(f, v.b) && (!f.q || hayV(v).includes(norm(f.q)));
const okP = (f: Flt, p: any) => f.orgs.includes('gd') && passTags(f, p.b) && (!f.q || hayP(p).includes(norm(f.q)));
const okI = (f: Flt, i: any) => f.orgs.includes(i.o) && !anyTags(f) && (!f.q || hayI(i).includes(norm(f.q)));
const plain = (f: Flt) => !anyTags(f) && !f.q;

type Card = { k: string; x: any };
type Work = { key: string; org: string; title: string; time: string; meta: string; color: string; pill?: string; cards: Card[] };
function worksOf(d: string, f: Flt, withReg: boolean): Work[] {
  const out: Work[] = [];
  const vs = V.filter((v: any) => v.d === d && okV(f, v));
  if (vs.length) { const a = vs.filter((v: any) => v.ok).length; out.push({ key: d + 'v', org: 'gd', title: 'Пленарное заседание Госдумы', time: hm(vs[0]) || 'Госдума', meta: `${vs.length} ${plural(vs.length, 'голосование', 'голосования', 'голосований')} · принято ${a}, отклонено ${vs.length - a}`, color: C.bT, pill: `Голосований: ${vs.length}`, cards: vs.map((x: any) => ({ k: 'v', x })) }); }
  const ps = PL.filter((p: any) => p.d === d && okP(f, p));
  if (ps.length) { const pd = planDay(d); out.push({ key: d + 'p', org: 'gd', title: 'Пленарное заседание Госдумы', time: 'План', meta: `${ps.length} ${plural(ps.length, 'законопроект', 'законопроекта', 'законопроектов')} в повестке · ${ps[0].rd}${pd && pd[1] === 'confirmed' ? ' · заседание подтверждено' : ''}`, color: C.bT, pill: `Повестка: ${ps.length}`, cards: ps.map((x: any) => ({ k: 'p', x })) }); }
  const gr: Record<string, any[]> = {}; const order: string[] = [];
  IT.filter((i: any) => i.d === d && okI(f, i)).forEach((i: any) => { const key = i.o + '|' + i.w; if (!gr[key]) { gr[key] = []; order.push(key); } gr[key].push(i); });
  order.forEach((key: string) => {
    const it = gr[key]; const o = it[0].o; const parts = String(it[0].w).split(' · ');
    out.push({ key: d + key, org: o, title: parts[0], time: ORGN[o], meta: parts[1] ? `${cap(parts[1])} · ${it.length} ${plural(it.length, 'материал', 'материала', 'материалов')}` : `${it.length} ${plural(it.length, 'материал', 'материала', 'материалов')}`, color: o === 'gd' ? (/^Пленарное/.test(parts[0]) ? C.bT : C.gray) : o === 'gov' ? C.gT : C.gray, pill: it.length > 1 ? `Материалов: ${it.length}` : undefined, cards: it.map((x: any) => ({ k: 'i', x })) });
  });
  const rw = regWeek(d);
  if (withReg && rw && f.orgs.includes('gd') && plain(f)) out.push({ key: d + 'reg', org: 'gd', title: 'Работа в регионах', time: `${rw[0].slice(0, 2)}–${rw[1].slice(0, 5)}`, meta: 'Региональная неделя депутатов Госдумы · по распорядку', color: C.pT, cards: [] });
  return out.sort((a: Work, b: Work) => ALL.indexOf(a.org) - ALL.indexOf(b.org));
}
function marksOf(d: string, f: Flt): string[] {
  const r: string[] = []; const g = f.orgs.includes('gd');
  if (g && (V.some((v: any) => v.d === d && okV(f, v)) || PL.some((p: any) => p.d === d && okP(f, p)) || (plain(f) && planDay(d)))) r.push(C.blue);
  if (IT.some((i: any) => i.d === d && i.o === 'gov' && okI(f, i))) r.push(C.green);
  if (g && plain(f) && regWeek(d)) r.push(C.pink);
  if (IT.some((i: any) => i.d === d && i.o !== 'gov' && !(i.o === 'gd' && /^Пленарное/.test(i.w)) && okI(f, i))) r.push(C.mark);
  if (f.orgs.length && plain(f) && LAWS.some((l: any) => l.d === d)) r.push(C.yellow);
  return r.slice(0, 3);
}

function useW() {
  const [w, setW] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => { const f = () => setW(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return w;
}
function loadSaved(): string[] { try { const s = localStorage.getItem('kz_new_saved'); if (s) return JSON.parse(s); } catch (e) { } return SEED; }

const bare: CSSProperties = { border: 'none', background: 'none', padding: 0, margin: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 'inherit' };
const card = (p?: CSSProperties): CSSProperties => ({ background: C.card, border: `1px solid ${C.soft}`, borderRadius: 14, ...p });
const lbl: () => CSSProperties = () => ({ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.text3 });

function I({ n, s = 18, c, f }: { n: string; s?: number; c?: string; f?: boolean }) {
  const p: Record<string, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
    book: <path d="M6 3h12v18l-6-4-6 4z" />,
    gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
    moon: <path d="M20.5 13.2A8.5 8.5 0 1110.8 3.5a6.6 6.6 0 009.7 9.7z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></>,
    dl: <path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 19.5h15" />,
    share: <><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4.2M8.2 13.2l7.6 4.2" /></>,
    left: <path d="M15 5l-7 7 7 7" />, right: <path d="M9 5l7 7-7 7" />, down: <path d="M6 9l6 6 6-6" />, back: <path d="M19 12H5M11 6l-6 6 6 6" />,
    star: <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />,
    bell: <path d="M6 16.5V11a6 6 0 1112 0v5.5l1.8 1.8H4.2zM10 20.5a2 2 0 004 0" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.2" /></>,
    link: <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />,
    doc: <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />,
    chart: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
    ext: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />, close: <path d="M6 6l12 12M18 6L6 18" />,
    cal: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
    img: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></>,
    pdf: <><path d="M6 3h8l4 4v14H6zM14 3v4h4" /><path d="M9 14h1.5a1.2 1.2 0 000-2.4H9V17M13 11.6V17M13 11.6h2.2" /></>,
    logo: <path d="M12 3.5v16.5M7 20h10M4.5 7h15M12 5l-7.5 2M12 5l7.5 2M4.5 7L2 13a2.6 2.6 0 005 0zM19.5 7L17 13a2.6 2.6 0 005 0z" />,
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={f ? (c || 'currentColor') : 'none'} stroke={c || 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>{p[n]}</svg>;
}

function Pill({ children, tone = 'num', big }: { children: ReactNode; tone?: string; big?: boolean }) {
  const T: Record<string, [string, string, string]> = {
    num: [C.pill, C.text2, 'transparent'], out: ['transparent', C.text2, C.line], ok: [C.greenSoft, C.gT, 'transparent'], rej: [C.redSoft, C.rT, 'transparent'], warn: [C.yellowSoft, C.yT, 'transparent'], acc: [C.accSoft, C.accText, 'transparent'], accO: [C.accSoft, C.aT, C.acc], gray: [C.card2, C.text3, C.line],
  };
  const [bg, fg, bd] = T[tone] || T.num;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: big ? 28 : 24, padding: big ? '0 16px' : '0 11px', borderRadius: 999, background: bg, color: fg, border: `1px solid ${bd}`, fontSize: 12, fontWeight: tone === 'num' || tone === 'out' || tone === 'gray' ? 500 : 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{children}</span>;
}
const vStatus = (v: any): [string, string] => v.ok ? ['Принят', 'ok'] : ['Отклонён', 'rej'];

function VBar({ v, h = 6, mk }: { v: any; h?: number; mk?: boolean }) {
  const s = sum(v.tot) || 450; const t = thr(v); const a = v.tot[0] / s * 100, b = v.tot[1] / s * 100, c = v.tot[2] / s * 100;
  return <div style={{ position: 'relative', height: h, borderRadius: h, background: C.track, width: '100%' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${a}%`, background: C.green, borderRadius: h }} />
    {b > 0 && <div style={{ position: 'absolute', left: `${a}%`, top: 0, bottom: 0, width: `${b}%`, background: C.red }} />}
    {c > 0 && <div style={{ position: 'absolute', left: `${a + b}%`, top: 0, bottom: 0, width: `${Math.max(c, 0.6)}%`, background: C.yellow }} />}
    {mk && <div title={`Порог: ${t}`} style={{ position: 'absolute', left: `${t / s * 100}%`, top: -6, bottom: -6, width: 2, background: C.text, borderRadius: 1 }} />}
  </div>;
}
function VLeg({ v, size = 12 }: { v: any; size?: number }) {
  const it: [string, string][] = [[`${forRej(v) ? 'За отклонение' : 'За'} — ${v.tot[0]}`, C.gT], [`Против — ${v.tot[1]}`, C.rT]];
  if (v.tot[2] > 0) it.push([`Воздержались — ${v.tot[2]}`, C.yT]);
  it.push([`Не голосовали — ${v.tot[3]}`, C.text3]);
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 0', fontSize: size, fontVariantNumeric: 'tabular-nums' }}>{it.map((x: [string, string], i: number) => <span key={i} style={{ color: x[1] }}>{i ? <span style={{ color: C.text3 }}>&nbsp;·&nbsp;</span> : null}{x[0]}</span>)}</div>;
}
function Star({ on, onClick, s = 18 }: { on: boolean; onClick: () => void; s?: number }) {
  return <button aria-label={on ? 'Убрать из сохранённых' : 'Сохранить'} aria-pressed={on} onClick={(e: any) => { e.stopPropagation(); onClick(); }} style={{ ...bare, width: M ? 44 : 32, height: M ? 44 : 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: on ? C.yT : C.text3, flexShrink: 0 }}><I n="star" s={s} f={on} /></button>;
}
function Btn({ children, onClick, primary, full, small }: { children: ReactNode; onClick: () => void; primary?: boolean; full?: boolean; small?: boolean }) {
  return <button className="hv" onClick={onClick} style={{ ...bare, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: M ? 44 : small ? 32 : 40, padding: small ? '0 14px' : '0 22px', borderRadius: 999, background: primary ? C.acc : 'transparent', color: primary ? '#fff' : C.text, border: `1px solid ${primary ? C.acc : C.line}`, fontSize: small ? 12.5 : 14, fontWeight: 600, width: full ? '100%' : undefined, textAlign: 'center', whiteSpace: 'nowrap' }}>{children}</button>;
}
function Chip({ on, children, onClick, x }: { on?: boolean; children: ReactNode; onClick?: () => void; x?: boolean }) {
  return <button onClick={onClick} aria-pressed={!!on} style={{ ...bare, display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: M ? 44 : 30, padding: '0 13px', borderRadius: 999, fontSize: 12.5, fontWeight: on ? 600 : 500, background: on ? C.acc : 'transparent', color: on ? '#fff' : C.text2, border: `1px solid ${on ? C.acc : C.line}` }}>{children}{x && <I n="close" s={12} />}</button>;
}
function Seg({ items, value, onChange }: { items: [string, string][]; value: string; onChange: (v: string) => void }) {
  return <div role="tablist" style={{ display: 'inline-flex', flexWrap: 'wrap', padding: 3, borderRadius: 999, background: C.card, border: `1px solid ${C.line}`, gap: 2 }}>{items.map((x: [string, string]) => { const on = x[0] === value; return <button key={x[0]} role="tab" aria-selected={on} onClick={() => onChange(x[0])} style={{ ...bare, minHeight: M ? 44 : 30, padding: '0 16px', borderRadius: 999, background: on ? (C === DARK ? '#2a3142' : '#ffffff') : 'transparent', boxShadow: on && C !== DARK ? '0 1px 3px rgba(20,30,50,.12)' : 'none', color: on ? C.text : C.text2, fontWeight: on ? 600 : 500, fontSize: 13, textAlign: 'center' }}>{x[1]}</button>; })}</div>;
}
function Box({ label, children, tone }: { label: string; children: ReactNode; tone?: string }) {
  const bg = tone === 'rej' ? C.redBox : tone === 'ok' ? C.greenBox : C.card2; const bd = tone === 'rej' ? C.red + '55' : tone === 'ok' ? C.green + '55' : C.soft; const lc = tone === 'rej' ? C.rT : tone === 'ok' ? C.gT : C.text3;
  return <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 12, padding: M ? '14px 14px' : '16px 18px', minWidth: 0 }}><div style={{ ...lbl(), color: lc, marginBottom: 10 }}>{label}</div><div style={{ fontSize: 14, lineHeight: 1.6, color: C.text }}>{children}</div></div>;
}
function Paras({ a }: { a: string[] }) { return <>{a.map((s: string, i: number) => <p key={i} style={{ margin: i ? '8px 0 0' : 0 }}>{s}</p>)}</>; }

/* ---------- Карточка документа органа (уровень «карточка») ---------- */
function ItemCard({ i, open, toggle }: { i: any; open: boolean; toggle: () => void }) {
  return <div style={{ borderTop: `1px solid ${C.soft}` }}>
    <button aria-expanded={open} onClick={toggle} style={{ ...bare, display: 'flex', gap: 12, alignItems: 'center', width: '100%', padding: '12px 4px', minHeight: 44 }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>{i.no && <Pill>{i.no}</Pill>}<Pill tone="out">{i.k}</Pill>{i.st && <span style={{ fontSize: 12, color: C.text3, alignSelf: 'center' }}>{i.st}</span>}</span>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{i.t}</span>
      </span>
      <span style={{ color: C.text3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><I n="down" s={18} /></span>
    </button>
    {open && <div style={{ display: 'grid', gap: 10, padding: '0 4px 14px' }}>
      {!!(i.sut && i.sut.length) && <Box label="Суть"><Paras a={i.sut} /></Box>}
      {i.who && <Box label="Кого может коснуться">{i.who}</Box>}
      {!!(i.no || (i.dl && i.dl.length) || i.nb) && <Box label="Документ и даты">{i.no && <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{i.no}</p>}{(i.dl || []).map((x: string[], j: number) => <div key={j} style={{ fontSize: 13.5 }}><span style={{ color: C.text2 }}>{x[0]}: </span>{x[1]}</div>)}{i.nb && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: C.text3 }}>{i.nb}</p>}</Box>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{(i.src || []).map((s: string[], j: number) => <a key={j} href={s[0]} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: M ? 44 : 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${C.line}`, color: C.aT, fontSize: 12.5, textDecoration: 'none' }}><I n="link" s={14} />Источник: {host(s[0])}</a>)}</div>
    </div>}
  </div>;
}
/* ---------- Строка законопроекта внутри события ---------- */
function BillRow({ c, a }: { c: Card; a: any }) {
  const v = c.k === 'v' ? c.x : null; const p = c.k === 'p' ? c.x : null; const x = v || p; const st = v ? vStatus(v) : ['На рассмотрении', 'warn'];
  return <div role="button" tabIndex={0} onClick={() => a.openBill(c.k, x.id)} onKeyDown={(e: KbEvent<HTMLDivElement>) => { if (e.key === 'Enter') a.openBill(c.k, x.id); }} className="hv" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderTop: `1px solid ${C.soft}`, cursor: 'pointer', minHeight: 44 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}><Pill>{v ? '№ ' + v.doc : '№ ' + p.b}</Pill>{rdL(x.rd) && <Pill tone="out">{rdL(x.rd)}</Pill>}<Pill tone={st[1]}>{st[0]}</Pill></div>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{x.q}</div>
      {v && <div style={{ marginTop: 8, display: 'grid', gap: 6, maxWidth: 520 }}><VBar v={v} h={4} /><VLeg v={v} size={11.5} /></div>}
    </div>
    <span style={{ color: C.text3 }}><I n="right" s={16} /></span>
  </div>;
}
/* ---------- Событие (уровень «работа») ---------- */
function Event({ w, a }: { w: Work; a: any }) {
  const open = !!a.openW[w.key]; const can = w.cards.length > 0;
  return <div style={{ ...card({ padding: 0, overflow: 'hidden' }), position: 'relative' }}>
    <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, background: w.color }} />
    <button aria-expanded={can ? open : undefined} disabled={!can} onClick={() => a.togW(w.key)} style={{ ...bare, display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', padding: M ? '14px 14px 14px 18px' : '16px 18px 16px 22px', cursor: can ? 'pointer' : 'default' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: w.color === C.gray ? C.text2 : w.color, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{w.time}</span>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.35 }}>{w.title}</span>
        <span style={{ display: 'block', fontSize: 12, color: C.text3, marginTop: 5 }}>{w.meta}</span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        {w.pill && !M && <Pill tone="accO">{w.pill}</Pill>}
        {can && <span style={{ color: C.text3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><I n="down" s={18} /></span>}
      </span>
    </button>
    {open && <div style={{ padding: M ? '0 12px 6px 18px' : '0 18px 6px 22px' }}>
      {w.cards.map((c: Card) => c.k === 'i' ? <ItemCard key={c.x.id} i={c.x} open={!!a.openI[c.x.id]} toggle={() => a.togI(c.x.id)} /> : <BillRow key={c.x.id} c={c} a={a} />)}
    </div>}
  </div>;
}
function DayBlock({ d, a, withReg }: { d: string; a: any; withReg: boolean }) {
  const ws = worksOf(d, a.f, withReg); if (!ws.length) return null;
  const byOrg: [string, Work[]][] = []; ws.forEach((w: Work) => { const g = byOrg.find((x: [string, Work[]]) => x[0] === w.org); if (g) g[1].push(w); else byOrg.push([w.org, [w]]); });
  return <section style={{ display: 'grid', gap: 10 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <button onClick={() => a.pickDay(d)} style={{ ...bare, fontSize: 16, fontWeight: 600, color: C.text, minHeight: M ? 44 : undefined }}>{d === TODAY ? <><span style={{ color: C.aT }}>Сегодня</span> · {wd(d)}, {dLong(d)}</> : <>{cap(wd(d))}, {dLong(d)}</>}</button>
      <button onClick={() => a.openNews(d)} style={{ ...bare, color: C.aT, fontSize: 12.5, fontWeight: 500, minHeight: M ? 44 : undefined }}>Сводка дня →</button>
    </div>
    {byOrg.map((g: [string, Work[]]) => <div key={g[0]} style={{ display: 'grid', gap: 8 }}>
      <div style={{ ...lbl(), display: 'flex', gap: 8, alignItems: 'center' }}>{ORGN[g[0]]}<span style={{ color: C.text3, fontWeight: 500 }}>· {g[1].reduce((s: number, w: Work) => s + Math.max(w.cards.length, 0), 0) || ''}</span></div>
      {g[1].map((w: Work) => <Event key={w.key} w={w} a={a} />)}
    </div>)}
  </section>;
}

/* ---------- Левая колонка ---------- */
function MonthCal({ a }: { a: any }) {
  const [mm, yy] = a.month.split('.').map(Number); const first = new Date(yy, mm - 1, 1); const off = (first.getDay() + 6) % 7; const dim = new Date(yy, mm, 0).getDate(); const rows = Math.ceil((off + dim) / 7);
  const cells: Date[] = []; for (let i = 0; i < rows * 7; i++) cells.push(new Date(yy, mm - 1, 1 - off + i));
  const mi = MONTHS.indexOf(a.month);
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      <button aria-label="Предыдущий месяц" disabled={mi <= 0} onClick={() => a.setMonth(MONTHS[mi - 1])} style={{ ...bare, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mi <= 0 ? C.text3 : C.text }}><I n="left" s={18} /></button>
      <span style={{ fontSize: 18, fontWeight: 600, minWidth: 128, textAlign: 'center' }}>{MONN[mm - 1]} {yy}</span>
      <button aria-label="Следующий месяц" disabled={mi >= MONTHS.length - 1} onClick={() => a.setMonth(MONTHS[mi + 1])} style={{ ...bare, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mi >= MONTHS.length - 1 ? C.text3 : C.text }}><I n="right" s={18} /></button>
      <span style={{ flex: 1 }} />
      <button onClick={a.goToday} style={{ ...bare, minHeight: M ? 44 : 30, padding: '0 18px', borderRadius: 999, background: C.accSoft, border: `1px solid ${C.accLine}`, color: C.aT, fontSize: 13, fontWeight: 600 }}>Сегодня</button>
    </div>
    <div style={{ background: C.panel, border: `1px solid ${C.soft}`, borderRadius: 14, padding: M ? '10px 6px' : '12px 12px 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 11, color: C.text3, marginBottom: 6 }}>{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((x: string) => <span key={x} style={{ padding: '6px 0' }}>{x}</span>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
        {cells.map((x: Date) => { const d = fmtD(x); const inM = x.getMonth() === mm - 1; const mk = inM ? a.marks(d) : []; const sel = a.mode === 'day' && d === a.sel && inM; const tod = d === TODAY;
          return <button key={d} onClick={() => inM && a.pickDay(d)} aria-label={`${dLong(d)}${mk.length ? ', есть события' : ''}`} aria-current={sel ? 'date' : undefined} style={{ ...bare, height: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: inM ? 'pointer' : 'default', textAlign: 'center' }}>
            <span style={{ width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: sel || tod ? 700 : 400, background: sel ? C.acc : 'transparent', color: sel ? '#fff' : !inM ? C.text3 : tod ? C.aT : C.text2, boxShadow: tod && !sel ? `inset 0 0 0 1.5px ${C.acc}` : 'none', opacity: inM ? 1 : 0.7 }}>{x.getDate()}</span>
            <span style={{ display: 'flex', gap: 3, height: 3 }}>{mk.map((c: string, i: number) => <span key={i} style={{ width: 10, height: 3, borderRadius: 2, background: c }} />)}</span>
          </button>; })}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px', marginTop: 12, fontSize: 11.5, color: C.text2 }}>
      {([['Пленарное', C.blue], ['Правительство', C.green], ['Регионы', C.pink], ['Комитеты и органы', C.mark], ['Вступают в силу', C.yellow]] as [string, string][]).map((x: [string, string]) => <span key={x[0]} style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: x[1] }} />{x[0]}</span>)}
      <button onClick={() => a.setWhat(!a.what)} style={{ ...bare, color: C.text3, fontSize: 11.5, justifySelf: 'end', minHeight: M ? 44 : undefined }}>Что это?</button>
    </div>
    {a.what && <p style={{ fontSize: 12, lineHeight: 1.55, color: C.text2, margin: '10px 0 0' }}>Синие метки — пленарные заседания Госдумы (прошедшие и запланированные); зелёные — заседания и решения Правительства; розовые — региональная неделя депутатов; серые — работа Госдумы вне пленарных заседаний и документы других органов; жёлтые — дни вступления законов в силу.</p>}
  </div>;
}
function FiltersMini({ a }: { a: any }) {
  const act: [string, string][] = []; ZG.forEach((g: [string, string, string[]]) => a.zs[g[0]].forEach((x: string) => act.push([g[0], x])));
  const bills = new Set<string>(); V.forEach((v: any) => { if (v.b && v.d.slice(3) === a.month && okV(a.f, v)) bills.add(v.b); }); PL.forEach((p: any) => { if (p.d.slice(3) === a.month && okP(a.f, p)) bills.add(p.b); });
  const mm = +a.month.slice(0, 2) - 1;
  return <div style={card({ padding: 16, background: C.panel })}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Фильтры</span><button onClick={() => a.go('search')} style={{ ...bare, color: C.aT, fontSize: 12.5, fontWeight: 500, minHeight: M ? 44 : undefined }}>Изменить</button></div>
    {act.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>{act.map((x: [string, string]) => <button key={x[1]} onClick={() => a.togZ(x[0], x[1])} style={{ ...bare, display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: M ? 44 : 28, padding: '0 12px', borderRadius: 999, background: C.accSoft, color: C.accText, fontSize: 12 }}>{x[1]}<I n="close" s={11} /></button>)}</div>}
    <div style={{ ...lbl(), marginBottom: 8 }}>Органы · {a.orgs.length} из 8</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ORGS.map((o: [string, string]) => { const on = a.orgs.includes(o[0]); return <label key={o[0]} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: M ? 44 : 28, padding: '0 10px', borderRadius: 999, border: `1px solid ${on ? C.accLine : C.line}`, background: on ? C.accSoft : 'transparent', color: on ? C.accText : C.text3, fontSize: 12, cursor: 'pointer' }}><input type="checkbox" checked={on} onChange={() => a.togOrg(o[0])} style={{ accentColor: C.acc, margin: 0, width: 14, height: 14 }} />{o[1]}</label>; })}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
      <span style={{ fontSize: 12.5, color: C.text2 }}>{anyTags(a.f) ? `Подобрано ${bills.size} ${plural(bills.size, 'законопроект', 'законопроекта', 'законопроектов')} за ${MONN[mm].toLowerCase()}` : `Законопроектов в ${MONP[mm]}: ${bills.size}`}</span>
      <button onClick={a.resetAll} style={{ ...bare, color: C.aT, fontSize: 12.5, fontWeight: 600, minHeight: M ? 44 : 28 }}>Сбросить</button>
    </div>
  </div>;
}
function savedObj(k: string): any { const [t, ...r] = k.split(':'); const id = r.join(':'); if (t === 'v') { const v = V.find((x: any) => x.id === id); return v ? { k, t, x: v, title: v.q, no: '№ ' + v.doc, st: vStatus(v), sub: `${rdL(v.rd) ? rdL(v.rd) + ' · ' : ''}${dLong(v.d)}`, meta: `${rdL(v.rd) || 'Голосование'} · ${v.tot[0]} за${v.ok ? '' : ' / ' + thr(v) + ' нужно'}` } : null; } if (t === 'p') { const p = PL.find((x: any) => x.id === id); return p ? { k, t, x: p, title: p.q, no: '№ ' + p.b, st: ['На рассмотрении', 'warn'], sub: `${p.rd} · ${dLong(p.d)} (план)`, meta: `Следующий этап: ${p.rd}, ${dLong(p.d)}` } : null; } const l = LAWS.find((x: any) => lk(x) === id); return l ? { k, t, x: l, title: l.t, no: lawNo(l.law), st: [k8(l.d) <= k8(TODAY) ? `В силе с ${l.d.slice(0, 5)}` : `Вступит ${l.d.slice(0, 5)}`, k8(l.d) <= k8(TODAY) ? 'ok' : 'warn'], sub: `${k8(l.d) <= k8(TODAY) ? 'В силе' : 'Вступит'} с ${dLong(l.d)}`, meta: partial(l.law) ? 'Отдельные положения' : l.who } : null; }
function SavedMini({ a }: { a: any }) {
  const it = a.saved.map(savedObj).filter(Boolean);
  if (!it.length) return null;
  return <div style={card({ padding: 16, background: C.panel })}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Сохранённые</span><span style={{ fontSize: 12, color: C.text3 }}>{it.length}</span></div>
    {it.slice(0, 3).map((o: any) => <button key={o.k} onClick={() => a.openSaved(o)} style={{ ...bare, display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', padding: '10px 0', minHeight: 44 }}><span style={{ color: C.yT, marginTop: 1 }}><I n="star" s={15} f /></span><span><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{o.title}</span><span style={{ display: 'block', fontSize: 11.5, color: C.text3, marginTop: 3 }}>{o.st[0]} · {o.sub}</span></span></button>)}
    <button onClick={() => a.go('saved')} style={{ ...bare, color: C.aT, fontSize: 12.5, fontWeight: 500, marginTop: 4, minHeight: M ? 44 : 28 }}>Все сохранённые →</button>
  </div>;
}

/* ---------- Экран 1: календарь ---------- */
function VoteCard({ v, a }: { v: any; a: any }) {
  const st = vStatus(v); const tg = tagsOf(v.b).slice(0, 3);
  return <div role="button" tabIndex={0} className="hv" onClick={() => a.openBill('v', v.id)} onKeyDown={(e: KbEvent<HTMLDivElement>) => { if (e.key === 'Enter') a.openBill('v', v.id); }} style={card({ padding: M ? 16 : '18px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{v.doc && v.doc !== '—' ? <Pill>№ {v.doc}</Pill> : <Pill tone="out">Процедурное</Pill>}{rdL(v.rd) && <Pill tone="out">{rdL(v.rd)}</Pill>}<span style={{ flex: 1 }} /><Pill tone={st[1]} big>{st[0]}</Pill></div>
    <div><div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{v.q}</div><div className="cl2" style={{ fontSize: 12.5, color: C.text2, marginTop: 6, lineHeight: 1.45 }}>{(v.sut && v.sut[0]) || v.t}</div></div>
    <VBar v={v} h={6} /><VLeg v={v} />
    {tg.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{tg.map((x: string, i: number) => <Pill key={x} tone={i ? 'out' : 'acc'}>{x}</Pill>)}</div>}
  </div>;
}
function CalScreen({ a }: { a: any }) {
  const f: Flt = a.f; const nar = a.nar;
  const mDays = DAYS.filter((d: string) => d.slice(3) === a.month);
  const mm = +a.month.slice(0, 2) - 1; const yy = a.month.slice(3);
  const nW = mDays.reduce((s: number, d: string) => s + worksOf(d, f, false).length, 0);
  const nV = V.filter((v: any) => v.d.slice(3) === a.month && okV(f, v)).length;
  const daySel = a.mode === 'day' ? a.sel : (mDays.find((d: string) => worksOf(d, f, false).length) || a.sel);
  const vd = VDAYS.find((d: string) => k8(d) <= k8(daySel) && V.some((v: any) => v.d === d && okV(f, v)));
  const vAll = vd ? V.filter((v: any) => v.d === vd && okV(f, v)) : [];
  const pick = vAll.filter((v: any) => v.b && !/^Пост/.test(v.doc)).slice().sort((x: any, y: any) => (x.ok === y.ok ? tagsOf(y.b).length - tagsOf(x.b).length : x.ok ? 1 : -1)).slice(0, 2);
  const wk = (() => { const x = toD(daySel); const off = (x.getDay() + 6) % 7; const s = new Date(x.getFullYear(), x.getMonth(), x.getDate() - off); const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6); return [fmtD(s), fmtD(e)]; })();
  let laws = LAWS.filter((l: any) => k8(l.d) >= k8(wk[0]) && k8(l.d) <= k8(wk[1])); let lt = 'Вступают в силу на этой неделе';
  if (!laws.length) { laws = LAWS.filter((l: any) => l.d.slice(3) === daySel.slice(3)); lt = `Вступают в силу в ${MONP[+daySel.slice(3, 5) - 1]}`; }
  const none = !a.orgs.length;
  const left = <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}><MonthCal a={a} /><FiltersMini a={a} /><SavedMini a={a} /></div>;
  const dayList = a.mode === 'day' ? [a.sel] : mDays;
  const shown = dayList.filter((d: string) => worksOf(d, f, a.mode === 'day').length);
  const right = <div style={{ display: 'grid', gap: 22, alignContent: 'start', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div><h1 style={{ margin: 0, fontSize: M ? 22 : 24, fontWeight: 600 }}>События</h1><div style={{ fontSize: 11.5, color: C.text3, marginTop: 6 }}>{MONN[mm]} {yy} · {nW} {plural(nW, 'событие', 'события', 'событий')} · {nV} {plural(nV, 'голосование', 'голосования', 'голосований')}</div></div>
      <Seg items={[['day', 'День'], ['month', 'Весь месяц']]} value={a.mode} onChange={(v: string) => a.setMode(v)} />
    </div>
    {none ? <div style={card({ padding: 20 })}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Не выбран ни один орган — календарь пуст</div><div style={{ fontSize: 13, color: C.text2, marginBottom: 14 }}>Отметьте хотя бы один орган в «Фильтрах» или верните все 8.</div><Btn primary onClick={a.resetOrgs}>Сбросить</Btn></div>
      : shown.length ? <div style={{ display: 'grid', gap: 22 }}>{shown.map((d: string) => <DayBlock key={d} d={d} a={a} withReg={a.mode === 'day'} />)}</div>
        : <div style={card({ padding: 20, fontSize: 13.5, color: C.text2 })}>{a.mode === 'day' ? `${cap(wd(a.sel))}, ${dLong(a.sel)}: по выбранным фильтрам событий нет.` : 'По выбранным фильтрам в этом месяце событий нет.'} <button onClick={() => a.setMode(a.mode === 'day' ? 'month' : 'day')} style={{ ...bare, color: C.aT, fontWeight: 600 }}>{a.mode === 'day' ? 'Показать весь месяц' : 'Сбросить фильтры'}</button></div>}
    {!none && pick.length > 0 && <section style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}><h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{vd === daySel ? 'Голосования дня' : `Последние голосования · ${dLong(vd as string)}`}</h2><button onClick={() => a.openPlen(vd)} style={{ ...bare, color: C.aT, fontSize: 12.5, fontWeight: 500, minHeight: M ? 44 : undefined }}>все {vAll.length} →</button></div>
      <div style={{ display: 'grid', gridTemplateColumns: nar ? '1fr' : '1fr 1fr', gap: 16 }}>{pick.map((v: any) => <VoteCard key={v.id} v={v} a={a} />)}</div>
    </section>}
    {!none && laws.length > 0 && <div style={card({ padding: M ? 16 : '18px 20px' })}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{lt}</div>
      <div style={{ display: 'grid', gridTemplateColumns: nar ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '10px 20px' }}>{laws.slice(0, 6).map((l: any) => <button key={lk(l)} onClick={() => a.openLaw(l)} style={{ ...bare, fontSize: 12.5, color: C.text2, lineHeight: 1.45, minHeight: M ? 44 : undefined }}><span style={{ color: k8(l.d) <= k8(TODAY) ? C.gT : C.yT, fontWeight: 600 }}>{+l.d.slice(0, 2)} {MONS[+l.d.slice(3, 5) - 1]}</span> · {l.t}</button>)}</div>
    </div>}
  </div>;
  if (nar) return <div style={{ display: 'grid', gap: 22 }}><MonthCal a={a} />{right}<FiltersMini a={a} /><SavedMini a={a} /></div>;
  return <div style={{ display: 'grid', gridTemplateColumns: '350px minmax(0, 1fr)', gap: 24 }}>{left}{right}</div>;
}

/* ---------- Экран 2: законопроект ---------- */
const STG: [string, string][] = [['in', 'Внесён'], ['kom', 'Комитет'], ['r1', '1-е чтение'], ['r2', '2-е чтение'], ['r3', '3-е чтение'], ['sf', 'Совет Федерации'], ['sign', 'Президент'], ['pub', 'Опубликование'], ['force', 'Вступление в силу']];
function Path({ b, v, p }: { b: any; v: any; p: any }) {
  const tr: Record<string, string> = (b && b.tr) || {}; const fk = v && !v.ok ? ({ '1-е': 'r1', '2-е': 'r2', '3-е': 'r3' } as Record<string, string>)[v.rd] || 'r1' : '';
  const pk = p ? 'r1' : '';
  return <div style={{ position: 'relative', display: 'grid', gap: 0 }}>
    {STG.map((s: [string, string], i: number) => { const dt = tr[s[0]]; const fail = s[0] === fk; const plan = s[0] === pk; const done = !!dt && !fail; const col = fail ? C.red : done ? C.green : plan ? C.acc : C.track;
      return <div key={s[0]} style={{ display: 'flex', gap: 12, minHeight: 42 }}>
        <div style={{ position: 'relative', width: 12, display: 'flex', justifyContent: 'center' }}>
          {i < STG.length - 1 && <div style={{ position: 'absolute', top: 14, bottom: -2, width: 2, background: done ? C.green + '66' : C.track }} />}
          <div style={{ width: 11, height: 11, borderRadius: 6, marginTop: 4, background: done || fail ? col : C.card, border: `2px solid ${col}`, zIndex: 1 }} />
        </div>
        <div style={{ paddingBottom: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: done || fail || plan ? 600 : 400, color: fail ? C.rT : plan ? C.aT : done ? C.text : C.text3 }}>{s[1]}{fail ? ' — отклонён' : ''}{plan ? ' — запланировано' : ''}</div>
          {(dt || plan) && <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{plan ? p.d : dt}{fail && v.tm ? ' · ' + hm(v) : ''}</div>}
        </div>
      </div>; })}
  </div>;
}
function BillScreen({ a }: { a: any }) {
  const v = a.bill.k === 'v' ? V.find((x: any) => x.id === a.bill.id) : null; const p = a.bill.k === 'p' ? PL.find((x: any) => x.id === a.bill.id) : null; const x = v || p; if (!x) return null;
  const bn = x.b; const b = B[bn] || {}; const day = x.d; const st: [string, string] = v ? vStatus(v) : ['На рассмотрении', 'warn'];
  const sk = (v ? 'v:' : 'p:') + x.id; const on = a.saved.includes(sk); const nDay = V.filter((y: any) => y.d === day).length; const others = v ? V.filter((y: any) => y.b && y.b === bn && y.id !== v.id) : [];
  const s = v ? sum(v.tot) : 450; const tg = tagsOf(bn);
  const main = <div style={card({ padding: M ? 16 : '24px 28px', display: 'grid', gap: 18, minWidth: 0 })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><Pill>№ {v ? v.doc : bn}</Pill>{rdL(x.rd) && <Pill tone="out">{rdL(x.rd)}</Pill>}<span style={{ flex: 1 }} />
      {v && <Btn small onClick={() => a.openShare(v.id, 'png')}>Поделиться</Btn>}<Btn small primary onClick={() => a.togSave(sk)}>{on ? <><I n="check" s={14} />Сохранено</> : 'Сохранить'}</Btn></div>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}><h1 style={{ margin: 0, fontSize: M ? 22 : 27, fontWeight: 600, lineHeight: 1.25, flex: '1 1 320px' }}>{x.q}</h1><Pill tone={st[1]} big>{st[0]}</Pill></div>
    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.text2 }}>{x.t}</p>
    {tg.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{tg.map((t: string, i: number) => <Pill key={t} tone={i ? 'out' : 'acc'}>{t}</Pill>)}</div>}
    <div style={{ height: 1, background: C.soft }} />
    <div style={{ display: 'grid', gridTemplateColumns: M ? '1fr' : '1fr 1fr', gap: 14 }}>
      {!!(x.sut && x.sut.length) && <Box label="Суть"><Paras a={x.sut} /></Box>}
      {x.who && <Box label={v ? (v.ok ? 'Кого коснется' : 'Кого коснулось бы') : 'Кого может коснуться'}>{x.who}</Box>}
    </div>
    {v && !!(v.nx && v.nx.length) && <Box label={v.ok ? 'Что дальше' : 'Почему отклонили'} tone={v.ok ? 'ok' : 'rej'}><Paras a={v.nx} /></Box>}
    {p && <Box label="Что дальше" tone="ok">{`${p.rd} запланировано на ${p.d} (${wd(p.d)}). Голосования по законопроекту ещё не было.`}</Box>}
    {v && <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><span style={lbl()}>Итоги голосования</span><span style={{ fontSize: 12, color: C.text3, fontVariantNumeric: 'tabular-nums' }}>{v.d}{v.tm ? ' · ' + hm(v) : ''}</span></div>
      <VBar v={v} h={8} mk />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><VLeg v={v} /><span style={{ fontSize: 12, color: C.text3 }}>порог принятия — {thr(v)}</span></div>
      {v.fr && <div style={{ display: 'grid', gap: 10, marginTop: 8 }}><span style={lbl()}>По фракциям</span>
        {FR.map((fr: [string, string], i: number) => { const r = v.fr[i]; if (!r) return null; const pc = Math.round(r[0] / (r[4] || 1) * 100); const ex: string[] = []; if (r[1]) ex.push(`против ${r[1]}`); if (r[2]) ex.push(`возд. ${r[2]}`);
          return <div key={fr[0]} style={{ display: 'grid', gridTemplateColumns: M ? '1fr' : '150px minmax(0,1fr) 150px', gap: M ? 6 : 16, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: C.text }}>{fr[1]}</span>
            <div style={{ position: 'relative', height: 7, borderRadius: 4, background: C.track }}><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pc}%`, background: C.green, borderRadius: 4 }} />{r[1] > 0 && <div style={{ position: 'absolute', left: `${pc}%`, top: 0, bottom: 0, width: `${r[1] / r[4] * 100}%`, background: C.red }} />}</div>
            <span style={{ color: C.text2, textAlign: M ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12.5 }}>{pc}% · {r[0]} из {r[4]}{ex.length ? ' · ' + ex.join(', ') : ''}</span>
          </div>; })}
        <span style={{ fontSize: 11.5, color: C.text3 }}>Доля голосов «за» от численности фракции; всего {s} депутатов.</span>
      </div>}
    </div>}
  </div>;
  const side = <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
    <div style={card({ padding: '18px 20px' })}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Путь закона</div><Path b={b} v={v} p={p} /></div>
    {(b.ini || b.com) && <div style={card({ padding: '16px 20px', display: 'grid', gap: 12 })}>
      {b.ini && <div><div style={{ ...lbl(), marginBottom: 6 }}>{String(b.ini[0]).split(' — ')[0]}</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{String(b.ini[0]).split(' — ')[1] ? cap(String(b.ini[0]).split(' — ')[1]) : ''}{b.ini[1] ? <><br /><span style={{ color: C.text2 }}>{b.ini[1]}</span></> : null}</div></div>}
      {b.com && <div><div style={{ ...lbl(), marginBottom: 6 }}>Ответственный комитет</div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{b.com}</div></div>}
    </div>}
    <div style={card({ padding: '8px 20px' })}>
      {([[`Законопроект на sozd.duma.gov.ru`, `https://sozd.duma.gov.ru/bill/${bn}`, 'doc'], ...(b.tx ? [[`Текст законопроекта (${b.tx.fmt === 'msword' ? 'DOC' : String(b.tx.fmt).toUpperCase()})`, `https://sozd.duma.gov.ru/download/${b.tx.id}`, 'doc']] : []), ...(v ? [[`Результат голосования № ${v.id}`, `http://vote.duma.gov.ru/vote/${v.id}`, 'chart']] : [])] as string[][]).map((l: string[]) => <a key={l[1]} href={l[1]} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, color: C.text, textDecoration: 'none', fontSize: 13, borderBottom: `1px solid ${C.soft}` }}><span style={{ color: C.aT }}><I n={l[2]} s={16} /></span><span style={{ flex: 1 }}>{l[0]}</span><span style={{ color: C.text3 }}><I n="ext" s={14} /></span></a>)}
    </div>
    {others.length > 0 && <div style={card({ padding: '14px 20px' })}><div style={{ ...lbl(), marginBottom: 8 }}>Другие голосования</div>{others.map((o: any) => <button key={o.id} onClick={() => a.openBill('v', o.id)} style={{ ...bare, display: 'block', width: '100%', padding: '8px 0', fontSize: 13, minHeight: 44 }}>{o.d} · {rdL(o.rd) || 'голосование'} · <span style={{ color: o.ok ? C.gT : C.rT }}>{vStatus(o)[0]}</span></button>)}</div>}
  </div>;
  return <div style={{ display: 'grid', gap: 16 }}>
    <button onClick={() => (v ? a.openPlen(day) : a.openPlen(day))} style={{ ...bare, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text2, minHeight: 36 }}><I n="back" s={16} />{dLong(day)}, {wd(day)} · Пленарное заседание · {v ? `Голосований: ${nDay}` : `Повестка: ${PL.filter((y: any) => y.d === day).length}`}</button>
    <div style={{ display: 'grid', gridTemplateColumns: a.nar ? '1fr' : 'minmax(0,1fr) 330px', gap: 18 }}>{main}{side}</div>
  </div>;
}

/* ---------- Экран 3: вступают в силу ---------- */
function LawsScreen({ a }: { a: any }) {
  const ms = Array.from(new Set<string>(LAWS.map((l: any) => l.d.slice(3)))).sort((x: string, y: string) => (x.slice(3) + x.slice(0, 2)).localeCompare(y.slice(3) + y.slice(0, 2)));
  const mi = ms.indexOf(a.lawM); const mm = +a.lawM.slice(0, 2) - 1;
  const all = LAWS.filter((l: any) => l.d.slice(3) === a.lawM && (!a.f.q || norm([l.t, l.sut, l.who, l.law, l.was || '', l.now || ''].join(' ')).includes(norm(a.f.q))));
  const past = all.filter((l: any) => k8(l.d) <= k8(TODAY)).length;
  const list = all.filter((l: any) => a.lawF === 'all' || (a.lawF === 'in' ? k8(l.d) <= k8(TODAY) : k8(l.d) > k8(TODAY)));
  const dates = Array.from(new Set<string>(list.map((l: any) => l.d)));
  return <div style={{ display: 'grid', gap: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1 style={{ margin: 0, fontSize: M ? 22 : 24, fontWeight: 600 }}>Вступают в силу</h1><Seg items={[['all', 'Все'], ['in', 'Вступили'], ['next', 'Вступят']]} value={a.lawF} onChange={(v: string) => a.setLawF(v)} /></div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: C.card, border: `1px solid ${C.line}`, padding: 2 }}>
        <button aria-label="Предыдущий месяц" disabled={mi <= 0} onClick={() => a.setLawM(ms[mi - 1])} style={{ ...bare, width: 40, height: M ? 44 : 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mi <= 0 ? C.text3 : C.text }}><I n="left" s={16} /></button>
        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 104, textAlign: 'center' }}>{MONN[mm]} {a.lawM.slice(3)}</span>
        <button aria-label="Следующий месяц" disabled={mi >= ms.length - 1} onClick={() => a.setLawM(ms[mi + 1])} style={{ ...bare, width: 40, height: M ? 44 : 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: mi >= ms.length - 1 ? C.text3 : C.text }}><I n="right" s={16} /></button>
      </div>
      <span style={{ fontSize: 12.5, color: C.text2 }}>В {MONP[mm]} {all.length} {plural(all.length, 'закон', 'закона', 'законов')} · <span style={{ color: C.gT }}>вступили — {past}</span> · <span style={{ color: C.yT }}>вступят — {all.length - past}</span></span>
    </div>
    <div style={{ position: 'relative', paddingLeft: M ? 26 : 94 }}>
      <div style={{ position: 'absolute', left: M ? 6 : 76, top: 10, bottom: 10, width: 2, background: C.line }} />
      {dates.map((d: string) => { const inF = k8(d) <= k8(TODAY); const ls = list.filter((l: any) => l.d === d);
        return <div key={d} style={{ position: 'relative', marginBottom: 22 }}>
          <div style={{ position: 'absolute', left: M ? -26 : -24, top: 5, width: 14, height: 14, borderRadius: 7, background: inF ? C.green : C.yellow, boxShadow: `0 0 0 4px ${C.page}` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}><span style={{ fontSize: 15, fontWeight: 600 }}>{dLong(d)}, {wd(d)}</span><span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 999, background: inF ? C.greenSoft : C.yellowSoft, color: inF ? C.gT : C.yT }}>{inF ? 'В СИЛЕ' : `ВСТУПИТ · ЧЕРЕЗ ${daysBetween(TODAY, d)} ${plural(daysBetween(TODAY, d), 'ДЕНЬ', 'ДНЯ', 'ДНЕЙ').toUpperCase()}`}</span></div>
          <div style={{ display: 'grid', gap: 8 }}>{ls.map((l: any) => { const op = !!a.openL[lk(l)]; const sk = 'l:' + lk(l);
            return <div key={lk(l)} style={card({ padding: 0, background: C.card })}>
              <div role="button" tabIndex={0} aria-expanded={op} onClick={() => a.togL(lk(l))} onKeyDown={(e: KbEvent<HTMLDivElement>) => { if (e.key === 'Enter') a.togL(lk(l)); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: M ? '12px 12px' : '14px 18px', cursor: 'pointer', flexWrap: M ? 'wrap' : 'nowrap', minHeight: 44 }}>
                <span style={{ flex: '1 1 260px', fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>{l.t}</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Pill>{lawNo(l.law)}</Pill>{partial(l.law) && <Pill tone="warn">ЧАСТИЧНО</Pill>}</span>
                <Star on={a.saved.includes(sk)} onClick={() => a.togSave(sk)} s={16} />
                <span style={{ color: C.text3, transform: op ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><I n="right" s={16} /></span>
              </div>
              {op && <div style={{ padding: M ? '0 12px 14px' : '0 18px 18px', display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><Pill tone={inF ? 'ok' : 'warn'} big>{inF ? `В СИЛЕ С ${d.slice(0, 5)}` : `ВСТУПИТ ${d.slice(0, 5)}`}</Pill><span style={{ fontSize: 12, color: C.text3 }}>{l.law}</span></div>
                {l.was && l.now ? <div style={{ display: 'grid', gridTemplateColumns: M ? '1fr' : '1fr 1fr', gap: 12 }}><Box label="Было">{l.was}</Box><Box label="Стало" tone="ok">{l.now}</Box></div> : <Box label="Суть">{l.sut}</Box>}
                {l.was && l.now && <div style={{ fontSize: 13, color: C.text2 }}>{l.sut}</div>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: C.text2 }}><span style={{ color: C.yT }}><I n="info" s={16} /></span>Коснётся: {l.who}</div>
                <div style={{ fontSize: 11.5, color: C.text3 }}>Источник: {(l.src || []).map((s: string[], j: number) => <a key={j} href={s[0]} target="_blank" rel="noopener noreferrer" style={{ color: C.aT, textDecoration: 'none' }}>{j ? ', ' : ''}{s[1]}</a>)}</div>
              </div>}
            </div>; })}</div>
        </div>; })}
      {!dates.length && <div style={card({ padding: 18, fontSize: 13.5, color: C.text2 })}>В этом месяце по выбранному условию законов нет.</div>}
    </div>
  </div>;
}

/* ---------- Экран 4: день (вкладка «Новости») ---------- */
function DayScreen({ a }: { a: any }) {
  const d = a.news; const di = DAYS.indexOf(d); const f: Flt = a.f;
  const vs = V.filter((v: any) => v.d === d && okV(f, v)); const ps = PL.filter((p: any) => p.d === d && okP(f, p)); const its = IT.filter((i: any) => i.d === d && okI(f, i));
  const orgsHere = ALL.filter((o: string) => (o === 'gd' && (vs.length || ps.length)) || its.some((i: any) => i.o === o));
  const cnt = (o: string) => (o === 'gd' ? vs.length + ps.length : 0) + its.filter((i: any) => i.o === o).length;
  const of = a.newsOrg; const vis = (o: string) => of === 'all' || of === o;
  const okA = vs.filter((v: any) => v.ok).length;
  let head: any = null;
  if (vs.length && vis('gd')) head = { t: `Госдума провела пленарное заседание: ${vs.length} ${plural(vs.length, 'голосование', 'голосования', 'голосований')}`, x: `Принято ${okA}, отклонено ${vs.length - okA}. Первое голосование — в ${hm(vs[0])}.`, n: String(okA), n1: `${plural(okA, 'решение принято', 'решения принято', 'решений принято')} · ${vs.length - okA} откл.`, n2: `из ${vs.length} голосований`, meta: `${hm(vs[0])} · Госдума`, go: () => a.openPlen(d) };
  else if (ps.length && vis('gd')) head = { t: `Пленарное заседание Госдумы: в повестке ${ps.length} ${plural(ps.length, 'законопроект', 'законопроекта', 'законопроектов')}`, x: ps.map((p: any) => p.q).join(' · '), n: String(ps.length), n1: 'в повестке', n2: ps[0].rd + ' (план)', meta: 'План · Госдума', go: () => a.openPlen(d) };
  else { const i0 = its.find((i: any) => vis(i.o)); if (i0) head = { t: i0.t, x: (i0.sut && i0.sut[0]) || '', n: String(its.filter((i: any) => vis(i.o)).length), n1: 'материалов за день', n2: ORGN[i0.o], meta: ORGN[i0.o] + (i0.st ? ' · ' + i0.st : ''), go: () => a.togI(i0.id) }; }
  const rows: any[] = [];
  if (vis('gd')) { vs.filter((v: any) => v.b).forEach((v: any) => rows.push({ id: v.id, o: 'gd', lab: `Госдума · ${hm(v)}`, t: `${v.q}: ${v.ok ? 'принят' : 'отклонён'}${rdL(v.rd) ? ' (' + rdL(v.rd) + ')' : ''}`, go: () => a.openBill('v', v.id) })); ps.forEach((p: any) => rows.push({ id: p.id, o: 'gd', lab: 'Госдума · план', t: `${p.q}: ${p.rd}`, go: () => a.openBill('p', p.id) })); }
  its.filter((i: any) => vis(i.o)).forEach((i: any) => rows.push({ id: i.id, o: i.o, lab: `${ORGN[i.o]} · ${i.k}`, t: i.t, item: i }));
  const shown = a.newsMore ? rows : rows.slice(0, 8);
  const wk = (() => { const x = toD(d); const off = (x.getDay() + 6) % 7; const r: string[] = []; for (let i = 0; i < 7; i++) r.push(fmtD(new Date(x.getFullYear(), x.getMonth(), x.getDate() - off + i))); return r; })();
  const lawsD = LAWS.filter((l: any) => l.d === d).length;
  const srcs = Array.from(new Set<string>([...(vs.length ? ['vote.duma.gov.ru'] : []), ...((vs.length || ps.length) ? ['sozd.duma.gov.ru'] : []), ...its.map((i: any) => host((i.src && i.src[0] && i.src[0][0]) || ''))].filter(Boolean)));
  const ocol = (o: string) => o === 'gd' ? C.aT : o === 'gov' ? C.yT : C.text2;
  return <div style={{ display: 'grid', gap: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button aria-label="Предыдущий день" disabled={di >= DAYS.length - 1} onClick={() => a.setNews(DAYS[di + 1])} style={{ ...bare, width: 40, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: di >= DAYS.length - 1 ? C.text3 : C.text }}><I n="left" s={20} /></button>
        <span style={{ fontSize: M ? 18 : 20, fontWeight: 600, minWidth: 150 }}>{WDS[toD(d).getDay()]}, {dLong(d)}</span>
        <button aria-label="Следующий день" disabled={di <= 0} onClick={() => a.setNews(DAYS[di - 1])} style={{ ...bare, width: 40, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: di <= 0 ? C.text3 : C.text }}><I n="right" s={20} /></button>
        <button aria-label="Открыть в календаре" onClick={() => a.pickDay(d, true)} style={{ ...bare, width: 40, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text2 }}><I n="cal" s={17} /></button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Chip on={of === 'all'} onClick={() => a.setNewsOrg('all')}>Все</Chip>{orgsHere.map((o: string) => <Chip key={o} on={of === o} onClick={() => a.setNewsOrg(o)}>{ORGN[o]} · {cnt(o)}</Chip>)}</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: a.nar ? '1fr' : 'minmax(0,1fr) 336px', gap: 18 }}>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        {head && <div role="button" tabIndex={0} onClick={head.go} onKeyDown={(e: KbEvent<HTMLDivElement>) => { if (e.key === 'Enter') head.go(); }} style={card({ padding: M ? 16 : '22px 24px', display: 'flex', gap: 20, flexWrap: 'wrap', cursor: 'pointer' })}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}><div style={{ ...lbl(), color: C.aT, marginBottom: 12 }}>Главное за день</div><div style={{ fontSize: M ? 18 : 20, fontWeight: 600, lineHeight: 1.35, marginBottom: 16 }}>{head.t}</div><div className="cl2" style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.5, marginBottom: 16 }}>{head.x}</div><div style={{ fontSize: 11.5, color: C.text3 }}>{head.meta}</div></div>
          <div style={{ flex: '0 0 auto', minWidth: 160, background: C.card2, borderRadius: 14, padding: '20px 24px', textAlign: 'center', alignSelf: 'center' }}><div style={{ fontSize: 34, fontWeight: 600, color: C.gT, fontVariantNumeric: 'tabular-nums' }}>{head.n}</div><div style={{ fontSize: 12, color: C.text3, marginTop: 6 }}>{head.n1}</div><div style={{ fontSize: 11, color: C.text3, marginTop: 14 }}>{head.n2}</div></div>
        </div>}
        {shown.map((r: any) => r.item ? <div key={r.id} style={card({ padding: M ? '4px 14px' : '6px 22px' })}><div style={{ ...lbl(), color: ocol(r.o), paddingTop: 12 }}>{r.lab}</div><ItemCard i={r.item} open={!!a.openI[r.id]} toggle={() => a.togI(r.id)} /></div>
          : <button key={r.id} className="hv" onClick={r.go} style={{ ...bare, ...card({ padding: M ? '14px 14px' : '18px 22px' }), display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}><span style={{ flex: 1 }}><span style={{ ...lbl(), color: ocol(r.o), display: 'block', marginBottom: 8 }}>{r.lab}</span><span style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{r.t}</span></span><span style={{ color: C.text3 }}><I n="right" s={18} /></span></button>)}
        {rows.length > 8 && <Btn full onClick={() => a.setNewsMore(!a.newsMore)}>{a.newsMore ? 'Свернуть' : `Показать ещё ${rows.length - 8}`}</Btn>}
        {!rows.length && !head && <div style={card({ padding: 18, fontSize: 13.5, color: C.text2 })}>По выбранным фильтрам в этот день материалов нет.</div>}
      </div>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <div style={card({ padding: '18px 20px' })}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Дайджест дня</div>
          {([['Голосования Госдумы', vs.length, C.blue], ['Законопроекты в повестке', ps.length, C.blue], ['Документы и решения органов', its.length, C.green], ['Вступили в силу', lawsD, C.pink]] as [string, number, string][]).map((x: [string, number, string]) => <div key={x[0]} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: x[2] }} /><span style={{ flex: 1, color: C.text }}>{x[0]}</span><span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{x[1]}</span></div>)}
        </div>
        <div style={card({ padding: '18px 20px' })}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Эта неделя</div>
          {wk.map((x: string) => { const nv = V.filter((v: any) => v.d === x).length, np = PL.filter((p: any) => p.d === x).length, ni = IT.filter((i: any) => i.d === x).length; if (!nv && !np && !ni) return null; const parts: string[] = []; if (nv) parts.push(`пленарное заседание, ${nv} ${plural(nv, 'голосование', 'голосования', 'голосований')}`); if (np) parts.push(`повестка: ${np} ${plural(np, 'законопроект', 'законопроекта', 'законопроектов')}`); if (ni) parts.push(`${ni} ${plural(ni, 'документ', 'документа', 'документов')} органов`);
            return <button key={x} onClick={() => a.setNews(x)} style={{ ...bare, display: 'block', width: '100%', padding: '6px 0', fontSize: 12.5, color: x === d ? C.aT : C.text2, minHeight: M ? 44 : undefined }}>{cap(WDS[toD(x).getDay()])} {+x.slice(0, 2)} — {parts.join('; ')}</button>; })}
        </div>
        {srcs.length > 0 && <div style={card({ padding: '18px 20px' })}><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Источники</div>{srcs.map((s: string) => <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.text2, padding: '5px 0' }}><span style={{ color: C.text3 }}><I n="link" s={14} /></span>{s}</div>)}</div>}
        <div style={{ ...card({ padding: '18px 20px' }), border: `1px solid ${C.acc}`, background: C === DARK ? '#151e31' : '#f1f5fd' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, marginBottom: 8 }}><span style={{ color: C.aT }}><I n="bell" s={18} /></span>Ежедневная сводка</div><div style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.5 }}>Сводка за вчерашний день по Госдуме и Правительству приходит в чат каждое утро около 08:30 по Москве.</div></div>
      </div>
    </div>
  </div>;
}

/* ---------- Экран 5: поиск и фильтры ---------- */
function SearchScreen({ a }: { a: any }) {
  const f: Flt = a.f; const resRef = useRef<HTMLDivElement>(null);
  const last: Record<string, any> = {}; V.forEach((v: any) => { if (v.b && !/^Пост/.test(v.doc) && (!last[v.b] || k8(v.d) >= k8(last[v.b].d))) last[v.b] = v; });
  const res: any[] = [...Object.values(last).filter((v: any) => okV(f, v)).map((v: any) => ({ k: 'v', x: v, d: v.d })), ...PL.filter((p: any) => okP(f, p)).map((p: any) => ({ k: 'p', x: p, d: p.d }))].sort((x: any, y: any) => a.sort === 'new' ? k8(y.d).localeCompare(k8(x.d)) : k8(x.d).localeCompare(k8(y.d)));
  const docs = f.q ? IT.filter((i: any) => okI(f, i)) : [];
  const act: [string, string][] = []; ZG.forEach((g: [string, string, string[]]) => a.zs[g[0]].forEach((x: string) => act.push([g[0], x])));
  const shown = a.more ? res : res.slice(0, 8);
  const panel = <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
    <div style={card({ padding: M ? 16 : 20, background: C.panel })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Фильтры</span><button onClick={a.resetAll} style={{ ...bare, color: C.aT, fontSize: 12.5, minHeight: M ? 44 : undefined }}>Сбросить всё</button></div>
      {ZG.map((g: [string, string, string[]]) => <div key={g[0]} style={{ marginBottom: 14 }}><div style={{ ...lbl(), marginBottom: 8 }}>{g[1]}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{g[2].map((x: string) => <Chip key={x} on={a.zs[g[0]].includes(x)} onClick={() => a.togZ(g[0], x)}>{x}</Chip>)}</div></div>)}
      <div style={{ ...lbl(), marginBottom: 8 }}>Органы</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>{ORGS.map((o: [string, string]) => <Chip key={o[0]} on={a.orgs.includes(o[0])} onClick={() => a.togOrg(o[0])}>{o[1]}</Chip>)}</div>
      <div style={{ height: 1, background: C.soft, margin: '4px 0 14px' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><span style={{ fontSize: 15, fontWeight: 600 }}>Найдено: {res.length}</span><span style={{ width: 150 }}><Btn primary full onClick={() => { if (resRef.current) resRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Показать</Btn></span></div>
    </div>
    <div style={{ ...card({ padding: '16px 18px' }), border: `1px solid ${C.accLine}`, background: C === DARK ? '#151e31' : '#f1f5fd' }}><div style={{ ...lbl(), color: C.aT, marginBottom: 6 }}>Совет</div><div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5 }}>Комбинируйте аудиторию и тему, чтобы видеть только релевантные законы. Поиск в шапке работает по всем органам вместе с фильтрами.</div></div>
  </div>;
  const list = <div ref={resRef} style={{ display: 'grid', gap: 12, alignContent: 'start', minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h1 style={{ margin: 0, fontSize: M ? 20 : 22, fontWeight: 600 }}>Найдено: {res.length} {plural(res.length, 'законопроект', 'законопроекта', 'законопроектов')}</h1>
      <select aria-label="Сортировка" value={a.sort} onChange={(e: ChangeEvent<HTMLSelectElement>) => a.setSort(e.target.value)} style={{ minHeight: M ? 44 : 34, borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, color: C.text, padding: '0 12px', fontFamily: 'inherit', fontSize: 13 }}><option value="new">Сначала новые</option><option value="old">Сначала старые</option></select></div>
    {(act.length > 0 || f.q) && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{f.q && <button onClick={() => a.setQ('')} style={{ ...bare, display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: M ? 44 : 26, padding: '0 12px', borderRadius: 999, background: C.accSoft, color: C.accText, fontSize: 12 }}>«{f.q}»<I n="close" s={11} /></button>}{act.map((x: [string, string]) => <button key={x[1]} onClick={() => a.togZ(x[0], x[1])} style={{ ...bare, display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: M ? 44 : 26, padding: '0 12px', borderRadius: 999, background: C.accSoft, color: C.accText, fontSize: 12 }}>{x[1]}<I n="close" s={11} /></button>)}<button onClick={a.resetAll} style={{ ...bare, color: C.text3, fontSize: 12, padding: '0 8px', minHeight: M ? 44 : 26 }}>Сбросить</button></div>}
    {!a.orgs.length && <div style={card({ padding: 18, fontSize: 13.5, color: C.text2 })}>Не выбран ни один орган. <button onClick={a.resetOrgs} style={{ ...bare, color: C.aT, fontWeight: 600 }}>Сбросить</button></div>}
    {shown.map((r: any) => { const x = r.x; const st: [string, string] = r.k === 'v' ? vStatus(x) : ['На рассмотрении', 'warn'];
      return <button key={x.id} className="hv" onClick={() => a.openBill(r.k, x.id)} style={{ ...bare, ...card({ padding: M ? 14 : '16px 20px' }), display: 'grid', gap: 8, width: '100%' }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Pill>№ {x.b}</Pill>{rdL(x.rd) && <Pill tone="out">{rdL(x.rd)}</Pill>}<span style={{ flex: 1 }} /><Pill tone={st[1]} big>{st[0]}</Pill></span>
        <span style={{ fontSize: 15.5, fontWeight: 600, color: C.text }}>{x.q}</span>
        <span style={{ fontSize: 12, color: C.text3 }}>{[dLong(x.d) + (r.k === 'p' ? ' (план)' : ''), ...tagsOf(x.b)].join(' · ')}</span>
      </button>; })}
    {res.length > 8 && <Btn full onClick={() => a.setMore(!a.more)}>{a.more ? 'Свернуть' : `Показать ещё ${res.length - 8}`}</Btn>}
    {!res.length && a.orgs.length > 0 && <div style={card({ padding: 18, fontSize: 13.5, color: C.text2 })}>По этим условиям законопроектов нет. Уберите часть фильтров.</div>}
    {docs.length > 0 && <div style={card({ padding: M ? '6px 14px' : '8px 22px' })}><div style={{ ...lbl(), padding: '12px 0 4px' }}>Документы органов власти · {docs.length}</div>{docs.map((i: any) => <ItemCard key={i.id} i={i} open={!!a.openI[i.id]} toggle={() => a.togI(i.id)} />)}</div>}
  </div>;
  return <div style={{ display: 'grid', gridTemplateColumns: a.nar ? '1fr' : '400px minmax(0,1fr)', gap: 22 }}>{panel}{list}</div>;
}

/* ---------- Экран 7: пленарное заседание ---------- */
function PlenScreen({ a }: { a: any }) {
  const d = a.plen; const di = VDAYS.indexOf(d);
  const vs = V.filter((v: any) => v.d === d && okV(a.f, v)); const ps = PL.filter((p: any) => p.d === d && okP(a.f, p));
  const okN = vs.filter((v: any) => v.ok).length;
  const rows: any[] = [...vs.map((v: any) => ({ k: 'v', x: v })), ...ps.map((p: any) => ({ k: 'p', x: p }))].filter((r: any) => a.plenF === 'all' || (r.k === 'v' && (a.plenF === 'ok' ? r.x.ok : !r.x.ok)));
  const shown = a.plenMore ? rows : rows.slice(0, 12);
  return <div style={{ display: 'grid', gap: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><button onClick={() => a.pickDay(d, true)} style={{ ...bare, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text2, minHeight: 36 }}><I n="back" s={16} />{MONN[+d.slice(3, 5) - 1]} {d.slice(6)} · События</button><button onClick={() => a.openNews(d)} style={{ ...bare, color: C.aT, fontSize: 12.5, minHeight: 36 }}>Сводка дня →</button></div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button aria-label="Предыдущее заседание" disabled={di >= VDAYS.length - 1} onClick={() => a.setPlen(VDAYS[di + 1])} style={{ ...bare, width: 36, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: di >= VDAYS.length - 1 ? C.text3 : C.text }}><I n="left" s={18} /></button>
      <h1 style={{ margin: 0, fontSize: M ? 19 : 22, fontWeight: 600 }}>{dLong(d)}, {wd(d)} · Пленарное заседание</h1>
      <button aria-label="Следующее заседание" disabled={di <= 0} onClick={() => a.setPlen(VDAYS[di - 1])} style={{ ...bare, width: 36, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: di <= 0 ? C.text3 : C.text }}><I n="right" s={18} /></button>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {vs.length > 0 && <span style={{ padding: '9px 18px', borderRadius: 999, background: C.card, border: `1px solid ${C.line}`, fontSize: 13, fontWeight: 600 }}>{vs.length} {plural(vs.length, 'голосование', 'голосования', 'голосований')}</span>}
        {vs.length > 0 && <span style={{ padding: '9px 18px', borderRadius: 999, background: C.greenSoft, color: C.gT, fontSize: 13, fontWeight: 600 }}>{okN} принято</span>}
        {vs.length > 0 && <span style={{ padding: '9px 18px', borderRadius: 999, background: C.redSoft, color: C.rT, fontSize: 13, fontWeight: 600 }}>{vs.length - okN} отклонено</span>}
        {ps.length > 0 && <span style={{ padding: '9px 18px', borderRadius: 999, background: C.card, border: `1px solid ${C.line}`, color: C.text2, fontSize: 13, fontWeight: 600 }}>{ps.length} без голосования</span>}
      </div>
      <Seg items={[['all', 'Все'], ['ok', 'Принято'], ['rej', 'Отклонено']]} value={a.plenF} onChange={(v: string) => a.setPlenF(v)} />
    </div>
    <div style={{ display: 'grid', gap: 8 }}>
      {shown.map((r: any, i: number) => { const x = r.x; const v = r.k === 'v' ? x : null; const sk = (v ? 'v:' : 'p:') + x.id; const tg = tagsOf(x.b).slice(0, 2);
        return <div key={x.id} role="button" tabIndex={0} className="hv" onClick={() => a.openBill(r.k, x.id)} onKeyDown={(e: KbEvent<HTMLDivElement>) => { if (e.key === 'Enter') a.openBill(r.k, x.id); }} style={{ ...card({ padding: M ? '12px 12px' : '14px 18px', cursor: 'pointer' }), border: `1px ${v ? 'solid' : 'dashed'} ${v && !v.ok ? C.red + '66' : C.soft}`, display: 'flex', alignItems: 'center', gap: M ? 10 : 18, flexWrap: M ? 'wrap' : 'nowrap' }}>
          <span style={{ width: 28, fontSize: 15, fontWeight: 600, color: C.text3, fontVariantNumeric: 'tabular-nums' }}>{pad(i + 1)}</span>
          <span style={{ flex: '1 1 240px', minWidth: 0 }}><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>{(v ? v.doc : x.b) && (v ? v.doc : x.b) !== '—' ? <Pill>№ {v ? v.doc : x.b}</Pill> : <Pill tone="out">Процедурное</Pill>}{rdL(x.rd) && <Pill tone="out">{rdL(x.rd)}</Pill>}</span><span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>{x.q}</span></span>
          {!M && <span style={{ width: 200, fontSize: 11.5, color: C.text3 }}>{tg.join(' · ')}</span>}
          <span style={{ width: M ? '100%' : 156, display: 'flex', alignItems: 'center' }}>{v ? <VBar v={v} h={5} /> : <span style={{ fontSize: 11.5, color: C.text3 }}>{dLong(x.d)} · {x.rd}</span>}</span>
          <span style={{ minWidth: 104, display: 'flex', justifyContent: 'center' }}>{v ? <Pill tone={vStatus(v)[1]} big>{vStatus(v)[0]}</Pill> : <Pill tone="gray" big>Голосования не было</Pill>}</span>
          <Star on={a.saved.includes(sk)} onClick={() => a.togSave(sk)} s={17} />
          <span style={{ color: C.text3 }}><I n="right" s={16} /></span>
        </div>; })}
      {!rows.length && <div style={card({ padding: 18, fontSize: 13.5, color: C.text2 })}>По выбранному условию вопросов нет.</div>}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><span style={{ fontSize: 11.5, color: C.text3 }}>Источник: vote.duma.gov.ru · sozd.duma.gov.ru</span>{rows.length > 12 && <Btn onClick={() => a.setPlenMore(!a.plenMore)}>{a.plenMore ? 'Свернуть' : `Показать ещё ${rows.length - 12} ${plural(rows.length - 12, 'вопрос', 'вопроса', 'вопросов')}`}</Btn>}</div>
  </div>;
}

/* ---------- Экран 8: сохранённые ---------- */
function SavedScreen({ a }: { a: any }) {
  const it = a.saved.map(savedObj).filter(Boolean); const bv = it.filter((o: any) => o.t !== 'l'); const bl = it.filter((o: any) => o.t === 'l');
  const inF = bl.filter((o: any) => k8(o.x.d) <= k8(TODAY)).length;
  const grp = (title: string, xs: any[]) => xs.length ? <section style={{ display: 'grid', gap: 8 }}><div style={{ ...lbl(), margin: '6px 0 2px' }}>{title}</div>{xs.map((o: any) => <div key={o.k} role="button" tabIndex={0} onClick={() => a.openSaved(o)} onKeyDown={(e: KbEvent<HTMLDivElement>) => { if (e.key === 'Enter') a.openSaved(o); }} className="hv" style={card({ padding: M ? '12px 10px' : '16px 18px', display: 'flex', alignItems: 'center', gap: M ? 8 : 18, cursor: 'pointer', flexWrap: M ? 'wrap' : 'nowrap' })}>
    <Star on onClick={() => a.togSave(o.k)} s={17} />
    <span style={{ flex: '1 1 260px', minWidth: 0 }}><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}><Pill>{o.no}</Pill><Pill tone={o.st[1]}>{o.st[0]}</Pill></span><span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>{o.title}</span></span>
    <span style={{ flex: '0 1 300px', fontSize: 12, color: C.text2, lineHeight: 1.6 }}><span style={{ display: 'block', color: C.text3, fontSize: 11.5 }}>{a.seeded && SEED.includes(o.k) ? 'Пример подборки' : 'Сохранено на этом устройстве'}</span>{o.meta}</span>
    <span style={{ color: C.aT, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>Открыть →</span>
  </div>)}</section> : null;
  return <div style={{ display: 'grid', gap: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}><div><h1 style={{ margin: 0, fontSize: M ? 22 : 24, fontWeight: 600 }}>Сохранённые</h1><div style={{ fontSize: 11.5, color: C.text3, marginTop: 6 }}>{it.length} {plural(it.length, 'запись', 'записи', 'записей')} · {bv.length} {plural(bv.length, 'законопроект', 'законопроекта', 'законопроектов')} · {inF} {plural(inF, 'закон', 'закона', 'законов')} в силе</div></div>{it.length > 0 && <Btn onClick={a.shareList}>Поделиться подборкой</Btn>}</div>
    {it.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><Chip on={a.savF === 'all'} onClick={() => a.setSavF('all')}>Все</Chip><Chip on={a.savF === 'v'} onClick={() => a.setSavF('v')}>Голосования и законопроекты · {bv.length}</Chip><Chip on={a.savF === 'l'} onClick={() => a.setSavF('l')}>Вступают в силу · {bl.length}</Chip></div>}
    {a.seeded && it.length > 0 && <div style={{ fontSize: 12, color: C.text3 }}>Подборка заполнена примером из реальных данных календаря. Снимите звёздочку, чтобы убрать запись; отмеченное вами сохранится на этом устройстве.</div>}
    {a.savF !== 'l' && grp('Голосования и законопроекты', bv)}
    {a.savF !== 'v' && grp('Вступают в силу', bl)}
    {!it.length && <div style={{ ...card({ padding: '40px 24px', textAlign: 'center' }), border: `1px dashed ${C.line}` }}><div style={{ color: C.text2, display: 'flex', justifyContent: 'center', marginBottom: 12 }}><I n="book" s={30} /></div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Пока ничего не сохранено</div><div style={{ fontSize: 13, color: C.text2, maxWidth: 520, margin: '0 auto 16px', lineHeight: 1.5 }}>Сохраняйте законы звёздочкой — они появятся здесь.</div><Btn primary onClick={() => a.go('cal')}>Перейти к календарю</Btn></div>}
  </div>;
}

/* ---------- Экран 9: окно «Поделиться» ---------- */
function wrap(x: CanvasRenderingContext2D, s: string, maxW: number): string[] { const out: string[] = []; let line = ''; s.split(' ').forEach((w: string) => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); if (line) out.push(line); return out; }
function drawPng(v: any, full: boolean): string {
  const W = 1200, H = full ? 900 : 630; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); if (!x) return '';
  const P = C; x.fillStyle = P.page; x.fillRect(0, 0, W, H); x.fillStyle = P.card; x.beginPath(); (x as any).roundRect ? (x as any).roundRect(40, 40, W - 80, H - 80, 28) : x.rect(40, 40, W - 80, H - 80); x.fill();
  const st = vStatus(v); x.fillStyle = v.ok ? P.greenSoft : P.redSoft; x.beginPath(); (x as any).roundRect ? (x as any).roundRect(90, 90, 190, 48, 24) : x.rect(90, 90, 190, 48); x.fill();
  x.fillStyle = v.ok ? P.green : P.red; x.font = `600 26px ${FF}`; x.textAlign = 'center'; x.fillText(st[0], 185, 123); x.textAlign = 'right'; x.fillStyle = P.text3; x.font = `500 24px ${FF}`; x.fillText(v.doc, W - 90, 123); x.textAlign = 'left';
  x.fillStyle = P.text; x.font = `600 52px ${FF}`; const tl = wrap(x, v.q, W - 180).slice(0, 2); tl.forEach((l: string, i: number) => x.fillText(l, 90, 215 + i * 62));
  let y = 215 + tl.length * 62; x.fillStyle = P.text2; x.font = `400 26px ${FF}`; x.fillText(`${rdL(v.rd) ? rdL(v.rd) + ' · ' : ''}${dLong(v.d)} ${v.d.slice(6)}`, 90, y); y += 50;
  const s = sum(v.tot) || 450; x.fillStyle = P.track; x.fillRect(90, y, W - 180, 14); x.fillStyle = P.green; x.fillRect(90, y, (W - 180) * v.tot[0] / s, 14); y += 52;
  x.font = `500 24px ${FF}`; x.fillStyle = P.green; const t1 = `${forRej(v) ? 'За отклонение' : 'За'} — ${v.tot[0]}`; x.fillText(t1, 90, y); x.fillStyle = P.text3; x.fillText(` · Против — ${v.tot[1]} · Не голосовали — ${v.tot[3]} · порог ${thr(v)}`, 90 + x.measureText(t1).width, y);
  if (full && v.fr) { y += 50; FR.forEach((fr: [string, string], i: number) => { const r = v.fr[i]; x.fillStyle = P.text; x.font = `400 22px ${FF}`; x.fillText(fr[1], 90, y + 20); x.fillStyle = P.track; x.fillRect(330, y + 6, 560, 12); x.fillStyle = P.green; x.fillRect(330, y + 6, 560 * r[0] / (r[4] || 1), 12); x.fillStyle = P.text2; x.textAlign = 'right'; x.fillText(`${Math.round(r[0] / (r[4] || 1) * 100)}% · ${r[0]} из ${r[4]}`, W - 90, y + 20); x.textAlign = 'left'; y += 44; }); }
  x.fillStyle = P.text3; x.font = `400 22px ${FF}`; x.fillText('Календарь законов · vote.duma.gov.ru', 90, H - 80);
  return cv.toDataURL('image/png');
}
function ShareModal({ a }: { a: any }) {
  const v = V.find((x: any) => x.id === a.share.id); if (!v) return null; const st = vStatus(v); const url = `http://vote.duma.gov.ru/vote/${v.id}`;
  const fm = a.share.fmt; const full = a.shareV === 'full';
  const primary = () => { if (fm === 'link') return a.copy(url, 'Ссылка на голосование скопирована'); if (fm === 'pdf') { try { window.print(); } catch (e) { a.toastMsg('Печать недоступна в этом окне'); } return; } try { const u = drawPng(v, full); const l = document.createElement('a'); l.href = u; l.download = `golosovanie-${v.id}.png`; document.body.appendChild(l); l.click(); document.body.removeChild(l); a.toastMsg('Картинка PNG сохранена'); } catch (e) { a.toastMsg('Скачивание недоступно в этом окне'); } };
  const opt = (k: string, ic: string, t: string, s: string) => { const on = fm === k; return <button key={k} onClick={() => a.setShare({ id: v.id, fmt: k })} aria-pressed={on} style={{ ...bare, position: 'relative', padding: '14px 14px', borderRadius: 12, border: `1px solid ${on ? C.acc : C.line}`, background: on ? C.accSoft + '66' : C.card2, display: 'grid', gap: 6, minHeight: 44 }}><span style={{ color: on ? C.aT : C.text2 }}><I n={ic} s={20} /></span><span style={{ fontSize: 14, fontWeight: 600 }}>{t}</span><span style={{ fontSize: 11.5, color: C.text3 }}>{s}</span>{on && <span style={{ position: 'absolute', right: 10, top: 10, width: 18, height: 18, borderRadius: 9, background: C.acc, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I n="check" s={12} /></span>}</button>; };
  return <div role="dialog" aria-modal="true" aria-label="Поделиться карточкой" onClick={() => a.setShare(null)} style={{ position: 'fixed', inset: 0, background: C.overlay, zIndex: 50, display: 'flex', alignItems: M ? 'flex-end' : 'center', justifyContent: 'center', padding: M ? 0 : 24, overflowY: 'auto' }}>
    <div onClick={(e: any) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: C.card, border: `1px solid ${C.line}`, borderRadius: M ? '20px 20px 0 0' : 20, padding: M ? 18 : 28, display: 'grid', gap: 18, maxHeight: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 19, fontWeight: 600 }}>Поделиться карточкой</span><button aria-label="Закрыть" onClick={() => a.setShare(null)} style={{ ...bare, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text2 }}><I n="close" s={20} /></button></div>
      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Pill tone={st[1]} big>{st[0]}</Pill><span style={{ fontSize: 11.5, color: C.text3 }}>{v.doc}</span></div>
        <div><div style={{ fontSize: 17, fontWeight: 600 }}>{v.q}</div><div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{rdL(v.rd) ? rdL(v.rd) + ' · ' : ''}{dLong(v.d)} {v.d.slice(6)}</div></div>
        <VBar v={v} h={6} />
        <div style={{ fontSize: 11.5 }}><span style={{ color: C.gT }}>{forRej(v) ? 'За отклонение' : 'За'} — {v.tot[0]}</span><span style={{ color: C.text3 }}> · Не голосовали — {v.tot[3]} · порог {thr(v)}</span></div>
        {full && v.fr && <div style={{ display: 'grid', gap: 6 }}>{FR.map((fr: [string, string], i: number) => { const r = v.fr[i]; return <div key={fr[0]} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 64px', gap: 8, alignItems: 'center', fontSize: 11 }}><span>{fr[1]}</span><div style={{ height: 4, borderRadius: 2, background: C.track, position: 'relative' }}><div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r[0] / (r[4] || 1) * 100}%`, background: C.green, borderRadius: 2 }} /></div><span style={{ color: C.text3, textAlign: 'right' }}>{r[0]} из {r[4]}</span></div>; })}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: C.text3, marginTop: 8 }}><span>Календарь законов · vote.duma.gov.ru</span><span style={{ color: C.text2 }}><I n="logo" s={16} /></span></div>
      </div>
      <div><div style={{ ...lbl(), marginBottom: 10 }}>Формат</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>{opt('png', 'img', 'Картинка', 'PNG для соцсетей')}{opt('pdf', 'pdf', 'PDF', 'для печати, A4')}{opt('link', 'link', 'Ссылка', 'на это голосование')}</div></div>
      {fm === 'png' && <div><div style={{ ...lbl(), marginBottom: 10 }}>Вариант изображения</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{([['compact', 'Компактная', 'заголовок + итог голосования'], ['full', 'Подробная', 'с разбором по фракциям']] as string[][]).map((o: string[]) => <button key={o[0]} onClick={() => a.setShareV(o[0])} aria-pressed={a.shareV === o[0]} style={{ ...bare, padding: '12px 14px', borderRadius: 12, border: `1px solid ${a.shareV === o[0] ? C.acc : C.line}`, background: C.card2, minHeight: 44 }}><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{o[1]}</span><span style={{ display: 'block', fontSize: 11.5, color: C.text3, marginTop: 3 }}>{o[2]}</span></button>)}</div></div>}
      <div style={{ display: 'grid', gridTemplateColumns: M ? '1fr' : '1fr 1fr', gap: 10 }}><Btn primary full onClick={primary}>{fm === 'png' ? 'Скачать PNG' : fm === 'pdf' ? 'Печать / PDF' : 'Копировать ссылку'}</Btn><Btn full onClick={() => a.copy(url, 'Ссылка на голосование скопирована')}>Копировать ссылку</Btn></div>
      <div style={{ fontSize: 11.5, color: C.text3, textAlign: 'center' }}>На изображении — только публичные данные голосования</div>
    </div>
  </div>;
}

/* ---------- Шапка ---------- */
function Header({ a }: { a: any }) {
  const tab = a.screen === 'laws' ? 'laws' : a.screen === 'day' ? 'day' : a.screen === 'saved' ? '' : 'cal';
  const tabs = <div role="tablist" style={{ display: 'flex', padding: 3, borderRadius: 999, background: C.card, border: `1px solid ${C.line}`, width: M ? '100%' : undefined }}>{([['cal', 'Календарь'], ['laws', 'Вступают в силу'], ['day', 'Новости']] as [string, string][]).map((t: [string, string]) => <button key={t[0]} role="tab" aria-selected={tab === t[0]} onClick={() => a.go(t[0])} style={{ ...bare, flex: M ? 1 : undefined, minWidth: M ? 0 : 130, minHeight: M ? 44 : 32, padding: M ? '0 6px' : '0 14px', whiteSpace: 'nowrap', borderRadius: 999, textAlign: 'center', background: tab === t[0] ? C.acc : 'transparent', color: tab === t[0] ? '#fff' : C.text2, fontWeight: tab === t[0] ? 600 : 500, fontSize: M ? 12.5 : 13.5 }}>{t[1]}</button>)}</div>;
  const search = <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: M ? 44 : 36, padding: '0 6px 0 12px', borderRadius: 12, background: C.card, border: `1px solid ${C.line}`, width: M ? '100%' : a.nar ? 220 : 290, color: C.text3 }}><I n="search" s={16} />
    <input ref={a.inRef} aria-label="Поиск" value={a.q} placeholder="Поиск по законам и новостям" onChange={(e: ChangeEvent<HTMLInputElement>) => a.onQ(e.target.value)} onKeyDown={(e: KbEvent<HTMLInputElement>) => { if (e.key === 'Enter') a.go('search'); if (e.key === 'Escape') a.setQ(''); }} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: C.text, fontFamily: 'inherit', fontSize: 13 }} />
    {a.q ? <button aria-label="Очистить поиск" onClick={() => a.setQ('')} style={{ ...bare, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I n="close" s={14} /></button> : !M && <span style={{ fontSize: 11, padding: '3px 7px', borderRadius: 6, background: C.pill, color: C.text2 }}>⌘K</span>}</label>;
  const ib = (n: string, lab: string, on: () => void, extra?: ReactNode, col?: string) => <button aria-label={lab} title={lab} onClick={on} style={{ ...bare, position: 'relative', width: M ? 44 : 38, height: M ? 44 : 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col || C.text2 }}><I n={n} s={20} f={n === 'book'} c={n === 'book' ? (a.screen === 'saved' ? C.acc : C.acc) : undefined} />{extra}</button>;
  const icons = <div style={{ display: 'flex', alignItems: 'center', gap: M ? 0 : 4 }}>
    {ib('book', 'Сохранённые', () => a.go('saved'), a.saved.length ? <span style={{ position: 'absolute', top: M ? 6 : 3, right: M ? 6 : 3, minWidth: 15, height: 15, borderRadius: 8, background: C.acc, color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 2px ${C.hdr}` }}>{a.saved.length}</span> : null)}
    {ib(a.dark ? 'moon' : 'sun', a.dark ? 'Светлая тема' : 'Тёмная тема', () => a.setDark(!a.dark))}
    {!M && ib('dl', 'Скачать карточку голосования', () => a.openShare(a.curVote(), 'png'))}
    {ib('share', 'Поделиться', () => a.openShare(a.curVote(), 'link'))}
  </div>;
  const logo = <button onClick={() => a.go('cal')} style={{ ...bare, display: 'flex', alignItems: 'center', gap: 10, minHeight: 44 }}><span style={{ color: C.aT }}><I n="logo" s={24} /></span><span style={{ fontSize: M ? 16 : 17, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>Календарь законов</span></button>;
  return <header style={{ background: C.hdr, borderBottom: `1px solid ${C.soft}`, position: 'sticky', top: 0, zIndex: 20 }}>
    {M ? <div style={{ padding: '6px 12px 10px', display: 'grid', gap: 8 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{logo}{icons}</div>{search}{tabs}</div>
      : <div style={{ maxWidth: 1440, margin: '0 auto', height: 64, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 20 }}>{logo}<span style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{tabs}</span>{search}{icons}</div>}
  </header>;
}


function App() {
  const th: any = useGrokTheme();
  if (th && th.font && th.font.family) FF = th.font.family;
  const w = useW(); M = w < 720; const nar = w < 1080;
  const [dark, setDarkS] = useState<boolean>(true);
  C = dark ? DARK : LIGHT;
  const [screen, setScreen] = useState<string>('cal');
  const [q, setQ] = useState<string>('');
  const [orgs, setOrgs] = useState<string[]>(ALL);
  const [zs, setZs] = useState<Record<string, string[]>>({ w: [], t: [], c: [] });
  const [month, setMonth] = useState<string>(MONTHS.includes(TODAY.slice(3)) ? TODAY.slice(3) : '11.2026');
  const [sel, setSel] = useState<string>(TODAY);
  const [mode, setMode] = useState<string>('day');
  const [what, setWhat] = useState<boolean>(false);
  const [bill, setBill] = useState<{ k: string; id: string }>({ k: 'v', id: '136216' });
  const [plen, setPlen] = useState<string>(VDAYS.find((d: string) => k8(d) <= k8(TODAY) && V.some((v: any) => v.d === d)) || VDAYS[0]);
  const [plenF, setPlenF] = useState<string>('all'); const [plenMore, setPlenMore] = useState<boolean>(false);
  const [news, setNews] = useState<string>(DAYS.includes(TODAY) ? TODAY : DAYS[0]); const [newsOrg, setNewsOrg] = useState<string>('all'); const [newsMore, setNewsMore] = useState<boolean>(false);
  const lms = LAWS.map((l: any) => l.d.slice(3));
  const [lawM, setLawM] = useState<string>(lms.includes(TODAY.slice(3)) ? TODAY.slice(3) : lms[0]);
  const [lawF, setLawF] = useState<string>('all');
  const [openL, setOpenL] = useState<Record<string, boolean>>(() => { const c = LAWS.filter((l: any) => l.d.slice(3) === TODAY.slice(3) && l.was && k8(l.d) <= k8(TODAY)); const l = c[c.length - 1]; return l ? { [lk(l)]: true } : {}; });
  const [openW, setOpenW] = useState<Record<string, boolean>>({}); const [openI, setOpenI] = useState<Record<string, boolean>>({});
  const [saved, setSavedS] = useState<string[]>(loadSaved); const [seeded, setSeeded] = useState<boolean>(() => { try { return !localStorage.getItem('kz_new_saved'); } catch (e) { return true; } });
  const [savF, setSavF] = useState<string>('all');
  const [sort, setSort] = useState<string>('new'); const [more, setMore] = useState<boolean>(false);
  const [share, setShare] = useState<{ id: string; fmt: string } | null>(null); const [shareV, setShareV] = useState<string>('compact');
  const [toast, setToast] = useState<string>('');
  const inRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { const h = (e: any) => { if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); if (inRef.current) inRef.current.focus(); } if (e.key === 'Escape') setShare(null); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  const top = () => { try { window.scrollTo({ top: 0 }); } catch (e) { } };
  const setDark = (d: boolean) => { setDarkS(d); };
  const setSaved = (s: string[]) => { setSavedS(s); setSeeded(false); try { localStorage.setItem('kz_new_saved', JSON.stringify(s)); } catch (e) { } };
  const go = (s: string) => { setScreen(s); setShare(null); top(); };
  const f: Flt = { q: q.trim(), orgs, zs };
  const vIn = (id: string) => V.some((v: any) => v.id === id);
  const a: any = {
    f, q, setQ, orgs, zs, month, setMonth, sel, mode, setMode, what, setWhat, bill, plen, setPlen, plenF, setPlenF, plenMore, setPlenMore, news, setNews, newsOrg, setNewsOrg, newsMore, setNewsMore, lawM, setLawM, lawF, setLawF, openL, openW, openI, saved, seeded, savF, setSavF, sort, setSort, more, setMore, share, setShare, shareV, setShareV, screen, dark, setDark, nar, inRef, go,
    onQ: (s: string) => { setQ(s); setMore(false); if (s && screen !== 'cal' && screen !== 'search' && screen !== 'laws') setScreen('search'); },
    togOrg: (o: string) => setOrgs(orgs.includes(o) ? orgs.filter((x: string) => x !== o) : ALL.filter((x: string) => x === o || orgs.includes(x))),
    resetOrgs: () => setOrgs(ALL),
    togZ: (g: string, x: string) => { setZs({ ...zs, [g]: zs[g].includes(x) ? zs[g].filter((y: string) => y !== x) : [...zs[g], x] }); setMore(false); },
    resetAll: () => { setOrgs(ALL); setZs({ w: [], t: [], c: [] }); setQ(''); },
    marks: (d: string) => marksOf(d, f),
    pickDay: (d: string, toCal?: boolean) => { setSel(d); setMode('day'); setMonth(d.slice(3)); if (toCal) go('cal'); },
    goToday: () => { setSel(TODAY); setMode('day'); setMonth(MONTHS.includes(TODAY.slice(3)) ? TODAY.slice(3) : month); },
    togW: (k: string) => setOpenW({ ...openW, [k]: !openW[k] }), togI: (k: string) => setOpenI({ ...openI, [k]: !openI[k] }), togL: (k: string) => setOpenL({ ...openL, [k]: !openL[k] }),
    openBill: (k: string, id: string) => { setBill({ k, id }); go('bill'); },
    openPlen: (d: string) => { setPlen(d); setPlenF('all'); setPlenMore(false); go('plen'); },
    openNews: (d: string) => { setNews(d); setNewsOrg('all'); setNewsMore(false); go('day'); },
    openLaw: (l: any) => { setLawM(l.d.slice(3)); setOpenL({ [lk(l)]: true }); go('laws'); },
    openSaved: (o: any) => { if (o.t === 'v') a.openBill('v', o.x.id); else if (o.t === 'p') a.openBill('p', o.x.id); else a.openLaw(o.x); },
    togSave: (k: string) => setSaved(saved.includes(k) ? saved.filter((x: string) => x !== k) : [...saved, k]),
    openShare: (id: string, fmt: string) => setShare({ id, fmt }),
    curVote: () => (screen === 'bill' && bill.k === 'v' && vIn(bill.id) ? bill.id : '136216'),
    toastMsg: (s: string) => setToast(s),
    copy: (s: string, ok: string) => { const fb = () => { try { const t = document.createElement('textarea'); t.value = s; document.body.appendChild(t); t.select(); const r = document.execCommand('copy'); document.body.removeChild(t); setToast(r ? ok : 'Не удалось скопировать: ' + s); } catch (e) { setToast('Не удалось скопировать: ' + s); } }; try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s).then(() => setToast(ok), fb); return; } } catch (e) { } fb(); },
    shareList: () => { const t = saved.map(savedObj).filter(Boolean).map((o: any) => `${o.title} (${o.no}) — ${o.st[0]}`).join('\n'); a.copy('Календарь законов — подборка:\n' + t, 'Подборка скопирована'); },
  };
  const css = `.kz *{box-sizing:border-box}.kz button:disabled{cursor:default}.kz button:focus-visible,.kz a:focus-visible,.kz input:focus-visible,.kz select:focus-visible,.kz [role=button]:focus-visible{outline:2px solid ${C.acc};outline-offset:2px}.kz .hv{transition:filter .15s}.kz .hv:hover{filter:brightness(${dark ? 1.12 : 0.98})}.kz input::placeholder{color:${C.text3}}.kz .cl2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}html,body{background:${C.page}}`;
  return <div className="kz" style={{ background: C.page, color: C.text, fontFamily: FF, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', colorScheme: dark ? 'dark' : 'light' }}>
    <style>{css}</style>
    <Header a={a} />
    <main style={{ maxWidth: 1440, margin: '0 auto', padding: M ? '16px 12px 48px' : '28px 32px 56px' }}>
      {screen === 'cal' && <CalScreen a={a} />}
      {screen === 'bill' && <BillScreen a={a} />}
      {screen === 'laws' && <LawsScreen a={a} />}
      {screen === 'day' && <DayScreen a={a} />}
      {screen === 'search' && <SearchScreen a={a} />}
      {screen === 'plen' && <PlenScreen a={a} />}
      {screen === 'saved' && <SavedScreen a={a} />}
      <div style={{ marginTop: 40, fontSize: 11, color: C.text3, lineHeight: 1.6 }}>Источники данных: vote.duma.gov.ru, sozd.duma.gov.ru, duma.gov.ru, council.gov.ru, government.ru, cbr.ru, mintrud.gov.ru, publication.pravo.gov.ru. {D.SCOPE || ''}</div>
    </main>
    {share && <ShareModal a={a} />}
    {toast && <div role="status" style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 999, background: dark ? '#1e2430' : '#18212a', color: '#fff', border: `1px solid ${C.line}`, fontSize: 13, maxWidth: '92vw' }}><span style={{ width: 18, height: 18, borderRadius: 9, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I n="check" s={12} c="#fff" /></span>{toast}</div>}
  </div>;
}

return App;
})();

function ViewToggle({ view, setView }: { view: string; setView: (v: string) => void }) {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 12px', background: view === 'new' ? '#0a0c12' : undefined }}>
    <Segmented value={view} onChange={(v: string) => setView(v)} options={[{ value: 'new', label: 'Новый вид' }, { value: 'old', label: 'Прежний вид' }]} />
  </div>;
}
