import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import FreshPlans from "./FreshPlans";
import "./freshProductPages.css";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

function asArray(payload, key = "") {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "results", "records", "data", "jobs", "clients", "quotes", "invoices", "workers", "team", "members"]) {
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

function idOf(record, fallback = "") {
  const value = record?.id || record?._id || record?.job_id || record?.client_id || record?.quote_id || record?.invoice_id || record?.worker_id || fallback;
  if (value && typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || fallback || "");
  return String(value || fallback || "");
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function money(value) {
  const n = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
  return `$${Number.isFinite(n) ? n.toLocaleString("en-NZ", { maximumFractionDigits: 0 }) : "0"}`;
}

function amountOf(record) {
  const n = Number(String(record?.balance_due ?? record?.amount_due ?? record?.total ?? record?.amount ?? record?.price ?? record?.fixed_price ?? record?.quote_total ?? record?.invoice_total ?? 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function titleOf(record, fallback = "Untitled") {
  return pick(record, "title", "job_name", "job_title", "service_type", "description", "quote_number", "invoice_number", "name", "business_name") || fallback;
}

function clientOf(record) {
  return pick(record, "client_name", "customer_name", "client", "customer", "name", "business_name") || "No client";
}

function statusOf(record, fallback = "Ready") {
  return pick(record, "status", "job_status", "payment_status", "invoice_status", "quote_status", "worker_status") || fallback;
}

function dateText(record) {
  const raw = pick(record, "scheduled_date", "scheduled_at", "due_date", "date", "created_at", "updated_at");
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
}

function isComplete(record) {
  return /complete|done|finished|paid/i.test(statusOf(record));
}

function needsInvoice(job, invoices) {
  if (!/complete|done|finished/i.test(statusOf(job))) return false;
  const jobId = idOf(job);
  if (pick(job, "invoice_id", "invoice_number", "invoice_status")) return false;
  return !invoices.some((invoice) => {
    const linked = pick(invoice, "job_id", "linked_job_id", "source_job_id");
    const haystack = `${titleOf(invoice)} ${clientOf(invoice)} ${pick(invoice, "description", "notes")}`.toLowerCase();
    return (jobId && linked === jobId) || haystack.includes(titleOf(job).toLowerCase()) || haystack.includes(clientOf(job).toLowerCase());
  });
}

function useRecords(endpoint, key) {
  const { get } = useApi();
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await get(endpoint, { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || result?.detail || "Could not load records.");
      setRows(asArray(result.data, key));
    } catch (err) {
      setRows([]);
      setError(err?.message || "Could not load records.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, get, key]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const refresh = () => load();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  return { rows, loading, error, load };
}

function useMultiRecords(definitions) {
  const { get } = useApi();
  const [data, setData] = React.useState(() => Object.fromEntries(definitions.map((item) => [item.key, []])));
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const next = {};
    const failed = [];
    await Promise.all(definitions.map(async ({ key, endpoint }) => {
      try {
        const result = await get(endpoint, { timeout: 25000 });
        if (!result?.success) throw new Error(result?.error || result?.detail || key);
        next[key] = asArray(result.data, key);
      } catch {
        next[key] = [];
        failed.push(key);
      }
    }));
    setData(next);
    setError(failed.length ? `Could not refresh ${failed.join(", ")}.` : "");
    setLoading(false);
  }, [definitions, get]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const refresh = () => load();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  return { data, loading, error, load };
}

function go(onNavigate, page) {
  if (onNavigate) onNavigate(page);
}

function writeCommandSlip(item) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMMAND_INBOX_KEY) || "[]");
    const current = Array.isArray(parsed) ? parsed : [];
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([{ id: `local-${Date.now()}`, ...item, created_at: new Date().toISOString() }, ...current].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "command-slip" } }));
    return true;
  } catch {
    return false;
  }
}

function readCommandInbox() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMMAND_INBOX_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Metric({ label, value }) {
  return <div className="cvxMetric"><b>{value}</b><span>{label}</span></div>;
}

function RecordButton({ row, active, onClick, meta, note }) {
  return <button type="button" className={`cvxRecordButton ${active ? "active" : ""}`} onClick={onClick}><b>{titleOf(row, "Record")}</b><span>{meta}</span><small>{note}</small></button>;
}

function DetailBits({ items }) {
  return <div className="cvxBits">{items.map(([label, value]) => <div key={label}><span>{label}</span><b>{value || "Not set"}</b></div>)}</div>;
}

function Empty({ title, text }) {
  return <article className="cvxEmpty"><b>{title}</b><span>{text}</span></article>;
}

function MiniAction({ label, text, onClick, disabled }) {
  return <button type="button" className="cvxMiniAction" onClick={onClick} disabled={disabled}><b>{label}</b><span>{text}</span></button>;
}

export function ProductSmartHub({ onNavigate }) {
  const definitions = React.useMemo(() => [
    { key: "jobs", endpoint: "/jobs" },
    { key: "workers", endpoint: "/team/workers" },
    { key: "clients", endpoint: "/clients" },
    { key: "invoices", endpoint: "/invoices" },
    { key: "quotes", endpoint: "/quotes" },
  ], []);
  const { data, loading, error, load } = useMultiRecords(definitions);
  const jobs = data.jobs || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const workers = data.workers || [];
  const invoiceJobs = jobs.filter((job) => needsInvoice(job, invoices));
  const unassigned = jobs.filter((job) => !pick(job, "worker", "worker_name", "assigned_worker_name", "assigned_to"));
  const unpaid = invoices.filter((invoice) => !/paid|draft|void|cancel/i.test(lower(statusOf(invoice))) && amountOf(invoice) > 0);
  const staleQuotes = quotes.filter((quote) => !/accepted|declined|converted/i.test(lower(statusOf(quote, "Draft"))));
  const topIssue = invoiceJobs[0] || unpaid[0] || staleQuotes[0] || unassigned[0];

  function sendTop() {
    if (!topIssue) return;
    writeCommandSlip({
      title: `${titleOf(topIssue)} needs owner review`,
      summary: `${clientOf(topIssue)} - ${statusOf(topIssue)}`,
      page: invoiceJobs.includes(topIssue) ? "invoices" : unpaid.includes(topIssue) ? "payments" : staleQuotes.includes(topIssue) ? "quotes" : "jobs",
      action: invoiceJobs.includes(topIssue) ? "Prepare invoice" : unpaid.includes(topIssue) ? "Prepare payment follow-up" : staleQuotes.includes(topIssue) ? "Prepare quote follow-up" : "Prepare worker assignment check",
    });
    go(onNavigate, "command");
  }

  return (
    <section className="cvxOsPage cvxHubPage">
      <header className="cvxHubHero">
        <div className="cvxHubCopy"><span>Smart Hub</span><h1>What needs doing now?</h1><p>One owner screen. Work, money, proof and worker gaps are already sorted so the next decision is obvious.</p><div className="cvxHubButtons"><button type="button" onClick={() => go(onNavigate, "jobs")}>Add job</button><button type="button" onClick={sendTop} disabled={!topIssue}>Send top issue to Command</button><button type="button" onClick={load}>{loading ? "Refreshing" : "Refresh"}</button></div>{error ? <small>{error}</small> : null}</div>
        <div className="cvxHubSignal"><Metric label="jobs" value={loading ? "..." : jobs.length} /><Metric label="money waiting" value={unpaid.length} /><Metric label="needs invoice" value={invoiceJobs.length} /><Metric label="worker gaps" value={unassigned.length} /><Metric label="active workers" value={workers.length} /></div>
      </header>
      <main className="cvxHubCommandGrid">
        <section className="cvxTodayLane"><div><span>Run today</span><h2>Work board</h2><p>Jobs stay simple: who, where, worker, status and next money step.</p></div>{jobs.slice(0, 5).map((job, index) => <RecordButton key={idOf(job, index)} row={job} meta={`${clientOf(job)} - ${dateText(job)}`} note={pick(job, "address", "site_address", "service_address") || statusOf(job)} onClick={() => go(onNavigate, "jobs")} />)}{!jobs.length ? <Empty title="No jobs loaded" text="Add jobs or refresh when the API is ready." /> : null}</section>
        <section className="cvxDecisionLane"><span>Owner decision</span><h2>{topIssue ? titleOf(topIssue) : "Clean right now"}</h2><p>{topIssue ? `${clientOf(topIssue)} needs the next admin step prepared for approval.` : "No urgent admin issue is standing out."}</p><div className="cvxDecisionButtons"><button type="button" onClick={sendTop} disabled={!topIssue}>Prepare in Command</button><button type="button" onClick={() => go(onNavigate, "command")}>Open Command</button></div></section>
        <aside className="cvxQuietEngine"><h3>Silent engine</h3><MiniAction label="Invoices watched" text="Completed jobs become invoice prompts." onClick={() => go(onNavigate, "invoices")} /><MiniAction label="Quotes watched" text="Quiet quotes become follow-up prompts." onClick={() => go(onNavigate, "quotes")} /><MiniAction label="Workers watched" text="GPS, proof and time feed owner confidence." onClick={() => go(onNavigate, "workercommand")} /></aside>
      </main>
    </section>
  );
}

export function ProductCommand({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [rows, setRows] = React.useState(readCommandInbox);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("Command is checking approval work.");
  const [ownerNote, setOwnerNote] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await get("/ai-review-items?limit=120", { timeout: 25000 });
      const backend = result?.success ? asArray(result.data, "items").map((row) => ({ ...row, sourceMode: "backend" })) : [];
      const local = readCommandInbox().map((row) => ({ ...row, sourceMode: "local" }));
      setRows([...backend, ...local]);
      setMessage(backend.length || local.length ? "Prepared admin is ready for owner review." : "Nothing waiting for approval right now.");
    } catch (err) {
      setRows(readCommandInbox().map((row) => ({ ...row, sourceMode: "local" })));
      setMessage(err?.message || "Command could not refresh backend work.");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);
  const selected = rows.find((row, index) => idOf(row, `cmd-${index}`) === selectedId) || rows[0];
  React.useEffect(() => { setOwnerNote(pick(selected, "owner_note", "owner", "note")); }, [selected]);

  async function decide(action) {
    if (!selected) return;
    if (selected.sourceMode === "local") {
      setRows((current) => current.filter((row) => row !== selected));
      setMessage(action === "approve" ? "Approved locally. The decision is recorded in this session." : "Parked locally. Nothing was sent.");
      return;
    }
    const id = idOf(selected);
    if (!id) return;
    setBusy(action);
    try {
      const endpoint = action === "save" ? `/ai-review-items/${encodeURIComponent(id)}` : `/ai-review-items/${encodeURIComponent(id)}/${action === "approve" ? "approve" : "ignore"}`;
      const result = action === "save" ? await patch(endpoint, { note: ownerNote }, { timeout: 25000 }) : await post(endpoint, { note: ownerNote }, { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Decision could not save.");
      setMessage(action === "approve" ? "Approved. Churvox handled the prepared admin." : action === "save" ? "Edit saved. Still waiting for approval." : "Parked. Nothing was sent.");
      await load();
    } catch (err) {
      setMessage(err?.message || "Decision could not save.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="cvxOsPage cvxCommandPage">
      <header className="cvxCommandHeader"><div><span>Command Approval System</span><h1>Prepared by Churvox. Approved by owner.</h1><p>Admin Queue, prepared draft, proof, owner decision and memory. This is not a form page.</p></div><div><Metric label="waiting" value={loading ? "..." : rows.length} /><Metric label="money" value={rows.filter((row) => /invoice|payment|money|xero|accounting/i.test(`${row?.title || ""} ${row?.category || ""} ${row?.action || ""}`)).length} /><Metric label="mode" value="approve" /></div></header>
      <div className="cvxCommandPromise"><b>Memory example</b><span>Last time this client paid $85 for this type of job. Churvox prepared $85 again. Approve?</span></div>
      <main className="cvxCommandDeskV2">
        <section className="cvxQueueColumn"><header><span>Admin Queue</span><button type="button" onClick={load}>{loading ? "Checking" : "Check for work"}</button></header><div>{rows.length ? rows.map((row, index) => <RecordButton key={idOf(row, index)} row={row} active={(selected ? idOf(selected) : "") === idOf(row, `cmd-${index}`)} meta={pick(row, "category", "action", "group") || "Ready"} note={pick(row, "summary", "message", "prepared", "found") || "Prepared admin waiting for a decision."} onClick={() => setSelectedId(idOf(row, `cmd-${index}`))} />) : <Empty title="No approval work" text="Run Check for work or send an item from another page." />}</div></section>
        <section className="cvxPreparedColumn"><span>Prepared by Churvox</span>{selected ? <><h2>{titleOf(selected, "Prepared admin")}</h2><p>{pick(selected, "summary", "message", "description", "prepared") || "Churvox prepared this for owner review."}</p><DetailBits items={[["Action", pick(selected, "action", "type") || "Review and approve"], ["Client", pick(selected, "client_name", "customer_name", "client") || "Not found yet"], ["Amount", pick(selected, "amount", "total", "price") || "Not found yet"], ["Status", statusOf(selected, "open")]]} /><label className="cvxOwnerNote"><span>Owner edit</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Optional note before approval" /></label></> : <Empty title="No approval selected" text="Select a queue item or run Check for work." />}</section>
        <aside className="cvxOwnerColumn"><h2>Owner Decision</h2><p>{message}</p><MiniAction label={busy === "approve" ? "Approving" : "Approve"} text="Approve the prepared admin." onClick={() => decide("approve")} disabled={!selected || busy} /><MiniAction label={busy === "save" ? "Saving" : "Save edit"} text="Keep the owner edit without sending." onClick={() => decide("save")} disabled={!selected || busy} /><MiniAction label={busy === "ignore" ? "Parking" : "Park for now"} text="Do nothing yet." onClick={() => decide("ignore")} disabled={!selected || busy} /><MiniAction label="Open linked record" text="Jump to the likely source area." onClick={() => go(onNavigate, pick(selected, "page") || "jobs")} disabled={!selected} /></aside>
      </main>
    </section>
  );
}

export function ProductJobs({ onNavigate }) {
  const { rows, loading, error, load } = useRecords("/jobs", "jobs");
  const [selectedId, setSelectedId] = React.useState("");
  const selected = rows.find((row, index) => idOf(row, `job-${index}`) === selectedId) || rows[0];
  const unassigned = rows.filter((row) => !pick(row, "worker", "worker_name", "assigned_worker_name", "assigned_to"));
  const complete = rows.filter(isComplete);
  return (
    <section className="cvxOsPage cvxJobsPage">
      <header className="cvxJobsHeader"><div><span>Jobs</span><h1>The work board.</h1><p>Who, where, when, worker, proof and next money step. Recurring work lives here, not in the sidebar.</p></div><div><Metric label="jobs" value={loading ? "..." : rows.length} /><Metric label="complete" value={complete.length} /><Metric label="no worker" value={unassigned.length} /></div></header>
      <main className="cvxJobsBoard"><section className="cvxJobLane"><h2>Today and next</h2>{rows.slice(0, 10).map((job, index) => <RecordButton key={idOf(job, index)} row={job} active={(selected ? idOf(selected) : "") === idOf(job, `job-${index}`)} meta={`${clientOf(job)} - ${dateText(job)}`} note={pick(job, "address", "site_address", "service_address") || statusOf(job)} onClick={() => setSelectedId(idOf(job, `job-${index}`))} />)}{!rows.length ? <Empty title="No jobs loaded" text={error || "Create jobs or refresh the board."} /> : null}</section><section className="cvxJobStory"><span>Job story</span>{selected ? <><h2>{titleOf(selected, "Job")}</h2><p>{pick(selected, "notes", "description", "worker_notes") || "No notes saved yet."}</p><DetailBits items={[["Client", clientOf(selected)], ["Address", pick(selected, "address", "site_address", "service_address", "job_address") || "No address"], ["Worker", pick(selected, "worker", "worker_name", "assigned_worker_name", "assigned_to") || "Unassigned"], ["Price", amountOf(selected) ? money(amountOf(selected)) : "No price"], ["Date", dateText(selected)], ["Status", statusOf(selected)]]} /></> : <Empty title="Select job" text="The full job story appears here." />}</section><aside className="cvxJobOps"><h2>Next moves</h2><MiniAction label="New job" text="Create or book work." onClick={() => go(onNavigate, "jobs")} /><MiniAction label="Recurring setup" text="Repeat work belongs inside Jobs." onClick={() => go(onNavigate, "jobs")} /><MiniAction label="Worker view" text="Check GPS, time and proof." onClick={() => go(onNavigate, "workercommand")} /><MiniAction label="Refresh" text="Reload jobs." onClick={load} /></aside></main>
    </section>
  );
}

export function ProductClients({ onNavigate }) {
  const { rows, loading, error } = useRecords("/clients", "clients");
  const [selectedId, setSelectedId] = React.useState("");
  const selected = rows.find((row, index) => idOf(row, `client-${index}`) === selectedId) || rows[0];
  return (
    <section className="cvxOsPage cvxClientsPage"><header className="cvxClientHeader"><span>Clients</span><h1>Customer memory.</h1><p>Contact, site, history, value and what Churvox should remember before preparing the next admin step.</p><Metric label="clients" value={loading ? "..." : rows.length} /></header><main className="cvxClientMemory"><section>{rows.length ? rows.map((client, index) => <RecordButton key={idOf(client, index)} row={client} active={(selected ? idOf(selected) : "") === idOf(client, `client-${index}`)} meta={pick(client, "email", "phone", "mobile") || "No contact"} note={pick(client, "address", "service_address", "site_address") || "No address"} onClick={() => setSelectedId(idOf(client, `client-${index}`))} />) : <Empty title="No clients loaded" text={error || "Add a client to start building memory."} />}</section><article><span>Memory card</span>{selected ? <><h2>{titleOf(selected, "Client")}</h2><p>{pick(selected, "notes", "client_notes", "internal_notes") || "No client notes yet."}</p><DetailBits items={[["Email", pick(selected, "email", "client_email", "customer_email")], ["Phone", pick(selected, "phone", "mobile", "client_phone")], ["Service address", pick(selected, "address", "site_address", "service_address")], ["Last known value", amountOf(selected) ? money(amountOf(selected)) : "No value yet"]]} /><div className="cvxClientActions"><button type="button" onClick={() => go(onNavigate, "jobs")}>Create job</button><button type="button" onClick={() => go(onNavigate, "quotes")}>Create quote</button><button type="button" onClick={() => go(onNavigate, "command")}>Use in Command</button></div></> : <Empty title="Select client" text="Customer memory appears here." />}</article></main></section>
  );
}

function PipelinePage({ type, tone, endpoint, label, title, promise, onNavigate }) {
  const { rows, loading, error, load } = useRecords(endpoint, type);
  const [selectedId, setSelectedId] = React.useState("");
  const selected = rows.find((row, index) => idOf(row, `${type}-${index}`) === selectedId) || rows[0];
  const draft = rows.filter((row) => /draft/i.test(statusOf(row)));
  const sent = rows.filter((row) => /sent|viewed|unpaid|overdue/i.test(statusOf(row)));
  const done = rows.filter((row) => /accepted|paid|converted/i.test(statusOf(row)));
  return (
    <section className={`cvxOsPage cvxPipelinePage tone-${tone}`}><header><div><span>{label}</span><h1>{title}</h1><p>{promise}</p></div><div><Metric label="total" value={loading ? "..." : rows.length} /><Metric label="draft" value={draft.length} /><Metric label="waiting" value={sent.length} /><Metric label="done" value={done.length} /></div></header><main><section className="cvxPipelineRail"><h2>Pipeline</h2><MiniAction label="Draft" text={`${draft.length} waiting to finish.`} onClick={load} /><MiniAction label="Sent or waiting" text={`${sent.length} need visibility.`} onClick={load} /><MiniAction label="Accepted or paid" text={`${done.length} finished.`} onClick={load} /></section><section className="cvxPipelineList">{rows.length ? rows.map((row, index) => <RecordButton key={idOf(row, index)} row={row} active={(selected ? idOf(selected) : "") === idOf(row, `${type}-${index}`)} meta={`${clientOf(row)} - ${money(amountOf(row))}`} note={`${statusOf(row)} - ${dateText(row)}`} onClick={() => setSelectedId(idOf(row, `${type}-${index}`))} />) : <Empty title={`No ${label.toLowerCase()} loaded`} text={error || "Create or refresh records."} />}</section><section className="cvxMoneyDecision"><span>Prepared admin</span>{selected ? <><h2>{titleOf(selected, label)}</h2><p>{pick(selected, "notes", "description") || "No notes saved yet."}</p><DetailBits items={[["Client", clientOf(selected)], ["Amount", money(amountOf(selected))], ["Status", statusOf(selected)], ["Date", dateText(selected)]]} /><button type="button" onClick={() => { writeCommandSlip({ title: `${titleOf(selected, label)} needs owner review`, summary: `${clientOf(selected)} - ${money(amountOf(selected))}`, page: type, action: type === "invoices" ? "Prepare payment or sync decision" : "Prepare quote follow-up" }); go(onNavigate, "command"); }}>Send to Command</button></> : <Empty title="Select record" text="The money decision appears here." />}</section></main></section>
  );
}

export function ProductQuotes(props) {
  return <PipelinePage {...props} type="quotes" tone="quote" endpoint="/quotes" label="Quotes" title="Offers that move." promise="Prepare the offer, watch quiet quotes, and turn accepted work into jobs without extra hunting." />;
}

export function ProductInvoices(props) {
  return <PipelinePage {...props} type="invoices" tone="invoice" endpoint="/invoices" label="Invoices" title="Money waiting, clearly controlled." promise="Draft, sent, overdue, paid and sync-ready. No surprise sends and no fake paid status without owner approval." />;
}

function workerPoint(worker) {
  const lat = Number(pick(worker, "last_lat", "gps_lat", "latitude", "lat", "last_latitude"));
  const lng = Number(pick(worker, "last_lng", "gps_lng", "longitude", "lng", "last_longitude"));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function ProductWorkers({ onNavigate }) {
  const { rows, loading, error, load } = useRecords("/team/workers", "workers");
  const [selectedId, setSelectedId] = React.useState("");
  const selected = rows.find((row, index) => idOf(row, `worker-${index}`) === selectedId) || rows[0];
  const point = selected ? workerPoint(selected) : null;
  const mapUrl = point ? `https://maps.google.com/maps?q=${point.lat},${point.lng}&z=17&output=embed` : "";
  return (
    <section className="cvxOsPage cvxWorkersPage"><header><div><span>Worker View</span><h1>Field command.</h1><p>GPS, current job, proof, alerts and time in one owner view. If GPS is not connected yet, the command centre still shows what is waiting.</p></div><div><Metric label="workers" value={loading ? "..." : rows.length} /><Metric label="gps" value={rows.filter(workerPoint).length} /><Metric label="on job" value={rows.filter((row) => pick(row, "current_job", "current_job_title", "current_job_id")).length} /></div></header><main><section className="cvxWorkerList">{rows.length ? rows.map((worker, index) => <RecordButton key={idOf(worker, index)} row={worker} active={(selected ? idOf(selected) : "") === idOf(worker, `worker-${index}`)} meta={pick(worker, "current_job", "current_job_title") || statusOf(worker, "Waiting")} note={workerPoint(worker) ? "GPS point saved" : "No GPS yet"} onClick={() => setSelectedId(idOf(worker, `worker-${index}`))} />) : <Empty title="No workers yet" text={error || "Add workers from Team. GPS appears when worker app sends location."} />}</section><section className="cvxLiveMap">{mapUrl ? <iframe title="Worker GPS map" src={mapUrl} loading="lazy" /> : <div><b>Live GPS map ready</b><span>Worker location, job site and route check appear here.</span></div>}</section><aside><MiniAction label="Refresh live" text="Reload worker state." onClick={load} /><MiniAction label="Open Team" text="Invite and manage people." onClick={() => go(onNavigate, "team")} /><MiniAction label="Time approval" text="Review time before payroll." onClick={() => go(onNavigate, "time")} /></aside></main></section>
  );
}

export function ProductTeam({ onNavigate }) {
  const { rows, loading, error, load } = useRecords("/team/workers", "workers");
  return <section className="cvxOsPage cvxTeamPage"><header><span>Team</span><h1>People and access.</h1><p>Team is for invites, roles and app access. Worker View is for live field operations.</p><div><Metric label="people" value={loading ? "..." : rows.length} /><Metric label="active" value={rows.filter((row) => /active|verified/i.test(statusOf(row, "Active"))).length} /><Metric label="pending" value={rows.filter((row) => /pending|invite/i.test(statusOf(row, ""))).length} /></div></header><main><section>{rows.length ? rows.map((person, index) => <RecordButton key={idOf(person, index)} row={person} meta={pick(person, "role", "team_role") || "Worker"} note={pick(person, "email", "phone") || statusOf(person)} onClick={() => {}} />) : <Empty title="No people loaded" text={error || "Add workers when ready."} />}</section><aside><MiniAction label="Add person" text="Invite worker or helper." onClick={load} /><MiniAction label="Open Worker View" text="GPS, proof and time." onClick={() => go(onNavigate, "workercommand")} /><MiniAction label="Open payroll" text="Pay summaries live there." onClick={() => go(onNavigate, "payroll")} /></aside></main></section>;
}

export function ProductSettings({ onNavigate }) {
  const { user } = useAuth();
  return <section className="cvxOsPage cvxSettingsPage"><header><span>Settings</span><h1>Set the rules once.</h1><p>Business details, GST/tax, invoice defaults, owner approval rules and the things that make daily admin shorter.</p></header><main><article><span>Business</span><h2>{user?.business_name || user?.business?.name || "Your business"}</h2><p>{user?.email || "Owner email will show here."}</p></article><article><span>Approval</span><h2>Churvox does the admin. You approve.</h2><p>Messages, invoices, follow-ups and accounting sync stay owner controlled.</p></article><article><span>Setup</span><h2>Less typing later</h2><p>Good defaults make jobs, quotes and invoices feel pre-filled.</p></article><aside><MiniAction label="Open Plans" text="Billing and tier access." onClick={() => go(onNavigate, "plans")} /><MiniAction label="Open Help" text="Get unstuck." onClick={() => go(onNavigate, "support")} /><MiniAction label="Open Command" text="Approval rules in action." onClick={() => go(onNavigate, "command")} /></aside></main></section>;
}

export function ProductHelp({ onNavigate }) {
  const [message, setMessage] = React.useState("I need help with Churvox setup. The part I am stuck on is: ");
  return <section className="cvxOsPage cvxHelpPage"><header><span>Help</span><h1>One clear next step.</h1><p>No manuals dumped on the owner. Pick the stuck area, send support, or move the issue to Command.</p></header><main><label><span>What is stuck?</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label><aside><MiniAction label="Email support" text="Send the current help note." onClick={() => { window.location.href = `mailto:hello@churvox.com?subject=Churvox support&body=${encodeURIComponent(message)}`; }} /><MiniAction label="Send to Command" text="Keep it in the owner desk." onClick={() => { writeCommandSlip({ title: "Support request", summary: message, page: "support", action: "Support follow-up" }); go(onNavigate, "command"); }} /><MiniAction label="Open Settings" text="Most setup lives there." onClick={() => go(onNavigate, "settings")} /></aside></main></section>;
}

export function ProductPlans(props) {
  return <FreshPlans {...props} />;
}
