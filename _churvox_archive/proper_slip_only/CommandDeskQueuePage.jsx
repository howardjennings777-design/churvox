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
  job_id: "Job ID",
  quote_id: "Quote ID",
  invoice_id: "Invoice ID",
  job_title: "Job",
  client_name: "Client",
  customer_name: "Customer",
  customer_email: "Customer email",
  client_phone: "Phone",
  client_address: "Client address",
  job_address: "Job address",
  scheduled_time: "Scheduled",
  worker_id: "Worker to assign",
  worker_name: "Worker",
  recommended_worker_name: "AI recommended",
  conflict_check: "Why this worker",
  subtotal: "Amount",
  price: "Price",
  gst_rate: "GST",
  total: "Total",
  amount_due: "Amount due",
  description: "Invoice description",
  message: "Message",
  quote_number: "Quote number",
  quote_amount: "Quote amount",
  invoice_number: "Invoice number",
  due_date: "Due date",
  days_overdue: "Days overdue",
  client_history: "Client history",
  worker_note: "Worker notes",
  time_worked: "Time worked",
  proof_summary: "Proof",
};

const fieldOrder = [
  "client_name", "customer_name", "customer_email", "client_phone", "client_address", "client_history",
  "job_title", "job_address", "scheduled_time", "worker_id", "worker_name", "recommended_worker_name", "conflict_check",
  "quote_number", "quote_amount", "invoice_number", "total", "amount_due", "due_date", "days_overdue",
  "subtotal", "price", "gst_rate", "description", "message", "worker_note", "time_worked", "proof_summary",
  "job_id", "quote_id", "invoice_id",
];

const hidden = new Set(["available_workers", "business_id", "related_id", "related_entity_id", "source", "net_minutes"]);

function has(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function value(...items) {
  return items.find(has) || "";
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
  if (type === "assign_worker") return "Assign worker";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Draft invoice";
  if (type === "send_invoice") return "Send invoice";
  if (type === "invoice_reminder") return "Payment reminder";
  if (type.includes("quote")) return "Quote follow-up";
  if (type.includes("job_review")) return "Job review";
  return "Prepared action";
}

function approveText(type) {
  if (type === "assign_worker") return "Approve assignment";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Approve + create draft";
  if (type === "send_invoice") return "Approve + send invoice";
  if (type === "invoice_reminder") return "Approve + send reminder";
  if (type.includes("quote")) return "Approve + send follow-up";
  if (type.includes("job_review")) return "Approve review";
  return "Approve";
}

function outcome(type) {
  if (type === "assign_worker") return "Assigns the selected worker to the job and logs the decision.";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Creates a draft invoice only. It does not email the customer.";
  if (type === "send_invoice") return "Approves the slip and emails the invoice to the customer.";
  if (type === "invoice_reminder") return "Approves the slip and emails the payment reminder to the customer.";
  if (type.includes("quote")) return "Approves the slip and emails the quote follow-up to the customer.";
  if (type.includes("job_review")) return "Approves the job review and moves time toward payroll review.";
  return "Approval blocked until this slip has a known action.";
}

function required(type) {
  if (type === "assign_worker") return ["job_id", "job_title", "client_name", "job_address", "worker_id"];
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return ["job_id", "job_title", "client_name", "subtotal", "description"];
  if (type === "send_invoice") return ["invoice_id", "invoice_number", "customer_name", "customer_email", "total"];
  if (type === "invoice_reminder") return ["invoice_id", "invoice_number", "customer_name", "customer_email", "amount_due", "message"];
  if (type.includes("quote")) return ["quote_id", "quote_number", "customer_name", "customer_email", "message"];
  if (type.includes("job_review")) return ["job_id", "job_title", "client_name", "worker_name"];
  return ["action_type"];
}

function normalize(action) {
  const type = getType(action);
  const raw = getPayload(action);
  const form = {
    ...raw,
    action_type: type,
    job_id: value(raw.job_id, (type.includes("job") || type.includes("worker") || type.includes("invoice_draft")) ? action.related_entity_id : ""),
    quote_id: value(raw.quote_id, type.includes("quote") ? action.related_entity_id : ""),
    invoice_id: value(raw.invoice_id, (type.includes("invoice") && !type.includes("draft")) ? action.related_entity_id : ""),
    client_name: value(raw.client_name, raw.customer_name),
    customer_name: value(raw.customer_name, raw.client_name),
    total: value(raw.total, raw.amount, raw.subtotal, raw.price),
    amount_due: value(raw.amount_due, raw.total, raw.amount),
    description: value(raw.description, raw.invoice_description, raw.worker_note),
  };
  const missing = required(type).filter((key) => !has(form[key]));
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
    checks: action.checks || ["Client record checked", "Related record checked", "Owner approval required"],
    form,
  };
}

function fieldKeys(form, missing = []) {
  const out = [];
  fieldOrder.forEach((key) => {
    if (!hidden.has(key) && has(form[key])) out.push(key);
  });
  missing.forEach((key) => {
    if (!out.includes(key) && !hidden.has(key)) out.push(key);
  });
  Object.keys(form || {}).forEach((key) => {
    if (!out.includes(key) && !hidden.has(key) && has(form[key]) && typeof form[key] !== "object") out.push(key);
  });
  return out;
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
            <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}>
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-white/10 text-[10px]">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Field({ name, form, setForm }) {
  const label = labels[name] || name.replaceAll("_", " ");
  if (name === "worker_id" && Array.isArray(form.available_workers) && form.available_workers.length) {
    return (
      <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
        <select value={form.worker_id || ""} onChange={(e) => setForm((prev) => ({ ...prev, worker_id: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
          <option value="">Choose worker</option>
          {form.available_workers.map((worker) => (
            <option key={worker.id || worker.email || worker.name} value={worker.id || worker.email}>
              {[worker.name, worker.region, worker.reason].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const big = ["message", "description", "worker_note", "client_history", "conflict_check"].includes(name);
  return (
    <label className={`rounded-2xl border p-3 ${has(form[name]) ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
      <span className={`text-[10px] font-black uppercase tracking-[.14em] ${has(form[name]) ? "text-slate-500" : "text-amber-700"}`}>
        {has(form[name]) ? label : `Missing ${label}`}
      </span>
      {big ? (
        <textarea rows={name === "message" || name === "description" ? 5 : 3} value={form[name] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" />
      ) : (
        <input value={form[name] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" />
      )}
    </label>
  );
}


// CHURVOX_FULL_RECORD_SLIP_HELPERS_START
function slipClean(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : "";
  if (typeof value === "object") return Object.keys(value).length ? JSON.stringify(value, null, 2) : "";
  return String(value);
}

function slipFirst(...values) {
  for (const value of values) {
    const cleaned = slipClean(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function slipMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n === 0) return slipClean(value);
  return n.toLocaleString(undefined, { style: "currency", currency: "NZD" });
}

function slipDate(value) {
  const cleaned = slipClean(value);
  if (!cleaned) return "";
  const d = new Date(cleaned);
  if (Number.isNaN(d.getTime())) return cleaned;
  return d.toLocaleString();
}

function slipTitleFor(item, form) {
  const type = String(item?.type || form?.action_type || "").toLowerCase();
  if (type.includes("invoice")) return "Invoice approval slip";
  if (type.includes("quote")) return "Quote approval slip";
  if (type.includes("worker") || type.includes("assign")) return "Worker assignment slip";
  if (type.includes("job")) return "Job review slip";
  if (type.includes("payment")) return "Payment follow-up slip";
  return "Approval slip";
}

function slipActionLabel(item, form) {
  const type = String(item?.type || form?.action_type || "").toLowerCase();
  if (type.includes("invoice")) return "Approve + send invoice";
  if (type.includes("quote") && type.includes("follow")) return "Approve + send follow-up";
  if (type.includes("quote")) return "Approve + send quote";
  if (type.includes("worker") || type.includes("assign")) return "Approve assignment";
  if (type.includes("payment")) return "Approve payment action";
  if (type.includes("job")) return "Approve job action";
  return "Approve action";
}

function slipTone(item, form) {
  const type = String(item?.type || form?.action_type || "").toLowerCase();
  if (type.includes("invoice")) return "Invoice";
  if (type.includes("quote")) return "Quote";
  if (type.includes("worker") || type.includes("assign")) return "Worker";
  if (type.includes("job")) return "Job";
  if (type.includes("payment")) return "Payment";
  return "Action";
}

function slipPick(form, keys) {
  return keys.map((key) => [key, form?.[key]]).filter(([, value]) => slipClean(value));
}

function slipLineItems(form) {
  const possible = [
    form?.items,
    form?.line_items,
    form?.lines,
    form?.invoice_items,
    form?.quote_items,
  ];

  for (const value of possible) {
    if (Array.isArray(value) && value.length) return value;
  }

  const description = slipFirst(form?.description, form?.invoice_description, form?.quote_description, form?.job_description, form?.service_description);
  const total = slipFirst(form?.total, form?.amount_due, form?.amount, form?.price, form?.subtotal);

  if (description || total) {
    return [{ description: description || "Service work", quantity: 1, rate: total || 0, total: total || 0 }];
  }

  return [];
}

function SlipInfoCard({ label, value, warn }) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${warn ? "text-amber-700" : "text-slate-500"}`}>{label}</div>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">
        {slipClean(value) || "Not found"}
      </div>
    </div>
  );
}

function SlipSection({ title, note, children }) {
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

function SlipKeyValues({ form, rows }) {
  const picked = slipPick(form, rows);
  if (!picked.length) {
    return <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No details found yet.</div>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {picked.map(([key, value]) => (
        <SlipInfoCard key={key} label={labels?.[key] || key.replaceAll("_", " ")} value={key.includes("date") || key.includes("_at") ? slipDate(value) : value} />
      ))}
    </div>
  );
}

function SlipLineItems({ form }) {
  const items = slipLineItems(form);

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
            const qty = slipFirst(line.quantity, line.qty, 1);
            const rate = slipFirst(line.rate, line.price, line.unit_price, line.total, line.amount);
            const total = slipFirst(line.total, line.amount, Number(qty || 1) * Number(rate || 0));
            return (
              <tr key={index} className="border-t border-slate-200">
                <td className="p-4 font-bold text-slate-950">{slipFirst(line.description, line.name, line.title, "Service work")}</td>
                <td className="p-4 text-right font-bold text-slate-700">{qty}</td>
                <td className="p-4 text-right font-bold text-slate-700">{slipMoney(rate)}</td>
                <td className="p-4 text-right font-black text-slate-950">{slipMoney(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SlipRawDetails({ form }) {
  const skip = new Set([
    "available_workers",
    "items",
    "line_items",
    "lines",
    "invoice_items",
    "quote_items",
  ]);

  const rows = Object.entries(form || {})
    .filter(([key, value]) => !skip.has(key) && slipClean(value))
    .sort(([a], [b]) => a.localeCompare(b));

  if (!rows.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(([key, value]) => (
        <SlipInfoCard key={key} label={labels?.[key] || key.replaceAll("_", " ")} value={value} />
      ))}
    </div>
  );
}
// CHURVOX_FULL_RECORD_SLIP_HELPERS_END


function SlipModal({ item, onClose, onChanged }) {
  const { patch, post } = useApi();
  const [form, setForm] = React.useState({ ...(item?.form || {}) });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    setForm({ ...(item?.form || {}) });
    setMessage("");
  }, [item?.id]);

  if (!item) return null;

  const title = slipTitleFor(item, form);
  const tone = slipTone(item, form);
  const approveLabel = slipActionLabel(item, form);
  const missing = Array.isArray(item.missing) ? item.missing : [];
  const ready = missing.length === 0;
  const total = slipFirst(form.total, form.amount_due, form.amount, form.price, form.subtotal);
  const clientName = slipFirst(form.client_name, form.customer_name, form.name);
  const clientEmail = slipFirst(form.client_email, form.customer_email, form.email);
  const clientPhone = slipFirst(form.client_phone, form.customer_phone, form.phone);
  const jobAddress = slipFirst(form.job_address, form.address, form.site_address, form.client_address);
  const description = slipFirst(form.description, form.invoice_description, form.quote_description, form.job_description, form.message);

  async function saveOnly() {
    setBusy(true);
    setMessage("");
    try {
      const res = await patch(`/ai/operator/slips/${item.id}`, form);
      if (res?.success === false || res?.data?.success === false) {
        throw new Error(res?.error || res?.data?.error || "Could not save slip");
      }
      setMessage("Saved. Churvox will use these details when approved.");
      if (onChanged) await onChanged();
    } catch (err) {
      setMessage(err?.message || "Could not save slip");
    } finally {
      setBusy(false);
    }
  }

  async function approveNow() {
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

      setMessage("Approved. Churvox has run the action.");
      if (onChanged) await onChanged();
      onClose();
    } catch (err) {
      setMessage(err?.message || "Approval failed. Check the missing details and try again.");
    } finally {
      setBusy(false);
    }
  }

  const editableKeys = fieldKeys(form, missing);

  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/80 p-0 backdrop-blur-sm">
      <section className="flex h-screen w-screen flex-col overflow-hidden bg-[#f5f7f1] text-slate-950">
        <header className="shrink-0 border-b border-slate-800 bg-[#0f1722] p-4 text-white md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">{tone} slip</div>
              <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.055em] md:text-5xl">
                {title}
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-6 text-slate-300">
                Everything Churvox found is inside this slip. Check it, edit anything missing, then approve.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
            >
              Close
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5">
              {!ready ? (
                <section className="rounded-[28px] border border-amber-300 bg-amber-50 p-5 text-amber-950">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Needs checking</div>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">Missing info before approval</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missing.map((key) => (
                      <span key={key} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-800">
                        {labels?.[key] || key.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Ready</div>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">This slip has the required details.</h3>
                </section>
              )}

              <SlipSection title="Decision summary" note="The basic details the owner should see first.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SlipInfoCard label="Client" value={clientName} warn={!clientName} />
                  <SlipInfoCard label="Email" value={clientEmail} warn={!clientEmail && String(item.type || "").includes("send")} />
                  <SlipInfoCard label="Phone" value={clientPhone} />
                  <SlipInfoCard label="Total / amount" value={slipMoney(total)} warn={String(item.type || "").includes("invoice") && !total} />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <SlipInfoCard label="Address / site" value={jobAddress} />
                  <SlipInfoCard label="Description / message" value={description} warn={!description} />
                </div>
              </SlipSection>

              <SlipSection title="Client details" note="Contact and customer information pulled into the slip.">
                <SlipKeyValues
                  form={form}
                  rows={[
                    "client_name", "customer_name", "client_email", "customer_email", "email",
                    "client_phone", "customer_phone", "phone", "client_address", "customer_address",
                    "site_access", "gate_code", "client_notes", "customer_notes", "unpaid_balance",
                  ]}
                />
              </SlipSection>

              <SlipSection title="Job details" note="The related job, site, notes and work context.">
                <SlipKeyValues
                  form={form}
                  rows={[
                    "job_id", "job_title", "job_name", "service_type", "job_status", "status",
                    "job_address", "address", "site_address", "scheduled_at", "schedule_date",
                    "start_time", "end_time", "assigned_worker_name", "worker_name", "worker_id",
                    "job_notes", "worker_note", "completion_note", "photo_count", "proof_photos",
                  ]}
                />
              </SlipSection>

              <SlipSection title="Invoice / quote details" note="Amounts, line items, descriptions and payment details.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SlipInfoCard label="Invoice number" value={slipFirst(form.invoice_number, form.invoice_id)} />
                  <SlipInfoCard label="Quote number" value={slipFirst(form.quote_number, form.quote_id)} />
                  <SlipInfoCard label="Status" value={slipFirst(form.invoice_status, form.quote_status, form.status)} />
                  <SlipInfoCard label="Subtotal" value={slipMoney(form.subtotal)} />
                  <SlipInfoCard label="GST" value={slipMoney(form.gst, form.tax)} />
                  <SlipInfoCard label="Total" value={slipMoney(total)} />
                  <SlipInfoCard label="Due date" value={slipDate(form.due_date)} />
                  <SlipInfoCard label="Payment link" value={slipFirst(form.payment_url, form.payment_link, form.online_payment_url)} />
                  <SlipInfoCard label="Bank details" value={slipFirst(form.bank_details, form.payment_instructions)} />
                </div>

                <div className="mt-4">
                  <SlipLineItems form={form} />
                </div>
              </SlipSection>

              <SlipSection title="Message Churvox prepared" note="This is the wording/customer message that will be used when approved.">
                <div className="grid gap-3">
                  <SlipInfoCard label="Message" value={slipFirst(form.message, form.email_body, form.sms_message, form.follow_up_message)} warn={!slipFirst(form.message, form.email_body, form.sms_message, form.follow_up_message) && String(item.type || "").includes("send")} />
                  <SlipInfoCard label="Subject" value={slipFirst(form.subject, form.email_subject)} />
                  <SlipInfoCard label="Description" value={slipFirst(form.description, form.invoice_description, form.quote_description)} />
                </div>
              </SlipSection>

              <SlipSection title="Editable slip fields" note="Edit inside the slip. These saved values are what Churvox uses when you approve.">
                <div className="grid gap-3 md:grid-cols-2">
                  {editableKeys.map((key) => (
                    <Field key={key} name={key} form={form} setForm={setForm} />
                  ))}
                </div>
              </SlipSection>

              <SlipSection title="All details Churvox found" note="Fallback view so nothing important is hidden.">
                <SlipRawDetails form={form} />
              </SlipSection>
            </div>

            <aside className="space-y-5">
              <section className="sticky top-4 rounded-[32px] border border-slate-900 bg-[#0f1722] p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.22)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner approval</div>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">Check then approve</h3>

                <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-300">
                  <p>{item.summary || "Churvox prepared this from connected records."}</p>
                  {item.reason ? <p><span className="text-white">Reason:</span> {item.reason}</p> : null}
                  {item.what_will_happen ? <p><span className="text-white">When approved:</span> {item.what_will_happen}</p> : null}
                </div>

                {Array.isArray(item.checks) && item.checks.length ? (
                  <div className="mt-5 rounded-2xl bg-white/10 p-4">
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
                    {busy ? "Running…" : approveLabel}
                  </button>

                  {!ready ? (
                    <div className="rounded-2xl bg-amber-400/15 p-3 text-xs font-black leading-5 text-amber-100">
                      Fill the missing fields before approval unlocks.
                    </div>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}) {
  const { patch, post } = useApi();
  const [form, setForm] = React.useState(item.form);
  const [busy, setBusy] = React.useState(false);
  const missing = required(item.type).filter((key) => !has(form[key]));
  const ready = missing.length === 0;

  const save = async () => {
    setBusy(true);
    const res = await patch(`/ai/operator/slips/${item.id}`, form);
    setBusy(false);
    if (res?.success) {
      toast.success("Slip saved");
      onChanged();
      onClose();
    } else {
      toast.error(res?.error || "Could not save slip");
    }
  };

  const approve = async () => {
    const sendTypes = new Set(["send_invoice", "invoice_reminder", "quote_follow_up"]);
    const isSendSlip = sendTypes.has(item.type) || item.type.includes("quote");

    if (!ready) {
      toast.error(`Missing: ${missing.map((key) => labels[key] || key).join(", ")}`);
      return;
    }

    setBusy(true);
    const res = await post(`/ai/operator/actions/${item.id}/approve-send-final`, form);
    setBusy(false);

    const appOk = res?.success && res?.data?.success !== false;
    const shouldClose = appOk && res?.data?.close !== false;

    if (appOk) {
      toast.success(res?.data?.message || (isSendSlip ? "Approved + sent with branded PDF" : "Approved"));
      if (shouldClose) {
        onClose();
        await onChanged();
      }
      return;
    }

    toast.error(res?.data?.error || res?.error || (isSendSlip ? "Could not send" : "Could not approve"));
  };

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex  w-full  flex-col overflow-hidden  border border-white/40 bg-[#f5f7f1] shadow-2xl h-screen w-screen max-h-screen max-w-none rounded-none">
        <header className="relative rounded-t-[32px] bg-[#0f1722] p-5 pr-16 text-white sm:p-6 sm:pr-20">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg font-black text-white hover:bg-white/20"
            aria-label="Close"
          >
            ×
          </button>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">{ready ? "Ready to approve" : "Needs details"}</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.06em] sm:text-4xl">{typeLabel(item.type)}</h1>
          <p className="mt-2 text-sm font-bold text-slate-300">{item.summary}</p>
        </header>

        <main className="grid flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[1fr_340px]">
          <section className="space-y-4 pb-2">
            <div className={`rounded-[24px] border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <h2 className="text-2xl font-black">{ready ? "Looks ready — check then approve" : "Do not approve yet"}</h2>
              <p className="mt-2 text-sm font-bold text-slate-700">
                {ready ? "Required details are filled. Check customer, job, amount, worker and wording before approving." : `Missing: ${missing.map((key) => labels[key] || key).join(", ")}`}
              </p>
            </div>

            <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-5">
              <h2 className="text-xl font-black text-blue-950">Why Churvox suggests this</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-blue-900">{item.reason || "Churvox found this action from your business records."}</p>
              {item.confidence ? <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">Confidence {item.confidence}%</div> : null}
              {item.what_will_happen ? <div className="mt-3 rounded-2xl bg-white p-3 text-sm font-black text-slate-800">When approved: {item.what_will_happen}</div> : null}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black">All details Churvox found</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">Fill missing fields here or fix the original client/job/quote/invoice record and rebuild.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {fieldKeys(form, missing).map((key) => <Field key={key} name={key} form={form} setForm={setForm} />)}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black">Checks</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {item.checks.map((check) => <div key={check} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">✓ {check}</div>)}
              </div>
              {item.source_records?.length ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Source records</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.source_records.map((record, index) => (
                      <span key={`${record.type || "record"}-${record.id || index}`} className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                        {record.type || "record"} · {String(record.id || "").slice(-8)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside>
            <div className="rounded-[24px] bg-[#143658] p-5 text-white">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">When you approve</div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-200">{outcome(item.type)}</p>
              {!ready && <button onClick={save} disabled={busy} className="mt-5 w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? "Saving…" : "Save details"}</button>}
              <button onClick={approve} disabled={busy || !ready} className="mt-3 w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? (["send_invoice", "invoice_reminder", "quote_follow_up"].includes(item.type) || item.type.includes("quote") ? "Approving + sending…" : "Approving…") : approveText(item.type)}</button>
              <button onClick={onClose} className="mt-3 w-full rounded-2xl border border-white/15 px-5 py-3 text-sm font-black hover:bg-white/10">Close</button>
            </div>
          </aside>
        </main>
      </div>
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
    const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.actions) ? res.data.actions : [];
    setItems(rows.map(normalize));
    setReport(res?.data?.report || null);
    setSummary(res?.data?.summary || null);
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  const rebuild = async () => {
    setBusy(true);
    const res = await post("/ai/operator/rebuild-slips", {});
    setBusy(false);
    if (res?.success) {
      const rows = Array.isArray(res?.data?.actions) ? res.data.actions : [];
      setItems(rows.map(normalize));
      setReport(res?.data?.report || null);
      setSummary(res?.data?.summary || null);
      toast.success(`Rebuilt ${rows.length} slip${rows.length === 1 ? "" : "s"}`);
    } else {
      toast.error(res?.error || "Could not rebuild slips");
    }
  };

  const repairCompletedJobs = async () => {
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
    } catch (err) {
      toast.error(err?.message || "Could not check completed jobs");
    } finally {
      setBusy(false);
    }
  };

  const ready = items.filter((item) => item.ready);
  const needs = items.filter((item) => !item.ready);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-5 lg:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Command Board · clean strong slips</div>
              <h1 className="text-3xl font-black tracking-[-.05em]">Real slips only.</h1>
              <p className="text-sm font-bold text-slate-500">One slip system. Old weak AI actions are cleared, then rebuilt from real jobs, clients, quotes and invoices.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={repairCompletedJobs} disabled={busy} className="rounded-full border border-slate-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-slate-900 disabled:opacity-60">
                {busy ? "Checking…" : "Check completed jobs"}
              </button>
              <button onClick={rebuild} disabled={busy} className="rounded-full bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-white disabled:opacity-60">
                {busy ? "Rebuilding…" : "Clear old slips + rebuild"}
              </button>
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <div className="rounded-[28px] bg-slate-950 p-6 text-white">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">No guessing approvals</span>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.07em] lg:text-5xl">Churvox prepares. You check. Then approve.</h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-slate-300">A slip must show the client, record, amount, worker or message needed before it can run.</p>
            </div>

            <aside className="rounded-[28px] border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-black">Queue</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-3xl font-black text-emerald-700">{ready.length}</div><div className="text-xs font-black">ready</div></div>
                <div className="rounded-2xl bg-amber-50 p-4"><div className="text-3xl font-black text-amber-700">{needs.length}</div><div className="text-xs font-black">needs details</div></div>
              </div>
            </aside>
          </section>

          {summary && (
            <section className="mt-5 rounded-[28px] border border-blue-200 bg-blue-50 p-5">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-700">AI decision engine</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-blue-950">Today Churvox found</h2>
              <p className="mt-2 text-sm font-bold text-blue-900">{summary.headline || "I checked the business and prepared the next actions."}</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                {(summary.items || []).map((item) => (
                  <div key={item} className="rounded-2xl bg-white p-3 text-sm font-black text-slate-800">{item}</div>
                ))}
              </div>
              {summary.needs_attention ? <div className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm font-black text-amber-900">{summary.needs_attention} slip{summary.needs_attention === 1 ? "" : "s"} need details before approval.</div> : null}
            </section>
          )}

          {report && (
            <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-black">What Churvox can see</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.jobs_found ?? 0}</div><div className="text-xs font-black text-slate-500">jobs</div><div className="mt-1 text-[10px] font-black text-blue-600">{report.jobs_scope_mode}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.quotes_found ?? 0}</div><div className="text-xs font-black text-slate-500">quotes</div><div className="mt-1 text-[10px] font-black text-blue-600">{report.quotes_scope_mode}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.invoices_found ?? 0}</div><div className="text-xs font-black text-slate-500">invoices</div><div className="mt-1 text-[10px] font-black text-blue-600">{report.invoices_scope_mode}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.slips_created ?? 0}</div><div className="text-xs font-black text-slate-500">slips created</div></div>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
            <h2 className="text-3xl font-black tracking-[-.06em]">Prepared actions</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {items.slice(0, 12).map((item) => (
                <button key={item.id || item.title} onClick={() => setOpen(item)} className={`rounded-[22px] border p-4 text-left hover:border-blue-300 ${item.ready ? "bg-white" : "border-amber-200 bg-amber-50"}`}>
                  <div className={`text-[10px] font-black uppercase tracking-[.18em] ${item.ready ? "text-blue-600" : "text-amber-700"}`}>
                    {item.ready ? "Ready" : "Needs details"} · {typeLabel(item.type)}
                  </div>
                  <div className="mt-2 text-lg font-black">{item.title}</div>
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {item.ready ? item.summary : `Missing: ${item.missing.map((key) => labels[key] || key).join(", ")}`}
                  </p>
                  {item.reason ? <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{item.reason}</p> : null}
                  {item.reason ? <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{item.reason}</p> : null}
                  {item.reason ? <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{item.reason}</p> : null}
                  {item.reason ? <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{item.reason}</p> : null}
                  <div className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Review slip</div>
                </button>
              ))}
            </div>
            {!items.length && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-black text-amber-900">
                No slips yet. Click rebuild. The “What Churvox can see” box will show whether jobs, quotes or invoices exist.
              </div>
            )}
          </section>
        </section>
      </div>
      {open && <SlipModal item={open} onClose={() => setOpen(null)} onChanged={load} />}
    </main>
  );
}
