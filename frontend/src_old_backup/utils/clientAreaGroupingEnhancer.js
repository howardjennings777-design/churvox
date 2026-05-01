// Churvox Clients area dropdown enhancer.
// Adds a working NZ/AU region selector to Clients without changing backend data.

const NZ_REGIONS = [
  { name: "Northland", aliases: ["northland", "whangarei", "kerikeri", "kaitaia"] },
  { name: "Auckland", aliases: ["auckland", "manukau", "waitakere", "north shore", "papakura", "pukekohe"] },
  { name: "Waikato", aliases: ["waikato", "hamilton", "cambridge", "te awamutu", "taupo", "tokoroa"] },
  { name: "Bay of Plenty", aliases: ["bay of plenty", "tauranga", "rotorua", "whakatane", "papamoa", "mount maunganui"] },
  { name: "Gisborne", aliases: ["gisborne", "tairawhiti"] },
  { name: "Hawke's Bay", aliases: ["hawke", "napier", "hastings", "havelock north"] },
  { name: "Taranaki", aliases: ["taranaki", "new plymouth", "hawera"] },
  { name: "Manawatu-Whanganui", aliases: ["manawatu", "whanganui", "wanganui", "palmerston north", "levin", "feilding"] },
  { name: "Wellington", aliases: ["wellington", "lower hutt", "upper hutt", "porirua", "kapiti", "paraparaumu", "naenae", "petone"] },
  { name: "Tasman", aliases: ["tasman", "motueka", "richmond"] },
  { name: "Nelson", aliases: ["nelson"] },
  { name: "Marlborough", aliases: ["marlborough", "blenheim", "picton"] },
  { name: "West Coast", aliases: ["west coast", "greymouth", "hokitika", "westport"] },
  { name: "Canterbury", aliases: ["canterbury", "christchurch", "timaru", "ashburton", "rangiora"] },
  { name: "Otago", aliases: ["otago", "dunedin", "queenstown", "wanaka", "alexandra"] },
  { name: "Southland", aliases: ["southland", "invercargill", "gore"] },
];

const AU_REGIONS = [
  { name: "New South Wales", aliases: ["new south wales", "nsw", "sydney", "newcastle", "wollongong"] },
  { name: "Victoria", aliases: ["victoria", "vic", "melbourne", "geelong", "ballarat"] },
  { name: "Queensland", aliases: ["queensland", "qld", "brisbane", "gold coast", "sunshine coast", "cairns", "townsville"] },
  { name: "Western Australia", aliases: ["western australia", "wa", "perth", "fremantle", "bunbury"] },
  { name: "South Australia", aliases: ["south australia", "sa", "adelaide"] },
  { name: "Tasmania", aliases: ["tasmania", "tas", "hobart", "launceston"] },
  { name: "Northern Territory", aliases: ["northern territory", "nt", "darwin", "alice springs"] },
  { name: "Australian Capital Territory", aliases: ["australian capital territory", "act", "canberra"] },
];

const ALL_REGIONS = [...NZ_REGIONS, ...AU_REGIONS];
const STORAGE_KEY = "churvox_clients_area_filter";
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

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalise(value) {
  return clean(value).toLowerCase();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getClientsPage() {
  return document.querySelector('[data-testid="clients-page"]');
}

function getClientCards() {
  return Array.from(document.querySelectorAll('[data-testid^="client-card-"]'));
}

function detectArea(card) {
  const text = normalise(card?.textContent || "");
  for (const region of ALL_REGIONS) {
    if (region.aliases.some((alias) => text.includes(alias))) return region.name;
  }
  return "Unassigned area";
}

function collectCards() {
  const cards = getClientCards();
  const counts = new Map();

  cards.forEach((card) => {
    const area = detectArea(card);
    card.dataset.clientArea = area;
    counts.set(area, (counts.get(area) || 0) + 1);
  });

  return { cards, counts, total: cards.length };
}

function selectedLabel(value) {
  if (value === "all") return "All clients";
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
    ${option("All clients", "all", counts, total)}
    ${option("Unassigned area", "unassigned", counts, total)}
    <optgroup label="New Zealand">
      ${NZ_REGIONS.map((region) => option(region.name, region.name, counts, total)).join("")}
    </optgroup>
    <optgroup label="Australia">
      ${AU_REGIONS.map((region) => option(region.name, region.name, counts, total)).join("")}
    </optgroup>
  `;
}

function applyFilter() {
  const { cards } = collectCards();
  let visible = 0;

  cards.forEach((card) => {
    const area = card.dataset.clientArea || detectArea(card);
    const show = activeArea === "all" || (activeArea === "unassigned" ? area === "Unassigned area" : area === activeArea);
    card.hidden = !show;
    card.style.display = show ? "" : "none";
    if (show) visible += 1;
  });

  const title = document.querySelector('[data-chx-client-area-title="true"]');
  const meta = document.querySelector('[data-chx-client-area-meta="true"]');
  const empty = document.querySelector('[data-chx-client-area-empty="true"]');
  const select = document.querySelector('#chx-client-area-select');

  if (title) title.textContent = selectedLabel(activeArea);
  if (meta) meta.innerHTML = `<strong>${visible}</strong> client${visible === 1 ? "" : "s"} shown`;
  if (empty) {
    empty.hidden = visible > 0;
    empty.textContent = `No clients detected in ${selectedLabel(activeArea)} yet. Add an address with a town/region or update the client record.`;
  }
  if (select && select.value !== activeArea) select.value = activeArea;
}

function renderClientAreaPanel() {
  const page = getClientsPage();
  if (!page) return;

  activeArea = getSavedArea();
  const validAreas = new Set(["all", "unassigned", ...ALL_REGIONS.map((region) => region.name)]);
  if (!validAreas.has(activeArea)) saveArea("all");

  const { cards, counts, total } = collectCards();
  const oldPanel = document.querySelector('[data-chx-client-area-panel="true"]');

  if (!cards.length) {
    if (oldPanel) oldPanel.remove();
    return;
  }

  if (document.activeElement?.id === "chx-client-area-select") {
    applyFilter();
    return;
  }

  const panel = document.createElement("section");
  panel.dataset.chxClientAreaPanel = "true";
  panel.className = "chx-client-area-panel";
  panel.innerHTML = `
    <div class="chx-client-area-copy">
      <p class="chx-client-area-eyebrow">Client areas</p>
      <h2 data-chx-client-area-title="true">${escapeHtml(selectedLabel(activeArea))}</h2>
      <p>Choose a New Zealand or Australia region to show clients detected from their saved address.</p>
    </div>
    <div class="chx-client-area-control">
      <label for="chx-client-area-select">Show clients in</label>
      <select id="chx-client-area-select" class="chx-client-area-select">
        ${buildOptions(counts, total)}
      </select>
      <div class="chx-client-area-meta" data-chx-client-area-meta="true"><strong>${countFor(counts, activeArea, total)}</strong> client${countFor(counts, activeArea, total) === 1 ? "" : "s"} shown</div>
    </div>
    <div class="chx-client-area-empty" data-chx-client-area-empty="true" hidden>
      No clients detected in ${escapeHtml(selectedLabel(activeArea))} yet. Add an address with a town/region or update the client record.
    </div>
  `;

  const searchToolbar = page.querySelector('.cx-toolbar');
  const hero = page.querySelector('.cx-page-hero, .chx-page-header, .chx-hero, .page-header, .hero-card');

  if (oldPanel) oldPanel.replaceWith(panel);
  else if (searchToolbar?.parentNode) searchToolbar.insertAdjacentElement("afterend", panel);
  else if (hero?.parentNode) hero.insertAdjacentElement("afterend", panel);
  else page.prepend(panel);

  applyFilter();
}

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderClientAreaPanel, 160);
}

export function startClientAreaGroupingEnhancer() {
  if (observerStarted || typeof window === "undefined" || typeof document === "undefined") return;
  observerStarted = true;
  activeArea = getSavedArea();

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.id !== "chx-client-area-select") return;

    saveArea(target.value || "all");
    applyFilter();
    setTimeout(renderClientAreaPanel, 30);
  }, true);

  const observer = new MutationObserver(() => {
    if (window.location.pathname.startsWith("/clients")) scheduleRender();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleRender);
  window.addEventListener("load", scheduleRender);
  scheduleRender();
}
