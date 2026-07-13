import React, { useEffect, useMemo, useState } from "react";
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
      ["reply", "Prepared reply", "I’ll check the best available time and come back to you."],
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
  const [intakeText, setIntakeText] = useState("");
  const [trail, setTrail] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const ownerRoute = isOwnerRoute();
  const parsed = useMemo(() => intakeText ? parseIntakeText(intakeText) : null, [intakeText]);

  useEffect(() => {
    if (!dirty) setValues(initialValues(config, selectedRecord));
  }, [config, selectedRecord, dirty]);

  function setField(key, value) {
    setDirty(true);
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function prepareForm() {
    const missing = requiredMissing(values, config);
    if (missing.length) {
      addTrail(config.action, `Check ${missing.join(", ")} before preparing the slip.`);
      return;
    }
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

  async function prepareIntake() {
    if (!parsed) return;
    await prepareSlip({
      area: parsed.area,
      kind: parsed.kind,
      action: parsed.action,
      form: parsed.form,
      source: "quick_intake",
      title: parsed.title,
      found: `Owner typed: ${intakeText}`,
      prepared: `Churvox recognised the likely record type and prepared a ${parsed.kind.toLowerCase()} slip for owner review. Every field remains editable.`,
      why: parsed.why,
      actions: approvalActions(parsed.area),
      sourcePayload: {
        intake_text: intakeText,
        intake_confidence: parsed.confidence,
        intake_rule: parsed.rule,
      },
    });
  }

  async function importCsv() {
    const parsedCsv = parseCsv(csvText);
    if (parsedCsv.error) {
      addTrail("CSV import", parsedCsv.error);
      return;
    }
    const rows = parsedCsv.rows.slice(0, 100);
    if (!rows.length) {
      addTrail("CSV import", "Paste a CSV header row and at least one record first.");
      return;
    }
    await prepareSlip({
      area,
      kind: `${config.label} CSV import`,
      action: `Prepare ${config.label.toLowerCase()} CSV import`,
      form: {
        rows: `${rows.length} row(s)`,
        columns: parsedCsv.headers.join(", "),
        preview: rows.slice(0, 3).map((row) => Object.values(row).join(" · ")).join(" | "),
        owner_check: parsedCsv.rows.length > 100 ? `Only the first 100 of ${parsedCsv.rows.length} rows are included in this draft.` : "Check the preview and approve only when the columns are correct.",
      },
      source: "csv_import",
      title: `${config.label} CSV import: ${rows.length} row(s)`,
      found: `CSV import pasted with ${parsedCsv.rows.length} parsed row(s) and ${parsedCsv.headers.length} column(s).`,
      prepared: `Churvox preserved the actual parsed row objects in the Command slip. The data is not imported until the owner approves the review.`,
      why: `Owner approval is required before imported ${config.label.toLowerCase()} records are added.`,
      actions: [`Approve ${config.label.toLowerCase()} import`, "Review later", "Park"],
      sourcePayload: {
        csv_rows: rows,
        csv_headers: parsedCsv.headers,
        csv_row_count: rows.length,
        csv_truncated: parsedCsv.rows.length > rows.length,
      },
    });
  }

  async function prepareSlip({ area: targetArea, kind, action, form, source, title: slipTitle, found, prepared, why, actions, sourcePayload = {} }) {
    if (busy) return;
    setBusy(true);
    const record = [kind, mainTitle(form, kind), "Prepared form", Object.entries(form || {}).map(([key, value]) => `${labelize(key)}: ${displayValue(value)}`).join(" · ")];
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
            title: slipTitle,
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
              ...(sourcePayload || {}),
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
        <span>Quick intake</span>
        <h3>Type the request normally. Churvox recognises the likely record type.</h3>
        <textarea value={intakeText} onChange={(event) => setIntakeText(event.target.value)} placeholder="Example: create invoice for Smith lawn job 120 plus green waste 30" />
        {parsed ? <div className="cvBrainGuess"><b>{parsed.kind}</b><small>{parsed.title}</small><em>{parsed.why} · {Math.round(parsed.confidence * 100)}% intake confidence</em></div> : null}
        <button type="button" onClick={prepareIntake} disabled={busy || !parsed}>{busy ? "Preparing…" : "Prepare from words"}</button>
        <p>This is a quick classifier, not a final decision. Check every prepared field in Command.</p>
      </div>

      <div className="cvFormGrid">
        <article className="cvDraftForm">
          <span>{config.label} form</span>
          <h3>Add or edit {config.label.toLowerCase()}</h3>
          <div className="cvFieldsGrid">
            {config.fields.map(([key, label, placeholder]) => (
              <label key={key}>
                <small>{label}</small>
                {longField(key) ? (
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
          <p>The actual parsed rows stay attached to the Command review. Nothing is imported before approval.</p>
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
    if ("title" in base) base.title = selectedRecord[1] || "";
    if ("job" in base) base.job = selectedRecord[1] || "";
    if ("notes" in base) base.notes = selectedRecord[3] || "";
    if ("status" in base) base.status = selectedRecord[2] || "";
  }
  return base;
}

function requiredMissing(values, config) {
  const keys = config.label === "Client" ? ["name"] : config.label === "Payroll review" || config.label === "Staff item" ? ["worker"] : config.label === "Accounting check" ? ["system", "record"] : ["client"];
  return keys.filter((key) => key in values && !String(values[key] || "").trim()).map(labelize);
}

function parseIntakeText(text) {
  const raw = String(text || "").trim();
  if (raw.length < 4) return null;
  const lower = raw.toLowerCase();
  const amount = raw.match(/\$?\b\d+(?:\.\d{1,2})?\b/g)?.slice(-1)?.[0] || "";
  const words = raw.replace(/\$?\b\d+(?:\.\d{1,2})?\b/g, "").split(/\s+/).filter(Boolean);
  const name = titleCase(words.slice(-3).join(" ")) || "New record";
  if (/invoice|bill|charge|payment/.test(lower)) return makeParsed("invoices", "Invoice", "Prepare invoice", `Invoice draft: ${name}`, "Owner checks the client, line items and tax treatment before approval.", { client: name, line_items: raw, total: amount, notes: "Prepared from quick intake" }, 0.82, "invoice/payment keywords");
  if (/quote|estimate|price/.test(lower)) return makeParsed("quotes", "Quote", "Prepare quote", `Quote draft: ${name}`, "Owner checks the scope and price before approval.", { client: name, scope: raw, price: amount, notes: "Prepared from quick intake" }, 0.8, "quote/price keywords");
  if (/client|customer|contact|address|phone|email/.test(lower)) return makeParsed("clients", "Client", "Prepare client record", `Client record: ${name}`, "Owner checks identity and contact details before the record draft is created.", { name, notes: raw }, 0.74, "client/contact keywords");
  if (/message|reply|text|email|sms|follow up|follow-up/.test(lower)) return makeParsed("messages", "Message", "Prepare reply", `Message draft: ${name}`, "Owner checks wording before any internal reply draft is created; nothing sends.", { client: name, message: raw, reply: "Owner to check the prepared reply" }, 0.76, "message/follow-up keywords");
  if (/worker|staff|timer|hours|payroll|clock/.test(lower)) return makeParsed("staff", "Staff item", "Prepare staff review", `Staff review: ${name}`, "Owner checks worker, time and context before an internal review draft is created.", { worker: name, issue: raw, hours: amount, notes: "Prepared from quick intake" }, 0.78, "staff/time keywords");
  return makeParsed("work", "Job", "Prepare job", `Job draft: ${name}`, "Owner checks client, job details, schedule and assignment before approval.", { client: name, title: raw, price: amount, notes: "Prepared from quick intake" }, 0.55, "general work fallback");
}

function makeParsed(area, kind, action, title, why, form, confidence, rule) {
  return { area, kind, action, title, why, form, confidence, rule };
}

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

function mainTitle(form = {}, fallback = "record") {
  return form.title || form.job || form.client || form.name || form.worker || form.record || form.subject || fallback;
}

function displayValue(value) {
  if (Array.isArray(value)) return value.map(displayValue).join(" · ");
  if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${labelize(key)}: ${displayValue(item)}`).join(" · ");
  return String(value ?? "");
}

function longField(key) {
  return ["notes", "line_items", "scope", "reply", "message"].includes(key);
}

function willDoFor(area, form = {}) {
  const key = String(area || "").toLowerCase();
  if (key.includes("invoice") || key.includes("money")) return ["Save an internal invoice/payment draft", "Hold send and sync until a later owner decision", `Amount/detail: ${form.total || form.amount || form.line_items || "needs check"}`];
  if (key.includes("quote")) return ["Save an internal quote draft", "Hold customer send until a later owner decision", `Scope: ${form.scope || form.notes || "needs check"}`];
  if (key.includes("client")) return ["Create an internal client record/update draft", "Do not overwrite the live client automatically", `Client detail: ${form.name || form.client || "needs check"}`];
  if (key.includes("staff") || key.includes("payroll")) return ["Create an internal staff/hour review draft", "No payroll file or payment is created", `Worker: ${form.worker || "needs check"}`];
  if (key.includes("message")) return ["Create an internal reply draft", "No message is sent", `Client: ${form.client || "needs check"}`];
  return ["Create an internal job/booking draft", "Do not change the live schedule or assignment automatically", `Client/job: ${form.client || form.title || "needs check"}`];
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
  return String(key || "").replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function titleCase(text) {
  return String(text || "").trim().replace(/\b\w/g, (character) => character.toUpperCase());
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
