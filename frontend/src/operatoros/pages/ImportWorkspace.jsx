import { useRef, useState } from "react";
import { apiFetch } from "../api";
import FloatingLogo from "../components/FloatingLogo";

function downloadTemplate(type) {
  const rows = type === "clients"
    ? [["client_name", "contact_name", "email", "phone", "address", "notes"], ["ABC Property", "Sarah", "sarah@example.com", "021123456", "12 Main St", "Gate code 1234"]]
    : [["name", "email", "phone", "role", "region", "skills", "notes"], ["Wiremu", "worker@example.com", "021123456", "worker", "Naenae", "Mowing, hedges", "Available weekdays"]];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = type === "clients" ? "churvox-clients-template.csv" : "churvox-workers-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportWorkspace({ data }) {
  const clientRef = useRef(null);
  const workerRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function upload(type, file) {
    if (!file) return;
    setBusy(type);
    setNotice("");

    const form = new FormData();
    form.append("file", file);

    const paths = type === "clients"
      ? ["/clients/import-csv"]
      : ["/team/workers/import-csv", "/team/import-csv", "/workers/import-csv"];

    let lastError = null;

    for (const path of paths) {
      try {
        await apiFetch(path, { method: "POST", body: form });
        setNotice(`${type === "clients" ? "Clients" : "Workers"} imported. Churvox can now prepare better AI actions.`);
        await data.reload?.();
        setBusy("");
        return;
      } catch (error) {
        lastError = error;
      }
    }

    setNotice(lastError?.message || "CSV upload needs review.");
    setBusy("");
  }

  return (
    <main className="op-workspace">
      <section className="op-import-hero">
        <div>
          <p>IMPORT CENTRE</p>
          <h1>Bring your business data in once.</h1>
          <span>Import clients and workers first so Churvox can recommend assignments and prepare admin.</span>
        </div>
        <FloatingLogo small />
      </section>

      {notice ? <section className="op-notice">{notice}</section> : null}

      <section className="op-two-grid">
        <article className="op-panel">
          <header><div><p>CLIENT CSV</p><h2>Upload clients</h2></div></header>
          <p>Recommended columns: client_name, contact_name, email, phone, address, notes.</p>
          <footer>
            <button onClick={() => downloadTemplate("clients")}>Download template</button>
            <button className="primary" disabled={busy === "clients"} onClick={() => clientRef.current?.click()}>{busy === "clients" ? "Uploading..." : "Upload client CSV"}</button>
          </footer>
          <input ref={clientRef} hidden type="file" accept=".csv,text/csv" onChange={(e) => upload("clients", e.target.files?.[0])} />
        </article>

        <article className="op-panel">
          <header><div><p>WORKER CSV</p><h2>Upload workers</h2></div></header>
          <p>Recommended columns: name, email, phone, role, region, skills, notes.</p>
          <footer>
            <button onClick={() => downloadTemplate("workers")}>Download template</button>
            <button className="primary" disabled={busy === "workers"} onClick={() => workerRef.current?.click()}>{busy === "workers" ? "Uploading..." : "Upload worker CSV"}</button>
          </footer>
          <input ref={workerRef} hidden type="file" accept=".csv,text/csv" onChange={(e) => upload("workers", e.target.files?.[0])} />
        </article>
      </section>
    </main>
  );
}
