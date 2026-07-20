import React from "react";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  CircleHelp,
  Database,
  FlaskConical,
  Gift,
  LifeBuoy,
  LockKeyhole,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Users2,
} from "lucide-react";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { HQ_AREAS, SURFACES, WHOLE_SITE_RELEASE_GATES } from "./siteContract";
import "./siteNext.css";

const TAB_ICONS = {
  Command: ShieldCheck,
  Businesses: Building2,
  Billing: BadgeDollarSign,
  Testers: Gift,
  Support: LifeBuoy,
  Incidents: AlertTriangle,
  Releases: Rocket,
  Data: Database,
};

const metrics = [
  ["Paid businesses", "24", "Verified subscription evidence", "good"],
  ["Active testers", "8", "Excluded from paid MRR", "neutral"],
  ["Open support", "5", "2 need a reply today", "warn"],
  ["Platform incidents", "1", "No customer data loss", "warn"],
];

const commandItems = [
  ["Billing", "Subscription requires verification", "One business has a Stripe status that does not match the saved plan state.", "Review evidence"],
  ["Support", "Owner reports worker message delay", "The message is saved but delivery acknowledgement is missing.", "Open incident"],
  ["Release", "Office OS staging gate", "Desktop passed. Mobile proof flow and migration rollback remain incomplete.", "Keep blocked"],
  ["Data", "Deletion request ready", "Identity and business ownership are verified. Final retention check is prepared.", "Approve deletion"],
];

const businessRows = [
  ["Harbour Property Services", "Operator", "Active", "First win complete", "2h"],
  ["Kauri Cleaning Group", "Crew", "Trialing", "Worker invite pending", "1d"],
  ["Northline Electrical", "Command", "Active", "Xero connected", "12m"],
  ["Mila Hair Studio", "Start", "Active", "Recurring setup incomplete", "3d"],
];

const supportRows = [
  ["Worker cannot see today’s job", "High", "Kauri Cleaning Group", "Access and assignment check prepared"],
  ["Need help importing clients", "Normal", "Mila Hair Studio", "Migration guide reply prepared"],
  ["Invoice status question", "Normal", "Harbour Property Services", "Payment evidence explained"],
  ["Xero reconnect", "High", "Northline Electrical", "Token status and safe reconnect steps ready"],
];

const incidentRows = [
  ["Worker message acknowledgement delayed", "Investigating", "Messaging", "No record loss detected"],
  ["Public page metadata drift", "Resolved", "Marketing", "Canonical route contract added"],
  ["Duplicate migration row", "Prevented", "Imports", "Blocked before write"],
];

function SurfaceBar() {
  return (
    <div className="cvnextSurfaceBar" role="navigation" aria-label="Private rebuild surfaces">
      <span>Private rebuild preview</span>
      <div>
        {SURFACES.map((surface) => <a key={surface.key} href={surface.href} className={surface.key === "hq" ? "active" : ""}>{surface.label}</a>)}
      </div>
      <small>HQ preview uses sample records only</small>
    </div>
  );
}

function Metric({ row }) {
  return <article className={`cvhqMetric ${row[3]}`}><small>{row[0]}</small><strong>{row[1]}</strong><span>{row[2]}</span></article>;
}

function EmptyTruth() {
  return <div className="cvhqTruth"><ShieldCheck size={20} /><div><strong>Preview contract</strong><p>No live endpoint, account, subscription or customer record is changed from this HQ rebuild preview.</p></div></div>;
}

function CommandView() {
  return <div className="cvhqStack"><section className="cvhqMetrics">{metrics.map((row) => <Metric key={row[0]} row={row} />)}</section><section className="cvhqPanel"><header><div><ShieldCheck size={20} /><span><strong>HQ Command</strong><small>Platform exceptions requiring Howard’s decision</small></span></div><em>4 need review</em></header><div className="cvhqCommandList">{commandItems.map(([area, title, detail, action], index) => <article key={title} className={index === 0 ? "selected" : ""}><b>{String(index + 1).padStart(2, "0")}</b><div><small>{area}</small><strong>{title}</strong><p>{detail}</p></div><button type="button">{action}</button></article>)}</div></section><EmptyTruth /></div>;
}

function BusinessesView({ query }) {
  const rows = businessRows.filter((row) => row.join(" ").toLowerCase().includes(query));
  return <div className="cvhqStack"><section className="cvhqSplitCards"><article><Building2 size={22} /><strong>Account lifecycle</strong><p>Signup, verification, trial, subscription, cancellation, export and deletion stay visible as one history.</p></article><article><LockKeyhole size={22} /><strong>Protected controls</strong><p>Plan, access and deletion changes require reason, authority, confirmation and audit evidence.</p></article></section><section className="cvhqPanel"><header><div><Building2 size={20} /><span><strong>Businesses</strong><small>Sample account truth view</small></span></div><em>{rows.length} shown</em></header><div className="cvhqTable"><div className="head"><span>Business</span><span>Plan</span><span>Status</span><span>Progress</span><span>Last active</span></div>{rows.map((row) => <div key={row[0]}>{row.map((cell, index) => <span key={`${row[0]}-${index}`} className={index === 0 ? "strong" : ""}>{cell}</span>)}</div>)}</div></section></div>;
}

function BillingView() {
  return <div className="cvhqStack"><section className="cvhqMetrics"><Metric row={["Verified MRR", "$4,221", "Testers excluded", "good"]} /><Metric row={["Trialing", "6", "No card required", "neutral"]} /><Metric row={["Needs verification", "1", "Not counted as paid", "warn"]} /><Metric row={["Past due", "2", "Owner-safe follow-up", "warn"]} /></section><section className="cvhqPanel"><header><div><BadgeDollarSign size={20} /><span><strong>Billing truth</strong><small>Stripe evidence before platform state</small></span></div><em>NZD</em></header><div className="cvhqRuleGrid"><article><CheckCircle2 size={20} /><strong>Count only verified subscriptions</strong><p>Saved labels cannot create paid MRR by themselves.</p></article><article><CheckCircle2 size={20} /><strong>Keep tester access separate</strong><p>Free testers remain visible but never inflate revenue.</p></article><article><CheckCircle2 size={20} /><strong>Refunds remain deliberate</strong><p>Reason, amount, actor and Stripe result stay audited.</p></article><article><CheckCircle2 size={20} /><strong>Plan changes remain consistent</strong><p>Public pricing, signup, Stripe and account access must agree.</p></article></div></section></div>;
}

function TestersView() {
  return <div className="cvhqStack"><section className="cvhqMetrics"><Metric row={["Applications", "12", "4 awaiting review", "neutral"]} /><Metric row={["Invited", "10", "2 not accepted", "warn"]} /><Metric row={["Active", "8", "90-day windows", "good"]} /><Metric row={["Feedback items", "17", "6 product actions", "neutral"]} /></section><section className="cvhqPanel"><header><div><FlaskConical size={20} /><span><strong>Tester programme</strong><small>Email-first intake and structured feedback</small></span></div><em>Sample records</em></header><div className="cvhqTesterBoard"><article><span>New application</span><strong>Property maintenance · 4 workers</strong><p>Wants recurring work, worker proof and simpler invoicing.</p><button>Review application</button></article><article><span>Needs follow-up</span><strong>Cleaner accepted access</strong><p>No first client or job created after seven days.</p><button>Prepare check-in</button></article><article><span>Product feedback</span><strong>Quote setup felt confusing</strong><p>Tester identified the client-selection step as unclear on mobile.</p><button>Open product issue</button></article></div></section></div>;
}

function SupportView({ query }) {
  const rows = supportRows.filter((row) => row.join(" ").toLowerCase().includes(query));
  return <div className="cvhqStack"><section className="cvhqPanel"><header><div><LifeBuoy size={20} /><span><strong>Support desk</strong><small>Business context before a reply is sent</small></span></div><em>{rows.length} open</em></header><div className="cvhqSupportList">{rows.map(([title, priority, business, prepared]) => <article key={title}><span className={priority === "High" ? "high" : ""}>{priority}</span><div><strong>{title}</strong><small>{business}</small><p>{prepared}</p></div><button>Review reply</button></article>)}</div></section><EmptyTruth /></div>;
}

function IncidentsView() {
  return <div className="cvhqStack"><section className="cvhqSplitCards"><article><AlertTriangle size={22} /><strong>One incident record</strong><p>Detection, affected surface, evidence, mitigation, recovery and customer impact stay together.</p></article><article><RefreshCw size={22} /><strong>Safe retries</strong><p>Failed external actions return to a controlled queue and cannot silently run twice.</p></article></section><section className="cvhqPanel"><header><div><Activity size={20} /><span><strong>Incident and queue health</strong><small>Sample operational status</small></span></div><em>1 investigating</em></header><div className="cvhqIncidentList">{incidentRows.map(([title, status, area, result]) => <article key={title}><span className={status === "Investigating" ? "warn" : "good"}>{status}</span><div><strong>{title}</strong><small>{area}</small></div><p>{result}</p></article>)}</div></section></div>;
}

function ReleasesView() {
  return <div className="cvhqStack"><section className="cvhqReleaseHero"><Rocket size={28} /><div><small>Office OS replacement</small><h2>Cutover remains blocked until every critical gate has evidence.</h2><p>Passing a build is necessary, but it is not the same as proving the product is ready for real businesses.</p></div><span>Blocked safely</span></section><section className="cvhqPanel"><header><div><Rocket size={20} /><span><strong>Whole-site release gates</strong><small>Public, owner, worker, customer and HQ</small></span></div><em>{WHOLE_SITE_RELEASE_GATES.length} gates</em></header><div className="cvhqGateList">{WHOLE_SITE_RELEASE_GATES.map((gate, index) => <article key={gate}><span className={index < 2 ? "pass" : "pending"}>{index < 2 ? <CheckCircle2 size={18} /> : <RefreshCw size={18} />}</span><p>{gate}</p><em>{index < 2 ? "Contract ready" : "Evidence required"}</em></article>)}</div></section></div>;
}

function DataView() {
  return <div className="cvhqStack"><section className="cvhqPanel"><header><div><Database size={20} /><span><strong>Data and compliance controls</strong><small>Account-level actions remain deliberate</small></span></div><em>Owner protected</em></header><div className="cvhqRuleGrid"><article><Database size={20} /><strong>Export</strong><p>Business records can be exported without exposing secrets or another tenant.</p></article><article><LockKeyhole size={20} /><strong>Deletion</strong><p>Identity, ownership, retention and irreversible scope are confirmed first.</p></article><article><ShieldCheck size={20} /><strong>Audit</strong><p>Actor, reason, source, before state, after state and execution result remain traceable.</p></article><article><CircleHelp size={20} /><strong>Recovery</strong><p>Backups, restore rehearsal and record-count verification are release requirements.</p></article></div></section><EmptyTruth /></div>;
}

function TabBody({ tab, query }) {
  if (tab === "Businesses") return <BusinessesView query={query} />;
  if (tab === "Billing") return <BillingView />;
  if (tab === "Testers") return <TestersView />;
  if (tab === "Support") return <SupportView query={query} />;
  if (tab === "Incidents") return <IncidentsView />;
  if (tab === "Releases") return <ReleasesView />;
  if (tab === "Data") return <DataView />;
  return <CommandView />;
}

export default function HQNext() {
  const [tab, setTab] = React.useState("Command");
  const [query, setQuery] = React.useState("");
  const filteredQuery = query.trim().toLowerCase();
  return <main className="cvnext cvhq" data-version="CHURVOX_HQ_REBUILD_20260721"><SurfaceBar /><div className="cvhqShell"><aside className="cvhqSidebar"><div className="cvhqBrand"><ChurvoxLogo variant="mark" size="lg" /><span><strong>Churvox HQ</strong><small>Platform control centre</small></span></div><nav>{HQ_AREAS.map(([name, purpose]) => { const Icon = TAB_ICONS[name] || ShieldCheck; return <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)} type="button"><Icon size={18} /><span><strong>{name}</strong><small>{purpose}</small></span></button>; })}</nav><div className="cvhqOwner"><ShieldCheck size={18} /><span><strong>Platform owner</strong><small>hello@churvox.com</small></span></div></aside><section className="cvhqMain"><header className="cvhqTop"><div><small>Churvox platform</small><h1>{tab}</h1></div><label><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sample businesses, issues or records" /></label><span className="cvhqHealth"><i /> Preview healthy</span></header><TabBody tab={tab} query={filteredQuery} /></section></div></main>;
}
