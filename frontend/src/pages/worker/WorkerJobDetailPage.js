import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, MapPin, Clock, User, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const WORKER_STATUSES = ["acknowledged", "in_progress", "paused", "completed"];

export default function WorkerJobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { get, patch } = useApi();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    const res = await get(`/jobs/${id}`);
    if (res.success) {
      setJob(res.data);
      setWorkerNotes(res.data?.worker_notes || "");
    }
    setLoading(false);
  }, [get, id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  const handleStatus = async (status) => {
    setSaving(true);
    const res = await patch(`/jobs/${id}`, { status });
    if (res?.success) {
      toast.success(`Job ${status.replace(/_/g, " ")}`);
      await loadJob();
    } else {
      toast.error(res?.error || "Failed to update");
    }
    setSaving(false);
  };

  const handleAcknowledge = async () => {
    setSaving(true);
    const res = await get(`/jobs/${id}/acknowledge`, { method: "POST" });
    if (res?.success) {
      toast.success("Job acknowledged");
      await loadJob();
    } else {
      const patchRes = await patch(`/jobs/${id}`, { status: "acknowledged" });
      if (patchRes?.success) { toast.success("Job acknowledged"); await loadJob(); }
      else toast.error("Failed to acknowledge");
    }
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await patch(`/jobs/${id}`, { worker_notes: workerNotes });
    if (res?.success) { toast.success("Notes saved"); await loadJob(); }
    else toast.error("Failed to save notes");
    setSavingNotes(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
    </div>
  );

  if (!job) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500">Job not found</p>
        <Link to="/worker/jobs" className="text-blue-600 text-sm mt-2 inline-block">Back to jobs</Link>
      </div>
    </div>
  );

  const status = (job.status || "assigned").toLowerCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs" className="text-slate-400 hover:text-slate-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold text-slate-900 truncate">{job.title || "Job Detail"}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Job info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{job.title}</h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{status.replace(/_/g, " ")}</span>
          </div>
          {job.client_name && <p className="text-sm text-slate-500 flex items-center gap-1.5"><User className="h-4 w-4" />{job.client_name}</p>}
          {job.address && <p className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.address}</p>}
          {job.scheduled_date && <p className="text-sm text-slate-500 flex items-center gap-1.5"><Clock className="h-4 w-4" />{String(job.scheduled_date).slice(0, 10)}{job.scheduled_time ? ` at ${job.scheduled_time}` : ""}</p>}
          {job.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Employer Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </div>

        {/* Status actions */}
        {status === "assigned" && (
          <button onClick={handleAcknowledge} disabled={saving}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            data-testid="accept-job-btn">
            {saving ? "Accepting..." : "Accept Job"}
          </button>
        )}

        {status !== "assigned" && status !== "completed" && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Update Status</p>
            <div className="flex gap-2 flex-wrap">
              {WORKER_STATUSES.filter(s => s !== "acknowledged").map((s) => (
                <button key={s} onClick={() => handleStatus(s)} disabled={saving || status === s}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${status === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-50`}
                  data-testid={`status-btn-${s}`}>
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "completed" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">Job completed</p>
          </div>
        )}

        {/* Worker notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">My Notes</p>
            <button onClick={handleSaveNotes} disabled={savingNotes}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              data-testid="save-worker-notes-btn">
              {savingNotes ? "Saving..." : "Save"}
            </button>
          </div>
          <textarea value={workerNotes} onChange={(e) => setWorkerNotes(e.target.value)}
            placeholder="Add notes about this job..." rows={4}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            data-testid="worker-notes-textarea" />
        </div>

        {/* Progress info */}
        {(job.accepted_at || job.started_at || job.completed_at) && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Progress</p>
            {job.accepted_at && <p className="text-xs text-slate-400">Accepted: {new Date(job.accepted_at).toLocaleString()}</p>}
            {job.started_at && <p className="text-xs text-slate-400">Started: {new Date(job.started_at).toLocaleString()}</p>}
            {job.completed_at && <p className="text-xs text-slate-400">Completed: {new Date(job.completed_at).toLocaleString()}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
