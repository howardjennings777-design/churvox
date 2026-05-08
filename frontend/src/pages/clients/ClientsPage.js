import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import {
  Users, UserPlus, Trash2, Upload, Mail, Phone, MapPin, Pencil, Search,
  CalendarClock, Receipt, Briefcase, FileText, Plus, Building2, UserRound,
  MessageSquare, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import API_BASE from "../../lib/apiBase";
import {
  PremiumPage, PremiumCard, PremiumStatCard, PremiumButton, PremiumEmptyState,
  PremiumLoadingState, PremiumErrorState, PremiumFormSection
} from "../../components/premium";
import EntityDetailModal from "../../components/EntityDetailModal";
import { confirmDialog } from "../../lib/confirmDialog";

axios.defaults.withCredentials = true;

const safeText = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const countValue = (client, keys) => keys.reduce((value, key) => value || Number(client?.[key] || 0), 0);

export default function ClientsPage() {
  const navigate = useNavigate();
  const { user, isEmployer } = useAuth();
  const { get, post, del, loading } = useApi();

  const [clients, setClients] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [activeClient, setActiveClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAuditClients, setShowAuditClients] = useState(false);
  const [hidingAuditClients, setHidingAuditClients] = useState(false);
  const fileInputRef = useRef(null);
  const isOwnerOrAdmin = ["owner", "admin"].includes(String(user?.role || "").toLowerCase());

  const [form, setForm] = useState({
    client_name: "", contact_name: "", email: "", phone: "", address: "", notes: "",
  });

  const fetchClients = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    const res = await get("/clients");
    if (res.success) {
      setClients(Array.isArray(res.data) ? res.data : []);
    } else {
      setClients([]);
      setPageError(typeof res.error === "string" ? res.error : "We couldn't load your clients right now.");
    }
    setPageLoading(false);
  }, [get]);

  useEffect(() => {
    if (!user?.token) return;
    fetchClients();
  }, [user?.token, fetchClients]);

  const isGeneratedAuditClient = useCallback((client) => {
    const haystack = [client?.client_name, client?.name, client?.contact_name, client?.email, client?.address, client?.notes, client?.description]
      .filter(Boolean).join(" ").toLowerCase();
    return haystack.startsWith("deep audit")
      || haystack.includes("deep-audit@example.com")
      || haystack.includes("created by automated churvox true launch certification audit")
      || haystack.includes("deep audit street")
      || String(client?.contact_name || "").toLowerCase().includes("deep audit");
  }, []);

  const hiddenAuditCount = useMemo(() => clients.filter((c) => isGeneratedAuditClient(c)).length, [clients, isGeneratedAuditClient]);

  const filteredClients = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const query = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const isAudit = isGeneratedAuditClient(client);
      if (!showAuditClients && isAudit) return false;

      if (statusFilter === "active" && !(client.email || client.phone || normalizeDate(client.updated_at || client.last_activity_at))) return false;
      if (statusFilter === "with_invoices" && !(countValue(client, ["invoices_count", "invoice_count", "total_invoices", "open_invoices_count"]) > 0)) return false;
      if (statusFilter === "added_month") {
        const d = normalizeDate(client.created_at || client.createdAt || client.added_at);
        if (!d || d < monthStart) return false;
      }

      if (!query) return true;
      const pool = [client.client_name, client.name, client.contact_name, client.email, client.phone, client.address]
        .filter(Boolean).join(" ").toLowerCase();
      return pool.includes(query);
    });
  }, [clients, searchTerm, showAuditClients, statusFilter, isGeneratedAuditClient]);

  const metrics = useMemo(() => {
    const visible = clients.filter((c) => showAuditClients || !isGeneratedAuditClient(c));
    const total = visible.length;
    const active = visible.filter((c) => Boolean(c.email || c.phone || normalizeDate(c.updated_at || c.last_activity_at))).length;
    const withInvoices = visible.filter((c) => countValue(c, ["invoices_count", "invoice_count", "total_invoices", "open_invoices_count"]) > 0).length;
    const recent = visible.filter((c) => {
      const d = normalizeDate(c.created_at || c.createdAt || c.added_at);
      return d && Date.now() - d.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const missingContact = visible.filter((c) => !c.email && !c.phone).length;
    const openJobs = visible.reduce((sum, c) => sum + countValue(c, ["open_jobs_count", "jobs_open_count"]), 0);
    return { total, active, withInvoices, recent, missingContact, openJobs };
  }, [clients, showAuditClients, isGeneratedAuditClient]);

  const topClients = useMemo(() => {
    return [...filteredClients]
      .sort((a, b) => countValue(b, ["open_jobs_count", "jobs_open_count", "open_invoices_count"]) - countValue(a, ["open_jobs_count", "jobs_open_count", "open_invoices_count"]))
      .slice(0, 5);
  }, [filteredClients]);

  const hideAuditClientsOnBackend = useCallback(async () => {
    if (!isOwnerOrAdmin) return;
    setHidingAuditClients(true);
    const res = await post("/clients/hide-audit-test", {});
    if (res?.success) {
      toast.success(`Hidden ${Number(res.hidden_count || 0)} test/audit clients`);
      setShowAuditClients(false);
      await fetchClients();
    } else {
      toast.error(res?.error || "Could not hide test/audit clients");
    }
    setHidingAuditClients(false);
  }, [fetchClients, isOwnerOrAdmin, post]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const payload = {
      client_name: form.client_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    };
    const res = await post("/clients", payload);
    if (res.success) {
      toast.success("Client added");
      setForm({ client_name: "", contact_name: "", email: "", phone: "", address: "", notes: "" });
      setShowAdd(false);
      fetchClients();
    } else {
      toast.error(res.error || "Failed to add client");
    }
  };

  const handleDelete = async (client) => {
    const clientId = client?.id || client?._id;
    if (!clientId) { toast.error("Client ID missing"); return; }
    const ok = await confirmDialog({
      title: "Delete this client?",
      message: "Their jobs, quotes and invoices remain but the client record will be removed.",
      danger: true,
      confirmLabel: "Delete client",
    });
    if (!ok) return;
    const res = await del(`/clients/${clientId}`);
    if (res.success) {
      toast.success("Client removed");
      fetchClients();
    } else {
      toast.error(res.error || "Failed to remove client");
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResults(null);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(`${API_BASE}/api/clients/import-csv`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      setImportResults(response.data || null);
      toast.success("CSV import completed");
      await fetchClients();
    } catch (err) {
      const errorText = err?.response?.data?.detail;
      toast.error(typeof errorText === "string" ? errorText : "CSV import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Layout>
      <PremiumPage>
        <div className="clients-v5">
          <section className="clients-v5-hero">
            <article className="clients-v5-hero-card">
              <p><Users size={13} /> Client workspace</p>
              <h1>{metrics.total} client{metrics.total === 1 ? "" : "s"}</h1>
              <span>Keep customer details, sites, jobs, quotes and invoice follow-ups in one clean workspace.</span>
              <div>
                {isEmployer && <button onClick={() => setShowAdd((p) => !p)}><UserPlus size={15} /> {showAdd ? "Close form" : "Add client"}</button>}
                {isEmployer && <button className="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}><Upload size={15} /> {importing ? "Importing…" : "CSV import"}</button>}
                <button className="secondary" onClick={() => navigate("/jobs/new")}><Plus size={15} /> New job</button>
              </div>
            </article>

            <article className="clients-v5-side-card">
              <p>Needs details</p>
              <b>{metrics.missingContact}</b>
              <span>{metrics.missingContact ? "clients missing email or phone" : "all clients have contact details"}</span>
              <button onClick={() => setSearchTerm("")}>View clients</button>
            </article>
          </section>

          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />

          <div className="px-grid px-grid--4 clients-v5-stats">
            <PremiumStatCard label="Total clients" value={metrics.total} icon={<Users className="h-4 w-4" />} onClick={() => setStatusFilter("all")} />
            <PremiumStatCard label="Active" value={metrics.active} icon={<Sparkles className="h-4 w-4" />} tone="teal" onClick={() => setStatusFilter("active")} />
            <PremiumStatCard label="Open jobs" value={metrics.openJobs} icon={<Briefcase className="h-4 w-4" />} tone="sky" onClick={() => navigate("/jobs")} />
            <PremiumStatCard label="With invoices" value={metrics.withInvoices} icon={<Receipt className="h-4 w-4" />} tone="amber" onClick={() => navigate("/invoices")} />
            <PremiumStatCard label="Added this month" value={metrics.recent} icon={<CalendarClock className="h-4 w-4" />} tone="blue" onClick={() => setStatusFilter("added_month")} />
            <PremiumStatCard label="Needs contact" value={metrics.missingContact} icon={<MessageSquare className="h-4 w-4" />} tone={metrics.missingContact ? "amber" : "green"} />
          </div>

          <section className="clients-v5-overview">
            <article className="clients-v5-panel">
              <div className="clients-v5-panel-head"><p>Quick view</p><h3>Key clients</h3></div>
              {topClients.length ? topClients.map((client) => {
                const cid = client.id || client._id;
                const name = client.client_name || client.name || "Unnamed client";
                return (
                  <button key={cid || name} onClick={() => setActiveClient(client)} className="clients-v5-mini-row">
                    <div><b>{name}</b><span>{safeText(client.address, "No address saved")}</span></div>
                    <em>{countValue(client, ["open_jobs_count", "jobs_open_count"])} jobs</em>
                  </button>
                );
              }) : <div className="clients-v5-empty"><b>No clients yet</b><span>Add or import clients to start building your workspace.</span></div>}
            </article>

            <article className="clients-v5-panel clients-v5-panel--filters">
              <div className="clients-v5-panel-head"><p>Find clients</p><h3>Search and filter</h3></div>
              <div className="clients-v5-search">
                <Search size={16} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search name, email, phone or address…"
                  data-testid="clients-search-input"
                />
              </div>
              <div className="clients-v5-tabs">
                {[["all", "All clients"], ["active", "Active"], ["with_invoices", "With invoices"], ["added_month", "Added this month"]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setStatusFilter(value)} className={statusFilter === value ? "active" : ""}>{label}</button>
                ))}
              </div>
              {isOwnerOrAdmin && (
                <div className="clients-v5-audit-tools">
                  <button type="button" onClick={hideAuditClientsOnBackend} disabled={hidingAuditClients}>{hidingAuditClients ? "Hiding…" : "Hide test clients"}</button>
                  <label><input type="checkbox" checked={showAuditClients} onChange={(e) => setShowAuditClients(e.target.checked)} /> Show test clients</label>
                  {hiddenAuditCount > 0 && !showAuditClients && <span>{hiddenAuditCount} hidden</span>}
                </div>
              )}
            </article>
          </section>

          {showAdd && (
            <PremiumFormSection title="Add a new client" subtitle="Their details will appear on jobs, quotes and invoices.">
              <form onSubmit={handleAdd} className="space-y-4" data-testid="add-client-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="px-field__label">Client name *</label><input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required className="px-input" data-testid="add-client-name-input" /></div>
                  <div><label className="px-field__label">Contact name</label><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="px-input" data-testid="add-client-contact-input" /></div>
                  <div><label className="px-field__label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-input" data-testid="add-client-email-input" /></div>
                  <div><label className="px-field__label">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-input" data-testid="add-client-phone-input" /></div>
                  <div className="md:col-span-2"><label className="px-field__label">Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="px-input" data-testid="add-client-address-input" /></div>
                  <div className="md:col-span-2"><label className="px-field__label">Notes</label><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="px-input" data-testid="add-client-notes-input" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <PremiumButton type="button" variant="secondary" onClick={() => setShowAdd(false)} dataTestId="add-client-cancel-button">Cancel</PremiumButton>
                  <PremiumButton type="submit" disabled={loading} dataTestId="add-client-save-button">{loading ? "Saving…" : "Save client"}</PremiumButton>
                </div>
              </form>
            </PremiumFormSection>
          )}

          {importResults && (
            <PremiumCard title="Import results" actions={<button onClick={() => setImportResults(null)} className="text-[12.5px] text-[#5b6c87] hover:text-[#0d1b34] font-semibold">Dismiss</button>}>
              <p className="text-[13.5px] text-[#5b6c87]">
                Imported: <span className="font-bold text-[#0d1b34]">{importResults.imported ?? 0}</span> · Skipped: <span className="font-bold text-[#0d1b34]">{importResults.skipped ?? 0}</span> · Total: <span className="font-bold text-[#0d1b34]">{importResults.total ?? 0}</span>
              </p>
            </PremiumCard>
          )}

          {pageLoading && clients.length === 0 ? (
            <PremiumLoadingState title="Loading clients…" />
          ) : pageError ? (
            <PremiumErrorState title="Couldn't load clients" subtitle={safeText(pageError, "Please try again.")} action={<PremiumButton onClick={fetchClients} variant="secondary">Retry</PremiumButton>} />
          ) : filteredClients.length === 0 && !loading ? (
            <PremiumEmptyState
              icon={<Users className="h-6 w-6" />}
              title={searchTerm ? "No matching clients" : "No clients yet"}
              subtitle={searchTerm ? "Try another name, email, phone or address." : "Add your first customer or import a CSV to get started."}
              action={isEmployer && !searchTerm ? <div className="flex gap-2 justify-center flex-wrap"><PremiumButton onClick={() => setShowAdd(true)} iconLeft={<UserPlus className="h-4 w-4" />}>Add client</PremiumButton><PremiumButton variant="secondary" onClick={() => fileInputRef.current?.click()} iconLeft={<Upload className="h-4 w-4" />}>CSV import</PremiumButton></div> : null}
            />
          ) : (
            <div className="clients-v5-list">
              {filteredClients.map((client) => {
                const cid = client.id || client._id;
                const clientName = client.client_name || client.name || "Unnamed client";
                const avatarLetter = safeText(clientName, "U").charAt(0).toUpperCase();
                const openJobs = countValue(client, ["open_jobs_count", "jobs_open_count"]);
                const openInvoices = countValue(client, ["open_invoices_count", "invoices_count", "invoice_count"]);
                const quotes = countValue(client, ["quote_count", "quotes_count"]);
                return (
                  <div key={cid || clientName} className="clients-v5-row" data-testid={`client-card-${cid}`} onClick={() => setActiveClient(client)}>
                    <div className="clients-v5-avatar">{avatarLetter}</div>
                    <div className="clients-v5-main">
                      <div className="clients-v5-title"><b>{clientName}</b>{client.contact_name && <span>{client.contact_name}</span>}</div>
                      <div className="clients-v5-meta">
                        <span><Mail size={13} />{safeText(client.email)}</span>
                        <span><Phone size={13} />{safeText(client.phone)}</span>
                        <span><MapPin size={13} />{safeText(client.address)}</span>
                      </div>
                      {client.notes && <p>{client.notes}</p>}
                    </div>
                    <div className="clients-v5-counts">
                      <span><b>{openJobs}</b>Jobs</span>
                      <span><b>{openInvoices}</b>Invoices</span>
                      <span><b>{quotes}</b>Quotes</span>
                    </div>
                    <div className="clients-v5-actions" onClick={(e) => e.stopPropagation()}>
                      <PremiumButton size="sm" variant="secondary" onClick={() => setActiveClient(client)}>Open</PremiumButton>
                      <PremiumButton size="sm" variant="secondary" onClick={() => navigate(`/jobs/new?client=${cid}`)} iconLeft={<Briefcase size={13} />}>New job</PremiumButton>
                      <PremiumButton size="sm" variant="secondary" onClick={() => navigate(`/quotes/new?client=${cid}`)} iconLeft={<FileText size={13} />}>Quote</PremiumButton>
                      {isEmployer && <button onClick={() => navigate(`/clients/${cid}/edit`)} className="clients-v5-icon-btn" title="Edit"><Pencil size={15} /></button>}
                      {isEmployer && <button onClick={() => handleDelete(client)} className="clients-v5-icon-btn danger" title="Delete"><Trash2 size={15} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <EntityDetailModal open={Boolean(activeClient)} onClose={() => setActiveClient(null)} title={activeClient ? `Client details · ${activeClient.client_name || activeClient.name || activeClient.id}` : "Client details"} entityType="client" item={activeClient} />
        </div>
      </PremiumPage>
    </Layout>
  );
}
