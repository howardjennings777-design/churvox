const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const COMMAND_POSTED_KEY = "churvox:fresh-command-posted:v1";
const COMMAND_API_BASE = "/api/command";

function safeJson(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

function inferActionType(slip = {}) {
  const raw = `${slip.actionType || ""} ${slip.group || ""} ${slip.title || ""} ${slip.page || ""}`.toLowerCase();

  if (raw.includes("invoice") && raw.includes("extra")) return "approve_invoice_extra";
  if (raw.includes("invoice")) return "review_invoice";
  if (raw.includes("payment") || raw.includes("overdue") || raw.includes("cash")) return "send_payment_reminder";
  if (raw.includes("quote") && raw.includes("follow")) return "send_quote_followup";
  if (raw.includes("quote")) return "approve_quote";
  if (raw.includes("plan") || raw.includes("route")) return "approve_day_plan";
  if (raw.includes("worker") || raw.includes("brief")) return "send_worker_brief";
  if (raw.includes("setup")) return "fix_setup_step";
  if (raw.includes("recurring") || raw.includes("rebook")) return "send_rebooking_message";
  if (raw.includes("review")) return "send_review_request";
  if (raw.includes("message") || raw.includes("triage")) return "send_customer_message";
  if (raw.includes("missing")) return "fix_missing_info";

  return "owner_review";
}

function inferSourceType(slip = {}) {
  const raw = `${slip.sourceType || ""} ${slip.area || ""} ${slip.group || ""} ${slip.title || ""} ${slip.page || ""}`.toLowerCase();

  if (raw.includes("invoice") || raw.includes("payment") || raw.includes("cash")) return "invoice";
  if (raw.includes("quote")) return "quote";
  if (raw.includes("job") || raw.includes("plan") || raw.includes("route")) return "job";
  if (raw.includes("worker") || raw.includes("brief")) return "worker";
  if (raw.includes("client") || raw.includes("customer") || raw.includes("recurring") || raw.includes("review")) return "client";
  if (raw.includes("message") || raw.includes("triage")) return "message";
  if (raw.includes("setup") || raw.includes("missing")) return "setup";

  return "system";
}

function toBackendSlip(slip = {}) {
  const actionType = slip.actionType || inferActionType(slip);
  const sourceType = slip.sourceType || inferSourceType(slip);

  return {
    id: slip.id,
    sourceType,
    sourceId: slip.sourceId || slip.id || `${sourceType}-${actionType}`,
    actionType,
    title: slip.title || "Prepared action",
    info: slip.info || slip.urgency || "",
    found: slip.found || "Churvox found something that needs owner review.",
    prepared: slip.prepared || "Churvox prepared the next action.",
    why: slip.why || slip.owner || "This keeps admin moving while the owner stays in control.",
    owner: slip.owner || "Approve, edit, snooze, ignore, or open.",
    urgency: slip.urgency || "Medium",
    area: slip.area || sourceType,
    page: slip.page || "command",
    payload: {
      ...slip,
      createdFrom: "fresh_send_to_command",
    },
  };
}

function readPostedIds() {
  if (typeof window === "undefined") return new Set();
  const raw = window.localStorage.getItem(COMMAND_POSTED_KEY);
  const list = safeJson(raw, []);
  return new Set(Array.isArray(list) ? list : []);
}

function savePostedIds(ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMMAND_POSTED_KEY, JSON.stringify([...ids].slice(-300)));
}

function readLocalSlips() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(COMMAND_INBOX_KEY);
  const list = safeJson(raw, []);
  return Array.isArray(list) ? list : [];
}

function saveLocalSlips(slips) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(slips.slice(0, 160)));
}

export async function postFreshSlipToCommand(slip) {
  const backendSlip = toBackendSlip(slip);

  const response = await fetch(`${COMMAND_API_BASE}/slips`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(backendSlip),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `Command create failed: ${response.status}`);
  }

  return data.slip || backendSlip;
}

export function sendFreshSlipToCommand(slip, detail = {}) {
  if (!slip) return Promise.resolve(null);

  const localSlip = {
    ...slip,
    id: slip.id || `fresh-command-${Date.now()}`,
    fromInbox: true,
    createdAt: slip.createdAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  try {
    const current = readLocalSlips();
    const withoutDuplicate = current.filter((item) => item.id !== localSlip.id);
    saveLocalSlips([localSlip, ...withoutDuplicate]);
  } catch {
    // Preview keeps working without storage.
  }

  const promise = postFreshSlipToCommand(localSlip)
    .then((posted) => {
      const ids = readPostedIds();
      ids.add(localSlip.id);
      savePostedIds(ids);

      window.dispatchEvent(new CustomEvent("churvox:fresh-command-posted", {
        detail: { slip: posted, localSlip, ...detail },
      }));

      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", {
        detail: { type: detail.type || "send-to-command-backend", backend: true },
      }));

      return posted;
    })
    .catch((error) => {
      window.dispatchEvent(new CustomEvent("churvox:fresh-command-post-failed", {
        detail: { slip: localSlip, error: error?.message || "Command backend unavailable", ...detail },
      }));

      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", {
        detail: { type: detail.type || "send-to-command-preview", backend: false },
      }));

      return localSlip;
    });

  window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", {
    detail: { type: detail.type || "send-to-command-local", backend: "pending" },
  }));

  return promise;
}

export function syncLocalCommandInboxToBackend() {
  if (typeof window === "undefined") return;

  const slips = readLocalSlips();
  if (!slips.length) return;

  const posted = readPostedIds();
  const pending = slips.filter((slip) => slip?.id && !posted.has(slip.id)).slice(0, 30);

  pending.forEach((slip) => {
    postFreshSlipToCommand(slip)
      .then(() => {
        const ids = readPostedIds();
        ids.add(slip.id);
        savePostedIds(ids);

        window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", {
          detail: { type: "command-bridge-sync", backend: true },
        }));
      })
      .catch(() => {
        // Keep local fallback. Do not annoy the owner.
      });
  });
}

export function installFreshCommandBridge() {
  if (typeof window === "undefined") return;
  if (window.__churvoxFreshCommandBridgeInstalled) return;

  window.__churvoxFreshCommandBridgeInstalled = true;

  window.addEventListener("churvox:fresh-data-updated", () => {
    window.setTimeout(syncLocalCommandInboxToBackend, 80);
  });

  window.setTimeout(syncLocalCommandInboxToBackend, 350);
}
