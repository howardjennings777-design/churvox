import React, { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";
import API_BASE from "../lib/apiBase";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import "./OfficeTeamXeroScreen.css";

function unwrap(result) {
  return result?.data ?? result ?? {};
}

export default function OfficeTeamXeroScreen() {
  const { get, post } = useApi();
  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("Checking Xero and accounting readiness…");

  async function load() {
    setBusy("load");
    try {
      const [statusResult, healthResult] = await Promise.allSettled([
        get("/xero/status", { timeout: 25000 }),
        get("/accounting/health", { timeout: 25000 }),
      ]);
      const nextStatus = statusResult.status === "fulfilled" ? unwrap(statusResult.value) : {};
      const nextHealth = healthResult.status === "fulfilled" ? unwrap(healthResult.value) : {};
      setStatus(nextStatus);
      setHealth(nextHealth);
      setNotice(nextStatus?.connected ? `Connected to ${nextStatus?.connection?.tenant_name || nextStatus?.tenant_name || "Xero"}.` : "Xero is not connected yet.");
    } catch (error) {
      setNotice(error?.message || "Could not load accounting status.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function connect() {
    setBusy("connect");
    try {
      const result = unwrap(await post("/xero/connect/start", {}));
      if (!result?.url) throw new Error("Xero did not return a connection link.");
      window.location.assign(result.url);
    } catch (error) {
      setNotice(error?.message || "Could not start the Xero connection.");
      setBusy("");
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    try {
      await post("/xero/disconnect", {});
      setNotice("Xero disconnected.");
      await load();
    } catch (error) {
      setNotice(error?.message || "Could not disconnect Xero.");
    } finally {
      setBusy("");
    }
  }

  async function prepareSyncReview() {
    setBusy("command");
    const tenant = status?.connection?.tenant_name || status?.tenant_name || "Xero organisation";
    const record = ["Xero", tenant, status?.connected ? "Connected" : "Not connected", health?.draft_invoice_sync_ready ? "Draft invoice sync ready" : "Accounting readiness needs review"];
    try {
      await createBackendCommandSlip({
        area: "accounting",
        record,
        action: "Prepare Xero draft sync review",
        slip: {
          source_type: "accounting",
          action_type: "review_xero_draft_sync",
          source_id: `xero-review-${Date.now()}`,
          title: "Xero draft sync needs owner approval",
          found: `${tenant} is ${status?.connected ? "connected" : "not connected"}. Draft-sync readiness: ${health?.draft_invoice_sync_ready ? "ready" : "needs review"}.`,
          prepared: "Accountant prepared a Xero draft-sync review. This does not sync an invoice, send anything or file tax.",
          why: "The owner should approve the exact invoice/accounting direction in Command before any Xero draft is created.",
          urgency: "Accounting check",
          payload: {
            office_role: "Accountant",
            prepared_form: {
              system: "Xero",
              organisation: tenant,
              connected: status?.connected ? "Yes" : "No",
              configured: status?.configured ? "Yes" : "No",
              add_on_active: status?.addon_active ? "Yes" : "No",
              draft_invoice_sync_ready: health?.draft_invoice_sync_ready || status?.draft_invoice_sync_ready ? "Yes" : "No",
              instruction: "Prepare a Xero draft only after the owner approves the invoice and accounting review.",
            },
            actions: ["Approve accounting review", "Export later", "Park"],
            will_do: ["Create an internal accounting review draft", "Keep Xero sync and invoice sending locked", "Record the owner decision"],
            prepared_only: true,
            owner_review_only: true,
            no_auto_send: true,
            no_auto_sync: true,
            no_auto_charge: true,
            no_auto_record_change: true,
          },
        },
      });
      setNotice("Xero review prepared in Command. No sync was run.");
    } catch (error) {
      setNotice(`Could not prepare the Xero review. ${error?.message || ""}`.trim());
    } finally {
      setBusy("");
    }
  }

  function downloadPack() {
    const base = String(API_BASE || window.location.origin).replace(/\/$/, "");
    window.open(`${base}/api/accounting/export/pack?system=both`, "_blank", "noopener,noreferrer");
  }

  const connected = Boolean(status?.connected);
  const configured = Boolean(status?.configured);
  const addon = Boolean(status?.addon_active);
  const tenant = status?.connection?.tenant_name || status?.tenant_name || "No organisation connected";
  const counts = health?.counts || {};

  return (
    <section className="cvSiteScreen cvOfficeXero">
      <header className="cvSiteScreenHeader">
        <span>Xero</span>
        <h2>Accounting connection and owner-approved draft sync</h2>
        <p>Connect Xero, check accounting health, export records and prepare draft-sync approval. Nothing syncs, sends or files tax from this page.</p>
      </header>

      <div className="cvOfficeXeroStatus">
        <article className={configured ? "ok" : "need"}><span>Environment</span><strong>{configured ? "Ready" : "Needs setup"}</strong></article>
        <article className={addon ? "ok" : "need"}><span>Accounting add-on</span><strong>{addon ? "Active" : "Off"}</strong></article>
        <article className={connected ? "ok" : "need"}><span>Connection</span><strong>{connected ? "Connected" : "Not connected"}</strong></article>
        <article className={health?.draft_invoice_sync_ready ? "ok" : "need"}><span>Draft sync</span><strong>{health?.draft_invoice_sync_ready ? "Ready for review" : "Check first"}</strong></article>
      </div>

      <div className="cvOfficeXeroLayout">
        <article className="cvOfficeXeroMain">
          <span>Organisation</span>
          <h3>{tenant}</h3>
          <p>{notice}</p>
          <div className="cvOfficeXeroActions">
            <button type="button" disabled={Boolean(busy)} onClick={load}>{busy === "load" ? "Checking…" : "Reload status"}</button>
            {!connected ? <button type="button" className="primary" disabled={Boolean(busy) || !configured || !addon} onClick={connect}>{busy === "connect" ? "Opening Xero…" : "Connect Xero"}</button> : null}
            {connected ? <button type="button" className="primary" disabled={Boolean(busy)} onClick={prepareSyncReview}>{busy === "command" ? "Preparing…" : "Prepare sync review in Command"}</button> : null}
            <button type="button" disabled={Boolean(busy)} onClick={downloadPack}>Download accounting pack</button>
            {connected ? <button type="button" disabled={Boolean(busy)} onClick={disconnect}>{busy === "disconnect" ? "Disconnecting…" : "Disconnect Xero"}</button> : null}
          </div>
        </article>

        <aside className="cvOfficeXeroChecks">
          <article><span>Invoices checked</span><strong>{counts.invoices ?? health?.invoices_count ?? 0}</strong><p>Read-only accounting health count.</p></article>
          <article><span>Safety</span><strong>Owner controlled</strong><p>No auto-send, auto-sync, card charge, tax filing or bank payout.</p></article>
          <article><span>Next step</span><strong>{connected ? "Command review" : "Connect Xero"}</strong><p>{connected ? "Prepare the exact draft-sync decision for owner approval." : "Complete the OAuth connection, then reload status."}</p></article>
        </aside>
      </div>
    </section>
  );
}
