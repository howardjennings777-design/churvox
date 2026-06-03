import React from "react";

const hiddenKeys = new Set([
  "__v",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authToken",
  "business_id",
]);

const importantGroups = [
  {
    title: "Customer / client",
    keys: [
      "client_name",
      "customer_name",
      "name",
      "client_email",
      "customer_email",
      "email",
      "client_phone",
      "customer_phone",
      "phone",
      "mobile",
      "client_address",
      "customer_address",
      "address",
      "site_address",
      "job_address",
    ],
  },
  {
    title: "Work / job",
    keys: [
      "job_title",
      "job_name",
      "title",
      "service_type",
      "job_status",
      "status",
      "scheduled_at",
      "scheduled_time",
      "schedule_date",
      "start_time",
      "end_time",
      "worker_name",
      "assigned_worker_name",
      "recommended_worker_name",
      "worker_id",
      "completion_note",
      "job_notes",
      "worker_note",
      "proof_summary",
      "photo_count",
      "time_worked",
    ],
  },
  {
    title: "Money / invoice / quote",
    keys: [
      "invoice_number",
      "invoice_id",
      "quote_number",
      "quote_id",
      "invoice_status",
      "quote_status",
      "payment_status",
      "subtotal",
      "gst",
      "tax",
      "total",
      "amount",
      "amount_due",
      "balance_due",
      "price",
      "quote_amount",
      "due_date",
      "days_overdue",
      "payment_url",
      "payment_link",
      "bank_details",
      "payment_instructions",
    ],
  },
  {
    title: "Message / notes",
    keys: [
      "description",
      "invoice_description",
      "quote_description",
      "job_description",
      "message",
      "subject",
      "email_subject",
      "email_body",
      "sms_message",
      "follow_up_message",
      "notes",
      "client_notes",
      "customer_notes",
    ],
  },
];

function has(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

function labelFor(key = "") {
  return String(key)
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function valueFor(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (!value.length) return "";
    return value
      .slice(0, 12)
      .map((item) => (typeof item === "object" ? JSON.stringify(item, null, 2) : String(item)))
      .join("\n");
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function flatten(value, prefix = "", rows = [], depth = 0) {
  if (!has(value) || depth > 3) return rows;

  if (Array.isArray(value)) {
    rows.push([prefix || "items", valueFor(value)]);
    return rows;
  }

  if (typeof value !== "object") {
    rows.push([prefix || "value", valueFor(value)]);
    return rows;
  }

  Object.entries(value).forEach(([key, child]) => {
    if (!key || hiddenKeys.has(key) || key.toLowerCase().includes("password") || key.toLowerCase().includes("token")) return;
    if (!has(child)) return;

    const next = prefix ? `${prefix}.${key}` : key;

    if (typeof child === "object" && !Array.isArray(child) && depth < 2) {
      flatten(child, next, rows, depth + 1);
    } else {
      rows.push([next, valueFor(child)]);
    }
  });

  return rows;
}

function findValue(record, key) {
  if (!record || typeof record !== "object") return "";
  if (has(record[key])) return record[key];

  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value) && has(value[key])) {
      return value[key];
    }
  }

  return "";
}

function pick(record, keys) {
  for (const key of keys) {
    const value = findValue(record, key);
    if (has(value)) return valueFor(value);
  }
  return "";
}

function DetailCard({ label, value, warn }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${warn ? "text-amber-700" : "text-slate-500"}`}>
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">
        {value || "Not found"}
      </div>
    </div>
  );
}

export default function CommandSlipEverything({ record, extra, context = "Work slip" }) {
  const merged = {
    ...(record && typeof record === "object" ? record : {}),
    ...(extra && typeof extra === "object" ? extra : {}),
  };

  const summaryCards = [
    ["Client", pick(merged, ["client_name", "customer_name", "name", "client"])],
    ["Email", pick(merged, ["client_email", "customer_email", "email"])],
    ["Phone", pick(merged, ["client_phone", "customer_phone", "phone", "mobile"])],
    ["Address / site", pick(merged, ["job_address", "site_address", "client_address", "customer_address", "address"])],
    ["Job / work", pick(merged, ["job_title", "job_name", "title", "service_type"])],
    ["Worker", pick(merged, ["worker_name", "assigned_worker_name", "recommended_worker_name", "worker_id"])],
    ["Invoice", pick(merged, ["invoice_number", "invoice_id"])],
    ["Quote", pick(merged, ["quote_number", "quote_id"])],
    ["Status", pick(merged, ["status", "job_status", "invoice_status", "quote_status", "payment_status"])],
    ["Amount", pick(merged, ["total", "amount_due", "balance_due", "amount", "subtotal", "price", "quote_amount"])],
    ["Due date", pick(merged, ["due_date", "payment_due_date"])],
    ["Description / note", pick(merged, ["description", "invoice_description", "quote_description", "job_description", "message", "notes"])],
  ];

  const allRows = flatten(merged)
    .filter(([key, value]) => key && value)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <section
      className="churvox-slip-everything rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"
      data-marker="CHURVOX_SLIP_EVERYTHING_PANEL"
    >
      <div className="mb-5">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
          Everything Churvox found
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">
          Full {context} details
        </h2>
        <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-slate-600">
          Check the customer, job, worker, money, notes, message, status and linked record details before approving or opening the record.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value]) => (
          <DetailCard key={label} label={label} value={value} warn={!value && ["Client", "Status", "Amount"].includes(label)} />
        ))}
      </div>

      <div className="mt-5 rounded-[26px] border border-blue-200 bg-blue-50 p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
          Owner checklist
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 text-sm font-black text-blue-950">1. Check who this affects.</div>
          <div className="rounded-2xl bg-white p-4 text-sm font-black text-blue-950">2. Check money, dates and status.</div>
          <div className="rounded-2xl bg-white p-4 text-sm font-black text-blue-950">3. Edit the real record if anything is wrong.</div>
          <div className="rounded-2xl bg-white p-4 text-sm font-black text-blue-950">4. Approve only when it looks right.</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          Raw record details
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {allRows.slice(0, 80).map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {labelFor(key)}
              </div>
              <div className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">
                {value}
              </div>
            </div>
          ))}
        </div>

        {!allRows.length ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-900">
            No extra record fields were found for this slip yet.
          </div>
        ) : null}
      </div>

      <div className="mt-5 rounded-[26px] border border-amber-200 bg-amber-50 p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
          Approval safety
        </div>
        <p className="mt-2 text-sm font-black leading-6 text-amber-950">
          Churvox can prepare the admin, but the owner approves. Do not auto-send, auto-charge, auto-delete, auto-sync accounting, or change payroll from a slip without explicit owner approval.
        </p>
      </div>
    </section>
  );
}
