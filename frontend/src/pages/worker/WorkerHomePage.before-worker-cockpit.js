import React, { useEffect, useMemo, useState } from "react";
import "../../styles/worker-mobile.css";

const ENV = typeof process !== "undefined" && process.env ? process.env : {};
const RAW_API =
  ENV.REACT_APP_BACKEND_URL ||
  ENV.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

const API_ROOT = RAW_API.replace(/\/$/, "").endsWith("/api")
  ? RAW_API.replace(/\/$/, "")
  : `${RAW_API.replace(/\/$/, "")}/api`;

function getToken() {
  const keys = ["token", "authToken", "access_token", "accessToken", "jwt", "churvox_token"];
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return storedUser.token || storedUser.access_token || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  const headers = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_ROOT}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: isForm ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data.detail || data.message || `${options.method || "GET"} ${path} failed`);
  }

  return data;
}

async function callFirst(attempts) {
  let lastError = null;

  for (const attempt of attempts) {
    try {
      return await api(attempt.path, attempt);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Action failed");
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.jobs)) return data.jobs;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function idOf(job) {
  return job?._id || job?.id || job?.job_id || "";
}

function statusOf(job) {
  return String(job?.status || "assigned").toLowerCase().replace(/\s+/g, "_");
}

function titleOf(job) {
  return (
    job?.title ||
    job?.job_title ||
    job?.service_type ||
    job?.service ||
    job?.name ||
    "Job"
  );
}

function clientOf(job) {
  return (
    job?.client_name ||
    job?.customer_name ||
    job?.client?.name ||
    job?.customer?.name ||
    "Client"
  );
}

function addressOf(job) {
  return (
    job?.address ||
    job?.site_address ||
    job?.job_address ||
    job?.client_address ||
    job?.location ||
    job?.client?.address ||
    ""
  );
}

function phoneOf(job) {
  return (
    job?.client_phone ||
    job?.customer_phone ||
    job?.phone ||
    job?.client?.phone ||
    job?.customer?.phone ||
    ""
  );
}

function jobDate(job) {
  const raw =
    job?.scheduled_at ||
    job?.scheduledAt ||
    job?.scheduled_date ||
    job?.scheduledDate ||
    job?.start_time ||
    job?.startTime ||
    job?.date ||
    job?.job_date;

  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a, b) {
  return a && b && a.toDateString() === b.toDateString();
}

function timeLabel(job) {
  const date = jobDate(job);
  if (!date) return "Any time";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(job) {
  const date = jobDate(job);
  if (!date) return "Unscheduled";
  return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

function minutesFromJob(job) {
  if (Number(job?.total_work_minutes)) return Number(job.total_work_minutes);
  if (Number(job?.worked_minutes)) return Number(job.worked_minutes);
  if (Number(job?.duration_minutes)) return Number(job.duration_minutes);

  if (Array.isArray(job?.time_entries)) {
    return job.time_entries.reduce((sum, entry) => {
      const start = entry.start || entry.started_at;
      const end = entry.end || entry.ended_at || entry.completed_at;
      if (!start || !end) return sum;
      const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
      return sum + (Number.isFinite(diff) && diff > 0 ? diff : 0);
    }, 0);
  }

  return 0;
}

function formatHours(minutes) {
  const mins = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function statusLabel(status) {
  const map = {
    assigned: "Assigned",
    acknowledged: "Acknowledged",
    in_progress: "In Progress",
    paused: "Paused",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] || status.replace(/_/g, " ");
}

function getWorkerUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function jobLooksAssignedToUser(job, user) {
  if (!user || (!user.id && !user._id && !user.email && !user.name)) return true;

  const workerValues = [
    job.assigned_worker_id,
    job.worker_id,
    job.assignee_id,
    job.assigned_to,
    job.assignedWorkerId,
    job.worker_email,
    job.assigned_worker_email,
    job.assigned_worker?.id,
    job.assigned_worker?._id,
    job.assigned_worker?.email,
    job.worker?.id,
    job.worker?._id,
    job.worker?.email,
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());

  if (!workerValues.length) return true;

  const userValues = [user.id, user._id, user.email, user.name]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());

  return workerValues.some((value) => userValues.includes(value));
}

async function getCurrentLocationQuietly() {
  if (!navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

export default function WorkerHomePage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [noteText, setNoteText] = useState("");
  const [busyKey, setBusyKey] = useState("");

  async function loadJobs() {
    setLoading(true);
    setError("");

    try {
      let user = getWorkerUser();

      try {
        const me = await api("/auth/me");
        user = me.user || me;
      } catch {
        try {
          const me = await api("/users/me");
          user = me.user || me;
        } catch {
          // Local user fallback is enough.
        }
      }

      const response = await api("/jobs");
      const allJobs = extractList(response);
      const mine = allJobs.filter((job) => jobLooksAssignedToUser(job, user));

      mine.sort((a, b) => {
        const da = jobDate(a)?.getTime() || 9999999999999;
        const db = jobDate(b)?.getTime() || 9999999999999;
        return da - db;
      });

      setJobs(mine);
    } catch (err) {
      setError(err.message || "Could not load worker jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    const fresh = jobs.find((job) => idOf(job) === idOf(selectedJob));
    if (fresh) setSelectedJob(fresh);
  }, [jobs, selectedJob]);

  const grouped = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const weekEnd = new Date();
    weekEnd.setDate(today.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const activeJobs = jobs.filter((job) => !["completed", "cancelled"].includes(statusOf(job)));

    return {
      today: activeJobs.filter((job) => {
        const date = jobDate(job);
        return !date || sameDay(date, today);
      }),
      tomorrow: activeJobs.filter((job) => sameDay(jobDate(job), tomorrow)),
      week: activeJobs.filter((job) => {
        const date = jobDate(job);
        return date && date >= today && date <= weekEnd;
      }),
      completedToday: jobs.filter((job) => statusOf(job) === "completed" && sameDay(jobDate(job), today)),
    };
  }, [jobs]);

  const nextJob = grouped.today[0] || grouped.tomorrow[0] || grouped.week[0] || null;

  const hours = useMemo(() => {
    const today = new Date();
    const todayJobs = jobs.filter((job) => sameDay(jobDate(job), today));
    const todayMinutes = todayJobs.reduce((sum, job) => sum + minutesFromJob(job), 0);
    const weekMinutes = jobs.reduce((sum, job) => sum + minutesFromJob(job), 0);

    return {
      today: formatHours(todayMinutes),
      week: formatHours(weekMinutes),
      completed: jobs.filter((job) => statusOf(job) === "completed").length,
    };
  }, [jobs]);

  function showSuccess(message) {
    setSuccess(message);
    window.clearTimeout(showSuccess.timer);
    showSuccess.timer = window.setTimeout(() => setSuccess(""), 3000);
  }

  function optimisticStatus(job, status) {
    const id = idOf(job);
    setJobs((current) =>
      current.map((item) => (idOf(item) === id ? { ...item, status } : item))
    );
  }

  async function runJobAction(job, action) {
    const id = idOf(job);
    if (!id) return;

    const key = `${id}:${action}`;
    setBusyKey(key);
    setError("");

    try {
      if (action === "start") {
        const location = await getCurrentLocationQuietly();
        const body = {
          status: "in_progress",
          started_at: new Date().toISOString(),
          start_location: location,
          start_lat: location?.lat,
          start_lng: location?.lng,
          location_accuracy: location?.accuracy,
        };

        await callFirst([
          { method: "POST", path: `/jobs/${id}/start`, body },
          { method: "POST", path: `/jobs/${id}/timer/start`, body },
          { method: "POST", path: `/jobs/${id}/time/start`, body },
          { method: "POST", path: `/jobs/${id}/start-job`, body },
          { method: "PATCH", path: `/jobs/${id}`, body },
        ]);

        optimisticStatus(job, "in_progress");
        showSuccess("Job started.");
      }

      if (action === "pause") {
        const body = { status: "paused", paused_at: new Date().toISOString() };

        await callFirst([
          { method: "POST", path: `/jobs/${id}/pause`, body },
          { method: "POST", path: `/jobs/${id}/timer/pause`, body },
          { method: "POST", path: `/jobs/${id}/time/pause`, body },
          { method: "PATCH", path: `/jobs/${id}`, body },
        ]);

        optimisticStatus(job, "paused");
        showSuccess("Job paused.");
      }

      if (action === "resume") {
        const body = { status: "in_progress", resumed_at: new Date().toISOString() };

        await callFirst([
          { method: "POST", path: `/jobs/${id}/resume`, body },
          { method: "POST", path: `/jobs/${id}/timer/resume`, body },
          { method: "POST", path: `/jobs/${id}/time/resume`, body },
          { method: "PATCH", path: `/jobs/${id}`, body },
        ]);

        optimisticStatus(job, "in_progress");
        showSuccess("Job resumed.");
      }

      if (action === "complete") {
        const body = { status: "completed", completed_at: new Date().toISOString() };

        await callFirst([
          { method: "POST", path: `/jobs/${id}/complete`, body },
          { method: "POST", path: `/jobs/${id}/complete-job`, body },
          { method: "POST", path: `/jobs/${id}/timer/complete`, body },
          { method: "POST", path: `/jobs/${id}/time/complete`, body },
          { method: "PATCH", path: `/jobs/${id}`, body },
        ]);

        optimisticStatus(job, "completed");
        showSuccess("Job completed.");
      }

      await loadJobs();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyKey("");
    }
  }

  async function saveNote(job) {
    const id = idOf(job);
    const note = noteText.trim();
    if (!id || !note) return;

    setBusyKey(`${id}:note`);
    setError("");

    try {
      await callFirst([
        { method: "POST", path: `/jobs/${id}/notes`, body: { note, message: note, type: "worker" } },
        { method: "POST", path: `/job-notes`, body: { job_id: id, note, type: "worker" } },
        { method: "PATCH", path: `/jobs/${id}`, body: { worker_note: note, latest_worker_note: note } },
      ]);

      setNoteText("");
      showSuccess("Note saved.");
      await loadJobs();
    } catch (err) {
      setError(err.message || "Could not save note.");
    } finally {
      setBusyKey("");
    }
  }

  async function uploadPhotos(job, event) {
    const id = idOf(job);
    const files = Array.from(event.target.files || []);
    if (!id || !files.length) return;

    setBusyKey(`${id}:photos`);
    setError("");

    try {
      const form = new FormData();
      files.forEach((file) => {
        form.append("photos", file);
        form.append("files", file);
        form.append("photo", file);
      });
      form.append("job_id", id);
      form.append("type", "worker");

      await callFirst([
        { method: "POST", path: `/jobs/${id}/photos`, body: form },
        { method: "POST", path: `/jobs/${id}/upload-photo`, body: form },
        { method: "POST", path: `/job-photos`, body: form },
      ]);

      event.target.value = "";
      showSuccess(files.length === 1 ? "Photo uploaded." : "Photos uploaded.");
      await loadJobs();
    } catch (err) {
      setError(err.message || "Photo upload failed.");
    } finally {
      setBusyKey("");
    }
  }

  function openMaps(job) {
    const address = addressOf(job);
    if (!address) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
  }

  function callClient(job) {
    const phone = phoneOf(job);
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  }

  function ActionButtons({ job, compact = false }) {
    const status = statusOf(job);
    const id = idOf(job);

    return (
      <div className={compact ? "workerActions compact" : "workerActions"}>
        {status !== "in_progress" && status !== "completed" && status !== "cancelled" && (
          <button
            className="primary"
            disabled={busyKey === `${id}:start`}
            onClick={(event) => {
              event.stopPropagation();
              runJobAction(job, "start");
            
          >
            {busyKey === `${id}:start` ? "Starting..." : "Start Job"}
          </button>
        )}

        {status === "in_progress" && (
          <button
            className="soft"
            disabled={busyKey === `${id}:pause`}
            onClick={(event) => {
              event.stopPropagation();
              runJobAction(job, "pause");
            
          >
            {busyKey === `${id}:pause` ? "Pausing..." : "Pause"}
          </button>
        )}

        {status === "paused" && (
          <button
            className="primary"
            disabled={busyKey === `${id}:resume`}
            onClick={(event) => {
              event.stopPropagation();
              runJobAction(job, "resume");
            
          >
            {busyKey === `${id}:resume` ? "Resuming..." : "Resume"}
          </button>
        )}

        {status !== "completed" && status !== "cancelled" && (
          <button
            className="complete"
            disabled={busyKey === `${id}:complete`}
            onClick={(event) => {
              event.stopPropagation();
              runJobAction(job, "complete");
            
          >
            {busyKey === `${id}:complete` ? "Completing..." : "Complete"}
          </button>
        )}
      </div>
    );
  }

  function JobCard({ job, featured = false }) {
    const status = statusOf(job);
    const address = addressOf(job);
    const phone = phoneOf(job);

    return (
      <article
        className={featured ? "workerJobCard featured" : "workerJobCard"}
        onClick={() => setSelectedJob(job)}
      >
        <div className="jobTopLine">
          <div>
            <p className="jobTime">{dateLabel(job)} · {timeLabel(job)}</p>
            <h3>{titleOf(job)}</h3>
            <p className="jobClient">{clientOf(job)}</p>
          </div>
          <span className={`workerStatus ${status}`}>{statusLabel(status)}</span>
        </div>

        <p className="jobAddress">{address || "No address saved"}</p>

        <div className="quickButtons">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openMaps(job);
            
            disabled={!address}
          >
            Navigate
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              callClient(job);
            
            disabled={!phone}
          >
            Call Client
          </button>
          <button type="button">Details</button>
        </div>

        {featured && <ActionButtons job={job} compact />}
      </article>
    );
  }

  const visibleJobs = grouped[activeTab] || [];

  return (
    <main className="workerApp">
      <section className="workerHero">
        <div>
          <p className="eyebrow">Worker App</p>
          <h1>Today’s Jobs</h1>
          <p>Start, navigate, add photos, leave notes, complete, then move on.</p>
        </div>

        <div className="workerStats">
          <div>
            <span>{hours.today}</span>
            <small>Today</small>
          </div>
          <div>
            <span>{hours.week}</span>
            <small>This week</small>
          </div>
          <div>
            <span>{hours.completed}</span>
            <small>Completed</small>
          </div>
        </div>
      </section>

      {success && <div className="workerSuccess">{success}</div>}
      {error && <div className="workerError">{error}</div>}

      {loading ? (
        <section className="workerLoading">
          <div className="pulseCard" />
          <div className="pulseCard small" />
          <div className="pulseCard small" />
        </section>
      ) : (
        <>
          <section className="nextJobPanel">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Next up</p>
                <h2>Your next job</h2>
              </div>
            </div>

            {nextJob ? (
              <JobCard job={nextJob} featured />
            ) : (
              <div className="emptyWorkerState">
                <h3>No active jobs right now</h3>
                <p>New assigned jobs will appear here automatically.</p>
              </div>
            )}
          </section>

          <section className="workerTabs">
            <button className={activeTab === "today" ? "active" : ""} onClick={() => setActiveTab("today")}>
              Today <span>{grouped.today.length}</span>
            </button>
            <button className={activeTab === "tomorrow" ? "active" : ""} onClick={() => setActiveTab("tomorrow")}>
              Tomorrow <span>{grouped.tomorrow.length}</span>
            </button>
            <button className={activeTab === "week" ? "active" : ""} onClick={() => setActiveTab("week")}>
              This Week <span>{grouped.week.length}</span>
            </button>
          </section>

          <section className="workerList">
            {visibleJobs.length ? (
              visibleJobs.map((job) => <JobCard key={idOf(job)} job={job} />)
            ) : (
              <div className="emptyWorkerState">
                <h3>Nothing booked here</h3>
                <p>Check another tab or wait for the office to assign work.</p>
              </div>
            )}
          </section>
        </>
      )}

      {selectedJob && (
        <div className="workerSheetBackdrop" onClick={() => setSelectedJob(null)}>
          <section className="workerSheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheetHandle" />

            <div className="sheetHeader">
              <div>
                <p className="jobTime">{dateLabel(selectedJob)} · {timeLabel(selectedJob)}</p>
                <h2>{titleOf(selectedJob)}</h2>
                <p>{clientOf(selectedJob)}</p>
              </div>
              <button className="closeSheet" onClick={() => setSelectedJob(null)}>Close</button>
            </div>

            <div className="sheetBlock">
              <span>Address</span>
              <p>{addressOf(selectedJob) || "No address saved"}</p>
              <div className="quickButtons wide">
                <button onClick={() => openMaps(selectedJob)} disabled={!addressOf(selectedJob)}>Navigate</button>
                <button onClick={() => callClient(selectedJob)} disabled={!phoneOf(selectedJob)}>Call Client</button>
              </div>
            </div>

            <div className="sheetBlock">
              <span>Instructions</span>
              <p>
                {selectedJob.instructions ||
                  selectedJob.notes ||
                  selectedJob.description ||
                  selectedJob.job_notes ||
                  "No instructions added yet."}
              </p>
            </div>

            <div className="sheetBlock">
              <span>Access / Safety Notes</span>
              <p>
                {selectedJob.access_notes ||
                  selectedJob.safety_notes ||
                  selectedJob.site_notes ||
                  "No access or safety notes added."}
              </p>
            </div>

            <ActionButtons job={selectedJob} />

            <div className="sheetBlock">
              <span>Worker Note</span>
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Example: Gate locked, extra green waste removed, customer asked for quote..."
              />
              <button
                className="primary full"
                disabled={!noteText.trim() || busyKey === `${idOf(selectedJob)}:note`}
                onClick={() => saveNote(selectedJob)}
              >
                {busyKey === `${idOf(selectedJob)}:note` ? "Saving..." : "Save Note"}
              </button>
            </div>

            <div className="sheetBlock">
              <span>Job Photos</span>
              <label className="photoUpload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => uploadPhotos(selectedJob, event)}
                />
                {busyKey === `${idOf(selectedJob)}:photos` ? "Uploading..." : "Upload Photos"}
              </label>
              <p className="hint">Use this for before, progress, after, damage, and issue photos.</p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
