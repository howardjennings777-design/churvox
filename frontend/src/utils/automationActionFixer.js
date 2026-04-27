// Churvox Automation action safety layer.
// Keeps Test/Pause/Delete working even when the backend returns Mongo _id instead of id.

let started = false;
let busy = false;

function token() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
}

function apiBase() {
  return (window.__CHURVOX_API_BASE__ || process.env.REACT_APP_BACKEND_URL || "https://grassley-backend.onrender.com").replace(/\/$/, "");
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function idOf(item) {
  const raw = item?.id ?? item?._id ?? item?.rule_id ?? item?.ruleId;
  if (!raw) return "";
  if (typeof raw === "object") return raw.$oid || raw.oid || raw.id || "";
  return String(raw);
}

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rules)) return payload.rules;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.rules)) return payload.data.rules;
  return [];
}

async function request(path, options = {}) {
  const auth = token();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const response = await fetch(`${apiBase()}/api${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  let data = null;
  try { data = await response.json(); } catch { data = null; }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || data?.error || "Automation action failed");
  }
  return data || {};
}

function showMessage(text, tone = "ok") {
  const old = document.querySelector('[data-chx-auto-fixer-message="true"]');
  if (old) old.remove();

  const box = document.createElement("div");
  box.dataset.chxAutoFixerMessage = "true";
  box.textContent = text;
  box.style.cssText = `position:fixed;right:18px;bottom:18px;z-index:9999;border-radius:16px;padding:12px 14px;font-size:13px;font-weight:800;box-shadow:0 18px 40px rgba(15,23,42,.18);background:${tone === "bad" ? "#fef2f2" : "#ecfdf5"};color:${tone === "bad" ? "#b91c1c" : "#047857"};border:1px solid ${tone === "bad" ? "#fecaca" : "#a7f3d0"};`;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2800);
}

function hideStaleNotFoundBanner() {
  document.querySelectorAll("div").forEach((node) => {
    if (clean(node.textContent).toLowerCase() === "automation rule not found.") {
      node.style.display = "none";
    }
  });
}

async function findRuleFromCard(card) {
  const title = clean(card?.querySelector("h3")?.textContent);
  if (!title) return null;

  const payload = await request("/automation/rules");
  const rules = asList(payload);
  return rules.find((rule) => clean(rule?.name || "Untitled workflow") === title) || null;
}

async function handleAutomationClick(event) {
  if (!window.location.pathname.startsWith("/automation")) return;
  if (busy) return;

  const button = event.target?.closest?.("button");
  if (!button) return;
  const label = clean(button.textContent).toLowerCase();
  if (!["test", "pause", "on", "del"].includes(label)) return;

  const card = button.closest("article");
  if (!card) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  busy = true;
  try {
    const rule = await findRuleFromCard(card);
    const id = idOf(rule);
    if (!rule || !id) throw new Error("Could not find this automation rule.");

    if (label === "test") {
      await request(`/automation/rules/${encodeURIComponent(id)}/test`, { method: "POST" });
      showMessage("Workflow test completed");
    } else if (label === "pause" || label === "on") {
      await request(`/automation/rules/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ enabled: rule.enabled === false }),
      });
      showMessage(rule.enabled === false ? "Workflow enabled" : "Workflow paused");
    } else if (label === "del") {
      const ok = window.confirm("Delete this workflow?");
      if (!ok) return;
      await request(`/automation/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
      showMessage("Workflow deleted");
    }

    setTimeout(() => window.location.reload(), 650);
  } catch (err) {
    showMessage(err.message || "Automation action failed", "bad");
  } finally {
    busy = false;
  }
}

export function startAutomationActionFixer() {
  if (started || typeof window === "undefined" || typeof document === "undefined") return;
  started = true;
  document.addEventListener("click", handleAutomationClick, true);
  const observer = new MutationObserver(hideStaleNotFoundBanner);
  observer.observe(document.body, { childList: true, subtree: true });
  hideStaleNotFoundBanner();
}
