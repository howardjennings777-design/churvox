import React from "react";

const nav = ["AI Operator", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

const approvalActions = [
  {
    title: "Assign Matt to Wilson Plumbing",
    reason: "Closest available worker, free from 10:30am, plumbing experience, no schedule conflict.",
    meta: "Job J-1047 • Fremantle",
    action: "Approve assignment",
    tone: "blue",
  },
  {
    title: "Create invoice draft for Davis Property",
    reason: "Job completed, worker photos uploaded, time logged, pricing source found.",
    meta: "$420 estimated • Ready to review",
    action: "Create draft",
    tone: "green",
  },
  {
    title: "Send quote follow-up",
    reason: "4 quotes over $5,000 have had no response for 48 hours.",
    meta: "AI message prepared",
    action: "Review message",
    tone: "orange",
  },
];

const signals = [
  ["Jobs need crew", "6", "orange"],
  ["Money waiting", "$6.8k", "green"],
  ["Proofs pending", "3", "purple"],
  ["Owner approvals", "8", "blue"],
  ["Schedule gaps", "4", "cyan"],
  ["Overdue invoices", "5", "red"],
];

const runSheet = [
  ["8:30", "Crew check-in", "23 jobs live, 6 need a decision"],
  ["10:30", "Best dispatch window", "Matt can take Wilson Plumbing"],
  ["12:00", "Admin sweep", "AI drafts invoices and quote follow-ups"],
  ["4:30", "End-of-day closeout", "Review photos, proofs, and completion notes"],
];

const workspaces = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

export default function SmartHubHardReset() {
  return (
    <main className="opx-shell">
      <aside className="opx-sidebar">
        <div className="opx-logo"><img src="/churvox-logo.png" alt="Churvox" /></div>
        <nav>
          {nav.map((item, index) => (
            <button key={item} className={index === 0 ? "active" : ""}>
              <span>{["✦", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "▧"][index]}</span>
              {item}
            </button>
          ))}
        </nav>
        <div className="opx-owner">
          <i />
          <div><b>Alex Thompson</b><small>Owner • Online</small></div>
          <span>⌄</span>
        </div>
      </aside>

      <section className="opx-main">
        <header className="opx-hero">
          <div className="opx-hero-top">
            <span><i /> AI Business Operator online</span>
            <div><button>🔔<b>3</b></button><button>?</button><button>Thompson Trade Services ⌄</button></div>
          </div>

          <section className="opx-hero-grid">
            <div className="opx-title">
              <p>Good morning, Alex</p>
              <h1>Your business is ready to run.</h1>
              <span>AI found the urgent work, prepared the admin, and queued the actions that need owner approval.</span>
              <div>
                <button className="primary">Approve today’s plan →</button>
                <button className="secondary">Ask AI anything</button>
              </div>
            </div>

            <div className="opx-operator-card">
              <p>AI Operator summary</p>
              <h2>8 actions prepared</h2>
              <ul>
                <li><b>3</b> dispatch decisions</li>
                <li><b>2</b> invoice drafts</li>
                <li><b>2</b> follow-up messages</li>
                <li><b>1</b> proof review</li>
              </ul>
              <button>Open approval queue</button>
            </div>

            <div className="opx-live-card">
              <p><i /> Live business signals</p>
              {signals.slice(0, 4).map(([label, value, tone]) => (
                <button key={label}><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>
              ))}
            </div>
          </section>
        </header>

        <section className="opx-health-strip">
          {signals.map(([label, value, tone]) => (
            <button key={label}>
              <span className={tone}>{value}</span>
              <b>{label}</b>
              <small>Open detail</small>
            </button>
          ))}
        </section>

        <section className="opx-control-grid">
          <article className="opx-approval-panel">
            <div className="opx-section-head"><div><p>Owner approval queue</p><h2>AI prepared this for you</h2></div><b>8</b></div>
            <div className="opx-approval-list">
              {approvalActions.map((item) => (
                <div className={`opx-approval-card ${item.tone}`} key={item.title}>
                  <i>✦</i>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.reason}</small>
                    <em>{item.meta}</em>
                  </div>
                  <button>{item.action}</button>
                </div>
              ))}
            </div>
          </article>

          <article className="opx-ai-chat">
            <div className="opx-section-head"><div><p>Ask your business</p><h2>What should AI handle?</h2></div></div>
            <div className="opx-chat-box">
              <p>Try asking:</p>
              <button>Who should I assign to Wilson Plumbing?</button>
              <button>Which invoices should I chase first?</button>
              <button>Draft a message to Sarah Smith</button>
            </div>
            <div className="opx-input-row"><span>Ask AI to prepare an action...</span><button>Ask AI →</button></div>
          </article>

          <aside className="opx-right">
            <div className="opx-money"><p>Money waiting</p><h3>$6,820</h3><span>8 invoices ready to chase</span><button>Prepare reminders →</button></div>
            <div className="opx-proof"><p>Proofs pending</p><h3>3</h3><span>Worker submissions waiting review</span><button>Review proofs →</button></div>
            <div className="opx-risk"><p>Risk watch</p><h3>2</h3><span>Jobs may miss today’s window</span><button>View risks →</button></div>
          </aside>

          <article className="opx-run-sheet">
            <div className="opx-section-head"><div><p>Today’s run sheet</p><h2>What happens next</h2></div><button>Open dispatch board →</button></div>
            <div>{runSheet.map(([time, title, detail]) => <button key={time}><b>{time}</b><span>{title}</span><small>{detail}</small></button>)}</div>
          </article>

          <article className="opx-workspaces">
            <div className="opx-section-head"><div><p>Command tools</p><h2>Owner workspaces</h2></div></div>
            <div>{workspaces.map((item) => <button key={item}><i>▦</i><b>{item}</b><small>{item === "Automation" ? "Rules & AI triggers" : item === "Reports" ? "Business insight" : "Open workspace"}</small></button>)}</div>
          </article>
        </section>
      </section>
    </main>
  );
}
