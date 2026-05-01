// Churvox Automation action safety layer.
// Keeps Test/Pause/Delete/Run sweep working even when the backend returns Mongo _id instead of id.

let started = false;
let busy = false;
let fetchPatched = false;
let nativeFetch = null;

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

function isAutomationPage() {
  return window.location.pathname.includes("automation");
}

function isSweepUrl(input) {
  const url = typeof input === "string" ? input : input?.url || "";
  return /\/api\/automations?\/(run-sweep|run_sweep|sweep)\/?(\?|$)/i.test(String(url));
}

async function request(path, options = {}) {
  const auth = token();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const response = await (nativeFetch || window.fetch)(`${apiBase()}/api${path}`, {
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
  setTimeout(() => box.remove(), 3200);
}

function hideStaleNotFoundBanner() {
  document.querySelectorAll("div").forEach((node) => {
    if (clean(node.textContent).toLowerCase() === "automation rule not found.") {
      node.style.display = "none";
    }
  });
}

function ensureRunSweepButton() {
  if (!isAutomationPage()) return;

  const existing = Array.from(document.querySelectorAll("button")).find((button) =>
    clean(button.textContent).toLowerCase().includes("sweep")
  );
  if (existing) {
    existing.dataset.chxRunSweepButton = "true";
    return;
  }

  const page = document.querySelector('[data-testid="automation-page"]') || document.querySelector("main") || document.body;
  const firstSection = page.querySelector("section");
  const buttonArea = firstSection?.querySelector(".flex.flex-wrap.gap-2") || firstSection || page;
  if (!buttonArea || buttonArea.querySelector('[data-chx-run-sweep-button="true"]')) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.chxRunSweepButton = "true";
  button.textContent = "Run sweep";
  button.style.cssText = "border-radius:16px;border:1px solid rgba(167,243,208,.5);background:rgba(16,185,129,.18);color:#d1fae5;padding:12px 20px;font-size:14px;font-weight:800;cursor:pointer;";
  buttonArea.prepend(button);
}

async function findRuleFromCard(card) {
  const title = clean(card?.querySelector("h3")?.textContent);
  if (!title) return null;

  const payload = await request("/automation/rules");
  const rules = asList(payload);
  return rules.find((rule) => clean(rule?.name || "Untitled workflow") === title) || null;
}

async function runSweep({ reload = true } = {}) {
  const payload = await request("/automation/rules");
  const rules = asList(payload);
  const activeRules = rules.filter((rule) => rule?.enabled !== false && idOf(rule));

  if (activeRules.length === 0) {
    const result = { success: false, message: "No enabled workflows to run", scanned: 0, passed: 0, failed: 0 };
    showMessage(result.message, "bad");
    return result;
  }

  let passed = 0;
  let failed = 0;

  for (const rule of activeRules) {
    try {
      await request(`/automation/rules/${encodeURIComponent(idOf(rule))}/test`, { method: "POST" });
      passed += 1;
    } catch (err) {
      failed += 1;
      console.warn("Automation sweep rule failed", rule?.name || idOf(rule), err);
    }
  }

  const result = {
    success: failed === 0,
    message: failed > 0 ? `Run sweep finished: ${passed} passed, ${failed} failed` : `Run sweep completed: ${passed} workflow${passed === 1 ? "" : "s"} ran`,
    scanned: activeRules.length,
    passed,
    failed,
  };

  showMessage(result.message, failed > 0 ? "bad" : "ok");
  if (reload) setTimeout(() => window.location.reload(), 850);
  return result;
}

function patchSweepFetchFallback() {
  if (fetchPatched || typeof window === "undefined" || typeof window.fetch !== "function") return;
  fetchPatched = true;
  nativeFetch = window.fetch.bind(window);

  window.fetch = async function churvoxAutomationFetch(input, init) {
    if (isSweepUrl(input)) {
      try {
        const result = await runSweep({ reload: false });
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message || "Run sweep failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return nativeFetch(input, init);
  };
}

async function handleAutomationClick(event) {
  if (!isAutomationPage()) return;
  if (busy) return;

  const button = event.target?.closest?.("button");
  if (!button) return;
  const label = clean(button.textContent).toLowerCase();
  const isSweep = label.includes("sweep");
  if (!["test", "pause", "on", "del"].includes(label) && !isSweep) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  busy = true;
  const originalText = button.textContent;
  try {
    if (isSweep) {
      button.textContent = "Running...";
      await runSweep({ reload: true });
      return;
    }

    const card = button.closest("article");
    if (!card) throw new Error("Could not find this automation card.");

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
    button.textContent = originalText;
    busy = false;
  }
}

export function startAutomationActionFixer() {
  if (started || typeof window === "undefined" || typeof document === "undefined") return;
  started = true;
  patchSweepFetchFallback();
  document.addEventListener("click", handleAutomationClick, true);
  const observer = new MutationObserver(() => {
    hideStaleNotFoundBanner();
    ensureRunSweepButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  hideStaleNotFoundBanner();
  ensureRunSweepButton();
  setInterval(ensureRunSweepButton, 1200);
}
