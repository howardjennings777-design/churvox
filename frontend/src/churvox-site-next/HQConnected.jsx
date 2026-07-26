import React from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import ChurvoxHQPage from "../pages/ChurvoxHQPage";
import { loadHqLiveStatus } from "./hqLiveData";
import "./hqConnected.css";

export const HQ_CONNECTED_BUILD = "churvox-hq-connected-live-20260727";

if (typeof window !== "undefined") {
  window.__CHURVOX_HQ_CONNECTED_BUILD__ = HQ_CONNECTED_BUILD;
}

function tone(state) {
  if (state === "live") return "good";
  if (state === "locked") return "warn";
  if (state === "loading") return "neutral";
  return "bad";
}

function label(state) {
  if (state === "live") return "Live HQ information loaded";
  if (state === "locked") return "Platform owner access required";
  if (state === "loading") return "Loading live HQ information";
  return "Some HQ information is unavailable";
}

function MetricValue({ value }) {
  const text = String(value ?? "—");
  return <strong title={text}>{text}</strong>;
}

function SourceCard({ source }) {
  const isLive = source.state === "live";
  const Icon = isLive ? CheckCircle2 : AlertTriangle;
  return (
    <article className={`cvhqInfoCard ${tone(source.state)}`}>
      <header>
        <div><Icon size={17} /><span><strong>{source.label}</strong><small>{source.status}</small></span></div>
        <span className={`cvhqSourceState ${tone(source.state)}`}>{isLive ? "LIVE" : "CHECK"}</span>
      </header>
      {source.metrics?.length ? (
        <div className="cvhqMetricGrid">
          {source.metrics.map((item) => (
            <div key={`${source.key}-${item.label}`}>
              <small>{item.label}</small>
              <MetricValue value={item.value} />
              {item.detail ? <p>{item.detail}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="cvhqNoMetrics">
          <strong>{source.state === "locked" ? "Owner access needed" : "No live figures returned"}</strong>
          <p>{source.message}</p>
        </div>
      )}
      {source.metrics?.length ? <p className="cvhqSourceMessage">{source.message}</p> : null}
    </article>
  );
}

export default function HQConnected() {
  const [status, setStatus] = React.useState({ state: "loading", sources: [], connected: 0, errors: 0, total: 7, fetchedAt: "" });
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async (signal) => {
    setLoading(true);
    try {
      const next = await loadHqLiveStatus({ signal });
      setStatus(next);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus({ state: "unavailable", sources: [], connected: 0, errors: 1, total: 7, fetchedAt: "", message: error?.message || "HQ reads failed safely." });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    refresh(controller?.signal);
    return () => controller?.abort();
  }, [refresh]);

  const visibleState = loading ? "loading" : status.state;
  const fetched = status.fetchedAt ? new Date(status.fetchedAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" }) : "Not loaded yet";

  return (
    <div className="cvhqConnected" data-connected-hq-replacement="true" data-live-hq-workspace="true">
      <section className="cvhqLiveRail" aria-label="Connected HQ information">
        <div className="cvhqLiveSummary">
          <ShieldCheck size={25} />
          <div>
            <small>My Churvox HQ</small>
            <h1>Live platform information you can actually use</h1>
            <p>See businesses, users, sign-ups, paid plans, testers, launch checks and connection health. Nothing is guessed: unavailable information is labelled clearly.</p>
          </div>
        </div>
        <div className="cvhqLiveActions">
          <span className={`cvhqLiveState ${tone(visibleState)}`}>{label(visibleState)}</span>
          <button type="button" onClick={() => refresh()} disabled={loading}><RefreshCw size={16} className={loading ? "cvhqSpin" : ""} /> Refresh information</button>
          <a href="/dashboard">Open Churvox <ArrowUpRight size={16} /></a>
        </div>

        <div className="cvhqSnapshot" aria-label="HQ information status">
          <div><small>Connected sections</small><strong>{status.connected} / {status.total}</strong></div>
          <div><small>Sections needing attention</small><strong>{status.errors || 0}</strong></div>
          <div><small>Last refreshed</small><strong>{fetched}</strong></div>
        </div>

        <div className="cvhqSourceGrid">
          {(status.sources || []).map((source) => <SourceCard key={source.path} source={source} />)}
          {!status.sources?.length ? (
            <article className="cvhqInfoCard neutral">
              <header><div><RefreshCw size={17} /><span><strong>HQ information</strong><small>{label(visibleState)}</small></span></div></header>
              <div className="cvhqNoMetrics"><strong>Waiting for live data</strong><p>Use Refresh information. Exact errors will appear here rather than leaving the page blank.</p></div>
            </article>
          ) : null}
        </div>
      </section>
      <ChurvoxHQPage embedded />
    </div>
  );
}
