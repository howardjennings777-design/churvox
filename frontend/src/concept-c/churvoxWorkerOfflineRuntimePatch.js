// CHURVOX_WORKER_OFFLINE_NOTE_RUNTIME_PATCH_20260528
// Safe additive worker patch: lets workers save a note to Churvox or queue it offline
// without rewriting existing worker page components.

const API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

function cleanBase(base) {
  return String(base || "").replace(/\/+$/, "");
}

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}

function queue() {
  try {
    const parsed = JSON.parse(localStorage.getItem("churvox_offline_queue") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(items) {
  try {
    localStorage.setItem("churvox_offline_queue", JSON.stringify(items));
  } catch {}
}

async function request(path, options = {}) {
  const t = token();
  const res = await fetch(`${cleanBase(API_BASE)}${path.startsWith("/api") ? path : `/api${path}`}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.detail || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

function toast(text) {
  const old = document.querySelector(".cv-worker-offline-toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "cv-worker-offline-toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function addStyle() {
  if (document.getElementById("cv-worker-offline-style")) return;
  const style = document.createElement("style");
  style.id = "cv-worker-offline-style";
  style.textContent = `
    .cv-worker-offline-panel{margin:16px;border-radius:24px;padding:16px;background:linear-gradient(135deg,#111827,#0f172a);color:#fffdf7;box-shadow:0 24px 80px rgba(17,24,39,.24);border:1px solid rgba(255,255,255,.14)}.cv-worker-offline-panel p{margin:0 0 8px;color:#bef264;font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.cv-worker-offline-panel h3{margin:0;font-size:24px;letter-spacing:-.045em}.cv-worker-offline-panel small{display:block;margin:8px 0 12px;color:rgba(255,253,247,.7);font-weight:750;line-height:1.45}.cv-worker-offline-panel textarea{width:100%;min-height:96px;border-radius:18px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fffdf7;padding:12px;font:inherit;font-weight:750;outline:none}.cv-worker-offline-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.cv-worker-offline-actions button{border:0;border-radius:999px;padding:12px 14px;font-weight:950;cursor:pointer}.cv-worker-offline-actions button:first-child{background:#bef264;color:#365314}.cv-worker-offline-actions button:nth-child(2){background:rgba(255,255,255,.12);color:#fffdf7}.cv-worker-offline-actions button:nth-child(3){background:rgba(255,255,255,.08);color:#fffdf7}.cv-worker-offline-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}@media(max-width:760px){.cv-worker-offline-actions{display:grid}.cv-worker-offline-actions button{width:100%}}`;
  document.head.appendChild(style);
}

function jobIdFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("jobs");
  return i >= 0 && parts[i + 1] ? parts[i + 1] : "";
}

function addWorkerPanel() {
  if (!window.location.pathname.startsWith("/worker/jobs")) return;
  if (document.querySelector(".cv-worker-offline-panel")) return;

  const target = document.querySelector("main") || document.querySelector(".min-h-screen") || document.body;
  const panel = document.createElement("section");
  panel.className = "cv-worker-offline-panel";
  panel.innerHTML = `
    <p>Offline-safe worker note</p>
    <h3>Tell Churvox what happened</h3>
    <small>Type or paste a voice note. Save online, or queue it safely if signal drops. Churvox can use this for job notes, invoice wording and owner review.</small>
    <textarea placeholder="Example: Back lawn done, hedge left side needs extra next visit, gate was open..."></textarea>
    <div class="cv-worker-offline-actions">
      <button type="button" data-cv-worker-save>Save note to Churvox</button>
      <button type="button" data-cv-worker-queue>Queue offline</button>
      <button type="button" data-cv-worker-sync>Sync queued notes</button>
    </div>
  `;
  target.prepend(panel);

  const textarea = panel.querySelector("textarea");
  panel.querySelector("[data-cv-worker-save]").addEventListener("click", async () => {
    const note = textarea.value.trim();
    if (!note) return toast("Add a note first.");
    try {
      await request("/worker/voice-notes/draft", {
        method: "POST",
        body: JSON.stringify({ job_id: jobIdFromPath(), note, transcript: note, text: note }),
      });
      textarea.value = "";
      toast("Worker note saved to Churvox.");
    } catch (err) {
      const items = queue();
      items.unshift({ id: `offline-${Date.now()}`, type: "worker_note", job_id: jobIdFromPath(), note, created_at: new Date().toISOString() });
      saveQueue(items);
      toast("Signal failed — note queued offline instead.");
    }
  });

  panel.querySelector("[data-cv-worker-queue]").addEventListener("click", () => {
    const note = textarea.value.trim();
    if (!note) return toast("Add a note first.");
    const items = queue();
    items.unshift({ id: `offline-${Date.now()}`, type: "worker_note", job_id: jobIdFromPath(), note, created_at: new Date().toISOString() });
    saveQueue(items);
    textarea.value = "";
    toast("Worker note queued offline.");
  });

  panel.querySelector("[data-cv-worker-sync]").addEventListener("click", async () => {
    const items = queue();
    if (!items.length) return toast("Nothing queued offline.");
    await request("/offline-sync", { method: "POST", body: JSON.stringify({ actions: items }) });
    saveQueue([]);
    toast(`Synced ${items.length} queued item${items.length === 1 ? "" : "s"}.`);
  });
}

function tick() {
  addStyle();
  addWorkerPanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", tick);
  window.addEventListener("load", tick);
  setInterval(tick, 1200);
  const observer = new MutationObserver(tick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
