function cvSlipText(el) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function cvIsBadRecordButton(el) {
  const text = cvSlipText(el).toLowerCase();
  const href = el?.getAttribute?.("href") || "";

  if (["invoice record", "quote record", "job record"].includes(text)) return true;
  if (/^\/invoices\/[^/]+$/.test(href) && !text.includes("back")) return true;
  if (/^\/quotes\/[^/]+$/.test(href) && !text.includes("back")) return true;
  return false;
}

function cvApplySlipOnlyMode() {
  document.querySelectorAll("a, button").forEach((el) => {
    const text = cvSlipText(el);

    if (text === "Open slip" || text === "Open prepared form") {
      el.textContent = "Review slip";
    }

    if (cvIsBadRecordButton(el)) {
      el.remove();
    }
  });

  const maybeSlip = Array.from(document.querySelectorAll("div, section")).find((el) => {
    const t = cvSlipText(el);
    return t.includes("Everything Churvox found") || t.includes("All slip details") || t.includes("Owner approval");
  });

  if (maybeSlip) {
    const overlay = maybeSlip.closest(".fixed") || maybeSlip.parentElement;
    if (overlay) {
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "2147483647";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.padding = "0";
    }
  }
}

let cvScheduled = false;
function cvScheduleSlipOnlyMode() {
  if (cvScheduled) return;
  cvScheduled = true;
  requestAnimationFrame(() => {
    try {
      cvApplySlipOnlyMode();
    } finally {
      cvScheduled = false;
    }
  });
}

if (typeof window !== "undefined") {
  cvScheduleSlipOnlyMode();
  window.addEventListener("load", cvScheduleSlipOnlyMode);
  document.addEventListener("click", () => setTimeout(cvScheduleSlipOnlyMode, 80), true);
  setTimeout(cvScheduleSlipOnlyMode, 300);
  setTimeout(cvScheduleSlipOnlyMode, 900);
  new MutationObserver(cvScheduleSlipOnlyMode).observe(document.documentElement, { childList: true, subtree: true });
}
