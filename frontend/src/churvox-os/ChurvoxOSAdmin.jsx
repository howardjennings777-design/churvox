import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
// removed broken css import

const STATE_KEY = "churvox.os.admin.forms.v2";

const NAV = [
  ["hub", "Smart Hub", "SH", "Run"],
  ["command", "Command", "CM", "Run"],
  ["jobs", "Jobs", "JB", "Work"],
  ["clients", "Clients", "CL", "Work"],
  ["workers", "Workers", "WK", "Work"],
  ["quotes", "Quotes", "QT", "Money"],
  ["invoices", "Invoices", "IV", "Money"],
  ["messages", "Messages", "MS", "Admin"],
  ["team", "Team", "TM", "Admin"],
  ["xero", "Xero", "XR", "Admin"],
  ["settings", "Settings", "ST", "Control"],
  ["plans", "Plans", "PL", "Control"],
  ["help", "Help", "HP", "Control"],
].map(([key, label, code, group]) => ({ key, label, code, group }));

const EMPTY = { jobs: [], clients: [], quotes: [], invoices: [], workers: [], team: [], messages: [], actions: [], requests: [], xero: {} };
const SKIP_KEYS = /(^id$|_id|password|token|secret|hash|created|updated|deleted|tenant|owner_id|business_id)/i;

function cleanRoute(value) {
  const key = String(value || "").replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  const aliases = { "": "hub", dashboard: "hub", home: "hub", smart: "hub", calendar: "jobs", schedule: "jobs", recurring: "jobs", payroll: "team", accounting: "xero" };
  return aliases[key] || (NAV.some((item) => item.key === key) ? key : "hub");
}

function idOf(record, fallback = "") {
  const raw = record?.id || record?._id || record?.job_id || record?.quote_id || record?.invoice_id || record?.client_id || record?.worker_id || fallback;
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || fallback || "");
  return String(raw || fallback || "");
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function payload(result) {
  const body = result?.data ?? result;
  return body?.data ?? body;
}

function list(result, key) {
  const body = payload(result);
  if (Array.isArray(body)) return body;
  if (key && Array.isArray(body?.[key])) return body[key];
  for (const name of ["items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "notifications", "actions", "requests", "data"]) {
    if (Array.isArray(body?.[name])) return body[name];
  }
  return [];
}

function normalizeKey(value) {
  return String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function findDeep(source, keys) {
  const wanted = keys.map(normalizeKey);
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object" || seen.has(node)) return "";
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return "";
    }
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.test(key)) continue;
      const clean = normalizeKey(key);
      if (wanted.some((target) => clean === target || clean.includes(target) || target.includes(clean))) {
        if (Array.isArray(value)) return value.map((item) => typeof item === "object" ? readableText(item, 4) : String(item)).filter(Boolean).join("\n");
        if (value && typeof value === "object") return readableText(value, 6);
        if (pick(value)) return pick(value);
      }
    }
    for (const value of Object.values(node)) {
      const found = walk(value);
      if (found) return found;
    }
    return "";
  };
  return walk(source);
}

function readableText(source, limit = 8) {
  const values = [];
  const seen = new Set();
  const walk = (node, key = "") => {
    if (values.length >= limit || node === null || node === undefined) return;
    if (typeof node === "string" || typeof node === "number") {
      const text = String(node).trim();
      if (text && text.length > 1 && !seen.has(text) && !SKIP_KEYS.test(key)) {
        seen.add(text);
        values.push(text);
      }
      return;
    }
    if (Array.isArray(node)) return node.forEach((item) => walk(item, key));
    if (typeof node === "object") {
      Object.entries(node).forEach(([childKey, value]) => {
        if (!SKIP_KEYS.test(childKey)) walk(value, childKey);
      });
    }
  };
  walk(source);
  return values.join("\n");
}

function money(value) {
  const number = Number(value || 0);
  return number ? number.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function title(record, fallback) {
  return pick(record?.title, record?.job_title, record?.job_name, record?.description, record?.subject, record?.service_needed, fallback);
}

function client(record) {
  return pick(record?.client_name, record?.customer_name, record?.name, record?.client?.name, record?.customer?.name, "To confirm");
}

function status(record, fallback = "Prepared") {
  return pick(record?.status, record?.job_status, record?.workflow_status, record?.stage, fallback).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function seconds(secondsValue) {
  const total = Number(secondsValue || 0);
  if (!total) return "Not recorded";
  const hours = Math.floor(total / 3600);
  const mins = Math.round((total % 3600) / 60);
  return `${hours ? `${hours}h ` : ""}${mins}m`.trim();
}

function proof(record) {
  const photos = Array.isArray(record?.photos) ? record.photos.length : Array.isArray(record?.proof_photos) ? record.proof_photos.length : 0;
  const note = pick(record?.worker_notes, record?.completion_notes, record?.proof_note, record?.worker_message);
  if (!photos && !note) return "Waiting for proof";
  return `${photos} photo${photos === 1 ? "" : "s"}${note ? " + note" : ""}`;
}

function useRoute() {
  const [page, setPage] = React.useState(() => cleanRoute(typeof window === "undefined" ? "hub" : window.location.hash || window.localStorage.getItem("churvox.os.page")));
  const go = React.useCallback((next) => {
    const target = cleanRoute(next);
    setPage(target);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("churvox.os.page", target);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
    }
  }, []);
  React.useEffect(() => {
    const onHash = () => setPage(cleanRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [page, go];
}

function useAdminState() {
  const [state, setState] = React.useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(window.localStorage.getItem(STATE_KEY) || "{}"); } catch { return {}; }
  });
  React.useEffect(() => {
    try { window.localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);
  return [state, setState];
}

function useLiveData(api) {
  const [data, setData] = React.useState(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const endpoints = [
      ["jobs", "/jobs"],
      ["clients", "/clients"],
      ["quotes", "/quotes"],
      ["invoices", "/invoices"],
      ["team", "/team/workers"],
      ["live", "/worker/live-status"],
      ["messages", "/notifications"],
      ["actions", "/ai/actions"],
      ["requests", "/customer-requests"],
      ["xero", "/xero/status"],
    ];
    const results = await Promise.allSettled(endpoints.map(([, endpoint]) => api.get(endpoint)));
    const byKey = Object.fromEntries(endpoints.map(([key], index) => [key, results[index]]));
    const value = (key) => byKey[key]?.status === "fulfilled" && byKey[key].value?.success !== false ? byKey[key].value : null;
    const failed = endpoints.filter(([key]) => !value(key)).map(([key]) => key).filter((key) => key !== "actions");

    const jobs = list(value("jobs"), "jobs").map((job) => ({
      raw: job,
      id: idOf(job),
      title: title(job, "Untitled job"),
      client: client(job),
      worker: pick(job.assigned_worker_name, job.worker_name, job.assigned_to_name, job.worker?.name, "Unassigned"),
      status: status(job, "Intake"),
      recurring: job.is_recurring || job.recurring_frequency || job.recurrence_pattern ? pick(job.recurring_frequency, job.recurrence_pattern, "Recurring") : "One-off",
      proof: proof(job),
      time: seconds(job.total_time_seconds || job.timer_total_seconds || job.shift_seconds),
      adminReady: Boolean(job.invoice_ready || job.owner_approval_required || job.message_ready),
      address: pick(job.address, job.site_address, job.location, "To confirm"),
      note: pick(job.notes, job.description, "No job note saved."),
    }));

    const clients = list(value("clients"), "clients").map((row) => ({
      raw: row,
      id: idOf(row),
      name: client(row),
      email: pick(row.email),
      phone: pick(row.phone, row.mobile),
      address: pick(row.address),
      note: pick(row.notes, row.note, "No client notes yet."),
    }));

    const quotes = list(value("quotes"), "quotes").map((row) => ({
      raw: row,
      id: idOf(row),
      title: title(row, `Quote - ${client(row)}`),
      client: client(row),
      status: status(row, "Draft"),
      amount: Number(row.amount || row.total || row.price || row.subtotal || 0),
      note: pick(row.notes, row.detail, row.description, "Quote is prepared for review."),
    }));

    const invoices = list(value("invoices"), "invoices").map((row) => ({
      raw: row,
      id: idOf(row),
      title: title(row, pick(row.invoice_number, `Invoice - ${client(row)}`)),
      client: client(row),
      status: status(row, "Draft"),
      amount: Number(row.amount || row.total || row.subtotal || 0),
      note: pick(row.notes, row.xero_sync_status, row.myob_sync_status, "Invoice is prepared for review."),
    }));

    const teamRows = list(value("team"), "workers");
    const liveRows = list(value("live"), "workers");
    const workers = (liveRows.length ? liveRows : teamRows).map((row, index) => {
      const name = pick(row.name, row.full_name, row.worker_name, row.email, `Worker ${index + 1}`);
      const lat = Number(row.last_lat || row.gps_lat || row.latitude || 0);
      const lng = Number(row.last_lng || row.gps_lng || row.longitude || 0);
      return {
        raw: row,
        id: idOf(row, `worker-${index}`),
        name,
        initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        status: pick(row.live_status, row.clock_status, row.status, "Waiting"),
        job: pick(row.current_job_title, row.current_job, "No active job"),
        proof: pick(row.proof_status, row.proof, "Proof waiting"),
        time: seconds(row.shift_seconds || row.total_shift_seconds || row.payroll_seconds),
        lat,
        lng,
        hasGps: Boolean(lat && lng),
        gpsLabel: lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "GPS waiting",
      };
    });

    const messages = list(value("messages"), "notifications").map((row) => ({
      raw: row,
      id: idOf(row),
      title: title(row, "Message"),
      audience: pick(row.audience, row.source, row.type, "Client"),
      detail: pick(row.message, row.body, row.summary, "Message draft ready for review."),
      status: row.read || row.is_read ? "Read" : "Prepared",
    }));

    const team = teamRows.map((row, index) => ({
      raw: row,
      id: idOf(row, `team-${index}`),
      person: pick(row.name, row.full_name, row.email, `Team ${index + 1}`),
      role: pick(row.role, "Worker"),
      workerApp: pick(row.worker_app_status, row.status, row.active ? "Ready" : "Invite pending"),
      payroll: pick(row.payroll_status, row.payroll_hours ? "Review" : "-"),
    }));

    setData({ jobs, clients, quotes, invoices, workers, team, messages, actions: list(value("actions"), "actions"), requests: list(value("requests"), "requests"), xero: payload(value("xero")) || {} });
    if (failed.length) setError(`Some live modules did not load: ${failed.join(", ")}.`);
    setLoading(false);
  }, [api]);

  React.useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

function field(key, label, value, type = "text") {
  return { key, label, value: pick(value), type };
}

function inferActionType(action) {
  const text = readableText(action, 20).toLowerCase();
  if (text.includes("quote") || text.includes("estimate")) return "quote";
  if (text.includes("invoice")) return "invoice";
  if (text.includes("message") || text.includes("reply") || text.includes("sms") || text.includes("email")) return "message";
  if (text.includes("client") || text.includes("customer")) return "client";
  if (text.includes("worker") || text.includes("team") || text.includes("payroll")) return "worker";
  return "job";
}

function actionForm(action, index) {
  const kind = inferActionType(action);
  const baseId = idOf(action, `action-${index}`);
  const text = readableText(action, 10) || "Saved admin item waiting for owner check.";
  const nameValue = pick(findDeep(action, ["client_name", "customer_name", "name", "client", "customer"]), "To confirm");
  const phoneValue = findDeep(action, ["phone", "mobile", "contact_phone"]);
  const emailValue = findDeep(action, ["email", "contact_email"]);
  const addressValue = pick(findDeep(action, ["address", "site_address", "location"]), "To confirm");
  const workValue = pick(findDeep(action, ["work", "service_needed", "job_title", "title", "description", "message", "summary", "detail"]), text);
  const amountValue = pick(findDeep(action, ["amount", "total", "price", "subtotal"]), "Check amount");
  const titleValue = title(action, kind === "client" ? "New client form ready" : "Admin form ready");

  if (kind === "client") {
    return {
      id: `action:${baseId}`,
      actionId: idOf(action),
      kind: "client",
      title: "Client form ready",
      subtitle: "Client details are filled from the work that came in. Check, edit, then create it.",
      actionLabel: "Create client",
      sourceType: "action",
      status: "Ready",
      fields: [
        field("name", "Client name", nameValue),
        field("phone", "Phone", phoneValue || "Add if missing"),
        field("email", "Email", emailValue || "Add if missing"),
        field("address", "Site address", addressValue),
        field("work", "Work requested", workValue, "textarea"),
        field("notes", "Owner note", "Looks right. Update anything missing, then approve.", "textarea"),
      ],
    };
  }
  if (kind === "quote") {
    return {
      id: `action:${baseId}`,
      actionId: idOf(action),
      kind: "quote",
      title: "Quote form ready",
      subtitle: "The quote is prepared. Check price, line items and message before sending.",
      actionLabel: "Approve quote",
      sourceType: "action",
      status: "Ready",
      fields: [
        field("client", "Client", nameValue),
        field("job", "Job / work", workValue),
        field("line_items", "Line items", pick(findDeep(action, ["line_items", "items"]), workValue), "textarea"),
        field("total", "Total", amountValue),
        field("terms", "Terms", "Quote valid for 14 days unless stated otherwise.", "textarea"),
        field("message", "Customer message", pick(findDeep(action, ["message", "body"]), "Here is the quote for your review."), "textarea"),
      ],
    };
  }
  if (kind === "invoice") {
    return {
      id: `action:${baseId}`,
      actionId: idOf(action),
      kind: "invoice",
      title: "Invoice form ready",
      subtitle: "The invoice is prepared. Check amount, proof and sync rule before approving.",
      actionLabel: "Approve invoice",
      sourceType: "action",
      status: "Ready",
      fields: [
        field("client", "Client", nameValue),
        field("job", "Job", workValue),
        field("amount", "Amount", amountValue),
        field("proof", "Proof", pick(findDeep(action, ["proof", "photos", "attachment"]), "Check worker proof before sending")),
        field("invoice_note", "Invoice note", pick(findDeep(action, ["note", "notes", "summary"]), text), "textarea"),
        field("sync", "Accounting sync", "Draft sync only after owner approval"),
      ],
    };
  }
  if (kind === "message") {
    return {
      id: `action:${baseId}`,
      actionId: idOf(action),
      kind: "reply",
      title: "Reply ready",
      subtitle: "The reply is drafted. Check wording before anything sends.",
      actionLabel: "Approve reply",
      sourceType: "action",
      status: "Ready",
      fields: [
        field("to", "To", nameValue),
        field("subject", "Subject", pick(findDeep(action, ["subject", "title"]), "Job update")),
        field("message", "Message", pick(findDeep(action, ["message", "body", "reply", "detail", "summary"]), text), "textarea"),
        field("send_rule", "Send rule", "Send only after owner approval"),
      ],
    };
  }
  return {
    id: `action:${baseId}`,
    actionId: idOf(action),
    kind: "job",
    title: titleValue,
    subtitle: "The admin is prepared. Check the fields, edit if needed, then approve.",
    actionLabel: "Approve admin",
    sourceType: "action",
    status: "Ready",
    fields: [
      field("client", "Client", nameValue),
      field("work", "Work", workValue, "textarea"),
      field("address", "Site address", addressValue),
      field("next_step", "Next step", pick(findDeep(action, ["next_step", "action", "recommendation"]), "Approve this prepared admin or save an edit."), "textarea"),
    ],
  };
}

function quoteForm(quote) {
  return { id: `quote:${quote.id}`, sourceType: "quote", sourceId: quote.id, kind: "quote", title: "Quote form ready", subtitle: "Review price and wording before sending.", actionLabel: "Send quote", status: quote.status, fields: [field("client", "Client", quote.client), field("job", "Job", quote.title), field("amount", "Amount", money(quote.amount)), field("terms", "Terms", "Quote valid for 14 days unless stated otherwise.", "textarea"), field("message", "Customer message", quote.note, "textarea")] };
}

function invoiceForm(invoice) {
  return { id: `invoice:${invoice.id}`, sourceType: "invoice", sourceId: invoice.id, kind: "invoice", title: "Invoice form ready", subtitle: "Check amount, proof and sync rule before clearing.", actionLabel: "Approve invoice", status: invoice.status, fields: [field("client", "Client", invoice.client), field("invoice", "Invoice", invoice.title), field("amount", "Amount", money(invoice.amount)), field("status", "Status", invoice.status), field("notes", "Invoice note", invoice.note, "textarea"), field("sync", "Accounting sync", "Draft sync only after owner approval")] };
}

function messageForm(message) {
  return { id: `message:${message.id}`, sourceType: "message", sourceId: message.id, kind: "reply", title: "Reply ready", subtitle: "Check wording before it goes out.", actionLabel: "Approve reply", status: message.status, fields: [field("to", "To", message.audience), field("subject", "Subject", message.title), field("body", "Message", message.detail, "textarea"), field("rule", "Send rule", "Owner approval required")] };
}

function requestForm(request, index) {
  return { id: `request:${idOf(request, `request-${index}`)}`, sourceType: "request", sourceId: idOf(request), kind: "request", title: "New work request ready", subtitle: "Turn the request into real work after checking the details.", actionLabel: "Create job", status: pick(request.status, "New"), fields: [field("client", "Client", pick(request.customer_name, request.name, "To confirm")), field("phone", "Phone", pick(request.phone, request.mobile, "Add if missing")), field("email", "Email", pick(request.email, "Add if missing")), field("work", "Work requested", pick(request.service_needed, request.title, request.message, readableText(request, 6)), "textarea"), field("address", "Address", pick(request.address, request.site_address, "To confirm"))] };
}

function needsOwner(statusText) {
  return /draft|ready|prepared|pending|review|overdue|sync|unread|open|new/i.test(statusText || "");
}

function buildForms(data, adminState) {
  const forms = [];
  data.actions.filter((action) => !/approved|declined|done/i.test(action.status || "")).forEach((action, index) => forms.push(actionForm(action, index)));
  data.quotes.filter((quote) => needsOwner(quote.status)).forEach((quote) => forms.push(quoteForm(quote)));
  data.invoices.filter((invoice) => needsOwner(invoice.status)).forEach((invoice) => forms.push(invoiceForm(invoice)));
  data.messages.filter((message) => needsOwner(message.status)).forEach((message) => forms.push(messageForm(message)));
  data.requests.forEach((request, index) => forms.push(requestForm(request, index)));
  return forms.map((form) => ({ ...form, ...(adminState[form.id] || {}) })).filter((form) => form.state !== "approved");
}

function Sidebar({ page, go, count, data, loading, error }) {
  const groups = NAV.reduce((acc, item) => { acc[item.group] = acc[item.group] || []; acc[item.group].push(item); return acc; }, {});
  return <aside className="adminSidebar"><div className="brand"><b>C</b><span><strong>churvox</strong><em>Owner admin OS</em></span></div>{Object.entries(groups).map(([group, items]) => <nav key={group}><p>{group}</p>{items.map((item) => <button className={page === item.key ? "active" : ""} key={item.key} onClick={() => go(item.key)} type="button"><span>{item.code}</span><b>{item.label}</b>{item.key === "command" && count ? <em>{count}</em> : item.key === "messages" && data.messages.length ? <em>{data.messages.length}</em> : null}</button>)}</nav>)}<footer><b>{loading ? "Loading live records" : "Live records loaded"}</b><span>{data.jobs.length} jobs / {data.clients.length} clients / {data.workers.filter((w) => w.hasGps).length} GPS pings</span>{error ? <span>{error}</span> : null}</footer></aside>;
}

function Topbar({ page, go, addWork, busy }) {
  const [text, setText] = React.useState("");
  const label = NAV.find((item) => item.key === page)?.label || "Smart Hub";
  return <header className="adminTopbar"><div><span>Churvox OS</span><strong>{label}</strong></div><form onSubmit={(event) => { event.preventDefault(); if (text.trim()) { addWork(text.trim()); setText(""); } }}><label>Add real work</label><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Leaking tap for Watson, invoice proof, quote follow-up..." /><button disabled={busy} type="submit">Add work</button></form><button onClick={() => go("command")} type="button"><span>G'day</span><b>Owner</b></button></header>;
}

function Empty({ title, text }) {
  return <div className="emptyBox"><b>{title}</b><span>{text}</span></div>;
}

function Command({ forms, adminState, setAdminState, approve, busy }) {
  const [selectedId, setSelectedId] = React.useState("");
  React.useEffect(() => { if ((!selectedId || !forms.some((form) => form.id === selectedId)) && forms[0]) setSelectedId(forms[0].id); }, [forms, selectedId]);
  const selected = forms.find((form) => form.id === selectedId) || forms[0];
  const savedDraft = selected ? adminState[selected.id]?.draft : null;
  const [draft, setDraft] = React.useState({});

  React.useEffect(() => {
    if (!selected) return;
    setDraft(savedDraft || Object.fromEntries(selected.fields.map((item) => [item.key, item.value])));
  }, [selected?.id, savedDraft]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  if (!selected) return <section className="commandDesk"><aside className="formQueue"><h1>Admin forms ready for owner check.</h1><Empty title="Nothing waiting" text="When Churvox prepares a client, quote, invoice, reply or job form it appears here as a real editable form." /></aside></section>;

  return <section className="commandDesk"><aside className="formQueue"><h1>Admin forms ready for owner check.</h1><div className="queueStats"><b>{forms.filter((form) => form.state !== "parked").length} open</b><span>{forms.filter((form) => form.edited).length} edited</span><span>{forms.filter((form) => form.state === "parked").length} parked</span></div>{forms.map((form) => <button className={form.id === selected.id ? "active" : ""} key={form.id} onClick={() => setSelectedId(form.id)} type="button"><small>{form.kind}</small><b>{form.title}</b><span>{form.subtitle}</span><em>{form.edited ? "edited" : form.state || "open"}</em></button>)}</aside><article className="adminFormSlip"><header><span>{selected.kind} form</span><h2>{selected.title}</h2><p>{selected.subtitle}</p></header><div className="actualForm">{selected.fields.map((item) => <label className={item.type === "textarea" ? "wide" : ""} key={item.key}><span>{item.label}</span>{item.type === "textarea" ? <textarea value={draft[item.key] || ""} onChange={(event) => update(item.key, event.target.value)} /> : <input value={draft[item.key] || ""} onChange={(event) => update(item.key, event.target.value)} />}</label>)}</div><footer><button disabled={busy} onClick={() => approve(selected, "approved", draft)} type="button">{selected.actionLabel}</button><button disabled={busy} onClick={() => { setAdminState((current) => ({ ...current, [selected.id]: { ...(current[selected.id] || {}), state: "open", edited: true, draft } })); }} type="button">Save edit</button><button disabled={busy} onClick={() => approve(selected, "parked", draft)} type="button">Park</button></footer></article></section>;
}

function MapBox({ workers }) {
  const live = workers.filter((worker) => worker.hasGps);
  const base = live[0] || { lat: -41.2128, lng: 174.9083 };
  const lat = Number(base.lat || -41.2128);
  const lng = Number(base.lng || 174.9083);
  const bbox = `${lng - 0.05}%2C${lat - 0.035}%2C${lng + 0.05}%2C${lat + 0.035}`;
  return <div className="adminMap"><iframe title="Worker GPS map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`} loading="lazy" />{live.map((worker, index) => <button style={{ left: `${16 + (index % 4) * 20}%`, top: `${18 + (index % 3) * 24}%` }} key={worker.id} type="button"><b>{worker.initials}</b><span>{worker.name}</span><small>{worker.gpsLabel}</small></button>)}{!live.length ? <div><b>Map ready</b><span>Worker pins appear when real GPS is sent from the worker app.</span></div> : null}</div>;
}

function Hub({ data, forms, go, loading, error }) {
  return <section className="hubGrid"><article className="ownerBoard"><header><span>Smart Hub</span><h1>Owner attention today.</h1></header>{loading ? <Empty title="Loading live admin" text="Pulling jobs, clients, invoices, quotes and worker proof." /> : null}{error ? <Empty title="Some live modules need checking" text={error} /> : null}<div className="threeCols"><section><h3>Real work added <b>{data.jobs.length}</b></h3>{data.jobs.slice(0, 5).map((job) => <p key={job.id}><strong>{job.title}</strong><span>{job.client} / {job.status}</span></p>)}</section><section><h3>Admin prepared <b>{forms.length}</b></h3>{forms.slice(0, 5).map((form) => <p key={form.id}><strong>{form.title}</strong><span>{form.actionLabel}</span></p>)}</section><section><h3>Owner action <b>{forms.length}</b></h3><p><strong>Check the filled form</strong><span>Approve or save an edit in Command</span></p><button onClick={() => go("command")} type="button">Open Command</button></section></div></article><article className="mapPanelAdmin"><h3>Workers and proof</h3><MapBox workers={data.workers} /></article><article className="workTable"><header><h2>Field work Churvox is watching.</h2><button onClick={() => go("jobs")} type="button">Open Jobs</button></header><table><thead><tr><th>Job</th><th>Client</th><th>Worker</th><th>Status</th><th>Proof</th><th>Time</th></tr></thead><tbody>{data.jobs.slice(0, 8).map((job) => <tr key={job.id}><td>{job.title}</td><td>{job.client}</td><td>{job.worker}</td><td>{job.status}</td><td>{job.proof}</td><td>{job.time}</td></tr>)}</tbody></table>{!data.jobs.length ? <Empty title="No jobs yet" text="Add real work to start the admin engine." /> : null}</article></section>;
}

function Jobs({ data, go }) {
  const lanes = ["Intake", "Dispatch", "Recurring", "Proof", "Admin ready"];
  const belongs = (job, lane) => lane === "Recurring" ? job.recurring !== "One-off" : lane === "Proof" ? !/waiting/i.test(job.proof) : lane === "Admin ready" ? job.adminReady : lane === "Dispatch" ? /assigned|progress|site|scheduled|job/i.test(job.status) : !job.adminReady;
  return <section className="jobsAdmin"><header><span>Jobs</span><h1>Dispatch, recurring and proof trail.</h1><p>Work lives here. Approval still happens in Command.</p></header><div>{lanes.map((lane) => <article key={lane}><h3>{lane}</h3>{data.jobs.filter((job) => belongs(job, lane)).slice(0, 6).map((job) => <p key={`${lane}-${job.id}`}><strong>{job.title}</strong><span>{job.client} / {job.status}</span></p>)}{!data.jobs.filter((job) => belongs(job, lane)).length ? <Empty title="Empty" text="No real work here yet." /> : null}</article>)}</div><footer><b>Admin from jobs goes to Command.</b><button onClick={() => go("command")} type="button">Open Command</button></footer></section>;
}

function Workers({ data }) {
  return <section className="workersAdmin"><article><header><span>Workers</span><h1>Live GPS, proof and time.</h1></header><MapBox workers={data.workers} /></article><aside><h2>Proof pack</h2>{data.workers.map((worker) => <p key={worker.id}><b>{worker.initials} {worker.name}</b><span>{worker.job}</span><small>{worker.status} / {worker.time} / {worker.hasGps ? worker.gpsLabel : "GPS waiting"}</small></p>)}{!data.workers.length ? <Empty title="No workers" text="Add workers so GPS, proof and time can appear." /> : null}</aside></section>;
}

function Clients({ data }) {
  const [selectedId, setSelectedId] = React.useState("");
  React.useEffect(() => { if (!selectedId && data.clients[0]) setSelectedId(data.clients[0].id); }, [data.clients, selectedId]);
  const selected = data.clients.find((item) => item.id === selectedId) || data.clients[0];
  return <section className="clientsAdmin"><aside><h1>Client dossier.</h1>{data.clients.map((item) => <button className={item.id === selected?.id ? "active" : ""} key={item.id} onClick={() => setSelectedId(item.id)} type="button"><b>{item.name}</b><span>{item.phone || item.email || "No contact saved"}</span></button>)}{!data.clients.length ? <Empty title="No clients" text="Add or import clients." /> : null}</aside><article>{selected ? <><span>Selected client</span><h2>{selected.name}</h2><div><p><b>Phone</b>{selected.phone || "No phone"}</p><p><b>Email</b>{selected.email || "No email"}</p><p><b>Address</b>{selected.address || "No address"}</p><p><b>Notes</b>{selected.note}</p></div></> : <Empty title="No selected client" text="No client record yet." />}</article></section>;
}

function Board({ kicker, titleText, subtitle, items, render, go }) {
  return <section className="simpleAdmin"><header><span>{kicker}</span><h1>{titleText}</h1><p>{subtitle}</p></header><div>{items.map(render)}{!items.length ? <Empty title="Nothing here yet" text="Real records show here when they exist." /> : null}</div><aside><h2>Needs owner action?</h2><p>Churvox prepares the form. Command is where it gets approved or edited.</p><button onClick={() => go("command")} type="button">Open Command</button></aside></section>;
}

function Control({ titleText, subtitle, items }) {
  return <section className="controlAdmin"><header><span>Control</span><h1>{titleText}</h1><p>{subtitle}</p></header><div>{items.map(([name, text]) => <article key={name}><h3>{name}</h3><p>{text}</p></article>)}</div></section>;
}

function Plans() {
  const plans = [["Start", "$39/month + GST", "Records"], ["Crew", "$89/month + GST", "Field"], ["Operator", "$149/month + GST", "Most Popular"], ["Command", "$299/month + GST", "Approval OS"]];
  return <section className="plansAdmin"><header><span>Plans</span><h1>Simple tiers. Clear admin power.</h1><p>Pricing stays fixed and aligned with Stripe.</p></header><div>{plans.map(([name, price, tag]) => <article className={name === "Operator" ? "popular" : ""} key={name}><span>{tag}</span><h2>{name}</h2><b>{price}</b></article>)}</div></section>;
}

export default function ChurvoxOSAdmin() {
  const api = useApi();
  const { user } = useAuth();
  const [page, go] = useRoute();
  const [adminState, setAdminState] = useAdminState();
  const { data, loading, error, reload } = useLiveData(api);
  const forms = React.useMemo(() => buildForms(data, adminState), [data, adminState]);
  const [busy, setBusy] = React.useState(false);
  const [addBusy, setAddBusy] = React.useState(false);

  const addWork = React.useCallback(async (newTitle) => {
    setAddBusy(true);
    try {
      await api.post("/jobs", { title: newTitle, job_type: "other", customer_name: "To confirm", address: "To confirm", scheduled_date: new Date().toISOString(), notes: "Added from Churvox OS. Confirm client, address, worker and price before sending anything." });
      await reload();
      go("jobs");
    } finally {
      setAddBusy(false);
    }
  }, [api, reload, go]);

  const approve = React.useCallback(async (form, state, draft) => {
    setBusy(true);
    try {
      if (state === "approved") {
        if (form.actionId) await api.post(`/ai/actions/${form.actionId}/approve`, { draft });
        else if (form.sourceType === "quote") await api.post(`/quotes/${form.sourceId}/send`, { draft });
        else if (form.sourceType === "invoice") await api.patch(`/invoices/${form.sourceId}`, { status: "sent", notes: Object.values(draft || {}).join("\n") });
        else if (form.sourceType === "request") await api.patch(`/customer-requests/${form.sourceId}`, { status: "Owner approved", owner_note: Object.values(draft || {}).join("\n") });
      }
      if (state === "parked" && form.actionId) await api.post(`/ai/actions/${form.actionId}/decline`, { note: "Parked by owner" });
      setAdminState((current) => ({ ...current, [form.id]: { ...(current[form.id] || {}), state, edited: current[form.id]?.edited || false, draft, updated_at: new Date().toISOString() } }));
      await reload();
    } catch (err) {
      setAdminState((current) => ({ ...current, [form.id]: { ...(current[form.id] || {}), state: "open", edited: true, draft, error: err?.message || "Backend action failed." } }));
    } finally {
      setBusy(false);
    }
  }, [api, reload, setAdminState]);

  let content;
  if (page === "command") content = <Command forms={forms} adminState={adminState} setAdminState={setAdminState} approve={approve} busy={busy} />;
  else if (page === "jobs") content = <Jobs data={data} go={go} />;
  else if (page === "workers") content = <Workers data={data} />;
  else if (page === "clients") content = <Clients data={data} />;
  else if (page === "quotes") content = <Board kicker="Quotes" titleText="Offer pipeline without approval clutter." subtitle="Prepared quote forms go to Command." items={data.quotes} go={go} render={(quote) => <article key={quote.id}><span>{quote.status}</span><h3>{quote.title}</h3><p>{quote.client}</p><b>{money(quote.amount)}</b></article>} />;
  else if (page === "invoices") content = <Board kicker="Invoices" titleText="Money desk." subtitle="Prepared invoice forms go to Command." items={data.invoices} go={go} render={(invoice) => <article key={invoice.id}><span>{invoice.status}</span><h3>{invoice.title}</h3><p>{invoice.client}</p><b>{money(invoice.amount)}</b></article>} />;
  else if (page === "messages") content = <Board kicker="Messages" titleText="Prepared replies, not another inbox." subtitle="Replies are checked and approved in Command." items={data.messages} go={go} render={(message) => <article key={message.id}><span>{message.audience}</span><h3>{message.title}</h3><p>{message.detail}</p></article>} />;
  else if (page === "team") content = <Control titleText="Access, payroll review and worker app readiness." subtitle="Team is loaded from worker records." items={data.team.length ? data.team.map((row) => [row.person, `${row.role} / worker app ${row.workerApp} / payroll ${row.payroll}`]) : [["No team rows", "Add workers so access and payroll can be checked."]]} />;
  else if (page === "xero") content = <Control titleText="Draft sync guardrails." subtitle="Accounting sync is draft-only and owner-approved." items={[["Connection", data.xero.connected || data.xero.tenant_name ? "Connected" : "Not connected"], ["Draft invoices only", "No automatic invoice sending."], ["No tax filing", "Churvox does not submit to government."], ["No payout files", "No bank payout files are created."]]} />;
  else if (page === "settings") content = <Control titleText="Settings" subtitle="Business controls grouped around real setup." items={[["Business identity", user?.business_name || user?.email || "Current account loaded."], ["Invoice defaults", "GST, due dates, numbering and wording."], ["Approval rules", "Command is where the owner approves prepared admin."], ["Imports", "Clients, jobs, invoices and team CSVs should create real records."]]} />;
  else if (page === "plans") content = <Plans />;
  else if (page === "help") content = <Control titleText="Help" subtitle="Fast setup and launch checks." items={[["Setup check", "Create one client, one job, one worker and one invoice."], ["Worker guide", "Workers record time, GPS and proof."], ["Accounting guide", "Draft sync only, no tax filing or payout files."], ["Support", "hello@churvox.com"]]} />;
  else content = <Hub data={data} forms={forms} go={go} loading={loading} error={error} />;

  return <main className="adminOS"><Sidebar page={page} go={go} count={forms.filter((form) => form.state !== "parked").length} data={data} loading={loading} error={error} /><section className="adminWorkspace"><Topbar page={page} go={go} addWork={addWork} busy={addBusy} />{content}</section><aside className="ownerDock"><span>Command approval desk</span><strong>{forms.filter((form) => form.state !== "parked").length}</strong><p>forms waiting</p><button onClick={() => go("command")} type="button">Open Command</button><small>Check the form, edit if needed, approve.</small></aside></main>;
}
