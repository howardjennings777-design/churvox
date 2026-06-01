import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const SUPPORT_EMAIL = "hello@churvox.com";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"]] },
  { title: "Admin", items: [["Team", "/team", "TM"], ["Plans", "/plans", "PL"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const supportAreas = [
  ["Setup help", "I need help getting the app set up"],
  ["Bug / something broken", "Something is not working properly"],
  ["Billing / plan", "I need help with billing, trial or plans"],
  ["Import / data", "I need help with clients, CSV or MYOB data"],
  ["Worker / jobs", "I need help with workers, jobs, dispatch or timesheets"],
  ["Other", "Something else"],
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/crew-map") return pathname === "/crew-map" || pathname === "/dispatch/map";
  if (href === "/support") return pathname === "/support" || pathname === "/contact" || pathname === "/trust";
  return pathname === href || pathname.startsWith(`${href}/`);
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

function encodeMailto(form, user, ticketId) {
  const subject = `[${ticketId}] Churvox support - ${form.subject || form.area}`;
  const body = [
    `Ticket: ${ticketId}`,
    `Area: ${form.area}`,
    `Priority: ${form.priority}`,
    `Name: ${form.name || user?.name || ""}`,
    `Reply email: ${form.email || user?.email || ""}`,
    `Current page: ${form.page || (typeof window !== "undefined" ? window.location.href : "")}`,
    "",
    "Message:",
    form.message,
  ].join("\n");
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function SupportCommandContent() {
  const { post } = useApi();
  const { user } = useAuth();
  const [sending, setSending] = React.useState(false);
  const [sentTickets, setSentTickets] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("churvox_support_tickets") || "[]"); } catch { return []; }
  });
  const [form, setForm] = React.useState({
    area: "Bug / something broken",
    priority: "Normal",
    name: user?.name || "",
    email: user?.email || "",
    subject: "",
    message: "",
    page: typeof window !== "undefined" ? window.location.href : "",
  });

  React.useEffect(() => {
    setForm((prev) => ({ ...prev, name: prev.name || user?.name || "", email: prev.email || user?.email || "" }));
  }, [user?.name, user?.email]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const saveTicket = (ticket) => {
    const next = [ticket, ...sentTickets].slice(0, 8);
    setSentTickets(next);
    try { localStorage.setItem("churvox_support_tickets", JSON.stringify(next)); } catch {}
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const email = String(form.email || user?.email || "").trim();
    const message = String(form.message || "").trim();
    if (!email) return toast.error("Add your reply email first");
    if (message.length < 8) return toast.error("Tell support what happened first");

    setSending(true);
    const ticketId = `SUP-${Date.now().toString().slice(-8)}`;
    const payload = { ...form, email, ticket_id: ticketId, created_at: new Date().toISOString() };

    let sentByBackend = false;
    try {
      const res = await post("/support/messages", payload);
      sentByBackend = Boolean(res?.success);
    } catch {
      sentByBackend = false;
    }

    const ticket = { id: ticketId, area: form.area, subject: form.subject || form.area, priority: form.priority, created_at: new Date().toISOString(), status: sentByBackend ? "Sent" : "Email draft opened" };
    saveTicket(ticket);

    if (sentByBackend) {
      toast.success("Support message sent");
      setForm((prev) => ({ ...prev, subject: "", message: "" }));
    } else {
      window.location.href = encodeMailto(form, user, ticketId);
      toast.success("Support email opened — send it from your email app");
    }
    setSending(false);
  };

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 xl:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-cyan-300/20 bg-[#143658] px-5 py-4 text-white shadow-[0_16px_38px_rgba(12,33,57,0.16)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Support</div><div className="text-sm font-bold text-slate-100">Send a real support message, include the page, and keep a ticket record.</div></div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">{SUPPORT_EMAIL}</a>
          </header>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)] md:p-6">
              <div className="rounded-[26px] border border-slate-900 bg-slate-950 p-6 text-white">
                <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Support request</span>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] md:text-6xl">Tell us what needs fixing.</h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Use this for bugs, billing, setup, imports, workers, jobs, MYOB, or anything blocking launch.</p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Help area</span><select value={form.area} onChange={(e) => update("area", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-blue-300">{supportAreas.map(([label]) => <option key={label}>{label}</option>)}</select></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Priority</span><select value={form.priority} onChange={(e) => update("priority", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-blue-300"><option>Normal</option><option>High</option><option>Launch blocker</option></select></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Your name</span><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-300" /></label>
                <label className="block"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Reply email</span><input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" placeholder="you@email.com" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-300" /></label>
              </div>

              <label className="mt-4 block"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Subject</span><input value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Example: Worker cannot finish a job" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-300" /></label>
              <label className="mt-4 block"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Message</span><textarea value={form.message} onChange={(e) => update("message", e.target.value)} rows={8} placeholder="Tell support what happened, what page you were on, and what you expected." className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-900 outline-none focus:border-blue-300" /></label>
              <label className="mt-4 block"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Page / screen</span><input value={form.page} onChange={(e) => update("page", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-300" /></label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={sending} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">{sending ? "Sending…" : "Send support request"}</button>
                <button type="button" onClick={() => { update("page", typeof window !== "undefined" ? window.location.href : ""); toast.success("Current page added"); }} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Add current page</button>
              </div>
            </form>

            <aside className="space-y-5">
              <section className="rounded-[32px] border border-slate-900 bg-[#143658] p-5 text-white shadow-[0_20px_60px_rgba(12,33,57,0.20)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Support promise</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">One place to ask for help.</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">Send bugs, billing issues, setup questions, import problems and launch blockers from here.</p>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Recent requests</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">Your ticket record</h2>
                <div className="mt-4 space-y-3">
                  {sentTickets.length ? sentTickets.map((ticket) => <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-sm font-black text-slate-950">{ticket.subject}</div><div className="mt-1 text-xs font-bold text-slate-500">{ticket.id} · {ticket.priority} · {ticket.status}</div></div>) : <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">No support requests sent from this device yet.</div>}
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Quick links</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/dashboard" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Command Board</Link>
                  <Link to="/plans" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Plans</Link>
                  <Link to="/settings" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Settings</Link>
                  <Link to="/privacy-policy" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Privacy</Link>
                  <Link to="/terms-of-service" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Terms</Link>
                </div>
              </section>
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}

export default function SupportCommandPage() {
  if (typeof document === "undefined") return <SupportCommandContent />;
  return createPortal(<SupportCommandContent />, document.body);
}
