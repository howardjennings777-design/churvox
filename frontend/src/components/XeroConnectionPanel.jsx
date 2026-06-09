import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import API_BASE from "../lib/apiBase";

const defaultSettings = {
  invoice_sync_enabled: false,
  contact_sync_enabled: false,
  payment_sync_enabled: false,
  payroll_handoff_enabled: false,
  approval_required: true,
};

function asBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export default function XeroConnectionPanel({ compact = false }) {
  const api = useApi();
  const [status, setStatus] = React.useState({
    configured: false,
    addon_active: false,
    connected: false,
    connection: {},
    settings: defaultSettings,
  });
  const [settings, setSettings] = React.useState(defaultSettings);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [showRules, setShowRules] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    setLoading(true);
    const endpoints = ["/xero/status", "/integrations/xero/status"];
    let result = null;

    for (const endpoint of endpoints) {
      result = await api.get(endpoint);
      if (result?.success) break;
    }

    if (result?.success) {
      const body = result.data?.data || result.data || {};
      const nextSettings = { ...defaultSettings, ...(body.settings || {}) };
      setStatus({
        configured: asBool(body.configured),
        addon_active: asBool(body.addon_active),
        connected: asBool(body.connected),
        connection: body.connection || {},
        settings: nextSettings,
      });
      setSettings(nextSettings);
    }

    setLoading(false);
  }, [api]);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const saveSettings = async () => {
    setBusy(true);
    const endpoints = ["/xero/settings", "/integrations/xero/settings"];
    let result = null;

    for (const endpoint of endpoints) {
      result = await api.post(endpoint, settings);
      if (result?.success) break;
    }

    if (result?.success) {
      toast.success("Xero sync settings saved");
      await loadStatus();
    } else {
      toast.error(result?.error || "Could not save Xero settings");
    }

    setBusy(false);
  };

  const connectXero = () => {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = `${API_BASE}/api/xero/connect?return_to=${returnTo}`;
  };

  const disconnectXero = async () => {
    setBusy(true);
    const endpoints = ["/xero/disconnect", "/integrations/xero/disconnect"];
    let result = null;

    for (const endpoint of endpoints) {
      result = await api.post(endpoint, {});
      if (result?.success) break;
    }

    if (result?.success) {
      toast.success("Xero disconnected");
      await loadStatus();
    } else {
      toast.error(result?.error || "Could not disconnect Xero");
    }

    setBusy(false);
  };

  const toggleSetting = (key) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className={`xeroConnectionPanel ${compact ? "xeroConnectionPanelCompact" : ""}`}>
      <div className="xeroPanelHeader">
        <div>
          <p className="xeroEyebrow">Xero connection</p>
          <h2>Xero sync</h2>
          <p className="xeroPanelIntro">Connect Xero after the Render environment variables are added.</p>
        </div>
        <button type="button" className="xeroRuleButton" onClick={() => setShowRules((value) => !value)}>
          {showRules ? "Hide sync rules" : "Show sync rules"}
        </button>
      </div>

      <div className="xeroStatusGrid">
        <div className="xeroStatusCard">
          <span>Add-on billing</span>
          <strong>{status.addon_active ? "Active" : "Not active"}</strong>
        </div>
        <div className="xeroStatusCard">
          <span>Developer setup</span>
          <strong>{status.configured ? "Ready" : "Missing Render env"}</strong>
        </div>
        <div className="xeroStatusCard">
          <span>Xero connection</span>
          <strong>{status.connected ? "Connected" : "Not connected"}</strong>
        </div>
      </div>

      {!status.configured && (
        <div className="xeroWarning">Render needs XERO_CLIENT_ID, XERO_CLIENT_SECRET and XERO_REDIRECT_URI before Connect Xero can work.</div>
      )}

      <div className="xeroActions">
        <button type="button" onClick={connectXero} disabled={!status.configured || busy || loading}>
          {status.connected ? "Reconnect Xero" : "Connect Xero"}
        </button>
        <button type="button" onClick={saveSettings} disabled={busy || loading}>Save sync settings</button>
        <button type="button" onClick={disconnectXero} disabled={!status.connected || busy || loading}>Disconnect Xero</button>
      </div>

      <div className="xeroSettingsGrid">
        <label>
          <input type="checkbox" checked={!!settings.invoice_sync_enabled} onChange={() => toggleSetting("invoice_sync_enabled")} />
          <span>Only approved invoices are staged.</span>
        </label>
        <label>
          <input type="checkbox" checked={!!settings.payment_sync_enabled} onChange={() => toggleSetting("payment_sync_enabled")} />
          <span>Payment status can be pulled back when connected.</span>
        </label>
        <label>
          <input type="checkbox" checked={!!settings.approval_required} onChange={() => toggleSetting("approval_required")} />
          <span>Keep owner approval required.</span>
        </label>
      </div>

      {showRules && (
        <div className="xeroRulesBox">
          <strong>Sync rules</strong>
          <p>Churvox prepares the work first. The owner approves before it is sent or staged.</p>
        </div>
      )}

      <div className="xeroSafetyNote">
        <strong>Payroll safety</strong>
        <span>Payroll remains a review and handoff workflow.</span>
      </div>
    </section>
  );
}
