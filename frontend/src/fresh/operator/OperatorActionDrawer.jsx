import React from "react";
import "./operatorActionDrawer.css";
export default function OperatorActionDrawer({ action, onClose, onApprove, onReject, onReview }) {
  if (!action) return null;
  return <div className="opd-backdrop" onClick={onClose}><section className="opd-drawer" onClick={(e)=>e.stopPropagation()}><header><p>AI OPERATOR ACTION</p><h3>{action.title}</h3><button onClick={onClose}>×</button></header><div className="opd-body"><p>{action.summary}</p><div><strong>Why AI recommended this</strong><small>{action.reason}</small></div><div><strong>Risk / guardrail</strong><small>{action.risk}</small></div><div><strong>Confidence</strong><small>{action.confidence_label}</small></div><div><strong>Recommended next step</strong><small>{action.recommended_next_step}</small></div></div><footer><button onClick={()=>onReject?.(action)}>Reject</button><button onClick={()=>onReview?.(action)}>Edit / Review</button><button onClick={()=>window.location.assign(action.related_workspace||"/dashboard")}>Open workspace</button><button className="primary" onClick={()=>onApprove?.(action)}>Approve</button></footer></section></div>;
}
