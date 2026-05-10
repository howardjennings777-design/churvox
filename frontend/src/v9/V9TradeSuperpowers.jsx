import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ContactRound,
  FileText,
  Gauge,
  MessageSquareText,
  Repeat,
  Route,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wand2,
  Zap,
} from "lucide-react";

const css = `
.v9-superpowers{display:grid;gap:16px;margin:0 0 20px}
.v9-super-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px}
.v9-super-card{border:1px solid rgba(248,241,228,.1);border-radius:34px;background:rgba(248,241,228,.075);box-shadow:0 24px 70px rgba(0,0,0,.22);padding:18px;color:#f8f1e4}
.v9-super-card.light{background:#f8f1e4;color:#0a0b0d}
.v9-super-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}
.v9-super-head p{margin:0 0 6px;color:#27f6b7;font-size:11px;font-weight:950;letter-spacing:.15em;text-transform:uppercase}
.v9-super-card.light .v9-super-head p{color:#b24e2d}
.v9-super-head h2{margin:0;font-size:27px;letter-spacing:-.055em;line-height:1}
.v9-super-chip{border-radius:999px;background:rgba(39,246,183,.13);color:#27f6b7;padding:7px 10px;font-weight:950;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
.v9-super-card.light .v9-super-chip{background:#e8f9f2;color:#127c54}
.v9-super-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.v9-super-action{border:1px solid rgba(248,241,228,.1);border-radius:25px;background:#f8f1e4;color:#0a0b0d;padding:14px;text-align:left;display:grid;grid-template-columns:42px 1fr;gap:11px;cursor:pointer;transition:.18s}
.v9-super-action:hover,.v9-risk:hover,.v9-rule-power:hover,.v9-memory:hover{transform:translateY(-2px)}
.v9-super-action i{width:42px;height:42px;border-radius:16px;background:#0a0b0d;color:#27f6b7;display:grid;place-items:center;font-style:normal;grid-row:span 2}
.v9-super-action b{font-size:15px;letter-spacing:-.035em}
.v9-super-action small{color:#65584a;line-height:1.35}
.v9-risk-list,.v9-rule-list,.v9-memory-list,.v9-feed,.v9-checks{display:grid;gap:10px}
.v9-risk{border:1px solid rgba(10,11,13,.08);border-radius:22px;background:#fff9ee;color:#0a0b0d;padding:13px;display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;text-align:left;cursor:pointer}
.v9-risk i{width:40px;height:40px;border-radius:15px;display:grid;place-items:center;font-style:normal;background:#fff0e8;color:#b8322a}
.v9-risk.good i{background:#e8f9f2;color:#19784a}
.v9-risk b{display:block}.v9-risk small{color:#65584a}
.v9-risk strong{font-size:24px;letter-spacing:-.05em}
.v9-rule-list{grid-template-columns:repeat(2,minmax(0,1fr))}
.v9-rule-power{border:1px solid rgba(10,11,13,.08);border-radius:24px;background:#fff9ee;color:#0a0b0d;padding:14px;text-align:left;cursor:pointer}
.v9-rule-power div{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:9px}
.v9-rule-power b{font-size:15px}
.v9-toggle{width:46px;height:26px;border-radius:999px;background:#d7c8b7;position:relative;flex:0 0 auto}
.v9-toggle:after{content:"";position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:999px;background:#fff;transition:.18s}
.v9-toggle.on{background:#27f6b7}
.v9-toggle.on:after{left:24px;background:#0a0b0d}
.v9-rule-power small{color:#65584a;line-height:1.35}
.v9-memory-list{grid-template-columns:repeat(3,minmax(0,1fr))}
.v9-memory{border:1px solid rgba(10,11,13,.08);border-radius:24px;background:#fff9ee;color:#0a0b0d;padding:14px;text-align:left}
.v9-memory b{display:block;margin:8px 0 5px}
.v9-memory small{color:#65584a;line-height:1.35}
.v9-feed-item{border:1px solid rgba(248,241,228,.1);border-radius:22px;background:rgba(248,241,228,.08);padding:13px;display:grid;grid-template-columns:38px 1fr;gap:10px}
.v9-feed-item i{width:38px;height:38px;border-radius:14px;background:#27f6b7;color:#0a0b0d;display:grid;place-items:center;font-style:normal}
.v9-feed-item b{display:block}.v9-feed-item small{color:rgba(248,241,228,.66)}
.v9-checks{grid-template-columns:repeat(4,minmax(0,1fr))}
.v9-check{border:1px solid rgba(10,11,13,.08);border-radius:24px;background:#fff9ee;color:#0a0b0d;padding:14px}
.v9-check b{display:block;margin:8px 0}.v9-check ul{margin:0;padding-left:18px;color:#65584a;font-size:12px;line-height:1.45}
.v9-studio{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.v9-studio textarea{width:100%;min-height:118px;border:1px solid rgba(10,11,13,.1);border-radius:22px;background:#fff9ee;color:#0a0b0d;padding:14px;font:inherit;font-weight:700}
.v9-studio-output{border:1px solid rgba(10,11,13,.08);border-radius:22px;background:#fff9ee;color:#0a0b0d;padding:14px;line-height:1.5}
.v9-studio-tones{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.v9-studio-tones button{border:0;border-radius:999px;padding:8px 11px;background:#eadccb;color:#0a0b0d;font-weight:900;cursor:pointer}
.v9-studio-tones button.active{background:#27f6b7}
@media(max-width:1080px){
  .v9-super-grid,.v9-super-actions,.v9-rule-list,.v9-memory-list,.v9-checks,.v9-studio{grid-template-columns:1fr}
}
`;

const safeId = (x) => x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.client_id || "";
const titleOf = (x, fallback = "Untitled") => x?.title || x?.name || x?.customer_name || x?.client_name || x?.invoice_number || x?.quote_number || fallback;
const isDone = (job) => ["completed", "done", "closed"].includes(String(job?.status || job?.job_status || "").toLowerCase());
const noWorker = (job) => !job?.assigned_worker_id && !job?.worker_id && !job?.assigned_worker_name;
const openInvoice = (invoice) => !["paid", "cancelled", "canceled"].includes(String(invoice?.status || "").toLowerCase());

function scoreWorker(job, workers) {
  const active = workers.filter((worker) => !String(worker.status || "").toLowerCase().includes("inactive"));
  const region = String(job?.region || job?.area || job?.zone || "").toLowerCase();
  const type = String(job?.service_type || job?.service || job?.trade || job?.title || "").toLowerCase();

  return active.map((worker) => {
    const hay = JSON.stringify(worker || {}).toLowerCase();
    let score = 55;
    const reasons = ["Active worker"];
    if (region && hay.includes(region)) { score += 15; reasons.push("same area"); }
    if (type && hay.includes(type)) { score += 15; reasons.push("job type match"); }
    if (!worker.active_job_id && !worker.current_job_id) { score += 10; reasons.push("not on active job"); }
    if (String(worker.role || "").toLowerCase().includes("worker")) { score += 5; reasons.push("worker role"); }
    return { worker, score: Math.min(score, 98), reasons };
  }).sort((a, b) => b.score - a.score)[0] || null;
}

const PRESET_CHECKS = {
  "Lawn care": ["Before photo", "After photo", "Gate closed", "Green waste handled", "Customer note added"],
  Cleaning: ["Before photo", "After photo", "Rooms checked", "Supplies noted", "Final note added"],
  Handyman: ["Before photo", "After photo", "Parts used", "Issue checked", "Customer sign-off note"],
  Plumbing: ["Before photo", "Repair photo", "Leak tested", "Parts used", "Safety checked"],
};

const DEFAULT_RULES = [
  ["proofToPaid", "Proof-to-paid", "When worker completes a job, prepare proof summary and draft invoice."],
  ["autoCrew", "AI crew match", "Recommend best worker using area, job type, workload and clash risk."],
  ["riskRadar", "Risk radar", "Find jobs that are likely to go wrong before the owner notices."],
  ["messageStudio", "Message studio", "Draft reminders, quote follow-ups and completion messages."],
  ["customerMemory", "Customer memory", "Remember access notes, payment habits and job patterns."],
  ["dailyBrief", "Daily brief", "Prepare a morning plan for work, crew and cash."],
];

function useLocalRules() {
  const [rules, setRules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("churvox_ai_power_rules") || "{}");
    } catch {
      return {};
    }
  });

  const toggle = (key) => {
    setRules((current) => {
      const next = { ...current, [key]: current[key] === false ? true : false };
      localStorage.setItem("churvox_ai_power_rules", JSON.stringify(next));
      return next;
    });
  };

  return { rules, toggle };
}

export default function V9TradeSuperpowers({ data, moves, current, go, open }) {
  const { rules, toggle } = useLocalRules();
  const [tone, setTone] = useState("Friendly");
  const [messageSeed, setMessageSeed] = useState("Hi, just a quick update from Churvox. The work is ready for review.");

  const jobs = data?.jobs || [];
  const clients = data?.clients || [];
  const invoices = data?.invoices || [];
  const quotes = data?.quotes || [];
  const workers = data?.workers || [];

  const openJobs = jobs.filter((job) => !isDone(job));
  const completedJobs = jobs.filter(isDone);
  const unassignedJobs = jobs.filter(noWorker);
  const openInvoices = invoices.filter(openInvoice);
  const quoteFollowups = quotes.filter((quote) => ["draft", "sent"].includes(String(quote.status || "").toLowerCase()));

  const riskItems = useMemo(() => {
    const missingAddress = openJobs.filter((job) => !job.address && !job.site_address && !job.job_address);
    const missingPrice = openJobs.filter((job) => !job.price && !job.total && !job.subtotal && !job.hourly_rate);
    const notAcknowledged = openJobs.filter((job) => String(job.status || "").toLowerCase() === "assigned");
    return [
      ["Jobs missing address", missingAddress.length, "Fix site details before workers leave.", "work", missingAddress[0]],
      ["Jobs missing price", missingPrice.length, "Invoice creation will be weak without price context.", "work", missingPrice[0]],
      ["Workers not acknowledged", notAcknowledged.length, "Follow up before the day slips.", "work", notAcknowledged[0]],
      ["Open invoice follow-ups", openInvoices.length, "Cash needs attention.", "cash", openInvoices[0]],
      ["Quote opportunities", quoteFollowups.length, "Quotes need follow-up before they go cold.", "cash", quoteFollowups[0]],
    ];
  }, [openJobs, openInvoices, quoteFollowups]);

  const bestMatch = unassignedJobs[0] ? scoreWorker(unassignedJobs[0], workers) : null;
  const firstClient = clients[0] || {};
  const clientMemory = [
    ["Preference", firstClient.preferred_contact || firstClient.contact_preference || "AI will learn preferred contact style"],
    ["Access", firstClient.access_notes || firstClient.gate_code || "No access issue saved yet"],
    ["Payment", firstClient.payment_terms || "Standard payment pattern"],
  ];

  const message = `${tone}: ${messageSeed}\n\nPrepared by Churvox AI. Owner can edit before sending.`;

  return (
    <section className="v9-superpowers">
      <style>{css}</style>

      <div className="v9-super-grid">
        <div className="v9-super-card">
          <div className="v9-super-head">
            <div>
              <p>Trade AI advantage</p>
              <h2>10 things that make Churvox hard to copy</h2>
            </div>
            <span className="v9-super-chip">{moves?.length || 0} prepared</span>
          </div>

          <div className="v9-super-actions">
            <button className="v9-super-action" type="button" onClick={() => go("moves")}>
              <i><Bot size={20} /></i>
              <b>Office work done for you</b>
              <small>AI prepares invoices, reminders, assignments and risk checks.</small>
            </button>
            <button className="v9-super-action" type="button" onClick={() => go("cash")}>
              <i><Camera size={20} /></i>
              <b>Proof-to-paid</b>
              <small>Worker proof becomes a summary, invoice description and draft invoice.</small>
            </button>
            <button className="v9-super-action" type="button" onClick={() => go("work")}>
              <i><UserCheck size={20} /></i>
              <b>AI crew match</b>
              <small>Recommend the best worker by area, workload and job experience.</small>
            </button>
          </div>
        </div>

        <div className="v9-super-card light">
          <div className="v9-super-head">
            <div>
              <p>Risk radar</p>
              <h2>What could go wrong today</h2>
            </div>
            <span className="v9-super-chip">{riskItems.reduce((sum, item) => sum + Number(item[1] || 0), 0)} risks</span>
          </div>

          <div className="v9-risk-list">
            {riskItems.map(([label, count, text, route, item]) => (
              <button className={`v9-risk ${count ? "" : "good"}`} key={label} type="button" onClick={() => item ? open({ mode: "record", type: route === "cash" ? "invoice" : "job", item }) : go(route)}>
                <i>{count ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</i>
                <span><b>{label}</b><small>{text}</small></span>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="v9-super-grid">
        <div className="v9-super-card light">
          <div className="v9-super-head">
            <div>
              <p>AI permissions</p>
              <h2>Business Autopilot rules</h2>
            </div>
            <span className="v9-super-chip">approval-first</span>
          </div>

          <div className="v9-rule-list">
            {DEFAULT_RULES.map(([key, title, text]) => {
              const on = rules[key] !== false;
              return (
                <button className="v9-rule-power" type="button" key={key} onClick={() => toggle(key)}>
                  <div><b>{title}</b><span className={`v9-toggle ${on ? "on" : ""}`} /></div>
                  <small>{text}</small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="v9-super-card light">
          <div className="v9-super-head">
            <div>
              <p>Dispatch intelligence</p>
              <h2>AI worker match</h2>
            </div>
            <span className="v9-super-chip">{bestMatch ? `${bestMatch.score}%` : "waiting"}</span>
          </div>

          {unassignedJobs[0] ? (
            <button className="v9-risk" type="button" onClick={() => open({ mode: "record", type: "job", item: unassignedJobs[0] })}>
              <i><Route size={18} /></i>
              <span>
                <b>{titleOf(unassignedJobs[0], "Unassigned job")}</b>
                <small>{bestMatch ? `${bestMatch.worker.name || bestMatch.worker.email || "Worker"} · ${bestMatch.reasons.join(", ")}` : "Add worker details to improve matching."}</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button className="v9-risk good" type="button" onClick={() => go("work")}>
              <i><CheckCircle2 size={18} /></i>
              <span><b>No unassigned job detected</b><small>Dispatch is clear right now.</small></span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="v9-super-card light">
        <div className="v9-super-head">
          <div>
            <p>Trade brain presets</p>
            <h2>Smart job checklists by trade</h2>
          </div>
          <span className="v9-super-chip">worker proof</span>
        </div>

        <div className="v9-checks">
          {Object.entries(PRESET_CHECKS).map(([name, checks]) => (
            <div className="v9-check" key={name}>
              <ClipboardCheck size={20} />
              <b>{name}</b>
              <ul>{checks.map((check) => <li key={check}>{check}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>

      <div className="v9-super-grid">
        <div className="v9-super-card light">
          <div className="v9-super-head">
            <div>
              <p>Customer memory</p>
              <h2>Client context AI remembers</h2>
            </div>
            <span className="v9-super-chip">{clients.length} clients</span>
          </div>

          <div className="v9-memory-list">
            {clientMemory.map(([label, text]) => (
              <div className="v9-memory" key={label}>
                <ContactRound size={19} />
                <b>{label}</b>
                <small>{text}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="v9-super-card">
          <div className="v9-super-head">
            <div>
              <p>Office work done</p>
              <h2>AI activity feed</h2>
            </div>
            <span className="v9-super-chip">live</span>
          </div>

          <div className="v9-feed">
            <div className="v9-feed-item"><i><FileText size={18} /></i><span><b>{completedJobs.length} completed jobs checked</b><small>Ready for proof-to-paid and invoice drafting.</small></span></div>
            <div className="v9-feed-item"><i><MessageSquareText size={18} /></i><span><b>{quoteFollowups.length + openInvoices.length} follow-ups found</b><small>AI can draft reminders and quote messages.</small></span></div>
            <div className="v9-feed-item"><i><Repeat size={18} /></i><span><b>{openJobs.filter((job) => job.recurring || job.repeat_interval || job.recurrence).length} recurring jobs detected</b><small>Ready for run-sheet automation.</small></span></div>
          </div>
        </div>
      </div>

      <div className="v9-super-card light">
        <div className="v9-super-head">
          <div>
            <p>AI message studio</p>
            <h2>Draft customer messages before sending</h2>
          </div>
          <span className="v9-super-chip">{tone}</span>
        </div>

        <div className="v9-studio">
          <div>
            <textarea value={messageSeed} onChange={(event) => setMessageSeed(event.target.value)} />
            <div className="v9-studio-tones">
              {["Friendly", "Firm", "Professional", "Short SMS"].map((item) => (
                <button className={tone === item ? "active" : ""} key={item} type="button" onClick={() => setTone(item)}>{item}</button>
              ))}
            </div>
          </div>
          <div className="v9-studio-output">
            <b>Draft preview</b>
            <p>{message}</p>
            <small>Nothing sends until the owner approves.</small>
          </div>
        </div>
      </div>
    </section>
  );
}
