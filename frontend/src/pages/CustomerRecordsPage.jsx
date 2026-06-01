import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";

// CHURVOX_CLIENT_WORKBENCH_COMMAND_20260601
// Full Command Desk client workspace. Backend untouched.

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/clients") return pathname === "/clients" || pathname.startsWith("/clients/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
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
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
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

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.customers)) return value.customers;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
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

function idOf(value) {
  return String(value?.id || value?._id || value?.client_id || value?.customer_id || "");
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function customerName(customer) {
  return customer?.name || customer?.client_name || customer?.customer_name || customer?.contact_name || "Unnamed customer";
}

function customerEmail(customer) {
  return customer?.email || customer?.customer_email || customer?.contact_email || "";
}

function customerPhone(customer) {
  return customer?.phone || customer?.mobile || customer?.customer_phone || customer?.contact_phone || "";
}

function customerAddress(customer) {
  return customer?.billing_address || customer?.address || customer?.site_address || customer?.customer_address || "";
}

function matchesCustomer(record, customer) {
  const clientId = idOf(customer);
  const names = [customerName(customer), customer?.client_name, customer?.customer_name].filter(Boolean).map((x) => String(x).toLowerCase());
  const recordIds = [record?.client_id, record?.customer_id, record?.client, record?.customer].filter(Boolean).map(String);
  if (clientId && recordIds.includes(clientId)) return true;
  const recordText = [record?.client_name, record?.customer_name, record?.name].join(" ").toLowerCase();
  return names.some((name) => name && recordText.includes(name));
}

function isPaid(invoice) {
  const status = String(invoice?.status || invoice?.payment_status || "").toLowerCase();
  return status.includes("paid") || (Number(invoice?.amount_due || 0) <= 0 && Number(invoice?.amount_paid || 0) > 0);
}

function enrichCustomer(customer, jobs, quotes, invoices) {
  const customerJobs = jobs.filter((job) => matchesCustomer(job, customer));
  const customerQuotes = quotes.filter((quote) => matchesCustomer(quote, customer));
  const customerInvoices = invoices.filter((invoice) => matchesCustomer(invoice, customer));
  const unpaid = customerInvoices.filter((invoice) => !isPaid(invoice)).reduce((sum, invoice) => sum + Number(invoice.amount_due || invoice.balance_due || invoice.total || invoice.amount || 0), 0);
  const paid = customerInvoices.filter(isPaid).reduce((sum, invoice) => sum + Number(invoice.amount_paid || invoice.total || invoice.amount || 0), 0);
  const missingFields = [];
  if (!customerName(customer) || customerName(customer) === "Unnamed customer") missingFields.push("name");
  if (!customerEmail(customer)) missingFields.push("email");
  if (!customerPhone(customer)) missingFields.push("phone");
  if (!customerAddress(customer)) missingFields.push("address");

  return {
    ...customer,
    name: customerName(customer),
    email: customerEmail(customer),
    phone: customerPhone(customer),
    billing_address: customerAddress(customer),
    site_addresses: arr(customer.site_addresses),
    jobs: customerJobs,
    quotes: customerQuotes,
    invoices: customerInvoices,
    summary: {
      is_missing_info: missingFields.length > 0,
      missing_fields: missingFields,
      jobs_count: customerJobs.length,
      quotes_count: customerQuotes.length,
      invoices_count: customerInvoices.length,
      unpaid_balance: unpaid,
      paid_total: paid,
      photos_count: customerJobs.reduce((sum, job) => sum + arr(job.photos || job.job_photos || job.uploaded_photos).length, 0),
    },
  };
}

function buildTotals(customers) {
  return {
    customers: customers.length,
    missing_info: customers.filter((customer) => customer.summary?.is_missing_info).length,
    jobs: customers.reduce((sum, customer) => sum + Number(customer.summary?.jobs_count || 0), 0),
    quotes: customers.reduce((sum, customer) => sum + Number(customer.summary?.quotes_count || 0), 0),
    invoices: customers.reduce((sum, customer) => sum + Number(customer.summary?.invoices_count || 0), 0),
    unpaid_balance: customers.reduce((sum, customer) => sum + Number(customer.summary?.unpaid_balance || 0), 0),
  };
}

const editableFields = [
  ["name", "Customer name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["billing_address", "Billing address"],
  ["customer_type", "Customer type"],
  ["billing_contact", "Billing contact"],
  ["site_contact", "Site contact"],
  ["preferred_worker_name", "Preferred worker"],
  ["access_notes", "Access notes"],
  ["gate_code", "Gate code"],
  ["site_instructions", "Site instructions"],
  ["internal_notes", "Internal notes"],
  ["customer_message_draft", "Customer message draft"],
];

function CustomerSlip({ selected, draft, updateDraft, saveCustomer, busy, siteDraft, setSiteDraft, addSite, noteDraft, setNoteDraft, addNote, onClose }) {
  if (!selected) return null;
  const summary = selected?.summary || {};
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[780px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Client Work Slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{customerName(selected)}</h2>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-300">{selected.email || "No email"} · {selected.phone || "No phone"}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          {arr(summary.missing_fields).length ? (
            <section className="mb-4 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Needs attention</div>
              <p className="mt-2 text-sm font-bold leading-6 text-amber-950">Missing: {summary.missing_fields.join(", ")}. Fix these before relying on customer messages or invoices.</p>
            </section>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Jobs</span><b className="mt-1 block text-2xl font-black text-slate-950">{summary.jobs_count || 0}</b></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Invoices</span><b className="mt-1 block text-2xl font-black text-slate-950">{summary.invoices_count || 0}</b></div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Unpaid</span><b className="mt-1 block text-2xl font-black text-emerald-950">{money(summary.unpaid_balance)}</b></div>
          </section>

          <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Editable client details</div><p className="mt-1 text-sm font-bold text-slate-500">Update the important contact and site information.</p></div>
              <button type="button" onClick={saveCustomer} disabled={busy === "save"} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">Save client</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {editableFields.map(([key, label]) => (
                <label key={key} className={["access_notes", "site_instructions", "internal_notes", "customer_message_draft"].includes(key) ? "md:col-span-2" : ""}>
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
                  {["access_notes", "site_instructions", "internal_notes", "customer_message_draft"].includes(key) ? (
                    <textarea className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300" rows={3} value={draft?.[key] || ""} onChange={(e) => updateDraft(key, e.target.value)} />
                  ) : (
                    <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300" value={draft?.[key] || ""} onChange={(e) => updateDraft(key, e.target.value)} />
                  )}
                </label>
              ))}
            </div>
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Site addresses</div>
              <div className="mt-4 space-y-3">
                {arr(selected.site_addresses).length ? arr(selected.site_addresses).map((site, index) => (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={index}>
                    <b className="block text-sm font-black text-slate-950">{site.label || `Site ${index + 1}`}</b>
                    <span className="mt-1 block text-sm font-bold text-slate-600">{site.address}</span>
                    {site.access_notes ? <em className="mt-2 block text-xs font-bold text-slate-500">{site.access_notes}</em> : null}
                  </div>
                )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">No extra site addresses yet.</div>}
              </div>
              <div className="mt-4 grid gap-2">
                {["label", "address", "contact", "phone", "access_notes"].map((key) => (
                  <input key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300" value={siteDraft[key] || ""} onChange={(e) => setSiteDraft((current) => ({ ...current, [key]: e.target.value }))} placeholder={key.replace("_", " ")} />
                ))}
                <button type="button" onClick={addSite} disabled={busy === "site"} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">Add site</button>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Quick internal note</div>
              <textarea className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={7} placeholder="Add note about access, customer preference, billing issue, dog on site..." />
              <button type="button" onClick={addNote} disabled={busy === "note"} className="mt-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">Save note</button>
            </div>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to={`/jobs/new?client_id=${idOf(selected)}`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Create job</Link>
          <Link to={`/quotes/new?client_id=${idOf(selected)}`} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Create quote</Link>
          <Link to={`/invoices/new?client_id=${idOf(selected)}`} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Create invoice</Link>
        </footer>
      </div>
    </div>
  );
}

function CustomerRecordsContent() {
  const api = useApi();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [totals, setTotals] = useState({});
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [siteDraft, setSiteDraft] = useState({ label: "", address: "", contact: "", phone: "", access_notes: "" });
  const [noteDraft, setNoteDraft] = useState("");
  const [slipOpen, setSlipOpen] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    const [clientsRes, jobsRes, quotesRes, invoicesRes] = await Promise.all([
      api.get("/clients"),
      api.get("/jobs"),
      api.get("/quotes"),
      api.get("/invoices"),
    ]);

    if (clientsRes.success) {
      const clients = pickList(clientsRes, ["clients", "customers", "items", "results"]);
      const jobs = jobsRes.success ? pickList(jobsRes, ["jobs", "items", "results"]) : [];
      const quotes = quotesRes.success ? pickList(quotesRes, ["quotes", "items", "results"]) : [];
      const invoices = invoicesRes.success ? pickList(invoicesRes, ["invoices", "items", "results"]) : [];
      const next = clients.map((client) => enrichCustomer(client, jobs, quotes, invoices));
      setCustomers(next);
      setTotals(buildTotals(next));
      if (!selectedId && next[0]) {
        setSelectedId(idOf(next[0]));
        setDraft(next[0]);
      } else if (selectedId) {
        const selected = next.find((x) => idOf(x) === selectedId);
        if (selected) setDraft(selected);
      }
    } else {
      toast.error(clientsRes.error || "Could not load customer records");
    }
    setLoading(false);
  }

  useEffect(() => { loadCustomers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => customers.find((x) => idOf(x) === selectedId) || draft, [customers, selectedId, draft]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) => [customerName(customer), customer.email, customer.phone, customer.billing_address, customer.address, customer.customer_type, arr(customer.tags).join(" ")].join(" ").toLowerCase().includes(q));
  }, [customers, search]);

  function pick(customer) {
    setSelectedId(idOf(customer));
    setDraft({ ...customer });
    setSiteDraft({ label: "", address: "", contact: "", phone: "", access_notes: "" });
    setNoteDraft("");
    setSlipOpen(true);
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...(current || {}), [key]: value }));
  }

  async function saveCustomer() {
    if (!draft) return;
    setBusy("save");
    const payload = { ...draft, client_name: draft.name || draft.client_name, contact_name: draft.contact_name || draft.name, address: draft.billing_address || draft.address };
    const res = await api.patch(`/clients/${idOf(draft)}`, payload);
    setBusy("");
    if (res.success) {
      toast.success("Customer record saved");
      await loadCustomers();
    } else {
      toast.error(res.error || "Could not save customer");
    }
  }

  async function addSite() {
    if (!selected) return;
    if (!siteDraft.address.trim()) return toast.error("Site address is required");
    const nextSites = [...arr(selected.site_addresses), { ...siteDraft }];
    setBusy("site");
    const res = await api.patch(`/clients/${idOf(selected)}`, { site_addresses: nextSites });
    setBusy("");
    if (res.success) {
      toast.success("Site added");
      setSiteDraft({ label: "", address: "", contact: "", phone: "", access_notes: "" });
      await loadCustomers();
    } else {
      toast.error(res.error || "Could not add site");
    }
  }

  async function addNote() {
    if (!selected) return;
    if (!noteDraft.trim()) return toast.error("Write a note first");
    const stamp = new Date().toLocaleString("en-NZ");
    const currentNotes = selected.internal_notes || selected.notes || "";
    const nextNotes = `${currentNotes ? `${currentNotes}\n\n` : ""}${stamp}: ${noteDraft.trim()}`;
    setBusy("note");
    const res = await api.patch(`/clients/${idOf(selected)}`, { internal_notes: nextNotes, notes: nextNotes });
    setBusy("");
    if (res.success) {
      toast.success("Note added");
      setNoteDraft("");
      await loadCustomers();
    } else {
      toast.error(res.error || "Could not save note");
    }
  }

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Clients</div>
              <div className="text-sm font-bold text-slate-500">Customer details, sites, notes, jobs, quotes and invoices in one command view.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={loadCustomers} disabled={loading || Boolean(busy)} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50 disabled:opacity-60">Refresh</button>
              <button type="button" onClick={() => navigate("/clients/new")} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Add client</button>
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Clients command</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Know the customer before the job starts.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox keeps client contact details, site access, job history, quote history and unpaid balances ready for owner decisions.</p>
                </div>
              </div>
            </div>

            <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">What needs attention</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">Client health</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{totals.missing_info || 0}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Missing info</div></div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{totals.customers || 0}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Saved clients</div></div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{money(totals.unpaid_balance)}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Unpaid balance</div></div>
              </div>
            </aside>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Clients</span><b className="mt-3 block text-3xl font-black tracking-[-0.06em] text-slate-950">{totals.customers || 0}</b></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Jobs</span><b className="mt-3 block text-3xl font-black tracking-[-0.06em] text-blue-950">{totals.jobs || 0}</b></div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Quotes</span><b className="mt-3 block text-3xl font-black tracking-[-0.06em] text-slate-950">{totals.quotes || 0}</b></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Invoices</span><b className="mt-3 block text-3xl font-black tracking-[-0.06em] text-emerald-950">{totals.invoices || 0}</b></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Client list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open clients</h2></div>
              {loading ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span> : null}
            </div>
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients, email, phone, address..." className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400" />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {!loading && filtered.length ? filtered.map((customer) => (
                <button key={idOf(customer) || customerName(customer)} type="button" onClick={() => pick(customer)} className="rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{customer.summary?.is_missing_info ? "Needs info" : "Client ready"}</span>
                      <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{customerName(customer)}</h3>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${customer.summary?.is_missing_info ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{customer.summary?.is_missing_info ? "Fix" : "OK"}</span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
                    <div>{customer.email || customer.phone || "No contact saved"}</div>
                    <div className="text-slate-400">{customer.billing_address || customer.address || "No address saved"}</div>
                    <div className="text-slate-500">Jobs {customer.summary?.jobs_count || 0} · Quotes {customer.summary?.quotes_count || 0} · Unpaid {money(customer.summary?.unpaid_balance)}</div>
                  </div>
                </button>
              )) : null}
              {!loading && !filtered.length ? <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-bold text-slate-500">No clients found.</div> : null}
            </div>
          </section>
        </section>
      </div>

      <CustomerSlip selected={slipOpen ? selected : null} draft={draft} updateDraft={updateDraft} saveCustomer={saveCustomer} busy={busy} siteDraft={siteDraft} setSiteDraft={setSiteDraft} addSite={addSite} noteDraft={noteDraft} setNoteDraft={setNoteDraft} addNote={addNote} onClose={() => setSlipOpen(false)} />
    </main>
  );
}

export default function CustomerRecordsPage() {
  if (typeof document === "undefined") return <CustomerRecordsContent />;
  return createPortal(<CustomerRecordsContent />, document.body);
}
