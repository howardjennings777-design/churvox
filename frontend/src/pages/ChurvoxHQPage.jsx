import React from "react";
import { ArrowUpRight, BarChart3, ExternalLink, Gift, Megaphone, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import PaidLaunchHQSystem from "./PaidLaunchHQSystem";
import TesterApplicationsInbox from "./admin/TesterApplicationsInbox";
import ChurvoxPromotionCentre from "./admin/ChurvoxPromotionCentre";
import { loadHqLiveStatus } from "../churvox-site-next/hqLiveData";
import "../churvox-site-next/hqConnected.css";
import "./ChurvoxHQPage.css";

const WORKSPACES = [
  {
    key: "control",
    label: "Live control",
    title: "Your live Churvox control room",
    detail: "Check real users, billing proof, testers, launch health, activity and protected data controls in one place.",
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
const EMPTY_READ_STATUS = Object.freeze({ state: "loading", sources: [], connected: 0, total: 7, fetchedAt: "" });

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

function readTone(state) {
  if (state === "live") return "good";
  if (state === "locked") return "warn";
  if (state === "loading") return "neutral";
  return "bad";
}

function readLabel(state) {
  if (state === "live") return "Live HQ reads connected";
  if (state === "locked") return "Platform owner access required";
  if (state === "loading") return "Checking HQ sources";
  return "HQ reads unavailable";
}

function ConnectedReadRail({ status, loading, onRefresh }) {
  const visibleState = loading ? "loading" : status.state;
  const sources = status.sources || [];

  return (
    <section className="cvhqLiveRail" aria-label="Connected HQ read status">
      <div className="cvhqLiveSummary">
        <ShieldCheck size={24} />
        <div>
          <small>Connected My HQ</small>
          <h1>{status.connected} of {status.total} platform read sources confirmed</h1>
          <p>Live business, billing, tester, growth and control information is checked before the HQ workspaces are shown below.</p>
        </div>
      </div>
      <div className="cvhqLiveActions">
        <span className={`cvhqLiveState ${readTone(visibleState)}`}>{readLabel(visibleState)}</span>
        <button type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={16} className={loading ? "cvhqSpin" : ""} />
          Refresh HQ
        </button>
        <a href="/platform">Platform tools <ArrowUpRight size={16} /></a>
      </div>
      <div className="cvhqSourceGrid">
        {sources.map((source) => (
          <article key={source.path} className={readTone(source.state)}>
            <div><strong>{source.label}</strong><span>{source.status}</span></div>
            <b>{source.state === "live" ? source.count : "—"}</b>
            <p>{source.message}</p>
          </article>
        ))}
        {!sources.length ? (
          <article className="neutral">
            <div><strong>HQ platform reads</strong><span>{readLabel(visibleState)}</span></div>
            <b>—</b>
            <p>HQ is checking the protected owner sources now.</p>
          </article>
        ) : null}
      </div>
      <footer>
        <strong>Live boundary:</strong> these source checks are authenticated and read-only. Changes still use the protected controls inside My Churvox HQ.
      </footer>
    </section>
  );
}

export default function ChurvoxHQPage({ embedded = false }) {
  const [workspace, setWorkspace] = React.useState(workspaceFromLocation);
  const [readStatus, setReadStatus] = React.useState(EMPTY_READ_STATUS);
  const [readsLoading, setReadsLoading] = React.useState(!embedded);
  const current = WORKSPACES.find((item) => item.key === workspace) || WORKSPACES[0];

  const refreshReads = React.useCallback(async (signal) => {
    if (embedded) return;
    setReadsLoading(true);
    try {
      const next = await loadHqLiveStatus({ signal });
      setReadStatus(next);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setReadStatus({ state: "unavailable", sources: [], connected: 0, total: 7, fetchedAt: "", message: error?.message || "HQ reads failed safely." });
      }
    } finally {
      setReadsLoading(false);
    }
  }, [embedded]);

  React.useEffect(() => {
    const sync = () => setWorkspace(workspaceFromLocation());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  React.useEffect(() => {
    if (embedded) return undefined;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    refreshReads(controller?.signal);
    return () => controller?.abort();
  }, [embedded, refreshReads]);

  const selectWorkspace = (key) => {
    setWorkspace(key);
    writeWorkspace(key);
  };

  return (
    <div
      id="CHURVOX_HQ_SYSTEM"
      className={`cvMyHq${embedded ? " cvMyHqEmbedded" : " cvhqConnected"}`}
      data-cv-allow-verbatim="true"
      data-live-hq="true"
      data-connected-hq-replacement={embedded ? undefined : "true"}
      data-hq-workspace={workspace}
      aria-label="My Churvox HQ"
    >
      {!embedded ? <ConnectedReadRail status={readStatus} loading={readsLoading} onRefresh={() => refreshReads()} /> : null}

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
              <a href="/admin/usage"><BarChart3 size={16} />Usage</a>
              <a href="/platform"><Wrench size={16} />Platform tools</a>
              <a href="/new-command-lab?surface=hq"><ExternalLink size={16} />Connected view</a>
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
        <span className="cvMyHqLiveBadge"><i aria-hidden="true" /> Connected to live HQ controls</span>
      </section>

      <section className="cvMyHqPanel" data-hq-workspace={workspace}>
        {workspace === "control" ? <PaidLaunchHQSystem /> : null}
        {workspace === "outreach" ? <ChurvoxPromotionCentre /> : null}
        {workspace === "applications" ? <TesterApplicationsInbox /> : null}
      </section>
    </div>
  );
}
