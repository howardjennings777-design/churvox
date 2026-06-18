import React from "react";
import { useApi } from "../hooks/useApi";

const TIME_MANUAL_KEY = "churvox:fresh-time-manual:v2";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

function unwrap(payload) {
  return payload?.data ?? payload;
}

function asArray(payload, key) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.workers)) return data.workers;
  return [];
}

function idText(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idText(value.$oid || value.oid || value.id || value._id || value.worker_id || value.job_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function numberFrom(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function hoursFromSeconds(...values) {
  const seconds = numberFrom(...values);
  return seconds > 0 ? Number((seconds / 3600).toFixed(2)) : 0;
}

function hoursFromMinutes(...values) {
  const minutes = numberFrom(...values);
  return minutes > 0 ? Number((minutes / 60).toFixed(2)) : 0;
}

function dateText(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

function timeText(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
}

function workerName(worker) {
  return pick(worker, "name", "full_name", "display_name", "worker_name", "email") || "Worker";
}

function jobTitle(job) {
  return pick(job, "title", "job_name", "job_title", "service_type", "job_type", "description") || "Untitled job";
}

function clientName(job) {
  return pick(job, "client_name", "customer_name", "client", "customer", "name", "business_name") || "No client";
}

function statusFor(job, hours) {
  const status = lower(job?.status || job?.job_status);
  if (status.includes("complete") || status.includes("done") || status.includes("finish")) return hours > 0 ? "Approved" : "Needs review";
  if (status.includes("progress")) return "Needs review";
  return hours > 0 ? "Needs review" : "Blocked";
}

function readManualRows() {
  try {
    const saved = window.localStorage.getItem(TIME_MANUAL_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveManualRows(rows) {
  try {
    window.localStorage.setItem(TIME_MANUAL_KEY, JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "time-sheets" } }));
  } catch {
    // Keep page usable if local storage is blocked.
  }
}

function buildWorkerMap(workers) {
  const map = new Map();
  workers.forEach((worker, index) => {
    const ids = [worker?.id, worker?._id, worker?.worker_id, worker?.user_id, worker?.email, `worker-${index}`].map(idText).filter(Boolean);
    ids.forEach((id) => map.set(id, workerName(worker)));
  });
  return map;
}

function extractJobLogs(job) {
  const arrays = [job?.time_logs, job?.timeLogs, job?.timer_logs, job?.timerLogs, job?.timers, job?.sessions, job?.work_sessions].filter(Array.isArray);
  return arrays.flat();
}

function rowFromJobLog(job, log, index, workerMap) {
  const workerId = idText(log?.worker_id || log?.workerId || log?.user_id || job?.worker_id || job?.assigned_worker_id || job?.assigned_to);
  const hours = numberFrom(log?.hours, log?.duration_hours, log?.total_hours) || hoursFromMinutes(log?.minutes, log?.duration_minutes) || hoursFromSeconds(log?.seconds, log?.duration_seconds, log?.total_seconds);
  if (!hours && !log?.start && !log?.start_time && !log?.clock_in) return null;

  return {
    id: `job-${idText(job?.id || job?._id || job?.job_id)}-log-${index}`,
    worker: pick(log, "worker_name", "worker", "name") || workerMap.get(workerId) || pick(job, "worker_name", "assigned_worker_name", "assigned_worker") || "Worker",
    job: jobTitle(job),
    client: clientName(job),
    date: dateText(log?.date || log?.start || log?.start_time || job?.scheduled_date || job?.date || job?.updated_at || job?.created_at),
    start: timeText(log?.start || log?.start_time || log?.clock_in),
    finish: timeText(log?.finish || log?.end || log?.end_time || log?.clock_out),
    breakMins: numberFrom(log?.break_minutes, log?.breakMins, log?.breaks) || 0,
    hours: Number(hours || 0),
    status: lower(log?.status).includes("approve") ? "Approved" : statusFor(job, hours),
    note: pick(log, "note", "notes", "reason") || "Captured from job time data. Review before payroll.",
    source: "Live job time",
  };
}

function rowFromJobSummary(job, workerMap) {
  const hours = numberFrom(job?.hours_worked, job?.hoursWorked, job?.total_hours, job?.duration_hours, job?.payroll_hours, job?.payrollHours) || hoursFromMinutes(job?.minutes_worked, job?.duration_minutes, job?.total_minutes) || hoursFromSeconds(job?.timer_total_seconds, job?.total_seconds, job?.duration_seconds, job?.elapsed_seconds);
  if (!hours) return null;

  const workerId = idText(job?.worker_id || job?.assigned_worker_id || job?.assigned_to || job?.worker);
  return {
    id: `job-${idText(job?.id || job?._id || job?.job_id)}-summary`,
    worker: pick(job, "worker_name", "assigned_worker_name", "assigned_worker", "worker") || workerMap.get(workerId) || "Worker",
    job: jobTitle(job),
    client: clientName(job),
    date: dateText(job?.scheduled_date || job?.date || job?.completed_at || job?.updated_at || job?.created_at),
    start: timeText(job?.start_time || job?.started_at || job?.clock_in),
    finish: timeText(job?.finish_time || job?.completed_at || job?.ended_at || job?.clock_out),
    breakMins: numberFrom(job?.break_minutes, job?.breakMins) || 0,
    hours: Number(hours || 0),
    status: statusFor(job, hours),
    note: "Captured from job summary time. Review before payroll.",
    source: "Live job summary",
  };
}

function buildRows(jobs, workers) {
  const workerMap = buildWorkerMap(workers);
  const rows = [];

  jobs.forEach((job) => {
    extractJobLogs(job).forEach((log, index) => {
      const row = rowFromJobLog(job, log, index, workerMap);
      if (row) rows.push(row);
    });

    if (!extractJobLogs(job).length) {
      const row = rowFromJobSummary(job, workerMap);
      if (row) rows.push(row);
    }
  });

  return rows;
}

function sendTimeToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `time-${item.id}-${Date.now()}`,
      group: "Time sheets",
      title: "Time entry needs owner review",
      info: `${item.worker} · ${item.job} · ${item.hours} hrs`,
      urgency: item.status === "Needs review" ? "Payroll review" : item.status,
      found: `${item.worker} logged ${item.hours} hours on ${item.job}.`,
      prepared: "Churvox prepared a time review slip before payroll/export.",
      why: item.note,
      owner: "Approve time, adjust hours, mark blocked, or open Payroll.",
      area: "Time sheets",
      page: "time",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "time-command" } }));
  } catch {
    // Keep page usable without local storage.
  }
}

export default function FreshTimeLogs({ onNavigate }) {
  const { get } = useApi();
  const [items, setItems] = React.useState([]);
  const [manualRows, setManualRows] = React.useState(readManualRows);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const allItems = React.useMemo(() => [...items, ...manualRows], [items, manualRows]);
  const selected = allItems.find((item) => item.id === selectedId) || allItems[0];
  const totalHours = allItems.reduce((sum, item) => sum + Number(item.hours || 0), 0).toFixed(2);
  const needsReview = allItems.filter((item) => item.status === "Needs review").length;
  const approved = allItems.filter((item) => item.status === "Approved").length;
  const blocked = allItems.filter((item) => item.status === "Blocked").length;

  const loadTimeSheets = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [jobsPayload, workersPayload] = await Promise.all([
        get("/jobs", { timeout: 25000 }),
        get("/team/workers", { timeout: 25000 }).catch(() => []),
      ]);
      const jobs = asArray(jobsPayload, "jobs");
      const workers = asArray(workersPayload, "workers");
      const liveRows = buildRows(jobs, workers).sort((a, b) => a.worker.localeCompare(b.worker));
      setItems(liveRows);
      setSelectedId((current) => current || liveRows[0]?.id || manualRows[0]?.id || "");
    } catch (err) {
      setError(err?.message || "Could not load live job time data.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [get, manualRows]);

  React.useEffect(() => {
    loadTimeSheets();
  }, [loadTimeSheets]);

  function updateManualItem(id, patch) {
    setManualRows((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, ...patch, source: "Manual owner entry" } : item));
      saveManualRows(next);
      return next;
    });
  }

  function updateItem(id, patch) {
    if (manualRows.some((item) => item.id === id)) return updateManualItem(id, patch);
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addLog() {
    const next = {
      id: `manual-time-${Date.now()}`,
      worker: "Worker name",
      job: "Job name",
      client: "Client name",
      date: "Today",
      start: "Not set",
      finish: "Not set",
      breakMins: 0,
      hours: 0,
      status: "Needs review",
      note: "Manual owner entry. Confirm before payroll.",
      source: "Manual owner entry",
    };

    const updated = [next, ...manualRows];
    setManualRows(updated);
    setSelectedId(next.id);
    saveManualRows(updated);
  }

  function resetManualLogs() {
    setManualRows([]);
    saveManualRows([]);
    setSelectedId(items[0]?.id || "");
  }

  function sendToCommand() {
    if (!selected) return;
    sendTimeToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshTimePage">
      <div className="freshTimeHero">
        <div>
          <span>Time sheets</span>
          <h1>Approve worker time before payroll</h1>
          <p>Live job time appears here for owner review. Approved time feeds the payroll review workspace; Churvox does not submit tax or bank files.</p>
        </div>

        <div className="freshTimeStats">
          <div><b>{loading ? "..." : totalHours}</b><small>hours</small></div>
          <div><b>{approved}</b><small>approved</small></div>
          <div><b>{needsReview}</b><small>review</small></div>
          <div><b>{blocked}</b><small>blocked</small></div>
        </div>
      </div>

      {error && <div className="freshXeroNotice need"><b>Time sheets need attention</b><span>{error}</span></div>}

      <div className="freshTimeLayout">
        <aside className="freshTimeList">
          <header>
            <div>
              <b>Time queue</b>
              <span>Live job time + owner review</span>
            </div>
            <button type="button" onClick={addLog}>Add</button>
          </header>

          {loading && <div className="freshTimeEmpty">Checking live job time...</div>}

          {!loading && allItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.worker}</b>
              <span>{item.job}</span>
              <small>{item.hours} hrs · {item.status}</small>
            </button>
          ))}

          {!loading && !allItems.length && (
            <div className="freshTimeEmpty">
              <b>No captured time yet</b>
              <span>Worker timers or approved job hours will show here. You can add a manual review row if needed.</span>
            </div>
          )}

          <button type="button" className="freshTimeReset" onClick={loadTimeSheets}>Reload live time</button>
          <button type="button" className="freshTimeReset" onClick={resetManualLogs}>Clear manual rows</button>
        </aside>

        {selected && (
          <article className="freshTimeDetail">
            <div className="freshTimeHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.worker}</h2>
                <p>{selected.client} · {selected.job}</p>
              </div>

              <div className="freshTimeHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("payroll")}>Open Payroll</button>
                <button type="button" onClick={() => onNavigate?.("workercommand")}>Open Worker View</button>
              </div>
            </div>

            <div className="freshTimeCards">
              <section>
                <span>Clock</span>
                <b>{selected.start} → {selected.finish}</b>
                <p>Break: {selected.breakMins} minutes</p>
              </section>

              <section>
                <span>Hours</span>
                <b>{selected.hours}</b>
                <p>Owner approved time is used for payroll review.</p>
              </section>

              <section>
                <span>{selected.source || "Source"}</span>
                <b>{selected.status}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshTimeForm">
              <label>
                <span>Worker</span>
                <input value={selected.worker} onChange={(event) => updateItem(selected.id, { worker: event.target.value })} />
              </label>

              <label>
                <span>Client</span>
                <input value={selected.client} onChange={(event) => updateItem(selected.id, { client: event.target.value })} />
              </label>

              <label>
                <span>Job</span>
                <input value={selected.job} onChange={(event) => updateItem(selected.id, { job: event.target.value })} />
              </label>

              <label>
                <span>Date</span>
                <input value={selected.date} onChange={(event) => updateItem(selected.id, { date: event.target.value })} />
              </label>

              <label>
                <span>Start</span>
                <input value={selected.start} onChange={(event) => updateItem(selected.id, { start: event.target.value })} />
              </label>

              <label>
                <span>Finish</span>
                <input value={selected.finish} onChange={(event) => updateItem(selected.id, { finish: event.target.value })} />
              </label>

              <label>
                <span>Break mins</span>
                <input type="number" value={selected.breakMins} onChange={(event) => updateItem(selected.id, { breakMins: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Hours</span>
                <input type="number" step="0.01" value={selected.hours} onChange={(event) => updateItem(selected.id, { hours: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Approved</option>
                  <option>Needs review</option>
                  <option>Blocked</option>
                  <option>Edited</option>
                  <option>Payroll ready</option>
                </select>
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshTimeActions">
              <button type="button" onClick={() => updateItem(selected.id, { status: "Approved" })}>Approve</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Needs review" })}>Review</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Blocked" })}>Block</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Payroll ready" })}>Payroll ready</button>
              <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
