import React from "react";
import { useApi } from "../hooks/useApi";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const CREATE_TYPES = [
  ["auto", "Let AI decide"],
  ["client", "Client"],
  ["job", "Job"],
  ["quote", "Quote"],
  ["invoice", "Invoice"],
  ["person", "Person / worker"],
];

const TYPE_LABELS = {
  client: "Client",
  job: "Job",
  quote: "Quote",
  invoice: "Invoice",
  person: "Person / worker",
};

const TARGET_PAGE = {
  client: "clients",
  job: "jobs",
  quote: "quotes",
  invoice: "invoices",
  person: "team",
};

const examples = {
  client: "Bob Smith, 24 Jackson Street, Lower Hutt, phone 021 555 881, email bob@example.com. Wants fortnightly lawns.",
  job: "Book Bob Smith at 24 Jackson Street next Friday 9am for lawn mowing, $65, front and back, take before and after photos.",
  quote: "Quote Sarah at 15 High Street Upper Hutt for overgrown lawn, hedge trim and green waste, $190 including GST.",
  invoice: "Invoice Sarah for hedge trim today, $120 including GST, due in 7 days. Job was at 15 High Street.",
  person: "Add Mike Jones as a worker, mike@example.com, 022 555 777, pay rate $28/hr.",
};

const stopWords = new Set([
  "add", "create", "make", "new", "please", "client", "customer", "person", "worker", "staff", "team",
  "job", "quote", "invoice", "bill", "for", "at", "to", "from", "his", "her", "their", "the", "a", "an",
  "address", "adress", "phone", "mobile", "email", "price", "charge", "amount", "total", "due", "pay", "rate",
  "mow", "mowing", "lawn", "lawns", "hedge", "trim", "clean", "cleaning", "repair", "handyman", "paint", "painting",
  "today", "tomorrow", "next", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "front", "back", "photos", "photo", "green", "waste", "gst", "including", "include", "included", "incl", "inc",
]);

function titleCase(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : "")
    .join(" ");
}

function money(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Price needed";
  return `$${amount.toFixed(amount % 1 ? 2 : 0)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function simpleDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function parseTime(text) {
  const lower = String(text || "").toLowerCase();
  const match = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (match[3] === "pm" && hour < 12) hour += 12;
    if (match[3] === "am" && hour === 12) hour = 0;
    return { hour, minute, label: `${Number(match[1])}:${pad(minute)} ${match[3].toUpperCase()}` };
  }
  const plain = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (plain) return { hour: Number(plain[1]), minute: Number(plain[2]), label: `${plain[1]}:${plain[2]}` };
  return { hour: 9, minute: 0, label: "9:00 AM" };
}

function nextWeekday(dayName) {
  const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const target = names.indexOf(dayName);
  const date = new Date();
  const diff = (target + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date;
}

function parseSchedule(text) {
  const lower = String(text || "").toLowerCase();
  const time = parseTime(text);
  let date = null;
  let label = "Date needed";

  if (/\btoday\b/.test(lower)) {
    date = new Date();
    label = "Today";
  } else if (/\btomorrow\b/.test(lower)) {
    date = new Date();
    date.setDate(date.getDate() + 1);
    label = "Tomorrow";
  } else {
    const next = lower.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    const day = next || lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (day) {
      date = nextWeekday(day[1]);
      label = next ? `Next ${titleCase(day[1])}` : titleCase(day[1]);
    }
  }

  if (!date) return { human: "Date needed", input: "", time: time.label };
  date.setHours(time.hour, time.minute, 0, 0);
  return { human: `${label} · ${time.label}`, input: dateInput(date), time: time.label };
}

function parseDueDate(text) {
  const lower = String(text || "").toLowerCase();
  const days = lower.match(/\bdue\s+in\s+(\d{1,2})\s+days?\b/);
  const date = new Date();
  if (days) date.setDate(date.getDate() + Number(days[1]));
  else if (/\bdue\s+tomorrow\b/.test(lower)) date.setDate(date.getDate() + 1);
  else date.setDate(date.getDate() + 7);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function extractEmail(text) {
  return String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(text) {
  return String(text || "").match(/(?:\+?64|0)\s?[\d\s().-]{7,14}\d/)?.[0]?.trim() || "";
}

function extractPrice(text) {
  const raw = String(text || "");
  const match = raw.match(/\$\s*(\d+(?:\.\d{1,2})?)/) ||
    raw.match(/\b(?:price|charge|amount|total|for)\s*\$?\s*(\d+(?:\.\d{1,2})?)/i) ||
    raw.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:incl|inc|including)\s*gst\b/i);
  return match ? Number(match[1]) : 0;
}

function extractPayRate(text) {
  const raw = String(text || "");
  const match = raw.match(/\$\s*(\d+(?:\.\d{1,2})?)\s*\/\s*h(?:r|our)?/i) || raw.match(/pay\s*rate\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : 0;
}

function extractAddress(text) {
  const raw = String(text || "");
  const exact = raw.match(/\b\d{1,5}\s+[A-Za-z0-9'. -]+?\b(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|place|pl|crescent|cres|terrace|tce|court|ct|way|highway|hwy)\b/i)?.[0];
  if (exact) return titleCase(exact);
  const after = raw.match(/\b(?:address|adress|site)\s*(?:is|at|:)?\s*([^,;\n]+)/i)?.[1];
  return after ? titleCase(after.replace(/\b(price|phone|email|quote|invoice|job)\b.*$/i, "")) : "";
}

function extractArea(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("upper hutt")) return "Upper Hutt";
  if (lower.includes("lower hutt")) return "Lower Hutt";
  if (lower.includes("wainuiomata")) return "Wainuiomata";
  if (lower.includes("naenae")) return "Naenae";
  if (lower.includes("belmont")) return "Belmont";
  if (lower.includes("wellington")) return "Wellington";
  return "Wellington";
}

function extractService(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("hedge")) return { name: "Hedge trimming", jobType: "garden_maintenance" };
  if (lower.includes("clean")) return { name: "Cleaning", jobType: "cleaning" };
  if (lower.includes("handyman") || lower.includes("repair")) return { name: "Handyman repair", jobType: "handyman" };
  if (lower.includes("paint")) return { name: "Painting", jobType: "painting" };
  if (lower.includes("garden")) return { name: "Garden maintenance", jobType: "garden_maintenance" };
  if (lower.includes("lawn") || lower.includes("mow")) return { name: "Lawn mowing", jobType: "lawn_mowing" };
  return { name: "General service", jobType: "other" };
}

function extractRepeat(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("fortnight")) return "fortnightly";
  if (lower.includes("weekly")) return "weekly";
  if (lower.includes("monthly")) return "monthly";
  return "one-off";
}

function extractRole(text) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("subcontractor") || lower.includes("sub contractor")) return "subcontractor";
  if (lower.includes("payroll")) return "payroll";
  if (lower.includes("lead")) return "lead_worker";
  return "worker";
}

function roleLabel(role) {
  if (role === "lead_worker") return "Lead worker";
  if (role === "subcontractor") return "Subcontractor";
  if (role === "payroll") return "Payroll only";
  return "Worker";
}

function extractName(text, fallback = "New customer") {
  let cleaned = String(text || "")
    .replace(extractEmail(text), " ")
    .replace(extractPhone(text), " ")
    .replace(extractAddress(text), " ")
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, " ")
    .replace(/[,;:()]/g, " ");
  const words = cleaned.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  const picked = [];
  for (const word of words) {
    const clean = word.toLowerCase();
    if (stopWords.has(clean)) continue;
    if (clean.length < 2) continue;
    picked.push(titleCase(clean));
    if (picked.length >= 2) break;
  }
  return picked.join(" ") || fallback;
}

function resolveKind(kind, text) {
  if (kind && kind !== "auto") return kind;
  const lower = String(text || "").toLowerCase();
  if (/\b(invoice|bill|charge)\b/.test(lower)) return "invoice";
  if (/\b(quote|estimate|price up)\b/.test(lower)) return "quote";
  if (/\b(worker|staff|team member|person|employee|subcontractor|payroll)\b/.test(lower)) return "person";
  if (/\b(client|customer)\b/.test(lower) && !/\b(job|book|mow|clean|repair|invoice|quote)\b/.test(lower)) return "client";
  return "job";
}

function gstLabel(text, kind) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("no gst")) return "No GST";
  if (lower.includes("plus gst") || lower.includes("+ gst")) return "GST excluded";
  if (lower.includes("gst") || kind === "invoice") return "GST included";
  return "Needs check";
}

function parse(kind, text) {
  const resolvedKind = resolveKind(kind, text);
  const service = extractService(text);
  const schedule = parseSchedule(text);
  const amount = extractPrice(text);
  const payRate = extractPayRate(text);
  const address = extractAddress(text);
  const area = extractArea(text);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const repeat = extractRepeat(text);
  const role = extractRole(text);
  const clientName = extractName(text, "New customer");
  const personName = extractName(text, "New person");
  const gst = gstLabel(text, resolvedKind);
  const dueDate = parseDueDate(text);
  const raw = String(text || "").trim();
  const title = resolvedKind === "person" ? personName : `${service.name} for ${clientName}`;

  const base = {
    kind: resolvedKind,
    label: TYPE_LABELS[resolvedKind] || "Action",
    clientName,
    personName,
    service: service.name,
    jobType: service.jobType,
    address,
    area,
    email,
    phone,
    amount,
    priceText: money(amount),
    payRate,
    payRateText: payRate ? `$${payRate}/hr` : "Not set",
    schedule,
    repeat,
    role,
    roleText: roleLabel(role),
    gst,
    dueDate,
    title,
    notes: raw,
    targetPage: TARGET_PAGE[resolvedKind] || "jobs",
  };

  const missing = [];
  if (resolvedKind === "client") {
    if (!clientName || clientName === "New customer") missing.push("client name");
  }
  if (resolvedKind === "job") {
    if (!clientName || clientName === "New customer") missing.push("client name");
    if (!address) missing.push("job address");
    if (!schedule.input) missing.push("date");
  }
  if (resolvedKind === "quote") {
    if (!clientName || clientName === "New customer") missing.push("client name");
    if (!address) missing.push("site address");
    if (!amount) missing.push("quote price");
  }
  if (resolvedKind === "invoice") {
    if (!clientName || clientName === "New customer") missing.push("client name");
    if (!amount) missing.push("invoice amount");
  }
  if (resolvedKind === "person") {
    if (!personName || personName === "New person") missing.push("person name");
    if (!email) missing.push("email for invite");
  }

  return { ...base, missing };
}

function detailsFor(parsed) {
  if (parsed.kind === "client") {
    return [
      ["Client", parsed.clientName],
      ["Email", parsed.email || "Not supplied"],
      ["Phone", parsed.phone || "Not supplied"],
      ["Address", parsed.address || "Not supplied"],
      ["Notes", parsed.notes || "Not supplied"],
    ];
  }
  if (parsed.kind === "person") {
    return [
      ["Person", parsed.personName],
      ["Role", parsed.roleText],
      ["Email", parsed.email || "Needed"],
      ["Phone", parsed.phone || "Not supplied"],
      ["Pay rate", parsed.payRateText],
      ["Notes", parsed.notes || "Not supplied"],
    ];
  }
  if (parsed.kind === "invoice") {
    return [
      ["Client", parsed.clientName],
      ["Invoice line", parsed.service],
      ["Amount", parsed.priceText],
      ["GST", parsed.gst],
      ["Due", parsed.dueDate],
      ["Status", "Draft only"],
    ];
  }
  if (parsed.kind === "quote") {
    return [
      ["Client", parsed.clientName],
      ["Scope", parsed.service],
      ["Address", parsed.address || "Needed"],
      ["Price", parsed.priceText],
      ["GST", parsed.gst],
      ["Status", "Draft quote"],
    ];
  }
  return [
    ["Client", parsed.clientName],
    ["Job", parsed.service],
    ["Address", parsed.address || "Needed"],
    ["Schedule", parsed.schedule.human],
    ["Price", parsed.priceText],
    ["Repeat", parsed.repeat],
  ];
}

function commandSummary(parsed) {
  if (parsed.kind === "person") return `${parsed.personName} · ${parsed.roleText} · ${parsed.email || "email needed"}`;
  return `${parsed.clientName} · ${parsed.service} · ${parsed.priceText}`;
}

function payloadFor(parsed) {
  if (parsed.kind === "client") {
    return {
      endpoints: ["/clients"],
      success: "Client created",
      payload: { name: parsed.clientName, email: parsed.email || null, phone: parsed.phone || null, address: parsed.address || null, notes: parsed.notes || null },
    };
  }
  if (parsed.kind === "person") {
    return {
      endpoints: ["/team/workers", "/team", "/workers"],
      success: "Person added",
      payload: { name: parsed.personName, email: parsed.email, phone: parsed.phone || null, role: parsed.role, team_role: parsed.role, pay_rate: parsed.payRate || null, notes: parsed.notes || null },
    };
  }
  if (parsed.kind === "quote") {
    return {
      endpoints: ["/quotes"],
      success: "Draft quote created",
      payload: {
        title: parsed.title,
        client_name: parsed.clientName,
        customer_name: parsed.clientName,
        customer_email: parsed.email || null,
        customer_phone: parsed.phone || null,
        address: parsed.address || null,
        site_address: parsed.address || null,
        job_description: parsed.service,
        description: parsed.notes,
        notes: parsed.notes,
        price: parsed.amount,
        amount: parsed.amount,
        total: parsed.amount,
        status: "draft",
        gst_status: parsed.gst,
        lines: [{ description: parsed.service, amount: parsed.amount }],
      },
    };
  }
  if (parsed.kind === "invoice") {
    return {
      endpoints: ["/invoices"],
      success: "Draft invoice created",
      payload: {
        client_name: parsed.clientName,
        customer_name: parsed.clientName,
        customer_email: parsed.email || null,
        customer_phone: parsed.phone || null,
        address: parsed.address || null,
        description: parsed.service,
        notes: parsed.notes,
        status: "draft",
        amount: parsed.amount,
        subtotal: parsed.amount,
        total: parsed.amount,
        gst_status: parsed.gst,
        due_date: parsed.dueDate,
        line_items: [{ description: parsed.service, quantity: 1, unit_price: parsed.amount, amount: parsed.amount }],
      },
    };
  }
  return {
    endpoints: ["/jobs"],
    success: "Job created",
    payload: {
      title: parsed.title,
      job_name: parsed.title,
      job_type: parsed.jobType,
      client_name: parsed.clientName,
      customer_name: parsed.clientName,
      customer_email: parsed.email || null,
      customer_phone: parsed.phone || null,
      address: parsed.address,
      site_address: parsed.address,
      scheduled_date: parsed.schedule.input,
      estimated_duration: 60,
      country: "New Zealand",
      region: "Wellington",
      notes: parsed.notes,
      description: parsed.notes,
      status: "assigned",
      pricing_type: parsed.amount ? "fixed" : "fixed",
      fixed_price: parsed.amount || 0,
      price: parsed.amount || 0,
      is_recurring: parsed.repeat !== "one-off",
      recurring_frequency: parsed.repeat !== "one-off" ? parsed.repeat : null,
      recurrence_pattern: parsed.repeat !== "one-off" ? parsed.repeat : null,
    },
  };
}

async function postFirst(post, endpoints, payload) {
  let lastError = "Could not create this record.";
  for (const endpoint of endpoints) {
    try {
      const res = await post(endpoint, payload);
      if (res?.success) return res;
      lastError = res?.error || lastError;
    } catch (error) {
      lastError = error?.message || lastError;
    }
  }
  return { success: false, error: lastError };
}

function sendToCommand(parsed, raw, onNavigate, setStatus) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    const detailObject = Object.fromEntries(detailsFor(parsed));

    const slip = {
      id: `create-with-churvox-${Date.now()}`,
      type: parsed.kind,
      category: parsed.kind === "invoice" ? "money" : parsed.kind === "person" ? "workers" : parsed.kind,
      title: `${parsed.label} ready from Create with Churvox`,
      summary: commandSummary(parsed),
      urgency: parsed.missing.length ? "High" : "Normal",
      found: `Raw note: ${raw}`,
      prepared: `${parsed.label}: ${commandSummary(parsed)}`,
      why: parsed.missing.length ? `Missing info still needed: ${parsed.missing.join(", ")}.` : "The messy note has been turned into a clean owner-approved action.",
      source: "Create with Churvox",
      page: parsed.targetPage,
      details: detailObject,
      status: "open",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "quick-create-command" } }));
    setStatus({ tone: "ok", text: "Sent to Command for owner approval." });
    onNavigate?.("command");
  } catch {
    setStatus({ tone: "need", text: "Could not save this to Command on this device." });
  }
}

export default function FreshAiQuickCreate({ onNavigate }) {
  const { post } = useApi();
  const [kind, setKind] = React.useState("job");
  const [text, setText] = React.useState(examples.job);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const parsed = React.useMemo(() => parse(kind, text), [kind, text]);
  const details = React.useMemo(() => detailsFor(parsed), [parsed]);

  function loadExample(nextKind) {
    setKind(nextKind);
    setText(examples[nextKind] || examples.job);
    setStatus(null);
  }

  async function createRecord() {
    setStatus(null);
    if (parsed.missing.length) {
      setStatus({ tone: "need", text: `Churvox needs ${parsed.missing.join(", ")} before it can safely create this.` });
      return;
    }

    const plan = payloadFor(parsed);
    setSaving(true);
    const res = await postFirst(post, plan.endpoints, plan.payload);
    setSaving(false);

    if (!res.success) {
      setStatus({ tone: "need", text: `${res.error || "Create failed"}. You can still send this to Command for review.` });
      return;
    }

    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: `${parsed.kind}-created`, source: "quick-create" } }));
    setStatus({ tone: "ok", text: `${plan.success}. Open ${TYPE_LABELS[parsed.kind] || "the area"} to check it.` });
  }

  return (
    <section className="freshQuickAiPage">
      <div className="freshQuickAiHero">
        <div>
          <span>Create with Churvox</span>
          <h1>Tell Churvox what to add.</h1>
          <p>Choose the area, type normal messy notes, check the preview, then approve. This is the fast admin box for clients, jobs, quotes, invoices and people.</p>
        </div>

        <div className="freshQuickAiStats">
          <div><b>{parsed.label}</b><small>target</small></div>
          <div><b>{parsed.priceText}</b><small>money</small></div>
          <div><b>{parsed.missing.length}</b><small>missing</small></div>
          <div><b>Approve</b><small>owner control</small></div>
        </div>
      </div>

      <div className="freshQuickAiGrid">
        <article className="freshQuickAiPanel">
          <header>
            <span>Write once</span>
            <h2>What do you want Churvox to create?</h2>
            <p>Pick a dropdown so AI knows where to put it, then write like you would text someone.</p>
          </header>

          <label className="freshQuickAiSelector">
            <span>Create type</span>
            <select value={kind} onChange={(event) => { setKind(event.target.value); setStatus(null); }}>
              {CREATE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <textarea value={text} onChange={(event) => { setText(event.target.value); setStatus(null); }} placeholder="Example: Bob Smith, 24 Jackson Street, lawns next Friday 9am, $65, fortnightly, phone 021..." />

          <div className="freshQuickAiButtons">
            <button type="button" onClick={createRecord} disabled={saving}>{saving ? "Creating…" : `Create ${parsed.label}`}</button>
            <button type="button" onClick={() => sendToCommand(parsed, text, onNavigate, setStatus)}>Send to Command</button>
            <button type="button" onClick={() => loadExample("client")}>Client example</button>
            <button type="button" onClick={() => loadExample("job")}>Job example</button>
            <button type="button" onClick={() => loadExample("invoice")}>Invoice example</button>
          </div>

          {status ? <div className={`freshQuickAiStatus ${status.tone}`}><b>{status.tone === "ok" ? "Done" : "Needs attention"}</b><span>{status.text}</span></div> : null}
        </article>

        <article className="freshQuickAiPanel">
          <header>
            <span>AI preview</span>
            <h2>{parsed.label} draft</h2>
            <p>Nothing risky is hidden. You see what Churvox found before it creates or sends anything.</p>
          </header>

          <div className="freshQuickAiResult">
            {details.map(([label, value]) => (
              <section key={label} className={String(value).includes("Needed") || String(value).includes("needed") ? "need" : ""}>
                <b>{label}</b>
                <p>{value}</p>
              </section>
            ))}
          </div>

          <div className="freshQuickAiPrepared">
            <b>AI found</b>
            <p>{text || "Write the customer, job, invoice or person details on the left."}</p>
            <b>AI prepared</b>
            <p>{commandSummary(parsed)}</p>
            <b>Safe rule</b>
            <p>{parsed.kind === "invoice" ? "Invoices are created as drafts. Nothing is sent or synced without owner approval." : "Churvox prepares the record first. You still approve the action."}</p>
          </div>

          {parsed.missing.length ? (
            <div className="freshQuickAiMissing">
              <b>Missing before safe create</b>
              <span>{parsed.missing.join(", ")}</span>
            </div>
          ) : null}

          <div className="freshQuickAiButtons">
            <button type="button" onClick={createRecord} disabled={saving}>{saving ? "Creating…" : `Approve + create ${parsed.label}`}</button>
            <button type="button" onClick={() => onNavigate?.(parsed.targetPage)}>Open {parsed.targetPage}</button>
          </div>
        </article>
      </div>
    </section>
  );
}
