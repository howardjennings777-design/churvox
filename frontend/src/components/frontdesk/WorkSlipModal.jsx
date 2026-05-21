import React from "react";
import { Link } from "react-router-dom";
import { CxModal, CxButton, CxBadge } from "../cx";

const ZONE_BADGE = {
  approve: { tone: "accent", label: "Ready to approve" },
  fixing: { tone: "warning", label: "Needs fixing" },
  field: { tone: "info", label: "Field & crew" },
  money: { tone: "success", label: "Money desk" },
};

function formatRelative(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function FactRow({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 14,
        padding: "10px 0",
        borderBottom: "1px solid var(--cx-border-soft)",
        fontSize: 14,
      }}
    >
      <span style={{ color: "var(--cx-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ color: "var(--cx-text)", fontWeight: 600, textAlign: "right", maxWidth: "65%" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * WorkSlipModal — in-page Work Slip popup.
 * `item` shape:
 *   { id, zone: "approve|fixing|field|money", title, subtitle, reasoning,
 *     facts: [{label, value}], action_id?, related: {type, id, label} }
 */
export default function WorkSlipModal({
  open,
  onClose,
  item,
  onApprove,
  onReject,
  busy = false,
}) {
  if (!item) return null;
  const zone = ZONE_BADGE[item.zone] || ZONE_BADGE.approve;
  const canApprove = !!item.action_id;
  const relatedHref = item.related?.id
    ? item.related.type === "job"
      ? `/jobs/${item.related.id}`
      : item.related.type === "invoice"
      ? `/invoices/${item.related.id}`
      : item.related.type === "quote"
      ? `/quotes/${item.related.id}`
      : item.related.type === "client"
      ? `/clients/${item.related.id}`
      : null
    : null;

  return (
    <CxModal
      open={open}
      onClose={onClose}
      title={item.title || "Work slip"}
      subtitle={item.subtitle}
      size="lg"
      footer={
        <>
          <CxButton variant="ghost" onClick={onClose} data-testid="work-slip-close-btn">
            Close
          </CxButton>
          {relatedHref ? (
            <Link to={relatedHref} style={{ textDecoration: "none" }} onClick={onClose}>
              <CxButton variant="secondary" data-testid="work-slip-open-record-btn">
                Open full record →
              </CxButton>
            </Link>
          ) : null}
          {canApprove ? (
            <>
              <CxButton
                variant="ghost"
                onClick={() => onReject && onReject(item)}
                disabled={busy}
                data-testid="work-slip-reject-btn"
              >
                Reject
              </CxButton>
              <CxButton
                variant="primary"
                onClick={() => onApprove && onApprove(item)}
                loading={busy}
                data-testid="work-slip-approve-btn"
              >
                Approve &amp; complete
              </CxButton>
            </>
          ) : null}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <CxBadge tone={zone.tone}>{zone.label}</CxBadge>
          {item.type_label ? <CxBadge tone="neutral">{item.type_label}</CxBadge> : null}
          {item.risk ? (
            <CxBadge tone={item.risk === "high" ? "danger" : item.risk === "medium" ? "warning" : "info"}>
              {item.risk} risk
            </CxBadge>
          ) : null}
          {item.created_at ? (
            <span style={{ fontSize: 12.5, color: "var(--cx-muted)", alignSelf: "center" }}>
              · {formatRelative(item.created_at)}
            </span>
          ) : null}
        </div>

        {item.summary ? (
          <p
            style={{
              margin: 0,
              fontSize: 15,
              color: "var(--cx-text)",
              lineHeight: 1.55,
            }}
          >
            {item.summary}
          </p>
        ) : null}

        {item.reasoning ? (
          <div
            style={{
              background: "var(--cx-accent-soft)",
              border: "1px solid rgba(200,255,77,0.55)",
              borderRadius: 14,
              padding: "14px 16px",
            }}
            data-testid="work-slip-reasoning"
          >
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#355C00",
                marginBottom: 6,
              }}
            >
              Why Churvox surfaced this
            </div>
            <div style={{ fontSize: 14, color: "var(--cx-text)", lineHeight: 1.5 }}>
              {item.reasoning}
            </div>
          </div>
        ) : null}

        {Array.isArray(item.facts) && item.facts.length > 0 ? (
          <div data-testid="work-slip-facts">
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--cx-muted)",
                marginBottom: 4,
              }}
            >
              Key facts
            </div>
            {item.facts.map((f, idx) => (
              <FactRow key={idx} label={f.label} value={f.value} />
            ))}
          </div>
        ) : null}

        {!canApprove ? (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--cx-muted)",
              background: "var(--cx-bg-soft)",
              border: "1px dashed var(--cx-border-strong)",
              borderRadius: 12,
              padding: "10px 14px",
              lineHeight: 1.5,
            }}
          >
            Approval-first: this item is shown for review only. Use{" "}
            <strong>Open full record</strong> to take action in its workspace.
          </div>
        ) : null}
      </div>
    </CxModal>
  );
}
