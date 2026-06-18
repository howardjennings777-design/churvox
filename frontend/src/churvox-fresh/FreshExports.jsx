import React from "react";
import { useApi } from "../hooks/useApi";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const DATASETS = {
  Clients: { endpoint: "/clients", page: "clients", aliases: ["clients", "items", "results", "data"] },
  Team: { endpoint: "/team/workers", page: "team", aliases: ["workers", "team", "items", "results", "data"] },
  Jobs: { endpoint: "/jobs", page: "jobs", aliases: ["jobs", "items", "results", "data"] },
  Quotes: { endpoint: "/quotes", page: "quotes", aliases: ["quotes", "items", "results", "data"] },
  Invoices: { endpoint: "/invoices", page: "invoices", aliases: ["invoices", "items", "results", "data"] },
};

function unwrap(result) { return result?.data ?? result; }
function asArray(payload, aliases = []) { const data = unwrap(payload); if (Array.isArray(data)) return data; for (const key of aliases) if (Array.isArray(data?.[key])) return data[key]; return []; }
function text(value) { if (value === null || value === undefined) return ""; if (typeof value === "object") return JSON.stringify(value); return String(value); }
function labelOf(record) { return record?.name || record?.client_name || record?.customer_name || record?.title || record?.job_title || record?.invoice_number || record?.email || record?.id || record?._id || "Record"; }
function safeFileName(value) { return String(value || "churvox-export").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function collectColumns(rows) { const keys = new Set(); rows.forEach((row) => Object.keys(row || {}).forEach((key) => { if (!String(key).startsWith("__")) keys.add(key); })); return Array.from(keys); }
function csvEscape(value) { return `"${text(value).replace(/"/g, '""')}"`; }
function makeCsv(rows) { const columns = collectColumns(rows); const body = [columns, ...rows.map((row) => columns.map((key) => row?.[key]))]; return body.map((row) => row.map(csvEscape).join(",")).join("\n"); }
function downloadCsv(dataset, rows) { const csv = makeCsv(rows); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${safeFileName(dataset)}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); }
function riskFor(dataset) { if (dataset === "Invoices") return "Medium"; if (dataset === "Team") return "High"; return "Low"; }
function approvalFor(dataset) { return dataset === "Team" || dataset === "Invoices" ? "Required" : "Recommended"; }
function readCommandInbox() { try { const raw = window.localStorage.getItem(COMMAND_INBOX_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function sendExportToCommand({ dataset, rows, status, message }) {
  try {
    const slip = { id: `export-${dataset}-${Date.now()}`, group: "Exports", area: "Data Exports", page: "exports", title: `${dataset} export review`, info: `${rows.length} ${dataset.toLowerCase()} row${rows.length === 1 ? "" : "s"} · ${status}`, urgency: riskFor(dataset), found: `Churvox found ${rows.length} live ${dataset.toLowerCase()} record${rows.length === 1 ? "" : "s"}.`, prepared: "Churvox prepared a CSV owner export review.", why: message || "Owners should be able to review and download their business records.", owner: "Review the data, download the CSV if correct, or open the source area first.", payload: { dataset, rows: rows.length, status, approval: approvalFor(dataset), sample: rows.slice(0, 3).map(labelOf) }, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), fromInbox: true };
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...readCommandInbox()].slice(0, 30)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "export-command" } }));
  } catch {}
}

export default function FreshExports({ onNavigate }) {
  const { get } = useApi();
  const [dataset, setDataset] = React.useState("Clients");
  const [records, setRecords] = React.useState({ Clients: [], Team: [], Jobs: [], Quotes: [], Invoices: [] });
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const currentRows = records[dataset] || [];
  const totalRows = Object.values(records).reduce((sum, rows) => sum + rows.length, 0);
  const readySets = Object.values(records).filter((rows) => rows.length > 0).length;
  const datasetConfig = DATASETS[dataset];

  async function loadDataset(name = dataset) {
    const config = DATASETS[name];
    setLoading(true); setMessage("");
    try {
      const result = await get(config.endpoint, { timeout: 25000 });
      if (!result?.success) throw new Error(result?.error || `Could not load ${name}.`);
      const rows = asArray(result.data, config.aliases);
      setRecords((current) => ({ ...current, [name]: rows }));
      setMessage(`${name} loaded: ${rows.length} row${rows.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setRecords((current) => ({ ...current, [name]: [] }));
      setMessage(err?.message || `Could not load ${name}.`);
    } finally { setLoading(false); }
  }

  async function loadAll() {
    setLoading(true); setMessage("Loading live records...");
    const next = {};
    await Promise.all(Object.entries(DATASETS).map(async ([name, config]) => {
      try { const result = await get(config.endpoint, { timeout: 25000 }); next[name] = result?.success ? asArray(result.data, config.aliases) : []; }
      catch { next[name] = []; }
    }));
    setRecords(next); setLoading(false); setMessage("Live export data refreshed.");
  }

  React.useEffect(() => { loadAll(); }, []);

  function exportCurrent() {
    if (!currentRows.length) { setMessage(`No ${dataset} rows to export yet.`); return; }
    downloadCsv(dataset, currentRows);
    sendExportToCommand({ dataset, rows: currentRows, status: "Exported", message: `${dataset} CSV downloaded by owner.` });
    setMessage(`${dataset} CSV downloaded and copied to Command.`);
  }

  function sendToCommand() {
    sendExportToCommand({ dataset, rows: currentRows, status: currentRows.length ? "Ready" : "No data", message: `${dataset} export sent for owner review.` });
    onNavigate?.("command");
  }

  return <section className="freshExportsPage">
    <div className="freshExportsHero"><div><span>Data exports / CSV</span><h1>Owner data control</h1><p>Load live business records and download simple CSV exports. Nothing leaves Churvox until the owner chooses to export.</p></div><div className="freshExportsStats"><div><b>{totalRows}</b><small>live rows</small></div><div><b>{readySets}</b><small>data sets</small></div><div><b>{currentRows.length}</b><small>selected rows</small></div><div><b>{approvalFor(dataset)}</b><small>approval</small></div></div></div>
    {message ? <section className={`freshCard freshNotice ${message.includes("Could not") || message.includes("No ") ? "need" : ""}`}><b>Export status</b><span>{message}</span></section> : null}
    <div className="freshExportsLayout"><aside className="freshExportsList"><header><div><b>Live export desk</b><span>{readySets} data sets loaded</span></div><button type="button" onClick={loadAll} disabled={loading}>{loading ? "Loading..." : "Refresh all"}</button></header>{Object.keys(DATASETS).map((name) => <button type="button" key={name} className={dataset === name ? "active" : ""} onClick={() => { setDataset(name); if (!records[name]?.length) loadDataset(name); }}><b>{name}</b><span>{DATASETS[name].endpoint}</span><small>{records[name]?.length || 0} rows · {riskFor(name)} risk</small></button>)}<button type="button" className="freshExportsReset" onClick={() => onNavigate?.("imports")}>Open Imports</button></aside>
      <article className="freshExportsDetail"><div className="freshExportsHead"><div><span>{currentRows.length ? "Ready" : "No data"}</span><h2>{dataset} export</h2><p>{currentRows.length} rows · CSV · Owner download</p></div><div className="freshExportsHeadActions"><button type="button" onClick={exportCurrent} disabled={!currentRows.length}>Download CSV</button><button type="button" onClick={sendToCommand}>Send to Command</button><button type="button" onClick={() => onNavigate?.(datasetConfig.page)}>Open Area</button></div></div>
        <div className="freshExportsCards"><section><span>Live source</span><b>{datasetConfig.endpoint}</b><p>Exports use the current records returned by the app backend.</p></section><section><span>Owner approval</span><b>{approvalFor(dataset)}</b><p>Customer, team and invoice exports should stay owner-controlled.</p></section><section><span>Risk</span><b>{riskFor(dataset)}</b><p>{dataset === "Team" ? "Worker/payroll data should be checked before export." : "Review rows before sharing outside Churvox."}</p></section></div>
        <div className="freshExportsForm"><label><span>Selected data</span><input readOnly value={dataset} /></label><label><span>Rows</span><input readOnly value={currentRows.length} /></label><label><span>Format</span><input readOnly value="CSV" /></label><label><span>Destination</span><input readOnly value="Owner download" /></label><label className="wide"><span>Owner control note</span><textarea readOnly value="Exports are for owner review, backup or migration. Review the rows before sharing outside Churvox." /></label><label className="wide"><span>Preview</span><textarea readOnly value={currentRows.slice(0, 8).map((row, index) => `${index + 1}. ${labelOf(row)}`).join("\n") || "No rows loaded yet."} /></label></div>
        <div className="freshExportsActions"><button type="button" onClick={() => loadDataset(dataset)} disabled={loading}>Reload {dataset}</button><button type="button" onClick={exportCurrent} disabled={!currentRows.length}>Download CSV</button><button type="button" onClick={sendToCommand}>Send review to Command</button><button type="button" onClick={() => onNavigate?.("support")}>Open Support</button></div>
      </article></div>
  </section>;
}
