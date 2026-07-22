import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPlus,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  BACKEND_COMMAND_EVENT,
  fetchBackendCommandAudit,
  fetchBackendCommandDecisions,
  recordBackendCommandDecision,
} from "../churvox-office-lab/OfficeTeamCommandApi";
import { loadOfficeArea } from "./officeOSLiveData";
import "./officeOSClientApprovalDesk.css";
import "./officeOSApprovalDesk.css";

export const OFFICE_OS_APPROVAL_DESK_BUILD = "churvox-office-os-approval-desk-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_APPROVAL_DESK_BUILD__ = OFFICE_OS_APPROVAL_DESK_BUILD;
}

const APPROVAL_TYPES = Object.freeze([
  {
    id: "clients",
    tab: "Clients",
    heading: "Approve prepared clients",
    empty: "No prepared clients waiting",
    recordNoun: "client",
    liveArea: "clients",
    primaryField: "name",
    actionFallback: "Approve and create client",
    formTitle: "Owner-approved client record",
    typePattern: /client|customer/,
    fields: [
      { key: "name", label: "Client name", required: true },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Service address", long: true },
      { key: "notes", label: "Client notes", long: true },
    ],
  },
  {
    id: "work",
    tab: "Jobs",
    heading: "Approve prepared jobs",
    empty: "No prepared jobs waiting",
    recordNoun: "job draft",
    liveArea: "work",
    primaryField: "title",
    actionFallback: "Approve and create job draft",
    formTitle: "Owner-approved job draft",
    typePattern: /job|work|booking/,
    fields: [
      { key: "title", label: "Job title", required: true },
      { key: "client", label: "Client" },
      { key: "date", label: "Date or timing" },
      { key: "worker", label: "Worker" },
      { key: "price", label: "Price" },
      { key: "notes", label: "Scope and instructions", long: true },
    ],
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
    window.addEventListener("hashchange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);

  return area;
}

function isConnectedDecision(decision, config) {
  const raw = decision?.raw || {};
  const payload = raw?.payload || {};
  const source = String(payload.source || "").toLowerCase();
  const type = `${raw.source_type || ""} ${payload.area || ""}`.toLowerCase();
  return source === "connected_office_os_quick_prepare" && config.typePattern.test(type);
}

function draftFromDecision(decision, config) {
  const form = decision?.form || decision?.raw?.prepared_form || decision?.raw?.payload?.prepared_form || {};
  return Object.fromEntries(config.fields.map((field) => [field.key, String(form?.[field.key] || "")]));
}

function approvalAction(decision, config) {
  return (decision?.actions || []).find((action) => /approve/i.test(String(action || ""))) || config.actionFallback;
}

async function verifyAppliedRecord(response, decision, draft, config) {
  const execution = response?.result?.execution || {};
  if (!execution.applied) return { recordConfirmed: false, auditConfirmed: false };

  const createdId = String(execution.id || execution.ids?.[0] || "");
  const slipId = String(decision?.raw?.command_slip_id || "");
  const expectedTitle = String(draft?.[config.primaryField] || "").trim().toLowerCase();
  const [records, audit] = await Promise.all([
    loadOfficeArea(config.liveArea).catch(() => ({ records: [] })),
    fetchBackendCommandAudit().catch(() => ({ audit: [] })),
  ]);

  const recordConfirmed = (records?.records || []).some((record) => {
    const recordId = String(record?.id || "");
    const title = String(record?.title || "").trim().toLowerCase();
    return (createdId && recordId === createdId) || (expectedTitle && title === expectedTitle);
  });
  const auditConfirmed = (audit?.audit || []).some((entry) => {
    const status = `${entry?.status || ""} ${entry?.action || ""}`.toLowerCase();
    return slipId && entry?.slipId === slipId && status.includes("approved_applied");
  });

  return { recordConfirmed, auditConfirmed };
}

function executionSummary(response, proof, config) {
  const execution = response?.result?.execution || {};
  if (!execution.applied) return response?.result?.message || response?.safety || `The owner decision was recorded, but no ${config.recordNoun} was created.`;
  const id = execution.id || execution.ids?.[0] || "";
  const recordProof = proof.recordConfirmed ? `Live ${config.tab} confirmed` : `Live ${config.tab} refresh pending`;
  const auditProof = proof.auditConfirmed ? "Command audit confirmed" : "Command audit refresh pending";
  return `Owner-approved ${config.recordNoun} created${id ? ` · record ${id}` : ""}. ${recordProof} · ${auditProof}. Nothing was sent, charged or synced.`;
}

export default function OfficeOSApprovalDesk() {
  const area = useCurrentArea();
  const [activeType, setActiveType] = React.useState(APPROVAL_TYPES[0].id);
  const [state, setState] = React.useState({ loading: false, decisions: {}, message: "" });
  const [drafts, setDrafts] = React.useState({});
  const [busyId, setBusyId] = React.useState("");
  const [results, setResults] = React.useState({});
  const [lastResult, setLastResult] = React.useState(null);

  const load = React.useCallback(async () => {
    setState((current) => ({ ...current, loading: true, message: "" }));
    try {
      const response = await fetchBackendCommandDecisions({ timeoutMs: 5000, attempts: 1, force: true });
      const grouped = Object.fromEntries(APPROVAL_TYPES.map((config) => [
        config.id,
        (response?.decisions || []).filter((decision) => isConnectedDecision(decision, config)),
      ]));
      setDrafts((current) => {
        const next = { ...current };
        APPROVAL_TYPES.forEach((config) => {
          grouped[config.id].forEach((decision) => {
            if (!next[decision.id]) next[decision.id] = draftFromDecision(decision, config);
          });
        });
        return next;
      });
      setActiveType((current) => {
        if ((grouped[current] || []).length) return current;
        return APPROVAL_TYPES.find((config) => grouped[config.id].length)?.id || current;
      });
      setState({ loading: false, decisions: grouped, message: response?.message || "" });
    } catch (error) {
      setState({ loading: false, decisions: {}, message: error?.message || "Command could not be refreshed safely." });
    }
  }, []);

  React.useEffect(() => {
    if (area !== "command") return undefined;
    load();
    const refresh = () => load();
    window.addEventListener(BACKEND_COMMAND_EVENT, refresh);
    return () => window.removeEventListener(BACKEND_COMMAND_EVENT, refresh);
  }, [area, load]);

  const updateField = (decisionId, key, value) => {
    setDrafts((current) => ({
      ...current,
      [decisionId]: { ...(current[decisionId] || {}), [key]: value },
    }));
    setResults((current) => ({ ...current, [decisionId]: null }));
  };

  const approve = async (decision, config) => {
    const draft = drafts[decision.id] || draftFromDecision(decision, config);
    if (!String(draft[config.primaryField] || "").trim() || busyId) return;
    setBusyId(decision.id);
    setResults((current) => ({ ...current, [decision.id]: null }));
    setLastResult(null);

    try {
      const fields = config.fields.map((field) => ({
        label: field.key,
        value: String(draft[field.key] || "").trim(),
        long: Boolean(field.long),
      }));
      const response = await recordBackendCommandDecision(decision, approvalAction(decision, config), {
        formTitle: config.formTitle,
        note: `Owner checked and approved the prepared ${config.recordNoun} for ${String(draft[config.primaryField] || "").trim()}.`,
        fields,
      });
      if (response?.localOnly) throw new Error("The backend approval route was not available. Nothing was created.");
      const proof = await verifyAppliedRecord(response, decision, draft, config);
      const result = { ok: Boolean(response?.result?.execution?.applied), message: executionSummary(response, proof, config) };
      setResults((current) => ({ ...current, [decision.id]: result }));
      setLastResult(result);
      await load();
    } catch (error) {
      const result = { ok: false, message: `${error?.message || "Approval failed."} Nothing was sent, charged or synced.` };
      setResults((current) => ({ ...current, [decision.id]: result }));
      setLastResult(result);
    } finally {
      setBusyId("");
    }
  };

  if (area !== "command") return null;

  const config = APPROVAL_TYPES.find((item) => item.id === activeType) || APPROVAL_TYPES[0];
  const decisions = state.decisions?.[config.id] || [];

  return (
    <aside className="cvosClientApprovalDesk" aria-label="Owner-approved record creation desk" data-owner-approved-record-desk="true">
      <header className="cvosClientApprovalHead">
        <div className="cvosClientApprovalIcon"><ShieldCheck size={22} /></div>
        <div>
          <small>Proven replacement actions</small>
          <h2>Command approval desk</h2>
          <p>The backend creates each record only after you check the fields and approve.</p>
        </div>
        <button type="button" onClick={load} disabled={state.loading || Boolean(busyId)} aria-label="Refresh prepared records">
          <RefreshCw size={18} className={state.loading ? "spin" : ""} />
        </button>
      </header>

      <nav className="cvosApprovalTabs" aria-label="Prepared record types">
        {APPROVAL_TYPES.map((item) => {
          const count = state.decisions?.[item.id]?.length || 0;
          return (
            <button type="button" key={item.id} className={item.id === config.id ? "active" : ""} onClick={() => setActiveType(item.id)}>
              <span>{item.tab}</span><strong>{count}</strong>
            </button>
          );
        })}
      </nav>

      <div className="cvosApprovalTypeCopy">
        <ClipboardPlus size={18} />
        <div><strong>{config.heading}</strong><span>Edit every field before approving.</span></div>
      </div>

      {lastResult ? (
        <div className={lastResult.ok ? "cvosClientApprovalResult cvosClientApprovalProof good" : "cvosClientApprovalResult cvosClientApprovalProof bad"} role="status">
          {lastResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{lastResult.message}</span>
        </div>
      ) : null}

      {state.loading && !decisions.length ? (
        <div className="cvosClientApprovalEmpty"><LoaderCircle className="spin" size={24} /><strong>Checking Command</strong><span>No record is changed while this loads.</span></div>
      ) : null}

      {!state.loading && !decisions.length ? (
        <div className="cvosClientApprovalEmpty"><CheckCircle2 size={25} /><strong>{config.empty}</strong><span>{state.message || `Prepare a ${config.recordNoun} from the owner drawer, then review it here.`}</span></div>
      ) : null}

      <div className="cvosClientApprovalList">
        {decisions.map((decision) => {
          const draft = drafts[decision.id] || draftFromDecision(decision, config);
          const result = results[decision.id];
          const busy = busyId === decision.id;
          const primaryReady = Boolean(String(draft[config.primaryField] || "").trim());
          return (
            <article key={decision.id} className="cvosClientApprovalCard">
              <div className="cvosClientApprovalCardTitle">
                <ClipboardPlus size={20} />
                <div><small>{decision.subtitle}</small><h3>{decision.title}</h3></div>
              </div>

              <div className="cvosClientApprovalFields">
                {config.fields.map((field) => (
                  <label key={field.key} className={field.long ? "wide" : ""}>
                    <span>{field.label}{field.required ? " *" : ""}</span>
                    {field.long ? (
                      <textarea rows="2" value={draft[field.key] || ""} onChange={(event) => updateField(decision.id, field.key, event.target.value)} />
                    ) : (
                      <input value={draft[field.key] || ""} onChange={(event) => updateField(decision.id, field.key, event.target.value)} />
                    )}
                  </label>
                ))}
              </div>

              <div className="cvosClientApprovalActions">
                <button type="button" onClick={() => approve(decision, config)} disabled={busy || Boolean(busyId) || !primaryReady}>
                  {busy ? <LoaderCircle size={17} className="spin" /> : <CheckCircle2 size={17} />}
                  {busy ? "Applying owner approval…" : approvalAction(decision, config)}
                </button>
                <small>Creates one business-scoped {config.recordNoun}. It does not send, charge or sync.</small>
              </div>

              {result ? (
                <div className={result.ok ? "cvosClientApprovalResult good" : "cvosClientApprovalResult bad"}>
                  {result.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{result.message}</span>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </aside>
  );
}
