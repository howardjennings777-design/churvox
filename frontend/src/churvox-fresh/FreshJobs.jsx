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
    notes: pick(job, "worker_notes", "notes", "description", "job_notes") || "No notes yet",
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
    { label: "Paid", state: paid ? "done" : "open", detail: paid ? "Payment confirmed" : "Needs check" },
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

function photoCount(job) {
  if (Array.isArray(job?.photos)) return job.photos.length;
  if (Array.isArray(job?.photo_urls)) return job.photo_urls.length;
  if (Array.isArray(job?.attachments)) return job.attachments.filter((item) => /image|photo/i.test(String(item?.type || item?.url || item))).length;
  return Number(job?.photo_count || job?.photos_count || 0) || 0;
}

function proofPackSignal(selected) {
  if (!selected) return { label: "No job selected", tone: "need", detail: "Select a job first.", blockers: ["No job selected"] };
  const blockers = [];
  const photos = photoCount(selected);
  const hasNote = String(selected.notes || "").trim() && selected.notes !== "No notes yet";
  if (selected.status !== "Completed") blockers.push("Job not completed yet");
  if (!photos) blockers.push("No photo proof");
  if (!hasNote) blockers.push("No worker note");
  if (!selected.address || selected.address === "No address") blockers.push("No address");
  if (!blockers.length) return { label: "Proof Pack ready", tone: "ready", detail: `${photos} photo${photos === 1 ? "" : "s"}, notes and address ready for owner review.`, blockers };
  return { label: "Proof needs work", tone: "need", detail: blockers.join(". "), blockers };
}

function invoiceReadiness(selected, related) {
  if (!selected) return { label: "No job selected", tone: "need", blockers: ["No job selected"], detail: "Select a job first." };
  const blockers = [];
  if (selected.priceMissing) blockers.push("Price missing");
  if (!selected.client || selected.client === "No client linked") blockers.push("Client missing");
  if (selected.status !== "Completed") blockers.push("Job not completed");
  if (!related.invoices.length && photoCount(selected) === 0) blockers.push("No proof attached");
  if (related.invoices.length) blockers.push("Invoice already linked - review before creating another");
  if (!blockers.length) return { label: "Ready to draft invoice", tone: "ready", blockers, detail: "Price, client, completed job and proof checks look clean." };
  return { label: "Fix before invoice", tone: "need", blockers, detail: blockers.join(". ") };
}

function commandText(selected, related) {
  const profit = profitSignal(selected, related.invoices);
  const proof = proofPackSignal(selected);
  const ready = invoiceReadiness(selected, related);
  return `Prepare owner review for job ${selected.title} for ${selected.client}. Status ${selected.status}. Worker ${selected.worker}. Price ${selected.price}. Address ${selected.address}. Quote count ${related.quotes.length}. Invoice count ${related.invoices.length}. Profit signal ${profit.label}: ${profit.detail}. Proof Pack ${proof.label}: ${proof.detail}. Invoice readiness ${ready.label}: ${ready.detail}. Owner approval required before customer contact, invoice send, Xero sync, or payment status change.`;
}

function proofCommandText(selected, proof) {
  return `Prepare a customer Proof Pack for job ${selected.title} for ${selected.client}. Include job summary, address ${selected.address}, worker ${selected.worker}, notes ${selected.notes}, photo count ${photoCount(selected)}, and status ${selected.status}. Readiness: ${proof.label}. Blockers: ${proof.blockers.join("; ") || "none"}. Owner must review before sharing any customer link.`;
}

function invoiceCommandText(selected, related, ready) {
  return `Prepare invoice readiness check for job ${selected.title} for ${selected.client}. Price ${selected.price}. Status ${selected.status}. Existing linked invoices ${related.invoices.length}. Proof photos ${photoCount(selected)}. Result ${ready.label}: ${ready.detail}. Keep invoice draft-only until owner approves. Do not auto-send, do not mark paid, do not sync accounting without owner approval.`;
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
  const proof = React.useMemo(() => proofPackSignal(selected), [selected]);
  const invoiceReady = React.useMemo(() => invoiceReadiness(selected, related), [selected, related]);

  const loadJobs = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/jobs", { timeout: 25000 });
    if (!res.success) { setJobs([]); setSelectedId(""); setError(res.error || "Could not load jobs"); setLoading(false); return; }
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

  async function prepareCommand(text, busyKey, fallback) {
    if (!selected) return;
    setBusy(busyKey);
    try {
      const result = await post("/tell-churvox/prepare", { text }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || fallback);
      onNavigate?.("command");
    } catch (err) {
      setError(err?.message || fallback);
    } finally {
      setBusy("");
    }
  }

  async function sendSelectedToCommand() {
    if (!selected) return;
    await prepareCommand(commandText(selected, related), "command", "Could not prepare job story for approval.");
  }

  async function prepareProofPack() {
    if (!selected) return;
    await prepareCommand(proofCommandText(selected, proof), "proof", "Could not prepare Proof Pack review.");
  }

  async function prepareInvoiceReadiness() {
    if (!selected) return;
    await prepareCommand(invoiceCommandText(selected, related, invoiceReady), "invoice-check", "Could not prepare invoice readiness check.");
  }

  const filterPillStyle = (active) => active ? selectedFilterButtonStyle : undefined;
  const filterTextStyle = (active) => active ? selectedFilterTextStyle : undefined;
  const filterCountStyle = (active) => active ? selectedFilterCountStyle : undefined;

  return (
    <section className="freshJobsPage">
      <header className="freshHero"><span>Jobs ready to review</span><h1>Jobs</h1><p>Churvox connects the client, quote, worker, proof, invoice, payment check and next owner decision in one job story.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{jobs.length}</h2><p>Jobs Churvox found</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Ready").length}</h2><p>Ready to check</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Blocked").length}</h2><p>Need owner review</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Jobs need attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={() => { loadJobs(); loadStory(); }}>Retry</button></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} style={filterPillStyle(filter === item)} onClick={() => setFilter(item)}><span style={filterTextStyle(filter === item)}>{item}</span><b style={filterCountStyle(filter === item)}>{item === "All" ? jobs.length : jobs.filter((job) => job.status === item).length}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard"><h2>Job work</h2>{loading && jobs.length === 0 ? <div className="freshItem"><b>Loading jobs...</b><span>Checking your business account.</span></div> : visibleJobs.map((job) => <button type="button" className={`freshItem ${selected?.id === job.id ? "active" : ""} ${job.status === "Blocked" ? "need" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}><b>{job.title}</b><span>{job.client} - {job.status} - {job.scheduled}</span></button>)}{loading && jobs.length > 0 ? <div className="freshItem"><b>Refreshing jobs...</b><span>Showing current saved jobs while Churvox refreshes.</span></div> : null}{!loading && visibleJobs.length === 0 ? <div className="freshItem"><b>No job work waiting</b><span>When jobs exist, Churvox will show the connected admin and next owner decision here.</span></div> : null}</aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader"><div><small>Job story Churvox found</small><h2>{selected?.title || "Select job"}</h2></div>{selected ? <span className={selected.priceMissing ? "need" : "ready"}>{selected.priceMissing ? "Price needed" : "Story ready"}</span> : null}</div>
          {selected ? (<>
            <div className="freshMiniGrid freshJobsMiniGrid"><div><span>Client</span><b>{selected.client}</b></div><div><span>Status</span><b>{selected.status}</b></div><div><span>Worker</span><b>{selected.worker}</b></div><div className={selected.priceMissing ? "need" : ""}><span>Invoice readiness</span><b>{selected.priceMissing ? "Need price" : selected.price}</b></div></div>
            <section className="freshStoryRail">{steps.map((step) => <article key={step.label} className={step.state}><b>{step.label}</b><span>{step.detail}</span></article>)}</section>
            <section className={`freshQuoteNextBox ${profit.tone === "ready" ? "accepted" : "sent"}`}><span>Profit check</span><b>{profit.label}</b><p>{profit.detail}</p></section>
            <section className={`freshQuoteNextBox ${proof.tone === "ready" ? "accepted" : "sent"}`}><span>Proof Pack</span><b>{proof.label}</b><p>{proof.detail}</p></section>
            <section className={`freshQuoteNextBox ${invoiceReady.tone === "ready" ? "accepted" : "sent"}`}><span>Invoice check</span><b>{invoiceReady.label}</b><p>{invoiceReady.detail}</p></section>
            <section className="freshJobsDetailBox"><span>Address</span><b>{selected.address}</b></section>
            <section className="freshJobsDetailBox"><span>Scheduled</span><b>{selected.scheduled}</b></section>
            <section className="freshJobsDetailBox notes"><span>Prepared job notes</span><p>{selected.notes}</p></section>
            <section className="freshStoryLinks"><article><b>{related.quotes.length}</b><span>linked quote{related.quotes.length === 1 ? "" : "s"}</span></article><article><b>{related.invoices.length}</b><span>linked invoice{related.invoices.length === 1 ? "" : "s"}</span></article><article><b>{photoCount(selected)}</b><span>proof photo{photoCount(selected) === 1 ? "" : "s"}</span></article><article><b>{related.workers.length}</b><span>worker match</span></article></section>
            {storyLoading ? <div className="freshItem"><b>Refreshing Job Story...</b><span>Checking quotes, invoices, clients and workers.</span></div> : null}
          </>) : <div className="freshItem"><b>No job selected</b><span>When a job is ready, Churvox will show the connected quote, proof, invoice, payment and next decision here.</span></div>}
        </section>

        <aside className="freshCard freshJobsActionsCard"><h2>Owner actions</h2><p className="freshJobsActionHint">Churvox prepares the job admin. The owner approves the next move.</p><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={openBlankJob}>Prepare job</button><button className="freshOrange" type="button" disabled={!selected || selected.priceMissing} onClick={createInvoiceForSelected}>Prepare invoice</button><button className="freshDark" type="button" disabled={!selected || busy === "proof"} onClick={prepareProofPack}>{busy === "proof" ? "Preparing..." : "Prepare Proof Pack"}</button><button className="freshDark" type="button" disabled={!selected || busy === "invoice-check"} onClick={prepareInvoiceReadiness}>{busy === "invoice-check" ? "Checking..." : "Prepare invoice check"}</button><button className="freshDark" type="button" disabled={!selected || busy === "command"} onClick={sendSelectedToCommand}>{busy === "command" ? "Preparing..." : "Prepare next move"}</button><button className="freshGhost" type="button" disabled={!selected} onClick={() => onNavigate?.("portal")}>Prepare customer link</button><button className="freshGhost" type="button" onClick={() => { loadJobs(); loadStory(); }}>Refresh story</button></div></aside>
      </section>
    </section>
  );
}
