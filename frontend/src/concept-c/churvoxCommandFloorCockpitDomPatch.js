// CHURVOX_COMMAND_FLOOR_COCKPIT_DOM_PATCH_20260529
// Builds a real cockpit-style Command Floor surface from the existing live data already rendered by React.
// Visual/navigation only. The real Work Slip buttons remain underneath and are triggered from the new cockpit controls.

function cockpitEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cockpitText(el, fallback = "") {
  return String(el?.innerText || el?.textContent || fallback || "").replace(/\s+/g, " ").trim();
}

function splitMetricText(text, fallbackLabel, fallbackValue) {
  const parts = String(text || "").split(/\s+/).filter(Boolean);
  const numberIndex = parts.findIndex((p) => /[$0-9]/.test(p));
  if (numberIndex <= 0) return { label: fallbackLabel, value: fallbackValue, note: "waiting" };
  return {
    label: parts.slice(0, numberIndex).join(" ") || fallbackLabel,
    value: parts[numberIndex] || fallbackValue,
    note: parts.slice(numberIndex + 1).join(" ") || "waiting",
  };
}

function buildLaneData(shell) {
  const fallback = [
    ["Approve Work", "15", "Work Slips", "Open Work Slip", "Check finished work, photos, notes and price before approval."],
    ["Approve Invoices", "13", "Invoices", "Review Invoices", "Review prepared invoices before anything is sent."],
    ["Assign Workers", "25", "Dispatch decisions", "Open Assignments", "Assign crews and resolve conflicts."],
    ["Approve Messages", "20", "Drafts & follow-ups", "Review Messages", "Nothing sends without owner approval."],
    ["Fix Issues", "15", "Blocking items", "Review Issues", "Resolve blockers and admin gaps."],
  ];
  const metrics = [...shell.querySelectorAll(".xcf-metric")];
  const lanes = [...shell.querySelectorAll(".xcf-approval-lane")];
  return fallback.map((base, index) => {
    const metric = splitMetricText(cockpitText(metrics[index]), base[0], base[1]);
    const lane = lanes[index];
    const header = lane?.querySelector("header") || lane;
    const title = cockpitText(header?.querySelector("b"), base[0]) || base[0];
    const desc = cockpitText(lane?.querySelector(".xcf-lane-description"), base[4]) || base[4];
    const rows = [...(lane?.querySelectorAll(".xcf-row") || [])].slice(0, 3).map((row) => {
      const b = cockpitText(row.querySelector("b"), "Prepared item");
      const small = cockpitText(row.querySelector("small"), "Ready for owner review");
      const em = cockpitText(row.querySelector("em"), "review");
      return { b, small, em };
    });
    return {
      title: title || base[0],
      label: metric.label || base[0],
      value: metric.value || base[1],
      note: metric.note || base[2],
      action: base[3],
      desc,
      rows,
      tone: ["teal", "green", "blue", "purple", "orange"][index],
    };
  });
}

function cockpitMarkup(lanes) {
  const total = lanes.reduce((sum, lane) => sum + (Number(String(lane.value).replace(/[^0-9]/g, "")) || 0), 0);
  const next = lanes.find((lane) => (Number(String(lane.value).replace(/[^0-9]/g, "")) || 0) > 0) || lanes[0];
  return `
    <section class="cvx-cockpit-root" data-version="CHURVOX_COMMAND_FLOOR_COCKPIT_DOM_PATCH_20260529">
      <section class="cvx-cockpit-hero">
        <div class="cvx-cockpit-hero-main">
          <p>BUSINESS CONTROL TOWER</p>
          <h1>Command Floor</h1>
          <h2>Churvox is running your business.</h2>
          <span>Work, money, crew, messages and blockers are in motion. You stay in control — review the next decision and approve what moves.</span>
          <div class="cvx-cockpit-chips">
            <b>AI prepared <small>System ready</small></b>
            <b>Owner approves <small>You are in control</small></b>
            <b>${cockpitEscape(total)} <small>Actions prepared</small></b>
          </div>
        </div>
        <aside class="cvx-cockpit-next">
          <small>NEXT DECISION</small>
          <h3>${cockpitEscape(next.title)}</h3>
          <p>${cockpitEscape(next.desc || "Review before approval.")}</p>
          <div class="cvx-cockpit-tags"><span>High impact</span><span>Takes 2 min</span></div>
          <button type="button" data-cockpit-lane="${lanes.indexOf(next)}">Review now</button>
          <em>${cockpitEscape(total)} decisions waiting →</em>
        </aside>
      </section>
      <section class="cvx-cockpit-summary">
        ${lanes.map((lane, index) => `
          <button type="button" class="cvx-cockpit-metric ${cockpitEscape(lane.tone)}" data-cockpit-lane="${index}">
            <i></i><span>${cockpitEscape(lane.title)}</span><b>${cockpitEscape(lane.value)}</b><small>${cockpitEscape(lane.note)}</small>
          </button>`).join("")}
      </section>
      <section class="cvx-cockpit-lanes">
        ${lanes.map((lane, index) => `
          <article class="cvx-cockpit-lane ${cockpitEscape(lane.tone)}">
            <header><small>${cockpitEscape(lane.label)}</small><h3>${cockpitEscape(lane.title)}</h3><strong>${cockpitEscape(lane.value)}</strong></header>
            <p>${cockpitEscape(lane.desc)}</p>
            <button type="button" data-cockpit-lane="${index}">${cockpitEscape(lane.action)} →</button>
            <div class="cvx-cockpit-items">
              ${(lane.rows.length ? lane.rows : [{ b: "Ready for owner review", small: "Open this lane to inspect the Work Slip", em: "review" }]).map((row) => `
                <div><span><b>${cockpitEscape(row.b)}</b><small>${cockpitEscape(row.small)}</small></span><em>${cockpitEscape(row.em)}</em></div>`).join("")}
            </div>
          </article>`).join("")}
      </section>
    </section>`;
}

function cockpitClickOriginal(shell, index) {
  const lanes = [...shell.querySelectorAll(".xcf-approval-lane")];
  const lane = lanes[index];
  const primary = lane?.querySelector(".xcf-lane-primary, button");
  if (primary) primary.click();
}

function cockpitEnhance() {
  const shell = document.querySelector(".xcf-shell.xcf-approval-desk");
  if (!shell) return;

  const existingHero = shell.querySelector(".xcf-approval-hero");
  const existingMetrics = shell.querySelector(".xcf-approval-summary");
  const existingLanes = shell.querySelector(".xcf-approval-lanes");
  if (!existingHero || !existingMetrics || !existingLanes) return;

  let root = shell.querySelector(".cvx-cockpit-root");
  const lanes = buildLaneData(shell);
  const html = cockpitMarkup(lanes);

  if (!root) {
    existingHero.insertAdjacentHTML("beforebegin", html);
    root = shell.querySelector(".cvx-cockpit-root");
    root?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cockpit-lane]");
      if (!button) return;
      const index = Number(button.getAttribute("data-cockpit-lane"));
      cockpitClickOriginal(shell, index);
    });
  }

  shell.classList.add("cvx-cockpit-active");
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cockpitEnhance);
  window.addEventListener("load", cockpitEnhance);
  setInterval(cockpitEnhance, 1200);
  const observer = new MutationObserver(cockpitEnhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
