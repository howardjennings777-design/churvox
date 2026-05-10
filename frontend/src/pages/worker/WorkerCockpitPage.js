import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/churvox-worker-cockpit.css";

const env = typeof process !== "undefined" && process.env ? process.env : {};
const RAW_API_BASE =
  env.REACT_APP_BACKEND_URL ||
  env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "").replace(/\/api$/, "");

const TOKEN_KEYS = [
  "token",
  "authToken",
  "auth_token",
  "accessToken",
  "access_token",
  "churvox_token",
];

const USER_KEYS = [
  "user",
  "currentUser",
  "auth_user",
  "churvox_user",
];

const ISSUE_TYPES = [
  "Customer not home",
  "Cannot access property",
  "Wrong address",
  "Need more materials",
  "Job bigger than expected",
  "Safety issue",
  "Weather delay",
  "Other",
];

const PHOTO_TYPES = [
  ["before", "Before photo"],
  ["during", "During photo"],
  ["completion", "Completion photo"],
  ["issue", "Issue photo"],
];

function safeJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredToken() {
  if (typeof window === "undefined") return "";
  for (const key of TOKEN_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }
  return "";
}

function getStoredUser() {
  if (typeof window === "undefined") return null;
  for (const key of USER_KEYS) {
    const value = safeJson(window.localStorage.getItem(key));
    if (value && typeof value === "object") return value;
  }
  return null;
}

function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`}`;
}

async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const isForm = options.body instanceof FormData;

  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.text();
      if (body) message = body;
    } catch {
      // keep fallback
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();

  return response.text();
}

async function tryApi(candidates) {
  let lastError = null;

  for (const candidate of candidates) {
    const { path, ...options } = candidate;
    try {
      return await apiRequest(path, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No endpoint worked");
}

async function fetchFirst(paths) {
  return tryApi(paths.map((path) => ({ path, method: "GET" })));
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["jobs", "items", "results", "data", "assigned_jobs", "assignedJobs"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  return [];
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isTomorrow(date) {
  if (!date) return false;
  const tomorrow = startOfDay();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfDay(date).getTime() === tomorrow.getTime();
}

function isThisWeek(date) {
  if (!date) return false;
  const today = startOfDay();
  const end = startOfDay();
  end.setDate(end.getDate() + 7);
  return date >= today && date <= end;
}

function formatDate(value) {
  const date = asDate(value);
  if (!date) return "No date set";
  if (isSameDay(date, new Date())) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(value) {
  const date = asDate(value);
  if (!date) return "Time not set";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatMinutes(minutes) {
  const value = Number(minutes || 0);
  if (!value) return "0m";
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function normaliseStatus(status) {
  const value = String(status || "assigned").toLowerCase().replace(/\s+/g, "_");
  if (["done", "complete"].includes(value)) return "completed";
  if (["started", "active", "working"].includes(value)) return "in_progress";
  if (["onway", "on_my_way", "travelling", "traveling"].includes(value)) return "on_the_way";
  return value;
}

function statusLabel(status) {
  const labels = {
    assigned: "Assigned",
    acknowledged: "Acknowledged",
    on_the_way: "On the way",
    in_progress: "In progress",
    paused: "Paused",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[normaliseStatus(status)] || String(status || "Assigned");
}

function statusClass(status) {
  const value = normaliseStatus(status);
  if (value === "completed") return "is-completed";
  if (value === "in_progress") return "is-progress";
  if (value === "paused") return "is-paused";
  if (value === "cancelled") return "is-cancelled";
  if (value === "on_the_way") return "is-way";
  if (value === "acknowledged") return "is-ack";
  return "is-assigned";
}

function getJobId(job) {
  return firstValue(job.id, job._id, job.job_id, job.uuid);
}

function getClientName(job) {
  return firstValue(
    job.client_name,
    job.customer_name,
    job.clientName,
    job.customerName,
    job.client?.name,
    job.customer?.name,
    job.client?.business_name,
    job.customer?.business_name,
    "Client not set"
  );
}

function getAddress(job) {
  return firstValue(
    job.address,
    job.site_address,
    job.job_address,
    job.property_address,
    job.location,
    job.client?.address,
    job.customer?.address,
    ""
  );
}

function getScheduled(job) {
  return firstValue(
    job.scheduled_at,
    job.scheduledAt,
    job.start_time,
    job.startTime,
    job.appointment_time,
    job.due_date,
    job.dueDate,
    job.date,
    job.created_at
  );
}

function getTitle(job) {
  return firstValue(
    job.title,
    job.job_title,
    job.name,
    job.service_type,
    job.service,
    job.trade,
    job.type,
    "Job"
  );
}

function getInstructions(job) {
  return firstValue(
    job.instructions,
    job.job_instructions,
    job.description,
    job.scope,
    job.work_order,
    job.notes,
    job.internal_notes,
    "No instructions added yet."
  );
}

function countList(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value.length;
  }
  return 0;
}

function normaliseJob(job) {
  return {
    id: getJobId(job),
    raw: job,
    title: getTitle(job),
    clientName: getClientName(job),
    address: getAddress(job),
    scheduledAt: getScheduled(job),
    status: normaliseStatus(job.status || job.job_status),
    instructions: getInstructions(job),
    region: firstValue(job.region, job.area, job.zone, ""),
    priority: firstValue(job.priority, job.urgency, ""),
    photoCount:
      countList(job.photos, job.job_photos, job.images, job.attachments, job.photo_urls) ||
      Number(job.photo_count || job.photos_count || 0),
    workerNoteCount:
      countList(job.worker_notes, job.notes_list, job.job_notes) ||
      Number(job.worker_note_count || job.notes_count || 0),
    todayMinutes: Number(job.worked_minutes_today || job.today_minutes || job.time_today || 0),
    weekMinutes: Number(job.worked_minutes_week || job.week_minutes || job.time_week || 0),
  };
}

function assignmentText(job) {
  const raw = job.raw || job;
  return [
    raw.assigned_worker_id,
    raw.assignedWorkerId,
    raw.worker_id,
    raw.workerId,
    raw.assigned_to,
    raw.assignedTo,
    raw.assigned_worker_email,
    raw.worker_email,
    raw.assigned_worker_name,
    raw.worker_name,
    raw.employee_email,
    raw.employee_name,
  ].filter(Boolean).join(" ").toLowerCase();
}

function userNeedles(user) {
  if (!user) return [];
  return [
    user.id,
    user._id,
    user.user_id,
    user.email,
    user.name,
    user.full_name,
    user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : "",
  ].filter(Boolean).map((value) => String(value).toLowerCase());
}

function isWorkerUser(user) {
  const role = String(user?.role || user?.user_role || "").toLowerCase();
  return role.includes("worker") || role.includes("employee");
}

function filterJobsForWorker(jobs, user) {
  if (!isWorkerUser(user)) return jobs;

  const needles = userNeedles(user);
  if (!needles.length) return jobs;

  const matched = jobs.filter((job) => {
    const text = assignmentText(job);
    return text && needles.some((needle) => needle && text.includes(needle));
  });

  return matched.length ? matched : jobs;
}

function sortJobs(a, b) {
  const dateA = asDate(a.scheduledAt)?.getTime() || 9999999999999;
  const dateB = asDate(b.scheduledAt)?.getTime() || 9999999999999;

  const rank = {
    in_progress: 0,
    paused: 1,
    on_the_way: 2,
    acknowledged: 3,
    assigned: 4,
    completed: 9,
    cancelled: 10,
  };

  return (rank[a.status] ?? 5) - (rank[b.status] ?? 5) || dateA - dateB;
}

function mapUrl(address) {
  if (!address) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

async function getLocationSnapshot() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          captured_at: new Date().toISOString(),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
    );
  });
}

const ACTION_COPY = {
  acknowledge: "Job acknowledged",
  onway: "Marked on the way",
  start: "Job started",
  pause: "Job paused",
  resume: "Job resumed",
  complete: "Job completed",
};

const ACTION_STATUS = {
  acknowledge: "acknowledged",
  onway: "on_the_way",
  start: "in_progress",
  pause: "paused",
  resume: "in_progress",
  complete: "completed",
};

function actionCandidates(jobId, action, payload) {
  const id = encodeURIComponent(jobId);
  const status = ACTION_STATUS[action];

  const direct = {
    acknowledge: [`/jobs/${id}/acknowledge`, `/worker/jobs/${id}/acknowledge`],
    onway: [`/jobs/${id}/on-my-way`, `/jobs/${id}/onway`, `/worker/jobs/${id}/on-my-way`],
    start: [`/jobs/${id}/start`, `/jobs/${id}/start-job`, `/jobs/${id}/time/start`, `/jobs/${id}/timer/start`, `/worker/jobs/${id}/start`],
    pause: [`/jobs/${id}/pause`, `/jobs/${id}/time/pause`, `/jobs/${id}/timer/pause`, `/worker/jobs/${id}/pause`],
    resume: [`/jobs/${id}/resume`, `/jobs/${id}/time/resume`, `/jobs/${id}/timer/resume`, `/worker/jobs/${id}/resume`],
    complete: [`/jobs/${id}/complete`, `/jobs/${id}/finish`, `/jobs/${id}/complete-job`, `/worker/jobs/${id}/complete`],
  };

  return [
    ...(direct[action] || []).map((path) => ({
      path,
      method: "POST",
      body: JSON.stringify(payload),
    })),
    {
      path: `/jobs/${id}/status`,
      method: "POST",
      body: JSON.stringify({ ...payload, status }),
    },
    {
      path: `/jobs/${id}`,
      method: "PATCH",
      body: JSON.stringify({ ...payload, status }),
    },
  ];
}

export default function WorkerCockpitPage() {
  const [jobs, setJobs] = useState([]);
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("today");
  const [selectedJob, setSelectedJob] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[1]);
  const [photoType, setPhotoType] = useState("completion");
  const [busyKey, setBusyKey] = useState("");
  const [completionChecks, setCompletionChecks] = useState({
    work_done: false,
    photos_added: false,
    final_note: false,
    no_issues: false,
  });

  const fileInputRef = useRef(null);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    setError("");

    try {
      const storedUser = getStoredUser();

      let freshUser = storedUser;
      try {
        freshUser = await fetchFirst(["/auth/me", "/users/me", "/me"]);
      } catch {
        // Stored user is enough.
      }

      if (freshUser) setUser(freshUser);

      const payload = await fetchFirst([
        "/worker/jobs",
        "/jobs/my",
        "/jobs/assigned",
        "/assigned-jobs",
        "/jobs",
      ]);

      const normalised = unwrapList(payload)
        .map(normaliseJob)
        .filter((job) => job.id)
        .sort(sortJobs);

      setJobs(filterJobsForWorker(normalised, freshUser || storedUser));
    } catch {
      setError("Could not load worker jobs. Refresh or log in again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(""), 3300);
    return () => clearTimeout(timeout);
  }, [toast]);

  const grouped = useMemo(() => {
    const today = [];
    const tomorrow = [];
    const week = [];
    const completed = [];

    for (const job of jobs) {
      const date = asDate(job.scheduledAt);

      if (job.status === "completed") completed.push(job);
      else if (isSameDay(date, new Date()) || !date) today.push(job);
      else if (isTomorrow(date)) tomorrow.push(job);
      else if (isThisWeek(date)) week.push(job);
    }

    return {
      today: today.sort(sortJobs),
      tomorrow: tomorrow.sort(sortJobs),
      week: week.sort(sortJobs),
      completed: completed.sort(sortJobs),
    };
  }, [jobs]);

  const nextJob = useMemo(() => {
    const active = jobs.find((job) => ["in_progress", "paused", "on_the_way"].includes(job.status));
    if (active) return active;
    return jobs.filter((job) => !["completed", "cancelled"].includes(job.status)).sort(sortJobs)[0] || null;
  }, [jobs]);

  const stats = useMemo(() => {
    return {
      todayJobs: grouped.today.length,
      completedJobs: grouped.completed.length,
      todayTime: jobs.reduce((sum, job) => sum + job.todayMinutes, 0),
      weekTime: jobs.reduce((sum, job) => sum + job.weekMinutes, 0),
    };
  }, [jobs, grouped]);

  function updateLocalStatus(jobId, status) {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? { ...job, status: normaliseStatus(status), raw: { ...job.raw, status: normaliseStatus(status) } }
          : job
      )
    );

    setSelectedJob((current) =>
      current && current.id === jobId
        ? { ...current, status: normaliseStatus(status), raw: { ...current.raw, status: normaliseStatus(status) } }
        : current
    );
  }

  async function handleAction(job, action, extraPayload = {}) {
    if (!job?.id) return;

    const key = `${job.id}:${action}`;
    setBusyKey(key);
    setError("");

    try {
      const location = ["start", "complete"].includes(action) ? await getLocationSnapshot() : null;

      const payload = {
        action,
        status: ACTION_STATUS[action],
        source: "worker_app",
        worker_note: extraPayload.worker_note || undefined,
        completion_checks: extraPayload.completion_checks || undefined,
        location,
        timestamp: new Date().toISOString(),
      };

      await tryApi(actionCandidates(job.id, action, payload));

      updateLocalStatus(job.id, ACTION_STATUS[action]);
      setToast(ACTION_COPY[action] || "Job updated");
      await loadAll({ silent: true });
    } catch {
      setError("That action could not be saved. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function submitNote(job, mode = "note") {
    const text = noteText.trim();
    if (!job?.id || !text) return;

    const id = encodeURIComponent(job.id);
    const key = `${job.id}:note`;
    setBusyKey(key);
    setError("");

    const payload = {
      job_id: job.id,
      note: text,
      message: text,
      body: text,
      type: mode,
      issue_type: mode === "issue" ? issueType : undefined,
      source: "worker_app",
      visibility: "office",
      created_at: new Date().toISOString(),
    };

    try {
      await tryApi([
        { path: `/jobs/${id}/notes`, method: "POST", body: JSON.stringify(payload) },
        { path: `/worker/jobs/${id}/notes`, method: "POST", body: JSON.stringify(payload) },
        { path: `/job-notes`, method: "POST", body: JSON.stringify(payload) },
        { path: `/notes`, method: "POST", body: JSON.stringify(payload) },
      ]);

      setNoteText("");
      setToast(mode === "issue" ? "Issue sent to office" : "Note saved");
      await loadAll({ silent: true });
    } catch {
      setError("Could not save the note yet. Try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function uploadPhoto(job, file) {
    if (!job?.id || !file) return;

    const id = encodeURIComponent(job.id);
    setBusyKey(`${job.id}:photo`);
    setError("");

    const paths = [
      `/jobs/${id}/photos`,
      `/worker/jobs/${id}/photos`,
      `/jobs/${id}/upload-photo`,
      `/job-photos`,
    ];

    for (const path of paths) {
      const form = new FormData();
      form.append("file", file);
      form.append("photo", file);
      form.append("job_id", job.id);
      form.append("type", photoType);
      form.append("source", "worker_app");

      try {
        await apiRequest(path, { method: "POST", body: form });
        setToast("Photo uploaded");
        await loadAll({ silent: true });
        setBusyKey("");
        return;
      } catch {
        // try next endpoint shape
      }
    }

    setBusyKey("");
    setError("Could not upload the photo. Try again.");
  }

  async function completeWithChecklist(job) {
    const note = noteText.trim();

    if (note) {
      await submitNote(job, "completion");
    }

    await handleAction(job, "complete", {
      worker_note: note || undefined,
      completion_checks: completionChecks,
    });

    setCompletionChecks({
      work_done: false,
      photos_added: false,
      final_note: false,
      no_issues: false,
    });
  }

  const visibleJobs = grouped[activeTab] || [];

  return (
    <main className="cvx-worker-app">
      {toast ? <div className="cvx-worker-toast">{toast}</div> : null}

      <section className="cvx-worker-owner-theme-hero">
        <div>
          <span className="cvx-worker-eyebrow">CHURVOX WORKER APP</span>
          <h1>Today’s Jobs</h1>
          <p>Start, navigate, upload proof, add notes, report issues, complete, then move to the next job.</p>
        </div>

        <div className="cvx-worker-hero-stats">
          <div>
            <strong>{formatMinutes(stats.todayTime)}</strong>
            <span>Today</span>
          </div>
          <div>
            <strong>{formatMinutes(stats.weekTime)}</strong>
            <span>This week</span>
          </div>
          <div>
            <strong>{stats.completedJobs}</strong>
            <span>Completed</span>
          </div>
        </div>
      </section>

      {error ? (
        <div className="cvx-worker-alert">
          <strong>Heads up</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <section className="cvx-worker-panel">
        <div className="cvx-worker-panel-head">
          <div>
            <span className="cvx-worker-eyebrow dark">NEXT UP</span>
            <h2>Your next job</h2>
          </div>
          <button type="button" onClick={() => loadAll({ silent: true })} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <EmptyState title="Loading jobs..." text="Checking your assigned work." />
        ) : nextJob ? (
          <JobSpotlight job={nextJob} busyKey={busyKey} onOpen={setSelectedJob} onAction={handleAction} />
        ) : (
          <EmptyState title="No active jobs right now" text="New assigned jobs will appear here automatically." />
        )}
      </section>

      <section className="cvx-worker-panel">
        <div className="cvx-worker-tabs" role="tablist" aria-label="Worker job filters">
          {[
            ["today", `Today ${grouped.today.length}`],
            ["tomorrow", `Tomorrow ${grouped.tomorrow.length}`],
            ["week", `This Week ${grouped.week.length}`],
            ["completed", `Completed ${grouped.completed.length}`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="cvx-worker-grid">
          {visibleJobs.length ? (
            visibleJobs.map((job) => (
              <JobCard key={job.id} job={job} busyKey={busyKey} onOpen={setSelectedJob} onAction={handleAction} />
            ))
          ) : (
            <EmptyState title="No jobs in this section" text="When the office assigns work, it will show here." wide />
          )}
        </div>
      </section>

      <nav className="cvx-worker-dock" aria-label="Worker quick actions">
        <button type="button" onClick={() => setActiveTab("today")}>Today</button>
        <button type="button" onClick={() => nextJob && setSelectedJob(nextJob)} disabled={!nextJob}>Next Job</button>
        <button type="button" onClick={() => loadAll({ silent: true })}>Refresh</button>
      </nav>

      {selectedJob ? (
        <JobModal
          job={selectedJob}
          busyKey={busyKey}
          noteText={noteText}
          setNoteText={setNoteText}
          issueType={issueType}
          setIssueType={setIssueType}
          photoType={photoType}
          setPhotoType={setPhotoType}
          completionChecks={completionChecks}
          setCompletionChecks={setCompletionChecks}
          fileInputRef={fileInputRef}
          onClose={() => setSelectedJob(null)}
          onAction={handleAction}
          onSubmitNote={submitNote}
          onUploadPhoto={uploadPhoto}
          onComplete={completeWithChecklist}
        />
      ) : null}
    </main>
  );
}

function EmptyState({ title, text, wide = false }) {
  return (
    <div className={`cvx-worker-empty ${wide ? "wide" : ""}`}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function JobSpotlight({ job, busyKey, onOpen, onAction }) {
  return (
    <article className="cvx-worker-spotlight">
      <div className="cvx-worker-spotlight-top">
        <div>
          <StatusBadge status={job.status} />
          <h3>{job.title}</h3>
          <p>{job.clientName}</p>
        </div>
        <div className="cvx-worker-time-card">
          <span>{formatDate(job.scheduledAt)}</span>
          <strong>{formatTime(job.scheduledAt)}</strong>
        </div>
      </div>

      <div className="cvx-worker-site-card">
        <span>Site</span>
        <strong>{job.address || "Address not set"}</strong>
      </div>

      <WorkerActions job={job} busyKey={busyKey} onOpen={onOpen} onAction={onAction} />
    </article>
  );
}

function JobCard({ job, busyKey, onOpen, onAction }) {
  return (
    <article className="cvx-worker-card">
      <div className="cvx-worker-card-top">
        <StatusBadge status={job.status} />
        <span>{formatDate(job.scheduledAt)} · {formatTime(job.scheduledAt)}</span>
      </div>

      <h3>{job.title}</h3>
      <p>{job.clientName}</p>

      <div className="cvx-worker-card-lines">
        <span>{job.address || "Address not set"}</span>
        <span>{job.photoCount} photos · {job.workerNoteCount} notes</span>
      </div>

      <WorkerActions job={job} busyKey={busyKey} onOpen={onOpen} onAction={onAction} compact />
    </article>
  );
}

function StatusBadge({ status }) {
  return <span className={`cvx-worker-status ${statusClass(status)}`}>{statusLabel(status)}</span>;
}

function WorkerActions({ job, busyKey, onOpen, onAction, compact = false }) {
  const status = normaliseStatus(job.status);
  const disabled = Boolean(busyKey);
  const isBusy = (action) => busyKey === `${job.id}:${action}`;

  return (
    <div className={`cvx-worker-actions ${compact ? "compact" : ""}`}>
      {job.address ? (
        <a className="secondary" href={mapUrl(job.address)} target="_blank" rel="noreferrer">
          Navigate
        </a>
      ) : null}

      <button type="button" className="secondary" onClick={() => onOpen(job)}>
        Details
      </button>

      {status === "assigned" ? (
        <button type="button" className="secondary" onClick={() => onAction(job, "acknowledge")} disabled={disabled}>
          {isBusy("acknowledge") ? "Saving..." : "Acknowledge"}
        </button>
      ) : null}

      {["assigned", "acknowledged"].includes(status) ? (
        <button type="button" onClick={() => onAction(job, "onway")} disabled={disabled}>
          {isBusy("onway") ? "Saving..." : "On my way"}
        </button>
      ) : null}

      {["assigned", "acknowledged", "on_the_way", "paused"].includes(status) ? (
        <button type="button" onClick={() => onAction(job, status === "paused" ? "resume" : "start")} disabled={disabled}>
          {isBusy("start") || isBusy("resume") ? "Saving..." : status === "paused" ? "Resume" : "Start Job"}
        </button>
      ) : null}

      {status === "in_progress" ? (
        <button type="button" className="secondary" onClick={() => onAction(job, "pause")} disabled={disabled}>
          {isBusy("pause") ? "Saving..." : "Pause"}
        </button>
      ) : null}

      {!["completed", "cancelled"].includes(status) ? (
        <button type="button" className="black" onClick={() => onOpen(job)}>
          Complete
        </button>
      ) : null}
    </div>
  );
}

function JobModal({
  job,
  busyKey,
  noteText,
  setNoteText,
  issueType,
  setIssueType,
  photoType,
  setPhotoType,
  completionChecks,
  setCompletionChecks,
  fileInputRef,
  onClose,
  onAction,
  onSubmitNote,
  onUploadPhoto,
  onComplete,
}) {
  const status = normaliseStatus(job.status);
  const disabled = Boolean(busyKey);

  function toggleCheck(key) {
    setCompletionChecks((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="cvx-worker-modal-backdrop" onClick={onClose}>
      <div className="cvx-worker-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="cvx-worker-modal-hero">
          <div>
            <StatusBadge status={job.status} />
            <h2>{job.title}</h2>
            <p>{job.clientName}</p>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </div>

        <div className="cvx-worker-info-grid">
          <div>
            <span>When</span>
            <strong>{formatDate(job.scheduledAt)} · {formatTime(job.scheduledAt)}</strong>
          </div>
          <div>
            <span>Site</span>
            <strong>{job.address || "Address not set"}</strong>
          </div>
          <div>
            <span>Proof</span>
            <strong>{job.photoCount} photos · {job.workerNoteCount} notes</strong>
          </div>
        </div>

        <section className="cvx-worker-modal-section">
          <h3>Job instructions</h3>
          <p>{job.instructions}</p>
        </section>

        <section className="cvx-worker-modal-section">
          <h3>Job actions</h3>
          <div className="cvx-worker-actions modal-actions">
            {job.address ? <a className="secondary" href={mapUrl(job.address)} target="_blank" rel="noreferrer">Navigate</a> : null}

            {["assigned", "acknowledged"].includes(status) ? (
              <button type="button" onClick={() => onAction(job, "onway")} disabled={disabled}>On my way</button>
            ) : null}

            {["assigned", "acknowledged", "on_the_way", "paused"].includes(status) ? (
              <button type="button" onClick={() => onAction(job, status === "paused" ? "resume" : "start")} disabled={disabled}>
                {status === "paused" ? "Resume" : "Start Job"}
              </button>
            ) : null}

            {status === "in_progress" ? (
              <button type="button" className="secondary" onClick={() => onAction(job, "pause")} disabled={disabled}>Pause</button>
            ) : null}
          </div>
        </section>

        <section className="cvx-worker-modal-section">
          <h3>Photo proof</h3>
          <div className="cvx-worker-form-row">
            <select value={photoType} onChange={(event) => setPhotoType(event.target.value)}>
              {PHOTO_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUploadPhoto(job, file);
                event.target.value = "";
              }}
            />

            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
              {busyKey === `${job.id}:photo` ? "Uploading..." : "Upload Photo"}
            </button>
          </div>
        </section>

        <section className="cvx-worker-modal-section">
          <h3>Note to office</h3>
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Add what the office or owner needs to know..."
          />
          <div className="cvx-worker-actions modal-actions">
            <button type="button" onClick={() => onSubmitNote(job, "note")} disabled={disabled || !noteText.trim()}>
              {busyKey === `${job.id}:note` ? "Saving..." : "Save Note"}
            </button>
          </div>
        </section>

        <section className="cvx-worker-modal-section">
          <h3>Report issue</h3>
          <div className="cvx-worker-form-row">
            <select value={issueType} onChange={(event) => setIssueType(event.target.value)}>
              {ISSUE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <button type="button" onClick={() => onSubmitNote(job, "issue")} disabled={disabled || !noteText.trim()}>
              Send Issue
            </button>
          </div>
        </section>

        {!["completed", "cancelled"].includes(status) ? (
          <section className="cvx-worker-complete">
            <h3>Complete job</h3>

            {[
              ["work_done", "Work is finished"],
              ["photos_added", "Photos/proof added"],
              ["final_note", "Final note added if needed"],
              ["no_issues", "No unresolved issue"],
            ].map(([key, label]) => (
              <label key={key}>
                <input type="checkbox" checked={completionChecks[key]} onChange={() => toggleCheck(key)} />
                <span>{label}</span>
              </label>
            ))}

            <button type="button" onClick={() => onComplete(job)} disabled={disabled}>
              {busyKey === `${job.id}:complete` ? "Completing..." : "Complete Job"}
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
