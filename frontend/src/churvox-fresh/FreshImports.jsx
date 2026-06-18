import React from "react";
import { useApi } from "../hooks/useApi";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const DATA_TYPES = ["Clients", "Team", "Jobs", "Quotes", "Invoices"];

const IMPORT_GUIDE = {
  Clients: {
    endpoint: "/clients",
    required: "name plus email or phone",
    example: "name,email,phone,address,notes",
    aliases: {
      name: ["name", "client_name", "customer_name", "contact_name", "business_name"],
      email: ["email", "client_email", "customer_email", "billing_email"],
      phone: ["phone", "mobile", "client_phone", "customer_phone"],
      address: ["address", "site_address", "service_address", "customer_address", "billing_address"],
      notes: ["notes", "note", "client_notes", "internal_notes"],
    },
  },
  Team: {
    endpoint: "/team/workers",
    required: "name and email",
    example: "name,email,phone,role,pay_rate",
    aliases: {
      name: ["name", "full_name", "display_name", "worker_name", "person"],
      email: ["email", "worker_email", "person_email"],
      phone: ["phone", "mobile", "worker_phone"],
      role: ["role", "team_role", "worker_role"],
      payRate: ["pay_rate", "payRate", "hourly_rate", "hourlyRate", "rate"],
    },
  },
  Jobs: {
    endpoint: "/jobs",
    required: "title, address and scheduled_date",
    example: "title,client_name,customer_email,address,scheduled_date,job_type,fixed_price,notes",
    aliases: {
      title: ["title", "job_name", "job_title", "service", "service_type", "description"],
      clientName: ["client_name", "customer_name", "client", "customer", "name"],
      email: ["customer_email", "client_email", "email"],
      phone: ["customer_phone", "client_phone", "phone", "mobile"],
      address: ["address", "site_address", "service_address", "job_address"],
      scheduledDate: ["scheduled_date", "scheduled_at", "date", "start", "start_time", "job_date"],
      jobType: ["job_type", "type", "service_type"],
      price: ["fixed_price", "price", "amount", "total", "job_price"],
      workerName: ["worker", "worker_name", "assigned_worker", "assigned_worker_name"],
      notes: ["notes", "note", "description", "job_notes"],
      status: ["status", "job_status"],
    },
  },
  Quotes: {
    endpoint: "/quotes",
    required: "customer_name, address, job_description and price",
    example: "customer_name,customer_email,address,job_description,price,notes,valid_until",
    aliases: {
      customerName: ["customer_name", "client_name", "name", "client", "customer"],
      email: ["customer_email", "client_email", "email"],
      phone: ["customer_phone", "client_phone", "phone", "mobile"],
      address: ["address", "site_address", "service_address"],
      description: ["job_description", "description", "quote_description", "service", "work"],
      price: ["price", "amount", "total", "quote_total", "subtotal"],
      notes: ["notes", "note", "terms"],
      validUntil: ["valid_until", "expiry", "expires", "quote_expiry"],
    },
  },
  Invoices: {
    endpoint: "/invoices",
    required: "customer_name, description and amount",
    example: "customer_name,customer_email,address,description,amount,status,due_date",
    aliases: {
      customerName: ["customer_name", "client_name", "name", "client", "customer"],
      email: ["customer_email", "client_email", "email"],
      phone: ["customer_phone", "client_phone", "phone", "mobile"],
      address: ["address", "site_address", "billing_address", "service_address"],
      description: ["description", "item", "service", "work", "invoice_description"],
      amount: ["amount", "total", "subtotal", "price", "invoice_total"],
      status: ["status", "invoice_status", "payment_status"],
      dueDate: ["due_date", "due", "payment_due"],
      notes: ["notes", "note", "internal_notes"],
    },
  },
};

function normalHeader(value) {
  return String(value || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function clean(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value, { endOfDay = false } = {}) {
  const raw = clean(value);
  if (!raw) return "";
  const date = new Date(raw.includes("T") ? raw : `${raw}${/^\d{4}-\d{2}-\d{2}$/.test(raw) ? (endOfDay ? "T23:59:59" : "T09:00:00") : ""}`);
  if (Number.isNaN(date.getTime())) return raw;
  return endOfDay ? date.toISOString() : raw.includes("T") ? raw : date.toISOString();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => clean(value))) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => clean(value))) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalHeader);
  return rows.slice(1).map((values, index) => {
    const record = { _rowNumber: index + 2, _raw: values };
    headers.forEach((header, i) => {
      if (header) record[header] = clean(values[i]);
    });
    return record;
  });
}

function first(row, aliases) {
  for (const key of aliases || []) {
    const value = row[normalHeader(key)];
    if (clean(value)) return clean(value);
  }
  return "";
}

function roleValue(value) {
  const text = clean(value).toLowerCase();
  if (text.includes("lead")) return "lead_worker";
  if (text.includes("sub")) return "subcontractor";
  if (text.includes("payroll")) return "payroll";
  if (text.includes("manager")) return "manager";
  return "worker";
}

function statusValue(value, fallback = "draft") {
  const text = clean(value).toLowerCase();
  if (["paid", "sent", "draft", "overdue", "completed", "complete", "assigned", "in_progress", "cancelled"].includes(text)) return text;
  if (text.includes("paid")) return "paid";
  if (text.includes("sent")) return "sent";
  if (text.includes("overdue")) return "overdue";
  if (text.includes("complete")) return "completed";
  if (text.includes("progress")) return "in_progress";
  return fallback;
}

function line(description, amount) {
  return {
    description: description || "Imported service",
    quantity: 1,
    qty: 1,
    unit_price: amount,
    rate: amount,
    amount,
  };
}

function makeImportRecord(type, row, index) {
  const guide = IMPORT_GUIDE[type];
  const aliases = guide.aliases;
  const errors = [];
  const warnings = [];
  let payload = {};
  let label = `${type} row ${index + 1}`;

  if (type === "Clients") {
    const name = first(row, aliases.name);
    const email = first(row, aliases.email).toLowerCase();
    const phone = first(row, aliases.phone);
    if (!name) errors.push("Missing client name");
    if (!email && !phone) errors.push("Missing email or phone");
    payload = {
      name,
      client_name: name,
      customer_name: name,
      email: email || null,
      phone: phone || null,
      address: first(row, aliases.address) || null,
      notes: first(row, aliases.notes) || null,
    };
    label = name || label;
  }

  if (type === "Team") {
    const name = first(row, aliases.name);
    const email = first(row, aliases.email).toLowerCase();
    if (!name) errors.push("Missing worker name");
    if (!email) errors.push("Missing worker email");
    payload = {
      name,
      email,
      phone: first(row, aliases.phone) || null,
      role: roleValue(first(row, aliases.role)),
      team_role: roleValue(first(row, aliases.role)),
      pay_rate: number(first(row, aliases.payRate)) || null,
    };
    label = name || email || label;
  }

  if (type === "Jobs") {
    const title = first(row, aliases.title);
    const address = first(row, aliases.address);
    const scheduledDate = first(row, aliases.scheduledDate);
    const price = number(first(row, aliases.price));
    if (!title) errors.push("Missing job title");
    if (!address) errors.push("Missing job address");
    if (!scheduledDate) errors.push("Missing scheduled_date");
    if (!first(row, aliases.clientName)) warnings.push("No client name linked");
    payload = {
      title,
      job_name: title,
      job_type: first(row, aliases.jobType) || "other",
      client_name: first(row, aliases.clientName),
      customer_name: first(row, aliases.clientName),
      customer_email: first(row, aliases.email),
      customer_phone: first(row, aliases.phone),
      address,
      site_address: address,
      scheduled_date: isoDate(scheduledDate),
      notes: first(row, aliases.notes),
      description: first(row, aliases.notes) || title,
      assigned_worker_name: first(row, aliases.workerName),
      worker_name: first(row, aliases.workerName),
      pricing_type: price > 0 ? "fixed" : "fixed",
      fixed_price: price,
      price,
      status: statusValue(first(row, aliases.status), "assigned"),
    };
    label = title || label;
  }

  if (type === "Quotes") {
    const customerName = first(row, aliases.customerName);
    const address = first(row, aliases.address);
    const description = first(row, aliases.description);
    const price = number(first(row, aliases.price));
    if (!customerName) errors.push("Missing customer name");
    if (!address) errors.push("Missing address");
    if (!description) errors.push("Missing job description");
    if (price <= 0) errors.push("Missing quote price");
    payload = {
      customer_name: customerName,
      customer_email: first(row, aliases.email),
      customer_phone: first(row, aliases.phone),
      address,
      job_description: description,
      job_type: "other",
      price,
      pricing_type: "fixed",
      hourly_rate: 0,
      extras: [line(description, price)],
      notes: first(row, aliases.notes),
      valid_until: isoDate(first(row, aliases.validUntil), { endOfDay: true }) || null,
    };
    label = customerName || description || label;
  }

  if (type === "Invoices") {
    const customerName = first(row, aliases.customerName);
    const description = first(row, aliases.description);
    const amount = number(first(row, aliases.amount));
    const gstRate = 15;
    const gstAmount = Math.max(0, amount * gstRate / 100);
    const total = amount + gstAmount;
    const status = statusValue(first(row, aliases.status), "draft");
    const due = status === "paid" ? 0 : total;
    if (!customerName) errors.push("Missing customer name");
    if (!description) errors.push("Missing invoice description");
    if (amount <= 0) errors.push("Missing invoice amount");
    payload = {
      customer_name: customerName,
      client_name: customerName,
      customer_email: first(row, aliases.email),
      customer_phone: first(row, aliases.phone),
      address: first(row, aliases.address),
      site_address: first(row, aliases.address),
      billing_address: first(row, aliases.address),
      description,
      notes: first(row, aliases.notes),
      line_items: [line(description, amount)],
      subtotal: amount,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      tax_amount: gstAmount,
      total,
      amount: total,
      amount_due: due,
      balance_due: due,
      status,
      due_date: isoDate(first(row, aliases.dueDate), { endOfDay: true }) || null,
      invoice_prefix: "INV",
    };
    label = customerName || description || label;
  }

  return {
    id: `${type}-${row._rowNumber}-${index}`,
    type,
    rowNumber: row._rowNumber,
    label,
    payload,
    errors,
    warnings,
    status: errors.length ? "Blocked" : warnings.length ? "Ready with warnings" : "Ready",
    result: null,
  };
}

function cleanPercent(records) {
  const total = Math.max(1, records.length || 0);
  const cleanRows = records.filter((item) => !item.errors.length).length;
  return Math.round((cleanRows / total) * 100);
}

function sendImportToCommand(summary) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    const slip = {
      id: `import-${Date.now()}`,
      group: "Imports",
      title: `${summary.type} CSV import review`,
      info: `${summary.clean}/${summary.total} clean rows · ${summary.imported} imported · ${summary.failed} failed`,
      urgency: summary.failed || summary.blocked ? "Review needed" : "Ready",
      found: `Churvox checked ${summary.total} ${summary.type.toLowerCase()} rows. Clean rate: ${summary.percent}%.`,
      prepared: "Clean rows were imported only after owner approval. Blocked rows were kept out of live data.",
      why: summary.message,
      owner: "Review failed rows, fix the CSV, or open the connected area.",
      area: "Data Import",
      page: "imports",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "import-command" } }));
  } catch {
    // Keep import usable without local storage.
  }
}

export default function FreshImports({ onNavigate }) {
  const { post } = useApi();
  const [type, setType] = React.useState("Clients");
  const [fileName, setFileName] = React.useState("");
  const [records, setRecords] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [filter, setFilter] = React.useState("All");

  const selected = records.find((item) => item.id === selectedId) || records[0];
  const cleanRows = records.filter((item) => !item.errors.length).length;
  const blockedRows = records.filter((item) => item.errors.length).length;
  const warningRows = records.filter((item) => !item.errors.length && item.warnings.length).length;
  const importedRows = records.filter((item) => item.result?.success).length;
  const failedRows = records.filter((item) => item.result && !item.result.success).length;
  const visibleRecords = records.filter((item) => {
    if (filter === "All") return true;
    if (filter === "Ready") return !item.errors.length && !item.result;
    if (filter === "Blocked") return item.errors.length;
    if (filter === "Imported") return item.result?.success;
    if (filter === "Failed") return item.result && !item.result.success;
    return true;
  });

  async function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage("Reading CSV...");
    const text = await file.text();
    const parsed = parseCsv(text);
    const next = parsed.map((row, index) => makeImportRecord(type, row, index));
    setRecords(next);
    setSelectedId(next[0]?.id || "");
    setMessage(next.length ? `${next.length} rows checked. ${next.filter((row) => !row.errors.length).length} clean rows ready.` : "No rows found. Check the CSV headers and file format.");
  }

  function resetImport() {
    setRecords([]);
    setSelectedId("");
    setFileName("");
    setMessage("");
    setFilter("All");
  }

  function openDataArea(nextType = type) {
    const map = { Clients: "clients", Team: "team", Jobs: "jobs", Quotes: "quotes", Invoices: "invoices" };
    onNavigate?.(map[nextType] || "clients");
  }

  async function importCleanRows() {
    const ready = records.filter((item) => !item.errors.length && !item.result?.success);
    if (!ready.length) {
      setMessage("No clean rows ready to import.");
      return;
    }

    setImporting(true);
    setMessage(`Importing ${ready.length} clean ${type.toLowerCase()} rows...`);
    const endpoint = IMPORT_GUIDE[type].endpoint;
    const results = new Map();

    for (const item of ready) {
      try {
        const res = await post(endpoint, item.payload);
        results.set(item.id, res?.success ? { success: true, detail: "Imported" } : { success: false, detail: res?.error || res?.detail || "Import failed" });
      } catch (err) {
        results.set(item.id, { success: false, detail: err?.message || "Import failed" });
      }
    }

    const nextRecords = records.map((item) => results.has(item.id) ? { ...item, result: results.get(item.id) } : item);
    const imported = nextRecords.filter((item) => item.result?.success).length;
    const failed = nextRecords.filter((item) => item.result && !item.result.success).length;
    const blocked = nextRecords.filter((item) => item.errors.length).length;
    const summary = {
      type,
      total: nextRecords.length,
      clean: nextRecords.filter((item) => !item.errors.length).length,
      imported,
      failed,
      blocked,
      percent: cleanPercent(nextRecords),
      message: `${imported} imported, ${failed} failed, ${blocked} blocked before import.`,
    };

    setRecords(nextRecords);
    setImporting(false);
    setMessage(summary.message);
    sendImportToCommand(summary);
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "csv-import", dataType: type } }));
  }

  const guide = IMPORT_GUIDE[type];

  return (
    <section className="freshImportsPage">
      <div className="freshImportsHero">
        <div>
          <span>CSV import / migration</span>
          <h1>Import real business data without making a mess</h1>
          <p>Upload a CSV, let Churvox validate the rows, then approve clean rows into live Clients, Team, Jobs, Quotes or Invoices.</p>
        </div>

        <div className="freshImportsStats">
          <div><b>{records.length}</b><small>rows checked</small></div>
          <div><b>{cleanRows}</b><small>clean</small></div>
          <div><b>{blockedRows}</b><small>blocked</small></div>
          <div><b>{importedRows}</b><small>imported</small></div>
        </div>
      </div>

      <section className="freshCard freshImportsUploader">
        <div className="freshMiniGrid">
          <div><span>Import type</span><b>{type}</b></div>
          <div><span>Required</span><b>{guide.required}</b></div>
          <div><span>Clean rate</span><b>{records.length ? `${cleanPercent(records)}%` : "—"}</b></div>
          <div><span>File</span><b>{fileName || "None selected"}</b></div>
        </div>

        <div className="freshImportsForm">
          <label>
            <span>Data type</span>
            <select value={type} onChange={(event) => { setType(event.target.value); resetImport(); }}>
              {DATA_TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span>CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={readFile} />
          </label>

          <label className="wide">
            <span>Expected headers</span>
            <input readOnly value={guide.example} />
          </label>
        </div>

        <div className="freshImportsActions">
          <button type="button" onClick={importCleanRows} disabled={importing || !cleanRows}>{importing ? "Importing..." : `Import ${cleanRows} clean rows`}</button>
          <button type="button" onClick={() => openDataArea(type)}>Open {type}</button>
          <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
          <button type="button" onClick={resetImport}>Reset</button>
        </div>

        {message ? <div className={`freshImportsNotice ${failedRows || blockedRows ? "need" : ""}`}><b>Import status</b><span>{message}</span></div> : null}
      </section>

      <section className="freshCommandFilterBar">
        {["All", "Ready", "Blocked", "Imported", "Failed"].map((item) => (
          <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            <span>{item}</span>
            <b>{item === "All" ? records.length : records.filter((record) => item === "Ready" ? !record.errors.length && !record.result : item === "Blocked" ? record.errors.length : item === "Imported" ? record.result?.success : record.result && !record.result.success).length}</b>
          </button>
        ))}
      </section>

      <div className="freshImportsLayout">
        <aside className="freshImportsList">
          <header>
            <div>
              <b>CSV rows</b>
              <span>{cleanRows} clean · {warningRows} warnings · {blockedRows} blocked</span>
            </div>
          </header>

          {visibleRecords.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>Row {item.rowNumber}: {item.label}</b>
              <span>{item.type} · {item.status}</span>
              <small>{item.result ? item.result.success ? "Imported" : `Failed: ${item.result.detail}` : item.errors[0] || item.warnings[0] || "Ready"}</small>
            </button>
          ))}

          {!records.length ? (
            <div className="freshImportsEmpty">
              <b>No CSV loaded yet</b>
              <span>Choose Clients, Team, Jobs, Quotes or Invoices, then upload a CSV.</span>
            </div>
          ) : null}
        </aside>

        {selected ? (
          <article className="freshImportsDetail">
            <div className="freshImportsHead">
              <div>
                <span>{selected.result ? selected.result.success ? "Imported" : "Failed" : selected.status}</span>
                <h2>Row {selected.rowNumber}: {selected.label}</h2>
                <p>{selected.type} import · {guide.endpoint}</p>
              </div>

              <div className="freshImportsHeadActions">
                <button type="button" onClick={() => openDataArea(selected.type)}>Open Area</button>
                <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
              </div>
            </div>

            <div className="freshImportsCards">
              <section>
                <span>Validation</span>
                <b>{selected.errors.length ? "Blocked" : "Ready"}</b>
                <p>{selected.errors.length ? selected.errors.join(" · ") : selected.warnings.join(" · ") || "No blocking issues found."}</p>
              </section>

              <section>
                <span>Import result</span>
                <b>{selected.result ? selected.result.success ? "Imported" : "Failed" : "Not imported"}</b>
                <p>{selected.result?.detail || "Clean rows are imported only after owner approval."}</p>
              </section>

              <section>
                <span>Owner control</span>
                <b>{selected.type}</b>
                <p>Bad rows stay out of live data. Fix the CSV and upload again if needed.</p>
              </section>
            </div>

            <div className="freshImportsForm">
              {Object.entries(selected.payload || {}).slice(0, 16).map(([key, value]) => (
                <label key={key} className={typeof value === "object" ? "wide" : ""}>
                  <span>{key}</span>
                  {typeof value === "object" ? <textarea readOnly value={JSON.stringify(value, null, 2)} /> : <input readOnly value={value ?? ""} />}
                </label>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
