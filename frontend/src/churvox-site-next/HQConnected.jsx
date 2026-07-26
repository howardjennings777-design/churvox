import React from "react";
import { ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import ChurvoxHQPage from "../pages/ChurvoxHQPage";
import { loadHqLiveStatus } from "./hqLiveData";
import "./hqConnected.css";

export const HQ_CONNECTED_BUILD = "churvox-hq-connected-live-20260726";

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
  if (state === "live") return "Live HQ reads connected";
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
    <div className="cvhqConnected" data-connected-hq-replacement="true" data-live-hq-workspace="true">
      <section className="cvhqLiveRail" aria-label="Connected HQ read status">
        <div className="cvhqLiveSummary">
          <ShieldCheck size={24} />
          <div>
            <small>Connected My HQ</small>
            <h1>{status.connected} of {status.total} platform read sources confirmed</h1>
            <p>This private route now uses the same live HQ controls as the working /admin page. No sample businesses, billing totals or tester records are substituted.</p>
          </div>
        </div>
        <div className="cvhqLiveActions">
          <span className={`cvhqLiveState ${tone(visibleState)}`}>{label(visibleState)}</span>
          <button type="button" onClick={() => refresh()} disabled={loading}><RefreshCw size={16} className={loading ? "cvhqSpin" : ""} /> Refresh reads</button>
          <a href="/admin">Open My HQ <ArrowUpRight size={16} /></a>
        </div>
        <div className="cvhqSourceGrid">
          {(status.sources || []).map((source) => (
            <article key={source.path} className={tone(source.state)}>
              <div><strong>{source.label}</strong><span>{source.status}</span></div>
              <b>{source.state === "live" ? source.count : "—"}</b>
              <p>{source.message}</p>
            </article>
          ))}
          {!status.sources?.length ? <article className="neutral"><div><strong>HQ platform reads</strong><span>{label(visibleState)}</span></div><b>—</b><p>No platform totals are shown until the live owner sources answer.</p></article> : null}
        </div>
        <footer>
          <strong>Wired boundary:</strong> the status adapter remains authenticated and read-only. Changes inside My HQ still use the existing validated platform-owner controls.
        </footer>
      </section>
      <ChurvoxHQPage embedded />
    </div>
  );
}
