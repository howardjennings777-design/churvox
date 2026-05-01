// CHURVOX_PREMIUM_TRADIE_REDESIGN_ACTIVE
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { TradiePage, TradieHeader, TradiePanel, TradieList, TradieBadge, TradieActions, TradieEmptyState, TradieLoadingState } from "../../components/premiumTradie";
import { UserPlus, Trash2, Upload, Pencil, Search, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import API_BASE from "../../lib/apiBase";

axios.defaults.withCredentials = true;
const safeText = (value, fallback = "—") => (value === null || value === undefined || String(value).trim() === "" ? fallback : String(value).trim());
const normalizeDate = (value) => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; };

export default function ClientsPage() {
  const { user, isEmployer } = useAuth();
  const { get, post, del, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ client_name: "", contact_name: "", email: "", phone: "", address: "", notes: "" });

  const fetchClients = useCallback(async () => {
    setPageLoading(true); setPageError("");
    const res = await get("/clients");
    if (res.success) setClients(Array.isArray(res.data) ? res.data : []);
    else { setClients([]); setPageError(typeof res.error === "string" ? res.error : "We couldn't load your clients right now."); }
    setPageLoading(false);
  }, [get]);

  useEffect(() => { if (user?.token) fetchClients(); }, [user?.token, fetchClients]);

  const metrics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => Boolean(c.email || c.phone || normalizeDate(c.updated_at || c.last_activity_at || c.created_at))).length;
    const withInvoices = clients.filter((c) => Number(c.invoices_count ?? c.invoice_count ?? c.total_invoices ?? 0) > 0).length;
    const recent = clients.filter((c) => { const d = normalizeDate(c.created_at || c.createdAt || c.added_at); return d && Date.now() - d.getTime() <= 30 * 24 * 60 * 60 * 1000; }).length;
    return { total, active, withInvoices, recent };
  }, [clients]);

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const pool = [client.client_name, client.name, client.contact_name, client.email, client.phone, client.address].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || pool.includes(query);
      const hasActivity = Boolean(client.email || client.phone || normalizeDate(client.updated_at || client.last_activity_at || client.created_at));
      const matchesFilter = activityFilter === "all" || (activityFilter === "active" && hasActivity) || (activityFilter === "quiet" && !hasActivity);
      return matchesSearch && matchesFilter;
    });
  }, [clients, searchTerm, activityFilter]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await post("/clients", Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])));
    if (res.success) { toast.success("Client added"); setForm({ client_name: "", contact_name: "", email: "", phone: "", address: "", notes: "" }); setShowAdd(false); fetchClients(); }
    else toast.error(res.error || "Failed to add client");
  };

  const handleDelete = async (client) => {
    const id = client?.id || client?._id;
    if (!id) return toast.error("Client ID missing");
    if (!window.confirm("Delete this client?")) return;
    const res = await del(`/clients/${id}`);
    if (res.success) { toast.success("Client removed"); fetchClients(); } else toast.error(res.error || "Failed to remove client");
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setImportResults(null);
    try {
      const formData = new FormData(); formData.append("file", file);
      const response = await axios.post(`${API_BASE}/api/clients/import-csv`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" }, withCredentials: true });
      setImportResults(response.data || null); toast.success("CSV import completed"); await fetchClients();
    } catch (err) { toast.error(err?.response?.data?.detail || "CSV import failed"); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return <Layout><TradiePage className="space-y-5" data-testid="clients-page">
    <TradieHeader
      title="Clients"
      subtitle="Manage customer records, job history, quotes, and invoices."
      secondaryActions={isEmployer && <>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}><Upload size={16} className="mr-2" />{importing ? "Importing..." : "CSV Import"}</Button>
        <Button type="button" variant="ghost" asChild><Link to="/smart-hub">AI Client Review</Link></Button>
      </>}
      primaryAction={isEmployer ? <Button type="button" onClick={() => setShowAdd((p) => !p)} data-testid="add-client-button"><UserPlus size={16} className="mr-2" />{showAdd ? "Close" : "Add Client"}</Button> : null}
    />

    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search clients" className="pl-9" data-testid="clients-search-input" /></div>
      <div className="relative"><select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="h-10 appearance-none rounded-md border border-slate-300 bg-white pl-3 pr-8 text-sm"><option value="all">All activity</option><option value="active">Active</option><option value="quiet">Quiet</option></select><ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" /></div>
      <p className="text-slate-500">{filteredClients.length} clients</p>
    </div>

    <details className="rounded-xl border border-slate-200 bg-white px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Client overview</summary><div className="mt-3 flex flex-wrap gap-2"><TradieBadge>{metrics.total} total</TradieBadge><TradieBadge tone="success">{metrics.active} active</TradieBadge><TradieBadge tone="warning">{metrics.withInvoices} with invoices</TradieBadge><TradieBadge tone="progress">{metrics.recent} recent</TradieBadge></div></details>

    {showAdd && <TradiePanel data-testid="add-client-form"><form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-2">{[["Client Name","client_name",true],["Contact Name","contact_name"],["Email","email"],["Phone","phone"],["Address","address"],["Notes","notes"]].map(([label,key,required]) => <div key={key} className={key==="notes"||key==="address"?"md:col-span-2":""}><Label>{label}</Label><Input type={key==="email"?"email":"text"} required={Boolean(required)} value={form[key]} onChange={(e)=>setForm({...form,[key]:e.target.value})} data-testid={`add-client-${key.replace("_","-")}-input`} /></div>)}<div className="md:col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={loading} data-testid="add-client-save-button">{loading?"Saving...":"Save Client"}</Button></div></form></TradiePanel>}

    {importResults && <TradiePanel><p className="text-sm text-slate-600">Imported: {importResults.imported ?? 0} • Skipped: {importResults.skipped ?? 0} • Total: {importResults.total ?? 0}</p></TradiePanel>}

    {pageLoading && clients.length === 0 ? <TradieLoadingState title="Loading your clients workspace…" /> : pageError ? (
      <TradiePanel className="text-center"><AlertTriangle className="mx-auto mb-2 text-red-500" size={24} /><p className="font-semibold">Couldn&apos;t load clients</p><p className="text-sm text-slate-500 mb-3">{safeText(pageError, "Please try again.")}</p><Button onClick={fetchClients} variant="outline">Retry</Button></TradiePanel>
    ) : filteredClients.length === 0 && !loading ? <TradieEmptyState title={searchTerm ? "No matching clients" : "No clients yet"} text={searchTerm ? "Try another search or filter." : "Add your first customer or import a CSV to get started."} action={isEmployer && !searchTerm ? <TradieActions primary={<Button onClick={() => setShowAdd(true)}><UserPlus size={14} className="mr-1" />Add Client</Button>} secondary={<Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-1" />CSV Import</Button>} /> : null} /> : (
      <TradieList>
        <div className="hidden md:grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"><div className="col-span-3">Client</div><div className="col-span-2">Contact</div><div className="col-span-3">Address</div><div className="col-span-2">Activity</div><div className="col-span-2 text-right">Actions</div></div>
        {filteredClients.map((client) => {
          const cid = client.id || client._id; const clientName = client.client_name || client.name || "Unnamed Client";
          return <div key={cid} className="border-b last:border-b-0 border-slate-100 px-4 py-4 md:px-5"><div className="hidden md:grid grid-cols-12 gap-3 items-center text-sm"><div className="col-span-3"><Link to={`/clients/${cid}`} className="font-semibold text-slate-900 hover:text-blue-700">{clientName}</Link><p className="text-xs text-slate-500">{safeText(client.notes, "No notes")}</p></div><div className="col-span-2 text-slate-600">{safeText(client.phone)}<br />{safeText(client.email)}</div><div className="col-span-3 text-slate-600">{safeText(client.address)}</div><div className="col-span-2"><TradieBadge tone={client.email || client.phone ? "success" : "neutral"}>{client.email || client.phone ? "Active" : "Quiet"}</TradieBadge></div><div className="col-span-2"><div className="flex justify-end gap-2">{isEmployer && <><Button asChild variant="ghost" size="sm"><Link to={`/clients/${cid}/edit`}><Pencil size={16} /></Link></Button><Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(client)}><Trash2 size={16} /></Button></>}<Button asChild variant="outline" size="sm"><Link to={`/clients/${cid}`}>Open</Link></Button></div></div></div>
            <div className="md:hidden space-y-3"><Link to={`/clients/${cid}`} className="text-base font-semibold text-slate-900">{clientName}</Link><div className="text-sm text-slate-600 space-y-1"><p>{safeText(client.phone)}</p><p>{safeText(client.email)}</p><p>{safeText(client.address)}</p></div><div className="flex items-center gap-2">{isEmployer && <><Button asChild size="sm" variant="outline"><Link to={`/clients/${cid}/edit`}>Edit</Link></Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(client)}>Delete</Button></>}<Button asChild size="sm"><Link to={`/clients/${cid}`}>Open</Link></Button></div></div>
          </div>;
        })}
      </TradieList>
    )}
  </TradiePage></Layout>;
}
