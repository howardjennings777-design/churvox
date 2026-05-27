// CHURVOX_TOP_TIER_RUNTIME_PATCH_20260528
// CHURVOX_CLIENT_MEMORY_POPUP_20260528
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    .cv-top-tier-runtime-strip{margin:16px 0;padding:14px;border-radius:22px;background:rgba(255,253,247,.86);border:1px solid rgba(17,24,39,.12);box-shadow:0 18px 44px rgba(17,24,39,.08);display:flex;gap:10px;align-items:center;flex-wrap:wrap}.cv-top-tier-runtime-strip b{font-weight:950;letter-spacing:-.03em}.cv-top-tier-runtime-strip a{border-radius:999px;padding:10px 13px;background:rgba(190,242,100,.22);color:#365314;text-decoration:none;font-weight:900;font-size:13px}.cv-top-tier-runtime-button{border-radius:999px!important;border:1px solid rgba(77,124,15,.26)!important;background:rgba(190,242,100,.20)!important;color:#365314!important;font-weight:950!important}.cv-top-tier-runtime-toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 28px));padding:13px 16px;border-radius:18px;background:#111827;color:#fffaf0;font-weight:900;box-shadow:0 26px 80px rgba(17,24,39,.3);text-align:center}.xcf-topbar nav a[href='/operator-tools'],.xcf-bottom-nav a[href='/operator-tools']{background:rgba(190,242,100,.22);color:#365314;border-radius:999px}.cv-client-memory-backdrop{position:fixed;inset:0;z-index:2147483646;background:rgba(17,24,39,.48);display:grid;place-items:center;padding:18px}.cv-client-memory-modal{width:min(980px,100%);max-height:min(860px,92vh);overflow:auto;border-radius:30px;background:#fffaf0;color:#111827;box-shadow:0 40px 120px rgba(17,24,39,.38);border:1px solid rgba(17,24,39,.12)}.cv-client-memory-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:24px;border-bottom:1px solid rgba(17,24,39,.10)}.cv-client-memory-head p{margin:0 0 6px;color:#4d7c0f;font-size:12px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.cv-client-memory-head h2{margin:0;font-size:34px;letter-spacing:-.055em}.cv-client-memory-head button{border:0;border-radius:999px;background:#111827;color:#fffaf0;padding:10px 13px;font-weight:950;cursor:pointer}.cv-client-memory-body{display:grid;gap:14px;padding:18px}.cv-client-memory-card{border-radius:22px;background:rgba(255,253,247,.92);border:1px solid rgba(17,24,39,.10);padding:16px}.cv-client-memory-card h3{margin:0 0 10px;font-size:20px;letter-spacing:-.035em}.cv-client-memory-card p,.cv-client-memory-card small{color:rgba(17,24,39,.66);font-weight:750;line-height:1.45}.cv-client-memory-list{display:grid;gap:8px}.cv-client-memory-row{border-radius:16px;background:rgba(17,24,39,.045);padding:11px}.cv-client-memory-row b{display:block;letter-spacing:-.02em}.cv-client-memory-row small{display:block;margin-top:4px}@media(max-width:760px){.cv-top-tier-runtime-strip{display:grid}.cv-top-tier-runtime-strip a{width:100%;text-align:center}.cv-top-tier-runtime-button{width:100%}.cv-client-memory-head{display:grid}.cv-client-memory-head h2{font-size:28px}}`;
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

function firstText(...values) {
  return values.find((v) => String(v || "").trim()) || "";
}

function recordTitle(row, fallback) {
  return firstText(row?.title, row?.job_name, row?.invoice_number, row?.quote_number, row?.customer_name, row?.client_name, fallback);
}

function showClientMemory(memory) {
  const old = document.querySelector(".cv-client-memory-backdrop");
  if (old) old.remove();

  const client = memory?.client || {};
  const jobs = Array.isArray(memory?.last_jobs) ? memory.last_jobs.slice(0, 6) : [];
  const invoices = Array.isArray(memory?.last_invoices) ? memory.last_invoices.slice(0, 6) : [];
  const quotes = Array.isArray(memory?.last_quotes) ? memory.last_quotes.slice(0, 4) : [];
  const warnings = firstText(memory?.warnings, client?.warnings, client?.access_notes, client?.notes, "No warnings saved.");
  const preferredWorker = firstText(memory?.preferred_worker, client?.preferred_worker, client?.preferred_worker_id, "No preferred worker set.");

  const listRows = (rows, fallback) => rows.length
    ? rows.map((row) => `<div class="cv-client-memory-row"><b>${escapeHtml(recordTitle(row, fallback))}</b><small>${escapeHtml(firstText(row?.status, row?.address, row?.site_address, row?.created_at, "Record saved"))}</small></div>`).join("")
    : `<div class="cv-client-memory-row"><small>No records found yet.</small></div>`;

  const el = document.createElement("div");
  el.className = "cv-client-memory-backdrop";
  el.innerHTML = `
    <section class="cv-client-memory-modal" role="dialog" aria-modal="true" aria-label="Client memory">
      <header class="cv-client-memory-head">
        <div><p>Client memory</p><h2>${escapeHtml(firstText(client?.name, client?.customer_name, "Client"))}</h2></div>
        <button type="button" data-cv-client-memory-close>Close</button>
      </header>
      <div class="cv-client-memory-body">
        <article class="cv-client-memory-card"><h3>Warnings / notes</h3><p>${escapeHtml(warnings)}</p></article>
        <article class="cv-client-memory-card"><h3>Preferred worker</h3><p>${escapeHtml(preferredWorker)}</p></article>
        <article class="cv-client-memory-card"><h3>Recent jobs</h3><div class="cv-client-memory-list">${listRows(jobs, "Job")}</div></article>
        <article class="cv-client-memory-card"><h3>Recent invoices</h3><div class="cv-client-memory-list">${listRows(invoices, "Invoice")}</div></article>
        <article class="cv-client-memory-card"><h3>Recent quotes</h3><div class="cv-client-memory-list">${listRows(quotes, "Quote")}</div></article>
      </div>
    </section>`;
  el.addEventListener("click", (event) => {
    if (event.target === el || event.target?.matches?.("[data-cv-client-memory-close]")) el.remove();
  });
  document.body.appendChild(el);
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
    showClientMemory(memory);
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
