import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Users,
  UserPlus,
  Trash2,
  Upload,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Search,
  CalendarClock,
  Receipt,
  Sparkles,
  AlertTriangle,
  Briefcase,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import API_BASE from "../../lib/apiBase";

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
  const { user, isEmployer } = useAuth();
  const { get, post, del, loading } = useApi();

  const [clients, setClients] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    client_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
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

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      const pool = [
        client.client_name,
        client.name,
        client.contact_name,
        client.email,
        client.phone,
        client.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return pool.includes(query);
    });
  }, [clients, searchTerm]);

  const metrics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((client) => {
      const hasContact = Boolean(client.email || client.phone);
      const hasRecentDate = normalizeDate(client.updated_at || client.last_activity_at || client.created_at);
      return hasContact || Boolean(hasRecentDate);
    }).length;

    const withInvoices = clients.filter((client) => {
      const explicit = Number(client.invoices_count ?? client.invoice_count ?? client.total_invoices ?? 0);
      return Number.isFinite(explicit) && explicit > 0;
    }).length;

    const recent = clients.filter((client) => {
      const createdDate = normalizeDate(client.created_at || client.createdAt || client.added_at);
      if (!createdDate) return false;
      const msIn30Days = 30 * 24 * 60 * 60 * 1000;
      return Date.now() - createdDate.getTime() <= msIn30Days;
    }).length;

    return {
      total,
      active,
      withInvoices,
      recent,
      invoicesFallback: withInvoices === 0,
      recentFallback: recent === 0,
    };
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
      setForm({
        client_name: "",
        contact_name: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
      });
      setShowAdd(false);
      fetchClients();
    } else {
      toast.error(res.error || "Failed to add client");
    }
  };

  const handleDelete = async (client) => {
    const clientId = client?.id || client?._id;
    if (!clientId) {
      toast.error("Client ID missing");
      return;
    }

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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
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
      <div className="cx-page space-y-6" data-testid="clients-page">
        <div className="cx-page-hero flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="cx-page-title">Clients</h1>
            <p className="cx-page-subtitle">Manage service clients, site details, job history, and billing relationships.</p>
          </div>

          {isEmployer && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                className="hidden"
              />

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="cx-button-secondary"
              >
                <Upload size={16} className="mr-2" />
                {importing ? "Importing..." : "CSV Import"}
              </Button>

              <Button
                type="button"
                onClick={() => setShowAdd((prev) => !prev)}
                className="cx-button-primary"
                data-testid="add-client-button"
              >
                <UserPlus size={16} className="mr-2" />
                {showAdd ? "Close" : "Add Client"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className="cx-stat-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Total clients</p>
                  <p className="mt-1 text-2xl font-semibold text-[#172033]">{metrics.total}</p>
                </div>
                <span className="rounded-xl bg-[#EAF2FF] p-2 text-[#155EEF]"><Users size={16} /></span>
              </div>
            </CardContent>
          </Card>

          <Card className="cx-stat-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Active clients</p>
                  <p className="mt-1 text-2xl font-semibold text-[#172033]">{metrics.active}</p>
                </div>
                <span className="rounded-xl bg-[#EAF8EF] p-2 text-[#16A34A]"><Sparkles size={16} /></span>
              </div>
            </CardContent>
          </Card>

          <Card className="cx-stat-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">With invoices</p>
                  <p className="mt-1 text-2xl font-semibold text-[#172033]">{metrics.withInvoices}</p>
                  {metrics.invoicesFallback && <p className="text-xs text-[#667085] mt-1">Waiting for invoice-linked data.</p>}
                </div>
                <span className="rounded-xl bg-[#FFF6E5] p-2 text-[#F59E0B]"><Receipt size={16} /></span>
              </div>
            </CardContent>
          </Card>

          <Card className="cx-stat-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Recently added</p>
                  <p className="mt-1 text-2xl font-semibold text-[#172033]">{metrics.recent}</p>
                  {metrics.recentFallback && <p className="text-xs text-[#667085] mt-1">No recent additions detected.</p>}
                </div>
                <span className="rounded-xl bg-[#EAF2FF] p-2 text-[#155EEF]"><CalendarClock size={16} /></span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="cx-toolbar cx-panel p-3 md:p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, or address"
              className="pl-9 cx-input"
              data-testid="clients-search-input"
            />
          </div>
        </div>

        {showAdd && (
          <Card className="cx-panel" data-testid="add-client-form">
            <CardContent className="p-6 space-y-4 text-slate-900">
              <div>
                <div className="text-lg font-semibold text-slate-900">Add Client</div>
                <div className="text-sm text-slate-500 mt-1">Fill in client details below.</div>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <Label>Client Name</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    required
                    className="cx-input"
                    data-testid="add-client-name-input"
                  />
                </div>

                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="cx-input"
                    data-testid="add-client-contact-input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="cx-input"
                      data-testid="add-client-email-input"
                    />
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="cx-input"
                      data-testid="add-client-phone-input"
                    />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="cx-input"
                    data-testid="add-client-address-input"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="cx-input"
                    data-testid="add-client-notes-input"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAdd(false);
                      setForm({ client_name: "", contact_name: "", email: "", phone: "", address: "", notes: "" });
                    }}
                    data-testid="add-client-cancel-button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="cx-button-primary"
                    data-testid="add-client-save-button"
                  >
                    {loading ? "Saving..." : "Save Client"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {importResults && (
          <Card className="cx-panel">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-900 font-medium">Import Results</p>
                <button
                  onClick={() => setImportResults(null)}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-sm text-slate-500">
                Imported: {importResults.imported ?? 0} | Skipped: {importResults.skipped ?? 0} | Total: {importResults.total ?? 0}
              </p>
            </CardContent>
          </Card>
        )}

        {pageLoading && clients.length === 0 ? (
          <div className="cx-loading-state">
            <div className="mx-auto mb-4 animate-spin rounded-full h-8 w-8 border-t-2 border-[#155EEF]" />
            <p className="text-sm text-[#667085]">Loading your clients workspace…</p>
          </div>
        ) : pageError ? (
          <div className="cx-error-state">
            <AlertTriangle className="mx-auto mb-3 text-[#DC2626]" size={28} />
            <p className="text-[#172033] font-medium mb-1">Couldn&apos;t load clients</p>
            <p className="text-sm text-[#667085] mb-4">{safeText(pageError, "Please try again.")}</p>
            <Button onClick={fetchClients} className="cx-button-secondary">Retry</Button>
          </div>
        ) : filteredClients.length === 0 && !loading ? (
          <Card className="cx-empty-state">
            <CardContent className="p-8 text-center">
              <Users className="mx-auto mb-3 text-slate-500/40" size={32} />
              <p className="text-slate-900 font-medium mb-1">{searchTerm ? "No matching clients" : "No clients yet"}</p>
              <p className="text-sm text-slate-500 mb-4">
                {searchTerm
                  ? "Try another name, email, phone, or address."
                  : "Add your first customer or import a CSV to get started."}
              </p>
              {isEmployer && !searchTerm && (
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    onClick={() => setShowAdd(true)}
                    size="sm"
                    className="cx-button-primary"
                  >
                    <UserPlus size={14} className="mr-1" />
                    Add Client
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="cx-button-secondary"
                  >
                    <Upload size={14} className="mr-1" />
                    CSV Import
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredClients.map((client) => {
              const cid = client.id || client._id;
              const clientName = client.client_name || client.name || "Unnamed Client";
              const avatarLetter = safeText(clientName, "U").charAt(0).toUpperCase();

              return (
                <Card key={cid} className="cx-client-card" data-testid={`client-card-${cid}`}>
                  <CardContent className="p-4 md:p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#155EEF] font-semibold">
                            {avatarLetter}
                          </span>

                          <div className="min-w-0">
                            <Link to={`/clients/${cid}`} className="text-slate-900 hover:text-[#155EEF] transition-colors">
                              <p className="text-base md:text-lg font-semibold truncate">{clientName}</p>
                            </Link>
                            {client.contact_name && (
                              <p className="text-sm text-[#667085] mt-0.5 truncate">Contact: {client.contact_name}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-sm text-[#667085]">
                          <p className="flex items-center gap-1.5 min-w-0">
                            <Mail size={13} className="shrink-0" />
                            <span className="truncate">{safeText(client.email)}</span>
                          </p>
                          <p className="flex items-center gap-1.5 min-w-0">
                            <Phone size={13} className="shrink-0" />
                            <span className="truncate">{safeText(client.phone)}</span>
                          </p>
                          <p className="flex items-center gap-1.5 min-w-0 sm:col-span-2">
                            <MapPin size={13} className="shrink-0" />
                            <span className="truncate">{safeText(client.address)}</span>
                          </p>
                        </div>

                        {client.notes && (
                          <p className="mt-3 rounded-xl bg-[#fbfaf7] border border-border p-2.5 text-sm text-[#667085] line-clamp-2">
                            {client.notes}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-border">
                            <Link to="/jobs">
                              <Briefcase size={13} className="mr-1" /> View jobs
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-border">
                            <Link to="/jobs/new">
                              <Briefcase size={13} className="mr-1" /> New job
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg border-border">
                            <Link to="/quotes/new">
                              <FileText size={13} className="mr-1" /> New quote
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {isEmployer && (
                        <div className="flex items-center gap-1 md:pl-2" onClick={(e) => e.preventDefault()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="text-slate-500 hover:text-slate-900 hover:bg-blue-50"
                          >
                            <Link to={`/clients/${cid}/edit`} onClick={(e) => e.stopPropagation()}>
                              <Pencil size={16} />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDelete(client);
                            }}
                            className="text-[#DC2626] hover:text-[#DC2626] hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
