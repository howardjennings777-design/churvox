// CHURVOX_OPERATOR_TOOLS_STABLE_WIRING_20260601
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./TopTierOperatorToolsPage.css";
import "./TopTierOperatorToolsAuditActions.css";

// Keep this page wired to stable live endpoints only. Older helper calls used
// /api/ai/audit-log, /api/proof-packs and /api/dispatch/board, which are not
// guaranteed live and caused noisy 404s in the browser network panel.

const hubLinks = [
  ["/dashboard", "Command Floor", "Return to the main owner approval flow."],
  ["/launch-control", "Launch Control", "See the simple operating model and what each top-tier tool is for."],
  ["/message-approvals", "Message approvals", "Review drafted customer emails, SMS notes and follow-ups."],
  ["/dispatch", "Dispatch board", "Plan jobs, assign crew and catch conflicts."],
  ["/trade-presets", "Trade presets", "Shape job types, invoice wording and AI suggestions by trade."],
  ["/offline-sync", "Offline sync", "Check queued field notes and sync actions from worker devices."],
  ["/invoices", "Money desk", "Open invoices, draft records and payment follow-up."],
];

const topTierFeatureList = [
  "Command Floor approval flow",
  "Customer records from clients, jobs, quotes and invoices",
  "Dispatch board from live jobs and workers",
  "Message approval workspace",
  "Plan and billing confidence",
  "Reports and data control",
  "Integrations workspace",
  "Automation workspace",
  "Offline worker sync workspace",
  "Trade presets workspace",
];

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function pickList(response, keys = []) {
  const data = response?.data ?? response;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return arr(data);
}

function idOf(item) {
  return String(item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || "");
}

function niceDate(value) {
  if (!value) return "Time not recorded";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" });
}

function customerName(record) {
  return record?.customer_name || record?.client_name || record?.name || record?.contact_name || "Customer";
}

function jobTitle(job) {
  return job?.title || job?.job_name || customerName(job) || "Job";
}

function proofTitle(job) {
  return jobTitle(job);
}

function proofBody(job) {
  return job?.ai_summary || job?.completion_notes || job?.notes || job?.description || "Completed work record ready for customer proof.";
}

function auditTitle(item) {
  return item?.action || item?.title || item?.invoice_number || item?.quote_number || jobTitle(item) || "Operator action";
}

function auditCopy(item) {
  return item?.note || item?.message || item?.description || item?.status || "Action recorded in the AI Operator flow.";
}

function auditTargetHref(item) {
  const id = idOf(item);
  if (!id) return "/operator-tools";
  if (item?.invoice_number || item?.amount_due) return `/invoices/${id}`;
  if (item?.quote_number) return `/quotes/${id}`;
  if (item?.job_name || item?.title || item?.scheduled_date) return `/jobs/${id}`;
  return "/operator-tools";
}

function auditText(item) {
  return [
    `Action: ${auditTitle(item)}`,
    `Note: ${auditCopy(item)}`,
    `Target: ${idOf(item) || "record"}`,
    `Time: ${niceDate(item?.created_at || item?.createdAt || item?.updated_at || item?.time)}`,
  ].join("\n");
}

function isComplete(job) {
  return String(job?.status || job?.job_status || "").toLowerCase().includes("complete");
}

export default function TopTierOperatorToolsPage() {
  const api = useApi();
  const [state, setState] = useState({ loading: true, error: "", audit: [], proofPacks: [], presets: [], jobs: [], invoices: [], quotes: [] });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const [jobsRes, invoicesRes, quotesRes] = await Promise.all([
        api.get("/jobs"),
        api.get("/invoices"),
        api.get("/quotes"),
      ]);

      if (!alive) return;

      const jobs = jobsRes.success ? pickList(jobsRes, ["jobs", "items", "results"]) : [];
      const invoices = invoicesRes.success ? pickList(invoicesRes, ["invoices", "items", "results"]) : [];
      const quotes = quotesRes.success ? pickList(quotesRes, ["quotes", "items", "results"]) : [];
      const proofPacks = jobs.filter(isComplete).slice(0, 6);
      const audit = [
        ...jobs.slice(0, 4).map((job) => ({ ...job, action: "Job in Command Floor" })),
        ...invoices.slice(0, 4).map((invoice) => ({ ...invoice, action: "Invoice in Money Desk" })),
        ...quotes.slice(0, 3).map((quote) => ({ ...quote, action: "Quote in Quotes" })),
      ];

      setState({
        loading: false,
        error: jobsRes.success ? "" : jobsRes.error || "Could not load operator data",
        audit,
        proofPacks,
        presets: [],
        jobs,
        invoices,
        quotes,
      });
    }
    load();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function copyProof(job, title) {
    const href = idOf(job) ? `${window.location.origin}/jobs/${idOf(job)}` : "";
    if (!href) {
      setNotice("This work record does not have a job link yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(href);
      setNotice(`Copied work proof link for ${title}.`);
    } catch {
      setNotice(href);
    }
  }

  async function copyAudit(item) {
    try {
      await navigator.clipboard.writeText(auditText(item));
      setNotice(`Copied audit record: ${auditTitle(item)}.`);
    } catch {
      setNotice(auditText(item));
    }
  }

  const laneCount = useMemo(() => state.jobs.length, [state.jobs]);
  const recentProofPacks = state.proofPacks.slice(0, 6);
  const recentAudit = state.audit.slice(0, 8);

  return (
    <main className="tt-shell" data-version="CHURVOX_OPERATOR_TOOLS_STABLE_WIRING_20260601">
      <section className="tt-hero">
        <div>
          <p>AI OPERATOR TOOLS</p>
          <h1>Top-tier control room</h1>
          <span>Proof packs, audit trail, client memory, dispatch lanes, trade presets and offline worker safety are connected through stable Churvox data instead of missing placeholder routes.</span>
        </div>
        <aside>
          <small>Status</small>
          <b>{state.loading ? "Loading" : "Ready"}</b>
          <em>{state.error || "Approval-first tools"}</em>
        </aside>
      </section>

      {notice ? <section className="tt-notice">{notice}</section> : null}

      <section className="tt-hub-grid" aria-label="Operator tool shortcuts">
        {hubLinks.map(([href, title, copy]) => <Link key={href} to={href} className="tt-hub-card"><small>Open</small><h2>{title}</h2><p>{copy}</p><b>Go →</b></Link>)}
      </section>

      <section className="tt-proof-panel">
        <header><small>Customer proof packs</small><h2>Recent completed work</h2><p>Customer-ready proof should come from completed jobs. Open the job to review photos, notes and invoice preparation.</p></header>
        <div className="tt-proof-list">
          {recentProofPacks.length ? recentProofPacks.map((job, index) => {
            const title = proofTitle(job);
            const href = idOf(job) ? `/jobs/${idOf(job)}` : "/jobs";
            return <div key={idOf(job) || index} className="tt-proof-row tt-proof-action-row"><span><b>{title}</b><small>{proofBody(job)}</small></span><div className="tt-proof-actions"><Link to={href}>Open</Link><button type="button" onClick={() => copyProof(job, title)}>Copy link</button><Link to={href}>Review proof</Link></div></div>;
          }) : <div className="tt-proof-empty">No completed jobs ready for proof yet. Complete a job and it will appear here.</div>}
        </div>
      </section>

      <section className="tt-proof-panel tt-audit-panel">
        <header><small>AI audit trail</small><h2>Recent operator activity</h2><p>Stable summary built from jobs, invoices and quotes so this page does not depend on missing audit routes.</p></header>
        <div className="tt-proof-list">
          {recentAudit.length ? recentAudit.map((item, index) => {
            const href = auditTargetHref(item);
            return <div key={idOf(item) || index} className="tt-proof-row tt-audit-row tt-audit-action-row"><span><b>{auditTitle(item)}</b><small>{auditCopy(item)}</small></span><div className="tt-audit-meta-actions"><em>{niceDate(item.created_at || item.createdAt || item.updated_at || item.time)}</em><div className="tt-audit-actions"><Link to={href}>Open</Link><button type="button" onClick={() => copyAudit(item)}>Copy</button></div></div></div>;
          }) : <div className="tt-proof-empty">No operator activity found yet. Jobs, quotes and invoices will appear here as records are created.</div>}
        </div>
      </section>

      <section className="tt-grid tt-feature-grid">
        {topTierFeatureList.map((feature) => <article key={feature} className="tt-card"><small>Foundation</small><h2>{feature}</h2><p>Wired as part of the AI Operator system. Churvox prepares the admin; the owner stays in control.</p></article>)}
      </section>

      <section className="tt-grid">
        <article className="tt-card"><small>Jobs</small><h2>{state.jobs.length}</h2><p>Live jobs feeding Command Floor and Dispatch.</p></article>
        <article className="tt-card"><small>Invoices</small><h2>{state.invoices.length}</h2><p>Money Desk records available for follow-up and review.</p></article>
        <article className="tt-card"><small>Quotes</small><h2>{state.quotes.length}</h2><p>Quotes records available for sales flow review.</p></article>
        <article className="tt-card"><small>Dispatch board</small><h2>{laneCount}</h2><p>Jobs available to schedule, assign or review.</p></article>
      </section>
    </main>
  );
}
