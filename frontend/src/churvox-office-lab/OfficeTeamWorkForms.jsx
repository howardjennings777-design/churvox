import React, { useMemo, useState } from "react";
import "./OfficeTeamWorkForms.css";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

const DEFAULTS = {
  work: {
    label: "Job",
    action: "Prepare job",
    primary: "Prepare job for approval",
    fields: [
      ["client", "Client", "Smith Property"],
      ["title", "Job / appointment", "Lawn service"],
      ["date", "Date / time", "Friday 10:00am"],
      ["worker", "Worker", "Mike"],
      ["price", "Price", "120"],
      ["notes", "Notes", "Front lawn, green waste extra"],
    ],
    importHint: "client,title,date,worker,price,notes",
  },
  clients: {
    label: "Client",
    action: "Prepare client record",
    primary: "Prepare client for approval",
    fields: [
      ["name", "Client name", "Sarah Wilson"],
      ["phone", "Phone", "021 000 000"],
      ["email", "Email", "sarah@example.com"],
      ["address", "Address", "12 King Street"],
      ["notes", "Notes / memory", "Prefers text before arrival"],
    ],
    importHint: "name,phone,email,address,notes",
  },
  quotes: {
    label: "Quote",
    action: "Prepare quote",
    primary: "Prepare quote for approval",
    fields: [
      ["client", "Client", "Green Acres"],
      ["title", "Quote title", "Garden tidy"],
      ["scope", "Scope", "Hedge trim and green waste"],
      ["price", "Price", "420"],
      ["notes", "Notes", "Follow up in 3 days"],
    ],
    importHint: "client,title,scope,price,notes",
  },
  invoices: {
    label: "Invoice",
    action: "Prepare invoice",
    primary: "Prepare invoice for approval",
    fields: [
      ["client", "Client", "Smith Property"],
      ["job", "Job", "Lawn service"],
      ["line_items", "Line items", "Base job 120, green waste 30"],
      ["gst", "GST / tax", "GST included"],
      ["total", "Total", "150"],
      ["notes", "Notes", "Draft only, do not send yet"],
    ],
    importHint: "client,job,line_items,gst,total,notes",
  },
  money: {
    label: "Money item",
    action: "Prepare money item",
    primary: "Prepare money item",
    fields: [
      ["client", "Client", "Smith Property"],
      ["type", "Type", "Payment follow-up"],
      ["amount", "Amount", "150"],
      ["status", "Status", "Unpaid"],
      ["notes", "Notes", "Polite reminder ready"],
    ],
    importHint: "client,type,amount,status,notes",
  },
  staff: {
    label: "Staff item",
    action: "Prepare staff item",
    primary: "Prepare staff item",
    fields: [
      ["worker", "Worker", "Cam"],
      ["job", "Job", "Lawn service"],
      ["hours", "Hours / timer", "5h 42m"],
      ["issue", "Issue", "Long timer"],
      ["notes", "Notes", "Ask worker or edit hours"],
    ],
    importHint: "worker,job,hours,issue,notes",
  },
  payroll: {
    label: "Payroll review",
    action: "Prepare payroll review",
    primary: "Prepare payroll review",
    fields: [
      ["worker", "Worker", "Cam"],
      ["period", "Pay period", "This week"],
      ["hours", "Hours", "36.5"],
      ["flag", "Flag", "One odd timer"],
      ["notes", "Notes", "Gross hours only, no tax filing"],
    ],
    importHint: "worker,period,hours,flag,notes",
  },
  messages: {
    label: "Message",
    action: "Prepare reply",
    primary: "Prepare message reply",
    fields: [
      ["client", "Client", "Sarah"],
      ["subject", "Subject", "Rebook request"],
      ["message", "Customer message", "Can we book next Friday?"],
      ["reply", "Prepared reply", "Yes, Friday 10am is available."],
      ["notes", "Notes", "Owner approval before send"],
    ],
    importHint: "client,subject,message,reply,notes",
  },
  integrations: {
    label: "Accounting check",
    action: "Prepare accounting check",
    primary: "Prepare accounting check",
    fields: [
      ["system", "System", "Xero"],
      ["record", "Record", "Invoice draft"],
      ["gst", "GST / coding", "Needs review"],
      ["status", "Status", "Export ready"],
      ["notes", "Notes", "No auto-sync"],
    ],
    importHint: "system,record,gst,status,notes",
  },
};

export default function OfficeTeamWorkForms({ area = "work", title = "Work", selectedRecord = null }) {
  const config = DEFAULTS[area] || DEFAULTS.work;
  const [values, setValues] = useState(() => initialValues(config, selectedRecord));
  const [csvText, setCsvText] = useState("");
  const [brainText, setBrainText] = useState("");
  const [trail, setTrail] = useState([]);
  const [busy, setBusy] = useState(false);
  const ownerRoute = isOwnerRoute();
  const parsed = useMemo(() => brainText ? parseBrainText(brainText) : null, [brainText]);

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function prepareForm() {
    await prepareSlip({
      area,
      kind: config.label,
      action: config.action,
      form: values,
      source: "manual_form",
      title: `${config.label}: ${mainTitle(values, config.label)}`,
      found: `${title} form was filled in by the owner workspace.`,
      prepared: `${config.label} draft is prepared as a Command slip. Review the form before anything is added, edited, sent, synced or charged.`,
      why: `Owner approval is required before this ${config.label.toLowerCase()} changes real business records.`,
      actions: approvalActions(area),
    });
  }

  async function prepareBrain() {
    if (!parsed) return;
    await prepareSlip({
      area: parsed.area,
      kind: parsed.kind,
      action: parsed.action,
      form: parsed.form,
      source: "brain_intake",
      title: parsed.title,
      found: `You typed: ${brainText}`,
      prepared: `Churvox read the instruction and prepared it as a ${parsed.kind.toLowerCase()} slip for Command.`,
      why: parsed.why,
      actions: approvalActions(parsed.area),
    });
  }

  async function importCsv() {
    const rows = parseCsv(csvText);
    if (!rows.length) {
      addTrail("CSV import", "Paste a CSV header row and at least one record first.");
      return;
    }
    await prepareSlip({
      area,
      kind: `${config.label} CSV import`,
      action: `Prepare ${config.label.toLowerCase()} CSV import`,
      form: { rows: `${rows.length} row(s)`, preview: rows.slice(0, 3).map((row) => Object.values(row).join(" · ")).join(" | ") },
      source: "csv_import",
      title: `${config.label} CSV import: ${rows.length} row(s)` ,
      found: `CSV import pasted with ${rows.length} row(s).`,
      prepared: `Churvox prepared a CSV import review. The data is not imported until the owner approves the slip.`,
      why: `Owner approval is required before imported ${config.label.toLowerCase()} records are added or changed.`,
      actions: [`Approve ${config.label.toLowerCase()} import`, "Review rows", "Park"],
    });
  }

  async function prepareSlip({ area: targetArea, kind, action, form, source, title, found, prepared, why, actions }) {
    if (busy) return;
    setBusy(true);
    const record = [kind, mainTitle(form, kind), "Prepared form", Object.entries(form || {}).map(([k, v]) => `${labelize(k)}: ${v}`).join(" · ")];
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
            title,
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
            },
          },
        });
      } else {
        createOfficeTeamLocalCommand({ area: targetArea, record, action });
      }
      addTrail(action, `${kind} prepared for Command. Nothing was added, edited, sent, synced or charged.`);
    } catch (error) {
      addTrail(action, `Could not prepare Command slip. Nothing changed. ${error?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cvWorkForms" aria-label={`${title} working forms`}>
      <div className="cvBrainIntake">
        <span>Tell Churvox what to do</span>
        <h3>Type it normally. Churvox sorts the slip.</h3>
        <textarea value={brainText} onChange={(event) => setBrainText(event.target.value)} placeholder="Example: create invoice for Smith lawn job 120 plus green waste 30" />
        {parsed ? <div className="cvBrainGuess"><b>{parsed.kind}</b><small>{parsed.title}</small><em>{parsed.why}</em></div> : null}
        <button type="button" onClick={prepareBrain} disabled={busy || !parsed}>{busy ? "Preparing…" : "Prepare from words"}</button>
      </div>

      <div className="cvFormGrid">
        <article className="cvDraftForm">
          <span>{config.label} form</span>
          <h3>Add or edit {config.label.toLowerCase()}</h3>
          <div className="cvFieldsGrid">
            {config.fields.map(([key, label, placeholder]) => (
              <label key={key}>
                <small>{label}</small>
                {key === "notes" || key === "line_items" || key === "scope" || key === "reply" || key === "message" ? (
                  <textarea value={values[key] || ""} onChange={(event) => setField(key, event.target.value)} placeholder={placeholder} />
                ) : (
                  <input value={values[key] || ""} onChange={(event) => setField(key, event.target.value)} placeholder={placeholder} />
                )}
              </label>
            ))}
          </div>
          <button type="button" onClick={prepareForm} disabled={busy}>{busy ? "Preparing…" : config.primary}</button>
          <p>Creates a real Command slip first. Approval is required before records change.</p>
        </article>

        <article className="cvCsvImport">
          <span>CSV import</span>
          <h3>Paste CSV rows</h3>
          <small>Header example: {config.importHint}</small>
          <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder={`${config.importHint}\nSmith,021...,smith@example.com,12 King St,Prefers text`} />
          <button type="button" onClick={importCsv} disabled={busy}>{busy ? "Preparing…" : "Prepare CSV import"}</button>
          <p>CSV import is reviewed in Command before anything is added.</p>
        </article>
      </div>

      {trail.length ? <div className="cvWorkFormTrail">{trail.map((item) => <p key={item.id}><b>{item.label}</b> {item.text}</p>)}</div> : null}
    </section>
  );

  function addTrail(label, text) {
    setTrail((current) => [{ id: `${Date.now()}-${label}`, label, text }, ...current].slice(0, 4));
  }
}

function initialValues(config, selectedRecord) {
  const base = Object.fromEntries(config.fields.map(([key]) => [key, ""]));
  if (Array.isArray(selectedRecord)) {
    base.title = base.title || selectedRecord[1] || selectedRecord[0] || "";
    base.notes = base.notes || selectedRecord[3] || selectedRecord[2] || "";
    base.client = base.client || selectedRecord[0] || "";
  }
  return base;
}

function parseBrainText(text) {
  const raw = String(text || "").trim();
  if (raw.length < 4) return null;
  const lower = raw.toLowerCase();
  const amount = raw.match(/\$?\b\d+(?:\.\d{1,2})?\b/g)?.slice(-1)?.[0] || "";
  const words = raw.replace(/\$?\b\d+(?:\.\d{1,2})?\b/g, "").split(/\s+/).filter(Boolean);
  const name = titleCase(words.slice(-3).join(" ")) || "New record";
  if (/invoice|bill|charge|payment/.test(lower)) {
    return makeParsed("invoices", "Invoice", "Prepare invoice", `Invoice draft: ${name}`, "Owner approves invoice draft before send/sync/charge.", { client: name, line_items: raw, total: amount, notes: "Prepared from typed instruction" });
  }
  if (/quote|estimate|price/.test(lower)) {
    return makeParsed("quotes", "Quote", "Prepare quote", `Quote draft: ${name}`, "Owner approves quote before it is sent or converted.", { client: name, scope: raw, price: amount, notes: "Prepared from typed instruction" });
  }
  if (/client|customer|contact|address|phone|email/.test(lower)) {
    return makeParsed("clients", "Client", "Prepare client record", `Client record: ${name}`, "Owner approves before client records change.", { name, notes: raw });
  }
  if (/message|reply|text|email|sms|follow up|follow-up/.test(lower)) {
    return makeParsed("messages", "Message", "Prepare reply", `Message draft: ${name}`, "Owner approves before anything is sent.", { client: name, message: raw, reply: "Prepared reply needs owner check" });
  }
  if (/worker|staff|timer|hours|payroll|clock/.test(lower)) {
    return makeParsed("staff", "Staff item", "Prepare staff review", `Staff review: ${name}`, "Owner approves before staff/job/hour records change.", { worker: name, issue: raw, hours: amount, notes: "Prepared from typed instruction" });
  }
  return makeParsed("work", "Job", "Prepare job", `Job draft: ${name}`, "Owner approves before job records, schedule or worker assignment changes.", { client: name, title: raw, price: amount, notes: "Prepared from typed instruction" });
}

function makeParsed(area, kind, action, title, why, form) {
  return { area, kind, action, title, why, form };
}

function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.trim() || "field");
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;
  for (const char of String(line || "")) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(current.trim()); current = ""; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

function mainTitle(form = {}, fallback = "record") {
  return form.title || form.job || form.client || form.name || form.worker || form.record || form.subject || fallback;
}

function willDoFor(area, form = {}) {
  const key = String(area || "").toLowerCase();
  if (key.includes("invoice") || key.includes("money")) return ["Save invoice/payment draft", "Hold send/sync until owner chooses the next action", `Amount/detail: ${form.total || form.amount || form.line_items || "needs check"}`];
  if (key.includes("quote")) return ["Save quote draft", "Hold customer send until approved", `Scope: ${form.scope || form.notes || "needs check"}`];
  if (key.includes("client")) return ["Prepare client record update", "Hold record change until approved", `Client detail: ${form.name || form.client || "needs check"}`];
  if (key.includes("staff") || key.includes("payroll")) return ["Prepare staff/hour review", "No payroll file or payment is created", `Worker: ${form.worker || "needs check"}`];
  if (key.includes("message")) return ["Prepare reply draft", "No message is sent until approved", `Client: ${form.client || "needs check"}`];
  return ["Prepare job/booking draft", "No schedule or worker assignment changes until approved", `Client/job: ${form.client || form.title || "needs check"}`];
}

function approvalActions(area) {
  const key = String(area || "").toLowerCase();
  if (key.includes("invoice")) return ["Approve invoice draft", "Edit invoice", "Ask staff", "Park"];
  if (key.includes("quote")) return ["Approve quote draft", "Edit quote", "Follow up later", "Park"];
  if (key.includes("client")) return ["Save client update", "Edit client", "Ignore", "Park"];
  if (key.includes("staff") || key.includes("payroll")) return ["Approve hours", "Edit notes", "Ask staff", "Park"];
  if (key.includes("message")) return ["Approve reply", "Edit reply", "Ask owner later", "Park"];
  return ["Approve job draft", "Edit job", "Ask client", "Park"];
}

function urgencyFor(area) {
  const key = String(area || "").toLowerCase();
  if (key.includes("invoice") || key.includes("money")) return "Top priority";
  if (key.includes("account")) return "Accounting check";
  return "Owner review";
}

function roleForArea(area) {
  const key = String(area || "").toLowerCase();
  if (key.includes("invoice") || key.includes("money") || key.includes("quote")) return "Bookkeeper";
  if (key.includes("account") || key.includes("integration")) return "Accountant";
  if (key.includes("client") || key.includes("message")) return "Client Memory";
  if (key.includes("staff") || key.includes("payroll")) return "Payroll Clerk";
  return "Receptionist";
}

function labelize(key) {
  return String(key || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleCase(text) {
  return String(text || "").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
