// CHURVOX_SMS_CREDIT_BUY_BUTTONS_20260530
// Adds buy buttons to the existing SMS credit cards on Plans without touching plan/trial billing code.

const SMS_PACKS = {
  "100": "100",
  "500": "500",
  "1,000": "1000",
  "1000": "1000",
};

function getBackendBase() {
  const envBase =
    (typeof process !== "undefined" && process.env && process.env.REACT_APP_BACKEND_URL) ||
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
    "";
  return String(envBase || "https://grassley-backend.onrender.com").replace(/\/$/, "");
}

function getToken() {
  try {
    return window.localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function postJson(endpoint, body) {
  const token = getToken();
  const res = await fetch(`${getBackendBase()}/api${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.detail || data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data || {};
}

function toastLike(message, good = true) {
  const note = document.createElement("div");
  note.textContent = message;
  note.style.position = "fixed";
  note.style.zIndex = "999999";
  note.style.left = "50%";
  note.style.bottom = "92px";
  note.style.transform = "translateX(-50%)";
  note.style.maxWidth = "min(520px, calc(100vw - 32px))";
  note.style.borderRadius = "16px";
  note.style.padding = "12px 14px";
  note.style.fontWeight = "900";
  note.style.color = good ? "#021024" : "#fff";
  note.style.background = good ? "linear-gradient(135deg,#77ffc1,#14d8f4)" : "rgba(239,68,68,.94)";
  note.style.boxShadow = "0 18px 54px rgba(0,0,0,.28)";
  document.body.appendChild(note);
  window.setTimeout(() => note.remove(), 3400);
}

async function buySmsPack(button, packId, label) {
  if (!packId || button.disabled) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Opening checkout…";

  const payload = {
    pack_id: packId,
    sms_pack_id: packId,
    credits: Number(packId),
    addon_type: "sms_credits",
    addon: "sms_credits",
    quantity: 1,
    success_path: `/plans?checkout=success&addon=sms_credits&pack=${packId}`,
    cancel_path: `/plans?checkout=cancelled&addon=sms_credits&pack=${packId}`,
  };

  const attempts = [
    ["/sms/buy-credits", payload],
    ["/sms/credits/buy", payload],
    ["/billing/sms/checkout", payload],
    ["/stripe/create-checkout-session", { ...payload, plan_type: "sms_credits" }],
  ];

  let lastError = null;
  for (const [endpoint, body] of attempts) {
    try {
      const data = await postJson(endpoint, body);
      const checkoutUrl = data.checkout_url || data.url || data?.data?.checkout_url || data?.data?.url;
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      const balance = data.new_balance ?? data.balance ?? data?.data?.new_balance ?? data?.data?.balance;
      const message = data.message || data?.data?.message;
      if (message || balance !== undefined || data.success === true) {
        toastLike(message || `${label} SMS credits added.${balance !== undefined ? ` New balance: ${balance}.` : ""}`);
        return;
      }
      lastError = new Error("No checkout URL returned.");
    } catch (err) {
      lastError = err;
    }
  }

  toastLike(lastError?.message || "Failed to buy SMS credits.", false);
  button.disabled = false;
  button.textContent = original;
}

function enhanceSmsCards() {
  const cards = Array.from(document.querySelectorAll(".cv-sms-grid article"));
  cards.forEach((card) => {
    if (card.querySelector(".cv-sms-buy")) return;
    const small = card.querySelector("small");
    const rawLabel = String(small?.textContent || "").replace(/credits/i, "").trim();
    const packId = SMS_PACKS[rawLabel];
    if (!packId) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cv-sms-buy";
    button.textContent = `Buy ${rawLabel}`;
    button.setAttribute("data-testid", `buy-sms-${packId}`);
    button.addEventListener("click", () => buySmsPack(button, packId, rawLabel));
    card.appendChild(button);
  });
}

function startSmsButtonRetry() {
  enhanceSmsCards();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    enhanceSmsCards();
    if (attempts >= 30) window.clearInterval(timer);
  }, 350);
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startSmsButtonRetry, { once: true });
  } else {
    startSmsButtonRetry();
  }
  window.addEventListener("load", startSmsButtonRetry, { once: true });
  window.addEventListener("popstate", () => window.setTimeout(startSmsButtonRetry, 50));
  window.addEventListener("click", () => window.setTimeout(enhanceSmsCards, 80), true);
}
