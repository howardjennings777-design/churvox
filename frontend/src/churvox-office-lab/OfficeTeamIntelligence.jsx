import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { currentPlanForUser, PLAN_LABELS, planMeets } from "../churvox-fresh/planRules";
import {
  fetchOwnerIntelligenceSummary,
  prepareMoneyLeftBehind,
  prepareVoiceToBusiness,
  runWhatIfScenario,
  saveApprovalBudget,
  savePromiseMemory,
} from "./OfficeTeamIntelligenceApi";
import OfficeTeamSafeControls from "./OfficeTeamSafeControls";
import { rowKey, useOfficeTeamRows } from "./OfficeTeamLiveRows";
import "./OfficeTeamIntelligence.css";
import "./OfficeTeamGrowthDesk.css";

const FEATURES = [
  { key: "money_left_behind", label: "Money Left Behind", minimum: "start", promise: "Find completed work, extras, quotes and recurring money that still needs action." },
  { key: "growth_recovery", label: "Growth Recovery", minimum: "start", promise: "Find warm opportunities already hiding in quotes, clients, messages and spare capacity." },
  { key: "job_truth_receipt", label: "Job Truth Receipt", minimum: "start", promise: "One permanent receipt joining the job, proof, time, extras, invoice and owner decisions." },
  { key: "promise_memory", label: "Promise Memory", minimum: "start", promise: "Remember customer commitments and surface them before the next visit." },
  { key: "voice_to_business", label: "Voice-to-Business", minimum: "start", promise: "Turn natural speech into a connected draft without changing business records." },
  { key: "worker_proof_coach", label: "Worker Proof Coach", minimum: "crew", promise: "Tell workers exactly what evidence is missing before they leave the job." },
  { key: "explain_my_week", label: "Explain My Week", minimum: "operator", promise: "A plain-English replay of what happened, why it matters and the records behind it." },
  { key: "approval_budget", label: "Approval Budget", minimum: "operator", promise: "Control what interrupts the owner now, today or in a quiet batch." },
  { key: "what_if", label: "What Happens If?", minimum: "command", promise: "Safely model price, wage, capacity and schedule decisions without changing live data." },
];

const SAFE_TEXT = "Nothing sends, syncs, charges, files, pays or changes source records until the owner chooses a separate approved action.";
const PREVIEW_GROWTH = Object.freeze({
  quotes: [
    ["Aroha Property", "Exterior wash quote", "Sent 8 days ago", "Quote is still open and no follow-up decision is recorded."],
    ["Harbour Cafe", "Quarterly cleaning quote", "Draft ready", "Scope is prepared but the owner has not chosen the next step."],
  ],
  clients: [
    ["Mereana R.", "Regular garden service", "Rebook due", "The usual service cycle has passed with no future booking."],
    ["Northside Rentals", "Property maintenance", "Quiet client", "No recent work is recorded for a previously active client."],
  ],
  work: [
    ["Johnson lawn service", "Hedge maintenance", "Completed", "The completion note mentions future hedge maintenance."],
  ],
  schedule: [
    ["Thursday afternoon", "Two-hour opening", "Capacity gap", "A usable gap exists between booked jobs."],
  ],
  messages: [
    ["Sarah at Greenview", "Service enquiry", "Waiting for reply", "A customer message appears to need a response decision."],
  ],
});

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function featureAccess(summary, plan, feature) {
  const live = Array.isArray(summary?.features) ? summary.features.find((item) => item.key === feature.key) : null;
  return live ? Boolean(live.available) : planMeets(plan, feature.minimum);
}

function Loading() {
  return <section className="cvIntelEmpty"><strong>Checking the business</strong><p>Churvox is joining the real jobs, invoices, proof, time and client records.</p></section>;
}

function Locked({ feature, go }) {
  return (
    <section className="cvIntelLocked" data-feature-locked={feature.key}>
      <span>{PLAN_LABELS[feature.minimum] || feature.minimum} feature</span>
      <h3>{feature.label}</h3>
      <p>{feature.promise}</p>
      <strong>Available from {PLAN_LABELS[feature.minimum] || feature.minimum}.</strong>
      <button type="button" onClick={() => go?.("plans")}>See plan details</button>
    </section>
  );
}

export default function OfficeTeamIntelligence({ appMode = "owner", go }) {
  const { user } = useAuth();
  const plan = currentPlanForUser(user);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(appMode === "owner");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("money_left_behind");
  const [notice, setNotice] = useState("");

  async function load() {
    if (appMode !== "owner") {
      setLoading(false);
      setSummary(previewSummary(plan));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = await fetchOwnerIntelligenceSummary();
      if (body?.locked) throw new Error(body.detail || "Sign in as an owner.");
      setSummary(body);
    } catch (err) {
      setError(err?.message || "Churvox Intelligence could not refresh. Nothing was changed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [appMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = useMemo(() => FEATURES.map((feature) => ({ ...feature, available: featureAccess(summary, plan, feature) })), [summary, plan]);
  const current = cards.find((item) => item.key === selected) || cards[0];
  const coreAvailableCount = cards.filter((item) => item.key !== "growth_recovery" && item.available).length;

  return (
    <section className="cvSiteScreen cvIntel" data-churvox-intelligence="v1" data-plan={plan}>
      <header className="cvIntelHero">
        <div>
          <span>Churvox Intelligence · {PLAN_LABELS[plan] || plan}</span>
          <h1>Find what is unfinished. Recover what is being missed. Keep the owner in control.</h1>
          <p>Eight connected intelligence engines plus Growth Recovery use the same jobs, clients, proof, time and money records. They prepare decisions instead of silently running the business.</p>
          <small>{SAFE_TEXT}</small>
        </div>
        <div className="cvIntelHeroStats">
          <article><strong>{coreAvailableCount}</strong><span>intelligence engines</span></article>
          <article><strong>{summary?.money_left_behind?.finding_count ?? 0}</strong><span>money checks</span></article>
          <article><strong>{summary?.job_truth_receipts?.length ?? 0}</strong><span>truth receipts</span></article>
        </div>
      </header>

      <div className="cvIntelFeatureRail" role="tablist" aria-label="Churvox Intelligence tools">
        {cards.map((feature) => (
          <button
            key={feature.key}
            type="button"
            role="tab"
            aria-selected={selected === feature.key}
            className={selected === feature.key ? "active" : ""}
            onClick={() => { setSelected(feature.key); setNotice(""); }}
          >
            <span>{feature.available ? "Included" : `${PLAN_LABELS[feature.minimum]}+`}</span>
            <strong>{feature.label}</strong>
            <small>{feature.promise}</small>
          </button>
        ))}
      </div>

      {notice ? <div className="cvIntelNotice" role="status">{notice}</div> : null}
      {error ? <div className="cvIntelError" role="alert">{error}<button type="button" onClick={load}>Retry</button></div> : null}

      <main className="cvIntelWorkspace">
        {loading ? <Loading /> : !current.available ? <Locked feature={current} go={go} /> : (
          <FeaturePanel feature={current.key} summary={summary || previewSummary(plan)} setSummary={setSummary} setNotice={setNotice} appMode={appMode} go={go} />
        )}
      </main>
    </section>
  );
}

function FeaturePanel({ feature, summary, setSummary, setNotice, appMode, go }) {
  if (feature === "money_left_behind") return <MoneyLeftBehind data={summary.money_left_behind} setNotice={setNotice} />;
  if (feature === "growth_recovery") return <GrowthRecovery appMode={appMode} go={go} />;
  if (feature === "job_truth_receipt") return <TruthReceipts items={summary.job_truth_receipts || []} />;
  if (feature === "promise_memory") return <PromiseMemory data={summary.promise_memory} setSummary={setSummary} setNotice={setNotice} />;
  if (feature === "voice_to_business") return <VoiceToBusiness setNotice={setNotice} />;
  if (feature === "worker_proof_coach") return <WorkerProofCoach data={summary.worker_proof_coach} />;
  if (feature === "explain_my_week") return <ExplainMyWeek data={summary.explain_my_week} />;
  if (feature === "approval_budget") return <ApprovalBudget data={summary.approval_budget} setSummary={setSummary} setNotice={setNotice} />;
  if (feature === "what_if") return <WhatIf data={summary.what_if} setNotice={setNotice} />;
  return null;
}

function PanelHeader({ eyebrow, title, text }) {
  return <header className="cvIntelPanelHeader"><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>;
}

function MoneyLeftBehind({ data = {}, setNotice }) {
  const [busy, setBusy] = useState("");
  const findings = Array.isArray(data.findings) ? data.findings : [];
  async function prepare(item) {
    if (busy) return;
    setBusy(item.id);
    try {
      const result = await prepareMoneyLeftBehind(item.id);
      setNotice(result?.existing ? "This fix is already prepared for owner review." : `${item.recommended_action} is prepared for owner review. ${SAFE_TEXT}`);
    } catch (err) {
      setNotice(err?.message || "Could not prepare this fix. Nothing was changed.");
    } finally { setBusy(""); }
  }
  return (
    <section className="cvIntelPanel cvIntelMoney" data-intelligence-feature="money-left-behind">
      <PanelHeader eyebrow="Money Left Behind" title={`${money(data.potential_total)} may still need action`} text="This is not a sales forecast. Every item points to a structured job, invoice, quote, timer or recurring-work record." />
      <div className="cvIntelMetrics"><article><strong>{findings.length}</strong><span>checks</span></article><article><strong>{money(data.overdue_total)}</strong><span>already overdue</span></article><article><strong>{money(data.potential_total)}</strong><span>not fully closed</span></article></div>
      <div className="cvIntelList">
        {findings.length ? findings.map((item) => <article key={item.id}>
          <div><span>{String(item.kind || "check").replaceAll("_", " ")}</span><h3>{item.title}</h3><p>{item.reason}</p><small>Record: {item.record_id || "linked record"}</small></div>
          <aside><strong>{item.amount ? money(item.amount) : "Check"}</strong><button type="button" disabled={Boolean(busy)} onClick={() => prepare(item)}>{busy === item.id ? "Preparing…" : item.recommended_action}</button></aside>
        </article>) : <Empty title="No money left behind found" text="Churvox did not find completed work, extras, open timers, overdue invoices or recurring gaps needing action." />}
      </div>
    </section>
  );
}

function GrowthRecovery({ appMode = "owner", go }) {
  const allowFallback = appMode !== "owner";
  const quotes = useOfficeTeamRows("quotes", PREVIEW_GROWTH.quotes, { allowFallback, emptyMessage: "No quote records found yet." });
  const clients = useOfficeTeamRows("clients", PREVIEW_GROWTH.clients, { allowFallback, emptyMessage: "No client records found yet." });
  const work = useOfficeTeamRows("work", PREVIEW_GROWTH.work, { allowFallback, emptyMessage: "No work records found yet." });
  const schedule = useOfficeTeamRows("schedule", PREVIEW_GROWTH.schedule, { allowFallback, emptyMessage: "No schedule records found yet." });
  const messages = useOfficeTeamRows("messages", PREVIEW_GROWTH.messages, { allowFallback, emptyMessage: "No message records found yet." });
  const sources = useMemo(() => [
    { key: "quotes", label: "Quotes", state: quotes },
    { key: "clients", label: "Clients", state: clients },
    { key: "work", label: "Jobs", state: work },
    { key: "schedule", label: "Schedule", state: schedule },
    { key: "messages", label: "Messages", state: messages },
  ], [quotes, clients, work, schedule, messages]);
  const opportunities = useMemo(() => buildGrowthOpportunities(sources), [sources]);
  const lanes = useMemo(() => ["all", ...Array.from(new Set(opportunities.map((item) => item.lane)))], [opportunities]);
  const [lane, setLane] = useState("all");
  const filtered = lane === "all" ? opportunities : opportunities.filter((item) => item.lane === lane);
  const [selectedId, setSelectedId] = useState("");
  const selected = filtered.find((item) => item.id === selectedId) || filtered[0] || opportunities[0] || null;
  const liveSources = sources.filter((item) => item.state.isLive).length;
  const loadingSources = sources.filter((item) => item.state.isLoading).length;
  const urgentCount = opportunities.filter((item) => item.priority === "Top opportunity").length;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!selected && selectedId) setSelectedId("");
  }, [selected, selectedId]);

  return (
    <section className="cvIntelPanel cvGrowthDesk" data-intelligence-feature="growth-recovery">
      <PanelHeader eyebrow="Growth Recovery" title="Find warm work before spending money chasing cold leads" text="Churvox checks existing quotes, clients, jobs, schedule gaps and messages for clear follow-up opportunities. It prepares the next step; the owner still decides what happens." />
      <div className="cvGrowthMetrics">
        <article><strong>{opportunities.length}</strong><span>clear opportunities</span></article>
        <article><strong>{urgentCount}</strong><span>top opportunities</span></article>
        <article><strong>{loadingSources ? `${5 - loadingSources}/5` : liveSources || (allowFallback ? 5 : 0)}</strong><span>sources checked</span></article>
        <article><strong>0</strong><span>automatic messages</span></article>
      </div>

      <div className="cvGrowthSourceStrip" aria-label="Growth data sources">
        {sources.map((source) => <article key={source.key} data-state={growthSourceState(source.state)}><span>{source.label}</span><strong>{growthSourceLabel(source.state)}</strong><small>{source.state.label}</small></article>)}
      </div>

      {opportunities.length ? <>
        <div className="cvGrowthLaneBar" aria-label="Growth opportunity filters">
          {lanes.map((item) => <button key={item} type="button" className={lane === item ? "active" : ""} onClick={() => { setLane(item); setSelectedId(""); }}>{item === "all" ? "All opportunities" : item}</button>)}
        </div>
        <div className="cvGrowthWorkspace">
          <div className="cvGrowthOpportunityList">
            {filtered.map((item) => <button key={item.id} type="button" className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
              <span>{item.priority}</span><strong>{item.title}</strong><p>{item.subject}</p><small>{item.sourceLabel} · {item.status}</small>
            </button>)}
          </div>
          {selected ? <aside className="cvGrowthOpportunityDetail">
            <div className="cvGrowthDetailHeader"><span>{selected.lane}</span><em>{selected.priority}</em></div>
            <h3>{selected.title}</h3>
            <p>{selected.detail}</p>
            <dl>
              <div><dt>Record</dt><dd>{selected.subject}</dd></div>
              <div><dt>Evidence</dt><dd>{selected.evidence}</dd></div>
              <div><dt>Prepared next step</dt><dd>{selected.action}</dd></div>
              <div><dt>Owner control</dt><dd>Review, edit, approve or park</dd></div>
            </dl>
            <OfficeTeamSafeControls area="growth" record={growthRecord(selected)} primary="Prepare growth action" secondary="Review evidence" command="Prepare Command decision" />
            <button className="cvGrowthOpenCommand" type="button" onClick={() => go?.("command")}>Open Command</button>
            <small>{SAFE_TEXT}</small>
          </aside> : null}
        </div>
      </> : <Empty title="No clear growth opportunity found" text={loadingSources ? "Churvox is still checking the available records." : "No quote, rebooking, capacity or reply signal was strong enough to prepare. Churvox will not invent opportunities from weak data."} />}
    </section>
  );
}

function TruthReceipts({ items = [] }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id || items[0]?.job_id || "");
  useEffect(() => { if (!items.some((item) => (item.id || item.job_id) === selectedId)) setSelectedId(items[0]?.id || items[0]?.job_id || ""); }, [items, selectedId]);
  const selected = items.find((item) => (item.id || item.job_id) === selectedId) || items[0];
  return (
    <section className="cvIntelPanel" data-intelligence-feature="job-truth-receipt">
      <PanelHeader eyebrow="Job Truth Receipt" title="One evidence trail for every completed job" text="The receipt joins what was promised, proof, worker time, extras, invoice state and every saved owner decision." />
      {!items.length ? <Empty title="No completed-job receipts yet" text="A receipt is persisted when completed work can be connected to a real job ID." /> : <div className="cvIntelSplit">
        <div className="cvIntelChooser">{items.map((item) => <button key={item.id || item.job_id} type="button" className={(item.id || item.job_id) === (selected?.id || selected?.job_id) ? "active" : ""} onClick={() => setSelectedId(item.id || item.job_id)}><strong>{item.job_title}</strong><span>{item.invoice?.status || "invoice missing"}</span><small>{item.job_id}</small></button>)}</div>
        <article className="cvIntelReceipt">
          <span>Permanent job truth</span><h3>{selected?.job_title}</h3><dl>
            <div><dt>Proof</dt><dd>{selected?.proof?.count || 0} item(s)</dd></div>
            <div><dt>Worker time</dt><dd>{Number(selected?.worker_time?.hours || 0).toFixed(2)} hrs</dd></div>
            <div><dt>Extras</dt><dd>{money(selected?.extras?.amount)}</dd></div>
            <div><dt>Invoice</dt><dd>{selected?.invoice?.status || "missing"} · {money(selected?.invoice?.amount)}</dd></div>
            <div><dt>Closeout</dt><dd>{selected?.closeout?.status || "not started"}</dd></div>
          </dl>
          <section><strong>Promises carried into this job</strong>{selected?.promised?.length ? selected.promised.map((item) => <p key={item}>{item}</p>) : <p>No active client promise was linked.</p>}</section>
          <small>Source revision: {selected?.source_revision}</small>
        </article>
      </div>}
    </section>
  );
}

function PromiseMemory({ data = {}, setSummary, setNotice }) {
  const items = Array.isArray(data.items) ? data.items : [];
  const [form, setForm] = useState({ client_name: "", client_id: "", text: "", category: "service_promise" });
  const [busy, setBusy] = useState(false);
  async function save(event) {
    event.preventDefault();
    if (busy || form.text.trim().length < 3) return;
    setBusy(true);
    try {
      const result = await savePromiseMemory(form);
      setSummary((current) => ({ ...current, promise_memory: { items: [result.promise, ...((current?.promise_memory?.items || []).filter((item) => item.id !== result.promise?.id))] } }));
      setForm((current) => ({ ...current, text: "" }));
      setNotice(`Promise saved for future jobs. ${SAFE_TEXT}`);
    } catch (err) { setNotice(err?.message || "Promise could not be saved."); }
    finally { setBusy(false); }
  }
  return (
    <section className="cvIntelPanel" data-intelligence-feature="promise-memory">
      <PanelHeader eyebrow="Promise Memory" title="Remember commitments, not just notes" text="Store access rules, customer preferences and one-off promises so they can be checked against future work." />
      <div className="cvIntelSplit">
        <form className="cvIntelForm" onSubmit={save}><label><span>Client</span><input value={form.client_name} onChange={(event) => setForm({ ...form, client_name: event.target.value })} placeholder="Client name" /></label><label><span>Client ID (optional)</span><input value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} placeholder="Linked client ID" /></label><label className="wide"><span>Promise or preference</span><textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Never arrive before 9am. Text Sarah, not Mike." /></label><button type="submit" disabled={busy || form.text.trim().length < 3}>{busy ? "Saving…" : "Save promise"}</button><small>The owner explicitly saves each promise.</small></form>
        <div className="cvIntelMemoryList">{items.length ? items.map((item) => <article key={item.id || item.normalized_key}><span>{item.category || "promise"}</span><h3>{item.client_name || "Linked client"}</h3><p>{item.text}</p><small>{item.active === false ? "Inactive" : "Active for future work"}</small></article>) : <Empty title="No promises saved yet" text="Add the first commitment the business should never forget." />}</div>
      </div>
    </section>
  );
}

function VoiceToBusiness({ setNotice }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  function listen() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setNotice("Voice recognition is not available in this browser. Type the instruction instead."); return; }
    const recognition = new Recognition();
    recognition.lang = "en-NZ";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setNotice("Voice capture stopped. Nothing was prepared."); };
    recognition.onresult = (event) => setText(event.results?.[0]?.[0]?.transcript || "");
    recognition.start();
  }
  async function prepare() {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      const result = await prepareVoiceToBusiness(text);
      setDraft(result.draft);
      setNotice(`Voice instruction converted into an editable draft. ${SAFE_TEXT}`);
    } catch (err) { setNotice(err?.message || "The instruction could not be prepared."); }
    finally { setBusy(false); }
  }
  return (
    <section className="cvIntelPanel" data-intelligence-feature="voice-to-business">
      <PanelHeader eyebrow="Voice-to-Business" title="Say what needs doing. Check what Churvox understood." text="Speech is converted into a connected draft with client, service, date, hours and amount hints. It never skips owner review." />
      <div className="cvIntelVoice"><label><span>Instruction</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Book John for next Thursday, same mowing job as last month, add hedge trimming, around two hours, but don’t send anything." /></label><div><button type="button" onClick={listen}>{listening ? "Listening…" : "Use microphone"}</button><button type="button" disabled={busy || !text.trim()} onClick={prepare}>{busy ? "Preparing…" : "Prepare business draft"}</button></div></div>
      {draft ? <article className="cvIntelDraft"><span>Editable prepared draft</span><h3>{String(draft.intent || "draft").replaceAll("_", " ")}</h3><dl><div><dt>Client hint</dt><dd>{draft.client_hint || "Owner check"}</dd></div><div><dt>Date hint</dt><dd>{draft.date_hint || "Owner check"}</dd></div><div><dt>Hours</dt><dd>{draft.estimated_hours || "Owner check"}</dd></div><div><dt>Amount</dt><dd>{draft.amount ? money(draft.amount) : "Owner check"}</dd></div></dl><p>{draft.service}</p><small>{SAFE_TEXT}</small></article> : null}
    </section>
  );
}

function WorkerProofCoach({ data = {} }) {
  const items = Array.isArray(data.items) ? data.items : [];
  return (
    <section className="cvIntelPanel" data-intelligence-feature="worker-proof-coach">
      <PanelHeader eyebrow="Worker Proof Coach" title={`${data.needs_proof || 0} ${(data.needs_proof || 0) === 1 ? "job" : "jobs"} still need clearer proof`} text="Trade-aware checklists are also shown inside the real worker phone flow before Complete is accepted." />
      <div className="cvIntelProofGrid">{items.length ? items.map((item) => <article key={item.job_id}><span>{item.check?.ready ? "Ready" : `${item.check?.missing_count || 0} missing`}</span><h3>{item.job_title}</h3><p>{item.check?.ready ? "Required proof is present." : item.check?.missing?.map((missing) => missing.label).join(" · ")}</p><small>{item.job_id}</small></article>) : <Empty title="No assigned jobs need proof coaching" text="The coach appears when real job records are available." />}</div>
    </section>
  );
}

function ExplainMyWeek({ data = {} }) {
  const statements = Array.isArray(data.statements) ? data.statements : [];
  return (
    <section className="cvIntelPanel" data-intelligence-feature="explain-my-week">
      <PanelHeader eyebrow="Explain My Week" title="A business replay in plain English" text="Every statement includes the record IDs Churvox used. No unexplained score or mystery AI claim." />
      <div className="cvIntelMetrics"><article><strong>{data.metrics?.completed_jobs || 0}</strong><span>jobs completed</span></article><article><strong>{money(data.metrics?.invoice_value)}</strong><span>invoice value</span></article><article><strong>{data.metrics?.money_checks || 0}</strong><span>money checks</span></article><article><strong>{data.metrics?.missing_proof || 0}</strong><span>missing proof</span></article></div>
      <div className="cvIntelWeek">{statements.map((item) => <article key={item.title} data-level={item.level}><span>{item.level}</span><h3>{item.title}</h3><p>{item.detail}</p><small>{item.evidence_ids?.length ? `Evidence: ${item.evidence_ids.join(", ")}` : "No affected record"}</small></article>)}</div>
    </section>
  );
}

function ApprovalBudget({ data = {}, setSummary, setNotice }) {
  const [form, setForm] = useState(() => ({
    money_interrupt_amount: data.settings?.money_interrupt_amount ?? 1000,
    missing_proof: data.settings?.missing_proof || "today",
    open_timer: data.settings?.open_timer || "today",
    routine_batch: data.settings?.routine_batch || "evening",
  }));
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ money_interrupt_amount: data.settings?.money_interrupt_amount ?? 1000, missing_proof: data.settings?.missing_proof || "today", open_timer: data.settings?.open_timer || "today", routine_batch: data.settings?.routine_batch || "evening" }), [data]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await saveApprovalBudget(form);
      setSummary((current) => ({ ...current, approval_budget: result }));
      setNotice(`Approval Budget saved. It changes attention priority only; ${SAFE_TEXT}`);
    } catch (err) { setNotice(err?.message || "Approval Budget could not be saved."); }
    finally { setBusy(false); }
  }
  return (
    <section className="cvIntelPanel" data-intelligence-feature="approval-budget">
      <PanelHeader eyebrow="Approval Budget" title="Decide what deserves the owner now" text="Low-risk work can wait for a batch. Money, customer and proof problems can interrupt sooner. Approval is still required." />
      <div className="cvIntelSplit"><form className="cvIntelForm" onSubmit={save}><label><span>Interrupt me for money above</span><input type="number" min="0" step="50" value={form.money_interrupt_amount} onChange={(event) => setForm({ ...form, money_interrupt_amount: event.target.value })} /></label><Select label="Missing proof" value={form.missing_proof} onChange={(value) => setForm({ ...form, missing_proof: value })} /><Select label="Open timer" value={form.open_timer} onChange={(value) => setForm({ ...form, open_timer: value })} /><Select label="Routine admin" value={form.routine_batch} onChange={(value) => setForm({ ...form, routine_batch: value })} /><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save attention rules"}</button></form><div className="cvIntelBudgetBuckets">{["now", "today", "batch"].map((key) => <article key={key}><span>{key}</span><strong>{data.counts?.[key] || 0}</strong><p>{key === "now" ? "Interrupt-worthy" : key === "today" ? "Review today" : "Quiet approval batch"}</p></article>)}</div></div>
    </section>
  );
}

function Select({ label, value, onChange }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="now">Now</option><option value="today">Today</option><option value="evening">Evening batch</option><option value="batch">Next batch</option></select></label>;
}

function WhatIf({ data = {}, setNotice }) {
  const [scenario, setScenario] = useState("price_change");
  const [value, setValue] = useState(8);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  async function run(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = scenario === "add_worker" ? { scenario, weekly_hours: value } : scenario === "day_off" ? { scenario, affected_jobs: value } : { scenario, percent: value };
      const body = await runWhatIfScenario(payload);
      setResult(body);
      setNotice("Simulation complete. No live job, price, worker, schedule, invoice or record was changed.");
    } catch (err) { setNotice(err?.message || "Simulation could not run."); }
    finally { setBusy(false); }
  }
  return (
    <section className="cvIntelPanel" data-intelligence-feature="what-if">
      <PanelHeader eyebrow="What Happens If?" title="Test a business decision without touching the business" text="The simulator uses recorded 30-day totals and states its assumptions. It never edits live data." />
      <div className="cvIntelSplit"><form className="cvIntelForm" onSubmit={run}><label><span>Scenario</span><select value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="price_change">Change prices</option><option value="wage_change">Change wages</option><option value="add_worker">Add worker capacity</option><option value="day_off">Take a day off</option></select></label><label><span>{scenario === "add_worker" ? "Weekly hours" : scenario === "day_off" ? "Jobs affected" : "Percent change"}</span><input type="number" value={value} onChange={(event) => setValue(event.target.value)} /></label><button type="submit" disabled={busy}>{busy ? "Calculating…" : "Run safe simulation"}</button><small>Baseline: {data.baseline?.job_count || 0} jobs · {money(data.baseline?.revenue)}</small></form>{result ? <article className="cvIntelSimulation"><span>Simulation only</span><h3>{String(result.scenario).replaceAll("_", " ")}</h3><pre>{JSON.stringify(result.impact, null, 2)}</pre><strong>No records changed</strong>{result.assumptions?.map((item) => <p key={item}>{item}</p>)}</article> : <Empty title="Choose a scenario" text="Run a safe model to see the likely capacity or money impact." />}</div>
    </section>
  );
}

function Empty({ title, text }) {
  return <section className="cvIntelEmpty"><strong>{title}</strong><p>{text}</p></section>;
}

function buildGrowthOpportunities(sources = []) {
  const found = [];
  sources.forEach(({ key, label, state }) => {
    (Array.isArray(state?.rows) ? state.rows : []).forEach((row, index) => {
      const parts = Array.isArray(row) ? row.map((part) => String(part || "").trim()) : [String(row || "")];
      const subject = parts[0] || `${label} record`;
      const title = parts[1] || subject;
      const status = parts[2] || "Needs review";
      const detail = parts[3] || "This record contains a possible follow-up signal.";
      const text = parts.join(" ").toLowerCase();
      const match = growthRule(key, text);
      if (!match) return;
      found.push({
        id: `${key}-${index}-${slug(rowKey(parts))}`,
        source: key,
        sourceLabel: label,
        subject,
        title: match.title || title,
        status,
        detail,
        evidence: match.evidence,
        action: match.action,
        lane: match.lane,
        priority: match.priority,
      });
    });
  });
  return found
    .filter((item, index, list) => list.findIndex((other) => `${other.source}|${other.subject}|${other.title}` === `${item.source}|${item.subject}|${item.title}`) === index)
    .sort((a, b) => growthPriority(b.priority) - growthPriority(a.priority) || a.title.localeCompare(b.title))
    .slice(0, 16);
}

function growthRule(source, text) {
  const has = (pattern) => pattern.test(text);
  if (source === "quotes" && !has(/accepted|won|declined|rejected|expired|paid/)) {
    if (has(/sent|open|await|pending|draft|quote|follow/)) return { lane: "Quote follow-up", title: "Quote still needs a next step", evidence: "Open, sent or draft quote wording is present in the source record.", action: "Prepare a careful quote follow-up or owner review", priority: has(/sent|await|open/) ? "Top opportunity" : "Worth reviewing" };
  }
  if (source === "clients" && has(/rebook|due|quiet|inactive|no future|recurr|last visit|overdue service/)) return { lane: "Rebooking", title: "Existing client may be ready to rebook", evidence: "The client record contains a rebooking, quiet-client or service-cycle signal.", action: "Prepare a rebooking check with editable timing", priority: has(/due|no future|overdue/) ? "Top opportunity" : "Worth reviewing" };
  if (source === "work" && has(/complete|done|finished/) && has(/extra|maintenance|return|future|follow|next service|not invoiced/)) return { lane: "Next service", title: "Completed work points to another useful service", evidence: "A completed-work record also mentions extras, maintenance or future work.", action: "Prepare a next-service suggestion for owner review", priority: has(/extra|not invoiced/) ? "Top opportunity" : "Worth reviewing" };
  if (source === "schedule" && has(/gap|cancel|no.?show|unfilled|available|opening|space/)) return { lane: "Capacity", title: "Usable capacity may be recoverable", evidence: "The schedule record contains a gap, cancellation or available-capacity signal.", action: "Prepare a fill-the-gap plan using suitable existing clients", priority: has(/cancel|no.?show/) ? "Top opportunity" : "Worth reviewing" };
  if (source === "messages" && has(/unread|waiting|reply|no response|follow.?up|enquiry|inquiry/)) return { lane: "Reply recovery", title: "A customer conversation may need a reply", evidence: "The message record contains an unanswered, waiting or enquiry signal.", action: "Prepare an editable reply draft", priority: has(/enquiry|inquiry|waiting/) ? "Top opportunity" : "Worth reviewing" };
  return null;
}

function growthPriority(value) {
  return value === "Top opportunity" ? 2 : value === "Worth reviewing" ? 1 : 0;
}

function growthSourceState(state = {}) {
  if (state.isLoading) return "loading";
  if (state.isError) return "error";
  if (state.isLive) return "live";
  if (state.isFallback) return "preview";
  return "clear";
}

function growthSourceLabel(state = {}) {
  if (state.isLoading) return "Checking";
  if (state.isError) return "Unavailable";
  if (state.isLive) return `${state.rows.length} live`;
  if (state.isFallback) return `${state.rows.length} examples`;
  return "Clear";
}

function growthRecord(item = {}) {
  return [item.subject || "Growth record", item.title || "Growth opportunity", item.priority || "Needs review", `${item.detail || ""} Evidence: ${item.evidence || "linked source record"}. Prepared next step: ${item.action || "owner review"}.`];
}

function slug(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";
}

function previewSummary(plan) {
  const available = (minimum) => planMeets(plan, minimum);
  return {
    plan,
    features: FEATURES.filter((item) => item.key !== "growth_recovery").map((item) => ({ key: item.key, available: available(item.minimum), minimum_plan: item.minimum })),
    money_left_behind: { potential_total: 840, overdue_total: 310, finding_count: 2, findings: [{ id: "preview-money-1", kind: "completed_not_invoiced", record_id: "preview-job-1", title: "Completed service", amount: 530, reason: "Completed work has no linked invoice.", recommended_action: "Prepare invoice review" }, { id: "preview-money-2", kind: "overdue_invoice", record_id: "preview-invoice-1", title: "Overdue invoice", amount: 310, reason: "An invoice is overdue and still unpaid.", recommended_action: "Prepare payment follow-up" }] },
    job_truth_receipts: [{ id: "preview-receipt", job_id: "preview-job-1", job_title: "Completed service", proof: { count: 3 }, worker_time: { hours: 2.5 }, extras: { amount: 35 }, invoice: { status: "draft", amount: 530 }, closeout: { status: "owner review" }, promised: ["Text before arrival"], source_revision: "preview-only" }],
    promise_memory: { items: [{ id: "preview-promise", client_name: "Example client", text: "Text before arrival", category: "access" }] },
    worker_proof_coach: { needs_proof: 1, items: [{ job_id: "preview-job-2", job_title: "Garden tidy", check: { ready: false, missing_count: 2, missing: [{ label: "Show edges and tidy-up" }, { label: "Confirm gate secure" }] } }] },
    explain_my_week: { metrics: { completed_jobs: 8, invoice_value: 4200, money_checks: 2, missing_proof: 1 }, statements: [{ title: "8 jobs were completed", detail: "Recorded invoice value is $4,200.", level: "good", evidence_ids: ["preview-job-1"] }, { title: "$840 may still need action", detail: "Two structured money checks are waiting.", level: "attention", evidence_ids: ["preview-money-1"] }] },
    approval_budget: { settings: { money_interrupt_amount: 1000, missing_proof: "today", open_timer: "today", routine_batch: "evening" }, counts: { now: 1, today: 1, batch: 3 }, buckets: {} },
    what_if: { baseline: { job_count: 20, revenue: 10000, worker_cost: 3500 } },
  };
}
