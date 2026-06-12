import React from "react";
import { useApi } from "../hooks/useApi";
import { readFreshFocus } from "./freshFocus";

const filters = ["All", "Active", "Needs setup", "Paused"];

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
  if (!text) return client?.billing_email || client?.billingEmail || client?.email ? "Active" : "Needs setup";
  if (/paused|inactive|archived/i.test(text)) return "Paused";
  if (/setup|missing|draft|incomplete/i.test(text)) return "Needs setup";
  return "Active";
}

function normalizeClient(client, index) {
  const id = normalizeId(client?.id || client?._id || client?.client_id || client?.customer_id) || `client-${index}`;
  const name = client?.name || client?.client_name || client?.customer_name || client?.contact_name || client?.business_name || "Unnamed client";
  const billingEmail = client?.billingEmail || client?.billing_email || client?.billing_contact_email || "";
  const email = client?.email || client?.client_email || client?.customer_email || "";
  const phone = client?.phone || client?.mobile || client?.client_phone || client?.customer_phone || "";
  const address = client?.address || client?.site_address || client?.service_address || client?.customer_address || "";
  const notes = client?.notes || client?.internal_notes || client?.client_notes || "";
  const type = client?.type || client?.client_type || client?.customer_type || "Client";
  const status = cleanStatus(client?.status, client);

  return {
    ...client,
    id,
    name,
    type,
    status,
    email,
    phone,
    address,
    billingEmail,
    notes,
    risk: billingEmail || email ? "Clean setup" : "Contact detail missing",
    value: client?.value || client?.lifetime_value || client?.amount_due || "Real client",
  };
}

export default function FreshClients({ onNavigate }) {
  const api = useApi();
  const [clients, setClients] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("clients", ""));
  const [filter, setFilter] = React.useState("All");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const selected = clients.find((client) => client.id === selectedId) || clients[0];
  const query = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) => {
    const matchesFilter = filter === "All" || client.status === filter;
    const haystack = `${client.name} ${client.email} ${client.phone} ${client.address} ${client.notes}`.toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
  const needsSetup = clients.filter((client) => client.status === "Needs setup").length;

  const loadClients = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await api.get("/clients");
    setLoading(false);

    if (!res.success) {
      setClients([]);
      setSelectedId("");
      setError(res.error || "Could not load real clients");
      return;
    }

    const nextClients = unpackList(res.data).map(normalizeClient);
    setClients(nextClients);
    setSelectedId((current) => nextClients.some((client) => client.id === current) ? current : nextClients[0]?.id || "");
  }, [api]);

  React.useEffect(() => {
    loadClients();
  }, [loadClients]);

  React.useEffect(() => {
    const onFreshDataUpdated = () => loadClients();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadClients]);

  React.useEffect(() => {
    if (!selected && clients[0]) setSelectedId(clients[0].id);
  }, [clients, selected]);

  function updateSelectedClient(patch) {
    if (!selected) return;
    setClients((current) => current.map((client) => client.id === selected.id ? { ...client, ...patch } : client));
  }

  async function saveSelectedClient() {
    if (!selected?.id) return;
    setSaving(true);
    const res = await api.patch(`/clients/${encodeURIComponent(selected.id)}`, {
      name: selected.name,
      email: selected.email,
      phone: selected.phone,
      address: selected.address,
      billing_email: selected.billingEmail,
      notes: selected.notes,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error || "Could not update client");
      return;
    }
    await loadClients();
  }

  function go(path) {
    window.location.href = path;
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Clients</span>
        <h1>Clients</h1>
        <p>Real client records from your business account. Jobs, quotes, invoices and Command should use these clients.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{loading ? "…" : clients.length}</h2>
          <p>Total clients</p>
        </aside>
        <aside className="freshCard">
          <h2>{loading ? "…" : needsSetup}</h2>
          <p>Need setup</p>
        </aside>
        <aside className="freshCard">
          <h2>{loading ? "…" : clients.filter((client) => client.status === "Active").length}</h2>
          <p>Active clients</p>
        </aside>
      </section>

      {error ? (
        <section className="freshCard freshItem need">
          <b>Could not load clients</b>
          <span>{error}</span>
          <button type="button" className="freshPrimary" onClick={loadClients}>Retry</button>
        </section>
      ) : null}

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{item === "All" ? clients.length : clients.filter((client) => client.status === item).length}</b>
          </button>
        ))}
      </section>

      <label className="freshField">
        <span>Search clients</span>
        <input
          type="search"
          value={search}
          placeholder="Search by name, email, phone or address"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Client list</h2>

          {loading ? (
            <div className="freshItem"><b>Loading real clients…</b><span>Checking your business account.</span></div>
          ) : visibleClients.map((client) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === client.id ? "active" : ""} ${client.status === "Needs setup" ? "need" : ""}`}
              key={client.id}
              onClick={() => setSelectedId(client.id)}
            >
              <b>{client.name}</b>
              <span>{client.type} · {client.status} · {client.value}</span>
            </button>
          ))}

          {!loading && visibleClients.length === 0 && (
            <div className="freshItem">
              <b>No matching clients</b>
              <span>Create a client or clear the search/filter.</span>
            </div>
          )}
        </aside>

        <section className="freshCard">
          <h2>{selected?.name || "Select client"}</h2>

          {selected ? (
            <>
              <div className="freshMiniGrid">
                <div><span>Status</span><b>{selected.status}</b></div>
                <div><span>Type</span><b>{selected.type}</b></div>
                <div><span>Value</span><b>{selected.value}</b></div>
                <div><span>Risk</span><b>{selected.risk}</b></div>
              </div>

              <label className="freshField"><span>Client name</span><input value={selected.name} onChange={(event) => updateSelectedClient({ name: event.target.value })} /></label>
              <label className="freshField"><span>Email</span><input value={selected.email} onChange={(event) => updateSelectedClient({ email: event.target.value })} /></label>
              <label className="freshField"><span>Billing email</span><input value={selected.billingEmail} placeholder="Required for invoice automation" onChange={(event) => updateSelectedClient({ billingEmail: event.target.value })} /></label>
              <label className="freshField"><span>Phone</span><input value={selected.phone} onChange={(event) => updateSelectedClient({ phone: event.target.value })} /></label>
              <label className="freshField"><span>Service address</span><input value={selected.address} onChange={(event) => updateSelectedClient({ address: event.target.value })} /></label>
              <label className="freshField"><span>Client notes</span><textarea value={selected.notes} onChange={(event) => updateSelectedClient({ notes: event.target.value })} /></label>

              <div className="freshActions">
                <button className="freshPrimary" type="button" disabled={saving} onClick={saveSelectedClient}>{saving ? "Saving…" : "Save client"}</button>
              </div>
            </>
          ) : (
            <div className="freshItem"><b>No client selected</b><span>Add your first client to start the workflow.</span></div>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => go("/clients/new")}>Add client</button>
            <button className="freshOrange" type="button" disabled={!selected} onClick={() => go(selected ? `/jobs/new?client_id=${encodeURIComponent(selected.id)}` : "/jobs/new")}>Create job</button>
            <button className="freshDark" type="button" disabled={!selected} onClick={() => go(selected ? `/quotes/new?client_id=${encodeURIComponent(selected.id)}` : "/quotes/new")}>Create quote</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Send issue to Command</button>
            <button className="freshGhost" type="button" onClick={loadClients}>Refresh clients</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
