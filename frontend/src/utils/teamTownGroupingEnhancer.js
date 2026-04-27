// Churvox Team area grouping enhancer.
// Adds an area/town filter to the Team page without changing backend data or worker permissions.

let activeArea = "all";
let observerStarted = false;
let renderTimer = null;

function getTeamPage() {
  return document.querySelector('[data-testid="team-page"]');
}

function getWorkerCards() {
  return Array.from(document.querySelectorAll('[data-testid^="worker-card-"]'));
}

function extractArea(card) {
  const text = (card?.textContent || "").replace(/\s+/g, " ").trim();
  const match = text.match(/Region:\s*([^·•|\n]+)/i);
  const area = match?.[1]?.trim();
  if (!area || area === "-" || area.toLowerCase() === "none") return "Unassigned area";
  return area;
}

function buildAreaCounts(cards) {
  const counts = new Map();
  cards.forEach((card) => {
    const area = extractArea(card);
    counts.set(area, (counts.get(area) || 0) + 1);
    card.dataset.workerArea = area;
  });
  return Array.from(counts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => {
      if (a.area === "Unassigned area") return 1;
      if (b.area === "Unassigned area") return -1;
      return a.area.localeCompare(b.area);
    });
}

function applyFilter(cards) {
  cards.forEach((card) => {
    const area = card.dataset.workerArea || extractArea(card);
    const show = activeArea === "all" || area === activeArea;
    card.style.display = show ? "" : "none";
  });
}

function makeButton({ label, count, value }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chx-area-filter-chip${activeArea === value ? " active" : ""}`;
  button.dataset.areaValue = value;
  button.innerHTML = `<span>${label}</span><strong>${count}</strong>`;
  button.addEventListener("click", () => {
    activeArea = value;
    renderTeamAreaPanel();
  });
  return button;
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

  const areas = buildAreaCounts(cards);
  const total = cards.length;

  if (activeArea !== "all" && !areas.some((item) => item.area === activeArea)) {
    activeArea = "all";
  }

  const panel = document.createElement("section");
  panel.dataset.chxTeamAreaPanel = "true";
  panel.className = "chx-team-area-panel";

  const activeLabel = activeArea === "all" ? "All areas" : activeArea;
  panel.innerHTML = `
    <div class="chx-team-area-copy">
      <p class="chx-team-area-eyebrow">Worker areas</p>
      <h2>${activeLabel}</h2>
      <p>Group your crew by town or region so you can quickly find the right workers for a local job.</p>
    </div>
    <div class="chx-team-area-actions" data-chx-area-actions="true"></div>
  `;

  const actions = panel.querySelector('[data-chx-area-actions="true"]');
  actions.appendChild(makeButton({ label: "All workers", count: total, value: "all" }));
  areas.forEach((item) => actions.appendChild(makeButton({ label: item.area, count: item.count, value: item.area })));

  const hero = page.querySelector('.cx-page-hero, .chx-page-header, .chx-hero, .page-header, .hero-card');
  if (oldPanel) {
    oldPanel.replaceWith(panel);
  } else if (hero?.parentNode) {
    hero.insertAdjacentElement("afterend", panel);
  } else {
    page.prepend(panel);
  }

  applyFilter(cards);
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderTeamAreaPanel, 120);
}

export function startTeamTownGroupingEnhancer() {
  if (observerStarted || typeof window === "undefined" || typeof document === "undefined") return;
  observerStarted = true;

  window.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-chx-team-area-panel="true"]')) return;
  });

  const observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith("/team")) scheduleRender();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("popstate", scheduleRender);
  window.addEventListener("load", scheduleRender);
  scheduleRender();
}
