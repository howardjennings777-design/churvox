import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const { user, normalizedRole } = useAuth();
  const { get, post } = useApi();
  const [myob, setMyob] = useState({});
  const [bannerError, setBannerError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectingOauth, setConnectingOauth] = useState(false);
  const [myobForm, setMyobForm] = useState({ company_file_id: "", company_file_name: "" });

  const isManagerRole = useMemo(
    () => ["owner", "admin", "manager", "office_admin", "employer"].includes(String(normalizedRole || user?.role || "").toLowerCase()),
    [normalizedRole, user?.role],
  );

  const loadMyob = useCallback(async () => {
    setRefreshing(true);
    setBannerError("");
    setAccessDenied(false);
    const [statusRes, settingsRes] = await Promise.allSettled([get("/myob/status"), get("/myob/settings")]);
    const errors = [];
    const statusData = statusRes.status === "fulfilled" ? statusRes.value?.data || {} : {};
    const settingsData = settingsRes.status === "fulfilled" ? settingsRes.value?.data || {} : {};
    if ((statusRes.status === "fulfilled" && !statusRes.value?.success) || (settingsRes.status === "fulfilled" && !settingsRes.value?.success)) {
      const err = statusRes.value?.error || settingsRes.value?.error || "";
      if (String(err).toLowerCase().includes("403") || String(err).toLowerCase().includes("not authorized")) setAccessDenied(true);
      errors.push(err || "Could not load one or more MYOB endpoints.");
    }
    if (statusRes.status === "rejected" || settingsRes.status === "rejected") errors.push("Could not load one or more MYOB endpoints.");
    if (errors.length) setBannerError(errors[0]);
    const merged = { ...settingsData, ...statusData };
    setMyob(merged || {});
    setMyobForm({
      company_file_id: merged?.company_file_id || "",
      company_file_name: merged?.company_file_name || "",
    });
    setLastUpdated(new Date());
    setRefreshing(false);
  }, [get]);

  useEffect(() => { loadMyob(); }, [loadMyob]);

  const plan = String(myob?.plan || user?.plan || "solo").toLowerCase();
  const canUseMyob = Boolean(myob?.plan_allowed ?? myob?.myob_plan_allowed ?? myob?.enabled);
  const connected = Boolean(myob?.connected);
  const status = String(myob?.status || myob?.myob_status || (myob?.not_configured ? "not_configured" : connected ? "connected" : "not_connected"));
  const saveMyobSettings = async () => {
    setSavingSettings(true);
    const r = await post("/myob/settings", myobForm);
    if (r?.success) {
      toast.success("MYOB settings saved");
      await loadMyob();
    } else toast.error(r?.error || "Could not save settings");
    setSavingSettings(false);
  };
  const testConnection = async () => {
    setTestingConnection(true);
    const r = await post("/myob/test-connection", {});
    if (r?.success) toast.success("MYOB connection is healthy");
    else toast.warning(r?.not_configured ? "MYOB OAuth is not configured yet." : (r?.error || "Not configured"));
    setTestingConnection(false);
  };
  const connectMyob = async () => {
    setConnectingOauth(true);
    const r = await get("/myob/oauth/start");
    const data = r?.data || {};
    if (!r?.success || data?.not_configured || r?.not_configured) {
      toast.warning("MYOB OAuth is not configured yet.");
    } else {
      const url = data?.authorization_url || data?.url || data?.auth_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.warning("MYOB OAuth is not configured yet.");
    }
    setConnectingOauth(false);
  };

  return (
    <Layout>
      <div className="cx-page">
        <div className="cx-page-hero">
          <h1 className="cx-page-title text-slate-950">Integrations</h1>
          <p className="cx-page-subtitle text-slate-700">Connect accounting and workflow tools without losing Churvox as your source of truth.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={loadMyob} disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh"}</button>
            <p className="text-sm text-slate-700">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "Not loaded yet"}</p>
          </div>
        </div>
        {bannerError ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{bannerError}</div> : null}
        {accessDenied ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Access denied. You need owner, admin, or manager access to manage MYOB integrations.</div> : null}
        <div className="cx-panel rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">MYOB status</h2>
          <p className="text-sm text-slate-800">Status: <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{status === "sync_error" ? "Sync error" : status === "connected" ? "Connected" : status === "not_configured" ? "Not configured" : "Not connected"}</span></p>
          <p className="text-sm text-slate-800">Provider configured: {myob?.configured ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-800">Connected: {connected ? "Yes" : "No"}</p>
          <p className="text-sm text-slate-800">Company file ID: {myob?.company_file_id || "—"}</p>
          <p className="text-sm text-slate-800">Company file name: {myob?.company_file_name || "—"}</p>
          <p className="text-sm text-slate-800">Last sync time: {myob?.last_sync_at || myob?.last_sync_time || "Never"}</p>
          {myob?.error ? <p className="text-sm font-semibold text-red-700">Last error: {myob.error}</p> : null}
        </div>
        <div className="cx-panel mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Plan rules</h2>
          <p className="text-sm text-slate-800">Solo: MYOB unavailable</p>
          <p className="text-sm text-slate-800">Team: MYOB unavailable</p>
          <p className="text-sm text-slate-800">Pro: optional MYOB add-on</p>
          <p className="text-sm text-slate-800">Enterprise: MYOB included</p>
          <p className="text-sm text-slate-800">Current plan: <span className="font-semibold uppercase">{plan}</span></p>
          <p className="text-sm text-slate-800">MYOB available on this plan: {canUseMyob ? "Yes" : "No"}</p>
          {!canUseMyob ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">MYOB is locked on this plan.</div> : null}
        </div>
        <div className="cx-panel mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">MYOB settings</h2>
          <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900" placeholder="Company file ID" value={myobForm.company_file_id} onChange={(e)=>setMyobForm((s)=>({...s, company_file_id:e.target.value}))} />
          <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900" placeholder="Company file name" value={myobForm.company_file_name} onChange={(e)=>setMyobForm((s)=>({...s, company_file_name:e.target.value}))} />
          <div className="flex gap-2">
            <button className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-slate-900 font-semibold disabled:cursor-not-allowed" onClick={saveMyobSettings} disabled={!isManagerRole || savingSettings}>{savingSettings ? "Saving..." : "Save settings"}</button>
            <button className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-slate-900 font-semibold disabled:cursor-not-allowed" onClick={testConnection} disabled={!isManagerRole || testingConnection}>{testingConnection ? "Testing..." : "Test connection"}</button>
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold disabled:cursor-not-allowed" onClick={connectMyob} disabled={!isManagerRole || connectingOauth}>{connectingOauth ? "Connecting..." : "Connect MYOB"}</button>
          </div>
        </div>
        <div className="cx-panel mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold text-slate-950">Internal invoice coexistence</h2>
          <p className="text-sm text-slate-800">Churvox invoices stay internal unless you choose to sync a selected invoice to MYOB.</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Internal Churvox invoices continue working when MYOB is off.</li>
            <li>MYOB sync is manual and approval-first.</li>
            <li>Payment status pull is manual.</li>
            <li>No background MYOB sync runs without approval.</li>
          </ul>
        </div>
        <div className="cx-panel mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <h2 className="text-lg font-semibold text-slate-950">Sync safety checklist</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>No auto-sync</li>
            <li>No background accounting changes</li>
            <li>No secrets shown in browser</li>
            <li>Selected invoice sync only</li>
            <li>Manual payment-status pull only</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
