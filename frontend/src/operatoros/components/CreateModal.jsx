import { useState } from "react";
import { apiFetch } from "../api";
import DetailDrawer from "./DetailDrawer";

const CONFIG = {
  jobs: {
    label: "Job",
    endpoint: "/jobs",
    fields: [
      ["title", "Job title", "text", true],
      ["client_name", "Client name", "text", false],
      ["address", "Job address", "text", false],
      ["scheduled_date", "Scheduled date", "date", false],
      ["description", "Job notes", "textarea", false],
    ],
  },
  clients: {
    label: "Client",
    endpoint: "/clients",
    fields: [
      ["client_name", "Client name", "text", true],
      ["contact_name", "Contact name", "text", false],
      ["email", "Email", "email", false],
      ["phone", "Phone", "tel", false],
      ["address", "Address", "text", false],
      ["notes", "Notes", "textarea", false],
    ],
  },
  quotes: {
    label: "Quote",
    endpoint: "/quotes",
    fields: [
      ["title", "Quote title", "text", true],
      ["client_name", "Client name", "text", false],
      ["amount", "Amount", "number", false],
      ["description", "Quote description", "textarea", false],
    ],
  },
  invoices: {
    label: "Invoice",
    endpoint: "/invoices",
    fields: [
      ["client_name", "Client name", "text", true],
      ["amount", "Amount", "number", false],
      ["description", "Invoice description", "textarea", false],
      ["due_date", "Due date", "date", false],
    ],
  },
  workers: {
    label: "Worker",
    endpoint: "/team/workers",
    fields: [
      ["name", "Worker name", "text", true],
      ["email", "Email", "email", true],
      ["phone", "Phone", "tel", false],
      ["role", "Role", "text", false],
      ["region", "Region", "text", false],
      ["skills", "Skills", "text", false],
    ],
  },
};

export default function CreateModal({ type, onClose, onSaved }) {
  const config = CONFIG[type];
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!config) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const payload = { ...form };

    if (type === "clients") {
      payload.name = payload.client_name || payload.name;
      payload.customer_name = payload.client_name || payload.customer_name;
    }

    if (type === "jobs") {
      payload.job_title = payload.title || payload.job_title;
      payload.status = payload.status || "draft";
    }

    if (type === "quotes" || type === "invoices") {
      payload.total = Number(payload.amount || payload.total || 0);
      payload.status = payload.status || "draft";
    }

    if (type === "workers") {
      payload.role = payload.role || "worker";
    }

    try {
      await apiFetch(config.endpoint, { method: "POST", body: payload });
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DetailDrawer
      open
      title={`Create ${config.label}`}
      eyebrow="CREATE"
      onClose={onClose}
    >
      {error ? <section className="op-error">{error}</section> : null}

      <form className="op-form" onSubmit={submit}>
        {config.fields.map(([name, label, inputType, required]) => (
          <label key={name}>
            <span>{label}{required ? " *" : ""}</span>
            {inputType === "textarea" ? (
              <textarea
                rows={3}
                required={required}
                value={form[name] || ""}
                onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
              />
            ) : (
              <input
                type={inputType}
                required={required}
                value={form[name] || ""}
                onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
              />
            )}
          </label>
        ))}

        <footer>
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Saving..." : `Save ${config.label}`}
          </button>
        </footer>
      </form>
    </DetailDrawer>
  );
}
