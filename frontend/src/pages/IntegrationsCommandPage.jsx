import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const integrationCards = [
  { key: "myob", title: "MYOB sync", status: "planned", type: "accounting", summary: "Invoices and payment state can be prepared for MYOB once API access is fully approved and connected." },
  { key: "csv", title: "CSV import", status: "ready", type: "data", summary: "Import customers or records from external systems without manual retyping." },
  { key: "email", title: "Email delivery", status: "ready", type: "messages", summary: "Customer emails and owner notifications should stay approval-first and traceable." },
  { key: "sms", title: "SMS credits", status: "coming_soon", type: "messages", summary: "SMS stays clearly staged until the phone and credit flow is stable enough for launch." },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/integrations") return pathname === "/integrations" || pathname.startsWith("/integrations/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function statusOf(record) {
  return String(record?.status || record?.payment_status || record?.myob_sync_status || "").toLowerCase().replaceAll(" ", "_");
}

function isPaid(invoice) {
  return statusOf(invoice).includes("paid") || (Number(invoice?.amount_due || invoice?.balance_due || 0) <= 0 && Number(invoice?.amount_paid || 0) > 0);
}

function isSyncFailed(invoice) {
  return String(invoice?.myob_sync_status || "").toLowerCase() === "failed" || Boolean(invoice?.myob_error);
}

function isSyncReady(invoice) {
  return Boolean(invoice?.invoice_number || invoice?.number) && Boolean(invoice?.customer_name || invoice?.client_name) && Number(invoice?.total || invoice?.amount || invoice?.amount_due || 0) >= 0;
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function cardStyle(status) {
  if (["ready", "connected", "active"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["planned", "review", "pending"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (["coming_soon", "paused", "waiting"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["failed", "blocked"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
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

function IntegrationCard({ item, onOpen }) {
  const status = String(item.status || "planned").toLowerCase();
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(item.type)}</span><h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{item.title}</h3></div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${cardStyle(status)}`}>{pretty(status)}</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{item.summary}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open slip</button>
        <Link to={item.key === "csv" ? "/clients" : item.key === "myob" ? "/invoices" : item.key === "sms" ? "/money-desk" : "/settings"} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open place</Link>
      </div>
    </article>
  );
}

function IntegrationSlip({ item, onClose, metrics }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[700px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div><div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Integration Work Slip</div><h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{item.title}</h2></div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(item.type)} · {pretty(item.status)}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">{item.summary}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Integrations should stay owner-controlled. Churvox prepares sync-ready records and surfaces issues before anything important leaves the app.</div>
          </section>
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Sync-ready invoices</div><div className="mt-1 text-sm font-black text-slate-950">{metrics.ready}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Sync issues</div><div className="mt-1 text-sm font-black text-slate-950">{metrics.failed}</div></div>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to="/settings" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open settings</Link>
          <Link to="/invoices" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Open invoices</Link>
        </footer>
      </div>
    </div>
  );
}

function IntegrationsCommandContent() {
  const { get } = useApi();
  const [invoices, setInvoices] = React.useState([]);
  const [clients, setClients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeItem, setActiveItem] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [invoicesRes, clientsRes] = await Promise.all([get("/invoices"), get("/clients")]);
      if (!alive) return;
      setInvoices(invoicesRes?.success ? arr(invoicesRes) : []);
      setClients(clientsRes?.success ? arr(clientsRes) : []);
      setError(!invoicesRes?.success && !clientsRes?.success ? "Could not load integration data" : "");
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [get]);

  const metrics = React.useMemo(() => {
    const ready = invoices.filter(isSyncReady).length;
    const failed = invoices.filter(isSyncFailed).length;
    const paid = invoices.filter(isPaid).length;
    const missingClientInfo = clients.filter((client) => !(client?.email || client?.client_email || client?.customer_email) || !(client?.phone || client?.mobile || client?.client_phone)).length;
    return { ready, failed, paid, missingClientInfo, clients: clients.length, invoices: invoices.length };
  }, [invoices, clients]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Integrations Command</div><div className="text-sm font-bold text-slate-500">Accounting, import, messaging and sync readiness.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/settings" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Settings</Link><Link to="/invoices" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Invoices</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Integrations Command</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Connect the admin without losing control.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox keeps integrations practical: records are prepared, checked, and handed off with owner visibility.</p></div></div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Integration health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{metrics.ready}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Sync ready</div></div><div className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="text-2xl font-black text-red-800">{metrics.failed}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Sync issues</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{metrics.missingClientInfo}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Client gaps</div></div></div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Invoices</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{metrics.invoices}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Sync ready</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{metrics.ready}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Paid</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{metrics.paid}</div></div>
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Client gaps</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-amber-900">{metrics.missingClientInfo}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Integration list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Connection workspaces</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">{integrationCards.map((item) => <IntegrationCard key={item.key} item={item} onOpen={setActiveItem} />)}</div>
          </section>
        </section>
      </div>
      <IntegrationSlip item={activeItem} onClose={() => setActiveItem(null)} metrics={metrics} />
    </main>
  );
}

export default function IntegrationsCommandPage() {
  if (typeof document === "undefined") return <IntegrationsCommandContent />;
  return createPortal(<IntegrationsCommandContent />, document.body);
}
