import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
// removed broken css import

const STORE_KEY = "churvox.realAdmin.v1";
const PAGES = [
  ["hub", "Smart Hub", "SH", "Run"], ["command", "Command", "CM", "Run"],
  ["jobs", "Jobs", "JB", "Work"], ["clients", "Clients", "CL", "Work"], ["workers", "Workers", "WK", "Work"],
  ["quotes", "Quotes", "QT", "Money"], ["invoices", "Invoices", "IV", "Money"],
  ["messages", "Messages", "MS", "Admin"], ["team", "Team", "TM", "Admin"], ["xero", "Xero", "XR", "Admin"],
  ["settings", "Settings", "ST", "Control"], ["plans", "Plans", "PL", "Control"], ["help", "Help", "HP", "Control"],
].map(([key, label, code, group]) => ({ key, label, code, group }));

const EMPTY = { jobs: [], clients: [], quotes: [], invoices: [], workers: [], team: [], messages: [], actions: [], requests: [], xero: {} };
const OWNER_FILL = "Owner to fill";

function pick(...values) {
  for (const value of values) if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  return "";
}
function idOf(record, fallback = "") {
  const raw = record?.id || record?._id || record?.job_id || record?.client_id || record?.quote_id || record?.invoice_id || record?.worker_id || fallback;
  return typeof raw === "object" ? String(raw.$oid || raw.oid || raw.id || raw._id || fallback || "") : String(raw || fallback || "");
}
function bodyOf(result) { const body = result?.data ?? result; return body?.data ?? body; }
function listOf(result, key = "") {
  const body = bodyOf(result);
  if (Array.isArray(body)) return body;
  if (key && Array.isArray(body?.[key])) return body[key];
  for (const name of ["items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "notifications", "actions", "requests", "data"]) if (Array.isArray(body?.[name])) return body[name];
  return [];
}
function statusOf(record, fallback = "Prepared") { return pick(record?.status, record?.stage, record?.workflow_status, record?.job_status, fallback).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function clientOf(record) { return pick(record?.client_name, record?.customer_name, record?.client?.name, record?.customer?.name, record?.name, OWNER_FILL); }
function titleOf(record, fallback = "Untitled") { return pick(record?.title, record?.job_title, record?.job_name, record?.subject, record?.service_needed, record?.description, fallback); }
function money(value) { const number = Number(value || 0); return number ? number.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00"; }
function duration(value) { const total = Number(value || 0); if (!total) return "Not recorded"; const h = Math.floor(total / 3600); const m = Math.round((total % 3600) / 60); return `${h ? `${h}h ` : ""}${m}m`.trim(); }
function proofOf(record) {
  const photos = Array.isArray(record?.photos) ? record.photos.length : Array.isArray(record?.proof_photos) ? record.proof_photos.length : 0;
  const note = pick(record?.worker_notes, record?.completion_notes, record?.proof_note, record?.worker_message);
  return photos || note ? `${photos} photo${photos === 1 ? "" : "s"}${note ? " + note" : ""}` : "Proof waiting";
}
function field(key, label, value, type = "text") { return { key, label, value: pick(value, OWNER_FILL), type }; }
function draftText(draft = {}) { return Object.entries(draft).map(([key, value]) => `${key}: ${value}`).join("\n"); }
function draftPayload(draft = {}) {
  return {
    name: pick(draft.name, draft.client, draft.to, OWNER_FILL),
    client_name: pick(draft.client, draft.name, draft.to, OWNER_FILL),
    customer_name: pick(draft.client, draft.name, draft.to, OWNER_FILL),
    phone: draft.phone || "",
    mobile: draft.phone || "",
    email: draft.email || "",
    address: pick(draft.address, draft.site_address, ""),
    site_address: pick(draft.address, draft.site_address, ""),
    notes: pick(draft.notes, draft.note, draft.work, draft.message, draftText(draft)),
  };
}
function parseWorkText(text) {
  const raw = text.trim();
  const match = raw.match(/^(.*?)(?:\s+for\s+|\s+-\s+)([A-Za-z][A-Za-z0-9 .'-]{1,60})$/i);
  return {
    title: match ? match[1].trim() : raw,
    customer_name: match ? match[2].trim() : OWNER_FILL,
    notes: raw,
  };
}
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quote = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quote && next === '"') { cell += '"'; i += 1; continue; }
    if (ch === '"') { quote = !quote; continue; }
    if (ch === "," && !quote) { row.push(cell.trim()); cell = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !quote) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
  return rows.map((cells) => Object.fromEntries(headers.map((h, i) => [h, (cells[i] || "").replace(/^"|"$/g, "").trim()])));
}

function usePage() {
  const read = () => {
    const hash = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "").toLowerCase();
    const path = typeof window === "undefined" ? "" : window.location.pathname;
    const key = hash || (path.includes("plans") ? "plans" : "hub");
    return PAGES.some((page) => page.key === key) ? key : "hub";
  };
  const [page, setPage] = React.useState(read);
  const go = React.useCallback((next) => { const key = PAGES.some((item) => item.key === next) ? next : "hub"; setPage(key); window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${key}`); }, []);
  React.useEffect(() => { const onHash = () => setPage(read()); window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash); }, []);
  return [page, go];
}
function useStore() {
  const [state, setState] = React.useState(() => { try { return JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}") || {}; } catch { return {}; } });
  React.useEffect(() => { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }, [state]);
  return [state, setState];
}
function useLiveData(api) {
  const [data, setData] = React.useState(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const reload = React.useCallback(async () => {
    setLoading(true); setError("");
    const endpoints = [["jobs", "/jobs"], ["clients", "/clients"], ["quotes", "/quotes"], ["invoices", "/invoices"], ["workers", "/worker/live-status"], ["team", "/team/workers"], ["messages", "/notifications"], ["actions", "/ai/actions"], ["requests", "/customer-requests"], ["xero", "/xero/status"]];
    const results = await Promise.allSettled(endpoints.map(([, endpoint]) => api.get(endpoint)));
    const byKey = Object.fromEntries(endpoints.map(([key], index) => [key, results[index].status === "fulfilled" && results[index].value?.success !== false ? results[index].value : null]));
    const failed = endpoints.filter(([key]) => !byKey[key] && !["actions", "xero"].includes(key)).map(([key]) => key);
    const jobs = listOf(byKey.jobs, "jobs").map((row) => ({ raw: row, id: idOf(row), title: titleOf(row, "Untitled job"), client: clientOf(row), worker: pick(row.assigned_worker_name, row.worker_name, row.worker?.name, row.assigned_to_name, "Unassigned"), status: statusOf(row, "Intake"), recurring: row.is_recurring || row.recurring_frequency || row.recurrence_pattern ? pick(row.recurring_frequency, row.recurrence_pattern, "Recurring") : "One-off", proof: proofOf(row), time: duration(row.total_time_seconds || row.timer_total_seconds || row.shift_seconds), address: pick(row.address, row.site_address, row.location, OWNER_FILL), note: pick(row.notes, row.description, "No job note saved"), adminReady: Boolean(row.invoice_ready || row.message_ready || row.owner_approval_required || row.quote_ready || row.proof_photos?.length) }));
    const clients = listOf(byKey.clients, "clients").map((row) => ({ raw: row, id: idOf(row), name: clientOf(row), phone: pick(row.phone, row.mobile), email: pick(row.email), address: pick(row.address, row.site_address), jobs: Number(row.job_count || row.jobs_count || row.total_jobs || 0), value: Number(row.total_spend || row.lifetime_value || row.total || 0), note: pick(row.notes, row.note, row.last_note, "No client note saved") }));
    const quotes = listOf(byKey.quotes, "quotes").map((row) => ({ raw: row, id: idOf(row), title: titleOf(row, `Quote - ${clientOf(row)}`), client: clientOf(row), status: statusOf(row, "Draft"), amount: Number(row.amount || row.total || row.price || 0), note: pick(row.notes, row.description, "Quote prepared for review") }));
    const invoices = listOf(byKey.invoices, "invoices").map((row) => ({ raw: row, id: idOf(row), title: titleOf(row, pick(row.invoice_number, `Invoice - ${clientOf(row)}`)), client: clientOf(row), status: statusOf(row, "Draft"), amount: Number(row.amount || row.total || row.price || 0), note: pick(row.notes, row.description, row.xero_sync_status, "Invoice prepared for review") }));
    const teamRaw = listOf(byKey.team, "workers");
    const workerRaw = listOf(byKey.workers, "workers");
    const workers = (workerRaw.length ? workerRaw : teamRaw).map((row, index) => { const name = pick(row.name, row.full_name, row.worker_name, row.email, `Worker ${index + 1}`); const lat = Number(row.last_lat || row.gps_lat || row.latitude || 0); const lng = Number(row.last_lng || row.gps_lng || row.longitude || 0); return { raw: row, id: idOf(row, `worker-${index}`), name, initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), status: pick(row.live_status, row.clock_status, row.status, "Waiting"), job: pick(row.current_job_title, row.current_job, "No active job"), time: duration(row.shift_seconds || row.payroll_seconds), proof: pick(row.proof_status, row.proof, "Proof waiting"), lat, lng, hasGps: Boolean(lat && lng) }; });
    const team = teamRaw.map((row, index) => ({ raw: row, id: idOf(row, `team-${index}`), name: pick(row.name, row.full_name, row.email, `Worker ${index + 1}`), role: pick(row.role, "Worker"), app: pick(row.worker_app_status, row.status, row.active ? "Ready" : "Invite pending"), payroll: pick(row.payroll_status, row.payroll_hours ? "Review" : "Not ready"), access: pick(row.access_status, row.role, "Worker") }));
    const messages = listOf(byKey.messages, "notifications").map((row) => ({ raw: row, id: idOf(row), title: titleOf(row, "Reply ready"), to: pick(row.client_name, row.customer_name, row.audience, row.source, "Client"), status: row.read || row.is_read ? "Read" : "Prepared", body: pick(row.message, row.body, row.summary, "Reply prepared for owner approval") }));
    setData({ jobs, clients, quotes, invoices, workers, team, messages, actions: listOf(byKey.actions, "actions"), requests: listOf(byKey.requests, "requests"), xero: bodyOf(byKey.xero) || {} });
    if (failed.length) setError(`Live module check needed: ${failed.join(", ")}.`);
    setLoading(false);
  }, [api]);
  React.useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

function textFrom(row) { return pick(row?.message, row?.summary, row?.detail, row?.description, row?.title, row?.notes, "Prepared admin waiting for owner check"); }
function kindOf(row) { const text = JSON.stringify(row || {}).toLowerCase(); if (text.includes("invoice")) return "invoice"; if (text.includes("quote") || text.includes("estimate")) return "quote"; if (text.includes("message") || text.includes("reply") || text.includes("sms") || text.includes("email")) return "reply"; if (text.includes("client") || text.includes("customer")) return "client"; if (text.includes("worker") || text.includes("payroll") || text.includes("team")) return "team"; return "job"; }
function actionForm(row, index) {
  const kind = kindOf(row); const text = textFrom(row); const base = { id: `action:${idOf(row, `action-${index}`)}`, source: "action", sourceId: idOf(row), kind, status: statusOf(row, "Ready") };
  if (kind === "client") return { ...base, title: "Client form ready", subtitle: "Check the prepared client record, then create it.", actionLabel: "Create client", fields: [field("name", "Client name", clientOf(row)), field("phone", "Phone", pick(row.phone, row.mobile, OWNER_FILL)), field("email", "Email", pick(row.email, OWNER_FILL)), field("address", "Site address", pick(row.address, row.site_address, OWNER_FILL)), field("work", "Work requested", text, "textarea")] };
  if (kind === "quote") return { ...base, title: "Quote form ready", subtitle: "Check price, scope and customer message before sending.", actionLabel: "Approve quote", fields: [field("client", "Client", clientOf(row)), field("work", "Work", titleOf(row, text), "textarea"), field("amount", "Total", pick(row.amount, row.total, OWNER_FILL)), field("terms", "Terms", "Quote valid for 14 days unless stated otherwise.", "textarea"), field("message", "Customer message", text, "textarea")] };
  if (kind === "invoice") return { ...base, title: "Invoice form ready", subtitle: "Check proof, time and amount before sending or syncing.", actionLabel: "Approve invoice", fields: [field("client", "Client", clientOf(row)), field("work", "Work", titleOf(row, text)), field("amount", "Amount", pick(row.amount, row.total, OWNER_FILL)), field("proof", "Proof", pick(row.proof, "Check worker proof")), field("note", "Invoice note", text, "textarea")] };
  if (kind === "reply") return { ...base, title: "Reply ready", subtitle: "Check wording before anything sends.", actionLabel: "Approve reply", fields: [field("to", "To", clientOf(row)), field("subject", "Subject", titleOf(row, "Job update")), field("message", "Message", text, "textarea"), field("rule", "Send rule", "Send only after owner approval")] };
  if (kind === "team") return { ...base, title: "Team admin ready", subtitle: "Check worker access, app status or payroll review.", actionLabel: "Approve team update", fields: [field("person", "Person", clientOf(row)), field("issue", "Admin item", text, "textarea"), field("next", "Next step", "Approve this team update or save an edit", "textarea")] };
  return { ...base, title: "Job admin ready", subtitle: "Check the prepared job slip before it moves.", actionLabel: "Approve admin", fields: [field("client", "Client", clientOf(row)), field("work", "Work", titleOf(row, text), "textarea"), field("next", "Next step", text, "textarea")] };
}
function quoteForm(row) { return { id: `quote:${row.id}`, source: "quote", sourceId: row.id, kind: "quote", title: "Quote form ready", subtitle: "Prepared from the offer pipeline. Send from Command only.", actionLabel: "Send quote", status: row.status, fields: [field("client", "Client", row.client), field("work", "Work", row.title), field("amount", "Amount", money(row.amount)), field("terms", "Terms", "Quote valid for 14 days unless stated otherwise.", "textarea"), field("message", "Customer message", row.note, "textarea")] }; }
function invoiceForm(row) { return { id: `invoice:${row.id}`, source: "invoice", sourceId: row.id, kind: "invoice", title: "Invoice form ready", subtitle: "Prepared by the money desk. Approve before sending or sync.", actionLabel: "Approve invoice", status: row.status, fields: [field("client", "Client", row.client), field("invoice", "Invoice", row.title), field("amount", "Amount", money(row.amount)), field("note", "Invoice note", row.note, "textarea"), field("sync", "Accounting sync", "Draft sync only after owner approval")] }; }
function messageForm(row) { return { id: `message:${row.id}`, source: "message", sourceId: row.id, kind: "reply", title: "Reply ready", subtitle: "Prepared from Messages. Approve here before it sends.", actionLabel: "Approve reply", status: row.status, fields: [field("to", "To", row.to), field("subject", "Subject", row.title), field("message", "Message", row.body, "textarea"), field("rule", "Send rule", "Send only after owner approval")] }; }
function requestForm(row, index) { return { id: `request:${idOf(row, `request-${index}`)}`, source: "request", sourceId: idOf(row), kind: "job", title: "New job request ready", subtitle: "Customer request has been turned into a job slip for owner check.", actionLabel: "Create job", status: statusOf(row, "New"), fields: [field("client", "Client", clientOf(row)), field("phone", "Phone", pick(row.phone, row.mobile, OWNER_FILL)), field("email", "Email", pick(row.email, OWNER_FILL)), field("address", "Site address", pick(row.address, row.site_address, OWNER_FILL)), field("work", "Work requested", pick(row.service_needed, row.message, row.title), "textarea")] }; }
function jobForm(row) { return { id: `job:${row.id}`, source: "job", sourceId: row.id, kind: "job", title: "Job admin ready", subtitle: "Job proof, time or follow-up needs owner check in Command.", actionLabel: "Approve job admin", status: row.status, fields: [field("client", "Client", row.client), field("job", "Job", row.title), field("worker", "Worker", row.worker), field("proof", "Proof", row.proof), field("time", "Time", row.time), field("next", "Next step", row.adminReady ? "Prepare invoice, reply or update after owner approval." : row.note, "textarea")] }; }
function needsOwner(status) { return /draft|ready|prepared|pending|review|overdue|sync|unread|open|new/i.test(status || ""); }
function buildForms(data, store) {
  const out = new Map(); const add = (form) => { const edit = store.edits?.[form.id] || {}; if (edit.state === "approved") return; out.set(form.id, { ...form, ...edit, fields: form.fields }); };
  data.actions.filter((row) => !/approved|declined|done/i.test(row.status || "")).forEach((row, i) => add(actionForm(row, i)));
  data.requests.forEach((row, i) => add(requestForm(row, i)));
  data.jobs.filter((row) => row.adminReady).forEach((row) => add(jobForm(row)));
  data.quotes.filter((row) => needsOwner(row.status)).forEach((row) => add(quoteForm(row)));
  data.invoices.filter((row) => needsOwner(row.status)).forEach((row) => add(invoiceForm(row)));
  data.messages.filter((row) => needsOwner(row.status)).forEach((row) => add(messageForm(row)));
  Object.values(store.queue || {}).forEach(add);
  return Array.from(out.values()).filter((form) => form.state !== "approved");
}

function Sidebar({ page, go, count, data, loading }) {
  const groups = PAGES.reduce((acc, item) => { acc[item.group] = acc[item.group] || []; acc[item.group].push(item); return acc; }, {});
  return <aside className="workSidebar"><div className="workBrand"><b>C</b><span><strong>churvox</strong><em>Owner admin OS</em></span></div>{Object.entries(groups).map(([group, items]) => <nav key={group}><p>{group}</p>{items.map((item) => <button type="button" key={item.key} onClick={() => go(item.key)} className={page === item.key ? "active" : ""}><span>{item.code}</span><b>{item.label}</b>{item.key === "command" && count ? <em>{count}</em> : item.key === "messages" && data.messages.length ? <em>{data.messages.length}</em> : null}</button>)}</nav>)}<footer><b>{loading ? "Loading records" : "Live records loaded"}</b><span>{data.jobs.length} jobs / {data.clients.length} clients / {data.workers.filter((w) => w.hasGps).length} GPS pings</span></footer></aside>;
}
function Topbar({ page, go, addWork, busy }) {
  const [text, setText] = React.useState(""); const label = PAGES.find((item) => item.key === page)?.label || "Smart Hub";
  return <header className="workTop"><div><span>Churvox OS</span><strong>{label}</strong></div><form onSubmit={(event) => { event.preventDefault(); if (text.trim()) { addWork(text.trim()); setText(""); } }}><label>Add real work</label><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Leaking tap for Watson, quote follow-up, invoice proof..." /><button disabled={busy} type="submit">Add work</button></form><button type="button" onClick={() => go("command")}><span>Owner</span><b>Open Command</b></button></header>;
}
function Empty({ title, text }) { return <div className="workEmpty"><b>{title}</b><span>{text}</span></div>; }
function Command({ forms, store, setStore, approve, busy }) {
  const [selectedId, setSelectedId] = React.useState("");
  React.useEffect(() => { if ((!selectedId || !forms.some((form) => form.id === selectedId)) && forms[0]) setSelectedId(forms[0].id); }, [forms, selectedId]);
  const selected = forms.find((form) => form.id === selectedId) || forms[0];
  const saved = selected ? store.edits?.[selected.id]?.draft : null;
  const [draft, setDraft] = React.useState({});
  React.useEffect(() => { if (selected) setDraft(saved || Object.fromEntries(selected.fields.map((item) => [item.key, item.value]))); }, [selected?.id]);
  if (!selected) return <section className="commandGrid"><aside className="queue"><h1>Admin forms ready for owner check.</h1><Empty title="Nothing waiting" text="Quotes, invoices, replies, client forms and job slips appear here when Churvox prepares them." /></aside></section>;
  const saveEdit = () => setStore((current) => ({ ...current, edits: { ...(current.edits || {}), [selected.id]: { ...(current.edits?.[selected.id] || {}), state: "open", edited: true, draft } } }));
  return <section className="commandGrid"><aside className="queue"><h1>Admin forms ready for owner check.</h1><div className="queuePills"><b>{forms.filter((item) => item.state !== "parked").length} open</b><span>{forms.filter((item) => item.edited).length} edited</span><span>{forms.filter((item) => item.state === "parked").length} parked</span></div>{forms.map((form) => <button type="button" key={form.id} className={form.id === selected.id ? "active" : ""} onClick={() => setSelectedId(form.id)}><small>{form.kind}</small><b>{form.title}</b><span>{form.subtitle}</span><em>{form.error ? "needs retry" : form.edited ? "edited" : form.state || "open"}</em></button>)}</aside><article className="slip"><header><span>{selected.kind} form</span><h2>{selected.title}</h2><p>{selected.error || selected.subtitle}</p></header><div className="formGrid">{selected.fields.map((item) => <label key={item.key} className={item.type === "textarea" ? "wide" : ""}><span>{item.label}</span>{item.type === "textarea" ? <textarea value={draft[item.key] || ""} onChange={(event) => setDraft((current) => ({ ...current, [item.key]: event.target.value }))} /> : <input value={draft[item.key] || ""} onChange={(event) => setDraft((current) => ({ ...current, [item.key]: event.target.value }))} />}</label>)}</div><footer><button disabled={busy} type="button" onClick={() => approve(selected, "approved", draft)}>{selected.actionLabel}</button><button disabled={busy} type="button" onClick={saveEdit}>Save edit</button><button disabled={busy} type="button" onClick={() => approve(selected, "parked", draft)}>Park</button></footer></article></section>;
}
function MapBox({ workers }) {
  const live = workers.filter((w) => w.hasGps); const base = live[0] || { lat: -41.2128, lng: 174.9083 }; const lat = Number(base.lat || -41.2128); const lng = Number(base.lng || 174.9083); const bbox = `${lng - 0.05}%2C${lat - 0.035}%2C${lng + 0.05}%2C${lat + 0.035}`;
  return <div className="workMap"><iframe title="Worker GPS map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`} loading="lazy" />{live.map((worker, index) => <button key={worker.id} style={{ left: `${14 + (index % 4) * 21}%`, top: `${18 + (index % 3) * 24}%` }} type="button"><b>{worker.initials}</b><span>{worker.name}</span><small>{worker.job}</small></button>)}{!live.length ? <div><b>Map ready</b><span>Worker pins show when GPS comes from the worker app.</span></div> : null}</div>;
}
function Table({ rows, cols }) { return <table><thead><tr>{cols.map((col) => <th key={col}>{col}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{cols.map((col) => <td key={col}>{row[col]}</td>)}</tr>)}</tbody></table>; }
function Hub({ data, forms, go, error }) { return <section className="hub"><article className="heroPanel"><span>Smart Hub</span><h1>Owner attention today.</h1>{error ? <Empty title="Live module check" text={error} /> : null}<div className="columns"><section><h3>Real work added <b>{data.jobs.length}</b></h3>{data.jobs.slice(0, 5).map((job) => <p key={job.id}><strong>{job.title}</strong><span>{job.client} / {job.status}</span></p>)}</section><section><h3>Admin prepared <b>{forms.length}</b></h3>{forms.slice(0, 5).map((form) => <p key={form.id}><strong>{form.title}</strong><span>{form.actionLabel}</span></p>)}</section><section><h3>Owner decision <b>{forms.length}</b></h3><p><strong>Check the filled form</strong><span>Approve, save edit or park in Command.</span></p><button type="button" onClick={() => go("command")}>Open Command</button></section></div></article><article className="mapPanel"><h2>Workers and proof</h2><MapBox workers={data.workers} /></article><article className="widePanel"><header><h2>Field work Churvox is watching.</h2><button type="button" onClick={() => go("jobs")}>Open Jobs</button></header><Table rows={data.jobs.slice(0, 8)} cols={["title", "client", "worker", "status", "proof", "time"]} /></article></section>; }
function Jobs({ data, queueForm, go }) { const lanes = ["Intake", "Dispatch", "Recurring", "Proof", "Admin ready"]; const inLane = (job, lane) => lane === "Recurring" ? job.recurring !== "One-off" : lane === "Proof" ? !/waiting/i.test(job.proof) : lane === "Admin ready" ? job.adminReady : lane === "Dispatch" ? /assigned|progress|site|scheduled/i.test(job.status) : !job.adminReady; return <section className="lanePage"><header><span>Jobs</span><h1>Dispatch, recurring and proof trail.</h1><p>Jobs run the real work. Any owner decision is prepared for Command.</p></header><div className="lanes">{lanes.map((lane) => <article key={lane}><h3>{lane}</h3>{data.jobs.filter((job) => inLane(job, lane)).slice(0, 6).map((job) => <p key={job.id}><strong>{job.title}</strong><span>{job.client} / {job.status}</span><button type="button" onClick={() => { queueForm(jobForm(job)); go("command"); }}>Prepare in Command</button></p>)}</article>)}</div></section>; }
function Clients({ data }) { const [selectedId, setSelectedId] = React.useState(""); React.useEffect(() => { if (!selectedId && data.clients[0]) setSelectedId(data.clients[0].id); }, [data.clients, selectedId]); const selected = data.clients.find((item) => item.id === selectedId) || data.clients[0]; return <section className="clientsPage"><aside><h1>Client file.</h1><div className="clientList">{data.clients.map((item) => <button key={item.id} className={item.id === selected?.id ? "active" : ""} type="button" onClick={() => setSelectedId(item.id)}><b>{item.name}</b><span>{item.jobs} jobs / {item.value ? money(item.value) : "ready to check"}</span></button>)}</div></aside><article>{selected ? <><span>Selected client</span><h2>{selected.name}</h2><div className="factGrid"><p><b>Contact</b>{selected.phone || selected.email || "Owner to add contact"}</p><p><b>Address</b>{selected.address || "Owner to add address"}</p><p><b>Service memory</b>{selected.note}</p><p><b>Price memory</b>{selected.value ? `${money(selected.value)} recorded` : "No price memory yet"}</p></div><footer>Next prepared admin goes to Command, not out to the customer.</footer></> : <Empty title="No clients" text="Import or create clients to build customer memory." />}</article></section>; }
function Workers({ data }) { return <section className="workersPage"><article><span>Workers</span><h1>Live field, GPS and proof command view.</h1><MapBox workers={data.workers} /></article><aside><h2>Proof and time feed</h2>{data.workers.map((worker) => <p key={worker.id}><b>{worker.initials} {worker.name}</b><span>{worker.job}</span><small>{worker.status} / {worker.time} / {worker.proof}</small></p>)}</aside></section>; }
function Pipeline({ title, kicker, subtitle, rows, queueForm, formFor, go, cols }) { return <section className="pipeline"><header><span>{kicker}</span><h1>{title}</h1><p>{subtitle}</p></header><div>{rows.map((row) => <article key={row.id}><span>{row.status}</span><h3>{row.title}</h3><p>{row.client}</p>{row.amount !== undefined ? <b>{money(row.amount)}</b> : null}<button type="button" onClick={() => { queueForm(formFor(row)); go("command"); }}>Prepare in Command</button></article>)}</div>{rows.length ? <Table rows={rows.slice(0, 6)} cols={cols} /> : <Empty title="Nothing here yet" text="Real records show here when they exist." />}</section>; }
function Messages({ data, queueForm, go }) { return <Pipeline title="Prepared replies, not another inbox." kicker="Messages" subtitle="Replies are drafted here and approved in Command." rows={data.messages} queueForm={queueForm} formFor={messageForm} go={go} cols={["title", "to", "status"]} />; }
function Team({ data, queueForm, go }) { const rows = data.team.length ? data.team : data.workers.map((w) => ({ id: w.id, name: w.name, role: "Worker", app: w.status, payroll: w.time, access: "Worker" })); return <section className="matrix"><header><span>Team</span><h1>Access, payroll and worker app readiness.</h1><p>Team gaps can be prepared for Command. Payroll and access changes are not hidden.</p></header><Table rows={rows} cols={["name", "role", "app", "payroll", "access"]} /><aside><h2>Admin gaps Churvox watches</h2>{rows.slice(0, 4).map((row) => <p key={row.id}><b>{row.name}</b><span>{row.app} / payroll {row.payroll}</span><button type="button" onClick={() => { queueForm({ id: `team:${row.id}`, source: "team", sourceId: row.id, kind: "team", title: "Team admin ready", subtitle: "Worker app, access or payroll item prepared for owner check.", actionLabel: "Approve team update", fields: [field("person", "Person", row.name), field("role", "Role", row.role), field("worker_app", "Worker app", row.app), field("payroll", "Payroll", row.payroll)] }); go("command"); }}>Prepare in Command</button></p>)}</aside></section>; }
function Xero({ data }) { return <section className="control"><header><span>Xero</span><h1>Draft sync guardrails.</h1><p>Accounting handoff is controlled. No tax filing, no payout files, no automatic invoice sending.</p></header><div><article><h3>Connection</h3><p>{data.xero.connected || data.xero.tenant_name ? "Connected" : "Not connected"}</p></article><article><h3>Draft invoice sync only</h3><p>Owner approval clears what gets synced.</p></article><article><h3>No tax filing</h3><p>Churvox does not submit tax filings.</p></article><article><h3>No payout files</h3><p>Churvox does not create bank payout files.</p></article></div></section>; }
function Settings({ data, queueForm, go, user }) {
  const exportCsv = (name, rows) => { const headers = Object.keys(rows[0] || { empty: "" }); const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url); };
  const importCsv = async (event) => { const file = event.target.files?.[0]; if (!file) return; const rows = parseCsv(await file.text()).slice(0, 200); rows.forEach((row, index) => queueForm({ id: `csv-client:${Date.now()}:${index}`, source: "prepared", kind: "client", title: "Imported client ready", subtitle: "CSV row is ready as a real client form.", actionLabel: "Create client", fields: [field("name", "Client name", pick(row.name, row.client, row.customer, row.client_name)), field("phone", "Phone", pick(row.phone, row.mobile)), field("email", "Email", row.email), field("address", "Site address", pick(row.address, row.site_address)), field("notes", "Notes", JSON.stringify(row), "textarea")] })); go("command"); };
  return <section className="control"><header><span>Settings</span><h1>Business controls.</h1><p>Setup, CSV, invoice defaults and approval rules belong here.</p></header><div><article><h3>Business identity</h3><p>{user?.business_name || user?.email || "Current account loaded"}</p></article><article><h3>CSV import</h3><p>Import rows into Command as client creation slips.</p><input type="file" accept=".csv,text/csv" onChange={importCsv} /></article><article><h3>CSV exports</h3><p>Download current records.</p><button type="button" onClick={() => exportCsv("churvox-clients", data.clients)}>Export clients</button><button type="button" onClick={() => exportCsv("churvox-jobs", data.jobs)}>Export jobs</button></article><article><h3>Approval rules</h3><p>Approve, save edit and park live in Command only.</p></article></div></section>;
}
function Plans() { const plans = [["Start", "$39/month + GST", "Records"], ["Crew", "$89/month + GST", "Field"], ["Operator", "$149/month + GST", "Most Popular"], ["Command", "$299/month + GST", "Approval OS"]]; return <section className="plans"><header><span>Plans</span><h1>Simple tiers. Clear admin power.</h1><p>Pricing stays fixed and aligned with Stripe.</p></header><div>{plans.map(([name, price, tag]) => <article key={name} className={name === "Operator" ? "popular" : ""}><span>{tag}</span><h2>{name}</h2><b>{price}</b></article>)}</div><footer>Command Growth Pack $99/month + GST. Accounting Sync Add-on $39/month + GST for non-Command tiers.</footer></section>; }
function Help() { return <section className="control"><header><span>Help</span><h1>Launch checks.</h1><p>Use this to make the account real.</p></header><div><article><h3>Setup check</h3><p>Create one client, one job, one worker and one invoice.</p></article><article><h3>Worker guide</h3><p>Workers record time, GPS and proof.</p></article><article><h3>Accounting guide</h3><p>Draft sync only. No tax filing. No payout files.</p></article><article><h3>Support</h3><p>hello@churvox.com</p></article></div></section>; }

export default function ChurvoxOSRealAdmin() {
  const api = useApi(); const { user } = useAuth(); const [page, go] = usePage(); const [store, setStore] = useStore(); const { data, loading, error, reload } = useLiveData(api); const [busy, setBusy] = React.useState(false); const [adding, setAdding] = React.useState(false);
  const forms = React.useMemo(() => buildForms(data, store), [data, store]);
  const queueForm = React.useCallback((form) => setStore((current) => ({ ...current, queue: { ...(current.queue || {}), [form.id]: { ...form, state: "open" } } })), [setStore]);
  const addWork = React.useCallback(async (text) => { setAdding(true); try { const parsed = parseWorkText(text); await api.post("/jobs", { title: parsed.title, job_type: "other", customer_name: parsed.customer_name, address: OWNER_FILL, scheduled_date: new Date().toISOString(), notes: parsed.notes }); await reload(); go("jobs"); } finally { setAdding(false); } }, [api, reload, go]);
  const approve = React.useCallback(async (form, state, draft) => {
    setBusy(true);
    try {
      if (state === "approved") {
        if (form.source === "action" && form.sourceId) await api.post(`/ai/actions/${form.sourceId}/approve`, { draft });
        else if (form.source === "quote") await api.post(`/quotes/${form.sourceId}/send`, { draft });
        else if (form.source === "invoice") await api.patch(`/invoices/${form.sourceId}`, { status: "sent", notes: draftText(draft) });
        else if (form.source === "request") { await api.post("/jobs", { title: draft.work || "New job request", customer_name: draft.client || OWNER_FILL, phone: draft.phone || "", email: draft.email || "", address: draft.address || OWNER_FILL, notes: draft.work || draftText(draft) }); if (form.sourceId) await api.patch(`/customer-requests/${form.sourceId}`, { status: "Owner approved", owner_note: draftText(draft) }); }
        else if (form.source === "job") await api.patch(`/jobs/${form.sourceId}`, { owner_approved: true, owner_note: draftText(draft) });
        else if (form.source === "team" && form.sourceId) await api.patch(`/team/workers/${form.sourceId}`, { role: draft.role, worker_app_status: draft.worker_app, payroll_status: draft.payroll, owner_note: draftText(draft) });
        else if (form.source === "prepared" && form.kind === "client") await api.post("/clients", draftPayload(draft));
      }
      if (state === "parked" && form.source === "action" && form.sourceId) await api.post(`/ai/actions/${form.sourceId}/decline`, { note: "Parked by owner" });
      setStore((current) => ({ ...current, edits: { ...(current.edits || {}), [form.id]: { ...(current.edits?.[form.id] || {}), state, draft, edited: current.edits?.[form.id]?.edited || false, error: "" } }, queue: { ...(current.queue || {}), [form.id]: { ...(current.queue?.[form.id] || form), state } } }));
      await reload();
    } catch (err) {
      setStore((current) => ({ ...current, edits: { ...(current.edits || {}), [form.id]: { ...(current.edits?.[form.id] || {}), state: "open", draft, edited: true, error: err?.message || "Backend action failed. Check the slip and retry." } } }));
    } finally { setBusy(false); }
  }, [api, reload, setStore]);
  let content;
  if (page === "command") content = <Command forms={forms} store={store} setStore={setStore} approve={approve} busy={busy} />;
  else if (page === "jobs") content = <Jobs data={data} queueForm={queueForm} go={go} />;
  else if (page === "clients") content = <Clients data={data} />;
  else if (page === "workers") content = <Workers data={data} />;
  else if (page === "quotes") content = <Pipeline title="Offer pipeline without approval clutter." kicker="Quotes" subtitle="Quotes are watched here. Sending decisions go to Command." rows={data.quotes} queueForm={queueForm} formFor={quoteForm} go={go} cols={["title", "client", "status", "amount"]} />;
  else if (page === "invoices") content = <Pipeline title="Money desk." kicker="Invoices" subtitle="Invoices are watched here. Sending and sync decisions go to Command." rows={data.invoices} queueForm={queueForm} formFor={invoiceForm} go={go} cols={["title", "client", "status", "amount"]} />;
  else if (page === "messages") content = <Messages data={data} queueForm={queueForm} go={go} />;
  else if (page === "team") content = <Team data={data} queueForm={queueForm} go={go} />;
  else if (page === "xero") content = <Xero data={data} />;
  else if (page === "settings") content = <Settings data={data} queueForm={queueForm} go={go} user={user} />;
  else if (page === "plans") content = <Plans />;
  else if (page === "help") content = <Help />;
  else content = <Hub data={data} forms={forms} go={go} error={error} />;
  return <main className="workOS"><Sidebar page={page} go={go} count={forms.filter((f) => f.state !== "parked").length} data={data} loading={loading} /><section className="workMain"><Topbar page={page} go={go} addWork={addWork} busy={adding} />{content}</section><aside className="commandDock"><span>Command approval desk</span><strong>{forms.filter((f) => f.state !== "parked").length}</strong><p>forms waiting</p><button type="button" onClick={() => go("command")}>Open Command</button><small>Check, edit, approve or park.</small></aside></main>;
}
