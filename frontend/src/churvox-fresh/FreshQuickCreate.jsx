import React from "react";

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

const quick = {
  job: {
    title: "New job",
    badge: "Job setup",
    page: "jobs",
    primary: "Create job draft",
    fields: [
      { key: "client", label: "Client", value: "Aroha Property Care" },
      { key: "title", label: "Job title", value: "Lawn service" },
      { key: "scheduled", label: "Scheduled", value: "Today 10:00" },
      { key: "worker", label: "Worker", value: "Unassigned" },
      { key: "price", label: "Price", value: "$85 fixed" },
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
      { key: "client", label: "Client", value: "Birchville Rentals" },
      { key: "title", label: "Quote title", value: "Driveway clean" },
      { key: "amount", label: "Amount", value: "240" },
      { key: "status", label: "Status", value: "Draft" },
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
      { key: "email", label: "Email", value: "client@example.co.nz" },
      { key: "phone", label: "Phone", value: "027 000 0000" },
      { key: "address", label: "Service address", value: "Street, suburb" },
      { key: "billingEmail", label: "Billing email", value: "accounts@example.co.nz" },
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

function buildRecord(type, form, note) {
  if (type === "job") {
    return {
      id: `job-${Date.now()}`,
      title: form.title || "New job",
      client: form.client || "New client",
      address: form.address || "Service address",
      status: "Ready",
      worker: form.worker || "Unassigned",
      scheduled: form.scheduled || "Not scheduled",
      price: form.price || "$0",
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

  return (
    <div className="freshSlipOverlay" onClick={onClose}>
      <section className="freshQuickModal" onClick={(event) => event.stopPropagation()}>
        <header className="freshSlipHead">
          <span>{item.badge}</span>
          <h2>{item.title}</h2>
          <p>{item.note}</p>
        </header>

        <div className="freshQuickBody">
          {item.fields.map((field) => (
            <label className="freshField" key={field.key}>
              <span>{field.label}</span>
              <input value={form[field.key] || ""} onChange={(event) => updateField(field.key, event.target.value)} />
            </label>
          ))}

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
