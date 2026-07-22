import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import {
  BACKEND_COMMAND_EVENT,
  fetchBackendCommandAudit,
  fetchBackendCommandDecisions,
  recordBackendCommandDecision,
} from "../churvox-office-lab/OfficeTeamCommandApi";
import { loadOfficeArea } from "./officeOSLiveData";
import "./officeOSClientApprovalDesk.css";

export const OFFICE_OS_CLIENT_APPROVAL_DESK_BUILD = "churvox-office-os-client-approval-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_CLIENT_APPROVAL_DESK_BUILD__ = OFFICE_OS_CLIENT_APPROVAL_DESK_BUILD;
}

const CLIENT_FIELDS = Object.freeze([
  { key: "name", label: "Client name", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Service address", long: true },
  { key: "notes", label: "Client notes", long: true },
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

function isConnectedClientDecision(decision) {
  const raw = decision?.raw || {};
  const payload = raw?.payload || {};
  const source = String(payload.source || "").toLowerCase();
  const type = `${raw.source_type || ""} ${payload.area || ""}`.toLowerCase();
  return source === "connected_office_os_quick_prepare" && /client|customer/.test(type);
}

function draftFromDecision(decision) {
  const form = decision?.form || decision?.raw?.prepared_form || decision?.raw?.payload?.prepared_form || {};
  return Object.fromEntries(CLIENT_FIELDS.map((field) => [field.key, String(form?.[field.key] || "")]));
}

function approvalAction(decision) {
  return (decision?.actions || []).find((action) => /approve/i.test(String(action || ""))) || "Approve and create client";
}

async function verifyAppliedClient(response, decision, draft) {
  const execution = response?.result?.execution || {};
  if (!execution.applied) return { clientConfirmed: false, auditConfirmed: false };

  const createdId = String(execution.id || execution.ids?.[0] || "");
  const slipId = String(decision?.raw?.command_slip_id || "");
  const expectedName = String(draft?.name || "").trim().toLowerCase();
  const [clients, audit] = await Promise.all([
    loadOfficeArea("clients").catch(() => ({ records: [] })),
    fetchBackendCommandAudit().catch(() => ({ audit: [] })),
  ]);

  const clientConfirmed = (clients?.records || []).some((record) => {
    const recordId = String(record?.id || "");
    const title = String(record?.title || "").trim().toLowerCase();
    return (createdId && recordId === createdId) || (expectedName && title === expectedName);
  });
  const auditConfirmed = (audit?.audit || []).some((entry) => {
    const status = `${entry?.status || ""} ${entry?.action || ""}`.toLowerCase();
    return slipId && entry?.slipId === slipId && status.includes("approved_applied");
  });

  return { clientConfirmed, auditConfirmed };
}

function executionSummary(response, proof = {}) {
  const execution = response?.result?.execution || {};
  if (!execution.applied) return response?.result?.message || response?.safety || "The owner decision was recorded, but no client record was created.";
  const id = execution.id || execution.ids?.[0] || "";
  const clientProof = proof.clientConfirmed ? "Live Clients confirmed" : "Live Clients refresh pending";
  const auditProof = proof.auditConfirmed ? "Command audit confirmed" : "Command audit refresh pending";
  return `Owner-approved client created${id ? ` · record ${id}` : ""}. ${clientProof} · ${auditProof}. Nothing was sent, charged or synced.`;
}

export default function OfficeOSClientApprovalDesk() {
  const area = useCurrentArea();
  const [state, setState] = React.useState({ loading: false, decisions: [], message: "" });
  const [drafts, setDrafts] = React.useState({});
  const [busyId, setBusyId] = React.useState("");
  const [results, setResults] = React.useState({});
  const [lastResult, setLastResult] = React.useState(null);

  const load = React.useCallback(async () => {
    setState((current) => ({ ...current, loading: true, message: "" }));
    try {
      const response = await fetchBackendCommandDecisions({ timeoutMs: 5000, attempts: 1, force: true });
      const decisions = (response?.decisions || []).filter(isConnectedClientDecision);
      setDrafts((current) => {
        const next = { ...current };
        decisions.forEach((decision) => {
          if (!next[decision.id]) next[decision.id] = draftFromDecision(decision);
        });
        return next;
      });
      setState({ loading: false, decisions, message: response?.message || "" });
    } catch (error) {
      setState({ loading: false, decisions: [], message: error?.message || "Command could not be refreshed safely." });
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

  const approve = async (decision) => {
    const draft = drafts[decision.id] || draftFromDecision(decision);
    if (!draft.name.trim() || busyId) return;
    setBusyId(decision.id);
    setResults((current) => ({ ...current, [decision.id]: null }));
    setLastResult(null);

    try {
      const fields = CLIENT_FIELDS.map((field) => ({
        label: field.key,
        value: String(draft[field.key] || "").trim(),
        long: Boolean(field.long),
      }));
      const response = await recordBackendCommandDecision(decision, approvalAction(decision), {
        formTitle: "Owner-approved client record",
        note: `Owner checked and approved the prepared client record for ${draft.name.trim()}.`,
        fields,
      });
      if (response?.localOnly) throw new Error("The backend approval route was not available. Nothing was created.");
      const proof = await verifyAppliedClient(response, decision, draft);
      const result = { ok: Boolean(response?.result?.execution?.applied), message: executionSummary(response, proof) };
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

  return (
    <aside className="cvosClientApprovalDesk" aria-label="Owner-approved client creation desk" data-owner-approved-client-desk="true">
      <header className="cvosClientApprovalHead">
        <div className="cvosClientApprovalIcon"><ShieldCheck size={22} /></div>
        <div>
          <small>First proven replacement action</small>
          <h2>Approve prepared clients</h2>
          <p>The backend creates the client only after you check these fields and approve.</p>
        </div>
        <button type="button" onClick={load} disabled={state.loading || Boolean(busyId)} aria-label="Refresh prepared clients">
          <RefreshCw size={18} className={state.loading ? "spin" : ""} />
        </button>
      </header>

      {lastResult ? (
        <div className={lastResult.ok ? "cvosClientApprovalResult cvosClientApprovalProof good" : "cvosClientApprovalResult cvosClientApprovalProof bad"} role="status">
          {lastResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{lastResult.message}</span>
        </div>
      ) : null}

      {state.loading && !state.decisions.length ? (
        <div className="cvosClientApprovalEmpty"><LoaderCircle className="spin" size={24} /><strong>Checking Command</strong><span>No record is changed while this loads.</span></div>
      ) : null}

      {!state.loading && !state.decisions.length ? (
        <div className="cvosClientApprovalEmpty"><CheckCircle2 size={25} /><strong>No prepared clients waiting</strong><span>{state.message || "Prepare a client from the owner drawer, then review it here."}</span></div>
      ) : null}

      <div className="cvosClientApprovalList">
        {state.decisions.map((decision) => {
          const draft = drafts[decision.id] || draftFromDecision(decision);
          const result = results[decision.id];
          const busy = busyId === decision.id;
          return (
            <article key={decision.id} className="cvosClientApprovalCard">
              <div className="cvosClientApprovalCardTitle">
                <UserRoundPlus size={20} />
                <div><small>{decision.subtitle}</small><h3>{decision.title}</h3></div>
              </div>

              <div className="cvosClientApprovalFields">
                {CLIENT_FIELDS.map((field) => (
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
                <button type="button" onClick={() => approve(decision)} disabled={busy || Boolean(busyId) || !draft.name.trim()}>
                  {busy ? <LoaderCircle size={17} className="spin" /> : <CheckCircle2 size={17} />}
                  {busy ? "Applying owner approval…" : approvalAction(decision)}
                </button>
                <small>Creates one business-scoped client record. It does not send, charge or sync.</small>
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
