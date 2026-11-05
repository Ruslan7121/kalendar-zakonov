#!/bin/bash
# fetch.sh URL [OUTFILE] — fetch public page from RU-geoblocked sites via per-domain RU proxy lists.
# Total time limit: FETCH_DEADLINE seconds (default 180). Exit 1 on failure.
D="${GD_DUMA:-/workspace/duma}"; URL="$1"; OUT="${2:-/dev/stdout}"; DEADLINE=$(( $(date +%s) + ${FETCH_DEADLINE:-180} ))
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
host=$(echo "$URL" | sed -E 's#^[a-z]+://([^/:]+).*#\1#')
case "$host" in
  vote.duma.gov.ru) K=vote; PAT='голосован';;
  sozd.duma.gov.ru) K=sozd; PAT='законопроект';;
  *duma.gov.ru) K=duma; PAT='Государственн';;
  *government.ru|premier.gov.ru) K=gov; PAT='Правительств';;
  *kremlin.ru) K=kremlin; PAT='Президент';;
  *pravo.gov.ru) K=pravo; PAT='опубликован';;
  *) K=other; PAT='<html';;
esac
L=$D/lists/$K.txt; touch $L; TMP=$(mktemp)
left(){ echo $(( DEADLINE - $(date +%s) )); }
get(){ # $1 proxy or "" ; returns 0 if got real content
  local t=$(left); [ $t -le 0 ] && return 2; [ $t -gt 20 ] && t=20
  curl -s -L --compressed -m $t -A "$UA" -H 'Accept-Language: ru-RU,ru;q=0.9' ${1:+-x $1} -o $TMP "$URL" || return 1
  [ $(stat -c%s $TMP) -gt 2000 ] && ! grep -qi '<h1>Forbidden' $TMP && ! grep -qiE 'UserGate|Error nxdomain|General Error</' $TMP; }
done_ok(){ cat $TMP > "$OUT"; rm -f $TMP; [ -n "$1" ] && { grep -vxF "$1" $L > $L.t; { echo "$1"; cat $L.t; } > $L; rm -f $L.t; }; exit 0; }
[ "$K" = other ] && { get "" && done_ok ""; }   # direct only for non-blocked sites
while read -r p; do get "$p"; r=$?; [ $r = 0 ] && done_ok "$p"; [ $r = 2 ] && break; done < <(cat $L)
# refresh: new candidates, test in parallel ON THE TARGET DOMAIN, within remaining time
[ $(left) -gt 25 ] && {
 { curl -s -m 15 "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&country=RU"|sed 's#^#http://#'
   curl -s -m 15 "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&country=RU"|sed 's#^#socks5h://#'
   curl -s -m 15 https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/countries/RU/data.txt
 } 2>/dev/null | tr -d '\r' | sed 's#^socks5://#socks5h://#' | grep -E '^[a-z0-9]+://[0-9.]+:[0-9]+$' | sort -u > $TMP.c
 T=$(( $(left) - 15 )); [ $T -gt 10 ] && timeout $T xargs -P 80 -I{} sh -c "curl -s -L -m 10 -A '$UA' -x {} '$URL' 2>/dev/null | grep -qi '$PAT' && echo {}" < $TMP.c >> $L.new
 [ -s $L.new ] && { sort -u $L.new $L > $L.t; mv $L.t $L; }; rm -f $L.new $TMP.c
 while read -r p; do get "$p"; r=$?; [ $r = 0 ] && done_ok "$p"; [ $r = 2 ] && break; done < <(cat $L)
}
# last resort: Tor (ExitNodes {ru}) if running on 9050
get "socks5h://127.0.0.1:9050" && done_ok ""
rm -f $TMP; echo "fetch.sh: failed for $URL within ${FETCH_DEADLINE:-180}s" >&2; exit 1
