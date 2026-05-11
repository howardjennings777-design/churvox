import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./importCentrePage.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function uploadCsv(paths, file) {
  const t = token();
  let lastError = "";

  for (const path of paths) {
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
        method: "POST",
        credentials: "include",
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        body: data,
      });

      const text = await res.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }

      if (!res.ok) throw new Error(payload?.detail || payload?.message || `${path} failed`);
      return payload;
    } catch (e) {
      lastError = e.message;
    }
  }

  throw new Error(lastError || "CSV upload failed");
}

function downloadTemplate(type) {
  const rows =
    type === "clients"
      ? [
          ["client_name", "contact_name", "email", "phone", "address", "notes"],
          ["ABC Property", "Sarah", "sarah@example.com", "021123456", "12 Main St", "Gate code 1234"],
        ]
      : [
          ["name", "email", "phone", "role", "region", "skills", "notes"],
          ["Wiremu", "worker@example.com", "021123456", "worker", "Naenae", "Mowing, hedges", "Available weekdays"],
        ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = type === "clients" ? "churvox-clients-template.csv" : "churvox-workers-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function saveLocalFallback(type, fileName, error) {
  try {
    const key = "churvox_import_fallback";
    const rows = JSON.parse(localStorage.getItem(key) || "[]");
    rows.unshift({ type, fileName, error, created_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(rows.slice(0, 30)));
  } catch {}
}

function ResultBox({ result }) {
  if (!result) return null;

  return (
    <section className="import-result">
      <strong>{result.type === "workers" ? "Worker import result" : "Client import result"}</strong>
      <div>
        <span>Imported: {result.imported ?? 0}</span>
        <span>Skipped: {result.skipped ?? 0}</span>
        <span>Total: {result.total ?? 0}</span>
      </div>
      {Array.isArray(result.errors) && result.errors.length ? (
        <details>
          <summary>Rows needing review</summary>
          {result.errors.slice(0, 10).map((err, index) => (
            <p key={index}>Line {err.line}: {err.reason}</p>
          ))}
        </details>
      ) : null}
    </section>
  );
}

export default function ImportCentrePage() {
  const clientRef = useRef(null);
  const workerRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [clientResult, setClientResult] = useState(null);
  const [workerResult, setWorkerResult] = useState(null);

  async function handleUpload(type, file) {
    if (!file) return;
    setBusy(type);
    setNotice("");

    try {
      const result =
        type === "clients"
          ? await uploadCsv(["/clients/import-csv"], file)
          : await uploadCsv(["/team/workers/import-csv", "/team/import-csv", "/workers/import-csv"], file);

      if (type === "clients") setClientResult(result);
      else setWorkerResult(result);

      setNotice(`${type === "clients" ? "Clients" : "Workers"} imported. Review skipped rows if any.`);
    } catch (e) {
      saveLocalFallback(type, file.name, e.message);
      setNotice(`${e.message}. The file was noted locally so the owner knows it needs review.`);
    } finally {
      setBusy("");
      if (clientRef.current) clientRef.current.value = "";
      if (workerRef.current) workerRef.current.value = "";
    }
  }

  return (
    <main className="import-page">
      <section className="import-hero">
        <div>
          <p>IMPORT CENTRE</p>
          <h1>Upload clients and workers by CSV.</h1>
          <span>
            Bring your existing customer list and team into Churvox fast. AI can help once the app has clients,
            workers and jobs to work with.
          </span>
        </div>
        <Link to="/onboarding">Back to setup</Link>
      </section>

      {notice ? <section className="import-notice">{notice}</section> : null}

      <section className="import-grid">
        <article className="import-card">
          <div>
            <p>CLIENT CSV</p>
            <h2>Upload clients</h2>
            <span>Recommended columns: client_name, contact_name, email, phone, address, notes.</span>
          </div>

          <input
            ref={clientRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => handleUpload("clients", e.target.files?.[0])}
          />

          <footer>
            <button type="button" onClick={() => downloadTemplate("clients")}>Download template</button>
            <button type="button" onClick={() => clientRef.current?.click()} disabled={busy === "clients"}>
              {busy === "clients" ? "Uploading..." : "Upload client CSV"}
            </button>
            <Link to="/clients">Open clients</Link>
          </footer>

          <ResultBox result={clientResult} />
        </article>

        <article className="import-card">
          <div>
            <p>WORKER CSV</p>
            <h2>Upload workers</h2>
            <span>Recommended columns: name, email, phone, role, region, skills, notes.</span>
          </div>

          <input
            ref={workerRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => handleUpload("workers", e.target.files?.[0])}
          />

          <footer>
            <button type="button" onClick={() => downloadTemplate("workers")}>Download template</button>
            <button type="button" onClick={() => workerRef.current?.click()} disabled={busy === "workers"}>
              {busy === "workers" ? "Uploading..." : "Upload worker CSV"}
            </button>
            <Link to="/team">Open team</Link>
          </footer>

          <ResultBox result={workerResult} />
        </article>
      </section>

      <section className="import-help">
        <strong>AI setup tip</strong>
        <p>
          Import clients first, then workers, then create jobs. Once those records exist,
          the AI Work Queue can suggest worker assignments, invoice drafts, reminders and follow-ups.
        </p>
        <Link to="/ai-approvals">Open AI Work Queue</Link>
      </section>
    </main>
  );
}
