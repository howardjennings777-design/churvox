import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { BarChart3, Download, FileDown, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import "./ReportsSecurityPage.css";

const arr = (v) => Array.isArray(v) ? v : [];
const idOf = (v) => String(v?.id || v?._id || "");
const money = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
};
const today = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const downloadText = (filename, content, type) => {
  const blob = new Blob([content || ""], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

function RecordList({ title, records, type }) {
  return (
    <PremiumCard title={title}>
      {arr(records).length ? arr(records).slice(0, 10).map((record, index) => {
        const href = type === "job" ? `/jobs/${idOf(record)}` : type === "invoice" ? `/invoices/${idOf(record)}` : type === "quote" ? `/quotes/${idOf(record)}` : "/clients";
        return (
          <Link className="cv-report-record" key={`${title}-${idOf(record)}-${index}`} to={href}>
            <b>{record.invoice_number || record.quote_number || record.title || record.job_name || record.customer_name || record.client_name || "Record"}</b>
            <span>{record.status || "open"} · {record.customer_name || record.client_name || record.address || ""}</span>
          </Link>
        );
      }) : <div className="cv-report-empty">Nothing to show.</div>}
    </PremiumCard>
  );
}

export default function ReportsSecurityPage() {
  const api = useApi();
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [from, setFrom] = useState(today(-30));
  const [to, setTo] = useState(today(1));

  async function loadReports() {
    setLoading(true);
    const res = await api.get(`/reports/workspace?date_from=${from}&date_to=${to}`);
    if (res.success) setReports(res.data?.reports || {});
    else toast.error(res.error || "Could not load reports");
    setLoading(false);
  }

  useEffect(() => { loadReports(); }, []);

  const metrics = reports.metrics || {};
  const charts = reports.charts || {};
  const records = reports.records || {};
  const trust = reports.trust_checks || {};

  const cards = useMemo(() => [
    ["Invoiced this week", money(metrics.invoiced_this_week), "created invoices"],
    ["Paid this week", money(metrics.paid_this_week), "cash in"],
    ["Unpaid total", money(metrics.unpaid_total), "open balance", "amber"],
    ["Overdue total", money(metrics.overdue_total), "needs chasing", "red"],
    ["Completed not invoiced", metrics.completed_jobs_not_invoiced || 0, "work to bill", "green"],
    ["Quotes waiting", metrics.quotes_waiting || 0, "follow-up list"],
    ["Accepted not converted", metrics.accepted_quotes_not_converted || 0, "needs job", "amber"],
    ["Jobs total", metrics.jobs_total || 0, "operations"],
  ], [metrics]);

  async function exportDataset(dataset) {
    setBusy(dataset);
    const res = await api.get(`/reports/export/${dataset}?date_from=${from}&date_to=${to}`);
    setBusy("");
    if (res.success) {
      downloadText(res.data?.filename || `churvox_${dataset}.csv`, res.data?.csv || "", "text/csv;charset=utf-8");
      toast.success(`${dataset} export downloaded`);
    } else {
      toast.error(res.error || "Export failed");
    }
  }

  async function exportAllData() {
    setBusy("all-data");
    const res = await api.get("/data-control/export");
    setBusy("");
    if (res.success) {
      downloadText("churvox_business_data_export.json", JSON.stringify(res.data?.export || {}, null, 2), "application/json;charset=utf-8");
      toast.success("Business data export downloaded");
    } else {
      toast.error(res.error || "Data export failed");
    }
  }

  async function requestDeletion() {
    const reason = window.prompt("Reason for account deletion request?", "Owner requested account deletion");
    if (reason === null) return;
    setBusy("delete");
    const res = await api.post("/data-control/request-account-deletion", { reason });
    setBusy("");
    if (res.success) toast.success("Deletion request recorded for review");
    else toast.error(res.error || "Could not record deletion request");
  }

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero
        eyebrow="Reports, exports and trust"
        title="Know the numbers and control the data."
        subtitle="Revenue, unpaid work, jobs, worker time, customer value, CSV exports, privacy/security checks and data control."
        icon={<BarChart3 className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadReports} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-report-filters">
        <label><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button type="button" onClick={loadReports}>Apply date filter</button>
      </section>

      <section className="cv-report-metrics">
        {cards.map(([label, value, note, tone]) => (
          <article className={tone || ""} key={label}>
            <span>{label}</span>
            <b>{value}</b>
            <small>{note}</small>
          </article>
        ))}
      </section>

      {loading ? (
        <PremiumCard><div className="cv-report-empty">Loading reports…</div></PremiumCard>
      ) : (
        <>
          <section className="cv-report-grid">
            <PremiumCard title="Jobs by status">
              {arr(charts.job_status_counts).map((row) => <div className="cv-report-bar" key={row.label}><span>{row.label}</span><b>{row.count}</b></div>)}
            </PremiumCard>
            <PremiumCard title="Jobs by worker">
              {arr(charts.jobs_by_worker).map((row) => <div className="cv-report-bar" key={row.label}><span>{row.label}</span><b>{row.count}</b></div>)}
            </PremiumCard>
            <PremiumCard title="Time worked by worker">
              {arr(charts.time_by_worker).map((row) => <div className="cv-report-bar" key={row.label}><span>{row.label}</span><b>{row.hours}h</b></div>)}
            </PremiumCard>
            <PremiumCard title="Clients by revenue">
              {arr(charts.revenue_by_client).slice(0, 10).map((row) => <div className="cv-report-bar" key={row.label}><span>{row.label}</span><b>{money(row.value)}</b></div>)}
            </PremiumCard>
          </section>

          <section className="cv-report-record-grid">
            <RecordList title="Completed jobs not invoiced" records={records.completed_jobs_not_invoiced} type="job" />
            <RecordList title="Overdue invoices" records={records.overdue_invoices} type="invoice" />
            <RecordList title="Accepted quotes not converted" records={records.accepted_quotes_not_converted} type="quote" />
            <RecordList title="Cancelled / paused / issue jobs" records={records.cancelled_late_paused_jobs} type="job" />
          </section>

          <section className="cv-report-export">
            <PremiumCard title="CSV exports" icon={<FileDown className="h-5 w-5" />}>
              <div className="cv-report-export-buttons">
                {["summary", "invoices", "jobs", "quotes", "clients"].map((dataset) => (
                  <button type="button" key={dataset} onClick={() => exportDataset(dataset)} disabled={busy === dataset}>
                    <Download size={15} /> Export {dataset}
                  </button>
                ))}
              </div>
            </PremiumCard>

            <PremiumCard title="Trust, security and data control" icon={<ShieldCheck className="h-5 w-5" />}>
              <div className="cv-report-trust">
                {Object.entries(trust).map(([key, value]) => (
                  <div key={key}>
                    <b>{key.replaceAll("_", " ")}</b>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
              <div className="cv-report-data-actions">
                <button type="button" onClick={exportAllData} disabled={busy === "all-data"}><Download size={15} /> Download full business data</button>
                <button type="button" className="danger" onClick={requestDeletion} disabled={busy === "delete"}><Trash2 size={15} /> Request account deletion</button>
              </div>
              <p className="cv-report-note">Data deletion is request-first. Churvox records the request for review before destructive deletion.</p>
            </PremiumCard>
          </section>
        </>
      )}
    </PremiumPage>
  );
}
