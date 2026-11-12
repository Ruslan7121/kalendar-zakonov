#!/bin/bash
# Публикация сайта на GitHub Pages (ветка gh-pages) одной командой:
#   сборка src/canvas.tsx (web/build.sh) → app.<hash>.js + index.html со ссылкой на него
#   + data/core.<hash>.json и data/m-ГГГГ-ММ.<hash>.json (данные по месяцам, пункт 10; имена — в оглавлении внутри app.<hash>.js)
#   → обычный коммит в gh-pages (через временный worktree) → git push без --force
#   → проверка живой страницы.
#
# Запуск из корня клона (main должен быть чистым и уже отправленным в origin):
#   ./pipeline/publish.sh "короткое описание изменений"
#   ./pipeline/publish.sh --dry-run          # только собрать и показать, что уйдёт в gh-pages
#   PUBLISH_NO_VERIFY=1 ./pipeline/publish.sh "…"   # не ждать живую страницу
#
# Кэш: GitHub Pages отдаёт всё с Cache-Control: max-age=600, настроить это нельзя.
# Поэтому JS называется по хешу содержимого (app.<hash>.js): новый index.html всегда тянет новый файл,
# старый JS из кэша браузера подхватиться не может. Предыдущие app.<hash>.js (последние KEEP штук)
# остаются в ветке, чтобы закэшированный старый index.html (до 10 минут) не ломался.
# Нехешированный app.js оставлен копией последней сборки только для таких старых index.html;
# новый index.html на него не ссылается.
set -euo pipefail

KEEP=${PUBLISH_KEEP:-3}                # сколько прежних app.<hash>.js держать в gh-pages
SITE=${PUBLISH_SITE:-https://ruslan7121.github.io/kalendar-zakonov/}
BRANCH=gh-pages
REMOTE=origin

DRY=0; MSG=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) MSG="$a" ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
die() { echo "publish.sh: $*" >&2; exit 1; }

# 1. main: чистое дерево и коммит уже в origin (в gh-pages пишем, из какого коммита собрано)
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || die "нужна ветка main"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "в main есть незакоммиченные изменения — сначала commit.sh"
git fetch -q "$REMOTE" main "$BRANCH"
SRC_SHA=$(git rev-parse HEAD); SRC_SHORT=$(git rev-parse --short HEAD)
if [ $DRY -eq 0 ]; then
  git merge-base --is-ancestor "$SRC_SHA" "$REMOTE/main" || die "коммит $SRC_SHORT ещё не отправлен в $REMOTE/main — сначала git push"
fi

# 2. сборка (П6: сначала проверка схемы данных — битые данные не публикуются)
node pipeline/validate_data.mjs >/dev/null || die "данные не прошли проверку схемы (out/logs/validate_data.txt)"
bash web/build.sh >/dev/null
[ -s web/dist/app.js ] && [ -s web/dist/index.html ] || die "сборка не дала web/dist/app.js и index.html"
[ -z "$(git status --porcelain -- data/)" ] || die "data/*.json не совпадают с src/canvas.tsx (сборка их пересобрала) — сначала pipeline/commit.sh, затем git push"
DATA_FILES=$(node -p "Object.values(require('./web/gen/manifest.json').file).join(' ')")
for f in $DATA_FILES; do [ -s "web/dist/data/$f" ] || die "сборка не дала web/dist/data/$f"; done
grep -q '<script src="app.js"></script>' web/dist/index.html || die "в web/index.html не найден <script src=\"app.js\"> — шаблон изменился"

HASH=$(sha256sum web/dist/app.js | cut -c1-10)
JS="app.$HASH.js"
STAGE=$(mktemp -d)
WT=$(mktemp -d)
cleanup() { git worktree remove --force "$WT" >/dev/null 2>&1 || true; rm -rf "$STAGE" "$WT"; }
trap cleanup EXIT

cp web/dist/app.js "$STAGE/$JS"
mkdir -p "$STAGE/data"; for f in $DATA_FILES; do cp "web/dist/data/$f" "$STAGE/data/$f"; done
sed "s#<script src=\"app.js\"></script>#<script src=\"$JS\"></script>#" web/dist/index.html > "$STAGE/index.html"
grep -q "<script src=\"$JS\"></script>" "$STAGE/index.html" || die "не удалось подставить $JS в index.html"
# статические файлы сайта (П5, П11, П13): web/dist/extras.txt — список путей (favicon, превью, страницы законопроектов, RSS, .ics)
EXTRAS=$( [ -s web/dist/extras.txt ] && cat web/dist/extras.txt || true )
for f in $EXTRAS; do [ -s "web/dist/$f" ] || die "сборка не дала web/dist/$f"; mkdir -p "$STAGE/x/$(dirname "$f")"; cp "web/dist/$f" "$STAGE/x/$f"; done

# 3. временный worktree ветки gh-pages (точно на $REMOTE/gh-pages, без локальных правок)
git worktree add -q --detach "$WT" "$REMOTE/$BRANCH"
cd "$WT"
[ -z "$(git status --porcelain)" ] || die "worktree gh-pages не чистый"

cp "$STAGE/$JS" "$JS"
cp "$STAGE/index.html" index.html
cp "$STAGE/$JS" app.js            # мост для закэшированного старого index.html
mkdir -p data; cp "$STAGE"/data/*.json data/   # имена по хешу содержимого: прежние файлы не перезаписываются
touch .nojekyll
# каталоги статики пересоздаются целиком (удалённые законопроекты/ленты не остаются), отдельные файлы — перезаписываются
for d in bill feed ics; do [ -d "$d" ] && { git rm -q -r --cached "$d" >/dev/null 2>&1 || true; rm -rf "$d"; }; done
[ -d "$STAGE/x" ] && cp -r "$STAGE/x/." .
# прежние хешированные файлы: оставить последние KEEP (кроме текущего), остальные удалить
OLD=$(git log --format= --name-only --diff-filter=A -- 'app.*.js' | grep -E '^app\.[0-9a-f]{10}\.js$' | grep -vx "$JS" | awk '!s[$0]++' || true)
n=0
for f in $OLD; do
  [ -e "$f" ] || continue
  n=$((n+1)); [ $n -le "$KEEP" ] && continue
  git rm -q "$f"
done
# data/*.json: оставить те, на которые ссылается текущий или оставленный прежний app.<hash>.js (и мост app.js), остальные удалить
KEEPDATA=$(for f in app.js app.*.js; do [ -e "$f" ] && grep -oE '(core|m-[0-9]{4}-[0-9]{2})\.[0-9a-f]{10}\.json' "$f"; done | sort -u || true)
for f in data/*.json; do [ -e "$f" ] || continue; echo "$KEEPDATA" | grep -qx "$(basename "$f")" && continue; git rm -q --cached "$f" 2>/dev/null || true; rm -f "$f"; done
cat > README.md <<MD
# Календарь законов: собранный сайт

Эта ветка (\`gh-pages\`) содержит только готовую статику, которую раздаёт GitHub Pages.

- **Сайт:** <$SITE>
- **Исходный код и описание:** ветка [\`main\`](https://github.com/Ruslan7121/kalendar-zakonov/tree/main)

Сборка из \`main\` $SRC_SHORT ($(date +%d.%m.%Y)) командой \`./pipeline/publish.sh\` (ветка main).
Вручную ветку не править.

- \`index.html\` ссылается на \`$JS\` — имя по хешу содержимого, поэтому после выкладки браузер не может взять старый JS из кэша.
- Предыдущие \`app.<hash>.js\` (последние $KEEP) оставлены для страниц, закэшированных до выкладки (GitHub Pages: \`max-age=600\`).
- \`app.js\` — копия последней сборки только для старых закэшированных \`index.html\`; новый \`index.html\` его не использует.
- \`data/\` — данные по месяцам (\`core.<hash>.json\`, \`m-ГГГГ-ММ.<hash>.json\`), их читает \`$JS\`; оставлены и файлы, нужные прежним \`app.<hash>.js\`.
- \`build/\` — исторические копии исходников сборки, не используются.
MD
git add -A
CHANGED=$(git diff --cached --name-only)
# в коммите допустимы только файлы сайта
BAD=$(echo "$CHANGED" | grep -v -E '^(index\.html|404\.html|app\.js|app\.[0-9a-f]{10}\.js|README\.md|\.nojekyll|favicon\.svg|og\.png|manifest\.webmanifest|sw\.js|robots\.txt|sitemap\.xml|(bill|feed|ics)/[A-Za-z0-9._/-]+|data/(core|m-[0-9]{4}-[0-9]{2})\.[0-9a-f]{10}\.json)$' || true)
[ -z "$BAD" ] || die "в коммит gh-pages попали неожиданные файлы: $BAD"
if git diff --cached --quiet -- . ':(exclude)README.md'; then
  echo "publish.sh: сайт не изменился ($JS уже опубликован), коммит не нужен"; exit 0
fi
echo "В gh-pages уйдёт:"; git diff --cached --stat
if [ $DRY -eq 1 ]; then echo "--dry-run: коммит и push не делаю"; exit 0; fi

git commit -q -m "Сборка из main $SRC_SHORT: ${MSG:-публикация} ($JS)"
PUB_SHA=$(git rev-parse HEAD)
git push -q "$REMOTE" "HEAD:refs/heads/$BRANCH"     # без --force: не fast-forward → ошибка
cd "$ROOT"
git fetch -q "$REMOTE" "$BRANCH"
echo "Опубликовано: gh-pages $PUB_SHA, $JS"

# 4. проверка живой страницы (сборка Pages ~1–2 минуты; ?t= обходит кэш CDN)
[ "${PUBLISH_NO_VERIFY:-0}" = 1 ] && exit 0
for i in $(seq 1 40); do
  if curl -fsS "${SITE}?t=$(date +%s%N)" -H 'Cache-Control: no-cache' 2>/dev/null | grep -q "<script src=\"$JS\"></script>"; then
    code=$(curl -s -o /dev/null -w '%{http_code}' "${SITE}${JS}")
    [ "$code" = 200 ] || die "живой index.html ссылается на $JS, но файл отдаёт $code"
    for f in $DATA_FILES; do c=$(curl -s -o /dev/null -w '%{http_code}' "${SITE}data/$f"); [ "$c" = 200 ] || die "data/$f отдаёт $c"; done
    echo "Живой сайт: data/ — $(echo $DATA_FILES | wc -w) файлов (200)"
    echo "Живой сайт: index.html → $JS (200). Готово."; exit 0
  fi
  sleep 15
done
die "за 10 минут живой index.html не стал ссылаться на $JS — проверьте вкладку Actions / Pages"
