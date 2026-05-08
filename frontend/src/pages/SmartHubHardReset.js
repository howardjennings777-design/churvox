import React from "react";

const nav = ["Control Room", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Settings"];
const controlActions = [
  ["Run AI Command", "Build today’s plan", "✦"],
  ["Approve Queue", "8 waiting", "✓"],
  ["Dispatch Crew", "6 need action", "⌁"],
  ["Cash Chase", "$6.8k waiting", "$"],
];
const commandQueue = [
  ["Assign crew to J-1047", "Wilson Plumbing needs a technician. Best match: Matt W. — free today 10:30am.", "Approve"],
  ["Send quote follow-up", "4 high-value quotes are past 48 hours with no reply.", "Review"],
  ["Create invoice draft", "Job J-1031 is complete with photos and time logged.", "Create"],
];
const jobs = [
  ["J-1056", "Smith Residence", "In Progress", "Install air con unit", "Today 2:30pm"],
  ["J-1047", "Wilson Plumbing", "Needs Crew", "Assign technician", "Today 11:00am"],
  ["J-1042", "Taylor Electrical", "Scheduled", "Tomorrow 9:00am", "Tomorrow"],
  ["J-1038", "Brown Renovation", "In Progress", "Plastering stage", "Today 4:00pm"],
];
const signals = [
  ["Jobs live", "23", "blue"],
  ["Need crew", "6", "orange"],
  ["Approvals", "8", "purple"],
  ["Money waiting", "$6,820", "green"],
];
const work = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

export default function SmartHubHardReset() {
  return (
    <main className="crx-shell">
      <aside className="crx-sidebar">
        <div className="crx-logo-wrap"><img src="/churvox-logo.png" alt="Churvox" /></div>
        <nav>{nav.map((n, i) => <button key={n} className={i === 0 ? "active" : ""}><span>{["✦", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "⚙"][i]}</span>{n}</button>)}</nav>
        <div className="crx-owner"><i /><div><b>Alex Thompson</b><small>Owner • Online</small></div><span>⌄</span></div>
      </aside>

      <section className="crx-main">
        <header className="crx-command">
          <div className="crx-topline">
            <span className="crx-pill"><i /> AI Operator online</span>
            <div className="crx-tools"><button>🔔<b>3</b></button><button>?</button><button>Thompson Trade Services ⌄</button></div>
          </div>
          <section className="crx-command-grid">
            <div className="crx-title">
              <p>Good morning, Alex</p>
              <h1>Control Room</h1>
              <span>AI has scanned today’s jobs, crew, invoices and follow-ups. Approve the plan or drill into any signal.</span>
              <button>Run full AI plan →</button>
            </div>
            <div className="crx-action-deck">
              <h2>Operator actions</h2>
              <div>{controlActions.map(([title, copy, icon]) => <button key={title}><i>{icon}</i><b>{title}</b><small>{copy}</small></button>)}</div>
            </div>
            <div className="crx-live">
              <h2><i /> Live control centre</h2>
              {signals.map(([label, value, color]) => <button key={label}><span>{label}</span><b className={color}>{value}</b><em>›</em></button>)}
            </div>
          </section>
        </header>

        <section className="crx-board">
          <article className="crx-ai-panel">
            <div className="crx-section-head"><div><p>AI command queue</p><h2>Ready for approval</h2></div><b>8</b></div>
            {commandQueue.map(([title, copy, action]) => <div className="crx-command-card" key={title}><i>✦</i><div><b>{title}</b><small>{copy}</small></div><button>{action}</button></div>)}
            <button className="crx-link">View all recommendations →</button>
          </article>

          <article className="crx-jobs-panel">
            <div className="crx-section-head"><div><p>Live jobs board</p><h2>Today’s field state</h2></div><button>Open dispatch →</button></div>
            <div className="crx-stats"><p><b>23</b>In progress</p><p><b>6</b>Need crew</p><p><b>4</b>Tomorrow</p><p><b>8</b>Done today</p></div>
            <div className="crx-job-list">{jobs.map(([id, client, status, step, eta]) => <button key={id}><span><b>{id}</b><small>{client}</small></span><mark className={status.replace(" ", "-").toLowerCase()}>{status}</mark><span>{step}</span><em>{eta}</em><strong>•••</strong></button>)}</div>
          </article>

          <aside className="crx-right-rail">
            <div className="crx-money"><p>Cash flow</p><h3>$6,820.00</h3><span>8 invoices to chase</span><button>Chase money →</button></div>
            <div className="crx-proof"><p>Proofs pending</p><h3>3</h3><span>3 submissions waiting review</span><button>Review proofs →</button></div>
            <div className="crx-sms"><em>HOT</em><p>SMS Credits</p><h3>12,540</h3><span>credits remaining</span><div><b>78%</b><small>remaining</small></div><button>Buy SMS Credits →</button></div>
          </aside>

          <article className="crx-workspaces">
            <div className="crx-section-head"><div><p>Owner workspaces</p><h2>Jump into command tools</h2></div></div>
            <div>{work.map(w => <button key={w}><i>▦</i><b>{w}</b><small>{w === "Automation" ? "Rules & alerts" : w === "Reports" ? "Business insights" : "Open workspace"}</small></button>)}</div>
          </article>
        </section>
      </section>
    </main>
  );
}
