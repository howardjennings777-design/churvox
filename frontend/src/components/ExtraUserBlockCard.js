import React, { useState } from "react";
import { useApi } from "../hooks/useApi";
import { detectCountryHint } from "../lib/country";

const BLOCK_SIZE = 50;
const BLOCK_PRICE = 100;

function getPayload(res) {
  if (!res) return null;
  if (res.data !== undefined) return res.data;
  return res;
}

export default function ExtraUserBlockCard({ currentPlan = "none", billing = null, currencyInfo = null }) {
  const api = useApi();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const plan = String(currentPlan || "none").toLowerCase();
  const blocks = Number(billing?.extra_user_blocks || billing?.user_blocks || billing?.capacity_blocks || 0) || 0;
  const included = plan === "enterprise" ? 50 + blocks * BLOCK_SIZE : plan === "pro" ? 20 : plan === "team" ? 5 : 1;
  const canBuy = plan === "enterprise";

  const handleBuy = async () => {
    if (busy) return;
    if (!canBuy) {
      setNotice("Extra 50-user blocks are available on Enterprise. Upgrade to Enterprise first.");
      return;
    }

    try {
      setBusy(true);
      setNotice("");
      const res = await api.post("/stripe/create-checkout-session", {
        plan_type: "enterprise_user_block",
        addon_type: "extra_user_block",
        quantity: 1,
        country: currencyInfo?.country || detectCountryHint() || "",
      });
      const data = getPayload(res) || {};
      const url = data.checkout_url || data.url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.assign(url);
    } catch (err) {
      setNotice(err?.response?.data?.detail || err?.message || "Could not open extra user checkout yet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-[2rem] border border-blue-100 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]" data-testid="extra-user-block-card">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Extra capacity</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Need more users?</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Enterprise includes 50 users. Add another {BLOCK_SIZE} users for ${BLOCK_PRICE}/month when your team grows.
          </p>
          <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-xs uppercase tracking-wide text-slate-400">Current plan</span>{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-xs uppercase tracking-wide text-slate-400">User capacity</span>{included} users</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="block text-xs uppercase tracking-wide text-slate-400">Blocks added</span>{blocks} block{blocks === 1 ? "" : "s"}</div>
          </div>
          {notice && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{notice}</div>}
        </div>
        <button
          type="button"
          onClick={handleBuy}
          disabled={busy}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="buy-extra-user-block-button"
        >
          {busy ? "Opening checkout..." : `Buy 50 more users · $${BLOCK_PRICE}/mo`}
        </button>
      </div>
    </section>
  );
}
