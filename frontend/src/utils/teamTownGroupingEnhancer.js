// Churvox Team area dropdown enhancer.
// Adds a real NZ/AU region selector to Team without changing backend data or permissions.

const NZ_REGIONS = [
  "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki",
  "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland",
];

const AU_REGIONS = [
  "New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory",
];

let activeArea = "all";
let observerStarted = false;
let renderTimer = null;

function getTeamPage() {
  return document.querySelector('[data-testid="team-page"]');
}

function getWorkerCards() {
  return Array.from(document.querySelectorAll('[data-testid^="worker-card-"]'));
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function getCounts(cards) {
  const counts = new Map();
  cards.forEach((card) => {
    const area = extractArea(card);
    const country = extractCountry(card);
    card.dataset.workerArea = area;
    card.dataset.workerCountry = country;
    counts.set(area, (counts.get(area) || 0) + 1);
  });
  return counts;
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
  return `<option value="${value}">${label} (${count})</option>`;
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

function applyFilter(cards) {
  let visible = 0;
  cards.forEach((card) => {
    const area = card.dataset.workerArea || extractArea(card);
    const show = activeArea === "all" || (activeArea === "unassigned" ? area === "Unassigned area" : area === activeArea);
    card.style.display = show ? "" : "none";
    if (show) visible += 1;
  });

  const empty = document.querySelector('[data-chx-area-empty="true"]');
  if (empty) empty.hidden = visible > 0;
}

function renderTeamAreaPanel() {
  const page = getTeamPage();
  if (!page) return;

  const cards = getWorkerCards();
  const oldPanel = document.querySelector('[data-chx-team-area-panel="true"]');

  if (!cards.length) {
    if (oldPanel) oldPanel.remove();
    return;
  }

  const counts = getCounts(cards);
  const total = cards.length;
  const validAreas = new Set(["all", "unassigned", ...NZ_REGIONS, ...AU_REGIONS]);
  if (!validAreas.has(activeArea)) activeArea = "all";

  const panel = document.createElement("section");
  panel.dataset.chxTeamAreaPanel = "true";
  panel.className = "chx-team-area-panel";
  panel.innerHTML = `
    <div class="chx-team-area-copy">
      <p class="chx-team-area-eyebrow">Worker areas</p>
      <h2>${selectedLabel(activeArea)}</h2>
      <p>Choose a New Zealand or Australia region to show the workers based in that area.</p>
    </div>
    <div class="chx-team-area-control">
      <label for="chx-worker-area-select">Show workers in</label>
      <select id="chx-worker-area-select" class="chx-worker-area-select">
        ${buildOptions(counts, total)}
      </select>
      <div class="chx-team-area-meta"><strong>${countFor(counts, activeArea, total)}</strong> worker${countFor(counts, activeArea, total) === 1 ? "" : "s"} shown</div>
    </div>
    <div class="chx-team-area-empty" data-chx-area-empty="true" hidden>
      No workers saved in ${selectedLabel(activeArea)} yet. Update a worker profile region or invite a worker into this area.
    </div>
  `;

  const select = panel.querySelector("#chx-worker-area-select");
  select.value = activeArea;
  select.addEventListener("change", (event) => {
    activeArea = event.target.value;
    renderTeamAreaPanel();
  });

  const hero = page.querySelector('.cx-page-hero, .chx-page-header, .chx-hero, .page-header, .hero-card');
  if (oldPanel) oldPanel.replaceWith(panel);
  else if (hero?.parentNode) hero.insertAdjacentElement("afterend", panel);
  else page.prepend(panel);

  applyFilter(cards);
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderTeamAreaPanel, 120);
}

export function startTeamTownGroupingEnhancer() {
  if (observerStarted || typeof window === "undefined" || typeof document === "undefined") return;
  observerStarted = true;

  const observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith("/team")) scheduleRender();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleRender);
  window.addEventListener("load", scheduleRender);
  scheduleRender();
}
