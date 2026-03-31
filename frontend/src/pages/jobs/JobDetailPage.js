import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowLeft, MapPin, Clock, DollarSign, UserCheck, Play, CheckCircle, Trash2, Edit, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatTime, formatCurrency, JOB_STATUS_MAP } from "../../lib/utils";

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployer, isWorker } = useAuth();
  const { get, post, del, loading } = useApi();
  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState("");

  const fetchJob = useCallback(async () => {
    const res = await get(`/jobs/${id}`);
    if (res.success) setJob(res.data);
    else navigate("/jobs");
  }, [get, id, navigate]);

  const fetchWorkers = useCallback(async () => {
    if (!isEmployer) return;
    const res = await get("/team/workers");
    if (res.success) setWorkers(res.data);
  }, [get, isEmployer]);

  useEffect(() => { fetchJob(); fetchWorkers(); }, [fetchJob, fetchWorkers]);

  const handleAction = async (action, label) => {
    const res = await post(`/jobs/${id}/${action}`);
    if (res.success) {
      toast.success(`Job ${label}`);
      setJob(res.data);
    } else {
      toast.error(res.error || `Failed to ${label} job`);
    }
  };

  const handleAssign = async () => {
    if (!selectedWorker) return;
    const res = await post(`/jobs/${id}/assign`, { worker_id: selectedWorker });
    if (res.success) {
      toast.success("Worker assigned");
      setJob(res.data);
      setShowAssign(false);
    } else {
      toast.error(res.error || "Failed to assign worker");
    }
  };

  const handleDelete = async () => {
    const res = await del(`/jobs/${id}`);
    if (res.success) {
      toast.success("Job deleted");
      navigate("/jobs");
    }
  };

  if (!job) return <Layout><div className="p-6 text-churvox-muted">Loading...</div></Layout>;

  const statusInfo = JOB_STATUS_MAP[job.status];

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" data-testid="job-detail-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/jobs")} className="flex items-center gap-2 text-churvox-muted hover:text-white transition-colors" data-testid="back-to-jobs">
            <ArrowLeft size={18} /> Jobs
          </button>
          <div className="flex items-center gap-2">
            {isEmployer && (
              <>
                <Button asChild variant="outline" size="sm" className="border-churvox-border text-churvox-muted hover:text-white" data-testid="edit-job-button">
                  <Link to={`/jobs/${id}/edit`}><Edit size={14} className="mr-1" /> Edit</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-job-trigger">
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Job Info */}
        <Card className="bg-churvox-card border-churvox-border" data-testid="job-info-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-white">{job.title}</CardTitle>
              <span className={`px-3 py-1 rounded text-xs font-semibold uppercase text-white ${statusInfo?.color || "bg-slate-500"}`} data-testid="job-status-badge">
                {statusInfo?.label || job.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-churvox-muted">
                <Clock size={14} /> {formatDate(job.scheduled_date)} {job.scheduled_time && `at ${job.scheduled_time}`}
              </div>
              <div className="flex items-center gap-2 text-churvox-muted">
                <DollarSign size={14} /> {formatCurrency(job.price)}
              </div>
              {job.address && (
                <div className="flex items-center gap-2 text-churvox-muted col-span-2">
                  <MapPin size={14} /> {job.address}
                </div>
              )}
              {job.customer_name && (
                <div className="text-churvox-muted">Client: <span className="text-white">{job.customer_name}</span></div>
              )}
              <div className="text-churvox-muted">Type: <span className="text-white capitalize">{job.job_type?.replace(/_/g, " ")}</span></div>
            </div>

            {/* Worker Assignment */}
            <div className="pt-3 border-t border-churvox-border">
              {job.assigned_worker_name ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-churvox-muted flex items-center gap-2">
                    <UserCheck size={14} className="text-churvox-accent" />
                    Assigned to: <span className="text-white font-medium">{job.assigned_worker_name}</span>
                  </p>
                  {isEmployer && job.status === "assigned" && (
                    <Button variant="outline" size="sm" onClick={() => setShowAssign(true)} className="border-churvox-border text-churvox-muted" data-testid="reassign-button">
                      Reassign
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-churvox-muted">No worker assigned</p>
                  {isEmployer && (
                    <Button size="sm" onClick={() => setShowAssign(true)} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="assign-worker-button">
                      <UserCheck size={14} className="mr-1" /> Assign Worker
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            {job.notes && (
              <div className="pt-3 border-t border-churvox-border">
                <p className="text-xs text-churvox-muted mb-1">Notes</p>
                <p className="text-sm text-white">{job.notes}</p>
              </div>
            )}

            {/* Photos placeholder */}
            {job.photos && job.photos.length > 0 && (
              <div className="pt-3 border-t border-churvox-border">
                <p className="text-xs text-churvox-muted mb-2">Photos</p>
                <div className="flex gap-2 flex-wrap">
                  {job.photos.map((url, i) => (
                    <img key={i} src={url} alt={`Job photo ${i + 1}`} className="h-20 w-20 rounded object-cover border border-churvox-border" />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3" data-testid="job-actions">
          {/* Worker can acknowledge */}
          {isWorker && job.status === "assigned" && (
            <Button onClick={() => handleAction("acknowledge", "acknowledged")} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-black flex-1" data-testid="acknowledge-job-button">
              <ThumbsUp size={16} className="mr-2" /> Acknowledge
            </Button>
          )}

          {/* Start job */}
          {(job.status === "assigned" || job.status === "acknowledged") && (
            <Button onClick={() => handleAction("start", "started")} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1" data-testid="start-job-button">
              <Play size={16} className="mr-2" /> Start Job
            </Button>
          )}

          {/* Complete job */}
          {job.status === "in_progress" && (
            <Button onClick={() => handleAction("complete", "completed")} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex-1" data-testid="complete-job-button">
              <CheckCircle size={16} className="mr-2" /> Complete Job
            </Button>
          )}

          {job.status === "completed" && (
            <Card className="bg-green-900/20 border-green-500/30 w-full">
              <CardContent className="p-4 text-center text-green-400 text-sm font-medium">
                <CheckCircle size={18} className="inline mr-2" /> Job completed {job.completed_at && `on ${formatDate(job.completed_at)}`}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assign Worker Dialog */}
        <Dialog open={showAssign} onOpenChange={setShowAssign}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="assign-worker-dialog">
            <DialogHeader><DialogTitle className="text-white">Assign Worker</DialogTitle></DialogHeader>
            {workers.length === 0 ? (
              <div className="text-churvox-muted text-center py-4">
                <p>No workers yet.</p>
                <Button asChild className="mt-2 bg-churvox-accent"><Link to="/team">Add Workers</Link></Button>
              </div>
            ) : (
              <>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="select-worker">
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                  <SelectContent className="bg-churvox-card border-churvox-border">
                    {workers.map((w) => (
                      <SelectItem key={w.id} value={w.id} className="text-white">{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAssign(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
                  <Button onClick={handleAssign} disabled={!selectedWorker || loading} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="confirm-assign-worker">Assign</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDelete} onOpenChange={setShowDelete}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="delete-job-detail-dialog">
            <DialogHeader><DialogTitle className="text-white">Delete Job</DialogTitle></DialogHeader>
            <p className="text-churvox-muted">Are you sure? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
              <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700" data-testid="confirm-delete-job-detail">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
