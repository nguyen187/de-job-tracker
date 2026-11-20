# DE Job Pipeline — dev loop

Artifact: https://claude.ai/artifact/9YcxmGUZyb5eVFLLKm5qFM (publish file: de-job-tracker.html in this folder; fonts/ already published, omit `files` and `capabilities` on publish).
User language: Vietnamese. User wants: accurate, reliable, efficient, concise UI/AI text.

## Rules
- Reports: max 3 short Vietnamese lines (user wants everything distilled).
- Autonomous: never ask the user questions; decide and proceed. Report in 3–6 short Vietnamese lines per iteration.
- Bugs before features. When the backlog runs out, invent the next most valuable feature (accuracy, reliability, efficiency, DE career value) and add it.

## One iteration
0. Bug hunt: start preview, run sweep.js in the tab (`eval(await (await fetch("sweep.js?" + Date.now())).text())` inside javascript_tool, await the returned promise). Also re-read one area of the code for logic bugs. Any finding → fix it this iteration (add a regression test) before the feature.
1. Pick the FIRST unchecked item in Backlog. Mark it in progress.
2. Implement with a python edit script (assert each anchor occurs exactly once). Keep text short; hints use class "hint".
3. `./mkprev.sh` (syntax check) then `node reliability.test.js && node accuracy.test.js && node cvparse.test.js` — all must pass. Add tests for the new logic to reliability.test.js (export names via the `global.__t = {` line).
4. Browser check: add the `job-tracker-preview` config to data-platform/.claude/launch.json (backup is launch.json.bak), preview_start, open http://localhost:8765/preview.html?v=N, exercise the feature, check console errors.
5. Publish the artifact. Stop preview, restore launch.json from launch.json.bak, confirm `git status` clean in data-platform.
6. Tick the item below with the version number; append any new ideas to the Backlog.

## Backlog
- [x] R offline single-file copy (v28)
- [x] AB raw data viewer on Data page (v29)
- [x] S auto-tag JDs + filter (v30; also fixed: deadline sort NaN, future-date label, EN chip label, duplicate sample load)
- [x] T official learning links per gap (v31; all 44 URLs checked live, unreachable one swapped; empty gap cards fixed)
- [x] Z undo for every single delete: stories, contacts, CV versions, study logs, interview rounds, jobs (v32)
- [x] Y STAR suggestions per behavioral question (v33)
- [x] U idle cards ≥14 days + column age + todo nudge (v34)
- [x] AD one-page pipeline report PDF: KPIs, funnel, week notes, 14-day calendar, next to apply, gaps, salary (v35)
- [x] AE CV version diff: line diff vs chosen version + skills gained/lost (v36; fixed panel closing on switch)
- [x] AF shortcut overlay (?), H toggles hints, digits 1–9/0 jump to pages (v37)
- [x] AG CSV import: round-trip with export, VN/EN headers, , ; tab, dedupe, snapshot first (v38)
- [x] AH per-record snapshot restore: deleted/changed list, restore one with undo (v39)
- [x] AI response rate by JD tag (domain, mode, level, English) + insight when gap ≥ 20 pts (v40)
- [x] AJ LEARN links re-verified 2026-11-20: 38/38 HTTP 200, no change (at v40)
- [~] AP re-verify LEARN URLs again around v50 (deferred; skip until v50)
- [x] AO compact snapshot rows: short date + label on one line, buttons wrap below (v43)
- [x] AK 9 behavioral practice questions (J/M/S) with STAR key points + story suggestion (v41)
- [x] AL funnel conversion % per stage + median days to first reply (overview + PDF report) (v42)
- [x] AM diff "← Đưa sang": re-adds a bullet into the matching entry at its original position, undo; other lines copy (v44)
- [x] AN CSV import preview: mapped columns, rows, duplicates greyed, confirm button (v45)
- [x] AQ behavioral answer → STAR draft (S/T/A/R split, themes, title) opened in story editor (v46)
- [x] AR bulk status change + undo (v47; unit-tested only, browser check denied)
- [ ] AS weekly goal streak: consecutive weeks hitting application goal shown on overview
