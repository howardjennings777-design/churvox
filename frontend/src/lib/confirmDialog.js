// Promise-based confirmation dialog. Imperatively renders a styled modal.
// Use instead of window.confirm so the experience is consistent and on-brand.
//
//   import { confirmDialog } from "../lib/confirmDialog";
//   const ok = await confirmDialog({ title: "Delete this client?", danger: true });
//   if (!ok) return;
//
import React from "react";
import ReactDOM from "react-dom/client";

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, onResolve }) {
  const handleKey = React.useCallback((e) => {
    if (e.key === "Escape") onResolve(false);
    if (e.key === "Enter") onResolve(true);
  }, [onResolve]);

  React.useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-950/45 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => onResolve(false)}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-[#d8e3f3] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-bold text-[#0d1b34]">{title || "Are you sure?"}</h3>
          {message ? <p className="mt-2 text-sm text-[#5b6c87]">{message}</p> : null}
        </div>
        <div className="border-t border-[#e2e8f0] px-5 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => onResolve(false)}
            className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50"
          >
            {cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => onResolve(true)}
            className={
              danger
                ? "rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c]"
                : "rounded-lg bg-[#155EEF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4ad9]"
            }
          >
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function confirmDialog(options = {}) {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);

    const cleanup = () => {
      try {
        root.unmount();
      } catch (_e) {
        /* noop */
      }
      if (host.parentNode) host.parentNode.removeChild(host);
    };

    const handle = (value) => {
      cleanup();
      resolve(!!value);
    };

    root.render(<ConfirmDialog {...options} onResolve={handle} />);
  });
}

export default confirmDialog;
