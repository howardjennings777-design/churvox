// CHURVOX_INTEGRATIONS_STABLE_WIRING_20260601
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, CheckCircle, Mail, PlugZap, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import "./IntegrationsWorkspacePage.css";

// This page used to call /api/integrations/workspace and mutation endpoints that
// are not guaranteed live. It now explains integration readiness using stable
// Churvox records and only links owners to the real workspaces.

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.invoices)) return value.invoices;
  return [];
}

function pickList(response, keys = []) {
  const data = response?.data ?? response;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return arr(data);
}

function idOf(value) { return String(value?.id || value?._id || value?.invoice_id || ""); }
function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}
function statusOf(invoice) { return String(invoice?.status || invoice?.payment_status || invoice?.myob_sync_status || "").toLowerCase(); }
function isPaid(invoice) { return statusOf(invoice).includes("paid") || Number(invoice?.amount_due || invoice?.balance_due || 0) <= 0 && Number(invoice?.amount_paid || 0) > 0; }
function isSyncFailed(invoice) { return String(invoice?.myob_sync_status || "").toLowerCase() === "failed" || Boolean(invoice?.myob_error); }
function isSyncReady(invoice) {
  return Boolean(invoice?.invoice_number || invoice?.number) && Boolean(invoice?.customer_name || invoice?.client_name) && Number(invoice?.total || invoice?.amount || invoice?.amount_due || 0) >= 0;
}

function StatusPill({ ok, label }) {
  return <span className={`cv-int-pill ${ok ? "ok" : "warn"}`}>{ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />} {label}</span>;
}

function getLocalMode() {
  try { return localStorage.getItem("churvox_myob_mode") || "churvox_only"; } catch { return "churvox_only"; }
}

export default function IntegrationsWorkspacePage() {
  const api = useApi();
  const [invoices, setInvoices] = useState([]);
  const [mode, setMode] = useState(getLocalMode);
  const [loading, setLoading] = useState(true);

  async function loadIntegrations() {
    setLoading(true);
    const res = await api.get("/invoices");
    if (res.success) {
      setInvoices(pickList(res, ["invoices", "items", "results"]));
    } else {
      toast.error(res.error || "Could not load invoice data for integrations");
      setInvoices([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadIntegrations(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = useMemo(() => {
    const failed = invoices.filter(isSyncFailed).length;
    const ready = invoices.filter(isSyncReady).length;
    const pending = invoices.filter((invoice) => isSyncReady(invoice) && !isPaid(invoice) && !isSyncFailed(invoice)).length;
    const totalValue = invoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.amount || invoice.amount_due || 0), 0);
    return { failed_syncs: failed, ready, pending, invoices: invoices.length, totalValue };
  }, [invoices]);

  const failedRows = useMemo(() => invoices.filter(isSyncFailed), [invoices]);

  function saveLocalMode() {
    try { localStorage.setItem("churvox_myob_mode", mode); } catch {}
    toast.success("Integration mode saved for this workspace");
  }

  return (
    <PremiumPage maxWidth={1220}>
      <PremiumHero
        eyebrow="Integrations"
        title="Connect Churvox to outside systems safely."
        subtitle="This workspace now uses live invoice records and safe readiness checks instead of calling missing integration placeholder routes."
        icon={<PlugZap className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadIntegrations} disabled={loading}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-int-metrics">
        <article><span>MYOB</span><b>{mode === "myob_sync" ? "Planned sync" : "Churvox-only"}</b><small>{mode}</small></article>
        <article className={metrics.failed_syncs ? "red" : "green"}><span>Sync warnings</span><b>{metrics.failed_syncs || 0}</b><small>invoice rows</small></article>
        <article><span>Ready invoices</span><b>{metrics.ready || 0}</b><small>can export/review</small></article>
        <article><span>Pending payment</span><b>{metrics.pending || 0}</b><small>not paid yet</small></article>
        <article className="amber"><span>SMS</span><b>Safe mode</b><small>billing/credits gated</small></article>
        <article><span>Invoice value</span><b>{money(metrics.totalValue)}</b><small>loaded records</small></article>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-int-empty">Loading integrations…</div></PremiumCard>
      ) : (
        <section className="cv-int-grid">
          <PremiumCard title="MYOB connection and sync mode" icon={<PlugZap className="h-5 w-5" />}>
            <div className="cv-int-status-row">
              <StatusPill ok={mode !== "myob_sync" || !metrics.failed_syncs} label={mode === "myob_sync" ? "Sync mode selected" : "Churvox-only safe mode"} />
              <StatusPill ok={!metrics.failed_syncs} label={`${metrics.failed_syncs || 0} sync warnings`} />
            </div>

            <div className="cv-int-form">
              <label>
                <span>Operating mode</span>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="churvox_only">Churvox-only</option>
                  <option value="myob_review">MYOB review/export prep</option>
                  <option value="myob_sync">MYOB sync planned</option>
                </select>
              </label>
              <label>
                <span>Invoice source</span>
                <input value={`${metrics.invoices || 0} invoices loaded from Churvox`} readOnly />
              </label>
              <label>
                <span>Sync safety</span>
                <input value="No MYOB write is performed from this page" readOnly />
              </label>
            </div>

            <div className="cv-int-explain">
              <b>How this is connected</b>
              <p>Invoices are the source of truth. Churvox keeps them safe in Money Desk first, then MYOB can be connected as a reviewed/exported sync path once the backend OAuth keys are ready.</p>
              <p className="warn">This page does not pretend to disconnect, retry or sync MYOB if the real MYOB backend is not live yet.</p>
            </div>

            <div className="cv-int-actions">
              <PremiumButton onClick={saveLocalMode}>Save mode</PremiumButton>
              <Link className="cv-int-link" to="/invoices">Open Money Desk</Link>
            </div>
          </PremiumCard>

          <PremiumCard title="SMS status" icon={<Smartphone className="h-5 w-5" />}>
            <div className="cv-int-big">
              <b>Safe mode</b>
              <span>SMS sends stay guarded until credits and provider keys are confirmed.</span>
            </div>
            <p className="cv-int-copy">SMS is connected to the billing/credit idea, but customer sends should only become active after the real send endpoint and credit balance are proven.</p>
            <Link className="cv-int-link" to="/billing-confidence">Open billing confidence</Link>
          </PremiumCard>

          <PremiumCard title="Email sending" icon={<Mail className="h-5 w-5" />}>
            <div className="cv-int-big">
              <b>Invoice-first</b>
              <span>Email readiness is checked when sending invoice/quote documents from their real workspaces.</span>
            </div>
            <p className="cv-int-copy">Invoices and quotes should only show as sent when the existing email provider accepts the message.</p>
            <Link className="cv-int-link" to="/invoices">Review invoices</Link>
          </PremiumCard>

          <PremiumCard title="Future integrations">
            <div className="cv-int-future">
              <div><b>Xero</b><span>Later</span><p>Keep after MYOB and billing are stable.</p></div>
              <div><b>Fleet/GPS</b><span>Later</span><p>Use job start verification first, not full fleet tracking.</p></div>
              <div><b>Bank payout files</b><span>Later</span><p>Keep payroll review/export before real bank file generation.</p></div>
            </div>
          </PremiumCard>
        </section>
      )}

      <section className="cv-int-sync">
        <PremiumCard title="Invoice integration readiness list">
          {invoices.length ? invoices.slice(0, 80).map((invoice) => (
            <div className="cv-int-sync-row" key={idOf(invoice) || invoice.invoice_number}>
              <div>
                <b>{invoice.invoice_number || invoice.number || "Invoice"}</b>
                <span>{invoice.customer_name || invoice.client_name || "Customer"} · {invoice.status || "open"} · {money(invoice.total || invoice.amount || invoice.amount_due)}</span>
                {invoice.myob_error ? <em>{invoice.myob_error}</em> : !isSyncReady(invoice) ? <em>Missing invoice number, customer or amount data</em> : null}
              </div>
              <strong className={isSyncFailed(invoice) ? "red" : isSyncReady(invoice) ? "green" : "amber"}>{isSyncFailed(invoice) ? "warning" : isSyncReady(invoice) ? "ready" : "needs data"}</strong>
              <div>
                <Link to={idOf(invoice) ? `/invoices/${idOf(invoice)}` : "/invoices"}>Open</Link>
              </div>
            </div>
          )) : <div className="cv-int-empty">No invoices yet. Create an invoice and it will appear here for integration review.</div>}

          {failedRows.length ? <div className="cv-int-warning">{failedRows.length} invoice sync warning{failedRows.length === 1 ? "" : "s"} need review.</div> : null}
        </PremiumCard>
      </section>
    </PremiumPage>
  );
}
