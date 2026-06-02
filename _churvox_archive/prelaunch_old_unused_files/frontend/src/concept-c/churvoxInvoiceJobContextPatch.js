// CHURVOX_INVOICE_JOB_CONTEXT_PATCH_20260528
// Safe additive patch: when /invoices/new?job_id=... opens from a Work Slip,
// show linked job context and gently prefill obvious blank invoice description fields.

const CV_INV_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvInvCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvInvToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function cvInvParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch {
    return "";
  }
}

function cvInvEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function cvInvFetchJob(jobId) {
  const token = cvInvToken();
  const res = await fetch(`${cvInvCleanBase(CV_INV_API_BASE)}/api/jobs/${encodeURIComponent(jobId)}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.message || "Could not load linked job");
  return data.job || data.item || data.data || data;
}

function cvInvText(...values) {
  return values.find((v) => String(v || "").trim()) || "";
}

function cvInvDescription(job, jobId) {
  return cvInvText(
    job?.invoice_description_draft,
    job?.invoice_description,
    job?.description,
    job?.worker_notes,
    job?.last_worker_note,
    job?.notes,
    job?.title,
    job?.job_name,
    `Work completed for job ${jobId}.`
  );
}

function cvInvSetNativeValue(el, value) {
  if (!el || !value || String(el.value || "").trim()) return false;
  const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function cvInvTryPrefill(description) {
  if (!description) return false;
  const fields = [...document.querySelectorAll("textarea, input[type='text'], input:not([type])")];
  const preferred = fields.find((el) => {
    const haystack = `${el.name || ""} ${el.id || ""} ${el.placeholder || ""} ${el.getAttribute("aria-label") || ""}`.toLowerCase();
    return haystack.includes("description") || haystack.includes("notes") || haystack.includes("line") || haystack.includes("item");
  });
  return cvInvSetNativeValue(preferred || fields.find((el) => el.tagName === "TEXTAREA"), description);
}

function cvInvCopy(text) {
  try {
    navigator.clipboard.writeText(text || "");
  } catch {}
}

function cvInvAddStyle() {
  if (document.getElementById("cv-invoice-job-context-style")) return;
  const style = document.createElement("style");
  style.id = "cv-invoice-job-context-style";
  style.textContent = `
    .cv-invoice-job-context{margin:16px;border-radius:26px;padding:18px;background:linear-gradient(135deg,#111827,#0f172a);color:#fffdf7;box-shadow:0 28px 90px rgba(17,24,39,.25);border:1px solid rgba(255,255,255,.14)}.cv-invoice-job-context p{margin:0 0 8px;color:#bef264;font-size:12px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.cv-invoice-job-context h3{margin:0;font-size:28px;letter-spacing:-.055em}.cv-invoice-job-context small{display:block;margin-top:8px;color:rgba(255,253,247,.72);font-weight:750;line-height:1.45}.cv-invoice-job-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cv-invoice-job-meta span{border-radius:999px;padding:8px 10px;background:rgba(255,255,255,.10);font-size:12px;font-weight:900}.cv-invoice-job-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.cv-invoice-job-actions button,.cv-invoice-job-actions a{border:0;border-radius:999px;padding:11px 13px;background:#bef264;color:#365314;font-weight:950;text-decoration:none;cursor:pointer}.cv-invoice-job-actions a{background:rgba(255,255,255,.12);color:#fffdf7}.cv-invoice-job-status{margin-top:10px;color:#bef264!important}@media(max-width:760px){.cv-invoice-job-actions{display:grid}.cv-invoice-job-actions button,.cv-invoice-job-actions a{width:100%;text-align:center}}
  `;
  document.head.appendChild(style);
}

function cvInvPanelHtml(job, jobId, description, statusText) {
  const title = cvInvText(job?.title, job?.job_name, job?.customer_name, "Linked job");
  const client = cvInvText(job?.customer_name, job?.client_name, "Client not shown");
  const address = cvInvText(job?.address, job?.site_address, job?.region, "Address not shown");
  const status = cvInvText(job?.status, job?.owner_review_status, "Ready");
  return `
    <p>Draft invoice from Work Slip</p>
    <h3>${cvInvEscape(title)}</h3>
    <small>${cvInvEscape(description)}</small>
    <div class="cv-invoice-job-meta"><span>${cvInvEscape(client)}</span><span>${cvInvEscape(address)}</span><span>${cvInvEscape(status)}</span></div>
    <div class="cv-invoice-job-actions">
      <button type="button" data-cv-inv-copy>Copy description</button>
      <button type="button" data-cv-inv-prefill>Prefill blank field</button>
      <a href="/jobs/${encodeURIComponent(jobId)}">Open job</a>
    </div>
    <small class="cv-invoice-job-status">${cvInvEscape(statusText || "Check the invoice before saving or sending.")}</small>
  `;
}

async function cvInvAddPanel() {
  if (window.location.pathname !== "/invoices/new") return;
  const jobId = cvInvParam("job_id");
  if (!jobId || document.querySelector(".cv-invoice-job-context")) return;

  cvInvAddStyle();
  const target = document.querySelector("main") || document.querySelector(".min-h-screen") || document.body;
  const panel = document.createElement("section");
  panel.className = "cv-invoice-job-context";
  panel.innerHTML = cvInvPanelHtml({}, jobId, `Invoice is linked to job ${jobId}.`, "Loading linked job details...");
  target.prepend(panel);

  let job = {};
  let description = `Work completed for job ${jobId}.`;
  let statusText = "Linked job loaded. Check the invoice before saving or sending.";
  try {
    job = await cvInvFetchJob(jobId);
    description = cvInvDescription(job, jobId);
    const didPrefill = cvInvTryPrefill(description);
    statusText = didPrefill ? "Invoice description was prefilled because the field was blank." : "Copy or prefill the description if needed.";
  } catch (err) {
    statusText = err?.message || "Linked job could not be loaded, but the invoice is still linked by job_id.";
  }

  panel.innerHTML = cvInvPanelHtml(job, jobId, description, statusText);
  panel.querySelector("[data-cv-inv-copy]")?.addEventListener("click", () => cvInvCopy(description));
  panel.querySelector("[data-cv-inv-prefill]")?.addEventListener("click", () => {
    const ok = cvInvTryPrefill(description);
    panel.querySelector(".cv-invoice-job-status").textContent = ok ? "Blank invoice field prefilled." : "No blank description field found. Copy the wording instead.";
  });
}

function cvInvTick() {
  cvInvAddStyle();
  cvInvAddPanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvInvTick);
  window.addEventListener("load", cvInvTick);
  setInterval(cvInvTick, 1200);
  const observer = new MutationObserver(cvInvTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
