import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../lib/apiBase";

const SUPPORT_EMAIL = "hello@churvox.com";

const navGroups = [
  { title: "Main", items: [["Command Board", "/dashboard", "CB"], ["Jobs", "/jobs", "JB"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Team", "/team", "TM"]] },
  { title: "Account", items: [["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const supportAreas = [
  "Setup help",
  "Something is broken",
  "Billing or plan",
  "Import or data",
  "Workers or jobs",
  "Invoices or quotes",
  "MYOB or integration",
  "Documents or PDFs",
  "Other",
];

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
}

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE || ""}/api${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/support") return pathname === "/support" || pathname === "/contact" || pathname === "/trust";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-lg font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div>
        </div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function fmt(value) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function navLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function SupportCommandContent() {
  const { user } = useAuth();
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [tickets, setTickets] = React.useState([]);
  const [roleInfo, setRoleInfo] = React.useState(null);
  const [notice, setNotice] = React.useState("");
  const [form, setForm] = React.useState({
    area: "Something is broken",
    priority: "Normal",
    name: user?.name || user?.full_name || "",
    email: user?.email || "",
    subject: "",
    message: "",
    page: typeof window !== "undefined" ? window.location.href : "",
  });

  React.useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: prev.name || user?.name || user?.full_name || "",
      email: prev.email || user?.email || "",
    }));
  }, [user?.name, user?.full_name, user?.email]);

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const [ticketRes, roleRes] = await Promise.all([
        api("/support/messages").catch((err) => ({ error: err.message, tickets: [] })),
        api("/roles/access-matrix").catch(() => null),
      ]);
      setTickets(ticketRes?.tickets || ticketRes?.data || []);
      setRoleInfo(roleRes?.current || null);
      if (ticketRes?.error) setNotice(ticketRes.error);
    } catch (err) {
      setNotice(err?.message || "Could not load support data");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const email = String(form.email || user?.email || "").trim();
    const message = String(form.message || "").trim();

    if (!email) return toast.error("Add your reply email first");
    if (message.length < 8) return toast.error("Tell support what happened first");

    setSending(true);
    setNotice("");

    const ticketId = `SUP-${Date.now().toString().slice(-8)}`;
    const payload = {
      ...form,
      email,
      ticket_id: ticketId,
      created_at: new Date().toISOString(),
      page: form.page || (typeof window !== "undefined" ? window.location.href : ""),
    };

    try {
      const res = await api("/support/messages", { method: "POST", body: payload });
      toast.success(res?.message || "Support request sent");
      if (res?.email_warning) setNotice("Your request was saved. Email alerts will send when email settings are enabled.");
      setForm((prev) => ({ ...prev, subject: "", message: "" }));
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not send support request");
      setNotice(err?.message || "Could not send support request");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 xl:p-8">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
            <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)] md:p-6">
              <div className="rounded-[28px] border border-cyan-300/15 bg-[#143658] p-6 text-white">
                <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Support request</span>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] md:text-6xl">Tell us what’s blocking you.</h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Use this for bugs, billing, setup, imports, workers, jobs, MYOB, documents, or anything stopping your work.</p>
              </div>

              {notice ? <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-black text-amber-100">{notice}</div> : null}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/80">What do you need help with?</span>
                  <select value={form.area} onChange={(e) => update("area", e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-black text-white outline-none focus:border-cyan-300">
                    {supportAreas.map((label) => <option key={label}>{label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/80">Priority</span>
                  <select value={form.priority} onChange={(e) => update("priority", e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-black text-white outline-none focus:border-cyan-300">
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/80">Your name</span>
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/80">Reply email</span>
                  <input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" placeholder="you@email.com" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300" />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/80">Subject</span>
                <input value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Example: Worker cannot finish a job" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300" />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/80">Message</span>
                <textarea value={form.message} onChange={(e) => update("message", e.target.value)} rows={8} placeholder="Tell support what happened, what page you were on, and what you expected." className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300" />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/80">Page / screen</span>
                <input value={form.page} onChange={(e) => update("page", e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-cyan-300" />
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={sending} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200 disabled:opacity-60">
                  {sending ? "Sending…" : "Send support request"}
                </button>
                <button type="button" onClick={() => { update("page", typeof window !== "undefined" ? window.location.href : ""); toast.success("Current page added"); }} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Add current page</button>
              </div>
            </form>

            <aside className="space-y-5">
              <section className="rounded-[32px] border border-slate-900 bg-[#143658] p-5 text-white shadow-[0_20px_60px_rgba(12,33,57,0.20)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">How support works</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">One place to ask for help.</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">Your request is saved in Churvox. Email alerts are sent when enabled.</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-flex rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">{SUPPORT_EMAIL}</a>
              </section>

              <section className="rounded-[32px] border border-slate-900 bg-[#143658] p-5 text-white shadow-[0_20px_60px_rgba(12,33,57,0.20)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Your access</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">{roleInfo?.label || "Your role"}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(roleInfo?.nav || []).map((item) => (
                    <span key={item} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{navLabel(item)}</span>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-900 bg-[#143658] p-5 text-white shadow-[0_20px_60px_rgba(12,33,57,0.20)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Recent requests</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">Ticket history</h2>
                <div className="mt-4 space-y-3">
                  {loading ? <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-300">Loading tickets…</div> : null}
                  {!loading && tickets.length ? tickets.slice(0, 8).map((ticket) => (
                    <div key={ticket.id || ticket.ticket_id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-black text-white">{ticket.ticket_id}</div>
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-cyan-100">{ticket.status || "open"}</span>
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-200">{ticket.subject || ticket.area}</div>
                      <div className="mt-1 text-xs font-bold text-slate-400">{fmt(ticket.created_at)}</div>
                    </div>
                  )) : null}
                  {!loading && !tickets.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-300">No support tickets yet.</div> : null}
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
