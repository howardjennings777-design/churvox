import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshJobsPolish.css";

const filters = ["All", "Ready", "In progress", "Blocked", "Completed"];
const STORY_ENDPOINTS = { quotes: "/quotes", invoices: "/invoices", clients: "/clients", workers: "/team/workers" };

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || value.job_id || value.quote_id || value.invoice_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function unpackList(payload, key = "") {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of ["jobs", "quotes", "invoices", "clients", "workers", "items", "records", "results", "data"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function statusLabel(value) {
  const text = lower(value).replace(/[_-]+/g, " ");
  if (/complete|done|finished/.test(text)) return "Completed";
  if (/progress|started|active/.test(text)) return "In progress";
  if (/block|hold|issue|missing|cancel/.test(text)) return "Blocked";
  return "Ready";
}

function dateScore(record) {
  const raw = record?.created_at || record?.createdAt || record?.scheduled_date || record?.updated_at || record?.date || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scheduleText(job) {
  const raw = job?.scheduled_date || job?.scheduled_at || job?.date || "";
  if (!raw) return "Not scheduled";
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return String(raw);
  return new Date(parsed).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function moneyNumber(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyText(job) {
  const amount = moneyNumber(job?.fixed_price ?? job?.price ?? job?.amount ?? job?.total ?? "");
  if (amount <= 0) return "Price missing";
  return money(amount);
}

function normalizeJob(job, index) {
  const title = pick(job, "title", "job_name", "name", "service_type", "job_type", "description") || `Job ${index + 1}`;
  const client = pick(job, "client_name", "customer_name", "client", "customer", "name") || "No client linked";
  const worker = pick(job, "assigned_worker_name", "worker_name", "worker", "assigned_worker", "assigned_to") || "Unassigned";
  const status = statusLabel(job?.status || job?.job_status);
  const price = moneyText(job);
  const missingPrice = price === "Price missing";
  return {
    ...job,
    id: normalizeId(job?.id || job?._id || job?.job_id) || `job-${index}`,
    title,
    client,
    clientId: normalizeId(job?.client_id || job?.customer_id),
    workerId: normalizeId(job?.worker_id || job?.assigned_worker_id || job?.assigned_to),
    address: pick(job, "address", "site_address", "service_address", "job_address") || "No address",
    status,
    worker,
    scheduled: scheduleText(job),
    price,
    priceAmount: moneyNumber(job?.fixed_price ?? job?.price ?? job?.amount ?? job?.total),
    priceMissing: missingPrice,
    notes: pick(job, "notes", "description", "job_notes") || "No notes yet",
    risk: status === "Blocked" ? "Needs owner review" : missingPrice ? "Price missing before invoice" : worker === "Unassigned" ? "Worker not assigned" : "Ready to dispatch",
    sortTime: dateScore(job),
  };
}

function recordClientName(record) {
  return lower(pick(record, "client_name", "customer_name", "client", "customer", "name", "business_name"));
}

function recordJobId(record) {
  return normalizeId(record?.job_id || record?.linked_job_id || record?.source_job_id || record?.jobId || record?.id || "");
}

function recordAmount(record) {
  return moneyNumber(record?.total ?? record?.amount ?? record?.price ?? record?.subtotal ?? record?.fixed_price ?? 0);
}

function recordStatus(record, fallback = "draft") {
  return String(record?.status || record?.payment_status || fallback).trim() || fallback;
}

function matchesJob(record, job) {
  if (!job || !record) return false;
  const recordJob = recordJobId(record);
  if (recordJob && recordJob === job.id) return true;
  const jobClient = lower(job.client);
  const recClient = recordClientName(record);
  const recText = lower(`${pick(record, "title", "job_description", "description", "notes", "address")} ${recClient}`);
  return Boolean(jobClient && recText.includes(jobClient)) || Boolean(job.address && lower(recText).includes(lower(job.address)));
}

function normalizeRelated(rows, selected) {
  return rows.filter((row) => matchesJob(row, selected)).sort((a, b) => dateScore(b) - dateScore(a));
}

function storyStepState({ selected, quotes, invoices }) {
  const hasQuote = quotes.length > 0;
  const hasInvoice = invoices.length > 0;
  const paid = invoices.some((invoice) => /paid|complete|closed/i.test(recordStatus(invoice)));
  return [
    { label: "Request", state: selected ? "done" : "open", detail: selected?.client || "No job" },
    { label: "Quote", state: hasQuote ? "done" : "open", detail: hasQuote ? `${quotes.length} linked` : "No quote linked" },
    { label: "Job", state: selected?.status === "Completed" ? "done" : "open", detail: selected?.status || "Not started" },
    { label: "Invoice", state: hasInvoice ? "done" : "open", detail: hasInvoice ? `${invoices.length} linked` : "Not invoiced" },
    { label: "Paid", state: paid ? "done" : "open", detail: paid ? "Paid-looking" : "Needs check" },
  ];
}

function profitSignal(selected, invoices) {
  if (!selected) return { label: "No job selected", tone: "need", detail: "Select a job first." };
  const revenue = invoices.reduce((sum, invoice) => sum + recordAmount(invoice), 0) || selected.priceAmount;
  const labourHours = moneyNumber(selected.hours || selected.total_hours || selected.duration_hours || selected.estimated_hours || 0);
  const labourCost = labourHours ? labourHours * 35 : 0;
  const materialCost = moneyNumber(selected.material_cost || selected.expense_total || selected.costs || 0);
  const profit = revenue - labourCost - materialCost;
  if (!revenue) return { label: "Price missing", tone: "need", detail: "Add a price before invoice or profit checks." };
  if (profit < revenue * 0.25) return { label: "Watch margin", tone: "need", detail: `${money(profit)} est. profit after known labour/material costs.` };
  return { label: "Healthy margin", tone: "ready", detail: `${money(profit)} est. profit from known data.` };
}

function commandText(selected, related) {
  const profit = profitSignal(selected, related.invoices);
  return `Prepare owner review for job ${selected.title} for ${selected.client}. Status ${selected.status}. Worker ${selected.worker}. Price ${selected.price}. Address ${selected.address}. Quote count ${related.quotes.length}. Invoice count ${related.invoices.length}. Profit signal ${profit.label}: ${profit.detail}. Owner approval required before customer contact, invoice send, Xero sync, or payment status change.`;
}

const selectedFilterButtonStyle = { background: "#111827", backgroundColor: "#111827", borderColor: "#111827", color: "#ffffff", WebkitTextFillColor: "#ffffff" };
const selectedFilterTextStyle = { color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1 };
const selectedFilterCountStyle = { background: "#f97316", backgroundColor: "#f97316", color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, borderRadius: "999px" };

export default function FreshJobs({ onNavigate }) {
  const { get, post } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [story, setStory] = React.useState({ quotes: [], invoices: [], clients: [], workers: [] });
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [storyLoading, setStoryLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");

  const visibleJobs = filter === "All" ? jobs : jobs.filter((job) => job.status === filter);
  const selected = jobs.find((job) => job.id === selectedId) || visibleJobs[0] || jobs[0];
  const related = React.useMemo(() => ({
    quotes: normalizeRelated(story.quotes, selected),
    invoices: normalizeRelated(story.invoices, selected),
    clients: story.clients.filter((client) => selected && (normalizeId(client.id || client._id) === selected.clientId || recordClientName(client) === lower(selected.client))),
    workers: story.workers.filter((worker) => selected && (normalizeId(worker.id || worker._id || worker.worker_id || worker.user_id) === selected.workerId || lower(pick(worker, "name", "full_name", "email")) === lower(selected.worker))),
  }), [story, selected]);
  const steps = React.useMemo(() => storyStepState({ selected, quotes: related.quotes, invoices: related.invoices }), [selected, related]);
  const profit = React.useMemo(() => profitSignal(selected, related.invoices), [selected, related.invoices]);

  const loadJobs = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/jobs", { timeout: 25000 });
    if (!res.success) { setJobs([]); setSelectedId(""); setError(res.error || "Could not load real jobs"); setLoading(false); return; }
    const nextJobs = hideDemoRecords(unpackList(res.data, "jobs")).map(normalizeJob).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setJobs(nextJobs);
    setSelectedId((current) => nextJobs.some((job) => job.id === current) ? current : nextJobs[0]?.id || "");
    setLoading(false);
  }, [get]);

  const loadStory = React.useCallback(async () => {
    setStoryLoading(true);
    const next = { quotes: [], invoices: [], clients: [], workers: [] };
    await Promise.all(Object.entries(STORY_ENDPOINTS).map(async ([key, endpoint]) => {
      try {
        const res = await get(endpoint, { timeout: 25000 });
        if (res?.success) next[key] = hideDemoRecords(unpackList(res.data, key));
      } catch {}
    }));
    setStory(next);
    setStoryLoading(false);
  }, [get]);

  React.useEffect(() => { loadJobs(); loadStory(); }, [loadJobs, loadStory]);
  React.useEffect(() => {
    const onFreshDataUpdated = () => { loadJobs(); loadStory(); };
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadJobs, loadStory]);
  React.useEffect(() => {
    if (!visibleJobs.length) return;
    if (!selectedId || !visibleJobs.some((job) => job.id === selectedId)) setSelectedId(visibleJobs[0].id);
  }, [visibleJobs, selectedId]);

  function openBlankJob() {
    window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search: "" } }));
  }

  function createInvoiceForSelected() {
    if (!selected) return;
    try { window.localStorage.setItem("churvox:selected-job-for-invoice", JSON.stringify({ id: selected.id, title: selected.title, client: selected.client, address: selected.address, price: selected.price, scheduled: selected.scheduled })); } catch {}
    onNavigate?.("invoices");
  }

  async function sendSelectedToCommand() {
    if (!selected) return;
    setBusy("command");
    try {
      const result = await post("/tell-churvox/prepare", { text: commandText(selected, related) }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not send job story to Command.");
      onNavigate?.("command");
    } catch (err) {
      setError(err?.message || "Could not send job story to Command.");
    } finally {
      setBusy("");
    }
  }

  const filterPillStyle = (active) => active ? selectedFilterButtonStyle : undefined;
  const filterTextStyle = (active) => active ? selectedFilterTextStyle : undefined;
  const filterCountStyle = (active) => active ? selectedFilterCountStyle : undefined;

  return (
    <section className="freshJobsPage">
      <header className="freshHero"><span>Churvox fresh - Jobs</span><h1>Jobs</h1><p>Job Story connects the client, quote, worker, invoice, payment check and next owner decision in one place.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{jobs.length}</h2><p>Total jobs</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Ready").length}</h2><p>Ready</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Blocked").length}</h2><p>Blocked</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Jobs need attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={() => { loadJobs(); loadStory(); }}>Retry</button></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} style={filterPillStyle(filter === item)} onClick={() => setFilter(item)}><span style={filterTextStyle(filter === item)}>{item}</span><b style={filterCountStyle(filter === item)}>{item === "All" ? jobs.length : jobs.filter((job) => job.status === item).length}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard"><h2>Job list</h2>{loading && jobs.length === 0 ? <div className="freshItem"><b>Loading real jobs...</b><span>Checking your business account.</span></div> : visibleJobs.map((job) => <button type="button" className={`freshItem ${selected?.id === job.id ? "active" : ""} ${job.status === "Blocked" ? "need" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}><b>{job.title}</b><span>{job.client} - {job.status} - {job.scheduled}</span></button>)}{loading && jobs.length > 0 ? <div className="freshItem"><b>Refreshing jobs...</b><span>Showing current saved jobs while Churvox refreshes.</span></div> : null}{!loading && visibleJobs.length === 0 ? <div className="freshItem"><b>No jobs yet</b><span>Create your first real job to start the workflow.</span></div> : null}</aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader"><div><small>Selected job story</small><h2>{selected?.title || "Select job"}</h2></div>{selected ? <span className={selected.priceMissing ? "need" : "ready"}>{selected.priceMissing ? "Price needed" : "Story ready"}</span> : null}</div>
          {selected ? (<>
            <div className="freshMiniGrid freshJobsMiniGrid"><div><span>Client</span><b>{selected.client}</b></div><div><span>Status</span><b>{selected.status}</b></div><div><span>Worker</span><b>{selected.worker}</b></div><div className={selected.priceMissing ? "need" : ""}><span>Invoice readiness</span><b>{selected.priceMissing ? "Need price" : selected.price}</b></div></div>
            <section className="freshStoryRail">{steps.map((step) => <article key={step.label} className={step.state}><b>{step.label}</b><span>{step.detail}</span></article>)}</section>
            <section className={`freshQuoteNextBox ${profit.tone === "ready" ? "accepted" : "sent"}`}><span>Profit Sense</span><b>{profit.label}</b><p>{profit.detail}</p></section>
            <section className="freshJobsDetailBox"><span>Address</span><b>{selected.address}</b></section>
            <section className="freshJobsDetailBox"><span>Scheduled</span><b>{selected.scheduled}</b></section>
            <section className="freshJobsDetailBox notes"><span>Job notes</span><p>{selected.notes}</p></section>
            <section className="freshStoryLinks"><article><b>{related.quotes.length}</b><span>linked quote{related.quotes.length === 1 ? "" : "s"}</span></article><article><b>{related.invoices.length}</b><span>linked invoice{related.invoices.length === 1 ? "" : "s"}</span></article><article><b>{related.clients.length}</b><span>client match</span></article><article><b>{related.workers.length}</b><span>worker match</span></article></section>
            {storyLoading ? <div className="freshItem"><b>Refreshing Job Story...</b><span>Checking quotes, invoices, clients and workers.</span></div> : null}
          </>) : <div className="freshItem"><b>No job selected</b><span>Create a job to see the connected story.</span></div>}
        </section>

        <aside className="freshCard freshJobsActionsCard"><h2>Owner actions</h2><p className="freshJobsActionHint">Use these for the selected job. Churvox prepares; owner decides.</p><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={openBlankJob}>New job</button><button className="freshOrange" type="button" disabled={!selected || selected.priceMissing} onClick={createInvoiceForSelected}>Create invoice</button><button className="freshDark" type="button" disabled={!selected || busy === "command"} onClick={sendSelectedToCommand}>{busy === "command" ? "Sending..." : "Send story to Command"}</button><button className="freshGhost" type="button" disabled={!selected} onClick={() => onNavigate?.("clients")}>Open client area</button><button className="freshGhost" type="button" onClick={() => { loadJobs(); loadStory(); }}>Refresh story</button></div></aside>
      </section>
    </section>
  );
}
