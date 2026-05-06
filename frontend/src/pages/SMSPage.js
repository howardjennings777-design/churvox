import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { MessageSquare, ShieldCheck, Mail, Bell, Sparkles, AlertTriangle, RefreshCw, Inbox, BadgeDollarSign, Settings as SettingsIcon } from "lucide-react";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumBadge, PremiumActionCard
} from "../components/premium";
import { useNavigate, Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";

const safeArray = (v) => (Array.isArray(v) ? v : []);

const SMS_PRICING = [
  { credits: 100, price: "$10", per: "$0.10/msg" },
  { credits: 500, price: "$45", per: "$0.09/msg" },
  { credits: 1000, price: "$80", per: "$0.08/msg" },
];

export default function SMSPage() {
  const navigate = useNavigate();
  const { get, post } = useApi();
  const [setup, setSetup] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const buyCredits = async (pack) => {
    const res = await post("/sms/buy-credits", { credits: pack.credits });
    if (res.success && res.data?.checkout_url) {
      window.location.assign(res.data.checkout_url);
    } else if (res.success) {
      toast.success(`${pack.credits} credits requested.`);
    } else {
      toast.error(res.error || "Top-up unavailable yet.");
    }
  };

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<MessageSquare className="h-7 w-7" />}
          eyebrow={<><Bell className="h-3 w-3" /> Communications</>}
          title="Communications"
          subtitle="Email and in-app notifications are live. SMS provider (Clicksend) shown below — real send is disabled until your API key is configured."
          actions={
            <Link
              to="/ai-operator/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50"
            >
              <SettingsIcon className="h-4 w-4" /> Operator settings
            </Link>
          }
        />

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
            title="SMS credits"
            icon={<BadgeDollarSign className="h-4 w-4" />}
            subtitle={loading ? "Loading…" : `${credits} available`}
            actions={
              credits < 25
                ? <PremiumBadge tone="amber" icon={<AlertTriangle className="h-3 w-3" />}>Low balance</PremiumBadge>
                : <PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Healthy</PremiumBadge>
            }
          >
            <p className="text-[13px] text-[#5b6c87]">Credits are spent only when AI or owner-approved messages actually send to customers.</p>
            <button onClick={load} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#155EEF] hover:underline">
              <RefreshCw className="h-3 w-3" /> Refresh
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

        {/* Buy credits */}
        <div className="mt-3">
          <PremiumCard
            title="Top up credits"
            icon={<Sparkles className="h-4 w-4" />}
            subtitle="Pay only for what you send"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SMS_PRICING.map((p) => (
                <button
                  key={p.credits}
                  type="button"
                  onClick={() => buyCredits(p)}
                  className="text-left rounded-xl border border-[#dde6f3] bg-white p-3 hover:border-[#155EEF] hover:bg-[#eff6ff] transition"
                >
                  <p className="text-xs uppercase tracking-wide text-[#94a3b8]">{p.credits} credits</p>
                  <p className="mt-1 text-2xl font-bold text-[#0d1b34]">{p.price}</p>
                  <p className="mt-0.5 text-[11px] text-[#5b6c87]">{p.per}</p>
                </button>
              ))}
            </div>
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
