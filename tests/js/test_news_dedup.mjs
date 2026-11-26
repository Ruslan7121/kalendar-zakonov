// 26.11.2026: акт или заседание, уже стоящие в календаре (документ органа в ORG, заседание Правительства в CAL.g), не повторяются
// оперативной новостью из live.json с той же ссылкой: карточка остается в календаре, повтор из новостей убран.
// Случаи с сайта: Минюст https://minjust.gov.ru/ru/events/51489/ (23.11) и заседание Правительства http://government.ru/meetings/60553/ (26.11).
// Запуск: node tests/js/test_news_dedup.mjs
import assert from 'node:assert/strict';
import { loadCanvas } from './load_canvas.mjs';

const T = await loadCanvas(['calUrls', 'normU', 'ORG', 'CAL']);
const s = T.calUrls();
assert.equal(T.normU('https://www.minjust.gov.ru/ru/events/51489'), T.normU('http://minjust.gov.ru/ru/events/51489/'));
for (const o of T.ORG.filter((x) => x && x.u).slice(0, 50)) assert.ok(s.has(T.normU(o.u)), 'ссылка ORG в наборе: ' + o.u);
const g = T.CAL.g.find((x) => Array.isArray(x) && x.some((v) => typeof v === 'string' && /government\.ru\/meetings\//.test(v)));
assert.ok(g, 'в CAL.g есть заседание Правительства со ссылкой');
assert.ok(s.has(T.normU(g.find((v) => typeof v === 'string' && /^https?:/.test(v)))), 'ссылка заседания в наборе');
if (T.ORG.some((x) => x.u === 'https://minjust.gov.ru/ru/events/51489/')) assert.ok(s.has('minjust.gov.ru/ru/events/51489'));
if (T.CAL.g.some((x) => x[2] === 'http://government.ru/meetings/60553/')) assert.ok(s.has('government.ru/meetings/60553'));
assert.ok(!s.has(T.normU('http://duma.gov.ru/news/64588/')), 'обычная новость Думы не отсекается');
// кэш пересобирается, когда ORG пополняется (подгрузка месяца)
T.ORG.push({ o: 'minjust', d: '01.01.2027', u: 'https://minjust.gov.ru/ru/events/99999999/' });
assert.ok(T.calUrls().has('minjust.gov.ru/ru/events/99999999'));
T.ORG.pop();
console.log('test_news_dedup: OK');
