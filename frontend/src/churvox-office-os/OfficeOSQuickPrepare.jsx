import React from "react";
import { ArrowRight, CheckCircle2, ClipboardPlus, ShieldCheck, X } from "lucide-react";
import { createBackendCommandSlip } from "../churvox-office-lab/OfficeTeamCommandApi";
import "./officeOSQuickPrepare.css";

export const OFFICE_OS_QUICK_PREPARE_BUILD = "churvox-office-os-quick-prepare-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_QUICK_PREPARE_BUILD__ = OFFICE_OS_QUICK_PREPARE_BUILD;
}

const AREAS = Object.freeze([
  { id: "work", label: "Job or booking", role: "Receptionist", action: "Prepare job draft" },
  { id: "clients", label: "Client record", role: "Client Memory", action: "Prepare client draft" },
  { id: "quotes", label: "Quote", role: "Bookkeeper", action: "Prepare quote draft" },
  { id: "invoices", label: "Invoice", role: "Bookkeeper", action: "Prepare invoice draft" },
  { id: "messages", label: "Message or reply", role: "Receptionist", action: "Prepare message draft" },
  { id: "staff", label: "Worker or hours item", role: "Payroll Clerk", action: "Prepare staff review" },
]);

const emptyForm = () => ({ area: "work", title: "", person: "", when: "", amount: "", details: "", notes: "" });

function selectedArea(id) {
  return AREAS.find((area) => area.id === id) || AREAS[0];
}

function detailText(form) {
  return [
    form.person ? `Client or person: ${form.person}` : "",
    form.when ? `When: ${form.when}` : "",
    form.amount ? `Amount: ${form.amount}` : "",
    form.details ? `Details: ${form.details}` : "",
    form.notes ? `Notes: ${form.notes}` : "",
  ].filter(Boolean).join(" · ");
}

export default function OfficeOSQuickPrepare() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const area = selectedArea(form.area);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
  };

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.details.trim() || busy) return;
    setBusy(true);
    setResult(null);

    const preparedForm = {
      title: form.title.trim(),
      client_or_person: form.person.trim(),
      when: form.when.trim(),
      amount: form.amount.trim(),
      details: form.details.trim(),
      notes: form.notes.trim(),
    };

    try {
      await createBackendCommandSlip({
        area: form.area,
        action: area.action,
        record: [area.label, preparedForm.title, "Prepared for owner review", detailText(form)],
        slip: {
          source_type: form.area,
          action_type: area.action,
          source_id: `connected-office-os-${form.area}-${Date.now()}`,
          title: `${area.label}: ${preparedForm.title}`,
          found: `The owner entered a new ${area.label.toLowerCase()} request in the connected Office OS.`,
          prepared: `${area.action} is ready in Command. Every field remains editable and no business record has changed.`,
          why: `Owner approval is required before this ${area.label.toLowerCase()} can change a real record or send anything.`,
          urgency: "Owner review",
          payload: {
            office_role: area.role,
            prepared_form: preparedForm,
            will_do: [`Create or update the owner-approved ${area.label.toLowerCase()} draft only after Command approval.`],
            actions: ["Approve prepared draft", "Ask for more information", "Park"],
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
      setResult({ ok: true, message: `${area.label} prepared in Command. Nothing was sent, charged, synced or changed.` });
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
          <div><small>Owner-controlled preparation</small><h2>Prepare it here. Approve it in Command.</h2><p>This can create a prepared Command slip only. It cannot send, charge, sync or change the business record directly.</p></div>
        </header>

        <label className="wide"><span>What are you preparing?</span><select value={form.area} onChange={(event) => update("area", event.target.value)}>{AREAS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <label><span>Title *</span><input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder={`Name this ${area.label.toLowerCase()}`} required /></label>
        <label><span>Client or person</span><input value={form.person} onChange={(event) => update("person", event.target.value)} placeholder="Who is it for?" /></label>
        <label><span>Date or timing</span><input value={form.when} onChange={(event) => update("when", event.target.value)} placeholder="Friday 10:00am" /></label>
        <label><span>Amount</span><input value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="$150 or leave blank" /></label>
        <label className="wide"><span>Details *</span><textarea rows="4" value={form.details} onChange={(event) => update("details", event.target.value)} placeholder="Scope, request, instructions or the decision that needs preparing" required /></label>
        <label className="wide"><span>Owner notes</span><textarea rows="2" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Anything Command should keep visible" /></label>

        <div className="cvQuickPrepareActions">
          <button type="submit" disabled={busy || !form.title.trim() || !form.details.trim()}>{busy ? "Preparing…" : area.action}</button>
          <a href="/dashboard#command">Open working Command <ArrowRight size={16} /></a>
        </div>

        {result ? <div className={result.ok ? "cvQuickPrepareResult good" : "cvQuickPrepareResult bad"}>{result.ok ? <CheckCircle2 size={18} /> : <X size={18} />}<span>{result.message}</span></div> : null}
      </form>
    </aside>
  );
}
