import React from "react";
import { useApi } from "../hooks/useApi";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function statusOf(item) {
  return String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase();
}

function titleOf(item) {
  return first(item?.title, item?.job_title, item?.job_name, item?.service_type, item?.name, "Untitled job");
}

function workerOf(item) {
  return first(item?.assigned_worker_name, item?.worker_name, item?.worker?.name, item?.assignee_name, item?.assigned_to_name, item?.assigned_to, "Worker");
}

function jobTime(job) {
  const seconds = Number(first(job?.net_time_seconds, job?.worked_time_seconds, job?.total_worked_seconds, job?.total_time_seconds, 0)) || 0;
  if (seconds > 0) return `${(seconds / 3600).toFixed(1)}h`;
  return first(job?.reviewed_hours, job?.hours, job?.time_hours, "");
}

function isComplete(job) {
  const status = statusOf(job);
  return status.includes("complete") || status.includes("done") || status.includes("finished") || Boolean(job?.completed_at);
}

function photoCount(job) {
  const arr = [job?.photos, job?.job_photos, job?.uploaded_photos, job?.completion_photos, job?.photo_urls].find(Array.isArray);
  return arr ? arr.length : Number(first(job?.photo_count, 0)) || 0;
}

function dateText(value) {
  if (!value) return "No time saved";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function toneFor(type, detail = "") {
  const text = `${type} ${detail}`.toLowerCase();
  if (text.includes("gps") || text.includes("site")) return text.includes("away") ? "red" : "green";
  if (text.includes("complete") || text.includes("finished") || text.includes("payroll") || text.includes("approved")) return "green";
  if (text.includes("photo")) return "purple";
  if (text.includes("pause") || text.includes("hold") || text.includes("warning")) return "amber";
  if (text.includes("invoice") || text.includes("quote")) return "orange";
  if (text.includes("start") || text.includes("resume") || text.includes("assign")) return "blue";
  if (text.includes("failed") || text.includes("reject")) return "red";
  return "dark";
}

function buildFallbackActivity(records = []) {
  const events = [];
  records.forEach((job, index) => {
    const jobTitle = titleOf(job);
    const worker = workerOf(job);
    const base = { index, jobTitle, worker };
    const started = first(job?.started_at, job?.timer_started_at, job?.start_time, job?.actual_start_time);
    const paused = first(job?.paused_at, job?.last_paused_at, job?.pause_time);
    const resumed = first(job?.resumed_at, job?.last_resumed_at);
    const completed = first(job?.completed_at, job?.finished_at, job?.completion_time);
    const workerNote = first(job?.worker_note, job?.latest_worker_note, job?.completion_note, job?.field_note);
    const gps = first(job?.location_status, job?.gps_status, job?.site_check_status, job?.start_location_status);
    const photos = photoCount(job);

    if (started) events.push({ ...base, type: "Started work", time: started, detail: `${worker} started ${jobTitle}.` });
    if (paused) events.push({ ...base, type: "Paused", time: paused, detail: `${worker} paused ${jobTitle}.` });
    if (resumed) events.push({ ...base, type: "Resumed", time: resumed, detail: `${worker} resumed ${jobTitle}.` });
    if (completed || isComplete(job)) events.push({ ...base, type: "Finished job", time: completed || first(job?.updated_at, job?.created_at), detail: `${worker} finished ${jobTitle}.` });
    if (photos) events.push({ ...base, type: "Photos uploaded", time: first(job?.photos_updated_at, completed, job?.updated_at), detail: `${worker} uploaded ${photos} job photo${photos === 1 ? "" : "s"}.` });
    if (workerNote) events.push({ ...base, type: "Worker note", time: first(job?.note_created_at, job?.updated_at, completed), detail: workerNote });
    if (gps) events.push({ ...base, type: "Site check", time: first(job?.location_checked_at, started, job?.updated_at), detail: `GPS/site check: ${gps}` });
    if (isComplete(job)) events.push({ ...base, type: "Ready to invoice", time: completed || job?.updated_at, detail: `${jobTitle} is ready for invoice review.` });
    if (jobTime(job)) events.push({ ...base, type: "Ready for payroll", time: completed || job?.updated_at, detail: `${worker} has ${jobTime(job)} ready for time review.` });
    if (!started && !completed && !workerNote && !photos && !gps) events.push({ ...base, type: first(job?.status, "Assigned"), time: first(job?.scheduled_date, job?.created_at), detail: `${jobTitle} is ${first(job?.status, "waiting for field activity")}.` });
  });

  return events.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 14);
}

function normaliseBackendEvents(res) {
  const data = res?.data || res || {};
  const events = Array.isArray(data.events) ? data.events : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
  return events.map((event, index) => ({
    index,
    type: first(event.event_type, event.type, event.title, "Field activity"),
    detail: first(event.detail, event.message, event.title, "Activity recorded"),
    time: first(event.created_at, event.createdAt, event.updated_at, ""),
    worker: first(event.worker_name, event.worker, "Employer view"),
    tone: toneFor(first(event.event_type, event.type, event.title), first(event.detail, event.message))
  }));
}

export default function EmployerFieldActivityBoard({ fallbackRecords = [] }) {
  const api = useApi();
  const [events, setEvents] = React.useState([]);
  const [source, setSource] = React.useState("fallback");
  const [loading, setLoading] = React.useState(false);

  const fallback = React.useMemo(() => buildFallbackActivity(fallbackRecords), [fallbackRecords]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/field-activity");
      const backendEvents = res?.success === false ? [] : normaliseBackendEvents(res);
      if (backendEvents.length) {
        setEvents(backendEvents.slice(0, 14));
        setSource("backend");
      } else {
        setEvents(fallback);
        setSource("fallback");
      }
    } catch {
      setEvents(fallback);
      setSource("fallback");
    } finally {
      setLoading(false);
    }
  }, [api, fallback]);

  React.useEffect(() => { load(); }, [load]);

  const shown = events.length ? events : fallback;

  return (
    <section className="dwActivity">
      <div className="dwActivityHead">
        <div>
          <small>Employer field activity</small>
          <h2>What the crew has done</h2>
          <p>{source === "backend" ? "Showing backend activity events from approved actions and field updates." : ""}</p>
        </div>
        <button type="button" onClick={load}>{loading ? "Loading..." : "Refresh activity"}</button>
      </div>
      {shown.length ? (
        <div className="dwActivityRows">
          {shown.map((event, index) => <article key={`${event.type}-${event.index}-${index}`} className={`dwActivityItem ${event.tone || toneFor(event.type, event.detail)}`}><b>{event.type}</b><strong>{event.detail}</strong><span>{dateText(event.time)} · {event.worker}</span></article>)}
        </div>
      ) : (
        <div className="dwEmpty">No worker field activity yet. Worker starts, finishes, photos and notes will show here.</div>
      )}
    </section>
  );
}
