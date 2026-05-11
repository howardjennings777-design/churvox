import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
function getApiBase() {
  const env = typeof process !== "undefined" && process.env ? process.env : {};
  const raw =
    env.REACT_APP_API_URL ||
    env.REACT_APP_BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";

  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

const API_BASE = getApiBase();

function apiUrl(path) {
  return `${API_BASE}/${String(path || "").replace(/^\/+/, "")}`;
}

function readToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("churvox_token") ||
      ""
    );
  } catch {
    return "";
  }
}

function readCurrentUser() {
  const keys = ["user", "authUser", "currentUser", "profile", "churvox_user", "churvoxUser"];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed.user || parsed.profile || parsed;
    } catch {
      continue;
    }
  }

  return {};
}

function currentUserMatches() {
  const user = readCurrentUser();

  return [
    user.id,
    user._id,
    user.user_id,
    user.worker_id,
    user.email,
    user.name,
    user.full_name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

async function apiRequest(path, options = {}) {
  const token = readToken();
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(apiUrl(path), {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      payload?.error ||
      `${options.method || "GET"} ${path} failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function tryRequests(candidates) {
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return await apiRequest(candidate.path, candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No matching endpoint worked.");
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["jobs", "assigned_jobs", "worker_jobs", "items", "data", "results"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  const firstArray = Object.values(payload).find((value) => Array.isArray(value));
  return firstArray || [];
}

function stableId(item) {
  return item?.id || item?._id || item?.job_id || item?.uuid || "";
}

function jobTitle(job) {
  return job?.title || job?.job_title || job?.service_type || job?.name || "Job";
}

function cleanStatus(job) {
  return String(job?.status || job?.job_status || job?.state || "assigned")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function statusLabel(job) {
  const status = cleanStatus(job);
  if (status.includes("complete")) return "Completed";
  if (status.includes("pause")) return "Paused";
  if (status.includes("progress") || status.includes("started")) return "In progress";
  if (status.includes("acknowledge")) return "Acknowledged";
  if (status.includes("cancel")) return "Cancelled";
  return "Assigned";
}

function statusTone(job) {
  const status = cleanStatus(job);
  if (status.includes("complete")) return "green";
  if (status.includes("pause")) return "amber";
  if (status.includes("progress") || status.includes("started")) return "blue";
  if (status.includes("cancel")) return "red";
  return "slate";
}

function jobClient(job) {
  return job?.client_name || job?.customer_name || job?.client || job?.customer || "Client not shown";
}

function jobAddress(job) {
  return job?.address || job?.site_address || job?.location || job?.job_address || "Address not shown";
}

function jobDate(job) {
  const raw =
    job?.scheduled_date ||
    job?.date ||
    job?.start_date ||
    job?.created_at ||
    job?.updated_at;

  if (!raw) return "Today";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Today";

  return date.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function jobBelongsToCurrentWorker(job, matches) {
  if (!matches.length) return true;

  const values = [
    job?.assigned_worker_id,
    job?.worker_id,
    job?.assigned_to,
    job?.assigned_worker,
    job?.assigned_worker_email,
    job?.worker_email,
    job?.assigned_worker_name,
    job?.worker_name,
    job?.assigned_to_name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (!values.length) return true;
  return values.some((value) => matches.includes(value));
}

function isCompleted(job) {
  return cleanStatus(job).includes("complete");
}

function isPaused(job) {
  return cleanStatus(job).includes("pause");
}

function isInProgress(job) {
  const status = cleanStatus(job);
  return status.includes("progress") || status.includes("started");
}

function JobModal({ job, onClose, onAction, onPhoto }) {
  if (!job) return null;

  return (
    <div className="wk-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="wk-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wk-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="wk-modal-head">
          <div>
            <p className="wk-kicker">Job details</p>
            <h2 id="wk-modal-title">{jobTitle(job)}</h2>
          </div>
          <button type="button" className="wk-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="wk-detail-grid">
          <div>
            <span>Client</span>
            <strong>{jobClient(job)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{statusLabel(job)}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{jobDate(job)}</strong>
          </div>
          <div>
            <span>Address</span>
            <strong>{jobAddress(job)}</strong>
          </div>
        </div>

        {job?.description || job?.notes ? (
          <div className="wk-note-box">
            <span>Notes</span>
            <p>{job.description || job.notes}</p>
          </div>
        ) : null}

        <div className="wk-modal-actions">
          {!isCompleted(job) && !isInProgress(job) && (
            <button type="button" className="wk-btn wk-btn-primary" onClick={() => onAction(job, "start")}>
              Start job
            </button>
          )}

          {isInProgress(job) && !isPaused(job) && (
            <button type="button" className="wk-btn wk-btn-soft" onClick={() => onAction(job, "pause")}>
              Pause
            </button>
          )}

          {isPaused(job) && (
            <button type="button" className="wk-btn wk-btn-primary" onClick={() => onAction(job, "resume")}>
              Resume
            </button>
          )}

          {!isCompleted(job) && (
            <button type="button" className="wk-btn wk-btn-green" onClick={() => onAction(job, "complete")}>
              Complete
            </button>
          )}

          <button type="button" className="wk-btn wk-btn-soft" onClick={() => onPhoto(job)}>
            Upload photo
          </button>
        </div>
      </section>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="wk-toast">{message}</div>;
}

function JobCard({ job, onOpen, onAction, onPhoto }) {
  const tone = statusTone(job);

  return (
    <article className={`wk-job-card wk-tone-${tone}`} onClick={() => onOpen(job)}>
      <div className="wk-job-main">
        <div>
          <p className="wk-job-date">{jobDate(job)}</p>
          <h3>{jobTitle(job)}</h3>
          <p>{jobClient(job)}</p>
          <small>{jobAddress(job)}</small>
        </div>

        <span className={`wk-status wk-status-${tone}`}>{statusLabel(job)}</span>
      </div>

      <div className="wk-job-actions" onClick={(event) => event.stopPropagation()}>
        {!isCompleted(job) && !isInProgress(job) && (
          <button type="button" className="wk-btn wk-btn-primary" onClick={() => onAction(job, "start")}>
            Start
          </button>
        )}

        {isInProgress(job) && !isPaused(job) && (
          <button type="button" className="wk-btn wk-btn-soft" onClick={() => onAction(job, "pause")}>
            Pause
          </button>
        )}

        {isPaused(job) && (
          <button type="button" className="wk-btn wk-btn-primary" onClick={() => onAction(job, "resume")}>
            Resume
          </button>
        )}

        {!isCompleted(job) && (
          <button type="button" className="wk-btn wk-btn-green" onClick={() => onAction(job, "complete")}>
            Complete
          </button>
        )}

        <button type="button" className="wk-btn wk-btn-soft" onClick={() => onPhoto(job)}>
          Photo
        </button>
      </div>
    </article>
  );
}

export default function WorkerDashboardPage() {
  const [jobs, setJobs] = useState([]);
  const [activeFilter, setActiveFilter] = useState("today");
  const [selectedJob, setSelectedJob] = useState(null);
  const [photoJob, setPhotoJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const photoInputRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    const responses = await Promise.allSettled([
      apiRequest("/worker/jobs"),
      apiRequest("/jobs/my"),
      apiRequest("/jobs/assigned"),
      apiRequest("/jobs"),
    ]);

    const allJobs = [];
    responses.forEach((response) => {
      if (response.status === "fulfilled") {
        allJobs.push(...toArray(response.value));
      }
    });

    const matches = currentUserMatches();
    const seen = new Set();

    const cleaned = allJobs
      .filter((job) => job && typeof job === "object")
      .filter((job) => jobBelongsToCurrentWorker(job, matches))
      .filter((job) => {
        const id = stableId(job) || `${jobTitle(job)}-${jobDate(job)}-${jobClient(job)}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

    setJobs(cleaned);

    if (!cleaned.length && responses.every((response) => response.status === "rejected")) {
      setError("Could not load worker jobs yet. Check worker job endpoints or login session.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      active: jobs.filter((job) => !isCompleted(job)).length,
      inProgress: jobs.filter(isInProgress).length,
      completed: jobs.filter(isCompleted).length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (activeFilter === "active") return jobs.filter((job) => !isCompleted(job));
    if (activeFilter === "progress") return jobs.filter(isInProgress);
    if (activeFilter === "completed") return jobs.filter(isCompleted);
    return jobs;
  }, [activeFilter, jobs]);

  async function runJobAction(job, action) {
    if (busy) return;

    const jobId = stableId(job);
    if (!jobId) {
      showToast("This job has no stable ID, so the action was not sent.");
      return;
    }

    setBusy(true);

    const nextStatus =
      action === "start"
        ? "in_progress"
        : action === "pause"
          ? "paused"
          : action === "resume"
            ? "in_progress"
            : action === "complete"
              ? "completed"
              : "acknowledged";

    try {
      await tryRequests([
        { method: "POST", path: `/jobs/${encodeURIComponent(jobId)}/${action}`, body: {} },
        { method: "POST", path: `/worker/jobs/${encodeURIComponent(jobId)}/${action}`, body: {} },
        { method: "POST", path: `/jobs/${encodeURIComponent(jobId)}/time/${action}`, body: {} },
        { method: "POST", path: `/jobs/${encodeURIComponent(jobId)}/timer/${action}`, body: {} },
        { method: "PATCH", path: `/jobs/${encodeURIComponent(jobId)}`, body: { status: nextStatus } },
        { method: "PUT", path: `/jobs/${encodeURIComponent(jobId)}`, body: { status: nextStatus } },
      ]);

      showToast(`Job ${action} saved.`);
      setSelectedJob(null);
      await loadJobs();
    } catch (err) {
      showToast(err?.message || `Could not ${action} job yet.`);
    } finally {
      setBusy(false);
    }
  }

  function choosePhoto(job) {
    setPhotoJob(job);
    window.setTimeout(() => photoInputRef.current?.click(), 0);
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !photoJob) return;

    const jobId = stableId(photoJob);
    if (!jobId) {
      showToast("This job has no stable ID, so the photo was not uploaded.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("photo", file);
    form.append("job_id", jobId);

    setBusy(true);

    try {
      await tryRequests([
        { method: "POST", path: `/jobs/${encodeURIComponent(jobId)}/photos`, body: form },
        { method: "POST", path: `/jobs/${encodeURIComponent(jobId)}/photo`, body: form },
        { method: "POST", path: `/worker/jobs/${encodeURIComponent(jobId)}/photos`, body: form },
        { method: "POST", path: `/job-photos/${encodeURIComponent(jobId)}`, body: form },
      ]);

      showToast("Photo uploaded.");
      await loadJobs();
    } catch (err) {
      showToast(err?.message || "Photo upload endpoint is not ready yet.");
    } finally {
      setBusy(false);
      setPhotoJob(null);
    }
  }

  return (
    <main className="wk-page">
      <Toast message={toast} />

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="wk-hidden-file"
        onChange={uploadPhoto}
      />

      <section className="wk-hero">
        <div>
          <p className="wk-kicker">Worker app</p>
          <h1>Today&apos;s jobs, clear actions, no clutter.</h1>
          <p>
            Start work, pause, resume, complete, upload job photos, and open job details without leaving the page.
          </p>

          <div className="wk-hero-actions">
            <button type="button" className="wk-btn wk-btn-primary" onClick={loadJobs} disabled={busy}>
              Refresh jobs
            </button>
            <button type="button" className="wk-btn wk-btn-dark" onClick={() => setActiveFilter("active")}>
              Show active work
            </button>
          </div>

          {error ? <div className="wk-error">{error}</div> : null}
        </div>

        <aside className="wk-today-panel">
          <span>{loading ? "Loading" : "Ready"}</span>
          <strong>{stats.active}</strong>
          <p>active jobs waiting for action</p>
        </aside>
      </section>

      <section className="wk-stats">
        <button type="button" className="wk-stat" onClick={() => setActiveFilter("today")}>
          <strong>{loading ? "..." : stats.total}</strong>
          <span>All assigned</span>
        </button>
        <button type="button" className="wk-stat" onClick={() => setActiveFilter("active")}>
          <strong>{loading ? "..." : stats.active}</strong>
          <span>Active</span>
        </button>
        <button type="button" className="wk-stat" onClick={() => setActiveFilter("progress")}>
          <strong>{loading ? "..." : stats.inProgress}</strong>
          <span>In progress</span>
        </button>
        <button type="button" className="wk-stat" onClick={() => setActiveFilter("completed")}>
          <strong>{loading ? "..." : stats.completed}</strong>
          <span>Completed</span>
        </button>
      </section>

      <section className="wk-board">
        <div className="wk-board-head">
          <div>
            <p className="wk-kicker">Run sheet</p>
            <h2>Your job list</h2>
          </div>

          <div className="wk-filter">
            {["today", "active", "progress", "completed"].map((filter) => (
              <button
                key={filter}
                type="button"
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === "today" ? "All" : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="wk-job-list">
          {filteredJobs.map((job) => (
            <JobCard
              key={stableId(job) || `${jobTitle(job)}-${jobClient(job)}`}
              job={job}
              onOpen={setSelectedJob}
              onAction={runJobAction}
              onPhoto={choosePhoto}
            />
          ))}

          {!loading && !filteredJobs.length ? (
            <div className="wk-empty">
              <strong>No jobs in this view.</strong>
              <p>Try refreshing or changing the filter.</p>
            </div>
          ) : null}

          {loading ? (
            <div className="wk-empty">
              <strong>Loading jobs...</strong>
              <p>Pulling your assigned work from Churvox.</p>
            </div>
          ) : null}
        </div>
      </section>

      <JobModal
        job={selectedJob}
        onClose={() => (busy ? null : setSelectedJob(null))}
        onAction={runJobAction}
        onPhoto={choosePhoto}
      />
    </main>
  );
}
