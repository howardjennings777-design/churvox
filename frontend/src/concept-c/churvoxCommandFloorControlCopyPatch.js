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

// CHURVOX_COMMAND_FLOOR_BUSINESS_PULSE_SAFE_20260531
// Adds useful dashboard information by reading the existing Command Floor DOM.
// No API calls. No backend changes. No job/invoice/customer mutation.
function cfcpMoneyText(value) {
  const text = String(value || "").trim();
  if (!text) return "$0";
  return text.replace(/\$(\d),(\d{2})(\D|$)/, "$$1,$2$3");
}

function cfcpText(el) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function cfcpFindHeroStat(shell, labelNeedle) {
  const needle = String(labelNeedle || "").toLowerCase();
  const stat = Array.from(shell.querySelectorAll(".xcf10-hero-stats button")).find((button) => cfcpText(button).toLowerCase().includes(needle));
  return {
    value: cfcpText(stat?.querySelector("b")) || "0",
    label: cfcpText(stat?.querySelector("span")) || labelNeedle,
  };
}

function cfcpFindLane(shell, needle) {
  const wanted = String(needle || "").toLowerCase();
  return Array.from(shell.querySelectorAll(".xcf10-lane")).find((lane) => cfcpText(lane).toLowerCase().includes(wanted));
}

function cfcpLaneInfo(shell, needle, fallbackTitle) {
  const lane = cfcpFindLane(shell, needle);
  return {
    count: cfcpText(lane?.querySelector("header strong")) || "0",
    title: cfcpText(lane?.querySelector("h3")) || fallbackTitle,
    next: cfcpText(lane?.querySelector(".xcf10-next-up b")) || "No record waiting",
    note: cfcpText(lane?.querySelector(".xcf10-next-up small")) || "Next up",
  };
}

function cfcpMakePulseItem(title, value, note, href) {
  const link = document.createElement("a");
  link.className = "cfcp-pulse-item";
  link.href = href || "/dashboard";

  const copy = document.createElement("span");
  const small = document.createElement("small");
  small.textContent = title;
  const bold = document.createElement("b");
  bold.textContent = value;
  copy.appendChild(small);
  copy.appendChild(bold);

  const em = document.createElement("em");
  em.textContent = note;

  link.appendChild(copy);
  link.appendChild(em);
  return link;
}

function cfcpMakePulseCard(title, value, tone) {
  const card = document.createElement("article");
  card.className = `cfcp-pulse-card ${tone || ""}`.trim();

  const header = document.createElement("header");
  const small = document.createElement("small");
  small.textContent = title;
  const strong = document.createElement("strong");
  strong.textContent = value;
  header.appendChild(small);
  header.appendChild(strong);

  const list = document.createElement("div");
  list.className = "cfcp-pulse-list";

  card.appendChild(header);
  card.appendChild(list);
  return { card, list };
}

function cfcpLatestMovement(shell) {
  const items = Array.from(shell.querySelectorAll(".xcf10-next-up button, .xcf10-clear")).slice(0, 4).map((row) => {
    const title = cfcpText(row.querySelector("b")) || "Lane clear";
    const note = cfcpText(row.querySelector("small, span")) || "No owner action waiting";
    const value = cfcpText(row.querySelector("em")) || "Open";
    return { title, note, value };
  });
  return items.length ? items : [{ title: "No movement yet", note: "Approvals, worker updates and invoice drafts will appear here.", value: "Waiting" }];
}

function cfcpInstallBusinessPulseStyle() {
  if (document.getElementById("cfcp-business-pulse-style")) return;
  const style = document.createElement("style");
  style.id = "cfcp-business-pulse-style";
  style.textContent = `
    .xcf-command-10 .cfcp-business-pulse {
      width: min(1500px, calc(100vw - 72px)) !important;
      max-width: calc(100vw - 72px) !important;
      margin: 10px auto 0 !important;
      display: grid !important;
      grid-template-columns: 1.05fr .78fr .78fr 1.06fr 1.06fr !important;
      gap: 10px !important;
      align-items: stretch !important;
    }

    .xcf-command-10 .cfcp-pulse-card {
      min-width: 0 !important;
      min-height: 150px !important;
      border: 1px solid rgba(125,189,255,.18) !important;
      border-radius: 20px !important;
      padding: 12px !important;
      overflow: hidden !important;
      background: radial-gradient(circle at 0% 0%, rgba(20,216,244,.12), transparent 36%), rgba(3,13,33,.70) !important;
      box-shadow: 0 18px 58px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.08) !important;
      backdrop-filter: blur(18px) saturate(145%) !important;
    }

    .xcf-command-10 .cfcp-pulse-card.money { background: radial-gradient(circle at 0% 0%, rgba(34,197,94,.17), transparent 36%), rgba(3,13,33,.72) !important; }
    .xcf-command-10 .cfcp-pulse-card.crew { background: radial-gradient(circle at 0% 0%, rgba(20,216,244,.16), transparent 36%), rgba(3,13,33,.72) !important; }
    .xcf-command-10 .cfcp-pulse-card.fix { background: radial-gradient(circle at 0% 0%, rgba(245,158,11,.18), transparent 38%), rgba(3,13,33,.72) !important; }
    .xcf-command-10 .cfcp-pulse-card.ai { background: radial-gradient(circle at 0% 0%, rgba(147,51,234,.18), transparent 38%), rgba(3,13,33,.72) !important; }

    .xcf-command-10 .cfcp-pulse-card header {
      display: flex !important;
      align-items: start !important;
      justify-content: space-between !important;
      gap: 10px !important;
      margin-bottom: 9px !important;
    }

    .xcf-command-10 .cfcp-pulse-card header small {
      color: #77ffc1 !important;
      font-size: 9px !important;
      font-weight: 950 !important;
      letter-spacing: .15em !important;
      text-transform: uppercase !important;
    }

    .xcf-command-10 .cfcp-pulse-card header strong {
      color: #fff !important;
      font-size: clamp(17px, 1.5vw, 25px) !important;
      line-height: 1 !important;
      letter-spacing: -.04em !important;
      white-space: nowrap !important;
    }

    .xcf-command-10 .cfcp-pulse-list {
      display: grid !important;
      gap: 7px !important;
    }

    .xcf-command-10 .cfcp-pulse-item {
      min-width: 0 !important;
      min-height: 38px !important;
      width: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      border: 1px solid rgba(125,189,255,.13) !important;
      border-radius: 13px !important;
      padding: 8px !important;
      background: rgba(255,255,255,.055) !important;
      color: #fff !important;
      text-align: left !important;
      text-decoration: none !important;
      cursor: pointer !important;
    }

    .xcf-command-10 .cfcp-pulse-item:hover {
      border-color: rgba(98,232,245,.34) !important;
      background: rgba(20,216,244,.10) !important;
    }

    .xcf-command-10 .cfcp-pulse-item span { min-width: 0 !important; }
    .xcf-command-10 .cfcp-pulse-item small {
      display: block !important;
      color: rgba(248,251,255,.60) !important;
      font-size: 9px !important;
      line-height: 1.12 !important;
      font-weight: 800 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }
    .xcf-command-10 .cfcp-pulse-item b {
      display: block !important;
      margin-top: 2px !important;
      color: #fff !important;
      font-size: 12px !important;
      line-height: 1.05 !important;
      font-weight: 950 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }
    .xcf-command-10 .cfcp-pulse-item em {
      flex: 0 0 auto !important;
      max-width: 88px !important;
      border-radius: 999px !important;
      padding: 5px 7px !important;
      background: rgba(20,216,244,.10) !important;
      color: rgba(248,251,255,.74) !important;
      font-size: 8.5px !important;
      font-style: normal !important;
      font-weight: 900 !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    @media (max-width: 1450px) {
      .xcf-command-10 .cfcp-business-pulse { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    }
    @media (max-width: 980px) {
      .xcf-command-10 .cfcp-business-pulse {
        width: min(100%, calc(100vw - 44px)) !important;
        max-width: calc(100vw - 44px) !important;
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function cfcpAddBusinessPulse() {
  try {
    const shell = document.querySelector(".xcf-command-10");
    if (!shell) return;
    const lanes = shell.querySelector(".xcf10-lanes");
    const snapshot = shell.querySelector(".xcf10-snapshot");
    if (!lanes || !snapshot) return;

    cfcpInstallBusinessPulseStyle();

    let pulse = shell.querySelector(".cfcp-business-pulse");
    if (!pulse) {
      pulse = document.createElement("section");
      pulse.className = "cfcp-business-pulse";
      pulse.setAttribute("aria-label", "Business pulse");
      snapshot.insertAdjacentElement("beforebegin", pulse);
    }

    const actions = cfcpFindHeroStat(shell, "actions prepared");
    const workSlips = cfcpFindHeroStat(shell, "work slips ready");
    const moneyWaiting = cfcpFindHeroStat(shell, "money waiting");
    const crewLive = cfcpFindHeroStat(shell, "crew");
    const approveWork = cfcpLaneInfo(shell, "approve work", "Approve Work");
    const moneyLane = cfcpLaneInfo(shell, "review money", "Review Money");
    const crewLane = cfcpLaneInfo(shell, "assign crew", "Assign Crew");
    const blockers = cfcpLaneInfo(shell, "clear blockers", "Clear Blockers");
    const messages = cfcpLaneInfo(shell, "review drafts", "Customer Updates");
    const movement = cfcpLatestMovement(shell);

    pulse.replaceChildren();

    const money = cfcpMakePulseCard("Money watch", cfcpMoneyText(moneyWaiting.value), "money");
    money.list.appendChild(cfcpMakePulseItem("Ready to invoice", moneyLane.count, moneyLane.next, "/invoices"));
    money.list.appendChild(cfcpMakePulseItem("Drafts waiting", moneyLane.title, "review before send", "/invoices"));
    money.list.appendChild(cfcpMakePulseItem("Money waiting", cfcpMoneyText(moneyWaiting.value), "owner approval", "/invoices"));
    pulse.appendChild(money.card);

    const crew = cfcpMakePulseCard("Crew live", crewLive.value, "crew");
    crew.list.appendChild(cfcpMakePulseItem("Crew / job records", crewLive.value, "live now", "/team"));
    crew.list.appendChild(cfcpMakePulseItem("Need worker", crewLane.count, crewLane.next, "/jobs"));
    crew.list.appendChild(cfcpMakePulseItem("Work Slips ready", workSlips.value, "finished work", "/dashboard"));
    pulse.appendChild(crew.card);

    const fix = cfcpMakePulseCard("Needs fixing", blockers.count, "fix");
    fix.list.appendChild(cfcpMakePulseItem("Missing/admin blockers", blockers.count, blockers.next, "/dashboard"));
    fix.list.appendChild(cfcpMakePulseItem("Customer follow-up", messages.count, messages.next, "/quotes"));
    fix.list.appendChild(cfcpMakePulseItem("Owner queue", actions.value, "decisions waiting", "/dashboard"));
    pulse.appendChild(fix.card);

    const latest = cfcpMakePulseCard("Latest movement", String(movement.length), "latest");
    movement.slice(0, 3).forEach((item) => latest.list.appendChild(cfcpMakePulseItem(item.title, item.value, item.note, "/dashboard")));
    pulse.appendChild(latest.card);

    const ai = cfcpMakePulseCard("AI prepared today", actions.value, "ai");
    ai.list.appendChild(cfcpMakePulseItem("Actions prepared", actions.value, "owner approval", "/dashboard"));
    ai.list.appendChild(cfcpMakePulseItem("Work Slips", workSlips.value, approveWork.next, "/dashboard"));
    ai.list.appendChild(cfcpMakePulseItem("Messages/drafts", messages.count, "nothing sends yet", "/quotes"));
    pulse.appendChild(ai.card);
  } catch (error) {
    if (window && window.console) console.warn("Business Pulse skipped:", error);
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => { cfcpEnhance(); cfcpAddBusinessPulse(); });
  window.addEventListener("load", () => { cfcpEnhance(); cfcpAddBusinessPulse(); });
  setInterval(() => { cfcpEnhance(); cfcpAddBusinessPulse(); }, 1600);
  const observer = new MutationObserver(() => { cfcpEnhance(); cfcpAddBusinessPulse(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
