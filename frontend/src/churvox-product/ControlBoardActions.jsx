import React from "react";
import { clean, firstGood, money } from "./controlBoardData";
import "./controlBoardActions.css";

function payloadOf(result) {
  return result?.data?.data ?? result?.data ?? result ?? {};
}

function idOf(record) {
  return clean(record?.id || record?._id || record?.job_id || record?.quote_id || record?.invoice_id || record?.user_id);
}

function emailOf(values, record) {
  return clean(values?.clientEmail || values?.customer_email || values?.client_email || values?.email || values?.to || record?.customer_email || record?.client_email || record?.email || record?.to);
}

function ActionButton({ children, tone = "", busy, disabled, onClick }) {
  return <button type="button" className={`cv7FlowAction ${tone}`} disabled={busy || disabled} onClick={onClick}>{children}</button>;
}

export default function ControlBoardActions({ record, values, setValues, api, refresh, close, notify }) {
  const [busy, setBusy] = React.useState("");
  const id = idOf(record);
  if (!record || record.__new || !id || record.type === "client") return null;

  const finish = async (title, text, { closeAfter = false } = {}) => {
    await refresh();
    notify({ tone: "good", title, text });
    if (closeAfter) close();
  };

  const fail = (title, error) => notify({ tone: "bad", title, text: error?.message || error?.error || "The action could not be completed." });

  const run = async (name, calls, title, text, options) => {
    setBusy(name);
    try {
      const result = await firstGood(calls);
      await finish(title, typeof text === "function" ? text(payloadOf(result)) : text, options);
      return result;
    } catch (error) {
      fail(title, error);
      return null;
    } finally {
      setBusy("");
    }
  };

  if (record.type === "job") {
    const status = clean(values.status || record.status).toLowerCase();
    const timer = clean(values.timerStatus || values.timer_status || record.timerStatus || record.timer_status).toLowerCase();
    const running = values.timer_running === true || record.timer_running === true || timer === "running";
    const paused = timer === "paused";
    const completed = /complete/.test(status);
    const recurring = clean(values.recurring || record.recurring);
    const invoiceId = clean(record.invoiceId || record.invoice_id || values.invoiceId || values.invoice_id);
    const seconds = Number(record.timeSeconds || record.total_time_seconds || record.time_seconds || 0);
    const hours = seconds > 0 ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m recorded` : "No time recorded yet";

    const timerAction = (action, label) => run(
      action,
      [
        () => api.post(`/jobs/${encodeURIComponent(id)}/timer/${action}`, {}),
        () => api.post(`/jobs/${encodeURIComponent(id)}/${action}`, {}),
      ],
      `Job ${label.toLowerCase()}`,
      `${record.title || "Job"} is now ${label.toLowerCase()}.`
    );

    const completeJob = async () => {
      if (!window.confirm("Complete this job and prepare its follow-up admin?")) return;
      return run(
        "complete",
        [() => api.post(`/jobs/${encodeURIComponent(id)}/complete`, {
          completion_note: values.notes || values.completionNote || "",
          completion_photos: values.proof ? [values.proof] : [],
          extras_total: Number(values.extrasTotal || values.extras_total || 0),
        })],
        "Job completed",
        (data) => {
          const invoice = data.invoice_created ? " Draft invoice prepared." : "";
          const next = data.next_recurring_job_id ? " Next recurring visit prepared." : "";
          const warnings = Array.isArray(data.warnings) && data.warnings.length ? ` ${data.warnings.join(" ")}` : "";
          return `The work is closed safely.${invoice}${next}${warnings}`;
        },
        { closeAfter: true }
      );
    };

    const createInvoice = () => run(
      "invoice",
      [
        () => api.post(`/jobs/${encodeURIComponent(id)}/create-invoice-draft`, {}),
        () => api.post(`/jobs/${encodeURIComponent(id)}/invoice-draft`, {}),
      ],
      "Draft invoice prepared",
      "The completed work is waiting for owner review in Money.",
      { closeAfter: true }
    );

    const archive = () => run(
      "archive",
      [() => api.patch(`/jobs/${encodeURIComponent(id)}`, { is_archived: true, archived_at: new Date().toISOString() })],
      "Job archived",
      "The one-off job is out of the active run sheet but remains in history.",
      { closeAfter: true }
    );

    return <section className="cv7FlowDock" data-testid="control-board-job-actions">
      <header><div><small>Next move</small><h3>{completed ? "Close the loop" : running ? "Work is live" : paused ? "Work is paused" : "Move the job forward"}</h3></div><span>{hours}</span></header>
      <p>{completed ? "Churvox has finished the field step. Review the prepared invoice, recurring visit and archive choice." : `Use the real field controls here. Completing the job prepares the admin without sending anything.${recurring && recurring !== "One-off" ? ` This is ${recurring.toLowerCase()} work.` : ""}`}</p>
      <div>
        {!completed && !running && !paused ? <ActionButton tone="primary" busy={busy} onClick={() => timerAction("start", "In progress")}>Start job</ActionButton> : null}
        {!completed && running ? <ActionButton busy={busy} onClick={() => timerAction("pause", "Paused")}>Pause</ActionButton> : null}
        {!completed && paused ? <ActionButton tone="primary" busy={busy} onClick={() => timerAction("resume", "In progress")}>Resume</ActionButton> : null}
        {!completed ? <ActionButton tone="complete" busy={busy} onClick={completeJob}>Complete & prepare admin</ActionButton> : null}
        {completed && !invoiceId ? <ActionButton tone="primary" busy={busy} onClick={createInvoice}>Prepare draft invoice</ActionButton> : null}
        {completed && invoiceId ? <ActionButton tone="primary" busy={busy} onClick={() => { close(); window.location.hash = "invoices"; }}>Open prepared invoice</ActionButton> : null}
        {completed && (!recurring || recurring === "One-off") ? <ActionButton tone="quiet" busy={busy} onClick={archive}>Archive one-off job</ActionButton> : null}
      </div>
    </section>;
  }

  if (record.type === "quote") {
    const status = clean(values.status || record.status).toLowerCase();
    const email = emailOf(values, record);
    const converted = clean(record.convertedJobId || record.converted_job_id || record.job_id);

    const sendQuote = async () => {
      setBusy("send");
      try {
        const direct = await api.post(`/quotes/${encodeURIComponent(id)}/send`, { to: email, owner_approved: true });
        if (direct?.success === false) {
          if (!email) throw new Error("Add the client email before sending this quote.");
          const subject = `Quote: ${values.title || record.title || "Your work"}`;
          const body = `Hi ${values.client || record.client || "there"},\n\nYour quote is ready for review.\n\n${values.scope || record.scope || ""}\n\nTotal: ${money(values.amount || record.amount)}\n\nThanks`;
          window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          await firstGood([() => api.patch(`/quotes/${encodeURIComponent(id)}`, { status: "Sent", sent_at: new Date().toISOString() })]);
        }
        setValues((current) => ({ ...current, status: "Sent" }));
        await finish("Quote sent", "The quote has moved to Sent and the follow-up clock has started.");
      } catch (error) { fail("Quote not sent", error); }
      finally { setBusy(""); }
    };

    const accept = () => run(
      "accept",
      [() => api.patch(`/quotes/${encodeURIComponent(id)}`, { status: "Accepted", accepted_at: new Date().toISOString() })],
      "Quote accepted",
      "The quote is ready to become scheduled work."
    );

    const convert = () => run(
      "convert",
      [
        () => api.post(`/quotes/${encodeURIComponent(id)}/convert-to-job`, {}),
        () => api.post(`/quotes/${encodeURIComponent(id)}/convert`, {}),
      ],
      "Job created from quote",
      "Client, scope and price have moved into Work without retyping.",
      { closeAfter: true }
    );

    return <section className="cv7FlowDock" data-testid="control-board-quote-actions">
      <header><div><small>Quote flow</small><h3>{converted ? "Work created" : /accepted/.test(status) ? "Accepted—book the work" : /sent|viewed/.test(status) ? "Waiting for the client" : "Ready for owner action"}</h3></div><span>{money(values.amount || record.amount)}</span></header>
      <p>Churvox keeps the sales step connected: prepare, send, follow up, accept and convert without copying the client or price again.</p>
      <div>
        {!converted && !/accepted|converted/.test(status) ? <ActionButton tone="primary" busy={busy} onClick={sendQuote}>Send quote</ActionButton> : null}
        {!converted && !/accepted|converted/.test(status) ? <ActionButton busy={busy} onClick={accept}>Mark accepted</ActionButton> : null}
        {!converted && /accepted/.test(status) ? <ActionButton tone="complete" busy={busy} onClick={convert}>Convert to job</ActionButton> : null}
        {converted ? <ActionButton tone="primary" busy={busy} onClick={() => { close(); window.location.hash = "jobs"; }}>Open work board</ActionButton> : null}
      </div>
    </section>;
  }

  if (record.type === "invoice") {
    const status = clean(values.status || record.status).toLowerCase();
    const email = emailOf(values, record);
    const total = Number(values.amount || record.amount || record.total || 0);

    const approve = () => run(
      "approve",
      [
        () => api.post(`/invoices/${encodeURIComponent(id)}/approve`, {}),
        () => api.patch(`/invoices/${encodeURIComponent(id)}`, { status: "Due", approved_at: new Date().toISOString() }),
      ],
      "Invoice approved",
      "The draft is approved and ready to send."
    );

    const sendInvoice = async (reminder = false) => {
      if (!email) { fail("Invoice not sent", new Error("Add the client email before sending.")); return; }
      setBusy(reminder ? "reminder" : "send");
      try {
        const subject = reminder ? `Reminder: ${values.number || record.number}` : `Invoice ${values.number || record.number}`;
        const html = `<p>Hi ${values.client || record.client || "there"},</p><p>${reminder ? "A friendly reminder that" : "Your"} invoice <strong>${values.number || record.number || ""}</strong> is ready.</p><p>Total: <strong>${money(total)}</strong><br/>Due: ${values.due || record.due || "Not set"}</p><p>Thanks</p>`;
        const result = await firstGood([
          () => api.post(`/invoices/${encodeURIComponent(id)}/${reminder ? "send-reminder" : "send-with-pdf"}`, { to: email, subject, html, invoice: { ...record, ...values }, owner_approved: true }),
          () => api.post(`/invoices/${encodeURIComponent(id)}/send-with-pdf`, { to: email, subject, html, invoice: { ...record, ...values }, owner_approved: true }),
        ]);
        await firstGood([() => api.patch(`/invoices/${encodeURIComponent(id)}`, { status: "Sent", sent_at: new Date().toISOString(), last_reminder_at: reminder ? new Date().toISOString() : undefined })]);
        await finish(reminder ? "Reminder sent" : "Invoice sent", reminder ? "The client has been reminded and the record is up to date." : "The invoice PDF has been sent and payment tracking has started.");
        return result;
      } catch (error) { fail(reminder ? "Reminder not sent" : "Invoice not sent", error); return null; }
      finally { setBusy(""); }
    };

    const markPaid = () => run(
      "paid",
      [
        () => api.post(`/invoices/${encodeURIComponent(id)}/mark-paid-pipeline`, {}),
        () => api.patch(`/invoices/${encodeURIComponent(id)}`, { status: "Paid", paid_at: new Date().toISOString() }),
      ],
      "Payment recorded",
      "The invoice and connected business flow now show Paid.",
      { closeAfter: true }
    );

    return <section className="cv7FlowDock" data-testid="control-board-invoice-actions">
      <header><div><small>Money flow</small><h3>{/paid/.test(status) ? "Payment complete" : /overdue/.test(status) ? "Payment needs chasing" : /sent|due/.test(status) ? "Waiting for payment" : "Owner review before sending"}</h3></div><span>{money(total)}</span></header>
      <p>Draft, approve, send, remind and record payment from the same invoice. Nothing sends until the owner chooses it.</p>
      <div>
        {/draft/.test(status) ? <ActionButton tone="primary" busy={busy} onClick={approve}>Approve invoice</ActionButton> : null}
        {!/paid|cancel/.test(status) ? <ActionButton tone="complete" busy={busy} onClick={() => sendInvoice(false)}>Send PDF</ActionButton> : null}
        {/sent|due|overdue/.test(status) ? <ActionButton busy={busy} onClick={() => sendInvoice(true)}>Send reminder</ActionButton> : null}
        {!/paid|cancel/.test(status) ? <ActionButton tone="primary" busy={busy} onClick={markPaid}>Mark paid</ActionButton> : null}
      </div>
    </section>;
  }

  if (record.type === "worker") {
    const invited = !/not invited|inactive/i.test(clean(values.app || record.app));
    const invite = () => run(
      "invite",
      [
        () => api.post(`/team/workers/${encodeURIComponent(id)}/invite`, { email: values.email || record.email }),
        () => api.patch(`/team/workers/${encodeURIComponent(id)}`, { app_status: "Invited", status: "Invited", invited_at: new Date().toISOString() }),
      ],
      "Worker invited",
      "The person can now enter the worker flow for assigned jobs."
    );
    const approveTime = () => run(
      "timesheet",
      [() => api.patch(`/team/workers/${encodeURIComponent(id)}`, { payroll_status: "Approved for export", timesheet_approved_at: new Date().toISOString() })],
      "Timesheet approved",
      "Recorded time is approved for CSV export. No tax, government or bank action was taken."
    );
    return <section className="cv7FlowDock" data-testid="control-board-worker-actions">
      <header><div><small>Team flow</small><h3>{invited ? "Worker connected" : "Finish worker setup"}</h3></div><span>{values.timesheet || record.timesheet || "No time recorded"}</span></header>
      <p>Keep access, field work, proof and time review connected without exposing owner-only money or approvals.</p>
      <div>
        {!invited ? <ActionButton tone="primary" busy={busy} disabled={!clean(values.email || record.email)} onClick={invite}>Invite to worker app</ActionButton> : null}
        <ActionButton tone="complete" busy={busy} onClick={approveTime}>Approve time for export</ActionButton>
      </div>
    </section>;
  }

  if (record.type === "message") {
    const sendReply = () => run(
      "message",
      [() => api.post("/messages", {
        from: "Owner",
        to: values.to || record.from || "Worker/client",
        channel: values.channel || record.channel || "Internal",
        client_name: values.client || record.client || "",
        job_title: values.job || record.job || "",
        subject: values.subject || record.subject || "Reply",
        priority: values.priority || record.priority || "Normal",
        message: values.draft || values.detail || record.draft || record.detail || "",
        status: "sent",
        sent_at: new Date().toISOString(),
        reply_to_message_id: id,
      })],
      "Reply sent",
      "The reply is stored with its client, job and worker context.",
      { closeAfter: true }
    );
    return <section className="cv7FlowDock" data-testid="control-board-message-actions">
      <header><div><small>Conversation flow</small><h3>Review the prepared reply</h3></div><span>{values.channel || record.channel || "Internal"}</span></header>
      <p>Churvox keeps the conversation attached to the work. Edit the draft above, then send it as the owner.</p>
      <div><ActionButton tone="primary" busy={busy} disabled={!clean(values.draft || values.detail || record.draft || record.detail)} onClick={sendReply}>Send approved reply</ActionButton></div>
    </section>;
  }

  return null;
}
