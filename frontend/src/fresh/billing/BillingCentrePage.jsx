import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./billingCentrePage.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const FALLBACK_SMS_PACKS = [
  { pack: "100", credits: 100, price: 10, currency: "nzd" },
  { pack: "500", credits: 500, price: 45, currency: "nzd" },
  { pack: "1000", credits: 1000, price: 80, currency: "nzd" },
];

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

function money(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function savePending(row) {
  try {
    const key = "churvox_billing_pending_orders";
    const rows = JSON.parse(localStorage.getItem(key) || "[]");
    rows.unshift({ ...row, created_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(rows.slice(0, 40)));
  } catch {}
}

export default function BillingCentrePage() {
  const [addons, setAddons] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [blockQty, setBlockQty] = useState(1);

  const load = useCallback(async () => {
    setNotice("");
    try {
      const data = await api("/billing/addons");
      setAddons(data);
    } catch (e) {
      setAddons({
        plan: "unknown",
        sms_balance: 0,
        enterprise_user_block: {
          users: 50,
          price: 100,
          currency: "nzd",
          label: "+50 users",
          available: false,
          description: "Enterprise can buy extra user capacity in 50-user blocks for $100 per block.",
        },
        sms_packs: FALLBACK_SMS_PACKS,
      });
      setNotice("Billing add-ons loaded in fallback mode. Backend billing endpoint did not respond yet.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const smsPacks = addons?.sms_packs?.length ? addons.sms_packs : FALLBACK_SMS_PACKS;
  const block = addons?.enterprise_user_block || { users: 50, price: 100, available: false };
  const blockTotal = useMemo(() => Number(block.price || 100) * Number(blockQty || 1), [block.price, blockQty]);

  async function buyUserBlock() {
    setBusy("user-block");
    setNotice("");
    try {
      const result = await api("/billing/user-blocks/buy", {
        method: "POST",
        body: { quantity: Number(blockQty || 1) },
      });

      if (result.checkout_url) {
        window.location.assign(result.checkout_url);
        return;
      }

      savePending({ type: "enterprise_user_block_50", quantity: blockQty, result });
      setNotice(result.message || "User block order saved.");
    } catch (e) {
      savePending({ type: "enterprise_user_block_50", quantity: blockQty, error: e.message });
      setNotice(e.message || "Could not start user block checkout.");
    } finally {
      setBusy("");
    }
  }

  async function buySmsPack(pack) {
    setBusy(`sms-${pack}`);
    setNotice("");
    try {
      const result = await api("/billing/sms-packs/buy", {
        method: "POST",
        body: { pack },
      });

      if (result.checkout_url) {
        window.location.assign(result.checkout_url);
        return;
      }

      savePending({ type: "sms_pack", pack, result });
      setNotice(result.message || "SMS pack order saved.");
    } catch (e) {
      savePending({ type: "sms_pack", pack, error: e.message });
      setNotice(e.message || "Could not start SMS checkout.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="billing-page">
      <section className="billing-hero">
        <div>
          <p>BILLING CENTRE</p>
          <h1>Manage users, SMS credits and plan add-ons.</h1>
          <span>
            Enterprise can add users in 50-user blocks for $100. SMS credits are bought as packs and used for
            owner-approved customer messages.
          </span>
        </div>
        <button type="button" onClick={load}>Refresh billing</button>
      </section>

      {notice ? <section className="billing-notice">{notice}</section> : null}

      <section className="billing-grid">
        <article className="billing-card featured">
          <span>ENTERPRISE USERS</span>
          <h2>+50 users for $100</h2>
          <p>
            Buy extra Enterprise capacity in blocks. Each block adds 50 more users/workers to the business account.
          </p>

          <div className="billing-control">
            <label>
              Blocks
              <input
                type="number"
                min="1"
                max="20"
                value={blockQty}
                onChange={(e) => setBlockQty(Math.max(1, Math.min(20, Number(e.target.value || 1))))}
              />
            </label>
            <div>
              <b>{Number(blockQty || 1) * 50} users</b>
              <small>{money(blockTotal)} total</small>
            </div>
          </div>

          <button type="button" onClick={buyUserBlock} disabled={busy === "user-block"}>
            {busy === "user-block" ? "Starting checkout..." : "Buy 50-user block"}
          </button>

          {!block.available ? (
            <small className="billing-warning">Available for Enterprise accounts. Upgrade to Enterprise before buying user blocks.</small>
          ) : null}
        </article>

        <article className="billing-card">
          <span>SMS BALANCE</span>
          <h2>{addons?.sms_balance ?? 0} credits</h2>
          <p>SMS credits are used only when owner-approved SMS sending is enabled and sent.</p>
          <Link to="/ai-approvals">Review SMS drafts</Link>
        </article>
      </section>

      <section className="billing-board">
        <header>
          <div>
            <p>SMS CREDIT PACKS</p>
            <h2>Buy SMS credits</h2>
          </div>
          <small>100/$10 · 500/$45 · 1000/$80</small>
        </header>

        <div className="billing-pack-grid">
          {smsPacks.map((pack) => (
            <article className="billing-pack" key={pack.pack}>
              <span>{pack.credits} credits</span>
              <strong>{money(pack.price)}</strong>
              <p>{pack.credits} owner-approved SMS messages/credits available after purchase.</p>
              <button type="button" onClick={() => buySmsPack(pack.pack)} disabled={busy === `sms-${pack.pack}`}>
                {busy === `sms-${pack.pack}` ? "Starting..." : `Buy ${pack.credits} credits`}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="billing-help">
        <strong>Stripe price IDs to set on Render</strong>
        <p>
          User block checkout uses <code>STRIPE_PRICE_ENTERPRISE_USER_BLOCK_50</code>.
          SMS checkout uses <code>STRIPE_PRICE_SMS_100</code>, <code>STRIPE_PRICE_SMS_500</code>, and <code>STRIPE_PRICE_SMS_1000</code>.
          If those are not set, Churvox saves a pending billing order instead of crashing.
        </p>
      </section>
    </main>
  );
}
