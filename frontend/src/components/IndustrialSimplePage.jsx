import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  industrialAction,
  industrialChip,
  industrialContentLane,
  industrialGhost,
  industrialPageShell,
  industrialPanel,
} from "./industrialCommandTheme";

const configs = {
  command: { endpoint: null, title: "Churvox does the admin. You approve.", kicker: "Command Board", subtitle: "Your owner command centre for urgent work, AI-prepared actions, approvals and daily business control.", create: "/jobs/new", createLabel: "Create job", detail: (x) => x.href || "/dashboard", samples: [{ title: "Review today’s work", status: "ready", href: "/jobs" }, { title: "Check invoices", status: "approval ready", href: "/invoices" }, { title: "Assign open jobs", status: "needs action", href: "/crew-map" }] },
  notifications: { endpoint: "/notifications", title: "Notifications that need action.", kicker: "Notifications", subtitle: "See job updates, approvals, alerts and owner actions without leaving the Command Desk.", create: "/dashboard", createLabel: "Command Board", detail: (x) => x.href || x.url || "/dashboard", samples: [{ title: "Worker completed a job", status: "new", href: "/jobs" }, { title: "Invoice ready for review", status: "approval", href: "/invoices" }, { title: "Job needs assigning", status: "attention", href: "/crew-map" }] },
  jobs: { endpoint: "/jobs", title: "Keep every job moving.", kicker: "Jobs", subtitle: "See what needs assigning, what is in progress, and what is ready for review or invoice.", create: "/jobs/new", createLabel: "Create job", detail: (x) => `/jobs/${idOf(x)}`, samples: [{ title: "Rental lawn service", client_name: "Green Street Rentals", status: "in_progress" }, { title: "Hedge trim", client_name: "Sarah Williams", status: "assigned" }] },
  clients: { endpoint: "/clients", title: "Clients, jobs and history together.", kicker: "Clients", subtitle: "Keep customer details, addresses and job history in one simple command view.", create: "/clients/new", createLabel: "Add client", detail: (x) => `/clients/${idOf(x)}`, samples: [{ name: "Green Street Rentals", email: "owner@example.com", status: "ready" }, { name: "Sarah Williams", email: "sarah@example.com", status: "ready" }] },
  quotes: { endpoint: "/quotes", title: "Quotes ready to win.", kicker: "Quotes", subtitle: "Track draft quotes, sent quotes and follow-ups in one command view.", create: "/quotes/new", createLabel: "Create quote", detail: (x) => `/quotes/${idOf(x)}`, samples: [{ title: "Rental tidy quote", client_name: "ECB Property Maintenance", status: "draft" }] },
  invoices: { endpoint: "/invoices", title: "Invoices ready to send.", kicker: "Invoices", subtitle: "Review drafts, sent invoices and payment follow-ups before anything leaves Churvox.", create: "/invoices/new", createLabel: "Create invoice", detail: (x) => `/invoices/${idOf(x)}`, samples: [{ title: "Invoice draft", client_name: "Green Street Rentals", status: "draft" }] },
  team: { endpoint: "/team/workers", title: "Crew command centre.", kicker: "Team", subtitle: "Review workers, roles and who is ready for today’s work.", create: "/team", createLabel: "Manage team", detail: () => "/team", samples: [{ name: "Mike", role: "worker", status: "active" }, { name: "Tane", role: "manager", status: "active" }] },
  reports: { endpoint: null, title: "Reports without the mess.", kicker: "Reports", subtitle: "Use this workspace for payroll summaries, job totals and owner handoff reports.", create: "/payroll", createLabel: "Open payroll", detail: () => "/reports", samples: [{ title: "Payroll summary", status: "ready" }, { title: "Job activity", status: "ready" }] },
  plans: { endpoint: null, title: "Choose the command level.", kicker: "Plans", subtitle: "Start simple, then move up when you need more AI Operator capacity, crew control and admin power.", create: "/plans", createLabel: "Current plans", detail: () => "/plans", samples: [{ title: "Start", status: "$39 + GST" }, { title: "Crew", status: "$89 + GST" }, { title: "Operator", status: "$149 + GST" }, { title: "Command", status: "$299 + GST" }] },
  settings: { endpoint: null, title: "Business settings.", kicker: "Settings", subtitle: "Keep business details, plan controls and system preferences tidy.", create: "/plans", createLabel: "View plans", detail: () => "/settings", samples: [{ title: "Business profile", status: "ready" }, { title: "Plan and billing", status: "ready" }] },
  support: { endpoint: null, title: "Support and help.", kicker: "Support", subtitle: "Find help, legal pages and launch support notes.", create: "/dashboard", createLabel: "Back to command", detail: () => "/support", samples: [{ title: "Help centre", status: "ready" }, { title: "Legal links", status: "ready" }] },
  crewMap: { endpoint: "/jobs", title: "Crew map and active work.", kicker: "Crew Map", subtitle: "See active jobs and where the next assignment needs attention.", create: "/jobs/new", createLabel: "Create job", detail: (x) => `/jobs/${idOf(x)}`, samples: [{ title: "Active job tracking", client_name: "Site work", status: "active" }] },
};

const tapeColors = ["#facc15", "#fb923c", "#22d3ee", "#34d399", "#a78bfa", "#f43f5e"];
const tapeFor = (index = 0) => tapeColors[Math.abs(index) % tapeColors.length];

function SecurityTape({ color = "#facc15" }) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 h-full w-2 rounded-l-[28px]"
      style={{
        background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.28) 10px 15px, ${color} 15px 25px)`,
        boxShadow: `0 0 22px ${color}66`,
      }}
    />
  );
}

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["notifications", "alerts", "actions", "jobs", "quotes", "invoices", "clients", "customers", "workers", "team", "items", "results", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.client_id || item?.customer_id || item?.job_id || item?.quote_id || item?.invoice_id || item?.user_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function titleOf(item) {
  return item?.title || item?.message || item?.body || item?.job_title || item?.quote_number || item?.invoice_number || item?.name || item?.full_name || item?.client_name || item?.customer_name || "Open record";
}

function metaOf(item) {
  return [item?.client_name || item?.customer_name || item?.email || item?.phone, item?.address || item?.site_address || item?.street_address, item?.role].filter(Boolean).join(" · ");
}

function statusOf(item) {
  return String(item?.status || item?.type || item?.job_status || item?.quote_status || item?.invoice_status || "ready").replaceAll("_", " ");
}

function Stat({ label, value, color }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0f1722] p-4 pl-6 text-white shadow-[0_18px_50px_rgba(2,6,23,.30)]">
      <SecurityTape color={color} />
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">{value}</div>
    </div>
  );
}

function RecordBox({ item, config, index }) {
  const color = tapeFor(index + 3);
  return (
    <Link
      key={idOf(item) || index}
      to={config.detail(item)}
      className="relative block min-h-[118px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0f1722] p-5 pl-7 text-white no-underline shadow-[0_20px_60px_rgba(2,6,23,.32)] transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_26px_80px_rgba(2,6,23,.38)]"
    >
      <SecurityTape color={color} />
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{statusOf(item)}</div>
      <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">{titleOf(item)}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{metaOf(item) || "Open the record for full details."}</p>
    </Link>
  );
}

function OblongCommandBox({ to, label, title, text, color, children }) {
  const content = (
    <>
      <SecurityTape color={color} />
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">{title}</h2>
        {text ? <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p> : null}
        {children}
      </div>
    </>
  );

  const className = "relative min-h-[128px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0f1722] p-5 pl-7 text-white shadow-[0_20px_60px_rgba(2,6,23,.32)]";
  if (!to) return <div className={className}>{content}</div>;
  return <Link to={to} className={`${className} no-underline transition hover:-translate-y-0.5 hover:border-white/20`}>{content}</Link>;
}

function CommandLayout({ config, items, loading, open, ready, needs }) {
  return (
    <main className={industrialPageShell} data-industrial-simple-page="command" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0f1722] p-6 pl-8 text-white shadow-[0_24px_76px_rgba(2,6,23,.34)] md:p-8 md:pl-10">
            <SecurityTape color="#fb923c" />
            <span className={industrialChip}>{config.kicker}</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={config.create} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>{config.createLabel}</Link>
              <Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0f1722] p-5 pl-7 text-white shadow-[0_24px_76px_rgba(2,6,23,.34)]">
            <SecurityTape color="#22d3ee" />
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Health</div>
            <div className="mt-5 grid gap-3">
              <Stat label="Open" value={open} color="#facc15" />
              <Stat label="Ready" value={ready} color="#34d399" />
              <Stat label="Needs review" value={needs} color="#fb923c" />
            </div>
          </aside>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <OblongCommandBox to="/jobs" label="Work" title="Review today’s work" text="Jobs, site notes and work needing owner attention." color="#facc15" />
          <OblongCommandBox to="/invoices" label="Money" title="Check invoices" text="Drafts, sent invoices and payment follow-ups." color="#34d399" />
          <OblongCommandBox to="/crew-map" label="Crew" title="Assign open jobs" text="See what needs dispatch and who can handle it." color="#22d3ee" />
        </section>

        <section className="space-y-5">
          <OblongCommandBox label="Records" title="Open Command Board" color="#a78bfa">
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{open} open</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{ready} ready</span>
              {loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span>}
            </div>
          </OblongCommandBox>

          <div className="grid gap-5 xl:grid-cols-2">
            {items.map((item, index) => <RecordBox key={idOf(item) || index} item={item} config={config} index={index} />)}
          </div>
        </section>
      </section>
    </main>
  );
}

export default function IndustrialSimplePage({ kind }) {
  const config = configs[kind] || configs.jobs;
  const { get } = useApi();
  const [items, setItems] = React.useState(config.samples || []);
  const [loading, setLoading] = React.useState(Boolean(config.endpoint));

  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (!config.endpoint) return;
      setLoading(true);
      const res = await get(config.endpoint);
      if (!alive) return;
      const rows = res?.success ? listFrom(res) : [];
      setItems(rows.length ? rows : config.samples || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [config.endpoint, get]);

  const open = items.length;
  const ready = items.filter((item) => /ready|sent|active|assigned|progress|approval/i.test(statusOf(item))).length;
  const needs = Math.max(open - ready, 0);

  if (kind === "command") {
    return <CommandLayout config={config} items={items} loading={loading} open={open} ready={ready} needs={needs} />;
  }

  return (
    <main className={industrialPageShell} data-industrial-simple-page={kind} data-command-canvas>
      <section className={industrialContentLane}>
        <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className={`rounded-[30px] ${industrialPanel} p-6 md:p-8`}>
            <span className={industrialChip}>{config.kicker}</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-3"><Link to={config.create} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>{config.createLabel}</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div>
          </div>
          <div className={`rounded-[30px] ${industrialPanel} p-5`}><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Health</div><div className="mt-5 grid gap-3"><Stat label="Open" value={open} color="#facc15" /><Stat label="Ready" value={ready} color="#34d399" /><Stat label="Needs review" value={needs} color="#fb923c" /></div></div>
        </section>
        <section className={`mt-5 rounded-[28px] ${industrialPanel} p-5`}>
          <div className="mb-5 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Records</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open {config.kicker}</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span>}</div>
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item, index) => <RecordBox key={idOf(item) || index} item={item} config={config} index={index} />)}
          </div>
        </section>
      </section>
    </main>
  );
}
