import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshXero.css";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

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

function readCommandInbox() {
  try {
    const raw = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sendXeroToCommand({ status, invoice, syncResult, message }) {
  try {
    const connected = Boolean(status?.connected);
    const addonActive = Boolean(status?.addon_active);
    const configured = Boolean(status?.configured);
    const tenant = status?.connection?.tenant_name || "No Xero organisation connected";
    const invoiceText = invoice ? `${invoiceNumber(invoice)} · ${invoiceCustomer(invoice)} · ${money(amountOf(invoice))}` : "No invoice loaded";
    const xeroInvoice = syncResult?.xero_invoice || {};
    const slip = {
      id: `xero-${Date.now()}`,
      group: "Xero",
      area: "Xero",
      page: "xero",
      title: syncResult?.success ? "Xero draft invoice created" : "Xero accounting check",
      info: syncResult?.success ? `${xeroInvoice.InvoiceNumber || xeroInvoice.InvoiceID || "Xero draft"} · owner must review in Xero` : `${tenant} · ${invoiceText}`,
      urgency: connected && addonActive && configured ? "Ready" : "Setup needed",
      found: `Xero configured: ${configured ? "yes" : "no"}. Add-on active: ${addonActive ? "yes" : "no"}. Connected: ${connected ? "yes" : "no"}. Latest invoice: ${invoiceText}.`,
      prepared: syncResult?.success ? "Churvox created a Xero draft invoice only. It was not sent to the customer and was not marked paid automatically." : "Churvox prepared an owner accounting sync check before any draft invoice sync.",
      why: message || "Accounting sync should be the final controlled step after invoice/payment review.",
      owner: "Open Xero, review the draft invoice, then send or reconcile inside Xero if correct. Churvox does not file tax or create payment files.",
      payload: {
        tenant,
        invoice: invoiceText,
        xero_invoice_id: xeroInvoice.InvoiceID || "",
        xero_invoice_number: xeroInvoice.InvoiceNumber || "",
        xero_status: xeroInvoice.Status || "",
      },
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      fromInbox: true,
    };
    const next = [slip, ...readCommandInbox()].slice(0, 30);
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "xero-command" } }));
  } catch {
    // Keep Xero usable without local storage.
  }
}

export default function FreshXero({ onNavigate }) {
  const { get, post } = useApi();
  const [status, setStatus] = React.useState(null);
  const [latestInvoice, setLatestInvoice] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
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
      const nextMessage = `Xero draft invoice sync complete: ${invoiceNumberText}. Review it in Xero before sending.`;
      setMessage(nextMessage);
      sendXeroToCommand({ status, invoice: latestInvoice, syncResult: data, message: nextMessage });
    } catch (err) {
      const nextMessage = err?.message || "Xero draft invoice sync failed.";
      setMessage(nextMessage);
      sendXeroToCommand({ status, invoice: latestInvoice, syncResult: null, message: nextMessage });
    } finally {
      setSyncing(false);
    }
  }

  function sendCheckToCommand() {
    sendXeroToCommand({ status, invoice: latestInvoice, syncResult, message: "Owner accounting sync check sent to Command." });
    setMessage("Xero check sent to Command.");
    onNavigate?.("command");
  }

  const configured = Boolean(status?.configured);
  const connected = Boolean(status?.connected);
  const addonActive = Boolean(status?.addon_active);
  const draftReady = Boolean(status?.draft_invoice_sync_ready);
  const connection = status?.connection || {};
  const settings = status?.settings || {};
  const xeroInvoice = syncResult?.xero_invoice || {};
  const latestInvoiceLabel = latestInvoice ? `${invoiceNumber(latestInvoice)} · ${invoiceCustomer(latestInvoice)}` : "No invoice yet";
  const latestInvoiceTotal = latestInvoice ? money(amountOf(latestInvoice)) : "—";
  const latestInvoicePaid = latestInvoice ? isPaid(latestInvoice) : false;

  return (
    <section className="freshXeroPage">
      <div className="freshXeroHero">
        <div>
          <span>Xero connection</span>
          <h1>Accounting handoff after invoice approval</h1>
          <p>
            Xero is the final controlled step: Churvox creates draft invoices only. The owner reviews before anything is sent, marked paid, filed, or reconciled.
          </p>
        </div>

        <div className="freshXeroStats">
          <div><b>{loading ? "..." : configured ? "Yes" : "No"}</b><small>env ready</small></div>
          <div><b>{loading ? "..." : addonActive ? "Yes" : "No"}</b><small>add-on active</small></div>
          <div><b>{loading ? "..." : connected ? "Yes" : "No"}</b><small>connected</small></div>
          <div><b>{latestInvoice ? latestInvoiceTotal : "—"}</b><small>latest invoice</small></div>
        </div>
      </div>

      {message && (
        <div className={`freshXeroNotice ${syncResult?.success ? "proper" : "need"}`}>
          <b>Xero notice</b>
          <span>{message}</span>
        </div>
      )}

      <div className={`freshXeroNotice ${connected ? "proper" : "need"}`}>
        <b>{connected ? "Xero connected" : "Xero not connected yet"}</b>
        <span>
          {connected
            ? `Connected to ${connection?.tenant_name || "a Xero organisation"}. Draft invoice sync is available for controlled owner testing.`
            : "Connect is blocked until Render env vars are ready and the Accounting Sync add-on is active for this business."}
        </span>
      </div>

      <div className="freshXeroLayout">
        <aside className="freshXeroList">
          <header>
            <div>
              <b>Accounting handoff path</b>
              <span>Invoice → payment check → Xero draft</span>
            </div>
            <button type="button" onClick={loadStatus} disabled={loading || busy}>Reload</button>
          </header>

          <button type="button" className={latestInvoice ? "active" : ""} onClick={() => onNavigate?.("invoices")}>
            <b>1. Latest invoice</b>
            <span>{latestInvoiceLabel}</span>
            <small>{latestInvoice ? latestInvoiceTotal : "Create invoice first"}</small>
          </button>

          <button type="button" className={latestInvoicePaid ? "active" : ""} onClick={() => onNavigate?.("payments")}>
            <b>2. Payment status</b>
            <span>{latestInvoicePaid ? "Paid in Churvox" : "Check payment before close-out"}</span>
            <small>{latestInvoicePaid ? "Paid" : "Review"}</small>
          </button>

          <button type="button" className={connected ? "active" : ""}>
            <b>3. Xero organisation</b>
            <span>{connection?.tenant_name || "No tenant connected"}</span>
            <small>{connected ? "Connected" : "Not connected"}</small>
          </button>

          <button type="button" className={draftReady ? "active" : ""}>
            <b>4. Draft invoice sync</b>
            <span>Owner sends latest Churvox invoice as Xero draft</span>
            <small>{draftReady ? "Ready" : "Connect first"}</small>
          </button>
        </aside>

        <article className="freshXeroDetail">
          <div className="freshXeroHead">
            <div>
              <span>{connected ? "Connected" : "Setup required"}</span>
              <h2>{connected ? connection?.tenant_name || "Xero connected" : "Connect Xero"}</h2>
              <p>
                {connected
                  ? "Use this only after the invoice is correct. Churvox creates a Xero draft invoice, not a sent invoice."
                  : "Start the Xero OAuth connection once credentials and add-on are ready."}
              </p>
            </div>

            <div className="freshXeroHeadActions">
              {!connected && (
                <button type="button" onClick={connectXero} disabled={busy || loading || !configured || !addonActive}>
                  {busy ? "Opening Xero..." : "Connect to Xero"}
                </button>
              )}
              {connected && (
                <button type="button" onClick={syncLatestInvoice} disabled={syncing || !draftReady || !latestInvoice}>
                  {syncing ? "Syncing draft..." : "Sync latest invoice draft"}
                </button>
              )}
              {connected && (
                <button type="button" onClick={disconnectXero} disabled={busy || syncing}>
                  Disconnect Xero
                </button>
              )}
              <button type="button" onClick={sendCheckToCommand}>Send check to Command</button>
              <button type="button" onClick={() => onNavigate?.("invoices")}>Open Invoices</button>
              <button type="button" onClick={() => onNavigate?.("payments")}>Open Payments</button>
            </div>
          </div>

          <div className="freshXeroCards">
            <section>
              <span>Latest Churvox invoice</span>
              <b>{latestInvoice ? latestInvoiceTotal : "None"}</b>
              <p>{latestInvoice ? latestInvoiceLabel : "Create an invoice before syncing to Xero."}</p>
            </section>

            <section>
              <span>Invoice sync</span>
              <b>{draftReady ? "Draft ready" : "Approval first"}</b>
              <p>Creates a Xero draft invoice from the latest Churvox invoice.</p>
            </section>

            <section>
              <span>Payment status</span>
              <b>{settings.payment_sync_enabled ? "Read-back available" : "Manual/refresh"}</b>
              <p>Payment status should be checked after a Xero invoice ID exists.</p>
            </section>
          </div>

          <div className="freshXeroForm">
            <label><span>Configured</span><input readOnly value={configured ? "Yes" : "No"} /></label>
            <label><span>Add-on active</span><input readOnly value={addonActive ? "Yes" : "No"} /></label>
            <label><span>Connected</span><input readOnly value={connected ? "Yes" : "No"} /></label>
            <label><span>Organisation</span><input readOnly value={connection?.tenant_name || ""} /></label>
            <label><span>Sales account</span><input readOnly value={status?.sales_account_code || ""} /></label>
            <label><span>Tax type</span><input readOnly value={status?.sales_tax_type || ""} /></label>
            <label><span>Latest invoice</span><input readOnly value={latestInvoiceLabel} /></label>
            <label><span>Latest total</span><input readOnly value={latestInvoiceTotal} /></label>
            <label className="wide"><span>Safety rule</span><textarea readOnly value="Draft invoice only. Owner approval is required before invoices are sent. Tax filing stays outside Churvox. Do not create payment files. Mark paid only after owner/accounting status check." /></label>
            <label className="wide"><span>Required env</span><textarea readOnly value={(status?.required_env || []).join("\n")} /></label>
            {syncResult?.success && (
              <label className="wide">
                <span>Last Xero draft result</span>
                <textarea readOnly value={`Invoice: ${xeroInvoice.InvoiceNumber || ""}\nXero ID: ${xeroInvoice.InvoiceID || ""}\nStatus: ${xeroInvoice.Status || ""}`} />
              </label>
            )}
          </div>

          <div className="freshXeroActions">
            <button type="button" onClick={loadStatus}>Reload status</button>
            <button type="button" onClick={syncLatestInvoice} disabled={syncing || !draftReady || !latestInvoice}>Sync latest invoice draft</button>
            <button type="button" onClick={sendCheckToCommand}>Send check to Command</button>
            <button type="button" onClick={() => onNavigate?.("payments")}>Open Payments</button>
            <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
          </div>
        </article>
      </div>
    </section>
  );
}
