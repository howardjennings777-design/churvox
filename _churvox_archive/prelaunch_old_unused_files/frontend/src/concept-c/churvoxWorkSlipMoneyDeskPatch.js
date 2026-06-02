// CHURVOX_WORK_SLIP_MONEY_DESK_PATCH_20260528
// Safe additive patch: adds Money Desk action to Work Slips without changing invoice logic.

const CV_WSM_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvWsmCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvWsmToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function cvWsmJobId() {
  const links = [...document.querySelectorAll(".cfs-actions a[href], .cfs-sheet a[href], a[href]")];
  const jobLink = links.find((a) => String(a.getAttribute("href") || "").startsWith("/jobs/"));
  const href = jobLink?.getAttribute("href") || "";
  return href.split("/").filter(Boolean).pop() || "";
}

async function cvWsmAudit(action, targetId, note) {
  try {
    const token = cvWsmToken();
    await fetch(`${cvWsmCleanBase(CV_WSM_API_BASE)}/api/ai/audit-log`, {
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

function cvWsmToast(text) {
  let toast = document.querySelector(".cv-ws-money-desk-toast");
  if (toast) toast.remove();
  toast = document.createElement("div");
  toast.className = "cv-ws-money-desk-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function cvWsmActionLog(text, tone = "ok") {
  cvWsmToast(text);
  let panel = document.querySelector(".cv-work-slip-action-log");
  if (!panel) {
    const actions = document.querySelector(".cfs-actions");
    panel = document.createElement("section");
    panel.className = "cv-work-slip-action-log";
    if (actions) actions.insertAdjacentElement("beforebegin", panel);
  }
  if (panel) {
    panel.dataset.tone = tone;
    panel.innerHTML = `<small>Latest owner action</small><b>${text}</b><p>${tone === "error" ? "Nothing was changed." : "Opening the linked money workflow."}</p>`;
  }
}

function cvWsmAddStyle() {
  if (document.getElementById("cv-ws-money-desk-style")) return;
  const style = document.createElement("style");
  style.id = "cv-ws-money-desk-style";
  style.textContent = `
    .cv-ws-money-desk-button{border-radius:999px!important;border:1px solid rgba(5,150,105,.22)!important;background:rgba(16,185,129,.14)!important;color:#065f46!important;font-weight:950!important}.cv-ws-money-desk-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}@media(max-width:760px){.cv-ws-money-desk-button{width:100%}}
  `;
  document.head.appendChild(style);
}

function cvWsmEnsureButton() {
  const actions = document.querySelector(".cfs-actions");
  if (!actions || actions.querySelector("[data-cv-ws-money-desk]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cv-ws-money-desk-button";
  button.dataset.cvWsMoneyDesk = "yes";
  button.textContent = "Money Desk";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const jobId = cvWsmJobId();
    if (!jobId) {
      cvWsmActionLog("Open a job Work Slip before opening Money Desk.", "error");
      return;
    }
    button.disabled = true;
    button.textContent = "Opening money...";
    await cvWsmAudit("money_desk_from_work_slip_button", jobId, "Owner opened Money Desk from Work Slip action bar.");
    cvWsmActionLog("Opening Money Desk for this Work Slip.");
    window.location.href = `/invoices?job_id=${encodeURIComponent(jobId)}`;
  });
  const draftInvoiceButton = actions.querySelector("[data-cv-ws-draft-invoice]");
  const messageButton = actions.querySelector("[data-cv-ws-message-approval]");
  if (messageButton) messageButton.insertAdjacentElement("afterend", button);
  else if (draftInvoiceButton) draftInvoiceButton.insertAdjacentElement("afterend", button);
  else actions.prepend(button);
}

function cvWsmTick() {
  cvWsmAddStyle();
  cvWsmEnsureButton();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvWsmTick);
  window.addEventListener("load", cvWsmTick);
  setInterval(cvWsmTick, 900);
  const observer = new MutationObserver(cvWsmTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
