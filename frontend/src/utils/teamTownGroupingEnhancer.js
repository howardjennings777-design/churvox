// Churvox Team area dropdown enhancer.
// Adds a working NZ/AU region selector to Team without changing backend data or permissions.

const NZ_REGIONS = [
  "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki",
  "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland",
];

const AU_REGIONS = [
  "New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory",
];

const STORAGE_KEY = "churvox_team_worker_area_filter";
let activeArea = "all";
let observerStarted = false;
let renderTimer = null;

function getSavedArea() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) || "all";
  } catch {
    return "all";
  }
}

function saveArea(value) {
  activeArea = value || "all";
  try {
    window.sessionStorage.setItem(STORAGE_KEY, activeArea);
  } catch {
    // ignore private-mode storage errors
  }
}

function getTeamPage() {
  return document.querySelector('[data-testid="team-page"]');
}

function getWorkerCards() {
  return Array.from(document.querySelectorAll('[data-testid^="worker-card-"]'));
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractCountry(card) {
  const text = clean(card?.textContent || "");
  const match = text.match(/Country:\s*([^·•|\n]+)/i);
  return clean(match?.[1]) || "Unknown country";
}

function extractArea(card) {
  const text = clean(card?.textContent || "");
  const match = text.match(/Region:\s*([^·•|\n]+)/i);
  const area = clean(match?.[1]);
  if (!area || area === "-" || area.toLowerCase() === "none") return "Unassigned area";
  return area;
}

function collectCards() {
  const cards = getWorkerCards();
  const counts = new Map();

  cards.forEach((card) => {
    const area = extractArea(card);
    const country = extractCountry(card);
    card.dataset.workerArea = area;
    card.dataset.workerCountry = country;
    counts.set(area, (counts.get(area) || 0) + 1);
  });

  return { cards, counts, total: cards.length };
}

function selectedLabel(value) {
  if (value === "all") return "All workers";
  if (value === "unassigned") return "Unassigned area";
  return value;
}

function countFor(counts, value, total) {
  if (value === "all") return total;
  if (value === "unassigned") return counts.get("Unassigned area") || 0;
  return counts.get(value) || 0;
}

function option(label, value, counts, total) {
  const count = countFor(counts, value, total);
  const selected = activeArea === value ? " selected" : "";
  return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)} (${count})</option>`;
}

function buildOptions(counts, total) {
  return `
    ${option("All workers", "all", counts, total)}
    ${option("Unassigned area", "unassigned", counts, total)}
    <optgroup label="New Zealand">
      ${NZ_REGIONS.map((region) => option(region, region, counts, total)).join("")}
    </optgroup>
    <optgroup label="Australia">
      ${AU_REGIONS.map((region) => option(region, region, counts, total)).join("")}
    </optgroup>
  `;
}

function applyFilter() {
  const { cards, total } = collectCards();
  let visible = 0;

  cards.forEach((card) => {
    const area = card.dataset.workerArea || extractArea(card);
    const show = activeArea === "all" || (activeArea === "unassigned" ? area === "Unassigned area" : area === activeArea);
    card.hidden = !show;
    card.style.display = show ? "" : "none";
    if (show) visible += 1;
  });

  const title = document.querySelector('[data-chx-area-title="true"]');
  const meta = document.querySelector('[data-chx-area-meta="true"]');
  const empty = document.querySelector('[data-chx-area-empty="true"]');
  const select = document.querySelector('#chx-worker-area-select');

  if (title) title.textContent = selectedLabel(activeArea);
  if (meta) meta.innerHTML = `<strong>${visible}</strong> worker${visible === 1 ? "" : "s"} shown`;
  if (empty) {
    empty.hidden = visible > 0;
    empty.textContent = `No workers saved in ${selectedLabel(activeArea)} yet. Update a worker profile region or invite a worker into this area.`;
  }
  if (select && select.value !== activeArea) select.value = activeArea;

  return { visible, total };
}

function renderTeamAreaPanel() {
  const page = getTeamPage();
  if (!page) return;

  activeArea = getSavedArea();
  const validAreas = new Set(["all", "unassigned", ...NZ_REGIONS, ...AU_REGIONS]);
  if (!validAreas.has(activeArea)) saveArea("all");

  const { cards, counts, total } = collectCards();
  const oldPanel = document.querySelector('[data-chx-team-area-panel="true"]');

  if (!cards.length) {
    if (oldPanel) oldPanel.remove();
    return;
  }

  // Do not rebuild the select while the user is interacting with it. Just re-apply the current filter.
  if (document.activeElement?.id === "chx-worker-area-select") {
    applyFilter();
    return;
  }

  const panel = document.createElement("section");
  panel.dataset.chxTeamAreaPanel = "true";
  panel.className = "chx-team-area-panel";
  panel.innerHTML = `
    <div class="chx-team-area-copy">
      <p class="chx-team-area-eyebrow">Worker areas</p>
      <h2 data-chx-area-title="true">${escapeHtml(selectedLabel(activeArea))}</h2>
      <p>Choose a New Zealand or Australia region to show the workers based in that area.</p>
    </div>
    <div class="chx-team-area-control">
      <label for="chx-worker-area-select">Show workers in</label>
      <select id="chx-worker-area-select" class="chx-worker-area-select">
        ${buildOptions(counts, total)}
      </select>
      <div class="chx-team-area-meta" data-chx-area-meta="true"><strong>${countFor(counts, activeArea, total)}</strong> worker${countFor(counts, activeArea, total) === 1 ? "" : "s"} shown</div>
    </div>
    <div class="chx-team-area-empty" data-chx-area-empty="true" hidden>
      No workers saved in ${escapeHtml(selectedLabel(activeArea))} yet. Update a worker profile region or invite a worker into this area.
    </div>
  `;

  const hero = page.querySelector('.cx-page-hero, .chx-page-header, .chx-hero, .page-header, .hero-card');
  if (oldPanel) oldPanel.replaceWith(panel);
  else if (hero?.parentNode) hero.insertAdjacentElement("afterend", panel);
  else page.prepend(panel);

  applyFilter();
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderTeamAreaPanel, 160);
}

export function startTeamTownGroupingEnhancer() {
  if (observerStarted || typeof window === "undefined" || typeof document === "undefined") return;
  observerStarted = true;
  activeArea = getSavedArea();

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id !== "chx-worker-area-select") return;

    saveArea(target.value || "all");
    applyFilter();
    // Update count/title after the browser finishes the native select change.
    setTimeout(renderTeamAreaPanel, 30);
  }, true);

  const observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith("/team")) scheduleRender();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleRender);
  window.addEventListener("load", scheduleRender);
  scheduleRender();
}
