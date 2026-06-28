import React from "react";
import ChurvoxOSRealAdminV3 from "./ChurvoxOSRealAdminV3";
import { useApi } from "../hooks/useApi";

const GROUPS = [
  ["Run", [["hub", "Today", "TD"], ["command", "Command", "CM"]]],
  ["Work", [["jobs", "Jobs", "JB"], ["clients", "Clients", "CL"], ["workers", "Workers", "WK"]]],
  ["Money", [["quotes", "Quotes", "QT"], ["invoices", "Invoices", "IV"]]],
  ["Admin", [["messages", "Messages", "MS"], ["team", "Team", "TM"], ["xero", "Xero", "XR"]]],
  ["Control", [["settings", "Settings", "ST"], ["plans", "Plans", "PL"], ["help", "Help", "HP"]]],
];
const PAGES = GROUPS.flatMap(([, items]) => items.map(([key]) => key));
const EMPTY_CLIENT = { name: "", phone: "", email: "", address: "", notes: "", price_memory: "" };

function pick(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function idOf(row, fallback = "") {
  const value = row?.id ?? row?._id ?? row?.client_id ?? fallback;
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || fallback || "");
  return String(value || fallback || "");
}

function bodyOf(result) {
  const body = result?.data ?? result;
  return body?.data ?? body;
}

function listOf(result, key = "") {
  const body = bodyOf(result);
  if (Array.isArray(body)) return body;
  if (key && Array.isArray(body?.[key])) return body[key];
  for (const name of ["clients", "items", "records", "results", "data"]) {
    if (Array.isArray(body?.[name])) return body[name];
  }
  return [];
}

function money(value) {
  const amount = Number(value || 0);
  return amount ? amount.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "No price memory yet";
}

function clientName(row) {
  return pick(row?.name, row?.client_name, row?.customer_name, row?.contact_name, row?.email, row?.phone, "Unnamed client");
}

function normaliseClient(row, index) {
  return {
    raw: row,
    id: idOf(row, `client-${index}`),
    name: clientName(row),
    phone: pick(row.phone, row.mobile, row.phone_number, row.contact_phone),
    email: pick(row.email, row.contact_email),
    address: pick(row.address, row.site_address, row.billing_address, row.location),
    notes: pick(row.notes, row.note, row.service_memory, row.last_note, row.description),
    price_memory: pick(row.price_memory, row.default_rate, row.hourly_rate, row.total_spend, row.lifetime_value),
    jobs: Number(row.job_count || row.jobs_count || row.total_jobs || row.jobs || 0),
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quote = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quote && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      quote = !quote;
      continue;
    }
    if (ch === "," && !quote) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !quote) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map((header) => header.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "_"));
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function csvClientPayload(row) {
  const name = pick(row.name, row.client, row.client_name, row.customer, row.customer_name, row.company, row.contact_name);
  return {
    name,
    client_name: name,
    customer_name: name,
    phone: pick(row.phone, row.mobile, row.phone_number, row.contact_phone),
    mobile: pick(row.mobile, row.phone),
    email: pick(row.email, row.contact_email),
    address: pick(row.address, row.site_address, row.street_address, row.location),
    site_address: pick(row.site_address, row.address, row.location),
    notes: pick(row.notes, row.note, row.service_memory, row.description),
    price_memory: pick(row.price_memory, row.default_rate, row.hourly_rate, row.rate),
  };
}

function formPayload(draft) {
  return {
    name: draft.name,
    client_name: draft.name,
    customer_name: draft.name,
    phone: draft.phone,
    mobile: draft.phone,
    email: draft.email,
    address: draft.address,
    site_address: draft.address,
    notes: draft.notes,
    service_memory: draft.notes,
    price_memory: draft.price_memory,
  };
}

function usePage() {
  const read = () => {
    const path = window.location.pathname || "";
    const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
    const fromPath = path.split("/").pop()?.toLowerCase();
    const key = PAGES.includes(hash) ? hash : PAGES.includes(fromPath) ? fromPath : "hub";
    return key;
  };
  const [page, setPage] = React.useState(read);
  const go = React.useCallback((next) => {
    const key = PAGES.includes(next) ? next : "hub";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${key}`);
    setPage(key);
  }, []);
  React.useEffect(() => {
    const onHash = () => setPage(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [page, go];
}

function Sidebar({ page, go, clientCount }) {
  return <aside className="workSidebar clientSidebar"><div className="workBrand"><b>C</b><span><strong>churvox</strong><em>Owner admin OS</em></span></div>{GROUPS.map(([group, items]) => <nav key={group}><p>{group}</p>{items.map(([key, label, code]) => <button key={key} type="button" className={page === key ? "active" : ""} onClick={() => go(key)}><span>{code}</span><b>{label}</b>{key === "clients" && clientCount ? <em>{clientCount}</em> : null}</button>)}</nav>)}<footer><b>Live client records</b><span>{clientCount} clients loaded</span></footer></aside>;
}

function WorkTop({ go, onAdd }) {
  return <header className="workTop clientTop"><div><span>Churvox OS</span><strong>Clients</strong></div><div className="clientTopHint"><span>Client records</span><b>Edit the real customer file here. Quotes, invoices and messages still wait in Command.</b></div><button type="button" onClick={() => go("command")}><span>Owner</span><b>Open approvals</b></button><button type="button" className="clientAddTop" onClick={onAdd}>Add client</button></header>;
}

function ClientsWorkbench() {
  const api = useApi();
  const [page, go] = usePage();
  const [clients, setClients] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("new");
  const [draft, setDraft] = React.useState(EMPTY_CLIENT);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const fileRef = React.useRef(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const result = await api.get("/clients");
    const next = listOf(result, "clients").map(normaliseClient);
    setClients(next);
    if (selectedId !== "new" && !next.some((client) => client.id === selectedId)) {
      setSelectedId(next[0]?.id || "new");
    }
    setLoading(false);
  }, [api, selectedId]);

  React.useEffect(() => { reload(); }, [reload]);

  const selected = clients.find((client) => client.id === selectedId);

  React.useEffect(() => {
    if (selectedId === "new") return;
    if (!selected) return;
    setDraft({
      name: selected.name,
      phone: selected.phone,
      email: selected.email,
      address: selected.address,
      notes: selected.notes,
      price_memory: selected.price_memory,
    });
  }, [selectedId, selected]);

  const addClient = () => {
    setSelectedId("new");
    setDraft(EMPTY_CLIENT);
    setNotice("New client ready to fill.");
  };

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const saveClient = async () => {
    if (!draft.name.trim()) {
      setNotice("Client name is required before saving.");
      return;
    }
    setSaving(true);
    const payload = formPayload(draft);
    const result = selectedId === "new" ? await api.post("/clients", payload) : await api.patch(`/clients/${selectedId}`, payload);
    if (!result?.success && selectedId !== "new") {
      const fallback = await api.put(`/clients/${selectedId}`, payload);
      if (!fallback?.success) setNotice(fallback?.error || result?.error || "Client save failed.");
      else setNotice("Client saved.");
    } else if (!result?.success) {
      setNotice(result?.error || "Client save failed.");
    } else {
      setNotice(selectedId === "new" ? "Client added." : "Client saved.");
    }
    await reload();
    setSaving(false);
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const text = await file.text();
    const rows = parseCsv(text).map(csvClientPayload).filter((row) => row.name);
    let created = 0;
    for (const row of rows.slice(0, 250)) {
      const result = await api.post("/clients", row);
      if (result?.success) created += 1;
    }
    if (fileRef.current) fileRef.current.value = "";
    await reload();
    setNotice(created ? `${created} clients imported from CSV.` : "No clients imported. Check CSV headings: name, phone, email, address, notes.");
    setSaving(false);
  };

  const clientRows = clients.slice(0, 250);

  return <main className="workOS clientWorkbenchOS"><Sidebar page={page} go={go} clientCount={clients.length} /><section className="workMain clientWorkbenchMain"><WorkTop go={go} onAdd={addClient} /><section className="clientWorkbenchShell"><aside className="clientDirectory"><div className="clientDirectoryHead"><span>Customer records</span><h1>Client file.</h1><button type="button" onClick={addClient}>Add client</button><label><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} />Import CSV</label></div><div className="clientSearchLine"><b>{loading ? "Loading clients" : `${clients.length} clients`}</b><span>Tap a client to edit the true record.</span></div><div className="clientList clientRecordList">{clientRows.map((client) => <button key={client.id} type="button" className={client.id === selectedId ? "active" : ""} onClick={() => setSelectedId(client.id)}><b>{client.name}</b><span>{client.jobs} jobs / {money(client.price_memory)}</span><small>{pick(client.phone, client.email, client.address, "Needs details")}</small></button>)}</div></aside><article className="clientEditPanel"><header><span>{selectedId === "new" ? "New client" : "Editable client record"}</span><h2>{draft.name || "Add client"}</h2><p>{notice || "Save updates here. Anything outgoing still waits in Command."}</p></header><div className="clientFormGrid"><label>Client name<input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Customer or company name" /></label><label>Mobile / phone<input value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} placeholder="Phone number" /></label><label>Email<input value={draft.email} onChange={(event) => updateDraft("email", event.target.value)} placeholder="customer@email.com" /></label><label>Site address<input value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} placeholder="Street, suburb, city" /></label><label className="wide">Service memory<textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} placeholder="Gate codes, access notes, preferred work times, pets, equipment, repeat service details" /></label><label className="wide">Price memory<textarea value={draft.price_memory} onChange={(event) => updateDraft("price_memory", event.target.value)} placeholder="Last price, agreed rate, special materials, discount rules" /></label></div><footer><button type="button" className="secondary" onClick={() => selected ? setDraft({ name: selected.name, phone: selected.phone, email: selected.email, address: selected.address, notes: selected.notes, price_memory: selected.price_memory }) : setDraft(EMPTY_CLIENT)}>Reset form</button><button type="button" onClick={saveClient} disabled={saving}>{saving ? "Saving..." : "Save client"}</button></footer></article></section></section></main>;
}

export default function ChurvoxOSRealAdminV4() {
  const [page] = usePage();
  if (page !== "clients") return <ChurvoxOSRealAdminV3 />;
  return <ClientsWorkbench />;
}
