import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Upload
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import Layout from "@/components/Layout";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { hasPlanAccess, normalizePlan } from "@/utils/planRules";
import axios from "axios";
axios.defaults.withCredentials = true;

import API_BASE from "../lib/apiBase";

export default function ClientsPage() {
  const { user, loading: authLoading, isEmployer } = useAuth();
  const { get, del, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const { maxClients, canUseCsvClientImport, plan } = usePlanLimits(user?.plan);
  const safePlan = normalizePlan(user?.plan || plan || "solo");
  const canUseOwnerCsv = !!isEmployer && hasPlanAccess(safePlan, "team");

  useEffect(() => {
    if (authLoading || !user?.token) return;
    loadClients();
  }, [authLoading, user?.token]);

  const loadClients = async () => {
    const result = await get("/clients");
    if (result.success) {
      setClients(result.data);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/clients/${deleteId}`);
    if (result.success) {
      toast.success("Client deleted successfully");
      setClients(clients.filter((c) => c.id !== deleteId));
    } else {
      toast.error(result.error);
    }
    setDeleteId(null);
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canUseOwnerCsv) {
      toast.error("CSV client import is for owners on Team, Pro, or Enterprise.");
      setFileInputKey((k) => k + 1);
      return;
    }

    setImporting(true);
    setImportResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      console.log("CLIENT CSV IMPORT START", {
        apiUrl: `${API_BASE}/api/clients/import-csv`,
        hasToken: !!token,
        fileName: file?.name,
        fileSize: file?.size,
        userPlan: user?.plan,
        userId: user?.id,
        businessId: user?.business_id,
      });

      const response = await axios.post(`${API_BASE}/api/clients/import-csv`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      const data = response?.data || {};
      console.log("CLIENT CSV IMPORT RESPONSE", data);

      setImportResults(data);

      const reloadResult = await get("/clients");
      console.log("CLIENTS RELOAD RESULT", reloadResult);

      if (reloadResult?.success) {
        setClients(reloadResult.data || []);
      }

      const imported = Number(data.imported || data.created || 0);
      const skipped = Number(data.skipped || 0);
      const total = Number(data.total || 0);

      toast.success(
        total > 0
          ? `${imported} client(s) imported, ${skipped} skipped`
          : "Client CSV import completed"
      );
    } catch (err) {
      console.error("CLIENT CSV IMPORT ERROR", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      toast.error(err?.response?.data?.detail || err?.message || "Client CSV import failed");
    } finally {
      setImporting(false);
      setFileInputKey((k) => k + 1);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="clients-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white font-heading">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your client database</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              key={fileInputKey}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
              id="client-csv-file-input"
              data-testid="client-csv-file-input"
            />
            {clients.length >= maxClients ? (
              <Button className="bg-primary/60 hover:bg-primary/60 cursor-not-allowed" disabled data-testid="add-client-button-disabled">
                <Plus className="mr-2 h-4 w-4" />
                Client limit reached
              </Button>
            ) : (
              <Link to="/clients/new">
                <Button className="bg-primary hover:bg-primary/90" data-testid="add-client-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </Link>
            )}
            {canUseOwnerCsv ? (
              <Button
                variant="outline"
                className="border-border"
                onClick={() => document.getElementById("client-csv-file-input")?.click()}
                disabled={importing}
                data-testid="client-csv-import-button"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? "Importing..." : "CSV Import"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-border opacity-60"
                disabled
                data-testid="client-csv-import-locked"
              >
                <Upload className="mr-2 h-4 w-4" />
                CSV Import locked
              </Button>
            )}
          </div>
        </div>

        {clients.length >= maxClients && (
          <UpgradePrompt
            feature="client-limit"
            message={`You have reached your ${maxClients}-client limit on the ${String(plan || "solo").replace(/^./, (m) => m.toUpperCase())} plan.`}
          />
        )}

        {importResults && (
          <Card className="bg-card border-border" data-testid="client-csv-import-results">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Client CSV Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {Number(importResults.imported || importResults.created || 0)} imported, {Number(importResults.skipped || 0)} skipped
                {importResults.total ? ` of ${importResults.total} rows` : ""}
              </p>
              {Array.isArray(importResults.details) && importResults.details.filter((d) => (d.status || "").toLowerCase() !== "imported" && (d.status || "").toLowerCase() !== "created").length > 0 && (
                <div className="space-y-1 max-h-36 overflow-y-auto rounded-md border border-border p-3">
                  {importResults.details
                    .filter((d) => (d.status || "").toLowerCase() !== "imported" && (d.status || "").toLowerCase() !== "created")
                    .map((d, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        Row {d.row}: {d.reason || d.status || "Skipped"}
                      </p>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
            data-testid="client-search-input"
          />
        </div>

        {/* Clients List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm ? "No clients found" : "No clients yet"}
              </h3>
              <p className="text-muted-foreground text-center mb-4 max-w-xs mx-auto">
                {searchTerm
                  ? "Try a different search term"
                  : "Clients link to jobs, quotes, and invoices. Add your first client to get started."}
              </p>
              {!searchTerm && (
                clients.length >= maxClients ? (
                  <Button className="bg-primary/60 hover:bg-primary/60 cursor-not-allowed" disabled data-testid="add-first-client-button-disabled">
                    <Plus className="mr-2 h-4 w-4" />
                    Client limit reached
                  </Button>
                ) : (
                  <Link to="/clients/new">
                    <Button className="bg-primary hover:bg-primary/90" data-testid="add-first-client-button">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Client
                    </Button>
                  </Link>
                )
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="bg-card border-border hover:bg-card/80 transition-colors" data-testid={`client-card-${client.id}`}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">
                        <Link 
                          to={`/clients/${client.id}`} 
                          className="hover:text-primary transition-colors"
                          data-testid={`client-name-${client.id}`}
                        >
                          {client.name}
                        </Link>
                      </CardTitle>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`client-menu-${client.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem asChild>
                        <Link to={`/clients/${client.id}/edit`} className="flex items-center cursor-pointer" data-testid={`edit-client-${client.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(client.id)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                        data-testid={`delete-client-${client.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this client? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border" data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="confirm-delete-button"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
