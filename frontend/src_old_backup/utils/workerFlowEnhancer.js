import API_BASE from "../lib/apiBase";

const QUEUE_KEY = "churvox_worker_offline_queue";
const ACTIVITY_PREFIX = "churvox_worker_activity_";
const PHOTO_CATEGORY_PREFIX = "churvox_worker_photo_category_";

function getToken() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}

function jobIdFromPath() {
  const match = window.location.pathname.match(/\/worker\/jobs\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function activityKey(jobId) {
  return `${ACTIVITY_PREFIX}${jobId}`;
}

function addActivity(jobId, label, detail = "") {
  if (!jobId) return;
  const list = readJson(activityKey(jobId), []);
  const next = [
    { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, at: new Date().toISOString(), label, detail },
    ...list,
  ].slice(0, 30);
  writeJson(activityKey(jobId), next);
  window.dispatchEvent(new CustomEvent("churvox-worker-activity", { detail: { jobId } }));
}

async function apiPatch(jobId, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`PATCH failed ${response.status}`);
  return response.json().catch(() => ({}));
}

function queuePatch(jobId, body, label) {
  const queue = readJson(QUEUE_KEY, []);
  queue.push({ jobId, body, label, created_at: new Date().toISOString() });
  writeJson(QUEUE_KEY, queue);
  addActivity(jobId, "Saved offline", label || "Action will sync when internet returns");
}

async function runSafePatch(jobId, body, label) {
  if (!navigator.onLine) {
    queuePatch(jobId, body, label);
    return { queued: true };
  }
  try {
    await apiPatch(jobId, body);
    addActivity(jobId, label || "Job updated", "Saved to Churvox");
    window.setTimeout(() => window.location.reload(), 450);
    return { queued: false };
  } catch {
    queuePatch(jobId, body, label);
    return { queued: true };
  }
}

async function flushQueue() {
  const queue = readJson(QUEUE_KEY, []);
  if (!queue.length || !navigator.onLine) return;
  const remaining = [];
  for (const item of queue) {
    try {
      await apiPatch(item.jobId, item.body);
      addActivity(item.jobId, "Offline sync complete", item.label || "Queued action synced");
    } catch {
      remaining.push(item);
    }
  }
  writeJson(QUEUE_KEY, remaining);
}

function renderOfflineBanner(jobId) {
  const main = document.querySelector(".worker-job-main");
  if (!main || document.querySelector("[data-worker-offline-banner]")) return;
  const queue = readJson(QUEUE_KEY, []).filter((item) => item.jobId === jobId);
  const banner = document.createElement("div");
  banner.dataset.workerOfflineBanner = "true";
  banner.className = "worker-offline-banner";
  banner.innerHTML = `<strong>${navigator.onLine ? "Online" : "Offline mode"}</strong><span>${queue.length ? `${queue.length} action${queue.length === 1 ? "" : "s"} waiting to sync.` : "Actions are protected if reception drops."}</span>`;
  main.prepend(banner);
}

function renderTravelStatus(jobId) {
  const hero = document.querySelector(".worker-job-hero");
  if (!hero || document.querySelector("[data-worker-travel-status]")) return;
  const wrap = document.createElement("div");
  wrap.dataset.workerTravelStatus = "true";
  wrap.className = "worker-travel-status";
  const statuses = [
    ["on_my_way", "On my way"],
    ["arrived", "Arrived"],
  ];
  wrap.innerHTML = `<p>Quick status</p><div>${statuses.map(([value, label]) => `<button type="button" data-worker-travel="${value}">${label}</button>`).join("")}</div>`;
  hero.appendChild(wrap);
  wrap.querySelectorAll("[data-worker-travel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-worker-travel");
      const label = btn.textContent.trim();
      runSafePatch(jobId, { worker_travel_status: value, worker_status_note: label }, label);
    });
  });
}

function renderStickyAction(jobId) {
  if (document.querySelector("[data-worker-sticky-action]")) return;
  const source = document.querySelector("[data-testid='worker-primary-actions'] button:not(:disabled)");
  if (!source) return;
  const bar = document.createElement("div");
  bar.dataset.workerStickyAction = "true";
  bar.className = "worker-sticky-action-bar";
  bar.innerHTML = `<button type="button">${source.textContent.trim() || "Next action"}</button>`;
  document.body.appendChild(bar);
  bar.querySelector("button").addEventListener("click", () => {
    addActivity(jobId, "Action tapped", source.textContent.trim());
    source.click();
  });
}

function renderPhotoCategories(jobId) {
  const section = document.querySelector("[data-testid='worker-photos-section']");
  if (!section || document.querySelector("[data-worker-photo-categories]")) return;
  const key = `${PHOTO_CATEGORY_PREFIX}${jobId}`;
  const current = localStorage.getItem(key) || "general";
  const cats = [
    ["before", "Before"],
    ["after", "After"],
    ["issue", "Issue"],
    ["general", "General"],
  ];
  const wrap = document.createElement("div");
  wrap.dataset.workerPhotoCategories = "true";
  wrap.className = "worker-photo-categories";
  wrap.innerHTML = cats.map(([value, label]) => `<button type="button" data-photo-category="${value}" class="${value === current ? "active" : ""}">${label}</button>`).join("");
  section.insertBefore(wrap, section.children[1] || null);
  wrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem(key, btn.dataset.photoCategory);
      wrap.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      addActivity(jobId, "Photo category selected", btn.textContent.trim());
    });
  });
  const input = section.querySelector("input[type='file']");
  if (input) {
    input.addEventListener("change", () => {
      const label = wrap.querySelector("button.active")?.textContent?.trim() || "General";
      addActivity(jobId, "Photo added", `${label} photo`);
    });
  }
}

function renderActivity(jobId) {
  const main = document.querySelector(".worker-job-main");
  if (!main) return;
  let box = document.querySelector("[data-worker-activity]");
  if (!box) {
    box = document.createElement("section");
    box.dataset.workerActivity = "true";
    box.className = "chx-worker-card worker-activity-card";
    main.appendChild(box);
  }
  const items = readJson(activityKey(jobId), []);
  box.innerHTML = `<div class="worker-activity-head"><p>Activity timeline</p><span>${items.length} updates</span></div>${items.length ? `<div class="worker-activity-list">${items.slice(0, 8).map((item) => `<div><strong>${item.label}</strong><span>${new Date(item.at).toLocaleString()}</span>${item.detail ? `<p>${item.detail}</p>` : ""}</div>`).join("")}</div>` : `<p class="worker-activity-empty">Worker actions, notes, photos, travel status and offline sync events will appear here.</p>`}`;
}

function enhanceWorkerDetail() {
  const jobId = jobIdFromPath();
  if (!jobId) return;
  renderOfflineBanner(jobId);
  renderTravelStatus(jobId);
  renderStickyAction(jobId);
  renderPhotoCategories(jobId);
  renderActivity(jobId);
}

export function startWorkerFlowEnhancer() {
  if (window.__churvoxWorkerFlowEnhancerStarted) return;
  window.__churvoxWorkerFlowEnhancerStarted = true;
  window.addEventListener("online", flushQueue);
  window.addEventListener("churvox-worker-activity", (event) => renderActivity(event.detail?.jobId || jobIdFromPath()));
  flushQueue();
  const observer = new MutationObserver(() => enhanceWorkerDetail());
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", () => window.setTimeout(enhanceWorkerDetail, 300));
  window.setInterval(() => {
    flushQueue();
    enhanceWorkerDetail();
  }, 5000);
  window.setTimeout(enhanceWorkerDetail, 500);
}
