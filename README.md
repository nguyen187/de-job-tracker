# DE Job Pipeline

Job tracker + career mentor for Data Engineers. Single-file web app (`de-job-tracker.html`), published as a claude.ai artifact: https://claude.ai/artifact/9YcxmGUZyb5eVFLLKm5qFM

- `./mkprev.sh` — syntax check + build `preview.html` for local browser testing
- `node tests/reliability.test.js && node tests/accuracy.test.js` (+ `tests/private/` local-only CV tests, gitignored)
- `tools/sweep.js` — run in the preview page to catch render errors; `tools/bench.js` — render timing
- `fonts/` — PDF fonts, published alongside the artifact
- `DEV_LOOP.md` — dev process + backlog

User data lives in the claude.ai account (artifact db), not in this repo.
