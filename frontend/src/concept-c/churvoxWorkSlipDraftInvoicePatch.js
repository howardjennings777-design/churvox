// CHURVOX_WORK_SLIP_DRAFT_INVOICE_PATCH_20260528
// Safe additive patch: adds a Draft invoice action to Work Slips without changing invoice creation logic.

const CV_WS_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvWsCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvWsToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

async function cvWsAudit(action, targetId, note) {
  try {
    const token = cvWsToken();
    await fetch(`${cvWsCleanBase(CV_WS_API_BASE)}/api/ai/audit-log`, {
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

function cvWsJobId() {
  const links = [...document.querySelectorAll(".cfs-actions a[href], .cfs-sheet a[href], a[href]")];
  const jobLink = links.find((a) => String(a.getAttribute("href") || "").startsWith("/jobs/"));
  const href = jobLink?.getAttribute("href") || "";
  return href.split("/").filter(Boolean).pop() || "";
}

function cvWsNotify(text) {
  let toast = document.querySelector(".cv-ws-draft-invoice-toast");
  if (toast) toast.remove();
  toast = document.createElement("div");
  toast.className = "cv-ws-draft-invoice-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function cvWsActionLog(text, tone = "ok") {
  cvWsNotify(text);
  let panel = document.querySelector(".cv-work-slip-action-log");
  if (!panel) {
    const actions = document.querySelector(".cfs-actions");
    panel = document.createElement("section");
    panel.className = "cv-work-slip-action-log";
    if (actions) actions.insertAdjacentElement("beforebegin", panel);
  }
  if (panel) {
    panel.dataset.tone = tone;
    panel.innerHTML = `<small>Latest owner action</small><b>${text}</b><p>${tone === "error" ? "Nothing was changed." : "Logged in the owner review flow."}</p>`;
  }
}

function cvWsAddStyle() {
  if (document.getElementById("cv-ws-draft-invoice-style")) return;
  const style = document.createElement("style");
  style.id = "cv-ws-draft-invoice-style";
  style.textContent = `
    .cv-ws-draft-invoice-button{border-radius:999px!important;border:1px solid rgba(17,24,39,.18)!important;background:#111827!important;color:#fffaf0!important;font-weight:950!important}.cv-ws-draft-invoice-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}@media(max-width:760px){.cv-ws-draft-invoice-button{width:100%}}
  `;
  document.head.appendChild(style);
}

function cvWsEnsureDraftInvoiceButton() {
  const actions = document.querySelector(".cfs-actions");
  if (!actions || actions.querySelector("[data-cv-ws-draft-invoice]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cv-ws-draft-invoice-button";
  button.dataset.cvWsDraftInvoice = "yes";
  button.textContent = "Draft invoice";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const jobId = cvWsJobId();
    if (!jobId) {
      cvWsActionLog("Open a job Work Slip before drafting an invoice.", "error");
      return;
    }
    button.disabled = true;
    button.textContent = "Opening invoice...";
    await cvWsAudit("draft_invoice_from_work_slip", jobId, "Owner opened draft invoice flow from Work Slip.");
    cvWsActionLog("Opening draft invoice from this Work Slip.");
    window.location.href = `/invoices/new?job_id=${encodeURIComponent(jobId)}`;
  });
  actions.prepend(button);
}

function cvWsTick() {
  cvWsAddStyle();
  cvWsEnsureDraftInvoiceButton();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvWsTick);
  window.addEventListener("load", cvWsTick);
  setInterval(cvWsTick, 900);
  const observer = new MutationObserver(cvWsTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
