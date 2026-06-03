import React from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const nav = [
  ["Command Board", "/dashboard", "CB"],
  ["Jobs", "/jobs", "JB"],
  ["Crew Map", "/crew-map", "MP"],
  ["Clients", "/clients", "CL"],
  ["Quotes", "/quotes", "QT"],
  ["Invoices", "/invoices", "IV"],
  ["Team", "/team", "TM"],
  ["Settings", "/settings", "ST"],
  ["Support", "/support", "?"],
];

const labels = {
  action_type: "Action type",
  job_id: "Job ID",
  quote_id: "Quote ID",
  invoice_id: "Invoice ID",
  client_id: "Client ID",
  worker_id: "Worker to assign",
  job_title: "Job",
  job_name: "Job",
  service_type: "Service type",
  status: "Status",
  job_status: "Job status",
  quote_status: "Quote status",
  invoice_status: "Invoice status",
  client_name: "Client",
  customer_name: "Customer",
  customer_email: "Customer email",
  client_email: "Client email",
  email: "Email",
  client_phone: "Phone",
  customer_phone: "Customer phone",
  phone: "Phone",
  client_address: "Client address",
  customer_address: "Customer address",
  job_address: "Job address",
  site_address: "Site address",
  address: "Address",
  scheduled_time: "Scheduled",
  scheduled_at: "Scheduled",
  schedule_date: "Schedule date",
  start_time: "Start time",
  end_time: "End time",
  worker_name: "Worker",
  assigned_worker_name: "Assigned worker",
  recommended_worker_name: "AI recommended worker",
  conflict_check: "Conflict check",
  worker_region: "Worker region",
  worker_email: "Worker email",
  worker_phone: "Worker phone",
  subtotal: "Subtotal",
  price: "Price",
  gst: "GST",
  tax: "Tax",
  gst_rate: "GST rate",
  total: "Total",
  amount: "Amount",
  amount_due: "Amount due",
  quote_number: "Quote number",
  quote_amount: "Quote amount",
  invoice_number: "Invoice number",
  due_date: "Due date",
  days_overdue: "Days overdue",
  payment_url: "Payment link",
  payment_link: "Payment link",
  online_payment_url: "Online payment link",
  bank_details: "Bank details",
  payment_instructions: "Payment instructions",
  description: "Description",
  invoice_description: "Invoice description",
  quote_description: "Quote description",
  job_description: "Job description",
  message: "Message",
  subject: "Subject",
  email_subject: "Email subject",
  email_body: "Email body",
  sms_message: "SMS message",
  follow_up_message: "Follow-up message",
  client_history: "Client history",
  client_notes: "Client notes",
  customer_notes: "Customer notes",
  job_notes: "Job notes",
  worker_note: "Worker notes",
  completion_note: "Completion note",
  time_worked: "Time worked",
  proof_summary: "Proof",
  proof_photos: "Proof photos",
  photo_count: "Photo count",
};

const hiddenEditFields = new Set([
  "business_id",
  "related_id",
  "related_entity_id",
  "source",
  "source_records",
  "checks",
  "created_at",
  "updated_at",
  "available_workers",
]);

function has(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

function clean(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? JSON.stringify(value, null, 2) : "";
  if (typeof value === "object") return Object.keys(value).length ? JSON.stringify(value, null, 2) : "";
  return String(value);
}

function first(...values) {
  for (const value of values) {
    if (has(value)) return value;
  }
  return "";
}

function money(value) {
  const raw = clean(value);
  if (!raw) return "";
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function dateText(value) {
  const raw = clean(value);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-NZ");
}

function labelFor(key) {
  return labels[key] || key.replaceAll("_", " ");
}

function getId(action) {
  return String(action?.id || action?._id || action?.action_id || "");
}

function getType(action) {
  return String(action?.action_type || action?.type || "").replaceAll("-", "_").toLowerCase();
}

function getPayload(action) {
  return { ...(action?.payload || {}), ...(action?.draft_payload || {}) };
}

function typeLabel(type) {
  const value = String(type || "").toLowerCase();
  if (value === "assign_worker" || value.includes("assign")) return "Assign worker";
  if (value.includes("invoice_draft") || value.includes("create_invoice")) return "Draft invoice";
  if (value.includes("send_invoice")) return "Send invoice";
  if (value.includes("invoice") || value.includes("payment")) return "Invoice / payment";
  if (value.includes("quote")) return "Quote follow-up";
  if (value.includes("job")) return "Job review";
  return "Prepared action";
}

function approveText(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("assign") || value.includes("worker")) return "Approve assignment";
  if (value.includes("invoice_draft") || value.includes("create_invoice")) return "Approve + create draft";
  if (value.includes("send_invoice")) return "Approve + send invoice";
  if (value.includes("reminder") || value.includes("payment")) return "Approve + send reminder";
  if (value.includes("quote")) return "Approve + send follow-up";
  if (value.includes("job")) return "Approve job action";
  return "Approve";
}

function outcome(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("assign") || value.includes("worker")) return "Assigns the selected worker to the job and logs the decision.";
  if (value.includes("invoice_draft") || value.includes("create_invoice")) return "Creates a draft invoice. It does not email the customer until approved separately.";
  if (value.includes("send_invoice")) return "Emails the invoice to the customer.";
  if (value.includes("reminder") || value.includes("payment")) return "Sends the payment reminder to the customer.";
  if (value.includes("quote")) return "Sends the quote follow-up to the customer.";
  if (value.includes("job")) return "Approves the job review action.";
  return "Runs the approved AI Operator action.";
}

function requiredFields(type) {
  const value = String(type || "").toLowerCase();

  if (value.includes("assign") || value.includes("worker")) {
    return ["job_id", "job_title", "client_name", "job_address", "worker_id"];
  }

  if (value.includes("invoice_draft") || value.includes("create_invoice")) {
    return ["job_id", "job_title", "client_name", "subtotal", "description"];
  }

  if (value.includes("send_invoice")) {
    return ["invoice_id", "invoice_number", "customer_name", "customer_email", "total"];
  }

  if (value.includes("invoice") || value.includes("payment") || value.includes("reminder")) {
    return ["invoice_id", "invoice_number", "customer_name", "customer_email", "amount_due", "message"];
  }

  if (value.includes("quote")) {
    return ["quote_id", "quote_number", "customer_name", "customer_email", "message"];
  }

  if (value.includes("job")) {
    return ["job_id", "job_title", "client_name", "worker_name"];
  }

  return ["action_type"];
}

function normalize(action) {
  const type = getType(action);
  const raw = getPayload(action);

  const form = {
    ...raw,
    action_type: type,
    job_id: first(raw.job_id, type.includes("job") || type.includes("worker") || type.includes("invoice_draft") ? action.related_entity_id : ""),
    quote_id: first(raw.quote_id, type.includes("quote") ? action.related_entity_id : ""),
    invoice_id: first(raw.invoice_id, type.includes("invoice") && !type.includes("draft") ? action.related_entity_id : ""),
    client_name: first(raw.client_name, raw.customer_name),
    customer_name: first(raw.customer_name, raw.client_name),
    customer_email: first(raw.customer_email, raw.client_email, raw.email),
    client_email: first(raw.client_email, raw.customer_email, raw.email),
    client_phone: first(raw.client_phone, raw.customer_phone, raw.phone),
    total: first(raw.total, raw.amount_due, raw.amount, raw.subtotal, raw.price, raw.quote_amount),
    amount_due: first(raw.amount_due, raw.total, raw.amount),
    description: first(raw.description, raw.invoice_description, raw.quote_description, raw.job_description, raw.worker_note, raw.message),
  };

  const missing = requiredFields(type).filter((key) => !has(form[key]));

  return {
    id: getId(action),
    type,
    ready: missing.length === 0,
    missing,
    title: action.title || typeLabel(type),
    summary: action.summary || "Prepared from connected Churvox records.",
    reason: action.reason || action.ai_reason || action.explanation || "",
    confidence: action.confidence || "",
    what_will_happen: action.what_will_happen || "",
    source_records: action.source_records || [],
    checks: action.checks || ["Related record checked", "Owner approval required"],
    form,
  };
}

function relevantKeys(form = {}, type = "", missing = []) {
  const value = String(type || form.action_type || "").toLowerCase();

  const base = [
    "client_name", "customer_name", "customer_email", "client_email", "email",
    "client_phone", "customer_phone", "phone",
    "client_address", "customer_address", "job_address", "site_address", "address",
    "job_id", "job_title", "job_name", "service_type", "job_status", "status",
    "scheduled_time", "scheduled_at", "schedule_date", "start_time", "end_time",
    "description", "invoice_description", "quote_description", "job_description",
    "message", "subject", "email_subject", "email_body", "sms_message", "follow_up_message",
    "notes", "client_notes", "customer_notes", "job_notes", "worker_note", "completion_note",
  ];

  let specific = [];

  if (value.includes("assign") || value.includes("worker")) {
    specific = [
      "worker_id", "worker_name", "recommended_worker_name", "assigned_worker_name",
      "conflict_check", "worker_region", "worker_email", "worker_phone",
      "job_id", "job_title", "job_address", "scheduled_time", "scheduled_at",
    ];
  } else if (value.includes("invoice") || value.includes("payment") || value.includes("reminder")) {
    specific = [
      "invoice_id", "invoice_number", "invoice_status", "subtotal", "gst", "tax",
      "gst_rate", "total", "amount", "amount_due", "price", "due_date", "days_overdue",
      "payment_url", "payment_link", "online_payment_url", "bank_details", "payment_instructions",
      "description", "invoice_description", "message", "email_subject", "email_body",
      "job_id", "job_title", "job_address",
    ];
  } else if (value.includes("quote")) {
    specific = [
      "quote_id", "quote_number", "quote_status", "quote_amount", "total", "price",
      "description", "quote_description", "message", "email_subject", "email_body",
      "client_name", "customer_name", "customer_email", "job_title", "job_address",
    ];
  } else if (value.includes("job")) {
    specific = [
      "job_id", "job_title", "job_name", "service_type", "job_status", "status",
      "job_address", "scheduled_time", "scheduled_at", "worker_name", "worker_id",
      "time_worked", "proof_summary", "photo_count", "completion_note", "worker_note",
    ];
  }

  const existing = Object.keys(form || {}).filter((key) => !hiddenEditFields.has(key) && typeof form[key] !== "object");
  const all = [...missing, ...specific, ...base, ...existing];
  const seen = new Set();

  return all.filter((key) => {
    if (!key || seen.has(key) || hiddenEditFields.has(key)) return false;
    seen.add(key);
    return missing.includes(key) || specific.includes(key) || base.includes(key) || has(form[key]);
  });
}

function lineItems(form = {}) {
  const possible = [form.items, form.line_items, form.lines, form.invoice_items, form.quote_items];

  for (const item of possible) {
    if (Array.isArray(item) && item.length) return item;
  }

  const description = first(form.description, form.invoice_description, form.quote_description, form.job_description, form.service_description);
  const total = first(form.total, form.amount_due, form.amount, form.price, form.subtotal, form.quote_amount);

  if (description || total) {
    return [{ description: description || "Service work", quantity: 1, rate: total || 0, total: total || 0 }];
  }

  return [];
}

function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Command Desk</div>
        </div>
      </div>

      <nav className="space-y-1">
        {nav.map(([label, href, icon]) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${
                active ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-white/10 text-[10px]">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function InfoCard({ label, value, warn }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${warn ? "text-amber-700" : "text-slate-500"}`}>
        {label}
      </div>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">
        {clean(value) || "Not found"}
      </div>
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
      <div className="mb-4">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">{title}</div>
        {note ? <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ name, form, setForm }) {
  const label = labelFor(name);

  if (name === "worker_id" && Array.isArray(form.available_workers) && form.available_workers.length) {
    return (
      <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
        <select
          value={form.worker_id || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, worker_id: event.target.value }))}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
        >
          <option value="">Choose worker</option>
          {form.available_workers.map((worker, index) => (
            <option key={worker.id || worker.email || worker.name || index} value={worker.id || worker.email || worker.name || ""}>
              {[worker.name, worker.email, worker.region, worker.reason].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const big = [
    "message", "description", "invoice_description", "quote_description", "job_description",
    "email_body", "sms_message", "follow_up_message", "client_history", "conflict_check",
    "client_notes", "customer_notes", "job_notes", "worker_note", "completion_note",
  ].includes(name);

  return (
    <label className={`rounded-2xl border p-3 ${has(form[name]) ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
      <span className={`text-[10px] font-black uppercase tracking-[.14em] ${has(form[name]) ? "text-slate-500" : "text-amber-700"}`}>
        {has(form[name]) ? label : `Missing ${label}`}
      </span>

      {big ? (
        <textarea
          rows={5}
          value={clean(form[name])}
          onChange={(event) => setForm((prev) => ({ ...prev, [name]: event.target.value }))}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
        />
      ) : (
        <input
          value={clean(form[name])}
          onChange={(event) => setForm((prev) => ({ ...prev, [name]: event.target.value }))}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
        />
      )}
    </label>
  );
}

function LineItems({ form }) {
  const items = lineItems(form);

  if (!items.length) {
    return <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No line items found yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="p-4">Item</th>
            <th className="p-4 text-right">Qty</th>
            <th className="p-4 text-right">Rate</th>
            <th className="p-4 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((line, index) => {
            const qty = first(line.quantity, line.qty, 1);
            const rate = first(line.rate, line.price, line.unit_price, line.total, line.amount);
            const total = first(line.total, line.amount, Number(qty || 1) * Number(rate || 0));

            return (
              <tr key={index} className="border-t border-slate-200">
                <td className="p-4 font-bold text-slate-950">{first(line.description, line.name, line.title, "Service work")}</td>
                <td className="p-4 text-right font-bold text-slate-700">{qty}</td>
                <td className="p-4 text-right font-bold text-slate-700">{money(rate)}</td>
                <td className="p-4 text-right font-black text-slate-950">{money(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SlipModal({ item, onClose, onChanged }) {
  const { patch, post } = useApi();
  const [form, setForm] = React.useState({ ...(item?.form || {}) });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    setForm({ ...(item?.form || {}) });
    setMessage("");
  }, [item?.id, item?.form]);

  if (!item) return null;

  const type = String(item.type || form.action_type || "").toLowerCase();
  const missing = requiredFields(type).filter((key) => !has(form[key]));
  const ready = missing.length === 0;
  const editableKeys = relevantKeys(form, type, missing);

  const total = first(form.total, form.amount_due, form.amount, form.price, form.subtotal, form.quote_amount);
  const clientName = first(form.client_name, form.customer_name, form.name);
  const clientEmail = first(form.customer_email, form.client_email, form.email);
  const clientPhone = first(form.client_phone, form.customer_phone, form.phone);
  const jobTitle = first(form.job_title, form.job_name, form.service_type);
  const jobAddress = first(form.job_address, form.site_address, form.address, form.client_address);
  const workerName = first(form.worker_name, form.assigned_worker_name, form.recommended_worker_name, form.worker_id);
  const invoiceNumber = first(form.invoice_number, form.invoice_id);
  const quoteNumber = first(form.quote_number, form.quote_id);
  const preparedMessage = first(form.message, form.email_body, form.sms_message, form.follow_up_message, form.description);
  const dueDate = first(form.due_date, form.payment_due_date);

  const allRows = Object.entries(form || {})
    .filter(([key, value]) => key && !["business_id", "related_id", "related_entity_id"].includes(key) && has(value))
    .sort(([a], [b]) => a.localeCompare(b));

  async function saveOnly() {
    setBusy(true);
    setMessage("");

    try {
      const res = await patch(`/ai/operator/slips/${item.id}`, form);

      if (res?.success === false || res?.data?.success === false) {
        throw new Error(res?.error || res?.data?.error || "Could not save slip");
      }

      toast.success("Slip saved");
      setMessage("Saved. These edited details will be used when approved.");
      if (onChanged) await onChanged();
    } catch (error) {
      toast.error(error?.message || "Could not save slip");
      setMessage(error?.message || "Could not save slip");
    } finally {
      setBusy(false);
    }
  }

  async function approveNow() {
    if (!ready) {
      const names = missing.map(labelFor).join(", ");
      toast.error(`Missing: ${names}`);
      setMessage(`Missing before approval: ${names}`);
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const saveRes = await patch(`/ai/operator/slips/${item.id}`, form);

      if (saveRes?.success === false || saveRes?.data?.success === false) {
        throw new Error(saveRes?.error || saveRes?.data?.error || "Could not save slip before approval");
      }

      const runRes = await post(`/ai/operator/actions/${item.id}/approve-send-final`, form);

      if (runRes?.success === false || runRes?.data?.success === false) {
        throw new Error(runRes?.error || runRes?.data?.error || "Approval failed");
      }

      toast.success(runRes?.data?.message || "Approved");
      if (onChanged) await onChanged();
      onClose();
    } catch (error) {
      toast.error(error?.message || "Approval failed");
      setMessage(error?.message || "Approval failed. Check the details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <section className="flex h-[100dvh] w-screen flex-col overflow-hidden">
        <header className="shrink-0 border-b border-slate-800 bg-[#0f1722] px-4 py-4 text-white md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
                {typeLabel(type)} · full screen approval slip
              </div>
              <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] md:text-5xl">
                {item.title || typeLabel(type)}
              </h1>
              <p className="mt-3 max-w-5xl text-sm font-bold leading-6 text-slate-300">
                Full approval sheet. Check the record, edit what is wrong, then approve.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-h-full w-full xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="space-y-5 p-4 md:p-6 xl:p-8">
              <section className={`rounded-[28px] border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
                <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${ready ? "text-emerald-700" : "text-amber-700"}`}>
                  {ready ? "Ready to approve" : "Needs details"}
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                  {ready ? "Required details are filled." : "Do not approve yet."}
                </h2>

                {!ready ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {missing.map((key) => (
                      <span key={key} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-900">
                        Missing {labelFor(key)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>

              <Section title="Main approval details" note="The most important things the owner needs to see first.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard label="Client / customer" value={clientName} warn={!clientName} />
                  <InfoCard label="Email" value={clientEmail} warn={(type.includes("send") || type.includes("quote") || type.includes("invoice")) && !clientEmail} />
                  <InfoCard label="Phone" value={clientPhone} />
                  <InfoCard label="Amount" value={money(total)} warn={(type.includes("invoice") || type.includes("quote")) && !total} />
                  <InfoCard label="Job" value={jobTitle} />
                  <InfoCard label="Address / site" value={jobAddress} warn={(type.includes("job") || type.includes("assign")) && !jobAddress} />
                  <InfoCard label="Worker" value={workerName} warn={(type.includes("assign") || type.includes("worker")) && !workerName} />
                  <InfoCard label="Due date" value={dateText(dueDate)} />
                  <InfoCard label="Invoice" value={invoiceNumber} />
                  <InfoCard label="Quote" value={quoteNumber} />
                  <InfoCard label="Status" value={first(form.status, form.job_status, form.invoice_status, form.quote_status)} />
                  <InfoCard label="Action type" value={typeLabel(type)} />
                </div>
              </Section>

              <Section title="What Churvox will do" note="Clear explanation before anything runs.">
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoCard label="Summary" value={item.summary || "Churvox prepared this from connected records."} />
                  <InfoCard label="When approved" value={item.what_will_happen || outcome(type)} />
                  <InfoCard label="Reason" value={item.reason || "Churvox found this action from your business records."} />
                  <InfoCard label="Prepared message / wording" value={preparedMessage} warn={(type.includes("send") || type.includes("quote") || type.includes("reminder")) && !preparedMessage} />
                </div>
              </Section>

              <Section title="Edit slip before approval" note="Fix missing or wrong information here. Saved values are used when approved.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {editableKeys.map((key) => (
                    <Field key={key} name={key} form={form} setForm={setForm} />
                  ))}
                </div>
              </Section>

              {Array.isArray(form.available_workers) && form.available_workers.length ? (
                <Section title="Available worker options" note="Worker choices Churvox found for this assignment slip.">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {form.available_workers.map((worker, index) => (
                      <div key={worker.id || worker.email || worker.name || index} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-lg font-black">{worker.name || worker.email || `Worker ${index + 1}`}</div>
                        <div className="mt-2 space-y-1 text-sm font-bold text-slate-600">
                          {worker.email ? <div>Email: {worker.email}</div> : null}
                          {worker.phone ? <div>Phone: {worker.phone}</div> : null}
                          {worker.region ? <div>Region: {worker.region}</div> : null}
                          {worker.reason ? <div>Reason: {worker.reason}</div> : null}
                          {worker.conflict ? <div className="text-amber-700">Conflict: {worker.conflict}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section title="Line items / pricing" note="Line items, descriptions and amounts Churvox found.">
                <LineItems form={form} />
              </Section>

              <Section title="All details Churvox found" note="Raw fallback view so nothing useful is hidden.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {allRows.map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {labelFor(key)}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">
                        {key.includes("date") || key.includes("_at") ? dateText(value) : clean(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <aside className="border-t border-slate-800 bg-[#0f1722] p-4 text-white md:p-6 xl:border-l xl:border-t-0">
              <section className="xl:sticky xl:top-6">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner approval</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Check, edit, approve.</h2>

                <div className="mt-5 rounded-2xl bg-white/10 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Required status</div>
                  <div className="mt-2 text-sm font-black">
                    {ready ? "Ready" : `Missing ${missing.length} field${missing.length === 1 ? "" : "s"}`}
                  </div>
                </div>

                {Array.isArray(item.checks) && item.checks.length ? (
                  <div className="mt-4 rounded-2xl bg-white/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Checks</div>
                    <ul className="mt-3 space-y-2 text-sm font-bold text-white">
                      {item.checks.map((check, index) => <li key={index}>✓ {check}</li>)}
                    </ul>
                  </div>
                ) : null}

                {Array.isArray(item.source_records) && item.source_records.length ? (
                  <div className="mt-4 rounded-2xl bg-white/10 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Linked records</div>
                    <div className="mt-3 space-y-2 text-xs font-bold text-slate-200">
                      {item.source_records.map((record, index) => (
                        <div key={index} className="rounded-xl bg-white/10 p-2">
                          {typeof record === "string" ? record : JSON.stringify(record)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {message ? (
                  <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-black text-cyan-100">
                    {message}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={saveOnly}
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Save slip changes"}
                  </button>

                  <button
                    type="button"
                    disabled={busy || !ready}
                    onClick={approveNow}
                    className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? "Running…" : approveText(type)}
                  </button>

                  {!ready ? (
                    <div className="rounded-2xl bg-amber-400/15 p-3 text-xs font-black leading-5 text-amber-100">
                      Fill the missing fields before approval unlocks.
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
                  >
                    Close slip
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </section>
    </div>
  );
}

export default function CommandDeskQueuePage() {
  const { get, post } = useApi();
  const [items, setItems] = React.useState([]);
  const [report, setReport] = React.useState(null);
  const [summary, setSummary] = React.useState(null);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await get("/ai/operator/slips");
    const rows = Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data?.actions)
        ? res.data.actions
        : [];

    setItems(rows.map(normalize));
    setReport(res?.data?.report || null);
    setSummary(res?.data?.summary || null);
  }, [get]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function rebuild() {
    setBusy(true);

    try {
      const res = await post("/ai/operator/rebuild-slips", {});

      if (res?.success) {
        const rows = Array.isArray(res?.data?.actions) ? res.data.actions : [];
        setItems(rows.map(normalize));
        setReport(res?.data?.report || null);
        setSummary(res?.data?.summary || null);
        toast.success(`Rebuilt ${rows.length} slip${rows.length === 1 ? "" : "s"}`);
      } else {
        toast.error(res?.error || "Could not rebuild slips");
      }
    } finally {
      setBusy(false);
    }
  }

  async function repairCompletedJobs() {
    setBusy(true);

    try {
      const res = await post("/ai/operator/repair-completed-jobs", {});
      const ok = res?.success && res?.data?.success !== false;

      if (ok) {
        toast.success(res?.data?.message || res?.message || "Completed jobs checked");
        await load();
      } else {
        toast.error(res?.data?.error || res?.error || "Could not check completed jobs");
      }
    } catch (error) {
      toast.error(error?.message || "Could not check completed jobs");
    } finally {
      setBusy(false);
    }
  }

  const ready = items.filter((item) => item.ready);
  const needs = items.filter((item) => !item.ready);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1 p-5 lg:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">FULL SCREEN SLIPS LIVE · forced clean page</div>
              <h1 className="text-3xl font-black tracking-[-.05em]">FULL SCREEN AI Operator slips</h1>
              <p className="text-sm font-bold text-slate-500">
                FULL SCREEN SLIPS LIVE. Old small work slip deleted. Check, edit, approve.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={repairCompletedJobs}
                disabled={busy}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-slate-900 disabled:opacity-60"
              >
                {busy ? "Checking…" : "Check completed jobs"}
              </button>

              <button
                type="button"
                onClick={rebuild}
                disabled={busy}
                className="rounded-full bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-white disabled:opacity-60"
              >
                {busy ? "Rebuilding…" : "Clear old slips + rebuild"}
              </button>
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <div className="rounded-[28px] bg-slate-950 p-6 text-white">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">
                No skinny popups
              </span>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.07em] lg:text-5xl">
                Churvox prepares. You open the full slip. Then approve.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-slate-300">
                Each slip opens full screen with main details, edit fields, worker options, line items and all raw record data.
              </p>
            </div>

            <aside className="rounded-[28px] border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-black">Queue</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <div className="text-3xl font-black text-emerald-700">{ready.length}</div>
                  <div className="text-xs font-black">ready</div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <div className="text-3xl font-black text-amber-700">{needs.length}</div>
                  <div className="text-xs font-black">needs details</div>
                </div>
              </div>
            </aside>
          </section>

          {summary ? (
            <section className="mt-5 rounded-[28px] border border-blue-200 bg-blue-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-700">AI decision engine</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-blue-950">Today Churvox found</h2>
              <p className="mt-2 text-sm font-bold text-blue-900">
                {summary.headline || "I checked the business and prepared the next actions."}
              </p>

              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                {(summary.items || []).map((summaryItem) => (
                  <div key={summaryItem} className="rounded-2xl bg-white p-3 text-sm font-black text-slate-800">
                    {summaryItem}
                  </div>
                ))}
              </div>

              {summary.needs_attention ? (
                <div className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm font-black text-amber-900">
                  {summary.needs_attention} slip{summary.needs_attention === 1 ? "" : "s"} need details before approval.
                </div>
              ) : null}
            </section>
          ) : null}

          {report ? (
            <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-black">What Churvox can see</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-3xl font-black">{report.jobs_found ?? 0}</div>
                  <div className="text-xs font-black text-slate-500">jobs</div>
                  <div className="mt-1 text-[10px] font-black text-blue-600">{report.jobs_scope_mode}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-3xl font-black">{report.quotes_found ?? 0}</div>
                  <div className="text-xs font-black text-slate-500">quotes</div>
                  <div className="mt-1 text-[10px] font-black text-blue-600">{report.quotes_scope_mode}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-3xl font-black">{report.invoices_found ?? 0}</div>
                  <div className="text-xs font-black text-slate-500">invoices</div>
                  <div className="mt-1 text-[10px] font-black text-blue-600">{report.invoices_scope_mode}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-3xl font-black">{report.slips_created ?? 0}</div>
                  <div className="text-xs font-black text-slate-500">slips created</div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
            <h2 className="text-3xl font-black tracking-[-.06em]">Prepared actions</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {items.slice(0, 24).map((item) => (
                <button
                  key={item.id || item.title}
                  type="button"
                  onClick={() => setOpen(item)}
                  className={`rounded-[22px] border p-4 text-left hover:border-blue-300 ${
                    item.ready ? "bg-white" : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className={`text-[10px] font-black uppercase tracking-[.18em] ${item.ready ? "text-blue-600" : "text-amber-700"}`}>
                    {item.ready ? "Ready" : "Needs details"} · {typeLabel(item.type)}
                  </div>

                  <div className="mt-2 text-lg font-black">{item.title}</div>

                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {item.ready ? item.summary : `Missing: ${item.missing.map(labelFor).join(", ")}`}
                  </p>

                  {item.reason ? <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{item.reason}</p> : null}

                  <div className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">
                    Open full-screen slip
                  </div>
                </button>
              ))}
            </div>

            {!items.length ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-black text-amber-900">
                No slips yet. Click rebuild. The “What Churvox can see” box will show whether jobs, quotes or invoices exist.
              </div>
            ) : null}
          </section>
        </section>
      </div>

      {open ? <SlipModal item={open} onClose={() => setOpen(null)} onChanged={load} /> : null}
    </main>
  );
}
