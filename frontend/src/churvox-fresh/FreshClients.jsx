import React from "react";
import { useApi } from "../hooks/useApi";
import { readFreshFocus } from "./freshFocus";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshJobsPolish.css";

const filters = ["All", "Active", "Needs setup", "Paused"];
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const emptyClient = { name: "", email: "", phone: "", address: "", notes: "" };
const TIMELINE_ENDPOINTS = { jobs: "/jobs", quotes: "/quotes", invoices: "/invoices" };

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || value.client_id || value.customer_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function unpackList(payload, key = "") {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of ["clients", "customers", "jobs", "quotes", "invoices", "items", "records", "results", "data"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function cleanStatus(value, client) {
  const text = String(value || client?.client_status || client?.customer_status || "").trim();
  if (!text) return client?.email ? "Active" : "Needs setup";
  if (/paused|inactive|archived/i.test(text)) return "Paused";
  if (/setup|missing|draft|incomplete/i.test(text)) return "Needs setup";
  return "Active";
}

function timeValue(record) {
  const raw = record?.created_at || record?.createdAt || record?.updated_at || record?.updatedAt || record?.scheduled_date || record?.date || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function moneyNumber(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeClient(client, index) {
  const id = normalizeId(client?.id || client?._id || client?.client_id || client?.customer_id) || `client-${index}`;
  const name = client?.name || client?.client_name || client?.customer_name || client?.contact_name || client?.business_name || "Unnamed client";
  const email = client?.email || client?.client_email || client?.customer_email || client?.billing_email || "";
  const phone = client?.phone || client?.mobile || client?.client_phone || client?.customer_phone || "";
  const address = client?.address || client?.site_address || client?.service_address || client?.customer_address || "";
  const notes = client?.notes || client?.internal_notes || client?.client_notes || "";
  const type = client?.type || client?.client_type || client?.customer_type || "Client";
  const status = cleanStatus(client?.status, { ...client, email });
  return { ...client, id, name, type, status, email, phone, address, notes, risk: email ? "Clean setup" : "Contact detail missing", value: client?.value || client?.lifetime_value || client?.amount_due || "Real client", sortTime: timeValue(client) };
}

function recordClientName(record) {
  return lower(pick(record, "client_name", "customer_name", "client", "customer", "name", "business_name"));
}

function recordClientId(record) {
  return normalizeId(record?.client_id || record?.customer_id || record?.clientId || record?.customerId || "");
}

function recordAmount(record) {
  return moneyNumber(record?.total ?? record?.amount ?? record?.price ?? record?.subtotal ?? record?.balance_due ?? 0);
}

function recordTitle(record, fallback) {
  return pick(record, "title", "job_name", "job_description", "description", "quote_number", "invoice_number", "number") || fallback;
}

function recordStatus(record) {
  return pick(record, "status", "payment_status", "job_status") || "open";
}

function belongsToClient(record, client) {
  if (!record || !client) return false;
  const cid = recordClientId(record);
  if (cid && cid === client.id) return true;
  const name = lower(client.name);
  const email = lower(client.email);
  const address = lower(client.address);
  const haystack = lower(`${recordClientName(record)} ${pick(record, "email", "customer_email", "client_email", "address", "site_address", "service_address", "notes", "description")}`);
  return Boolean(name && haystack.includes(name)) || Boolean(email && haystack.includes(email)) || Boolean(address && haystack.includes(address));
}

function timelineRows(data, client) {
  const jobs = data.jobs.filter((item) => belongsToClient(item, client)).map((item) => ({ type: "Job", title: recordTitle(item, "Job"), status: recordStatus(item), amount: recordAmount(item), time: timeValue(item), note: pick(item, "address", "site_address", "notes", "description") || "Job record" }));
  const quotes = data.quotes.filter((item) => belongsToClient(item, client)).map((item) => ({ type: "Quote", title: recordTitle(item, "Quote"), status: recordStatus(item), amount: recordAmount(item), time: timeValue(item), note: pick(item, "notes", "description", "job_description") || "Quote record" }));
  const invoices = data.invoices.filter((item) => belongsToClient(item, client)).map((item) => ({ type: "Invoice", title: recordTitle(item, "Invoice"), status: recordStatus(item), amount: recordAmount(item), time: timeValue(item), note: pick(item, "notes", "description", "due_date") || "Invoice record" }));
  return [...jobs, ...quotes, ...invoices].sort((a, b) => b.time - a.time);
}

function timelineDecision(client, rows) {
  if (!client) return "Select a client.";
  if (!client.email) return "Billing/contact email missing. Pause customer-facing automation.";
  const overdue = rows.find((row) => row.type === "Invoice" && /overdue/i.test(row.status));
  if (overdue) return "Overdue invoice needs owner-approved follow-up.";
  const sentQuote = rows.find((row) => row.type === "Quote" && /sent/i.test(row.status));
  if (sentQuote) return "Sent quote may need follow-up.";
  const completedNoInvoice = rows.find((row) => row.type === "Job" && /complete|done|finished/i.test(row.status)) && !rows.some((row) => row.type === "Invoice");
  if (completedNoInvoice) return "Completed job may need draft invoice.";
  return "Client setup looks clean. Keep watching jobs, quotes and invoices.";
}

function commandText(client, rows) {
  return `Prepare owner review for client ${client.name}. Email ${client.email || "missing"}. Phone ${client.phone || "missing"}. Address ${client.address || "missing"}. Timeline has ${rows.length} linked records. Next decision: ${timelineDecision(client, rows)} Owner approval required before messages, invoice sends, accounting sync, or paid status changes.`;
}

const selectedFilterButtonStyle = { background: "#111827", backgroundColor: "#111827", borderColor: "#111827", color: "#ffffff", WebkitTextFillColor: "#ffffff" };
const selectedFilterTextStyle = { color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1 };
const selectedFilterCountStyle = { background: "#f97316", backgroundColor: "#f97316", color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, borderRadius: "999px" };

export default function FreshClients({ onNavigate }) {
  const { get, post, patch, del } = useApi();
  const [clients, setClients] = React.useState([]);
  const [timelineData, setTimelineData] = React.useState({ jobs: [], quotes: [], invoices: [] });
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("clients", ""));
  const [filter, setFilter] = React.useState("All");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [timelineLoading, setTimelineLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState("");
  const [savedAt, setSavedAt] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteName, setDeleteName] = React.useState("");
  const [newClient, setNewClient] = React.useState(emptyClient);
  const [addError, setAddError] = React.useState("");

  const selected = clients.find((client) => client.id === selectedId) || clients[0];
  const rows = React.useMemo(() => timelineRows(timelineData, selected), [timelineData, selected]);
  const nextDecision = React.useMemo(() => timelineDecision(selected, rows), [selected, rows]);
  const query = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) => {
    const matchesFilter = filter === "All" || client.status === filter;
    const haystack = `${client.name} ${client.email} ${client.phone} ${client.address} ${client.notes}`.toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
  const needsSetup = clients.filter((client) => client.status === "Needs setup").length;
  const timelineValue = rows.reduce((sum, row) => sum + row.amount, 0);

  const loadClients = React.useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    const res = await get("/clients");
    if (!res.success) {
      setClients([]); setSelectedId(""); setError(res.error || "Could not load real clients"); setLoading(false); return [];
    }
    const nextClients = hideDemoRecords(unpackList(res.data, "clients")).map(normalizeClient).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setClients(nextClients);
    setSelectedId((current) => nextClients.some((client) => client.id === current) ? current : nextClients[0]?.id || "");
    setLoading(false);
    return nextClients;
  }, [get]);

  const loadTimeline = React.useCallback(async () => {
    setTimelineLoading(true);
    const next = { jobs: [], quotes: [], invoices: [] };
    await Promise.all(Object.entries(TIMELINE_ENDPOINTS).map(async ([key, endpoint]) => {
      try {
        const res = await get(endpoint, { timeout: 25000 });
        if (res?.success) next[key] = hideDemoRecords(unpackList(res.data, key));
      } catch {}
    }));
    setTimelineData(next);
    setTimelineLoading(false);
  }, [get]);

  React.useEffect(() => { loadClients(); loadTimeline(); }, [loadClients, loadTimeline]);
  React.useEffect(() => {
    const onFreshDataUpdated = (event) => { if (event?.detail?.type !== "client-created") loadClients({ quiet: true }); loadTimeline(); };
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadClients, loadTimeline]);
  React.useEffect(() => {
    function openPopup() { setAddOpen(true); setAddError(""); try { window.localStorage.removeItem(OPEN_CLIENT_MODAL_KEY); } catch {} }
    window.addEventListener("churvox:open-client-popup", openPopup);
    try { if (window.localStorage.getItem(OPEN_CLIENT_MODAL_KEY) === "true") window.setTimeout(openPopup, 50); } catch {}
    return () => window.removeEventListener("churvox:open-client-popup", openPopup);
  }, []);
  React.useEffect(() => { if (visibleClients.length && (!selectedId || !visibleClients.some((client) => client.id === selectedId))) setSelectedId(visibleClients[0].id); }, [visibleClients, selectedId]);

  function updateSelectedClient(patchData) { if (!selected) return; setClients((current) => current.map((client) => client.id === selected.id ? { ...client, ...patchData } : client)); setSavedAt("Unsaved changes"); }
  async function saveSelectedClient() {
    if (!selected?.id) return;
    setSaving(true); setError("");
    const payload = { name: selected.name, email: selected.email, phone: selected.phone, address: selected.address, notes: selected.notes };
    const res = await patch(`/clients/${encodeURIComponent(selected.id)}`, payload);
    setSaving(false);
    if (!res.success) { setError(res.error || "Could not update client"); setSavedAt("Save failed"); return; }
    setSavedAt(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    await loadClients({ quiet: true });
  }

  async function deleteSelectedClient() {
    if (!selected?.id) return;
    const typed = deleteName.trim();
    if (typed !== selected.name) { setError("Type the client name exactly before deleting."); return; }
    setSaving(true); setError("");
    const res = await del(`/clients/${encodeURIComponent(selected.id)}`, { timeout: 25000 });
    setSaving(false);
    if (!res.success) { setError(res.error || "Could not delete client. If this client has jobs/invoices, archive support may be needed instead."); return; }
    setSavedAt(`Deleted ${selected.name}`); setDeleteOpen(false); setDeleteName("");
    setClients((current) => current.filter((client) => client.id !== selected.id));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "client-deleted", id: selected.id } }));
    await loadClients({ quiet: true });
  }

  function openJobPopup(clientId = "") {
    const search = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
    try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, search || "true"); } catch {}
    window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search } }));
  }

  async function saveNewClient() {
    const name = newClient.name.trim();
    if (!name) { setAddError("Client name is required."); return; }
    setSaving(true); setAddError("");
    const payload = { name, email: newClient.email.trim() || null, phone: newClient.phone.trim() || null, address: newClient.address.trim() || null, notes: newClient.notes.trim() || null };
    const res = await post("/clients", payload);
    setSaving(false);
    if (!res.success) { setAddError(res.error || "Could not add client"); return; }
    setNewClient(emptyClient); setAddOpen(false);
    const refreshed = await loadClients({ quiet: true });
    const created = normalizeClient(res.data?.data || res.data || {}, 0);
    if (created?.id && refreshed.some((client) => client.id === created.id)) setSelectedId(created.id);
    setSavedAt(`Client saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  async function sendClientToCommand() {
    if (!selected) return;
    setBusy("command");
    try {
      const result = await post("/tell-churvox/prepare", { text: commandText(selected, rows) }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not send client timeline to Command.");
      onNavigate?.("command");
    } catch (err) {
      setError(err?.message || "Could not send client timeline to Command.");
    } finally {
      setBusy("");
    }
  }

  const filterPillStyle = (active) => active ? selectedFilterButtonStyle : undefined;
  const filterTextStyle = (active) => active ? selectedFilterTextStyle : undefined;
  const filterCountStyle = (active) => active ? selectedFilterCountStyle : undefined;

  return (
    <section>
      <header className="freshHero"><span>Churvox fresh - Clients</span><h1>Clients</h1><p>Client Timeline links jobs, quotes, invoices and the next owner decision around each customer.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{loading && clients.length === 0 ? "..." : clients.length}</h2><p>Total clients</p></aside><aside className="freshCard"><h2>{loading && clients.length === 0 ? "..." : needsSetup}</h2><p>Need setup</p></aside><aside className="freshCard"><h2>{selected ? money(timelineValue) : "$0.00"}</h2><p>Selected timeline value</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Clients need attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={() => { loadClients(); loadTimeline(); }}>Retry</button></section> : null}
      {savedAt ? <section className="freshCard freshItem"><b>Client save status</b><span>{savedAt}</span></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} aria-label={`Filter clients by ${item}`} title={`Filter clients by ${item}`} style={{ minHeight: 44, ...(filterPillStyle(filter === item) || {}) }} onClick={() => setFilter(item)}><span style={filterTextStyle(filter === item)}>{item}</span><b style={filterCountStyle(filter === item)}>{item === "All" ? clients.length : clients.filter((client) => client.status === item).length}</b></button>)}</section>
      <label className="freshField"><span>Search clients</span><input type="search" value={search} placeholder="Search by name, email, phone or address" onChange={(event) => setSearch(event.target.value)} /></label>

      <section className="freshGrid">
        <aside className="freshCard"><h2>Client list</h2>{loading && clients.length === 0 ? <div className="freshItem"><b>Loading real clients...</b><span>Checking your business account.</span></div> : visibleClients.map((client) => <button type="button" className={`freshItem ${selected?.id === client.id ? "active" : ""} ${client.status === "Needs setup" ? "need" : ""}`} key={client.id} onClick={() => setSelectedId(client.id)}><b>{client.name}</b><span>{client.type} - {client.status} - {client.value}</span></button>)}{loading && clients.length > 0 ? <div className="freshItem"><b>Refreshing clients...</b><span>Showing saved records while Churvox refreshes.</span></div> : null}{!loading && visibleClients.length === 0 ? <div className="freshItem"><b>No matching clients</b><span>Create a client or clear the search/filter.</span></div> : null}</aside>

        <section className="freshCard"><h2>{selected?.name || "Select client"}</h2>{selected ? <><div className="freshMiniGrid"><div><span>Status</span><b>{selected.status}</b></div><div><span>Timeline</span><b>{rows.length} records</b></div><div><span>Value</span><b>{money(timelineValue)}</b></div><div><span>Risk</span><b>{selected.risk}</b></div></div><section className={`freshQuoteNextBox ${selected.email ? "accepted" : "sent"}`}><span>Next owner decision</span><b>{nextDecision}</b><p>Churvox keeps client automation owner-approved so missing setup does not contact customers by mistake.</p></section><section className="freshTimelineList">{timelineLoading ? <article><b>Refreshing timeline...</b><span>Checking jobs, quotes and invoices.</span></article> : rows.length ? rows.slice(0, 8).map((row, index) => <article key={`${row.type}-${index}`}><b>{row.type}: {row.title}</b><span>{row.status} - {money(row.amount)} - {row.note}</span></article>) : <article><b>No linked records yet</b><span>Create a job, quote or invoice for this client.</span></article>}</section><label className="freshField"><span>Client name</span><input value={selected.name} onChange={(event) => updateSelectedClient({ name: event.target.value })} /></label><label className="freshField"><span>Invoice/customer email</span><input value={selected.email} onChange={(event) => updateSelectedClient({ email: event.target.value })} /></label><label className="freshField"><span>Phone</span><input value={selected.phone} onChange={(event) => updateSelectedClient({ phone: event.target.value })} /></label><label className="freshField"><span>Service address</span><input value={selected.address} onChange={(event) => updateSelectedClient({ address: event.target.value })} /></label><label className="freshField"><span>Client notes</span><textarea value={selected.notes} onChange={(event) => updateSelectedClient({ notes: event.target.value })} /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={saving} onClick={saveSelectedClient}>{saving ? "Saving..." : "Save client"}</button><button className="freshGhost" type="button" disabled={saving} onClick={() => { setDeleteOpen(true); setDeleteName(""); setError(""); }}>Delete client</button></div></> : <div className="freshItem"><b>No client selected</b><span>Add your first client to start the workflow.</span></div>}</section>

        <aside className="freshCard"><h2>Owner actions</h2><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={() => setAddOpen(true)}>Add client</button><button className="freshOrange" type="button" disabled={!selected} onClick={() => openJobPopup(selected?.id || "")}>Create job</button><button className="freshDark" type="button" disabled={!selected} onClick={() => window.location.href = selected ? `/quotes/new?client_id=${encodeURIComponent(selected.id)}` : "/quotes/new"}>Create quote</button><button className="freshDark" type="button" disabled={!selected || busy === "command"} onClick={sendClientToCommand}>{busy === "command" ? "Sending..." : "Send timeline to Command"}</button><button className="freshGhost" type="button" disabled={!selected || saving} onClick={() => { setDeleteOpen(true); setDeleteName(""); setError(""); }}>Delete client</button><button className="freshGhost" type="button" onClick={() => { loadClients(); loadTimeline(); }}>Refresh timeline</button></div></aside>
      </section>

      {addOpen ? <div className="freshPopupBackdrop freshClientPopupBackdrop" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.62)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOpen(false); }}><section className="freshCard freshClientPopupCard" style={{ width: "min(1040px, calc(100vw - 56px))", maxHeight: "90dvh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}><header className="freshHero freshClientPopupHero" style={{ marginBottom: 12 }}><span>New client</span><h1>Add client</h1><p>Add the real customer here without leaving the Clients area.</p></header>{addError ? <div className="freshItem need"><b>Client needs attention</b><span>{addError}</span></div> : null}<label className="freshField"><span>Client name</span><input autoFocus value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))} placeholder="Customer or business name" /></label><label className="freshField"><span>Invoice/customer email</span><input value={newClient.email} onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))} placeholder="hello@churvox.com" /></label><label className="freshField"><span>Phone</span><input value={newClient.phone} onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))} placeholder="phone number" /></label><label className="freshField"><span>Service address</span><input value={newClient.address} onChange={(e) => setNewClient((c) => ({ ...c, address: e.target.value }))} placeholder="job/site address" /></label><label className="freshField"><span>Notes</span><textarea value={newClient.notes} onChange={(e) => setNewClient((c) => ({ ...c, notes: e.target.value }))} placeholder="gate code, pets, preferences, anything useful" /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={saving} onClick={saveNewClient}>{saving ? "Saving..." : "Save client"}</button><button className="freshGhost" type="button" onClick={() => setAddOpen(false)}>Cancel</button></div></section></div> : null}

      {deleteOpen && selected ? <div className="freshPopupBackdrop freshClientPopupBackdrop" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.66)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteOpen(false); }}><section className="freshCard freshClientPopupCard" style={{ width: "min(760px, calc(100vw - 42px))", maxHeight: "90dvh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}><header className="freshHero freshClientPopupHero" style={{ marginBottom: 12 }}><span>Delete client</span><h1>Delete {selected.name}</h1><p>This removes the client record from Churvox. Existing jobs, quotes or invoices may still keep their own history.</p></header><div className="freshItem need"><b>Confirm delete</b><span>Type the client name exactly to unlock delete: {selected.name}</span></div><label className="freshField"><span>Type client name</span><input autoFocus value={deleteName} onChange={(event) => setDeleteName(event.target.value)} placeholder={selected.name} /></label><div className="freshActions"><button className="freshOrange" type="button" disabled={saving || deleteName.trim() !== selected.name} onClick={deleteSelectedClient}>{saving ? "Deleting..." : "Delete client"}</button><button className="freshGhost" type="button" onClick={() => { setDeleteOpen(false); setDeleteName(""); }}>Cancel</button></div></section></div> : null}
    </section>
  );
}
