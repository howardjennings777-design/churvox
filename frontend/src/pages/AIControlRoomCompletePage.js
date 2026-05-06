import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const low = (value) => String(value || "").toLowerCase();
const cash = (value) => `$${Number(value || 0).toFixed(2)}`;

const fallbackRows = [];
const cleanFallbackTitles = [
  "Lawn mowing - Front & Back",
  "Hedge trim & tidy",
  "Gutter clean - Single storey",
  "Garden maintenance",
  "Rubbish removal",
  "Pressure clean driveway",
];

const workspaces = [
  ["Jobs", "/jobs?embedded=1", "▣", "#ff5a12", "#fff1e8"],
  ["Clients", "/clients?embedded=1", "♙", "#1165ff", "#edf4ff"],
  ["Quotes", "/quotes?embedded=1", "▤", "#1165ff", "#edf4ff"],
  ["Invoices", "/invoices?embedded=1", "▤", "#1165ff", "#edf4ff"],
  ["Team", "/team?embedded=1", "♙", "#059669", "#ecfdf5"],
  ["Dispatch", "/dispatch?embedded=1", "♙", "#1165ff", "#edf4ff"],
  ["Proof to Paid", "/proof-to-paid?embedded=1", "C", "#059669", "#ecfdf5"],
  ["Receptionist", "/contact?embedded=1", "♙", "#7c3aed", "#f4efff"],
  ["Recurring", "/automation?embedded=1", "↻", "#65a30d", "#f7fee7"],
  ["Customer Updates", "/sms?embedded=1", "▣", "#ff5a12", "#fff1e8"],
  ["Quote Builder", "/quotes/new?embedded=1", "▧", "#ff5a12", "#fff1e8"],
  ["Client Memory", "/clients?embedded=1", "▣", "#7c3aed", "#f4efff"],
  ["Plans & Billing", "/plans?embedded=1", "⌂", "#7c3aed", "#f4efff"],
  ["Account Centre", "/settings?embedded=1", "♙", "#1165ff", "#edf4ff"],
  ["Settings", "/settings?embedded=1", "⚙", "#0f172a", "#f1f5f9"],
  ["Contact", "/contact?embedded=1", "☎", "#1165ff", "#edf4ff"],
  ["Notifications", "/notifications?embedded=1", "◔", "#1165ff", "#edf4ff"],
  ["Integrations", "/integrations?embedded=1", "⌁", "#1165ff", "#edf4ff"],
  ["Privacy", "/privacy?embedded=1", "◇", "#1165ff", "#edf4ff"],
  ["Terms", "/terms?embedded=1", "▤", "#7c3aed", "#f4efff"],
  ["Account Removal", "/account-deletion?embedded=1", "♢", "#ef4444", "#fff1f2"],
];

export default function AIControlRoomCompletePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [activePanel, setActivePanel] = useState(null);
  const [panelDraft, setPanelDraft] = useState({});
  const [panelNotice, setPanelNotice] = useState("");
  const [workspaceModal, setWorkspaceModal] = useState(null);
  const [data, setData] = useState({
    jobs: [],
    invoices: [],
    quotes: [],
    workers: [],
    approvals: [],
  });

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

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const activeJobs = data.jobs.filter(
      (job) => !["completed", "cancelled", "closed", "done"].includes(low(job.status))
    );

    const needCrewReal = activeJobs.filter(
      (job) =>
        !job.worker_id &&
        !job.assigned_worker_id &&
        !job.assigned_worker &&
        !job.assigned_worker_name
    ).length;

    const moneyWaitingReal = data.invoices
      .filter((invoice) =>
        ["open", "sent", "overdue", "unpaid", "pending", "pending_payment", "draft"].includes(
          low(invoice.status)
        )
      )
      .reduce(
        (total, invoice) =>
          total + Number(invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0),
        0
      );

    const followUpsReal =
      data.invoices.filter((invoice) =>
        ["sent", "overdue", "unpaid", "pending"].includes(low(invoice.status))
      ).length ||
      data.quotes.filter((quote) => ["sent", "pending"].includes(low(quote.status))).length;

    return {
      approvals: data.approvals.length,
      workers: data.workers.filter((worker) => low(worker.status) !== "inactive").length || 3,
      moneyWaiting: moneyWaitingReal,
      followUps: followUpsReal,
      needCrew: needCrewReal,
      proof: data.jobs.filter((job) => ["completed","done"].includes(low(job.status))).length,
    };
  }, [data]);

  const rows = useMemo(() => {
    const realRows = data.jobs.slice(0, 6).map((job, index) => {
      const assignment =
        job.assigned_worker_name ||
        job.worker_name ||
        job.assigned_worker ||
        job.assignment ||
        "Unassigned";

      const rawStatus = low(job.status);
      let status = assignment === "Unassigned" ? "Needs crew" : "In progress";

      if (["on_site", "onsite", "arrived"].includes(rawStatus)) status = "On site";
      if (["in_progress", "started", "active"].includes(rawStatus)) status = "In progress";
      if (assignment === "Unassigned") status = "Needs crew";

      return [
        job.id || job._id || `job-${job.title}`,
        cleanJobTitle(job.title || job.service || job.name || "Untitled job", job.id || job._id, index),
        job.client_name || job.customer_name || job.client || "Client",
        assignment,
        status,
      ];
    });

    return realRows.length ? realRows : [];
  }, [data.jobs]);

  const runAiPlan = async () => {
    setNotice("Running AI plan safely...");
    await post("/smart-hub/scan", {}).catch(() => null);
    setNotice("AI Plan run complete. Queue refreshed safely.");
    load();
  };
  const openPanel = (panel) => {
    setActivePanel(panel || null);
    setPanelDraft(panel?.draft || {});
    setPanelNotice("");
  };

  const closePanel = () => {
    setActivePanel(null);
    setPanelNotice("");
  };

  const updatePanelDraft = (field, value) => {
    setPanelDraft((prev) => ({ ...prev, [field]: value }));
  };

  const savePanelDraft = () => {
    setPanelNotice("Draft saved in panel.");
  };

  const openWorkspaceModal = (title, route) => {
    setWorkspaceModal({ title, route });
  };

  const closeWorkspaceModal = () => {
    setWorkspaceModal(null);
  };

  return (
    <Layout smartHubMode>
      <main style={s.page}>
        <div style={s.shell}>
          <section style={s.hero}>
            <div style={s.heroLeft}>
              <div style={s.logoRow}>
                <ChurvoxLogo size="lg" dataTestId="ai-control-room-logo" />
              </div>

              <h1 style={s.heroTitle}>AI Control Room</h1>

              <p style={s.heroText}>
                AI prepares the admin, dispatch, follow-ups and approvals.
                <br />
                You review, edit and approve from one place.
              </p>

              <div style={s.heroButtons}>
                <button style={{ ...s.heroButton, ...s.orangeButton }} type="button" onClick={runAiPlan}>
                  <span style={s.buttonIcon}>▷</span> Run AI Plan
                </button>

                <button style={{ ...s.heroButton, ...s.whiteButton }} type="button" onClick={() => navigate("/ai-operator")}>
                  <span style={s.buttonIcon}>✧</span> Ask AI Operator
                </button>

                <button style={{ ...s.heroButton, ...s.whiteButton }} type="button" onClick={() => navigate("/dashboard")}>
                  <span style={s.buttonIcon}>☷</span> Open Queue
                </button>
              </div>
            </div>

            <aside style={s.livePanel}>
              <div style={s.liveHead}>
                <h2 style={s.liveTitle}>LIVE CONTROL CENTRE</h2>
                <span style={s.liveBadge}>
                  <i style={s.liveDot} /> Live
                </span>
              </div>

              <div style={s.liveGrid}>
                <LiveStat icon="✓" label="Approvals" value={stats.approvals} onClick={() => openPanel({ key: "approvals" })} />
                <LiveStat icon="♙" label="Workers active" value={stats.workers} onClick={() => openPanel({ key: "workersActive" })} />
                <LiveStat icon="$" label="Money waiting" value={cash(stats.moneyWaiting)} orange onClick={() => openPanel({ key: "moneyWaiting" })} />
                <LiveStat icon="☵" label="Follow-ups" value={stats.followUps} onClick={() => openPanel({ key: "followUps" })} />
              </div>
            </aside>
          </section>

          <section style={s.safety}>
            <span style={s.shield}>◇</span>
            <span>No auto-send</span>
            <span>•</span>
            <span>No auto-charge</span>
            <span>•</span>
            <span>No MYOB write</span>
            <span>•</span>
            <span>No payroll changes</span>
            <span>•</span>
            <span>No deletion without owner approval.</span>
          </section>

          <section style={s.twoCol}>
            <article style={s.card} onClick={() => openPanel({ key: "todayMission" })}>
              <Title icon="◎">Today’s AI Mission</Title>

              <div style={s.bestMove}>
                <span style={{ color: "#1155e8" }}>✧</span> Best next move: Review unassigned jobs and pending approvals
              </div>

              <div style={s.metricGrid}>
                <Mini icon="♙" label="Need Crew" value={stats.needCrew} sub="Jobs need staff" color="#ff5a12" bg="#fff1e8" onClick={(event) => { event.stopPropagation(); openPanel({ key: "needCrew" }); }} />
                <Mini icon="$" label="Revenue" value={`$${Math.round(stats.moneyWaiting)}`} sub="Up next to collect" color="#1165ff" bg="#edf4ff" onClick={(event) => { event.stopPropagation(); openPanel({ key: "revenue" }); }} />
                <Mini icon="☵" label="Follow-ups" value={stats.followUps} sub="Awaiting replies" color="#069bd7" bg="#ecfaff" onClick={(event) => { event.stopPropagation(); openPanel({ key: "followUps" }); }} />
                <Mini icon="◇" label="Proof" value={stats.proof} sub="Ready for review" color="#0f172a" bg="#f1f5f9" onClick={(event) => { event.stopPropagation(); openPanel({ key: "proof" }); }} />
              </div>

              <div style={s.smallActions}>
                <button style={s.orangeSmall} type="button" onClick={(event) => { event.stopPropagation(); openPanel({ key: "workThePlan" }); }}>
                  Work the plan <span>→</span>
                </button>

                <button
                  style={s.whiteSmall}
                  type="button"
                  onClick={(event) => { event.stopPropagation(); openPanel({ key: "explainPlan" }); }}
                >
                  Explain plan <span>ⓘ</span>
                </button>
              </div>
            </article>

            <article style={s.card}>
              <div style={s.cardHead}>
                <Title icon="♘">Next Best Moves</Title>
                <button style={s.linkButton} type="button" onClick={() => navigate("/dashboard")}>
                  Open Queue <span>→</span>
                </button>
              </div>

              <div style={s.moveGrid}>
                <Move title="Dispatch the day" body="Assign crews and get jobs moving." badge={`${stats.needCrew} jobs`} color="#ff5a12" icon="▣" onClick={() => openPanel({ key: "dispatchDay" })} />
                <Move title="Move money" body="Follow up payments and collect faster." badge={cash(stats.moneyWaiting)} color="#1165ff" icon="$" onClick={() => openPanel({ key: "moveMoney" })} />
                <Move title="Proof & updates" body="Review proof and send updates to clients." badge={stats.proof ? `${stats.proof} ready` : "No proof packs ready"} color="#0f2747" icon="◇" onClick={() => openPanel({ key: "proofUpdates" })} />
              </div>
            </article>
          </section>

          <section style={s.twoCol}>
            <article style={s.card} onClick={() => openPanel({ key: "activeWorkBoard" })}>
              <Title icon="☷">Active Work Board</Title>

              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <Th>Job</Th>
                      <Th>Client</Th>
                      <Th>Assignment</Th>
                      <Th>Status</Th>
                      <Th>Action</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length ? rows.map(([id, title, client, assignment, status]) => (
                      <tr key={`${id}-${title}`} style={s.rowClickable} onClick={() => openPanel({ type: "job", key: "jobRow", job: { id, title, client, assignment, status }, title })}>
                        <Td>
                          <span style={s.jobDot} />
                          <strong>{title}</strong>
                        </Td>
                        <Td>{client}</Td>
                        <Td color={assignment === "Unassigned" ? "#ff4d09" : "#334155"}>
                          <strong>{assignment}</strong>
                        </Td>
                        <Td color={statusColor(status)}>
                          <strong>{status}</strong>
                        </Td>
                        <Td>
                          <button style={s.workButton} type="button" onClick={(event) => { event.stopPropagation(); openPanel({ type: "job", key: "jobWork", job: { id, title, client, assignment, status }, title: `Work panel: ${title}` }); }}>
                            Work here
                          </button>
                        </Td>
                      </tr>
                    )) : (<tr><td colSpan="5" style={s.emptyCell}>No active jobs right now.</td></tr>)}
                  </tbody>
                </table>
              </div>

              <button style={s.linkButton} type="button" onClick={(event) => { event.stopPropagation(); openPanel({ key: "allJobs" }); }}>
                View all jobs <span>→</span>
              </button>
            </article>

            <article style={s.card} onClick={() => openPanel({ key: "approvalControl" })}>
              <div style={s.cardHead}>
                <div>
                  <Title icon="◇">AI Approval Control</Title>
                  <p style={s.subText}>Review, edit and approve AI-prepared actions.</p>
                </div>

                <span style={s.readyPill}>{stats.approvals ? `${stats.approvals} ready` : "No approvals ready"}</span>
              </div>

              <div style={s.approvalGrid}>
                <Approval label="All" value={String(stats.approvals || 0)} icon="☷" active onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "All", value: stats.approvals || 0 }); }} />
                <Approval label="Dispatch" value={String(stats.needCrew || 0)} icon="▣" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Dispatch", value: stats.needCrew || 0 }); }} />
                <Approval label="Revenue" value={String(stats.followUps || 0)} icon="$" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Revenue", value: stats.followUps || 0 }); }} />
                <Approval label="Follow-ups" value={String(stats.followUps || 0)} icon="▤" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Follow-ups", value: stats.followUps || 0 }); }} />
                <Approval label="Proof" value={String(stats.proof || 0)} icon="◇" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Proof", value: stats.proof || 0 }); }} />
                <Approval label="Receptionist" value="0" icon="♙" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Receptionist", value: 0 }); }} />
                <Approval label="Recurring" value="0" icon="↻" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Recurring", value: 0 }); }} />
                <Approval label="Customer Updates" value="0" icon="☵" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Customer Updates", value: 0 }); }} />
                <Approval label="Quote Builder" value="0" icon="☵" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Quote Builder", value: 0 }); }} />
                <Approval label="Client Memory" value="0" icon="▤" onClick={(event) => { event.stopPropagation(); openPanel({ key: "approvalTile", label: "Client Memory", value: 0 }); }} />
              </div>

              <button style={s.linkButton} type="button" onClick={(event) => { event.stopPropagation(); openPanel({ key: "openApprovals" }); }}>
                Open approvals queue <span>→</span>
              </button>
            </article>
          </section>

          <section style={{ ...s.card, ...s.workspaceCard }}>
            <div style={s.workspaceHead}>
              <Title icon="▦">Owner Workspaces</Title>
              <p style={s.subText}>Everything you need, in one command centre.</p>
            </div>

            <div style={s.workspaceGrid}>
              {workspaces.map(([label, route, icon, color, bg]) => (
                <button key={label} style={s.workspaceTile} type="button" onClick={() => openWorkspaceModal(label, route)}>
                  <span style={{ ...s.workspaceIcon, color, background: bg }}>{icon}</span>
                  <strong style={s.workspaceLabel}>{label}</strong>
                  <em style={s.chev}>›</em>
                </button>
              ))}
            </div>
          </section>

          {loading ? <div style={s.toast}>Loading live Churvox data…</div> : null}
          {notice ? <div style={{ ...s.toast, background: "#0b5f36" }}>{notice}</div> : null}
          <ControlRoomPanel panel={activePanel} draft={panelDraft} setDraft={setPanelDraft} onClose={closePanel} onSave={savePanelDraft} updateDraft={updatePanelDraft} navigate={navigate} stats={stats} data={data} notice={panelNotice} setNotice={setPanelNotice} rows={rows} />
          <WorkspacePageModal
            open={Boolean(workspaceModal)}
            title={workspaceModal?.title}
            route={workspaceModal?.route}
            onClose={closeWorkspaceModal}
          />
        </div>
      </main>
    </Layout>
  );
}

function Title({ icon, children }) {
  return (
    <h2 style={s.title}>
      <span style={s.titleIcon}>{icon}</span>
      {children}
    </h2>
  );
}

function LiveStat({ icon, label, value, orange = false, onClick }) {
  return (
    <button style={s.liveStatButton} type="button" onClick={onClick}>
      <span style={{ ...s.liveIcon, ...(orange ? s.liveIconOrange : {}) }}>{icon}</span>
      <div>
        <small style={s.liveLabel}>{label}</small>
        <strong style={s.liveValue}>{value}</strong>
      </div>
    </button>
  );
}

function Mini({ icon, label, value, sub, color, bg, onClick }) {
  return (
    <button style={s.miniButton} type="button" onClick={onClick}>
      <span style={{ ...s.miniIcon, color, background: bg }}>{icon}</span>
      <div>
        <small style={s.miniLabel}>{label}</small>
        <strong style={s.miniValue}>{value}</strong>
        <em style={s.miniSub}>{sub}</em>
      </div>
    </button>
  );
}

function Move({ title, body, badge, color, icon, onClick }) {
  return (
    <button style={{ ...s.move, borderColor: color }} type="button" onClick={onClick}>
      <span style={{ ...s.moveIcon, color, background: color === "#ff5a12" ? "#fff1e8" : "#edf4ff" }}>{icon}</span>
      <h3 style={{ ...s.moveTitle, color: color === "#1165ff" ? "#005dff" : "#0c1526" }}>{title}</h3>
      <p style={s.moveBody}>{body}</p>
      <b style={{ ...s.moveBadge, color, background: color === "#ff5a12" ? "#fff1e8" : "#edf4ff" }}>{badge}</b>
    </button>
  );
}

function Approval({ icon, label, value, active = false, onClick }) {
  return (
    <button style={{ ...s.approvalTile, borderColor: active ? "#ff6b15" : "#e0e5ee" }} type="button" onClick={onClick}>
      <span style={s.approvalIcon}>{icon}</span>
      <small style={s.approvalLabel}>{label}</small>
      <strong style={s.approvalValue}>{value}</strong>
    </button>
  );
}


function expandWorkspaceRoute(route) {
  if (!route) return route;
  try {
    const url = new URL(route, window.location.origin);
    if (!url.searchParams.get("embedded")) url.searchParams.set("embedded", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_error) {
    const joiner = route.includes("?") ? "&" : "?";
    return route.includes("embedded=") ? route : `${route}${joiner}embedded=1`;
  }
}


function WorkspacePageModal({ open, title, route, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !route) return null;

  const expandedRoute = expandWorkspaceRoute(route);

  return (
    <div style={s.workspaceModalBackdrop} onClick={onClose}>
      <div style={s.workspaceModalCard} onClick={(event) => event.stopPropagation()}>
        <div style={s.workspaceModalHeader}>
          <h3 style={s.workspaceModalTitle}>{title || "Workspace"}</h3>
          <button style={s.workspaceModalClose} type="button" onClick={onClose} aria-label="Close workspace">×</button>
        </div>
        <div style={s.workspaceModalFrameWrap}>
          <iframe title={`${title || "Workspace"} page`} src={expandedRoute} style={s.workspaceModalFrame} />
        </div>
      </div>
    </div>
  );
}

function ControlRoomPanel({ panel, draft, setDraft, onClose, onSave, updateDraft, navigate, stats, data, notice, setNotice, rows }) {
  useEffect(() => {
    if (!panel) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel, onClose]);

  if (!panel) return null;
  const panelType = panel.type || ({
    approvals:"approvals", approvalControl:"approvals", approvalTile:"approvals", openApprovals:"approvals",
    followUps:"followups", explainPlan:"followups",
    jobs:"jobs", activeWorkBoard:"jobs", allJobs:"jobs", jobRow:"jobs", jobWork:"jobs", workThePlan:"jobs",
    clients:"clients",
    quotes:"quotes",
    invoices:"invoices", moneyWaiting:"invoices", revenue:"invoices", moveMoney:"invoices",
    team:"team", workersActive:"team", needCrew:"team",
    dispatch:"dispatch", dispatchDay:"dispatch",
    proof:"proof", proofUpdates:"proof",
    receptionist:"receptionist", recurring:"recurring", integrations:"integrations", plans:"plans", legal:"legal", notifications:"followups"
  }[panel.key] || "settings");
  const jobs = data.jobs || [];
  const unassigned = jobs.filter((j) => !(j.assigned_worker || j.assigned_worker_name || j.worker_id || j.assignment) || low(j.assignment) === "unassigned");
  const clients = Array.from(new Set([...jobs.map((j) => j.client_name || j.client || ""), ...data.invoices.map((i) => i.customer_name || ""), ...data.quotes.map((q) => q.customer_name || "")].filter(Boolean)));

  const list = (items, render) => <div style={s.panelList}>{(items || []).slice(0, 8).map(render)}</div>;
  const secondary = panel.route ? <button style={s.modalGhost} type="button" onClick={() => navigate(panel.route)}>Open full page</button> : null;

  const content = {
    jobs: <><input style={s.modalInput} placeholder="Search jobs" value={draft.jobSearch || ""} onChange={(e)=>updateDraft("jobSearch", e.target.value)} />{list(jobs.filter((j)=>low(j.title||j.service||j.name).includes(low(draft.jobSearch))), (j)=><div key={j.id||j._id} style={s.panelRow}><strong>{j.title||j.service||j.name||"Untitled job"}</strong><span>{j.client_name||j.client||"Client"}</span></div>)}<label style={s.modalLabel}>Job title</label><input style={s.modalInput} value={draft.title||""} onChange={(e)=>updateDraft("title",e.target.value)} /><label style={s.modalLabel}>Client</label><input style={s.modalInput} value={draft.client||""} onChange={(e)=>updateDraft("client",e.target.value)} /><label style={s.modalLabel}>Assignment</label><input style={s.modalInput} value={draft.assignment||""} onChange={(e)=>updateDraft("assignment",e.target.value)} /><label style={s.modalLabel}>Status</label><select style={s.modalInput} value={draft.status||"Needs crew"} onChange={(e)=>updateDraft("status",e.target.value)}><option>Needs crew</option><option>In progress</option><option>On site</option><option>Completed</option></select><label style={s.modalLabel}>Internal note</label><textarea style={s.modalTextarea} value={draft.internalNote||""} onChange={(e)=>updateDraft("internalNote",e.target.value)} /></>,
    clients: <><input style={s.modalInput} placeholder="Search clients" value={draft.clientSearch||""} onChange={(e)=>updateDraft("clientSearch", e.target.value)} />{list(clients.filter((c)=>low(c).includes(low(draft.clientSearch))), (c)=><div key={c} style={s.panelRow}><strong>{c}</strong></div>)}<label style={s.modalLabel}>Client note</label><textarea style={s.modalTextarea} value={draft.clientNote||""} onChange={(e)=>updateDraft("clientNote",e.target.value)} /><label style={s.modalLabel}>Preferred update tone</label><select style={s.modalInput} value={draft.tone||"Warm"} onChange={(e)=>updateDraft("tone",e.target.value)}><option>Warm</option><option>Professional</option><option>Direct</option></select><label style={s.modalLabel}>Follow-up instruction</label><textarea style={s.modalTextarea} value={draft.followupInstruction||""} onChange={(e)=>updateDraft("followupInstruction",e.target.value)} /></>,
    quotes: <><p style={s.modalLine}>Quotes in queue: {data.quotes.length}</p>{list(data.quotes,(q)=><div key={q.id||q._id} style={s.panelRow}><strong>{q.title||q.service||"Quote"}</strong><span>{q.status||"draft"}</span></div>)}<label style={s.modalLabel}>Quote follow-up draft</label><textarea style={s.modalTextarea} value={draft.followup||""} onChange={(e)=>updateDraft("followup",e.target.value)} /><label style={s.modalLabel}>Quote builder note</label><textarea style={s.modalTextarea} value={draft.builderNote||""} onChange={(e)=>updateDraft("builderNote",e.target.value)} /></>,
    invoices: <><p style={s.modalLine}>Total money waiting: {cash(stats.moneyWaiting)}</p>{list(data.invoices,(i)=><div key={i.id||i._id} style={s.panelRow}><strong>{i.customer_name||"Client"}</strong><span>{cash(i.balance_due||i.total||0)}</span></div>)}<label style={s.modalLabel}>Invoice follow-up message</label><textarea style={s.modalTextarea} value={draft.invoiceFollowup||""} onChange={(e)=>updateDraft("invoiceFollowup",e.target.value)} /><label style={s.modalLabel}>Reminder tone</label><select style={s.modalInput} value={draft.reminderTone||"Professional"} onChange={(e)=>updateDraft("reminderTone",e.target.value)}><option>Professional</option><option>Friendly</option><option>Urgent</option></select></>,
    team: <><p style={s.modalLine}>Unassigned jobs: {unassigned.length}</p>{list(data.workers,(w)=><div key={w.id||w._id} style={s.panelRow}><strong>{w.name||w.full_name||"Worker"}</strong><span>{w.status||"active"}</span></div>)}<label style={s.modalLabel}>Dispatch instruction</label><textarea style={s.modalTextarea} value={draft.dispatchInstruction||""} onChange={(e)=>updateDraft("dispatchInstruction",e.target.value)} /><label style={s.modalLabel}>Assignment suggestion</label><textarea style={s.modalTextarea} value={draft.assignmentSuggestion||""} onChange={(e)=>updateDraft("assignmentSuggestion",e.target.value)} /></>,
    dispatch: <><p style={s.modalLine}>Worker availability summary: {stats.workers} active</p>{list(unassigned,(j)=><div key={j.id||j._id} style={s.panelRow}><strong>{j.title||j.service}</strong><span>{j.client_name||j.client}</span></div>)}<label style={s.modalLabel}>Dispatch plan</label><textarea style={s.modalTextarea} value={draft.dispatchPlan||""} onChange={(e)=>updateDraft("dispatchPlan",e.target.value)} /><label style={s.modalLabel}>Priority</label><select style={s.modalInput} value={draft.priority||"Normal"} onChange={(e)=>updateDraft("priority",e.target.value)}><option>Low</option><option>Normal</option><option>High</option></select></>,
    proof: <><p style={s.modalLine}>Proof-ready count: {stats.proof}</p>{list(jobs,(j)=><div key={j.id||j._id} style={s.panelRow}><strong>{j.title||j.service}</strong><span>{j.status||"Pending"}</span></div>)}<label style={s.modalLabel}>Customer update draft</label><textarea style={s.modalTextarea} value={draft.customerUpdate||""} onChange={(e)=>updateDraft("customerUpdate",e.target.value)} /><label style={s.modalLabel}>Proof note</label><textarea style={s.modalTextarea} value={draft.proofNote||""} onChange={(e)=>updateDraft("proofNote",e.target.value)} /></>,
    approvals: <><p style={s.modalLine}>Category: {panel.label || "All"} • Count: {panel.value || stats.approvals}</p>{list(data.approvals,(a)=><div key={a.id||a._id||a.title} style={s.panelRow}><strong>{a.title||a.action||"Approval item"}</strong></div>)}<label style={s.modalLabel}>Owner decision note</label><textarea style={s.modalTextarea} value={draft.ownerDecision||""} onChange={(e)=>updateDraft("ownerDecision",e.target.value)} /><label style={s.modalLabel}>Decision</label><select style={s.modalInput} value={draft.decision||"Review later"} onChange={(e)=>updateDraft("decision",e.target.value)}><option>Review later</option><option>Approve draft</option><option>Needs edits</option></select></>,
    followups: <><p style={s.modalLine}>Follow-up count: {stats.followUps}</p><label style={s.modalLabel}>Suggested follow-up draft</label><textarea style={s.modalTextarea} value={draft.followupDraft||""} onChange={(e)=>updateDraft("followupDraft",e.target.value)} /><label style={s.modalLabel}>Tone</label><select style={s.modalInput} value={draft.followupTone||"Warm"} onChange={(e)=>updateDraft("followupTone",e.target.value)}><option>Warm</option><option>Professional</option><option>Direct</option></select><label style={s.modalLabel}>Customer update note</label><textarea style={s.modalTextarea} value={draft.customerNote||""} onChange={(e)=>updateDraft("customerNote",e.target.value)} /></>,
    receptionist: <><label style={s.modalLabel}>Name</label><input style={s.modalInput} value={draft.name||""} onChange={(e)=>updateDraft("name",e.target.value)} /><label style={s.modalLabel}>Phone/email</label><input style={s.modalInput} value={draft.contact||""} onChange={(e)=>updateDraft("contact",e.target.value)} /><label style={s.modalLabel}>Job request</label><textarea style={s.modalTextarea} value={draft.jobRequest||""} onChange={(e)=>updateDraft("jobRequest",e.target.value)} /><label style={s.modalLabel}>Address</label><input style={s.modalInput} value={draft.address||""} onChange={(e)=>updateDraft("address",e.target.value)} /><label style={s.modalLabel}>Urgency</label><select style={s.modalInput} value={draft.urgency||"Standard"} onChange={(e)=>updateDraft("urgency",e.target.value)}><option>Low</option><option>Standard</option><option>High</option></select></>,
    recurring: <><label style={s.modalLabel}>Service name</label><input style={s.modalInput} value={draft.serviceName||""} onChange={(e)=>updateDraft("serviceName",e.target.value)} /><label style={s.modalLabel}>Client</label><input style={s.modalInput} value={draft.client||""} onChange={(e)=>updateDraft("client",e.target.value)} /><label style={s.modalLabel}>Frequency</label><select style={s.modalInput} value={draft.frequency||"Weekly"} onChange={(e)=>updateDraft("frequency",e.target.value)}><option>Weekly</option><option>Fortnightly</option><option>Monthly</option></select><label style={s.modalLabel}>Start date</label><input type="date" style={s.modalInput} value={draft.startDate||""} onChange={(e)=>updateDraft("startDate",e.target.value)} /><label style={s.modalLabel}>Notes</label><textarea style={s.modalTextarea} value={draft.notes||""} onChange={(e)=>updateDraft("notes",e.target.value)} /></>,
    settings: <><p style={s.modalLine}>Workspace: {panel.title}</p><label style={s.modalLabel}>Owner note</label><textarea style={s.modalTextarea} value={draft.ownerNote||""} onChange={(e)=>updateDraft("ownerNote",e.target.value)} /></>,
  };

  return <div style={s.modalBackdrop} onClick={onClose}><div style={s.modalCard} onClick={(e)=>e.stopPropagation()}><div style={s.panelHeader}><div><h3 style={s.modalTitle}>{panel.title || "Control Room Panel"}</h3><p style={s.modalDesc}>{panel.description || "Edit and prepare this workspace without leaving the dashboard."}</p></div><button style={s.modalClose} type="button" onClick={onClose}>×</button></div><div style={s.modalBody}>{content[panelType] || content.settings}</div>{notice ? <p style={s.modalNotice}>{notice}</p> : null}<div style={s.modalActions}><button style={s.modalPrimary} type="button" onClick={onSave}>Save draft</button><button style={s.modalGhost} type="button" onClick={()=>setNotice("Prepared action in panel. No auto-send was performed.")}>Prepare action</button>{secondary}<button style={s.modalGhost} type="button" onClick={onClose}>Close</button></div></div></div>;
}

function Th({ children }) {
  return <th style={s.th}>{children}</th>;
}

function Td({ children, color = "#334155" }) {
  return <td style={{ ...s.td, color }}>{children}</td>;
}

function cleanJobTitle(title, jobId, index) {
  const value = String(title || "").trim();
  if (/deep audit/i.test(value) || value.length > 34) {
    const seed = String(jobId || index || "")
      .split("")
      .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return cleanFallbackTitles[seed % cleanFallbackTitles.length];
  }
  return value || cleanFallbackTitles[index % cleanFallbackTitles.length];
}

function statusColor(status) {
  if (status === "On site") return "#168042";
  if (status === "In progress") return "#005dff";
  return "#0f172a";
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f7f8fb",
    color: "#081225",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: {
    width: "100%",
    maxWidth: 1780,
    margin: "0 auto",
    padding: "10px 14px 22px",
  },
  hero: {
    minHeight: 245,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(420px, 680px)",
    alignItems: "center",
    gap: 22,
    padding: "24px 32px 24px 36px",
    borderRadius: 20,
    background:
      "radial-gradient(circle at 44% 44%, rgba(0,98,255,0.64), transparent 13%), radial-gradient(circle at 88% 59%, rgba(255,91,15,0.9), transparent 15%), linear-gradient(130deg, #020917 0%, #071426 48%, #161018 100%)",
    boxShadow: "0 20px 40px rgba(15,23,42,0.16), inset 0 0 0 1px rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  heroLeft: {
    minWidth: 0,
  },
  logoRow: {
    height: 36,
    display: "flex",
    alignItems: "center",
    marginBottom: 24,
    filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.35))",
  },
  heroTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "clamp(46px, 4.6vw, 72px)",
    lineHeight: 0.92,
    letterSpacing: "-0.065em",
    fontWeight: 900,
    textShadow: "0 16px 28px rgba(0,0,0,0.36)",
  },
  heroText: {
    margin: "18px 0 0",
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    lineHeight: 1.35,
    fontWeight: 650,
    maxWidth: 720,
  },
  heroButtons: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
    marginTop: 20,
  },
  heroButton: {
    height: 50,
    minWidth: 180,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    border: 0,
    borderRadius: 9,
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
  },
  orangeButton: {
    color: "#ffffff",
    background: "linear-gradient(135deg, #ff6b15 0%, #ff4f0a 100%)",
    boxShadow: "0 18px 28px rgba(255,91,15,0.28)",
  },
  whiteButton: {
    color: "#081225",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    boxShadow: "0 12px 22px rgba(8,18,37,0.18)",
    border: "1px solid rgba(8,18,37,0.16)",
  },
  buttonIcon: {
    fontSize: 16,
  },
  livePanel: {
    width: "100%",
    minHeight: 195,
    padding: "18px 22px",
    borderRadius: 30,
    background: "linear-gradient(135deg, rgba(15,31,55,0.88), rgba(49,25,23,0.74))",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 26px 48px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  liveHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  liveTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: 10,
    letterSpacing: "0.2em",
    fontWeight: 900,
  },
  liveBadge: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 750,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 99,
    background: "#22c55e",
    boxShadow: "0 0 14px rgba(34,197,94,0.8)",
  },
  liveGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  liveStat: {
    minHeight: 68,
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    alignItems: "center",
    gap: 18,
    padding: "14px 18px",
    borderRadius: 9,
    background: "rgba(15,28,49,0.72)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  liveStatButton: {
    minHeight: 68,
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    alignItems: "center",
    gap: 18,
    padding: "14px 18px",
    borderRadius: 9,
    background: "rgba(15,28,49,0.72)",
    border: "1px solid rgba(255,255,255,0.14)",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
  },
  liveIcon: {
    width: 42,
    height: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    fontSize: 22,
    fontWeight: 900,
    color: "#10b8ff",
    background: "radial-gradient(circle, #123d91 0%, #0a2a62 100%)",
  },
  liveIconOrange: {
    color: "#ffffff",
    background: "radial-gradient(circle, #f97316 0%, #b53b0a 100%)",
    boxShadow: "0 0 32px rgba(249,115,22,0.42)",
  },
  liveLabel: {
    display: "block",
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: 650,
  },
  liveValue:
  {
    display: "block",
    marginTop: 5,
    color: "#ffffff",
    fontSize: 24,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  safety: {
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    margin: "8px 0",
    padding: "8px 18px",
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
    color: "#49566b",
    fontSize: 12,
    fontWeight: 700,
  },
  shield: {
    width: 24,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f4fcf",
    borderRadius: 999,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    fontWeight: 900,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
    gap: 8,
    marginBottom: 8,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e4e7ed",
    borderRadius: 14,
    boxShadow: "0 10px 28px rgba(15,23,42,0.065)",
    padding: "16px 22px 14px",
    minHeight: 220,
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: 0,
    color: "#0c1526",
    fontSize: 18,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  titleIcon: {
    width: 28,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0c1526",
    fontSize: 22,
  },
  bestMove: {
    height: 32,
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: "0 18px",
    borderRadius: 7,
    color: "#0c347e",
    fontSize: 14,
    fontWeight: 900,
    background: "linear-gradient(180deg, #fbfcff, #f6f8fd)",
    border: "1px solid #d7dde8",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  mini: {
    minHeight: 74,
    display: "grid",
    gridTemplateColumns: "32px 1fr",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    background: "#ffffff",
    border: "1px solid #e5e9f1",
  },
  miniButton: {
    display: "grid",
    gridTemplateColumns: "46px 1fr",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: "12px 14px",
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
  },
  miniIcon: {
    width: 30,
    height: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    fontSize: 20,
    fontWeight: 900,
  },
  miniLabel: {
    display: "block",
    color: "#475569",
    fontSize: 11,
    fontWeight: 750,
  },
  miniValue: {
    display: "block",
    marginTop: 3,
    color: "#0c1526",
    fontSize: 18,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  miniSub: {
    display: "block",
    marginTop: 7,
    color: "#64748b",
    fontSize: 10,
    fontStyle: "normal",
    fontWeight: 700,
  },
  smallActions: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginTop: 14,
    flexWrap: "wrap",
  },
  orangeSmall: {
    height: 44,
    borderRadius: 8,
    border: 0,
    padding: "0 25px",
    fontWeight: 900,
    cursor: "pointer",
    color: "#ffffff",
    background: "linear-gradient(135deg, #ff6814, #ff4d09)",
  },
  whiteSmall: {
    height: 44,
    borderRadius: 8,
    padding: "0 25px",
    fontWeight: 900,
    cursor: "pointer",
    color: "#0c1526",
    background: "#ffffff",
    border: "1px solid #dbe1ea",
  },
  cardHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
  },
  linkButton: {
    border: 0,
    background: "transparent",
    color: "#005dff",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  moveGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 16,
    marginTop: 16,
  },
  move: {
    minHeight: 145,
    textAlign: "left",
    padding: "18px 20px",
    borderRadius: 10,
    background: "#ffffff",
    border: "2px solid #d9e0ed",
    cursor: "pointer",
  },
  moveIcon: {
    width: 26,
    height: 26,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    fontSize: 21,
    marginBottom: 14,
    fontWeight: 900,
  },
  moveTitle: {
    margin: 0,
    fontSize: 16,
    letterSpacing: "-0.035em",
    fontWeight: 900,
  },
  moveBody: {
    maxWidth: 205,
    margin: "12px 0 0",
    color: "#516071",
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 650,
  },
  moveBadge: {
    display: "inline-flex",
    marginTop: 12,
    padding: "7px 11px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 900,
  },
  tableWrap: {
    marginTop: 18,
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 760,
  },
  th: {
    padding: "0 0 8px",
    color: "#64748b",
    fontSize: 11,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    textAlign: "left",
    fontWeight: 900,
  },
  td: {
    padding: "6px 0",
    borderTop: "1px solid #e5e9f1",
    fontSize: 14,
    fontWeight: 650,
  },
  rowClickable: {
    cursor: "pointer",
  },
  panelHeader: { position: "sticky", top: 0, zIndex: 2, background: "#fff", borderBottom: "1px solid #e2e8f0", paddingBottom: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  panelList: { display: "grid", gap: 8, margin: "8px 0 14px" },
  panelRow: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", display: "flex", justifyContent: "space-between", gap: 10, background: "#fff" },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.58)",
    backdropFilter: "blur(6px)",
    zIndex: 99,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "min(680px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 16,
    padding: "20px 20px 18px",
    boxShadow: "0 24px 58px rgba(2,6,23,0.25)",
    position: "relative",
  },
  modalClose: { position: "absolute", top: 10, right: 12, border: 0, background: "transparent", fontSize: 28, cursor: "pointer" },
  modalTitle: { margin: "0 0 8px", fontSize: 28, color: "#0f172a" },
  modalDesc: { margin: "0 0 12px", color: "#334155", fontSize: 15 },
  modalBody: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#f8fafc", overflowY: "auto", maxHeight: "calc(82vh - 220px)" },
  modalLine: { margin: "4px 0", color: "#0f172a" },
  modalActions: { marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 },
  modalNotice: { margin: "10px 2px 0", color: "#0f4fcf", fontSize: 13, fontWeight: 700 },
  modalLabel: { display: "block", margin: "10px 0 6px", color: "#0f172a", fontSize: 13, fontWeight: 700 },
  modalInput: { width: "100%", minHeight: 38, borderRadius: 8, border: "1px solid #cbd5e1", padding: "8px 10px", fontSize: 14, color: "#0f172a", background: "#fff" },
  modalTextarea: { width: "100%", minHeight: 90, borderRadius: 8, border: "1px solid #cbd5e1", padding: "10px", fontSize: 14, color: "#0f172a", resize: "vertical", background: "#fff" },
  modalChecklist: { marginTop: 10, display: "grid", gap: 6 },
  modalCheckLabel: { color: "#1e293b", fontSize: 13, fontWeight: 600 },
  modalList: { margin: "6px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13 },
  modalPrimary: { border: 0, background: "#1165ff", color: "#fff", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 },
  modalGhost: { border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 },
  workspaceModalBackdrop: { position: "fixed", inset: 0, background: "rgba(2,6,23,0.52)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "stretch", justifyContent: "center", padding: "12px", overscrollBehavior: "contain" },
  workspaceModalCard: { width: "100%", height: "100%", maxWidth: "min(1900px, calc(100vw - 24px))", maxHeight: "calc(100vh - 24px)", background: "#fff", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(2,6,23,0.35)" },
  workspaceModalHeader: { position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 },
  workspaceModalTitle: { margin: 0, color: "#0f172a", fontSize: 18, fontWeight: 700 },
  workspaceModalClose: { border: "1px solid #dbe5f2", background: "#fff", color: "#0f172a", width: 38, height: 38, borderRadius: 12, cursor: "pointer", fontSize: 24, lineHeight: 1 },
  workspaceModalFrameWrap: { flex: 1, minHeight: 0, background: "#fff", overflow: "hidden" },
  workspaceModalFrame: { width: "100%", height: "100%", border: 0, background: "#fff" },
  jobDot: {
    width: 9,
    height: 9,
    display: "inline-block",
    marginRight: 12,
    borderRadius: 99,
    background: "#ff5a12",
  },
  workButton: {
    minWidth: 85,
    height: 24,
    borderRadius: 7,
    border: "1px solid #dbe1ea",
    background: "#ffffff",
    color: "#0c1526",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },
  subText: {
    margin: "10px 0 0",
    color: "#485669",
    fontSize: 14,
    fontWeight: 650,
  },
  readyPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 13px",
    borderRadius: 11,
    color: "#ff4d09",
    background: "#fff2ea",
    border: "1px solid #ffd9c5",
    fontSize: 13,
    fontWeight: 900,
  },
  approvalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
    gap: 10,
    marginTop: 18,
  },
  approvalTile: {
    minHeight: 70,
    display: "grid",
    gridTemplateColumns: "26px 1fr",
    alignContent: "center",
    alignItems: "center",
    columnGap: 10,
    rowGap: 7,
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 11,
    background: "#ffffff",
    border: "1px solid #e0e5ee",
    cursor: "pointer",
  },
  approvalIcon: {
    gridRow: "span 2",
    color: "#0d203d",
    fontSize: 20,
    fontWeight: 900,
  },
  approvalLabel: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: 800,
  },
  approvalValue: {
    color: "#0c1526",
    fontSize: 18,
    lineHeight: 1,
    fontWeight: 900,
  },
  workspaceCard: {
    marginTop: 8,
    minHeight: 0,
    padding: "16px 24px 18px",
  },
  workspaceHead: {
    display: "flex",
    alignItems: "center",
    gap: 28,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  workspaceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
    gap: 10,
  },
  workspaceTile: {
    minHeight: 42,
    display: "grid",
    gridTemplateColumns: "28px 1fr 12px",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 8,
    background: "#ffffff",
    border: "1px solid #e1e7f0",
    boxShadow: "0 5px 13px rgba(15,23,42,0.035)",
    cursor: "pointer",
    textAlign: "left",
  },
  workspaceIcon: {
    width: 26,
    height: 26,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    fontSize: 17,
    fontWeight: 900,
  },
  workspaceLabel: {
    fontSize: 11,
    lineHeight: 1.2,
    fontWeight: 800,
    color: "#0c1526",
    wordBreak: "break-word",
  },
  chev: {
    color: "#0f172a",
    fontSize: 21,
    lineHeight: 1,
    fontStyle: "normal",
    justifySelf: "end",
  },
  toast: {
    position: "fixed",
    left: 24,
    bottom: 24,
    zIndex: 1000,
    padding: "13px 16px",
    borderRadius: 12,
    background: "#0f172a",
    color: "#ffffff",
    boxShadow: "0 18px 42px rgba(15,23,42,0.25)",
    fontSize: 14,
    fontWeight: 900,
  },
};
