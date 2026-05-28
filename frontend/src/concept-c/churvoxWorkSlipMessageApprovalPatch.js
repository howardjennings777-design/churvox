// CHURVOX_WORK_SLIP_MESSAGE_APPROVAL_PATCH_20260528
// Safe additive patch: adds a Message approval action to Work Slips without sending anything.

const CV_MSG_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvMsgCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvMsgToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function cvMsgJobId() {
  const links = [...document.querySelectorAll(".cfs-actions a[href], .cfs-sheet a[href], a[href]")];
  const jobLink = links.find((a) => String(a.getAttribute("href") || "").startsWith("/jobs/"));
  const href = jobLink?.getAttribute("href") || "";
  return href.split("/").filter(Boolean).pop() || "";
}

async function cvMsgAudit(action, targetId, note) {
  try {
    const token = cvMsgToken();
    await fetch(`${cvMsgCleanBase(CV_MSG_API_BASE)}/api/ai/audit-log`, {
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

function cvMsgToast(text) {
  let toast = document.querySelector(".cv-ws-message-approval-toast");
  if (toast) toast.remove();
  toast = document.createElement("div");
  toast.className = "cv-ws-message-approval-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function cvMsgActionLog(text, tone = "ok") {
  cvMsgToast(text);
  let panel = document.querySelector(".cv-work-slip-action-log");
  if (!panel) {
    const actions = document.querySelector(".cfs-actions");
    panel = document.createElement("section");
    panel.className = "cv-work-slip-action-log";
    if (actions) actions.insertAdjacentElement("beforebegin", panel);
  }
  if (panel) {
    panel.dataset.tone = tone;
    panel.innerHTML = `<small>Latest owner action</small><b>${text}</b><p>${tone === "error" ? "Nothing was sent or changed." : "No customer message was sent automatically."}</p>`;
  }
}

function cvMsgAddStyle() {
  if (document.getElementById("cv-ws-message-approval-style")) return;
  const style = document.createElement("style");
  style.id = "cv-ws-message-approval-style";
  style.textContent = `
    .cv-ws-message-approval-button{border-radius:999px!important;border:1px solid rgba(126,34,206,.22)!important;background:rgba(168,85,247,.14)!important;color:#6b21a8!important;font-weight:950!important}.cv-ws-message-approval-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}@media(max-width:760px){.cv-ws-message-approval-button{width:100%}}
  `;
  document.head.appendChild(style);
}

function cvMsgEnsureButton() {
  const actions = document.querySelector(".cfs-actions");
  if (!actions || actions.querySelector("[data-cv-ws-message-approval]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cv-ws-message-approval-button";
  button.dataset.cvWsMessageApproval = "yes";
  button.textContent = "Message approval";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const jobId = cvMsgJobId();
    if (!jobId) {
      cvMsgActionLog("Open a job Work Slip before reviewing messages.", "error");
      return;
    }
    button.disabled = true;
    button.textContent = "Opening messages...";
    await cvMsgAudit("message_approval_from_work_slip", jobId, "Owner opened message approval queue from Work Slip. Nothing was auto-sent.");
    cvMsgActionLog("Opening message approvals for this Work Slip.");
    window.location.href = `/message-approvals?job_id=${encodeURIComponent(jobId)}`;
  });
  const draftInvoiceButton = actions.querySelector("[data-cv-ws-draft-invoice]");
  if (draftInvoiceButton) draftInvoiceButton.insertAdjacentElement("afterend", button);
  else actions.prepend(button);
}

function cvMsgTick() {
  cvMsgAddStyle();
  cvMsgEnsureButton();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvMsgTick);
  window.addEventListener("load", cvMsgTick);
  setInterval(cvMsgTick, 900);
  const observer = new MutationObserver(cvMsgTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
