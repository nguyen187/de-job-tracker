// Reliability tests: malformed AI output, corrupt stored data, render safety, remote-sync merge rules, memo invalidation.
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/../de-job-tracker.html", "utf8");
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const el = () => ({ innerHTML: "", textContent: "", hidden: false, value: "", style: {}, scrollIntoView() {}, focus() {}, setSelectionRange() {}, querySelector() { return null; }, addEventListener() {} });
const els = {};
global.document = { querySelector: s => els[s] || (els[s] = el()), querySelectorAll: () => [], addEventListener() {}, styleSheets: [], body: { classList: { contains: () => false, toggle() {}, add() {} } }, activeElement: null };
global.window = global; global.addEventListener = () => {}; global.scrollTo = () => {}; global.scrollY = 0;
global.location = { hash: "" }; global.localStorage = { getItem: () => null, setItem() {} };
global.console.error = () => {};
eval(js.replace(/\/\* =+ Boot =+ \*\/[\s\S]*$/, "") + `
global.__t = { marketFit, marketFitCard, thaw, bulkSetStatus, draftStoryFromAnswer, csvPreview, csvIsDup, bringLine, bulletSources, cvCmpBase, funnelStats, firstReplyDays, tagResponse, patternCard, snapRecords, restoreRecord, snapPanel, parseCSV, csvToJobs, importJobsCSV, csvDate, viewForKey, openShortcuts, SHORTCUTS, NAV_NAMES, lineDiff, cvDiff, cvDiffCard, normDoc, pipelineReport, isIdle, staleDays, qThemes, storiesForQuestion, storyHint, removeWithUndo, toastActionGet: () => toastAction, LEARN, learnKey, learnLink, loadSample, rawRecords, rawCard, msgTemplate, searchAll, storyMatches, prepBrief, setupSteps, setupCard, jobRounds, weekReport, reportText, backupReminder, compareRows, QB, pickQuestion, logPractice, qStats, weekStats, wkKey, mdLite, removeJob, undoDelete, purgeTrash, TRASH, findDuplicate, jdSimilarity, filteredJobs, jobsCSV, whenLabel, deadlineInfo, interviewInfo, stageDays, upcomingEvents, icsFor, jobEvents, buildTodos, vBrief, briefAI, BREVITY, relAdded, addedAt, sortJobs, state, vAnalysis, vReview, vGrade, vPlan, vDebrief, normalizeState, render, localMatch, applyRemote, SYNC, pending, VIEWS, loadSample, isStale, hsh };`);
const T = global.__t;
let pass = 0, fail = 0; const fails = [];
const check = (n, ok, d) => { if (ok) pass++; else { fail++; fails.push(n + (d ? " → " + d : "")); } };
const throws = f => { try { f(); return false; } catch { return true; } };

// 1. malformed AI output never yields shapes that crash rendering
const junk = { fitScore: "82", strengths: "Strong SQL", gaps: ["Kafka", { skill: "dbt", importance: "huge" }, null], cvTweaks: "rewrite", interviewQuestions: [{ q: "Q1" }, "Q2", { hint: "no q" }], learningPlan: { week: 1 }, atsKeywords: [1, 2, { a: "x" }], jdDecode: "text" };
const a = T.vAnalysis(junk);
check("fitScore coerced", a.fitScore === 82);
check("strengths string → array", Array.isArray(a.strengths) && a.strengths[0].point === "Strong SQL");
check("gaps: non-objects dropped, bad importance → must", a.gaps.length === 1 && a.gaps[0].importance === "must");
check("questions without q dropped", a.interviewQuestions.length === 1);
check("keywords stringified", a.atsKeywords.every(k => typeof k === "string"));
check("breakdown sums to score", T.vAnalysis({ scoreBreakdown: { mustHave: 99, seniority: 10, domain: 5, evidence: 20 } }).fitScore === 45 + 10 + 5 + 20);
check("missing score rejected", throws(() => T.vAnalysis({ summary: "x" })));
check("review score clamped", T.vReview({ score: 15 }).score === 10);
check("grade dims default", T.vGrade({ score: 7, dims: { structure: 9 } }).dims.structure === 5);
check("plan without milestones rejected", throws(() => T.vPlan({ northStar: "x" })));
check("debrief needs overall", throws(() => T.vDebrief({ answers: [] })));

// 2. corrupt stored data is repaired and every view renders
T.state.profile = { cvText: 123, skills: "sql", review: { score: "x" } };
T.state.jobs = [{ id: "j1", status: "weird", history: "x", jd: null, ai: { fitScore: 70, strengths: "s", interviewQuestions: [{ q: "a", grade: { score: "bad" } }] } }, { id: "j1", title: "dup" }, null, { title: "no id" }];
T.state.cvdocs = [{ id: "cv1", data: { experience: "x", skills: [{ group: "G", items: "a, b" }] } }];
T.state.mentor = { turns: [{ role: "system", content: "x" }, { role: "user", content: "hi" }] };
T.state.career = { ratings: null, logs: "x", plan: { northStar: "x" } };
T.normalizeState();
check("profile repaired", typeof T.state.profile.cvText === "string" && Array.isArray(T.state.profile.skills) && !T.state.profile.review);
check("jobs deduped and invalid removed", T.state.jobs.length === 1);
check("bad status → saved", T.state.jobs[0].status === "saved");
check("ai repaired, bad grade dropped", T.state.jobs[0].ai && T.state.jobs[0].ai.interviewQuestions[0].grade === undefined);
check("cvdoc normalized", Array.isArray(T.state.cvdocs[0].data.experience) && T.state.cvdocs[0].data.skills[0].items.length === 2);
check("mentor roles filtered", T.state.mentor.turns.length === 1);
check("career plan invalid → null", T.state.career.plan === null && Array.isArray(T.state.career.logs));
let renderErr = null;
for (const v of T.VIEWS) { location.hash = "#" + v; try { T.render(); } catch (e) { renderErr = v + ": " + e.message; } }
for (const t of ["fit", "gap", "cv", "interview", "info"]) { T.state.ui.tab = t; location.hash = "#job-j1"; try { T.render(); } catch (e) { renderErr = t + ": " + e.message; } }
check("all views render on repaired data", !renderErr, renderErr);

// 3. render guard: a throwing view shows the error card instead of crashing
const orig = T.state.jobs[0]; Object.defineProperty(T.state.jobs, 0, { get() { throw new Error("boom"); }, configurable: true });
location.hash = "#overview"; let guarded = true; try { T.render(); } catch { guarded = false; }
check("render guard catches view errors", guarded && document.querySelector("#main").innerHTML.includes("lỗi hiển thị"));
Object.defineProperty(T.state.jobs, 0, { value: orig, writable: true, configurable: true });

// 4. remote merge rules
T.state.jobs = [{ id: "j2", title: "local", updatedAt: 200 }];
check("older remote ignored", T.applyRemote("j2", { kind: "job", id: "j2", title: "remote-old", updatedAt: 100 }) === false && T.state.jobs[0].title === "local");
check("newer remote applied", T.applyRemote("j2", { kind: "job", id: "j2", title: "remote-new", updatedAt: 300 }) === true && T.state.jobs[0].title === "remote-new");
T.SYNC.pending.add("j2");
check("pending local edit wins", T.applyRemote("j2", { kind: "job", id: "j2", title: "x", updatedAt: 999 }) === false);
T.SYNC.pending.delete("j2");
check("remote delete applied", T.applyRemote("j2", null, true) === true && T.state.jobs.length === 0);
check("new remote job added", T.applyRemote("j3", { kind: "job", id: "j3", title: "n", updatedAt: 1 }) === true && T.state.jobs[0].id === "j3");

// 5. memo invalidates on JD / CV skill changes
const job = { id: "m1", title: "DE", jd: "Requirements: Python, Kafka" };
const r1 = T.localMatch(job, { skills: ["python"] }); const r2 = T.localMatch(job, { skills: ["python"] });
check("memo reuses result", r1 === r2);
job.jd = "Requirements: Python"; const r3 = T.localMatch(job, { skills: ["python"] });
check("memo invalidates on JD change", r3 !== r1 && r3.score === 100);
check("memo invalidates on skills change", T.localMatch(job, { skills: [] }).score === 0);

// 6. staleness
T.state.profile = { cvText: "cv v1", skills: [] }; const sj = { id: "s1", jd: "jd", ai: { fitScore: 1, basis: { cv: T.hsh("cv v1"), jd: T.hsh("jd") } } };
check("fresh analysis not stale", !T.isStale(sj));
T.state.profile.cvText = "cv v2"; check("CV change marks stale", T.isStale(sj));

// 7. regression: a v7-era CV doc (no education bullets, no references, old template) put into state RAW must render
T.state.cvdocs = [{ id: "cvold", name: "old", tpl: "modern", lang: "en", data: { name: "A", experience: [{ role: "DE", company: "X", bullets: ["b"] }], education: [{ school: "U", degree: "BSc" }], skills: [{ group: "G", items: ["SQL"] }], certs: ["c"], projects: [{ name: "P", stack: "S", bullets: [] }] } }];
T.state.ui.cvdoc = "cvold"; location.hash = "#resume"; let oldErr = null; const before = document.querySelector("#main").innerHTML;
try { T.render(); } catch (e) { oldErr = e.message; }
check("raw v7 CV doc renders without error card", !oldErr && !document.querySelector("#main").innerHTML.includes("lỗi hiển thị"), oldErr || "error card shown");
// 8. one bad collection no longer stops the rest from being normalized
T.state.jobs = { not: "an array" }; T.state.cvdocs = [{ id: "cv2", data: { education: [{ school: "U" }] } }];
let nErr = null; try { T.normalizeState(); } catch (e) { nErr = e.message; }
check("normalizeState never throws", !nErr, nErr);
check("cvdocs normalized even when jobs were garbage", Array.isArray(T.state.cvdocs[0].data.education[0].bullets) && Array.isArray(T.state.jobs));

// 9. date added
const now = Date.now();
check("relAdded today", T.relAdded(now).startsWith("hôm nay"));
check("relAdded yesterday", T.relAdded(now - 864e5).startsWith("hôm qua"));
check("relAdded days ago", T.relAdded(now - 3 * 864e5) === "3 ngày trước", T.relAdded(now - 3 * 864e5));
check("relAdded old date", /\d{2}\/\d{2}/.test(T.relAdded(now - 40 * 864e5)), T.relAdded(now - 40 * 864e5));
check("addedAt falls back to history", T.addedAt({ history: [{ status: "saved", at: 123 }] }) === 123);
T.state.ui.jobSort = "added-desc"; const sortedIds = T.sortJobs([{ id: "a", createdAt: 1 }, { id: "b", createdAt: 3 }, { id: "c", createdAt: 2 }]).map(x => x.id).join("");
check("sort newest first", sortedIds === "bca", sortedIds);
T.state.ui.jobSort = "added-asc"; check("sort oldest first", T.sortJobs([{ id: "a", createdAt: 1 }, { id: "b", createdAt: 3 }]).map(x => x.id).join("") === "ab");

// 10. brevity
const long = "Ứng viên có nền tảng tốt về streaming với Kafka và Flink. Tuy nhiên thiếu kinh nghiệm dbt và data modeling. Ngoài ra CV chưa nêu quy mô dữ liệu cụ thể nên khó đánh giá chiều sâu.";
const b1 = T.vBrief(long, 22);
check("vBrief keeps whole sentences within budget", b1 === "Ứng viên có nền tảng tốt về streaming với Kafka và Flink. Tuy nhiên thiếu kinh nghiệm dbt và data modeling.", b1);
const b2 = T.vBrief("Một câu rất dài không có dấu chấm nào để cắt " + "và rất dài ".repeat(20), 10);
check("vBrief cuts an over-long single sentence with …", b2.endsWith("…") && b2.split(" ").length <= 11, b2);
check("vBrief leaves short text untouched", T.vBrief("Ngắn gọn.", 10) === "Ngắn gọn.");
const va2 = T.vAnalysis({ fitScore: 60, summary: long + " " + long, strengths: ["a", "b", "c", "d", "e", "f"], gaps: Array.from({ length: 9 }, (_, i) => ({ skill: "s" + i })), redFlags: ["1", "2", "3", "4", "5"], questionsToAsk: ["q1", "q2", "q3", "q4", "q5"], interviewQuestions: Array.from({ length: 12 }, (_, i) => ({ q: "Q" + i })) });
check("analysis summary ≤ 45 words", va2.summary.split(" ").length <= 45, va2.summary.split(" ").length);
check("analysis list caps", va2.strengths.length <= 4 && va2.gaps.length <= 5 && va2.redFlags.length <= 3 && va2.questionsToAsk.length <= 3 && va2.interviewQuestions.length <= 8, [va2.strengths.length, va2.gaps.length, va2.redFlags.length, va2.questionsToAsk.length, va2.interviewQuestions.length].join(","));
let seen = null; const fake = async (input) => { seen = input; return { text: "" }; }; fake.json = async (input) => { seen = input; return {}; };
const w = T.briefAI(fake);
w("Prompt A"); check("brevity rules appended to string prompts", typeof seen === "string" && seen.endsWith(T.BREVITY));
w([{ role: "user", content: "RULES" }, { role: "user", content: "hi" }]); check("brevity rules added to chat instructions turn", seen[0].content.includes(T.BREVITY) && seen[1].content === "hi");
w.json("Prompt B"); check("brevity rules on json calls", seen.endsWith(T.BREVITY));

// 11. time & schedule
const D = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
check("whenLabel today/tomorrow", T.whenLabel(Date.now()).startsWith("Hôm nay") && T.whenLabel(Date.now() + 864e5).startsWith("Ngày mai"));
check("deadline countdown", T.deadlineInfo({ status: "saved", deadline: D(3) }).txt === "Hạn nộp còn 3 ngày", T.deadlineInfo({ status: "saved", deadline: D(3) }).txt);
check("deadline expired", T.deadlineInfo({ status: "saved", deadline: D(-2) }).txt === "Hết hạn nộp");
check("deadline hidden once applied", T.deadlineInfo({ status: "applied", deadline: D(3) }) === null);
check("stage days from last matching history", T.stageDays({ status: "applied", history: [{ status: "saved", at: Date.now() - 20 * 864e5 }, { status: "applied", at: Date.now() - 9 * 864e5 }] }) === 9);
const ivAt = D(1) + "T14:30";
T.state.jobs = [{ id: "a", title: "DE", company: "X", status: "interview", interviewAt: ivAt, interviewNote: "Vòng 2", history: [] }, { id: "b", title: "DE2", company: "Y", status: "saved", deadline: D(2), history: [] }, { id: "c", title: "old", company: "Z", status: "rejected", interviewAt: ivAt, history: [] }];
T.state.contacts = [];
const ev = T.upcomingEvents(14);
check("upcoming: interview + deadline, rejected excluded, sorted", ev.length === 2 && ev[0].kind === "pv" && ev[1].kind === "dl", ev.map(e => e.kind).join(","));
const todosNow = T.buildTodos().map(t => t.title);
check("todo: prepare for interview tomorrow", todosNow.some(x => x.startsWith("Chuẩn bị phỏng vấn")), todosNow.join(" | "));
check("todo: apply before deadline", todosNow.some(x => x.startsWith("Nộp trước hạn")));
const ics = T.icsFor(T.jobEvents(T.state.jobs[0]).concat([{ t: Date.now(), title: "a, b; c\nd", desc: "Phỏng vấn vòng hai ở công ty dữ liệu ".repeat(8) }]));
const icsLines = ics.split("\r\n");
check("ics wrapper", ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.trim().endsWith("END:VCALENDAR"));
check("ics timed event + alarm", /DTSTART:\d{8}T143000/.test(ics) && ics.includes("BEGIN:VALARM"), ics.slice(0, 300));
check("ics escapes , ; newline", ics.includes("a\\, b\\; c\\nd"));
check("ics lines folded ≤ 75 octets", icsLines.every(l => new TextEncoder().encode(l).length <= 76), Math.max(...icsLines.map(l => l.length)));
check("ics CRLF only", !/[^\r]\n/.test(ics));

// 12. undo delete, duplicates, filters, CSV
T.state.jobs = [{ id: "u1", title: "DE", company: "A", status: "saved", jd: "x", history: [], fileId: "f1" }, { id: "u2", title: "DE2", company: "B", status: "applied", jd: "y", history: [] }];
T.state.cvdocs = [{ id: "cvu", jobId: "u1", data: {} }]; T.state.files = [{ id: "f1", name: "jd.pdf" }];
T.removeJob("u1");
check("delete removes job and unlinks CV", T.state.jobs.length === 1 && !T.state.cvdocs[0].jobId);
check("file kept during undo window", T.state.files.length === 1);
check("undo restores job at position and relinks CV", T.undoDelete() === 1 && T.state.jobs[0].id === "u1" && T.state.cvdocs[0].jobId === "u1");
T.removeJob("u1"); T.purgeTrash();
check("purge after window drops file record", T.state.files.length === 0 && T.undoDelete() === 0);
const JDA = "We are hiring a Senior Data Engineer to build streaming pipelines with Kafka, Flink and Spark on Kubernetes. You will own the lakehouse on Iceberg, data quality checks, and CI/CD for data. Requirements: 5+ years of experience, strong SQL and Python, Airflow, AWS.";
T.state.jobs = [{ id: "d1", title: "Senior Data Engineer", company: "Fintech A (ví dụ)", status: "saved", jd: JDA, history: [] }];
check("duplicate by title+company (ignores 'ví dụ', accents, case)", T.findDuplicate({ title: "senior data engineer", company: "Fintech A" })?.job.id === "d1");
check("duplicate by near-identical JD", T.findDuplicate({ jd: JDA.replace("5+ years", "4+ years") + " Apply now!" })?.job.id === "d1");
check("different JD not flagged", T.findDuplicate({ jd: "Backend Java developer with Spring Boot, microservices, REST APIs and PostgreSQL. 3 years experience required. Docker and Kubernetes a plus, English communication." }) === null);
T.state.jobs = [{ id: "f1", title: "Data Engineer", company: "Shopee", status: "applied", jd: "Kafka streaming", notes: "referral từ anh Minh", history: [] }, { id: "f2", title: "Analytics Engineer", company: "Tiki", status: "saved", jd: "dbt models", history: [] }];
T.state.ui.q = "kafka"; check("search matches JD text", T.filteredJobs().map(j => j.id).join() === "f1");
T.state.ui.q = "minh"; check("search matches notes, accent-insensitive", T.filteredJobs().map(j => j.id).join() === "f1");
T.state.ui.q = ""; T.state.ui.flt = { st: ["saved"] }; check("status filter", T.filteredJobs().map(j => j.id).join() === "f2");
T.state.ui.flt = {};
const csv = T.jobsCSV([{ title: 'Senior "Data" Engineer', company: "=HYPERLINK(1)", status: "saved", notes: "dòng 1\ndòng 2", history: [] }]);
check("csv has BOM + header", csv.startsWith("\ufeffVị trí,Công ty"));
check("csv quotes and doubles quotes", csv.includes('"Senior ""Data"" Engineer"'));
check("csv neutralizes formula injection", csv.includes(`"'=HYPERLINK(1)"`));
check("csv keeps one row per job", csv.split("\r\n").length === 2);

// 13. markdown-lite rendering of AI replies
const md = T.mdLite("## Ưu tiên\n- **Nộp** Fintech A trước\n* dùng `dbt`\n<script>x</script> *nhẹ*");
check("md heading → bold", md.includes("<b>Ưu tiên</b>"));
check("md bullets → •", md.includes("• <b>Nộp</b> Fintech A trước") && md.includes("• dùng <code"));
check("md escapes HTML", md.includes("&lt;script&gt;") && !md.includes("<script>"));
check("md italic", md.includes("<i>nhẹ</i>"));

// 14. practice bank
check("question bank has ≥ 25 questions across ≥ 8 topics", T.QB.length >= 25 && new Set(T.QB.map(q => q.c)).size >= 8);
check("every question has ≥ 3 key points and unique id", T.QB.every(q => q.k.length >= 3) && new Set(T.QB.map(q => q.id)).size === T.QB.length);
T.state.career.practice = [];
let juniorOnly = true; for (let i = 0; i < 60; i++) { const q = T.pickQuestion("", "J"); if (q.lv !== "J") juniorOnly = false; }
check("level filter: Junior only gets J questions", juniorOnly);
const sqlIds = T.QB.filter(q => q.c === "SQL").map(q => q.id);
sqlIds.forEach(id => T.logPractice(T.QB.find(q => q.id === id), id === "sql1" ? 2 : 10, "self"));
const picks = {}; for (let i = 0; i < 400; i++) { const q = T.pickQuestion("SQL", "S"); picks[q.id] = (picks[q.id] || 0) + 1; }
check("weak-first: low-score question picked most often", Object.entries(picks).sort((a, b) => b[1] - a[1])[0][0] === "sql1", JSON.stringify(picks));
check("exclude current question", Array.from({ length: 30 }, () => T.pickQuestion("SQL", "S", "sql1").id).every(id => id !== "sql1"));
check("practice counts toward weekly stats", T.weekStats(T.wkKey()).practice >= sqlIds.length);
check("qStats tracks last score", T.qStats("sql1").last === 2 && T.qStats("sql1").n === 1);

// 15. compare
T.state.profile = { cvText: "x", skills: ["python", "sql", "redshift"], years: 4 };
const CJ = [{ id: "c1", title: "DE", company: "A", status: "saved", jd: "Requirements: Python, SQL, BigQuery, Kafka", history: [] }, { id: "c2", title: "DE", company: "B", status: "saved", jd: "Requirements: Python, SQL", history: [] }];
const cr = T.compareRows(CJ);
const row = n => cr.find(r => r.n === n);
check("compare: higher score highlighted", row("Điểm phù hợp").best[1] === true && row("Điểm phù hợp").best[0] === false, JSON.stringify(row("Điểm phù hợp")));
check("compare: missing lists exclude equivalents", row("Còn thiếu").v[0] === "Kafka" && /BigQuery ≈ Redshift/.test(row("Có tương đương").v[0]), row("Còn thiếu").v[0] + " / " + row("Có tương đương").v[0]);
check("compare: fewer missing is best", row("Còn thiếu").best[1] === true);
check("compare: no highlight on ties", T.compareRows([CJ[1], { ...CJ[1], id: "c3" }]).find(r => r.n === "Điểm phù hợp").best.every(b => !b));

// 16. backup reminder
const toastEl = document.querySelector("#toast"); toastEl.innerHTML = ""; T.state.jobs = [{ id: "r1", title: "x", status: "saved", history: [] }]; T.state.profile = { cvText: "cv", skills: [] };
T.state.career.lastBackup = Date.now() - 20 * 864e5; T.backupReminder();
check("reminds after 20 days without backup", /20 ngày chưa sao lưu/.test(toastEl.innerHTML), toastEl.innerHTML);
toastEl.innerHTML = ""; T.state.career.lastBackup = Date.now() - 2 * 864e5; T.backupReminder();
check("no reminder right after a backup", toastEl.innerHTML === "");
toastEl.innerHTML = ""; T.state.career.lastBackup = 0; T.state.jobs = [{ id: "s", sample: true, history: [] }]; T.state.profile = null; T.backupReminder();
check("no reminder for sample-only data", toastEl.innerHTML === "");

// 17. weekly report
const now2 = Date.now(), wk = 7 * 864e5;
T.state.career.goals = { apps: 5, hours: 6, practice: 3 }; T.state.career.logs = []; T.state.career.practice = []; T.state.stories = [];
T.state.jobs = [
  { id: "w1", title: "a", status: "interview", createdAt: now2 - 3600e3, history: [{ status: "saved", at: now2 - 3600e3 }, { status: "applied", at: now2 - 1800e3 }, { status: "interview", at: now2 - 600e3 }] },
  { id: "w2", title: "b", status: "applied", createdAt: now2 - wk - 864e5, history: [{ status: "saved", at: now2 - wk - 864e5 }, { status: "applied", at: now2 - wk - 864e5 }] },
];
const wr = T.weekReport();
check("report counts this week's new JDs, applications, interviews", wr.cur.added === 1 && wr.cur.apps === 1 && wr.cur.ivs === 1, JSON.stringify(wr.cur));
check("report counts last week separately", wr.prev.apps === 1 && wr.prev.added === 1, JSON.stringify(wr.prev));
check("report flags interviewing without practice", wr.notes.some(n => /chưa luyện/.test(n)), wr.notes.join(" | "));
check("report flags below application goal", wr.notes.some(n => /Mới nộp 1\/5/.test(n)));
check("report text is concise (≤ 8 lines)", T.reportText(wr).split("\n").length <= 8);

// 18. interview rounds
const fut = (d, h) => { const x = new Date(Date.now() + d * 864e5); x.setHours(h, 0, 0, 0); return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
const oj = { id: "o1", title: "DE", company: "X", status: "interview", interviewAt: fut(1, 10), interviewNote: "Vòng 2", history: [] };
check("old single interview migrates to round 1", T.jobRounds(oj).length === 1 && T.jobRounds(oj)[0].name === "Vòng 2");
const rj = { id: "o2", title: "DE", company: "Y", status: "interview", history: [], rounds: [{ id: "a", name: "HR", at: fut(-3, 9), result: "pass" }, { id: "b", name: "System design", at: fut(2, 14), result: "pending" }, { id: "c", name: "HM", at: fut(1, 9), result: "cancel" }] };
check("next round is the soonest non-cancelled future one", T.interviewInfo(rj).round.id === "b" && !T.interviewInfo(rj).past);
T.state.jobs = [rj]; T.state.contacts = [];
check("upcoming lists each future round, skips cancelled", T.upcomingEvents(14).filter(e => e.kind === "pv").length === 1);
check("ics has one event per non-cancelled round", (T.icsFor(T.jobEvents(rj)).match(/BEGIN:VEVENT/g) || []).length === 2);
rj.rounds = [{ id: "a", name: "HR", at: fut(-3, 9), result: "pass" }];
check("pending-result reminder only when result pending", !T.buildTodos().some(x => x.title.startsWith("Cập nhật kết quả")));
rj.rounds[0].result = "pending";
check("pending-result reminder shown after a past round", T.buildTodos().some(x => x.title.startsWith("Cập nhật kết quả")));

// 19. setup checklist
T.state.profile = { cvText: "cv", skills: [], role: "", salary: "", years: 3 }; T.state.jobs = [{ id: "z1", history: [] }]; T.state.stories = []; T.state.cvdocs = []; T.state.career.ratings = {}; T.state.career.lastBackup = 0; T.state.career.setupHidden = false;
const st = Object.fromEntries(T.setupSteps().map(x => [x.k, x.done]));
check("setup detects done/undone", st.cv && st.years && !st.goal && !st.jds && !st.backup, JSON.stringify(st));
check("setup card shows next 3 steps", (T.setupCard().match(/class="btn sm"/g) || []).length === 3);
T.state.career.setupHidden = true; check("setup card hidden after dismiss", T.setupCard() === "");

// 20. prep brief
T.state.profile = { cvText: "cv", skills: ["python", "kafka"], years: 4, salary: "50 triệu" };
T.state.stories = [{ id: "s1", title: "Giảm độ trễ Kafka streaming", action: "Tối ưu consumer Kafka và Flink", result: "giảm 70% độ trễ", themes: ["impact"] }, { id: "s2", title: "Học Excel", action: "làm báo cáo", themes: [] }];
const pj = { id: "p1", title: "DE", company: "X", status: "interview", jd: "Requirements: Kafka, Flink, Python, dbt", history: [], ai: { fitScore: 70, strengths: [{ point: "Streaming thực chiến" }], gaps: [{ skill: "dbt", howToClose: "làm 1 project nhỏ" }], interviewQuestions: [{ q: "Exactly-once?", hint: "checkpoint + sink idempotent" }], questionsToAsk: ["Quy mô dữ liệu?"] } };
const sm = T.storyMatches(pj);
check("story matching picks JD-relevant story first, drops irrelevant", sm.length === 1 && sm[0].s.id === "s1", JSON.stringify(sm.map(x => x.s.id)));
const bf = T.prepBrief(pj);
check("brief has have/miss from JD", bf.have.includes("Kafka") && bf.miss.some(m => /dbt/.test(m)), JSON.stringify([bf.have, bf.miss]));
check("brief carries AI sections concisely", bf.strengths.length === 1 && bf.gaps[0].startsWith("dbt:") && bf.questions[0].includes("→") && bf.ask.length === 1);

// 21. global search
T.state.jobs = [{ id: "g1", title: "Data Engineer", company: "Shopee", status: "applied", jd: "Kafka Flink lakehouse", notes: "", history: [] }];
T.state.stories = [{ id: "st", title: "Sự cố pipeline thanh toán", action: "rollback" }]; T.state.contacts = [{ id: "c", name: "Trần Minh", company: "Grab" }]; T.state.cvdocs = [{ id: "cv1", name: "CV · Shopee", data: { title: "DE" } }];
const g = q => T.searchAll(q).map(x => x.g);
check("search finds job by JD content", g("flink").includes("Việc làm"));
check("search accent-insensitive across stories/contacts", g("su co").includes("Câu chuyện STAR") && g("tran minh").includes("Liên hệ"));
check("search finds CV versions and pages", g("shopee").includes("Bản CV") && g("du lieu").includes("Trang"));
check("search finds practice questions", g("watermark").includes("Câu hỏi luyện tập"));
check("empty query returns nothing", T.searchAll("  ").length === 0);

// 22. message templates
T.state.profile = { cvText: "cv", name: "Nguyen Van A", skills: ["python", "kafka"], years: 4 };
const mj = { id: "m1", title: "Senior Data Engineer", company: "Fintech A (ví dụ)", contact: "chị Lan", appliedDate: "2026-11-10", status: "applied", history: [], rounds: [{ id: "r", name: "System design", at: "2026-11-15T10:00", result: "pending" }], offer: { base: 60 } };
for (const k of ["followup", "thanks", "status", "referral", "accept", "decline"]) for (const lang of ["vi", "en"]) {
  const t = T.msgTemplate(mj, k, lang);
  check(`template ${k}/${lang} filled`, t.includes("Senior Data Engineer") && t.includes("Nguyen Van A") && !t.includes("undefined") && !t.includes("(ví dụ)"), t.slice(0, 80));
}
check("thanks template names the round and contact", T.msgTemplate(mj, "thanks", "vi").includes("System design") && T.msgTemplate(mj, "thanks", "vi").startsWith("Chào chị Lan"));

// 23. raw data viewer
T.state.profile = { cvText: "cv", skills: [] }; T.state.jobs = [{ id: "rj1", title: "DE", company: "X", history: [] }]; T.state.cvdocs = []; T.state.stories = []; T.state.contacts = []; T.state.files = [];
const rr = T.rawRecords();
check("raw records mirror stored docs with kind", rr.find(r => r.id === "profile").data.kind === "profile" && rr.find(r => r.id === "rj1").data.kind === "job");
T.state.jobs[0].notes = "<script>alert(1)</script>"; T.state.ui.rawId = "rj1";
check("raw viewer escapes content", !T.rawCard().includes("<script>alert") && T.rawCard().includes("&lt;script&gt;"));

// 24. regressions: deadline sort with missing dates; future added date
T.state.ui.jobSort = "deadline"; const D2 = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ds = T.sortJobs([{ id: "a", createdAt: 1, status: "saved" }, { id: "b", createdAt: 3, status: "saved", deadline: D2(5) }, { id: "c", createdAt: 2, status: "saved" }, { id: "d", createdAt: 4, status: "saved", deadline: D2(1) }]).map(x => x.id).join("");
check("deadline sort: dated first (soonest), undated stable by newest", ds === "dbca", ds);
check("future added date shows a date, not 'hôm nay' or negative days", /^\d{2}\/\d{2}/.test(T.relAdded(Date.now() + 3 * 864e5)), T.relAdded(Date.now() + 3 * 864e5));

// 25. sample data idempotent
T.state.jobs = []; T.state.profile = null; T.state.cvdocs = []; T.loadSample(); const n1 = T.state.jobs.length; T.loadSample();
check("loading sample twice does not duplicate", T.state.jobs.length === n1 && n1 > 0, n1 + " → " + T.state.jobs.length);

// 26. learning links
check("every link is https and first-party-looking", Object.values(T.LEARN).every(([, u]) => /^https:\/\//.test(u)));
check("learnKey maps free-text AI gap to skill", T.learnKey("Kinh nghiệm Apache Kafka production") === "kafka" && T.learnKey("dbt") === "dbt");
check("no link for unknown skill", T.learnLink("Leadership presence") === "");
check("link opens in new tab safely", /target="_blank" rel="noopener"/.test(T.learnLink("airflow")));

// 27. generic undo
const arrU = [{ id: 1 }, { id: 2 }, { id: 3 }]; let removed = null, restored = null;
T.removeWithUndo(arrU, x => x.id === 2, "x", it => removed = it, it => restored = it);
check("undo helper removes item", arrU.map(x => x.id).join() === "1,3" && removed.id === 2);
T.toastActionGet().fn();
check("undo restores at original index", arrU.map(x => x.id).join() === "1,2,3" && restored.id === 2);
check("undo helper returns false when not found", T.removeWithUndo(arrU, x => x.id === 9, "x") === false);

// 28. story suggestions per question
check("themes from question (vi + en)", T.qThemes("Kể về lần bạn bất đồng với quản lý").includes("conflict") && T.qThemes("Tell me about a production incident under pressure").includes("incident"));
T.state.stories = [{ id: "x1", title: "Sự cố pipeline thanh toán", action: "rollback Kafka consumer", result: "khôi phục trong 20 phút", themes: ["incident"] }, { id: "x2", title: "Thuyết phục PM đổi kiến trúc", action: "đề xuất lakehouse", themes: ["stakeholder", "design"] }];
check("incident question → incident story first", T.storiesForQuestion("Kể về một sự cố dữ liệu nghiêm trọng bạn từng xử lý")[0]?.s.id === "x1");
check("design question → design story", T.storiesForQuestion("Describe a technical decision and the trade-offs")[0]?.s.id === "x2");
check("unrelated question → no forced match", T.storiesForQuestion("What is your salary expectation?").length === 0);
check("hint prompts to write a story when none fit", /Viết câu chuyện/.test(T.storyHint({ type: "behavioral", q: "Kể về một thất bại của bạn" })));
check("no hint on pure technical question", T.storyHint({ type: "sql", q: "Viết query dedupe bằng ROW_NUMBER" }) === "");

// 29. idle cards
const old = Date.now() - 20 * 864e5;
check("applied job untouched 20 days is idle", T.isIdle({ id: "i1", status: "applied", updatedAt: old, createdAt: old, history: [{ status: "applied", at: old }] }));
check("recent stage change keeps it fresh", !T.isIdle({ id: "i2", status: "interview", updatedAt: old, createdAt: old, history: [{ status: "interview", at: Date.now() - 864e5 }] }));
check("offers and closed jobs never idle", !T.isIdle({ id: "i3", status: "offer", updatedAt: old, history: [] }) && !T.isIdle({ id: "i4", status: "rejected", updatedAt: old, history: [] }));
T.state.jobs = [{ id: "i1", status: "applied", updatedAt: old, createdAt: old, history: [{ status: "applied", at: old }] }]; T.state.contacts = [];
check("todo nudges idle jobs", T.buildTodos().some(x => /không cập nhật/.test(x.title)));

// 30. pipeline report
T.state.jobs = [{ id: "p1", status: "interview", title: "DE", company: "A", createdAt: Date.now(), history: [{ status: "applied", at: Date.now() }, { status: "screen", at: Date.now() }, { status: "interview", at: Date.now() }] }, { id: "p2", status: "applied", title: "DE2", company: "B", createdAt: Date.now(), history: [{ status: "applied", at: Date.now() }] }, { id: "p3", status: "rejected", title: "DE3", company: "C", createdAt: Date.now(), history: [{ status: "applied", at: Date.now() }, { status: "rejected", at: Date.now() }] }];
const pr = T.pipelineReport();
check("report funnel counts reached stages", pr.funnel.map(f => f.c).join(",") === "3,3,1,1,0", pr.funnel.map(f => f.c).join(","));
check("report response rate", pr.kpi.respRate === 33 && pr.kpi.active === 2);
T.state.jobs = [];
const pe = T.pipelineReport();
check("empty report is safe", pe.kpi.respRate === null && pe.kpi.total === 0 && Array.isArray(pe.gaps) && pe.salary === null);

// 31. CV version diff
const ld = T.lineDiff(["a", "b", "c"], ["a", "x", "c", "d"]);
check("line diff ops", ld.map(o => o.t + o.s).join(",") === "=a,-b,+x,=c,+d", ld.map(o => o.t + o.s).join(","));
const dA = { id: "A", name: "Base", data: T.normDoc({ name: "N", summary: "Data engineer with Airflow", skills: [{ group: "Tools", items: ["Airflow", "SQL"] }] }) };
const dB = { id: "B", name: "JD", jobId: "j", data: T.normDoc({ name: "N", summary: "Data engineer with Kafka", skills: [{ group: "Tools", items: ["Kafka", "SQL"] }] }) };
const cd = T.cvDiff(dA, dB);
check("diff counts changed lines", cd.add === 2 && cd.del === 2, cd.add + "/" + cd.del);
check("diff skill gains and losses", cd.skAdd.includes("kafka") && cd.skDel.includes("airflow"), JSON.stringify([cd.skAdd, cd.skDel]));
check("identical versions → no changes", T.cvDiff(dA, { ...dA, id: "C" }).add === 0);
T.state.cvdocs = [dA, dB];
check("diff card defaults to base CV and renders", /So sánh phiên bản/.test(T.cvDiffCard(dB)) && /Base/.test(T.cvDiffCard(dB)));
T.state.cvdocs = [dA];
check("no diff card with one version", T.cvDiffCard(dA) === "");
T.state.cvdocs = [];

// 32. shortcuts
check("digit keys map to nav order", T.viewForKey("1") === "overview" && T.viewForKey("5") === "jobs" && T.viewForKey("0") === "data" && T.viewForKey("x") === null);
check("nav names cover every view", T.VIEWS.every(v => T.NAV_NAMES[v]));
T.openShortcuts(); const kb = document.querySelector("#modal").innerHTML;
check("shortcut overlay lists keys", /Phím tắt/.test(kb) && (kb.match(/<kbd>/g) || []).length >= 15);
document.querySelector("#modal").innerHTML = "";

// 33. CSV import
const pc = T.parseCSV('\uFEFFa,b,c\r\n"x, y","say ""hi""",3\n\n"multi\nline",,z');
check("csv parser handles quotes, commas, newlines", pc.length === 3 && pc[1][0] === "x, y" && pc[1][1] === 'say "hi"' && pc[2][0] === "multi\nline", JSON.stringify(pc));
check("csv semicolon delimiter", T.parseCSV("Title;Company\nDE;Acme")[1][1] === "Acme");
check("csv dates", T.csvDate("05/03/2026") === "2026-03-05" && T.csvDate("2026-01-02") === "2026-01-02" && T.csvDate("soon") === "");
T.state.jobs = [{ id: "c1", status: "interview", title: "Senior DE", company: "Acme, Inc", location: "HCM", salary: "40-60 triệu", url: "https://x.y/1", deadline: "2026-12-01", notes: "=SUM(1)", createdAt: Date.now() - 864e5, history: [{ status: "saved", at: Date.now() - 864e5 }, { status: "interview", at: Date.now() }] }];
const csvTxt = T.jobsCSV(T.state.jobs); const back = T.csvToJobs(csvTxt).jobs[0];
check("round-trip export → import keeps fields", back && back.title === "Senior DE" && back.company === "Acme, Inc" && back.status === "interview" && back.deadline === "2026-12-01" && back.url === "https://x.y/1", JSON.stringify(back));
check("formula guard prefix stripped on import", back.notes === "=SUM(1)", back.notes);
check("import skips duplicates", T.importJobsCSV(csvTxt).dup === 1);
const rCsv = T.importJobsCSV("Job Title,Company,Status,Date Applied\nData Engineer,Beta,Applied,2026-11-01\nBI Dev,Gamma,,");
check("english sheet imports with status + history", rCsv.made === 2 && T.state.jobs.find(j => j.company === "Beta")?.status === "applied" && T.state.jobs.find(j => j.company === "Beta").history.length === 2 && T.state.jobs.find(j => j.company === "Gamma")?.status === "saved");
check("csv without title/company columns rejected", !!T.csvToJobs("foo,bar\n1,2").err);
T.state.jobs = [];

// 34. per-record snapshot restore
T.state.jobs = [{ id: "s1", title: "DE", company: "A", status: "applied", updatedAt: 5 }, { id: "s2", title: "DE2", company: "B", status: "saved" }]; T.state.stories = []; T.state.cvdocs = []; T.state.contacts = [];
const snapD = { jobs: [{ id: "s1", title: "DE", company: "A", status: "interview", updatedAt: 1 }, { id: "s2", title: "DE2", company: "B", status: "saved", updatedAt: 9 }, { id: "s3", title: "Gone", company: "C", status: "saved" }], stories: [{ id: "st1", title: "Incident" }] };
const sr = T.snapRecords(snapD);
check("snapshot diff lists deleted first, hides identical (ignores updatedAt)", sr.map(r => r.id + ":" + r.st).join(",") === "s3:gone,st1:gone,s1:diff", sr.map(r => r.id + ":" + r.st).join(","));
check("restore re-inserts a deleted job", T.restoreRecord(snapD, "jobs", "s3") && T.state.jobs[0].id === "s3");
check("restore replaces a changed job in place", T.restoreRecord(snapD, "jobs", "s1") && T.state.jobs.find(j => j.id === "s1").status === "interview" && T.state.jobs.length === 3);
check("restored record is a copy, not the snapshot object", T.state.jobs.find(j => j.id === "s1") !== snapD.jobs[0]);
check("restore unknown id/type is a no-op", !T.restoreRecord(snapD, "jobs", "zz") && !T.restoreRecord(snapD, "nope", "s1"));
check("panel says identical when nothing differs", /giống dữ liệu hiện tại/.test(T.snapPanel({ key: "k", data: { jobs: T.state.jobs.map(j => ({ ...j })) } })));
T.state.jobs = []; T.state.stories = [];

// 35. response rate by tag
const mkJ = (id, jd, resp) => ({ id, title: "Data Engineer", jd, status: resp ? "screen" : "applied", history: [{ status: "applied", at: 1 }, ...(resp ? [{ status: "screen", at: 2 }] : [])] });
T.state.jobs = [mkJ("t1", "Fintech bank payments remote", true), mkJ("t2", "Fintech banking remote", true), mkJ("t3", "Fintech payment wallet remote", true), mkJ("t4", "E-commerce marketplace onsite", false), mkJ("t5", "E-commerce retail onsite", false), mkJ("t6", "E-commerce shop onsite", true)];
const trr = T.tagResponse();
check("tag rows computed with rates", trr.rows.length >= 2 && trr.rows[0][1].n >= 2, JSON.stringify(trr.rows));
check("best tag first", trr.rows[0][1].r / trr.rows[0][1].n === 1, JSON.stringify(trr.rows[0]));
check("insight when gap ≥ 20 points", /Ưu tiên/.test(trr.insight), trr.insight);
check("pattern card shows tag table", /Theo nhãn JD/.test(T.patternCard()));
T.state.jobs = [mkJ("u1", "Fintech", true)];
check("no tag rows below 2 applications", T.tagResponse().rows.length === 0);
T.state.jobs = [];

// 36. behavioral practice bank routes to STAR themes
const BH = T.QB.filter(q => q.c === "Hành vi");
check("behavioral bank has ≥ 8 questions", BH.length >= 8, BH.length);
check("every behavioral question maps to a STAR theme", BH.every(q => T.qThemes(q.q).length > 0), BH.filter(q => !T.qThemes(q.q).length).map(q => q.id).join(","));
check("behavioral ids unique", new Set(T.QB.map(q => q.id)).size === T.QB.length);

// 37. funnel conversion + time to first reply
const D0 = Date.now() - 30 * 864e5, dd = n => D0 + n * 864e5;
const FJ = [{ id: "f1", status: "interview", history: [{ status: "saved", at: dd(0) }, { status: "applied", at: dd(1) }, { status: "screen", at: dd(5) }, { status: "interview", at: dd(9) }] },
  { id: "f2", status: "rejected", history: [{ status: "applied", at: dd(2) }, { status: "rejected", at: dd(12) }] },
  { id: "f3", status: "applied", history: [{ status: "applied", at: dd(3) }] },
  { id: "f4", status: "screen", appliedDate: new Date(dd(4)).toISOString().slice(0, 10), history: [{ status: "screen", at: dd(10) }] }];
const fsr = T.funnelStats(FJ);
check("funnel counts", fsr.st.map(x => x.n).join(",") === "4,4,2,1,0", fsr.st.map(x => x.n).join(","));
check("conversion vs previous stage", fsr.st[2].conv === 50 && fsr.st[3].conv === 50 && fsr.st[1].conv === null && fsr.st[4].conv === 0);
check("first reply days per job", Math.round(T.firstReplyDays(FJ[0])) === 4 && Math.round(T.firstReplyDays(FJ[1])) === 10 && T.firstReplyDays(FJ[2]) === null);
check("median reply days uses appliedDate fallback", fsr.replyN === 3 && fsr.replyMed >= 5 && fsr.replyMed <= 7.5, fsr.replyMed);
check("empty funnel safe", T.funnelStats([]).replyMed === null);

// 38. bring a diff line into the current CV version
const bA = { id: "bA", name: "Base", data: T.normDoc({ experience: [{ company: "Acme", role: "DE", bullets: ["Built **40** Airflow DAGs", "Cut cost 30%"] }], projects: [{ name: "Lake", bullets: ["Iceberg on MinIO"] }], certs: ["AWS DE Associate"] }) };
const bB = { id: "bB", name: "JD", jobId: "j", data: T.normDoc({ experience: [{ company: "ACME", role: "DE", bullets: ["Cut cost 30%"] }], certs: [] }) };
check("bullet sources normalised", T.bulletSources(bA).some(x => x.line === "- Built 40 Airflow DAGs"));
const br = T.bringLine(bB, bA, "- Built 40 Airflow DAGs");
check("bring adds raw bullet (keeps bold) to matching company", br.st === "added" && bB.data.experience[0].bullets.includes("Built **40** Airflow DAGs"));
check("bring keeps original position", bB.data.experience[0].bullets[0] === "Built **40** Airflow DAGs");
check("bring twice → exists", T.bringLine(bB, bA, "- Built 40 Airflow DAGs").st === "exists");
br.undo(); check("bring undo removes it", !bB.data.experience[0].bullets.includes("Built **40** Airflow DAGs"));
check("bring cert", T.bringLine(bB, bA, "- AWS DE Associate").st === "added" && bB.data.certs.length === 1);
check("missing project entry → notarget", T.bringLine(bB, bA, "- Iceberg on MinIO").st === "notarget");
check("non-bullet line → nosource", T.bringLine(bB, bA, "SUMMARY").st === "nosource");

// 39. CSV import preview
T.state.jobs = [{ id: "e1", title: "DE", company: "Acme", status: "saved", history: [] }];
const cvp = T.csvToJobs("Title,Company,Notes\nDE,Acme,x\nBI,Beta,y\n,,z");
check("preview reports mapped columns", cvp.cols.title === "Title" && cvp.cols.company === "Company" && cvp.cols.notes === "Notes");
check("preview counts rows without title/company", cvp.skipped === 1);
check("dup detection for preview", T.csvIsDup(cvp.jobs[0]) && !T.csvIsDup(cvp.jobs[1]));
check("preview modal renders and does not import", T.csvPreview("Title,Company\nDE,Acme\nBI,Beta", "x.csv") && /Nhập 1 việc/.test(document.querySelector("#modal").innerHTML) && T.state.jobs.length === 1);
document.querySelector("#modal").innerHTML = ""; T.state.jobs = [];

// 40. practice answer → STAR draft
const dsq = T.QB.find(q => q.id === "bh1");
const dft = T.draftStoryFromAnswer(dsq, "Ở công ty X, pipeline Kafka bị lag 3 giờ lúc 2h sáng. Tôi chịu trách nhiệm on-call tuần đó. Tôi kiểm tra consumer lag và thấy một partition bị skew. Tôi tăng partition và rebalance consumer group. Kết quả: lag về 0 sau 20 phút, không mất dữ liệu.");
check("draft situation = first sentence", /^Ở công ty X/.test(dft.situation));
check("draft task from responsibility sentence", /on-call/.test(dft.task));
check("draft action keeps middle steps", /consumer lag/.test(dft.action) && /rebalance/.test(dft.action));
check("draft result has numbers", /20 phút/.test(dft.result) && !/rebalance/.test(dft.result));
check("draft title drops the Result: prefix", dft.title.startsWith("Lag về 0"), dft.title);
check("draft themes from question", dft.themes.includes("incident"));
check("draft empty answer → null", T.draftStoryFromAnswer(dsq, "  ") === null);

// 41. bulk status change
T.state.jobs = [{ id: "b1", status: "saved", history: [{ status: "saved", at: 1 }] }, { id: "b2", status: "applied", appliedDate: "2026-11-01", history: [{ status: "applied", at: 2 }] }, { id: "b3", status: "screen", history: [] }];
const bs = T.bulkSetStatus(["b1", "b2", "zz"], "applied");
check("bulk moves only jobs not already in stage", bs.n === 1 && T.state.jobs[0].status === "applied" && T.state.jobs[0].history.length === 2 && !!T.state.jobs[0].appliedDate);
bs.undo();
check("bulk undo restores status, history, appliedDate", T.state.jobs[0].status === "saved" && T.state.jobs[0].history.length === 1 && T.state.jobs[0].appliedDate === undefined && T.state.jobs[1].appliedDate === "2026-11-01");
check("bulk invalid stage no-op", T.bulkSetStatus(["b1"], "nope").n === 0);
const bs2 = T.bulkSetStatus(["b1", "b2", "b3"], "rejected"); check("bulk reject all", bs2.n === 3 && T.state.jobs.every(j => j.status === "rejected"));
T.state.jobs = [];

// 42. frozen remote docs become mutable
const fz = Object.freeze({ kind: "profile", cvText: "x", updatedAt: Date.now() + 1e6, review: Object.freeze({ score: 5 }) });
T.state.profile = null; T.SYNC.pending.clear?.();
T.applyRemote("profile", fz, false);
check("frozen remote profile is writable after apply", !throws(() => { "use strict"; T.state.profile.review = { score: 7 }; }) && T.state.profile.review.score === 7 && !Object.isFrozen(T.state.profile));
const fj = Object.freeze({ kind: "job", id: "fzj", status: "saved", updatedAt: Date.now() + 1e6, history: Object.freeze([]) });
T.applyRemote("fzj", fj, false); const jj = T.state.jobs.find(j => j.id === "fzj");
check("frozen remote job + nested arrays writable", !!jj && !throws(() => { "use strict"; jj.history.push({ status: "applied" }); jj.status = "applied"; }));
T.state.jobs = []; T.state.profile = null;

// 43. CV vs market
T.state.jobs = []; T.state.profile = null;
check("market fit null without CV", T.marketFit() === null && T.marketFitCard() === "");
T.state.profile = { cvText: "Data engineer SQL Python Airflow Spark AWS", role: "Senior Data Engineer", years: 3, skills: ["sql", "python", "airflow", "spark", "aws"] };
const mf0 = T.marketFit();
check("market fallback: target from role, norm years", mf0.tgt === "Senior" && mf0.req === 4 && mf0.src === "mkt" && mf0.yrsSrc === "norm");
check("market coverage counts owned high-demand skills", mf0.cov > 30 && mf0.cov < 100 && mf0.strong.some(x => x.k === "sql") && mf0.gaps.length > 0);
const jdT = y => `Senior Data Engineer. Requirements: ${y}+ years of experience in data engineering. Strong SQL, Python, Kafka, Spark, dbt and Snowflake. Build streaming pipelines.`;
T.state.jobs = [5, 6, 5].map((y, i) => ({ id: "mk" + i, title: "Senior Data Engineer", status: "saved", jd: jdT(y), history: [] }));
const mf1 = T.marketFit();
check("market uses JD years median + JD demand", mf1.yrsSrc === "jd" && mf1.req === 5 && mf1.src === "jd" && mf1.gaps.some(x => x.k === "kafka"), JSON.stringify({ req: mf1.req, src: mf1.src }));
check("market card renders verdict + years gap", /CV so với thị trường/.test(T.marketFitCard()) && /thiếu 2 năm/.test(T.marketFitCard()));
T.state.jobs = []; T.state.profile = null;

console.log(`\n${pass} passed, ${fail} failed`); fails.forEach(f => console.log("  ✕ " + f)); process.exitCode = fail ? 1 : 0;
