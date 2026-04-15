import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Users, UserPlus, Trash2, Upload, Mail, Phone, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import API_BASE from "../../lib/apiBase";

axios.defaults.withCredentials = true;

export default function ClientsPage() {
  const { user, isEmployer } = useAuth();
  const { get, post, del, loading } = useApi();

  const [clients, setClients] = useState([]);
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
    const res = await get("/clients");
    if (res.success) {
      setClients(Array.isArray(res.data) ? res.data : []);
    } else {
      setClients([]);
    }
  }, [get]);

  useEffect(() => {
    if (!user?.token) return;
    fetchClients();
  }, [user?.token, fetchClients]);

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
      toast.error(err?.response?.data?.detail || "CSV import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" data-testid="clients-page">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-sm text-churvox-muted mt-1">
              {clients.length} client{clients.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />

            {isEmployer && (
              <>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="border-churvox-border text-churvox-muted hover:text-white"
                >
                  <Upload size={16} className="mr-2" />
                  {importing ? "Importing..." : "CSV Import"}
                </Button>

                <Button
                  onClick={() => setShowAdd((prev) => !prev)}
                  className="bg-churvox-accent hover:bg-churvox-accent/90"
                  data-testid="add-client-button"
                >
                  <UserPlus size={16} className="mr-2" />
                  {showAdd ? "Close" : "Add Client"}
                </Button>
              </>
            )}
          </div>
        </div>

        {showAdd && (
          <Card className="bg-churvox-card border-churvox-border shadow-lg shadow-black/20" data-testid="add-client-form">
            <CardContent className="p-6 space-y-4 text-white">
              <div>
                <div className="text-lg font-semibold text-white">Add Client</div>
                <div className="text-sm text-churvox-muted mt-1">Fill in client details below.</div>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <Label>Client Name</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    required
                    className="bg-churvox-bg border-churvox-border text-white"
                    data-testid="add-client-name-input"
                  />
                </div>

                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="bg-churvox-bg border-churvox-border text-white"
                    data-testid="add-client-contact-input"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-churvox-bg border-churvox-border text-white"
                    data-testid="add-client-email-input"
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="bg-churvox-bg border-churvox-border text-white"
                    data-testid="add-client-phone-input"
                  />
                </div>

                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="bg-churvox-bg border-churvox-border text-white"
                    data-testid="add-client-address-input"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="bg-churvox-bg border-churvox-border text-white"
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
                    className="bg-churvox-accent hover:bg-churvox-accent/90"
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
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium">Import Results</p>
                <button
                  onClick={() => setImportResults(null)}
                  className="text-xs text-churvox-muted hover:text-white"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-sm text-churvox-muted">
                Imported: {importResults.imported ?? 0} | Skipped: {importResults.skipped ?? 0} | Total: {importResults.total ?? 0}
              </p>
            </CardContent>
          </Card>
        )}

        {loading && clients.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-churvox-accent" />
          </div>
        ) : clients.length === 0 && !loading ? (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-8 text-center">
              <Users className="mx-auto mb-3 text-churvox-muted/40" size={32} />
              <p className="text-white font-medium mb-1">No clients yet</p>
              <p className="text-xs text-churvox-muted mb-4">
                Add your first client or import clients by CSV.
              </p>
              {isEmployer && (
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => setShowAdd(true)}
                    size="sm"
                    className="bg-churvox-accent hover:bg-churvox-accent/90"
                  >
                    <UserPlus size={14} className="mr-1" />
                    Add Client
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-churvox-border text-churvox-muted hover:text-white"
                  >
                    <Upload size={14} className="mr-1" />
                    Import CSV
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => {
              const cid = client.id || client._id;
              return (
              <Link key={cid} to={`/clients/${cid}`} className="block">
              <Card className="bg-churvox-card border-churvox-border hover:border-churvox-accent/50 transition-all">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{client.client_name || client.name || "Unnamed Client"}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-churvox-muted mt-2">
                      {client.contact_name && <span>{client.contact_name}</span>}
                      {client.email && <span className="flex items-center gap-1"><Mail size={12} /> {client.email}</span>}
                      {client.phone && <span className="flex items-center gap-1"><Phone size={12} /> {client.phone}</span>}
                      {client.address && <span className="flex items-center gap-1"><MapPin size={12} /> {client.address}</span>}
                    </div>

                    {client.notes ? (
                      <p className="text-xs text-churvox-muted mt-2">{client.notes}</p>
                    ) : null}
                  </div>

                  {isEmployer && (
                    <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-churvox-muted hover:text-white hover:bg-white/5"
                      >
                        <Link to={`/clients/${cid}/edit`} onClick={(e) => e.stopPropagation()}>
                          <Pencil size={16} />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(client); }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              </Link>
              );
            })}
          </div>
        )}

      </div>
    </Layout>
  );
}
