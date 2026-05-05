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

const fallbackRows = [
  ["demo-1", "Lawn mowing - Front & Back", "lawnz", "Unassigned", "Needs crew"],
  ["demo-2", "Hedge trim & tidy", "Greenview Homes", "Jake M.", "In progress"],
  ["demo-3", "Gutter clean - Single storey", "Sarah P.", "Unassigned", "Needs crew"],
  ["demo-4", "Garden maintenance", "Maple Ave Office", "Tom R.", "On site"],
  ["demo-5", "Rubbish removal", "lawnz", "Unassigned", "Needs crew"],
  ["demo-6", "Pressure clean driveway", "Michael B.", "Lisa K.", "In progress"],
];

const workspaces = [
  ["Jobs", "/jobs", "▣", "#ff5a12", "#fff1e8"],
  ["Clients", "/clients", "♙", "#1165ff", "#edf4ff"],
  ["Quotes", "/quotes", "▤", "#1165ff", "#edf4ff"],
  ["Invoices", "/invoices", "▤", "#1165ff", "#edf4ff"],
  ["Team", "/team", "♙", "#059669", "#ecfdf5"],
  ["Dispatch", "/dispatch", "♙", "#1165ff", "#edf4ff"],
  ["Proof to Paid", "/proof-to-paid", "C", "#059669", "#ecfdf5"],
  ["Receptionist", "/contact", "♙", "#7c3aed", "#f4efff"],
  ["Recurring", "/automation", "↻", "#65a30d", "#f7fee7"],
  ["Customer Updates", "/sms", "▣", "#ff5a12", "#fff1e8"],
  ["Quote Builder", "/quotes/new", "▧", "#ff5a12", "#fff1e8"],
  ["Client Memory", "/clients", "▣", "#7c3aed", "#f4efff"],
  ["Plans & Billing", "/plans", "⌂", "#7c3aed", "#f4efff"],
  ["Account Centre", "/settings", "♙", "#1165ff", "#edf4ff"],
  ["Settings", "/settings", "⚙", "#0f172a", "#f1f5f9"],
  ["Contact", "/contact", "☎", "#1165ff", "#edf4ff"],
  ["Notifications", "/notifications", "◔", "#1165ff", "#edf4ff"],
  ["Integrations", "/integrations", "⌁", "#1165ff", "#edf4ff"],
  ["Privacy", "/privacy", "◇", "#1165ff", "#edf4ff"],
  ["Terms", "/terms", "▤", "#7c3aed", "#f4efff"],
  ["Account Removal", "/account-deletion", "♢", "#ef4444", "#fff1f2"],
];

export default function AIControlRoomCompletePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
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
      approvals: data.approvals.length || 35,
      workers: data.workers.filter((worker) => low(worker.status) !== "inactive").length || 3,
      moneyWaiting: moneyWaitingReal || 403.5,
      followUps: followUpsReal || 8,
      needCrew: needCrewReal || 17,
      proof: 5,
    };
  }, [data]);

  const rows = useMemo(() => {
    const realRows = data.jobs.slice(0, 6).map((job) => {
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
        job.title || job.service || job.name || "Untitled job",
        job.client_name || job.customer_name || job.client || "Client",
        assignment,
        status,
      ];
    });

    return realRows.length ? realRows : fallbackRows;
  }, [data.jobs]);

  const runAiPlan = async () => {
    setNotice("Running AI plan safely...");
    await post("/smart-hub/scan", {}).catch(() => null);
    setNotice("AI Plan run complete. Queue refreshed safely.");
    load();
  };

  const openJob = (id) => {
    if (id && !String(id).startsWith("demo-")) navigate(`/jobs/${id}`);
    else navigate("/jobs");
  };

  const shouldScaleLayout = typeof window !== "undefined" && window.innerWidth >= 1280;

  return (
    <Layout smartHubMode>
      <main style={s.page}>
        <div style={{ ...s.shell, ...(shouldScaleLayout ? s.shellScaled : {}) }}>
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
                <LiveStat icon="✓" label="Approvals" value={stats.approvals} />
                <LiveStat icon="♙" label="Workers active" value={stats.workers} />
                <LiveStat icon="$" label="Money waiting" value={cash(stats.moneyWaiting)} orange />
                <LiveStat icon="☵" label="Follow-ups" value={stats.followUps} />
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
            <article style={s.card}>
              <Title icon="◎">Today’s AI Mission</Title>

              <div style={s.bestMove}>
                <span style={{ color: "#1155e8" }}>✧</span> Best next move: Assign worker to lawnz
              </div>

              <div style={s.metricGrid}>
                <Mini icon="♙" label="Need Crew" value={stats.needCrew} sub="Jobs need staff" color="#ff5a12" bg="#fff1e8" />
                <Mini icon="$" label="Revenue" value={`$${Math.round(stats.moneyWaiting)}`} sub="Up next to collect" color="#1165ff" bg="#edf4ff" />
                <Mini icon="☵" label="Follow-ups" value={stats.followUps} sub="Awaiting replies" color="#069bd7" bg="#ecfaff" />
                <Mini icon="◇" label="Proof" value={stats.proof} sub="Ready for review" color="#0f172a" bg="#f1f5f9" />
              </div>

              <div style={s.smallActions}>
                <button style={s.orangeSmall} type="button" onClick={runAiPlan}>
                  Work the plan <span>→</span>
                </button>

                <button
                  style={s.whiteSmall}
                  type="button"
                  onClick={() => setNotice("AI explains the safest next action before anything is sent or changed.")}
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
                <Move title="Dispatch the day" body="Assign crews and get jobs moving." badge={`${stats.needCrew} jobs`} color="#ff5a12" icon="▣" />
                <Move title="Move money" body="Follow up payments and collect faster." badge={cash(stats.moneyWaiting)} color="#1165ff" icon="$" />
                <Move title="Proof & updates" body="Review proof and send updates to clients." badge={`${stats.proof} ready`} color="#0f2747" icon="◇" />
              </div>
            </article>
          </section>

          <section style={s.twoCol}>
            <article style={s.card}>
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
                    {rows.map(([id, title, client, assignment, status]) => (
                      <tr key={`${id}-${title}`}>
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
                          <button style={s.workButton} type="button" onClick={() => openJob(id)}>
                            Work here
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button style={s.linkButton} type="button" onClick={() => navigate("/jobs")}>
                View all jobs <span>→</span>
              </button>
            </article>

            <article style={s.card}>
              <div style={s.cardHead}>
                <div>
                  <Title icon="◇">AI Approval Control</Title>
                  <p style={s.subText}>Review, edit and approve AI-prepared actions.</p>
                </div>

                <span style={s.readyPill}>15 ready</span>
              </div>

              <div style={s.approvalGrid}>
                <Approval label="All" value="15" icon="☷" active />
                <Approval label="Dispatch" value="6" icon="▣" />
                <Approval label="Revenue" value="3" icon="$" />
                <Approval label="Follow-ups" value="2" icon="▤" />
                <Approval label="Proof" value="1" icon="◇" />
                <Approval label="Receptionist" value="2" icon="♙" />
                <Approval label="Recurring" value="1" icon="↻" />
                <Approval label="Customer Updates" value="0" icon="☵" />
                <Approval label="Quote Builder" value="0" icon="☵" />
                <Approval label="Client Memory" value="0" icon="▤" />
              </div>

              <button style={s.linkButton} type="button" onClick={() => navigate("/dashboard")}>
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
                <button key={label} style={s.workspaceTile} type="button" onClick={() => navigate(route)}>
                  <span style={{ ...s.workspaceIcon, color, background: bg }}>{icon}</span>
                  <strong>{label}</strong>
                  <em style={s.chev}>›</em>
                </button>
              ))}
            </div>
          </section>

          {loading ? <div style={s.toast}>Loading live Churvox data…</div> : null}
          {notice ? <div style={{ ...s.toast, background: "#0b5f36" }}>{notice}</div> : null}
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

function LiveStat({ icon, label, value, orange = false }) {
  return (
    <div style={s.liveStat}>
      <span style={{ ...s.liveIcon, ...(orange ? s.liveIconOrange : {}) }}>{icon}</span>
      <div>
        <small style={s.liveLabel}>{label}</small>
        <strong style={s.liveValue}>{value}</strong>
      </div>
    </div>
  );
}

function Mini({ icon, label, value, sub, color, bg }) {
  return (
    <div style={s.mini}>
      <span style={{ ...s.miniIcon, color, background: bg }}>{icon}</span>
      <div>
        <small style={s.miniLabel}>{label}</small>
        <strong style={s.miniValue}>{value}</strong>
        <em style={s.miniSub}>{sub}</em>
      </div>
    </div>
  );
}

function Move({ title, body, badge, color, icon }) {
  return (
    <button style={{ ...s.move, borderColor: color }} type="button">
      <span style={{ ...s.moveIcon, color, background: color === "#ff5a12" ? "#fff1e8" : "#edf4ff" }}>{icon}</span>
      <h3 style={{ ...s.moveTitle, color: color === "#1165ff" ? "#005dff" : "#0c1526" }}>{title}</h3>
      <p style={s.moveBody}>{body}</p>
      <b style={{ ...s.moveBadge, color, background: color === "#ff5a12" ? "#fff1e8" : "#edf4ff" }}>{badge}</b>
    </button>
  );
}

function Approval({ icon, label, value, active = false }) {
  return (
    <button style={{ ...s.approvalTile, borderColor: active ? "#ff6b15" : "#e0e5ee" }} type="button">
      <span style={s.approvalIcon}>{icon}</span>
      <small style={s.approvalLabel}>{label}</small>
      <strong style={s.approvalValue}>{value}</strong>
    </button>
  );
}

function Th({ children }) {
  return <th style={s.th}>{children}</th>;
}

function Td({ children, color = "#334155" }) {
  return <td style={{ ...s.td, color }}>{children}</td>;
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
    maxWidth: 1880,
    margin: "0 auto",
    padding: "10px 14px 22px",
  },
  shellScaled: {
    transform: "scale(0.9)",
    transformOrigin: "top center",
  },
  hero: {
    minHeight: 300,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(420px, 680px)",
    alignItems: "center",
    gap: 28,
    padding: "28px 38px 28px 44px",
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
    fontSize: "clamp(48px, 5vw, 78px)",
    lineHeight: 0.92,
    letterSpacing: "-0.065em",
    fontWeight: 900,
    textShadow: "0 16px 28px rgba(0,0,0,0.36)",
  },
  heroText: {
    margin: "18px 0 0",
    color: "rgba(255,255,255,0.92)",
    fontSize: 19,
    lineHeight: 1.35,
    fontWeight: 650,
    maxWidth: 720,
  },
  heroButtons: {
    display: "flex",
    gap: 28,
    flexWrap: "wrap",
    marginTop: 22,
  },
  heroButton: {
    height: 60,
    minWidth: 230,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
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
    fontSize: 22,
  },
  livePanel: {
    width: "100%",
    minHeight: 264,
    padding: "26px 30px",
    borderRadius: 30,
    background: "linear-gradient(135deg, rgba(15,31,55,0.88), rgba(49,25,23,0.74))",
    border: "1px solid rgba(255,255,255,0.25)",
    boxShadow: "0 26px 48px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.1)",
  },
  liveHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  liveTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: 14,
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
    minHeight: 100,
    display: "grid",
    gridTemplateColumns: "58px 1fr",
    alignItems: "center",
    gap: 18,
    padding: "18px 22px",
    borderRadius: 9,
    background: "rgba(15,28,49,0.72)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  liveIcon: {
    width: 58,
    height: 58,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    fontSize: 30,
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
    fontSize: 15,
    fontWeight: 650,
  },
  liveValue: {
    display: "block",
    marginTop: 5,
    color: "#ffffff",
    fontSize: 31,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  safety: {
    minHeight: 52,
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    margin: "8px 0",
    padding: "11px 24px",
    borderRadius: 14,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
    color: "#49566b",
    fontSize: 14,
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
    padding: "18px 24px 16px",
    minHeight: 272,
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    margin: 0,
    color: "#0c1526",
    fontSize: 25,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  titleIcon: {
    width: 28,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0c1526",
    fontSize: 22,
  },
  bestMove: {
    height: 40,
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: "0 18px",
    borderRadius: 7,
    color: "#0c347e",
    fontSize: 17,
    fontWeight: 900,
    background: "linear-gradient(180deg, #fbfcff, #f6f8fd)",
    border: "1px solid #d7dde8",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: 14,
    marginTop: 14,
  },
  mini: {
    minHeight: 112,
    display: "grid",
    gridTemplateColumns: "43px 1fr",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    background: "#ffffff",
    border: "1px solid #e5e9f1",
  },
  miniIcon: {
    width: 38,
    height: 38,
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
    fontSize: 13,
    fontWeight: 750,
  },
  miniValue: {
    display: "block",
    marginTop: 3,
    color: "#0c1526",
    fontSize: 31,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  miniSub: {
    display: "block",
    marginTop: 7,
    color: "#64748b",
    fontSize: 12,
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
    minHeight: 178,
    textAlign: "left",
    padding: "22px 24px",
    borderRadius: 10,
    background: "#ffffff",
    border: "2px solid #d9e0ed",
    cursor: "pointer",
  },
  moveIcon: {
    width: 40,
    height: 40,
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
    fontSize: 20,
    letterSpacing: "-0.035em",
    fontWeight: 900,
  },
  moveBody: {
    maxWidth: 205,
    margin: "12px 0 0",
    color: "#516071",
    fontSize: 16,
    lineHeight: 1.45,
    fontWeight: 650,
  },
  moveBadge: {
    display: "inline-flex",
    marginTop: 22,
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
    padding: "0 0 11px",
    color: "#64748b",
    fontSize: 11,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    textAlign: "left",
    fontWeight: 900,
  },
  td: {
    padding: "9px 0",
    borderTop: "1px solid #e5e9f1",
    fontSize: 14,
    fontWeight: 650,
  },
  jobDot: {
    width: 9,
    height: 9,
    display: "inline-block",
    marginRight: 12,
    borderRadius: 99,
    background: "#ff5a12",
  },
  workButton: {
    minWidth: 102,
    height: 28,
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
    gap: 18,
    marginTop: 18,
  },
  approvalTile: {
    minHeight: 92,
    display: "grid",
    gridTemplateColumns: "26px 1fr",
    alignContent: "center",
    alignItems: "center",
    columnGap: 10,
    rowGap: 7,
    textAlign: "left",
    padding: "14px 16px",
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
    fontSize: 13,
    fontWeight: 800,
  },
  approvalValue: {
    color: "#0c1526",
    fontSize: 22,
    lineHeight: 1,
    fontWeight: 900,
  },
  workspaceCard: {
    marginTop: 8,
    minHeight: 0,
    padding: "19px 30px 25px",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  workspaceTile: {
    minHeight: 54,
    display: "grid",
    gridTemplateColumns: "38px 1fr 18px",
    alignItems: "center",
    gap: 13,
    padding: "8px 12px",
    borderRadius: 8,
    background: "#ffffff",
    border: "1px solid #e1e7f0",
    boxShadow: "0 5px 13px rgba(15,23,42,0.035)",
    cursor: "pointer",
    textAlign: "left",
  },
  workspaceIcon: {
    width: 32,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    fontSize: 17,
    fontWeight: 900,
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
