// CHURVOX_JOBS_NEXT_MOVE_PANEL_20260531
// Adds a sticky right-side Jobs Command Panel to /jobs.
// Runtime-only UI enhancement: no API, billing, auth, backend, or job mutation logic touched.

const FILTERS = [
  ["all", "All"],
  ["unassigned", "Unassigned"],
  ["completed", "Completed"],
  ["ready_invoice", "Ready invoice"],
  ["missing_price", "Missing price"],
];

function isJobsPage() {
  return String(window.location?.pathname || "").replace(/\/$/, "") === "/jobs";
}

function getJobsMain() {
  return document.querySelector(".xcf-real-page-jobs, main.xcf-workspace.xcf-real-page-jobs");
}

function textOf(el) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function rows() {
  return Array.from(document.querySelectorAll(".xcf-real-page-jobs .xcf-real-list .xcf-row, .xcf-real-page-jobs .xcf-workspace-list .xcf-row"));
}

function rowInfo(row, index = 0) {
  const text = textOf(row);
  const title = textOf(row.querySelector("b")) || `Job ${index + 1}`;
  const meta = textOf(row.querySelector("small")) || text;
  const end = textOf(row.querySelector("em"));
  const lower = text.toLowerCase();
  const hasMoney = /\$\s?\d|\b\d+\.\d{2}\b/.test(text);
  const unassigned = /unassigned|need crew|needs worker|no worker|not assigned/i.test(text);
  const completed = /completed|complete|done|worker finished|ready for owner review|review/i.test(text);
  const assigned = /assigned|in progress|started|worker/i.test(text) && !unassigned;
  const missingPrice = !hasMoney || /missing price|no price|price/i.test(text) && /missing|no\s+price/i.test(text);
  const readyInvoice = completed && hasMoney;
  return { row, index, text, title, meta, end, lower, hasMoney, unassigned, completed, assigned, missingPrice, readyInvoice };
}

function getInfos() {
  return rows().map(rowInfo);
}

function countWhere(infos, key) {
  return infos.filter((info) => info[key]).length;
}

function selectedFromRow(row) {
  if (!row) return null;
  return rowInfo(row, rows().indexOf(row));
}

function pickBest(infos) {
  return infos.find((info) => info.unassigned) || infos.find((info) => info.readyInvoice) || infos.find((info) => info.missingPrice) || infos[0] || null;
}

function makeEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function installStyle() {
  if (document.getElementById("churvox-jobs-next-move-panel-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-jobs-next-move-panel-style";
  style.textContent = `
    .xcf-real-page-jobs {
      position: relative !important;
    }

    @media (min-width: 1120px) {
      .xcf-real-page-jobs .xcf-real-hero,
      .xcf-real-page-jobs .xcf-real-stats,
      .xcf-real-page-jobs .xcf-real-list-head,
      .xcf-real-page-jobs .xcf-real-list,
      .xcf-real-page-jobs .xcf-workspace-list {
        margin-right: min(370px, 30vw) !important;
      }
    }

    .xcf-jobs-next-panel {
      position: fixed;
      right: 18px;
      top: 92px;
      bottom: 86px;
      z-index: 60;
      width: min(342px, 29vw);
      min-width: 300px;
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr) auto;
      gap: 10px;
      border: 1px solid rgba(125,189,255,.22);
      border-radius: 26px;
      padding: 14px;
      background:
        radial-gradient(circle at 12% 0%, rgba(20,216,244,.18), transparent 36%),
        radial-gradient(circle at 92% 18%, rgba(147,51,234,.18), transparent 34%),
        rgba(3,13,33,.88);
      box-shadow: 0 22px 78px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter: blur(20px) saturate(150%);
      color: #f8fbff;
      overflow: hidden;
    }

    .xcf-jobs-next-panel * { box-sizing: border-box; }

    .xcf-jnp-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .xcf-jnp-head small,
    .xcf-jnp-card small,
    .xcf-jnp-selected small {
      display: block;
      color: #77ffc1;
      font-size: 10px;
      line-height: 1;
      font-weight: 950;
      letter-spacing: .13em;
      text-transform: uppercase;
    }

    .xcf-jnp-head h2 {
      margin: 7px 0 0;
      color: #fff;
      font-size: 22px;
      line-height: .94;
      font-weight: 950;
      letter-spacing: -.05em;
    }

    .xcf-jnp-live {
      flex: 0 0 auto;
      border-radius: 999px;
      padding: 7px 9px;
      background: rgba(119,255,193,.12);
      color: #77ffc1;
      font-size: 10px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .xcf-jnp-next {
      border: 1px solid rgba(20,216,244,.18);
      border-radius: 20px;
      padding: 13px;
      background: rgba(255,255,255,.06);
    }

    .xcf-jnp-next b {
      display: block;
      margin-top: 6px;
      color: #fff;
      font-size: 14px;
      line-height: 1.15;
      font-weight: 950;
    }

    .xcf-jnp-next span {
      display: block;
      margin-top: 5px;
      color: rgba(248,251,255,.62);
      font-size: 11px;
      line-height: 1.35;
      font-weight: 750;
    }

    .xcf-jnp-next button,
    .xcf-jnp-selected-actions button {
      width: 100%;
      min-height: 36px;
      margin-top: 11px;
      border: 0;
      border-radius: 13px;
      background: linear-gradient(135deg, #77ffc1, #14d8f4 48%, #245cff);
      color: #021024;
      font-size: 11px;
      font-weight: 950;
      cursor: pointer;
    }

    .xcf-jnp-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .xcf-jnp-card {
      min-height: 76px;
      border: 1px solid rgba(125,189,255,.14);
      border-radius: 18px;
      padding: 11px;
      background: rgba(255,255,255,.055);
    }

    .xcf-jnp-card b {
      display: block;
      margin-top: 8px;
      color: #fff;
      font-size: 25px;
      line-height: .9;
      letter-spacing: -.06em;
      font-weight: 950;
    }

    .xcf-jnp-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .xcf-jnp-filters button {
      min-height: 29px;
      border: 1px solid rgba(125,189,255,.14);
      border-radius: 999px;
      padding: 0 9px;
      color: rgba(248,251,255,.72);
      background: rgba(255,255,255,.055);
      font-size: 10px;
      font-weight: 900;
      cursor: pointer;
    }

    .xcf-jnp-filters button.active {
      color: #021024;
      border-color: transparent;
      background: linear-gradient(135deg, #77ffc1, #14d8f4);
    }

    .xcf-jnp-selected {
      min-height: 0;
      overflow: auto;
      border: 1px solid rgba(125,189,255,.14);
      border-radius: 20px;
      padding: 13px;
      background: rgba(2,8,23,.52);
    }

    .xcf-jnp-selected h3 {
      margin: 7px 0 0;
      color: #fff;
      font-size: 18px;
      line-height: 1.05;
      font-weight: 950;
      letter-spacing: -.035em;
    }

    .xcf-jnp-selected p {
      margin: 8px 0 0;
      color: rgba(248,251,255,.64);
      font-size: 11px;
      line-height: 1.4;
      font-weight: 720;
    }

    .xcf-jnp-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .xcf-jnp-tags span {
      border: 1px solid rgba(125,189,255,.14);
      border-radius: 999px;
      padding: 6px 8px;
      color: rgba(248,251,255,.72);
      background: rgba(255,255,255,.055);
      font-size: 10px;
      font-weight: 850;
    }

    .xcf-jnp-selected-actions {
      display: grid;
      gap: 7px;
      margin-top: 12px;
    }

    .xcf-jnp-selected-actions button.secondary {
      border: 1px solid rgba(125,189,255,.18);
      color: #fff;
      background: rgba(255,255,255,.075);
    }

    .xcf-jnp-footer {
      color: rgba(248,251,255,.48);
      font-size: 10px;
      line-height: 1.35;
      font-weight: 760;
    }

    .xcf-jnp-picked {
      outline: 2px solid rgba(119,255,193,.65) !important;
      box-shadow: 0 0 0 5px rgba(119,255,193,.10) !important;
    }

    @media (max-width: 1119px) {
      .xcf-real-page-jobs .xcf-real-hero,
      .xcf-real-page-jobs .xcf-real-stats,
      .xcf-real-page-jobs .xcf-real-list-head,
      .xcf-real-page-jobs .xcf-real-list,
      .xcf-real-page-jobs .xcf-workspace-list {
        margin-right: 0 !important;
      }

      .xcf-jobs-next-panel {
        position: static;
        width: auto;
        min-width: 0;
        margin: 10px 0 14px;
        max-height: none;
        grid-template-rows: auto;
      }
    }
  `;
  document.head.appendChild(style);
}

function applyFilter(filter) {
  const infos = getInfos();
  infos.forEach((info) => {
    let show = true;
    if (filter === "unassigned") show = info.unassigned;
    if (filter === "completed") show = info.completed;
    if (filter === "ready_invoice") show = info.readyInvoice;
    if (filter === "missing_price") show = info.missingPrice;
    info.row.style.display = show ? "" : "none";
  });
}

function openRow(info) {
  if (!info?.row) return;
  info.row.scrollIntoView({ block: "center", behavior: "smooth" });
  info.row.click();
}

function renderPanel(panel, selected = null, activeFilter = "all") {
  const infos = getInfos();
  const picked = selected || pickBest(infos);
  const open = infos.length;
  const unassigned = countWhere(infos, "unassigned");
  const completed = countWhere(infos, "completed");
  const readyInvoice = countWhere(infos, "readyInvoice");
  const missingPrice = countWhere(infos, "missingPrice");

  panel.innerHTML = "";

  const head = makeEl("div", "xcf-jnp-head");
  const headCopy = makeEl("div");
  headCopy.appendChild(makeEl("small", "", "Job command"));
  headCopy.appendChild(makeEl("h2", "", "Next move"));
  head.appendChild(headCopy);
  head.appendChild(makeEl("span", "xcf-jnp-live", `${open} live`));
  panel.appendChild(head);

  const next = makeEl("section", "xcf-jnp-next");
  next.appendChild(makeEl("small", "", "Churvox recommends"));
  next.appendChild(makeEl("b", "", picked ? picked.title : "No job selected"));
  next.appendChild(makeEl("span", "", picked ? picked.meta : "Create or open a job and Churvox will show the next action here."));
  const nextBtn = makeEl("button", "", picked ? "Open next Work Slip" : "+ Add job");
  nextBtn.addEventListener("click", () => {
    if (picked) openRow(picked);
    else window.location.assign("/jobs/new");
  });
  next.appendChild(nextBtn);
  panel.appendChild(next);

  const grid = makeEl("section", "xcf-jnp-grid");
  [["Open jobs", open], ["Need worker", unassigned], ["Ready invoice", readyInvoice], ["Missing price", missingPrice || Math.max(0, open - readyInvoice)]].forEach(([label, value]) => {
    const card = makeEl("article", "xcf-jnp-card");
    card.appendChild(makeEl("small", "", label));
    card.appendChild(makeEl("b", "", String(value)));
    grid.appendChild(card);
  });
  panel.appendChild(grid);

  const filters = makeEl("div", "xcf-jnp-filters");
  FILTERS.forEach(([key, label]) => {
    const btn = makeEl("button", key === activeFilter ? "active" : "", label);
    btn.type = "button";
    btn.addEventListener("click", () => {
      panel.dataset.filter = key;
      applyFilter(key);
      renderPanel(panel, picked, key);
    });
    filters.appendChild(btn);
  });
  panel.appendChild(filters);

  const selectedBox = makeEl("section", "xcf-jnp-selected");
  selectedBox.appendChild(makeEl("small", "", picked ? "Selected job" : "No job selected"));
  selectedBox.appendChild(makeEl("h3", "", picked ? picked.title : "Tap a job row"));
  selectedBox.appendChild(makeEl("p", "", picked ? picked.meta : "The selected job preview will appear here with the next suggested action."));
  const tags = makeEl("div", "xcf-jnp-tags");
  if (picked) {
    tags.appendChild(makeEl("span", "", picked.unassigned ? "Needs worker" : picked.assigned ? "Assigned" : "Job"));
    tags.appendChild(makeEl("span", "", picked.readyInvoice ? "Ready invoice" : picked.missingPrice ? "Missing price" : "Check details"));
    tags.appendChild(makeEl("span", "", picked.end || "Open"));
  }
  selectedBox.appendChild(tags);

  const actions = makeEl("div", "xcf-jnp-selected-actions");
  const openSlip = makeEl("button", "", "Open Work Slip");
  openSlip.addEventListener("click", () => picked && openRow(picked));
  actions.appendChild(openSlip);
  const invoiceBtn = makeEl("button", "secondary", "Prepare invoice lane");
  invoiceBtn.addEventListener("click", () => window.location.assign("/invoices"));
  actions.appendChild(invoiceBtn);
  const dispatchBtn = makeEl("button", "secondary", "Dispatch board");
  dispatchBtn.addEventListener("click", () => window.location.assign("/dispatch-board"));
  actions.appendChild(dispatchBtn);
  selectedBox.appendChild(actions);
  panel.appendChild(selectedBox);

  panel.appendChild(makeEl("div", "xcf-jnp-footer", "This panel reads the live job rows already loaded on this page. It does not change a job until you open the Work Slip or use the real page actions."));
}

function ensurePanel() {
  if (!isJobsPage()) return;
  const main = getJobsMain();
  if (!main) return;
  installStyle();

  let panel = main.querySelector(".xcf-jobs-next-panel");
  if (!panel) {
    panel = document.createElement("aside");
    panel.className = "xcf-jobs-next-panel";
    panel.setAttribute("aria-label", "Jobs next move panel");
    const listHead = main.querySelector(".xcf-real-list-head");
    if (window.matchMedia("(max-width: 1119px)").matches && listHead) {
      listHead.insertAdjacentElement("afterend", panel);
    } else {
      main.appendChild(panel);
    }
  }

  const pickedRow = main.querySelector(".xcf-jnp-picked");
  renderPanel(panel, selectedFromRow(pickedRow), panel.dataset.filter || "all");

  rows().forEach((row, index) => {
    if (row.dataset.churvoxJobPanelBound === "true") return;
    row.dataset.churvoxJobPanelBound = "true";
    row.addEventListener("click", () => {
      rows().forEach((r) => r.classList.remove("xcf-jnp-picked"));
      row.classList.add("xcf-jnp-picked");
      window.setTimeout(() => renderPanel(panel, rowInfo(row, index), panel.dataset.filter || "all"), 20);
    }, true);
  });

  applyFilter(panel.dataset.filter || "all");
}

function startJobsPanel() {
  ensurePanel();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    ensurePanel();
    if (attempts >= 80) window.clearInterval(timer);
  }, 300);
}

function hookRouteChanges() {
  if (window.__churvoxJobsNextPanelHooked) return;
  window.__churvoxJobsNextPanelHooked = true;
  ["pushState", "replaceState"].forEach((method) => {
    const original = window.history && window.history[method];
    if (typeof original !== "function") return;
    window.history[method] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      window.setTimeout(startJobsPanel, 80);
      return result;
    };
  });
  window.addEventListener("popstate", () => window.setTimeout(startJobsPanel, 80));
  window.addEventListener("click", () => window.setTimeout(ensurePanel, 120), true);
}

if (typeof window !== "undefined") {
  hookRouteChanges();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startJobsPanel, { once: true });
  } else {
    startJobsPanel();
  }
  window.addEventListener("load", startJobsPanel, { once: true });
}
