// CHURVOX_WORK_SLIP_DISPATCH_PATCH_20260528
// Safe additive patch: adds Dispatch action to Work Slips and linked job context on /dispatch-board?job_id=...

const CV_WSD_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvWsdCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvWsdToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function cvWsdParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch {
    return "";
  }
}

function cvWsdJobIdFromSlip() {
  const links = [...document.querySelectorAll(".cfs-actions a[href], .cfs-sheet a[href], a[href]")];
  const jobLink = links.find((a) => String(a.getAttribute("href") || "").startsWith("/jobs/"));
  const href = jobLink?.getAttribute("href") || "";
  return href.split("/").filter(Boolean).pop() || "";
}

function cvWsdEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cvWsdText(...values) {
  return values.find((v) => String(v || "").trim()) || "";
}

async function cvWsdFetch(path) {
  const token = cvWsdToken();
  const res = await fetch(`${cvWsdCleanBase(CV_WSD_API_BASE)}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.message || `Request failed ${res.status}`);
  return data;
}

async function cvWsdAudit(action, targetId, note) {
  try {
    const token = cvWsdToken();
    await fetch(`${cvWsdCleanBase(CV_WSD_API_BASE)}/api/ai/audit-log`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, target_type: "job", target_id: targetId, note }),
    });
  } catch {}
}

function cvWsdToast(text) {
  let toast = document.querySelector(".cv-ws-dispatch-toast");
  if (toast) toast.remove();
  toast = document.createElement("div");
  toast.className = "cv-ws-dispatch-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function cvWsdActionLog(text, tone = "ok") {
  cvWsdToast(text);
  let panel = document.querySelector(".cv-work-slip-action-log");
  if (!panel) {
    const actions = document.querySelector(".cfs-actions");
    panel = document.createElement("section");
    panel.className = "cv-work-slip-action-log";
    if (actions) actions.insertAdjacentElement("beforebegin", panel);
  }
  if (panel) {
    panel.dataset.tone = tone;
    panel.innerHTML = `<small>Latest owner action</small><b>${cvWsdEscape(text)}</b><p>${tone === "error" ? "Nothing was changed." : "Opening dispatch with this job highlighted."}</p>`;
  }
}

function cvWsdAddStyle() {
  if (document.getElementById("cv-ws-dispatch-style")) return;
  const style = document.createElement("style");
  style.id = "cv-ws-dispatch-style";
  style.textContent = `
    .cv-ws-dispatch-button{border-radius:999px!important;border:1px solid rgba(29,78,216,.22)!important;background:rgba(59,130,246,.14)!important;color:#1d4ed8!important;font-weight:950!important}.cv-ws-dispatch-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}.cv-dispatch-linked-job-panel{max-width:1440px;margin:0 auto 18px;border-radius:30px;padding:20px;background:linear-gradient(135deg,#111827,#0f172a);color:#fffaf0;box-shadow:0 28px 90px rgba(17,24,39,.22);border:1px solid rgba(255,255,255,.14);display:flex;gap:18px;align-items:center;justify-content:space-between}.cv-dispatch-linked-job-panel small{display:block;margin:0 0 8px;color:#bfdbfe;font-size:12px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.cv-dispatch-linked-job-panel h2{margin:0;font-size:30px;letter-spacing:-.045em}.cv-dispatch-linked-job-panel p{margin:8px 0 0;color:rgba(255,253,247,.72);font-weight:750;line-height:1.45}.cv-dispatch-linked-job-panel a{border-radius:999px;padding:11px 13px;background:#bef264;color:#365314;font-weight:950;text-decoration:none;white-space:nowrap}@media(max-width:760px){.cv-ws-dispatch-button{width:100%}.cv-dispatch-linked-job-panel{display:grid}.cv-dispatch-linked-job-panel a{width:100%;text-align:center}}
  `;
  document.head.appendChild(style);
}

function cvWsdEnsureSlipButton() {
  const actions = document.querySelector(".cfs-actions");
  if (!actions || actions.querySelector("[data-cv-ws-dispatch]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cv-ws-dispatch-button";
  button.dataset.cvWsDispatch = "yes";
  button.textContent = "Dispatch";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const jobId = cvWsdJobIdFromSlip();
    if (!jobId) {
      cvWsdActionLog("Open a job Work Slip before opening Dispatch.", "error");
      return;
    }
    button.disabled = true;
    button.textContent = "Opening dispatch...";
    await cvWsdAudit("dispatch_from_work_slip", jobId, "Owner opened Dispatch Board from Work Slip action bar.");
    cvWsdActionLog("Opening Dispatch Board for this Work Slip.");
    window.location.href = `/dispatch-board?job_id=${encodeURIComponent(jobId)}`;
  });
  const moneyButton = actions.querySelector("[data-cv-ws-money-desk]");
  if (moneyButton) moneyButton.insertAdjacentElement("afterend", button);
  else actions.prepend(button);
}

function cvWsdPanelHtml(job, jobId, note) {
  const title = cvWsdText(job?.title, job?.job_name, job?.customer_name, `Job ${jobId}`);
  const client = cvWsdText(job?.customer_name, job?.client_name, "Client not shown");
  const worker = cvWsdText(job?.assigned_worker_name, job?.worker_name, job?.assigned_to_name, "No worker shown");
  return `
    <div>
      <small>Dispatch from Work Slip</small>
      <h2>${cvWsdEscape(title)}</h2>
      <p>${cvWsdEscape(`${client} · ${worker} · ${note || "Review this job in the dispatch lanes."}`)}</p>
    </div>
    <a href="/jobs/${encodeURIComponent(jobId)}">Open linked job</a>
  `;
}

async function cvWsdEnsureDispatchPanel() {
  if (window.location.pathname !== "/dispatch-board") return;
  const jobId = cvWsdParam("job_id");
  if (!jobId || document.querySelector(".cv-dispatch-linked-job-panel")) return;
  const board = document.querySelector(".cdb-board") || document.querySelector("main") || document.body;
  const panel = document.createElement("section");
  panel.className = "cv-dispatch-linked-job-panel";
  panel.innerHTML = cvWsdPanelHtml({}, jobId, "Loading linked job details...");
  board.insertAdjacentElement(board.className === "cdb-board" ? "beforebegin" : "afterbegin", panel);

  let job = {};
  let note = "Job opened from a Work Slip.";
  try {
    const data = await cvWsdFetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    job = data.job || data.item || data.data || data;
    note = cvWsdText(job?.status, job?.owner_review_status, job?.region, "Job opened from a Work Slip.");
  } catch (err) {
    note = err?.message || "Linked job could not be loaded.";
  }
  panel.innerHTML = cvWsdPanelHtml(job, jobId, note);
}

function cvWsdTick() {
  cvWsdAddStyle();
  cvWsdEnsureSlipButton();
  cvWsdEnsureDispatchPanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvWsdTick);
  window.addEventListener("load", cvWsdTick);
  setInterval(cvWsdTick, 900);
  const observer = new MutationObserver(cvWsdTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
