// CHURVOX_SIDEBAR_LABEL_RUNTIME_FIX_20260601_V2
// Safe visual-only fix. Does not touch backend, auth, data, forms, payments, or routes.
// Purpose: force old sidebar copy to clean Command Desk labels even if an older component renders it.

const CV_SIDEBAR_LABEL_FIX_VERSION = "20260601-v2";

const cleanLabelsByPath = {
  "/dashboard": "Command Board",
  "/overview": "Command Board",
  "/ai-operator": "AI Operator",
  "/ai-operator/approvals": "AI Operator",
  "/notifications": "Notifications",

  "/jobs": "Jobs",
  "/dispatch": "Dispatch",
  "/dispatch-board": "Dispatch",
  "/clients": "Clients",
  "/quotes": "Quotes",
  "/invoices": "Invoices",
  "/money-desk": "Money Desk",
  "/money": "Money Desk",

  "/team": "Team",
  "/crew-ops": "Crew Ops",
  "/payroll": "Payroll",
  "/reports": "Reports",

  "/onboarding": "Setup",
  "/trade-presets": "Trade Presets",
  "/automation": "Automation",
  "/integrations": "Integrations",
  "/operator-tools": "Operator Tools",
  "/plans": "Plans",
  "/billing-confidence": "Billing",
  "/settings": "Settings",
  "/support": "Support",
  "/contact": "Support",
  "/trust": "Support",
};

const oldTextFixes = {
  "Notification Feed": "Notifications",
  "Dispatch Board": "Dispatch",
  "Client Workbench": "Clients",
  "Quote Press": "Quotes",
  "Invoice Forge": "Invoices",
  "Reports Gauge": "Reports",
  "Automation Engine": "Automation",
  "Integration Bay": "Integrations",
  "Plan Command": "Plans",
  "Control Settings": "Settings",
};

function cvPathFromHref(href) {
  try {
    return new URL(href || "", window.location.origin).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "";
  }
}

function cvTextLooksLikeIcon(txt) {
  return /^[A-Z?$]{1,3}$/.test(String(txt || "").trim());
}

function cvSetLinkLabel(link, label) {
  if (!link || !label) return;

  const spans = Array.from(link.querySelectorAll("span"));
  const textSpans = spans.filter((span) => !cvTextLooksLikeIcon(span.textContent));
  const target = textSpans[textSpans.length - 1] || spans[spans.length - 1];

  if (target) {
    if ((target.textContent || "").trim() !== label) target.textContent = label;
    return;
  }

  const nodes = Array.from(link.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
  const textNode = nodes.find((node) => (node.nodeValue || "").trim().length > 2);
  if (textNode) {
    if ((textNode.nodeValue || "").trim() !== label) textNode.nodeValue = label;
    return;
  }

  if ((link.textContent || "").trim() !== label) link.textContent = label;
}

function cvFixTextNodes(root) {
  if (!root || typeof NodeFilter === "undefined") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    let value = node.nodeValue || "";
    let next = value;
    Object.entries(oldTextFixes).forEach(([oldText, cleanText]) => {
      if (next.includes(oldText)) next = next.split(oldText).join(cleanText);
    });
    if (next !== value) node.nodeValue = next;
  });
}

function cvFixLinks(root) {
  if (!root) return;
  const links = Array.from(root.querySelectorAll("a[href]"));

  links.forEach((link) => {
    const path = cvPathFromHref(link.getAttribute("href"));

    // Approvals is a duplicate alias. Keep route available, but don't show it as a second sidebar item.
    if (path === "/ai-operator/approvals") {
      const maybeSidebar = link.closest("aside, nav, .xcf-sidebar, [data-sidebar]");
      if (maybeSidebar) {
        link.style.display = "none";
        link.setAttribute("aria-hidden", "true");
      }
      return;
    }

    const label = cleanLabelsByPath[path];
    if (label) cvSetLinkLabel(link, label);
  });
}

function cvAddCssGuard() {
  if (document.getElementById("cv-sidebar-label-runtime-fix-style")) return;
  const style = document.createElement("style");
  style.id = "cv-sidebar-label-runtime-fix-style";
  style.textContent = `
    aside a[href='/ai-operator/approvals'],
    nav a[href='/ai-operator/approvals'],
    .xcf-sidebar a[href='/ai-operator/approvals'],
    [data-sidebar] a[href='/ai-operator/approvals']{
      display:none!important;
    }
  `;
  document.head.appendChild(style);
}

function cvFixSidebarLabels() {
  cvAddCssGuard();

  const roots = [
    ...Array.from(document.querySelectorAll("aside")),
    ...Array.from(document.querySelectorAll("nav")),
    ...Array.from(document.querySelectorAll(".xcf-sidebar")),
    ...Array.from(document.querySelectorAll("[data-sidebar]")),
    document.body,
  ].filter(Boolean);

  roots.forEach((root) => {
    cvFixLinks(root);
    cvFixTextNodes(root);
  });

  document.documentElement.dataset.churvoxSidebarLabelFix = CV_SIDEBAR_LABEL_FIX_VERSION;
}

function cvRunSidebarFix() {
  try {
    cvFixSidebarLabels();
  } catch {
    // visual-only patch; never crash app
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.__CHURVOX_SIDEBAR_LABEL_FIX_VERSION__ = CV_SIDEBAR_LABEL_FIX_VERSION;

  window.addEventListener("DOMContentLoaded", cvRunSidebarFix);
  window.addEventListener("load", cvRunSidebarFix);
  window.addEventListener("popstate", cvRunSidebarFix);
  window.addEventListener("hashchange", cvRunSidebarFix);

  [0, 50, 150, 300, 600, 1000, 1600, 2400, 4000].forEach((ms) => setTimeout(cvRunSidebarFix, ms));

  let count = 0;
  const timer = setInterval(() => {
    cvRunSidebarFix();
    count += 1;
    if (count > 180) clearInterval(timer);
  }, 500);

  const observer = new MutationObserver(cvRunSidebarFix);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
