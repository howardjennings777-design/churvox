// CHURVOX_ASSIGN_WORKER_DROPDOWN_PATCH_20260601
// Adds a real worker dropdown inside AI assignment slips without touching auth/routes/backend.

import API_BASE from "../lib/apiBase";

let workersCache = null;
let workersLoading = false;

function tokenHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normaliseList(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function workerId(worker) {
  const raw = worker?.id || worker?._id || worker?.user_id || worker?.worker_id || worker?.email || "";
  if (raw && typeof raw === "object" && raw.$oid) return String(raw.$oid);
  return String(raw || "");
}

function workerName(worker) {
  return String(worker?.name || worker?.full_name || worker?.display_name || worker?.email || "Unnamed worker");
}

async function getWorkers() {
  if (workersCache) return workersCache;
  if (workersLoading) return [];
  workersLoading = true;
  try {
    const response = await fetch(`${API_BASE}/api/team/workers`, {
      credentials: "include",
      headers: { ...tokenHeaders() },
    });
    const payload = await response.json().catch(() => ({}));
    workersCache = normaliseList(payload).filter((w) => workerId(w));
  } catch (error) {
    workersCache = [];
  }
  workersLoading = false;
  return workersCache;
}

function setReactInput(input, value) {
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function labelText(label) {
  return String(label?.querySelector("span")?.textContent || label?.textContent || "").trim().toLowerCase();
}

function findFieldInput(labels, text) {
  const label = labels.find((el) => labelText(el).includes(text));
  return label?.querySelector("input, textarea") || null;
}

function makeSelect(workers, currentWorkerId, onPick) {
  const wrap = document.createElement("div");
  wrap.className = "churvox-worker-picker mt-2 rounded-2xl border border-blue-200 bg-blue-50 p-4";
  wrap.innerHTML = `
    <div style="font-size:11px;font-weight:950;letter-spacing:.12em;text-transform:uppercase;color:#1d4ed8;margin-bottom:8px;">Choose worker</div>
    <select style="width:100%;border:1px solid #bfdbfe;border-radius:14px;background:white;padding:12px;font-size:14px;font-weight:800;color:#0f172a;outline:none;"></select>
    <div style="margin-top:8px;font-size:12px;font-weight:700;color:#475569;line-height:1.4;">AI recommends a worker, but the owner can pick another before approving.</div>
  `;
  const select = wrap.querySelector("select");
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Select worker...";
  select.appendChild(blank);
  workers.forEach((worker) => {
    const option = document.createElement("option");
    option.value = workerId(worker);
    option.textContent = [workerName(worker), worker.region || worker.area, worker.role].filter(Boolean).join(" · ");
    select.appendChild(option);
  });
  select.value = currentWorkerId || "";
  select.addEventListener("change", () => {
    const worker = workers.find((w) => workerId(w) === select.value);
    onPick(worker, select.value);
  });
  return wrap;
}

async function patchAssignmentSlip() {
  const pageText = document.body?.innerText || "";
  if (!pageText.includes("Worker assignment") && !pageText.includes("Approve assignment")) return;
  if (document.querySelector(".churvox-worker-picker")) return;

  const workers = await getWorkers();
  if (!workers.length) return;

  const labels = Array.from(document.querySelectorAll("label"));
  const workerInput = findFieldInput(labels, "worker id");
  const recommendedInput = findFieldInput(labels, "recommended worker");
  const messageInput = findFieldInput(labels, "worker note");
  const targetInput = workerInput || recommendedInput;
  if (!targetInput) return;

  const current = String(workerInput?.value || recommendedInput?.value || "");
  const select = makeSelect(workers, current, (worker, id) => {
    setReactInput(workerInput, id);
    setReactInput(recommendedInput, id);
    if (messageInput && worker) {
      const name = workerName(worker).split(" ")[0];
      const existing = String(messageInput.value || "");
      if (existing && !existing.toLowerCase().includes(name.toLowerCase())) {
        setReactInput(messageInput, `${name}, ${existing}`);
      }
    }
  });
  targetInput.closest("label")?.insertAdjacentElement("beforebegin", select);
}

function startPatch() {
  patchAssignmentSlip();
  const observer = new MutationObserver(() => patchAssignmentSlip());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("focus", patchAssignmentSlip);
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startPatch);
  else startPatch();
}

export default null;
