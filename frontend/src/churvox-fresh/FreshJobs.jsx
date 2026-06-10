import React from "react";

const JOB_STORAGE_KEY = "churvox:fresh-jobs:v1";
const INVOICE_STORAGE_KEY = "churvox:fresh-invoices:v1";

const seedJobs = [
  {
    id: "job-1001",
    title: "Lawn service",
    client: "Aroha Property Care",
    address: "Naenae, Lower Hutt",
    status: "Ready",
    worker: "Matiu Rangi",
    scheduled: "Today · 10:00 AM",
    price: "$85 fixed",
    notes: "Front lawn, edges, blower tidy. Photos required after completion.",
    risk: "Ready to dispatch",
  },
  {
    id: "job-1002",
    title: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    address: "Lower Hutt",
    status: "In progress",
    worker: "Ana Williams",
    scheduled: "Today · 1:30 PM",
    price: "$140 fixed",
    notes: "Weed beds, trim entry hedge, remove green waste.",
    risk: "Worker on site",
  },
  {
    id: "job-1003",
    title: "Driveway clean",
    client: "Birchville Rentals",
    address: "Upper Hutt",
    status: "Blocked",
    worker: "Unassigned",
    scheduled: "Tomorrow · 9:00 AM",
    price: "$240 quote",
    notes: "Tenant access not confirmed. Need owner approval before dispatch.",
    risk: "Access missing",
  },
];

const filters = ["All", "Ready", "In progress", "Blocked", "Completed"];

function numberFrom(value) {
  return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

function readInvoices() {
  try {
    if (typeof window === "undefined") return [];

    const saved = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInvoices(invoices) {
  try {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(invoices));
    window.dispatchEvent(
      new CustomEvent("churvox:fresh-data-updated", {
        detail: { type: "invoice" },
      })
    );
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function loadJobs() {
  try {
    if (typeof window === "undefined") return seedJobs;

    const saved = window.localStorage.getItem(JOB_STORAGE_KEY);
    if (!saved) return seedJobs;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedJobs;
  } catch {
    return seedJobs;
  }
}

export default function FreshJobs({ onNavigate }) {
  const [jobs, setJobs] = React.useState(loadJobs);
  const [selectedId, setSelectedId] = React.useState(jobs[0]?.id || "");
  const [filter, setFilter] = React.useState("All");

  const selected = jobs.find((job) => job.id === selectedId) || jobs[0];
  const visibleJobs = filter === "All" ? jobs : jobs.filter((job) => job.status === filter);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [jobs]);

  function updateSelectedJob(patch) {
    if (!selected) return;

    setJobs((current) =>
      current.map((job) =>
        job.id === selected.id
          ? { ...job, ...patch }
          : job
      )
    );
  }

  function resetJobs() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(JOB_STORAGE_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setJobs(seedJobs);
    setSelectedId(seedJobs[0].id);
    setFilter("All");
  }

  function createInvoiceDraft() {
    if (!selected) return;

    const amount = numberFrom(selected.price);
    const invoice = {
      id: `INV-${Date.now().toString().slice(-5)}`,
      client: selected.client,
      job: selected.title,
      status: "Draft",
      amount,
      gst: Number((amount * 0.15).toFixed(2)),
      due: "Due in 7 days",
      sync: "Not synced yet",
      note: `Created from job: ${selected.title}. Owner must approve before sending.`,
      lines: [
        `${selected.title} · ${selected.price || "$0"}`,
        `Worker · ${selected.worker || "Unassigned"}`,
        `Notes · ${selected.notes || "No notes"}`,
      ],
    };

    const currentInvoices = readInvoices();
    writeInvoices([invoice, ...currentInvoices]);

    updateSelectedJob({
      status: "Completed",
      risk: "Invoice draft created",
    });

    onNavigate?.("invoices");
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Jobs</span>
        <h1>Jobs</h1>
        <p>Create, schedule, assign, price and complete work. Risky jobs should be pushed back to Command.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{jobs.length}</h2>
          <p>Total jobs</p>
        </aside>
        <aside className="freshCard">
          <h2>{jobs.filter((job) => job.status === "Ready").length}</h2>
          <p>Ready</p>
        </aside>
        <aside className="freshCard">
          <h2>{jobs.filter((job) => job.status === "Blocked").length}</h2>
          <p>Blocked</p>
        </aside>
      </section>

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{item === "All" ? jobs.length : jobs.filter((job) => job.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Job list</h2>

          {visibleJobs.map((job) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === job.id ? "active" : ""} ${job.status === "Blocked" ? "need" : ""}`}
              key={job.id}
              onClick={() => setSelectedId(job.id)}
            >
              <b>{job.title}</b>
              <span>{job.client} · {job.status} · {job.scheduled}</span>
            </button>
          ))}

          {visibleJobs.length === 0 && (
            <div className="freshItem">
              <b>No jobs</b>
              <span>Change filter or reset the preview jobs.</span>
            </div>
          )}
        </aside>

        <section className="freshCard">
          <h2>{selected?.title || "Select job"}</h2>

          {selected && (
            <>
              <div className="freshMiniGrid">
                <div>
                  <span>Client</span>
                  <b>{selected.client}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{selected.status}</b>
                </div>
                <div>
                  <span>Worker</span>
                  <b>{selected.worker}</b>
                </div>
                <div>
                  <span>Price</span>
                  <b>{selected.price}</b>
                </div>
              </div>

              <label className="freshField">
                <span>Address</span>
                <input
                  value={selected.address}
                  onChange={(event) => updateSelectedJob({ address: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Scheduled</span>
                <input
                  value={selected.scheduled}
                  onChange={(event) => updateSelectedJob({ scheduled: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Job notes</span>
                <textarea
                  value={selected.notes}
                  onChange={(event) => updateSelectedJob({ notes: event.target.value })}
                />
              </label>

              <div className="freshItem need">
                <b>Command check</b>
                <span>{selected.risk}</span>
              </div>
            </>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={() => updateSelectedJob({ status: "Ready", risk: "Ready to dispatch" })}>
              Mark ready
            </button>
            <button className="freshOrange" onClick={() => updateSelectedJob({ status: "In progress", risk: "Worker on site" })}>
              Start job
            </button>
            <button className="freshDark" onClick={() => updateSelectedJob({ status: "Completed", risk: "Ready for invoice draft" })}>
              Complete job
            </button>
            <button className="freshPrimary" onClick={createInvoiceDraft}>
              Create invoice draft
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send issue to Command
            </button>
            <button className="freshGhost" onClick={resetJobs}>
              Reset jobs
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
