// PHASE_177_HIDE_DISPATCH_WORDING_BEHIND_AI_CREW_ASSIGNMENT
import React from 'react';

export function WorkspaceDock({ workspaceButtons = [], workspaceMeta = {}, onOpenWorkspace }) {
  return (
    <section className="mt-6 rounded-2xl border border-[#c7bba9] bg-[#f4eee4] p-4 text-[#101318] shadow-[0_14px_32px_rgba(15,17,21,0.14)] operator-panel operator-card" data-smart-hub-card="true">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5a5146]">Workspace Dock</p>
          <h2 className="mt-1 text-lg font-black text-[#101318]">Quick access to core work areas</h2>
        </div>
        <span className="rounded-full border border-[#c9bba8] bg-[#ebe2d6] px-3 py-1 text-xs font-bold text-[#5a5146]">Owner review</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {workspaceButtons.map((name) => (
          <button key={name} type="button" onClick={() => onOpenWorkspace(name)} className="rounded-2xl border border-[#2a2f36] bg-[#111317] px-4 py-3 text-left text-sm font-bold text-white shadow-[0_10px_22px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:border-[#f97316] hover:bg-[#050607] operator-command-key" data-workspace-key="true">
            <span className="block">{name}</span>
            <span className="mt-1 block text-xs font-semibold text-white/70">{workspaceMeta[name] || 'Open workspace'}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => onOpenWorkspace('Payment Reminders', 'reminders')} className="rounded-xl border border-[#ff8a3d]/40 bg-[#f97316] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#ea580c] operator-primary" data-operator-primary="true">Prepare reminders</button>
        <button type="button" onClick={() => onOpenWorkspace('Quote Follow-ups', 'followUps')} className="rounded-xl border border-[#ff8a3d]/40 bg-[#f97316] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#ea580c] operator-primary" data-operator-primary="true">Review follow-ups</button>
        <button type="button" onClick={() => onOpenWorkspace('AI Assign crew', 'assign')} className="rounded-xl border border-[#ff8a3d]/40 bg-[#f97316] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#ea580c] operator-primary" data-operator-primary="true">Assign workers</button>
      </div>
    </section>
  );
}
