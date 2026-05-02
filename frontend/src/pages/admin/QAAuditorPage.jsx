import React, { useMemo, useState } from "react";
import API_BASE from "../../lib/apiBase";

const TESTS = [
  { id: "launch_smoke", label: "Run launch smoke test", routes: ["/login", "/dashboard", "/clients", "/jobs"] },
  { id: "smart_hub", label: "Run Smart Hub test", routes: ["/dashboard"] },
  { id: "role_permission", label: "Run role permission test", routes: ["/dashboard", "/payroll", "/team"] },
  { id: "mobile_tap", label: "Run mobile tap test", routes: ["/dashboard", "/jobs"] },
  { id: "billing_plans", label: "Run billing/plans test", routes: ["/plans"] },
  { id: "full_wiring", label: "Run full app wiring audit", routes: ["/api/auth/me", "/api/jobs", "/api/clients", "/api/quotes", "/api/invoices", "/api/team/workers", "/api/billing/status"] },
];

const kStore = "qa_audit_runs";

const nowIso = () => new Date().toISOString();

function summarize(run) {
  const blockers = run.failedSteps.slice(0, 5);
  const readiness = run.failed === 0 ? "Passed" : run.failed < 3 ? "Warning" : "Failed";
  const fixOrder = blockers.map((b, i) => `${i + 1}. ${b.area}`);
  return [
    `Overall launch readiness: ${readiness}.`,
    `Top blockers: ${blockers.length ? blockers.map((b) => b.step).join("; ") : "None"}.`,
    `Passed checks: ${run.passed}/${run.totalTests}. Failed checks: ${run.failed}.`,
    `Likely fix areas: ${blockers.length ? blockers.map((b) => b.area).join(", ") : "No blockers"}.`,
    `Recommended next fix order: ${fixOrder.length ? fixOrder.join(" ") : "No fixes required"}.`,
  ].join(" ");
}

async function probe(url, token) {
  try {
    const isApi = url.startsWith("/api/");
    const target = isApi ? `${API_BASE}${url}` : url;
    const res = await fetch(target, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
    return { ok: res.ok, status: res.status, url: target };
  } catch (e) {
    return { ok: false, status: 0, url, error: String(e?.message || e) };
  }
}

export default function QAAuditorPage() {
  const [runs, setRuns] = useState(() => {
    try { return JSON.parse(localStorage.getItem(kStore) || "[]"); } catch { return []; }
  });
  const [active, setActive] = useState("");

  const stats = useMemo(() => Object.fromEntries(TESTS.map((t) => [t.id, runs.find((r) => r.testId === t.id)])), [runs]);

  const runTest = async (test) => {
    setActive(test.id);
    const token = localStorage.getItem("token") || "";
    const failedSteps = [];
    const networkErrors = [];
    const consoleErrors = [];
    let passed = 0;

    for (const route of test.routes) {
      const result = await probe(route, token);
      if (result.ok || (result.status >= 200 && result.status < 400)) {
        passed += 1;
      } else {
        failedSteps.push({ step: `Route check failed: ${route}`, area: route.includes("api") ? "backend/api" : "frontend/route" });
        networkErrors.push({ route, status: result.status, error: result.error || `HTTP ${result.status}` });
      }
    }

    const run = {
      id: `qa_${Date.now()}`,
      testId: test.id,
      created_at: nowIso(),
      environment: process.env.NODE_ENV || "development",
      gitCommitHash: process.env.REACT_APP_GIT_COMMIT || "unknown",
      status: failedSteps.length ? "failed" : "passed",
      totalTests: test.routes.length,
      passed,
      failed: test.routes.length - passed,
      warnings: 0,
      failedSteps,
      consoleErrors,
      networkErrors,
      screenshots: [],
      aiSummary: "",
    };
    run.aiSummary = summarize(run);
    const next = [run, ...runs].slice(0, 30);
    localStorage.setItem(kStore, JSON.stringify(next));
    setRuns(next);
    setActive("");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Internal AI QA Auditor</h1>
      <p className="text-sm text-slate-600">Internal developer/admin testing only. Uses safe non-destructive route/API probes and local QA data.</p>
      <div className="grid md:grid-cols-2 gap-4">
        {TESTS.map((t) => {
          const s = stats[t.id];
          const running = active === t.id;
          return (
            <div key={t.id} className="border rounded-lg p-4 space-y-2 bg-white">
              <button onClick={() => runTest(t)} disabled={running} className="px-3 py-2 bg-slate-900 text-white rounded">
                {running ? "Running..." : t.label}
              </button>
              <div className="text-sm">status: {running ? "running" : s?.status || "idle"}</div>
              <div className="text-sm">last run: {s?.created_at || "never"}</div>
              <div className="text-sm">pass/fail: {s ? `${s.passed}/${s.failed}` : "0/0"}</div>
              <div className="text-xs">failed steps: {s?.failedSteps?.map((x) => x.step).join(" | ") || "none"}</div>
              <div className="text-xs">console errors: {s?.consoleErrors?.length || 0}</div>
              <div className="text-xs">network/API errors: {s?.networkErrors?.length || 0}</div>
              <div className="text-xs">AI summary: {s?.aiSummary || "No report yet"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
