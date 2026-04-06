=== BACKEND COMPLETE ROUTE ===
zone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found or cannot be started")
    job = await db.jobs.find_one({"business_id": str(business_id), "_id": ObjectId(job_id)})
    return normalize_job_status_for_response(serialize_doc(job))
@api_router.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    business_id = await get_user_business_id(current_user)
    user = await get_current_user(request)
    query = {"_id": ObjectId(job_id), "contractor_id": ObjectId(user["business_id"])}
    if user.get("role") == "worker":
        query["assigned_worker_id"] = ObjectId(user["id"])

    job = await db.jobs.find_one(query)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] == JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job already completed")

    now = datetime.now(timezone.utc)
    # Stop timer if running
    timer_updates = {"status": JobStatus.COMPLETED, "completed_at": now, "timer_running": False}
    if job.get("timer_running"):
        entry = {"action": "pause", "timestamp": now}
        elapsed = compute_elapsed(job.get("time_entries", []) + [entry])
        timer_updates["total_time_seconds"] = elapsed
        await db.jobs.update_one(query, {"$push": {"time_entries": entry}})
    
    await db.jobs.update_one({"business_id": str(business_id), "_id": ObjectId(job_id)}, {"$set": timer_updates})

    # Re-read job with final time
    job = await db.jobs.find_one(query)
    total_time = job.get("total_time_seconds", 0)

    # Auto-create draft invoice with pricing-type logic
    user_doc = await db.users.find_one({"business_id": str(business_id), "_id": ObjectId(user["business_id"])})
    if not user_doc:
        user_doc = await db.users.find_one({"business_id": str(business_id), "_id": ObjectId(user["id"])})
    gst_rate = user_doc.get("gst_rate", DEFAULT_GST_RATE) if user_doc else DEFAULT_GST_RATE

    pricing_type = job.get("pricing_type", "fixed")
    hourly_rate = job.get("hourly_rate", 0)
    extras = job.get("extras") or []
    extras_total = sum(float(e.get("amount", 0)) for e in extras)
    hours_worked = total_time / 3600 if total_time > 0 else 0

    if pricing_type == "fixed":
        subtotal = job.get("price", 0)
    elif pricing_type == "hourly":
        subtotal = round(hours_worked * hourly_rate, 2)
    elif p


=== FRONTEND FILE: frontend/src/pages/jobs/JobDetailPage.js ===
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
           
---
 if (!job && loading) return <Layout><div className="p-6 text-churvox-muted">Loading...</div></Layout>;
  if (!job && !loading) return <Layout><div className="p-6 text-churvox-muted">Job not found</div></Layout>;

  const statusInfo = JOB_STATUS_MAP[job.status];
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
              <Button asChild 


=== FRONTEND FILE: frontend/src/pages/jobs/JobDetailPage_loading_duplicate_fix_backup.js ===
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
           
---
(`SMS sent (mock) — ${res.data.balance} credits left`);
    else toast.error(res.error || "Failed to send SMS");
  };

  if (!job) return <Layout><div className="p-6 text-churvox-muted">Loading...</div></Layout>;

  const statusInfo = JOB_STATUS_MAP[job.status];
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
              <Button asChild 