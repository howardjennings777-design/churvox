import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { Building2, FileText, Plus, RefreshCw, Save, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import "./CustomerRecordsPage.css";

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function idOf(value) {
  return String(value?.id || value?._id || "");
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function customerName(customer) {
  return customer?.name || customer?.client_name || customer?.contact_name || "Unnamed customer";
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

export default function CustomerRecordsPage() {
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

  async function loadCustomers() {
    setLoading(true);
    const res = await api.get("/customer-records");
    if (res.success) {
      const next = arr(res.data?.customers);
      setCustomers(next);
      setTotals(res.data?.totals || {});
      if (!selectedId && next[0]) {
        setSelectedId(idOf(next[0]));
        setDraft(next[0]);
      } else if (selectedId) {
        const selected = next.find((x) => idOf(x) === selectedId);
        if (selected) setDraft(selected);
      }
    } else {
      toast.error(res.error || "Could not load customer records");
    }
    setLoading(false);
  }

  useEffect(() => { loadCustomers(); }, []);

  const selected = useMemo(() => customers.find((x) => idOf(x) === selectedId) || draft, [customers, selectedId, draft]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) => {
      const haystack = [
        customerName(customer),
        customer.email,
        customer.phone,
        customer.billing_address,
        customer.address,
        customer.customer_type,
        arr(customer.tags).join(" "),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, search]);

  function pick(customer) {
    setSelectedId(idOf(customer));
    setDraft({ ...customer });
    setSiteDraft({ label: "", address: "", contact: "", phone: "", access_notes: "" });
    setNoteDraft("");
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...(current || {}), [key]: value }));
  }

  async function saveCustomer() {
    if (!draft) return;
    setBusy("save");
    const res = await api.patch(`/customer-records/${idOf(draft)}`, draft);
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
    setBusy("site");
    const res = await api.post(`/customer-records/${idOf(selected)}/site-addresses`, siteDraft);
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
    setBusy("note");
    const res = await api.post(`/customer-records/${idOf(selected)}/notes`, { note: noteDraft });
    setBusy("");
    if (res.success) {
      toast.success("Note added");
      setNoteDraft("");
      await loadCustomers();
    } else {
      toast.error(res.error || "Could not save note");
    }
  }

  const summary = selected?.summary || {};

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero
        eyebrow="Customer records"
        title="Every customer, site, job, quote and invoice in one place."
        subtitle="Keep contact details, site notes, access instructions, payment history and job proof tidy before the owner approves work."
        icon={<UserRound className="h-6 w-6" />}
        actions={
          <div className="cv-crm-hero-actions">
            <PremiumButton variant="secondary" onClick={loadCustomers} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>
            <PremiumButton onClick={() => navigate("/clients/new")}><Plus size={16} className="mr-2" /> Add customer</PremiumButton>
          </div>
        }
      />

      <section className="cv-crm-metrics">
        <article><span>Customers</span><b>{totals.customers || 0}</b><small>saved records</small></article>
        <article className="warn"><span>Missing info</span><b>{totals.missing_info || 0}</b><small>need cleanup</small></article>
        <article><span>Jobs</span><b>{totals.jobs || 0}</b><small>customer history</small></article>
        <article><span>Quotes</span><b>{totals.quotes || 0}</b><small>quote history</small></article>
        <article><span>Invoices</span><b>{totals.invoices || 0}</b><small>invoice history</small></article>
        <article className="money"><span>Unpaid</span><b>{money(totals.unpaid_balance)}</b><small>customer balances</small></article>
      </section>

      <section className="cv-crm-shell">
        <aside className="cv-crm-list">
          <div className="cv-crm-search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers, email, phone, address..." />
          </div>

          {loading ? <div className="cv-crm-empty">Loading customers…</div> : null}

          {!loading && filtered.length ? filtered.map((customer) => (
            <button
              key={idOf(customer)}
              type="button"
              className={idOf(customer) === idOf(selected) ? "active" : ""}
              onClick={() => pick(customer)}
            >
              <b>{customerName(customer)}</b>
              <span>{customer.email || customer.phone || customer.billing_address || "Missing contact info"}</span>
              <em>{customer.summary?.is_missing_info ? "Needs info" : money(customer.summary?.unpaid_balance)}</em>
            </button>
          )) : null}

          {!loading && !filtered.length ? <div className="cv-crm-empty">No customers found.</div> : null}
        </aside>

        <main className="cv-crm-detail">
          {!selected ? (
            <PremiumCard><div className="cv-crm-empty">Select a customer to view the full record.</div></PremiumCard>
          ) : (
            <>
              <PremiumCard>
                <header className="cv-crm-profile-head">
                  <div>
                    <p>Customer profile</p>
                    <h2>{customerName(selected)}</h2>
                    <span>{selected.email || "No email"} · {selected.phone || "No phone"}</span>
                  </div>
                  <div className="cv-crm-profile-actions">
                    <Link to={`/jobs/new?client_id=${idOf(selected)}`}>Create job</Link>
                    <Link to={`/quotes/new?client_id=${idOf(selected)}`}>Create quote</Link>
                    <Link to={`/invoices/new?client_id=${idOf(selected)}`}>Create invoice</Link>
                  </div>
                </header>

                {arr(summary.missing_fields).length ? (
                  <div className="cv-crm-warning">
                    Missing: {summary.missing_fields.join(", ")}. Fix these before relying on customer messages or invoices.
                  </div>
                ) : null}

                <section className="cv-crm-mini-metrics">
                  <div><span>Jobs</span><b>{summary.jobs_count || 0}</b></div>
                  <div><span>Quotes</span><b>{summary.quotes_count || 0}</b></div>
                  <div><span>Invoices</span><b>{summary.invoices_count || 0}</b></div>
                  <div><span>Unpaid</span><b>{money(summary.unpaid_balance)}</b></div>
                  <div><span>Paid total</span><b>{money(summary.paid_total)}</b></div>
                  <div><span>Photos</span><b>{summary.photos_count || 0}</b></div>
                </section>
              </PremiumCard>

              <PremiumCard title="Editable customer details" icon={<Save className="h-5 w-5" />}>
                <div className="cv-crm-form">
                  {editableFields.map(([key, label]) => (
                    <label key={key} className={["access_notes", "site_instructions", "internal_notes", "customer_message_draft"].includes(key) ? "wide" : ""}>
                      <span>{label}</span>
                      {["access_notes", "site_instructions", "internal_notes", "customer_message_draft"].includes(key) ? (
                        <textarea rows={3} value={draft?.[key] || ""} onChange={(e) => updateDraft(key, e.target.value)} />
                      ) : (
                        <input value={draft?.[key] || ""} onChange={(e) => updateDraft(key, e.target.value)} />
                      )}
                    </label>
                  ))}
                </div>

                <div className="cv-crm-save-row">
                  <PremiumButton onClick={saveCustomer} disabled={busy === "save"}><Save size={16} className="mr-2" /> Save customer</PremiumButton>
                </div>
              </PremiumCard>

              <section className="cv-crm-two">
                <PremiumCard title="Site addresses" icon={<Building2 className="h-5 w-5" />}>
                  {arr(selected.site_addresses).length ? arr(selected.site_addresses).map((site, index) => (
                    <div className="cv-crm-site" key={index}>
                      <b>{site.label || `Site ${index + 1}`}</b>
                      <span>{site.address}</span>
                      <small>{site.contact || ""} {site.phone ? `· ${site.phone}` : ""}</small>
                      {site.access_notes ? <em>{site.access_notes}</em> : null}
                    </div>
                  )) : <div className="cv-crm-empty">No extra site addresses yet.</div>}

                  <div className="cv-crm-site-form">
                    {["label", "address", "contact", "phone", "access_notes"].map((key) => (
                      <input
                        key={key}
                        value={siteDraft[key] || ""}
                        onChange={(e) => setSiteDraft((current) => ({ ...current, [key]: e.target.value }))}
                        placeholder={key.replace("_", " ")}
                      />
                    ))}
                    <button type="button" onClick={addSite} disabled={busy === "site"}>Add site</button>
                  </div>
                </PremiumCard>

                <PremiumCard title="Quick internal note" icon={<FileText className="h-5 w-5" />}>
                  <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={5} placeholder="Add note about access, customer preference, billing issue, dog on site..." />
                  <button type="button" onClick={addNote} disabled={busy === "note"}>Save note</button>
                </PremiumCard>
              </section>

              <section className="cv-crm-history">
                <PremiumCard title="Job history">
                  {arr(selected.jobs).length ? arr(selected.jobs).slice(0, 8).map((job) => (
                    <Link key={idOf(job)} to={`/jobs/${idOf(job)}`}><b>{job.title || job.job_name || "Job"}</b><span>{job.status || "open"} · {job.address || ""}</span></Link>
                  )) : <div className="cv-crm-empty">No jobs yet.</div>}
                </PremiumCard>

                <PremiumCard title="Quote history">
                  {arr(selected.quotes).length ? arr(selected.quotes).slice(0, 8).map((quote) => (
                    <Link key={idOf(quote)} to={`/quotes/${idOf(quote)}`}><b>{quote.quote_number || quote.title || "Quote"}</b><span>{quote.status || "open"} · {money(quote.total || quote.amount)}</span></Link>
                  )) : <div className="cv-crm-empty">No quotes yet.</div>}
                </PremiumCard>

                <PremiumCard title="Invoice history">
                  {arr(selected.invoices).length ? arr(selected.invoices).slice(0, 8).map((invoice) => (
                    <Link key={idOf(invoice)} to={`/invoices/${idOf(invoice)}`}><b>{invoice.invoice_number || "Invoice"}</b><span>{invoice.status || "open"} · {money(invoice.amount_due || invoice.total)}</span></Link>
                  )) : <div className="cv-crm-empty">No invoices yet.</div>}
                </PremiumCard>
              </section>
            </>
          )}
        </main>
      </section>
    </PremiumPage>
  );
}
