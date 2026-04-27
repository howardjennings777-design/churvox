import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const INVOICE_MODES = [
  {
    value: "churvox_only",
    label: "Churvox invoices only",
    description: "Use Churvox to create, send, and track invoices without MYOB.",
  },
  {
    value: "myob_sync",
    label: "Sync Churvox invoices to MYOB",
    description: "Create invoices in Churvox, then sync approved invoices to MYOB for accounting and reconciliation.",
    recommended: true,
  },
  {
    value: "myob_external",
    label: "MYOB is invoice source of truth",
    description: "Create official invoices in MYOB and sync invoice/payment status back into Churvox.",
  },
];

export default function IntegrationsPage() {
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
      <div className="cx-page">
        <div className="cx-page-hero">
          <h1 className="cx-page-title">MYOB / Integrations</h1>
          <p className="cx-page-subtitle">Accounting sync setup, sync health, and plan-based access at a glance.</p>
        </div>
        <div className="cx-panel p-5 space-y-4">
          <p className="text-sm text-slate-700">Plan: <span className="font-semibold uppercase">{user?.plan || "solo"}</span></p>
          <p className="text-sm text-slate-700">MYOB availability: <span className={`cx-status-badge ${isUpgrade ? "status-overdue" : "status-completed"}`}>{isUpgrade ? "Upgrade required" : "Available"}</span></p>
          <p className="text-sm text-slate-700">Connection status: <span className={`cx-status-badge ${isConnected ? "status-completed" : "status-pending"}`}>{isConnected ? "Connected" : "Setup required"}</span></p>
          <p className="text-xs text-slate-500">MYOB available on Pro add-on and Enterprise.</p>
        </div>

        <div className="cx-panel mt-4 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Invoice handling</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {INVOICE_MODES.map((item) => {
              const disabled = item.value !== "churvox_only" && isUpgrade;
              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={disabled || savingMode}
                  onClick={() => saveMode(item.value)}
                  className={`text-left border rounded-xl p-4 transition ${mode === item.value ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <p className="font-semibold text-slate-900">{item.label} {item.recommended && <span className="text-xs text-blue-700">— Recommended</span>}</p>
                  <p className="text-xs text-slate-600 mt-2">{item.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
