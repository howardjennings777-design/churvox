const DB_NAME = "churvox-worker-offline-v1";
const DB_VERSION = 1;
const EVENTS = "events";
const SNAPSHOTS = "snapshots";
const CHANNEL = "churvox-worker-sync";
const listeners = new Set();

function emit(detail = {}) {
  const state = { online: typeof navigator === "undefined" ? true : navigator.onLine !== false, ...detail };
  listeners.forEach((listener) => { try { listener(state); } catch {} });
  try { window.dispatchEvent(new CustomEvent(CHANNEL, { detail: state })); } catch {}
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Offline storage is unavailable on this device."));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVENTS)) {
        const store = db.createObjectStore(EVENTS, { keyPath: "idempotency_key" });
        store.createIndex("captured_at", "captured_at");
        store.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
  });
}

async function transact(storeName, mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try { result = action(store); } catch (error) { db.close(); reject(error); return; }
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Offline storage transaction failed.")); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error("Offline storage transaction was cancelled.")); };
  });
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function workerNetworkState() { return { online: typeof navigator === "undefined" ? true : navigator.onLine !== false }; }

export async function cacheWorkerJobs(rows = []) {
  const value = { key: "assigned-jobs", rows: Array.isArray(rows) ? rows : [], saved_at: new Date().toISOString() };
  await transact(SNAPSHOTS, "readwrite", (store) => store.put(value));
  emit({ reason: "snapshot-saved" });
  return value;
}

export async function readCachedWorkerJobs() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOTS, "readonly");
    const request = transaction.objectStore(SNAPSHOTS).get("assigned-jobs");
    request.onsuccess = () => resolve(request.result || { key: "assigned-jobs", rows: [], saved_at: "" });
    request.onerror = () => reject(request.error || new Error("Could not read saved jobs."));
    transaction.oncomplete = () => db.close();
  });
}

export async function filesForOffline(files) {
  const list = Array.from(files || []).slice(0, 8);
  return Promise.all(list.map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || "image/jpeg", size: file.size || 0, data_url: String(reader.result || "") });
    reader.onerror = () => resolve({ name: file.name, type: file.type || "image/jpeg", size: file.size || 0, data_url: "" });
    reader.readAsDataURL(file);
  })));
}

export async function queueWorkerEvent({ jobId, action, payload = {}, idempotencyKey = "" }) {
  const event = { idempotency_key: idempotencyKey || randomId(), job_id: String(jobId || "").trim(), action: String(action || "").trim().toLowerCase(), payload, status: "queued", captured_at: new Date().toISOString(), attempts: 0 };
  if (!event.job_id || !event.action) throw new Error("A job and worker action are required.");
  await transact(EVENTS, "readwrite", (store) => store.put(event));
  emit({ reason: "event-queued", event });
  return event;
}

export async function listWorkerEvents() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EVENTS, "readonly");
    const request = transaction.objectStore(EVENTS).getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => String(a.captured_at).localeCompare(String(b.captured_at))));
    request.onerror = () => reject(request.error || new Error("Could not read the offline queue."));
    transaction.oncomplete = () => db.close();
  });
}

async function updateEvent(event) { await transact(EVENTS, "readwrite", (store) => store.put(event)); }
async function removeEvent(idempotencyKey) { await transact(EVENTS, "readwrite", (store) => store.delete(idempotencyKey)); }

export async function flushWorkerEvents(sendBatch) {
  const queued = (await listWorkerEvents()).filter((event) => event.status !== "applied");
  if (!queued.length) { emit({ reason: "queue-clear", pending: 0 }); return { applied_count: 0, needs_attention_count: 0, pending: 0, results: [] }; }
  if (typeof navigator !== "undefined" && navigator.onLine === false) { emit({ reason: "offline", pending: queued.length }); return { offline: true, pending: queued.length, results: [] }; }
  const response = await sendBatch(queued.map(({ status, attempts, ...event }) => event));
  const results = Array.isArray(response?.results) ? response.results : [];
  for (const result of results) {
    const current = queued.find((event) => event.idempotency_key === result.idempotency_key);
    if (!current) continue;
    if (result.status === "applied") await removeEvent(current.idempotency_key);
    else await updateEvent({ ...current, status: result.status || "needs_attention", detail: result.detail || "Owner check required", check: result.check, attempts: Number(current.attempts || 0) + 1, last_attempt_at: new Date().toISOString() });
  }
  const remaining = await listWorkerEvents();
  emit({ reason: "flush-complete", pending: remaining.length, response });
  return { ...response, pending: remaining.length };
}

export function subscribeWorkerSync(listener) {
  listeners.add(listener);
  const online = () => emit({ reason: "online" });
  const offline = () => emit({ reason: "offline" });
  if (typeof window !== "undefined") { window.addEventListener("online", online); window.addEventListener("offline", offline); }
  return () => { listeners.delete(listener); if (typeof window !== "undefined") { window.removeEventListener("online", online); window.removeEventListener("offline", offline); } };
}
