// CHURVOX_TOP_TIER_RUNTIME_PATCH_20260528
// Safe additive runtime patch: exposes top-tier tools and adds Work Slip action buttons
// without rewriting the fragile Work Slip JSX file.

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

async function cvRequest(path, options = {}) {
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

function notify(text) {
  const old = document.querySelector(".cv-top-tier-runtime-toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "cv-top-tier-runtime-toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function addStyle() {
  if (document.getElementById("cv-top-tier-runtime-style")) return;
  const style = document.createElement("style");
  style.id = "cv-top-tier-runtime-style";
  style.textContent = `
    .cv-top-tier-runtime-strip{margin:16px 0;padding:14px;border-radius:22px;background:rgba(255,253,247,.86);border:1px solid rgba(17,24,39,.12);box-shadow:0 18px 44px rgba(17,24,39,.08);display:flex;gap:10px;align-items:center;flex-wrap:wrap}.cv-top-tier-runtime-strip b{font-weight:950;letter-spacing:-.03em}.cv-top-tier-runtime-strip a{border-radius:999px;padding:10px 13px;background:rgba(190,242,100,.22);color:#365314;text-decoration:none;font-weight:900;font-size:13px}.cv-top-tier-runtime-button{border-radius:999px!important;border:1px solid rgba(77,124,15,.26)!important;background:rgba(190,242,100,.20)!important;color:#365314!important;font-weight:950!important}.cv-top-tier-runtime-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}.xcf-topbar nav a[href='/operator-tools'],.xcf-bottom-nav a[href='/operator-tools']{background:rgba(190,242,100,.22);color:#365314;border-radius:999px}@media(max-width:760px){.cv-top-tier-runtime-strip{display:grid}.cv-top-tier-runtime-strip a{width:100%;text-align:center}.cv-top-tier-runtime-button{width:100%}}`;
  document.head.appendChild(style);
}

function ensureMainLinks() {
  const topNav = document.querySelector(".xcf-topbar nav");
  if (topNav && !topNav.querySelector('a[href="/operator-tools"]')) {
    const a = document.createElement("a");
    a.href = "/operator-tools";
    a.textContent = "Tools";
    topNav.appendChild(a);
  }

  const bottomNav = document.querySelector(".xcf-bottom-nav");
  if (bottomNav && !bottomNav.querySelector('a[href="/operator-tools"]')) {
    const a = document.createElement("a");
    a.href = "/operator-tools";
    a.textContent = "Tools";
    bottomNav.appendChild(a);
  }

  const shell = document.querySelector(".xcf-approval-desk");
  const hero = shell?.querySelector(".xcf-hero");
  if (shell && hero && !shell.querySelector(".cv-top-tier-runtime-strip")) {
    const strip = document.createElement("section");
    strip.className = "cv-top-tier-runtime-strip";
    strip.innerHTML = `<b>AI Operator tools</b><a href="/operator-tools">Tools</a><a href="/message-approvals">Messages</a><a href="/dispatch-board">Dispatch</a><a href="/trade-presets">Presets</a><a href="/offline-sync">Offline</a>`;
    hero.insertAdjacentElement("afterend", strip);
  }
}

function idFromHref(prefix) {
  const link = [...document.querySelectorAll(".cfs-actions a[href], .cfs-sheet a[href]")].find((a) => String(a.getAttribute("href") || "").startsWith(prefix));
  const href = link?.getAttribute("href") || "";
  return href.split("/").filter(Boolean).pop() || "";
}

function addButton(actions, label, handler) {
  if ([...actions.querySelectorAll("button")].some((b) => b.textContent.trim() === label)) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cv-top-tier-runtime-button";
  btn.textContent = label;
  btn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = "Working...";
    try {
      await handler();
    } catch (err) {
      notify(err?.message || "Action failed");
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });
  actions.appendChild(btn);
}

function ensureWorkSlipButtons() {
  const actions = document.querySelector(".cfs-actions");
  if (!actions || actions.dataset.cvTopTierRuntime === "yes") return;
  actions.dataset.cvTopTierRuntime = "yes";

  const jobId = () => idFromHref("/jobs/");
  const clientId = () => idFromHref("/clients/");

  addButton(actions, "Prepare proof pack", async () => {
    const id = jobId();
    if (!id) throw new Error("Open a job Work Slip before preparing a proof pack.");
    const data = await cvRequest(`/proof-packs/from-job/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({}) });
    const publicPath = data.public_path || data?.proof_pack?.public_path || "";
    notify(publicPath ? `Proof pack prepared: ${publicPath}` : "Proof pack prepared");
    if (publicPath) window.open(publicPath, "_blank", "noopener,noreferrer");
  });

  addButton(actions, "Undo / reopen", async () => {
    const id = jobId();
    if (!id) throw new Error("Open a job Work Slip before reopening.");
    await cvRequest(`/work-slips/${encodeURIComponent(id)}/reopen`, { method: "POST", body: JSON.stringify({}) });
    notify("Work Slip reopened — owner can review it again.");
  });

  addButton(actions, "Client memory", async () => {
    const id = clientId();
    if (!id) throw new Error("No client record link found in this Work Slip yet.");
    const data = await cvRequest(`/clients/${encodeURIComponent(id)}/memory`);
    const memory = data.memory || data?.data?.memory || {};
    const jobs = Array.isArray(memory.last_jobs) ? memory.last_jobs.length : 0;
    const invoices = Array.isArray(memory.last_invoices) ? memory.last_invoices.length : 0;
    notify(`Client memory: ${jobs} recent jobs, ${invoices} recent invoices.`);
  });

  addButton(actions, "Audit trail", async () => {
    const id = jobId() || clientId() || "work-slip";
    try {
      await cvRequest("/ai/audit-log", { method: "POST", body: JSON.stringify({ action: "view_work_slip_audit", target_type: "work_slip", target_id: id, note: "Owner opened audit context from Work Slip." }) });
    } catch {}
    notify("Opening audit trail in Operator Tools.");
    window.open("/operator-tools", "_blank", "noopener,noreferrer");
  });
}

function tick() {
  addStyle();
  ensureMainLinks();
  ensureWorkSlipButtons();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", tick);
  window.addEventListener("load", tick);
  setInterval(tick, 900);
  const observer = new MutationObserver(tick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
