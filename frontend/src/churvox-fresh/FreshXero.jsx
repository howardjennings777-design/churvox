import React from "react";
import { useApi } from "../hooks/useApi";
import API_BASE from "../lib/apiBase";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshXero.css";

function unwrap(result) {
  return result?.data ?? result;
}

function asArray(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function invoiceId(invoice) {
  const raw = invoice?.id || invoice?._id || invoice?.invoice_id;
  if (!raw) return "";
  if (typeof raw === "object") return raw.$oid || raw.id || raw._id || "";
  return String(raw);
}

function invoiceNumber(invoice) {
  return invoice?.invoice_number || invoice?.number || invoice?.invoiceNumber || invoiceId(invoice) || "Latest invoice";
}

function invoiceCustomer(invoice) {
  return invoice?.customer_name || invoice?.client_name || invoice?.name || invoice?.customer || invoice?.client || "Customer";
}

function amountOf(invoice) {
  const raw = invoice?.total ?? invoice?.amount ?? invoice?.invoice_total ?? invoice?.subtotal ?? 0;
  const parsed = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPaid(invoice) {
  return ["paid", "complete", "completed", "closed"].includes(lower(invoice?.status || invoice?.payment_status));
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function accountingPackUrl(system) {
  const base = API_BASE || window.location.origin;
  return `${base}/api/accounting/export/pack?system=${encodeURIComponent(system)}`;
}

export default function FreshXero({ onNavigate }) {
  const { get, post } = useApi();
  const [status, setStatus] = React.useState(null);
  const [latestInvoice, setLatestInvoice] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [accountingBusy, setAccountingBusy] = React.useState("");
  const [accountingHealth, setAccountingHealth] = React.useState(null);
  const [paymentRows, setPaymentRows] = React.useState([]);
  const [message, setMessage] = React.useState("");
  const [syncResult, setSyncResult] = React.useState(null);

  async function loadLatestInvoice() {
    try {
      const result = await get("/invoices", { timeout: 25000 });
      if (!result?.success) return null;
      const invoices = hideDemoRecords(asArray(result.data));
      const sorted = invoices.sort((a, b) => new Date(b?.created_at || b?.createdAt || b?.date || 0) - new Date(a?.created_at || a?.createdAt || a?.date || 0));
      return sorted[0] || null;
    } catch {
      return null;
    }
  }

  async function loadStatus() {
    setLoading(true);
    setMessage("");
    try {
      const [xeroStatus, invoice] = await Promise.all([get("/xero/status"), loadLatestInvoice()]);
      setStatus(unwrap(xeroStatus));
      setLatestInvoice(invoice);
    } catch (err) {
      setMessage(err?.message || "Could not load Xero status.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    try {
      window.history.scrollRestoration = "manual";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.querySelectorAll(".freshMain,.freshPageScroll,.freshApp,main").forEach((el) => { if (el) el.scrollTop = 0; });
    } catch {}
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectXero() {
    setBusy(true);
    setMessage("");
    try {
      const data = unwrap(await post("/xero/connect/start", {}));
      if (!data?.url) throw new Error("Xero did not return a connect URL.");
      window.location.href = data.url;
    } catch (err) {
      setMessage(err?.message || "Xero connection could not start.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectXero() {
    setBusy(true);
    setMessage("");
    try {
      await post("/xero/disconnect", {});
      await loadStatus();
      setMessage("Xero disconnected.");
      setSyncResult(null);
    } catch (err) {
      setMessage(err?.message || "Could not disconnect Xero.");
    } finally {
      setBusy(false);
    }
  }

  async function syncLatestInvoice() {
    setSyncing(true);
    setMessage("");
    setSyncResult(null);
    try {
      const data = unwrap(await post("/xero/sync-latest-invoice", {}));
      setSyncResult(data);
      const invoiceNumberText = data?.xero_invoice?.InvoiceNumber || data?.xero_invoice?.InvoiceID || "draft invoice";
      setMessage(`Xero draft invoice created: ${invoiceNumberText}. Review and send it in Xero.`);
    } catch (err) {
      setMessage(err?.message || "Xero draft invoice sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  function downloadAccountingPack(system) {
    window.open(accountingPackUrl(system), "_blank", "noopener,noreferrer");
  }

  async function loadAccountingHealth() {
    setAccountingBusy("health");
    setMessage("");
    try {
      const data = unwrap(await get("/accounting/health", { timeout: 25000 }));
      setAccountingHealth(data);
      const connectedText = data?.live_sync?.xero_connected ? "Xero live sync ready" : "Xero live sync not ready";
      setMessage(`${connectedText}. Accounting export pack is available.`);
    } catch (err) {
      setMessage(err?.message || "Could not load accounting health.");
    } finally {
      setAccountingBusy("");
    }
  }

  async function loadPaymentStatus() {
    setAccountingBusy("payments");
    setMessage("");
    try {
      const data = unwrap(await get("/accounting/payment-status", { timeout: 25000 }));
      const rows = Array.isArray(data?.invoices) ? data.invoices : [];
      setPaymentRows(rows);
      setMessage(`Payment status loaded for ${rows.length} invoice${rows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setMessage(err?.message || "Could not load payment status.");
    } finally {
      setAccountingBusy("");
    }
  }

  const configured = Boolean(status?.configured);
  const connected = Boolean(status?.connected);
  const addonActive = Boolean(status?.addon_active);
  const draftReady = Boolean(status?.draft_invoice_sync_ready);
  const connection = status?.connection || {};
  const settings = status?.settings || {};
  const xeroInvoice = syncResult?.xero_invoice || {};
  const latestInvoiceLabel = latestInvoice ? `${invoiceNumber(latestInvoice)} - ${invoiceCustomer(latestInvoice)}` : "No invoice yet";
  const latestInvoiceTotal = latestInvoice ? money(amountOf(latestInvoice)) : "-";
  const latestInvoicePaid = latestInvoice ? isPaid(latestInvoice) : false;
  const healthCounts = accountingHealth?.counts || {};
  const guardrails = accountingHealth?.guardrails || ["Draft invoice sync only", "No automatic invoice sending", "No tax filing", "No bank payout files", "Paid status requires accounting confirmation"];

  return (
    <section className="freshXeroPage">
      <div className="freshXeroCompactHeader">
        <div><span>Accounting sync</span><h1>Xero</h1><p>Connect Xero, prepare draft invoice sync, check payment status, and export accounting records. You stay in control.</p></div>
        <div className="freshXeroCompactStatus"><span className={configured ? "ok" : "bad"}>{loading ? "Checking" : configured ? "Env ready" : "Env missing"}</span><span className={addonActive ? "ok" : "bad"}>{loading ? "Checking" : addonActive ? "Add-on active" : "Add-on off"}</span><span className={connected ? "ok" : "bad"}>{loading ? "Checking" : connected ? "Connected" : "Not connected"}</span><span>{latestInvoice ? latestInvoiceTotal : "No invoice"}</span></div>
      </div>

      {message ? <div className={`freshXeroNotice ${syncResult?.success || connected ? "proper" : "need"}`}><b>Accounting status</b><span>{message}</span></div> : null}
      <div className={`freshXeroNotice ${connected ? "proper" : "need"}`}><b>{connected ? "Xero connected" : "Xero not connected"}</b><span>{connected ? `Connected to ${connection?.tenant_name || "a Xero organisation"}.` : "Connect Xero after the credentials, redirect URI, scopes, and Accounting Sync add-on are ready."}</span></div>

      <div className="freshXeroLayout">
        <aside className="freshXeroList">
          <header><div><b>Accounting flow</b><span>Invoice - owner approval - Xero draft</span></div><button type="button" onClick={loadStatus} disabled={loading || busy}>Reload</button></header>
          <button type="button" className={latestInvoice ? "active" : ""} onClick={() => onNavigate?.("invoices")}><b>1. Latest invoice</b><span>{latestInvoiceLabel}</span><small>{latestInvoice ? latestInvoiceTotal : "Create invoice first"}</small></button>
          <button type="button" className={latestInvoicePaid ? "active" : ""} onClick={() => onNavigate?.("payments")}><b>2. Payment status</b><span>{latestInvoicePaid ? "Paid in Churvox" : "Check payment before close-out"}</span><small>{latestInvoicePaid ? "Paid" : "Review"}</small></button>
          <button type="button" className={connected ? "active" : ""}><b>3. Xero organisation</b><span>{connection?.tenant_name || "No tenant connected"}</span><small>{connected ? "Connected" : "Not connected"}</small></button>
          <button type="button" className={draftReady ? "active" : ""}><b>4. Draft invoice sync</b><span>Create a Xero draft from the latest invoice</span><small>{draftReady ? "Ready" : "Connect first"}</small></button>
          <button type="button" className="active" onClick={() => downloadAccountingPack("both")}><b>5. Export pack</b><span>Xero CSV, accounting CSV, clients, jobs, and notes</span><small>Download</small></button>
        </aside>

        <article className="freshXeroDetail">
          <div className="freshXeroHead"><div><span>{connected ? "Connected" : "Setup required"}</span><h2>{connected ? connection?.tenant_name || "Xero connected" : "Connect Xero"}</h2><p>{connected ? "Sync creates a Xero draft invoice only. Send or reconcile inside Xero after checking it." : "Start the Xero OAuth connection when setup is ready."}</p></div><div className="freshXeroHeadActions">{!connected ? <button type="button" onClick={connectXero} disabled={busy || loading || !configured || !addonActive}>{busy ? "Opening Xero..." : "Connect to Xero"}</button> : null}{connected ? <button type="button" onClick={syncLatestInvoice} disabled={syncing || !draftReady || !latestInvoice}>{syncing ? "Syncing draft..." : "Sync latest invoice draft"}</button> : null}<button type="button" onClick={() => downloadAccountingPack("xero")}>Xero CSV</button><button type="button" onClick={() => downloadAccountingPack("myob")}>Accounting CSV</button><button type="button" onClick={() => downloadAccountingPack("both")}>Bookkeeper pack</button><button type="button" onClick={loadAccountingHealth} disabled={accountingBusy === "health"}>{accountingBusy === "health" ? "Checking..." : "Accounting health"}</button><button type="button" onClick={loadPaymentStatus} disabled={accountingBusy === "payments"}>{accountingBusy === "payments" ? "Loading..." : "Payment status"}</button>{connected ? <button type="button" onClick={disconnectXero} disabled={busy || syncing}>Disconnect Xero</button> : null}</div></div>

          <div className="freshXeroCards"><section><span>Latest invoice</span><b>{latestInvoice ? latestInvoiceTotal : "None"}</b><p>{latestInvoice ? latestInvoiceLabel : "Create an invoice before syncing to Xero."}</p></section><section><span>Invoice sync</span><b>{draftReady ? "Draft ready" : "Not ready"}</b><p>Creates a Xero draft invoice only after the owner is ready to review it.</p></section><section><span>Payment status</span><b>{settings.payment_sync_enabled ? "Read-back available" : "Manual/refresh"}</b><p>Use payment refresh before closing out paid invoices.</p></section><section><span>Accounting export</span><b>CSV ready</b><p>Xero, accounting CSV, clients, jobs, and notes are available as an export pack.</p></section><section><span>Health check</span><b>{accountingHealth ? "Loaded" : "Ready"}</b><p>{accountingHealth ? `${healthCounts.invoices || 0} invoices checked.` : "Run Accounting health to check sync/export readiness."}</p></section><section><span>Safety</span><b>Owner controlled</b><p>No auto-send, tax filing, payout files, or automatic paid marking.</p></section></div>

          <div className="freshXeroForm"><label><span>Configured</span><input readOnly value={configured ? "Yes" : "No"} /></label><label><span>Add-on active</span><input readOnly value={addonActive ? "Yes" : "No"} /></label><label><span>Connected</span><input readOnly value={connected ? "Yes" : "No"} /></label><label><span>Organisation</span><input readOnly value={connection?.tenant_name || ""} /></label><label><span>Sales account</span><input readOnly value={status?.sales_account_code || ""} /></label><label><span>Tax type</span><input readOnly value={status?.sales_tax_type || ""} /></label><label><span>Latest invoice</span><input readOnly value={latestInvoiceLabel} /></label><label><span>Latest total</span><input readOnly value={latestInvoiceTotal} /></label><label><span>Payment rows loaded</span><input readOnly value={paymentRows.length ? `${paymentRows.length} invoice${paymentRows.length === 1 ? "" : "s"}` : "Not loaded"} /></label><section className="freshXeroSafeRule"><span>Rules</span><b>Draft invoice only</b><p>{guardrails.join(". ")}.</p></section><section className="freshXeroTechBox"><span>Technical setup</span><b>{configured ? "Required env is present" : "Required env still missing"}</b><p>{(status?.required_env || []).length ? (status?.required_env || []).join(", ") : "No missing env keys reported."}</p></section>{syncResult?.success ? <label className="wide"><span>Last Xero draft result</span><textarea readOnly value={`Invoice: ${xeroInvoice.InvoiceNumber || ""}\nXero ID: ${xeroInvoice.InvoiceID || ""}\nStatus: ${xeroInvoice.Status || ""}`} /></label> : null}</div>
        </article>
      </div>
    </section>
  );
}
