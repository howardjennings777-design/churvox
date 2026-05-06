import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, FileText, Clock, DollarSign, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUS_MAP } from "../../lib/utils";
import { confirmDialog } from "../../lib/confirmDialog";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumEmptyState } from "../../components/premium";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, del } = useApi();
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [clientMemory, setClientMemory] = useState(null);

  const fetchData = useCallback(async () => {
    const [clientRes, jobsRes, memoryRes] = await Promise.all([
      get(`/clients/${id}`),
      get(`/clients/${id}/jobs`),
      get(`/api/ai/client-memory/${id}`),
    ]);
    if (clientRes.success) setClient(clientRes.data);
    else navigate("/clients");
    if (jobsRes.success) setJobs(jobsRes.data);
    if (memoryRes.success) setClientMemory(memoryRes.data);
  }, [get, id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);



  const refreshClientMemory = async () => {
    const res = await post(`/api/ai/client-memory/${id}/refresh`, {});
    if (res.success) {
      setClientMemory(res.data);
      toast.success("Client memory refreshed");
    } else {
      toast.error("Unable to refresh client memory");
    }
  };
  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: "Delete this client?",
      message: "This cannot be undone. Linked jobs/quotes/invoices stay but the client record is removed.",
      danger: true,
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    const res = await del(`/clients/${id}`);
    if (res.success) {
      toast.success("Client deleted");
      navigate("/clients");
    }
  };

  if (!client) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#d94f17]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PremiumPage maxWidth={960}>
        <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-[#5f584f] hover:text-[#1f2329] text-sm font-semibold" data-testid="back-to-clients">
          <ArrowLeft size={16} /> Back to clients
        </button>

        <PremiumHero
          eyebrow="Client"
          title={client.name}
          subtitle={client.email || client.phone || "Client profile"}
          icon={<UserCircle2 className="h-6 w-6" />}
          actions={
            <div className="flex items-center gap-2">
              <PremiumButton variant="secondary" size="sm" onClick={() => navigate(`/clients/${id}/edit`)} dataTestId="edit-client-button">
                <Edit size={14} className="mr-1" /> Edit
              </PremiumButton>
              <PremiumButton variant="danger" size="sm" onClick={handleDelete} dataTestId="delete-client-trigger">
                <Trash2 size={14} />
              </PremiumButton>
            </div>
          }
        />

        <PremiumCard title="Contact details" icon={<UserCircle2 className="h-5 w-5" />} data-testid="client-info-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {client.email && (
              <div className="flex items-center gap-2 text-[#2f343b]"><Mail size={14} className="text-[#746c60]" /> {client.email}</div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-[#2f343b]"><Phone size={14} className="text-[#746c60]" /> {client.phone}</div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-[#2f343b] md:col-span-2"><MapPin size={14} className="text-[#746c60]" /> {client.address}</div>
            )}
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-[#b7ad9e]">
              <p className="text-xs text-[#746c60] mb-1">Notes</p>
              <p className="text-sm text-[#2f343b] whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </PremiumCard>



        <PremiumCard title="Client Memory" icon={<Clock className="h-5 w-5" />} data-testid="client-memory-card">
          {!clientMemory ? <p className="text-sm text-[#5f584f]">No memory available yet.</p> : <div className="space-y-2 text-sm text-[#2f343b]">
            <p><span className="font-semibold">Last job:</span> {clientMemory?.last_job?.title || "—"}</p>
            <p><span className="font-semibold">Last service date:</span> {formatDate(clientMemory?.last_service_date) || "—"}</p>
            <p><span className="font-semibold">Common service:</span> {clientMemory?.common_service_type || "—"}</p>
            <p><span className="font-semibold">Avg duration:</span> {clientMemory?.average_job_duration ? `${clientMemory.average_job_duration} min` : "—"}</p>
            <p><span className="font-semibold">Preferred worker:</span> {clientMemory?.preferred_worker?.name || "—"}</p>
            <p><span className="font-semibold">Recent photos:</span> {clientMemory?.recent_photos_count ?? 0}</p>
            <p><span className="font-semibold">Payment pattern:</span> {clientMemory?.payment_pattern || "—"}</p>
            <p><span className="font-semibold">Recurring:</span> {clientMemory?.recurring_schedule || "—"}</p>
            <p><span className="font-semibold">Property notes:</span> {clientMemory?.property_notes || "—"}</p>
            <p className="rounded-lg bg-[#f4eee3] border border-[#b7ad9e] p-3"><span className="font-semibold">AI summary:</span> {clientMemory?.ai_summary || "—"}</p>
            <p><span className="font-semibold">Suggested next action:</span> {clientMemory?.suggested_next_action || "—"}</p>
          </div>}
          <div className="mt-3">
            <PremiumButton size="sm" variant="secondary" onClick={refreshClientMemory}>Refresh memory</PremiumButton>
          </div>
        </PremiumCard>
        <PremiumCard title={`Job history (${jobs.length})`} icon={<FileText className="h-5 w-5" />} data-testid="client-job-history">
          {jobs.length === 0 ? (
            <PremiumEmptyState
              icon={<FileText className="h-10 w-10" />}
              title="No jobs yet"
              subtitle="Jobs you create for this client will appear here."
            />
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => {
                const statusInfo = JOB_STATUS_MAP[job.status];
                return (
                  <Link key={job.id} to={`/jobs/${job.id}`} data-testid={`client-job-${job.id}`}
                    className="block bg-[#d7d0c4] border border-[#746c60] rounded-xl p-4 hover:border-[#d94f17] hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[#1f2329] font-semibold truncate">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#5f584f] flex-wrap">
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(job.scheduled_date)}</span>
                          {job.price > 0 && <span className="text-[#d94f17] font-semibold flex items-center gap-0.5"><DollarSign size={11} />{formatCurrency(job.price)}</span>}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white flex-shrink-0 ${statusInfo?.color || "bg-slate-500"}`}>
                        {statusInfo?.label || job.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
