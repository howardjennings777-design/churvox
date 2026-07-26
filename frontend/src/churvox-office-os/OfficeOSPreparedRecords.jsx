import React from "react";
import { CheckCircle2, FileCheck2, LoaderCircle, MessageSquareText, RefreshCw, UsersRound } from "lucide-react";
import { BACKEND_COMMAND_EVENT } from "../churvox-office-lab/OfficeTeamCommandApi";
import { loadPreparedCommandRecords } from "./preparedRecordProof";
import "./officeOSPreparedRecords.css";

export const OFFICE_OS_PREPARED_RECORDS_BUILD = "churvox-office-os-prepared-records-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_PREPARED_RECORDS_BUILD__ = OFFICE_OS_PREPARED_RECORDS_BUILD;
}

const SECTIONS = Object.freeze([
  {
    id: "message_drafts",
    label: "Message drafts",
    empty: "No approved message drafts yet",
    Icon: MessageSquareText,
    safety: "Stored only. No email, SMS or notification was sent.",
  },
  {
    id: "payroll_reviews",
    label: "Staff reviews",
    empty: "No approved staff reviews yet",
    Icon: UsersRound,
    safety: "Review only. Nobody was paid and no tax or bank file was created.",
  },
]);

function currentArea() {
  if (typeof window === "undefined") return "today";
  return new URLSearchParams(window.location.search || "").get("area") || "today";
}

function useCurrentArea() {
  const [area, setArea] = React.useState(currentArea);
  React.useEffect(() => {
    const update = () => setArea(currentArea());
    const timer = window.setInterval(update, 300);
    window.addEventListener("popstate", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return area;
}

function recordTitle(record = {}) {
  return String(record.title || record.subject || record.worker || record.name || "Approved prepared record");
}

function recordDetail(record = {}) {
  const form = record.prepared_form && typeof record.prepared_form === "object" ? record.prepared_form : {};
  return String(
    record.notes
      || record.body
      || record.message
      || record.issue
      || form.message
      || form.issue
      || form.notes
      || "Owner-approved draft stored safely.",
  );
}

function Section({ config, state }) {
  const Icon = config.Icon;
  const records = state?.records || [];
  return (
    <section className="cvosPreparedSection">
      <header>
        <div><Icon size={19} /><strong>{config.label}</strong></div>
        <span>{records.length}</span>
      </header>
      {records.length ? (
        <div className="cvosPreparedList">
          {records.slice(0, 8).map((record, index) => (
            <article key={record.id || `${config.id}-${index}`}>
              <div><FileCheck2 size={17} /><strong>{recordTitle(record)}</strong></div>
              <p>{recordDetail(record)}</p>
              <small>{record.status || "draft_approved"} · {config.safety}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="cvosPreparedEmpty"><CheckCircle2 size={20} /><span>{state?.message || config.empty}</span></div>
      )}
    </section>
  );
}

export default function OfficeOSPreparedRecords() {
  const area = useCurrentArea();
  const [state, setState] = React.useState({ loading: false, sections: {}, error: "" });

  const load = React.useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const results = await Promise.all(SECTIONS.map(async (config) => [
        config.id,
        await loadPreparedCommandRecords(config.id, { limit: 30 }),
      ]));
      setState({ loading: false, sections: Object.fromEntries(results), error: "" });
    } catch (error) {
      setState({ loading: false, sections: {}, error: error?.message || "Prepared records could not be confirmed." });
    }
  }, []);

  React.useEffect(() => {
    if (area !== "command") return undefined;
    load();
    const refresh = () => load();
    window.addEventListener(BACKEND_COMMAND_EVENT, refresh);
    return () => window.removeEventListener(BACKEND_COMMAND_EVENT, refresh);
  }, [area, load]);

  if (area !== "command") return null;

  return (
    <aside className="cvosPreparedRecords" data-prepared-record-proof="true">
      <header className="cvosPreparedHead">
        <div>
          <small>Stored draft proof</small>
          <h2>Approved messages and staff reviews</h2>
          <p>These business-scoped reads confirm the draft or review exists after Command approval.</p>
        </div>
        <button type="button" onClick={load} disabled={state.loading} aria-label="Refresh approved prepared records">
          {state.loading ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}
        </button>
      </header>
      {state.error ? <div className="cvosPreparedError">{state.error} No sample records were substituted.</div> : null}
      <div className="cvosPreparedGrid">
        {SECTIONS.map((config) => <Section key={config.id} config={config} state={state.sections[config.id]} />)}
      </div>
    </aside>
  );
}
