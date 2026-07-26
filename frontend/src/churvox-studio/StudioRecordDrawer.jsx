import React from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  FileCheck2,
  Pause,
  Play,
  Send,
  X,
} from "lucide-react";
import { clean, firstGood, money, titleOf } from "../churvox-product/controlBoardData";
import { fieldsFor, saveRecord } from "./studioModel";

function StudioField({ definition, value, disabled, onChange }) {
  const shared = {
    name: definition.key,
    value: value ?? "",
    disabled,
    onChange,
  };
  return (
    <label className={`cvsField span-${definition.span || 1}`}>
      <span>{definition.label}</span>
      {definition.type === "textarea" ? (
        <textarea {...shared} rows={4} />
      ) : definition.options ? (
        <select {...shared}>
          {definition.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input {...shared} type={definition.type || "text"} step={definition.type === "number" ? "0.01" : undefined} />
      )}
    </label>
  );
}

function Action({ children, icon: Icon = ArrowRight, tone = "", busy, onClick, disabled }) {
  return (
    <button type="button" className={`cvsDrawerAction ${tone}`} disabled={busy || disabled} onClick={onClick}>
      <Icon size={16} />
      <span>{children}</span>
    </button>
  );
}

export default function StudioRecordDrawer({ record, data, api, refresh, close, notify }) {
  const [values, setValues] = React.useState({});
  const [busy, setBusy] = React.useState("");

  React.useEffect(() => {
    if (record) setValues({ ...record });
  }, [record]);

  React.useEffect(() => {
    if (!record) return undefined;
    const escape = (event) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [record, close]);

  if (!record) return null;

  const id = clean(record.id || record._id);
  const status = clean(values.status || record.status).toLowerCase();
  const isNew = Boolean(record.__new || !id);
  const definitions = fieldsFor(record, data);

  const refreshQuietly = () => {
    try {
      Promise.resolve(refresh()).catch(() => {});
    } catch {}
  };

  const finish = (title, text, shouldClose = false) => {
    notify({ tone: "good", title, text });
    if (shouldClose) close();
    refreshQuietly();
  };

  const fail = (title, error) => notify({ tone: "bad", title, text: error?.message || "The action could not be completed." });

  const save = async (action = "save") => {
    setBusy(action);
    try {
      await saveRecord(api, record, values, action);
      finish(record.type === "approval" ? "Decision updated" : isNew ? "Record created" : "Changes saved", `${titleOf(values)} is up to date.`, true);
    } catch (error) {
      fail("Could not save", error);
    } finally {
      setBusy("");
    }
  };

  const run = async (name, calls, title, text, update = null, shouldClose = false) => {
    setBusy(name);
    try {
      const result = await firstGood(calls);
      if (update) setValues((current) => ({ ...current, ...(typeof update === "function" ? update(result?.data?.data ?? result?.data ?? result) : update) }));
      finish(title, text, shouldClose);
    } catch (error) {
      fail(title, error);
    } finally {
      setBusy("");
    }
  };

  const renderActions = () => {
    if (isNew || record.type === "client") return null;

    if (record.type === "approval") {
      return (
        <>
          <Action tone="primary" busy={busy} icon={Check} onClick={() => save("approve")}>Approve prepared move</Action>
          <Action busy={busy} icon={Pause} onClick={() => save("park")}>Park for later</Action>
        </>
      );
    }

    if (record.type === "job") {
      const running = /progress|working|running/.test(status) || values.timer_running === true;
      const paused = /pause/.test(clean(values.timerStatus || values.timer_status || record.timerStatus));
      const completed = /complete/.test(status);
      const invoicePayload = {
        job_id: id,
        linked_job_id: id,
        source_job_id: id,
        job_title: values.title || record.title || "Completed job",
        client_name: values.client || record.client || "No client",
        customer_email: values.clientEmail || record.clientEmail || "",
        amount: Number(values.price || record.price || 0) + Number(values.extrasTotal || record.extrasTotal || 0),
        status: "draft",
        line_item: values.title || record.title || "Completed job",
        description: values.completionNote || values.notes || record.notes || "Completed work ready for owner invoice review.",
        evidence: values.proof || record.proof || "",
        notes: values.completionNote || values.notes || record.notes || "",
        source: "studio_completed_job",
      };
      return (
        <>
          {!completed && !running && !paused ? <Action tone="primary" icon={Play} busy={busy} onClick={() => run("start", [() => api.post(`/jobs/${id}/timer/start`, {}), () => api.post(`/jobs/${id}/start`, {})], "Job started", "The worker timer and live job state are moving.", { status: "in_progress", timerStatus: "running", timer_running: true })}>Start job</Action> : null}
          {!completed && running ? <Action icon={Pause} busy={busy} onClick={() => run("pause", [() => api.post(`/jobs/${id}/timer/pause`, {}), () => api.post(`/jobs/${id}/pause`, {})], "Job paused", "The job is paused without losing recorded time.", { timerStatus: "paused", timer_running: false })}>Pause</Action> : null}
          {!completed && paused ? <Action tone="primary" icon={Play} busy={busy} onClick={() => run("resume", [() => api.post(`/jobs/${id}/timer/resume`, {}), () => api.post(`/jobs/${id}/resume`, {})], "Job resumed", "The field timer is running again.", { status: "in_progress", timerStatus: "running", timer_running: true })}>Resume</Action> : null}
          {!completed ? <Action tone="complete" icon={FileCheck2} busy={busy} onClick={() => run("complete", [() => api.post(`/jobs/${id}/complete`, { completion_note: values.completionNote || values.notes || "", completion_photos: values.proof ? [values.proof] : [], extras_total: Number(values.extrasTotal || 0) })], "Job completed", "The field work is closed and the next admin has been prepared.", { status: "completed" }, true)}>Complete & prepare admin</Action> : null}
          {completed ? <Action tone="primary" icon={FileCheck2} busy={busy} onClick={() => run("invoice", [() => api.post("/invoices", invoicePayload), () => api.post(`/jobs/${id}/create-invoice-draft`, {}), () => api.post(`/jobs/${id}/invoice-draft`, {})], "Draft invoice prepared", "The invoice is waiting in Money for owner review.", null, true)}>Prepare invoice</Action> : null}
        </>
      );
    }

    if (record.type === "quote") {
      const accepted = /accepted/.test(status);
      const converted = /converted/.test(status) || record.convertedJobId;
      return (
        <>
          {!accepted && !converted ? <Action tone="primary" icon={Send} busy={busy} onClick={() => run("send", [() => api.post(`/quotes/${id}/send`, { to: values.clientEmail, owner_approved: true })], "Quote sent", "The quote moved to Sent and follow-up tracking has started.", { status: "Sent" })}>Send quote</Action> : null}
          {!accepted && !converted ? <Action icon={Check} busy={busy} onClick={() => run("accept", [() => api.patch(`/quotes/${id}`, { status: "Accepted", accepted_at: new Date().toISOString() })], "Quote accepted", "The quote is ready to become scheduled work.", { status: "Accepted" })}>Mark accepted</Action> : null}
          {accepted && !converted ? <Action tone="complete" busy={busy} onClick={() => run("convert", [() => api.post(`/quotes/${id}/convert-to-job`, {}), () => api.post(`/quotes/${id}/convert`, {})], "Job created", "Client, scope and price moved into Work without retyping.", { status: "Converted" }, true)}>Convert to job</Action> : null}
        </>
      );
    }

    if (record.type === "invoice") {
      const paid = /paid/.test(status);
      const draft = /draft/.test(status);
      return (
        <>
          {draft ? <Action tone="primary" icon={Check} busy={busy} onClick={() => run("approve", [() => api.post(`/invoices/${id}/approve`, {}), () => api.patch(`/invoices/${id}`, { status: "Due" })], "Invoice approved", "The invoice is ready to send.", { status: "Due" })}>Approve invoice</Action> : null}
          {!draft && !paid ? <Action tone="primary" icon={Send} busy={busy} onClick={() => run("send", [() => api.post(`/invoices/${id}/send-with-pdf`, { to: values.clientEmail, invoice: { ...record, ...values }, owner_approved: true })], "Invoice sent", "The client received the invoice and payment tracking is active.", { status: "Sent" })}>Send invoice</Action> : null}
          {!paid ? <Action icon={Clock3} busy={busy} onClick={() => run("reminder", [() => api.post(`/invoices/${id}/send-reminder`, { to: values.clientEmail, owner_approved: true })], "Reminder sent", "The client has been reminded without changing payment status.")}>Send reminder</Action> : null}
          {!paid ? <Action tone="complete" icon={Check} busy={busy} onClick={() => run("paid", [() => api.post(`/invoices/${id}/mark-paid-pipeline`, {}), () => api.patch(`/invoices/${id}`, { status: "Paid", paid_at: new Date().toISOString() })], "Payment recorded", `${money(values.amount || record.amount)} is now recorded as paid.`, { status: "Paid" }, true)}>Mark paid</Action> : null}
        </>
      );
    }

    if (record.type === "worker") {
      return (
        <>
          <Action tone="primary" icon={Send} busy={busy} onClick={() => run("invite", [() => api.post(`/team/workers/${id}/invite`, {}), () => api.post(`/team/${id}/invite`, {})], "Worker invitation sent", "The worker can complete setup from the invitation.", { app: "Invited" })}>Send worker invite</Action>
          <Action icon={Check} busy={busy} onClick={() => run("timesheet", [() => api.post(`/timesheets/${id}/approve`, {}), () => api.patch(`/team/workers/${id}`, { payroll_status: "Approved" })], "Time approved", "The reviewed time is locked for the selected period.", { payroll: "Approved" })}>Approve time</Action>
        </>
      );
    }

    if (record.type === "message") {
      return <Action tone="primary" icon={Send} busy={busy} onClick={() => run("reply", [() => api.post(`/messages/${id}/reply`, { message: values.draft || values.detail, owner_approved: true }), () => api.post("/messages", { to: values.from, subject: `Re: ${values.subject}`, message: values.draft || values.detail, client_name: values.client, job_title: values.job })], "Reply sent", "The reply stayed connected to the same conversation.", null, true)}>Send reply</Action>;
    }

    return null;
  };

  return (
    <div className="cvsDrawerLayer" role="dialog" aria-modal="true" aria-label={`${isNew ? "Create" : "Open"} ${record.type}`}>
      <button className="cvsDrawerScrim" type="button" aria-label="Close record" onClick={close} />
      <section className="cvsDrawer">
        <header className="cvsDrawerHead">
          <div>
            <span className="cvsEyebrow">{isNew ? `New ${record.type}` : record.type === "approval" ? "Owner decision" : record.type}</span>
            <h2>{isNew ? `Create ${record.type}` : titleOf(record)}</h2>
            <p>{record.type === "approval" ? "Review the reason, evidence and exact effect before deciding." : "Work on the record without leaving the page behind it."}</p>
          </div>
          <button type="button" className="cvsClose" onClick={close}><X size={20} /><span>Close</span></button>
        </header>

        <div className="cvsDrawerBody">
          <div className="cvsDrawerForm">
            {definitions.map((definition) => (
              <StudioField
                key={definition.key}
                definition={definition}
                value={values[definition.key]}
                disabled={Boolean(busy)}
                onChange={(event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }))}
              />
            ))}
          </div>

          {!isNew ? (
            <aside className="cvsDrawerFlow">
              <span className="cvsEyebrow">Connected next move</span>
              <h3>Keep the record moving</h3>
              <p>These actions use the real Churvox workflow. Nothing sends, pays, syncs or completes without an explicit click.</p>
              <div>{renderActions()}</div>
            </aside>
          ) : null}
        </div>

        <footer className="cvsDrawerFoot">
          <button type="button" className="cvsTextButton" onClick={close}>Cancel</button>
          <button type="button" className="cvsSaveButton" disabled={Boolean(busy)} onClick={() => save("save")}>
            {busy ? "Working…" : isNew ? "Create record" : "Save changes"}
            <ArrowRight size={17} />
          </button>
        </footer>
      </section>
    </div>
  );
}
