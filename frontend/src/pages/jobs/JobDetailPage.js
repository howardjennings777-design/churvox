import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { ArrowLeft, MapPin, Clock, DollarSign, UserCheck, Play, Pause, RotateCcw, CheckCircle, Trash2, Edit, ThumbsUp, Timer, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, JOB_STATUS_MAP } from "../../lib/utils";


const normalizeJobStatus = (value) => {
  const v = String(value || "").trim().toLowerCase().replace(/[_\s-]+/g, "_");
  if (["completed", "complete", "done"].includes(v)) return "completed";
  if (["in_progress", "inprogress", "progress"].includes(v)) return "in_progress";
  if (["assigned"].includes(v)) return "assigned";
  if (["acknowledged"].includes(v)) return "acknowledged";
  return v || "assigned";
};


function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployer, isWorker } = useAuth();
  const { get, post, patch, del, loading } = useApi();
  const [job, setJob] = useState(null);
  
  const [actionLoading, setActionLoading] = useState(false);
const [workers, setWorkers] = useState([]);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [adjustHours, setAdjustHours] = useState("");
  const [adjustMinutes, setAdjustMinutes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const fetchJob = useCallback(async () => {
    const res = await get(`/jobs/${id}`);
    if (res.success) {
      setJob(res.data);
      setElapsed(res.data.total_time_seconds || 0);
    } else navigate("/jobs");
  }, [get, id, navigate]);

  const fetchWorkers = useCallback(async () => {
    if (!isEmployer) return;
    const res = await get("/team/workers");
    if (res.success) setWorkers(res.data);
  }, [get, isEmployer]);

  useEffect(() => { fetchJob(); fetchWorkers(); }, [fetchJob, fetchWorkers]);

  // Live timer tick
  useEffect(() => {
    if (job?.timer_running) {
      const startElapsed = job.total_time_seconds || 0;
      setElapsed(startElapsed);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (job) setElapsed(job.total_time_seconds || 0);
    }
    return () => clearInterval(timerRef.current);
  }, [job?.timer_running, job?.total_time_seconds]);

  const handleTimerAction = async (action) => {
    const res = await post(`/jobs/${id}/timer/${action}`);
    if (res.success) {
      setJob(res.data);
      setElapsed(res.data.total_time_seconds || 0);
      toast.success(`Timer ${action}ed`);
    } else toast.error(res.error || `Failed to ${action} timer`);
  };

  const handleAdjust = async () => {
    const totalSec = (parseInt(adjustHours) || 0) * 3600 + (parseInt(adjustMinutes) || 0) * 60;
    const res = await patch(`/jobs/${id}/timer/adjust`, { total_time_seconds: totalSec });
    if (res.success) {
      setJob(res.data);
      setElapsed(totalSec);
      setShowAdjust(false);
      toast.success("Time adjusted");
    } else toast.error(res.error || "Failed to adjust time");
  };

  const handleAction = async (action, label) => {
    try {
      const res = await post(`/jobs/${id}/${action}`);
      if (res.success) {
        toast.success(`Job ${label}`);
        if (action === "complete") {
          navigate("/jobs");
          return;
        }
        setJob(res.data);
        setElapsed(res.data?.total_time_seconds || 0);
      } else {
        toast.error(res.error || `Failed to ${label.toLowerCase()} job`);
      }
    } catch (err) {
      toast.error(err?.message || `Failed to ${label.toLowerCase()} job`);
    }
  };

  const handleAssign = async () => {
    if (!selectedWorker) return;
    const res = await post(`/jobs/${id}/assign`, { worker_id: selectedWorker });
    if (res.success) { toast.success("Worker assigned"); setJob(res.data); setShowAssign(false); }
    else toast.error(res.error || "Failed to assign worker");
  };

  const handleDelete = async () => {
    const res = await del(`/jobs/${id}`);
    if (res.success) { toast.success("Job deleted"); navigate("/jobs"); }
  };

  const handleSendSMS = async (type) => {
    let phone = "";
    if (job?.client_id) {
      const cRes = await get(`/clients/${job.client_id}`);
      if (cRes.success) phone = cRes.data.phone || "";
    }
    if (!phone) { console.log("SMS precheck disabled"); }
    const res = await post("/sms/send-fixed", {
      recipient_phone: phone,
      message_type: type,
      job_id: id,
    });
    if (res.success) toast.success(`SMS sent (mock) — ${res.data.balance} credits left`);
    else toast.error(res.error || "Failed to send SMS");
  };

  if (!job && loading) return <Layout><div className="p-6 text-churvox-muted">Loading...</div></Layout>;
  if (!job && !loading) return <Layout><div className="p-6 text-churvox-muted">Job not found</div></Layout>;

  const statusInfo = JOB_STATUS_MAP[normalizeJobStatus(job?.status || job?.job_status)] || JOB_STATUS_MAP.completed || JOB_STATUS_MAP.assigned;
  const pricingLabel = { fixed: "Fixed Price", hourly: "Hourly", fixed_extras: "Fixed + Extras", hourly_extras: "Hourly + Extras" }[job.pricing_type] || "Fixed";

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4" data-testid="job-detail-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/jobs")} className="flex items-center gap-2 text-churvox-muted hover:text-white" data-testid="back-to-jobs">
            <ArrowLeft size={18} /> Jobs
          </button>
          {isEmployer && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="border-churvox-border text-churvox-muted hover:text-white" data-testid="edit-job-button">
                <Link to={`/jobs/${id}/edit`}><Edit size={14} className="mr-1" /> Edit</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="delete-job-trigger">
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        {/* Job Info */}
        
      <Card className="bg-churvox-card border-churvox-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-churvox-accent" />
              <h3 className="font-semibold text-white">Quick SMS</h3>
            </div>
            <span className="inline-flex items-center rounded-full border border-churvox-border bg-churvox-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-churvox-muted">
              Coming Soon
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 border-churvox-border text-churvox-muted opacity-60"
            >
              On the Way
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 border-churvox-border text-churvox-muted opacity-60"
            >
              Reminder
            </Button>
          </div>

          <p className="text-[12px] text-churvox-muted">
            SMS feature coming soon.
          </p>
        </CardContent>
      </Card>

        )}

        {/* Action Buttons */}
        <div className="flex gap-3" data-testid="job-actions">
          {isWorker && job.status === "assigned" && (
            <Button onClick={() => handleAction("acknowledge", "acknowledged")} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-black flex-1" data-testid="acknowledge-job-button">
              <ThumbsUp size={16} className="mr-2" /> Acknowledge
            </Button>
          )}
          {(job.status === "in_progress") && (
            <Button onClick={() => handleAction("complete", "completed")} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white flex-1" data-testid="complete-job-button">
              <CheckCircle size={16} className="mr-2" /> Complete Job
            </Button>
          )}
        </div>

        {/* Assign Worker Dialog */}
        <Dialog open={showAssign} onOpenChange={setShowAssign}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="assign-worker-dialog">
            <DialogHeader><DialogTitle className="text-white">Assign Worker</DialogTitle></DialogHeader>
            {workers.length === 0 ? (
              <div className="text-churvox-muted text-center py-4"><p>No workers yet.</p><Button asChild className="mt-2 bg-churvox-accent"><Link to="/team">Add Workers</Link></Button></div>
            ) : (
              <>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="select-worker"><SelectValue placeholder="Select a worker" /></SelectTrigger>
                  <SelectContent className="bg-churvox-card border-churvox-border">{workers.map((w) => <SelectItem key={w.id} value={w.id} className="text-white">{w.name}</SelectItem>)}</SelectContent>
                </Select>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAssign(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
                  <Button onClick={handleAssign} disabled={!selectedWorker || loading} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="confirm-assign-worker">Assign</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Adjust Time Dialog */}
        <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="adjust-time-dialog">
            <DialogHeader><DialogTitle className="text-white">Adjust Time</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-churvox-muted">Hours</Label>
                <Input type="number" min="0" value={adjustHours} onChange={(e) => setAdjustHours(e.target.value)} className="bg-churvox-bg border-churvox-border text-white" data-testid="adjust-hours" />
              </div>
              <div>
                <Label className="text-churvox-muted">Minutes</Label>
                <Input type="number" min="0" max="59" value={adjustMinutes} onChange={(e) => setAdjustMinutes(e.target.value)} className="bg-churvox-bg border-churvox-border text-white" data-testid="adjust-minutes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdjust(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
              <Button onClick={handleAdjust} disabled={loading} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="confirm-adjust">Save</Button>
            </DialogFooter>
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