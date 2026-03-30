import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Briefcase,
  Play,
  CheckCircle,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getJobTypeLabel } from "@/lib/utils";
import Layout from "@/components/Layout";

export default function JobsPage() {
  const [searchParams] = useSearchParams();
  const { get, del, post, loading } = useApi();
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    const result = await get("/jobs");
    if (result.success) {
      setJobs(result.data);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await del(`/jobs/${deleteId}`);
    if (result.success) {
      toast.success("Job deleted successfully");
      setJobs(jobs.filter((j) => j.id !== deleteId));
    } else {
      toast.error(result.error);
    }
    setDeleteId(null);
  };

  const handleStartJob = async (jobId) => {
    const result = await post(`/jobs/${jobId}/start`);
    if (result.success) {
      toast.success("Job started");
      loadJobs();
    } else {
      toast.error(result.error);
    }
  };

  const handleCompleteJob = async (jobId) => {
    const result = await post(`/jobs/${jobId}/complete`);
    if (result.success) {
      toast.success("Job completed! Invoice created.");
      loadJobs();
    } else {
      toast.error(result.error);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="jobs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white font-heading">Jobs</h1>
            <p className="text-muted-foreground mt-1">Manage your scheduled jobs</p>
          </div>
          <Link to="/jobs/new">
            <Button className="bg-primary hover:bg-primary/90" data-testid="add-job-button">
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
              data-testid="job-search-input"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card border-border" data-testid="status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {searchTerm || statusFilter !== "all" ? "No jobs found" : "No jobs yet"}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try a different search or filter"
                  : "Create your first job to get started"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Link to="/jobs/new">
                  <Button className="bg-primary hover:bg-primary/90" data-testid="add-first-job-button">
                    <Plus className="mr-2 h-4 w-4" />
                    New Job
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <Card 
                key={job.id} 
                className="bg-card border-border hover:bg-card/80 transition-colors job-card"
                data-testid={`job-card-${job.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          to={`/jobs/${job.id}`}
                          className="text-lg font-medium text-white hover:text-primary transition-colors truncate"
                          data-testid={`job-title-${job.id}`}
                        >
                          {job.title}
                        </Link>
                        <span className={`status-badge ${getStatusColor(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                        {job.is_recurring && (
                          <span className="status-badge bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDate(job.scheduled_date)}
                        </span>
                        {job.scheduled_time && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            {job.scheduled_time}
                          </span>
                        )}
                        <span>{getJobTypeLabel(job.job_type)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{job.customer_name || job.address}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">
                        {formatCurrency(job.price)}
                      </span>
                      
                      {/* Action Buttons */}
                      {job.status === "scheduled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                          onClick={() => handleStartJob(job.id)}
                          data-testid={`start-job-${job.id}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {job.status === "in_progress" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleCompleteJob(job.id)}
                          data-testid={`complete-job-${job.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`job-menu-${job.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem asChild>
                            <Link to={`/jobs/${job.id}`} className="cursor-pointer">
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/jobs/${job.id}/edit`} className="flex items-center cursor-pointer" data-testid={`edit-job-${job.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(job.id)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                            data-testid={`delete-job-${job.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
