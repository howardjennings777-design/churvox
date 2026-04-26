import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

export default function IntegrationsPage() {
  const { get } = useApi();
  const [myob, setMyob] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await get("/myob/settings");
      if (res?.success) setMyob(res.data || {});
      else setMyob({ connected: false });
    })();
  }, [get]);

  return (
    <Layout>
      <div className="cx-page">
        <div className="cx-page-hero">
          <h1 className="cx-page-title">MYOB / Integrations</h1>
          <p className="cx-page-subtitle">Accounting sync setup, sync health, and plan-based access at a glance.</p>
        </div>
        <div className="cx-panel p-5 space-y-3">
          <p className="text-sm text-slate-700">Connection status: <span className={`cx-status-badge ${myob?.connected ? "status-completed" : "status-overdue"}`}>{myob?.connected ? "Connected" : "Not connected"}</span></p>
          <p className="text-sm text-slate-700">Customers sync: <span className={`cx-status-badge ${myob?.customers_sync_enabled ? "status-completed" : "status-pending"}`}>{myob?.customers_sync_enabled ? "Enabled" : "Setup Required"}</span></p>
          <p className="text-sm text-slate-700">Invoice sync: <span className={`cx-status-badge ${myob?.invoice_sync_enabled ? "status-completed" : "status-assigned"}`}>{myob?.invoice_sync_enabled ? "Enabled" : "Coming Soon"}</span></p>
          <p className="text-sm text-slate-700">Payment sync: <span className={`cx-status-badge ${myob?.payment_sync_enabled ? "status-completed" : "status-assigned"}`}>{myob?.payment_sync_enabled ? "Enabled" : "Coming Soon"}</span></p>
          <p className="text-xs text-slate-500">Plan gating: Solo/Team no MYOB. Pro optional add-on. Enterprise included.</p>
        </div>
      </div>
    </Layout>
  );
}
