import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import {
  Users, UserPlus, Trash2, Upload, Mail, Phone, MapPin, Pencil, Search,
  CalendarClock, Receipt, Sparkles, Briefcase, FileText, Plus, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import API_BASE from "../../lib/apiBase";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumStatCard, PremiumButton,
  PremiumAIBox, PremiumAIDraftPanel, PremiumEmptyState, PremiumLoadingState, PremiumErrorState,
  PremiumFormSection,
} from "../../components/premium";

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
    const haystack = [
      client?.client_name, client?.name, client?.contact_name, client?.email, client?.address, client?.notes, client?.description,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.startsWith("deep audit")
      || haystack.includes("deep-audit@example.com")
      || haystack.includes("created by automated churvox true launch certification audit")
      || haystack.includes("deep audit street")
      || String(client?.contact_name || "").toLowerCase().includes("deep audit");
  }, []);

  const filteredClients = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const query = searchTerm.trim().toLowerCase();
    return clients.filter((c) => {
      const isAudit = isGeneratedAuditClient(c);
      if (!showAuditClients && isAudit) return false;
      if (statusFilter === "active" && !(c.email || c.phone || normalizeDate(c.updated_at || c.last_activity_at))) return false;
      if (statusFilter === "with_invoices" && !(Number(c.invoices_count ?? c.invoice_count ?? c.total_invoices ?? 0) > 0)) return false;
      if (statusFilter === "added_month") {
        const d = normalizeDate(c.created_at || c.createdAt || c.added_at);
        if (!d || d < monthStart) return false;
      }
      if (!query) return true;
      const pool = [c.client_name, c.name, c.contact_name, c.email, c.phone, c.address]
        .filter(Boolean).join(" ").toLowerCase();
      return pool.includes(query);
    });
  }, [clients, searchTerm, showAuditClients, statusFilter, isGeneratedAuditClient]);



  const hiddenAuditCount = useMemo(() => clients.filter((c) => isGeneratedAuditClient(c)).length, [clients, isGeneratedAuditClient]);

  const hideAuditClientsOnBackend = useCallback(async () => {
    if (!isOwnerOrAdmin) return;
    setHidingAuditClients(true);
    const res = await post('/clients/hide-audit-test', {});
    if (res?.success) {
      toast.success(`Hidden ${Number(res.hidden_count || 0)} test/audit clients`);
      setShowAuditClients(false);
      await fetchClients();
    } else {
      toast.error(res?.error || 'Could not hide test/audit clients');
    }
    setHidingAuditClients(false);
  }, [fetchClients, isOwnerOrAdmin, post]);

  const metrics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => Boolean(c.email || c.phone || normalizeDate(c.updated_at || c.last_activity_at))).length;
    const withInvoices = clients.filter((c) => Number(c.invoices_count ?? c.invoice_count ?? c.total_invoices ?? 0) > 0).length;
    const recent = clients.filter((c) => {
      const d = normalizeDate(c.created_at || c.createdAt || c.added_at);
      if (!d) return false;
      return Date.now() - d.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, active, withInvoices, recent };
  }, [clients]);

  const aiSuggestions = useMemo(() => {
    const noEmail = clients.filter((c) => !c.email && !c.phone);
    const out = [];
    if (clients.length === 0) {
      out.push({ icon: <Users className="h-4 w-4" />, title: "Add your first client", description: "Or import a CSV with names, emails, phones, addresses." });
    } else {
      out.push({
        icon: <Sparkles className="h-4 w-4" />,
        title: "Activity summary ready",
        description: "AI can summarise jobs, quotes and invoices per client — open any client to draft a follow-up.",
      });
      if (noEmail.length > 0) {
        out.push({
          icon: <Mail className="h-4 w-4" />,
          title: `${noEmail.length} client${noEmail.length === 1 ? "" : "s"} missing contact info`,
          description: "Add email or phone so reminders, quotes and invoices can be delivered.",
        });
      }
      out.push({
        icon: <MessageSquare className="h-4 w-4" />,
        title: "Draft a polite check-in for inactive clients",
        description: "AI can prepare wording — you approve before sending.",
      });
    }
    return out.slice(0, 4);
  }, [clients]);

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
    const ok = window.confirm("Delete this client?");
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
        <PremiumHero
          icon={<Users className="h-7 w-7" />}
          eyebrow={<><Users className="h-3 w-3" /> Customers</>}
          title="Clients"
          subtitle="Customer cards, site details, contact channels and AI-suggested follow-ups for every relationship."
          actions={
            isEmployer ? (
              <>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                <PremiumButton variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing} iconLeft={<Upload className="h-4 w-4" />}>
                  {importing ? "Importing…" : "CSV import"}
                </PremiumButton>
                <PremiumButton onClick={() => setShowAdd((p) => !p)} iconLeft={<UserPlus className="h-4 w-4" />} dataTestId="add-client-button">
                  {showAdd ? "Close" : "Add client"}
                </PremiumButton>
              </>
            ) : null
          }
        />

        <PremiumAIBox
          title="AI Client Assistant"
          subtitle="Activity summaries and follow-up drafts — review before sending"
          chip="Approval-first"
          suggestions={aiSuggestions}
        />

        <div className="px-grid px-grid--4">
          <PremiumStatCard label="Total clients" value={metrics.total} icon={<Users className="h-4 w-4" />} onClick={() => {}} />
          <PremiumStatCard label="Active" value={metrics.active} icon={<Sparkles className="h-4 w-4" />} tone="teal" onClick={() => {}} />
          <PremiumStatCard label="With invoices" value={metrics.withInvoices} icon={<Receipt className="h-4 w-4" />} tone="amber" onClick={() => navigate("/invoices")} />
          <PremiumStatCard label="Added this month" value={metrics.recent} icon={<CalendarClock className="h-4 w-4" />} tone="amber" onClick={() => {}} />
        </div>

        {/* Search */}
        <PremiumCard noBody>
          <div className="px-card__body">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#746c60]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, phone, or address…"
                className="px-input pl-10"
                data-testid="clients-search-input"
              />
            </div>
          </div>
          <div className="px-card__body pt-0 flex flex-wrap items-center gap-2">
            {[
              ["all", "All clients"], ["active", "Active"], ["with_invoices", "With invoices"], ["added_month", "Added this month"],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  statusFilter === value ? "bg-[#d94f17] border-[#b93f10] text-white" : "bg-[#d7d0c4] border-[#746c60] text-[#2f343b]"
                }`}>
                {label}
              </button>
            ))}
            {isOwnerOrAdmin && (
              <>
                <button type="button" onClick={hideAuditClientsOnBackend} disabled={hidingAuditClients} className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-[#111317] border-[#242932] text-white disabled:opacity-50">
                  {hidingAuditClients ? "Hiding…" : "Hide test audit clients"}
                </button>
                <label className="ml-1 inline-flex items-center gap-2 text-xs font-semibold text-[#2f343b]">
                  <input type="checkbox" checked={showAuditClients} onChange={(e) => setShowAuditClients(e.target.checked)} />
                  Show test/audit clients
                </label>
              </>
            )}
            {hiddenAuditCount > 0 && !showAuditClients && (
              <span className="ml-auto text-xs text-[#5f584f]">{hiddenAuditCount} test/audit clients hidden</span>
            )}
          </div>
        </PremiumCard>

        {showAdd && (
          <PremiumFormSection title="Add a new client" subtitle="Their details will appear on quotes and invoices.">
            <form onSubmit={handleAdd} className="space-y-4" data-testid="add-client-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="px-field__label">Client name *</label>
                  <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required className="px-input" data-testid="add-client-name-input" />
                </div>
                <div>
                  <label className="px-field__label">Contact name</label>
                  <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="px-input" data-testid="add-client-contact-input" />
                </div>
                <div>
                  <label className="px-field__label">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-input" data-testid="add-client-email-input" />
                </div>
                <div>
                  <label className="px-field__label">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="px-input" data-testid="add-client-phone-input" />
                </div>
                <div className="md:col-span-2">
                  <label className="px-field__label">Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="px-input" data-testid="add-client-address-input" />
                </div>
                <div className="md:col-span-2">
                  <label className="px-field__label">Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="px-input" data-testid="add-client-notes-input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <PremiumButton type="button" variant="secondary" onClick={() => setShowAdd(false)} dataTestId="add-client-cancel-button">Cancel</PremiumButton>
                <PremiumButton type="submit" disabled={loading} dataTestId="add-client-save-button">
                  {loading ? "Saving…" : "Save client"}
                </PremiumButton>
              </div>
            </form>
          </PremiumFormSection>
        )}

        {importResults && (
          <PremiumCard
            title="Import results"
            actions={<button onClick={() => setImportResults(null)} className="text-[12.5px] text-[#5b6c87] hover:text-[#0d1b34] font-semibold">Dismiss</button>}
          >
            <p className="text-[13.5px] text-[#5b6c87]">
              Imported: <span className="font-bold text-[#0d1b34]">{importResults.imported ?? 0}</span> ·
              Skipped: <span className="font-bold text-[#0d1b34]">{importResults.skipped ?? 0}</span> ·
              Total: <span className="font-bold text-[#0d1b34]">{importResults.total ?? 0}</span>
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
            action={isEmployer && !searchTerm ? (
              <div className="flex gap-2 justify-center flex-wrap">
                <PremiumButton onClick={() => setShowAdd(true)} iconLeft={<UserPlus className="h-4 w-4" />}>Add client</PremiumButton>
                <PremiumButton variant="secondary" onClick={() => fileInputRef.current?.click()} iconLeft={<Upload className="h-4 w-4" />}>CSV import</PremiumButton>
              </div>
            ) : null}
          />
        ) : (
          <div className="grid gap-3">
            {filteredClients.map((client) => {
              const cid = client.id || client._id;
              const clientName = client.client_name || client.name || "Unnamed Client";
              const avatarLetter = safeText(clientName, "U").charAt(0).toUpperCase();
              return (
                <div key={cid} className="px-card px-card--hover" data-testid={`client-card-${cid}`}>
                  <div className="px-card__body">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <Link to={`/clients/${cid}`} className="min-w-0 flex-1 group">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white font-bold text-[15px]"
                                style={{ background: "linear-gradient(135deg, #d94f17, #b93f10)" }}>
                            {avatarLetter}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[15.5px] font-bold text-[#1f2329] truncate group-hover:text-[#d94f17] transition">{clientName}</p>
                            {client.contact_name && (
                              <p className="text-[12.5px] text-[#5f584f] mt-0.5 truncate">Contact: {client.contact_name}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-[12.5px] text-[#5f584f]">
                          <p className="flex items-center gap-1.5 min-w-0"><Mail size={13} className="shrink-0" /><span className="truncate">{safeText(client.email)}</span></p>
                          <p className="flex items-center gap-1.5 min-w-0"><Phone size={13} className="shrink-0" /><span className="truncate">{safeText(client.phone)}</span></p>
                          <p className="flex items-center gap-1.5 min-w-0 sm:col-span-2"><MapPin size={13} className="shrink-0" /><span className="truncate">{safeText(client.address)}</span></p>
                        </div>

                        {client.notes && (
                          <p className="mt-2 rounded-xl bg-[#cfc7ba] border border-[#746c60] p-2.5 text-[12.5px] text-[#49443d] line-clamp-2">{client.notes}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] text-[#49443d]">
                          <span>Open jobs: {Number(client.open_jobs_count ?? client.jobs_open_count ?? 0)}</span>
                          <span>Open invoices: {Number(client.open_invoices_count ?? client.invoices_count ?? 0)}</span>
                          <span>Quotes: {Number(client.quote_count ?? client.quotes_count ?? 0)}</span>
                        </div>
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end" onClick={(e) => e.stopPropagation()}>
                        <PremiumButton size="sm" variant="secondary" onClick={() => navigate(`/jobs/new?client=${cid}`)} iconLeft={<Briefcase size={13} />}>New job</PremiumButton>
                        <PremiumButton size="sm" variant="secondary" onClick={() => navigate(`/quotes/new?client=${cid}`)} iconLeft={<FileText size={13} />}>New quote</PremiumButton>
                        {isEmployer && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => navigate(`/clients/${cid}/edit`)} className="px-btn px-btn--ghost px-btn--sm text-[#5b6c87]" title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => handleDelete(client)} className="px-btn px-btn--ghost px-btn--sm text-[#dc2626] hover:!bg-[#fff5f5]" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PremiumPage>
    </Layout>
  );
}
