/*
  CHURVOX SLIP ONLY MODE
  Normal workflow should be:
  list/card -> Review slip -> full screen slip popup -> approve/send/mark action.
  No old Invoice record / Quote record / Work Slip page buttons.
*/

function textOf(el) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function looksLikeRecordButton(el) {
  const text = textOf(el).toLowerCase();
  const href = el?.getAttribute?.("href") || "";

  if (text === "invoice record") return true;
  if (text === "quote record") return true;
  if (text === "job record") return true;

  // Hide direct detail buttons from list cards, but leave back links alone.
  if (/^\/invoices\/[^/]+$/.test(href) && !text.includes("back")) return true;
  if (/^\/quotes\/[^/]+$/.test(href) && !text.includes("back")) return true;

  return false;
}

function restyleSlipModal() {
  const modalTextMarkers = [
    "When approved",
    "When you approve",
    "Details Churvox pulled",
    "Everything Churvox pulled",
    "Approve + send",
    "Approve action",
    "Approve review",
  ];

  const nodes = Array.from(document.querySelectorAll("div, section, article"));
  const modal = nodes.find((node) => {
    const text = textOf(node);
    if (!text || text.length < 80) return false;
    return modalTextMarkers.some((m) => text.includes(m));
  });

  if (!modal) return;

  const fixedParent = modal.closest(".fixed") || modal.closest("[role='dialog']") || modal.parentElement;
  if (fixedParent) {
    fixedParent.style.position = "fixed";
    fixedParent.style.inset = "0";
    fixedParent.style.zIndex = "2147483647";
    fixedParent.style.width = "100vw";
    fixedParent.style.height = "100vh";
    fixedParent.style.maxWidth = "100vw";
    fixedParent.style.maxHeight = "100vh";
    fixedParent.style.padding = "0";
    fixedParent.style.background = "rgba(15,23,42,0.78)";
  }

  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.maxWidth = "100vw";
  modal.style.maxHeight = "100vh";
  modal.style.borderRadius = "0";
  modal.style.overflow = "auto";
}

function applySlipOnlyMode() {
  // Rename open slip everywhere.
  Array.from(document.querySelectorAll("a, button")).forEach((el) => {
    const text = textOf(el);

    if (text === "Open slip") {
      el.textContent = "Review slip";
    }

    if (looksLikeRecordButton(el)) {
      el.remove();
    }
  });

  restyleSlipModal();
}

let scheduled = false;

function scheduleApply() {
  if (scheduled) return;
  scheduled = true;

  window.requestAnimationFrame(() => {
    try {
      applySlipOnlyMode();
    } finally {
      scheduled = false;
    }
  });
}

if (typeof window !== "undefined") {
  scheduleApply();
  window.addEventListener("load", scheduleApply);
  document.addEventListener("click", () => setTimeout(scheduleApply, 80), true);

  setTimeout(scheduleApply, 250);
  setTimeout(scheduleApply, 750);
  setTimeout(scheduleApply, 1500);

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
