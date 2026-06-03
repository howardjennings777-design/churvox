/*
  Churvox slip-only workflow.
  Removes old record buttons from normal screens and keeps slips full screen.
  No global theme changes.
*/

function cvText(el) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function cvIsRecordAction(el) {
  const text = cvText(el).toLowerCase();
  const href = el?.getAttribute?.("href") || "";

  if (["invoice record", "quote record", "job record"].includes(text)) return true;
  if (/^\/invoices\/[^/]+$/.test(href) && !text.includes("back")) return true;
  if (/^\/quotes\/[^/]+$/.test(href) && !text.includes("back")) return true;

  return false;
}

function cvApplySlipOnly() {
  document.querySelectorAll("a, button").forEach((el) => {
    const text = cvText(el);

    if (text === "Open slip") {
      el.textContent = "Review slip";
    }

    if (cvIsRecordAction(el)) {
      el.remove();
    }
  });

  const dialog = Array.from(document.querySelectorAll("div, section"))
    .find((el) => {
      const t = cvText(el);
      return t.includes("Everything Churvox found is inside this slip") || t.includes("Owner approval");
    });

  if (dialog) {
    const overlay = dialog.closest(".fixed") || dialog.parentElement;
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

let cvSlipScheduled = false;
function cvScheduleSlipOnly() {
  if (cvSlipScheduled) return;
  cvSlipScheduled = true;
  requestAnimationFrame(() => {
    try {
      cvApplySlipOnly();
    } finally {
      cvSlipScheduled = false;
    }
  });
}

if (typeof window !== "undefined") {
  cvScheduleSlipOnly();
  window.addEventListener("load", cvScheduleSlipOnly);
  document.addEventListener("click", () => setTimeout(cvScheduleSlipOnly, 80), true);
  setTimeout(cvScheduleSlipOnly, 300);
  setTimeout(cvScheduleSlipOnly, 900);

  new MutationObserver(cvScheduleSlipOnly).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
