import churvoxLogoIcon from "../assets/churvox-logo-icon.svg";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  FileText,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCircle2
} from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { TRADE_TYPES } from "@/lib/utils";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  PremiumPage,
  PremiumHero,
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumFormSection
} from "@/components/premium";

const titleCase = (value) => {
  const text = String(value || "").replaceAll("_", " ").trim();
  if (!text) return "Not set";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { patch, get, post, loading } = useApi();
  const navigate = useNavigate();
  const planLimits = usePlanLimits(user?.plan);

  const [gstRate, setGstRate] = useState(user?.gst_rate?.toString() || "15");
  const [tradeType, setTradeType] = useState(user?.trade_type || "other");
  const [myobKey, setMyobKey] = useState("");
  const [myobFileId, setMyobFileId] = useState("");
  const [myobFileName, setMyobFileName] = useState("");
  const [myobConnected, setMyobConnected] = useState(false);
  const [myobLoading, setMyobLoading] = useState(true);

  const features = useMemo(() => planLimits?.features || {}, [planLimits?.features]);

  const isFeatureEnabled = useCallback(
    (key) => {
      const k = String(key || "").trim().toLowerCase();
      if (k === "myob" || k === "myob_sync") return Boolean(features.myobSync);
      return Boolean(features[key]);
    },
    [features]
  );

  const loadMyobSettings = useCallback(async () => {
    setMyobLoading(true);
    const res = await get("/myob/settings");
    if (res.success) {
      setMyobConnected(Boolean(res.data?.connected));
      setMyobFileId(res.data?.company_file_id || "");
      setMyobFileName(res.data?.company_file_name || "");
    }
    setMyobLoading(false);
  }, [get]);

  useEffect(() => {
    loadMyobSettings();
  }, [loadMyobSettings]);

  const handleUpdateGST = async (e) => {
    e.preventDefault();
    const rate = Number(gstRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Please enter a valid GST rate between 0 and 100");
      return;
    }

    const result = await patch("/user/gst", { gst_rate: rate });
    if (result.success) {
      updateUser({ gst_rate: rate });
      toast.success("GST rate updated");
    } else {
      toast.error(result.error || "Could not update GST rate");
    }
  };

  const handleUpdateTrade = async (value) => {
    setTradeType(value);
    const result = await patch("/user/trade", { trade_type: value });
    if (result.success) {
      updateUser({ trade_type: value });
      toast.success("Trade type updated");
    } else {
      toast.error(result.error || "Could not update trade type");
    }
  };

  const handleSaveMyob = async (e) => {
    e.preventDefault();
    if (!myobKey) {
      toast.error("Please enter your MYOB API key");
      return;
    }

    const payload = { api_key: myobKey };
    if (myobFileId) payload.company_file_id = myobFileId;
    if (myobFileName) payload.company_file_name = myobFileName;

    const res = await post("/myob/settings", payload);
    if (res.success) {
      toast.success("MYOB settings saved");
      setMyobConnected(true);
      setMyobKey("");
    } else {
      toast.error(res.error || "Failed to save MYOB settings");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const trialBadge = useMemo(() => {
    if (user?.plan_status === "trialing" && user?.trial_ends_at) {
      try {
        const ended = new Date(user.trial_ends_at) < new Date();
        if (ended) {
          return (
            <PremiumBadge tone="amber" icon={<AlertTriangle className="h-3 w-3" />}>
              Trial ended
            </PremiumBadge>
          );
        }

        const days = Math.max(0, Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000));
        return (
          <PremiumBadge tone="sky">
            Trial · {days} day{days !== 1 ? "s" : ""} left
          </PremiumBadge>
        );
      } catch {
        return null;
      }
    }

    if (user?.plan_status === "paid") {
      return (
        <PremiumBadge tone="teal" icon={<ShieldCheck className="h-3 w-3" />}>
          Paid
        </PremiumBadge>
      );
    }

    if (!user?.plan) return <PremiumBadge tone="amber">No plan</PremiumBadge>;
    return null;
  }, [user?.plan, user?.plan_status, user?.trial_ends_at]);

  const selectedTrade = TRADE_TYPES.find((x) => x.value === tradeType)?.label || "Other";
  const myobAllowed = isFeatureEnabled("myob");
  const missingBusinessName = !String(user?.business_name || "").trim();
  const missingTrade = !tradeType || tradeType === "other";
  const missingGst = gstRate === "" || Number.isNaN(Number(gstRate));
  const setupIssues = [missingBusinessName, missingTrade, missingGst, myobAllowed && !myobConnected].filter(Boolean).length;
  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<SettingsIcon className="h-7 w-7" />}
          eyebrow={
            <>
              <ShieldCheck className="h-3 w-3" /> Business setup
            </>
          }
          title="Settings"
          subtitle="Manage your business profile, GST, MYOB, legal links and account controls in one clean workspace."
          actions={
            <>
              <PremiumButton variant="secondary" onClick={() => navigate("/dashboard")} iconLeft={<Sparkles className="h-4 w-4" />}>
                Smart Hub
              </PremiumButton>
              <PremiumButton variant="secondary" onClick={handleLogout} iconLeft={<LogOut className="h-4 w-4" />}>
                Log out
              </PremiumButton>
            </>
          }
        >
          <div className="mt-4 flex flex-wrap gap-2">
            <PremiumBadge tone="sky">Plan: {titleCase(user?.plan || "No plan")}</PremiumBadge>
            <PremiumBadge tone="slate">Role: {titleCase(user?.role || "Owner")}</PremiumBadge>
            <PremiumBadge tone="slate">GST: {gstRate || 15}%</PremiumBadge>
            <PremiumBadge tone="slate">Trade: {selectedTrade}</PremiumBadge>
            {trialBadge}
          </div>
        </PremiumHero>

        <PremiumCard
          icon={<UserCircle2 className="h-4 w-4" />}
          title="Account information"
          subtitle="Your profile, business details and current access."
          actions={trialBadge}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Name", user?.name || "Not set"],
              ["Email", user?.email || "Not set"],
              ["Business name", user?.business_name || "Not set"],
              ["Plan", user?.plan || "No plan"],
              ["Role", titleCase(user?.role || "Owner")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#d8e3f3] bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">{label}</p>
                <p className="mt-1 break-words text-[14px] font-semibold text-[#0d1b34]">{value}</p>
                {label === "Plan" && !user?.plan ? (
                  <button
                    type="button"
                    onClick={() => navigate("/plans")}
                    className="mt-1 text-[12px] font-semibold text-[#1d4ed8] hover:text-[#1e40af]"
                  >
                    Choose a plan →
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumFormSection title="Business setup" subtitle="This helps AI tailor job types, quote wording and invoice descriptions.">
          <div className="max-w-md">
            <label className="px-field__label">Trade type</label>
            <select value={tradeType} onChange={(e) => handleUpdateTrade(e.target.value)} className="px-select" data-testid="trade-type-select">
              {TRADE_TYPES.map((trade) => (
                <option key={trade.value} value={trade.value}>
                  {trade.label}
                </option>
              ))}
            </select>
          </div>
        </PremiumFormSection>

        <PremiumFormSection title="Tax and invoices" subtitle="Default GST rate applied to new invoices. NZ standard is 15%.">
          <form onSubmit={handleUpdateGST} className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
            <div className="w-full max-w-[220px]">
              <label className="px-field__label">Default GST rate (%)</label>
              <input
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                min="0"
                max="100"
                step="0.5"
                className="px-input"
                data-testid="gst-rate-input"
              />
            </div>
            <PremiumButton type="submit" disabled={loading} dataTestId="save-gst-button">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                "Save GST"
              )}
            </PremiumButton>
          </form>
          <p className="mt-2 text-xs text-[#64748b]">Used when AI prepares invoice drafts and customer-facing totals.</p>
        </PremiumFormSection>

        {myobAllowed ? (
          <PremiumCard
            icon={<RefreshCw className="h-4 w-4" />}
            title="MYOB integration"
            subtitle="Sync approved invoices and payment status with MYOB. Sync actions remain controlled."
            actions={
              myobConnected ? (
                <PremiumBadge tone="teal" icon={<ShieldCheck className="h-3 w-3" />}>
                  Connected
                </PremiumBadge>
              ) : (
                <PremiumBadge tone="slate">Not connected</PremiumBadge>
              )
            }
          >
            {myobLoading ? (
              <div className="flex items-center justify-center py-5">
                <Loader2 className="h-5 w-5 animate-spin text-[#1d4ed8]" />
              </div>
            ) : (
              <form onSubmit={handleSaveMyob} className="max-w-lg space-y-4">
                <div>
                  <label className="px-field__label">MYOB API key</label>
                  <input
                    type="password"
                    value={myobKey}
                    onChange={(e) => setMyobKey(e.target.value)}
                    placeholder={myobConnected ? "••••••••" : "Enter MYOB API key"}
                    className="px-input"
                    data-testid="myob-api-key-input"
                  />
                </div>
                <div>
                  <label className="px-field__label">Company file name (optional)</label>
                  <input
                    value={myobFileName}
                    onChange={(e) => setMyobFileName(e.target.value)}
                    placeholder="e.g. My Business Ltd"
                    className="px-input"
                    data-testid="myob-company-name-input"
                  />
                </div>
                <div>
                  <label className="px-field__label">Company file ID (optional)</label>
                  <input
                    value={myobFileId}
                    onChange={(e) => setMyobFileId(e.target.value)}
                    placeholder="e.g. cf-12345"
                    className="px-input"
                    data-testid="myob-file-id-input"
                  />
                </div>
                <PremiumButton type="submit" disabled={loading} dataTestId="save-myob-button">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : myobConnected ? (
                    "Update MYOB"
                  ) : (
                    "Connect MYOB"
                  )}
                </PremiumButton>
                <p className="text-[11.5px] text-[#64748b]">
                  <img className="churvox-logo-force" src={churvoxLogoIcon} alt="Churvox" /> Churvox should only sync approved accounting actions. AI never writes to MYOB without the allowed workflow.
                </p>
              </form>
            )}
          </PremiumCard>
        ) : (
          <PremiumCard
            icon={<Lock className="h-4 w-4" />}
            title="MYOB integration"
            subtitle="MYOB is available as a Pro add-on and included on Enterprise."
            actions={<PremiumBadge tone="amber">Upgrade required</PremiumBadge>}
          >
            <PremiumButton variant="secondary" iconLeft={<ArrowUpRight className="h-4 w-4" />} onClick={() => navigate("/plans")}>
              View plans
            </PremiumButton>
          </PremiumCard>
        )}

        <PremiumCard icon={<ShieldCheck className="h-4 w-4" />} title="Security & account" subtitle="Legal links, session controls and account settings." data-testid="help-legal-card">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Link to="/privacy" className="px-row" data-testid="settings-privacy-link">
              <FileText className="h-4 w-4 text-[#1d4ed8]" />
              <div className="px-row__main">
                <div className="px-row__title">Privacy policy</div>
              </div>
            </Link>
            <Link to="/terms" className="px-row" data-testid="settings-terms-link">
              <FileText className="h-4 w-4 text-[#1d4ed8]" />
              <div className="px-row__main">
                <div className="px-row__title">Terms</div>
              </div>
            </Link>
            <Link to="/account-deletion" className="px-row" data-testid="settings-account-deletion-link">
              <FileText className="h-4 w-4 text-[#1d4ed8]" />
              <div className="px-row__main">
                <div className="px-row__title">Account deletion</div>
              </div>
            </Link>
          </div>

          <div className="mt-4">
            <PremiumButton variant="secondary" iconLeft={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
              Log out
            </PremiumButton>
          </div>
        </PremiumCard>

        <PremiumCard
          icon={<Trash2 className="h-4 w-4" />}
          title="Danger zone"
          subtitle="Permanent actions you cannot undo."
          className="!border-[#fecaca]"
          data-testid="delete-account-card"
        >
          <p className="mb-4 text-[13px] text-[#64748b]">
            This permanently deletes your account, jobs, clients, invoices, quotes, team and associated data.
          </p>
          <PremiumButton variant="danger" iconLeft={<Trash2 className="h-4 w-4" />} onClick={() => navigate("/account-deletion")} dataTestId="delete-account-button">
            Delete account
          </PremiumButton>
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
