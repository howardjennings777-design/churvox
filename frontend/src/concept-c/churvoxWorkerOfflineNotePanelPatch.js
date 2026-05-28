// CHURVOX_WORKER_OFFLINE_NOTE_PANEL_PATCH_20260528
// Safe additive patch: adds an offline-safe note queue panel to worker job detail pages.

const CV_WON_API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cvWonCleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function cvWonToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function cvWonJobId() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "worker" && parts[1] === "jobs" && parts[2]) return parts[2];
  return "";
}

function cvWonReadQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem("churvox_offline_queue") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cvWonSaveQueue(queue) {
  try {
    localStorage.setItem("churvox_offline_queue", JSON.stringify(queue));
  } catch {}
}

function cvWonToast(text) {
  let toast = document.querySelector(".cv-worker-offline-note-toast");
  if (toast) toast.remove();
  toast = document.createElement("div");
  toast.className = "cv-worker-offline-note-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function cvWonAddStyle() {
  if (document.getElementById("cv-worker-offline-note-style")) return;
  const style = document.createElement("style");
  style.id = "cv-worker-offline-note-style";
  style.textContent = `
    .cv-worker-offline-note-panel{margin:14px;border-radius:24px;padding:16px;background:linear-gradient(135deg,#111827,#0f172a);color:#fffdf7;border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 70px rgba(17,24,39,.22)}.cv-worker-offline-note-panel p{margin:0 0 8px;color:#bef264;font-size:12px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.cv-worker-offline-note-panel h3{margin:0;font-size:24px;letter-spacing:-.045em}.cv-worker-offline-note-panel small{display:block;margin-top:8px;color:rgba(255,253,247,.72);font-weight:750;line-height:1.45}.cv-worker-offline-note-panel textarea{width:100%;min-height:110px;margin-top:14px;border-radius:18px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fffdf7;padding:12px;font:inherit;font-weight:750;outline:none}.cv-worker-offline-note-panel textarea::placeholder{color:rgba(255,253,247,.45)}.cv-worker-offline-note-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.cv-worker-offline-note-actions button,.cv-worker-offline-note-actions a{border:0;border-radius:999px;padding:11px 13px;background:#bef264;color:#365314;font-weight:950;text-decoration:none;cursor:pointer}.cv-worker-offline-note-actions button:nth-child(2){background:rgba(255,255,255,.12);color:#fffdf7}.cv-worker-offline-note-status{margin-top:10px!important;color:#bef264!important}.cv-worker-offline-note-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}@media(max-width:760px){.cv-worker-offline-note-actions{display:grid}.cv-worker-offline-note-actions button,.cv-worker-offline-note-actions a{width:100%;text-align:center}}
  `;
  document.head.appendChild(style);
}

async function cvWonSyncNow(statusEl) {
  const queue = cvWonReadQueue();
  if (!queue.length) {
    statusEl.textContent = "No offline notes waiting.";
    cvWonToast("No offline notes waiting.");
    return;
  }
  const token = cvWonToken();
  const res = await fetch(`${cvWonCleanBase(CV_WON_API_BASE)}/api/offline-sync`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ actions: queue }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.message || "Sync failed");
  cvWonSaveQueue([]);
  statusEl.textContent = `Synced ${queue.length} offline item${queue.length === 1 ? "" : "s"}.`;
  cvWonToast(statusEl.textContent);
}

function cvWonPanelHtml(jobId, count) {
  return `
    <p>Offline-safe worker note</p>
    <h3>Save a field note even if signal drops</h3>
    <small>This saves on this device first. Sync it when connection is back.</small>
    <textarea data-cv-worker-offline-note-text placeholder="Add job note, issue, access detail, customer request, or completion note..."></textarea>
    <div class="cv-worker-offline-note-actions">
      <button type="button" data-cv-worker-offline-save>Save offline note</button>
      <button type="button" data-cv-worker-offline-sync>Sync now</button>
      <a href="/offline-sync">Open Offline Sync</a>
    </div>
    <small class="cv-worker-offline-note-status">${count} offline item${count === 1 ? "" : "s"} waiting for this device. Job: ${jobId}</small>
  `;
}

function cvWonAddPanel() {
  const jobId = cvWonJobId();
  if (!jobId || document.querySelector(".cv-worker-offline-note-panel")) return;
  const target = document.querySelector("main") || document.querySelector(".min-h-screen") || document.body;
  const queue = cvWonReadQueue();
  const panel = document.createElement("section");
  panel.className = "cv-worker-offline-note-panel";
  panel.innerHTML = cvWonPanelHtml(jobId, queue.length);
  target.appendChild(panel);

  const textarea = panel.querySelector("[data-cv-worker-offline-note-text]");
  const statusEl = panel.querySelector(".cv-worker-offline-note-status");
  panel.querySelector("[data-cv-worker-offline-save]")?.addEventListener("click", () => {
    const note = String(textarea?.value || "").trim();
    if (!note) {
      statusEl.textContent = "Write a note first.";
      cvWonToast("Write a note first.");
      return;
    }
    const next = cvWonReadQueue();
    next.push({
      id: `offline-worker-note-${Date.now()}`,
      type: "worker_note",
      job_id: jobId,
      note,
      created_at: new Date().toISOString(),
      source: "worker_job_detail",
    });
    cvWonSaveQueue(next);
    textarea.value = "";
    statusEl.textContent = `Saved offline. ${next.length} item${next.length === 1 ? "" : "s"} waiting to sync.`;
    cvWonToast("Worker note saved offline.");
  });

  panel.querySelector("[data-cv-worker-offline-sync]")?.addEventListener("click", async () => {
    try {
      statusEl.textContent = "Syncing offline notes...";
      await cvWonSyncNow(statusEl);
    } catch (err) {
      statusEl.textContent = err?.message || "Sync failed. Notes remain on this device.";
      cvWonToast(statusEl.textContent);
    }
  });
}

function cvWonTick() {
  cvWonAddStyle();
  cvWonAddPanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", cvWonTick);
  window.addEventListener("load", cvWonTick);
  setInterval(cvWonTick, 1200);
  const observer = new MutationObserver(cvWonTick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
