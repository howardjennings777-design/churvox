import churvoxLogoIcon from "../assets/churvox-logo-icon.svg";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { <img className="churvox-logo-force" src={churvoxLogoIcon} alt="Churvox" /> ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.rules)) return value.rules;
  if (Array.isArray(value?.actions)) return value.actions;
  return [];
};

const low = (value) => String(value || "").toLowerCase();
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const idOf = (item) => item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id;
const labelOf = (item, fallback = "Item") =>
  item?.title || item?.name || item?.job_title || item?.customer_name || item?.client_name || item?.description || fallback;

const hasWorker = (job) =>
  Boolean(job?.worker_id || job?.assigned_worker_id || job?.assigned_worker || job?.assigned_worker_name || job?.worker_name);

const statusColor = (status) => {
  const s = low(status);
  if (s.includes("complete") || s.includes("paid") || s.includes("approved")) return "#059669";
  if (s.includes("overdue") || s.includes("failed") || s.includes("reject")) return "#dc2626";
  if (s.includes("pending") || s.includes("draft") || s.includes("sent")) return "#d97706";
  return "#2563eb";
};

const panelConfig = {
  approvals: {
    title: "Approvals Queue",
    route: "/ai-operator/approvals?embedded=1",
    kind: "approvals",
    empty: "No AI approvals are waiting. Run AI Plan to refresh prepared actions.",
  },
  revenue: {
    title: "Revenue Follow-up",
    route: "/invoices?embedded=1",
    kind: "invoices",
    empty: "No invoice money is waiting right now.",
  },
  followups: {
    title: "Customer Follow-ups",
    route: "/sms?embedded=1",
    kind: "followups",
    empty: "No follow-ups are due right now.",
  },
  needCrew: {
    title: "Dispatch / Need Crew",
    route: "/dispatch?embedded=1",
    kind: "unassignedJobs",
    empty: "No unassigned jobs right now.",
  },
  proof: {
    title: "Proof-to-Paid",
    route: "/proof-to-paid?embedded=1",
    kind: "proofJobs",
    empty: "No completed jobs are waiting for proof review.",
  },
  jobs: {
    title: "Active Jobs",
    route: "/jobs?embedded=1",
    kind: "jobs",
    empty: "No active jobs right now.",
  },
  team: {
    title: "Team / Workers",
    route: "/team?embedded=1",
    kind: "workers",
    empty: "No workers found yet. Invite workers from Team.",
  },
  quotes: {
    title: "Quote Follow-ups",
    route: "/quotes?embedded=1",
    kind: "quotes",
    empty: "No quotes are waiting for follow-up.",
  },
};

const workspaceTiles = [
  ["Jobs", "/jobs?embedded=1", "▣", "Create and manage work"],
  ["Clients", "/clients?embedded=1", "♙", "Client records and history"],
  ["Quotes", "/quotes?embedded=1", "▤", "Quotes and follow-ups"],
  ["Invoices", "/invoices?embedded=1", "$", "Drafts, reminders and payment"],
  ["Team", "/team?embedded=1", "♙", "Workers and roles"],
  ["Dispatch", "/dispatch?embedded=1", "▦", "Assign jobs"],
  ["Proof-to-Paid", "/proof-to-paid?embedded=1", "◇", "Proof review to invoice"],
  ["Automation", "/automation?embedded=1", "↻", "Rules and safe runs"],
  ["SMS", "/sms?embedded=1", "☵", "Customer updates"],
  ["Settings", "/settings?embedded=1", "⚙", "Business setup"],
];

export default function AIControlRoomLaunchPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [draft, setDraft] = useState({ note: "", message: "", decision: "review_later" });
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [], workers: [], approvals: [] });

  const load = useCallback(async () => {
    setLoading(true);
    const [jobs, invoices, quotes, workers, approvals] = await Promise.all([
      get("/jobs").catch(() => null),
      get("/invoices").catch(() => null),
      get("/quotes").catch(() => null),
      get("/team/workers").catch(() => null),
      get("/command-hub/actions").catch(() => null),
    ]);
    setData({
      jobs: toArray(jobs),
      invoices: toArray(invoices),
      quotes: toArray(quotes),
      workers: toArray(workers),
      approvals: toArray(approvals),
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const derived = useMemo(() => {
    const activeJobs = data.jobs.filter((job) => !["completed", "cancelled", "closed", "done"].includes(low(job.status)));
    const unassignedJobs = activeJobs.filter((job) => !hasWorker(job));
    const proofJobs = data.jobs.filter((job) => ["completed", "done"].includes(low(job.status)));
    const invoiceFollowups = data.invoices.filter((invoice) =>
      ["open", "sent", "overdue", "unpaid", "pending", "pending_payment", "draft"].includes(low(invoice.status))
    );
    const quoteFollowups = data.quotes.filter((quote) => ["sent", "pending", "draft"].includes(low(quote.status)));
    const moneyWaiting = invoiceFollowups.reduce(
      (total, invoice) => total + Number(invoice.balance_due || invoice.balance || invoice.total || invoice.amount || invoice.subtotal || 0),
      0
    );
    return {
      activeJobs,
      unassignedJobs,
      proofJobs,
      invoiceFollowups,
      quoteFollowups,
      followups: [...invoiceFollowups, ...quoteFollowups],
      moneyWaiting,
      activeWorkers: data.workers.filter((worker) => low(worker.status) !== "inactive"),
    };
  }, [data]);

  const openPanel = (key, extras = {}) => {
    const config = panelConfig[key] || panelConfig.jobs;
    setPanel({ key, ...config, ...extras });
    setDraft({ note: "", message: buildSuggestedMessage(key, data, derived), decision: "review_later" });
    setNotice("");
  };

  const openWorkspace = (title, route) => setWorkspace({ title, route: ensureEmbedded(route) });
  const closePanel = () => setPanel(null);

  const runAiPlan = async () => {
    setNotice("Running AI Plan safely...");
    await post("/smart-hub/scan", {}).catch(() => null);
    await load();
    setNotice("AI Plan complete. Live queue refreshed.");
  };

  const metrics = [
    ["Approvals", data.approvals.length, "Owner sign-off", "approvals", "✓"],
    ["Need Crew", derived.unassignedJobs.length, "Jobs to assign", "needCrew", "♙"],
    ["Money Waiting", money(derived.moneyWaiting), "Invoices to chase", "revenue", "$"],
    ["Follow-ups", derived.followups.length, "Messages to prepare", "followups", "☵"],
    ["Proof", derived.proofJobs.length, "Jobs to review", "proof", "◇"],
    ["Workers", derived.activeWorkers.length, "Available team", "team", "♙"],
  ];

  return (
    <Layout smartHubMode>
      <main style={styles.page}>
        <section style={styles.hero}>
          <div>
            <ChurvoxLogo size="lg" />
            <h1 style={styles.heroTitle}>AI Control Room</h1>
            <p style={styles.heroText}>AI finds the admin work, prepares the next action, and keeps you in control before anything goes out.</p>
            <div style={styles.actionRow}>
              <button type="button" style={styles.orangeButton} onClick={runAiPlan}>Run AI Plan</button>
              <button type="button" style={styles.whiteButton} onClick={() => openPanel("approvals")}>Review approvals</button>
              <button type="button" style={styles.whiteButton} onClick={() => navigate("/ai-operator/settings")}>Operator settings</button>
            </div>
          </div>
          <div style={styles.livePanel}>
            <div style={styles.liveHeader}>LIVE CONTROL CENTRE <span style={styles.liveDot}>● Live</span></div>
            <div style={styles.liveGrid}>{metrics.slice(0, 4).map(([label, value, sub, key, icon]) => <Metric key={key} label={label} value={value} sub={sub} icon={icon} onClick={() => openPanel(key)} />)}</div>
          </div>
        </section>

        <section style={styles.safety}>Approval-first: no auto-send, no auto-charge, no payroll changes, no MYOB write, no deletion without owner approval.</section>

        {notice ? <div style={styles.notice}>{notice}</div> : null}
        {loading ? <div style={styles.notice}>Loading live Churvox data...</div> : null}

        <section style={styles.grid3}>{metrics.map(([label, value, sub, key, icon]) => <ActionCard key={key} label={label} value={value} sub={sub} icon={icon} onClick={() => openPanel(key)} />)}</section>

        <section style={styles.grid2}>
          <article style={styles.card}>
            <Header title="Next Best Moves" />
            <Move title="Dispatch the day" text={`${derived.unassignedJobs.length} unassigned job${derived.unassignedJobs.length === 1 ? "" : "s"} ready to match with a worker.`} action="Open dispatch plan" onClick={() => openPanel("needCrew")} />
            <Move title="Move money" text={`${money(derived.moneyWaiting)} waiting across invoice follow-ups.`} action="Prepare reminders" onClick={() => openPanel("revenue")} />
            <Move title="Proof & updates" text={`${derived.proofJobs.length} completed job${derived.proofJobs.length === 1 ? "" : "s"} can be reviewed for proof-to-paid.`} action="Review proof" onClick={() => openPanel("proof")} />
          </article>

          <article style={styles.card}>
            <Header title="Active Work Board" />
            <DataList items={derived.activeJobs.slice(0, 6)} empty="No active jobs right now." render={(job) => (
              <Row key={idOf(job) || labelOf(job)}
                title={labelOf(job, "Job")}
                sub={`${job.client_name || job.customer_name || "Client"} · ${hasWorker(job) ? job.assigned_worker_name || job.worker_name || "Assigned" : "Needs crew"}`}
                badge={job.status || "active"}
                onClick={() => openPanel("jobs", { focusItem: job })}
              />
            )} />
            <button type="button" style={styles.linkButton} onClick={() => openWorkspace("Jobs", "/jobs?embedded=1")}>Open Jobs workspace</button>
          </article>
        </section>

        <section style={styles.card}>
          <Header title="Owner Workspaces" sub="Open each workspace inside Smart Hub without leaving context." />
          <div style={styles.workspaceGrid}>{workspaceTiles.map(([title, route, icon, sub]) => (
            <button type="button" key={title} style={styles.workspaceTile} onClick={() => openWorkspace(title, route)}>
              <span style={styles.tileIcon}>{icon}</span>
              <strong>{title}</strong>
              <small>{sub}</small>
            </button>
          ))}</div>
        </section>

        <ControlPanel
          panel={panel}
          draft={draft}
          setDraft={setDraft}
          data={data}
          derived={derived}
          onClose={closePanel}
          onRunAiPlan={runAiPlan}
          onOpenWorkspace={openWorkspace}
        />
        <WorkspaceModal workspace={workspace} onClose={() => setWorkspace(null)} />
      </main>
    </Layout>
  );
}

function Metric({ label, value, sub, icon, onClick }) {
  return <button type="button" style={styles.metric} onClick={onClick}><span style={styles.metricIcon}>{icon}</span><strong>{value}</strong><small>{label}</small><em>{sub}</em></button>;
}

function ActionCard({ label, value, sub, icon, onClick }) {
  return <button type="button" style={styles.actionCard} onClick={onClick}><span style={styles.cardIcon}>{icon}</span><small>{label}</small><strong>{value}</strong><em>{sub}</em><b>Work this →</b></button>;
}

function Header({ title, sub }) {
  return <div style={styles.header}><h2>{title}</h2>{sub ? <p>{sub}</p> : null}</div>;
}

function Move({ title, text, action, onClick }) {
  return <button type="button" style={styles.move} onClick={onClick}><strong>{title}</strong><span>{text}</span><b>{action} →</b></button>;
}

function DataList({ items, empty, render }) {
  if (!items?.length) return <div style={styles.empty}>{empty}</div>;
  return <div style={styles.list}>{items.map(render)}</div>;
}

function Row({ title, sub, badge, onClick }) {
  return <button type="button" style={styles.row} onClick={onClick}><span><strong>{title}</strong><small>{sub}</small></span><em style={{ color: statusColor(badge) }}>{badge}</em></button>;
}

function ControlPanel({ panel, draft, setDraft, data, derived, onClose, onRunAiPlan, onOpenWorkspace }) {
  const [localNotice, setLocalNotice] = useState("");
  useEffect(() => {
    if (!panel) return undefined;
    setLocalNotice("");
    const listener = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [panel, onClose]);

  if (!panel) return null;

  const items = getPanelItems(panel.kind, data, derived);
  const count = items.length;
  const route = panel.route || "/dashboard?embedded=1";

  const prepare = () => {
    setDraft((prev) => ({ ...prev, message: buildSuggestedMessage(panel.key, data, derived) }));
    setLocalNotice("AI draft prepared. Review it, edit if needed, then open the right workspace to finish the action.");
  };

  const save = () => {
    setLocalNotice("Saved locally for this review. Open the workspace to apply it to the real record.");
  };

  return (
    <div style={styles.modalBack} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalHead}>
          <div>
            <h2>{panel.title}</h2>
            <p>{count ? `${count} live item${count === 1 ? "" : "s"} found` : panel.empty}</p>
          </div>
          <button type="button" style={styles.close} onClick={onClose}>×</button>
        </div>

        {localNotice ? <div style={styles.panelNotice}>{localNotice}</div> : null}

        {count ? (
          <div style={styles.panelList}>
            {items.slice(0, 8).map((item, index) => <PanelItem key={idOf(item) || index} item={item} kind={panel.kind} onOpenWorkspace={onOpenWorkspace} />)}
          </div>
        ) : (
          <div style={styles.emptyPanel}>
            <strong>{panel.empty}</strong>
            <span>Nothing fake is shown here. This panel uses your live Churvox jobs, invoices, quotes, workers and approvals.</span>
            <button type="button" style={styles.whiteButtonSmall} onClick={onRunAiPlan}>Run AI Plan again</button>
          </div>
        )}

        <label style={styles.fieldLabel}>AI-prepared draft / owner note</label>
        <textarea style={styles.textarea} value={draft.message || ""} onChange={(e) => setDraft((prev) => ({ ...prev, message: e.target.value }))} />

        <label style={styles.fieldLabel}>Decision</label>
        <select style={styles.input} value={draft.decision || "review_later"} onChange={(e) => setDraft((prev) => ({ ...prev, decision: e.target.value }))}>
          <option value="review_later">Review later</option>
          <option value="prepare_action">Prepare action</option>
          <option value="open_workspace">Open workspace</option>
          <option value="owner_approved">Owner approved</option>
        </select>

        <div style={styles.modalActions}>
          <button type="button" style={styles.primarySmall} onClick={prepare}>Prepare action</button>
          <button type="button" style={styles.whiteButtonSmall} onClick={save}>Save note</button>
          <button type="button" style={styles.whiteButtonSmall} onClick={() => onOpenWorkspace(panel.title, route)}>Open workspace</button>
          <button type="button" style={styles.ghostSmall} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PanelItem({ item, kind, onOpenWorkspace }) {
  const title = labelOf(item, kind === "workers" ? "Worker" : "Record");
  const sub = item.customer_name || item.client_name || item.email || item.address || item.status || "Live Churvox record";
  const badge = item.status || item.role || item.pricing_type || "open";
  const route = routeFor(kind, item);
  return (
    <div style={styles.panelItem}>
      <div>
        <strong>{title}</strong>
        <small>{sub}</small>
      </div>
      <button type="button" style={styles.itemButton} onClick={() => onOpenWorkspace(title, route)}>Open</button>
      <em style={{ color: statusColor(badge) }}>{badge}</em>
    </div>
  );
}

function WorkspaceModal({ workspace, onClose }) {
  useEffect(() => {
    if (!workspace) return undefined;
    const listener = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [workspace, onClose]);
  if (!workspace) return null;
  return (
    <div style={styles.workspaceBack} onClick={onClose}>
      <div style={styles.workspaceModal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.workspaceHead}><h2>{workspace.title}</h2><button type="button" onClick={onClose}>×</button></div>
        <iframe title={workspace.title} src={ensureEmbedded(workspace.route)} style={styles.frame} />
      </div>
    </div>
  );
}

function getPanelItems(kind, data, derived) {
  if (kind === "approvals") return data.approvals;
  if (kind === "invoices") return derived.invoiceFollowups;
  if (kind === "followups") return derived.followups;
  if (kind === "unassignedJobs") return derived.unassignedJobs;
  if (kind === "proofJobs") return derived.proofJobs;
  if (kind === "jobs") return derived.activeJobs;
  if (kind === "workers") return derived.activeWorkers;
  if (kind === "quotes") return derived.quoteFollowups;
  return [];
}

function routeFor(kind, item) {
  const id = idOf(item);
  if (kind === "invoices" && id) return `/invoices/${id}?embedded=1`;
  if (kind === "quotes" && id) return `/quotes/${id}?embedded=1`;
  if ((kind === "jobs" || kind === "unassignedJobs" || kind === "proofJobs") && id) return `/jobs/${id}?embedded=1`;
  if (kind === "workers") return "/team?embedded=1";
  if (kind === "approvals") return "/ai-operator/approvals?embedded=1";
  return "/dashboard?embedded=1";
}

function ensureEmbedded(route) {
  if (!route) return "/dashboard?embedded=1";
  return route.includes("embedded=") ? route : `${route}${route.includes("?") ? "&" : "?"}embedded=1`;
}

function buildSuggestedMessage(key, data, derived) {
  if (["revenue", "followups"].includes(key)) {
    const invoice = derived.invoiceFollowups[0];
    if (invoice) return `Hi ${invoice.customer_name || "there"}, just a friendly reminder that invoice ${invoice.invoice_number || ""} is still awaiting payment. Let me know if you need it resent.`;
    const quote = derived.quoteFollowups[0];
    if (quote) return `Hi ${quote.customer_name || "there"}, just checking whether you would like to go ahead with the quote for ${quote.job_description || quote.title || "the work"}.`;
    return "No customer follow-up is due right now.";
  }
  if (["needCrew", "team"].includes(key)) {
    const job = derived.unassignedJobs[0];
    const worker = derived.activeWorkers[0];
    if (job && worker) return `Recommended assignment: ${worker.name || worker.email} for ${labelOf(job, "the job")} because they are active and available in Team. Review schedule conflicts before approving.`;
    if (job) return `This job needs a worker: ${labelOf(job)}. Open Dispatch to assign someone.`;
    return "No unassigned jobs right now.";
  }
  if (key === "proof") return "Review completed job proof, worker notes and photos, then approve the proof pack before preparing the invoice.";
  if (key === "approvals") return "Review AI-prepared actions. Approve only after checking the customer message, invoice, assignment or proof details.";
  return "Review the live records shown above, choose a decision, then open the matching workspace to apply it.";
}

const styles = {
  page: { padding: 24, minHeight: "100vh", background: "#b4aa9b" },
  hero: { display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(300px,.8fr)", gap: 20, background: "linear-gradient(135deg,#070b14,#101827 60%,#0b1220)", borderRadius: 32, padding: 28, color: "white", boxShadow: "0 24px 70px rgba(15,23,42,.32)" },
  heroTitle: { fontSize: 48, lineHeight: 1, margin: "26px 0 12px", color: "#fff" },
  heroText: { color: "#dbeafe", fontSize: 16, maxWidth: 680 },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 },
  orangeButton: { border: 0, borderRadius: 16, padding: "13px 18px", fontWeight: 800, background: "#ff5a12", color: "white", cursor: "pointer" },
  whiteButton: { border: "1px solid #d8e3f3", borderRadius: 16, padding: "13px 18px", fontWeight: 800, background: "white", color: "#0f172a", cursor: "pointer" },
  whiteButtonSmall: { border: "1px solid #d8e3f3", borderRadius: 12, padding: "10px 12px", fontWeight: 800, background: "white", color: "#0f172a", cursor: "pointer" },
  primarySmall: { border: 0, borderRadius: 12, padding: "10px 12px", fontWeight: 800, background: "#155eef", color: "white", cursor: "pointer" },
  ghostSmall: { border: "1px solid transparent", borderRadius: 12, padding: "10px 12px", fontWeight: 800, background: "transparent", color: "#475569", cursor: "pointer" },
  livePanel: { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 24, padding: 18 },
  liveHeader: { display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 900, letterSpacing: ".08em", color: "#cbd5e1" },
  liveDot: { color: "#22c55e" },
  liveGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 },
  metric: { textAlign: "left", border: "1px solid rgba(255,255,255,.12)", background: "rgba(15,23,42,.44)", borderRadius: 18, padding: 14, color: "white", cursor: "pointer" },
  metricIcon: { display: "inline-flex", width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "rgba(37,99,235,.22)", marginBottom: 10 },
  safety: { marginTop: 14, borderRadius: 18, padding: 14, background: "#0f172a", color: "#dbeafe", fontWeight: 700 },
  notice: { marginTop: 14, borderRadius: 14, padding: 12, background: "#065f46", color: "white", fontWeight: 700 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginTop: 18 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18, marginTop: 18 },
  actionCard: { textAlign: "left", border: "1px solid rgba(117,108,95,.42)", background: "linear-gradient(135deg,#fff,#f7f3ea 62%,#eef4ff)", borderRadius: 24, padding: 18, boxShadow: "0 12px 34px rgba(15,23,42,.10)", cursor: "pointer" },
  cardIcon: { display: "inline-flex", width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center", background: "#fff1e8", color: "#ff5a12", marginBottom: 12, fontWeight: 900 },
  card: { background: "rgba(255,255,255,.86)", border: "1px solid rgba(117,108,95,.35)", borderRadius: 26, padding: 20, boxShadow: "0 14px 38px rgba(15,23,42,.10)" },
  header: { marginBottom: 14 },
  move: { display: "block", width: "100%", textAlign: "left", border: "1px solid #d8e3f3", borderRadius: 18, padding: 14, background: "white", marginTop: 10, cursor: "pointer" },
  list: { display: "grid", gap: 10 },
  row: { display: "flex", justifyContent: "space-between", gap: 10, width: "100%", textAlign: "left", border: "1px solid #d8e3f3", borderRadius: 16, background: "white", padding: 12, cursor: "pointer" },
  empty: { border: "1px dashed #cbd5e1", borderRadius: 16, padding: 18, color: "#475569", background: "#f8fafc" },
  linkButton: { marginTop: 14, border: 0, background: "transparent", color: "#155eef", fontWeight: 800, cursor: "pointer" },
  workspaceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 },
  workspaceTile: { textAlign: "left", border: "1px solid #d8e3f3", borderRadius: 18, padding: 14, background: "white", cursor: "pointer" },
  tileIcon: { display: "inline-flex", width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", background: "#edf4ff", color: "#155eef", marginBottom: 10 },
  modalBack: { position: "fixed", inset: 0, zIndex: 160, background: "rgba(15,23,42,.58)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 },
  modal: { width: "min(860px,100%)", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: 28, padding: 22, boxShadow: "0 28px 90px rgba(0,0,0,.30)" },
  modalHead: { display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 14, marginBottom: 14 },
  close: { border: 0, background: "transparent", fontSize: 28, cursor: "pointer" },
  panelNotice: { border: "1px solid #a7f3d0", background: "#ecfdf5", color: "#065f46", borderRadius: 14, padding: 10, marginBottom: 12, fontWeight: 700 },
  panelList: { display: "grid", gap: 10, marginBottom: 14 },
  panelItem: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", border: "1px solid #d8e3f3", borderRadius: 16, padding: 12, background: "#fbfdff" },
  itemButton: { border: "1px solid #cbd5e1", borderRadius: 12, background: "white", padding: "8px 10px", fontWeight: 800, cursor: "pointer" },
  emptyPanel: { display: "grid", gap: 10, border: "1px dashed #cbd5e1", borderRadius: 18, background: "#f8fafc", padding: 18, color: "#475569", marginBottom: 14 },
  fieldLabel: { display: "block", margin: "12px 0 6px", fontWeight: 800, color: "#0f172a" },
  textarea: { width: "100%", minHeight: 110, border: "1px solid #cbd5e1", borderRadius: 14, padding: 12, color: "#0f172a" },
  input: { width: "100%", border: "1px solid #cbd5e1", borderRadius: 14, padding: 12, color: "#0f172a" },
  modalActions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 },
  workspaceBack: { position: "fixed", inset: 0, zIndex: 170, background: "rgba(15,23,42,.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 },
  workspaceModal: { width: "min(1200px,100%)", height: "88vh", background: "white", borderRadius: 28, overflow: "hidden", boxShadow: "0 28px 90px rgba(0,0,0,.32)" },
  workspaceHead: { height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", borderBottom: "1px solid #e2e8f0" },
  frame: { width: "100%", height: "calc(88vh - 62px)", border: 0 },
};
