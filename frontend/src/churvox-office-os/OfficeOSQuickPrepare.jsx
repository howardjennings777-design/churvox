import React from "react";
import { ArrowRight, CheckCircle2, ClipboardPlus, ShieldCheck, X } from "lucide-react";
import { createBackendCommandSlip } from "../churvox-office-lab/OfficeTeamCommandApi";
import "./officeOSQuickPrepare.css";

export const OFFICE_OS_QUICK_PREPARE_BUILD = "churvox-office-os-quick-prepare-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_QUICK_PREPARE_BUILD__ = OFFICE_OS_QUICK_PREPARE_BUILD;
}

const AREAS = Object.freeze([
  { id: "work", label: "Job or booking", role: "Receptionist", action: "Prepare job draft", approval: "Approve and create job draft" },
  { id: "clients", label: "Client record", role: "Client Memory", action: "Prepare client draft", approval: "Approve and create client" },
  { id: "quotes", label: "Quote", role: "Bookkeeper", action: "Prepare quote draft", approval: "Approve and create quote draft" },
  { id: "invoices", label: "Invoice", role: "Bookkeeper", action: "Prepare invoice draft", approval: "Approve and create invoice draft" },
  { id: "messages", label: "Message or reply", role: "Receptionist", action: "Prepare message draft", approval: "Approve and create message draft" },
  { id: "staff", label: "Worker or hours item", role: "Payroll Clerk", action: "Prepare staff review", approval: "Approve and create staff review" },
]);

const emptyForm = () => ({ area: "work", title: "", person: "", when: "", amount: "", details: "", notes: "" });

function selectedArea(id) {
  return AREAS.find((area) => area.id === id) || AREAS[0];
}

function fieldCopy(areaId) {
  if (areaId === "clients") return {
    title: "Client name *",
    titlePlaceholder: "Client or organisation",
    person: "Phone",
    personPlaceholder: "Phone number",
    when: "Email",
    whenPlaceholder: "client@example.com",
    amount: null,
    details: "Address or client details",
    detailsPlaceholder: "Service address or useful client information",
    detailsRequired: false,
    notes: "Client notes",
  };
  if (areaId === "quotes") return {
    title: "Quote title *", titlePlaceholder: "Service quote", person: "Client", personPlaceholder: "Who is it for?", when: "Follow-up timing", whenPlaceholder: "Friday afternoon", amount: "Quote amount", details: "Scope *", detailsPlaceholder: "Work included in the quote", detailsRequired: true, notes: "Quote notes",
  };
  if (areaId === "invoices") return {
    title: "Job or invoice title *", titlePlaceholder: "Completed service", person: "Client", personPlaceholder: "Who is it for?", when: "Invoice timing", whenPlaceholder: "Today", amount: "Invoice total", details: "Line items *", detailsPlaceholder: "Base work, materials and approved extras", detailsRequired: true, notes: "Invoice notes",
  };
  if (areaId === "messages") return {
    title: "Subject *", titlePlaceholder: "Booking request", person: "Client or person", personPlaceholder: "Who is the message for?", when: "Send timing", whenPlaceholder: "After owner approval", amount: null, details: "Message *", detailsPlaceholder: "Message that needs preparing", detailsRequired: true, notes: "Prepared reply or owner notes",
  };
  if (areaId === "staff") return {
    title: "Job or review title *", titlePlaceholder: "Timer review", person: "Worker *", personPlaceholder: "Worker name", when: "Hours or timing", whenPlaceholder: "5h 42m", amount: null, details: "Issue or review *", detailsPlaceholder: "What needs checking?", detailsRequired: true, notes: "Staff notes",
  };
  return {
    title: "Job or booking title *", titlePlaceholder: "Service visit", person: "Client", personPlaceholder: "Who is it for?", when: "Date or timing", whenPlaceholder: "Friday 10:00am", amount: "Price", details: "Scope or instructions *", detailsPlaceholder: "Work, access and instructions", detailsRequired: true, notes: "Owner notes",
  };
}

function compact(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => String(value || "").trim()));
}

function preparedFormFor(form) {
  const title = form.title.trim();
  const person = form.person.trim();
  const when = form.when.trim();
  const amount = form.amount.trim();
  const details = form.details.trim();
  const notes = form.notes.trim();

  if (form.area === "clients") return compact({ name: title, phone: person, email: when, address: details, notes });
  if (form.area === "quotes") return compact({ title, client: person, scope: details, price: amount, follow_up: when, notes });
  if (form.area === "invoices") return compact({ job: title, client: person, line_items: details, total: amount, invoice_timing: when, notes });
  if (form.area === "messages") return compact({ subject: title, client: person, message: details, reply: notes, send_timing: when });
  if (form.area === "staff") return compact({ worker: person, job: title, hours: when, issue: details, notes });
  return compact({ title, client: person, date: when, price: amount, notes: [details, notes].filter(Boolean).join(" · ") });
}

function detailText(preparedForm) {
  return Object.entries(preparedForm).map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`).join(" · ");
}

function requiredFieldsFor(areaId) {
  if (areaId === "clients") return ["name"];
  if (areaId === "invoices") return ["job"];
  if (areaId === "messages") return ["subject"];
  if (areaId === "staff") return ["worker"];
  return ["title"];
}

export default function OfficeOSQuickPrepare() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const area = selectedArea(form.area);
  const copy = fieldCopy(form.area);
  const requiredPersonReady = form.area !== "staff" || Boolean(form.person.trim());
  const canSubmit = Boolean(form.title.trim() && requiredPersonReady && (!copy.detailsRequired || form.details.trim()));

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
  };

  const changeArea = (value) => {
    setForm({ ...emptyForm(), area: value });
    setResult(null);
  };

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setResult(null);

    const preparedForm = preparedFormFor(form);

    try {
      await createBackendCommandSlip({
        area: form.area,
        action: area.action,
        record: [area.label, preparedForm.name || preparedForm.title || preparedForm.job || preparedForm.subject || "Prepared item", "Prepared for owner review", detailText(preparedForm)],
        slip: {
          source_type: form.area,
          action_type: area.action,
          source_id: `connected-office-os-${form.area}-${Date.now()}`,
          title: `${area.label}: ${preparedForm.name || preparedForm.title || preparedForm.job || preparedForm.subject}`,
          found: `The owner entered a new ${area.label.toLowerCase()} request in the connected Office OS.`,
          prepared: `${area.action} is ready in Command. Every field remains editable and no business record has changed.`,
          why: `Owner approval is required before this ${area.label.toLowerCase()} can change a real record or send anything.`,
          urgency: "Owner review",
          payload: {
            office_role: area.role,
            prepared_form: preparedForm,
            required_fields: requiredFieldsFor(form.area),
            will_do: [`Create the owner-approved ${area.label.toLowerCase()} draft only after Command approval.`],
            actions: [area.approval, "Ask for more information", "Park"],
            source: "connected_office_os_quick_prepare",
            confidence: { score: 1, why: ["The owner entered the fields directly."] },
            prepared_only: true,
            owner_review_only: true,
            no_auto_send: true,
            no_auto_sync: true,
            no_auto_charge: true,
            no_auto_record_change: true,
          },
        },
      });
      setResult({ ok: true, message: `${area.label} prepared in Command. Review it there before the record is created.` });
      setForm((current) => ({ ...emptyForm(), area: current.area }));
    } catch (error) {
      setResult({ ok: false, message: `Could not prepare the Command slip. Nothing changed. ${error?.message || "Try again."}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className={open ? "cvQuickPrepare open" : "cvQuickPrepare"} aria-label="Prepare an owner-controlled Command slip">
      <button type="button" className="cvQuickPrepareToggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <ClipboardPlus size={20} />
        <span><strong>Prepare new work</strong><small>Creates a Command slip first</small></span>
        {open ? <X size={18} /> : <ArrowRight size={18} />}
      </button>

      <form onSubmit={submit} className="cvQuickPrepareForm">
        <header>
          <ShieldCheck size={23} />
          <div><small>Owner-controlled preparation</small><h2>Prepare it here. Approve it in Command.</h2><p>The record is created only after the owner checks and approves the prepared fields.</p></div>
        </header>

        <label className="wide"><span>What are you preparing?</span><select value={form.area} onChange={(event) => changeArea(event.target.value)}>{AREAS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span>{copy.title}</span><input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={copy.titlePlaceholder} required /></label>
        <label><span>{copy.person}</span><input value={form.person} onChange={(event) => update("person", event.target.value)} placeholder={copy.personPlaceholder} required={form.area === "staff"} /></label>
        <label><span>{copy.when}</span><input value={form.when} onChange={(event) => update("when", event.target.value)} placeholder={copy.whenPlaceholder} /></label>
        {copy.amount ? <label><span>{copy.amount}</span><input value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="$150 or leave blank" /></label> : null}
        <label className="wide"><span>{copy.details}</span><textarea rows="4" value={form.details} onChange={(event) => update("details", event.target.value)} placeholder={copy.detailsPlaceholder} required={copy.detailsRequired} /></label>
        <label className="wide"><span>{copy.notes}</span><textarea rows="2" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Anything Command should keep visible" /></label>

        <div className="cvQuickPrepareActions">
          <button type="submit" disabled={busy || !canSubmit}>{busy ? "Preparing…" : area.action}</button>
          <a href="/dashboard#command">Open working Command <ArrowRight size={16} /></a>
        </div>

        {result ? <div className={result.ok ? "cvQuickPrepareResult good" : "cvQuickPrepareResult bad"}>{result.ok ? <CheckCircle2 size={18} /> : <X size={18} />}<span>{result.message}</span></div> : null}
      </form>
    </aside>
  );
}
