import React from "react";

const nav = ["Smart Hub", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

const approvals = [
  ["Assign Matt to Wilson Plumbing", "Closest available worker, free from 10:30am, plumbing experience, no schedule clash.", "Approve"],
  ["Create Davis Property invoice", "Job complete, photos uploaded, time logged, pricing source found.", "Draft invoice"],
  ["Send quote follow-up", "4 high-value quotes have no reply after 48 hours. Messages are prepared.", "Review"],
];

const jobs = [
  ["J-1056", "Smith Residence", "In Progress", "Install air con unit", "Today 2:30pm"],
  ["J-1047", "Wilson Plumbing", "Needs Crew", "Assign technician", "Today 11:00am"],
  ["J-1042", "Taylor Electrical", "Scheduled", "Tomorrow 9:00am", "Tomorrow"],
  ["J-1038", "Brown Renovation", "In Progress", "Plastering stage", "Today 4:00pm"],
];

const metrics = [
  ["Jobs needing crew", "6", "orange"],
  ["Money waiting", "$6.8k", "green"],
  ["Approvals ready", "8", "blue"],
  ["Proofs pending", "3", "purple"],
];

const workspaces = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

export default function SmartHubHardReset() {
  return (
    <main className="pcx-shell">
      <aside className="pcx-sidebar">
        <div className="pcx-logo"><img src="/churvox-logo.png" alt="Churvox" /></div>
        <nav>{nav.map((item, index) => <button key={item} className={index === 0 ? "active" : ""}><i>{["✦", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "▧"][index]}</i>{item}</button>)}</nav>
        <div className="pcx-owner"><i /><div><b>Alex Thompson</b><small>Owner • Online</small></div><span>⌄</span></div>
      </aside>

      <section className="pcx-main">
        <header className="pcx-header">
          <div className="pcx-header-top"><span><i /> AI Operator online</span><nav><button>Alerts <b>3</b></button><button>Ask AI</button><button>Thompson Trade Services ▾</button></nav></div>
          <section className="pcx-header-grid">
            <div className="pcx-hero-copy"><p>Good morning, Alex</p><h1>AI Command Centre</h1><span>Churvox has prepared today’s admin, dispatch and money actions. You approve — AI does the work.</span><div><button>Approve today’s plan →</button><button>Open action queue</button></div></div>
            <div className="pcx-radar"><b>8</b><span>AI-prepared actions</span><em>Dispatch • invoices • follow-ups • proofs</em><button>Review all</button></div>
            <div className="pcx-live"><p><i /> Live business pulse</p>{metrics.map(([label, value, tone]) => <button key={label}><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>)}</div>
          </section>
        </header>

        <section className="pcx-metrics">{metrics.map(([label, value, tone]) => <button key={label}><b className={tone}>{value}</b><span>{label}</span><small>View detail</small></button>)}</section>

        <section className="pcx-grid">
          <article className="pcx-card pcx-approvals"><Head eyebrow="AI approval queue" title="Prepared for owner approval" badge="8" />{approvals.map(([title, copy, action]) => <div className="pcx-approval" key={title}><i>✦</i><div><b>{title}</b><span>{copy}</span></div><button>{action}</button></div>)}</article>
          <article className="pcx-card pcx-jobs"><Head eyebrow="Live jobs" title="Today’s field board" link="Open dispatch →" /><div className="pcx-job-head"><span>Job</span><span>Client</span><span>Status</span><span>Next step</span><span>ETA</span></div>{jobs.map(([id, client, status, step, eta]) => <button className="pcx-job" key={id}><b>{id}</b><span>{client}</span><mark className={status.toLowerCase().replace(" ", "-")}>{status}</mark><span>{step}</span><em>{eta}</em></button>)}</article>
          <aside className="pcx-rail"><Mini title="Cash Flow" value="$6,820" copy="8 invoices ready to chase" action="Prepare reminders" /><Mini title="Proofs Pending" value="3" copy="Worker submissions waiting review" action="Review proofs" /><div className="pcx-sms"><em>HOT</em><p>SMS Credits</p><h3>12,540</h3><span>credits remaining</span><div><b>78%</b><small>remaining</small></div><button>Buy SMS Credits →</button></div></aside>
          <article className="pcx-card pcx-ask"><Head eyebrow="Ask your business" title="Tell AI what to prepare" /><div className="pcx-prompts"><button>Who should I assign next?</button><button>Which invoices should I chase first?</button><button>Draft customer messages for today</button></div><div className="pcx-input"><span>Ask AI to prepare an action...</span><button>Ask AI →</button></div></article>
          <article className="pcx-card pcx-work"><Head eyebrow="Owner workspaces" title="Command tools" /> <div>{workspaces.map(w => <button key={w}><i>▦</i><b>{w}</b><small>{w === "Automation" ? "Rules & AI triggers" : w === "Reports" ? "Business insights" : "Open workspace"}</small></button>)}</div></article>
        </section>
      </section>
    </main>
  );
}

function Head({ eyebrow, title, badge, link }) { return <div className="pcx-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{badge ? <b>{badge}</b> : link ? <button>{link}</button> : null}</div>; }
function Mini({ title, value, copy, action }) { return <div className="pcx-mini"><p>{title}</p><h3>{value}</h3><span>{copy}</span><button>{action} →</button></div>; }
