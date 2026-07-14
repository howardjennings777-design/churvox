import React, { useEffect, useState } from "react";
import {
  commitBusinessImport,
  createCustomerPortal,
  downloadBusinessPortabilityPack,
  fetchLaunchHardeningSummary,
  previewBusinessImport,
  recordJourneyCheckpoint,
  revokeCustomerPortal,
  saveRolePermissions,
  undoBusinessImport,
  undoRecoveryReceipt,
} from "./OfficeTeamLaunchHardeningApi";
import "./OfficeTeamLaunchHardening.css";

const TABS = [
  ["journey", "Golden Journey"],
  ["imports", "Bring My Business In"],
  ["permissions", "Permissions & security"],
  ["portal", "Customer portal"],
  ["recovery", "Recovery & undo"],
  ["portability", "Portability Pack"],
  ["evidence", "Measured outcomes"],
  ["offline", "Offline worker sync"],
];

const IMPORT_SAMPLE = `Customer,Mobile,Service Address,Notes
Jane Smith,021 555 0101,4 Harbour Road,Gate code in client notes
Tom Wilson,027 555 0184,19 Hill Street,Fortnightly lawns`;

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Empty({ title, text }) {
  return <article className="cvLaunchEmpty"><strong>{title}</strong><p>{text}</p></article>;
}

export default function OfficeTeamLaunchHardening({ go }) {
  const [summary, setSummary] = useState(null);
  const [active, setActive] = useState("journey");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const body = await fetchLaunchHardeningSummary();
      if (body?.locked) throw new Error(body.detail || "Sign in as the owner.");
      setSummary(body);
    } catch (loadError) {
      setError(loadError?.message || "Go Live & Trust could not load. Nothing was changed.");
    }
  }

  useEffect(() => {
    load();
    recordJourneyCheckpoint("go_live_visit", "golive").catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const features = Array.isArray(summary?.features) ? summary.features : [];
  const complete = summary?.journey?.complete_count || 0;
  const required = summary?.journey?.required_count || 0;

  return (
    <section className="cvSiteScreen cvLaunch" data-go-live-trust="v1">
      <header className="cvLaunchHero">
        <div><span>Go Live & Trust · {summary?.plan || "checking"}</span><h1>Get the business operating properly, then keep it safe.</h1><p>Bring existing work in, finish the first real job, control access, recover owner-approved changes and take the entire business back out whenever needed.</p><small>Trust controls are not upgrade bait. Churvox shows exactly what was prepared, changed and recoverable.</small></div>
        <div className="cvLaunchHeroStats"><article><strong>{complete}/{required || 8}</strong><span>go-live steps</span></article><article><strong>{summary?.portability?.record_count || 0}</strong><span>portable records</span></article><article><strong>{(summary?.recovery || []).filter((item) => item.reversible && item.status === "available").length}</strong><span>undo actions</span></article></div>
      </header>

      <div className="cvLaunchFeatureStrip" aria-label="Go Live trust features">
        {features.map((item) => <article key={item.key} data-available={item.available}><span>{item.available ? "Included" : `${item.minimum_plan}+`}</span><strong>{item.label}</strong></article>)}
      </div>

      <nav className="cvLaunchTabs" aria-label="Go Live and trust tools">
        {TABS.map(([key, label]) => <button key={key} type="button" className={active === key ? "active" : ""} onClick={() => { setActive(key); setNotice(""); }}>{label}</button>)}
      </nav>
      {notice ? <div className="cvLaunchNotice" role="status">{notice}</div> : null}
      {error ? <div className="cvLaunchError" role="alert">{error}<button type="button" onClick={load}>Retry</button></div> : null}

      {!summary && !error ? <Empty title="Checking the business" text="Churvox is checking real clients, jobs, receipts, invoices and safety records." /> : null}
      {summary && active === "journey" ? <Journey data={summary.journey} go={go} /> : null}
      {summary && active === "imports" ? <Imports setSummary={setSummary} busy={busy} setBusy={setBusy} setNotice={setNotice} /> : null}
      {summary && active === "permissions" ? <Permissions data={summary.permissions} security={summary.security} busy={busy} setBusy={setBusy} setSummary={setSummary} setNotice={setNotice} /> : null}
      {summary && active === "portal" ? <Portals items={summary.portals || []} busy={busy} setBusy={setBusy} setSummary={setSummary} setNotice={setNotice} /> : null}
      {summary && active === "recovery" ? <Recovery items={summary.recovery || []} busy={busy} setBusy={setBusy} setSummary={setSummary} setNotice={setNotice} /> : null}
      {summary && active === "portability" ? <Portability data={summary.portability} busy={busy} setBusy={setBusy} setNotice={setNotice} /> : null}
      {summary && active === "evidence" ? <Evidence data={summary.evidence} go={go} /> : null}
      {summary && active === "offline" ? <OfflineFeature feature={features.find((item) => item.key === "offline_worker_sync")} go={go} /> : null}
    </section>
  );
}

function PanelHeader({ eyebrow, title, text }) {
  return <header className="cvLaunchPanelHeader"><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>;
}

function Journey({ data = {}, go }) {
  const steps = Array.isArray(data.steps) ? data.steps : [];
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Golden Journey reliability" title={data.ready ? "The first real business journey is complete" : "Finish one real job from setup to invoice"} text="These are real record checks, not a pretend progress percentage. Each step opens the working Churvox page that owns it." /><div className="cvLaunchJourney">{steps.map((step, index) => <button key={step.key} type="button" data-complete={step.complete} onClick={() => go?.(step.screen)}><span>{step.complete ? "Done" : step.required ? `Step ${index + 1}` : "Optional"}</span><strong>{step.label}</strong><small>{step.complete ? "Confirmed from live records" : "Open the real working page"}</small></button>)}</div><div className="cvLaunchSafetyLine"><strong>Reliability rules</strong><span>Idempotent imports and worker sync</span><span>Duplicate-click protection</span><span>Persistent receipts</span><span>Clear recovery state</span></div></section>;
}

function Imports({ setSummary, busy, setBusy, setNotice }) {
  const [kind, setKind] = useState("clients");
  const [csvText, setCsvText] = useState(IMPORT_SAMPLE);
  const [preview, setPreview] = useState(null);
  async function previewRows() {
    setBusy("preview");
    try { const body = await previewBusinessImport(kind, csvText); setPreview(body.preview); setNotice(`${body.preview.ready_count} rows are ready. ${body.preview.needs_review_count} need owner review.`); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  }
  async function commit() {
    if (!preview?.preview_id) return;
    setBusy("commit");
    try {
      const body = await commitBusinessImport(preview.preview_id);
      setPreview((current) => ({ ...current, ...body.batch }));
      setSummary((current) => ({ ...current, imports: [body.batch, ...(current.imports || []).filter((item) => item.preview_id !== body.batch.preview_id)], recovery: body.receipt ? [body.receipt, ...(current.recovery || [])] : current.recovery }));
      setNotice(`${body.batch.inserted_count || 0} records imported. An undo receipt was saved.`);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  }
  async function undo() {
    if (!preview?.preview_id) return;
    setBusy("undo-import");
    try { const body = await undoBusinessImport(preview.preview_id); setPreview((current) => ({ ...current, ...body.result })); setNotice(`${body.result.removed_count} imported records removed. ${body.result.protected_count} later-edited records were protected.`); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  }
  const rows = Array.isArray(preview?.rows) ? preview.rows : [];
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Ten-minute onboarding and imports" title="Bring the business you already have" text="Paste CSV or copied spreadsheet rows. Churvox maps messy headings, identifies duplicates and refuses uncertain rows until the owner reviews them." /><div className="cvLaunchSplit"><form className="cvLaunchForm" onSubmit={(event) => { event.preventDefault(); previewRows(); }}><label><span>Import type</span><select value={kind} onChange={(event) => { setKind(event.target.value); setPreview(null); }}><option value="clients">Clients</option><option value="workers">Workers</option><option value="jobs">Jobs</option><option value="recurring_jobs">Recurring jobs</option><option value="quotes">Quotes</option><option value="invoices">Invoices</option></select></label><label className="wide"><span>Spreadsheet rows</span><textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} /></label><button type="submit" disabled={Boolean(busy)}>{busy === "preview" ? "Checking rows…" : "Preview without importing"}</button></form><article className="cvLaunchImportSummary"><span>Owner checkpoint</span><h3>{preview ? `${preview.ready_count} ready · ${preview.needs_review_count} review` : "Nothing imports during preview"}</h3><p>Churvox stores the preview, but creates no client, worker, job, quote or invoice until the owner approves this exact batch.</p>{preview ? <div><button type="button" disabled={Boolean(busy) || !preview.ready_count || preview.status === "committed"} onClick={commit}>{busy === "commit" ? "Importing…" : preview.status === "committed" ? "Imported" : `Approve ${preview.ready_count} ready rows`}</button>{preview.status === "committed" ? <button type="button" disabled={Boolean(busy)} onClick={undo}>{busy === "undo-import" ? "Undoing…" : "Undo this import"}</button> : null}</div> : null}</article></div>{rows.length ? <div className="cvLaunchImportRows">{rows.slice(0, 30).map((row) => <article key={`${row.row_number}-${row.identity}`} data-ready={row.ready}><span>Row {row.row_number}</span><strong>{row.mapped?.name || row.mapped?.title || row.mapped?.customer_name || "Needs a name"}</strong><small>{row.ready ? Object.keys(row.mapping || {}).map((key) => `${key} ← ${row.mapping[key]}`).join(" · ") : row.errors?.join(" · ")}</small></article>)}</div> : null}</section>;
}

function Permissions({ data = {}, security = {}, busy, setBusy, setSummary, setNotice }) {
  const policies = Array.isArray(data.policies) ? data.policies : [];
  async function restorePreset(item) {
    setBusy(`role-${item.role}`);
    try { const body = await saveRolePermissions(item.role, item.actions); setSummary((current) => ({ ...current, permissions: body.permissions, recovery: body.receipt ? [body.receipt, ...(current.recovery || [])] : current.recovery })); setNotice(`${item.label} permissions saved with a recovery receipt.`); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  }
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Permissions and security" title="Access is checked by the server, not only hidden in the screen" text="Every sensitive request remains business-scoped. Preset team roles begin at Crew; custom role overrides begin at Operator. Basic security and data ownership remain available to everyone." /><div className="cvLaunchSecurityGrid"><article><strong>{security.server_enforced_permissions ? "Server enforced" : "Needs attention"}</strong><span>permission checks</span></article><article><strong>{security.business_scoped_requests ? "Business scoped" : "Needs attention"}</strong><span>record isolation</span></article><article><strong>{security.backup_status === "confirmed" ? "Confirmed" : "Not claimed"}</strong><span>latest backup</span><small>{security.backup_message}</small></article><article><strong>{security.data_export_available ? "Available" : "Unavailable"}</strong><span>data export</span></article></div><div className="cvLaunchRoleGrid">{policies.map((item) => <article key={item.role}><span>{item.custom ? "Custom policy" : "Safe preset"}</span><h3>{item.label}</h3><p>{(item.actions || []).join(" · ")}</p><button type="button" disabled={Boolean(busy) || !data.team_role_management_available} onClick={() => restorePreset(item)}>{busy === `role-${item.role}` ? "Saving…" : data.team_role_management_available ? "Save this policy" : "Crew unlocks team roles"}</button></article>)}</div></section>;
}

function Portals({ items, busy, setBusy, setSummary, setNotice }) {
  const [form, setForm] = useState({ job_id: "", client_id: "", customer_name: "", job_title: "", customer_summary: "" });
  async function create(event) {
    event.preventDefault();
    setBusy("portal");
    try { const body = await createCustomerPortal(form); const portal = { ...body.portal, url: body.url }; setSummary((current) => ({ ...current, portals: [portal, ...(current.portals || [])], recovery: body.receipt ? [body.receipt, ...(current.recovery || [])] : current.recovery })); setNotice("Secure customer link created. Nothing was emailed automatically."); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  }
  async function revoke(item) {
    setBusy(`revoke-${item.id}`);
    try { await revokeCustomerPortal(item.id); setSummary((current) => ({ ...current, portals: (current.portals || []).map((portal) => portal.id === item.id ? { ...portal, status: "revoked" } : portal) })); setNotice("Portal revoked. The old link can no longer be used."); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  }
  async function copy(item) {
    const token = item.public_token || item.portal_token || item.client_portal_token;
    const url = `${window.location.origin}/client/${token}`;
    try { await navigator.clipboard.writeText(url); setNotice("Portal link copied. Churvox did not send it."); } catch { setNotice(url); }
  }
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Customer portal" title="One secure link for proof, approval and the next request" text="Customers can review approved work, request a correction, leave feedback or request more work. Every request returns to the business; no job, quote or invoice is created automatically." /><div className="cvLaunchSplit"><form className="cvLaunchForm" onSubmit={create}><label><span>Job ID</span><input value={form.job_id} onChange={(event) => setForm({ ...form, job_id: event.target.value })} /></label><label><span>Client ID</span><input value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} /></label><label><span>Customer</span><input value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} /></label><label><span>Work title</span><input value={form.job_title} onChange={(event) => setForm({ ...form, job_title: event.target.value })} /></label><label className="wide"><span>Owner-approved summary</span><textarea value={form.customer_summary} onChange={(event) => setForm({ ...form, customer_summary: event.target.value })} /></label><button type="submit" disabled={Boolean(busy)}>{busy === "portal" ? "Creating…" : "Create secure portal link"}</button></form><div className="cvLaunchPortalList">{items.length ? items.map((item) => <article key={item.id}><span>{item.status || "active"}</span><h3>{item.customer_name || "Customer portal"}</h3><p>{item.job_title || item.job_id || item.client_id}</p><div><button type="button" disabled={item.status === "revoked"} onClick={() => copy(item)}>Copy link</button><button type="button" disabled={Boolean(busy) || item.status === "revoked"} onClick={() => revoke(item)}>{busy === `revoke-${item.id}` ? "Revoking…" : "Revoke"}</button></div></article>) : <Empty title="No customer links yet" text="Create the first secure link from a real job or client." />}</div></div></section>;
}

function Recovery({ items, busy, setBusy, setSummary, setNotice }) {
  async function undo(item) {
    setBusy(`undo-${item.id}`);
    try { const body = await undoRecoveryReceipt(item.id); setSummary((current) => ({ ...current, recovery: (current.recovery || []).map((receipt) => receipt.id === item.id ? body.receipt : receipt) })); setNotice("The reversible internal action was undone and recorded."); }
    catch (error) { setNotice(error.message); }
    finally { setBusy(""); }
  }
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Recovery and undo" title="Show the owner what changed and what can be put back" text="External actions already delivered cannot be magically recalled. Churvox clearly separates reversible internal changes from actions requiring manual correction." /><div className="cvLaunchRecovery">{items.length ? items.map((item) => <article key={item.id} data-reversible={item.reversible}><span>{item.reversible ? item.status : "Manual correction"}</span><h3>{item.title}</h3><details><summary>Before and after</summary><pre>{JSON.stringify({ before: item.before, after: item.after }, null, 2)}</pre></details><button type="button" disabled={Boolean(busy) || !item.reversible || item.status !== "available"} onClick={() => undo(item)}>{busy === `undo-${item.id}` ? "Undoing…" : item.status === "undone" ? "Already undone" : item.reversible ? "Undo safely" : "Not automatically reversible"}</button></article>) : <Empty title="No recovery receipts yet" text="Imports, portal links and permission changes will leave a clear before/after receipt here." />}</div></section>;
}

function Portability({ data = {}, busy, setBusy, setNotice }) {
  const entries = Object.entries(data.collection_counts || {});
  async function download() { setBusy("download"); try { const result = await downloadBusinessPortabilityPack(); setNotice(`${result.filename} downloaded. Your business data remains yours.`); } catch (error) { setNotice(error.message); } finally { setBusy(""); } }
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Business Portability Pack" title="Take the whole business out in one organised ZIP" text="JSON preserves nested history and CSV supports spreadsheets. The pack includes clients, jobs, quotes, invoices, workers, time, proof, promises, Command decisions and audit records that belong to this business." /><div className="cvLaunchPortability"><article><strong>{data.record_count || 0}</strong><span>records ready</span><p>Your business belongs to you. Churvox will not use export lock-in as a retention strategy.</p><button type="button" disabled={Boolean(busy)} onClick={download}>{busy === "download" ? "Building pack…" : "Download my business"}</button></article><div>{entries.length ? entries.map(([name, count]) => <span key={name}><b>{name.replaceAll("_", " ")}</b>{count}</span>) : <Empty title="No records to export yet" text="Records will appear as the real business is set up." />}</div></div></section>;
}

function Evidence({ data = {}, go }) {
  const recovered = data.outcomes?.money_recovered || {};
  const promises = data.outcomes?.promise_performance || {};
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Evidence Drawer and measured outcomes" title="Prove what Churvox found without inventing value" text="Every outcome states the definition behind it. Money is not called recovered until linked invoice and payment records support it." /><div className="cvLaunchOutcomeGrid"><article><strong>{money(recovered.found)}</strong><span>found</span></article><article><strong>{money(recovered.prepared)}</strong><span>owner prepared</span></article><article><strong>{money(recovered.invoiced)}</strong><span>linked invoiced</span></article><article><strong>{money(recovered.paid)}</strong><span>linked paid</span></article></div><p className="cvLaunchDefinition">{recovered.definition}</p><div className="cvLaunchOutcomeSplit"><article><span>Promise performance</span><h3>{promises.receipts_with_promises || 0} completed jobs carried a promise</h3><p>{promises.active_promises || 0} active promises · {promises.truth_receipts || 0} truth receipts</p><small>{promises.definition}</small></article><article><span>Evidence rules</span>{(data.outcomes?.evidence_rules || []).map((rule) => <p key={rule}>{rule}</p>)}<button type="button" onClick={() => go?.("intelligence")}>Open Intelligence evidence</button></article></div></section>;

}

function OfflineFeature({ feature, go }) {
  return <section className="cvLaunchPanel"><PanelHeader eyebrow="Offline Worker Sync" title={feature?.available ? "Field work can wait safely for reception" : "Offline worker tools begin at Crew"} text="Assigned jobs are saved to the device. Status, notes, proof and completion use an idempotent queue with visible Saved offline, Waiting to sync, Synced and Needs attention states." /><div className="cvLaunchOfflineFlow"><article><strong>1</strong><h3>Saved on this device</h3><p>The worker sees the last confirmed assigned jobs and can keep working without reception.</p></article><article><strong>2</strong><h3>Queued once</h3><p>Every event has a permanent idempotency key, so reconnecting cannot duplicate completion or proof.</p></article><article><strong>3</strong><h3>Server rechecks</h3><p>Assignment and Proof Coach requirements are checked again before an offline event is applied.</p></article><article><strong>4</strong><h3>Visible result</h3><p>Applied events disappear from the queue. Conflicts remain as Needs attention instead of being silently lost.</p></article></div><button className="cvLaunchOpenWorker" type="button" disabled={!feature?.available} onClick={() => go?.("worker")}>{feature?.available ? "Open worker controls" : "Crew unlocks worker access"}</button></section>;
}
