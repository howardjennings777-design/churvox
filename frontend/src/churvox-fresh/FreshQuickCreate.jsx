import React from "react";
import { useApi } from "../hooks/useApi";

const storageKeys = {
  job: "churvox:fresh-jobs:v1",
  quote: "churvox:fresh-quotes:v1",
  client: "churvox:fresh-clients:v1",
};

const fallbackRecords = {
  job: [],
  quote: [],
  client: [],
};

const fallbackWorkers = ["Unassigned"];
const fallbackClients = ["New client", "Aroha Property Care", "Birchville Rentals"];

function todayDate() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

const quick = {
  job: {
    title: "New job",
    badge: "Job setup",
    page: "jobs",
    primary: "Create job draft",
    fields: [
      { key: "client", label: "Client", value: "Aroha Property Care", type: "clientSelect" },
      { key: "title", label: "Job title", value: "Lawn service" },
      { key: "scheduledDate", label: "Scheduled date", value: todayDate(), type: "date" },
      { key: "scheduledTime", label: "Scheduled time", value: "10:00", type: "time" },
      { key: "worker", label: "Worker", value: "Unassigned", type: "workerSelect" },
      { key: "priceAmount", label: "Price", value: "85", type: "number" },
      { key: "priceType", label: "Billing type", value: "fixed", type: "select", options: ["fixed", "hourly", "fixed + extras", "hourly + extras"] },
      { key: "address", label: "Address", value: "Lower Hutt" },
    ],
    note: "Create a job draft, assign worker, add notes, then send any risky setup to Command.",
  },
  quote: {
    title: "New quote",
    badge: "Quote setup",
    page: "quotes",
    primary: "Create quote draft",
    fields: [
      { key: "client", label: "Client", value: "Birchville Rentals", type: "clientSelect" },
      { key: "title", label: "Quote title", value: "Driveway clean" },
      { key: "amount", label: "Amount", value: "240", type: "number" },
      { key: "status", label: "Status", value: "Draft", type: "select", options: ["Draft", "Ready to send", "Sent"] },
    ],
    note: "Draft the quote first. Follow-ups should be approved from Command.",
  },
  client: {
    title: "Add client",
    badge: "Client setup",
    page: "clients",
    primary: "Create client",
    fields: [
      { key: "name", label: "Client name", value: "New client" },
      { key: "email", label: "Email", value: "hello@churvox.com", type: "email" },
      { key: "phone", label: "Phone", value: "027 000 0000", type: "tel" },
      { key: "address", label: "Service address", value: "Street, suburb" },
      { key: "billingEmail", label: "Billing email", value: "hello@churvox.com", type: "email" },
    ],
    note: "Clean client setup keeps invoices, reminders and Command boxes accurate.",
  },
};

function readList(type) {
  try {
    if (typeof window === "undefined") return fallbackRecords[type] || [];

    const saved = window.localStorage.getItem(storageKeys[type]);
    if (!saved) return fallbackRecords[type] || [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallbackRecords[type] || [];
  } catch {
    return fallbackRecords[type] || [];
  }
}

function writeList(type, list) {
  try {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(storageKeys[type], JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent("churvox:fresh-data-updated", {
        detail: { type },
      })
    );
  } catch {
    // Fresh preview keeps working even if local storage is unavailable.
  }
}

function numberFrom(value) {
  return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

function listFrom(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function nameFrom(record, fallback) {
  return record?.name || record?.full_name || record?.display_name || record?.client_name || record?.business_name || fallback;
}

function uniqueValues(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatScheduled(dateValue, timeValue) {
  if (!dateValue && !timeValue) return "Not scheduled";
  let dateLabel = dateValue || "Today";

  try {
    if (dateValue) {
      const parsed = new Date(`${dateValue}T00:00:00`);
      if (Number.isFinite(parsed.getTime())) {
        dateLabel = parsed.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
      }
    }
  } catch {
    dateLabel = dateValue || "Today";
  }

  return `${dateLabel}${timeValue ? ` ${timeValue}` : ""}`.trim();
}

function priceLabel(form) {
  const amount = numberFrom(form.priceAmount || form.price);
  const type = form.priceType || "fixed";
  return amount ? `$${amount} ${type}` : form.price || "$0 fixed";
}

function buildRecord(type, form, note) {
  if (type === "job") {
    return {
      id: `job-${Date.now()}`,
      title: form.title || "New job",
      client: form.client || "New client",
      address: form.address || "Service address",
      status: "Ready",
      worker: form.worker || "Unassigned",
      scheduled: formatScheduled(form.scheduledDate, form.scheduledTime),
      scheduledDate: form.scheduledDate || "",
      scheduledTime: form.scheduledTime || "",
      price: priceLabel(form),
      notes: note || "Created from Quick Create.",
      risk: "New job draft",
    };
  }

  if (type === "quote") {
    const amount = numberFrom(form.amount);

    return {
      id: `QT-${Date.now().toString().slice(-5)}`,
      client: form.client || "New client",
      title: form.title || "New quote",
      status: form.status || "Draft",
      amount,
      age: "Created now",
      followUp: "Not sent yet",
      note: note || "Created from Quick Create.",
      lines: [`${form.title || "New quote"} · $${amount}`],
    };
  }

  return {
    id: `client-${Date.now()}`,
    name: form.name || "New client",
    type: "Customer",
    status: form.billingEmail ? "Active" : "Needs setup",
    email: form.email || "",
    phone: form.phone || "",
    address: form.address || "",
    billingEmail: form.billingEmail || "",
    notes: note || "Created from Quick Create.",
    risk: form.billingEmail ? "Clean setup" : "Billing detail missing",
    value: "$0 new",
  };
}

export default function FreshQuickCreate({ type, onClose, onNavigate }) {
  const item = quick[type] || quick.job;
  const { get } = useApi();
  const [workers, setWorkers] = React.useState(fallbackWorkers);
  const [clients, setClients] = React.useState(fallbackClients);

  const startingForm = React.useMemo(() => {
    return item.fields.reduce((values, field) => {
      values[field.key] = field.value;
      return values;
    }, {});
  }, [item]);

  const [form, setForm] = React.useState(startingForm);
  const [note, setNote] = React.useState(item.note);

  React.useEffect(() => {
    setForm(startingForm);
    setNote(item.note);
  }, [startingForm, item.note]);

  React.useEffect(() => {
    let alive = true;

    async function loadOptions() {
      try {
        const [teamRes, clientRes] = await Promise.allSettled([
          get("/team/workers"),
          get("/clients"),
        ]);

        if (!alive) return;

        if (teamRes.status === "fulfilled" && teamRes.value?.success) {
          const names = listFrom(teamRes.value.data).map((member, index) => nameFrom(member, `Worker ${index + 1}`));
          setWorkers(uniqueValues(["Unassigned", ...names]));
        }

        if (clientRes.status === "fulfilled" && clientRes.value?.success) {
          const names = listFrom(clientRes.value.data).map((client, index) => nameFrom(client, `Client ${index + 1}`));
          setClients(uniqueValues([...names, ...fallbackClients]));
        }
      } catch {
        // Keep fallback dropdowns available even if an endpoint is offline.
      }
    }

    loadOptions();
    return () => {
      alive = false;
    };
  }, [get]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function createRecord() {
    const current = readList(type);
    const record = buildRecord(type, form, note);

    writeList(type, [record, ...current]);

    onNavigate?.(item.page);
    onClose?.();
  }

  function openPage() {
    onNavigate?.(item.page);
    onClose?.();
  }

  function renderField(field) {
    const value = form[field.key] || "";

    if (field.type === "workerSelect") {
      const options = uniqueValues([value, ...workers, "Unassigned"]);
      return (
        <select value={value} onChange={(event) => updateField(field.key, event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    if (field.type === "clientSelect") {
      const options = uniqueValues([value, ...clients, "New client"]);
      return (
        <select value={value} onChange={(event) => updateField(field.key, event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    if (field.type === "select") {
      const options = uniqueValues([value, ...(field.options || [])]);
      return (
        <select value={value} onChange={(event) => updateField(field.key, event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={value}
        min={field.type === "number" ? "0" : undefined}
        step={field.type === "number" ? "1" : undefined}
        onChange={(event) => updateField(field.key, event.target.value)}
      />
    );
  }

  return (
    <div className="freshSlipOverlay" onClick={onClose}>
      <section className="freshQuickModal" onClick={(event) => event.stopPropagation()}>
        <header className="freshSlipHead">
          <span>{item.badge}</span>
          <h2>{item.title}</h2>
          <p>{item.note}</p>
        </header>

        <div className="freshQuickBody">
          <div className="freshQuickFields">
            {item.fields.map((field) => (
              <label className={`freshField freshField-${field.key}`} key={field.key}>
                <span>{field.label}</span>
                {renderField(field)}
              </label>
            ))}
          </div>

          <label className="freshField">
            <span>Owner notes</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          <div className="freshSlipActions">
            <button className="freshPrimary" onClick={createRecord}>{item.primary}</button>
            <button className="freshOrange" onClick={openPage}>Open {item.page}</button>
            <button className="freshDark" onClick={() => onNavigate?.("command")}>Send to Command</button>
            <button className="freshGhost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </section>
    </div>
  );
}
