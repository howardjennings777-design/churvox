const guardrails = [
  "AI can prepare worker assignments, but owner approval is required.",
  "AI can create draft invoices, but cannot send them automatically.",
  "AI can draft SMS/customer messages, but cannot send without approval.",
  "AI cannot charge customers without explicit owner action.",
  "AI cannot delete records without explicit owner action.",
  "AI cannot change job prices without owner approval.",
  "AI cannot sync MYOB accounting changes without owner approval.",
  "AI cannot change payroll, tax, bank files, or government submissions.",
  "AI cannot change billing plan or buy SMS credits without owner approval.",
];

const roles = [
  ["Owner", "Full control across business, billing, AI approvals and settings."],
  ["Manager", "Operations, jobs, crew, clients and follow-up workflows."],
  ["Office Admin", "Clients, jobs, quotes, invoices and admin follow-up."],
  ["Worker", "Assigned jobs only. No pricing, billing, MYOB or owner AI queue."],
  ["Payroll", "Payroll/time review and export only."],
];

export default function SettingsWorkspace() {
  return (
    <main className="op-workspace">
      <section className="op-workspace-head">
        <div>
          <p>SETTINGS</p>
          <h1>Business settings and AI guardrails.</h1>
          <span>Keep Churvox powerful, safe and approval-first.</span>
        </div>
      </section>

      <section className="op-panel">
        <header><div><p>AI GUARDRAILS</p><h2>Approval-first rules</h2></div></header>
        <div className="op-check-list">{guardrails.map((rule) => <button key={rule}>{rule}</button>)}</div>
      </section>

      <section className="op-panel">
        <header><div><p>ROLES</p><h2>Launch access model</h2></div></header>
        <div className="op-role-list">
          {roles.map(([role, detail]) => <article key={role}><strong>{role}</strong><span>{detail}</span></article>)}
        </div>
      </section>

      <section className="op-panel">
        <header><div><p>BUSINESS PROFILE</p><h2>Setup areas</h2></div></header>
        <div className="op-check-list">
          <button>Business name</button>
          <button>Industry type</button>
          <button>Notification preferences</button>
          <button>PWA install setup</button>
          <button>Account preferences</button>
        </div>
      </section>
    </main>
  );
}
