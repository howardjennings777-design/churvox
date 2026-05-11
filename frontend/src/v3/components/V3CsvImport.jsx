import React, { useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { post } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
const IMPORTS = [
  {
    key: "clients",
    label: "Clients",
    paths: ["/v3/clients", "/clients"],
    endpoints: ["/clients"],
    required: ["name"],
    help: "Headers: name, email, phone, address, notes",
    payload: (row) => ({
      name: pick(row, ["name", "client name", "client_name", "business name", "business_name", "customer", "customer_name"]),
      email: pick(row, ["email", "email address", "customer_email"]),
      phone: pick(row, ["phone", "mobile", "phone number", "phone_number"]),
      address: pick(row, ["address", "street", "site address", "site_address"]),
      notes: pick(row, ["notes", "note", "description"]),
    }),
  },
  {
    key: "jobs",
    label: "Jobs",
    paths: ["/v3/jobs", "/jobs"],
    endpoints: ["/jobs"],
    required: ["title", "address"],
    help: "Headers: title, customer_name, address, scheduled_date, job_type, price, notes",
    payload: (row) => ({
      title: pick(row, ["title", "job title", "job_title", "name", "service"]) || "Imported job",
      customer_name: pick(row, ["customer_name", "customer", "client", "client_name", "name"]),
      address: pick(row, ["address", "job address", "job_address", "site address", "site_address"]),
      scheduled_date: pick(row, ["scheduled_date", "scheduled date", "date", "job_date"]),
      job_type: pick(row, ["job_type", "job type", "type", "trade"]) || "other",
      pricing_type: pick(row, ["pricing_type", "pricing type"]) || "fixed",
      price: moneyValue(pick(row, ["price", "amount", "total", "job price"])),
      notes: pick(row, ["notes", "note", "description"]),
    }),
  },
  {
    key: "quotes",
    label: "Quotes",
    paths: ["/v3/quotes", "/quotes"],
    endpoints: ["/quotes"],
    required: ["customer_name", "job_description"],
    help: "Headers: customer_name, customer_email, address, job_description, price",
    payload: (row) => ({
      customer_name: pick(row, ["customer_name", "customer", "client", "client_name", "name"]),
      customer_email: pick(row, ["customer_email", "email", "email address"]),
      address: pick(row, ["address", "site address", "site_address"]),
      job_description: pick(row, ["job_description", "description", "work", "notes"]) || "Imported quote",
      pricing_type: pick(row, ["pricing_type", "pricing type"]) || "fixed",
      price: moneyValue(pick(row, ["price", "amount", "total", "quote price"])),
      status: pick(row, ["status"]) || "draft",
    }),
  },
  {
    key: "invoices",
    label: "Invoices",
    paths: ["/v3/invoices", "/invoices"],
    endpoints: ["/invoices"],
    required: ["customer_name", "description"],
    help: "Headers: customer_name, customer_email, address, description, subtotal",
    payload: (row) => ({
      customer_name: pick(row, ["customer_name", "customer", "client", "client_name", "name"]),
      customer_email: pick(row, ["customer_email", "email", "email address"]),
      address: pick(row, ["address", "site address", "site_address"]),
      description: pick(row, ["description", "job_description", "work", "notes"]) || "Imported invoice",
      subtotal: moneyValue(pick(row, ["subtotal", "price", "amount", "total"])),
      status: pick(row, ["status"]) || "draft",
    }),
  },
  {
    key: "team",
    label: "Crew",
    paths: ["/v3/team", "/team", "/workers"],
    endpoints: ["/team/workers", "/team/invite", "/workers"],
    required: ["email"],
    help: "Headers: name, email, phone, role, region",
    payload: (row) => ({
      name: pick(row, ["name", "worker", "worker_name", "full_name", "full name"]),
      email: pick(row, ["email", "email address"]),
      phone: pick(row, ["phone", "mobile", "phone number", "phone_number"]),
      role: pick(row, ["role"]) || "worker",
      region: pick(row, ["region", "area", "zone"]),
    }),
  },
];

function normaliseHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\ufeff/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      quoted = !quoted;
      continue;
    }

    if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((v) => String(v).trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.some((v) => String(v).trim())) rows.push(row);

  if (rows.length < 2) return [];

  const headers = rows[0].map(normaliseHeader);
  return rows.slice(1).map((values) => {
    const output = {};
    headers.forEach((header, index) => {
      output[header] = String(values[index] ?? "").trim();
    });
    return output;
  });
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[normaliseHeader(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function moneyValue(value) {
  const clean = String(value || "").replace(/[$,]/g, "").trim();
  const number = Number(clean);
  return Number.isFinite(number) ? number : 0;
}

function hasRequired(payload, required) {
  return required.every((field) => String(payload[field] || "").trim());
}

async function tryPost(endpoints, payload) {
  let lastError = "";
  for (const endpoint of endpoints) {
    try {
      const res = await post(endpoint, payload);
      if (res?.ok || res?.success || res?.id || res?._id || res?.data?.id || res?.data?._id || !res?.error) {
        return { ok: true, endpoint, res };
      }
      lastError = res?.message || res?.error || "Rejected by server";
    } catch (err) {
      lastError = err?.message || "Request failed";
    }
  }
  return { ok: false, error: lastError || "Import failed" };
}

export default function V3CsvImport() {
  const location = useLocation();
  const inputRef = useRef(null);
  const { user, normalizedRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const role = String(normalizedRole || user?.role || "").toLowerCase();

  const config = useMemo(() => {
    const path = location.pathname;
    return IMPORTS.find((item) => item.paths.some((p) => path === p || path.startsWith(`${p}/`)));
  }, [location.pathname]);

  if (!config || ["worker", "payroll"].includes(role)) return null;

  const loadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult("");
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
  };

  const importRows = async () => {
    if (!rows.length) {
      setResult("Choose a CSV file first.");
      return;
    }

    setBusy(true);
    setResult(`Importing ${rows.length} ${config.label.toLowerCase()} rows...`);

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
      const payload = config.payload(row);

      if (!hasRequired(payload, config.required)) {
        skipped += 1;
        continue;
      }

      const done = await tryPost(config.endpoints, payload);
      if (done.ok) imported += 1;
      else failed += 1;
    }

    setBusy(false);
    setResult(`Done. Imported ${imported}. Skipped ${skipped}. Failed ${failed}. Refreshing is safe now.`);
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    setRows([]);
    setFileName("");
    setResult("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <button type="button" className="v3-csv-trigger" onClick={() => setOpen(true)}>
        <FileSpreadsheet size={17} />
        <span>Import {config.label} CSV</span>
      </button>

      {open && (
        <div className="v3-modal-backdrop" onClick={close}>
          <div className="v3-modal v3-csv-modal" onClick={(event) => event.stopPropagation()}>
            <div className="v3-modal-head">
              <div>
                <p className="v3-eyebrow">CSV Import</p>
                <h2>Import {config.label}</h2>
              </div>
              <button type="button" className="v3-icon-button" onClick={close}>
                <X size={18} />
              </button>
            </div>

            <div className="v3-csv-body">
              <div className="v3-csv-help">
                <b>{config.help}</b>
                <span>Use one row per record. Empty rows are ignored. Required rows without enough data are skipped.</span>
              </div>

              <label className="v3-csv-drop">
                <Upload size={22} />
                <b>{fileName || `Choose ${config.label} CSV`}</b>
                <span>{rows.length ? `${rows.length} rows ready` : "CSV only"}</span>
                <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={loadFile} />
              </label>

              {rows.length > 0 && (
                <div className="v3-csv-preview">
                  <small>Preview first row</small>
                  <pre>{JSON.stringify(rows[0], null, 2)}</pre>
                </div>
              )}

              {result && <div className="v3-notice">{result}</div>}

              <div className="v3-actions">
                <button type="button" className="v3-button dark" onClick={importRows} disabled={busy || !rows.length}>
                  {busy ? "Importing..." : `Import ${config.label}`}
                </button>
                <button type="button" className="v3-button secondary" onClick={close} disabled={busy}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
