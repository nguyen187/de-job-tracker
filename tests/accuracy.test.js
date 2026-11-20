// Accuracy tests for the local (non-AI) engine: skill detection, years, must/nice, scoring.
// Run: node accuracy.test.js  (extracts the app script from de-job-tracker.html with a stub DOM)
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/../de-job-tracker.html", "utf8");
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const el = () => ({ innerHTML: "", textContent: "", hidden: false, value: "", style: {}, scrollIntoView() {}, focus() {}, setSelectionRange() {}, querySelector() { return null; }, addEventListener() {} });
const els = {};
global.document = { querySelector: s => els[s] || (els[s] = el()), querySelectorAll: () => [], addEventListener() {}, styleSheets: [], body: { classList: { contains: () => false, toggle() {}, add() {} } } };
global.window = global; global.addEventListener = () => {}; global.scrollTo = () => {}; global.scrollY = 0;
global.location = { hash: "" }; global.localStorage = { getItem: () => null, setItem() {} };
global.indexedDB = undefined;
eval(js.replace(/\/\* =+ Boot =+ \*\/[\s\S]*$/, "") + "\nglobal.__app = { jobTags, parseSalary, detectSkills, detectYearsCV, detectYearsJD, localMatch, skillName, parseCVText, SKM, quoteInCV, vAnalysis };");
const A = global.__app;

let pass = 0, fail = 0; const fails = [];
const check = (name, ok, detail) => { if (ok) pass++; else { fail++; fails.push(name + (detail ? " → " + detail : "")); } };
const has = (txt, k) => A.detectSkills(txt).includes(k);

// ---- Skill detection: [text, mustContain[], mustNotContain[]]
const SKILL_CASES = [
  ["Hiểu biết về data, biết đọc tài liệu", [], ["bi"]],
  ["Build Power BI dashboards", ["bi"], []],
  ["Bi-weekly sprint demos", [], ["bi"]],
  ["Wrote glue code between microservices", [], ["glue"]],
  ["AWS (S3, Glue, Redshift, EMR)", ["glue", "aws", "redshift", "objstore"], []],
  ["Built AWS Glue jobs and Glue Data Catalog", ["glue", "aws"], []],
  ["Used Python lambda functions and list comprehensions", ["python"], ["aws"]],
  ["Deployed AWS Lambda for ingestion", ["aws"], []],
  ["Strong PostgreSQL and MySQL skills", ["sql", "postgres"], []],
  ["Experience with NoSQL databases like MongoDB", ["nosql"], ["sql"]],
  ["Golang microservices", ["go"], []],
  ["Let's go to the meeting", [], ["go"]],
  ["We are a fast-growing analytics team", [], ["analytics"]],
  ["Build a semantic layer and metrics definitions for product analytics", ["analytics"], []],
  ["Spark Structured Streaming with Kafka", ["spark", "kafka", "streaming"], []],
  ["Databricks lakehouse on Delta Lake", ["databricks", "spark", "delta", "lakehouse"], []],
  ["dbt models with tests", ["dbt"], []],
  ["CI/CD with GitHub Actions", ["cicd", "git"], []],
  ["Kỹ năng giao tiếp tốt, tiếng Anh IELTS 6.5", ["english", "stakeholder"], []],
  ["Data warehouse design (Kimball star schema, SCD type 2)", ["dwh", "kimball", "scd"], []],
  ["Apache Airflow DAGs on Cloud Composer", ["airflow"], []],
  ["Terraform modules for GCP BigQuery", ["terraform", "gcp", "bigquery"], []],
  ["Đọc thêm tại blog của chúng tôi", [], ["bi", "go", "git"]],
  ["Dockerized services on Kubernetes (EKS)", ["docker", "k8s"], []],
  ["Debezium CDC from MySQL binlog", ["cdc", "sql"], []],
];
for (const [t, yes, no] of SKILL_CASES) {
  const got = A.detectSkills(t);
  yes.forEach(k => check(`skill+ ${k} in "${t}"`, got.includes(k), "got " + got.join(",")));
  no.forEach(k => check(`skill- ${k} not in "${t}"`, !got.includes(k), "got " + got.join(",")));
}

// ---- CV years: education ranges must not count as experience
const CV1 = `NGUYEN VAN B — Data Engineer
EDUCATION
Bach Khoa University, Computer Science (2014 - 2018)
EXPERIENCE
Data Engineer — Company A (2021 - Present)
- Built pipelines
Data Analyst — Company B (2019 - 2021)
- SQL reports
SKILLS
Python, SQL`;
const now = new Date().getFullYear();
check("CV years excludes education", A.detectYearsCV(CV1) === now - 2019, "got " + A.detectYearsCV(CV1));
const CV2 = `Summary: Data engineer with 4 years of experience.\nExperience\nDE at X (2023 - present)`;
check("CV years uses explicit statement", A.detectYearsCV(CV2) === 4, "got " + A.detectYearsCV(CV2));
const CV3 = `Experience\nDE — X (03/2022 - 06/2023)\nDE — Y (2024 - now)\nEducation\nUniversity (2010 - 2014)`;
check("CV years merges gaps (2022-2023 + 2024-now)", A.detectYearsCV(CV3) === (now - 2024) + 1 || A.detectYearsCV(CV3) === (now - 2024) + 2, "got " + A.detectYearsCV(CV3));

// ---- JD years
const JDY = [
  ["Company founded 20 years ago. Requirements: 3+ years of experience in data engineering", 3],
  ["Ít nhất 2 năm kinh nghiệm với Python", 2],
  ["5-7 years experience building pipelines", 5],
  ["We have served 10 million users for 8 years. No experience required.", null],
];
for (const [t, exp] of JDY) check(`JD years "${t.slice(0, 40)}…"`, A.detectYearsJD(t) === exp, "got " + A.detectYearsJD(t));

// ---- Must vs nice
const JD1 = `Data Engineer
Requirements:
- Python, SQL, Airflow
- AWS
Nice to have:
- dbt
- Terraform
Benefits:
- Laptop`;
const m1 = A.localMatch({ title: "Data Engineer", jd: JD1 }, { skills: ["python", "sql"], years: 3 });
const mustK = m1.must.map(i => i.k), niceK = m1.nice.map(i => i.k);
["python", "sql", "airflow", "aws"].forEach(k => check(`must ${k}`, mustK.includes(k), "must=" + mustK));
["dbt", "terraform"].forEach(k => check(`nice ${k}`, niceK.includes(k), "nice=" + niceK));
const JD2 = `Requirements: Python, SQL. Experience with Kafka is a plus. Good communication skills.`;
const m2 = A.localMatch({ title: "", jd: JD2 }, { skills: ["python", "sql"], years: 3 });
check("inline 'is a plus' sentence → kafka nice", m2.nice.some(i => i.k === "kafka"), "must=" + m2.must.map(i => i.k) + " nice=" + m2.nice.map(i => i.k));
check("python/sql stay must in single-line JD", m2.must.some(i => i.k === "python") && m2.must.some(i => i.k === "sql"), "must=" + m2.must.map(i => i.k));
check("soft skill 'communication' not a hard must", !m2.must.some(i => i.k === "stakeholder"), "must=" + m2.must.map(i => i.k));
check("score high when all hard musts met", m2.score >= 85, "score " + m2.score);
const m3 = A.localMatch({ title: "", jd: "Requirements: Spark, Kafka, Airflow, AWS, Python, SQL" }, { skills: ["python", "sql"], years: 5 });
check("score low when most musts missing", m3.score < 50, "score " + m3.score);

// ---- Transferable equivalents get partial credit
const e1 = A.localMatch({ id: "e1", title: "", jd: "Requirements: BigQuery, Python" }, { skills: ["redshift", "python"] });
const bq = e1.must.find(i => i.k === "bigquery");
check("BigQuery missing but Redshift ≈ gives partial", bq && !bq.has && bq.eq === "redshift", JSON.stringify(bq));
check("partial credit between 0 and full", e1.score > 60 && e1.score < 100, "score " + e1.score);
const e2 = A.localMatch({ id: "e2", title: "", jd: "Requirements: data modeling, Python" }, { skills: ["sql", "python"] });
check("SQL is NOT an equivalent of data modeling", !e2.must.find(i => i.k === "modeling").eq);
// ---- Evidence quotes
const CVQ = "- Built 35 Airflow DAGs ingesting 1.2 TB/day into BigQuery, cutting latency from T+1 to 2 hours.\n- Migrated Spark jobs from EMR to Glue";
check("exact quote found", A.quoteInCV("Built 35 Airflow DAGs ingesting 1.2 TB/day", CVQ));
check("quote with punctuation/case changes found", A.quoteInCV("built 35 airflow dags, ingesting 1.2 TB/day into bigquery", CVQ));
check("invented quote rejected", !A.quoteInCV("Led a team of 8 engineers building Kafka streaming", CVQ));
check("tiny quote rejected", !A.quoteInCV("Spark", CVQ));
const va = A.vAnalysis({ fitScore: 70, strengths: ["plain string", { point: "Airflow at scale", evidence: "35 Airflow DAGs" }] });
check("strengths normalized to {point, evidence}", va.strengths[0].point === "plain string" && va.strengths[1].evidence === "35 Airflow DAGs");

// ---- Salary parsing (million VND / month, 1 USD = 26,000đ default)
const SAL = [
  ["2.500–3.500 USD", 65, 91], ["35–50 triệu", 35, 50], ["35-50tr", 35, 50], ["Up to $4000", null, 104], ["$3k - $4k", 78, 104],
  ["Từ 30 triệu", 30, null], ["1.2 tỷ/năm", 100, 100], ["25,000,000 - 40,000,000 VND", 25, 40], ["Lương: 1500-2000$ gross", 39, 52],
];
for (const [t, lo, hi] of SAL) { const p = A.parseSalary(t); check(`salary "${t}"`, p && p.lo === lo && p.hi === hi, JSON.stringify(p)); }
check("negotiable recognized", A.parseSalary("Thỏa thuận")?.nego === true && A.parseSalary("Negotiable")?.nego === true);
check("no salary → null", A.parseSalary("") === null);
check("13th-month bonus is not a salary", !(A.parseSalary("Hấp dẫn, nhiều phúc lợi 13th month")?.mid > 0), JSON.stringify(A.parseSalary("Hấp dẫn, nhiều phúc lợi 13th month")));
check("salary with 13th month still parsed", A.parseSalary("40-60 triệu + lương tháng 13")?.hi === 60);

// ---- JD tags
const tg = (title, jd) => A.jobTags({ id: "t" + Math.random(), title, jd }).map(x => x.n);
check("tag fintech + remote", (x => x.includes("Fintech") && x.includes("Remote"))(tg("Data Engineer", "We are a payment company. Fully remote.")));
check("tag bank + onsite", (x => x.includes("Ngân hàng") && x.includes("Onsite"))(tg("DE", "Ngân hàng thương mại, làm việc tại văn phòng Hà Nội")));
check("hybrid wins when both remote and onsite", tg("DE", "2 days onsite, 3 days remote").includes("Hybrid"));
check("level from title", tg("Senior Data Engineer", "x").includes("Senior"));
check("english requirement", tg("DE", "Good command of English is required").includes("Tiếng Anh"));
check("no false 'Game' from 'management'", !tg("DE", "data management and engagement").includes("Game"));
check("telco from VoLTE", tg("DE", "VoLTE data pipelines").includes("Viễn thông"));

console.log(`\n${pass} passed, ${fail} failed`);
fails.forEach(f => console.log("  ✕ " + f));
process.exitCode = fail ? 1 : 0;
