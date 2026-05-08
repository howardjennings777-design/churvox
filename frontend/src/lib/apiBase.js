export const API_BASE =
  (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_URL) ||
    process.env.REACT_APP_BACKEND_URL ||
    ""
  ).replace(/\/$/, "");

function churvoxAuthHeaders() {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = window.localStorage?.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function churvoxPost(endpoint) {
  const res = await fetch(`${API_BASE}/api${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: churvoxAuthHeaders(),
    body: "{}",
  });
  return res.ok;
}

async function runJobsAutomationIfNeeded() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/jobs") return;
  const key = "churvox_jobs_auto_last_run";
  const now = Date.now();
  const last = Number(window.sessionStorage?.getItem(key) || 0);
  if (last && now - last < 180000) return;
  window.sessionStorage?.setItem(key, String(now));
  window.dispatchEvent(new CustomEvent("churvox-jobs-auto", { detail: { status: "running" } }));
  const results = await Promise.allSettled([
    churvoxPost("/ai/operator/prepare-today"),
    churvoxPost("/invoices/automation/run"),
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
  window.setTimeout(runJobsAutomationIfNeeded, 1200);
  window.addEventListener("focus", () => window.setTimeout(runJobsAutomationIfNeeded, 600));
}

export default API_BASE;
