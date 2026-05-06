import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Plug, Database, ShieldCheck, AlertTriangle, CheckCircle2, ArrowUpRight, RefreshCw, Sparkles } from "lucide-react";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumBadge
} from "../components/premium";

const INVOICE_MODES = [
  { value: "churvox_only", label: "Churvox invoices only", description: "Use Churvox to create, send, and track invoices without MYOB." },
  { value: "myob_sync", label: "Sync Churvox invoices to MYOB", description: "Create in Churvox, then sync approved invoices to MYOB for accounting and reconciliation.", recommended: true },
  { value: "myob_external", label: "MYOB is invoice source of truth", description: "Create official invoices in MYOB and sync invoice / payment status back into Churvox." },
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { get, post } = useApi();
  const [myob, setMyob] = useState(null);
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => {
    (async () => {
      const [myobRes, accountingRes] = await Promise.all([get("/myob/settings"), get("/accounting/settings")]);
      if (myobRes?.success || accountingRes?.success) {
        setMyob({ ...(myobRes?.data || {}), ...(accountingRes?.data || {}) });
      } else {
        setMyob({ connected: false, invoice_mode: "churvox_only", myob_plan_allowed: false, myob_status: "upgrade_required" });
      }
    })();
  }, [get]);

  const canUseMyob = Boolean(myob?.myob_plan_allowed);
  const isConnected = Boolean(myob?.myob_connected ?? myob?.connected);
  const mode = myob?.invoice_mode || "churvox_only";
  const isUpgrade = myob?.myob_status === "upgrade_required" || !canUseMyob;

  const saveMode = async (invoice_mode) => {
    setSavingMode(true);
    const res = await post("/accounting/settings", { invoice_mode });
    if (res?.success) {
      setMyob((prev) => ({ ...(prev || {}), ...(res.data || {}) }));
      toast.success("Invoice handling updated");
    } else {
      toast.error(res?.error || "Could not update invoice mode");
    }
    setSavingMode(false);
  };

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<Plug className="h-7 w-7" />}
          eyebrow={<><Database className="h-3 w-3" /> Integrations</>}
          title="MYOB & Integrations"
          subtitle="Accounting sync setup, sync health and plan-based access — keep Churvox and your financial books in step."
        />

        <PremiumCard title="Account & plan" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-4 py-3">
              <p className="text-[11px] font-bold uppercase text-[#7d8ba3] tracking-wide">Current plan</p>
              <p className="text-[16px] font-bold text-[#0d1b34] mt-1 capitalize">{user?.plan || "Solo"}</p>
            </div>
            <div className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-4 py-3">
              <p className="text-[11px] font-bold uppercase text-[#7d8ba3] tracking-wide">MYOB availability</p>
              <div className="mt-1">
                {isUpgrade ? <PremiumBadge tone="amber" icon={<AlertTriangle className="h-3 w-3" />}>Upgrade required</PremiumBadge>
                          : <PremiumBadge tone="green" icon={<CheckCircle2 className="h-3 w-3" />}>Available</PremiumBadge>}
              </div>
            </div>
            <div className="rounded-2xl border border-[#e6eef9] bg-[#f6faff] px-4 py-3">
              <p className="text-[11px] font-bold uppercase text-[#7d8ba3] tracking-wide">Connection</p>
              <div className="mt-1">
                {isConnected ? <PremiumBadge tone="green" icon={<CheckCircle2 className="h-3 w-3" />}>Connected</PremiumBadge>
                            : <PremiumBadge tone="slate">Setup required</PremiumBadge>}
              </div>
            </div>
          </div>
          {isUpgrade && (
            <div className="mt-4">
              <PremiumButton onClick={() => navigate("/plans")} iconLeft={<ArrowUpRight className="h-4 w-4" />}>View plans</PremiumButton>
            </div>
          )}
        </PremiumCard>

        <PremiumCard title="Invoice handling" icon={<Database className="h-4 w-4" />} subtitle="Choose how invoices flow between Churvox and MYOB">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {INVOICE_MODES.map((item) => {
              const disabled = item.value !== "churvox_only" && isUpgrade;
              const active = mode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={disabled || savingMode}
                  onClick={() => saveMode(item.value)}
                  className={`text-left rounded-2xl p-5 transition border ${active ? "border-[#1d4ed8] bg-[#eff4ff] shadow-md" : "border-[#e6eef9] bg-white hover:border-[#c7dcfb]"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#0d1b34]">{item.label}</p>
                      {item.recommended && <PremiumBadge tone="soft">Recommended</PremiumBadge>}
                    </div>
                    {active && <CheckCircle2 className="h-5 w-5 text-[#1d4ed8]" />}
                  </div>
                  <p className="text-[12.5px] text-[#5b6c87] mt-2">{item.description}</p>
                </button>
              );
            })}
          </div>
        </PremiumCard>

        <PremiumCard title="Sync activity" icon={<RefreshCw className="h-4 w-4" />} subtitle="Recent invoice sync events with MYOB">
          {!isConnected ? (
            <div className="text-center py-6">
              <p className="text-[13.5px] text-[#5b6c87]">Connect MYOB to start seeing live sync activity here.</p>
            </div>
          ) : (
            <p className="text-[13.5px] text-[#5b6c87]">Real-time sync status appears on each invoice. Use Invoices to retry failed syncs or review last sync timestamps.</p>
          )}
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
