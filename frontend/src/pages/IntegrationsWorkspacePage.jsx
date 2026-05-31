import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, CheckCircle, Mail, PlugZap, RefreshCw, RotateCcw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import "./IntegrationsWorkspacePage.css";

function arr(value) { return Array.isArray(value) ? value : []; }
function idOf(value) { return String(value?.id || value?._id || ""); }
function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function StatusPill({ ok, label }) {
  return <span className={`cv-int-pill ${ok ? "ok" : "warn"}`}>{ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />} {label}</span>;
}

export default function IntegrationsWorkspacePage() {
  const api = useApi();
  const [data, setData] = useState({});
  const [mode, setMode] = useState("churvox_only");
  const [companyFileId, setCompanyFileId] = useState("");
  const [companyFileName, setCompanyFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function loadIntegrations() {
    setLoading(true);
    const res = await api.get("/integrations/workspace");
    if (res.success) {
      const next = res.data?.integrations || {};
      setData(next);
      setMode(next.myob?.mode || "churvox_only");
      setCompanyFileId(next.myob?.company_file_id || "");
      setCompanyFileName(next.myob?.company_file_name || "");
    } else {
      toast.error(res.error || "Could not load integrations");
    }
    setLoading(false);
  }

  useEffect(() => { loadIntegrations(); }, []);

  const myob = data.myob || {};
  const sms = data.sms || {};
  const email = data.email || {};
  const metrics = data.metrics || {};
  const rows = arr(data.invoice_sync_rows);
  const failedRows = useMemo(() => rows.filter((row) => String(row.myob_sync_status || "").toLowerCase() === "failed" || row.myob_error), [rows]);

  async function saveMyobSettings() {
    setBusy("myob");
    const res = await api.patch("/integrations/myob/settings", {
      mode,
      company_file_id: companyFileId,
      company_file_name: companyFileName,
      myob_connected: Boolean(myob.connected),
    });
    setBusy("");
    if (res.success) {
      toast.success("MYOB settings saved");
      await loadIntegrations();
    } else {
      toast.error(res.error || "Could not save MYOB settings");
    }
  }

  async function disconnectMyob() {
    if (!window.confirm("Disconnect MYOB from Churvox? Existing invoices will not be deleted.")) return;
    setBusy("disconnect");
    const res = await api.post("/integrations/myob/disconnect", {});
    setBusy("");
    if (res.success) {
      toast.success("MYOB disconnected");
      await loadIntegrations();
    } else {
      toast.error(res.error || "Could not disconnect MYOB");
    }
  }

  async function retryInvoice(invoice) {
    setBusy(`retry-${idOf(invoice)}`);
    const res = await api.post(`/integrations/myob/invoices/${idOf(invoice)}/retry`, {});
    setBusy("");
    if (res.success) {
      toast.success("Retry queued");
      await loadIntegrations();
    } else {
      toast.error(res.message || res.error || "Could not retry sync");
      await loadIntegrations();
    }
  }

  return (
    <PremiumPage maxWidth={1220}>
      <PremiumHero
        eyebrow="Integrations"
        title="Connect Churvox to the outside systems safely."
        subtitle="MYOB, SMS and email status in one place. Missing keys show clear messages instead of fake success."
        icon={<PlugZap className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadIntegrations} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-int-metrics">
        <article><span>MYOB</span><b>{myob.connected ? "Connected" : "Not connected"}</b><small>{myob.mode || "churvox_only"}</small></article>
        <article className={metrics.failed_syncs ? "red" : "green"}><span>Sync errors</span><b>{metrics.failed_syncs || 0}</b><small>invoice rows</small></article>
        <article><span>Pending sync</span><b>{metrics.pending_syncs || 0}</b><small>queued invoices</small></article>
        <article><span>SMS credits</span><b>{sms.credits || 0}</b><small>{sms.sent_count || 0} sent</small></article>
        <article className={email.configured ? "green" : "amber"}><span>Email</span><b>{email.provider || "Not configured"}</b><small>{email.configured ? "ready" : "needs env keys"}</small></article>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-int-empty">Loading integrations…</div></PremiumCard>
      ) : (
        <section className="cv-int-grid">
          <PremiumCard title="MYOB connection and sync mode" icon={<PlugZap className="h-5 w-5" />}>
            <div className="cv-int-status-row">
              <StatusPill ok={myob.connected} label={myob.connected ? "MYOB connected" : "MYOB not connected"} />
              <StatusPill ok={!metrics.failed_syncs} label={`${metrics.failed_syncs || 0} failed syncs`} />
            </div>

            <div className="cv-int-form">
              <label>
                <span>Sync mode</span>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="churvox_only">Churvox-only</option>
                  <option value="myob_sync">MYOB sync</option>
                  <option value="myob_external">MYOB external</option>
                </select>
              </label>
              <label>
                <span>Company file ID</span>
                <input value={companyFileId} onChange={(e) => setCompanyFileId(e.target.value)} placeholder="MYOB company file ID" />
              </label>
              <label>
                <span>Company file name</span>
                <input value={companyFileName} onChange={(e) => setCompanyFileName(e.target.value)} placeholder="Company file name" />
              </label>
            </div>

            <div className="cv-int-explain">
              <b>What this means</b>
              <p>{myob.explain?.[mode] || "Choose how Churvox should treat MYOB for invoices and payments."}</p>
              {!myob.connected ? <p className="warn">MYOB OAuth/API keys are not connected here yet. Churvox will keep actions safe and report the limitation.</p> : null}
            </div>

            <div className="cv-int-actions">
              <PremiumButton onClick={saveMyobSettings} disabled={busy === "myob"}>Save MYOB settings</PremiumButton>
              <button type="button" onClick={disconnectMyob} disabled={busy === "disconnect"}>Disconnect MYOB</button>
            </div>
          </PremiumCard>

          <PremiumCard title="SMS status" icon={<Smartphone className="h-5 w-5" />}>
            <div className="cv-int-big">
              <b>{sms.credits || 0}</b>
              <span>SMS credits available</span>
            </div>
            <p className="cv-int-copy">SMS credits stay separate from plan billing. If SMS keys or credits are missing, send actions should show a safe error rather than pretending to send.</p>
            <Link className="cv-int-link" to="/sms">Open SMS workspace</Link>
          </PremiumCard>

          <PremiumCard title="Email sending" icon={<Mail className="h-5 w-5" />}>
            <div className="cv-int-big">
              <b>{email.provider || "Not configured"}</b>
              <span>{email.safe_message || "Email status unavailable."}</span>
            </div>
            <p className="cv-int-copy">Invoices and quotes should only show sent when the existing email provider actually accepts the message.</p>
          </PremiumCard>

          <PremiumCard title="Future integrations">
            <div className="cv-int-future">
              {arr(data.future).map((item) => (
                <div key={item.name}>
                  <b>{item.name}</b>
                  <span>{item.status}</span>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          </PremiumCard>
        </section>
      )}

      <section className="cv-int-sync">
        <PremiumCard title="Invoice sync status list">
          {rows.length ? rows.slice(0, 80).map((invoice) => (
            <div className="cv-int-sync-row" key={idOf(invoice)}>
              <div>
                <b>{invoice.invoice_number}</b>
                <span>{invoice.customer_name || "Customer"} · {invoice.status} · {money(invoice.total)}</span>
                {invoice.myob_error ? <em>{invoice.myob_error}</em> : null}
              </div>
              <strong className={String(invoice.myob_sync_status).toLowerCase() === "failed" ? "red" : ""}>{invoice.myob_sync_status || "not_synced"}</strong>
              <div>
                <Link to={`/invoices/${idOf(invoice)}`}>Open</Link>
                {String(invoice.myob_sync_status).toLowerCase() === "failed" || invoice.myob_error ? (
                  <button type="button" onClick={() => retryInvoice(invoice)} disabled={busy === `retry-${idOf(invoice)}`}><RotateCcw size={13} /> Retry</button>
                ) : null}
              </div>
            </div>
          )) : <div className="cv-int-empty">No invoice sync rows yet.</div>}

          {failedRows.length ? <div className="cv-int-warning">{failedRows.length} invoice sync issue{failedRows.length === 1 ? "" : "s"} need review.</div> : null}
        </PremiumCard>
      </section>
    </PremiumPage>
  );
}
