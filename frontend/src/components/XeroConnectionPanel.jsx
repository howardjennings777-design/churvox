import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

export default function XeroConnectionPanel({ compact = false }) {
  const api = useApi();
  const [status, setStatus] = React.useState(null);
  const [showRules, setShowRules] = React.useState(false);
  const [form, setForm] = React.useState({
    invoice_sync_enabled: false,
    contact_sync_enabled: false,
    payment_sync_enabled: false,
    payroll_handoff_enabled: false,
    approval_required: true,
    invoice_sync_rule: "Only sync invoices after owner approval.",
    contact_sync_rule: "Create/update Xero contacts from approved Churvox clients.",
    payment_sync_rule: "Pull payment status back for owner review.",
    payroll_handoff_rule: "Prepare approved hours/timesheets only. No bank payout, tax decision or government submission."
  });
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(async () => {
    const res = await api.get("/xero/status");
    if (res?.success) {
      const data = res.data || res;
      setStatus(data);
      setForm((old) => ({ ...old, ...(data.settings || {}) }));
    } else {
      setStatus({ configured: false, addon_active: false, connected: false });
    }
  }, [api]);

  React.useEffect(() => { load(); }, [load]);

  async function connect() {
    setBusy("connect");
    const res = await api.post("/xero/connect/start", {});
    setBusy("");
    const url = res?.data?.url || res?.url;
    if (res?.success && url) {
      window.location.href = url;
      return;
    }
    toast.error(res?.error || "Could not start Xero connection");
  }

  async function saveSettings() {
    setBusy("save");
    const res = await api.post("/xero/settings", form);
    setBusy("");
    if (res?.success) { toast.success("Xero settings saved"); load(); }
    else toast.error(res?.error || "Could not save Xero settings");
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Xero for this business?")) return;
    setBusy("disconnect");
    const res = await api.post("/xero/disconnect", {});
    setBusy("");
    if (res?.success) { toast.success("Xero disconnected"); load(); }
    else toast.error(res?.error || "Could not disconnect Xero");
  }

  const connection = status?.connection || {};
  const connectedName = first(connection.tenant_name, connection.tenantName, connection.tenant_id, "No Xero organisation selected");
  const configured = Boolean(status?.configured);
  const addonActive = Boolean(status?.addon_active);
  const connected = Boolean(status?.connected);
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const setupBlocked = !configured || !addonActive;

  return <section className={`xeroPanel ${compact ? "compact" : ""}`}>
    <style>{`
      .xeroPanel,.xeroPanel *{box-sizing:border-box;color-scheme:light}.xeroPanel{border-radius:30px;background:#fffaf0;border:1px solid rgba(15,23,42,.16);box-shadow:0 18px 46px rgba(2,6,23,.10);padding:22px;color:#111827;overflow:hidden}.xeroTop{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:start}.xeroPill{display:inline-flex;border-radius:999px;background:#111827;color:#fbbf24;padding:8px 12px;font-size:10px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.xeroPanel h2{margin:12px 0 0;font-size:34px;line-height:.95;letter-spacing:-.055em;color:#111827}.xeroIntro{max-width:820px;margin:10px 0 0;color:#334155;font-weight:900;line-height:1.55}.xeroStatusGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.xeroStat{border-radius:20px;background:#0b1018;color:white;border-left:6px solid #f97316;padding:14px;min-height:94px}.xeroStat b{display:block;color:#fbbf24;text-transform:uppercase;letter-spacing:.12em;font-size:10px}.xeroStat strong{display:block;margin-top:8px;font-size:17px;line-height:1.25;color:white}.xeroNotice{border-radius:20px;padding:15px 16px;font-weight:1000;line-height:1.5;margin:12px 0}.xeroNotice.warn{background:#451a03;color:#fed7aa}.xeroNotice.good{background:#14532d;color:#dcfce7}.xeroActions{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}.xeroActions button{border:0;border-radius:16px;padding:13px 16px;font-weight:1000;cursor:pointer}.xeroConnect{background:#22d3ee;color:#082f49}.xeroSave{background:#16a34a;color:#052e16}.xeroDisc{background:#fee2e2;color:#7f1d1d}.xeroAdvanced{background:#111827!important;color:white!important}.xeroActions button:disabled{opacity:.5;cursor:not-allowed}.xeroSimple{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.xeroSimple article{border-radius:20px;background:white;border:1px solid #ead4b6;padding:15px}.xeroSimple b{display:block;color:#431407;text-transform:uppercase;letter-spacing:.1em;font-size:11px}.xeroSimple p{margin:8px 0 0;color:#334155;font-weight:900;line-height:1.45}.xeroChecks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.xeroCheck{display:flex;align-items:flex-start;gap:10px;border:1px solid #ead4b6;background:white;border-radius:18px;padding:13px;font-weight:1000;color:#111827;line-height:1.35}.xeroCheck input{margin-top:2px;min-width:16px}.xeroRules{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.xeroRules label{display:grid;gap:7px;color:#431407;text-transform:uppercase;font-size:11px;font-weight:1000;letter-spacing:.1em}.xeroRules textarea{min-height:90px;border:2px solid #d6b98f;border-radius:16px;background:#fffdf7;color:#0f172a;padding:12px;font-size:14px;font-weight:850;text-transform:none;letter-spacing:0;resize:vertical}.xeroPayroll{margin-top:14px;border-radius:20px;background:#0b1018;color:white;border-left:7px solid #22d3ee;padding:16px}.xeroPayroll b{display:block;color:#fbbf24;text-transform:uppercase;font-size:10px;letter-spacing:.14em}.xeroPayroll p{color:#f8fafc;margin:8px 0 0;font-weight:900;line-height:1.45}.xeroHidden{display:none}@media(max-width:980px){.xeroTop,.xeroStatusGrid,.xeroSimple,.xeroChecks,.xeroRules{grid-template-columns:1fr}.xeroPanel{padding:18px}.xeroPanel h2{font-size:30px}.xeroActions button{width:100%}}
    `}</style>

    <div className="xeroTop">
      <div>
        <span className="xeroPill">Xero connection</span>
        <h2>Xero setup</h2>
        <p className="xeroIntro">Xero has two separate steps: the paid add-on, then the owner OAuth connection. Churvox never asks for a Xero password.</p>
      </div>
      <button className="xeroAdvanced" type="button" onClick={() => setShowRules((x) => !x)}>{showRules ? "Hide rules" : "Show sync rules"}</button>
    </div>

    <div className="xeroStatusGrid">
      <div className="xeroStat"><b>Add-on billing</b><strong>{addonActive ? "Active" : "Not active"}</strong></div>
      <div className="xeroStat"><b>Developer setup</b><strong>{configured ? "Render env ready" : "Missing Render env"}</strong></div>
      <div className="xeroStat"><b>Xero connection</b><strong>{connected ? `Connected: ${connectedName}` : "Not connected"}</strong></div>
    </div>

    {!configured ? <div className="xeroNotice warn">Render needs XERO_CLIENT_ID, XERO_CLIENT_SECRET and XERO_REDIRECT_URI before Connect Xero can work.</div> : null}
    {configured && !addonActive ? <div className="xeroNotice warn">Xero is not active on this plan yet. Add Xero from Plans first, then connect it here.</div> : null}
    {configured && addonActive && !connected ? <div className="xeroNotice warn">Xero add-on is active. Next step is owner connection through Xero OAuth.</div> : null}
    {configured && addonActive && connected ? <div className="xeroNotice good">Xero is connected. Churvox will still keep owner approval before sync.</div> : null}

    <div className="xeroActions">
      <button className="xeroConnect" disabled={!configured || !addonActive || busy === "connect"} onClick={connect}>{busy === "connect" ? "Opening…" : connected ? "Reconnect Xero" : "Connect Xero"}</button>
      <button className="xeroSave" disabled={busy === "save"} onClick={saveSettings}>Save sync settings</button>
      <button className="xeroDisc" disabled={!connected || busy === "disconnect"} onClick={disconnect}>Disconnect Xero</button>
    </div>

    <div className="xeroSimple">
      <article><b>Invoice sync</b><p>Only approved invoices are staged. No fake sync and no silent customer email.</p></article>
      <article><b>Payment status</b><p>Payment status can be pulled back for owner review when Xero is connected.</p></article>
      <article><b>Payroll handoff</b><p>Approved hours only. No bank payout, tax decision, or government submission.</p></article>
    </div>

    <div className={showRules ? "" : "xeroHidden"}>
      <div className="xeroChecks">
        <label className="xeroCheck"><input type="checkbox" checked={!!form.invoice_sync_enabled} onChange={(e) => update("invoice_sync_enabled", e.target.checked)} /> Send approved invoices to Xero</label>
        <label className="xeroCheck"><input type="checkbox" checked={!!form.contact_sync_enabled} onChange={(e) => update("contact_sync_enabled", e.target.checked)} /> Sync approved customers/contacts</label>
        <label className="xeroCheck"><input type="checkbox" checked={!!form.payment_sync_enabled} onChange={(e) => update("payment_sync_enabled", e.target.checked)} /> Pull Xero payment status back</label>
        <label className="xeroCheck"><input type="checkbox" checked={!!form.payroll_handoff_enabled} onChange={(e) => update("payroll_handoff_enabled", e.target.checked)} /> Prepare payroll/timesheet handoff</label>
        <label className="xeroCheck"><input type="checkbox" checked={!!form.approval_required} onChange={(e) => update("approval_required", e.target.checked)} /> Owner approval required before sync</label>
      </div>
      <div className="xeroRules">
        <label>Invoice rule<textarea value={form.invoice_sync_rule || ""} onChange={(e) => update("invoice_sync_rule", e.target.value)} /></label>
        <label>Contact rule<textarea value={form.contact_sync_rule || ""} onChange={(e) => update("contact_sync_rule", e.target.value)} /></label>
        <label>Payment rule<textarea value={form.payment_sync_rule || ""} onChange={(e) => update("payment_sync_rule", e.target.value)} /></label>
        <label>Payroll handoff rule<textarea value={form.payroll_handoff_rule || ""} onChange={(e) => update("payroll_handoff_rule", e.target.value)} /></label>
      </div>
    </div>

    <div className="xeroPayroll"><b>Payroll safety</b><p>Churvox can prepare approved hours/timesheets for Xero Payroll handoff later. It will not create bank payouts, tax decisions, or government submissions.</p></div>
  </section>;
}
