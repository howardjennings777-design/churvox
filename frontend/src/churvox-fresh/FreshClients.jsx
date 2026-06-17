import React from "react";
import { useApi } from "../hooks/useApi";
import { readFreshFocus } from "./freshFocus";

const filters = ["All", "Active", "Needs setup", "Paused"];
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const emptyClient = { name: "", email: "", phone: "", address: "", notes: "" };

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value.$oid) return String(value.$oid);
    if (value.oid) return String(value.oid);
    if (value.id) return normalizeId(value.id);
    if (value._id) return normalizeId(value._id);
  }
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function unpackList(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.clients)) return data.data.clients;
  if (Array.isArray(data?.data?.customers)) return data.data.customers;
  return [];
}

function cleanStatus(value, client) {
  const text = String(value || client?.client_status || client?.customer_status || "").trim();
  if (!text) return client?.email ? "Active" : "Needs setup";
  if (/paused|inactive|archived/i.test(text)) return "Paused";
  if (/setup|missing|draft|incomplete/i.test(text)) return "Needs setup";
  return "Active";
}

function timeValue(client) {
  const raw = client?.created_at || client?.createdAt || client?.updated_at || client?.updatedAt || client?.date || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
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

export default function FreshClients({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [clients, setClients] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("clients", ""));
  const [filter, setFilter] = React.useState("All");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [newClient, setNewClient] = React.useState(emptyClient);
  const [addError, setAddError] = React.useState("");

  const selected = clients.find((client) => client.id === selectedId) || clients[0];
  const query = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) => {
    const matchesFilter = filter === "All" || client.status === filter;
    const haystack = `${client.name} ${client.email} ${client.phone} ${client.address} ${client.notes}`.toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
  const needsSetup = clients.filter((client) => client.status === "Needs setup").length;

  const loadClients = React.useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    const res = await get("/clients");
    if (!res.success) {
      setClients([]);
      setSelectedId("");
      setError(res.error || "Could not load real clients");
      setLoading(false);
      return [];
    }
    const nextClients = unpackList(res.data).map(normalizeClient).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setClients(nextClients);
    setSelectedId((current) => nextClients.some((client) => client.id === current) ? current : nextClients[0]?.id || "");
    setLoading(false);
    return nextClients;
  }, [get]);

  React.useEffect(() => { loadClients(); }, [loadClients]);

  React.useEffect(() => {
    const onFreshDataUpdated = (event) => {
      if (event?.detail?.type === "client-created") return;
      loadClients({ quiet: true });
    };
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadClients]);

  React.useEffect(() => {
    function openPopup() { setAddOpen(true); setAddError(""); try { window.localStorage.removeItem(OPEN_CLIENT_MODAL_KEY); } catch {} }
    window.addEventListener("churvox:open-client-popup", openPopup);
    try { if (window.localStorage.getItem(OPEN_CLIENT_MODAL_KEY) === "true") window.setTimeout(openPopup, 50); } catch {}
    return () => window.removeEventListener("churvox:open-client-popup", openPopup);
  }, []);

  React.useEffect(() => {
    if (!visibleClients.length) return;
    if (!selectedId || !visibleClients.some((client) => client.id === selectedId)) setSelectedId(visibleClients[0].id);
  }, [visibleClients, selectedId]);

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
    if (!res.success) { setError(res.error || "Could not update client"); setSavedAt("Save failed"); return; }
    setSavedAt(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
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
    setNewClient(emptyClient);
    setAddOpen(false);
    const refreshed = await loadClients({ quiet: true });
    const created = normalizeClient(res.data?.data || res.data || {}, 0);
    if (created?.id && refreshed.some((client) => client.id === created.id)) setSelectedId(created.id);
    setSavedAt(`Client saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }

  return (
    <section>
      <header className="freshHero"><span>Churvox fresh · Clients</span><h1>Clients</h1><p>Real client records from your business account. Jobs, quotes, invoices and Command should use these clients.</p></header>

      <section className="freshCommandPulse"><aside className="freshCard"><h2>{loading && clients.length === 0 ? "…" : clients.length}</h2><p>Total clients</p></aside><aside className="freshCard"><h2>{loading && clients.length === 0 ? "…" : needsSetup}</h2><p>Need setup</p></aside><aside className="freshCard"><h2>{loading && clients.length === 0 ? "…" : clients.filter((client) => client.status === "Active").length}</h2><p>Active clients</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Could not load clients</b><span>{error}</span><button type="button" className="freshPrimary" onClick={() => loadClients()}>Retry</button></section> : null}
      {savedAt ? <section className="freshCard freshItem"><b>Client save status</b><span>{savedAt}</span></section> : null}

      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span>{item}</span><b>{item === "All" ? clients.length : clients.filter((client) => client.status === item).length}</b></button>)}</section>
      <label className="freshField"><span>Search clients</span><input type="search" value={search} placeholder="Search by name, email, phone or address" onChange={(event) => setSearch(event.target.value)} /></label>

      <section className="freshGrid">
        <aside className="freshCard"><h2>Client list</h2>{loading && clients.length === 0 ? <div className="freshItem"><b>Loading real clients…</b><span>Checking your business account.</span></div> : visibleClients.map((client) => <button type="button" className={`freshItem ${selected?.id === client.id ? "active" : ""} ${client.status === "Needs setup" ? "need" : ""}`} key={client.id} onClick={() => setSelectedId(client.id)}><b>{client.name}</b><span>{client.type} · {client.status} · {client.value}</span></button>)}{loading && clients.length > 0 ? <div className="freshItem"><b>Refreshing clients…</b><span>Showing your current saved records while Churvox refreshes.</span></div> : null}{!loading && visibleClients.length === 0 ? <div className="freshItem"><b>No matching clients</b><span>Create a client or clear the search/filter.</span></div> : null}</aside>
        <section className="freshCard"><h2>{selected?.name || "Select client"}</h2>{selected ? <><div className="freshMiniGrid"><div><span>Status</span><b>{selected.status}</b></div><div><span>Type</span><b>{selected.type}</b></div><div><span>Value</span><b>{selected.value}</b></div><div><span>Risk</span><b>{selected.risk}</b></div></div><label className="freshField"><span>Client name</span><input value={selected.name} onChange={(event) => updateSelectedClient({ name: event.target.value })} /></label><label className="freshField"><span>Invoice/customer email</span><input value={selected.email} onChange={(event) => updateSelectedClient({ email: event.target.value })} /></label><label className="freshField"><span>Phone</span><input value={selected.phone} onChange={(event) => updateSelectedClient({ phone: event.target.value })} /></label><label className="freshField"><span>Service address</span><input value={selected.address} onChange={(event) => updateSelectedClient({ address: event.target.value })} /></label><label className="freshField"><span>Client notes</span><textarea value={selected.notes} onChange={(event) => updateSelectedClient({ notes: event.target.value })} /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={saving} onClick={saveSelectedClient}>{saving ? "Saving…" : "Save client"}</button></div></> : <div className="freshItem"><b>No client selected</b><span>Add your first client to start the workflow.</span></div>}</section>
        <aside className="freshCard"><h2>Owner actions</h2><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => setAddOpen(true)}>Add client</button><button className="freshOrange" type="button" disabled={!selected} onClick={() => openJobPopup(selected?.id || "")}>Create job</button><button className="freshDark" type="button" disabled={!selected} onClick={() => window.location.href = selected ? `/quotes/new?client_id=${encodeURIComponent(selected.id)}` : "/quotes/new"}>Create quote</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Send issue to Command</button><button className="freshGhost" type="button" onClick={() => loadClients()}>Refresh clients</button></div></aside>
      </section>

      {addOpen ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.62)", display: "grid", placeItems: "center", padding: 16 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOpen(false); }}>
          <section className="freshCard" style={{ width: "min(640px, 100%)", maxHeight: "88vh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}>
            <header className="freshHero" style={{ marginBottom: 12 }}><span>New client</span><h1>Add client</h1><p>Add the real customer here without leaving the Clients area.</p></header>
            {addError ? <div className="freshItem need"><b>Client needs attention</b><span>{addError}</span></div> : null}
            <label className="freshField"><span>Client name</span><input autoFocus value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))} placeholder="Customer or business name" /></label>
            <label className="freshField"><span>Invoice/customer email</span><input value={newClient.email} onChange={(e) => setNewClient((c) => ({ ...c, email: e.target.value }))} placeholder="hello@churvox.com" /></label>
            <label className="freshField"><span>Phone</span><input value={newClient.phone} onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))} placeholder="phone number" /></label>
            <label className="freshField"><span>Service address</span><input value={newClient.address} onChange={(e) => setNewClient((c) => ({ ...c, address: e.target.value }))} placeholder="job/site address" /></label>
            <label className="freshField"><span>Notes</span><textarea value={newClient.notes} onChange={(e) => setNewClient((c) => ({ ...c, notes: e.target.value }))} placeholder="gate code, pets, preferences, anything useful" /></label>
            <div className="freshActions"><button className="freshPrimary" type="button" disabled={saving} onClick={saveNewClient}>{saving ? "Saving…" : "Save client"}</button><button className="freshGhost" type="button" onClick={() => setAddOpen(false)}>Cancel</button></div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
