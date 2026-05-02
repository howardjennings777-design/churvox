import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Loader2, Building2, Briefcase, Receipt, RefreshCw, Lock, FileText, Trash2, Settings as SettingsIcon, ShieldCheck, ArrowUpRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { TRADE_TYPES } from "@/lib/utils";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumBadge, PremiumFormSection,
} from "@/components/premium";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { patch, get, post, loading } = useApi();
  const planLimits = usePlanLimits(user?.plan);

  const isFeatureEnabled = (key) => {
    const features = planLimits?.features || {};
    const k = String(key || "").trim().toLowerCase();
    if (k === "myob" || k === "myob_sync") return !!features.myobSync;
    return !!features[key];
  };

  const [gstRate, setGstRate] = useState(user?.gst_rate?.toString() || "15");
  const [tradeType, setTradeType] = useState(user?.trade_type || "other");
  const [myobKey, setMyobKey] = useState("");
  const [myobFileId, setMyobFileId] = useState("");
  const [myobFileName, setMyobFileName] = useState("");
  const [myobConnected, setMyobConnected] = useState(false);
  const [myobLoading, setMyobLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await get("/myob/settings");
      if (res.success) {
        setMyobConnected(res.data.connected);
        setMyobFileId(res.data.company_file_id || "");
        setMyobFileName(res.data.company_file_name || "");
      }
      setMyobLoading(false);
    })();
  }, [get]);

  const handleUpdateGST = async (e) => {
    e.preventDefault();
    const rate = Number(gstRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Please enter a valid GST rate between 0 and 100"); return; }
    const result = await patch("/user/gst", { gst_rate: rate });
    if (result.success) { updateUser({ gst_rate: rate }); toast.success("GST rate updated"); }
    else toast.error(result.error);
  };

  const handleUpdateTrade = async (value) => {
    setTradeType(value);
    const result = await patch("/user/trade", { trade_type: value });
    if (result.success) { updateUser({ trade_type: value }); toast.success("Trade type updated"); }
    else toast.error(result.error);
  };

  const handleSaveMyob = async (e) => {
    e.preventDefault();
    if (!myobKey) { toast.error("Please enter your MYOB API key"); return; }
    const payload = { api_key: myobKey };
    if (myobFileId) payload.company_file_id = myobFileId;
    if (myobFileName) payload.company_file_name = myobFileName;
    const res = await post("/myob/settings", payload);
    if (res.success) { toast.success("MYOB settings saved"); setMyobConnected(true); setMyobKey(""); }
    else toast.error(res.error || "Failed to save MYOB settings");
  };

  const trialBadge = (() => {
    if (user?.plan_status === "trialing" && user?.trial_ends_at) {
      try {
        const ended = new Date(user.trial_ends_at) < new Date();
        if (ended) return <PremiumBadge tone="amber" icon={<AlertTriangle className="h-3 w-3" />}>Trial ended</PremiumBadge>;
        const days = Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000));
        return <PremiumBadge tone="sky">Trial · {days} day{days !== 1 ? "s" : ""} left</PremiumBadge>;
      } catch { return null; }
    }
    if (user?.plan_status === "paid") return <PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Paid</PremiumBadge>;
    if (!user?.plan) return <PremiumBadge tone="amber">No plan</PremiumBadge>;
    return null;
  })();

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<SettingsIcon className="h-7 w-7" />}
          eyebrow={<><SettingsIcon className="h-3 w-3" /> Configuration</>}
          title="Settings"
          subtitle="Configure your trade workspace, business profile, accounting and account security."
        />

        {/* Account Info */}
        <PremiumCard
          icon={<Building2 className="h-4 w-4" />}
          title="Account information"
          subtitle="Your account details and subscription"
          actions={trialBadge}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#7d8ba3]">Name</p>
              <p className="text-[14px] text-[#0d1b34] font-semibold mt-1">{user?.name}</p>
            </div>
            <div className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#7d8ba3]">Email</p>
              <p className="text-[14px] text-[#0d1b34] font-semibold mt-1">{user?.email}</p>
            </div>
            <div className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#7d8ba3]">Business name</p>
              <p className="text-[14px] text-[#0d1b34] font-semibold mt-1">{user?.business_name || "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#7d8ba3]">Plan</p>
              <p className="text-[14px] text-[#0d1b34] font-semibold mt-1 capitalize">{user?.plan || "No plan"}</p>
              {!user?.plan && <Link to="/plans" className="px-link text-[12px]">Choose a plan →</Link>}
            </div>
          </div>
        </PremiumCard>

        {/* Trade type */}
        <PremiumFormSection title="Trade type" subtitle="Helps customise job types and quote/invoice templates.">
          <select value={tradeType} onChange={(e) => handleUpdateTrade(e.target.value)} className="px-select max-w-md" data-testid="trade-type-select">
            {TRADE_TYPES.map((trade) => (<option key={trade.value} value={trade.value}>{trade.label}</option>))}
          </select>
        </PremiumFormSection>

        {/* GST */}
        <PremiumFormSection title="Tax settings" subtitle="Default GST rate applied to new invoices. NZ standard is 15%.">
          <form onSubmit={handleUpdateGST} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 max-w-[200px]">
              <label className="px-field__label">Default GST rate (%)</label>
              <input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} min="0" max="100" step="0.5" className="px-input" data-testid="gst-rate-input" />
            </div>
            <PremiumButton type="submit" disabled={loading} dataTestId="save-gst-button">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving…</span></> : "Save"}
            </PremiumButton>
          </form>
        </PremiumFormSection>

        {/* MYOB */}
        {isFeatureEnabled("myob") ? (
          <PremiumCard
            icon={<RefreshCw className="h-4 w-4" />}
            title="MYOB integration"
            subtitle="Sync invoices and payment status with MYOB"
            actions={myobConnected ? <PremiumBadge tone="green" icon={<ShieldCheck className="h-3 w-3" />}>Connected</PremiumBadge> : <PremiumBadge tone="slate">Not connected</PremiumBadge>}
          >
            {myobLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#1d4ed8]" /></div>
            ) : (
              <form onSubmit={handleSaveMyob} className="space-y-4 max-w-lg">
                <div>
                  <label className="px-field__label">MYOB API key</label>
                  <input type="password" value={myobKey} onChange={(e) => setMyobKey(e.target.value)} placeholder={myobConnected ? "••••••••" : "Enter MYOB API key"} className="px-input" data-testid="myob-api-key-input" />
                </div>
                <div>
                  <label className="px-field__label">Company file name (optional)</label>
                  <input value={myobFileName} onChange={(e) => setMyobFileName(e.target.value)} placeholder="e.g. My Business Pty Ltd" className="px-input" data-testid="myob-company-name-input" />
                </div>
                <div>
                  <label className="px-field__label">Company file ID (optional)</label>
                  <input value={myobFileId} onChange={(e) => setMyobFileId(e.target.value)} placeholder="e.g. cf-12345" className="px-input" data-testid="myob-file-id-input" />
                </div>
                <PremiumButton type="submit" disabled={loading} dataTestId="save-myob-button">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving…</span></> : myobConnected ? "Update connection" : "Connect MYOB"}
                </PremiumButton>
                <p className="text-[11.5px] text-[#7d8ba3]">Once connected, invoices can be synced from the invoice detail page.</p>
              </form>
            )}
          </PremiumCard>
        ) : (
          <PremiumCard icon={<Lock className="h-4 w-4" />} title="MYOB integration" subtitle="Available on Pro add-on and Enterprise" actions={<PremiumBadge tone="amber">Upgrade required</PremiumBadge>}>
            <PremiumButton variant="secondary" iconLeft={<ArrowUpRight className="h-4 w-4" />}>
              <Link to="/plans" data-testid="myob-upgrade-link">View plans</Link>
            </PremiumButton>
          </PremiumCard>
        )}

        {/* Help & Legal */}
        <PremiumCard icon={<FileText className="h-4 w-4" />} title="Help & legal" subtitle="Documents and account controls" data-testid="help-legal-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Link to="/privacy" className="px-row" data-testid="settings-privacy-link"><FileText className="h-4 w-4 text-[#5b6c87]" /><div className="px-row__main"><div className="px-row__title">Privacy policy</div></div></Link>
            <Link to="/terms" className="px-row" data-testid="settings-terms-link"><FileText className="h-4 w-4 text-[#5b6c87]" /><div className="px-row__main"><div className="px-row__title">Terms</div></div></Link>
            <Link to="/account-deletion" className="px-row" data-testid="settings-account-deletion-link"><FileText className="h-4 w-4 text-[#5b6c87]" /><div className="px-row__main"><div className="px-row__title">Account deletion</div></div></Link>
          </div>
        </PremiumCard>

        {/* Danger Zone */}
        <PremiumCard
          icon={<Trash2 className="h-4 w-4" />}
          title="Danger zone"
          subtitle="Permanent actions you can’t undo"
          className="!border-[#fecaca]"
          data-testid="delete-account-card"
        >
          <p className="text-[13px] text-[#5b6c87] mb-4">
            This permanently deletes your account, jobs, clients, invoices, quotes, team and associated data.
          </p>
          <Link to="/account-deletion">
            <PremiumButton variant="danger" iconLeft={<Trash2 className="h-4 w-4" />} dataTestId="delete-account-button">Delete account</PremiumButton>
          </Link>
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
