// Bug sweep, run in the preview tab via javascript_tool: (await (await fetch('sweep.js')).text()) then eval.
(async () => {
  const res = { errors: [], cards: [], overflow: [], unlabeled: [], slow: [] };
  const origErr = console.error; console.error = (...a) => { res.errors.push(a.map(x => x?.message || String(x)).join(" ").slice(0, 160)); origErr(...a); };
  const W = innerWidth;
  const go = async label => {
    const t0 = performance.now(); try { render(); } catch (e) { res.errors.push(label + ": " + e.message); }
    const dt = performance.now() - t0; if (dt > 60) res.slow.push(label + " " + dt.toFixed(0) + "ms");
    await new Promise(r => setTimeout(r, 15));
    if (document.querySelector("#main").innerHTML.includes("lỗi hiển thị")) res.cards.push(label);
    if (document.documentElement.scrollWidth > W + 1) res.overflow.push(label);
    document.querySelectorAll("#main input:not([type=hidden]):not([type=file]), #main select, #main textarea").forEach(el => { if (!((el.labels && el.labels.length) || el.getAttribute("aria-label"))) res.unlabeled.push(label + ":" + (el.id || el.type)); });
  };
  const sweep = async tag => {
    for (const v of VIEWS) { location.hash = v; await go(tag + "/" + v); }
    for (const t of ["goal", "plan", "week", "network", "offer"]) { state.ui.ctab = t; location.hash = "career"; await go(tag + "/career-" + t); }
    for (const g of ["levels", "skills", "interview", "cv", "search", "method"]) { state.ui.guide = g; location.hash = "guide"; await go(tag + "/guide-" + g); }
    for (const j of state.jobs.slice(0, 4)) for (const t of ["fit", "gap", "cv", "interview", "info"]) { state.ui.tab = t; location.hash = "job-" + j.id; await go(tag + "/job-" + t); }
    state.ui.view = "list"; location.hash = "jobs"; await go(tag + "/jobs-list"); state.ui.view = "board";
  };
  localStorage.clear(); applyData({}, false); await sweep("empty");
  loadSample(); await sweep("sample");
  console.error = origErr;
  for (const k in res) res[k] = [...new Set(res[k])].slice(0, 15);
  return res;
})()
