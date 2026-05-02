import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { ArrowLeft, Edit, Trash2, Phone, Mail, MapPin, FileText, Clock, DollarSign, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUS_MAP } from "../../lib/utils";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton, PremiumEmptyState } from "../../components/premium";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, del } = useApi();
  const [client, setClient] = useState(null);
  const [jobs, setJobs] = useState([]);

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
    const confirmed = window.confirm("Delete this client? This cannot be undone.");
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
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#2563eb]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PremiumPage maxWidth={960}>
        <button onClick={() => navigate("/clients")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-to-clients">
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
              <div className="flex items-center gap-2 text-[#1a2c4d]"><Mail size={14} className="text-[#7d8ba3]" /> {client.email}</div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-[#1a2c4d]"><Phone size={14} className="text-[#7d8ba3]" /> {client.phone}</div>
            )}
            {client.address && (
              <div className="flex items-center gap-2 text-[#1a2c4d] md:col-span-2"><MapPin size={14} className="text-[#7d8ba3]" /> {client.address}</div>
            )}
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-[#e6eef9]">
              <p className="text-xs text-[#7d8ba3] mb-1">Notes</p>
              <p className="text-sm text-[#1a2c4d] whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
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
                    className="block bg-[#f6faff] border border-[#e6eef9] rounded-xl p-4 hover:border-[#2563eb] hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[#0d1b34] font-semibold truncate">{job.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#5b6c87] flex-wrap">
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(job.scheduled_date)}</span>
                          {job.price > 0 && <span className="text-[#1d4ed8] font-semibold flex items-center gap-0.5"><DollarSign size={11} />{formatCurrency(job.price)}</span>}
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
