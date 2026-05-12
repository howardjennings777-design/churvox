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
      ["region", "Region / suburb", "text", false],
      ["service_type", "Service type / trade", "text", false],
      ["scheduled_date", "Scheduled date", "date", false],
      ["pricing_type", "Pricing type", "select", false, ["fixed", "hourly", "fixed_plus_extras", "hourly_plus_extras"]],
      ["job_price", "Fixed price", "number", false],
      ["hourly_rate", "Hourly rate", "number", false],
      ["estimated_hours", "Estimated hours", "number", false],
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
      ["region", "Region / suburb", "text", false],
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
      ["valid_until", "Valid until", "date", false],
      ["description", "Quote description", "textarea", false],
    ],
  },
  invoices: {
    label: "Invoice",
    endpoint: "/invoices",
    fields: [
      ["client_name", "Client name", "text", true],
      ["amount", "Amount", "number", false],
      ["invoice_number", "Invoice number", "text", false],
      ["due_date", "Due date", "date", false],
      ["description", "Invoice description", "textarea", false],
    ],
  },
  workers: {
    label: "Worker",
    endpoint: "/team/workers",
    fields: [
      ["name", "Worker name", "text", true],
      ["email", "Email", "email", true],
      ["phone", "Phone", "tel", false],
      ["role", "Role", "select", false, ["worker", "manager", "office_admin", "payroll"]],
      ["region", "Region", "text", false],
      ["skills", "Skills / trade experience", "textarea", false],
      ["notes", "Notes", "textarea", false],
    ],
  },
};

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export default function CreateModal({ type, onClose, onSaved }) {
  const config = CONFIG[type];
  const [form, setForm] = useState(type === "jobs" ? { pricing_type: "fixed" } : {});
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
      payload.site_address = payload.address || payload.site_address;
      payload.job_price = normalizeNumber(payload.job_price);
      payload.fixed_price = payload.job_price;
      payload.price = payload.job_price;
      payload.hourly_rate = normalizeNumber(payload.hourly_rate);
      payload.estimated_hours = normalizeNumber(payload.estimated_hours);
      payload.total = payload.job_price || undefined;
    }

    if (type === "quotes" || type === "invoices") {
      payload.amount = normalizeNumber(payload.amount) || 0;
      payload.total = payload.amount;
      payload.status = payload.status || "draft";
    }

    if (type === "workers") {
      payload.role = payload.role || "worker";
      payload.status = payload.status || "active";
    }

    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

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
        {config.fields.map(([name, label, inputType, required, options]) => (
          <label key={name}>
            <span>{label}{required ? " *" : ""}</span>
            {inputType === "textarea" ? (
              <textarea
                rows={3}
                required={required}
                value={form[name] || ""}
                onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
              />
            ) : inputType === "select" ? (
              <select
                required={required}
                value={form[name] || options?.[0] || ""}
                onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
              >
                {(options || []).map((option) => (
                  <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
                ))}
              </select>
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

        {type === "jobs" ? (
          <section className="op-warning-soft">
            Pricing stays owner/admin-side. Workers should not see fixed price, hourly rate, or pricing type.
          </section>
        ) : null}

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
