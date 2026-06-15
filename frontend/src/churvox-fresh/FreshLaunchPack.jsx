import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const templates = [
  {
    name: "Clients CSV",
    file: "churvox-clients-template.csv",
    headers: ["client_name", "contact_name", "email", "phone", "address", "suburb", "notes"],
    sample: ["Belmont Customer", "John", "hello@churvox.com", "021000000", "1 Example Street", "Belmont", "Prefers Fridays"],
  },
  {
    name: "Team CSV",
    file: "churvox-team-template.csv",
    headers: ["name", "email", "phone", "role", "hourly_rate", "region", "status"],
    sample: ["Tama Worker", "hello@churvox.com", "021111111", "Worker", "28", "Lower Hutt", "Active"],
  },
  {
    name: "Jobs CSV",
    file: "churvox-jobs-template.csv",
    headers: ["job_title", "client_name", "address", "date", "time", "price", "assigned_to", "status", "notes"],
    sample: ["Fortnightly lawn mow", "Belmont Customer", "1 Example Street", "2026-06-12", "09:00", "65", "Tama Worker", "Assigned", "Front and back lawn"],
  },
  {
    name: "Invoices CSV",
    file: "churvox-invoices-template.csv",
    headers: ["invoice_number", "client_name", "job_title", "issue_date", "due_date", "amount", "gst", "status", "notes"],
    sample: ["INV-1001", "Belmont Customer", "Fortnightly lawn mow", "2026-06-12", "2026-06-19", "65", "8.48", "Draft", "Check extras before sending"],
  },
  {
    name: "Services CSV",
    file: "churvox-services-template.csv",
    headers: ["service_name", "category", "default_price", "gst_rate", "description"],
    sample: ["Lawn mowing", "Lawn care", "65", "15", "Standard residential lawn mow"],
  },
  {
    name: "Quotes CSV",
    file: "churvox-quotes-template.csv",
    headers: ["quote_number", "client_name", "quote_title", "issue_date", "amount", "status", "follow_up_date", "notes"],
    sample: ["Q-1001", "Upper Hutt Lead", "Garden reset", "2026-06-12", "190", "Draft", "2026-06-14", "Overgrown lawn and hedge"],
  },
  {
    name: "Payroll CSV",
    file: "churvox-payroll-template.csv",
    headers: ["staff_name", "period_start", "period_end", "hours", "rate", "gross_pay", "notes"],
    sample: ["Tama Worker", "2026-06-08", "2026-06-14", "32", "28", "896", "Export only, no tax filing"],
  },
];

const checklistDefaults = [
  ["Core app opens", "Ready"],
  ["Mobile/tablet layout checked", "Needs test"],
  ["CSV templates available", "Ready"],
  ["Pricing shows + GST", "Needs test"],
  ["Stripe return/current plan checked", "Needs test"],
  ["Jobs → invoice flow tested", "Needs test"],
  ["Worker acknowledge/start/complete tested", "Needs test"],
  ["Command approvals tested", "Needs test"],
  ["Support email visible", "Ready"],
  ["Demo data/reset available", "Ready"],
];

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function downloadCsv(template) {
  const csv = [template.headers, template.sample].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = template.file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function sendLaunchSlip(onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `launchpack-${Date.now()}`,
      group: "Launch Pack",
      title: "Launch readiness needs owner review",
      info: "CSV templates, mobile test, pricing and core flow",
      urgency: "High",
      found: "Churvox launch pack is ready for final owner checks.",
      prepared: "Run mobile QA, test jobs-to-invoice flow, check pricing and download CSV templates.",
      why: "This is the fastest path to a controlled beta launch today.",
      owner: "Approve launch pack, fix blockers, or open QA.",
      area: "Launch Pack",
      page: "launchpack",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 30)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "launchpack-command" } }));
  } catch {
    // Preview still works without storage.
  }

  onNavigate?.("command");
}

export default function FreshLaunchPack({ onNavigate }) {
  const [checklist, setChecklist] = React.useState(checklistDefaults);
  const [preview, setPreview] = React.useState("");
  const ready = checklist.filter(([, status]) => status === "Ready").length;
  const needs = checklist.length - ready;

  function updateStatus(index, status) {
    setChecklist((current) => current.map((item, itemIndex) => (itemIndex === index ? [item[0], status] : item)));
  }

  function copyHeaders(template) {
    navigator.clipboard?.writeText(template.headers.join(","));
  }

  function loadDemoCommand() {
    sendLaunchSlip(onNavigate);
  }

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setPreview(text.split("\n").slice(0, 6).join("\n"));
    };
    reader.readAsText(file);
  }

  return (
    <section className="freshLaunchPackPage">
      <div className="freshLaunchPackHero">
        <div>
          <span>Launch Pack</span>
          <h1>Everything a new user needs to start fast</h1>
          <p>CSV templates, import preview, export prep, demo controls and a launch checklist so Churvox feels ready instead of half-set-up.</p>
        </div>

        <div className="freshLaunchPackStats">
          <div><b>{templates.length}</b><small>CSV templates</small></div>
          <div><b>{ready}</b><small>ready</small></div>
          <div><b>{needs}</b><small>needs test</small></div>
          <div><b>Beta</b><small>launch mode</small></div>
        </div>
      </div>

      <div className="freshLaunchPackGrid">
        <article className="freshLaunchPackPanel freshLaunchPackWide">
          <header>
            <span>CSV templates</span>
            <h2>Download clean import files</h2>
            <p>These cover the basic old-app style setup: clients, team, jobs, invoices, services, quotes and payroll export.</p>
          </header>

          <div className="freshLaunchPackTemplates">
            {templates.map((template) => (
              <section key={template.file}>
                <div>
                  <b>{template.name}</b>
                  <p>{template.headers.join(", ")}</p>
                </div>
                <div>
                  <button type="button" onClick={() => downloadCsv(template)}>Download</button>
                  <button type="button" onClick={() => copyHeaders(template)}>Copy headings</button>
                </div>
              </section>
            ))}
          </div>
        </article>

        <article className="freshLaunchPackPanel">
          <header>
            <span>Checklist</span>
            <h2>Launch readiness</h2>
            <p>Do not full-launch until these are green. Controlled beta is okay once the core passes.</p>
          </header>

          <div className="freshLaunchPackChecklist">
            {checklist.map(([item, status], index) => (
              <label key={item}>
                <span>{item}</span>
                <select value={status} onChange={(event) => updateStatus(index, event.target.value)}>
                  <option>Ready</option>
                  <option>Needs test</option>
                  <option>Blocked</option>
                </select>
              </label>
            ))}
          </div>
        </article>

        <article className="freshLaunchPackPanel">
          <header>
            <span>Import preview</span>
            <h2>Check a CSV</h2>
            <p>Preview first rows before importing. Backend saving can come next, but users can see the format now.</p>
          </header>

          <input className="freshLaunchPackFile" type="file" accept=".csv,text/csv" onChange={handleFile} />
          <pre>{preview || "Choose a CSV file to preview the first rows here."}</pre>

          <div className="freshLaunchPackButtons">
            <button type="button" onClick={loadDemoCommand}>Send launch check to Command</button>
            <button type="button" onClick={() => onNavigate?.("imports")}>Open Imports</button>
            <button type="button" onClick={() => onNavigate?.("exports")}>Open Exports</button>
            <button type="button" onClick={() => onNavigate?.("qa")}>Open QA</button>
            <button type="button" onClick={() => onNavigate?.("smart")}>Open Smart Hub</button>
          </div>
        </article>
      </div>
    </section>
  );
}
