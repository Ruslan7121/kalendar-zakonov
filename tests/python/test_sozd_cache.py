#!/usr/bin/env python3
"""Пункт 6: единый кэш sozd, TTL, повтор пустых записок. Сеть не нужна (поддельный fetcher).
Из корня репозитория: python3 tests/python/test_sozd_cache.py"""
import os, sys, json, time, tempfile, zipfile
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T = tempfile.mkdtemp(prefix='gd-sozd-')
os.environ.update(GD_ROOT=T, GD_DUMA=T + '/duma', SOZD_TTL_HOURS='48', SOZD_FAIL_TTL_HOURS='1')
os.makedirs(T + '/out', exist_ok=True)
sys.path[:0] = [os.path.join(os.path.join(R, 'pipeline'), d) for d in ('lib', 'collect', 'merge', 'check')]
import sozd_cache as S, bills as B, track, track_fast, audit

# 1. один путь кэша у всех потребителей
assert S.DIR == T + '/duma/bills' == track.BILLS_DIR == track_fast.BILLS == audit.BILLS, S.DIR

GOOD = '<html><h1>О внесении изменений в закон</h1>' + 'законопроект ' * 300 + \
       '<a href="/download/abc">Пояснительная записка</a></html>'
GOOD2 = GOOD.replace('О внесении', 'Об изменении')
calls = []
def fake(result):
    def f(url, out, deadline):
        calls.append(url)
        if result is None: return False                  # 504 / таймаут
        open(out, 'w').write(result); return True
    return f

n = '1000001-8'
# 2. нет кэша → скачано и записано
src, st = S.get(n, fetcher=fake(GOOD)); assert st == 'fetched' and os.path.exists(S.path(n))
# 3. свежий кэш → без сети
calls.clear(); src, st = S.get(n, fetcher=fake(GOOD2)); assert st == 'fresh' and not calls and src == GOOD
# 4. TTL истёк → перезапрос, новая страница
old = time.time() - 49 * 3600; os.utime(S.path(n), (old, old))
src, st = S.get(n, fetcher=fake(GOOD2)); assert st == 'fetched' and src == GOOD2
# 5. TTL истёк, новый запрос 504 → последний хороший HTML сохранён, маркер неудачи
os.utime(S.path(n), (old, old))
src, st = S.get(n, fetcher=fake(None)); assert st == 'stale' and src == GOOD2 and open(S.path(n)).read() == GOOD2
assert os.path.exists(S.fail_path(n))
# 6. в пределах SOZD_FAIL_TTL_HOURS не долбим; после — снова пробуем и маркер снимается
calls.clear(); src, st = S.get(n, fetcher=fake(GOOD)); assert st == 'stale' and not calls
os.utime(S.fail_path(n), (old, old))
src, st = S.get(n, fetcher=fake(GOOD)); assert st == 'fetched' and not os.path.exists(S.fail_path(n))
# 7. обрезок / заглушка прокси / 404 не затирают кэш
os.utime(S.path(n), (old, old))
src, st = S.get(n, fetcher=fake('<html>short</html>' + ' ' * 2500), refresh=True); assert st == 'stale' and src == GOOD
src, st = S.get('1000002-8', fetcher=fake('404 Страница не найдена' + ' ' * 3000)); assert (src, st) == ('', '404')
# 8. offline (TRACK_QUICK) — только кэш; старый законопроект (давнее голосование) — бессрочно
calls.clear(); assert S.get(n, offline=True, fetcher=fake(GOOD2))[1] == 'stale' and not calls
assert S.ttl_for_day('01.01.2020') == S.NEVER and S.ttl_for_day(time.strftime('%d.%m.%Y')) == S.TTL_OK
calls.clear(); assert S.get(n, ttl=S.NEVER, fetcher=fake(GOOD2))[1] == 'fresh' and not calls
# 9. перенос из старого extracts/bills_html
os.makedirs(T + '/extracts/bills_html', exist_ok=True); open(T + '/extracts/bills_html/1000003-8.html', 'w').write(GOOD)
assert S.cached('1000003-8') == GOOD and os.path.exists(S.path('1000003-8'))

# --- bills.py: повтор пустой записки ---
def docx(path, txt):
    with zipfile.ZipFile(path, 'w') as z:
        z.writestr('word/document.xml', f'<w:document><w:body><w:p><w:r><w:t>{txt}</w:t></w:r></w:p></w:body></w:document>')
note_ok = [True]
def fake_retry(url, out, deadline=90, tries=3):
    if '/download/' in url:
        if not note_ok[0]: return False
        docx(out, 'Официальный текст записки'); return True
    open(out, 'w').write(GOOD); return True
B.fetch_retry = fake_retry
J = lambda k: os.path.join(B.D, k + '.json')
k = '1000010-8'
# 10. JSON > 50 байт, но записка пустая (старый формат «записка не скачалась») → повтор и заполнение
json.dump({'n': k, 'day': '10.11.2026', 'vote': '1', 'title': 'Т' * 80, 'note': '', 'note_url': ''}, open(J(k), 'w'))
assert os.path.getsize(J(k)) > 50 and B.needs_fetch(k)
assert B.one(k, '10.11.2026', '1') == 'ok' and json.load(open(J(k)))['note'] == 'Официальный текст записки'
# 11. полная запись не перезапрашивается
assert not B.needs_fetch(k) and B.one(k, '10.11.2026', '1') == 'cached'
# 12. --force при неудачной загрузке записки не затирает уже полученный текст
note_ok[0] = False
assert B.one(k, 'manual', '0', force=True) == 'ok'
r = json.load(open(J(k))); assert r['note'] == 'Официальный текст записки' and r['day'] == '10.11.2026' and r['status'] == 'ok'
# 13. записка не скачалась → status note_fail, повтор на следующем прогоне; пробел вместо текста — тоже пусто
k2 = '1000011-8'
assert B.one(k2, '11.11.2026', '2') == 'partial'
r = json.load(open(J(k2))); assert r['status'] == 'note_fail' and r['note'] == '' and B.needs_fetch(k2)
json.dump(dict(r, note=' \n', status='ok'), open(J(k2), 'w')); assert B.needs_fetch(k2)
note_ok[0] = True
assert B.one(k2, '11.11.2026', '2') == 'ok' and not B.needs_fetch(k2)
# 14. скан без текста: повтор не раньше TTL
k3 = '1000012-8'
json.dump({'n': k3, 'note': '\x0c', 'status': 'note_unreadable', 'fb': 1, 'v': B.REC_V, 'tried_at': time.strftime('%Y-%m-%d %H:%M:%S')}, open(J(k3), 'w'))
assert not B.needs_fetch(k3)
# 18.11.2026: если запасные документы (текст законопроекта, заключение комитета) еще не пробовали — повтор сразу
json.dump({'n': k3, 'note': '', 'status': 'note_unreadable', 'tried_at': time.strftime('%Y-%m-%d %H:%M:%S')}, open(J(k3), 'w'))
assert B.needs_fetch(k3)
# запись старого формата (v<2) перезапрашивается один раз, даже со сканом и свежей попыткой
json.dump({'n': k3, 'note': '', 'status': 'note_unreadable', 'fb': 1, 'tried_at': time.strftime('%Y-%m-%d %H:%M:%S')}, open(J(k3), 'w'))
assert B.needs_fetch(k3)
json.dump({'n': k3, 'note': '', 'status': 'note_unreadable', 'fb': 1, 'v': B.REC_V, 'tried_at': '2026-01-01 00:00:00'}, open(J(k3), 'w'))
assert B.needs_fetch(k3)
# 15. 18.11.2026: записка — скан, но есть текст законопроекта к первому чтению → берем его (note_kind), запись полная
k4 = '1000013-8'
HTML4 = '<h1>Законопроект № 1000013-8</h1><a href="/download/aaa"><div>Пояснительная записка</div></a><a href="/download/bbb"><div>Текст законопроекта, подготовленного к рассмотрению Государственной Думой в первом чтении (Комитет)</div></a>'
_ls, _fr = B.load_sozd, B.fetch_retry
B.load_sozd = lambda n, refresh=False: (HTML4, 'fetched')
def fr4(url, out, deadline=90, tries=3):
    docx(out, '' if url.endswith('/aaa') else 'Текст законопроекта: статья 1'); return True
B.fetch_retry = fr4
assert B.one(k4, '17.11.2026', '5') == 'ok'
r = json.load(open(J(k4))); assert r['status'] == 'ok' and r['note_kind'] == 'текст законопроекта к первому чтению' and 'статья 1' in r['note'] and r['fb'] == 1 and not B.needs_fetch(k4)
B.load_sozd, B.fetch_retry = _ls, _fr
# 16. 18.11.2026: законопроекты повестки без голосования берутся тоже (для «Сути» по записке/тексту законопроекта)
_src = "const CAL: any = " + json.dumps({'p': [{'d': '17.11.2026', 'a': [['999991-8', 'Т', None, '', 'Полное название'], ['999992-8', 'Т'], ['не-номер', 'x']]}]}) + ";\n"
_ai = B.agenda_items(_src, [], set())
assert [x[2] for x in _ai] == ['999991-8', '999992-8'] and _ai[0][:2] == ('17.11.2026', '0')
assert B.agenda_items(_src, ['01.01.2026'], set()) == [] and [x[2] for x in B.agenda_items(_src, [], {'999991-8'})] == ['999992-8']
# 17. 18.11.2026: единый сбор — сравнительная таблица, ФЭО, заключение комитета и список документов сохраняются у любой карточки; старая запись (v=1) перезапрашивается один раз без повторной загрузки записки
k5 = '1000014-8'
HTML5 = '<h1>Законопроект № 1000014-8</h1><a href="/download/n1"><div>Пояснительная записка</div></a><a href="/download/t1"><div>Сравнительная таблица к законопроекту</div></a><a href="/download/f1"><div>Финансово-экономическое обоснование</div></a><a href="/download/c1"><div>Заключение ответственного комитета (Комитет)</div></a>'
B.load_sozd = lambda n, refresh=False: (HTML5, 'fetched')
_calls = []
def fr5(url, out, deadline=90, tries=3):
    _calls.append(url); docx(out, {'n1': 'Записка', 't1': 'Было — стало', 'f1': 'Расходы нет', 'c1': 'Принять'}[url.rsplit('/', 1)[1]]); return True
B.fetch_retry = fr5
json.dump({'n': k5, 'day': '17.11.2026', 'vote': '9', 'title': 'Т', 'note': 'Старая записка', 'note_url': 'u', 'status': 'ok'}, open(J(k5), 'w'))
assert B.needs_fetch(k5) and B.one(k5, '17.11.2026', '9') == 'ok'
r = json.load(open(J(k5)))
assert r['note'] == 'Старая записка' and not any(u.endswith('/n1') for u in _calls), 'записка не должна скачиваться заново'
assert r['table'] == 'Было — стало' and r['fin'] == 'Расходы нет' and r['committee'] == 'Принять' and r['v'] == B.REC_V and len(r['docs']) == 4
assert not B.needs_fetch(k5)
B.load_sozd, B.fetch_retry = _ls, _fr
print('test_sozd_cache: OK')
