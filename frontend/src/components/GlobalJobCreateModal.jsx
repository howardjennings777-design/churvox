import React from "react";
import FreshJobQuickSlip from "../churvox-fresh/FreshJobQuickSlip";

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
  const guardRef = React.useRef(0);

  React.useEffect(() => {
    let timer = 0;
    function openSlip(event) {
      const now = Date.now();
      if (now - guardRef.current < 500) return;
      guardRef.current = now;
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
    <FreshJobQuickSlip
      instruction={instruction}
      onClose={() => setOpen(false)}
      onSuccess={() => {
        setOpen(false);
        setInstruction("");
        window.dispatchEvent(new Event("churvox-records-refresh"));
        window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "job-created" } }));
      }}
    />
  );
}
