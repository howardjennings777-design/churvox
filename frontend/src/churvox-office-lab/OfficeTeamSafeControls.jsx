import React, { useMemo, useState } from "react";
import "./OfficeTeamSafeControls.css";
import { createBackendCommandSlip } from "./OfficeTeamCommandApi";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

export default function OfficeTeamSafeControls({ area = "office", record = [], primary = "Prepare", secondary = "Review", command = "Send to Command" }) {
  const [trail, setTrail] = useState([]);
  const [busyAction, setBusyAction] = useState("");
  const recordTitle = record?.[1] || record?.[0] || "selected record";
  const ownerRoute = isOwnerRoute();
  const safeActions = useMemo(() => [
    { label: primary, tone: "primary", purpose: "prepare" },
    { label: secondary, tone: "", purpose: "review" },
    { label: command, tone: "", purpose: "command" },
  ].filter((action, index, list) => action.label && list.findIndex((item) => item.label === action.label) === index), [primary, secondary, command]);

  async function recordAction(action) {
    if (busyAction) return;
    setBusyAction(action.label);
    const recordDetail = record?.[3] || record?.[2] || "Selected from the live read-only list.";
    const preparedForm = {
      area,
      record: recordTitle,
      current_status: record?.[2] || record?.[0] || "Review",
      source_detail: recordDetail,
      requested_action: action.label,
    };
    try {
      if (ownerRoute) {
        await createBackendCommandSlip({
          area,
          record,
          action: action.label,
          slip: {
            source_type: area,
            action_type: `owner_${action.purpose}_${slug(action.label)}`,
            source_id: `${slug(area)}-${slug(recordTitle)}-${Date.now()}`,
            title: `${action.label}: ${recordTitle}`,
            found: `${recordTitle} was selected from ${area} for an owner-controlled ${action.purpose} step.`,
            prepared: `${action.label} is now a real Command slip with the selected record attached. Nothing was sent, synced, charged or changed.`,
            why: "The owner should review the prepared fields in Command before an internal draft or later real action is allowed.",
            urgency: action.purpose === "review" ? "Owner review" : "Needs check",
            payload: {
              office_role: roleForArea(area),
              prepared_form: preparedForm,
              actions: ["Approve prepared draft", "Ask staff", "Park"],
              will_do: ["Create an internal owner-approved draft if approved", "Keep sending, syncing and charging locked", "Record the approval trail"],
              source: "owner_safe_control",
              prepared_only: true,
              owner_review_only: true,
              no_auto_send: true,
              no_auto_sync: true,
              no_auto_charge: true,
              no_auto_record_change: true,
            },
          },
        });
        addTrail(action.label, `${action.label} created a real Command slip for ${recordTitle}. Open Command to edit or approve it.`);
      } else {
        createOfficeTeamLocalCommand({ area, record, action: action.label });
        addTrail(action.label, `${action.label} created a prepared-only Command item for ${recordTitle} in this control workspace.`);
      }
    } catch (error) {
      addTrail(action.label, `Could not prepare the Command slip. Nothing was sent, synced, charged or changed. ${error?.message || ""}`.trim());
    } finally {
      setBusyAction("");
    }
  }

  function addTrail(label, text) {
    const entry = { id: `${Date.now()}-${label}`, label, text };
    setTrail((current) => [entry, ...current].slice(0, 3));
  }

  return (
    <section className="cvSafeControls" aria-label={`${area} safe controls`}>
      <div className="cvSafeControlButtons">
        {safeActions.map((action) => (
          <button key={action.label} className={action.tone} type="button" disabled={Boolean(busyAction)} onClick={() => recordAction(action)}>
            {busyAction === action.label ? "Preparing…" : action.label}
          </button>
        ))}
      </div>
      <small>{ownerRoute ? "Every button prepares a real Command slip · owner approval required · no send, no sync, no charge, no record change without approval." : "Every button prepares a Command item in this control workspace."}</small>
      {trail.length ? <div className="cvSafeTrail">{trail.map((item) => <p key={item.id}>{item.text}</p>)}</div> : null}
    </section>
  );
}

function slug(value = "") {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "action";
}

function roleForArea(area = "") {
  const key = String(area || "").toLowerCase();
  if (/growth|rebook|capacity|lead|follow/.test(key)) return "Growth Coordinator";
  if (/invoice|quote|money|payment/.test(key)) return "Bookkeeper";
  if (/account|xero|myob|integration/.test(key)) return "Accountant";
  if (/staff|worker|payroll|timer/.test(key)) return "Payroll Clerk";
  if (/client|message/.test(key)) return "Client Memory";
  if (/quality|proof/.test(key)) return "Quality Checker";
  if (/operation|automation|branding|setting/.test(key)) return "Operations Manager";
  return "Receptionist";
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
