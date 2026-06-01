// CHURVOX_SIDEBAR_LABEL_RUNTIME_FIX_20260601
// Safe visual-only fix. Does not touch backend, auth, data, forms, payments, or routes.

const cleanLabelsByPath = {
  "/dashboard": "Command Board",
  "/overview": "Command Board",
  "/ai-operator": "AI Operator",
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

function cvPathFromLink(link) {
  try {
    return new URL(link.getAttribute("href") || "", window.location.origin).pathname;
  } catch {
    return "";
  }
}

function cvSetLinkLabel(link, label) {
  if (!link || !label) return;

  const spans = Array.from(link.querySelectorAll("span"));
  const labelSpan =
    spans.find((span) => {
      const txt = (span.textContent || "").trim();
      return txt.length > 3 && !/^[A-Z?$]{1,3}$/.test(txt);
    }) || spans[spans.length - 1];

  if (labelSpan && (labelSpan.textContent || "").trim() !== label) {
    labelSpan.textContent = label;
    return;
  }

  if (!spans.length && (link.textContent || "").trim() !== label) {
    link.textContent = label;
  }
}

function cvFixSidebarLabels() {
  const sidebars = Array.from(document.querySelectorAll("aside, .xcf-sidebar, [data-sidebar], nav"));

  sidebars.forEach((sidebar) => {
    Array.from(sidebar.querySelectorAll("a[href]")).forEach((link) => {
      const path = cvPathFromLink(link);

      // Approvals is just a duplicate alias of AI Operator now.
      if (path === "/ai-operator/approvals") {
        link.style.display = "none";
        link.setAttribute("aria-hidden", "true");
        return;
      }

      const label = cleanLabelsByPath[path];
      if (label) cvSetLinkLabel(link, label);
    });

    const walker = document.createTreeWalker(sidebar, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const clean = oldTextFixes[(node.nodeValue || "").trim()];
      if (clean) node.nodeValue = clean;
    });
  });
}

function cvRunSidebarFix() {
  try {
    cvFixSidebarLabels();
  } catch {
    // visual-only patch; never crash app
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvRunSidebarFix);
  window.addEventListener("load", cvRunSidebarFix);
  window.addEventListener("popstate", cvRunSidebarFix);

  setTimeout(cvRunSidebarFix, 50);
  setTimeout(cvRunSidebarFix, 300);
  setTimeout(cvRunSidebarFix, 1000);

  setInterval(cvRunSidebarFix, 1200);

  const observer = new MutationObserver(cvRunSidebarFix);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}
