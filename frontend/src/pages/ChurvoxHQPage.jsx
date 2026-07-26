import React from "react";
import { BarChart3, ExternalLink, Gift, Megaphone, ShieldCheck, Wrench } from "lucide-react";
import PaidLaunchHQSystem from "./PaidLaunchHQSystem";
import TesterApplicationsInbox from "./admin/TesterApplicationsInbox";
import ChurvoxPromotionCentre from "./admin/ChurvoxPromotionCentre";
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

export default function ChurvoxHQPage({ embedded = false }) {
  const [workspace, setWorkspace] = React.useState(workspaceFromLocation);
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
