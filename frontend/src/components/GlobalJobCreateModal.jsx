import React from "react";
import JobCreateForm from "./forms/JobCreateForm";

const OPEN_EVENT = "churvox:open-job-popup";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";

function readInstruction(detail) {
  if (detail?.instruction || detail?.text) return String(detail.instruction || detail.text || "");
  try {
    const saved = window.localStorage.getItem(OPEN_JOB_MODAL_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return String(parsed?.instruction || parsed?.text || "");
    }
  } catch {}
  try { return window.localStorage.getItem(ASK_DRAFT_KEY) || ""; } catch { return ""; }
}

export function openJobModal(search = "") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { search } }));
}

export default function GlobalJobCreateModal() {
  const [open, setOpen] = React.useState(false);
  const [instruction, setInstruction] = React.useState("");

  React.useEffect(() => {
    let timer = 0;
    function openSlip(event) {
      setInstruction(readInstruction(event?.detail));
      try { window.localStorage.removeItem(OPEN_JOB_MODAL_KEY); } catch {}
      setOpen(true);
    }
    window.addEventListener(OPEN_EVENT, openSlip);
    try {
      if (window.localStorage.getItem(OPEN_JOB_MODAL_KEY)) timer = window.setTimeout(() => openSlip({ detail: null }), 80);
    } catch {}
    return () => {
      window.removeEventListener(OPEN_EVENT, openSlip);
      window.clearTimeout(timer);
    };
  }, []);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Add job" style={{ position: "fixed", inset: 0, zIndex: 12000, display: "grid", placeItems: "center", padding: 16, background: "rgba(2,6,23,.58)", backdropFilter: "blur(10px)", overflow: "hidden" }} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section style={{ width: "min(820px, calc(100vw - 32px))", maxHeight: "calc(100dvh - 32px)", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 22, background: "#fffaf0", border: "1px solid rgba(15,23,42,.14)", boxShadow: "0 28px 80px rgba(0,0,0,.36)" }}>
        <header style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(15,23,42,.10)", background: "#fffaf0" }}>
          <div><div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "#9a3412" }}>New job</div><h1 style={{ margin: "2px 0 0", fontSize: 26, lineHeight: 1, fontWeight: 1000, color: "#111827" }}>Add job</h1></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close job slip" style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(15,23,42,.14)", background: "#fff", color: "#111827", fontSize: 16, fontWeight: 900, cursor: "pointer" }}>X</button>
        </header>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: 14 }}>
          <JobCreateForm initialInstruction={instruction} onCancel={() => setOpen(false)} onSuccess={() => { setOpen(false); setInstruction(""); window.dispatchEvent(new Event("churvox-records-refresh")); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "job-created" } })); }} submitLabel="Save job" />
        </div>
      </section>
    </div>
  );
}
