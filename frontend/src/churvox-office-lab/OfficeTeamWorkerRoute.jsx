import React, { useMemo, useState } from "react";
import "./OfficeTeamWorkerRoute.css";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";
import { createBackendWorkerPaymentRequest, createBackendWorkerUpdateRequest } from "./OfficeTeamCommandApi";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

const statusSteps = ["Acknowledge", "Start", "Pause", "Complete"];
const payKeywords = ["payment", "pay", "invoice", "card", "checkout"];

export default function OfficeTeamWorkerRoute() {
  const live = useOfficeTeamRows("worker", []);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [note, setNote] = useState("");
  const [trail, setTrail] = useState([]);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const rows = live.rows;
  const hasWork = rows.length > 0;
  const current = selectedRow(rows, selected, []);
  const title = hasWork ? current?.[1] || "today’s work" : "No assigned work yet";
  const detail = hasWork ? current?.[3] || "Check notes before starting." : "When the boss assigns real work, it will appear here.";
  const badge = hasWork ? current?.[2] || "Ready" : "Waiting";
  const type = hasWork ? current?.[0] || "Assigned" : "Clear";
  const payment = paymentDetails(current);
  const quickNotes = useMemo(() => ["Running late", "Need owner check", "Extra work found", "Proof added"], []);

  function recordWorkerStep(step) {
    if (!hasWork) {
      addTrail("No live assigned work to update yet.");
      return;
    }
    setStatus(step);
    addTrail(`${step} recorded on this phone view.`);
  }

  async function sendBossUpdate(text = note) {
    if (updateBusy) return;
    const clean = String(text || "Worker update from phone view").trim();
    const record = ["Worker update", title, "Owner review", clean];
    setUpdateBusy(true);
    try {
      await createBackendWorkerUpdateRequest({
        title,
        update: clean,
        updateType: "Worker update",
        status: hasWork ? status : "General update",
      });
      addTrail(`Boss update sent to Command: ${clean}`);
    } catch (error) {
      createOfficeTeamLocalCommand({ area: "worker", record, action: "Worker update" });
      addTrail(`Boss update prepared for Command: ${clean}. ${error?.message || ""}`.trim());
    } finally {
      setUpdateBusy(false);
      setNote("");
    }
  }

  async function copyPaymentLink() {
    if (!payment.link) {
      await requestPaymentLink();
      return;
    }
    try {
      await navigator.clipboard.writeText(payment.link);
      setPaymentNotice("Payment link copied for the customer. No charge was created by Churvox.");
      addTrail("Customer payment link copied. Payment still completes through the secure invoice page.");
    } catch {
      setPaymentNotice(payment.link);
    }
  }

  async function openPaymentLink() {
    if (!payment.link) {
      await requestPaymentLink();
      return;
    }
    window.open(payment.link, "_blank", "noopener,noreferrer");
    setPaymentNotice("Payment page opened. Churvox will only mark paid after the real provider confirms it.");
    addTrail("Payment page opened for customer card payment.");
  }

  async function requestPaymentLink() {
    if (paymentBusy) return;
    setPaymentBusy(true);
    const record = ["Payment request", title, payment.amount || "Amount check", "Worker needs an approved invoice payment link before taking card payment."];
    try {
      await createBackendWorkerPaymentRequest({
        title,
        amount: payment.amount || current?.[2] || "Amount check",
        invoice: payment.invoice,
        customer: payment.customer,
        paymentLink: payment.link,
      });
      setPaymentNotice("Payment request sent to owner Command. Worker cannot charge a card without an approved link.");
      addTrail("Payment link request sent to Command for owner approval.");
    } catch (error) {
      createOfficeTeamLocalCommand({ area: "worker", record, action: "Prepare payment link" });
      setPaymentNotice("Payment request prepared for Command because the live route was not available. No card was charged.");
      addTrail(`Payment link request prepared for Command. ${error?.message || ""}`.trim());
    } finally {
      setPaymentBusy(false);
    }
  }

  function addTrail(text) {
    setTrail((currentTrail) => [{ id: `${Date.now()}-${text}`, text }, ...currentTrail].slice(0, 5));
  }

  return (
    <main className="cvWorkerRouteShell">
      <section className="cvWorkerHero">
        <div>
          <span>Churvox Worker</span>
          <h1>Simple phone work. Office admin stays with the owner.</h1>
          <p>Workers see today’s task, update progress, add proof and show a safe payment link when the invoice is ready.</p>
        </div>
        <strong>{hasWork ? live.label : "Waiting for assigned work"}</strong>
      </section>

      <section className="cvWorkerRoutePhone" aria-label="Churvox worker phone app">
        <header>
          <div>
            <span>Today</span>
            <h2>{hasWork ? "Current job" : "No job yet"}</h2>
          </div>
          <strong>{hasWork ? status : "Waiting"}</strong>
        </header>

        <article className={`cvWorkerRouteJob ${hasWork ? "" : "cvWorkerRouteEmptyJob"}`}>
          <small>{type}</small>
          <h3>{title}</h3>
          <p>{detail}</p>
          <em>{badge}</em>
        </article>

        <div className="cvWorkerRouteSteps">
          {statusSteps.map((step) => <button key={step} type="button" disabled={!hasWork} onClick={() => recordWorkerStep(step)}>{step}</button>)}
        </div>

        <section className="cvWorkerPaymentPanel" aria-label="Worker payment panel">
          <div>
            <span>Take payment</span>
            <h3>{payment.link ? "Show customer pay link" : "Payment link needed"}</h3>
            <p>{payment.copy}</p>
          </div>
          <div className={`cvWorkerPayCode ${payment.link ? "ready" : "locked"}`} aria-hidden="true"><b>{payment.code}</b></div>
          <dl>
            <div><dt>Amount</dt><dd>{payment.amount || "Owner check"}</dd></div>
            <div><dt>Invoice</dt><dd>{payment.invoice || "Not linked"}</dd></div>
          </dl>
          <div className="cvWorkerPaymentActions">
            <button type="button" disabled={!hasWork || paymentBusy} onClick={openPaymentLink}>{paymentBusy ? "Preparing…" : payment.link ? "Open pay page" : "Request link"}</button>
            <button type="button" disabled={!hasWork || paymentBusy} onClick={copyPaymentLink}>{payment.link ? "Copy link" : "Prepare request"}</button>
          </div>
          <small>No card is charged inside Worker View. Payment happens through an approved secure invoice link.</small>
          {paymentNotice ? <p className="cvWorkerPaymentNotice">{paymentNotice}</p> : null}
        </section>

        <section className="cvWorkerRouteNoteBox">
          <span>Boss update</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell the office if something changed…" />
          <button type="button" disabled={updateBusy} onClick={() => sendBossUpdate()}>{updateBusy ? "Preparing…" : hasWork ? "Prepare office update" : "Prepare general update"}</button>
        </section>

        <div className="cvWorkerRouteQuickNotes">
          {quickNotes.map((item) => <button key={item} type="button" disabled={!hasWork || updateBusy} onClick={() => sendBossUpdate(item)}>{item}</button>)}
        </div>

        <section className="cvWorkerRouteProof">
          <button type="button" disabled={!hasWork} onClick={() => addTrail("Photo proof opened.")}>Photo proof</button>
          <button type="button" disabled={!hasWork} onClick={() => addTrail("Timer note opened.")}>Timer note</button>
        </section>
      </section>

      <aside className="cvWorkerRouteDesk">
        <span>Worker route</span>
        <h2>Same Churvox system, stripped down for the phone.</h2>
        <p>No owner screens, no pricing, no admin tables. Workers only update the work, show approved payment links, and send useful notes back to Command.</p>
        <strong>{hasWork ? live.label : "No live assigned work found"}</strong>

        <section>
          <h3>Worker queue</h3>
          {hasWork ? rows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button">
              <span>{row[0]}</span>
              <b>{row[1]}</b>
              <small>{row[2]}</small>
            </button>
          )) : <p>No assigned work yet.</p>}
        </section>

        <section>
          <h3>Phone trail</h3>
          {trail.length ? trail.map((item) => <p key={item.id}>{item.text}</p>) : <p>No worker actions yet.</p>}
        </section>
      </aside>
    </main>
  );
}

function paymentDetails(row = []) {
  const meta = row?.[4] && typeof row[4] === "object" ? row[4] : {};
  const fromText = [row?.[1], row?.[2], row?.[3]].map((part) => String(part || "")).join(" ");
  const linkFromText = fromText.match(/https?:\/\/\S+/i)?.[0] || "";
  const link = meta.paymentLink || linkFromText;
  const amount = meta.amountDue || (payKeywords.some((word) => fromText.toLowerCase().includes(word)) ? row?.[2] : "");
  const invoice = meta.invoiceNumber || (String(row?.[1] || "").match(/inv[-\s#]*\w+/i)?.[0] || "");
  const customer = meta.customerName || titleFromText(row?.[1]) || "Customer";
  const code = link ? shortCode(link) : "LOCKED";
  const copy = link
    ? "Let the customer tap the secure pay page or copy the link. Churvox waits for provider confirmation before marking anything paid."
    : "No approved payment link is attached yet. Prepare a Command request before the worker takes card payment.";
  return { link, amount, invoice, customer, code, copy };
}

function titleFromText(value = "") {
  return String(value || "").split("—")[0].trim();
}

function shortCode(value = "") {
  const safe = String(value || "PAY").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return safe.slice(-6) || "READY";
}
