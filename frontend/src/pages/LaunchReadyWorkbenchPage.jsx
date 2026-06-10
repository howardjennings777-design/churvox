import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const ACTION_BACKUP_KEY = "churvox_ai_approval_actions_backup_v4";

const CONFIG = {
  jobs: {
    badge: "Job command workbench",
    title: "Jobs",
    singular: "job",
    endpoint: "/jobs",
    safe: "/logic/business-records/jobs",
    localKey: "churvox_launch_jobs",
    hero: "A job should move in one clean path: capture the work, assign the worker, set the money, then prepare dispatch or invoice.",
    required: ["title", "client_name"],
    nextLabel: "Prepare invoice draft",
    columns: ["Needs info", "Ready to move", "Recent field activity"],
    fields: [
      ["title", "Job title"],
      ["client_name", "Client"],
      ["address", "Job address"],
      ["scheduled_date", "Schedule / date"],
      ["assigned_worker", "Worker"],
      ["status", "Job status", "select", ["Assigned", "Acknowledged", "In Progress", "Completed", "Needs info"]],
      ["pricing_type", "Pricing type", "select", ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Needs price"]],
      ["price", "Price / rate"],
      ["recurring", "Recurring", "select", ["No", "Weekly", "Fortnightly", "Monthly", "Custom"]],
      ["photos_required", "Photos required", "select", ["Not required", "Required", "Before and after"]],
      ["site_check", "GPS / site check", "select", ["Not required", "Required", "Needs review"]],
      ["worker_note", "Worker-visible note", "textarea"],
      ["owner_note", "Owner-only note", "textarea"],
    ],
  },
  clients: {
    badge: "Client command records",
    title: "Clients",
    singular: "client",
    endpoint: "/clients",
    safe: "/logic/business-records/clients",
    localKey: "churvox_launch_clients",
    hero: "A client record should be usable everywhere: jobs, quotes, invoices, reminders, notes and billing contacts.",
    required: ["name"],
    nextLabel: "Create first job",
    columns: ["Needs contact", "Ready for work", "Recent client activity"],
    fields: [
      ["name", "Client name"],
      ["phone", "Phone"],
      ["email", "Email"],
      ["preferred_contact", "Preferred contact", "select", ["Phone", "Email", "SMS later", "No preference"]],
      ["service_address", "Service address"],
      ["billing_email", "Billing email"],
      ["site_notes", "Property / access notes", "textarea"],
      ["notes", "Client notes", "textarea"],
    ],
  },
  quotes: {
    badge: "Quote command workbench",
    title: "Quotes",
    singular: "quote",
    endpoint: "/quotes",
    safe: "/logic/business-records/quotes",
    localKey: "churvox_launch_quotes",
    hero: "A quote should show the customer, scope, value, status and the next action without hunting around the app.",
    required: ["customer_name", "title"],
    nextLabel: "Convert to job",
    columns: ["Needs follow-up", "Ready to convert", "Quote activity"],
    fields: [
      ["customer_name", "Client"],
      ["title", "Quote title"],
      ["status", "Quote status", "select", ["Draft", "Sent", "Accepted", "Declined", "Expired"]],
      ["total", "Quote value"],
      ["valid_until", "Valid until"],
      ["scope", "Scope of work", "textarea"],
      ["message", "Customer message", "textarea"],
      ["owner_note", "Owner note", "textarea"],
    ],
  },
  invoices: {
    badge: "Invoice command workbench",
    title: "Invoices",
    singular: "invoice",
    endpoint: "/invoices",
    safe: "/logic/business-records/invoices",
    localKey: "churvox_launch_invoices",
    hero: "An invoice should be reviewed before anything is sent, synced, followed up or marked as handled.",
    required: ["customer_name", "subtotal"],
    nextLabel: "Approve delivery",
    columns: ["Needs approval", "Ready to send", "Money activity"],
    fields: [
      ["customer_name", "Client"],
      ["customer_email", "Client email"],
      ["job_reference", "Job / invoice reference"],
      ["invoice_type", "Invoice type", "select", ["Job invoice", "Deposit invoice", "Extras", "Time-based", "Adjustment"]],
      ["deliveryMethod", "Delivery method", "select", ["Draft only", "Churvox internal", "Xero", "Manual external", "MYOB staged/later (inactive)"]],
      ["subtotal", "Amount"],
      ["gst_rate", "GST rate"],
      ["due_date", "Due date"],
      ["description", "Invoice wording", "textarea"],
      ["notes", "Internal note", "textarea"],
    ],
  },
  team: {
    badge: "Team command roles",
    title: "Team",
    singular: "team member",
    endpoint: "/logic/team-members",
    safe: "/logic/team-members",
    localKey: "churvox_launch_team",
    hero: "Team should be simple: invite the person, choose their role, and keep worker, manager, office and payroll access clear.",
    required: ["name", "email"],
    nextLabel: "Prepare onboarding task",
    columns: ["Needs invite", "Ready to work", "Team activity"],
    fields: [
      ["name", "Full name"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["role", "Role", "select", ["worker", "manager", "office_admin", "payroll"]],
      ["notes", "Internal role note", "textarea"],
    ],
  },
};

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function idOf(item) {
  return String(item?.id || item?._id || item?.job_id || item?.client_id || item?.quote_id || item?.invoice_id || item?.member_id || item?.local_id || "");
}

function blank(page) {
  const out = {};
  page.fields.forEach(([key, _label, type, options]) => {
    out[key] = type === "select" ? options[0] : "";
  });
  return out;
}

function listFrom(res, area) {
  const data = res?.data ?? res ?? {};
  if (Array.isArray(data)) return data;
  const keys = ["items", "results", "records", "data", area, "jobs", "clients", "quotes", "invoices", "members", "team"];
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  if (data?.data && typeof data.data === "object") {
    for (const key of keys) if (Array.isArray(data.data?.[key])) return data.data[key];
  }
  return [];
}

function readJson(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, items) {
  localStorage.setItem(key, JSON.stringify(items.slice(0, 120)));
}

function titleOf(area, item) {
  if (area === "jobs") return first(item.title, item.job_title, item.client_name, item.customer_name, "Untitled job");
  if (area === "clients") return first(item.name, item.customer_name, item.client_name, "Unnamed client");
  if (area === "quotes") return first(item.title, item.quote_title, item.customer_name, "Untitled quote");
  if (area === "invoices") return first(item.invoice_number, item.job_reference, item.customer_name, "Invoice draft");
  if (area === "team") return first(item.name, item.email, "Team member");
  return first(item.title, item.name, "Record");
}

function subOf(area, item) {
  if (area === "jobs") return first(item.client_name, item.customer_name, item.address, item.assigned_worker, item.status, "No client details yet");
  if (area === "clients") return first(item.email, item.phone, item.service_address, "No contact details yet");
  if (area === "quotes") return first(item.customer_name, item.status, item.total, item.valid_until, "Draft quote");
  if (area === "invoices") return first(item.deliveryMethod, item.invoice_delivery_method, item.subtotal, item.status, "Draft only");
  if (area === "team") return first(item.role, item.phone, "Worker");
  return first(item.status, idOf(item));
}

function statusOf(area, item) {
  if (area === "jobs") return first(item.status, item.recurring, "Assigned");
  if (area === "clients") return first(item.preferred_contact, item.email ? "Contact ready" : "Needs contact");
  if (area === "quotes") return first(item.status, "Draft");
  if (area === "invoices") return first(item.deliveryMethod, item.status, "Draft only");
  if (area === "team") return first(item.role, "Worker");
  return first(item.status, "Ready");
}

function formFrom(page, item) {
  const out = blank(page);
  page.fields.forEach(([key]) => {
    out[key] = first(item?.[key], key === "client_name" ? item?.customer_name : "", key === "name" ? item?.customer_name : "");
  });
  return out;
}

function needsAttention(area, item) {
  if (area === "jobs") return !first(item.title, item.job_title) || !first(item.client_name, item.customer_name) || String(statusOf(area, item)).toLowerCase().includes("need");
  if (area === "clients") return !first(item.phone, item.email);
  if (area === "quotes") return ["draft", "sent", "expired"].includes(String(statusOf(area, item)).toLowerCase());
  if (area === "invoices") return String(statusOf(area, item)).toLowerCase().includes("draft") || String(statusOf(area, item)).toLowerCase().includes("approval");
  if (area === "team") return !item.email;
  return false;
}

function buildCommandPayload(area, page, form, selectedId, reason = "Prepared from workbench") {
  return {
    status: "pending",
    slipKey: area === "invoices" ? "money" : area,
    title: `${page.title}: ${titleOf(area, form)}`,
    actionKey: `${area}_next_action`,
    recordType: page.singular,
    recordId: selectedId || form.id || form._id || "",
    notifyMode: "Internal only",
    afterApproval: reason,
    ownerAuditNote: "Prepared from launch-ready workbench.",
    form,
    createdAt: new Date().toISOString(),
  };
}

function backupAction(action) {
  const items = readJson(ACTION_BACKUP_KEY);
  const next = [{ ...action, id: action.id || `local_action_${Date.now()}`, backup: true, updated_at: new Date().toISOString() }, ...items];
  writeJson(ACTION_BACKUP_KEY, next);
}

function Field({ field, form, setForm }) {
  const [key, label, type, options = []] = field;
  const update = (value) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <label className={type === "textarea" ? "lrField wide" : "lrField"}>
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea value={form[key] || ""} onChange={(event) => update(event.target.value)} />
      ) : type === "select" ? (
        <select value={form[key] || options[0]} onChange={(event) => update(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input value={form[key] || ""} onChange={(event) => update(event.target.value)} />
      )}
    </label>
  );
}

function FlowStep({ number, title, text }) {
  return <div className="lrStep"><b>{number}</b><span>{title}</span><p>{text}</p></div>;
}

function OpsCard({ item, area, onPick }) {
  return (
    <button type="button" className={needsAttention(area, item) ? "lrOpsItem warn" : "lrOpsItem"} onClick={() => onPick(item)}>
      <b>{titleOf(area, item)}</b>
      <span>{statusOf(area, item)}</span>
      <p>{subOf(area, item)}</p>
      {item?._local ? <em>Local backup</em> : null}
    </button>
  );
}

function Style() {
  return <style>{`
    .lrRoot,.lrRoot *{box-sizing:border-box;color-scheme:light}.lrRoot{width:100%;min-height:100vh;color:#111827;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.lrWrap{width:100%;max-width:none;margin:0}.lrHero{position:relative;overflow:hidden;isolation:isolate;width:100%;background:radial-gradient(circle at 86% -24%,rgba(249,115,22,.52),transparent 34%),radial-gradient(circle at 14% 116%,rgba(34,211,238,.18),transparent 30%),linear-gradient(135deg,#0b1018 0%,#111827 56%,#070b12 100%);border-left:8px solid #f97316;border-radius:34px;color:#fff;padding:26px 30px;box-shadow:0 24px 70px rgba(2,6,23,.24)}.lrHero:before{content:"";position:absolute;inset:0;z-index:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.055) 0 1px,transparent 1px 56px),repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 46px),linear-gradient(120deg,transparent 0 46%,rgba(251,191,36,.13) 46% 47%,transparent 47% 100%);opacity:.72}.lrHero>*{position:relative;z-index:1}.lrHero small,.lrPanel small,.lrControls small,.lrOps small{display:inline-flex;width:max-content;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#fed7aa;-webkit-text-fill-color:#fed7aa;padding:8px 12px;font-size:10px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.lrPanel small,.lrControls small,.lrOps small{background:#111827;border:0;color:#fbbf24;-webkit-text-fill-color:#fbbf24}.lrHero h1{margin:14px 0 8px;font-size:clamp(42px,5.1vw,74px);line-height:.9;letter-spacing:-.07em;color:#fff}.lrHero p{max-width:960px;margin:0;color:#f8fafc;font-weight:900;line-height:1.45}.lrStats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}.lrStat{border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);padding:12px}.lrStat b{display:block;color:#fff;font-size:18px;line-height:1}.lrStat span{display:block;color:#e2e8f0;font-size:12px;font-weight:850;margin-top:5px}.lrFlow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.lrStep{background:#0b1018;border:1px solid rgba(255,255,255,.10);border-left:6px solid #f97316;border-radius:20px;color:#fff;padding:13px}.lrStep b{display:grid;place-items:center;width:28px;height:28px;border-radius:10px;background:#f97316;color:#111827;font-weight:1000}.lrStep span{display:block;margin-top:8px;color:#fff;font-weight:1000;letter-spacing:-.02em}.lrStep p{margin:5px 0 0;color:#e2e8f0;font-size:12px;font-weight:850;line-height:1.35}.lrGrid{display:grid;grid-template-columns:minmax(270px,340px) minmax(0,1fr) minmax(250px,320px);gap:18px;margin-top:18px;align-items:start}.lrPanel,.lrControls,.lrOps{min-width:0;background:#fffaf0;border:1px solid rgba(15,23,42,.16);border-radius:28px;padding:18px;box-shadow:0 18px 46px rgba(2,6,23,.12)}.lrPanel h2,.lrControls h2,.lrOps h2{margin:12px 0 14px;color:#111827;font-size:clamp(26px,3vw,36px);line-height:.95;letter-spacing:-.05em}.lrRows{display:grid;gap:10px;max-height:620px;overflow:auto;padding-right:4px}.lrRows button{text-align:left;border:2px solid rgba(15,23,42,.14);border-radius:18px;background:#fff;color:#111827;padding:13px;cursor:pointer}.lrRows button.active{border-color:#f97316;background:#fff7ed}.lrRows b{display:block;color:#111827;font-size:16px;line-height:1.15}.lrRows span{display:block;margin-top:6px;color:#475569;font-size:12px;font-weight:900;line-height:1.35}.lrLocal{display:inline-flex!important;margin-top:8px!important;color:#7c2d12!important;background:#ffedd5;border-radius:999px;padding:5px 8px;text-transform:uppercase;letter-spacing:.08em}.lrEmpty{background:#111827!important;color:#fff!important;border-radius:18px;padding:14px;font-weight:1000;line-height:1.45}.lrFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.lrField.wide{grid-column:1/-1}.lrField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.11em;font-size:12px;font-weight:1000;margin-bottom:7px}.lrField input,.lrField textarea,.lrField select{width:100%;min-width:0;border:2px solid #c9a46d!important;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#fffdf7!important;color:#020617!important;-webkit-text-fill-color:#020617!important;outline:none!important;box-shadow:0 1px 0 rgba(15,23,42,.10),inset 0 0 0 9999px #fffdf7!important}.lrField textarea{min-height:118px;resize:vertical}.lrField input:focus,.lrField textarea:focus,.lrField select:focus{border-color:#f97316!important;box-shadow:0 0 0 4px rgba(249,115,22,.16),inset 0 0 0 9999px #fff!important}.lrActions{display:grid;gap:10px}.lrActions button{width:100%;border:0;border-radius:16px;padding:14px 16px;font-size:15px;font-weight:1000;cursor:pointer}.lrSave{background:#16a34a;color:#052e16}.lrNext{background:linear-gradient(135deg,#facc15,#fb923c 55%,#22d3ee);color:#111827}.lrCommand{background:#111827;color:#fff}.lrClear{background:#ffedd5;color:#7c2d12;border:2px solid #fed7aa!important}.lrMessage{margin:0;background:#14532d;color:#fff;border-radius:16px;padding:13px 14px;font-weight:1000;line-height:1.45}.lrMessage.warn{background:#451a03}.lrHint{margin:0;color:#475569;font-weight:900;line-height:1.45}.lrSelected{display:grid;gap:8px;margin-top:10px;border-radius:18px;background:#0b1018;color:#fff;padding:13px;border-left:6px solid #f97316}.lrSelected b{color:#fff}.lrSelected span{color:#fbbf24;font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.lrSelected p{margin:0;color:#e2e8f0;font-weight:900;font-size:13px;line-height:1.35}.lrOps{margin-top:18px}.lrOpsHead{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.lrOpsHead p{margin:0;color:#475569;font-weight:900;line-height:1.45}.lrOpsGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}.lrLane{display:grid;gap:10px;align-content:start;background:#fffdf7;border:1px solid rgba(15,23,42,.12);border-radius:22px;padding:12px}.lrLane h3{margin:0;color:#111827;font-size:17px;line-height:1;font-weight:1000;letter-spacing:-.03em}.lrOpsItem{width:100%;text-align:left;border:1px solid rgba(15,23,42,.14);border-left:6px solid #16a34a;border-radius:18px;background:#fff;color:#111827;padding:13px;cursor:pointer}.lrOpsItem.warn{border-left-color:#f97316;background:#fff7ed}.lrOpsItem b{display:block;color:#111827;font-size:15px;line-height:1.2}.lrOpsItem span{display:inline-flex;margin-top:7px;border-radius:999px;background:#111827;color:#fbbf24;padding:6px 9px;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.lrOpsItem p{margin:8px 0 0;color:#475569;font-size:12px;font-weight:900;line-height:1.35}.lrOpsItem em{display:inline-flex;margin-top:8px;font-style:normal;background:#ffedd5;color:#7c2d12;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:1000;text-transform:uppercase}.lrOpsEmpty{margin:0;background:#111827;color:#fff;border-radius:16px;padding:13px;font-weight:900;line-height:1.35}@media(max-width:1180px){.lrGrid,.lrFlow,.lrOpsGrid{grid-template-columns:1fr}.lrRows{max-height:none}.lrControls{position:static}.lrStats{grid-template-columns:1fr}.lrFields{grid-template-columns:1fr}.lrHero{border-radius:24px;padding:22px}.lrPanel,.lrControls,.lrOps{border-radius:22px}}
  `}</style>;
}

export default function LaunchReadyWorkbenchPage({ area = "jobs" }) {
  const api = useApi();
  const page = CONFIG[area] || CONFIG.jobs;
  const [records, setRecords] = React.useState([]);
  const [form, setForm] = React.useState(() => blank(page));
  const [selectedId, setSelectedId] = React.useState("");
  const [selectedRecord, setSelectedRecord] = React.useState(null);
  const [message, setMessage] = React.useState(`Loading ${page.title.toLowerCase()}...`);
  const [busy, setBusy] = React.useState(false);

  const localRecords = React.useMemo(() => readJson(page.localKey), [page.localKey, records.length]);
  const attentionRecords = React.useMemo(() => records.filter((item) => needsAttention(area, item)).slice(0, 8), [records, area]);
  const readyRecords = React.useMemo(() => records.filter((item) => !needsAttention(area, item)).slice(0, 8), [records, area]);
  const activityRecords = React.useMemo(() => [...records].slice(0, 8), [records]);

  async function load() {
    setBusy(true);
    const local = readJson(page.localKey);
    try {
      const safe = await api.get(page.safe, { timeout: 15000 });
      if (safe?.success === false || safe?.data?.success === false) throw new Error(safe?.error || safe?.data?.error || "Safe route failed");
      const list = listFrom(safe, area);
      setRecords([...list, ...local]);
      setMessage(list.length ? `${page.title} loaded. Pick one to edit, or create a new ${page.singular}.` : `No ${page.title.toLowerCase()} found yet. Create the first one here.`);
    } catch {
      try {
        const fallback = await api.get(page.endpoint, { timeout: 15000 });
        if (fallback?.success === false || fallback?.data?.success === false) throw new Error(fallback?.error || fallback?.data?.error || "Fallback route failed");
        const list = listFrom(fallback, area);
        setRecords([...list, ...local]);
        setMessage(`${page.title} loaded through fallback route. This page still works if safe records are catching up.`);
      } catch {
        setRecords(local);
        setMessage(local.length ? `Backend unavailable. Showing locally saved ${page.title.toLowerCase()}.` : `Backend unavailable. You can still save locally and prepare Command actions.`);
      }
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    setForm(blank(page));
    setSelectedId("");
    setSelectedRecord(null);
    load();
  }, [area]);

  function pick(item) {
    const id = idOf(item);
    setSelectedId(id);
    setSelectedRecord(item);
    setForm(formFrom(page, item));
    setMessage(`${titleOf(area, item)} loaded in the editor. Make changes here, then save or prepare the next action.`);
  }

  function clearForm() {
    setForm(blank(page));
    setSelectedId("");
    setSelectedRecord(null);
    setMessage(`Ready for a new ${page.singular}.`);
  }

  function validate() {
    const missing = (page.required || []).filter((key) => !String(form[key] || "").trim());
    if (missing.length) {
      const labels = page.fields.filter(([key]) => missing.includes(key)).map(([, label]) => label).join(", ");
      setMessage(`${labels} required before saving.`);
      toast.error(`${labels} required`);
      return false;
    }
    return true;
  }

  function saveLocal() {
    const items = readJson(page.localKey);
    const id = selectedId || `local_${area}_${Date.now()}`;
    const record = { ...form, id, local_id: id, _local: true, updated_at: new Date().toISOString() };
    const next = [record, ...items.filter((item) => idOf(item) !== id)];
    writeJson(page.localKey, next);
    setSelectedId(id);
    setSelectedRecord(record);
    setRecords((old) => [record, ...old.filter((item) => idOf(item) !== id)]);
    return record;
  }

  async function save() {
    if (!validate()) return null;
    setBusy(true);
    try {
      const shouldPatch = selectedId && !String(selectedId).startsWith("local_") && !selectedRecord?._local;
      const res = shouldPatch
        ? await api.patch(`${page.endpoint}/${encodeURIComponent(selectedId)}`, form, { timeout: 25000 })
        : await api.post(page.endpoint, form, { timeout: 25000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Save failed");
      toast.success(`${page.singular} saved`);
      setMessage(`${page.singular} saved. The page has reloaded so you can keep working.`);
      await load();
      return res?.data?.item || res?.data?.record || res?.data?.data || form;
    } catch (error) {
      const record = saveLocal();
      toast.error("Backend save failed — saved locally");
      setMessage(`${error?.message || "Backend save failed"}. Saved locally so you can keep working tomorrow.`);
      return record;
    } finally {
      setBusy(false);
    }
  }

  async function prepareCommand(reason = "Owner approval or follow-up required") {
    if (!validate()) return;
    setBusy(true);
    const payload = buildCommandPayload(area, page, form, selectedId, reason);
    try {
      const res = await api.post("/ai/actions", payload, { timeout: 18000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Command action failed");
      toast.success("Command action prepared");
      setMessage("Prepared action saved to Command approval queue.");
    } catch (error) {
      backupAction(payload);
      toast.error("Command backend unavailable — saved locally");
      setMessage(`${error?.message || "Command backend unavailable"}. Action saved locally in the approval backup queue.`);
    } finally {
      setBusy(false);
    }
  }

  async function nextAction() {
    if (!validate()) return;
    setBusy(true);
    try {
      if (area === "jobs") {
        const payload = { customer_name: form.client_name, job_reference: form.title, subtotal: form.price, description: form.worker_note || form.owner_note, deliveryMethod: "Draft only", invoice_type: "Job invoice" };
        const res = await api.post("/invoices", payload, { timeout: 25000 });
        if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Invoice draft failed");
        toast.success("Invoice draft prepared");
        setMessage("Invoice draft prepared from this job.");
      } else if (area === "clients") {
        const payload = { title: `Job for ${form.name}`, client_name: form.name, address: form.service_address, status: "Needs info", worker_note: form.site_notes, owner_note: form.notes };
        const res = await api.post("/jobs", payload, { timeout: 25000 });
        if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Job creation failed");
        toast.success("Job created for client");
        setMessage("First job created from this client record.");
      } else if (area === "quotes") {
        const payload = { title: form.title, client_name: form.customer_name, status: "Assigned", pricing_type: "Fixed price", price: form.total, worker_note: form.scope, owner_note: `Converted from quote. ${form.owner_note || ""}` };
        const res = await api.post("/jobs", payload, { timeout: 25000 });
        if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Quote conversion failed");
        toast.success("Quote converted to job");
        setMessage("Accepted quote converted into a job.");
      } else if (area === "invoices") {
        const payload = { ...form, invoice_id: selectedId || form.invoice_id || "" };
        const res = await api.post("/logic/invoice-approval", payload, { timeout: 25000 });
        if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Invoice approval failed");
        toast.success("Invoice delivery approved");
        setMessage(res?.data?.message || "Invoice delivery approved. No silent customer email or fake sync wording used.");
      } else {
        await prepareCommand("Onboarding task prepared for owner review");
      }
    } catch (error) {
      await prepareCommand(error?.message || `${page.nextLabel} could not run directly`);
    } finally {
      setBusy(false);
    }
  }

  const selectedTitle = selectedRecord ? titleOf(area, selectedRecord) : titleOf(area, form);
  const count = records.length;

  return (
    <main className="lrRoot">
      <Style />
      <section className="lrWrap">
        <article className="lrHero">
          <small>{page.badge}</small>
          <h1>{page.title}</h1>
          <p>{page.hero}</p>
          <div className="lrStats">
            <div className="lrStat"><b>{count}</b><span>Loaded records</span></div>
            <div className="lrStat"><b>{attentionRecords.length}</b><span>Need attention</span></div>
            <div className="lrStat"><b>{localRecords.length}</b><span>Local backups</span></div>
          </div>
        </article>

        <section className="lrFlow" aria-label="Workbench flow">
          <FlowStep number="1" title="Capture" text="Create or pick the record from the left list." />
          <FlowStep number="2" title="Clean" text="Fill the fields that drive jobs, invoices and follow-ups." />
          <FlowStep number="3" title="Act" text="Save, convert, approve or prepare the next step." />
          <FlowStep number="4" title="Command" text="Risky decisions go to the owner approval queue." />
        </section>

        <section className="lrGrid">
          <aside className="lrPanel">
            <small>{page.title} list</small>
            <h2>{busy ? "Working..." : `${count} records`}</h2>
            <div className="lrRows">
              {records.length ? records.slice(0, 80).map((item) => {
                const id = idOf(item) || `${titleOf(area, item)}-${subOf(area, item)}`;
                return (
                  <button type="button" key={id} className={idOf(item) === selectedId ? "active" : ""} onClick={() => pick(item)}>
                    <b>{titleOf(area, item)}</b>
                    <span>{subOf(area, item)}</span>
                    {item?._local ? <span className="lrLocal">Local backup</span> : null}
                  </button>
                );
              }) : <p className="lrEmpty">No records yet. Create the first {page.singular} in the form.</p>}
            </div>
          </aside>

          <section className="lrPanel">
            <small>{selectedId ? "Edit record" : "New record"}</small>
            <h2>{selectedId ? selectedTitle : `New ${page.singular}`}</h2>
            <div className="lrFields">
              {page.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}
            </div>
          </section>

          <aside className="lrControls">
            <small>Owner controls</small>
            <h2>Next action</h2>
            <p className={message.includes("failed") || message.includes("unavailable") || message.includes("required") ? "lrMessage warn" : "lrMessage"}>{message}</p>
            <div className="lrActions">
              <button type="button" className="lrSave" disabled={busy} onClick={save}>{busy ? "Saving..." : `Save ${page.singular}`}</button>
              <button type="button" className="lrNext" disabled={busy} onClick={nextAction}>{page.nextLabel}</button>
              <button type="button" className="lrCommand" disabled={busy} onClick={() => prepareCommand("Prepared for owner approval from workbench")}>Send to Command queue</button>
              <button type="button" className="lrClear" disabled={busy} onClick={clearForm}>Clear / new</button>
              <button type="button" className="lrClear" disabled={busy} onClick={load}>Refresh</button>
            </div>
            <div className="lrSelected">
              <b>{selectedId ? "Selected record" : "Current form"}</b>
              <span>{selectedTitle}</span>
              <p>Pick a record, edit it, save it, then prepare the next business action from here.</p>
            </div>
            <p className="lrHint">If the backend is down, Churvox keeps a local backup so testing can continue.</p>
          </aside>
        </section>

        <section className="lrOps">
          <div className="lrOpsHead">
            <div>
              <small>Operations board</small>
              <h2>{area === "jobs" ? "What needs to move next" : `${page.title} workflow`}</h2>
              <p>This replaces the messy activity dump with three useful lanes: what needs attention, what is ready, and what changed recently.</p>
            </div>
          </div>
          <div className="lrOpsGrid">
            <section className="lrLane">
              <h3>{page.columns[0]}</h3>
              {attentionRecords.length ? attentionRecords.map((item) => <OpsCard key={`a-${idOf(item) || titleOf(area, item)}`} item={item} area={area} onPick={pick} />) : <p className="lrOpsEmpty">Nothing urgent here.</p>}
            </section>
            <section className="lrLane">
              <h3>{page.columns[1]}</h3>
              {readyRecords.length ? readyRecords.map((item) => <OpsCard key={`r-${idOf(item) || titleOf(area, item)}`} item={item} area={area} onPick={pick} />) : <p className="lrOpsEmpty">Create or clean records to fill this lane.</p>}
            </section>
            <section className="lrLane">
              <h3>{page.columns[2]}</h3>
              {activityRecords.length ? activityRecords.map((item) => <OpsCard key={`x-${idOf(item) || titleOf(area, item)}`} item={item} area={area} onPick={pick} />) : <p className="lrOpsEmpty">No recent activity loaded yet.</p>}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
