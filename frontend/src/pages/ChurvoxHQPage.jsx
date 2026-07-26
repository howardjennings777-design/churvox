import React from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ExternalLink, Gift, Megaphone, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
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

export default function ChurvoxHQPage({ embedded = false }) {
  const [workspace, setWorkspace] = React.useState(workspaceFromLocation);
  const [sourceStatus, setSourceStatus] = React.useState({ state: "loading", sources: [], connected: 0, total: 7, fetchedAt: "" });
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
        <span className={`cvMyHqLiveBadge ${sourceTone(sourceLoading ? "loading" : sourceStatus.state)}`}><i aria-hidden="true" /> {sourceLoading ? "Checking live HQ data" : `${sourceStatus.connected} of ${sourceStatus.total} sources connected`}</span>
      </section>

      <section className="cvMyHqSources" aria-label="HQ live source information">
        <header>
          <div>
            <small>Live information</small>
            <h2>{sourceLoading ? "Checking Churvox HQ" : `${sourceStatus.connected} connected source${sourceStatus.connected === 1 ? "" : "s"}`}</h2>
            <p>Every card below shows the real backend result. Failed or locked sources stay visible instead of being replaced with guessed numbers.</p>
          </div>
          <button type="button" onClick={() => refreshSources()} disabled={sourceLoading}><RefreshCw size={16} className={sourceLoading ? "spin" : ""} />{sourceLoading ? "Checking…" : "Refresh information"}</button>
        </header>
        <div className="cvMyHqSourceGrid">
          {(sourceStatus.sources || []).map((source) => (
            <article key={source.path} className={sourceTone(source.state)}>
              <span aria-hidden="true">{source.state === "live" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
              <div>
                <small>{source.label}</small>
                <strong>{source.state === "live" ? Number(source.count || 0).toLocaleString("en-NZ") : source.status}</strong>
                <p>{source.message}</p>
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
