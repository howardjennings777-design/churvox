// CHURVOX_WORK_SLIP_DISPATCH_PATCH_20260528
// CHURVOX_DEDUP_DISPATCH_PANEL_KEEP_BUTTON_20260529
// Safe additive patch: keeps the Work Slip Dispatch action button only.
// The linked /dispatch-board?job_id=... panel is now native inside DispatchBoardPage.jsx.

const CV_WSD_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvWsdCleanBase(base) { return String(base || "").replace(/\/+$/, ""); }
function cvWsdToken() { try { return localStorage.getItem("token") || localStorage.getItem("authToken") || ""; } catch { return ""; } }
function cvWsdJobIdFromSlip() { const links = [...document.querySelectorAll(".cfs-actions a[href], .cfs-sheet a[href], a[href]")]; const jobLink = links.find((a) => String(a.getAttribute("href") || "").startsWith("/jobs/")); const href = jobLink?.getAttribute("href") || ""; return href.split("/").filter(Boolean).pop() || ""; }
function cvWsdEscape(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
async function cvWsdAudit(action, targetId, note) { try { const token = cvWsdToken(); await fetch(`${cvWsdCleanBase(CV_WSD_API_BASE)}/api/ai/audit-log`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action, target_type: "job", target_id: targetId, note }) }); } catch {} }
function cvWsdToast(text) { let toast = document.querySelector(".cv-ws-dispatch-toast"); if (toast) toast.remove(); toast = document.createElement("div"); toast.className = "cv-ws-dispatch-toast"; toast.textContent = text; document.body.appendChild(toast); setTimeout(() => toast.remove(), 4200); }
function cvWsdActionLog(text, tone = "ok") { cvWsdToast(text); let panel = document.querySelector(".cv-work-slip-action-log"); if (!panel) { const actions = document.querySelector(".cfs-actions"); panel = document.createElement("section"); panel.className = "cv-work-slip-action-log"; if (actions) actions.insertAdjacentElement("beforebegin", panel); } if (panel) { panel.dataset.tone = tone; panel.innerHTML = `<small>Latest owner action</small><b>${cvWsdEscape(text)}</b><p>${tone === "error" ? "Nothing was changed." : "Opening dispatch with this job highlighted."}</p>`; } }
function cvWsdAddStyle() { if (document.getElementById("cv-ws-dispatch-style")) return; const style = document.createElement("style"); style.id = "cv-ws-dispatch-style"; style.textContent = `.cv-ws-dispatch-button{border-radius:999px!important;border:1px solid rgba(29,78,216,.22)!important;background:rgba(59,130,246,.14)!important;color:#1d4ed8!important;font-weight:950!important}.cv-ws-dispatch-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}@media(max-width:760px){.cv-ws-dispatch-button{width:100%}}`; document.head.appendChild(style); }
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
    if (!jobId) { cvWsdActionLog("Open a job Work Slip before opening Dispatch.", "error"); return; }
    button.disabled = true;
    button.textContent = "Opening dispatch...";
    await cvWsdAudit("dispatch_from_work_slip", jobId, "Owner opened Dispatch from Work Slip action bar.");
    cvWsdActionLog("Opening Dispatch for this Work Slip.");
    window.location.href = `/dispatch-board?job_id=${encodeURIComponent(jobId)}`;
  });
  const moneyButton = actions.querySelector("[data-cv-ws-money-desk]");
  if (moneyButton) moneyButton.insertAdjacentElement("afterend", button);
  else actions.prepend(button);
}
function cvWsdTick() { cvWsdAddStyle(); cvWsdEnsureSlipButton(); }
if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvWsdTick);
  window.addEventListener("load", cvWsdTick);
  setInterval(cvWsdTick, 900);
  const observer = new MutationObserver(cvWsdTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
