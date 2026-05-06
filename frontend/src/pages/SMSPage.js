import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { MessageSquare, ShieldCheck, Mail, Bell, Sparkles, AlertTriangle, RefreshCw, Inbox, BadgeDollarSign, Settings as SettingsIcon, ShoppingCart } from "lucide-react";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumBadge, PremiumActionCard
} from "../components/premium";
import { useNavigate, Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";

const safeArray = (v) => (Array.isArray(v) ? v : []);

const SMS_PRICING = [
  { credits: 100, price: "$10", per: "$0.10/msg", label: "Starter" },
  { credits: 500, price: "$45", per: "$0.09/msg", label: "Best value" },
  { credits: 1000, price: "$80", per: "$0.08/msg", label: "High volume" },
];

export default function SMSPage() {
  const navigate = useNavigate();
  const { get, post } = useApi();
  const [setup, setSetup] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyPack, setBusyPack] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [statusRes, histRes] = await Promise.all([
      get("/ai-operator/setup-status"),
      get("/sms/history?limit=25").catch(() => ({ success: false })),
    ]);
    if (statusRes.success) setSetup(statusRes.data || {});
    if (histRes?.success) setHistory(safeArray(histRes.data?.messages || histRes.data?.items || histRes.data));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const sms = setup?.sms || {};
  const ready = !!sms.ready;
  const credits = sms.credits ?? 0;

  const scrollToBuyCredits = () => {
    const target = document.getElementById("buy-sms-credits");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const buyCredits = async (pack) => {
    const packKey = String(pack.credits);
    setBusyPack(packKey);
    try {
      const res = await post("/sms/buy-credits", {
        pack: packKey,
        credits: pack.credits,
      });
      if (res.success && res.data?.checkout_url) {
        window.location.assign(res.data.checkout_url);
      } else if (res.success && res.data?.url) {
        window.location.assign(res.data.url);
      } else if (res.success) {
        toast.success(`${pack.credits} SMS credits requested.`);
        await load();
      } else {
        toast.error(res.error || "SMS credit top-up unavailable yet.");
      }
    } finally {
      setBusyPack("");
    }
  };

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<MessageSquare className="h-7 w-7" />}
          eyebrow={<><Bell className="h-3 w-3" /> SMS Credits</>}
          title="Buy SMS Credits"
          subtitle="Top up credits for customer reminders, invoice follow-ups and owner-approved SMS messages. Pick a pack below."
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={scrollToBuyCredits}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff5a12] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#e94f0f]"
                data-testid="hero-buy-sms-credits"
              >
                <ShoppingCart className="h-4 w-4" /> Buy SMS credits
              </button>
              <Link
                to="/ai-operator/settings"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50"
              >
                <SettingsIcon className="h-4 w-4" /> SMS settings
              </Link>
            </div>
          }
        />

        <div
          id="buy-sms-credits"
          className="mt-3 scroll-mt-6 rounded-3xl border border-[#ffb086] bg-gradient-to-br from-[#fff7ed] via-white to-[#eff6ff] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
          data-testid="buy-sms-credits-panel"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ffedd5] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#c2410c]">
                <ShoppingCart className="h-3.5 w-3.5" /> Buy SMS Credits Here
              </div>
              <h2 className="mt-3 font-heading text-2xl font-bold text-[#0d1b34]">Choose a top-up pack</h2>
              <p className="mt-1 text-sm text-[#5b6c87]">Your current balance is <span className="font-bold text-[#0d1b34]">{loading ? "loading…" : `${credits} credits`}</span>.</p>
            </div>
            <button onClick={load} className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#d8e3f3] bg-white px-4 py-2 text-sm font-bold text-[#155EEF] hover:bg-[#eff6ff]">
              <RefreshCw className="h-4 w-4" /> Refresh balance
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SMS_PRICING.map((p) => {
              const packKey = String(p.credits);
              return (
                <button
                  key={p.credits}
                  type="button"
                  onClick={() => buyCredits(p)}
                  disabled={busyPack === packKey}
                  className="text-left rounded-2xl border-2 border-[#dde6f3] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff5a12] hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-70"
                  data-testid={`buy-sms-pack-${p.credits}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-wide text-[#ff5a12]">{p.label}</p>
                    <ShoppingCart className="h-4 w-4 text-[#155EEF]" />
                  </div>
                  <p className="mt-2 text-3xl font-black text-[#0d1b34]">{p.credits}</p>
                  <p className="text-sm font-bold text-[#475569]">SMS credits</p>
                  <p className="mt-3 text-2xl font-black text-[#0d1b34]">{p.price}</p>
                  <p className="mt-0.5 text-[12px] text-[#5b6c87]">{p.per}</p>
                  <span className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#155EEF] px-3 py-2 text-sm font-bold text-white">
                    {busyPack === packKey ? "Opening checkout…" : `Buy ${p.credits} credits`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status & credits row */}
        <div className="px-grid px-grid--3">
          <PremiumCard
            title="SMS status"
            icon={<ShieldCheck className="h-4 w-4" />}
            subtitle={ready ? "Live" : "Setup required"}
            actions={
              ready
                ? <PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Ready</PremiumBadge>
                : <PremiumBadge tone="amber" icon={<AlertTriangle className="h-3 w-3" />}>Setup required</PremiumBadge>
            }
          >
            {ready ? (
              <p className="text-[13px] text-[#5b6c87]">SMS provider connected (Clicksend). AI can draft, queue and send SMS within your operator settings (quiet hours, opt-out, daily limits all respected).</p>
            ) : (
              <div className="text-[13px] text-[#5b6c87]">
                <p className="font-semibold text-[#0d1b34]">Real SMS send is disabled.</p>
                <p className="mt-1">{sms.blocked_reason || "Clicksend API key not configured."}</p>
                <p className="mt-2 text-[12px]">AI can still draft, preview and queue SMS for your approval — they won't actually go out until the provider is connected.</p>
              </div>
            )}
          </PremiumCard>

          <PremiumCard
            title="SMS credits balance"
            icon={<BadgeDollarSign className="h-4 w-4" />}
            subtitle={loading ? "Loading…" : `${credits} available`}
            actions={
              credits < 25
                ? <PremiumBadge tone="amber" icon={<AlertTriangle className="h-3 w-3" />}>Low balance</PremiumBadge>
                : <PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Healthy</PremiumBadge>
            }
          >
            <p className="text-[13px] text-[#5b6c87]">Credits are spent only when AI or owner-approved messages actually send to customers.</p>
            <button onClick={scrollToBuyCredits} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#ff5a12] px-3 py-2 text-xs font-bold text-white hover:bg-[#e94f0f]">
              <ShoppingCart className="h-3 w-3" /> Buy more credits
            </button>
          </PremiumCard>

          <PremiumCard
            title="Email reminders"
            icon={<Mail className="h-4 w-4" />}
            subtitle="Live"
            actions={<PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Active</PremiumBadge>}
          >
            <p className="text-[13px] text-[#5b6c87]">Send payment reminders, quote follow-ups and job confirmations from invoice and quote pages.</p>
          </PremiumCard>
        </div>

        {/* History */}
        <div className="mt-3">
          <PremiumCard
            title="Recent SMS activity"
            icon={<Inbox className="h-4 w-4" />}
            subtitle={loading ? "Loading…" : `${history.length} recent`}
          >
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#fbfdff] p-4 text-center text-[13px] text-[#5b6c87]">
                No SMS activity yet. Drafts and approvals will appear here.
              </div>
            ) : (
              <ul className="divide-y divide-[#e2e8f0]">
                {history.slice(0, 12).map((m) => (
                  <li key={m.id || m._id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0d1b34] truncate">{m.to || m.recipient || "—"}</p>
                      <p className="mt-0.5 text-xs text-[#5b6c87] truncate">{m.body || m.message || ""}</p>
                    </div>
                    <span className={`cx-status-badge ${m.status === "delivered" || m.status === "sent" ? "cx-status-badge--green" : m.status === "failed" ? "cx-status-badge--red" : "cx-status-badge--blue"}`}>
                      {m.status || "queued"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PremiumCard>
        </div>

        <div className="px-grid px-grid--3">
          <PremiumActionCard tone="blue"   icon={<Sparkles className="h-5 w-5" />} title="Open AI Operator" description="See AI-prepared messages" onClick={() => navigate("/ai-operator/approvals")} />
          <PremiumActionCard tone="amber"  icon={<MessageSquare className="h-5 w-5" />} title="Invoice reminders" description="Draft a polite payment reminder" onClick={() => navigate("/invoices")} />
          <PremiumActionCard tone="violet" icon={<MessageSquare className="h-5 w-5" />} title="Quote follow-ups" description="Nudge stale quotes" onClick={() => navigate("/quotes")} />
        </div>
      </PremiumPage>
    </Layout>
  );
}
