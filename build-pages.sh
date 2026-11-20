#!/bin/sh
# Build the standalone GitHub Pages site into _site/ from the artifact source.
# On Pages there is no claude.ai runtime: data stays in the browser (localStorage), AI is off.
set -e
cd "$(dirname "$0")"
rm -rf _site && mkdir -p _site
{ printf '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script>window.__OFFLINE=true;</script></head><body>\n'
  cat de-job-tracker.html
  printf '\n</body></html>\n'; } > _site/index.html
cp -R fonts _site/fonts
touch _site/.nojekyll
echo "built _site/index.html"
