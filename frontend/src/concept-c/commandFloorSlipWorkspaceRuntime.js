// CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME_20260527
// Rebuilds the existing Command Floor Work Slip DOM into a clearer approval workspace.
// Keeps existing React button handlers by moving DOM nodes instead of cloning them.

const MARKER = "data-cfa-workspace-ready";
const STYLE_ID = "churvox-work-slip-workspace-style";

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
html:has(.cfa-runtime-slip),body:has(.cfa-runtime-slip),#root:has(.cfa-runtime-slip){height:100%!important;overflow:hidden!important}
.cfa-runtime-slip{position:fixed!important;inset:0!important;z-index:99999!important;width:100vw!important;height:100dvh!important;max-height:100dvh!important;overflow-y:auto!important;overflow-x:hidden!important;display:grid!important;grid-template-columns:280px minmax(0,1fr) 340px!important;grid-template-areas:"header header header" "left main right" "notice notice notice" "actions actions actions"!important;gap:16px!important;align-items:start!important;padding:18px 18px 128px!important;background:#eef4fb!important;color:#07111f!important}
.cfa-runtime-slip>*{position:relative!important;z-index:1!important}.cfa-runtime-header{grid-area:header!important;display:grid!important;grid-template-columns:1fr auto!important;gap:18px!important;align-items:start!important;padding:22px 24px!important;border-radius:34px!important;background:linear-gradient(135deg,#fff,#eff6ff)!important;border:1px solid rgba(37,99,235,.14)!important;box-shadow:0 24px 70px rgba(15,23,42,.10)!important}.cfa-runtime-header p{margin:0 0 8px!important;color:#2563eb!important;font-size:.7rem!important;font-weight:950!important;letter-spacing:.17em!important;text-transform:uppercase!important}.cfa-runtime-header h2{margin:0!important;color:#07111f!important;font-size:clamp(2.3rem,5vw,5rem)!important;line-height:.84!important;letter-spacing:-.09em!important}.cfa-runtime-header span{display:block!important;margin-top:10px!important;color:#475569!important;font-size:1rem!important;line-height:1.42!important;font-weight:820!important}.cfa-runtime-header .xcf-close{position:relative!important;top:auto!important;right:auto!important;min-width:96px!important;height:42px!important;border:0!important;border-radius:999px!important;color:#fff!important;background:#07111f!important;font-weight:950!important;box-shadow:0 14px 34px rgba(15,23,42,.18)!important}
.cfa-runtime-left{grid-area:left!important;display:grid!important;gap:12px!important;position:sticky!important;top:18px!important}.cfa-runtime-main{grid-area:main!important;display:grid!important;gap:14px!important}.cfa-runtime-right{grid-area:right!important;display:grid!important;gap:12px!important;position:sticky!important;top:18px!important}
.cfa-runtime-card,.cfa-runtime-slip dl,.cfa-runtime-slip .xcf-approval-brief,.cfa-runtime-slip .xcf-message-draft,.cfa-runtime-slip .xcf-worker-assign,.cfa-runtime-slip .xcf-photo-evidence,.cfa-runtime-slip .xcf-edit-field,.cfa-runtime-slip .xcf-group-summary,.cfa-runtime-slip .xcf-slip-list{border-radius:28px!important;background:#fff!important;border:1px solid rgba(15,23,42,.08)!important;box-shadow:0 18px 50px rgba(15,23,42,.07)!important;padding:16px!important}.cfa-runtime-card{display:grid!important;gap:8px!important}.cfa-runtime-card small,.cfa-runtime-slip dt,.cfa-runtime-slip small{color:#2563eb!important;font-size:.64rem!important;font-weight:950!important;letter-spacing:.13em!important;text-transform:uppercase!important}.cfa-runtime-card strong,.cfa-runtime-card b,.cfa-runtime-slip dd,.cfa-runtime-slip b{margin:0!important;color:#07111f!important;font-weight:950!important;line-height:1.15!important}.cfa-runtime-card p,.cfa-runtime-slip p{margin:0!important;color:#475569!important;line-height:1.42!important;font-size:.86rem!important;font-weight:760!important}
.cfa-runtime-slip dl{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;margin:0!important}.cfa-runtime-slip dl:before{content:"Quick facts";color:#2563eb;font-size:.64rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.cfa-runtime-slip dl div{min-height:64px!important;display:grid!important;align-content:center!important;gap:4px!important;padding:11px!important;border-radius:17px!important;background:#f8fafc!important;border:1px solid rgba(15,23,42,.065)!important}.cfa-runtime-left .cfa-runtime-info:last-child{background:linear-gradient(135deg,#07111f,#14315b)!important}.cfa-runtime-left .cfa-runtime-info:last-child small,.cfa-runtime-left .cfa-runtime-info:last-child strong{color:#fff!important}
.cfa-runtime-slip .xcf-approval-brief{min-height:250px!important;border-left:6px solid #2563eb!important;overflow:hidden!important}.cfa-runtime-slip .xcf-approval-brief p{white-space:pre-line!important;color:#334155!important;font-size:.96rem!important;line-height:1.55!important;font-weight:800!important}.cfa-runtime-slip .xcf-approval-brief div{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important}.cfa-runtime-slip .xcf-approval-brief div span{min-height:68px!important;display:grid!important;align-content:center!important;gap:4px!important;padding:9px!important;border-radius:16px!important;background:#f8fafc!important;border:1px solid rgba(15,23,42,.065)!important}.cfa-runtime-slip .xcf-approval-brief strong{display:block!important;margin-top:12px!important;padding:12px 14px!important;border-radius:18px!important;background:#eef6ff!important;color:#0f172a!important}
.cfa-runtime-slip textarea,.cfa-runtime-slip input,.cfa-runtime-slip select{width:100%!important;border-radius:16px!important;border:1px solid rgba(15,23,42,.12)!important;background:#fff!important;padding:10px 12px!important;box-shadow:none!important}.cfa-runtime-slip textarea{min-height:145px!important;resize:vertical!important;line-height:1.48!important}.cfa-runtime-slip .xcf-slip-list{display:grid!important;gap:8px!important}.cfa-runtime-slip .xcf-slip-row{min-height:68px!important;display:grid!important;grid-template-columns:1fr auto!important;gap:12px!important;align-items:center!important;border:1px solid rgba(15,23,42,.075)!important;border-radius:20px!important;padding:12px 14px!important;background:#fff!important;text-align:left!important}.cfa-runtime-slip .xcf-slip-row b{display:block!important;color:#07111f!important}.cfa-runtime-slip .xcf-slip-row small{display:block!important;color:#64748b!important;font-size:.78rem!important;line-height:1.35!important}.cfa-runtime-slip .xcf-slip-row em{color:#2563eb!important;font-style:normal!important;font-weight:950!important;white-space:nowrap!important}
.cfa-runtime-actions{grid-area:actions!important;position:sticky!important;bottom:max(10px,env(safe-area-inset-bottom))!important;z-index:30!important}.cfa-runtime-actions .xcf-drawer-actions{width:100%!important;display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;gap:9px!important;margin:0!important;padding:12px!important;border-radius:26px!important;background:rgba(255,255,255,.95)!important;border:1px solid rgba(15,23,42,.08)!important;box-shadow:0 -16px 48px rgba(15,23,42,.12)!important}.cfa-runtime-actions button,.cfa-runtime-actions a{min-height:44px!important;border-radius:999px!important;padding:0 16px!important;font-size:.82rem!important;font-weight:950!important}.cfa-runtime-slip .xcf-action-primary{color:#fff!important;background:#2563eb!important}.cfa-runtime-slip .xcf-action-danger{color:#fff!important;background:#dc2626!important}.cfa-runtime-slip .xcf-drawer-notice{grid-area:notice!important;padding:12px 14px!important;border-radius:18px!important;background:rgba(22,163,74,.10)!important;color:#166534!important;font-weight:900!important}
@media(max-width:1180px){.cfa-runtime-slip{grid-template-columns:270px 1fr!important;grid-template-areas:"header header" "left main" "left right" "notice notice" "actions actions"!important}.cfa-runtime-right{position:relative!important;top:auto!important}.cfa-runtime-slip .xcf-approval-brief div{grid-template-columns:repeat(2,1fr)!important}}
@media(max-width:820px){.cfa-runtime-slip{height:100svh!important;grid-template-columns:1fr!important;grid-template-areas:"header" "left" "main" "right" "notice" "actions"!important;padding:12px 10px 125px!important}.cfa-runtime-header{grid-template-columns:1fr!important;border-radius:28px!important}.cfa-runtime-left,.cfa-runtime-right{position:relative!important;top:auto!important}.cfa-runtime-slip .xcf-approval-brief div{grid-template-columns:1fr!important}.cfa-runtime-actions .xcf-drawer-actions{justify-content:stretch!important}.cfa-runtime-actions button,.cfa-runtime-actions a{flex:1 1 auto!important}}`;
  document.head.appendChild(style);
}

function take(drawer, selector) {
  const node = drawer.querySelector(selector);
  if (node && node.parentElement) node.parentElement.removeChild(node);
  return node;
}

function takeAll(drawer, selector) {
  return Array.from(drawer.querySelectorAll(selector)).map((node) => {
    if (node.parentElement) node.parentElement.removeChild(node);
    return node;
  });
}

function make(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function append(parent, ...nodes) {
  nodes.filter(Boolean).forEach((node) => parent.appendChild(node));
}

function labelCard(label, text) {
  const card = make("section", "cfa-runtime-card cfa-runtime-info");
  const small = make("small");
  small.textContent = label;
  const strong = make("strong");
  strong.textContent = text || "Review before approving";
  append(card, small, strong);
  return card;
}

function rebuild(drawer) {
  if (!drawer || drawer.getAttribute(MARKER) === "yes") return;
  injectStyle();
  drawer.setAttribute(MARKER, "yes");
  drawer.classList.add("cfa-runtime-slip");

  const close = take(drawer, ".xcf-close");
  const eyebrow = take(drawer, ":scope > p");
  const title = take(drawer, ":scope > h2");
  const summary = take(drawer, ":scope > span");
  const facts = take(drawer, ":scope > dl");
  const groupSummary = take(drawer, ":scope > .xcf-group-summary");
  const list = take(drawer, ":scope > .xcf-slip-list");
  const brief = take(drawer, ":scope > .xcf-approval-brief");
  const photos = take(drawer, ":scope > .xcf-photo-evidence");
  const message = take(drawer, ":scope > .xcf-message-draft");
  const worker = take(drawer, ":scope > .xcf-worker-assign");
  const actions = take(drawer, ":scope > .xcf-drawer-actions");
  const notice = take(drawer, ":scope > .xcf-drawer-notice");
  const editFields = takeAll(drawer, ":scope > .xcf-edit-field");

  const header = make("header", "cfa-runtime-header");
  const headerText = make("div", "cfa-runtime-header-text");
  append(headerText, eyebrow, title, summary);
  append(header, headerText, close);

  const left = make("aside", "cfa-runtime-left");
  const main = make("main", "cfa-runtime-main");
  const right = make("aside", "cfa-runtime-right");
  const footer = make("footer", "cfa-runtime-actions");

  if (groupSummary || list) {
    drawer.classList.add("cfa-runtime-group");
    append(left, groupSummary || labelCard("Lane", "Open a waiting item to review the detail"));
    append(main, list || labelCard("Waiting items", "Nothing waiting in this lane"));
    append(right, labelCard("How to use this lane", "Open one row, review the Work Slip, then approve, assign, invoice or save the draft."));
  } else {
    append(left, facts || labelCard("Quick facts", "No facts found"), labelCard("Owner check", "Check the details before approving."));
    append(main, brief || labelCard("What you are approving", "No approval brief found"), photos || labelCard("Evidence", "No photos saved"));

    const editPanel = make("section", "cfa-runtime-card cfa-runtime-edit");
    const editHead = make("header");
    const small = make("small");
    small.textContent = "Editable details";
    const bold = make("b");
    bold.textContent = "Adjust before saving";
    append(editHead, small, bold);
    append(editPanel, editHead, ...editFields);
    append(main, editPanel);

    append(right, message || labelCard("Message draft", "No message draft found"), worker || labelCard("Worker assignment", "No worker decision needed"), labelCard("Next step", "Use the approval buttons below. Nothing sends without owner action."));
  }

  append(footer, actions);
  drawer.textContent = "";
  append(drawer, header, left, main, right, notice, footer);
}

function scan() {
  injectStyle();
  document.querySelectorAll(".xcf-drawer").forEach(rebuild);
}

if (typeof window !== "undefined") {
  window.__CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME__ = "CHURVOX_WORK_SLIP_WORKSPACE_RUNTIME_20260527_STYLE_INJECTED";
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", scan);
  window.addEventListener("click", () => setTimeout(scan, 0), true);
  setInterval(scan, 700);
}
