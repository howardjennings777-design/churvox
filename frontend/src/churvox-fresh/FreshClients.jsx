import React from "react";
import { useApi } from "../hooks/useApi";
import { readFreshFocus } from "./freshFocus";
import { hideDemoRecords } from "./freshDemoRecords";
import FreshCsvImportButton from "./FreshCsvImportButton";
import "./freshJobsPolish.css";

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

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
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

function timeValue(record) {
  const raw = record?.created_at || record?.createdAt || record?.updated_at || record?.updatedAt || record?.scheduled_date || record?.date || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isGenericClientName(value) {
  return ["customer", "client", "unnamed client", "for", "unknown"].includes(lower(value));
}

function normalizeClient(client, index) {
  const id = normalizeId(client?.id || client?._id || client?.client_id || client?.customer_id) || `client-${index}`;
  const name = pick(client, "name", "client_name", "customer_name", "contact_name", "business_name") || "Customer";
  const email = pick(client, "email", "client_email", "customer_email", "billing_email");
  const phone = pick(client, "phone", "mobile", "client_phone", "customer_phone");
  const address = pick(client, "address", "site_address", "service_address", "customer_address");
  const notes = pick(client, "notes", "internal_notes", "client_notes");
  const type = pick(client, "type", "client_type", "customer_type") || "Client";
  const contact = [email, phone].filter(Boolean).join(" / ");
  return {
    ...client,
    id,
    name,
    type,
    email,
    phone,
    address,
    notes,
    contact,
    value: client?.value || client?.lifetime_value || client?.amount_due || 0,
    sortTime: timeValue(client),
  };
}

function displayClientName(client) {
  if (!client) return "Select client";
  if (isGenericClientName(client.name) && !client.email && !client.phone && !client.address) return "Customer";
  return client.name || "Customer";
}

function clientSubtitle(client) {
  if (!client) return "";
  return client.contact || client.address || client.type || "Client";
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
  return Boolean(name && !isGenericClientName(name) && haystack.includes(name)) || Boolean(email && haystack.includes(email)) || Boolean(address && haystack.includes(address));
}

function timelineRows(data, client) {
  const jobs = data.jobs.filter((item) => belongsToClient(item, client)).map((item) => ({ type: "Job", title: recordTitle(item, "Job"), status: recordStatus(item), amount: recordAmount(item), time: timeValue(item), note: pick(item, "address", "site_address", "notes", "description") || "Job record" }));
  const quotes = data.quotes.filter((item) => belongsToClient(item, client)).map((item) => ({ type: "Quote", title: recordTitle(item, "Quote"), status: recordStatus(item), amount: recordAmount(item), time: timeValue(item), note: pick(item, "notes", "description", "job_description") || "Quote record" }));
  const invoices = data.invoices.filter((item) => belongsToClient(item, client)).map((item) => ({ type: "Invoice", title: recordTitle(item, "Invoice"), status: recordStatus(item), amount: recordAmount(item), time: timeValue(item), note: pick(item, "notes", "description", "due_date") || "Invoice record" }));
  return [...jobs, ...quotes, ...invoices].sort((a, b) => b.time - a.time);
}

export default function FreshClients({ onNavigate }) {
  const { get, post, patch, del } = useApi();
  const [clients, setClients] = React.useState([]);
  const [timelineData, setTimelineData] = React.useState({ jobs: [], quotes: [], invoices: [] });
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("clients", ""));
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [timelineLoading, setTimelineLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [newClient, setNewClient] = React.useState(emptyClient);
  const [addError, setAddError] = React.useState("");

  const selected = clients.find((client) => client.id === selectedId) || clients[0];
  const rows = React.useMemo(() => timelineRows(timelineData, selected), [timelineData, selected]);
  const query = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) => {
    const haystack = `${client.name} ${client.email} ${client.phone} ${client.address} ${client.notes}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  const timelineValue = rows.reduce((sum, row) => sum + row.amount, 0);

  const loadClients = React.useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    const res = await get("/clients");
    if (!res.success) {
      setClients([]);
      setSelectedId("");
      setError(res.error || "Could not load clients");
      setLoading(false);
      return [];
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
    const onFreshDataUpdated = (event) => {
      if (event?.detail?.type !== "client-created") loadClients({ quiet: true });
      loadTimeline();
    };
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadClients, loadTimeline]);
  React.useEffect(() => {
    function openPopup() {
      setAddOpen(true);
      setAddError("");
      try { window.localStorage.removeItem(OPEN_CLIENT_MODAL_KEY); } catch {}
    }
    window.addEventListener("churvox:open-client-popup", openPopup);
    try { if (window.localStorage.getItem(OPEN_CLIENT_MODAL_KEY) === "true") window.setTimeout(openPopup, 50); } catch {}
    return () => window.removeEventListener("churvox:open-client-popup", openPopup);
  }, []);
  React.useEffect(() => {
    if (visibleClients.length && (!selectedId || !visibleClients.some((client) => client.id === selectedId))) setSelectedId(visibleClients[0].id);
  }, [visibleClients, selectedId]);
  React.useEffect(() => { setEditOpen(false); }, [selected?.id]);

  function updateSelectedClient(patchData) {
    if (!selected) return;
    setClients((current) => current.map((client) => client.id === selected.id ? { ...client, ...patchData } : client));
    setSavedAt("Unsaved changes");
  }

  async function saveSelectedClient() {
    if (!selected?.id) return;
    setSaving(true);
    setError("");
    const payload = { name: selected.name, email: selected.email, phone: selected.phone, address: selected.address, notes: selected.notes };
    const res = await patch(`/clients/${encodeURIComponent(selected.id)}`, payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Could not update client");
      setSavedAt("Save failed");
      return;
    }
    setSavedAt(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    setEditOpen(false);
    await loadClients({ quiet: true });
  }

  async function deleteSelectedClient() {
    if (!selected?.id) return;
    if (!window.confirm(`Delete ${displayClientName(selected)}?`)) return;
    setSaving(true);
    setError("");
    const res = await del(`/clients/${encodeURIComponent(selected.id)}`, { timeout: 25000 });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Could not delete client.");
      return;
    }
    setSavedAt(`Deleted ${displayClientName(selected)}`);
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "client-deleted", id: selected.id } }));
    await loadClients({ quiet: true });
  }

  function openJobPopup(clientId = "") {
    const modalSearch = clientId ? `?client_id=${encodeURIComponent(clientId)}` : "";
    try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, modalSearch || "true"); } catch {}
    window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search: modalSearch } }));
  }

  async function saveNewClient() {
    const name = newClient.name.trim();
    if (!name) {
      setAddError("Client name is required.");
      return;
    }
    setSaving(true);
    setAddError("");
    const payload = { name, email: newClient.email.trim() || null, phone: newClient.phone.trim() || null, address: newClient.address.trim() || null, notes: newClient.notes.trim() || null };
    const res = await post("/clients", payload);
    setSaving(false);
    if (!res.success) {
      setAddError(res.error || "Could not add client");
      return;
    }
    setNewClient(emptyClient);
    setAddOpen(false);
    const refreshed = await loadClients({ quiet: true });
    const created = normalizeClient(res.data?.data || res.data || {}, 0);
    if (created?.id && refreshed.some((client) => client.id === created.id)) setSelectedId(created.id);
    setSavedAt(`Client saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  return (
    <section className="freshClientsPage">
      <header className="freshHero"><span>Clients</span><h1>Clients</h1><p>Customer records, contact details, service address, notes and recent work.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{loading && clients.length === 0 ? "..." : clients.length}</h2><p>Total clients</p></aside><aside className="freshCard"><h2>{visibleClients.length}</h2><p>Showing</p></aside><aside className="freshCard"><h2>{selected ? money(timelineValue) : "$0.00"}</h2><p>Recent value</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Clients could not load</b><span>{error}</span><button type="button" className="freshPrimary" onClick={() => { loadClients(); loadTimeline(); }}>Retry</button></section> : null}
      {savedAt ? <section className="freshCard freshItem"><b>Save status</b><span>{savedAt}</span></section> : null}
      <label className="freshField"><span>Search clients</span><input type="search" value={search} placeholder="Search by name, email, phone or address" onChange={(event) => setSearch(event.target.value)} /></label>

      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard"><h2>Clients</h2>{loading && clients.length === 0 ? <div className="freshItem"><b>Loading clients...</b><span>Checking your customer records.</span></div> : visibleClients.map((client) => <button type="button" className={`freshItem ${selected?.id === client.id ? "active" : ""}`} key={client.id} onClick={() => setSelectedId(client.id)}><b>{displayClientName(client)}</b><span>{clientSubtitle(client)}</span></button>)}{loading && clients.length > 0 ? <div className="freshItem"><b>Refreshing clients...</b><span>Showing saved records while Churvox refreshes.</span></div> : null}{!loading && visibleClients.length === 0 ? <div className="freshItem"><b>No matching clients</b><span>Create a client or clear the search.</span></div> : null}</aside>

        <section className="freshCard freshJobsDetailCard"><h2>{displayClientName(selected)}</h2>{selected ? <><div className="freshMiniGrid"><div><span>Contact</span><b>{selected.contact || "No contact saved"}</b></div><div><span>Service address</span><b>{selected.address || "No address saved"}</b></div><div><span>Recent work</span><b>{rows.length} records</b></div><div><span>Recent value</span><b>{money(timelineValue)}</b></div></div>{selected.notes ? <section className="freshJobsDetailBox notes"><span>Client notes</span><p>{selected.notes}</p></section> : null}<section className="freshTimelineList"><h3>Recent work</h3>{timelineLoading ? <article><b>Refreshing recent work...</b><span>Checking jobs, quotes and invoices.</span></article> : rows.length ? rows.slice(0, 5).map((row, index) => <article key={`${row.type}-${index}`}><b>{row.type}: {row.title}</b><span>{row.status} - {money(row.amount)} - {row.note}</span></article>) : <article><b>No recent work saved</b><span>This client has no linked jobs, quotes, or invoices yet.</span></article>}</section>{editOpen ? <section className="freshClientEditPanel"><label className="freshField"><span>Client name</span><input value={selected.name} onChange={(event) => updateSelectedClient({ name: event.target.value })} /></label><label className="freshField"><span>Invoice/customer email</span><input value={selected.email} onChange={(event) => updateSelectedClient({ email: event.target.value })} /></label><label className="freshField"><span>Phone</span><input value={selected.phone} onChange={(event) => updateSelectedClient({ phone: event.target.value })} /></label><label className="freshField"><span>Service address</span><input value={selected.address} onChange={(event) => updateSelectedClient({ address: event.target.value })} /></label><label className="freshField"><span>Client notes</span><textarea value={selected.notes} onChange={(event) => updateSelectedClient({ notes: event.target.value })} /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={saving} onClick={saveSelectedClient}>{saving ? "Saving..." : "Save client"}</button><button className="freshGhost" type="button" onClick={() => setEditOpen(false)}>Cancel</button></div></section> : <div className="freshActions"><button className="freshDark" type="button" onClick={() => setEditOpen(true)}>Edit details</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("jobs")}>View jobs</button></div>}</> : <div className="freshItem"><b>No client selected</b><span>Add your first client to start the workflow.</span></div>}</section>

        <aside className="freshCard freshJobsActionsCard"><h2>Client actions</h2><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={() => setAddOpen(true)}>Add client</button><FreshCsvImportButton endpoint="/clients/import-csv" label="Import clients CSV" disabled={saving} onDone={async (data) => { setSavedAt(data?.message || "Clients imported from CSV."); await loadClients({ quiet: true }); }} onError={(message) => { setError(message || "Could not import clients CSV."); setSavedAt("CSV import failed"); }} /><button className="freshOrange" type="button" disabled={!selected} onClick={() => openJobPopup(selected?.id || "")}>Create job</button><button className="freshDark" type="button" disabled={!selected} onClick={() => window.location.href = selected ? `/quotes/new?client_id=${encodeURIComponent(selected.id)}` : "/quotes/new"}>Create quote</button><button className="freshGhost" type="button" disabled={!selected || saving} onClick={deleteSelectedClient}>Delete client</button><button className="freshGhost" type="button" onClick={() => { loadClients(); loadTimeline(); }}>Refresh</button></div></aside>
      </section>

      {addOpen ? <div className="freshPopupBackdrop freshClientPopupBackdrop" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.62)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOpen(false); }}><section className="freshCard freshClientPopupCard" style={{ width: "min(1040px, calc(100vw - 56px))", maxHeight: "90dvh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}><header className="freshHero freshClientPopupHero" style={{ marginBottom: 12 }}><span>Client</span><h1>Add client</h1><p>Add the customer details.</p></header>{addError ? <div className="freshItem need"><b>Client could not save</b><span>{addError}</span></div> : null}<label className="freshField"><span>Client name</span><input autoFocus value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))} placeholder="Customer or business name" /></label><label className="freshField"><span>Invoice/customer email</span><input value={newClient.email} onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))} placeholder="hello@churvox.com" /></label><label className="freshField"><span>Phone</span><input value={newClient.phone} onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))} placeholder="phone number" /></label><label className="freshField"><span>Service address</span><input value={newClient.address} onChange={(e) => setNewClient((c) => ({ ...c, address: e.target.value }))} placeholder="job/site address" /></label><label className="freshField"><span>Notes</span><textarea value={newClient.notes} onChange={(e) => setNewClient((c) => ({ ...c, notes: e.target.value }))} placeholder="gate code, pets, preferences, anything useful" /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={saving} onClick={saveNewClient}>{saving ? "Saving..." : "Save client"}</button><button className="freshGhost" type="button" onClick={() => setAddOpen(false)}>Cancel</button></div></section></div> : null}
    </section>
  );
}
