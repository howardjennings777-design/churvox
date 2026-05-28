// CHURVOX_MONEY_DESK_JOB_CONTEXT_PATCH_20260528
// Safe additive patch: when /invoices?job_id=... opens, show linked Work Slip/job context.

const CV_MD_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvMdCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvMdToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function cvMdParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch {
    return "";
  }
}

function cvMdEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cvMdText(...values) {
  return values.find((v) => String(v || "").trim()) || "";
}

async function cvMdFetch(path) {
  const token = cvMdToken();
  const res = await fetch(`${cvMdCleanBase(CV_MD_API_BASE)}${path}`, {
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

async function cvMdAudit(action, targetId, note) {
  try {
    const token = cvMdToken();
    await fetch(`${cvMdCleanBase(CV_MD_API_BASE)}/api/ai/audit-log`, {
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

function cvMdAddStyle() {
  if (document.getElementById("cv-money-desk-job-context-style")) return;
  const style = document.createElement("style");
  style.id = "cv-money-desk-job-context-style";
  style.textContent = `
    .cv-money-desk-job-context{margin:16px;border-radius:26px;padding:18px;background:linear-gradient(135deg,#111827,#0f172a);color:#fffdf7;box-shadow:0 28px 90px rgba(17,24,39,.25);border:1px solid rgba(255,255,255,.14)}.cv-money-desk-job-context p{margin:0 0 8px;color:#bef264;font-size:12px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.cv-money-desk-job-context h3{margin:0;font-size:28px;letter-spacing:-.055em}.cv-money-desk-job-context small{display:block;margin-top:8px;color:rgba(255,253,247,.72);font-weight:750;line-height:1.45}.cv-money-desk-job-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cv-money-desk-job-meta span{border-radius:999px;padding:8px 10px;background:rgba(255,255,255,.10);font-size:12px;font-weight:900}.cv-money-desk-job-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.cv-money-desk-job-actions a,.cv-money-desk-job-actions button{border:0;border-radius:999px;padding:11px 13px;background:#bef264;color:#365314;font-weight:950;text-decoration:none;cursor:pointer}.cv-money-desk-job-actions a:nth-child(2){background:rgba(255,255,255,.12);color:#fffdf7}@media(max-width:760px){.cv-money-desk-job-actions{display:grid}.cv-money-desk-job-actions a,.cv-money-desk-job-actions button{width:100%;text-align:center}}
  `;
  document.head.appendChild(style);
}

function cvMdPanelHtml(job, jobId, note) {
  const title = cvMdText(job?.title, job?.job_name, job?.customer_name, `Job ${jobId}`);
  const client = cvMdText(job?.customer_name, job?.client_name, "Client not shown");
  const status = cvMdText(job?.status, job?.owner_review_status, "Ready");
  const address = cvMdText(job?.address, job?.site_address, job?.region, "Address not shown");
  return `
    <p>Money Desk from Work Slip</p>
    <h3>${cvMdEscape(title)}</h3>
    <small>${cvMdEscape(note || "Create, review or find invoices linked to this completed work.")}</small>
    <div class="cv-money-desk-job-meta"><span>${cvMdEscape(client)}</span><span>${cvMdEscape(status)}</span><span>${cvMdEscape(address)}</span></div>
    <div class="cv-money-desk-job-actions">
      <a href="/invoices/new?job_id=${encodeURIComponent(jobId)}">Create draft invoice</a>
      <a href="/jobs/${encodeURIComponent(jobId)}">Open job</a>
      <button type="button" data-cv-md-copy>Copy job note</button>
    </div>
  `;
}

async function cvMdAddPanel() {
  if (window.location.pathname !== "/invoices") return;
  const jobId = cvMdParam("job_id");
  if (!jobId || document.querySelector(".cv-money-desk-job-context")) return;

  cvMdAddStyle();
  const target = document.querySelector("main") || document.querySelector(".min-h-screen") || document.body;
  const panel = document.createElement("section");
  panel.className = "cv-money-desk-job-context";
  panel.innerHTML = cvMdPanelHtml({}, jobId, "Loading linked job details...");
  target.prepend(panel);

  let job = {};
  let note = `Invoices filtered by job ${jobId}.`;
  try {
    const data = await cvMdFetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    job = data.job || data.item || data.data || data;
    note = cvMdText(job?.invoice_description_draft, job?.description, job?.notes, job?.worker_notes, "Review or create the invoice for this completed work.");
    await cvMdAudit("money_desk_from_work_slip", jobId, "Owner opened Money Desk with linked Work Slip context.");
  } catch (err) {
    note = err?.message || "Linked job could not be loaded, but the Money Desk is still open.";
  }

  panel.innerHTML = cvMdPanelHtml(job, jobId, note);
  panel.querySelector("[data-cv-md-copy]")?.addEventListener("click", () => {
    try { navigator.clipboard.writeText(note || ""); } catch {}
  });
}

function cvMdTick() {
  cvMdAddStyle();
  cvMdAddPanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvMdTick);
  window.addEventListener("load", cvMdTick);
  setInterval(cvMdTick, 1200);
  const observer = new MutationObserver(cvMdTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
