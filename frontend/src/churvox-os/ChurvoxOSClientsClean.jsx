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
const PAGE_KEYS = GROUPS.flatMap(([, items]) => items.map(([key]) => key));
const EMPTY = { name: "", phone: "", email: "", address: "", serviceMemory: "", priceMemory: "" };

function pick(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function idOf(row, fallback = "") {
  const value = row?.id ?? row?._id ?? row?.client_id ?? row?.customer_id ?? fallback;
  return typeof value === "object" ? String(value.$oid || value.oid || value.id || value._id || fallback || "") : String(value || fallback || "");
}

function listOf(payload) {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ["clients", "customers", "items", "records", "results", "data"]) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

function clientName(row) {
  return pick(row?.name, row?.client_name, row?.customer_name, row?.contact_name, row?.email, row?.phone, "Unnamed client");
}

function normaliseClient(row, index) {
  return {
    id: idOf(row, `client-${index}`),
    raw: row,
    name: clientName(row),
    phone: pick(row?.phone, row?.mobile, row?.phone_number, row?.contact_phone),
    email: pick(row?.email, row?.contact_email),
    address: pick(row?.address, row?.site_address, row?.billing_address, row?.location),
    serviceMemory: pick(row?.service_memory, row?.service_notes, row?.notes, row?.note, row?.last_note, row?.description),
    priceMemory: pick(row?.price_memory, row?.default_rate, row?.hourly_rate, row?.rate, row?.total_spend, row?.lifetime_value),
    jobs: Number(row?.job_count || row?.jobs_count || row?.total_jobs || row?.jobs || 0),
  };
}

function usePage() {
  const read = () => {
    const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
    const pathKey = (window.location.pathname || "").split("/").pop()?.toLowerCase();
    return PAGE_KEYS.includes(hash) ? hash : PAGE_KEYS.includes(pathKey) ? pathKey : "hub";
  };
  const [page, setPage] = React.useState(read);
  const go = React.useCallback((next) => {
    const key = PAGE_KEYS.includes(next) ? next : "hub";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${key}`);
    setPage(key);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  React.useEffect(() => {
    const onHash = () => setPage(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [page, go];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quote = false;
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
  const headers = (rows.shift() || []).map((header) => header.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "_"));
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function csvClient(row) {
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
    service_memory: pick(row.service_memory, row.notes, row.note),
    price_memory: pick(row.price_memory, row.default_rate, row.hourly_rate, row.rate),
  };
}

function payload(draft) {
  return {
    name: draft.name,
    client_name: draft.name,
    customer_name: draft.name,
    phone: draft.phone,
    mobile: draft.phone,
    email: draft.email,
    address: draft.address,
    site_address: draft.address,
    notes: draft.serviceMemory,
    service_memory: draft.serviceMemory,
    price_memory: draft.priceMemory,
  };
}

function Sidebar({ page, go, count }) {
  return <aside className="ccSidebar"><div className="ccBrand"><b>C</b><span><strong>churvox</strong><em>Owner admin OS</em></span></div>{GROUPS.map(([group, items]) => <nav key={group}><p>{group}</p>{items.map(([key, label, code]) => <button key={key} type="button" className={page === key ? "active" : ""} onClick={() => go(key)}><span>{code}</span><b>{label}</b>{key === "clients" ? <em>{count}</em> : null}</button>)}</nav>)}</aside>;
}

function ClientsClean() {
  const api = useApi();
  const [page, go] = usePage();
  const [clients, setClients] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [draft, setDraft] = React.useState(EMPTY);
  const [notice, setNotice] = React.useState("Loading clients");
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    document.body.classList.add("ccNoScroll");
    document.documentElement.classList.add("ccNoScroll");
    return () => {
      document.body.classList.remove("ccNoScroll");
      document.documentElement.classList.remove("ccNoScroll");
    };
  }, []);

  const load = React.useCallback(async () => {
    const result = await api.get("/clients");
    const next = listOf(result).map(normaliseClient);
    setClients(next);
    setSelectedId((current) => current && next.some((client) => client.id === current) ? current : next[0]?.id || "");
    setNotice(next.length ? "Client record ready" : "Import CSV to load client records");
  }, [api]);

  React.useEffect(() => { load(); }, [load]);

  const selected = clients.find((client) => client.id === selectedId) || clients[0];

  React.useEffect(() => {
    if (!selected) { setDraft(EMPTY); return; }
    setDraft({
      name: selected.name,
      phone: selected.phone,
      email: selected.email,
      address: selected.address,
      serviceMemory: selected.serviceMemory,
      priceMemory: selected.priceMemory,
    });
  }, [selected?.id]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const first = await api.patch(`/clients/${selected.id}`, payload(draft));
    const result = first?.success ? first : await api.put(`/clients/${selected.id}`, payload(draft));
    setNotice(result?.success ? "Client saved" : result?.error || "Client save failed");
    await load();
    setSaving(false);
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const rows = parseCsv(await file.text()).map(csvClient).filter((row) => row.name).slice(0, 250);
    let count = 0;
    for (const row of rows) {
      const result = await api.post("/clients", row);
      if (result?.success) count += 1;
    }
    if (fileRef.current) fileRef.current.value = "";
    await load();
    setNotice(`${count} clients imported`);
    setSaving(false);
  };

  return <main className="ccRoot"><Sidebar page={page} go={go} count={clients.length} /><section className="ccPage"><aside className="ccListPane"><header><h1>Clients</h1><label><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={importCsv} />Import CSV</label></header><div className="ccListMeta"><b>{clients.length} clients</b><span>Tap one to edit the record.</span></div><div className="ccClientList">{clients.map((client) => <button key={client.id} type="button" className={client.id === selected?.id ? "active" : ""} onClick={() => setSelectedId(client.id)}><b>{client.name}</b><span>{client.jobs} jobs</span><small>{pick(client.phone, client.email, client.address, "Needs details")}</small></button>)}</div></aside><article className="ccFormPane"><header><h2>{draft.name || "Client record"}</h2><p>{notice}. Outgoing quotes, invoices and messages still wait in Command.</p></header><section className="ccFields"><label>Client name<input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label>Mobile / phone<input value={draft.phone} onChange={(event) => update("phone", event.target.value)} /></label><label>Email<input value={draft.email} onChange={(event) => update("email", event.target.value)} /></label><label>Site address<input value={draft.address} onChange={(event) => update("address", event.target.value)} /></label><label className="memory">Service memory<textarea value={draft.serviceMemory} onChange={(event) => update("serviceMemory", event.target.value)} /></label><label className="memory">Price memory<textarea value={draft.priceMemory} onChange={(event) => update("priceMemory", event.target.value)} /></label></section><footer><button type="button" onClick={() => selected && setDraft({ name: selected.name, phone: selected.phone, email: selected.email, address: selected.address, serviceMemory: selected.serviceMemory, priceMemory: selected.priceMemory })}>Reset</button><button type="button" onClick={save} disabled={!selected || saving}>{saving ? "Saving" : "Save client"}</button></footer></article></section></main>;
}

export default function ChurvoxOSClientsClean() {
  const [page] = usePage();
  if (page !== "clients") return <ChurvoxOSRealAdminV3 />;
  return <ClientsClean />;
}
