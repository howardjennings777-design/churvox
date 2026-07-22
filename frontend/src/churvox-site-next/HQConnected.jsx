import React from "react";
import { ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import HQNext from "./HQNext";
import { loadHqLiveStatus } from "./hqLiveData";
import "./hqConnected.css";

export const HQ_CONNECTED_BUILD = "churvox-hq-connected-20260723";

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
  if (state === "live") return "Live read connected";
  if (state === "locked") return "Platform owner access required";
  if (state === "loading") return "Checking HQ sources";
  return "HQ reads unavailable";
}

export default function HQConnected() {
  const [status, setStatus] = React.useState({ state: "loading", sources: [], connected: 0, total: 7, fetchedAt: "" });
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async (signal) => {
    setLoading(true);
    try {
      const next = await loadHqLiveStatus({ signal });
      setStatus(next);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus({ state: "unavailable", sources: [], connected: 0, total: 7, fetchedAt: "", message: error?.message || "HQ reads failed safely." });
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

  return (
    <div className="cvhqConnected" data-connected-hq-replacement="true">
      <section className="cvhqLiveRail" aria-label="Connected HQ read status">
        <div className="cvhqLiveSummary">
          <ShieldCheck size={24} />
          <div>
            <small>Private connected HQ replacement</small>
            <h1>{status.connected} of {status.total} platform read sources confirmed</h1>
            <p>Live platform health is read-only here. Account, billing, tester, support and data changes remain in the current validated HQ.</p>
          </div>
        </div>
        <div className="cvhqLiveActions">
          <span className={`cvhqLiveState ${tone(visibleState)}`}>{label(visibleState)}</span>
          <button type="button" onClick={() => refresh()} disabled={loading}><RefreshCw size={16} className={loading ? "cvhqSpin" : ""} /> Refresh reads</button>
          <a href="/admin">Open working HQ <ArrowUpRight size={16} /></a>
        </div>
        <div className="cvhqSourceGrid">
          {(status.sources || []).map((source) => (
            <article key={source.path} className={tone(source.state)}>
              <div><strong>{source.label}</strong><span>{source.status}</span></div>
              <b>{source.state === "live" ? source.count : "—"}</b>
              <p>{source.message}</p>
            </article>
          ))}
          {!status.sources?.length ? <article className="neutral"><div><strong>HQ platform reads</strong><span>{label(visibleState)}</span></div><b>—</b><p>No sample platform totals are substituted while live sources are unavailable.</p></article> : null}
        </div>
        <footer>
          <strong>Read-only boundary:</strong> this adapter contains authenticated GET requests only. The visual HQ below remains sample-labelled until each area receives a verified live mapping.
        </footer>
      </section>
      <HQNext />
    </div>
  );
}
