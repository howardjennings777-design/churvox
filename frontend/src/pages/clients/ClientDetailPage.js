import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUS_MAP } from "../../lib/utils";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, del, loading } = useApi();
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [showDelete, setShowDelete] = useState(false);

  const fetchData = useCallback(async () => {
    const [clientRes, jobsRes] = await Promise.all([
      get(`/clients/${id}`),
      get(`/clients/${id}/jobs`),
    ]);
    if (clientRes.success) setClient(clientRes.data);
    else navigate("/clients");
    if (jobsRes.success) setJobs(jobsRes.data);
  }, [get, id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    const res = await del(`/clients/${id}`);
    if (res.success) {
      toast.success("Client deleted");
      navigate("/clients");
    }
  };

  if (!client) return <Layout><div className="p-6 text-churvox-muted">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" data-testid="client-detail-page">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-churvox-muted hover:text-white" data-testid="back-to-clients">
            <ArrowLeft size={18} /> Clients
          </button>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-churvox-border text-churvox-muted hover:text-white" data-testid="edit-client-button">
              <Link to={`/clients/${id}/edit`}><Edit size={14} className="mr-1" /> Edit</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-client-trigger">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Client Info */}
        <Card className="bg-churvox-card border-churvox-border" data-testid="client-info-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-white">{client.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {client.email && (
              <div className="flex items-center gap-2 text-sm text-churvox-muted"><Mail size={14} /> {client.email}</div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm text-churvox-muted"><Phone size={14} /> {client.phone}</div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-sm text-churvox-muted"><MapPin size={14} /> {client.address}</div>
            )}
            {client.notes && (
              <div className="pt-3 border-t border-churvox-border">
                <p className="text-xs text-churvox-muted mb-1">Notes</p>
                <p className="text-sm text-white">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job History */}
        <div data-testid="client-job-history">
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <FileText size={16} /> Job History ({jobs.length})
          </h2>
          {jobs.length === 0 ? (
            <Card className="bg-churvox-card border-churvox-border">
              <CardContent className="p-6 text-center text-churvox-muted text-sm">No jobs for this client yet</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => {
                const statusInfo = JOB_STATUS_MAP[job.status];
                return (
                  <Link key={job.id} to={`/jobs/${job.id}`} data-testid={`client-job-${job.id}`}
                    className="block bg-churvox-card border border-churvox-border rounded-xl p-4 hover:border-churvox-accent/50 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-churvox-muted">
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(job.scheduled_date)}</span>
                          {job.price > 0 && <span className="text-churvox-accent">{formatCurrency(job.price)}</span>}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`}>
                        {statusInfo?.label || job.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Dialog */}
        <Dialog open={showDelete} onOpenChange={setShowDelete}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="delete-client-dialog">
            <DialogHeader><DialogTitle className="text-white">Delete Client</DialogTitle></DialogHeader>
            <p className="text-churvox-muted">Are you sure? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
              <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-client">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
