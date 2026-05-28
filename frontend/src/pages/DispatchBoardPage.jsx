// CHURVOX_DISPATCH_BOARD_PAGE_20260528
// CHURVOX_DISPATCH_BOARD_OPERATOR_UPGRADE_20260528
// CHURVOX_DISPATCH_LINKED_JOB_NATIVE_HIGHLIGHT_20260529
// CHURVOX_DISPATCH_NATIVE_ASSIGNMENT_ACTION_20260529
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { assignDispatchWorker, getDispatchBoard } from "../concept-c/churvoxTopTierApi";
import "./DispatchBoardPage.css";

const API_BASE = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "https://grassley-backend.onrender.com";

const laneLabels = {
  unassigned: "Unassigned",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  needs_review: "Needs review",
  ready_to_invoice: "Ready to invoice",
};

const laneHelp = {
  unassigned: "Needs owner/admin to assign crew.",
  assigned: "Crew has the job.",
  in_progress: "Work is active in the field.",
  completed: "Worker marked it complete.",
  needs_review: "Owner should open Work Slip.",
  ready_to_invoice: "Admin is ready for money desk.",
};

function token() { try { return localStorage.getItem("token") || localStorage.getItem("authToken") || ""; } catch { return ""; } }
function cleanBase(base) { return String(base || "").replace(/\/+$/, ""); }
async function fetchJson(path) {
  const t = token();
  const res = await fetch(`${cleanBase(API_BASE)}${path}`, { credentials: "include", headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || data?.message || `Request failed ${res.status}`);
  return data;
}
function listFrom(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}
function jobId(job) { return job?.id || job?._id || job?.job_id || ""; }
function jobTitle(job) { return job?.title || job?.job_name || job?.customer_name || job?.client_name || "Job"; }
function jobClient(job) { return job?.customer_name || job?.client_name || job?.client || "No client name"; }
function jobPlace(job) { return job?.address || job?.site_address || job?.region || job?.suburb || "No address saved"; }
function jobWorker(job) { return job?.assigned_worker_name || job?.worker_name || job?.assigned_to_name || job?.assigned_worker_id || "No worker shown"; }
function jobStatus(job) { return job?.status || job?.owner_review_status || job?.work_review_status || "Review"; }
function workerId(worker) { return worker?.id || worker?._id || worker?.worker_id || ""; }
function workerName(worker) { return worker?.name || worker?.full_name || worker?.email || "Worker"; }
function workerRole(worker) { return String(worker?.role || worker?.position || "").toLowerCase(); }
function isFieldWorker(worker) { const role = workerRole(worker); return !["owner", "admin", "office", "payroll", "accountant"].some((x) => role.includes(x)); }
function findLinkedJob(lanes, linkedJobId) {
  if (!linkedJobId) return null;
  for (const [laneKey, rows] of Object.entries(lanes || {})) {
    if (!Array.isArray(rows)) continue;
    const job = rows.find((row) => String(jobId(row)) === String(linkedJobId));
    if (job) return { job, laneKey };
  }
  return null;
}

export default function DispatchBoardPage() {
  const location = useLocation();
  const linkedJobId = useMemo(() => new URLSearchParams(location.search).get("job_id") || "", [location.search]);
  const [state, setState] = useState({ loading: true, error: "", lanes: {}, workers: [] });
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [notice, setNotice] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function load() {
    try {
      const [boardRes, workersRes] = await Promise.allSettled([getDispatchBoard(), fetchJson("/api/team/workers")]);
      setState({
        loading: false,
        error: boardRes.status === "rejected" ? boardRes.reason?.message || "Could not load dispatch board" : "",
        lanes: boardRes.status === "fulfilled" ? boardRes.value.lanes || {} : {},
        workers: workersRes.status === "fulfilled" ? listFrom(workersRes.value, "workers") : [],
      });
    } catch (err) {
      setState({ loading: false, error: err?.message || "Could not load dispatch board", lanes: {}, workers: [] });
    }
  }

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(laneLabels).map((key) => [key, Array.isArray(state.lanes?.[key]) ? state.lanes[key].length : 0]));
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return { counts, total };
  }, [state.lanes]);

  const linked = useMemo(() => findLinkedJob(state.lanes, linkedJobId), [state.lanes, linkedJobId]);
  const selectedWorker = useMemo(() => state.workers.find((worker) => String(workerId(worker)) === String(selectedWorkerId)), [state.workers, selectedWorkerId]);
  const fieldWorkers = useMemo(() => state.workers.filter(isFieldWorker), [state.workers]);

  useEffect(() => {
    if (state.loading || !linkedJobId) return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector(`[data-cdb-job-id="${CSS.escape(linkedJobId)}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [state.loading, linkedJobId]);

  async function assignSelectedWorker() {
    if (!linkedJobId) return setNotice("Open a linked Work Slip job before assigning.");
    if (!selectedWorker) return setNotice("Choose a worker before assigning.");
    setAssigning(true);
    try {
      const res = await assignDispatchWorker({ job_id: linkedJobId, worker_id: workerId(selectedWorker), worker_name: workerName(selectedWorker) });
      setNotice(res?.conflict_count ? `Assigned, but ${res.conflict_count} possible open-job conflict needs checking.` : `Assigned ${workerName(selectedWorker)} to this job.`);
      await load();
    } catch (err) {
      setNotice(err?.message || "Could not assign worker.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <main className="cdb-shell" data-version="CHURVOX_DISPATCH_BOARD_PAGE_20260528 CHURVOX_DISPATCH_BOARD_OPERATOR_UPGRADE_20260528 CHURVOX_DISPATCH_LINKED_JOB_NATIVE_HIGHLIGHT_20260529 CHURVOX_DISPATCH_NATIVE_ASSIGNMENT_ACTION_20260529">
      <section className="cdb-hero"><div><p>DISPATCH BOARD</p><h1>See work moving across the business.</h1><span>Jobs grouped by unassigned, assigned, in progress, completed, review and invoice lanes.</span></div><aside><small>Status</small><b>{state.loading ? "Loading" : `${summary.total} jobs`}</b><em>{state.error || notice || (linkedJobId ? "Linked Work Slip highlighted below" : "Command Floor remains the approval flow")}</em></aside></section>

      {linkedJobId && (
        <section className={`cdb-linked-job-panel ${linked ? "is-found" : "is-missing"}`}>
          <div><small>Dispatch from Work Slip</small><h2>{linked ? jobTitle(linked.job) : `Job ${linkedJobId}`}</h2><p>{state.loading ? "Loading linked dispatch context..." : linked ? `${jobClient(linked.job)} · ${jobWorker(linked.job)} · ${laneLabels[linked.laneKey] || linked.laneKey} lane` : "This job was opened from a Work Slip, but it is not visible in the loaded dispatch lanes yet."}</p>{linked && <div className="cdb-linked-meta"><span>{jobStatus(linked.job)}</span><span>{jobPlace(linked.job)}</span><span>{laneLabels[linked.laneKey] || linked.laneKey}</span></div>}</div>
          <aside className="cdb-assign-box"><small>Assign worker</small><select value={selectedWorkerId} onChange={(e) => setSelectedWorkerId(e.target.value)}><option value="">Choose field worker</option>{fieldWorkers.map((worker) => <option key={workerId(worker)} value={workerId(worker)}>{workerName(worker)}{worker?.region ? ` · ${worker.region}` : ""}</option>)}</select><button type="button" disabled={assigning || !selectedWorkerId} onClick={assignSelectedWorker}>{assigning ? "Assigning..." : "Assign selected worker"}</button><em>{selectedWorker ? `Will assign ${workerName(selectedWorker)}. Churvox logs this for owner review.` : "Owner approval action — no worker is assigned until you tap the button."}</em></aside>
          <nav><Link to={`/jobs/${linkedJobId}`}>Open linked job</Link><Link to="/dashboard">Back to Work Slip queue</Link><Link to={`/invoices/new?job_id=${encodeURIComponent(linkedJobId)}`}>Prepare invoice</Link></nav>
        </section>
      )}

      <section className="cdb-summary-strip"><article><small>Needs crew</small><b>{summary.counts.unassigned || 0}</b></article><article><small>In field</small><b>{(summary.counts.assigned || 0) + (summary.counts.in_progress || 0)}</b></article><article><small>Owner review</small><b>{summary.counts.needs_review || 0}</b></article><article><small>Money desk</small><b>{summary.counts.ready_to_invoice || 0}</b></article></section>

      <section className="cdb-board">{Object.entries(laneLabels).map(([key, label]) => { const rows = Array.isArray(state.lanes?.[key]) ? state.lanes[key] : []; return <article className={`cdb-lane cdb-lane-${key}`} key={key}><header><span>{label}</span><b>{rows.length}</b><small>{laneHelp[key]}</small></header><div className="cdb-rows">{rows.length ? rows.slice(0, 18).map((job, index) => { const id = jobId(job); const isLinked = linkedJobId && String(id) === String(linkedJobId); return <Link to={id ? `/jobs/${id}` : "/jobs"} className={`cdb-job ${isLinked ? "is-linked" : ""}`} data-cdb-job-id={id || undefined} key={id || index}>{isLinked && <i>Opened from Work Slip</i>}<strong>{jobTitle(job)}</strong><small>{jobClient(job)}</small><em>{jobPlace(job)}</em><span>{jobWorker(job)}</span></Link>; }) : <div className="cdb-empty">Nothing here.</div>}</div></article>; })}</section>

      <footer className="cdb-footer"><Link to="/dashboard">Back to Command Floor</Link><Link to="/operator-tools">Open AI Operator tools</Link><Link to="/jobs/new">Create job</Link></footer>
    </main>
  );
}
