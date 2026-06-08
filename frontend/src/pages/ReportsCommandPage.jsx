import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const REPORT_TYPES = [
  ["summary", "Business summary"],
  ["jobs", "Jobs report"],
  ["invoices", "Invoices / money"],
  ["quotes", "Quotes report"],
  ["clients", "Clients report"],
  ["team_time", "Team time"],
  ["payroll", "Payroll handoff"]
];

const DATE_RANGES = [
  ["today", "Today"],
  ["week", "This week"],
  ["month", "This month"],
  ["all", "All time"],
  ["custom", "Custom"]
];

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function listFrom(res, keys = []) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "jobs", "invoices", "quotes", "clients", "customers", "workers", "team", "users", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function statusOf(item) {
  return String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, item?.pay_status, "draft")).toLowerCase();
}

function idOf(item) {
  const raw = first(item?.id, item?._id, item?.job_id, item?.client_id, item?.quote_id, item?.invoice_id, item?.worker_id, "");
  if (typeof raw === "object") return String(raw?.$oid || raw?.oid || raw?.id || "");
  return String(raw || "");
}

function titleOf(item, fallback = "Untitled") {
  return first(item?.title, item?.job_title, item?.job_name, item?.service_type, item?.quote_number, item?.invoice_number, item?.name, item?.client_name, item?.customer_name, item?.email, fallback);
}

function clientOf(item) {
  return first(item?.client_name, item?.customer_name, item?.client, item?.name, item?.company_name, "No client");
}

function workerOf(item) {
  return first(item?.assigned_worker_name, item?.worker_name, item?.assignee_name, item?.assigned_to_name, item?.assigned_to, item?.name, item?.email, "Unassigned");
}

function moneyValue(item) {
  return Number(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.subtotal, item?.invoice_total, item?.quote_total, 0)) || 0;
}

function money(value) {
  return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function itemDate(item) {
  return first(item?.scheduled_date, item?.due_date, item?.date_due, item?.completed_at, item?.paid_at, item?.created_at, item?.updated_at, item?.valid_until, "");
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function timeHours(job) {
  const seconds = Number(first(job?.net_time_seconds, job?.worked_time_seconds, job?.total_worked_seconds, job?.total_time_seconds, job?.duration_seconds, 0)) || 0;
  if (seconds > 0) return seconds / 3600;
  return Number(first(job?.hours, job?.time_hours, job?.reviewed_hours, 0)) || 0;
}

function isDone(job) {
  const status = statusOf(job);
  return status.includes("complete") || status.includes("done") || status.includes("finished") || Boolean(job?.completed_at);
}

function isActive(job) {
  const status = statusOf(job);
  return status.includes("progress") || status.includes("active") || status.includes("start") || job?.timer_running === true;
}

function isOverdue(invoice) {
  const status = statusOf(invoice);
  if (status.includes("paid") || status.includes("cancel")) return false;
  if (status.includes("overdue") || Number(invoice?.days_overdue || 0) > 0) return true;
  const due = first(invoice?.due_date, invoice?.date_due, invoice?.payment_due, "");
  if (!due) return false;
  const date = new Date(due);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function inDateRange(item, range, fromDate, toDate) {
  if (range === "all") return true;
  const raw = itemDate(item);
  if (!raw) return true;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (range === "today") return date >= start && date <= end;
  if (range === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end.setDate(start.getDate() + 6);
    return date >= start && date <= end;
  }
  if (range === "month") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (range === "custom") {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);
    if (from && date < from) return false;
    if (to && date > to) return false;
  }
  return true;
}

function applyFilters(rows, filters) {
  return rows.filter((row) => {
    if (!inDateRange(row.source || {}, filters.dateRange, filters.fromDate, filters.toDate)) return false;
    if (filters.status !== "all" && !String(row.status || "").toLowerCase().includes(filters.status)) return false;
    if (filters.worker !== "all" && String(row.worker || "").toLowerCase() !== filters.worker) return false;
    if (filters.client !== "all" && String(row.client || "").toLowerCase() !== filters.client) return false;
    return true;
  });
}

function csvDownload(rows, filename) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildRows(type, data) {
  if (type === "summary") {
    return {
      columns: ["Area", "Count", "Value", "Note"],
      rows: [
        { status: "summary", cells: ["Completed jobs", data.jobs.filter(isDone).length, "", "Jobs marked completed"], source: {} },
        { status: "summary", cells: ["Jobs in progress", data.jobs.filter(isActive).length, "", "Active or timer-running jobs"], source: {} },
        { status: "summary", cells: ["Draft invoices", data.invoices.filter((i) => statusOf(i).includes("draft") || !statusOf(i)).length, "", "Invoices still in draft"], source: {} },
        { status: "summary", cells: ["Overdue invoices", data.invoices.filter(isOverdue).length, money(data.invoices.filter(isOverdue).reduce((sum, item) => sum + moneyValue(item), 0)), "Needs follow-up"], source: {} },
        { status: "summary", cells: ["Pending quote value", data.quotes.length, money(data.quotes.reduce((sum, item) => sum + moneyValue(item), 0)), "Quote pipeline"], source: {} },
        { status: "summary", cells: ["Payroll hours ready", data.jobs.length, `${data.jobs.reduce((sum, job) => sum + timeHours(job), 0).toFixed(1)}h`, "From job time records"], source: {} }
      ]
    };
  }

  if (type === "jobs") {
    return {
      columns: ["Job", "Client", "Worker", "Status", "Date", "Value"],
      rows: data.jobs.map((job) => ({ source: job, client: clientOf(job).toLowerCase(), worker: workerOf(job).toLowerCase(), status: statusOf(job), cells: [titleOf(job, "Job"), clientOf(job), workerOf(job), statusOf(job), formatDate(itemDate(job)), money(moneyValue(job))] }))
    };
  }

  if (type === "invoices") {
    return {
      columns: ["Invoice", "Client", "Amount", "Status", "Due date", "Warning"],
      rows: data.invoices.map((invoice) => ({ source: invoice, client: clientOf(invoice).toLowerCase(), worker: "", status: statusOf(invoice), cells: [titleOf(invoice, "Invoice"), clientOf(invoice), money(moneyValue(invoice)), statusOf(invoice), formatDate(first(invoice?.due_date, invoice?.date_due, invoice?.payment_due, "")), isOverdue(invoice) ? "Overdue" : ""] }))
    };
  }

  if (type === "quotes") {
    return {
      columns: ["Quote", "Client", "Value", "Status", "Valid until", "Action"],
      rows: data.quotes.map((quote) => ({ source: quote, client: clientOf(quote).toLowerCase(), worker: "", status: statusOf(quote), cells: [titleOf(quote, "Quote"), clientOf(quote), money(moneyValue(quote)), statusOf(quote), formatDate(first(quote?.valid_until, quote?.expiry_date, quote?.expires_at, "")), statusOf(quote).includes("accepted") ? "Convert to job" : "Follow up"] }))
    };
  }

  if (type === "clients") {
    return {
      columns: ["Client", "Phone", "Email", "Address", "Status", "Missing"],
      rows: data.clients.map((client) => ({ source: client, client: clientOf(client).toLowerCase(), worker: "", status: statusOf(client), cells: [clientOf(client), first(client?.phone, client?.mobile, ""), first(client?.email, client?.customer_email, ""), first(client?.address, client?.site_address, client?.billing_address, ""), statusOf(client), !first(client?.phone, client?.mobile, client?.email, client?.customer_email, "") ? "Contact details" : ""] }))
    };
  }

  const byWorker = new Map();
  data.jobs.forEach((job) => {
    const name = workerOf(job);
    const current = byWorker.get(name) || { jobs: 0, completed: 0, hours: 0, payrollReady: 0 };
    current.jobs += 1;
    current.completed += isDone(job) ? 1 : 0;
    current.hours += timeHours(job);
    current.payrollReady += timeHours(job) > 0 ? 1 : 0;
    byWorker.set(name, current);
  });

  if (type === "team_time") {
    return {
      columns: ["Worker", "Jobs", "Completed", "Hours", "Status", "Note"],
      rows: Array.from(byWorker.entries()).map(([worker, item]) => ({ source: {}, worker: worker.toLowerCase(), status: "team", cells: [worker, item.jobs, item.completed, `${item.hours.toFixed(1)}h`, "Review", "Time from job records"] }))
    };
  }

  return {
    columns: ["Worker", "Pay period", "Reviewed hours", "Pause time", "Export status", "Note"],
    rows: Array.from(byWorker.entries()).map(([worker, item]) => ({ source: {}, worker: worker.toLowerCase(), status: item.payrollReady ? "ready" : "needs review", cells: [worker, "Current period", `${item.hours.toFixed(1)}h`, "Check pauses", item.payrollReady ? "Ready" : "Needs review", "Payroll handoff only, no tax or bank file"] }))
  };
}

function Style() {
  return <style>{`
    .rpRoot,.rpRoot *{box-sizing:border-box;color-scheme:light}.rpRoot{min-height:100vh;background:#f6f1e7;color:#111827;font-family:Inter,system-ui}.rpWrap{max-width:1480px;margin:0 auto;padding:24px 28px 120px}.rpHero{background:#0b1018;color:white;border-left:8px solid #f97316;border-radius:34px;padding:30px;box-shadow:0 18px 46px rgba(2,6,23,.22)}.rpHero span{display:inline-flex;border-radius:999px;background:#fff7ed;color:#7c2d12;padding:8px 14px;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.rpHero h1{margin:16px 0 8px;font-size:clamp(42px,5.5vw,76px);line-height:.9;letter-spacing:-.07em;color:white}.rpHero p{max-width:850px;color:#f8fafc;font-weight:900}.rpGrid{display:grid;grid-template-columns:minmax(0,1fr)340px;gap:18px;margin-top:18px}.rpPanel,.rpSide,.rpTable{background:#fffaf0;border:1px solid rgba(15,23,42,.14);border-radius:30px;padding:22px;box-shadow:0 18px 46px rgba(2,6,23,.10)}.rpFilters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.rpField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:1000;margin-bottom:7px}.rpField select,.rpField input{width:100%;border:2px solid #d6b98f;border-radius:16px;padding:12px 13px;font-size:14px;font-weight:900;background:#fffdf7;color:#0f172a}.rpMetrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}.rpMetric{background:#111827;color:white;border-left:6px solid #f97316;border-radius:22px;padding:16px}.rpMetric b{display:block;color:#fbbf24;text-transform:uppercase;letter-spacing:.13em;font-size:10px}.rpMetric strong{display:block;margin-top:8px;font-size:28px;line-height:1}.rpMetric span{display:block;margin-top:5px;color:#e5e7eb;font-weight:800;font-size:12px}.rpTable{margin-top:18px;overflow:hidden}.rpTableHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px}.rpTableHead h2,.rpSide h2{font-size:30px;line-height:.95;margin:0;color:#111827;letter-spacing:-.04em}.rpTableScroll{overflow:auto;border-radius:20px;border:1px solid #ead4b6;background:white}.rpTable table{width:100%;border-collapse:collapse;min-width:760px}.rpTable th{background:#111827;color:#fbbf24;text-align:left;text-transform:uppercase;letter-spacing:.1em;font-size:11px;padding:13px}.rpTable td{padding:13px;border-top:1px solid #f0dfc8;font-weight:850;color:#111827}.rpTable tr:nth-child(even) td{background:#fff7ed}.rpSide{align-self:start;position:sticky;top:18px;display:grid;gap:14px}.rpAi{background:#14532d;color:white;border-radius:20px;padding:15px;font-weight:900;line-height:1.5}.rpSide button{border:0;border-radius:16px;padding:14px;font-size:15px;font-weight:1000;cursor:pointer}.rpPrimary{background:#16a34a;color:#052e16}.rpSecondary{background:#ffedd5;color:#7c2d12;border:2px solid #fed7aa!important}.rpDark{background:#111827;color:white}.rpLoading{border-radius:20px;background:#fff7ed;padding:16px;font-weight:1000;color:#7c2d12}@media(max-width:1200px){.rpGrid{grid-template-columns:1fr}.rpSide{position:static}.rpFilters,.rpMetrics{grid-template-columns:1fr}.rpWrap{padding:16px 16px 110px}}`}</style>;
}

export default function ReportsCommandPage() {
  const { get } = useApi();
  const [data, setData] = React.useState({ jobs: [], invoices: [], quotes: [], clients: [], team: [] });
  const [loading, setLoading] = React.useState(true);
  const [reportType, setReportType] = React.useState("summary");
  const [dateRange, setDateRange] = React.useState("month");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [worker, setWorker] = React.useState("all");
  const [client, setClient] = React.useState("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jobRes, invoiceRes, quoteRes, clientRes, teamRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/clients"), get("/team/workers")]);
      setData({
        jobs: jobRes.status === "fulfilled" ? listFrom(jobRes.value, ["jobs"]) : [],
        invoices: invoiceRes.status === "fulfilled" ? listFrom(invoiceRes.value, ["invoices"]) : [],
        quotes: quoteRes.status === "fulfilled" ? listFrom(quoteRes.value, ["quotes"]) : [],
        clients: clientRes.status === "fulfilled" ? listFrom(clientRes.value, ["clients", "customers"]) : [],
        team: teamRes.status === "fulfilled" ? listFrom(teamRes.value, ["workers", "team", "users"]) : []
      });
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  const workerOptions = React.useMemo(() => Array.from(new Set(data.jobs.map((job) => workerOf(job)).filter(Boolean))).sort(), [data.jobs]);
  const clientOptions = React.useMemo(() => Array.from(new Set([...data.jobs.map(clientOf), ...data.invoices.map(clientOf), ...data.quotes.map(clientOf), ...data.clients.map(clientOf)].filter(Boolean))).sort(), [data]);
  const baseReport = React.useMemo(() => buildRows(reportType, data), [reportType, data]);
  const rows = React.useMemo(() => applyFilters(baseReport.rows, { dateRange, fromDate, toDate, status, worker, client }), [baseReport, dateRange, fromDate, toDate, status, worker, client]);

  const metrics = React.useMemo(() => [
    ["Jobs completed", data.jobs.filter(isDone).length, "Finished jobs"],
    ["In progress", data.jobs.filter(isActive).length, "Active work"],
    ["Overdue invoices", data.invoices.filter(isOverdue).length, money(data.invoices.filter(isOverdue).reduce((sum, item) => sum + moneyValue(item), 0))],
    ["Quote value", money(data.quotes.reduce((sum, item) => sum + moneyValue(item), 0)), "Pipeline"]
  ], [data]);

  const aiSummary = React.useMemo(() => {
    const overdue = data.invoices.filter(isOverdue).length;
    const completed = data.jobs.filter(isDone).length;
    const active = data.jobs.filter(isActive).length;
    const quoteValue = money(data.quotes.reduce((sum, item) => sum + moneyValue(item), 0));
    const hours = data.jobs.reduce((sum, job) => sum + timeHours(job), 0).toFixed(1);
    return `Churvox found ${completed} completed jobs, ${active} jobs in progress, ${overdue} overdue invoices, ${quoteValue} in quote value, and ${hours} job hours for report review.`;
  }, [data]);

  const reportName = REPORT_TYPES.find(([value]) => value === reportType)?.[1] || "Report";

  function exportCsv() {
    csvDownload([baseReport.columns, ...rows.map((row) => row.cells)], `churvox-${reportType}-report`);
    toast.success("CSV export prepared");
  }

  async function copySummary() {
    const text = `${reportName}\n${aiSummary}\nRows: ${rows.length}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Report summary copied");
    } catch {
      toast.error("Could not copy summary");
    }
  }

  return (
    <main className="rpRoot dwRoot">
      <Style />
      <section className="rpWrap dwWrap">
        <article className="rpHero">
          <span>Reports workspace</span>
          <h1>Reports ready to view and export.</h1>
          <p>Choose the report, filter it, preview the table, then export or copy the summary. No extra review slip.</p>
        </article>

        <section className="rpGrid">
          <div>
            <section className="rpPanel">
              <div className="rpFilters">
                <label className="rpField"><span>Report type</span><select value={reportType} onChange={(e) => setReportType(e.target.value)}>{REPORT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="rpField"><span>Date range</span><select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>{DATE_RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="rpField"><span>Worker</span><select value={worker} onChange={(e) => setWorker(e.target.value)}><option value="all">All workers</option>{workerOptions.map((name) => <option key={name} value={name.toLowerCase()}>{name}</option>)}</select></label>
                <label className="rpField"><span>Client</span><select value={client} onChange={(e) => setClient(e.target.value)}><option value="all">All clients</option>{clientOptions.map((name) => <option key={name} value={name.toLowerCase()}>{name}</option>)}</select></label>
                <label className="rpField"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="complete">Complete</option><option value="progress">In progress</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="ready">Ready</option></select></label>
                {dateRange === "custom" ? <><label className="rpField"><span>From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label><label className="rpField"><span>To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label></> : null}
              </div>
              <div className="rpMetrics">{metrics.map(([label, value, note]) => <article key={label} className="rpMetric"><b>{label}</b><strong>{value}</strong><span>{note}</span></article>)}</div>
            </section>

            <section className="rpTable">
              <div className="rpTableHead"><h2>{reportName}</h2>{loading ? <span className="rpLoading">Loading report data...</span> : <span className="rpLoading">{rows.length} rows</span>}</div>
              <div className="rpTableScroll">
                <table>
                  <thead><tr>{baseReport.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                  <tbody>
                    {rows.length ? rows.map((row, index) => <tr key={`${idOf(row.source)}-${index}`}>{row.cells.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell || "—"}</td>)}</tr>) : <tr><td colSpan={baseReport.columns.length}>No records found for this report and filter.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="rpSide">
            <h2>Report actions</h2>
            <div className="rpAi">{aiSummary}</div>
            <button className="rpPrimary" onClick={exportCsv}>Export CSV</button>
            <button className="rpSecondary" onClick={copySummary}>Copy summary</button>
            <button className="rpSecondary" onClick={() => window.print()}>Print report</button>
            <button className="rpDark" onClick={load}>Refresh report data</button>
          </aside>
        </section>
      </section>
    </main>
  );
}
