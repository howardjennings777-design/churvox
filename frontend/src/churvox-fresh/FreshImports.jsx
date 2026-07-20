import React from "react";
import { useApi } from "../hooks/useApi";

const TYPES = ["Clients", "Team", "Jobs", "Quotes", "Invoices"];
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const MANIFEST_SCHEMA = "churvox.migration-manifest.v1";

const CONFIG = {
  Clients: { endpoints: ["/clients"], required: "name plus email or phone", example: "name,email,phone,address,notes" },
  Team: { endpoints: ["/team/workers", "/team", "/workers"], required: "name and email", example: "name,email,phone,role,pay_rate" },
  Jobs: { endpoints: ["/jobs"], required: "title, address, scheduled_date", example: "title,client_name,customer_email,address,scheduled_date,job_type,fixed_price,notes" },
  Quotes: { endpoints: ["/quotes"], required: "customer_name, address, job_description, price", example: "customer_name,customer_email,address,job_description,price,notes" },
  Invoices: { endpoints: ["/invoices"], required: "customer_name, description, total", example: "customer_name,customer_email,address,description,total,status,due_date" },
};

const TEMPLATE_LINKS = {
  Clients: "/import-templates/churvox-clients-template.csv",
  Team: "/import-templates/churvox-team-template.csv",
  Jobs: "/import-templates/churvox-jobs-template.csv",
  Quotes: "/import-templates/churvox-quotes-template.csv",
  Invoices: "/import-templates/churvox-invoices-template.csv",
};

const ALIASES = {
  name: ["name", "client_name", "customer_name", "contact_name", "business_name", "worker_name", "full_name"],
  email: ["email", "client_email", "customer_email", "worker_email", "billing_email"],
  phone: ["phone", "mobile", "client_phone", "customer_phone", "worker_phone"],
  address: ["address", "site_address", "service_address", "billing_address", "job_address"],
  notes: ["notes", "note", "internal_notes", "client_notes", "job_notes", "terms"],
  title: ["title", "job_name", "job_title", "service", "service_type"],
  date: ["scheduled_date", "scheduled_at", "date", "start", "start_time", "job_date"],
  jobType: ["job_type", "type", "service_type"],
  price: ["price", "amount", "total", "subtotal", "fixed_price", "job_price", "quote_total", "invoice_total"],
  total: ["total", "invoice_total", "amount", "gross", "gross_amount"],
  subtotal: ["subtotal", "net", "net_amount", "before_gst"],
  gst: ["gst_amount", "tax_amount", "gst", "tax"],
  description: ["description", "job_description", "quote_description", "invoice_description", "item", "work", "service"],
  role: ["role", "team_role", "worker_role"],
  payRate: ["pay_rate", "hourly_rate", "rate"],
  status: ["status", "invoice_status", "payment_status", "job_status"],
  due: ["due_date", "due", "payment_due"],
};

function key(value) { return String(value || "").trim().replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
function text(value) { return String(value ?? "").trim(); }
function num(value) { const n = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? Number(n.toFixed(2)) : 0; }
function hasEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value)); }
function val(row, names) { for (const n of names) { const v = row[key(n)]; if (text(v)) return text(v); } return ""; }
function excelSerialDate(value, endOfDay = false) {
  const raw = text(value);
  if (!/^\d{4,5}(\.\d+)?$/.test(raw)) return "";
  const serial = Number(raw);
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return "";
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCHours(endOfDay ? 23 : 9, endOfDay ? 59 : 0, endOfDay ? 59 : 0, 0);
  return d.toISOString();
}
function toIsoDate(year, month, day, endOfDay = false) { const d = new Date(Number(year), Number(month) - 1, Number(day), endOfDay ? 23 : 9, endOfDay ? 59 : 0, endOfDay ? 59 : 0); return Number.isNaN(d.getTime()) ? "" : d.toISOString(); }
function dateVal(value, endOfDay = false) {
  const raw = text(value);
  if (!raw) return "";
  const serialDate = excelSerialDate(raw, endOfDay);
  if (serialDate) return serialDate;
  const local = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (local) {
    const day = Number(local[1]);
    const month = Number(local[2]);
    const year = Number(local[3]) < 100 ? 2000 + Number(local[3]) : Number(local[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) return toIsoDate(year, month, day, endOfDay) || raw;
  }
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return toIsoDate(iso[1], iso[2], iso[3], endOfDay) || raw;
  const d = new Date(raw.includes("T") ? raw : `${raw}${/^\d{4}-\d{2}-\d{2}$/.test(raw) ? (endOfDay ? "T23:59:59" : "T09:00:00") : ""}`);
  return Number.isNaN(d.getTime()) ? raw : d.toISOString();
}
function roleVal(value) { const v = text(value).toLowerCase(); if (v.includes("lead")) return "lead_worker"; if (v.includes("sub")) return "subcontractor"; if (v.includes("payroll")) return "payroll"; return "worker"; }
function statusVal(value, fallback = "draft") { const v = text(value).toLowerCase(); if (v.includes("paid")) return "paid"; if (v.includes("sent")) return "sent"; if (v.includes("overdue")) return "overdue"; if (v.includes("complete")) return "completed"; if (v.includes("progress")) return "in_progress"; return v || fallback; }

function detectDelimiter(csv) {
  const sample = String(csv || "").split(/\r?\n/).find((line) => text(line)) || "";
  const counts = [",", ";", "\t"].map((delimiter) => [delimiter, sample.split(delimiter).length - 1]);
  const best = counts.sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ",";
}

function parseCsv(csv) {
  const delimiter = detectDelimiter(csv);
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const c = csv[i], n = csv[i + 1];
    if (c === '"') { if (quoted && n === '"') { cell += '"'; i += 1; } else quoted = !quoted; continue; }
    if (c === delimiter && !quoted) { row.push(cell); cell = ""; continue; }
    if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && n === "\n") i += 1; row.push(cell); if (row.some(text)) rows.push(row); row = []; cell = ""; continue; }
    cell += c;
  }
  row.push(cell); if (row.some(text)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map(key);
  return rows.slice(1).map((values, index) => Object.fromEntries(headers.map((h, i) => [h || `col_${i}`, text(values[i])]).concat([["_row", index + 2]])));
}

function line(description, amount) { return { description: description || "Imported service", quantity: 1, qty: 1, unit_price: amount, rate: amount, amount }; }
function resultId(res) { const d = res?.data?.data || res?.data || res; const raw = d?.id || d?._id || d?.client?.id || d?.worker?.id || d?.job?.id || d?.quote?.id || d?.invoice?.id; return typeof raw === "object" ? raw?.$oid || raw?.id || raw?._id || "" : String(raw || ""); }

function build(type, row, index) {
  const errors = [], warnings = [];
  let payload = {}, label = `${type} row ${index + 1}`;
  const name = val(row, ALIASES.name);
  const email = val(row, ALIASES.email).toLowerCase();
  const phone = val(row, ALIASES.phone);
  const address = val(row, ALIASES.address);
  const notes = val(row, ALIASES.notes);

  if (type === "Clients") {
    if (!name) errors.push("Missing client name");
    if (!email && !phone) errors.push("Missing email or phone");
    if (email && !hasEmail(email)) warnings.push("Email format looks wrong");
    payload = { name, client_name: name, customer_name: name, email: email || null, phone: phone || null, address: address || null, notes: notes || null };
    label = name || label;
  }
  if (type === "Team") {
    if (!name) errors.push("Missing worker name");
    if (!email) errors.push("Missing worker email");
    if (email && !hasEmail(email)) errors.push("Worker email is invalid");
    const role = roleVal(val(row, ALIASES.role));
    payload = { name, email, phone: phone || null, role, team_role: role, pay_rate: num(val(row, ALIASES.payRate)) || null };
    label = name || email || label;
  }
  if (type === "Jobs") {
    const title = val(row, ALIASES.title), scheduled = val(row, ALIASES.date), price = num(val(row, ALIASES.price));
    if (!title) errors.push("Missing job title");
    if (!address) errors.push("Missing job address");
    if (!scheduled) errors.push("Missing scheduled_date");
    if (!name) warnings.push("No client name linked");
    payload = { title, job_name: title, job_type: val(row, ALIASES.jobType) || "other", client_name: name, customer_name: name, customer_email: email, customer_phone: phone, address, site_address: address, scheduled_date: dateVal(scheduled), notes, description: notes || title, pricing_type: "fixed", fixed_price: price, price, status: statusVal(val(row, ALIASES.status), "assigned") };
    label = title || label;
  }
  if (type === "Quotes") {
    const desc = val(row, ALIASES.description), price = num(val(row, ALIASES.price));
    if (!name) errors.push("Missing customer name");
    if (!address) errors.push("Missing address");
    if (!desc) errors.push("Missing job description");
    if (price <= 0) errors.push("Missing quote price");
    payload = { customer_name: name, customer_email: email, customer_phone: phone, address, job_description: desc, job_type: "other", price, pricing_type: "fixed", hourly_rate: 0, extras: [line(desc, price)], notes };
    label = name || desc || label;
  }
  if (type === "Invoices") {
    const desc = val(row, ALIASES.description), total = num(val(row, ALIASES.total) || val(row, ALIASES.price)), gst = num(val(row, ALIASES.gst)), subtotal = num(val(row, ALIASES.subtotal)) || Math.max(0, total - gst), status = statusVal(val(row, ALIASES.status), "draft"), due = status === "paid" ? 0 : total;
    if (!name) errors.push("Missing customer name");
    if (!desc) errors.push("Missing invoice description");
    if (total <= 0) errors.push("Missing invoice total");
    if (!gst) warnings.push("GST/tax not supplied; total is kept as-is");
    payload = { customer_name: name, client_name: name, customer_email: email, customer_phone: phone, address, site_address: address, billing_address: address, description: desc, notes, line_items: [line(desc, subtotal || total)], subtotal: subtotal || total, gst_rate: 0, gst_amount: gst, tax_amount: gst, total, amount: total, amount_due: due, balance_due: due, status, due_date: dateVal(val(row, ALIASES.due), true) || null, invoice_prefix: "INV" };
    label = name || desc || label;
  }
  return { id: `${type}-${row._row}-${index}`, type, rowNumber: row._row, label, payload, errors, warnings, status: errors.length ? "Blocked" : warnings.length ? "Ready with warnings" : "Ready", result: null };
}

function duplicateWarnings(rows) {
  const seen = new Map();
  rows.forEach((r) => { const k = JSON.stringify([r.type, r.payload.email || r.payload.customer_email || r.payload.title || r.payload.customer_name, r.payload.address, r.payload.total || r.payload.price]); seen.set(k, (seen.get(k) || 0) + 1); r._dupKey = k; });
  return rows.map((r) => seen.get(r._dupKey) > 1 && !r.errors.length ? { ...r, warnings: [...r.warnings, "Possible duplicate in this CSV"], status: "Ready with warnings" } : r);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((out, name) => ({ ...out, [name]: stableValue(value[name]) }), {});
  return value;
}

function stableJson(value) { return JSON.stringify(stableValue(value)); }

function fingerprint(value) {
  const raw = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function manifestIdentity(item) {
  const p = item.payload || {};
  if (item.type === "Clients") return stableJson([item.type, p.email || "", p.phone || "", p.name || ""]);
  if (item.type === "Team") return stableJson([item.type, p.email || "", p.name || ""]);
  if (item.type === "Jobs") return stableJson([item.type, p.title || "", p.address || "", p.scheduled_date || ""]);
  if (item.type === "Quotes") return stableJson([item.type, p.customer_name || "", p.address || "", p.job_description || ""]);
  if (item.type === "Invoices") return stableJson([item.type, p.customer_name || "", p.description || "", p.total || 0, p.due_date || ""]);
  return stableJson([item.type, item.label, item.rowNumber]);
}

function buildManifest(type, fileName, rows) {
  const manifestRows = rows.map((item) => {
    const normalizedPayload = stableValue(item.payload || {});
    return {
      rowNumber: item.rowNumber,
      label: item.label,
      identity: manifestIdentity(item),
      fingerprint: fingerprint(stableJson(normalizedPayload)),
      status: item.errors.length ? "blocked" : item.warnings.length ? "ready_with_warnings" : "ready",
      errors: [...item.errors],
      warnings: [...item.warnings],
      payload: normalizedPayload,
    };
  });
  return {
    schema: MANIFEST_SCHEMA,
    generatedAt: new Date().toISOString(),
    sourceFile: fileName || null,
    dataType: type,
    mode: "read_only_rehearsal",
    totals: {
      rows: manifestRows.length,
      ready: manifestRows.filter((row) => row.status !== "blocked").length,
      blocked: manifestRows.filter((row) => row.status === "blocked").length,
      warnings: manifestRows.filter((row) => row.warnings.length).length,
    },
    rows: manifestRows,
  };
}

function compareManifests(baseline, current) {
  if (!baseline || baseline.schema !== MANIFEST_SCHEMA || !Array.isArray(baseline.rows)) return { error: "That file is not a Churvox migration manifest." };
  if (baseline.dataType !== current.dataType) return { error: `Manifest type is ${baseline.dataType || "unknown"}, but this preview is ${current.dataType}.` };
  const group = (list) => list.reduce((map, row) => {
    const identity = text(row.identity) || stableJson([row.label, row.rowNumber]);
    const values = map.get(identity) || [];
    values.push(text(row.fingerprint));
    map.set(identity, values);
    return map;
  }, new Map());
  const oldRows = group(baseline.rows);
  const newRows = group(current.rows);
  const identities = new Set([...oldRows.keys(), ...newRows.keys()]);
  let matched = 0, changed = 0, added = 0, missing = 0;
  identities.forEach((identity) => {
    const before = [...(oldRows.get(identity) || [])];
    const after = [...(newRows.get(identity) || [])];
    const unmatchedAfter = [];
    after.forEach((signature) => {
      const matchIndex = before.indexOf(signature);
      if (matchIndex >= 0) { matched += 1; before.splice(matchIndex, 1); }
      else unmatchedAfter.push(signature);
    });
    const changedHere = Math.min(before.length, unmatchedAfter.length);
    changed += changedHere;
    missing += Math.max(0, before.length - changedHere);
    added += Math.max(0, unmatchedAfter.length - changedHere);
  });
  return {
    baselineFile: baseline.sourceFile || "saved manifest",
    baselineRows: baseline.rows.length,
    currentRows: current.rows.length,
    matched,
    changed,
    added,
    missing,
    blocked: current.totals.blocked,
    safeToRehearse: changed === 0 && added === 0 && missing === 0 && current.totals.blocked === 0,
  };
}

function downloadJson(data, fileName) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sendCommand(summary) {
  try {
    const old = JSON.parse(window.localStorage.getItem(COMMAND_INBOX_KEY) || "[]");
    const slip = { id: `import-${Date.now()}`, group: "Imports", title: `${summary.type} CSV import review`, info: `${summary.imported} imported · ${summary.failed} failed · ${summary.blocked} blocked`, urgency: summary.failed || summary.blocked ? "Review needed" : "Ready", found: `Checked ${summary.total} rows.`, prepared: "Clean rows were imported only after owner approval. Bad rows stayed out of live data.", why: summary.message, owner: "Review failed rows, fix the CSV, or open the connected area.", area: "Data Import", page: "imports", fromInbox: true, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...(Array.isArray(old) ? old : [])].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "import-command" } }));
  } catch {}
}

export default function FreshImports({ onNavigate }) {
  const { post } = useApi();
  const [type, setType] = React.useState("Clients");
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [message, setMessage] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [baselineManifest, setBaselineManifest] = React.useState(null);
  const [baselineName, setBaselineName] = React.useState("");
  const currentManifest = React.useMemo(() => buildManifest(type, fileName, rows), [type, fileName, rows]);
  const comparison = React.useMemo(() => baselineManifest ? compareManifests(baselineManifest, currentManifest) : null, [baselineManifest, currentManifest]);
  const selected = rows.find((r) => r.id === selectedId) || rows[0];
  const ready = rows.filter((r) => !r.errors.length && !r.result?.success);
  const clean = rows.filter((r) => !r.errors.length).length;
  const blocked = rows.filter((r) => r.errors.length).length;
  const imported = rows.filter((r) => r.result?.success).length;
  const failed = rows.filter((r) => r.result && !r.result.success).length;
  const visible = rows.filter((r) => filter === "All" || (filter === "Ready" && !r.errors.length && !r.result) || (filter === "Blocked" && r.errors.length) || (filter === "Imported" && r.result?.success) || (filter === "Failed" && r.result && !r.result.success));

  async function readFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const parsed = parseCsv(await file.text());
    const next = duplicateWarnings(parsed.map((row, i) => build(type, row, i)));
    setRows(next); setSelectedId(next[0]?.id || ""); setMessage(next.length ? `${next.length} rows checked. ${next.filter((r) => !r.errors.length).length} ready.` : "No rows found. Check headers.");
  }

  async function readManifest(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.schema !== MANIFEST_SCHEMA || !Array.isArray(parsed?.rows)) throw new Error("That file is not a Churvox migration manifest.");
      setBaselineManifest(parsed);
      setBaselineName(file.name);
      setMessage(`Comparison manifest loaded: ${file.name}. No live data was touched.`);
    } catch (error) {
      setBaselineManifest(null);
      setBaselineName("");
      setMessage(error?.message || "Could not read that manifest.");
    }
  }

  function reset() { setRows([]); setSelectedId(""); setFileName(""); setMessage(""); setFilter("All"); setBaselineManifest(null); setBaselineName(""); }
  function openArea(t = type) { onNavigate?.({ Clients: "clients", Team: "team", Jobs: "jobs", Quotes: "quotes", Invoices: "invoices" }[t] || "clients"); }
  function saveManifest() {
    if (!rows.length) return setMessage("Load a CSV before downloading a source manifest.");
    const safeName = key(fileName.replace(/\.[^.]+$/, "")) || key(type) || "churvox";
    downloadJson(buildManifest(type, fileName, rows), `${safeName}-${key(type)}-migration-manifest.json`);
    setMessage(`Read-only manifest downloaded for ${rows.length} ${type.toLowerCase()} rows. Nothing was imported.`);
  }
  async function postOne(item) {
    let last = "Import failed";
    for (const endpoint of CONFIG[type].endpoints) {
      try { const res = await post(endpoint, item.payload); if (res?.success) return { success: true, detail: `Imported via ${endpoint}`, id: resultId(res) }; last = res?.error || res?.detail || last; } catch (err) { last = err?.message || last; }
    }
    return { success: false, detail: last };
  }
  async function importReady() {
    if (!ready.length) return setMessage("No ready rows to import.");
    setImporting(true); setMessage(`Importing ${ready.length} rows...`);
    const resultMap = new Map();
    for (const item of ready) resultMap.set(item.id, await postOne(item));
    const next = rows.map((r) => resultMap.has(r.id) ? { ...r, result: resultMap.get(r.id) } : r);
    const summary = { type, total: next.length, imported: next.filter((r) => r.result?.success).length, failed: next.filter((r) => r.result && !r.result.success).length, blocked: next.filter((r) => r.errors.length).length };
    summary.message = `${summary.imported} imported, ${summary.failed} failed, ${summary.blocked} blocked.`;
    setRows(next); setMessage(summary.message); setImporting(false); sendCommand(summary); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "csv-import", dataType: type } }));
  }

  const cfg = CONFIG[type];
  const templateLink = TEMPLATE_LINKS[type];
  return <section className="freshImportsPage">
    <div className="freshImportsHero"><div><span>CSV import / migration</span><h1>Import real business data without making a mess</h1><p>Upload a CSV, validate rows, download a read-only source manifest, then approve clean rows into live Clients, Team, Jobs, Quotes or Invoices.</p></div><div className="freshImportsStats"><div><b>{rows.length}</b><small>checked</small></div><div><b>{clean}</b><small>ready</small></div><div><b>{blocked}</b><small>blocked</small></div><div><b>{imported}</b><small>imported</small></div></div></div>
    <section className="freshCard freshImportsUploader"><div className="freshMiniGrid"><div><span>Type</span><b>{type}</b></div><div><span>Required</span><b>{cfg.required}</b></div><div><span>File</span><b>{fileName || "None"}</b></div><div><span>Failed</span><b>{failed}</b></div></div><div className="freshImportsForm"><label><span>Data type</span><select value={type} onChange={(e) => { setType(e.target.value); reset(); }}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></label><label><span>CSV file</span><input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={readFile} /></label><label className="wide"><span>Expected headers</span><input readOnly value={cfg.example} /></label></div><div className="freshImportsActions"><button type="button" onClick={importReady} disabled={importing || !ready.length}>{importing ? "Importing..." : `Import ${ready.length} ready rows`}</button>{templateLink ? <a href={templateLink} download>Download template</a> : null}<button type="button" onClick={saveManifest} disabled={!rows.length}>Download source manifest</button><label className="freshImportsManifestUpload"><input type="file" accept=".json,application/json" onChange={readManifest} /><span>Compare saved manifest</span></label><button type="button" onClick={() => openArea(type)}>Open {type}</button><button type="button" onClick={() => onNavigate?.("command")}>Open Command</button><button type="button" onClick={reset}>Reset</button></div>{message ? <div className={`freshImportsNotice ${failed || blocked ? "need" : ""}`}><b>Import status</b><span>{message}</span></div> : null}{comparison ? <div className={`freshImportsComparison ${comparison.error || !comparison.safeToRehearse ? "need" : "safe"}`}><div><b>Read-only source comparison</b><span>{baselineName || comparison.baselineFile || "Saved manifest"} · no live data touched</span></div>{comparison.error ? <p>{comparison.error}</p> : <div className="freshImportsComparisonGrid"><span><b>{comparison.matched}</b> matched</span><span><b>{comparison.changed}</b> changed</span><span><b>{comparison.added}</b> added</span><span><b>{comparison.missing}</b> missing</span><span><b>{comparison.blocked}</b> blocked</span></div>}</div> : null}</section>
    <section className="freshCommandFilterBar">{["All", "Ready", "Blocked", "Imported", "Failed"].map((x) => <button key={x} type="button" className={filter === x ? "active" : ""} onClick={() => setFilter(x)}><span>{x}</span><b>{x === "All" ? rows.length : rows.filter((r) => x === "Ready" ? !r.errors.length && !r.result : x === "Blocked" ? r.errors.length : x === "Imported" ? r.result?.success : r.result && !r.result.success).length}</b></button>)}</section>
    <div className="freshImportsLayout"><aside className="freshImportsList"><header><div><b>CSV rows</b><span>{clean} ready · {blocked} blocked</span></div></header>{visible.map((r) => <button type="button" key={r.id} className={selected?.id === r.id ? "active" : ""} onClick={() => setSelectedId(r.id)}><b>Row {r.rowNumber}: {r.label}</b><span>{r.type} · {r.status}</span><small>{r.result ? r.result.success ? `Imported${r.result.id ? ` · ${r.result.id}` : ""}` : `Failed: ${r.result.detail}` : r.errors[0] || r.warnings[0] || "Ready"}</small></button>)}{!rows.length ? <div className="freshImportsEmpty"><b>No CSV loaded yet</b><span>Choose a type, then upload a CSV.</span></div> : null}</aside>{selected ? <article className="freshImportsDetail"><div className="freshImportsHead"><div><span>{selected.result ? selected.result.success ? "Imported" : "Failed" : selected.status}</span><h2>Row {selected.rowNumber}: {selected.label}</h2><p>{selected.type} import · {cfg.endpoints.join(" → ")}</p></div><div className="freshImportsHeadActions"><button type="button" onClick={() => openArea(selected.type)}>Open Area</button><button type="button" onClick={() => onNavigate?.("command")}>Open Command</button></div></div><div className="freshImportsCards"><section><span>Validation</span><b>{selected.errors.length ? "Blocked" : "Ready"}</b><p>{selected.errors.length ? selected.errors.join(" · ") : selected.warnings.join(" · ") || "No blocking issues found."}</p></section><section><span>Import result</span><b>{selected.result ? selected.result.success ? "Imported" : "Failed" : "Not imported"}</b><p>{selected.result?.detail || "Clean rows are imported only after owner approval."}</p></section><section><span>Owner control</span><b>{selected.type}</b><p>Bad rows stay out of live data. Fix the CSV and upload again if needed.</p></section></div><div className="freshImportsForm">{Object.entries(selected.payload || {}).slice(0, 16).map(([k, v]) => <label key={k} className={typeof v === "object" ? "wide" : ""}><span>{k}</span>{typeof v === "object" ? <textarea readOnly value={JSON.stringify(v, null, 2)} /> : <input readOnly value={v ?? ""} />}</label>)}</div></article> : null}</div>
  </section>;
}
