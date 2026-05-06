import React from "react";
import { X } from "lucide-react";

const OMIT_KEYS = new Set(["id", "_id"]);

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function EntityDetailModal({ open, onClose, title, item, actions }) {
  if (!open || !item) return null;
  const entries = Object.entries(item).filter(([key]) => !OMIT_KEYS.has(key));

  return (
    <div className="fixed inset-0 z-[120]">
      <button type="button" className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Close details" />
      <div className="absolute inset-x-0 bottom-0 top-10 rounded-t-2xl bg-white shadow-2xl md:inset-auto md:right-6 md:top-1/2 md:max-h-[85vh] md:w-[min(760px,92vw)] md:-translate-y-1/2 md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 md:px-6">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(100%-120px)] overflow-y-auto px-4 py-4 md:px-6">
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{key.replace(/_/g, " ")}</dt>
                <dd className="mt-1 text-sm text-slate-800 break-words">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
        {actions ? <div className="border-t border-slate-200 px-4 py-3 md:px-6">{actions}</div> : null}
      </div>
    </div>
  );
}
