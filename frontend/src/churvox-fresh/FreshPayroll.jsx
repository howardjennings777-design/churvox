import React from "react";
import { readFreshFocus } from "./freshFocus";
import { useApi } from "../hooks/useApi";
import "./freshPayroll.css";

const PAYROLL_PERIOD_KEY = "churvox:fresh-payroll-period:v1";
const PAYROLL_EDIT_KEY = "churvox:fresh-payroll-edits:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const filters = ["All", "Draft", "Needs review", "Ready", "Approved"];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function clean(value) {
  return String(value ?? "").trim();
}

function listFrom(payload, key) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function objectId(raw, fallback = "") {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw.$oid || raw.id || raw._id || fallback;
  return String(raw || fallback);
}

function idOf(worker, fallback) {
  return objectId(worker?.id || worker?._id || worker?.worker_id || worker?.user_id || worker?.email, fallback);
}

function workerName(worker) {
  return clean(worker?.name || worker?.full_name || worker?.display_name || worker?.worker_name || worker?.email || "Unnamed worker");
}

function roleOf(value) {
  const text = lower(value || "worker");
  if (text.includes("lead")) return "Lead worker";
  if (text.includes("sub")) return "Subcontractor";
  if (text.includes("payroll")) return "Payroll only";
  if (text.includes("manager")) return "Manager";
  return "Worker";
}

function defaultStatus(worker, hours = 0) {
  const status = lower(worker?.status || "");
  if (status.includes("active") && hours > 0) return "Ready";
  if (status.includes("invite")) return "Draft";
  return hours > 0 ? "Ready" : "Needs review";
}

function numberFrom(...values) {
  for (const value of values) {
    const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function hoursFromMinutes(...values) {
  const mins = numberFrom(...values);
  return mins ? Number((mins / 60).toFixed(2)) : 0;
}

function hoursFromSeconds(...values) {
  const sec = numberFrom(...values);
  return sec ? Number((sec / 3600).toFixed(2)) : 0;
}

function hoursBetween(start, end) {
  const a = start ? new Date(start) : null;
  const b = end ? new Date(end) : null;
  if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return 0;
  return Number(((b - a) / 3600000).toFixed(2));
}

function workerKey(value) {
  return lower(objectId(value));
}

function addKey(map, key, value) {
  if (key) map.set(workerKey(key), value);
}

function loadPeriod() {
  try {
    return typeof window === "undefined" ? "Weekly · Current period" : window.localStorage.getItem(PAYROLL_PERIOD_KEY) || "Weekly · Current period";
  } catch {
    return "Weekly · Current period";
  }
}

function loadEdits() {
  try {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(PAYROLL_EDIT_KEY) : "";
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveEdits(edits) {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(PAYROLL_EDIT_KEY, JSON.stringify(edits));
  } catch {}
}

function grossPay(person) {
  const hours = Number(person.ordinaryHours || 0) + Number(person.extraHours || 0);
  return hours * Number(person.hourlyRate || 0) + Number(person.adjustment || 0);
}

function buildWorkerLookup(workers) {
  const map = new Map();
  workers.forEach((worker, index) => {
    const id = idOf(worker, `worker-${index}`);
    const keys = [id, worker?.id, worker?._id, worker?.worker_id, worker?.user_id, worker?.email, workerName(worker)];
    keys.forEach((key) => addKey(map, key, id));
  });
  return map;
}

function jobLogs(job) {
  return [job?.time_logs, job?.timeLogs, job?.timer_logs, job?.timerLogs, job?.timers, job?.sessions, job?.work_sessions].filter(Array.isArray).flat();
}

function logHours(log) {
  return (
    numberFrom(log?.hours, log?.duration_hours, log?.total_hours) ||
    hoursFromMinutes(log?.minutes, log?.duration_minutes, log?.total_minutes) ||
    hoursFromSeconds(log?.seconds, log?.duration_seconds, log?.total_seconds) ||
    hoursBetween(log?.start || log?.start_time || log?.clock_in, log?.finish || log?.end || log?.end_time || log?.clock_out)
  );
}

function summaryHours(job) {
  return (
    numberFrom(job?.hours_worked, job?.hoursWorked, job?.total_hours, job?.duration_hours, job?.payroll_hours, job?.payrollHours) ||
    hoursFromMinutes(job?.minutes_worked, job?.duration_minutes, job?.total_minutes) ||
    hoursFromSeconds(job?.timer_total_seconds, job?.total_seconds, job?.duration_seconds, job?.elapsed_seconds) ||
    hoursBetween(job?.start_time || job?.started_at || job?.clock_in, job?.finish_time || job?.completed_at || job?.ended_at || job?.clock_out)
  );
}

function resolveWorkerId(rawKey, workerLookup) {
  const key = workerKey(rawKey);
  return workerLookup.get(key) || key;
}

function aggregateJobTime(jobs, workers) {
  const lookup = buildWorkerLookup(workers);
  const totals = {};

  function add(rawKey, hours, source) {
    if (!rawKey || !hours) return;
    const id = resolveWorkerId(rawKey, lookup);
    if (!id) return;
    if (!totals[id]) totals[id] = { hours: 0, jobs: 0, source: [] };
    totals[id].hours = Number((totals[id].hours + hours).toFixed(2));
    totals[id].jobs += 1;
    totals[id].source.push(source);
  }

  jobs.forEach((job) => {
    const logs = jobLogs(job);
    if (logs.length) {
      logs.forEach((log) => {
        const rawKey =
          log?.worker_id ||
          log?.workerId ||
          log?.user_id ||
          log?.worker_email ||
          log?.worker_name ||
          log?.worker ||
          job?.worker_id ||
          job?.assigned_worker_id ||
          job?.assigned_to ||
          job?.worker_name ||
          job?.assigned_worker_name;
        add(rawKey, logHours(log), job?.title || job?.job_name || "job time log");
      });
    } else {
      const rawKey =
        job?.worker_id ||
        job?.assigned_worker_id ||
        job?.assigned_to ||
        job?.worker_email ||
        job?.worker_name ||
        job?.assigned_worker_name ||
        job?.worker;
      add(rawKey, summaryHours(job), job?.title || job?.job_name || "job summary time");
    }
  });

  return totals;
}

function normalizePayroll(worker, index, edits = {}, timeByWorker = {}) {
  const id = idOf(worker, `worker-${index}`);
  const saved = edits[id] || {};
  const captured = timeByWorker[id] || timeByWorker[workerKey(worker?.email)] || timeByWorker[workerKey(workerName(worker))] || null;
  const capturedHours = Number(captured?.hours || 0);
  const ordinaryHours = numberFrom(saved.ordinaryHours, capturedHours, worker?.ordinary_hours, worker?.ordinaryHours, worker?.hours_worked, worker?.hoursWorked, worker?.payroll_hours, worker?.payrollHours);
  const extraHours = numberFrom(saved.extraHours, worker?.extra_hours, worker?.extraHours, worker?.overtime_hours, worker?.overtimeHours);
  const hourlyRate = numberFrom(saved.hourlyRate, worker?.pay_rate, worker?.payRate, worker?.hourly_rate, worker?.hourlyRate);
  const noteSource = capturedHours > 0
    ? `Live job time captured: ${capturedHours} hrs across ${captured.jobs} job entry${captured.jobs === 1 ? "" : "s"}.`
    : "No live job time captured yet. Add or approve time before payroll.";

  return {
    id,
    name: workerName(worker),
    email: worker?.email || "",
    phone: worker?.phone || worker?.mobile || "",
    role: roleOf(worker?.team_role || worker?.worker_role || worker?.role),
    status: saved.status || defaultStatus(worker, ordinaryHours + extraHours),
    ordinaryHours,
    extraHours,
    hourlyRate,
    adjustment: Number(saved.adjustment ?? worker?.adjustment ?? 0) || 0,
    notes: saved.notes || worker?.notes || noteSource,
    timeSource: capturedHours > 0 ? "Live job time" : "Worker/manual",
  };
}

function sendPayrollToCommand(person, period) {
  if (!person) return;

  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `payroll-${person.id}-${Date.now()}`,
      group: "Payroll",
      title: "Payroll review prepared",
      info: `${person.name} · ${period} · ${money(grossPay(person))}`,
      urgency: person.status,
      found: `${person.name} has ${(Number(person.ordinaryHours) + Number(person.extraHours)).toFixed(1)} hours for review.`,
      prepared: "Churvox prepared a payroll review slip from worker/time data. No tax, government or payment files are submitted.",
      why: person.notes,
      owner: "Approve pay, adjust hours, export CSV, or send back for review.",
      area: "Payroll",
      page: "payroll",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "payroll-command" } }));
  } catch {}
}

export default function FreshPayroll({ onNavigate }) {
  const { get } = useApi();
  const [people, setPeople] = React.useState([]);
  const [period, setPeriod] = React.useState(loadPeriod);
  const [selectedId, setSelectedId] = React.useState(() => readFreshFocus("payroll", ""));
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionMessage, setActionMessage] = React.useState("");

  const visiblePeople = filter === "All" ? people : people.filter((person) => person.status === filter);
  const selected = people.find((person) => person.id === selectedId) || visiblePeople[0] || people[0];
  const totalGross = people.reduce((sum, person) => sum + grossPay(person), 0);
  const totalHours = people.reduce((sum, person) => sum + Number(person.ordinaryHours || 0) + Number(person.extraHours || 0), 0);
  const liveTimeCount = people.filter((person) => person.timeSource === "Live job time").length;
  const needsReviewCount = people.filter((person) => person.status === "Needs review").length;

  const loadPayroll = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [workerPayload, jobPayload] = await Promise.all([
        get("/team/workers", { timeout: 25000 }),
        get("/jobs", { timeout: 25000 }).catch(() => ({ data: [] })),
      ]);

      const workers = listFrom(workerPayload, "workers");
      const jobs = listFrom(jobPayload, "jobs");
      const edits = loadEdits();
      const timeByWorker = aggregateJobTime(jobs, workers);
      const rows = workers.map((worker, index) => normalizePayroll(worker, index, edits, timeByWorker)).sort((a, b) => a.name.localeCompare(b.name));

      setPeople(rows);
      setSelectedId((current) => (rows.some((person) => person.id === current) ? current : rows[0]?.id || ""));

      if (!rows.length) setActionMessage("No workers yet. Add workers before running payroll review.");
    } catch (err) {
      setError(err?.message || "Payroll could not load workers or job time.");
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(PAYROLL_PERIOD_KEY, period);
    } catch {}
  }, [period]);

  function updateSelectedPerson(patch) {
    if (!selected) return;

    setPeople((current) => {
      const next = current.map((person) => (person.id === selected.id ? { ...person, ...patch } : person));
      const updated = next.find((person) => person.id === selected.id);
      const edits = loadEdits();

      edits[selected.id] = {
        ordinaryHours: updated.ordinaryHours,
        extraHours: updated.extraHours,
        hourlyRate: updated.hourlyRate,
        adjustment: updated.adjustment,
        status: updated.status,
        notes: updated.notes,
      };

      saveEdits(edits);
      return next;
    });
  }

  function resetPayroll() {
    try {
      window.localStorage.removeItem(PAYROLL_EDIT_KEY);
      window.localStorage.removeItem(PAYROLL_PERIOD_KEY);
    } catch {}

    setPeriod("Weekly · Current period");
    setFilter("All");
    setActionMessage("Payroll edits reset. Reloaded workers and live job time.");
    loadPayroll();
  }

  function exportCsv() {
    const rows = [
      ["Pay period", period],
      [],
      ["Name", "Email", "Role", "Status", "Ordinary hours", "Extra hours", "Hourly rate", "Adjustment", "Gross pay", "Time source", "Notes"],
      ...people.map((person) => [
        person.name,
        person.email,
        person.role,
        person.status,
        person.ordinaryHours,
        person.extraHours,
        person.hourlyRate,
        person.adjustment,
        grossPay(person).toFixed(2),
        person.timeSource,
        person.notes,
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = "churvox-payroll-review.csv";
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  function sendSelectedToCommand() {
    if (!selected) return;
    sendPayrollToCommand(selected, period);
    setActionMessage("Payroll review sent to Command.");
    onNavigate?.("command");
  }

  return (
    <section className="freshPayrollPage">
      <header className="freshPayrollHeader">
        <div>
          <span>Payroll review</span>
          <h1>Payroll</h1>
          <p>Review worker hours, adjustments and gross pay. Tax filing, government filing and payment files stay outside Churvox.</p>
        </div>
        <div className="freshPayrollHeaderActions">
          <button type="button" onClick={loadPayroll} disabled={loading}>{loading ? "Refreshing..." : "Refresh workers"}</button>
          <button type="button" onClick={() => onNavigate?.("time")}>Open Time Sheets</button>
        </div>
      </header>

      <section className="freshPayrollSafety">
        <b>Payroll safety rule</b>
        <span>No tax filing. No government filing. No bank/payment files. Export review CSV only.</span>
      </section>

      <section className="freshPayrollStats">
        <article><b>{money(totalGross)}</b><span>Gross pay preview</span></article>
        <article><b>{totalHours.toFixed(1)}</b><span>Total hours</span></article>
        <article><b>{needsReviewCount}</b><span>Need review</span></article>
        <article><b>{liveTimeCount}</b><span>With live time</span></article>
      </section>

      <section className="freshPayrollPeriod">
        <label>
          <span>Pay period</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option>Weekly · Current period</option>
            <option>Weekly · Next period</option>
            <option>Fortnightly · Current period</option>
            <option>Fortnightly · Next period</option>
            <option>Monthly · Current period</option>
          </select>
        </label>
        <button type="button" onClick={loadPayroll}>Refresh workers/time</button>
        <button type="button" onClick={() => onNavigate?.("time")}>Open Time Sheets</button>
      </section>

      {error ? (
        <section className="freshPayrollNotice need">
          <b>Payroll needs attention</b>
          <span>{error}</span>
        </section>
      ) : null}

      {actionMessage ? (
        <section className="freshPayrollNotice">
          <b>Payroll updated</b>
          <span>{actionMessage}</span>
        </section>
      ) : null}

      <section className="freshPayrollFilters">
        {filters.map((item) => (
          <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            <span>{item}</span>
            <b>{item === "All" ? people.length : people.filter((person) => person.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshPayrollGrid">
        <aside className="freshPayrollPanel">
          <h2>Pay list</h2>
          {loading ? (
            <div className="freshPayrollItem">
              <b>Loading payroll</b>
              <span>Checking real workers and job time.</span>
            </div>
          ) : null}

          {!loading && visiblePeople.map((person) => (
            <button
              type="button"
              className={`freshPayrollItem ${selected?.id === person.id ? "active" : ""} ${person.status === "Needs review" ? "need" : ""}`}
              key={person.id}
              onClick={() => setSelectedId(person.id)}
            >
              <b>{person.name}</b>
              <span>{person.status} · {(Number(person.ordinaryHours) + Number(person.extraHours)).toFixed(1)} hrs · {money(grossPay(person))}</span>
              <small>{person.timeSource}</small>
            </button>
          ))}

          {!loading && visiblePeople.length === 0 ? (
            <div className="freshPayrollItem">
              <b>No pay records</b>
              <span>{people.length ? "Change filter to see more workers." : "Add workers in Team before running payroll."}</span>
            </div>
          ) : null}
        </aside>

        <main className="freshPayrollPanel freshPayrollPerson">
          <h2>{selected?.name || "Select person"}</h2>

          {selected ? (
            <>
              <div className="freshPayrollMiniGrid">
                <section><span>Status</span><b>{selected.status}</b></section>
                <section><span>Role</span><b>{selected.role}</b></section>
                <section><span>Total hours</span><b>{(Number(selected.ordinaryHours) + Number(selected.extraHours)).toFixed(1)}</b></section>
                <section><span>Gross pay</span><b>{money(grossPay(selected))}</b></section>
              </div>

              <label className="freshPayrollField">
                <span>Ordinary hours</span>
                <input value={selected.ordinaryHours} inputMode="decimal" onChange={(event) => updateSelectedPerson({ ordinaryHours: Number(event.target.value) || 0 })} />
              </label>

              <label className="freshPayrollField">
                <span>Extra hours</span>
                <input value={selected.extraHours} inputMode="decimal" onChange={(event) => updateSelectedPerson({ extraHours: Number(event.target.value) || 0 })} />
              </label>

              <label className="freshPayrollField">
                <span>Hourly rate</span>
                <input value={selected.hourlyRate} inputMode="decimal" onChange={(event) => updateSelectedPerson({ hourlyRate: Number(event.target.value) || 0 })} />
              </label>

              <label className="freshPayrollField">
                <span>Manual adjustment</span>
                <input value={selected.adjustment} inputMode="decimal" onChange={(event) => updateSelectedPerson({ adjustment: Number(event.target.value) || 0 })} />
              </label>

              <label className="freshPayrollField">
                <span>Payroll notes</span>
                <textarea value={selected.notes} onChange={(event) => updateSelectedPerson({ notes: event.target.value })} />
              </label>
            </>
          ) : (
            <p>Select a worker to review payroll.</p>
          )}
        </main>

        <aside className="freshPayrollPanel">
          <h2>Owner actions</h2>
          <div className="freshPayrollActions">
            <button type="button" className="green" onClick={() => updateSelectedPerson({ status: "Ready" })}>Mark ready</button>
            <button type="button" className="dark" onClick={() => updateSelectedPerson({ status: "Approved" })}>Approve pay</button>
            <button type="button" className="orange" onClick={() => updateSelectedPerson({ status: "Needs review" })}>Needs review</button>
            <button type="button" onClick={exportCsv}>Export CSV</button>
            <button type="button" onClick={() => onNavigate?.("time")}>Open Time Sheets</button>
            <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
            <button type="button" onClick={sendSelectedToCommand}>Send to Command</button>
            <button type="button" onClick={resetPayroll}>Reset payroll edits</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
