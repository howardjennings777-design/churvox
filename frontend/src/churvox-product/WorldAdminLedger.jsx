import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { buildWorldLedgerSettings, findWorldLedgerPreset, WORLD_LEDGER_GUARDRAILS, WORLD_LEDGER_PRESETS } from "./worldLedgerPresets";
import "./worldAdminLedger.css";

const STORAGE_KEY = "churvox:world-admin-ledger";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unwrap(payload) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function rowsFrom(payload, key) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "records", "results", "data", "jobs", "clients", "quotes", "invoices", "workers", "team"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows, columns) {
  const lines = [columns.map(([label]) => csvEscape(label)).join(",")];
  rows.forEach((row) => lines.push(columns.map(([, key]) => csvEscape(row[key])).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function amountOf(row) {
  return Number(row?.amount ?? row?.total ?? row?.price ?? row?.value ?? 0) || 0;
}

function titleOf(row, fallback) {
  return clean(row?.invoice_number || row?.number || row?.title || row?.job_title || row?.client_name || row?.name || fallback);
}

function userCountryCode(user) {
  return clean(user?.country_code || user?.business_country_code || user?.business?.country_code || user?.country || user?.business?.country || "NZ").slice(0, 2).toUpperCase();
}

function readSavedSettings() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeSavedSettings(settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function initialSettings(user) {
  const saved = readSavedSettings();
  const preset = findWorldLedgerPreset(saved?.country_code || userCountryCode(user));
  return buildWorldLedgerSettings(preset, {
    ...saved,
    tax_rate: saved?.tax_rate || user?.gst_rate || user?.tax_rate || preset.defaultTaxRate,
    business_id_value: saved?.business_id_value || user?.business_id || user?.nzbn || user?.abn || user?.vat_number || "",
    payment_terms: saved?.payment_terms || user?.payment_terms || preset.paymentTerms,
    invoice_number_prefix: saved?.invoice_number_prefix || preset.invoiceNumberPrefix,
  });
}

function readinessChecks(settings, records) {
  const checks = [];
  if (!clean(settings.country_code)) checks.push("Choose the business country pack.");
  if (!clean(settings.currency)) checks.push("Set the business currency.");
  if (!clean(settings.tax_name)) checks.push("Set the tax name or choose non-registered/manual.");
  if (settings.tax_rate === "" || settings.tax_rate === null || Number.isNaN(Number(settings.tax_rate))) checks.push("Set a valid tax rate, even if it is 0 for manual sales tax.");
  if (!clean(settings.business_id_value)) checks.push(`Add ${settings.business_id_label || "business ID"} when the owner has it.`);
  if (!clean(settings.payment_terms)) checks.push("Set default payment terms.");
  records.invoices.slice(0, 8).forEach((invoice) => {
    if (!clean(invoice.client_name || invoice.client || invoice.customer_name)) checks.push(`${titleOf(invoice, "Invoice")} needs a client.`);
    if (!amountOf(invoice)) checks.push(`${titleOf(invoice, "Invoice")} needs an amount.`);
    if (!clean(invoice.due_date || invoice.due)) checks.push(`${titleOf(invoice, "Invoice")} needs a due date.`);
  });
  return [...new Set(checks)].slice(0, 7);
}

export default function WorldAdminLedger() {
  const { user } = useAuth();
  const api = useApi();
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState(() => initialSettings(user));
  const [records, setRecords] = React.useState({ jobs: [], clients: [], quotes: [], invoices: [] });
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    setValues((current) => current?.country_code ? current : initialSettings(user));
  }, [user]);

  const preset = React.useMemo(() => findWorldLedgerPreset(values.country_code), [values.country_code]);
  const checks = React.useMemo(() => readinessChecks(values, records), [values, records]);
  const invoiceValue = records.invoices.reduce((sum, row) => sum + amountOf(row), 0);

  function changeField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function changeCountry(event) {
    const nextPreset = findWorldLedgerPreset(event.target.value);
    setValues((current) => buildWorldLedgerSettings(nextPreset, {
      business_id_value: current.business_id_value,
      payment_terms: nextPreset.paymentTerms,
      quote_expiry: nextPreset.quoteExpiry,
      tax_rate: nextPreset.defaultTaxRate,
      invoice_number_prefix: nextPreset.invoiceNumberPrefix,
    }));
  }

  async function loadRecords() {
    const result = await Promise.allSettled([api.get("/jobs"), api.get("/clients"), api.get("/quotes"), api.get("/invoices")]);
    const next = {
      jobs: rowsFrom(result[0]?.value, "jobs"),
      clients: rowsFrom(result[1]?.value, "clients"),
      quotes: rowsFrom(result[2]?.value, "quotes"),
      invoices: rowsFrom(result[3]?.value, "invoices"),
    };
    setRecords(next);
    return next;
  }

  async function saveSettings() {
    setBusy(true);
    setNotice("");
    const payload = { ...values, world_admin_ledger: values, gst_rate: values.tax_name === "GST" ? values.tax_rate : undefined };
    try {
      const calls = [
        () => api.patch("/business/settings", payload),
        () => api.put("/business/settings", payload),
        () => api.patch("/settings/business", payload),
        () => api.post("/settings/business", payload),
      ];
      let saved = false;
      for (const call of calls) {
        const result = await call();
        if (result?.success !== false) {
          saved = true;
          break;
        }
      }
      writeSavedSettings(values);
      setNotice(saved ? "Country ledger saved to Churvox." : "Saved locally; backend did not confirm this settings endpoint.");
    } catch (error) {
      writeSavedSettings(values);
      setNotice(error?.message || "Saved locally; backend did not confirm this settings endpoint.");
    } finally {
      setBusy(false);
    }
  }

  async function exportPack() {
    setBusy(true);
    setNotice("");
    try {
      const next = await loadRecords();
      const packRows = [
        ...next.invoices.map((item) => ({ type: "invoice", ref: titleOf(item, "Invoice"), client: clean(item.client_name || item.client || item.customer_name), date: clean(item.due_date || item.date || item.created_at), amount: amountOf(item), status: clean(item.status || item.accounting_status || "draft"), country: values.country, currency: values.currency, tax: `${values.tax_name} ${values.tax_rate}%`, handoff: "owner-approved draft/export" })),
        ...next.quotes.map((item) => ({ type: "quote", ref: titleOf(item, "Quote"), client: clean(item.client_name || item.client || item.customer_name), date: clean(item.date || item.created_at), amount: amountOf(item), status: clean(item.status || "draft"), country: values.country, currency: values.currency, tax: `${values.tax_name} ${values.tax_rate}%`, handoff: "quote record" })),
        ...next.jobs.map((item) => ({ type: "job", ref: titleOf(item, "Job"), client: clean(item.client_name || item.client || item.customer_name), date: clean(item.scheduled_date || item.date || item.start_date), amount: amountOf(item), status: clean(item.status || item.job_status || "ready"), country: values.country, currency: values.currency, tax: `${values.tax_name} ${values.tax_rate}%`, handoff: "job source record" })),
        ...next.clients.map((item) => ({ type: "client", ref: titleOf(item, "Client"), client: titleOf(item, "Client"), date: clean(item.updated_at || item.created_at), amount: "", status: clean(item.status || "active"), country: values.country, currency: values.currency, tax: `${values.tax_name} ${values.tax_rate}%`, handoff: "client record" })),
      ];
      const fileCountry = values.country_code.toLowerCase();
      downloadCsv(`churvox-${fileCountry}-admin-ledger-pack.csv`, packRows, [["Type", "type"], ["Reference", "ref"], ["Client", "client"], ["Date", "date"], ["Amount", "amount"], ["Status", "status"], ["Country", "country"], ["Currency", "currency"], ["Tax setting", "tax"], ["Handoff rule", "handoff"]]);
      setNotice(`${values.export_pack_name} exported as CSV.`);
    } catch (error) {
      setNotice(error?.message || "Could not export the ledger pack.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return <div className={`cvxWorldLedger ${open ? "open" : "closed"}`}>
    <button type="button" className="cvxWorldLedgerTab" onClick={() => setOpen((current) => !current)}><b>Admin Ledger</b><small>{values.country_code} · {values.currency}</small></button>
    {open ? <aside className="cvxWorldLedgerPanel" aria-label="Churvox Admin Ledger country presets">
      <header>
        <small>World-ready admin ledger</small>
        <h2>Country presets for quotes, invoices and bookkeeper handoff.</h2>
        <button type="button" onClick={() => setOpen(false)}>Close</button>
      </header>
      <section className="cvxWorldLedgerHero">
        <div>
          <label><span>Business country pack</span><select name="country_code" value={values.country_code} onChange={changeCountry}>{WORLD_LEDGER_PRESETS.map((item) => <option key={item.code} value={item.code}>{item.country}</option>)}</select></label>
          <p>{preset.exportPackName} · {preset.invoiceTitle} · {preset.taxMode}</p>
        </div>
        <div className="cvxWorldLedgerStats"><span><b>{values.tax_name}</b><small>{values.tax_rate}% default</small></span><span><b>{values.currency}</b><small>{values.date_format}</small></span><span><b>{records.invoices.length}</b><small>draft records checked</small></span><span><b>{invoiceValue ? new Intl.NumberFormat(values.locale, { style: "currency", currency: values.currency, maximumFractionDigits: 0 }).format(invoiceValue) : "Ready"}</b><small>invoice value</small></span></div>
      </section>
      <section className="cvxWorldLedgerGrid">
        <div className="cvxWorldLedgerCard wide">
          <h3>Local invoice setup</h3>
          <div className="cvxWorldLedgerForm">
            <label><span>Invoice title</span><input name="invoice_title" value={values.invoice_title} onChange={changeField} /></label>
            <label><span>Tax name</span><input name="tax_name" value={values.tax_name} onChange={changeField} /></label>
            <label><span>Tax rate</span><input name="tax_rate" type="number" step="0.01" value={values.tax_rate} onChange={changeField} /></label>
            <label><span>{values.business_id_label}</span><input name="business_id_value" value={values.business_id_value} onChange={changeField} placeholder={values.business_id_hint} /></label>
            <label><span>Payment terms</span><input name="payment_terms" value={values.payment_terms} onChange={changeField} /></label>
            <label><span>Invoice number prefix</span><input name="invoice_number_prefix" value={values.invoice_number_prefix} onChange={changeField} /></label>
          </div>
          <div className="cvxWorldLedgerActions"><button type="button" disabled={busy} onClick={saveSettings}>Save country ledger</button><button type="button" disabled={busy} onClick={exportPack}>Export accountant CSV</button><button type="button" disabled={busy} onClick={loadRecords}>Check live records</button></div>
        </div>
        <div className="cvxWorldLedgerCard">
          <h3>Missing info checker</h3>
          {checks.length ? <ul>{checks.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="good">Ready for owner-approved draft/export handoff.</p>}
        </div>
        <div className="cvxWorldLedgerCard">
          <h3>Bookkeeper pack</h3>
          <p>{values.export_pack_name} includes job, quote, invoice and client rows with country, currency and tax settings attached.</p>
          <p className="fine">This is not tax filing. It prepares clean records for the owner, bookkeeper or accountant to review.</p>
        </div>
        <div className="cvxWorldLedgerCard wide guard">
          <h3>Guardrails</h3>
          <div>{WORLD_LEDGER_GUARDRAILS.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      </section>
      {notice ? <p className="cvxWorldLedgerNotice">{notice}</p> : null}
    </aside> : null}
  </div>;
}
