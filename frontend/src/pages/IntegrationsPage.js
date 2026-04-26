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
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">MYOB / Integrations</h1>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <p className="text-sm text-slate-600">Connection status: <span className="font-semibold text-slate-900">{myob?.connected ? "Connected" : "Not connected"}</span></p>
          <p className="text-sm text-slate-600">Customers sync: <span className="text-slate-900">{myob?.customers_sync_enabled ? "Enabled" : "Setup Required"}</span></p>
          <p className="text-sm text-slate-600">Invoice sync: <span className="text-slate-900">{myob?.invoice_sync_enabled ? "Enabled" : "Coming Soon"}</span></p>
          <p className="text-sm text-slate-600">Payment sync: <span className="text-slate-900">{myob?.payment_sync_enabled ? "Enabled" : "Coming Soon"}</span></p>
          <p className="text-xs text-slate-500">Plan gating: Solo/Team no MYOB. Pro optional add-on. Enterprise included.</p>
        </div>
      </div>
    </Layout>
  );
}
