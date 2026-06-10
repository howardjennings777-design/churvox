import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const ACTION_BACKUP_KEY = "churvox_ai_approval_actions_backup_v4";

const CONFIG = {
  jobs: {
    badge: "Jobs",
    title: "Job workbench",
    singular: "job",
    endpoint: "/jobs",
    safe: "/logic/business-records/jobs",
    localKey: "churvox_launch_jobs",
    hero: "Create, assign, price and move work without leaving the page.",
    required: ["title", "client_name"],
    nextLabel: "Prepare invoice draft",
    readyLabel: "Ready to dispatch",
    attentionLabel: "Need details",
    fields: [
      ["title", "Job title"],
      ["client_name", "Client"],
      ["address", "Job address"],
      ["scheduled_date", "Schedule / date"],
      ["assigned_worker", "Worker"],
      ["status", "Status", "select", ["Assigned", "Acknowledged", "In Progress", "Completed", "Needs info"]],
      ["pricing_type", "Pricing", "select", ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Needs price"]],
      ["price", "Price / rate"],
      ["recurring", "Recurring", "select", ["No", "Weekly", "Fortnightly", "Monthly", "Custom"]],
      ["photos_required", "Photos", "select", ["Not required", "Required", "Before and after"]],
      ["site_check", "GPS / site check", "select", ["Not required", "Required", "Needs review"]],
      ["worker_note", "Worker note", "textarea"],
      ["owner_note", "Owner note", "textarea"],
    ],
  },
  clients: {
    badge: "Clients",
    title: "Client records",
    singular: "client",
    endpoint: "/clients",
    safe: "/logic/business-records/clients",
    localKey: "churvox_launch_clients",
    hero: "Keep contact, site and billing details clean so jobs and invoices do not break later.",
    required: ["name"],
    nextLabel: "Create first job",
    readyLabel: "Ready for work",
    attentionLabel: "Missing contact",
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
    badge: "Quotes",
    title: "Quote pipeline",
    singular: "quote",
    endpoint: "/quotes",
    safe: "/logic/business-records/quotes",
    localKey: "churvox_launch_quotes",
    hero: "Draft, follow up and convert accepted quotes into real jobs.",
    required: ["customer_name", "title"],
    nextLabel: "Convert to job",
    readyLabel: "Accepted / ready",
    attentionLabel: "Needs follow-up",
    fields: [
      ["customer_name", "Client"],
      ["title", "Quote title"],
      ["status", "Status", "select", ["Draft", "Sent", "Accepted", "Declined", "Expired"]],
      ["total", "Quote value"],
      ["valid_until", "Valid until"],
      ["scope", "Scope of work", "textarea"],
      ["message", "Customer message", "textarea"],
      ["owner_note", "Owner note", "textarea"],
    ],
  },
  invoices: {
    badge: "Invoices",
    title: "Money desk",
    singular: "invoice",
    endpoint: "/invoices",
    safe: "/logic/business-records/invoices",
    localKey: "churvox_launch_invoices",
    hero: "Review draft invoices before anything is sent, synced, chased or marked handled.",
    required: ["customer_name", "subtotal"],
    nextLabel: "Approve delivery",
    readyLabel: "Ready to send",
    attentionLabel: "Needs approval",
    fields: [
      ["customer_name", "Client"],
      ["customer_email", "Client email"],
      ["job_reference", "Job / invoice reference"],
      ["invoice_type", "Invoice type", "select", ["Job invoice", "Deposit invoice", "Extras", "Time-based", "Adjustment"]],
      ["deliveryMethod", "Delivery", "select", ["Draft only", "Churvox internal", "Xero", "Manual external", "MYOB staged/later (inactive)"]],
      ["subtotal", "Amount"],
      ["gst_rate", "GST rate"],
      ["due_date", "Due date"],
      ["description", "Invoice wording", "textarea"],
      ["notes", "Internal note", "textarea"],
    ],
  },
  team: {
    badge: "Team",
    title: "People and roles",
    singular: "team member",
    endpoint: "/logic/team-members",
    safe: "/logic/team-members",
    localKey: "churvox_launch_team",
    hero: "Invite workers, managers, office admin and payroll with clear role access.",
    required: ["name", "email"],
    nextLabel: "Prepare onboarding task",
    readyLabel: "Ready to work",
    attentionLabel: "Needs invite",
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
  writeJson(ACTION_BACKUP_KEY, [{ ...action, id: action.id || `local_action_${Date.now()}`, backup: true, updated_at: new Date().toISOString() }, ...items]);
}

function Field({ field, form, setForm }) {
  const [key, label, type, options = []] = field;
  const update = (value) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <label className={type === "textarea" ? "lbField wide" : "lbField"}>
      <span>{label}</span>
      {type === "textarea" ? <textarea value={form[key] || ""} onChange={(event) => update(event.target.value)} /> : type === "select" ? (
        <select value={form[key] || options[0]} onChange={(event) => update(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
      ) : <input value={form[key] || ""} onChange={(event) => update(event.target.value)} />}
    </label>
  );
}

function Style() {
  return <style>{`
    .lbRoot,.lbRoot *{box-sizing:border-box;color-scheme:light}.lbRoot{width:100%;min-height:100dvh;color:#111827;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.lbStage{width:100%;min-height:calc(100dvh - 48px);display:flex;flex-direction:column;gap:18px}.lbTop{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,440px);gap:18px;align-items:stretch}.lbHero,.lbStats,.lbPanel,.lbRail{border:1px solid rgba(15,23,42,.12);box-shadow:0 18px 50px rgba(2,6,23,.10)}.lbHero{position:relative;overflow:hidden;isolation:isolate;min-height:190px;border-left:8px solid #f97316;border-radius:34px;background:radial-gradient(circle at 92% -20%,rgba(249,115,22,.55),transparent 34%),linear-gradient(135deg,#0b1018 0%,#121a27 58%,#070b12 100%);color:#fff;padding:28px}.lbHero:before{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(120deg,transparent 0 52%,rgba(251,191,36,.12) 52% 53%,transparent 53%),repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 58px);opacity:.7}.lbHero>*{position:relative;z-index:1}.lbBadge,.lbPanel small,.lbRail small{display:inline-flex;width:max-content;border-radius:999px;background:#111827;color:#fbbf24;-webkit-text-fill-color:#fbbf24;padding:8px 12px;font-size:10px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.lbBadge{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#fed7aa;-webkit-text-fill-color:#fed7aa}.lbHero h1{margin:16px 0 8px;color:#fff;font-size:clamp(44px,5.8vw,82px);line-height:.86;letter-spacing:-.075em}.lbHero p{max-width:900px;margin:0;color:#f8fafc;font-weight:900;line-height:1.45}.lbStats{display:grid;grid-template-columns:1fr;border-radius:30px;background:#fffaf0;padding:16px;gap:10px}.lbStat{display:flex;align-items:center;justify-content:space-between;gap:14px;border-radius:20px;background:#fff;border:1px solid rgba(15,23,42,.10);padding:15px}.lbStat b{font-size:30px;line-height:1;letter-spacing:-.05em;color:#111827}.lbStat span{color:#475569;font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em;text-align:right}.lbBody{display:grid;grid-template-columns:minmax(280px,350px) minmax(0,1fr) minmax(280px,330px);gap:18px;align-items:start;flex:1;min-height:0}.lbPanel,.lbRail{border-radius:30px;background:#fffaf0;padding:18px;min-width:0}.lbPanel h2,.lbRail h2{margin:12px 0 14px;color:#111827;font-size:clamp(26px,2.6vw,38px);line-height:.92;letter-spacing:-.055em}.lbSearch{display:grid;gap:10px;margin:0 0 14px}.lbSearch input{width:100%;border:2px solid #e7cfad;border-radius:16px;padding:13px 14px;background:#fff!important;color:#020617!important;-webkit-text-fill-color:#020617!important;font-weight:900;outline:none}.lbChips{display:flex;flex-wrap:wrap;gap:8px}.lbChips button{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fff;color:#334155;padding:9px 11px;font-size:12px;font-weight:1000;cursor:pointer}.lbChips button.active{background:#111827;color:#fff}.lbList{display:grid;gap:10px;max-height:calc(100dvh - 420px);min-height:320px;overflow:auto;padding-right:4px}.lbItem{width:100%;text-align:left;border:1px solid rgba(15,23,42,.12);border-left:6px solid #16a34a;border-radius:18px;background:#fff;color:#111827;padding:13px;cursor:pointer}.lbItem.active{border-left-color:#f97316;background:#fff7ed}.lbItem.warn{border-left-color:#f97316}.lbItem b{display:block;color:#111827;font-size:15px;line-height:1.2}.lbItem span{display:block;margin-top:7px;color:#475569;font-size:12px;font-weight:900;line-height:1.35}.lbItem em{display:inline-flex;margin-top:8px;font-style:normal;background:#ffedd5;color:#7c2d12;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:1000;text-transform:uppercase}.lbEmpty{margin:0;border-radius:18px;background:#111827;color:#fff;padding:14px;font-weight:950;line-height:1.4}.lbEditor{min-height:560px}.lbFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.lbField.wide{grid-column:1/-1}.lbField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.11em;font-size:11px;font-weight:1000;margin-bottom:7px}.lbField input,.lbField textarea,.lbField select{width:100%;min-width:0;border:2px solid #c9a46d!important;border-radius:16px;padding:13px 15px;font-size:15px;font-weight:900;background:#fffdf7!important;color:#020617!important;-webkit-text-fill-color:#020617!important;outline:none!important;box-shadow:inset 0 0 0 9999px #fffdf7!important}.lbField textarea{min-height:112px;resize:vertical}.lbField input:focus,.lbField textarea:focus,.lbField select:focus{border-color:#f97316!important;box-shadow:0 0 0 4px rgba(249,115,22,.15),inset 0 0 0 9999px #fff!important}.lbMessage{margin:0 0 12px;background:#14532d;color:#fff;border-radius:18px;padding:13px 14px;font-weight:1000;line-height:1.45}.lbMessage.warn{background:#451a03}.lbActions{display:grid;gap:10px}.lbActions button{width:100%;border:0;border-radius:16px;padding:14px 16px;font-size:15px;font-weight:1000;cursor:pointer}.lbSave{background:#16a34a;color:#052e16}.lbNext{background:linear-gradient(135deg,#facc15,#fb923c 55%,#22d3ee);color:#111827}.lbCommand{background:#111827;color:#fff}.lbClear{background:#ffedd5;color:#7c2d12;border:2px solid #fed7aa!important}.lbFocus{display:grid;gap:10px;margin-top:14px;border-radius:20px;background:#0b1018;color:#fff;padding:14px;border-left:6px solid #f97316}.lbFocus b{color:#fff}.lbFocus span{color:#fbbf24;font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.lbFocus p{margin:0;color:#e2e8f0;font-weight:900;font-size:13px;line-height:1.35}.lbMiniQueue{display:grid;gap:9px;margin-top:14px}.lbMiniQueue h3{margin:0;color:#111827;font-size:15px;font-weight:1000;letter-spacing:-.02em}.lbMiniQueue button{width:100%;text-align:left;border:1px solid rgba(15,23,42,.12);border-radius:16px;background:#fff;color:#111827;padding:11px;cursor:pointer}.lbMiniQueue b{display:block;font-size:13px}.lbMiniQueue span{display:block;margin-top:5px;color:#64748b;font-size:11px;font-weight:900}.lbHint{margin:12px 0 0;color:#64748b;font-size:12px;font-weight:900;line-height:1.4}@media(max-width:1180px){.lbTop,.lbBody{grid-template-columns:1fr}.lbHero{min-height:auto}.lbStats{grid-template-columns:repeat(3,minmax(0,1fr))}.lbList{max-height:none}.lbEditor{min-height:auto}}@media(max-width:720px){.lbStage{gap:12px}.lbHero,.lbPanel,.lbRail{border-radius:22px;padding:16px}.lbHero h1{font-size:clamp(40px,13vw,58px)}.lbStats{grid-template-columns:1fr}.lbFields{grid-template-columns:1fr}.lbStat b{font-size:24px}}
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
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");

  const localRecords = React.useMemo(() => readJson(page.localKey), [page.localKey, records.length]);
  const attentionRecords = React.useMemo(() => records.filter((item) => needsAttention(area, item)), [records, area]);
  const readyRecords = React.useMemo(() => records.filter((item) => !needsAttention(area, item)), [records, area]);
  const filteredRecords = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((item) => {
      if (filter === "attention" && !needsAttention(area, item)) return false;
      if (filter === "ready" && needsAttention(area, item)) return false;
      if (filter === "local" && !item?._local) return false;
      if (!q) return true;
      return `${titleOf(area, item)} ${subOf(area, item)} ${statusOf(area, item)}`.toLowerCase().includes(q);
    });
  }, [records, query, filter, area]);

  async function load() {
    setBusy(true);
    const local = readJson(page.localKey);
    try {
      const safe = await api.get(page.safe, { timeout: 15000 });
      if (safe?.success === false || safe?.data?.success === false) throw new Error(safe?.error || safe?.data?.error || "Safe route failed");
      const list = listFrom(safe, area);
      setRecords([...list, ...local]);
      setMessage(list.length ? `${page.badge} loaded. Pick one from the list or create a new ${page.singular}.` : `No ${page.badge.toLowerCase()} found yet. Create the first one here.`);
    } catch {
      try {
        const fallback = await api.get(page.endpoint, { timeout: 15000 });
        if (fallback?.success === false || fallback?.data?.success === false) throw new Error(fallback?.error || fallback?.data?.error || "Fallback route failed");
        const list = listFrom(fallback, area);
        setRecords([...list, ...local]);
        setMessage(`${page.badge} loaded through fallback route.`);
      } catch {
        setRecords(local);
        setMessage(local.length ? `Backend unavailable. Showing locally saved ${page.badge.toLowerCase()}.` : `Backend unavailable. You can still save locally and prepare Command actions.`);
      }
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    setForm(blank(page));
    setSelectedId("");
    setSelectedRecord(null);
    setQuery("");
    setFilter("all");
    load();
  }, [area]);

  function pick(item) {
    const id = idOf(item);
    setSelectedId(id);
    setSelectedRecord(item);
    setForm(formFrom(page, item));
    setMessage(`${titleOf(area, item)} loaded. Edit it, save it, or run the next action.`);
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
      const res = shouldPatch ? await api.patch(`${page.endpoint}/${encodeURIComponent(selectedId)}`, form, { timeout: 25000 }) : await api.post(page.endpoint, form, { timeout: 25000 });
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Save failed");
      toast.success(`${page.singular} saved`);
      setMessage(`${page.singular} saved.`);
      await load();
      return res?.data?.item || res?.data?.record || res?.data?.data || form;
    } catch (error) {
      const record = saveLocal();
      toast.error("Backend save failed — saved locally");
      setMessage(`${error?.message || "Backend save failed"}. Saved locally so you can keep working.`);
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
        setMessage(res?.data?.message || "Invoice delivery approved.");
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
  const hotList = attentionRecords.length ? attentionRecords.slice(0, 4) : readyRecords.slice(0, 4);

  return (
    <main className="lbRoot">
      <Style />
      <section className="lbStage">
        <header className="lbTop">
          <section className="lbHero">
            <span className="lbBadge">{page.badge}</span>
            <h1>{page.title}</h1>
            <p>{page.hero}</p>
          </section>
          <aside className="lbStats">
            <div className="lbStat"><b>{records.length}</b><span>Total records</span></div>
            <div className="lbStat"><b>{attentionRecords.length}</b><span>{page.attentionLabel}</span></div>
            <div className="lbStat"><b>{localRecords.length}</b><span>Local backups</span></div>
          </aside>
        </header>

        <section className="lbBody">
          <aside className="lbPanel">
            <small>{page.badge} list</small>
            <h2>{busy ? "Working..." : "Find record"}</h2>
            <div className="lbSearch">
              <input placeholder={`Search ${page.badge.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
              <div className="lbChips">
                <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
                <button type="button" className={filter === "attention" ? "active" : ""} onClick={() => setFilter("attention")}>Needs</button>
                <button type="button" className={filter === "ready" ? "active" : ""} onClick={() => setFilter("ready")}>Ready</button>
                <button type="button" className={filter === "local" ? "active" : ""} onClick={() => setFilter("local")}>Local</button>
              </div>
            </div>
            <div className="lbList">
              {filteredRecords.length ? filteredRecords.slice(0, 90).map((item) => {
                const id = idOf(item) || `${titleOf(area, item)}-${subOf(area, item)}`;
                return (
                  <button type="button" key={id} className={`lbItem ${idOf(item) === selectedId ? "active" : ""} ${needsAttention(area, item) ? "warn" : ""}`} onClick={() => pick(item)}>
                    <b>{titleOf(area, item)}</b>
                    <span>{subOf(area, item)}</span>
                    {item?._local ? <em>Local backup</em> : null}
                  </button>
                );
              }) : <p className="lbEmpty">No matching records. Create a new {page.singular} in the editor.</p>}
            </div>
          </aside>

          <section className="lbPanel lbEditor">
            <small>{selectedId ? "Editing" : "New record"}</small>
            <h2>{selectedId ? selectedTitle : `New ${page.singular}`}</h2>
            <div className="lbFields">
              {page.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}
            </div>
          </section>

          <aside className="lbRail">
            <small>Owner actions</small>
            <h2>Next move</h2>
            <p className={message.includes("failed") || message.includes("unavailable") || message.includes("required") ? "lbMessage warn" : "lbMessage"}>{message}</p>
            <div className="lbActions">
              <button type="button" className="lbSave" disabled={busy} onClick={save}>{busy ? "Saving..." : `Save ${page.singular}`}</button>
              <button type="button" className="lbNext" disabled={busy} onClick={nextAction}>{page.nextLabel}</button>
              <button type="button" className="lbCommand" disabled={busy} onClick={() => prepareCommand("Prepared for owner approval from workbench")}>Send to Command queue</button>
              <button type="button" className="lbClear" disabled={busy} onClick={clearForm}>New / clear</button>
              <button type="button" className="lbClear" disabled={busy} onClick={load}>Refresh</button>
            </div>
            <div className="lbFocus">
              <b>{selectedId ? "Selected" : "Current"}</b>
              <span>{selectedTitle}</span>
              <p>This page is for doing the work. Command is only for approvals.</p>
            </div>
            <div className="lbMiniQueue">
              <h3>{attentionRecords.length ? page.attentionLabel : page.readyLabel}</h3>
              {hotList.length ? hotList.map((item) => <button type="button" key={`hot-${idOf(item) || titleOf(area, item)}`} onClick={() => pick(item)}><b>{titleOf(area, item)}</b><span>{statusOf(area, item)}</span></button>) : <p className="lbHint">No urgent records loaded.</p>}
            </div>
            <p className="lbHint">Desktop uses the full screen. Tablet and phone stack into the same order.</p>
          </aside>
        </section>
      </section>
    </main>
  );
}
