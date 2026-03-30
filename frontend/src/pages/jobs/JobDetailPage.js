import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Loader2, 
  Pencil, 
  Trash2, 
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Play,
  CheckCircle,
  RefreshCw,
  FileText
} from "lucide-react";
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
import { formatDate, formatDateTime, formatCurrency, getStatusColor, getStatusLabel, getJobTypeLabel } from "@/lib/utils";
import Layout from "@/components/Layout";

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { get, del, post, loading } = useApi();
  const [job, setJob] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    const result = await get(`/jobs/${id}`);
    if (result.success) {
      setJob(result.data);
    } else {
      toast.error("Job not found");
      navigate("/jobs");
    }
  };

  const handleDelete = async () => {
    const result = await del(`/jobs/${id}`);
    if (result.success) {
      toast.success("Job deleted");
      navigate("/jobs");
    } else {
      toast.error(result.error);
    }
  };

  const handleStartJob = async () => {
    const result = await post(`/jobs/${id}/start`);
    if (result.success) {
      toast.success("Job started");
      loadJob();
    } else {
      toast.error(result.error);
    }
  };

  const handleCompleteJob = async () => {
    const result = await post(`/jobs/${id}/complete`);
    if (result.success) {
      toast.success("Job completed! Invoice has been created.");
      loadJob();
    } else {
      toast.error(result.error);
    }
  };

  if (loading || !job) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-in" data-testid="job-detail-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/jobs")}
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-white font-heading">
                  {job.title}
                </h1>
                <span className={`status-badge ${getStatusColor(job.status)}`}>
                  {getStatusLabel(job.status)}
                </span>
              </div>
              <p className="text-muted-foreground">{getJobTypeLabel(job.job_type)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.status === "scheduled" && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleStartJob}
                data-testid="start-job-button"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Job
              </Button>
            )}
            {job.status === "in_progress" && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleCompleteJob}
                data-testid="complete-job-button"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Job
              </Button>
            )}
            <Link to={`/jobs/${id}/edit`}>
              <Button variant="outline" className="border-border" data-testid="edit-job-button">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setShowDelete(true)}
              data-testid="delete-job-button"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Job Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Date</p>
                  <p className="text-white">{formatDate(job.scheduled_date)}</p>
                </div>
              </div>
              {job.scheduled_time && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Time</p>
                    <p className="text-white">{job.scheduled_time}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p>
                  <p className="text-white">{job.address}</p>
                </div>
              </div>
              {job.is_recurring && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Recurring</p>
                    <p className="text-white capitalize">{job.recurrence_pattern}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Pricing & Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="text-2xl font-semibold text-white">{formatCurrency(job.price)}</p>
                </div>
              </div>
              {(job.customer_name || job.client_id) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-white">{job.customer_name || "Linked Client"}</p>
                </div>
              )}
              {job.estimated_duration && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estimated Duration</p>
                  <p className="text-white">{job.estimated_duration} minutes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {job.notes && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm text-white">Job Created</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(job.created_at)}</p>
                </div>
              </div>
              {job.started_at && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <div>
                    <p className="text-sm text-white">Job Started</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(job.started_at)}</p>
                  </div>
                </div>
              )}
              {job.completed_at && (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm text-white">Job Completed</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(job.completed_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Job</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this job? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
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
