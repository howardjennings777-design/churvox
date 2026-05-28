// CHURVOX_WORK_SLIP_LINKED_ACTIONS_BRIDGE_20260529
// Consolidates the Work Slip linked-action button patches into one safe bridge.
// Approval-first: these actions only open review/workflow pages or save drafts; nothing sends automatically.

const CV_WSL_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvWslCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvWslToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function cvWslJobId() {
  const links = [...document.querySelectorAll(".cfs-actions a[href], .cfs-sheet a[href], a[href]")];
  const jobLink = links.find((a) => String(a.getAttribute("href") || "").startsWith("/jobs/"));
  const href = jobLink?.getAttribute("href") || "";
  return href.split("/").filter(Boolean).pop() || "";
}

async function cvWslAudit(action, targetId, note) {
  try {
    const token = cvWslToken();
    await fetch(`${cvWslCleanBase(CV_WSL_API_BASE)}/api/ai/audit-log`, {
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

function cvWslToast(text) {
  let toast = document.querySelector(".cv-ws-linked-actions-toast");
  if (toast) toast.remove();
  toast = document.createElement("div");
  toast.className = "cv-ws-linked-actions-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function cvWslActionLog(text, tone = "ok") {
  cvWslToast(text);
  let panel = document.querySelector(".cv-work-slip-action-log");
  if (!panel) {
    const actions = document.querySelector(".cfs-actions");
    panel = document.createElement("section");
    panel.className = "cv-work-slip-action-log";
    if (actions) actions.insertAdjacentElement("beforebegin", panel);
  }
  if (panel) {
    panel.dataset.tone = tone;
    panel.innerHTML = `<small>Latest owner action</small><b>${text}</b><p>${tone === "error" ? "Nothing was changed or sent." : "No customer action happens automatically."}</p>`;
  }
}

function cvWslAddStyle() {
  if (document.getElementById("cv-ws-linked-actions-style")) return;
  const style = document.createElement("style");
  style.id = "cv-ws-linked-actions-style";
  style.textContent = `
    .cv-ws-draft-invoice-button{border-radius:999px!important;border:1px solid rgba(17,24,39,.18)!important;background:#111827!important;color:#fffaf0!important;font-weight:950!important}.cv-ws-message-approval-button{border-radius:999px!important;border:1px solid rgba(126,34,206,.22)!important;background:rgba(168,85,247,.14)!important;color:#6b21a8!important;font-weight:950!important}.cv-ws-money-desk-button{border-radius:999px!important;border:1px solid rgba(5,150,105,.22)!important;background:rgba(16,185,129,.14)!important;color:#065f46!important;font-weight:950!important}.cv-ws-linked-actions-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}@media(max-width:760px){.cv-ws-draft-invoice-button,.cv-ws-message-approval-button,.cv-ws-money-desk-button{width:100%}}
  `;
  document.head.appendChild(style);
}

function cvWslMakeButton({ key, className, label, loadingLabel, auditAction, note, href }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset[key] = "yes";
  button.textContent = label;
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const jobId = cvWslJobId();
    if (!jobId) {
      cvWslActionLog(`Open a job Work Slip before using ${label}.`, "error");
      return;
    }
    button.disabled = true;
    button.textContent = loadingLabel;
    await cvWslAudit(auditAction, jobId, note);
    cvWslActionLog(note);
    window.location.href = `${href}${encodeURIComponent(jobId)}`;
  });
  return button;
}

function cvWslEnsureButtons() {
  const actions = document.querySelector(".cfs-actions");
  if (!actions) return;

  if (!actions.querySelector("[data-cv-ws-draft-invoice]")) {
    actions.prepend(cvWslMakeButton({
      key: "cvWsDraftInvoice",
      className: "cv-ws-draft-invoice-button",
      label: "Draft invoice",
      loadingLabel: "Opening invoice...",
      auditAction: "draft_invoice_from_work_slip",
      note: "Opening draft invoice from this Work Slip.",
      href: "/invoices/new?job_id=",
    }));
  }

  const draftButton = actions.querySelector("[data-cv-ws-draft-invoice]");
  if (!actions.querySelector("[data-cv-ws-message-approval]")) {
    const button = cvWslMakeButton({
      key: "cvWsMessageApproval",
      className: "cv-ws-message-approval-button",
      label: "Message approval",
      loadingLabel: "Opening messages...",
      auditAction: "message_approval_from_work_slip",
      note: "Opening message approvals for this Work Slip. Nothing was auto-sent.",
      href: "/message-approvals?job_id=",
    });
    if (draftButton) draftButton.insertAdjacentElement("afterend", button);
    else actions.prepend(button);
  }

  const messageButton = actions.querySelector("[data-cv-ws-message-approval]");
  if (!actions.querySelector("[data-cv-ws-money-desk]")) {
    const button = cvWslMakeButton({
      key: "cvWsMoneyDesk",
      className: "cv-ws-money-desk-button",
      label: "Money Desk",
      loadingLabel: "Opening money...",
      auditAction: "money_desk_from_work_slip_button",
      note: "Opening Money Desk for this Work Slip.",
      href: "/invoices?job_id=",
    });
    if (messageButton) messageButton.insertAdjacentElement("afterend", button);
    else if (draftButton) draftButton.insertAdjacentElement("afterend", button);
    else actions.prepend(button);
  }
}

function cvWslTick() {
  cvWslAddStyle();
  cvWslEnsureButtons();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvWslTick);
  window.addEventListener("load", cvWslTick);
  setInterval(cvWslTick, 900);
  const observer = new MutationObserver(cvWslTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
