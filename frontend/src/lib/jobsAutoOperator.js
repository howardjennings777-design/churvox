import API_BASE from "./apiBase";

const RUN_KEY = "churvox_jobs_auto_operator_last_run";
const MIN_INTERVAL_MS = 180000;

function headers() {
  const token = window.localStorage?.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function post(endpoint) {
  const res = await fetch(`${API_BASE}/api${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: "{}",
  });
  return res.ok;
}

export async function runJobsAutoOperator() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/jobs") return;

  const now = Date.now();
  const last = Number(window.sessionStorage?.getItem(RUN_KEY) || 0);
  if (last && now - last < MIN_INTERVAL_MS) return;
  window.sessionStorage?.setItem(RUN_KEY, String(now));

  window.dispatchEvent(new CustomEvent("churvox-jobs-auto", { detail: { status: "running" } }));

  const results = await Promise.allSettled([
    post("/ai/operator/prepare-today"),
    post("/invoices/automation/run"),
  ]);

  window.dispatchEvent(new CustomEvent("churvox-jobs-auto", {
    detail: {
      status: "done",
      approvals: results[0].status === "fulfilled" && results[0].value,
      invoices: results[1].status === "fulfilled" && results[1].value,
    },
  }));
}

if (typeof window !== "undefined") {
  window.setTimeout(runJobsAutoOperator, 1000);
  window.addEventListener("focus", () => window.setTimeout(runJobsAutoOperator, 500));
}

export default runJobsAutoOperator;
