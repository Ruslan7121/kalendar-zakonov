#!/bin/bash
# testdom.sh NAME URL PATTERN < candidates  -> working proxies to stdout
xargs -P 80 -I{} sh -c 'curl -s -L -m 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0" -x {} "'"$2"'" 2>/dev/null | grep -q -i "'"$3"'" && echo {}'
