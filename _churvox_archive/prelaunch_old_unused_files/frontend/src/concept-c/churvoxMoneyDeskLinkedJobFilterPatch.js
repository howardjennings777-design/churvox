// CHURVOX_MONEY_DESK_LINKED_JOB_FILTER_20260529
// Adds a real linked-job invoice filter surface on /invoices?job_id=... without changing the existing invoice workspace.
// Owner can see linked invoices only, create a draft if none exists, and jump back to the job.

const CV_MDF_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvMdfCleanBase(base) { return String(base || "").replace(/\/+$/, ""); }
function cvMdfToken() { try { return localStorage.getItem("token") || localStorage.getItem("authToken") || ""; } catch { return ""; } }
function cvMdfParam(name) { try { return new URLSearchParams(window.location.search).get(name) || ""; } catch { return ""; } }
function cvMdfText(...values) { return values.find((v) => String(v || "").trim()) || ""; }
function cvMdfMoney(value) { const n = Number(String(value || 0).replace(/[^0-9.-]/g, "")); return `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-NZ", { maximumFractionDigits: 2 })}`; }
function cvMdfEscape(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function cvMdfId(row) { return String(row?.id || row?._id || row?.invoice_id || ""); }
function cvMdfInvoiceJobId(row) { return String(row?.job_id || row?.linked_job_id || row?.source_job_id || row?.work_slip_job_id || ""); }

async function cvMdfFetch(path) {
  const token = cvMdfToken();
  const res = await fetch(`${cvMdfCleanBase(CV_MDF_API_BASE)}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.message || `Request failed ${res.status}`);
  return data;
}

function cvMdfList(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function cvMdfAddStyle() {
  if (document.getElementById("cv-money-desk-linked-filter-style")) return;
  const style = document.createElement("style");
  style.id = "cv-money-desk-linked-filter-style";
  style.textContent = `
    .cv-money-desk-linked-filter{max-width:1440px;margin:0 auto 18px;border-radius:30px;padding:20px;background:linear-gradient(135deg,#052e16,#111827);color:#fffaf0;box-shadow:0 28px 90px rgba(17,24,39,.22);border:1px solid rgba(255,255,255,.14)}.cv-money-desk-linked-filter small{display:block;margin:0 0 8px;color:#bef264;font-size:12px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.cv-money-desk-linked-filter h2{margin:0;font-size:clamp(28px,4vw,46px);letter-spacing:-.055em;line-height:.92}.cv-money-desk-linked-filter p{margin:9px 0 0;color:rgba(255,253,247,.74);font-weight:780;line-height:1.45}.cv-money-desk-linked-filter-actions,.cv-money-desk-linked-filter-list{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.cv-money-desk-linked-filter-actions a,.cv-money-desk-linked-filter-list a{border-radius:999px;padding:10px 12px;background:#bef264;color:#365314;font-weight:950;text-decoration:none}.cv-money-desk-linked-filter-actions a:nth-child(n+2){background:rgba(255,255,255,.12);color:#fffaf0}.cv-money-desk-linked-invoice{display:grid!important;gap:3px!important;min-width:220px!important;text-align:left!important}.cv-money-desk-linked-invoice b,.cv-money-desk-linked-invoice em{display:block;font-style:normal}@media(max-width:760px){.cv-money-desk-linked-filter-actions,.cv-money-desk-linked-filter-list{display:grid}.cv-money-desk-linked-filter-actions a,.cv-money-desk-linked-filter-list a{width:100%;text-align:center}}
  `;
  document.head.appendChild(style);
}

function cvMdfPanelHtml(job, jobId, invoices, loadingNote) {
  const title = cvMdfText(job?.title, job?.job_name, job?.customer_name, `Job ${jobId}`);
  const client = cvMdfText(job?.customer_name, job?.client_name, "Client not shown");
  const note = loadingNote || (invoices.length ? `${invoices.length} linked invoice${invoices.length === 1 ? "" : "s"} found for this job.` : "No linked invoice found yet. Create a draft from this approved work.");
  const invoiceLinks = invoices.map((invoice) => {
    const id = cvMdfId(invoice);
    const code = cvMdfText(invoice.invoice_number, id ? `Invoice ${id.slice(-6)}` : "Invoice");
    const value = cvMdfMoney(invoice.total || invoice.amount || invoice.subtotal || invoice.balance_due);
    const status = cvMdfText(invoice.status, "draft");
    return `<a class="cv-money-desk-linked-invoice" href="${id ? `/invoices/${encodeURIComponent(id)}` : "/invoices"}"><b>${cvMdfEscape(code)}</b><em>${cvMdfEscape(status)} · ${cvMdfEscape(value)}</em></a>`;
  }).join("");
  return `
    <small>Money Desk filtered by Work Slip</small>
    <h2>${cvMdfEscape(title)}</h2>
    <p>${cvMdfEscape(client)} · ${cvMdfEscape(note)}</p>
    <div class="cv-money-desk-linked-filter-actions">
      <a href="/invoices/new?job_id=${encodeURIComponent(jobId)}">Create draft invoice</a>
      <a href="/jobs/${encodeURIComponent(jobId)}">Open linked job</a>
      <a href="/dashboard">Back to Work Slip queue</a>
    </div>
    ${invoices.length ? `<div class="cv-money-desk-linked-filter-list">${invoiceLinks}</div>` : ""}
  `;
}

async function cvMdfAddPanel() {
  if (window.location.pathname !== "/invoices") return;
  const jobId = cvMdfParam("job_id");
  if (!jobId || document.querySelector(".cv-money-desk-linked-filter")) return;
  cvMdfAddStyle();
  const target = document.querySelector("main") || document.querySelector(".min-h-screen") || document.body;
  const panel = document.createElement("section");
  panel.className = "cv-money-desk-linked-filter";
  panel.innerHTML = cvMdfPanelHtml({}, jobId, [], "Loading linked invoices...");
  target.prepend(panel);
  try {
    const [jobRes, invoicesRes] = await Promise.allSettled([cvMdfFetch(`/api/jobs/${encodeURIComponent(jobId)}`), cvMdfFetch("/api/invoices")]);
    const jobPayload = jobRes.status === "fulfilled" ? jobRes.value : {};
    const job = jobPayload.job || jobPayload.data || jobPayload.item || jobPayload || {};
    const allInvoices = invoicesRes.status === "fulfilled" ? cvMdfList(invoicesRes.value, "invoices") : [];
    const linkedInvoices = allInvoices.filter((invoice) => cvMdfInvoiceJobId(invoice) === String(jobId) || String(invoice?.id || invoice?._id || "") === String(job?.invoice_id || job?.draft_invoice_id || ""));
    panel.innerHTML = cvMdfPanelHtml(job, jobId, linkedInvoices, "");
  } catch (err) {
    panel.innerHTML = cvMdfPanelHtml({}, jobId, [], err?.message || "Linked invoices could not be loaded.");
  }
}

function cvMdfTick() { cvMdfAddStyle(); cvMdfAddPanel(); }

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvMdfTick);
  window.addEventListener("load", cvMdfTick);
  setInterval(cvMdfTick, 1200);
  const observer = new MutationObserver(cvMdfTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
