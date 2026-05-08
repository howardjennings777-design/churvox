import React from "react";

const nav = ["AI HQ", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automations", "Reports"];

const inbox = [
  {
    title: "Assign Matt to Wilson Plumbing",
    detail: "Closest worker, free at 10:30am, plumbing experience, no clash.",
    impact: "Job starts today instead of sitting unassigned.",
    action: "Approve",
  },
  {
    title: "Create Davis Property invoice",
    detail: "Completion confirmed, photos uploaded, pricing source found.",
    impact: "$420 can be invoiced now.",
    action: "Draft invoice",
  },
  {
    title: "Follow up 4 high-value quotes",
    detail: "No reply after 48 hours. AI has prepared short customer messages.",
    impact: "$11.8k pipeline waiting.",
    action: "Review messages",
  },
];

const lanes = [
  { name: "Dispatch", value: "6", label: "jobs need crew", items: ["Wilson Plumbing", "Northside Repair", "Osborne Park install"] },
  { name: "Money", value: "$6.8k", label: "waiting to chase", items: ["5 overdue invoices", "2 drafts ready", "1 payment link missing"] },
  { name: "Customers", value: "12", label: "need a reply", items: ["4 quote follow-ups", "5 invoice nudges", "3 proof updates"] },
  { name: "Quality", value: "3", label: "proofs pending", items: ["2 photo reviews", "1 completion note", "0 failed checks"] },
];

const timeline = [
  ["Now", "Approve AI plan", "Clears 8 admin actions in one pass"],
  ["10:30", "Dispatch decision", "Matt is the best fit for Wilson Plumbing"],
  ["12:00", "Money sweep", "Send reminders for overdue invoices"],
  ["4:30", "Closeout", "Review proofs and completed jobs"],
];

const tools = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

export default function SmartHubHardReset() {
  return (
    <main className="aos-shell">
      <aside className="aos-nav">
        <div className="aos-logo"><img src="/churvox-logo.png" alt="Churvox" /></div>
        <nav>
          {nav.map((item, index) => (
            <button className={index === 0 ? "active" : ""} key={item}>
              <i>{["✦", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "▧"][index]}</i>
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <div className="aos-owner"><b>Alex Thompson</b><small>Owner online</small></div>
      </aside>

      <section className="aos-main">
        <header className="aos-topbar">
          <div>
            <b>CHURVOX AI HQ</b>
            <span>AI runs the admin. You approve the moves.</span>
          </div>
          <nav><button>Alerts <b>3</b></button><button>Ask AI</button><button>Thompson Trade Services ▾</button></nav>
        </header>

        <section className="aos-command-row">
          <article className="aos-briefing">
            <p className="eyebrow"><i /> Business operator online</p>
            <h1>Here’s what I can run for you today.</h1>
            <span>I found the urgent work, prepared dispatch, drafted admin, and grouped decisions into one approval flow.</span>
            <div className="aos-primary-actions"><button>Approve today’s AI plan</button><button>Change priorities</button></div>
          </article>

          <article className="aos-impact">
            <p>Prepared impact</p>
            <div><strong>8</strong><span>owner approvals ready</span></div>
            <div><strong>$6.8k</strong><span>money waiting to chase</span></div>
            <div><strong>6</strong><span>jobs can be assigned</span></div>
          </article>
        </section>

        <section className="aos-layout">
          <article className="aos-inbox">
            <div className="aos-section-head"><p>AI action inbox</p><h2>Approve once. Churvox does the work.</h2></div>
            {inbox.map((item) => (
              <div className="aos-inbox-card" key={item.title}>
                <div className="spark">✦</div>
                <div><b>{item.title}</b><span>{item.detail}</span><em>{item.impact}</em></div>
                <button>{item.action}</button>
              </div>
            ))}
          </article>

          <aside className="aos-timeline">
            <div className="aos-section-head"><p>Today’s run order</p><h2>AI schedule</h2></div>
            {timeline.map(([time, title, detail]) => <button key={time}><b>{time}</b><span>{title}</span><small>{detail}</small></button>)}
          </aside>

          <section className="aos-lanes">
            {lanes.map((lane) => (
              <article key={lane.name}>
                <div><p>{lane.name}</p><strong>{lane.value}</strong><span>{lane.label}</span></div>
                {lane.items.map((x) => <button key={x}>{x}<em>›</em></button>)}
              </article>
            ))}
          </section>

          <article className="aos-ask">
            <div className="aos-section-head"><p>Ask your business</p><h2>Tell AI what to prepare</h2></div>
            <div className="aos-prompts"><button>Who should I assign next?</button><button>What money should I chase?</button><button>Draft today’s customer messages</button></div>
            <div className="aos-input"><span>Ask AI to prepare an action...</span><button>Ask AI</button></div>
          </article>

          <article className="aos-tools">
            <div className="aos-section-head"><p>Owner tools</p><h2>Workspaces</h2></div>
            <div>{tools.map((tool) => <button key={tool}><i>▦</i><b>{tool}</b><small>Open</small></button>)}</div>
          </article>
        </section>
      </section>
    </main>
  );
}
