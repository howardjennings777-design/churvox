import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const supportCards = [
  { key: "email", title: "Support inbox", status: "ready", type: "help", href: "mailto:hello@churvox.com?subject=Churvox%20support%20request", summary: "For setup, billing, import, account and product help. Main support email: hello@churvox.com." },
  { key: "setup", title: "Setup checklist", status: "next", type: "launch", href: "/onboarding", summary: "Finish business profile, first client, first job, first worker and first invoice." },
  { key: "billing", title: "Plans and billing", status: "owner", type: "account", href: "/plans", summary: "Plan access, trial status and billing confidence live in owner-only areas." },
  { key: "guardrails", title: "AI approval guardrails", status: "protected", type: "ai", href: "/ai-operator", summary: "AI prepares admin work, but owner approval is required before messages, payroll, pricing, deletes, charges or accounting changes." },
  { key: "data", title: "Data control", status: "protected", type: "trust", href: "/reports", summary: "Reports, export, privacy, terms and account deletion links stay easy to find." },
  { key: "launch", title: "Launch readiness", status: "ready", type: "ops", href: "/launch-control", summary: "Use launch tools, backup recovery and polish checks when preparing for release." },
];

const usefulLinks = [
  ["Command Board", "/dashboard"],
  ["Setup checklist", "/onboarding"],
  ["Demo mode", "/demo-mode"],
  ["Notifications", "/notifications"],
  ["Billing confidence", "/billing-confidence"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Account deletion", "/account-deletion"],
  ["Integration proof", "/integration-proof"],
  ["Launch ops", "/launch-ops"],
  ["Backup recovery", "/backup-recovery"],
  ["Polish checklist", "/polish-checklist"],
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/support") return pathname === "/support" || pathname === "/contact" || pathname === "/trust";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status) {
  if (["ready", "protected"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["next", "owner"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-800";
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span><span className="truncate">{label}</span></Link>;
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function SupportCard({ item, onOpen }) {
  const external = item.href.startsWith("mailto:");
  const ButtonTag = external ? "a" : Link;
  const buttonProps = external ? { href: item.href } : { to: item.href };
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(item.type)}</span><h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{item.title}</h3></div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(item.status)}`}>{pretty(item.status)}</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{item.summary}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open slip</button>
        <ButtonTag {...buttonProps} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open</ButtonTag>
      </div>
    </article>
  );
}

function SupportSlip({ item, onClose }) {
  if (!item) return null;
  const external = item.href.startsWith("mailto:");
  const ButtonTag = external ? "a" : Link;
  const buttonProps = external ? { href: item.href } : { to: item.href };
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[700px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4"><div><div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Support Work Slip</div><h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{item.title}</h2></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button></div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(item.type)} · {pretty(item.status)}</p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What this helps with</div><p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">{item.summary}</p><div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Support stays simple: open the right place, check the record, then approve or ask for help.</div></section>
          <section className="mt-4 rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Owner-safe rule</div><p className="mt-2 text-sm font-bold leading-6 text-emerald-950">Churvox prepares the admin. Owners still approve important actions before anything sends, changes, charges or syncs.</p></section>
        </main>
        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5"><ButtonTag {...buttonProps} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open now</ButtonTag><button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Back to support</button></footer>
      </div>
    </div>
  );
}

function SupportCommandContent() {
  const [activeSlip, setActiveSlip] = React.useState(null);
  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen"><Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Support Command</div><div className="text-sm font-bold text-slate-500">Help, trust, billing, data control and launch support.</div></div><div className="flex flex-wrap gap-3"><Link to="/dashboard" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Command Board</Link><a href="mailto:hello@churvox.com?subject=Churvox%20support%20request" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Email support</a></div></header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]"><div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]"><div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Support Command</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Get unstuck without digging around.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Support links, trust controls, billing help and launch tools stay in one clean command workspace.</p></div></div></div><div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Support health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">Setup</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">First place to check</div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">Help</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Email support</div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">Trust</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Guardrails clear</div></div></div></div></section>

          <section className="mt-5 grid gap-4 md:grid-cols-4"><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Support email</div><div className="mt-3 truncate text-2xl font-black tracking-[-0.06em]">hello@churvox.com</div></div><div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Help areas</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">6</div></div><div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Owner controls</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">On</div></div><div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">AI guardrails</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">Clear</div></div></section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Support list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open support areas</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">Simple help</span></div><div className="grid gap-4 xl:grid-cols-2">{supportCards.map((item) => <SupportCard key={item.key} item={item} onOpen={setActiveSlip} />)}</div></section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Useful links</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Quick links</h2><div className="mt-5 flex flex-wrap gap-3">{usefulLinks.map(([label, href]) => <Link key={href} to={href} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">{label}</Link>)}</div></section>
        </section>
      </div>
      <SupportSlip item={activeSlip} onClose={() => setActiveSlip(null)} />
    </main>
  );
}

export default function SupportCommandPage() {
  if (typeof document === "undefined") return <SupportCommandContent />;
  return createPortal(<SupportCommandContent />, document.body);
}
