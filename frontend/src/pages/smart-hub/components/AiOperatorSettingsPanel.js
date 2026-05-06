import React from 'react';

export function AiOperatorSettingsPanel({ aiSettings, setAiSettings, onSave, open, onClose }) {
  if (!open) return null;

  const updateSetting = (key, value) => setAiSettings((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#050607]/75 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 max-w-2xl rounded-3xl border border-[#c7bba9] bg-[#f4eee4] p-5 text-[#101318] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d8cbbb] pb-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5a5146]">AI Operator Settings</p>
            <h3 className="mt-1 text-2xl font-black text-[#101318]">Approval-first automation</h3>
            <p className="mt-1 text-sm font-semibold text-[#6f6558]">Control what AI checked and can prepare, draft, and queue for owner approval.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[#c9bba8] bg-[#ebe2d6] px-4 py-2 text-sm font-black text-[#5a5146] transition hover:bg-[#fff8ee]">Close</button>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#c9bba8] bg-[#fff8ee] p-4">
            <span>
              <span className="block text-sm font-black text-[#101318]">AI Operator</span>
              <span className="block text-xs font-semibold text-[#6f6558]">Let Smart Hub scan the business and prepare actions.</span>
            </span>
            <input type="checkbox" checked={!!aiSettings.ai_operator_enabled} onChange={(event) => updateSetting('ai_operator_enabled', event.target.checked)} className="h-5 w-5" />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#c9bba8] bg-[#fff8ee] p-4">
            <span>
              <span className="block text-sm font-black text-[#101318]">Auto arrival SMS</span>
              <span className="block text-xs font-semibold text-[#6f6558]">Prepare arrival messages for approval or sending.</span>
            </span>
            <input type="checkbox" checked={!!aiSettings.auto_arrival_sms_enabled} onChange={(event) => updateSetting('auto_arrival_sms_enabled', event.target.checked)} className="h-5 w-5" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-2xl border border-[#c9bba8] bg-[#ebe2d6] p-4 text-sm font-bold text-[#101318]">
              Arrival SMS timing
              <input type="number" min="30" max="30" value={30} disabled className="mt-2 w-full rounded-xl border border-[#c9bba8] bg-[#f4eee4] p-3 font-semibold text-[#6f6558]" />
              <span className="mt-1 block text-xs font-semibold text-[#6f6558]">Locked to 30 minutes before the visit for launch.</span>
            </label>
            <label className="rounded-2xl border border-[#c9bba8] bg-[#ebe2d6] p-4 text-sm font-bold text-[#101318]">
              Arrival SMS mode
              <select value={aiSettings.arrival_sms_mode} onChange={(event) => updateSetting('arrival_sms_mode', event.target.value)} className="mt-2 w-full rounded-xl border border-[#c9bba8] bg-white p-3 font-semibold text-[#101318]">
                <option value="approval_required">Approval required</option>
                <option value="auto_send">Auto send</option>
              </select>
            </label>
            <label className="rounded-2xl border border-[#c9bba8] bg-[#ebe2d6] p-4 text-sm font-bold text-[#101318]">
              Invoice reminders
              <select value={aiSettings.invoice_reminder_mode} onChange={(event) => updateSetting('invoice_reminder_mode', event.target.value)} className="mt-2 w-full rounded-xl border border-[#c9bba8] bg-white p-3 font-semibold text-[#101318]">
                <option value="draft_only">Draft only</option>
                <option value="approval_send">Send after approval</option>
              </select>
            </label>
            <label className="rounded-2xl border border-[#c9bba8] bg-[#ebe2d6] p-4 text-sm font-bold text-[#101318]">
              Quote follow-ups
              <select value={aiSettings.quote_followup_mode} onChange={(event) => updateSetting('quote_followup_mode', event.target.value)} className="mt-2 w-full rounded-xl border border-[#c9bba8] bg-white p-3 font-semibold text-[#101318]">
                <option value="draft_only">Draft only</option>
                <option value="approval_send">Send after approval</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Worker assignment', 'Approval required'],
              ['Accounting changes', 'Locked'],
              ['Payroll changes', 'Locked'],
            ].map(([label, value]) => (
              <label key={label} className="rounded-2xl border border-[#c9bba8] bg-[#ebe2d6] p-4 text-sm font-bold text-[#101318]">
                {label}
                <input disabled value={value} className="mt-2 w-full rounded-xl border border-[#c9bba8] bg-[#f4eee4] p-3 font-semibold text-[#6f6558]" />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#d8cbbb] pt-4">
          <button type="button" className="rounded-xl bg-[#f97316] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(249,115,22,0.28)] transition hover:bg-[#ea580c]" onClick={onSave}>Save settings</button>
          <button type="button" className="rounded-xl border border-[#c9bba8] bg-[#ebe2d6] px-5 py-3 text-sm font-black text-[#5a5146] transition hover:bg-[#fff8ee]" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
