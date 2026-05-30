// CHURVOX_DISABLE_JOBS_NEXT_MOVE_PANEL_RUNTIME_20260531
// Temporarily disabled after crash report. This keeps the app stable while we rebuild the panel safely.
// import "./churvoxJobsNextMovePanel";

// CHURVOX_COMMAND_FLOOR_CONTROL_COPY_PATCH_20260529
// CHURVOX_ROLLBACK_RISKY_COCKPIT_DOM_LOAD_20260529
// Visual/copy-only enhancement for Command Floor. No API/auth/data logic changes.

function cfcpIsCommandFloor() {
  return Boolean(document.querySelector(".xcf-shell.xcf-approval-desk"));
}

function cfcpEnhance() {
  if (!cfcpIsCommandFloor()) return;
  const shell = document.querySelector(".xcf-shell.xcf-approval-desk");
  if (!shell || shell.dataset.cfcpEnhanced === "yes") return;
  shell.dataset.cfcpEnhanced = "yes";
  shell.dataset.commandMode = "business-control-tower";

  const hero = shell.querySelector(".xcf-hero > div:first-child");
  if (hero) {
    const eyebrow = hero.querySelector("p");
    const title = hero.querySelector("h1");
    const copy = hero.querySelector("span");
    if (eyebrow) eyebrow.textContent = "BUSINESS CONTROL TOWER";
    if (title) title.textContent = "Command Floor";
    if (copy) copy.textContent = "Churvox is running the admin lanes: work, money, crew, messages and blockers. You stay in control — review the next decision and approve what moves.";
  }

  const aside = shell.querySelector(".xcf-hero > aside");
  if (aside && !aside.querySelector(".cfcp-control-chip")) {
    const chip = document.createElement("div");
    chip.className = "cfcp-control-chip";
    chip.innerHTML = "<b>AI prepared</b><span>Owner approves</span>";
    aside.prepend(chip);
  }

  const metrics = shell.querySelector(".xcf-metrics");
  if (metrics && !metrics.previousElementSibling?.classList?.contains("cfcp-section-heading")) {
    const heading = document.createElement("section");
    heading.className = "cfcp-section-heading";
    heading.innerHTML = "<small>TODAY'S BUSINESS LANES</small><h2>Churvox has the work sorted. Open the lane, check the slip, approve the move.</h2>";
    metrics.insertAdjacentElement("beforebegin", heading);
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cfcpEnhance);
  window.addEventListener("load", cfcpEnhance);
  setInterval(cfcpEnhance, 900);
  const observer = new MutationObserver(cfcpEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
