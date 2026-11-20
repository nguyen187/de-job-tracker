#!/bin/sh
cd "$(dirname "$0")"
{ printf '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%%}[hidden]{display:none!important}</style></head><body>'; cat de-job-tracker.html; printf '</body></html>'; } > preview.html
python3 -c "
import re;s=open('de-job-tracker.html').read();js=re.findall(r'<script>(.*?)</script>',s,re.S)[0];open('app.js','w').write(js)" && node --check app.js && echo SYNTAX_OK
