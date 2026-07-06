/* Keeps Smart Actions aligned with the Churvox rule:
   Approve, Edit and Park belong in Command only. */

const SMART_ROOT_ID = "churvoxSmartActionsRoot";
const API_BASE = String(process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function keyOf(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function apiUrl(path) {
  const base = API_BASE || window.location.origin;
  return `${base.replace(/\/$/, "")}/api${String(path || "").startsWith("/") ? path : `/${path}`}`;
}

function authHeaders(extra = {}) {
  let token = "";
  try { token = localStorage.getItem("token") || localStorage.getItem("authToken") || ""; } catch {}
  return { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

async function postJson(path, body) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.error || data?.message || `Request failed: ${response.status}`);
  return data;
}

function pageKey() {
  const path = keyOf((window.location.pathname || "").split("/")[1] || "dashboard");
  const hash = keyOf((window.location.hash || "").replace(/^#/, "").split("?")[0]);
  const aliases = { dashboard: "today", smarthub: "today", setupguide: "support", accounting: "xero" };
  return hash || aliases[path] || path || "today";
}

function isCommand() {
  return pageKey() === "command";
}

function notice(root, text, bad = false) {
  const body = root?.querySelector(".cvSmartBody");
  if (!body) return;
  let box = root.querySelector(".cvSmartNotice");
  if (!box) {
    box = document.createElement("div");
    box.className = "cvSmartNotice";
    const tabs = root.querySelector(".cvSmartTabs");
    body.insertBefore(box, tabs || body.firstChild);
  }
  box.className = `cvSmartNotice${bad ? " bad" : ""}`;
  box.textContent = text;
}

function recordFromCard(card) {
  const details = [...card.querySelectorAll(".cvSmartDetails span")].map((item) => clean(item.textContent)).filter(Boolean);
  const paragraphs = [...card.querySelectorAll("p")].map((item) => clean(item.textContent)).filter(Boolean);
  return {
    kind: "smart_action",
    source: "Churvox Smart Actions",
    status: "waiting_owner_review",
    requires_owner_approval: true,
    auto_sent: false,
    accounting_synced: false,
    action_type: clean(card.querySelector("em")?.textContent || "Smart Action"),
    title: clean(card.querySelector("h3")?.textContent || "Smart Action"),
    summary: paragraphs[0] || "Prepared from live records.",
    recommendation: paragraphs[1] || "Review in Command.",
    details,
    created_at: new Date().toISOString(),
  };
}

function safeCopy(value) {
  return clean(value)
    .replace(/Approve and send/gi, "Send to Command for review")
    .replace(/Approve this date and time, then send/gi, "Send this date and time to Command for review")
    .replace(/Owner still approves before sending/gi, "Owner approval stays in Command")
    .replace(/before anything is sent/gi, "before anything goes out");
}

function setTextIfDifferent(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function tightenSmartDock() {
  const root = document.getElementById(SMART_ROOT_ID);
  if (!root) return;
  const command = isCommand();
  root.querySelectorAll(".cvSmartIntro span").forEach((item) => {
    setTextIfDifferent(item, command
      ? "You are in Command, so Approve, Edit and Park can be used here. Nothing is auto-sent."
      : "This page only prepares smart review slips. Approve, Edit and Park stay inside Command.");
  });
  root.querySelectorAll(".cvSmartFoot").forEach((item) => {
    setTextIfDifferent(item, command
      ? "Nothing is auto-sent. Approve runs the prepared action, Edit saves a review slip, Park keeps it in Command for later."
      : "Nothing is auto-sent. Outside Command, suggestions are sent to Command for owner review.");
  });
  root.querySelectorAll(".cvSmartCard p, .cvSmartDetails span").forEach((item) => {
    const next = safeCopy(item.textContent);
    if (next && next !== item.textContent) item.textContent = next;
  });
  root.querySelectorAll(".cvSmartActions").forEach((actions) => {
    const approve = actions.querySelector("[data-smart-approve]");
    const edit = actions.querySelector("[data-smart-edit]");
    const park = actions.querySelector("[data-smart-park]");
    if (command) {
      if (approve && approve.hidden) approve.hidden = false;
      if (edit && edit.hidden) edit.hidden = false;
      if (park && park.hidden) park.hidden = false;
      return;
    }
    if (approve) {
      if (approve.textContent !== "Send to Command") approve.textContent = "Send to Command";
      if (approve.hidden) approve.hidden = false;
      if (approve.getAttribute("aria-label") !== "Send smart action to Command for owner review") approve.setAttribute("aria-label", "Send smart action to Command for owner review");
    }
    if (edit && !edit.hidden) edit.hidden = true;
    if (park && !park.hidden) park.hidden = true;
  });
}

let scheduled = false;
function scheduleTighten(delay = 120) {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    tightenSmartDock();
  }, delay);
}

async function interceptOutsideCommand(event) {
  if (isCommand()) return;
  const button = event.target?.closest?.("[data-smart-approve], [data-smart-edit], [data-smart-park]");
  if (!button) return;
  const card = button.closest(".cvSmartCard");
  if (!card) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const root = document.getElementById(SMART_ROOT_ID);
  const item = recordFromCard(card);
  try {
    notice(root, `Sending ${item.action_type} to Command…`);
    await postJson("/command/execute-approved", { action: "edit", item });
    notice(root, `${item.action_type} sent to Command for owner review.`);
    window.dispatchEvent(new Event("churvox:data-refresh"));
  } catch (error) {
    notice(root, error?.message || "Could not send this Smart Action to Command.", true);
  }
}

function start() {
  if (window.__CHURVOX_SMART_ACTIONS_COMMAND_GUARD__) return;
  window.__CHURVOX_SMART_ACTIONS_COMMAND_GUARD__ = true;
  document.addEventListener("click", interceptOutsideCommand, true);
  const observer = new MutationObserver(() => scheduleTighten(180));
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => scheduleTighten(80));
  window.addEventListener("popstate", () => scheduleTighten(80));
  window.addEventListener("churvox:data-refresh", () => scheduleTighten(160));
  scheduleTighten(600);
  setTimeout(tightenSmartDock, 1200);
}

if (typeof window !== "undefined") start();
