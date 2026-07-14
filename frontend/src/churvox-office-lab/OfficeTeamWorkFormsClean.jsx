import React, { useEffect, useMemo, useState } from "react";
import "./OfficeTeamWorkForms.css";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

const CONFIGS = {
  work: config("Job", "Prepare job", "Prepare job for approval", [
    field("client", "Client", "Client or organisation"),
    field("title", "Job or appointment", "Service visit"),
    field("date", "Date and time", "Friday 10:00am"),
    field("worker", "Worker", "Select or enter a worker"),
    field("price", "Price", "120"),
    field("notes", "Notes", "Access, scope or extra-work details", true),
  ], "client,title,date,worker,price,notes"),
  clients: config("Client", "Prepare client record", "Prepare client for approval", [
    field("name", "Client name", "Client or organisation"),
    field("phone", "Phone", "Phone number"),
    field("email", "Email", "client@example.com"),
    field("address", "Address", "Service address"),
    field("notes", "Notes or memory", "Useful service preferences", true),
  ], "name,phone,email,address,notes"),
  quotes: config("Quote", "Prepare quote", "Prepare quote for approval", [
    field("client", "Client", "Client or organisation"),
    field("title", "Quote title", "Service quote"),
    field("scope", "Scope", "Work included in the quote", true),
    field("price", "Price", "420"),
    field("notes", "Notes", "Follow-up timing or conditions", true),
  ], "client,title,scope,price,notes"),
  invoices: config("Invoice", "Prepare invoice", "Prepare invoice for approval", [
    field("client", "Client", "Client or organisation"),
    field("job", "Job", "Completed service"),
    field("line_items", "Line items", "Base work, materials and approved extras", true),
    field("gst", "GST or tax", "GST included"),
    field("total", "Total", "150"),
    field("notes", "Notes", "Internal note for owner review", true),
  ], "client,job,line_items,gst,total,notes"),
  money: config("Money item", "Prepare money item", "Prepare money item", [
    field("client", "Client", "Client or organisation"),
    field("type", "Type", "Payment follow-up"),
    field("amount", "Amount", "150"),
    field("status", "Status", "Unpaid"),
    field("notes", "Notes", "Follow-up context", true),
  ], "client,type,amount,status,notes"),
  staff: config("Staff item", "Prepare staff item", "Prepare staff item", [
    field("worker", "Worker", "Worker name"),
    field("job", "Job", "Assigned work"),
    field("hours", "Hours or timer", "5h 42m"),
    field("issue", "Issue", "Timer needs checking"),
    field("notes", "Notes", "Ask the worker or edit the hours", true),
  ], "worker,job,hours,issue,notes"),
  payroll: config("Payroll review", "Prepare payroll review", "Prepare payroll review", [
    field("worker", "Worker", "Worker name"),
    field("period", "Pay period", "This week"),
    field("hours", "Hours", "36.5"),
    field("flag", "Flag", "One timer needs checking"),
    field("notes", "Notes", "Gross hours only; no tax filing", true),
  ], "worker,period,hours,flag,notes"),
  messages: config("Message", "Prepare reply", "Prepare message reply", [
    field("client", "Client", "Client or organisation"),
    field("subject", "Subject", "Booking request"),
    field("message", "Customer message", "Enter the message that needs a reply", true),
    field("reply", "Prepared reply", "Enter or edit the reply for owner approval", true),
    field("notes", "Notes", "Owner approval required before sending", true),
  ], "client,subject,message,reply,notes"),
  integrations: config("Accounting check", "Prepare accounting check", "Prepare accounting check", [
    field("system", "System", "Accounting system"),
    field("record", "Record", "Invoice or payment record"),
    field("gst", "GST or coding", "Needs review"),
    field("status", "Status", "Ready to review"),
    field("notes", "Notes", "Nothing syncs automatically", true),
  ], "system,record,gst,status,notes"),
};

export default function OfficeTeamWorkForms({ area = "work", title = "Work", selectedRecord = null }) {
  const selectedConfig = CONFIGS[area] || CONFIGS.work;
  const [values, setValues] = useState(() => initialValues(selectedConfig, selectedRecord));
  const [csvText, setCsvText] = useState("");
  const [intakeText, setIntakeText] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ownerRoute = isOwnerRoute();
  const intake = useMemo(() => classifyIntake(intakeText), [intakeText]);

  useEffect(() => {
    if (!dirty) setValues(initialValues(selectedConfig, selectedRecord));
  }, [selectedConfig, selectedRecord, dirty]);

  function updateField(key, value) {
    setDirty(true);
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function prepareForm() {
    const missing = requiredMissing(values, selectedConfig);
    if (missing.length) {
      addMessage("Check required fields", `Enter ${missing.join(", ")} before preparing this decision.`);
      return;
    }
    await prepareDecision({
      targetArea: area,
      kind: selectedConfig.label,
      action: selectedConfig.action,
      form: values,
      source: "manual_form",
      title: `${selectedConfig.label}: ${mainTitle(values, selectedConfig.label)}`,
      found: `${title} details were entered in the owner workspace.`,
      prepared: `${selectedConfig.label} details are ready in Command. Every field stays editable.`,
      why: `Owner approval is required before this ${selectedConfig.label.toLowerCase()} changes business records.`,
      actions: approvalActions(area),
    });
  }

  async function prepareFromWords() {
    if (!intake) return;
    await prepareDecision({
      targetArea: intake.area,
      kind: intake.kind,
      action: intake.action,
      form: intake.form,
      source: "quick_intake",
      title: intake.title,
      found: `Owner request: ${intakeText}`,
      prepared: `Churvox prepared a likely ${intake.kind.toLowerCase()} decision. Every field stays editable.`,
      why: intake.why,
      actions: approvalActions(intake.area),
      sourcePayload: { intake_text: intakeText, intake_confidence: intake.confidence },
    });
  }

  async function prepareCsv() {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      addMessage("CSV import", parsed.error);
      return;
    }
    const included = parsed.rows.slice(0, 100);
    await prepareDecision({
      targetArea: area,
      kind: `${selectedConfig.label} CSV import`,
      action: `Prepare ${selectedConfig.label.toLowerCase()} CSV import`,
      form: {
        rows: `${included.length} row(s)`,
        columns: parsed.headers.join(", "),
        preview: included.slice(0, 3).map((row) => Object.values(row).join(" · ")).join(" | "),
        owner_check: parsed.rows.length > included.length ? `The first ${included.length} of ${parsed.rows.length} rows are included.` : "Check the columns and preview before approval.",
      },
      source: "csv_import",
      title: `${selectedConfig.label} CSV import: ${included.length} row(s)`,
      found: `${parsed.rows.length} row(s) and ${parsed.headers.length} column(s) were read from the pasted CSV.`,
      prepared: "The parsed rows are attached to the Command decision. Nothing is imported before owner approval.",
      why: `Owner approval is required before ${selectedConfig.label.toLowerCase()} records are added.`,
      actions: [`Approve ${selectedConfig.label.toLowerCase()} import`, "Review later", "Park"],
      sourcePayload: { csv_rows: included, csv_headers: parsed.headers, csv_row_count: included.length, csv_truncated: parsed.rows.length > included.length },
    });
  }

  async function prepareDecision({ targetArea, kind, action, form, source, title: decisionTitle, found, prepared, why, actions, sourcePayload = {} }) {
    if (busy) return;
    setBusy(true);
    const record = [kind, mainTitle(form, kind), "Prepared", Object.entries(form || {}).map(([key, value]) => `${labelize(key)}: ${displayValue(value)}`).join(" · ")];
    try {
      if (ownerRoute) {
        await createBackendCommandSlip({
          area: targetArea,
          record,
          action,
          slip: {
            source_type: targetArea,
            action_type: action,
            source_id: `${source}-${Date.now()}`,
            title: decisionTitle,
            found,
            prepared,
            why,
            urgency: urgencyFor(targetArea),
            payload: {
              office_role: roleForArea(targetArea),
              prepared_form: form,
              will_do: willDoFor(targetArea, form),
              actions,
              source,
              prepared_only: true,
              owner_review_only: true,
              no_auto_send: true,
              no_auto_sync: true,
              no_auto_charge: true,
              no_auto_record_change: true,
              ...sourcePayload,
            },
          },
        });
      } else {
        createOfficeTeamLocalCommand({ area: targetArea, record, action });
      }
      addMessage(action, `${kind} prepared for Command. Nothing was added, edited, sent, synced or charged.`);
    } catch (error) {
      addMessage(action, `Could not prepare this decision. Nothing changed. ${error?.message || "Try again."}`);
    } finally {
      setBusy(false);
    }
  }

  function addMessage(label, text) {
    setMessages((current) => [{ id: `${Date.now()}-${label}`, label, text }, ...current].slice(0, 4));
  }

  return (
    <section className="cvWorkForms" aria-label={`${title} working forms`}>
      <div className="cvBrainIntake">
        <span>Quick intake</span>
        <h3>Describe the work normally. Churvox prepares the likely record for review.</h3>
        <textarea value={intakeText} onChange={(event) => setIntakeText(event.target.value)} placeholder="Example: prepare an invoice for a completed lawn service with an approved green-waste extra" />
        {intake ? <div className="cvBrainGuess"><b>{intake.kind}</b><small>{intake.title}</small><em>{intake.why} · {Math.round(intake.confidence * 100)}% confidence</em></div> : null}
        <button type="button" onClick={prepareFromWords} disabled={busy || !intake}>{busy ? "Preparing…" : "Prepare from words"}</button>
        <p>Check every prepared field in Command before approval.</p>
      </div>

      <div className="cvFormGrid">
        <article className="cvDraftForm">
          <span>{selectedConfig.label} form</span>
          <h3>Add or edit {selectedConfig.label.toLowerCase()}</h3>
          <div className="cvFieldsGrid">
            {selectedConfig.fields.map((item) => (
              <label key={item.key}>
                <small>{item.label}</small>
                {item.long ? <textarea value={values[item.key] || ""} onChange={(event) => updateField(item.key, event.target.value)} placeholder={item.placeholder} /> : <input value={values[item.key] || ""} onChange={(event) => updateField(item.key, event.target.value)} placeholder={item.placeholder} />}
              </label>
            ))}
          </div>
          <button type="button" onClick={prepareForm} disabled={busy}>{busy ? "Preparing…" : selectedConfig.primary}</button>
          <p>Creates a Command decision first. Approval is required before records change.</p>
        </article>

        <article className="cvCsvImport">
          <span>CSV import</span>
          <h3>Paste CSV rows</h3>
          <small>Header format: {selectedConfig.importHint}</small>
          <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder={`${selectedConfig.importHint}\nClient A,021...,client@example.com,Service address,Useful note`} />
          <button type="button" onClick={prepareCsv} disabled={busy}>{busy ? "Preparing…" : "Prepare CSV import"}</button>
          <p>The parsed rows stay attached to the Command review. Nothing is imported before approval.</p>
        </article>
      </div>

      {messages.length ? <div className="cvWorkFormTrail">{messages.map((item) => <p key={item.id}><b>{item.label}</b> {item.text}</p>)}</div> : null}
    </section>
  );
}

function config(label, action, primary, fields, importHint) { return { label, action, primary, fields, importHint }; }
function field(key, label, placeholder, long = false) { return { key, label, placeholder, long }; }

function initialValues(selectedConfig, selectedRecord) {
  const base = Object.fromEntries(selectedConfig.fields.map((item) => [item.key, ""]));
  if (Array.isArray(selectedRecord)) {
    if ("title" in base) base.title = selectedRecord[1] || "";
    if ("job" in base) base.job = selectedRecord[1] || "";
    if ("notes" in base) base.notes = selectedRecord[3] || "";
    if ("status" in base) base.status = selectedRecord[2] || "";
  }
  return base;
}

function requiredMissing(values, selectedConfig) {
  const keys = selectedConfig.label === "Client" ? ["name"] : selectedConfig.label === "Payroll review" || selectedConfig.label === "Staff item" ? ["worker"] : selectedConfig.label === "Accounting check" ? ["system", "record"] : ["client"];
  return keys.filter((key) => key in values && !String(values[key] || "").trim()).map(labelize);
}

function classifyIntake(text) {
  const raw = String(text || "").trim();
  if (raw.length < 4) return null;
  const lower = raw.toLowerCase();
  const amount = raw.match(/\$?\b\d+(?:\.\d{1,2})?\b/g)?.slice(-1)?.[0] || "";
  const subject = "New request";
  if (/invoice|bill|charge|payment/.test(lower)) return parsed("invoices", "Invoice", "Prepare invoice", "Invoice draft", "Check the client, line items and tax treatment before approval.", { client: "", line_items: raw, total: amount, notes: "Prepared from quick intake" }, 0.82);
  if (/quote|estimate|price/.test(lower)) return parsed("quotes", "Quote", "Prepare quote", "Quote draft", "Check the scope and price before approval.", { client: "", scope: raw, price: amount, notes: "Prepared from quick intake" }, 0.8);
  if (/client|customer|contact|address|phone|email/.test(lower)) return parsed("clients", "Client", "Prepare client record", "Client record", "Check identity and contact details before approval.", { name: "", notes: raw }, 0.74);
  if (/message|reply|text|email|sms|follow up|follow-up/.test(lower)) return parsed("messages", "Message", "Prepare reply", "Message reply", "Check the wording before approval; nothing sends automatically.", { client: "", subject, message: raw, reply: "Owner to review the prepared reply" }, 0.76);
  if (/worker|staff|timer|hours|payroll|clock/.test(lower)) return parsed("staff", "Staff item", "Prepare staff review", "Staff review", "Check the worker, time and context before approval.", { worker: "", issue: raw, hours: amount, notes: "Prepared from quick intake" }, 0.78);
  return parsed("work", "Job", "Prepare job", "Job draft", "Check the client, work details, schedule and assignment before approval.", { client: "", title: raw, price: amount, notes: "Prepared from quick intake" }, 0.55);
}

function parsed(area, kind, action, title, why, form, confidence) { return { area, kind, action, title, why, form, confidence }; }

function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { rows: [], headers: [], error: "Paste a header row and at least one data row." };
  const headers = splitCsvLine(lines[0]).map((header, index) => String(header || "").trim() || `field_${index + 1}`);
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) return { rows: [], headers, error: "CSV headers must be unique." };
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
  return { rows, headers, error: "" };
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  const text = String(line || "");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

function mainTitle(form = {}, fallback = "record") { return form.title || form.job || form.client || form.name || form.worker || form.record || form.subject || fallback; }
function displayValue(value) { if (Array.isArray(value)) return value.map(displayValue).join(" · "); if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${labelize(key)}: ${displayValue(item)}`).join(" · "); return String(value ?? ""); }
function labelize(key) { return String(key || "").replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()); }

function willDoFor(area, form = {}) {
  const key = String(area || "").toLowerCase();
  if (key.includes("invoice") || key.includes("money")) return ["Save an internal invoice or payment draft", "Hold send and sync until a later owner decision", `Amount or detail: ${form.total || form.amount || form.line_items || "needs check"}`];
  if (key.includes("quote")) return ["Save an internal quote draft", "Hold customer send until a later owner decision", `Scope: ${form.scope || form.notes || "needs check"}`];
  if (key.includes("client")) return ["Create an internal client record or update draft", "Do not overwrite the client automatically", `Client detail: ${form.name || form.client || "needs check"}`];
  if (key.includes("staff") || key.includes("payroll")) return ["Create an internal staff or hours review", "No payroll file or payment is created", `Worker: ${form.worker || "needs check"}`];
  if (key.includes("message")) return ["Create an internal reply draft", "No message is sent", `Client: ${form.client || "needs check"}`];
  return ["Create an internal job or booking draft", "Do not change the schedule or assignment automatically", `Client or job: ${form.client || form.title || "needs check"}`];
}

function approvalActions(area) {
  const key = String(area || "").toLowerCase();
  if (key.includes("invoice")) return ["Approve invoice draft", "Ask staff", "Park"];
  if (key.includes("quote")) return ["Approve quote draft", "Follow up later", "Park"];
  if (key.includes("client")) return ["Save client update", "Ignore", "Park"];
  if (key.includes("staff") || key.includes("payroll")) return ["Approve hours", "Ask staff", "Park"];
  if (key.includes("message")) return ["Approve reply", "Handle personally", "Park"];
  return ["Approve job draft", "Ask client", "Park"];
}

function urgencyFor(area) { const key = String(area || "").toLowerCase(); if (key.includes("invoice") || key.includes("money")) return "Top priority"; if (key.includes("account")) return "Accounting check"; return "Owner review"; }
function roleForArea(area) { const key = String(area || "").toLowerCase(); if (key.includes("invoice") || key.includes("money") || key.includes("quote")) return "Bookkeeper"; if (key.includes("account") || key.includes("integration")) return "Accountant"; if (key.includes("client") || key.includes("message")) return "Client Memory"; if (key.includes("staff") || key.includes("payroll")) return "Payroll Clerk"; return "Receptionist"; }
function isOwnerRoute() { return typeof window !== "undefined" && window.location.pathname.includes("dashboard"); }
