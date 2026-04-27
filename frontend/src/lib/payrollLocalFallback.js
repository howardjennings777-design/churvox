import API_BASE from "./apiBase";

const STORE_KEY = "churvox_payroll_local_v1";
const STATUS_KEY = "churvox_payroll_timesheet_status_v1";

function token() {
  try { return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || ""; } catch { return ""; }
}

function headers() {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function store() {
  const data = read(STORE_KEY, null);
  if (data) return data;
  const fresh = {
    periods: [],
    adjustments: [],
    settings: {
      payroll_method: "manual",
      rate_mode: "manual_rate",
      default_hourly_rate: 35,
      default_pay_frequency: "fortnightly",
      notes: "Churvox prepares payroll for review and handoff.",
    },
  };
  write(STORE_KEY, fresh);
  return fresh;
}

function saveStore(next) {
  write(STORE_KEY, next);
}

function statuses() {
  return read(STATUS_KEY, {});
}

function saveStatuses(next) {
  write(STATUS_KEY, next);
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function asDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inPeriod(job, period) {
  if (!period) return true;
  const raw = job.completed_at || job.started_at || job.scheduled_date || job.date || job.created_at;
  const d = asDate(raw);
  if (!d) return true;
  const start = asDate(period.start_date);
  const end = asDate(period.end_date);
  if (start && d < start) return false;
  if (end) {
    const endPlus = new Date(end);
    endPlus.setDate(endPlus.getDate() + 1);
    if (d >= endPlus) return false;
  }
  return true;
}

function jobId(job) {
  return String(job.id || job._id || job.job_id || "");
}

function workerId(job) {
  return String(job.assigned_worker_id || job.worker_id || job.assigned_to || job.worker?.id || "unassigned_worker");
}

function workerName(job, workers) {
  const wid = workerId(job);
  const match = workers.find((w) => String(w.id || w._id) === wid);
  return job.worker_name || job.assigned_worker_name || match?.name || (wid === "unassigned_worker" ? "Unassigned worker" : "Worker");
}

function netHours(job) {
  const seconds = Number(job.total_time_seconds || job.net_time_seconds || job.time_worked_seconds || 0);
  if (seconds > 0) return Math.round((seconds / 3600) * 100) / 100;
  const started = asDate(job.started_at || job.start_time);
  const ended = asDate(job.completed_at || job.ended_at || job.end_time);
  if (started && ended && ended > started) {
    const pausedMinutes = Number(job.paused_minutes || job.total_paused_minutes || 0);
    return Math.max(0, Math.round((((ended - started) / 3600000) - pausedMinutes / 60) * 100) / 100);
  }
  if (String(job.status || "").toLowerCase() === "completed") return 1;
  return 0;
}

async function fetchList(path) {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { credentials: "include", headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.workers)) return data.workers;
    if (Array.isArray(data?.jobs)) return data.jobs;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
}

async function getWorkers() {
  const data = store();
  const team = await fetchList("/team/workers");
  const alt = team.length ? team : await fetchList("/team");
  const workers = alt
    .map((w) => ({ id: String(w.id || w._id || w.worker_id || ""), name: w.name || w.email || "Worker", email: w.email || "", role: w.role || "worker" }))
    .filter((w) => w.id);
  if (workers.length) return workers;
  const cachedWorkerIds = new Set();
  (data.adjustments || []).forEach((a) => a.worker_id && cachedWorkerIds.add(String(a.worker_id)));
  return Array.from(cachedWorkerIds).map((wid) => ({ id: wid, name: "Worker", role: "worker" }));
}

async function getJobs() {
  const jobs = await fetchList("/jobs");
  return jobs.filter((job) => jobId(job));
}

async function getTimesheets(periodId) {
  const data = store();
  const period = data.periods.find((p) => String(p.id) === String(periodId)) || data.periods[0] || null;
  const workers = await getWorkers();
  const statusMap = statuses();
  const jobs = (await getJobs()).filter((job) => inPeriod(job, period));
  return jobs.map((job) => {
    const jid = jobId(job);
    const entry = `job_${jid}`;
    const st = statusMap[entry] || (String(job.status || "").toLowerCase() === "completed" ? "pending" : "pending");
    const rawDate = job.completed_at || job.started_at || job.scheduled_date || job.date || job.created_at || "";
    return {
      entry_id: entry,
      job_id: jid,
      job_title: job.title || job.job_title || "Job",
      worker_id: workerId(job),
      worker_name: workerName(job, workers),
      date: String(rawDate).slice(0, 10),
      started_at: job.started_at || job.start_time || "",
      ended_at: job.completed_at || job.ended_at || job.end_time || "",
      paused_minutes: Number(job.paused_minutes || job.total_paused_minutes || 0),
      net_hours: netHours(job),
      status: st,
      notes: job.notes || "",
    };
  });
}

function adjustmentsFor(periodId) {
  return (store().adjustments || []).filter((a) => String(a.period_id) === String(periodId));
}

async function buildSummary(periodId) {
  const data = store();
  const timesheets = await getTimesheets(periodId);
  const adjustments = adjustmentsFor(periodId);
  const workers = await getWorkers();
  const byWorker = new Map();
  for (const t of timesheets) {
    if (!byWorker.has(t.worker_id)) {
      const w = workers.find((x) => String(x.id) === String(t.worker_id));
      byWorker.set(t.worker_id, {
        worker_id: t.worker_id,
        worker_name: t.worker_name || w?.name || "Worker",
        name: t.worker_name || w?.name || "Worker",
        worker_email: w?.email || "",
        role: w?.role || "worker",
        approved_hours: 0,
        pending_hours: 0,
        jobs_worked: 0,
        adjustments_total: 0,
        gross_pay: 0,
        status: "ready",
      });
    }
    const item = byWorker.get(t.worker_id);
    item.jobs_worked += 1;
    if (t.status === "approved") item.approved_hours += Number(t.net_hours || 0);
    else if (t.status === "pending") item.pending_hours += Number(t.net_hours || 0);
  }
  for (const a of adjustments) {
    if (!byWorker.has(a.worker_id)) byWorker.set(a.worker_id, { worker_id: a.worker_id, worker_name: a.worker_name || "Worker", name: a.worker_name || "Worker", approved_hours: 0, pending_hours: 0, jobs_worked: 0, adjustments_total: 0, gross_pay: 0, status: "ready" });
    byWorker.get(a.worker_id).adjustments_total += Number(a.amount || 0);
  }
  const rate = Number(data.settings.default_hourly_rate || data.settings.default_rate || 35);
  const worker_summaries = Array.from(byWorker.values()).map((w) => ({ ...w, gross_pay: Math.round(((w.approved_hours * rate) + w.adjustments_total) * 100) / 100 }));
  return {
    approved_hours: Math.round(timesheets.filter((t) => t.status === "approved").reduce((s, t) => s + Number(t.net_hours || 0), 0) * 100) / 100,
    pending_review_count: timesheets.filter((t) => t.status === "pending").length,
    workers_included: worker_summaries.length,
    adjustments_total: adjustments.reduce((s, a) => s + Number(a.amount || 0), 0),
    worker_summaries,
  };
}

function csv(rows) {
  const lines = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","));
  return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
}

async function exportCsv(kind, periodId) {
  const data = store();
  const period = data.periods.find((p) => String(p.id) === String(periodId)) || {};
  const timesheets = await getTimesheets(periodId);
  const summary = await buildSummary(periodId);
  const adjustments = adjustmentsFor(periodId);
  if (kind === "timesheets") return csv([["Worker", "Job", "Date", "Net hours", "Status"], ...timesheets.map((t) => [t.worker_name, t.job_title, t.date, t.net_hours, t.status])]);
  if (kind === "worker-pay") return csv([["Worker", "Approved hours", "Pending hours", "Jobs", "Adjustments", "Gross pay"], ...summary.worker_summaries.map((w) => [w.name, w.approved_hours, w.pending_hours, w.jobs_worked, w.adjustments_total, w.gross_pay])]);
  if (kind === "adjustments") return csv([["Worker", "Type", "Label", "Amount", "Taxable", "Notes"], ...adjustments.map((a) => [a.worker_name || a.worker_id, a.type, a.label, a.amount, a.taxable ? "yes" : "no", a.notes || ""])]);
  if (kind === "payslip-draft") return csv([["Pay run", "Worker", "Gross pay", "Notes"], ...summary.worker_summaries.map((w) => [period.name || periodId, w.name, w.gross_pay, "Draft only"])]);
  return csv([["Pay run", "Approved hours", "Pending review", "Workers", "Adjustments"], [period.name || periodId, summary.approved_hours, summary.pending_review_count, summary.workers_included, summary.adjustments_total]]);
}

export async function handlePayrollLocalFallback(method, endpoint, data = null, options = {}) {
  if (!String(endpoint || "").startsWith("/payroll")) return null;
  const clean = String(endpoint);
  const verb = String(method || "GET").toUpperCase();
  const dataStore = store();

  if (verb === "GET" && clean === "/payroll/periods") return { success: true, data: { pay_periods: dataStore.periods } };
  if (verb === "GET" && clean === "/payroll/workers") return { success: true, data: { workers: await getWorkers() } };
  if (verb === "GET" && clean === "/payroll/settings") return { success: true, data: dataStore.settings };

  const periodMatch = clean.match(/period_id=([^&]+)/);
  const periodId = periodMatch ? decodeURIComponent(periodMatch[1]) : "";
  if (verb === "GET" && clean.startsWith("/payroll/summary")) return { success: true, data: await buildSummary(periodId) };
  if (verb === "GET" && clean.startsWith("/payroll/timesheets")) return { success: true, data: { timesheets: await getTimesheets(periodId) } };
  if (verb === "GET" && clean.startsWith("/payroll/adjustments")) return { success: true, data: { adjustments: adjustmentsFor(periodId) } };

  const workerDetail = clean.match(/^\/payroll\/workers\/([^?]+)/);
  if (verb === "GET" && workerDetail) {
    const wid = decodeURIComponent(workerDetail[1]);
    const ts = (await getTimesheets(periodId)).filter((t) => String(t.worker_id) === String(wid));
    const summary = (await buildSummary(periodId)).worker_summaries.find((w) => String(w.worker_id) === String(wid)) || null;
    return { success: true, data: { worker: summary, timesheets: ts, adjustments: adjustmentsFor(periodId).filter((a) => String(a.worker_id) === String(wid)) } };
  }

  const exportMatch = clean.match(/^\/payroll\/periods\/([^/]+)\/export\/(.+)\.csv$/);
  if (verb === "GET" && exportMatch && options.responseType === "blob") return { success: true, data: await exportCsv(exportMatch[2], decodeURIComponent(exportMatch[1])) };

  if (verb === "POST" && clean === "/payroll/periods") {
    const period = { ...(data || {}), id: id("period"), status: "open", export_status: "not_exported", created_at: new Date().toISOString() };
    dataStore.periods = [period, ...(dataStore.periods || [])];
    saveStore(dataStore);
    return { success: true, data: period };
  }

  if (verb === "POST" && clean === "/payroll/settings") {
    dataStore.settings = { ...dataStore.settings, ...(data || {}), default_hourly_rate: Number(data?.default_rate ?? data?.default_hourly_rate ?? dataStore.settings.default_hourly_rate ?? 35) };
    saveStore(dataStore);
    return { success: true, data: dataStore.settings };
  }

  const approveMatch = clean.match(/^\/payroll\/timesheets\/([^/]+)\/approve$/);
  const rejectMatch = clean.match(/^\/payroll\/timesheets\/([^/]+)\/reject$/);
  if (verb === "POST" && (approveMatch || rejectMatch)) {
    const map = statuses();
    map[decodeURIComponent((approveMatch || rejectMatch)[1])] = approveMatch ? "approved" : "needs_review";
    saveStatuses(map);
    return { success: true, data: { updated: 1 } };
  }

  if (verb === "POST" && clean === "/payroll/timesheets/bulk-approve") {
    const map = statuses();
    (data?.entry_ids || []).forEach((eid) => { map[String(eid)] = "approved"; });
    saveStatuses(map);
    return { success: true, data: { updated: (data?.entry_ids || []).length } };
  }

  const periodAction = clean.match(/^\/payroll\/periods\/([^/]+)\/(bulk-approve|lock|unlock|mark-exported)$/);
  if (verb === "POST" && periodAction) {
    const pid = decodeURIComponent(periodAction[1]);
    const action = periodAction[2];
    const p = dataStore.periods.find((x) => String(x.id) === String(pid));
    if (action === "bulk-approve") {
      const map = statuses();
      (await getTimesheets(pid)).forEach((t) => { if (t.status === "pending") map[t.entry_id] = "approved"; });
      saveStatuses(map);
      return { success: true, data: { message: "Pending entries approved" } };
    }
    if (p) {
      if (action === "lock") p.status = "locked";
      if (action === "unlock") p.status = "open";
      if (action === "mark-exported") { p.status = "exported"; p.export_status = "exported"; p.exported_at = new Date().toISOString(); }
      saveStore(dataStore);
    }
    return { success: true, data: p || { id: pid } };
  }

  if (verb === "POST" && clean === "/payroll/adjustments") {
    const workers = await getWorkers();
    const w = workers.find((x) => String(x.id) === String(data?.worker_id));
    const item = { ...(data || {}), id: id("adjustment"), worker_name: w?.name || "Worker", created_at: new Date().toISOString() };
    dataStore.adjustments = [item, ...(dataStore.adjustments || [])];
    saveStore(dataStore);
    return { success: true, data: item };
  }

  const delAdjustment = clean.match(/^\/payroll\/adjustments\/([^/]+)$/);
  if (verb === "DELETE" && delAdjustment) {
    const aid = decodeURIComponent(delAdjustment[1]);
    dataStore.adjustments = (dataStore.adjustments || []).filter((a) => String(a.id) !== String(aid));
    saveStore(dataStore);
    return { success: true, data: { deleted: true } };
  }

  return { success: true, data: {} };
}
