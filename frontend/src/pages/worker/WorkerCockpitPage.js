import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/churvox-worker-cockpit.css";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";

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

  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const text = await response.text();
      if (text) message = text;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;

  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return response.json();

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
  const candidates = paths.map((path) => ({ path, method: "GET" }));
  return tryApi(candidates);
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const possible = [
    payload.jobs,
    payload.items,
    payload.results,
    payload.data,
    payload.assigned_jobs,
    payload.assignedJobs,
  ];

  for (const value of possible) {
    if (Array.isArray(value)) return value;
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
  const weekEnd = startOfDay();
  weekEnd.setDate(weekEnd.getDate() + 7);
  return date >= today && date <= weekEnd;
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
    job.notes,
    job.internal_notes,
    "No instructions added yet."
  );
}

function getPhotoCount(job) {
  const possible = [
    job.photos,
    job.job_photos,
    job.images,
    job.attachments,
    job.photo_urls,
  ];

  for (const value of possible) {
    if (Array.isArray(value)) return value.length;
  }

  return Number(job.photo_count || job.photos_count || 0);
}

function normaliseJob(job) {
  const id = getJobId(job);

  return {
    id,
    raw: job,
    title: getTitle(job),
    clientName: getClientName(job),
    address: getAddress(job),
    scheduledAt: getScheduled(job),
    status: normaliseStatus(job.status || job.job_status),
    instructions: getInstructions(job),
    region: firstValue(job.region, job.area, job.zone, ""),
    priority: firstValue(job.priority, job.urgency, ""),
    photoCount: getPhotoCount(job),
    workerNoteCount: Array.isArray(job.worker_notes) ? job.worker_notes.length : Number(job.worker_note_count || 0),
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
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
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

  try {
    return await new Promise((resolve) => {
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
  } catch {
    return null;
  }
}

const ACTION_COPY = {
  acknowledge: "Job acknowledged",
  onway: "Marked as on the way",
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

  const workerDirect = {
    acknowledge: [`/worker/jobs/${id}/acknowledge`],
    onway: [`/worker/jobs/${id}/on-my-way`, `/worker/jobs/${id}/onway`],
    start: [`/worker/jobs/${id}/start`],
    pause: [`/worker/jobs/${id}/pause`],
    resume: [`/worker/jobs/${id}/resume`],
    complete: [`/worker/jobs/${id}/complete`],
  };

  const legacyDirect = {
    acknowledge: [`/jobs/${id}/acknowledge`],
    onway: [`/jobs/${id}/on-my-way`, `/jobs/${id}/onway`],
    start: [`/jobs/${id}/start`, `/jobs/${id}/start-job`, `/jobs/${id}/time/start`, `/jobs/${id}/timer/start`],
    pause: [`/jobs/${id}/pause`, `/jobs/${id}/time/pause`, `/jobs/${id}/timer/pause`],
    resume: [`/jobs/${id}/resume`, `/jobs/${id}/time/resume`, `/jobs/${id}/timer/resume`],
    complete: [`/jobs/${id}/complete`, `/jobs/${id}/finish`, `/jobs/${id}/complete-job`],
  };

  return [
    ...(workerDirect[action] || []).map((path) => ({
      path,
      method: "POST",
      body: JSON.stringify(payload),
    })),
    {
      path: `/worker/jobs/${id}/status`,
      method: "POST",
      body: JSON.stringify({ ...payload, status }),
    },
    {
      path: `/worker/jobs/${id}`,
      method: "PATCH",
      body: JSON.stringify({ ...payload, status }),
    },
    ...(legacyDirect[action] || []).map((path) => ({
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
  const [issueType, setIssueType] = useState("Cannot access property");
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
        // stored user is enough if auth/me is not available
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
    } catch (err) {
      setError("Could not load worker jobs. Please refresh or check your login.");
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
    const timeout = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const grouped = useMemo(() => {
    const today = [];
    const tomorrow = [];
    const week = [];
    const completed = [];

    for (const job of jobs) {
      const date = asDate(job.scheduledAt);
      if (job.status === "completed") {
        completed.push(job);
      } else if (isSameDay(date, new Date()) || !date) {
        today.push(job);
      } else if (isTomorrow(date)) {
        tomorrow.push(job);
      } else if (isThisWeek(date)) {
        week.push(job);
      }
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
    const todayMinutes = jobs.reduce((total, job) => total + Number(job.raw?.worked_minutes_today || job.raw?.today_minutes || 0), 0);
    const weekMinutes = jobs.reduce((total, job) => total + Number(job.raw?.worked_minutes_week || job.raw?.week_minutes || 0), 0);

    return {
      todayCount: grouped.today.length,
      completedCount: grouped.completed.length,
      todayTime: todayMinutes,
      weekTime: weekMinutes,
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
      const location =
        action === "start" || action === "complete"
          ? await getLocationSnapshot()
          : null;

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
    } catch (err) {
      setError("That action could not be saved. The screen stayed open so you can try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function submitNote(job, mode = "note") {
    const text = noteText.trim();
    if (!job?.id || !text) return;

    const id = encodeURIComponent(job.id);
    setBusyKey(`${job.id}:note`);
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
        { path: `/worker/jobs/${id}/notes`, method: "POST", body: JSON.stringify(payload) },
        { path: `/jobs/${id}/notes`, method: "POST", body: JSON.stringify(payload) },
        { path: `/job-notes`, method: "POST", body: JSON.stringify(payload) },
        { path: `/notes`, method: "POST", body: JSON.stringify(payload) },
      ]);

      setNoteText("");
      setToast(mode === "issue" ? "Issue sent to office" : "Note saved");
      await loadAll({ silent: true });
    } catch {
      setError("Could not save the note yet. Please try again.");
    } finally {
      setBusyKey("");
    }
  }

  async function uploadPhoto(job, file) {
    if (!job?.id || !file) return;

    const id = encodeURIComponent(job.id);
    const paths = [
      `/worker/jobs/${id}/photos`,
      `/jobs/${id}/photos`,
      `/jobs/${id}/upload-photo`,
      `/job-photos`,
    ];

    setBusyKey(`${job.id}:photo`);
    setError("");

    let lastError = null;

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
      } catch (err) {
        lastError = err;
      }
    }

    setBusyKey("");
    setError(lastError ? "Could not upload the photo. Please try again." : "Could not upload the photo.");
  }

  async function completeWithChecklist(job) {
    const note = noteText.trim();

    if (note) {
      try {
        await submitNote(job, "completion");
      } catch {
        // action error will show from submitNote
      }
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
    <main className="cvx-worker-cockpit">
      {toast ? <div className="cvx-worker-toast">{toast}</div> : null}

      <section className="cvx-worker-hero">
        <div className="cvx-worker-hero-copy">
          <span className="cvx-worker-kicker">Worker App</span>
          <h1>Today’s Jobs</h1>
          <p>Open the next job, navigate, start work, upload proof, add notes, complete, then move on.</p>
        </div>

        <div className="cvx-worker-stats">
          <div>
            <strong>{stats.todayTime}m</strong>
            <span>Today</span>
          </div>
          <div>
            <strong>{stats.weekTime}m</strong>
            <span>This week</span>
          </div>
          <div>
            <strong>{stats.completedCount}</strong>
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

      <section className="cvx-worker-next">
        <div className="cvx-worker-section-head">
          <span className="cvx-worker-kicker">Next up</span>
          <button type="button" onClick={() => loadAll({ silent: true })} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="cvx-worker-empty">
            <strong>Loading jobs...</strong>
            <span>Checking your assigned work.</span>
          </div>
        ) : nextJob ? (
          <JobSpotlight
            job={nextJob}
            busyKey={busyKey}
            onOpen={setSelectedJob}
            onAction={handleAction}
          />
        ) : (
          <div className="cvx-worker-empty">
            <strong>No active jobs right now</strong>
            <span>New assigned jobs will appear here automatically.</span>
          </div>
        )}
      </section>

      <section className="cvx-worker-list-shell">
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
              className={activeTab === key ? "is-active" : ""}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="cvx-worker-jobs-grid">
          {visibleJobs.length ? (
            visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                busyKey={busyKey}
                onOpen={setSelectedJob}
                onAction={handleAction}
              />
            ))
          ) : (
            <div className="cvx-worker-empty is-wide">
              <strong>No jobs in this section</strong>
              <span>When the office assigns work, it will show here.</span>
            </div>
          )}
        </div>
      </section>
      <WorkerBottomNav active="today" />

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

function JobSpotlight({ job, busyKey, onOpen, onAction }) {
  return (
    <article className="cvx-worker-spotlight">
      <div className="cvx-worker-job-main">
        <div>
          <span className={`cvx-worker-status ${statusClass(job.status)}`}>
            {statusLabel(job.status)}
          </span>
          <h2>{job.title}</h2>
          <p>{job.clientName}</p>
        </div>

        <div className="cvx-worker-job-meta">
          <span>{formatDate(job.scheduledAt)}</span>
          <strong>{formatTime(job.scheduledAt)}</strong>
        </div>
      </div>

      <div className="cvx-worker-address">
        <span>Site</span>
        <strong>{job.address || "Address not set"}</strong>
      </div>

      <WorkerActions job={job} busyKey={busyKey} onOpen={onOpen} onAction={onAction} />
    </article>
  );
}

function JobCard({ job, busyKey, onOpen, onAction }) {
  return (
    <article className="cvx-worker-job-card">
      <div className="cvx-worker-card-top">
        <span className={`cvx-worker-status ${statusClass(job.status)}`}>
          {statusLabel(job.status)}
        </span>
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

function WorkerActions({ job, busyKey, onOpen, onAction, compact = false }) {
  const status = normaliseStatus(job.status);
  const isBusy = (action) => busyKey === `${job.id}:${action}`;
  const disabled = Boolean(busyKey);

  return (
    <div className={`cvx-worker-actions ${compact ? "is-compact" : ""}`}>
      {job.address ? (
        <a className="cvx-worker-secondary" href={mapUrl(job.address)} target="_blank" rel="noreferrer">
          Navigate
        </a>
      ) : null}

      <button type="button" className="cvx-worker-secondary" onClick={() => onOpen(job)}>
        Details
      </button>

      {status === "assigned" ? (
        <button type="button" onClick={() => onAction(job, "acknowledge")} disabled={disabled}>
          {isBusy("acknowledge") ? "Saving..." : "Acknowledge"}
        </button>
      ) : null}

      {["assigned", "acknowledged"].includes(status) ? (
        <button type="button" onClick={() => onAction(job, "onway")} disabled={disabled}>
          {isBusy("onway") ? "Saving..." : "On my way"}
        </button>
      ) : null}

      {["assigned", "acknowledged", "on_the_way", "paused"].includes(status) ? (
        <button type="button" className="cvx-worker-primary" onClick={() => onAction(job, status === "paused" ? "resume" : "start")} disabled={disabled}>
          {isBusy("start") || isBusy("resume") ? "Saving..." : status === "paused" ? "Resume" : "Start Job"}
        </button>
      ) : null}

      {status === "in_progress" ? (
        <button type="button" className="cvx-worker-secondary" onClick={() => onAction(job, "pause")} disabled={disabled}>
          {isBusy("pause") ? "Saving..." : "Pause"}
        </button>
      ) : null}

      {!["completed", "cancelled"].includes(status) ? (
        <button type="button" className="cvx-worker-danger" onClick={() => onOpen(job)}>
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
    setCompletionChecks((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <div className="cvx-worker-modal-backdrop" onClick={onClose}>
      <div className="cvx-worker-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="cvx-worker-modal-head">
          <div>
            <span className={`cvx-worker-status ${statusClass(job.status)}`}>
              {statusLabel(job.status)}
            </span>
            <h2>{job.title}</h2>
            <p>{job.clientName}</p>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </div>

        <div className="cvx-worker-modal-grid">
          <div className="cvx-worker-info-card">
            <span>When</span>
            <strong>{formatDate(job.scheduledAt)} · {formatTime(job.scheduledAt)}</strong>
          </div>
          <div className="cvx-worker-info-card">
            <span>Site</span>
            <strong>{job.address || "Address not set"}</strong>
          </div>
          <div className="cvx-worker-info-card">
            <span>Proof</span>
            <strong>{job.photoCount} photos · {job.workerNoteCount} notes</strong>
          </div>
        </div>

        <div className="cvx-worker-modal-section">
          <h3>Job instructions</h3>
          <p>{job.instructions}</p>
        </div>

        <div className="cvx-worker-modal-actions">
          {job.address ? (
            <a href={mapUrl(job.address)} target="_blank" rel="noreferrer">Navigate</a>
          ) : null}

          {["assigned", "acknowledged"].includes(status) ? (
            <button type="button" onClick={() => onAction(job, "onway")} disabled={disabled}>On my way</button>
          ) : null}

          {["assigned", "acknowledged", "on_the_way", "paused"].includes(status) ? (
            <button type="button" className="cvx-worker-primary" onClick={() => onAction(job, status === "paused" ? "resume" : "start")} disabled={disabled}>
              {status === "paused" ? "Resume" : "Start Job"}
            </button>
          ) : null}

          {status === "in_progress" ? (
            <button type="button" onClick={() => onAction(job, "pause")} disabled={disabled}>Pause</button>
          ) : null}
        </div>

        <div className="cvx-worker-modal-section">
          <h3>Add photo proof</h3>
          <div className="cvx-worker-photo-row">
            <select value={photoType} onChange={(event) => setPhotoType(event.target.value)}>
              <option value="before">Before photo</option>
              <option value="during">During photo</option>
              <option value="completion">Completion photo</option>
              <option value="issue">Issue photo</option>
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
        </div>

        <div className="cvx-worker-modal-section">
          <h3>Note to office</h3>
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Add what the office or owner needs to know..."
          />
          <div className="cvx-worker-modal-actions">
            <button type="button" onClick={() => onSubmitNote(job, "note")} disabled={disabled || !noteText.trim()}>
              {busyKey === `${job.id}:note` ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>

        <div className="cvx-worker-modal-section">
          <h3>Report issue</h3>
          <div className="cvx-worker-issue-row">
            <select value={issueType} onChange={(event) => setIssueType(event.target.value)}>
              <option>Customer not home</option>
              <option>Cannot access property</option>
              <option>Wrong address</option>
              <option>Need more materials</option>
              <option>Job bigger than expected</option>
              <option>Safety issue</option>
              <option>Other</option>
            </select>
            <button type="button" onClick={() => onSubmitNote(job, "issue")} disabled={disabled || !noteText.trim()}>
              Send Issue
            </button>
          </div>
        </div>

        {!["completed", "cancelled"].includes(status) ? (
          <div className="cvx-worker-complete-box">
            <h3>Complete job</h3>
            <label>
              <input type="checkbox" checked={completionChecks.work_done} onChange={() => toggleCheck("work_done")} />
              Work is finished
            </label>
            <label>
              <input type="checkbox" checked={completionChecks.photos_added} onChange={() => toggleCheck("photos_added")} />
              Photos/proof added
            </label>
            <label>
              <input type="checkbox" checked={completionChecks.final_note} onChange={() => toggleCheck("final_note")} />
              Final note added if needed
            </label>
            <label>
              <input type="checkbox" checked={completionChecks.no_issues} onChange={() => toggleCheck("no_issues")} />
              No unresolved issue
            </label>

            <button type="button" className="cvx-worker-complete-button" onClick={() => onComplete(job)} disabled={disabled}>
              {busyKey === `${job.id}:complete` ? "Completing..." : "Complete Job"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
