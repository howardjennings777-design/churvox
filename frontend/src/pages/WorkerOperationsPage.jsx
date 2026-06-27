import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, Camera, CheckCircle, Clock, Mail, MapPin, MessageCircle, Phone, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import "./WorkerOperationsPage.css";

// CHURVOX_WORKER_OPS_STABLE_JOBS_20260601
// This page no longer depends on a custom /worker/ops backend route.
// It builds the worker operations view from stable /jobs and patches job records.

const WORKER_DRAFT_KEY = "churvox:worker-ops-drafts:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const PROOF_TRAIL_KEY = "churvox:proof-trail:v1";
const DONE_PROPERLY_CHECKS = ["Work done", "Site tidy", "Customer note checked", "Proof note added"];

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function oid(value) { if (!value) return ""; if (typeof value === "object" && value.$oid) return String(value.$oid); return String(value); }
function idOf(value) { return oid(value?.id || value?._id || value?.uuid || value?.job_id); }
function lower(value) { return String(value || "").trim().toLowerCase(); }
function statusOf(job) { return lower(job?.status || job?.job_status || job?.workflow_status || "assigned"); }
function dateOf(job) { return String(job?.scheduled_date || job?.date || job?.scheduled_at || job?.due_date || "").slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
function userKeys(user) {
  return [user?.id, user?._id, user?.uuid, user?.worker_id, user?.team_member_id, user?.email, user?.name, user?.full_name, user?.display_name]
    .map((v) => lower(oid(v))).filter(Boolean);
}
function assignmentKeys(job) {
  return [job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assignedWorkerId, job?.assigned_worker_email, job?.worker_email, job?.assigned_to_email, job?.assigned_worker_name, job?.worker_name, job?.assigned_to_name]
    .map((v) => lower(oid(v))).filter(Boolean);
}
function assignedToMe(job, user) {
  const mine = userKeys(user);
  const assigned = assignmentKeys(job);
  if (!mine.length || !assigned.length) return false;
  return assigned.some((key) => mine.includes(key));
}
function scopeJobs(rawJobs, user) {
  const list = arr(rawJobs);
  const scoped = list.filter((job) => assignedToMe(job, user));
  const anyAssigned = list.some((job) => assignmentKeys(job).length > 0);
  if (scoped.length) return scoped;
  if (anyAssigned) return [];
  return list;
}
function isOpen(job) { return !["completed", "complete", "done", "cancelled", "canceled"].includes(statusOf(job)); }
function isCompleted(job) { return ["completed", "complete", "done", "finished"].includes(statusOf(job)); }
function isIssue(job) { return Boolean(job?.cannot_complete_reason || job?.issue_reason || job?.blocked_reason) || statusOf(job).includes("issue"); }
function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}
function jobTitle(job) { return pick(job, "title", "job_name", "job_title", "service_type", "job_type", "customer_name") || "Job"; }
function jobClient(job) { return pick(job, "customer_name", "client_name", "customer", "client", "name") || "No customer saved"; }
function jobAddress(job) { return pick(job, "address", "site_address", "service_address", "job_address") || "No address saved"; }
function jobPhone(job) { return String(pick(job, "customer_phone", "client_phone", "phone", "mobile", "customer_mobile", "client_mobile") || "").trim(); }
function jobEmail(job) { return String(pick(job, "customer_email", "client_email", "email") || "").trim(); }
function phoneHref(phone) { return phone ? phone.replace(/[^+0-9]/g, "") : ""; }
function mapUrl(job) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobAddress(job))}`; }
function draftKey(job) { return idOf(job) || `${jobTitle(job)}-${dateOf(job)}`; }
function readWorkerDrafts() {
  try {
    if (typeof window === "undefined") return {};
    const parsed = JSON.parse(window.localStorage.getItem(WORKER_DRAFT_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeWorkerDraft(job, draft) {
  try {
    if (typeof window === "undefined") return;
    const current = readWorkerDrafts();
    current[draftKey(job)] = { ...draft, updated_at: new Date().toISOString() };
    window.localStorage.setItem(WORKER_DRAFT_KEY, JSON.stringify(current));
  } catch {}
}
function clearWorkerDraft(job) {
  try {
    if (typeof window === "undefined") return;
    const current = readWorkerDrafts();
    delete current[draftKey(job)];
    window.localStorage.setItem(WORKER_DRAFT_KEY, JSON.stringify(current));
  } catch {}
}
function existingProof(job) {
  return Boolean(
    job?.worker_completion_notes ||
    job?.worker_notes ||
    job?.completion_note ||
    job?.proof_note ||
    (Array.isArray(job?.photos) && job.photos.length) ||
    (Array.isArray(job?.proof_photos) && job.proof_photos.length)
  );
}
function proofStatus(job, draft) {
  if (isCompleted(job) && existingProof(job)) return "Proof sent";
  if (draft?.note || (draft?.checklist || []).length) return "Proof started";
  return "Needs proof";
}
function pushLocalList(key, item, limit = 50) {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(key);
    const current = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(current) ? current : [];
    window.localStorage.setItem(key, JSON.stringify([item, ...list].slice(0, limit)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    return true;
  } catch {
    return false;
  }
}
function pushProofTrail(job, type, summary, extra = {}) {
  pushLocalList(PROOF_TRAIL_KEY, {
    id: `${type}-${idOf(job) || Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title: jobTitle(job),
    customer: jobClient(job),
    address: jobAddress(job),
    job_id: idOf(job),
    summary,
    at: new Date().toISOString(),
    ...extra,
  }, 60);
}
function pushCommandInbox(job, proof) {
  pushLocalList(COMMAND_INBOX_KEY, {
    id: `worker-proof-${idOf(job) || Date.now()}`,
    source: "worker-proof",
    category: "Work complete",
    action: "Prepare admin",
    title: `${jobTitle(job)} is complete`,
    summary: `${jobClient(job)} at ${jobAddress(job)} is ready for owner approval.`,
    found: `Worker completed ${jobTitle(job)}.`,
    prepared: "Prepare the job-to-invoice or follow-up form for owner approval.",
    why: "The work is done and now the owner needs the admin filled properly before money moves.",
    details: {
      customer_name: jobClient(job),
      job_title: jobTitle(job),
      address: jobAddress(job),
      scheduled_date: dateOf(job),
      worker_note: proof.note || "No worker note added",
      checklist: (proof.checklist || []).join(", "),
      materials: (proof.materials || []).join(", "),
    },
    created_at: new Date().toISOString(),
  }, 40);
}
function pushIssueToCommand(job, reason) {
  pushLocalList(COMMAND_INBOX_KEY, {
    id: `worker-issue-${idOf(job) || Date.now()}`,
    source: "worker-issue",
    category: "Blocked work",
    action: "Prepare owner decision",
    title: `${jobTitle(job)} is blocked`,
    summary: `${jobClient(job)} needs an owner decision before the job moves on.`,
    found: `Worker reported an issue on ${jobTitle(job)}: ${reason}`,
    prepared: "Prepare a clear owner decision form: fix now, reassign, contact customer, or park.",
    why: "Blocked jobs cost time unless the boss sees the decision cleanly.",
    details: {
      customer_name: jobClient(job),
      job_title: jobTitle(job),
      address: jobAddress(job),
      issue: reason,
      scheduled_date: dateOf(job),
    },
    created_at: new Date().toISOString(),
  }, 40);
}

function WorkerJobCard({ job, nextJob, onAcknowledge, onStart, onPause, onResume, onComplete, onIssue, onMaterial }) {
  const savedDraft = readWorkerDrafts()[draftKey(job)] || {};
  const [note, setNote] = useState(savedDraft.note || job.worker_completion_notes || job.worker_notes || "");
  const [material, setMaterial] = useState(savedDraft.material || "");
  const [materials, setMaterials] = useState(savedDraft.materials || []);
  const [checklist, setChecklist] = useState(savedDraft.checklist || []);
  const status = statusOf(job);
  const completed = isCompleted(job);
  const acknowledged = Boolean(job.acknowledged_at || job.worker_acknowledged_at || job.worker_acknowledged || status === "acknowledged");
  const draft = { note, material, materials, checklist };
  const readyProof = checklist.includes("Work done") && checklist.includes("Site tidy") && (note.trim() || existingProof(job));
  const phone = jobPhone(job);
  const phoneLink = phoneHref(phone);
  const email = jobEmail(job);

  useEffect(() => {
    writeWorkerDraft(job, { note, material, materials, checklist });
  }, [job, note, material, materials, checklist]);

  function toggleCheck(label) {
    setChecklist((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  function addMaterialDraft() {
    const clean = material.trim();
    if (!clean) return;
    setMaterials((current) => [...current, clean]);
    onMaterial(job, clean);
    setMaterial("");
  }

  return (
    <article className={`cv-worker-card ${completed ? "doneProperly" : ""}`}>
      <header>
        <div>
          <small>{job.status || "assigned"}</small>
          <h3>{jobTitle(job)}</h3>
          <p>{jobClient(job)}</p>
          <p>{jobAddress(job)}</p>
        </div>
        <div className="cv-worker-card-links">
          <a href={mapUrl(job)} target="_blank" rel="noreferrer"><MapPin size={14} /> Map</a>
          <Link to={`/worker/jobs/${idOf(job)}`}>Open</Link>
        </div>
      </header>

      <div className="cv-worker-proof-status">
        <ShieldCheck size={16} />
        <b>{proofStatus(job, draft)}</b>
        <span>{readyProof ? "Ready to complete" : "Tick the job checks and add a short note."}</span>
      </div>

      <div className="cv-worker-contact-strip" aria-label="Customer contact actions">
        {phoneLink ? <a href={`tel:${phoneLink}`}><Phone size={14} /> Call</a> : <span>No phone saved</span>}
        {phoneLink ? <a href={`sms:${phoneLink}`}><MessageCircle size={14} /> Text</a> : null}
        {email ? <a href={`mailto:${email}`}><Mail size={14} /> Email</a> : <span>No email saved</span>}
      </div>

      <section className="cv-worker-details">
        <p><b>Instructions:</b> {job.description || job.notes || job.site_instructions || "No instructions saved."}</p>
        {job.access_notes ? <p><b>Access:</b> {job.access_notes}</p> : null}
        {job.worker_completion_notes || job.worker_notes ? <p><b>Completion:</b> {job.worker_completion_notes || job.worker_notes}</p> : null}
        {job.cannot_complete_reason ? <p className="issue"><b>Issue:</b> {job.cannot_complete_reason}</p> : null}
      </section>

      <section className="cv-worker-checklist" aria-label="Done properly checklist">
        {DONE_PROPERLY_CHECKS.map((label) => (
          <label key={label}>
            <input type="checkbox" checked={checklist.includes(label)} onChange={() => toggleCheck(label)} />
            <span>{label}</span>
          </label>
        ))}
      </section>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short proof note for the boss, e.g. done, gate locked, green bin moved..." />

      <div className="cv-worker-actions">
        <button type="button" onClick={() => onAcknowledge(job)} disabled={acknowledged || completed}>Acknowledge</button>
        <button type="button" onClick={() => onStart(job)} disabled={status === "in_progress" || completed}><Play size={14} /> Start</button>
        <button type="button" onClick={() => onPause(job)} disabled={status !== "in_progress"}>Pause</button>
        <button type="button" onClick={() => onResume(job)} disabled={status !== "paused"}>Resume</button>
        <button type="button" className="complete" onClick={() => onComplete(job, { note, checklist, materials })} disabled={completed || !readyProof}><CheckCircle size={14} /> Complete</button>
        <button type="button" className="issue" onClick={() => onIssue(job, note)}><AlertTriangle size={14} /> Issue</button>
      </div>

      <div className="cv-worker-material">
        <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Material used, e.g. 2 bags mulch" />
        <button type="button" onClick={addMaterialDraft}>Add material</button>
      </div>

      {materials.length ? <p className="cv-worker-materials-saved"><b>Materials:</b> {materials.join(", ")}</p> : null}
      {nextJob ? <div className="cv-worker-next"><b>Next:</b><span>{jobTitle(nextJob)} - {jobAddress(nextJob)}</span></div> : null}
    </article>
  );
}

export default function WorkerOperationsPage() {
  const { get, post, patch } = useApi();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const loadOps = useCallback(async () => {
    setLoading(true);
    const res = await get("/jobs");
    if (res.success) setJobs(scopeJobs(res.data, user));
    else toast.error(res.error || "Could not load worker jobs");
    setLoading(false);
  }, [get, user]);

  useEffect(() => { loadOps(); }, [loadOps]);

  const todayKey = today();
  const todayJobs = jobs.filter((job) => isOpen(job) && (!dateOf(job) || dateOf(job) === todayKey));
  const active = jobs.filter((job) => ["in_progress", "in progress", "started", "paused"].includes(statusOf(job)));
  const upcoming = jobs.filter((job) => isOpen(job) && dateOf(job) && dateOf(job) > todayKey);
  const completed = jobs.filter(isCompleted);
  const issues = jobs.filter(isIssue);

  const metrics = useMemo(() => ({
    today: todayJobs.length,
    active: active.length,
    upcoming: upcoming.length,
    completed: completed.length,
    issues: issues.length,
  }), [todayJobs.length, active.length, upcoming.length, completed.length, issues.length]);

  const visibleJobs = useMemo(() => [...active, ...todayJobs, ...upcoming].filter((job, index, list) => {
    const id = idOf(job);
    return id && list.findIndex((x) => idOf(x) === id) === index;
  }), [active, todayJobs, upcoming]);

  const draftCount = useMemo(() => Object.keys(readWorkerDrafts()).length, [jobs.length, busy]);
  const activeJob = active[0] || null;
  const nextJob = visibleJobs[0] || null;
  const handoverTitle = activeJob ? `Keep going: ${jobTitle(activeJob)}` : nextJob ? `Next: ${jobTitle(nextJob)}` : "No job waiting";
  const handoverDetail = activeJob ? jobAddress(activeJob) : nextJob ? `${jobClient(nextJob)} - ${jobAddress(nextJob)}` : "Refresh when the boss assigns more work.";

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      toast.success("Job updated");
      await loadOps();
      return res;
    }
    toast.error(res.error || "Job update failed");
    return res;
  }

  function acknowledge(job) {
    run("acknowledge", async () => {
      const id = encodeURIComponent(idOf(job));
      const direct = await post(`/jobs/${id}/acknowledge`, {});
      const result = direct?.success ? direct : await patch(`/jobs/${id}`, { status: "acknowledged", acknowledged_at: new Date().toISOString(), worker_acknowledged_at: new Date().toISOString() });
      if (result?.success) pushProofTrail(job, "acknowledged", `${jobTitle(job)} acknowledged by worker.`);
      return result;
    });
  }

  function start(job) {
    run("start", async () => {
      const result = await post(`/jobs/${encodeURIComponent(idOf(job))}/timer/start`, {});
      if (result?.success) pushProofTrail(job, "started", `${jobTitle(job)} started.`);
      return result;
    });
  }

  function pause(job) {
    const reason = window.prompt("Pause reason?", "Paused by worker");
    if (reason === null) return;
    run("pause", async () => {
      const result = await post(`/jobs/${encodeURIComponent(idOf(job))}/timer/pause`, { pause_reason: reason });
      if (result?.success) pushProofTrail(job, "paused", `${jobTitle(job)} paused: ${reason}`);
      return result;
    });
  }

  function resume(job) {
    run("resume", async () => {
      const result = await post(`/jobs/${encodeURIComponent(idOf(job))}/timer/resume`, {});
      if (result?.success) pushProofTrail(job, "resumed", `${jobTitle(job)} resumed.`);
      return result;
    });
  }

  function complete(job, proof) {
    run("complete", async () => {
      const existingMaterials = Array.isArray(job.materials) ? job.materials : [];
      const cleanMaterials = (proof.materials || []).filter(Boolean).map((name) => ({ name, added_at: new Date().toISOString(), source: "worker" }));
      const result = await post(`/jobs/${encodeURIComponent(idOf(job))}/complete`, {
        worker_notes: proof.note || job.worker_notes || "",
        worker_completion_notes: proof.note || job.worker_completion_notes || "",
        proof_note: proof.note || "",
        done_properly_checklist: proof.checklist || [],
        materials: [...existingMaterials, ...cleanMaterials],
        work_review_status: "ready_for_review",
        review_status: "ready_for_review",
        owner_review_status: "ready_for_review",
      });
      if (result?.success) {
        clearWorkerDraft(job);
        pushCommandInbox(job, proof);
        pushProofTrail(job, "completed", `${jobTitle(job)} completed and sent to Command.`, { note: proof.note, checklist: proof.checklist, materials: proof.materials });
      }
      return result;
    });
  }

  function issue(job, reason) {
    const finalReason = reason || window.prompt("Why can't this job be completed?");
    if (!finalReason) return toast.error("Issue reason is required");
    run("issue", async () => {
      const result = await patch(`/jobs/${encodeURIComponent(idOf(job))}`, { status: "issue", cannot_complete_reason: finalReason, issue_reported_at: new Date().toISOString() });
      if (result?.success) {
        pushIssueToCommand(job, finalReason);
        pushProofTrail(job, "blocked", `${jobTitle(job)} blocked: ${finalReason}`, { issue: finalReason });
      }
      return result;
    });
  }

  function material(job, text) {
    if (!text.trim()) return toast.error("Add a material first");
    const existing = Array.isArray(job.materials) ? job.materials : [];
    run("material", async () => {
      const result = await patch(`/jobs/${encodeURIComponent(idOf(job))}`, { materials: [...existing, { name: text, added_at: new Date().toISOString(), source: "worker" }] });
      if (result?.success) pushProofTrail(job, "material", `${text} added to ${jobTitle(job)}.`, { material: text });
      return result;
    });
  }

  return (
    <PremiumPage maxWidth={980}>
      <PremiumHero
        eyebrow="Worker app"
        title="Today jobs, proof and completion."
        subtitle="Phone-first job control: acknowledge, start, complete properly, and send the boss a clean approval note."
        icon={<Clock className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadOps} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-worker-metrics">
        <article><span>Today</span><b>{metrics.today || 0}</b></article>
        <article><span>Active</span><b>{metrics.active || 0}</b></article>
        <article><span>Upcoming</span><b>{metrics.upcoming || 0}</b></article>
        <article><span>Completed</span><b>{metrics.completed || 0}</b></article>
        <article className="issue"><span>Issues</span><b>{metrics.issues || 0}</b></article>
      </section>

      <section className="cv-worker-day-brief">
        <article className="now">
          <span>Do now</span>
          <b>{handoverTitle}</b>
          <p>{handoverDetail}</p>
        </article>
        <article>
          <span>Proof drafts</span>
          <b>{draftCount}</b>
          <p>{draftCount ? "Finish these before you leave site." : "No unfinished proof drafts."}</p>
        </article>
        <article>
          <span>Boss handover</span>
          <b>{metrics.completed + metrics.issues}</b>
          <p>Completed and blocked work sends clean notes toward Command.</p>
        </article>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-worker-empty">Loading worker jobs...</div></PremiumCard>
      ) : (
        <>
          <section className="cv-worker-list">
            {visibleJobs.length ? visibleJobs.map((job, index) => (
              <WorkerJobCard
                key={idOf(job)}
                job={job}
                nextJob={visibleJobs[index + 1]}
                onAcknowledge={acknowledge}
                onStart={start}
                onPause={pause}
                onResume={resume}
                onComplete={complete}
                onIssue={issue}
                onMaterial={material}
              />
            )) : <div className="cv-worker-empty">No assigned jobs right now.</div>}
          </section>

          <section className="cv-worker-history">
            <PremiumCard title="Completed recently">
              {completed.length ? completed.slice(0, 8).map((job) => <Link key={idOf(job)} to={`/worker/jobs/${idOf(job)}`}>{jobTitle(job)}</Link>) : <div className="cv-worker-empty">No completed jobs yet.</div>}
            </PremiumCard>
            <PremiumCard title="Reported issues">
              {issues.length ? issues.slice(0, 8).map((job) => <Link key={idOf(job)} to={`/worker/jobs/${idOf(job)}`}>{jobTitle(job)}</Link>) : <div className="cv-worker-empty">No issues reported.</div>}
            </PremiumCard>
          </section>
        </>
      )}

      <section className="cv-worker-note">
        <Camera size={18} />
        <span>Photos still live on the job detail/photo flow. This screen keeps the day fast and sends clean completion proof toward Command.</span>
      </section>
    </PremiumPage>
  );
}
