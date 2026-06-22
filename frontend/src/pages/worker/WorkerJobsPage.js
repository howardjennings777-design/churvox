import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Briefcase, CheckCircle2, LogOut, MapPin, MessageCircle, Navigation, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import "./WorkerJobsMobile.css";
import "./WorkerCleanApp.css";

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function oid(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return oid(value.$oid || value.oid || value.id || value._id || value.job_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function idOf(value) {
  return oid(value?.id || value?._id || value?.uuid || value?.job_id);
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function userKeys(user) {
  return [
    user?.id,
    user?._id,
    user?.uuid,
    user?.worker_id,
    user?.team_member_id,
    user?.email,
    user?.name,
    user?.full_name,
    user?.display_name,
  ].map((v) => lower(oid(v))).filter(Boolean);
}

function assignmentKeys(job) {
  return [
    job?.assigned_worker_id,
    job?.worker_id,
    job?.assigned_to,
    job?.assignedWorkerId,
    job?.worker?.id,
    job?.worker?._id,
    job?.assigned_worker?.id,
    job?.assigned_worker?._id,
    job?.assigned_worker_email,
    job?.worker_email,
    job?.assigned_to_email,
    job?.assigned_worker_name,
    job?.worker_name,
    job?.assigned_to_name,
  ].map((v) => lower(oid(v))).filter(Boolean);
}

function hasAssignment(job) {
  return assignmentKeys(job).length > 0;
}

function assignedToMe(job, user) {
  const mine = userKeys(user);
  const assigned = assignmentKeys(job);
  return Boolean(mine.length && assigned.length && assigned.some((key) => mine.includes(key)));
}

function scopeJobsForWorker(rawJobs, user) {
  const list = arr(rawJobs);
  const scoped = list.filter((job) => assignedToMe(job, user));
  const hasAssignedRecords = list.some(hasAssignment);
  if (scoped.length) return scoped;
  if (hasAssignedRecords) return [];
  return list;
}

function statusOf(job) {
  return String(job?.status || "assigned").toLowerCase().replaceAll(" ", "_");
}

function isComplete(job) {
  return ["completed", "complete", "done", "finished"].includes(statusOf(job));
}

function isActive(job) {
  return ["in_progress", "paused", "started"].includes(statusOf(job));
}

function isSentBack(job) {
  const review = String(job?.work_review_status || job?.review_status || job?.owner_review_status || "").toLowerCase();
  return review === "sent_back" || job?.worker_action_required === true;
}

function jobTitle(job) {
  return job?.title || job?.job_name || job?.job_type || job?.service_type || "Untitled job";
}

function clientName(job) {
  return job?.client_name || job?.customer_name || job?.client || job?.customer || "No customer";
}

function addressOf(job) {
  return job?.address || job?.site_address || job?.service_address || job?.job_address || "";
}

function instructionsOf(job) {
  return job?.worker_instructions || job?.instructions || job?.notes || job?.job_notes || job?.description || "";
}

function dateOf(job) {
  return String(job?.scheduled_date || job?.date || job?.start || job?.due_date || "").slice(0, 10);
}

function timeOf(job) {
  return job?.scheduled_time || job?.time || "";
}

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function firstName(user) {
  const raw = user?.name || user?.full_name || user?.display_name || user?.email || "there";
  return String(raw).split(" ")[0].split("@")[0];
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function hoursText(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds || 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (!h && !m) return "0m";
  if (!h) return `${m}m`;
  return `${h}h ${m}m`;
}

function jobSortValue(job) {
  const date = dateOf(job) || "9999-12-31";
  const time = timeOf(job) || "99:99";
  return `${date} ${time}`;
}

function nextJobLabel(job) {
  if (!job) return "No job ready";
  if (isSentBack(job)) return "Fix needed";
  if (isActive(job)) return "Active now";
  if (dateOf(job) === localDateKey()) return timeOf(job) || "Today";
  return dateOf(job) || "Open job";
}

async function reverseGeocodeLocation(location) {
  const lat = location?.lat ?? location?.latitude;
  const lng = location?.lng ?? location?.longitude;
  if (!lat || !lng) return "";
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18`, {
      signal: controller.signal,
      headers: { Accept: "application/json", "Accept-Language": "en-NZ,en;q=0.9" },
    });
    window.clearTimeout(timer);
    if (!res.ok) return "";
    const data = await res.json();
    const address = data?.address || {};
    const street = [address.house_number, address.road].filter(Boolean).join(" ");
    const suburb = address.suburb || address.neighbourhood || address.city_district || address.locality || "";
    const city = address.city || address.town || address.village || address.state_district || "";
    const parts = [street, suburb, city].filter(Boolean);
    return [...new Set(parts)].join(", ") || data?.display_name || "";
  } catch {
    return "";
  }
}

function getGpsPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not available on this device"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        const addressLabel = await reverseGeocodeLocation(location);
        resolve({ ...location, address_label: addressLabel, display_name: addressLabel });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function registerWorkerPushSubscription({ get, post }) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    await post("/worker/notification-opt-in", {
      enabled: true,
      permission: "granted",
      push_supported: false,
      reason: "Service worker or PushManager not supported",
      device: navigator.userAgent,
    });
    return { success: true, stored: false, fallback: true };
  }

  const config = await get("/worker/push-config");
  const publicKey =
    config?.data?.vapid_public_key ||
    config?.data?.data?.vapid_public_key ||
    process.env.REACT_APP_VAPID_PUBLIC_KEY ||
    "";

  if (!publicKey) {
    await post("/worker/notification-opt-in", {
      enabled: true,
      permission: "granted",
      push_supported: true,
      push_subscription_waiting_for_vapid: true,
      device: navigator.userAgent,
    });
    return { success: true, stored: false, waitingForVapid: true };
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.register("/service-worker.js");
  await navigator.serviceWorker.ready;

  let subscription = await serviceWorkerRegistration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const pushSubscription = subscription.toJSON();

  await post("/worker/push-subscription", {
    subscription: pushSubscription,
    endpoint: subscription.endpoint,
    permission: "granted",
    device: navigator.userAgent,
    created_at: new Date().toISOString(),
  });

  return { success: true, stored: true };
}

function WorkerJobCard({ job }) {
  const id = idOf(job);
  const address = addressOf(job);
  const status = statusOf(job);
  const instructions = instructionsOf(job);
  const sentBack = isSentBack(job);

  return (
    <article className={`wc-job-card ${isComplete(job) ? "done" : ""} ${isActive(job) ? "active" : ""} ${sentBack ? "need" : ""}`}>
      <Link to={`/worker/jobs/${id}`} className="wc-job-main">
        <div className="wc-job-top">
          <span>{sentBack ? "Owner needs fix" : isComplete(job) ? "Finished" : isActive(job) ? "Open job" : status.replaceAll("_", " ")}</span>
          <small>{timeOf(job) || "No time"}</small>
        </div>

        <h2>{jobTitle(job)}</h2>
        <p>{clientName(job)}</p>

        {address ? <small><MapPin size={14} /> {address}</small> : <small><MapPin size={14} /> No address added</small>}
        {instructions ? <em>{String(instructions).slice(0, 120)}</em> : <em>No special instructions added.</em>}
      </Link>

      <div className="wc-job-actions">
        <Link to={`/worker/jobs/${id}`} className="primary">Open job</Link>
        {address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><Navigation size={15} /> Directions</a> : null}
      </div>
    </article>
  );
}

export default function WorkerJobsPage() {
  const { user, logout } = useAuth();
  const { get, post } = useApi();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shiftStatus, setShiftStatus] = useState("clocked_out");
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [showContactOffice, setShowContactOffice] = useState(false);
  const [workerPushEnabled, setWorkerPushEnabled] = useState(() => {
    try { return window.localStorage.getItem("churvox-worker-notifications") === "on"; } catch { return false; }
  });

  async function sendLivePing(payload = {}) {
    try {
      await post("/worker/live-ping", payload);
    } catch {
      // Do not block worker app.
    }
  }

  async function fetchShiftStatus() {
    const res = await get("/worker/shift/status-v2");
    if (res?.success) {
      const data = res.data?.data || res.data || {};
      setShiftStatus(data.status || "clocked_out");
      setShiftSeconds(Number(data.shift_seconds || data.shift?.total_shift_seconds || 0));
      setGpsTracking(Boolean(data.gps_tracking_enabled));
    }
  }

  async function sendGpsPing(source = "manual") {
    try {
      const location = await getGpsPosition();
      const res = await post("/worker/gps-ping", { location, source });
      await sendLivePing({
        source,
        live_status: source === "manual" ? "GPS checked now" : "GPS checked",
        clock_status: shiftStatus || "clocked_in",
        location,
      });
      if (!res?.success) toast.error(res?.error || "GPS could not be recorded");
      else toast.success("GPS recorded");
    } catch (err) {
      toast.error(err?.message || "GPS permission is needed while clocked in");
    }
  }

  async function clockIn() {
    setShiftBusy(true);
    try {
      const location = await getGpsPosition();
      const res = await post("/worker/shift-clock-in", { location });
      if (res?.success) {
        setShiftStatus("clocked_in");
        setGpsTracking(true);
        await sendLivePing({
          source: "clock-in",
          live_status: "Clocked in",
          clock_status: "clocked_in",
          location,
        });
        toast.success("Clocked in. GPS is on.");
        await fetchShiftStatus();
      } else {
        toast.error(res?.error || "Could not clock in");
      }
    } catch (err) {
      toast.error(err?.message || "GPS permission is needed to clock in");
    } finally {
      setShiftBusy(false);
    }
  }

  async function enableWorkerNotifications() {
    if (!("Notification" in window)) {
      toast.error("This device does not support browser notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications were not turned on.");
        return;
      }

      const pushResult = await registerWorkerPushSubscription({ get, post });

      window.localStorage.setItem("churvox-worker-notifications", "on");
      setWorkerPushEnabled(true);

      new Notification("Churvox notifications on", {
        body: pushResult?.stored
          ? "You’ll get real job push alerts on this device."
          : "Notifications are allowed. Push delivery will activate when VAPID keys are set.",
      });

      toast.success(pushResult?.stored ? "Worker push notifications turned on" : "Notifications saved");
    } catch {
      toast.error("Could not turn notifications on.");
    }
  }

  async function clockOut() {
    setShiftBusy(true);
    try {
      let location = null;
      try { location = await getGpsPosition(); } catch { location = null; }
      const res = await post("/worker/shift-clock-out", { location });
      if (res?.success) {
        setShiftStatus("clocked_out");
        setGpsTracking(false);
        setShiftSeconds(0);
        await sendLivePing({
          source: "clock-out",
          live_status: "Clocked out",
          clock_status: "clocked_out",
          location,
        });
        toast.success("Clocked out. Time sheet sent for owner review.");
        await fetchShiftStatus();
      } else {
        toast.error(res?.error || "Could not clock out");
      }
    } finally {
      setShiftBusy(false);
    }
  }

  async function fetchJobs() {
    setLoading(true);
    setError("");

    const res = await get("/jobs");
    if (res?.success) {
      setJobs(scopeJobsForWorker(arr(res.data), user));
      setLastSynced(new Date());
    } else {
      setError("Could not load your jobs. Please refresh.");
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchJobs();
    fetchShiftStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (shiftStatus !== "clocked_in") return undefined;
    const tick = window.setInterval(() => setShiftSeconds((value) => Number(value || 0) + 60), 60000);
    return () => window.clearInterval(tick);
  }, [shiftStatus]);

  useEffect(() => {
    if (shiftStatus !== "clocked_in" || !gpsTracking) return undefined;
    const gpsTimer = window.setInterval(() => sendGpsPing("hourly"), 60 * 60 * 1000);
    return () => window.clearInterval(gpsTimer);
  }, [gpsTracking, shiftStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = localDateKey();
  const todayJobs = useMemo(() => jobs.filter((job) => dateOf(job) === today), [jobs, today]);
  const openJobs = jobs.filter((job) => !isComplete(job));
  const activeJobs = jobs.filter(isActive);
  const visibleJobs = useMemo(() => {
    const base = todayJobs.length ? todayJobs : openJobs;
    return [...base].sort((a, b) => {
      if (isSentBack(a) !== isSentBack(b)) return isSentBack(a) ? -1 : 1;
      if (isActive(a) !== isActive(b)) return isActive(a) ? -1 : 1;
      return jobSortValue(a).localeCompare(jobSortValue(b));
    });
  }, [todayJobs, openJobs]);
  const doneToday = jobs.filter((job) => isComplete(job) && dateOf(job) === today).length;
  const sentBackJobs = jobs.filter(isSentBack);
  const nextJob = sentBackJobs[0] || activeJobs[0] || visibleJobs.find((job) => !isComplete(job)) || null;
  const nextAddress = nextJob ? addressOf(nextJob) : "";
  const nextInstructions = nextJob ? instructionsOf(nextJob) : "";
  const clockedIn = shiftStatus === "clocked_in";
  const readySteps = [
    { label: "Clock", detail: clockedIn ? "Clocked in" : "Clock in first", done: clockedIn },
    { label: "GPS", detail: gpsTracking ? "GPS on" : "GPS starts with clock in", done: gpsTracking },
    { label: "Next job", detail: nextJob ? jobTitle(nextJob) : "No job ready", done: Boolean(nextJob) },
    { label: "Proof", detail: "Photo or message before finish", done: false },
  ];

  return (
    <div className="wc-screen">
      <header className="wc-topbar">
        <div>
          <b>{greeting()}, {firstName(user)}</b>
          <span>{shiftStatus === "clocked_in" ? "You are clocked in" : "Clock in when you start work"}</span>
        </div>
        <div>
          <button type="button" onClick={fetchJobs} disabled={loading} aria-label="Refresh"><RefreshCw className={loading ? "spin" : ""} /></button>
          <Link to="/worker/settings" aria-label="Settings"><Settings /></Link>
          <button type="button" onClick={logout} aria-label="Log out"><LogOut /></button>
        </div>
      </header>

      <main className="wc-main">
        <section className="wc-welcome wc-welcome-compact">
          <span>Worker app</span>
          <h1>Today</h1>
          <p>Clock in, open the next job, follow instructions, add proof, then send it to the boss.</p>
        </section>

        <section className="wc-clock-card">
          <div>
            <span>Clock</span>
            <b>{shiftStatus === "clocked_in" ? hoursText(shiftSeconds) : "Off"}</b>
            <small>{gpsTracking ? "GPS is on while clocked in" : "Clock in to start paid time"}</small>
          </div>

          {shiftStatus !== "clocked_in" ? (
            <button type="button" disabled={shiftBusy} onClick={clockIn}>
              {shiftBusy ? "Clocking in…" : "Clock in"}
            </button>
          ) : (
            <button type="button" disabled={shiftBusy} onClick={clockOut}>
              {shiftBusy ? "Clocking out…" : "Clock out"}
            </button>
          )}
        </section>

        <section className={`wc-next-job ${nextJob ? "ready" : "empty"}`} id="today">
          <div className="wc-next-job-copy">
            <span>{nextJobLabel(nextJob)}</span>
            <h2>{nextJob ? jobTitle(nextJob) : "No job assigned yet"}</h2>
            <p>{nextJob ? clientName(nextJob) : "Refresh or message the boss if you are expecting work."}</p>
            {nextAddress ? <small><MapPin size={15} /> {nextAddress}</small> : <small><MapPin size={15} /> No address added</small>}
            {nextInstructions ? <em>{String(nextInstructions).slice(0, 150)}</em> : null}
          </div>
          <div className="wc-next-job-actions">
            {nextJob ? <Link to={`/worker/jobs/${idOf(nextJob)}`}>Open next job</Link> : <button type="button" onClick={fetchJobs}>Refresh jobs</button>}
            {nextAddress ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextAddress)}`} target="_blank" rel="noreferrer"><Navigation size={16} /> Directions</a> : null}
            <button type="button" onClick={() => setShowContactOffice(true)}><MessageCircle size={16} /> Message boss</button>
          </div>
        </section>

        <section className="wc-ready-steps" aria-label="Worker readiness checklist">
          {readySteps.map((step) => (
            <article key={step.label} className={step.done ? "done" : ""}>
              <b>{step.done ? "✓" : "•"}</b>
              <span>{step.label}</span>
              <small>{step.detail}</small>
            </article>
          ))}
        </section>

        {!workerPushEnabled ? (
          <section className="wc-alert need">
            <AlertTriangle />
            <div>
              <b>Turn job notifications on</b>
              <span>So you see new jobs, boss messages and sent-back work straight away.</span>
              <button type="button" className="wc-mini-action" onClick={enableWorkerNotifications}>Turn notifications on</button>
            </div>
          </section>
        ) : (
          <section className="wc-alert">
            <CheckCircle2 />
            <div>
              <b>Notifications are on</b>
              <span>You’ll be alerted for new jobs, boss messages and job changes.</span>
            </div>
          </section>
        )}

        <section className="wc-quick-actions">
          <button type="button" onClick={() => sendGpsPing("manual")} disabled={shiftStatus !== "clocked_in"}>
            <MapPin size={18} />
            GPS check
          </button>
          <button type="button" onClick={() => setShowContactOffice(true)}>
            <MessageCircle size={18} />
            Message boss
          </button>
          <button type="button" onClick={fetchJobs}>
            <RefreshCw size={18} />
            Refresh jobs
          </button>
        </section>

        <section className="wc-stats">
          <article><span>Today</span><b>{todayJobs.length || visibleJobs.length}</b></article>
          <article><span>Open</span><b>{openJobs.length}</b></article>
          <article><span>Done</span><b>{doneToday}</b></article>
        </section>

        {sentBackJobs.length ? (
          <section className="wc-alert">
            <AlertTriangle />
            <div>
              <b>{sentBackJobs.length} job{sentBackJobs.length === 1 ? "" : "s"} need fixing</b>
              <span>Open the job, add what the owner asked for, then send it back.</span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="wc-alert danger">
            <AlertTriangle />
            <div><b>Could not load jobs</b><span>{error}</span></div>
          </section>
        ) : null}

        {loading ? (
          <section className="wc-empty">
            <RefreshCw className="spin" />
            <b>Loading your jobs…</b>
          </section>
        ) : null}

        {!loading && !error && !jobs.length ? (
          <section className="wc-empty">
            <Briefcase />
            <b>No jobs assigned yet</b>
            <span>Refresh or message the boss if you are expecting work.</span>
            <button type="button" onClick={fetchJobs}>Refresh jobs</button>
            <button type="button" onClick={() => setShowContactOffice(true)}>Message boss</button>
          </section>
        ) : null}

        <section className="wc-list" id="jobs">
          <div className="wc-section-head">
            <span>Job list</span>
            <h2>{todayJobs.length ? "Today’s jobs" : "Open jobs"}</h2>
          </div>

          {!loading && !error ? visibleJobs.map((job) => (
            <WorkerJobCard key={idOf(job)} job={job} />
          )) : null}
        </section>

        <div className="wc-sync">
          Last synced: {lastSynced ? lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
        </div>
      </main>

      <WorkerContactOfficePanel open={showContactOffice} onClose={() => setShowContactOffice(false)} />
      <WorkerBottomNav active="today" />
    </div>
  );
}
