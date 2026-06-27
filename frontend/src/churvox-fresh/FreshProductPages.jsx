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

function useRecords(endpoint, key, fallback = []) {
  const { get } = useApi();
  const [rows, setRows] = React.useState(fallback);
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
      setRows(fallback);
      setError(err?.message || "Could not load records.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, fallback, get, key]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const refresh = () => load();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    return () => window.removeEventListener("churvox:fresh-data-updated", refresh);
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

function pageNav(onNavigate, page) {
  if (onNavigate) onNavigate(page);
}

function ProductPage({ tone = "orange", label, title, promise, stats = [], lanes = [], actions = [], children, rail, footer }) {
  return (
    <section className={`cvxProductPage tone-${tone}`}>
      <header className="cvxProductHero">
        <div>
          <span>{label}</span>
          <h1>{title}</h1>
          <p>{promise}</p>
        </div>
        <aside>
          {stats.slice(0, 4).map((item) => (
            <button type="button" key={item.label} onClick={item.onClick} disabled={!item.onClick}>
              <b>{item.value}</b>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>
      </header>

      <section className="cvxProductIntent">
        {lanes.map((item) => <article className={item.tone || ""} key={item.title}><span>{item.kicker}</span><b>{item.title}</b><small>{item.text}</small></article>)}
      </section>

      <section className="cvxProductActions">
        {actions.map((item) => <button type="button" className={item.primary ? "primary" : ""} key={item.label} onClick={item.onClick}>{item.label}</button>)}
      </section>

      <section className="cvxProductWorkbench">
        <main>{children}</main>
        {rail ? <aside>{rail}</aside> : null}
      </section>
      {footer}
    </section>
  );
}

function RecordStack({ title, rows, empty, selectedId, onSelect, render }) {
  return (
    <section className="cvxStackPanel">
      <header><span>{title}</span><b>{rows.length}</b></header>
      <div>
        {rows.length ? rows.slice(0, 12).map((row, index) => render(row, index, idOf(row, `${title}-${index}`) === selectedId, () => onSelect?.(idOf(row, `${title}-${index}`)))) : <article className="cvxEmpty"><b>{empty}</b><small>When real records exist, Churvox shows the useful next action here.</small></article>}
      </div>
    </section>
  );
}

function DetailGrid({ items }) {
  return <div className="cvxDetailGrid">{items.map(([label, value]) => <div key={label}><span>{label}</span><b>{value || "Not set"}</b></div>)}</div>;
}

function ActionRail({ title = "Owner moves", items = [] }) {
  return <section className="cvxRailCard"><h2>{title}</h2>{items.map((item) => <button type="button" key={item.label} onClick={item.onClick} disabled={item.disabled}><b>{item.label}</b><span>{item.text}</span></button>)}</section>;
}

function readLocalCommandInbox() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMMAND_INBOX_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCommandSlip(item) {
  try {
    const current = readLocalCommandInbox();
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([{ id: `local-${Date.now()}`, ...item, created_at: new Date().toISOString() }, ...current].slice(0, 40)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "command-slip" } }));
    return true;
  } catch {
    return false;
  }
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
  const needInvoice = jobs.filter((job) => needsInvoice(job, invoices));
  const unpaid = invoices.filter((invoice) => !/paid|draft|void|cancel/i.test(lower(statusOf(invoice))) && amountOf(invoice) > 0);
  const oldQuotes = (data.quotes || []).filter((quote) => !/accepted|declined|converted/i.test(lower(statusOf(quote, "Draft"))));
  const adminDebt = needInvoice.length + unpaid.length + oldQuotes.slice(0, 3).length;

  function sendTop() {
    const job = needInvoice[0];
    const invoice = unpaid[0];
    const quote = oldQuotes[0];
    const source = job || invoice || quote;
    if (!source) return;
    writeCommandSlip({
      category: job ? "Invoice needed" : invoice ? "Payment follow-up" : "Quote follow-up",
      title: job ? `${titleOf(job)} needs an invoice` : invoice ? `${titleOf(invoice, "Invoice")} needs follow-up` : `${titleOf(quote, "Quote")} needs follow-up`,
      summary: job ? `${clientOf(job)} is complete and ready for invoice review.` : invoice ? `${clientOf(invoice)} has ${money(amountOf(invoice))} waiting.` : `${clientOf(quote)} has a quote waiting.`,
      page: job ? "invoices" : invoice ? "payments" : "quotes",
      action: job ? "Prepare invoice form" : invoice ? "Prepare payment follow-up" : "Prepare quote follow-up",
    });
    pageNav(onNavigate, "command");
  }

  return (
    <ProductPage
      tone="orange"
      label="Smart Hub"
      title="One screen for what matters today."
      promise="Run the day from here. Jobs stay visible, admin stays quiet, and only real owner decisions get pushed to Command."
      stats={[{ label: "jobs", value: loading ? "..." : jobs.length, onClick: () => pageNav(onNavigate, "jobs") }, { label: "needs invoice", value: needInvoice.length, onClick: () => pageNav(onNavigate, "invoices") }, { label: "admin debt", value: adminDebt, onClick: sendTop }, { label: "workers", value: (data.workers || []).length, onClick: () => pageNav(onNavigate, "workercommand") }]}
      lanes={[{ kicker: "First", title: "Do the work", text: "See today's jobs and open the work board without hunting." }, { kicker: "Quietly", title: "Churvox watches admin", text: "Done-not-invoiced, unpaid money, old quotes and missing proof are detected under the surface." }, { kicker: "Only then", title: "Owner approval", text: "Prepared admin moves to Command when a decision is actually needed.", tone: "decision" }]}
      actions={[{ label: "Add job", primary: true, onClick: () => pageNav(onNavigate, "jobs") }, { label: "Open Command", onClick: () => pageNav(onNavigate, "command") }, { label: loading ? "Refreshing" : "Refresh", onClick: load }]}
      rail={<ActionRail items={[{ label: "Send top admin issue", text: adminDebt ? "Move the most important admin item to Command." : "Nothing obvious waiting.", onClick: sendTop, disabled: !adminDebt }, { label: "Open workers", text: "GPS, proof and time live there.", onClick: () => pageNav(onNavigate, "workercommand") }, { label: "Open invoices", text: "Check money waiting and draft invoices.", onClick: () => pageNav(onNavigate, "invoices") }]} />}
    >
      {error ? <article className="cvxNotice"><b>Refresh note</b><span>{error}</span></article> : null}
      <section className="cvxHubGrid">
        <RecordStack title="Jobs needing attention" rows={[...needInvoice, ...jobs.filter((job) => !pick(job, "assigned_worker_name", "worker_name", "worker", "assigned_to")).slice(0, 4)]} empty="No urgent job issues" render={(job, index) => <button type="button" className="cvxRecord" key={idOf(job, index)} onClick={() => pageNav(onNavigate, "jobs")}><b>{titleOf(job)}</b><span>{clientOf(job)} - {dateText(job)}</span><small>{needsInvoice(job, invoices) ? "Completed and needs invoice" : "Needs worker or detail check"}</small></button>} />
        <RecordStack title="Money waiting" rows={unpaid} empty="No unpaid money found" render={(invoice, index) => <button type="button" className="cvxRecord money" key={idOf(invoice, index)} onClick={() => pageNav(onNavigate, "invoices")}><b>{titleOf(invoice, "Invoice")}</b><span>{clientOf(invoice)} - {money(amountOf(invoice))}</span><small>{statusOf(invoice, "Unpaid")}</small></button>} />
      </section>
    </ProductPage>
  );
}

export function ProductCommand({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [rows, setRows] = React.useState(readLocalCommandInbox);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [message, setMessage] = React.useState("Command is checking approval work.");
  const [ownerNote, setOwnerNote] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await get("/ai-review-items?limit=120", { timeout: 25000 });
      const backendRows = result?.success ? asArray(result.data, "items") : [];
      const localRows = readLocalCommandInbox();
      setRows([...backendRows.map((row) => ({ ...row, sourceMode: "backend" })), ...localRows.map((row) => ({ ...row, sourceMode: "local" }))]);
      setMessage(backendRows.length || localRows.length ? "Approval work is ready." : "Nothing waiting for approval right now.");
    } catch (err) {
      setRows(readLocalCommandInbox().map((row) => ({ ...row, sourceMode: "local" })));
      setMessage(err?.message || "Command could not refresh backend work.");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);
  const selected = rows.find((row, index) => idOf(row, `cmd-${index}`) === selectedId) || rows[0];

  React.useEffect(() => { setOwnerNote(pick(selected, "owner_note", "owner", "note")); }, [selectedId, selected]);

  async function decide(action) {
    if (!selected) return;
    if (selected.sourceMode === "local") {
      setRows((current) => current.filter((row) => row !== selected));
      setMessage(action === "approve" ? "Approved locally. Churvox will carry the decision into the next admin step." : "Parked locally. Nothing was sent.");
      return;
    }
    const id = idOf(selected);
    if (!id) return;
    setBusy(action);
    try {
      const endpoint = action === "save" ? `/ai-review-items/${encodeURIComponent(id)}` : `/ai-review-items/${encodeURIComponent(id)}/${action === "approve" ? "approve" : "ignore"}`;
      const result = action === "save" ? await patch(endpoint, { note: ownerNote }, { timeout: 25000 }) : await post(endpoint, { note: ownerNote }, { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || "Decision could not save.");
      setMessage(action === "approve" ? "Approved. Churvox handled the prepared admin." : action === "save" ? "Edit saved. It still waits for approval." : "Parked. Nothing was changed.");
      if (action !== "save") setSelectedId("");
      await load();
    } catch (err) {
      setMessage(err?.message || "Decision could not save.");
    } finally {
      setBusy("");
    }
  }

  const prepared = rows.filter((row) => !/closed|ignored|declined|approved/i.test(statusOf(row, "open")));
  const moneyRows = rows.filter((row) => /invoice|payment|money|xero|accounting/i.test(`${row?.title || ""} ${row?.category || ""} ${row?.action || ""}`));

  return (
    <ProductPage
      tone="dark"
      label="Command"
      title="Approval desk, not another dashboard."
      promise="Churvox prepares the admin underneath. You approve, save an edit, or park it. Nothing important goes out without owner control."
      stats={[{ label: "waiting", value: loading ? "..." : prepared.length }, { label: "money", value: moneyRows.length }, { label: "local notes", value: rows.filter((row) => row.sourceMode === "local").length }, { label: "mode", value: "approve" }]}
      lanes={[{ kicker: "Found", title: "What Churvox spotted", text: "Missing invoice, unpaid money, quote follow-up, worker proof or setup issue." }, { kicker: "Prepared", title: "Filled admin form", text: "The draft is shown as a simple owner decision instead of a blank workflow." }, { kicker: "Owner", title: "Approve, edit or park", text: "Command stays the decision desk.", tone: "decision" }]}
      actions={[{ label: busy === "scan" ? "Checking" : "Check for work", primary: true, onClick: load }, { label: "Open jobs", onClick: () => pageNav(onNavigate, "jobs") }, { label: "Open invoices", onClick: () => pageNav(onNavigate, "invoices") }]}
      rail={<ActionRail title="Decision controls" items={[{ label: busy === "approve" ? "Approving" : "Approve", text: "Approve the prepared admin exactly as shown.", onClick: () => decide("approve"), disabled: !selected || busy }, { label: busy === "save" ? "Saving" : "Save edit", text: "Keep the owner note with this approval item.", onClick: () => decide("save"), disabled: !selected || busy }, { label: busy === "ignore" ? "Parking" : "Park for now", text: "Nothing is sent or changed.", onClick: () => decide("ignore"), disabled: !selected || busy }]} />}
    >
      <article className="cvxNotice"><b>{message}</b><span>Owner approval stays the final control.</span></article>
      <section className="cvxCommandDesk">
        <RecordStack title="Approval queue" rows={rows} selectedId={selected ? idOf(selected) : ""} onSelect={setSelectedId} empty="Nothing waiting" render={(row, index, active, select) => <button type="button" key={idOf(row, index)} className={`cvxRecord ${active ? "active" : ""}`} onClick={select}><b>{titleOf(row, "Approval item")}</b><span>{pick(row, "category", "group", "action") || "Ready for owner"}</span><small>{pick(row, "summary", "message", "prepared", "found") || "Prepared admin waiting for a decision."}</small></button>} />
        <section className="cvxDecisionSlip">
          {selected ? <><span>{pick(selected, "category", "group", "source") || "Approval"}</span><h2>{titleOf(selected, "Prepared admin")}</h2><p>{pick(selected, "summary", "message", "description", "prepared") || "Churvox prepared this for owner review."}</p><DetailGrid items={[["Action", pick(selected, "action", "type") || "Review and approve"], ["Client", pick(selected, "client_name", "customer_name", "client") || "Not found yet"], ["Amount", pick(selected, "amount", "total", "price") || "Not found yet"], ["Status", statusOf(selected, "open")]]} /><label className="cvxTextField"><span>Owner note</span><textarea value={ownerNote} onChange={(event) => setOwnerNote(event.target.value)} placeholder="Optional edit before approving" /></label></> : <article className="cvxEmpty"><b>No item selected</b><small>Select a queue item or run Check for work.</small></article>}
        </section>
      </section>
    </ProductPage>
  );
}

function ProductRecordPage({ kind, tone, endpoint, keyName, label, title, promise, lanes, onNavigate, deriveStats, renderDetail, railItems }) {
  const { rows, loading, error, load } = useRecords(endpoint, keyName);
  const [selectedId, setSelectedId] = React.useState("");
  const selected = rows.find((row, index) => idOf(row, `${kind}-${index}`) === selectedId) || rows[0];
  const stats = deriveStats ? deriveStats(rows, selected, loading) : [{ label: kind, value: loading ? "..." : rows.length }];

  return (
    <ProductPage
      tone={tone}
      label={label}
      title={title}
      promise={promise}
      stats={stats}
      lanes={lanes}
      actions={[{ label: `New ${kind}`, primary: true, onClick: () => kind === "job" ? pageNav(onNavigate, "jobs") : kind === "client" ? pageNav(onNavigate, "clients") : pageNav(onNavigate, kind === "invoice" ? "invoices" : `${kind}s`) }, { label: loading ? "Refreshing" : "Refresh", onClick: load }, { label: "Send to Command", onClick: () => { if (selected) { writeCommandSlip({ title: `${titleOf(selected, label)} needs owner review`, summary: `${clientOf(selected)} - ${statusOf(selected)}`, page: keyName, action: "Review record" }); pageNav(onNavigate, "command"); } } }]}
      rail={<ActionRail items={railItems?.(selected, onNavigate) || []} />}
    >
      {error ? <article className="cvxNotice"><b>Refresh note</b><span>{error}</span></article> : null}
      <section className="cvxRecordWorkbench">
        <RecordStack title={`${label} list`} rows={rows} selectedId={selected ? idOf(selected) : ""} onSelect={setSelectedId} empty={`No ${label.toLowerCase()} yet`} render={(row, index, active, select) => <button type="button" key={idOf(row, index)} className={`cvxRecord ${active ? "active" : ""}`} onClick={select}><b>{titleOf(row, label)}</b><span>{clientOf(row)} - {statusOf(row)}</span><small>{dateText(row)} - {amountOf(row) ? money(amountOf(row)) : pick(row, "address", "email", "phone") || "Open record"}</small></button>} />
        <section className="cvxDetailPanel">{selected ? renderDetail(selected, rows) : <article className="cvxEmpty"><b>Select a record</b><small>The detail view appears here.</small></article>}</section>
      </section>
    </ProductPage>
  );
}

export function ProductJobs({ onNavigate }) {
  return <ProductRecordPage kind="job" tone="green" endpoint="/jobs" keyName="jobs" label="Jobs" title="Run work without thinking about admin." promise="Jobs is where the work lives: recurring work, worker, site, proof, timer and the next money step. Finished work can become a Command approval." onNavigate={onNavigate} lanes={[{ kicker: "Book", title: "Who, where, when", text: "Keep the job record short and usable in the field." }, { kicker: "Repeat", title: "Recurring lives here", text: "Weekly, fortnightly and monthly work belongs inside Jobs, not a separate sidebar hunt." }, { kicker: "Finish", title: "Proof feeds admin", text: "Time, notes and completion status help Churvox prepare invoice decisions.", tone: "decision" }]} deriveStats={(rows, selected, loading) => [{ label: "jobs", value: loading ? "..." : rows.length }, { label: "complete", value: rows.filter(isComplete).length }, { label: "unassigned", value: rows.filter((row) => !pick(row, "worker", "worker_name", "assigned_worker_name", "assigned_to")).length }, { label: "selected", value: selected ? statusOf(selected) : "none" }]} renderDetail={(job) => <><span>Job record</span><h2>{titleOf(job, "Job")}</h2><p>{pick(job, "notes", "description", "worker_notes") || "No notes saved yet."}</p><DetailGrid items={[["Client", clientOf(job)], ["Address", pick(job, "address", "site_address", "service_address", "job_address") || "No address"], ["Worker", pick(job, "worker", "worker_name", "assigned_worker_name", "assigned_to") || "Unassigned"], ["Price", amountOf(job) ? money(amountOf(job)) : "No price"], ["Date", dateText(job)], ["Status", statusOf(job)]]} /><section className="cvxMiniFlow"><b>Job -> Proof -> Invoice -> Command</b><span>The owner only steps in when a decision is needed.</span></section></>} railItems={(job, nav) => [{ label: "Open invoices", text: "Turn completed work into money.", onClick: () => pageNav(nav, "invoices") }, { label: "Open workers", text: "Check GPS, proof and time.", onClick: () => pageNav(nav, "workercommand") }, { label: "Open Command", text: "Review prepared admin.", onClick: () => pageNav(nav, "command") }]} />;
}

export function ProductClients({ onNavigate }) {
  return <ProductRecordPage kind="client" tone="blue" endpoint="/clients" keyName="clients" label="Clients" title="Customer memory, not just a contact list." promise="Clients should answer: who are they, where is the work, what happened last time, and what should Churvox remember for the next approval." onNavigate={onNavigate} lanes={[{ kicker: "Basics", title: "Contact and site", text: "Name, phone, email and service address stay clean." }, { kicker: "History", title: "Jobs and money connect", text: "A client record should explain the relationship fast." }, { kicker: "Memory", title: "Reuse what worked", text: "Notes, prices and preferences can guide future admin approvals.", tone: "decision" }]} deriveStats={(rows, selected, loading) => [{ label: "clients", value: loading ? "..." : rows.length }, { label: "with email", value: rows.filter((row) => pick(row, "email", "client_email", "customer_email")).length }, { label: "with address", value: rows.filter((row) => pick(row, "address", "site_address", "service_address")).length }, { label: "selected", value: selected ? "open" : "none" }]} renderDetail={(client) => <><span>Client record</span><h2>{titleOf(client, "Client")}</h2><p>{pick(client, "notes", "client_notes", "internal_notes") || "No client notes yet."}</p><DetailGrid items={[["Email", pick(client, "email", "client_email", "customer_email")], ["Phone", pick(client, "phone", "mobile", "client_phone", "customer_phone")], ["Address", pick(client, "address", "site_address", "service_address")], ["Type", pick(client, "type", "client_type") || "Client"]]} /><section className="cvxMiniFlow"><b>Client -> Job -> Quote -> Invoice</b><span>No retyping the same customer details.</span></section></>} railItems={(client, nav) => [{ label: "Create job", text: "Start work from this customer.", onClick: () => pageNav(nav, "jobs") }, { label: "Create quote", text: "Prepare price and scope.", onClick: () => pageNav(nav, "quotes") }, { label: "Open Command", text: "Use client memory for approvals.", onClick: () => pageNav(nav, "command") }]} />;
}

export function ProductQuotes({ onNavigate }) {
  return <ProductRecordPage kind="quote" tone="amber" endpoint="/quotes" keyName="quotes" label="Quotes" title="Short offer, clear next step." promise="Quotes should not become a paperwork maze. Prepare the offer, follow up when it goes quiet, and turn accepted work into a job." onNavigate={onNavigate} lanes={[{ kicker: "Prepare", title: "Scope and price", text: "The offer stays clear enough to approve quickly." }, { kicker: "Watch", title: "Quiet quotes surface", text: "Old sent quotes can become owner-approved follow-ups." }, { kicker: "Move", title: "Accepted becomes work", text: "Won work should flow into Jobs.", tone: "decision" }]} deriveStats={(rows, selected, loading) => [{ label: "quotes", value: loading ? "..." : rows.length }, { label: "draft", value: rows.filter((row) => /draft/i.test(statusOf(row))).length }, { label: "sent", value: rows.filter((row) => /sent/i.test(statusOf(row))).length }, { label: "value", value: money(rows.reduce((sum, row) => sum + amountOf(row), 0)) }]} renderDetail={(quote) => <><span>Quote record</span><h2>{titleOf(quote, "Quote")}</h2><p>{pick(quote, "notes", "description", "job_description") || "No quote note yet."}</p><DetailGrid items={[["Client", clientOf(quote)], ["Status", statusOf(quote, "Draft")], ["Value", money(amountOf(quote))], ["Address", pick(quote, "address", "site_address", "service_address") || "No address"], ["Date", dateText(quote)]]} /><section className="cvxMiniFlow"><b>Quote -> Follow-up -> Job</b><span>Churvox can prepare the nudge. You approve it.</span></section></>} railItems={(quote, nav) => [{ label: "Create job", text: "Move accepted work into Jobs.", onClick: () => pageNav(nav, "jobs") }, { label: "Prepare follow-up", text: "Send this to Command for approval.", onClick: () => { if (quote) writeCommandSlip({ title: `${titleOf(quote, "Quote")} follow-up`, summary: `${clientOf(quote)} quote needs a nudge.`, page: "quotes", action: "Prepare quote follow-up" }); pageNav(nav, "command"); } }, { label: "Open clients", text: "Check customer memory.", onClick: () => pageNav(nav, "clients") }]} />;
}

export function ProductInvoices({ onNavigate }) {
  return <ProductRecordPage kind="invoice" tone="money" endpoint="/invoices" keyName="invoices" label="Invoices" title="Money page, owner controlled." promise="Invoices keep the money clear: draft, sent, overdue, paid and sync-ready. Churvox can prepare follow-ups, but the owner stays in control." onNavigate={onNavigate} lanes={[{ kicker: "Draft", title: "From completed work", text: "Use job proof and price so invoices are not rebuilt from scratch." }, { kicker: "Watch", title: "Unpaid stays visible", text: "Waiting money is surfaced before it gets forgotten." }, { kicker: "Control", title: "No surprise sending", text: "Review before send, sync or payment changes.", tone: "decision" }]} deriveStats={(rows, selected, loading) => [{ label: "invoices", value: loading ? "..." : rows.length }, { label: "draft", value: rows.filter((row) => /draft/i.test(statusOf(row))).length }, { label: "overdue", value: rows.filter((row) => /overdue/i.test(statusOf(row))).length }, { label: "waiting", value: money(rows.filter((row) => !/paid|draft|void|cancel/i.test(lower(statusOf(row))) ).reduce((sum, row) => sum + amountOf(row), 0)) }]} renderDetail={(invoice) => <><span>Invoice record</span><h2>{titleOf(invoice, "Invoice")}</h2><p>{pick(invoice, "notes", "description") || "No invoice note yet."}</p><DetailGrid items={[["Client", clientOf(invoice)], ["Status", statusOf(invoice, "Draft")], ["Amount", money(amountOf(invoice))], ["Due", pick(invoice, "due_date", "due") || "No due date"], ["Sync", pick(invoice, "xero_sync_status", "myob_sync_status", "sync") || "Not synced"]]} /><section className="cvxMiniFlow"><b>Invoice -> Payment -> Accounting sync</b><span>Draft and sync decisions stay owner approved.</span></section></>} railItems={(invoice, nav) => [{ label: "Payment check", text: "Look at unpaid or overdue money.", onClick: () => pageNav(nav, "payments") }, { label: "Prepare follow-up", text: "Send payment admin to Command.", onClick: () => { if (invoice) writeCommandSlip({ title: `${titleOf(invoice, "Invoice")} payment follow-up`, summary: `${clientOf(invoice)} has ${money(amountOf(invoice))} waiting.`, page: "invoices", action: "Prepare payment follow-up" }); pageNav(nav, "command"); } }, { label: "Accounting sync", text: "Draft sync stays owner controlled.", onClick: () => pageNav(nav, "xero") }]} />;
}

export function ProductTeam({ onNavigate }) {
  return <ProductRecordPage kind="person" tone="team" endpoint="/team/workers" keyName="workers" label="Team" title="People, access and roles." promise="Team is the people directory. Workers is the live field view. Keep access, invite status and helper roles clean here." onNavigate={onNavigate} lanes={[{ kicker: "Access", title: "Who can do what", text: "Workers, helpers, payroll and managers stay separated." }, { kicker: "Invite", title: "Set up without drama", text: "Team should make it obvious who is active and who still needs setup." }, { kicker: "Field", title: "Live work is in Workers", text: "GPS, proof and time belong in the worker field view.", tone: "decision" }]} deriveStats={(rows, selected, loading) => [{ label: "people", value: loading ? "..." : rows.length }, { label: "active", value: rows.filter((row) => /active|verified/i.test(statusOf(row, "Active"))).length }, { label: "pending", value: rows.filter((row) => /pending|invite/i.test(statusOf(row, ""))).length }, { label: "selected", value: selected ? "open" : "none" }]} renderDetail={(person) => <><span>Person record</span><h2>{titleOf(person, "Team member")}</h2><p>{pick(person, "notes", "team_notes") || "No team notes yet."}</p><DetailGrid items={[["Role", pick(person, "role", "team_role", "worker_role") || "Worker"], ["Status", statusOf(person, "Active")], ["Email", pick(person, "email")], ["Phone", pick(person, "phone", "mobile")], ["Pay rate", pick(person, "pay_rate", "hourly_rate") || "Not set"], ["Current job", pick(person, "current_job", "current_job_title") || "Not assigned"]]} /></>} railItems={(person, nav) => [{ label: "Open Workers", text: "GPS, proof and time view.", onClick: () => pageNav(nav, "workercommand") }, { label: "Open payroll", text: "Review pay summaries.", onClick: () => pageNav(nav, "payroll") }, { label: "Open settings", text: "Business setup and owner rules.", onClick: () => pageNav(nav, "settings") }]} />;
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
    <ProductPage tone="field" label="Workers" title="Live field view for the owner." promise="Workers is where GPS, current job, proof, time and field confidence live. Team stays for people and access." stats={[{ label: "workers", value: loading ? "..." : rows.length }, { label: "with GPS", value: rows.filter(workerPoint).length }, { label: "on job", value: rows.filter((row) => pick(row, "current_job", "current_job_title", "current_job_id")).length }, { label: "proof", value: "field" }]} lanes={[{ kicker: "Where", title: "GPS and job site", text: "See where the worker last checked in." }, { kicker: "What", title: "Current job and status", text: "Know what is happening without a phone call." }, { kicker: "Proof", title: "Photos, notes and time", text: "Field evidence feeds owner approval later.", tone: "decision" }]} actions={[{ label: "Open Team", onClick: () => pageNav(onNavigate, "team") }, { label: loading ? "Refreshing" : "Refresh live", primary: true, onClick: load }, { label: "Open Jobs", onClick: () => pageNav(onNavigate, "jobs") }]} rail={<ActionRail items={[{ label: "Team access", text: "Add or invite workers from Team.", onClick: () => pageNav(onNavigate, "team") }, { label: "Time approval", text: "Review worker time before payroll.", onClick: () => pageNav(onNavigate, "time") }, { label: "Command", text: "Send proof issues to approval desk.", onClick: () => pageNav(onNavigate, "command") }]} />}
    >
      {error ? <article className="cvxNotice"><b>Refresh note</b><span>{error}</span></article> : null}
      <section className="cvxWorkerDeck">
        <RecordStack title="Workers" rows={rows} selectedId={selected ? idOf(selected) : ""} onSelect={setSelectedId} empty="No workers yet" render={(worker, index, active, select) => <button type="button" key={idOf(worker, index)} className={`cvxRecord ${active ? "active" : ""}`} onClick={select}><b>{titleOf(worker, "Worker")}</b><span>{pick(worker, "current_job", "current_job_title") || statusOf(worker, "Waiting")}</span><small>{workerPoint(worker) ? "GPS point saved" : "No GPS yet"}</small></button>} />
        <section className="cvxMapPanel">
          {mapUrl ? <iframe title="Worker GPS map" src={mapUrl} loading="lazy" /> : <div><b>GPS map waiting</b><span>When the worker app sends coordinates, the map appears here.</span></div>}
          {selected ? <DetailGrid items={[["Worker", titleOf(selected, "Worker")], ["Status", statusOf(selected, "Waiting")], ["Current job", pick(selected, "current_job", "current_job_title") || "Not assigned"], ["Last location", pick(selected, "last_location", "gps_address", "last_address") || (point ? `${point.lat}, ${point.lng}` : "No location")]]} /> : null}
        </section>
      </section>
    </ProductPage>
  );
}

export function ProductSettings({ onNavigate }) {
  const { user } = useAuth();
  return (
    <ProductPage tone="blue" label="Settings" title="Set the rules once." promise="Settings is where the business identity, region, GST/tax, invoice defaults and approval rules live so daily work stays simple." stats={[{ label: "business", value: user?.business_name || user?.business?.name ? "set" : "setup" }, { label: "owner", value: user?.email ? "signed in" : "check" }, { label: "approval", value: "owner" }, { label: "region", value: user?.country || "NZ" }]} lanes={[{ kicker: "Identity", title: "Business details", text: "Name, email, phone and region feed quotes and invoices." }, { kicker: "Money", title: "GST and invoice defaults", text: "Set defaults so forms are already half-filled." }, { kicker: "Rules", title: "Owner approval guardrails", text: "Churvox prepares admin work. You approve before action.", tone: "decision" }]} actions={[{ label: "Open plans", onClick: () => pageNav(onNavigate, "plans") }, { label: "Open help", onClick: () => pageNav(onNavigate, "support") }, { label: "Open Command", primary: true, onClick: () => pageNav(onNavigate, "command") }]} rail={<ActionRail items={[{ label: "Business profile", text: "Keep customer-facing details clean.", onClick: () => {} }, { label: "Approval rule", text: "Owner approval remains the default.", onClick: () => pageNav(onNavigate, "command") }, { label: "Need help", text: "Open setup help.", onClick: () => pageNav(onNavigate, "support") }]} />}
    >
      <section className="cvxSettingsBoard">
        <article><span>Business</span><h2>{user?.business_name || user?.business?.name || "Your business"}</h2><p>{user?.email || "Owner email will show here."}</p></article>
        <article><span>Default rule</span><h2>Prepare, then approve</h2><p>Customer messages, invoices, payment follow-ups and accounting sync stay owner controlled.</p></article>
        <article><span>Setup path</span><h2>Keep forms short</h2><p>Good settings mean jobs, quotes and invoices need fewer clicks later.</p></article>
      </section>
    </ProductPage>
  );
}

export function ProductHelp({ onNavigate }) {
  const [message, setMessage] = React.useState("I need help with Churvox setup. The part I am stuck on is: ");
  function sendToCommand() {
    writeCommandSlip({ title: "Support request", summary: message, page: "support", action: "Support follow-up" });
    pageNav(onNavigate, "command");
  }
  return (
    <ProductPage tone="help" label="Help" title="One clear next step." promise="Help should not bury the owner in a manual. Pick the stuck area, send a support request, or turn it into a Command item." stats={[{ label: "email", value: "hello" }, { label: "setup", value: "open" }, { label: "command", value: "copy" }, { label: "trust", value: "plain" }]} lanes={[{ kicker: "Setup", title: "Get unstuck fast", text: "Business profile, team, imports, invoices and accounting handoff." }, { kicker: "Support", title: "Email and Command trail", text: "Support requests can also become approval desk items." }, { kicker: "Safety", title: "Plain owner rules", text: "No surprise sending, no hidden money actions.", tone: "decision" }]} actions={[{ label: "Email support", primary: true, onClick: () => { window.location.href = `mailto:hello@churvox.com?subject=Churvox support&body=${encodeURIComponent(message)}`; } }, { label: "Send to Command", onClick: sendToCommand }, { label: "Open settings", onClick: () => pageNav(onNavigate, "settings") }]} rail={<ActionRail title="Help areas" items={[{ label: "Setup", text: "Business profile, region, GST and first records.", onClick: () => pageNav(onNavigate, "settings") }, { label: "Billing", text: "Plans and add-ons stay visible.", onClick: () => pageNav(onNavigate, "plans") }, { label: "Command", text: "Approval desk and owner decisions.", onClick: () => pageNav(onNavigate, "command") }]} />}
    >
      <section className="cvxSupportComposer"><label><span>What is stuck?</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label><article><b>Support rule</b><span>The answer should leave the owner knowing exactly what to do next.</span></article></section>
    </ProductPage>
  );
}

export function ProductPlans(props) {
  return <FreshPlans {...props} />;
}
