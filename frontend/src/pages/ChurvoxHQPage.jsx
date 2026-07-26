import React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Gift,
  Megaphone,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import PaidLaunchHQSystem from "./PaidLaunchHQSystem";
import TesterApplicationsInbox from "./admin/TesterApplicationsInbox";
import ChurvoxPromotionCentre from "./admin/ChurvoxPromotionCentre";
import { loadHqLiveStatus } from "../churvox-site-next/hqLiveData";
import "./ChurvoxHQPage.css";
import "./ChurvoxHQSources.css";

const WORKSPACES = [
  {
    key: "control",
    label: "Live control",
    title: "Your live Churvox control room",
    detail: "See what is happening across users, businesses, visitors, work, billing, testers and launch health before opening the deeper controls.",
    icon: ShieldCheck,
  },
  {
    key: "outreach",
    label: "Outreach",
    title: "Bring the next businesses into Churvox",
    detail: "Review outreach drafts, approvals, sends and replies without mixing promotion work into platform operations.",
    icon: Megaphone,
  },
  {
    key: "applications",
    label: "Tester applications",
    title: "Review people asking to test Churvox",
    detail: "See tester applications separately, decide who is suitable, and keep the tester programme easy to follow.",
    icon: Gift,
  },
];

const WORKSPACE_KEYS = new Set(WORKSPACES.map((item) => item.key));

function workspaceFromLocation() {
  if (typeof window === "undefined") return "control";
  try {
    const params = new URLSearchParams(window.location.search || "");
    const queryValue = String(params.get("workspace") || "").trim().toLowerCase();
    if (WORKSPACE_KEYS.has(queryValue)) return queryValue;
    const hashValue = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (WORKSPACE_KEYS.has(hashValue)) return hashValue;
  } catch {}
  return "control";
}

function writeWorkspace(workspace) {
  if (typeof window === "undefined") return;
  try {
    const next = new URL(window.location.href);
    next.searchParams.set("workspace", workspace);
    next.hash = "";
    window.history.replaceState({ ...(window.history.state || {}), churvoxHqWorkspace: workspace }, "", next.toString());
  } catch {}
}

function sourceTone(state) {
  if (state === "live") return "good";
  if (state === "locked") return "warn";
  if (state === "loading") return "neutral";
  return "bad";
}

function summaryNumber(value, loading) {
  if (loading) return "…";
  const result = Number(value);
  return Number.isFinite(result) ? result.toLocaleString("en-NZ") : "Unavailable";
}

function summaryMoney(value, loading) {
  if (loading) return "…";
  const result = Number(value);
  return Number.isFinite(result)
    ? result.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 2 })
    : "Unavailable";
}

function summaryNote(parts = []) {
  return parts.filter(Boolean).join(" · ") || "Waiting for a live backend value";
}

export default function ChurvoxHQPage({ embedded = false }) {
  const [workspace, setWorkspace] = React.useState(workspaceFromLocation);
  const [sourceStatus, setSourceStatus] = React.useState({ state: "loading", sources: [], summary: {}, connected: 0, total: 7, fetchedAt: "" });
  const [sourceLoading, setSourceLoading] = React.useState(true);
  const current = WORKSPACES.find((item) => item.key === workspace) || WORKSPACES[0];

  React.useEffect(() => {
    const sync = () => setWorkspace(workspaceFromLocation());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const refreshSources = React.useCallback(async (signal) => {
    setSourceLoading(true);
    try {
      const next = await loadHqLiveStatus({ signal });
      setSourceStatus(next);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setSourceStatus({
          state: "unavailable",
          sources: [],
          summary: {},
          connected: 0,
          total: 7,
          fetchedAt: "",
          message: error?.message || "HQ live reads could not be loaded.",
        });
      }
    } finally {
      setSourceLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    refreshSources(controller?.signal);
    return () => controller?.abort();
  }, [refreshSources]);

  const selectWorkspace = (key) => {
    setWorkspace(key);
    writeWorkspace(key);
  };

  const summary = sourceStatus.summary || {};
  const atAGlance = [
    {
      label: "Registered users",
      value: summaryNumber(summary.totalUsers, sourceLoading),
      note: summaryNote([`${summaryNumber(summary.activeToday, sourceLoading)} active today`, `${summaryNumber(summary.signups, sourceLoading)} sign-ups`]),
      icon: Users,
    },
    {
      label: "Businesses",
      value: summaryNumber(summary.businesses, sourceLoading),
      note: summaryNote([`${summaryNumber(summary.clients, sourceLoading)} clients stored`, `${summaryNumber(summary.testers, sourceLoading)} testers`]),
      icon: Building2,
    },
    {
      label: "Public visitors",
      value: summaryNumber(summary.uniqueVisitors, sourceLoading),
      note: summaryNote([`${summaryNumber(summary.newVisitorsToday, sourceLoading)} new today`, `${summaryNumber(summary.pageviews, sourceLoading)} pageviews`]),
      icon: Activity,
    },
    {
      label: "Jobs",
      value: summaryNumber(summary.jobs, sourceLoading),
      note: summaryNote([`${summaryNumber(summary.invoices, sourceLoading)} invoices`, "live database totals"]),
      icon: BriefcaseBusiness,
    },
    {
      label: "Verified paid",
      value: summaryNumber(summary.verifiedPaid, sourceLoading),
      note: summaryNote([`${summaryNumber(summary.trials, sourceLoading)} verified trials`, `${summaryNumber(summary.needsCheck, sourceLoading)} need checking`]),
      icon: CreditCard,
    },
    {
      label: "Stripe MRR",
      value: summaryMoney(summary.mrr, sourceLoading),
      note: summary.launchReady === true ? "Launch payment checks are ready" : summary.launchReady === false ? "Open Launch to see what needs attention" : "Waiting for the paid-launch report",
      icon: ReceiptText,
    },
  ];

  return (
    <div
      id="CHURVOX_HQ_SYSTEM"
      className={`cvMyHq${embedded ? " cvMyHqEmbedded" : ""}`}
      data-cv-allow-verbatim="true"
      data-live-hq="true"
      data-hq-workspace={workspace}
      aria-label="My Churvox HQ"
    >
      <header className="cvMyHqHeader">
        <div className="cvMyHqIdentity">
          <span aria-hidden="true"><ShieldCheck size={25} /></span>
          <span>
            <small>Platform owner workspace</small>
            <strong>My Churvox HQ</strong>
          </span>
        </div>
        <div className="cvMyHqHeaderTools">
          <nav className="cvMyHqNav" aria-label="My HQ workspaces">
            {WORKSPACES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={workspace === item.key ? "active" : ""}
                  aria-pressed={workspace === item.key}
                  aria-current={workspace === item.key ? "page" : undefined}
                  onClick={() => selectWorkspace(item.key)}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          {!embedded ? (
            <nav className="cvMyHqUtilityNav" aria-label="HQ platform tools">
              <a href="/dashboard"><ExternalLink size={16} />Owner app</a>
              <a href="/admin/usage"><BarChart3 size={16} />Usage</a>
              <a href="/platform"><Wrench size={16} />Platform tools</a>
            </nav>
          ) : null}
        </div>
      </header>

      <section className="cvMyHqIntro" aria-labelledby="cv-my-hq-title">
        <div>
          <small>{current.label}</small>
          <h1 id="cv-my-hq-title">{current.title}</h1>
          <p>{current.detail}</p>
        </div>
        <div className="cvMyHqConnectionState">
          <strong>Connected to live HQ controls</strong>
          <span className={`cvMyHqLiveBadge ${sourceTone(sourceLoading ? "loading" : sourceStatus.state)}`}><i aria-hidden="true" /> {sourceLoading ? "Checking live HQ data" : `${sourceStatus.connected} of ${sourceStatus.total} sources connected`}</span>
        </div>
      </section>

      {workspace === "control" ? (
        <section className="cvMyHqAtAGlance" aria-label="Live Churvox platform summary">
          <header>
            <div>
              <small>What is happening now</small>
              <h2>Live platform picture</h2>
              <p>These figures come from the owner backend, database, growth report and Stripe-backed launch report.</p>
            </div>
            <span>{sourceLoading ? "Refreshing live totals" : sourceStatus.fetchedAt ? `Updated ${new Date(sourceStatus.fetchedAt).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}` : "No update time returned"}</span>
          </header>
          <div>
            {atAGlance.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label}>
                  <span aria-hidden="true"><Icon size={19} /></span>
                  <div>
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                    <p>{item.note}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="cvMyHqSources" aria-label="HQ live source information">
        <header>
          <div>
            <small>Live source detail</small>
            <h2>{sourceLoading ? "Checking Churvox HQ" : `${sourceStatus.connected} connected source${sourceStatus.connected === 1 ? "" : "s"}`}</h2>
            <p>Each card now explains the useful information returned by that source. Failed or locked sources stay visible rather than being replaced with guessed numbers.</p>
          </div>
          <button type="button" onClick={() => refreshSources()} disabled={sourceLoading}><RefreshCw size={16} className={sourceLoading ? "spin" : ""} />{sourceLoading ? "Checking…" : "Refresh information"}</button>
        </header>
        <div className="cvMyHqSourceGrid">
          {(sourceStatus.sources || []).map((source) => (
            <article key={source.path} className={sourceTone(source.state)}>
              <span aria-hidden="true">{source.state === "live" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
              <div>
                <small>{source.label}</small>
                <strong>{source.state === "live" ? source.value || Number(source.count || 0).toLocaleString("en-NZ") : source.status}</strong>
                <p>{source.message}</p>
                <em>{source.status}</em>
              </div>
            </article>
          ))}
          {!sourceStatus.sources?.length ? (
            <article className="neutral">
              <span aria-hidden="true"><RefreshCw size={18} /></span>
              <div><small>HQ sources</small><strong>{sourceLoading ? "Checking" : "Unavailable"}</strong><p>{sourceStatus.message || "No live source response has been received yet."}</p></div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="cvMyHqPanel" data-hq-workspace={workspace}>
        {workspace === "control" ? <PaidLaunchHQSystem /> : null}
        {workspace === "outreach" ? <ChurvoxPromotionCentre /> : null}
        {workspace === "applications" ? <TesterApplicationsInbox /> : null}
      </section>
    </div>
  );
}
