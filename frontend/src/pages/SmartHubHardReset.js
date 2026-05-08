import React from "react";

const nav = ["AI Control Room", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Settings"];
const jobs = [
  ["J-1056", "Smith Residence", "Sarah Smith", "In Progress", "Install air con unit", "Today 2:30pm", "Northridge"],
  ["J-1047", "Wilson Plumbing", "Matt Wilson", "Needs Crew", "Assign technician", "Today 11:00am", "Fremantle"],
  ["J-1042", "Taylor Electrical", "Lisa Taylor", "Scheduled", "Tomorrow 9:00am", "Tomorrow 9:00am", "Osborne Park"],
  ["J-1038", "Brown Renovation", "Daniel Brown", "In Progress", "Plastering stage", "Today 4:00pm", "South Perth"],
  ["J-1031", "Davis Property", "Chris Davis", "Completed", "Invoice sent", "Today 8:45am", "Cottesloe"],
];
const work = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

export default function SmartHubHardReset() {
  return (
    <main className="hr-shell">
      <section className="hr-root">
        <aside className="hr-sidebar">
          <div className="hr-brand hr-brand-real">
            <span className="hr-brand-mark">C</span>
            <b>CHURVOX</b>
          </div>
          <nav>{nav.map((n, i) => <button key={n} className={i === 0 ? "on" : ""}><i>{["◎", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "⚙"][i]}</i>{n}</button>)}</nav>
          <div className="hr-sms-mini"><div><b>12,540</b><i>▣</i></div><strong>SMS Credits</strong><small>credits remaining</small><em><span /></em><p>78% remaining</p><button>Buy Credits</button></div>
          <div className="hr-owner"><i /> <div><b>Alex Thompson</b><span>Owner</span><small>● Online</small></div><p>⌄</p></div>
        </aside>

        <section className="hr-page">
          <div className="hr-top"><button>♟<b>3</b></button><button>?</button><button>Thompson Trade Services ⌄</button></div>

          <section className="hr-hero">
            <div className="hr-welcome"><p>Good morning, Alex</p><h1>AI Control Room</h1><span>Your AI co-pilot is ready. Here's what needs your attention today.</span><button><i />AI Readiness <b>High</b></button></div>
            <div className="hr-actions"><p>What would you like to do?</p><button className="main"><i>✦</i><b>Run AI Plan</b><span>→</span></button><button><i>▱</i><b>Review approvals</b><em>8</em></button><button><i>⚙</i><b>Operator settings</b><span>→</span></button></div>
            <div className="hr-live"><h3><i />Live Control Centre <span>›</span></h3><small>All systems operational</small><Metric t="Jobs in progress" v="23" c="blue" /><Metric t="Jobs needing crew" v="6" c="orange" /><Metric t="Approvals" v="8" c="blue" /><Metric t="Money waiting" v="$6,820.00" c="green" /></div>
          </section>

          <section className="hr-grid">
            <article className="hr-card hr-priority"><Head title="Priority Queue" badge="7" /><Queue a="Approval needed" b="4 quotes over $5,000" t="2m" /><Queue a="Jobs need crew" b="6 jobs unassigned" t="15m" /><Queue a="Follow-up due" b="12 messages pending" t="35m" /><Queue blue a="Invoices overdue" b="5 invoices • $4,250" t="1h" /><Queue blue a="Proofs to review" b="3 submissions" t="2h" /><button className="hr-link">View all priorities →</button></article>

            <article className="hr-card hr-board"><Head title="Live Jobs Board" link="View all jobs →" /><div className="hr-stats"><p><b>23</b>In Progress</p><p><b>6</b>Needs Crew</p><p><b>4</b>Tomorrow</p><p><b>8</b>Completed Today</p></div><div className="hr-table"><div className="head"><span>Job</span><span>Client</span><span>Status</span><span>Next Step</span><span>ETA</span><span /></div>{jobs.map(j => <Job key={j[0]} j={j} />)}</div><button className="hr-link wide">⌁ Open dispatch board →</button></article>

            <aside className="hr-sidecards"><Mini title="Cash Flow" val="$6,820.00" copy="8 invoices to chase" /><Mini title="Proofs Pending" val="3" copy="3 submissions waiting review" ring /><Mini title="Follow-ups" val="12" copy="Client replies awaiting your response" /><div className="hr-hot"><em>HOT</em><h3>SMS Credits</h3><strong>12,540</strong><p>credits remaining</p><div><b>78%</b><span>remaining</span></div><button>Buy SMS Credits →</button></div></aside>

            <section className="hr-bottom"><article className="hr-card"><Head title="AI Recommendations" /><p className="sub">Smart actions tailored for your business</p><div className="hr-recs"><Rec title="Rebalance workloads" copy="3 techs are at 92% capacity this week." /><Rec title="Chase high-value invoices" copy="8 invoices over $2,000 are overdue." green /><Rec title="Fill tomorrow's gaps" copy="4 job slots open for tomorrow. Consider rescheduling." blue /></div><button className="hr-link">View all recommendations →</button></article><article className="hr-card"><Head title="Owner Workspaces" /><p className="sub">Jump into the tools you use most</p><div className="hr-work">{work.map(w => <button key={w}><i>▦</i><b>{w}</b><small>{w === "Jobs" ? "View & manage" : w === "Clients" ? "Manage contacts" : w === "Automation" ? "Rules & alerts" : w === "Reports" ? "Business insights" : "Create & send"}</small></button>)}</div></article></section>
          </section>
        </section>
      </section>
    </main>
  );
}

function Metric({ t, v, c }) { return <button className="hr-metric"><i>▦</i><span>{t}</span><b className={c}>{v}</b><em>›</em></button>; }
function Head({ title, badge, link }) { return <div className="hr-head"><h2>{title}</h2>{badge ? <b>{badge}</b> : link ? <button>{link}</button> : null}</div>; }
function Queue({ a, b, t, blue }) { return <button className="hr-q"><i className={blue ? "blue" : ""} /><span><b>{a}</b><small>{b}</small></span><em>{t}</em></button>; }
function Job({ j }) { const c = j[3] === "Needs Crew" ? "needs" : j[3] === "Scheduled" ? "scheduled" : j[3] === "Completed" ? "done" : "progress"; return <button className="hr-row"><span><b>{j[0]}</b><small>⌖ {j[6]}</small></span><span className="person"><i>{j[1].split(" ").map(x => x[0]).join("").slice(0, 2)}</i><em><b>{j[1]}</b><small>{j[2]}</small></em></span><span><mark className={c}>{j[3]}</mark></span><span>{j[4]}</span><span>{j[5]}</span><span>•••</span></button>; }
function Mini({ title, val, copy, ring }) { return <button className="hr-mini"><h3>{title}</h3><strong>{val}</strong><p>{copy}</p>{ring ? <span className="ring">{val}</span> : <span className="curve" />}<b>View →</b></button>; }
function Rec({ title, copy, green, blue }) { return <button className="hr-rec"><i className={green ? "green" : blue ? "blue" : ""} /><b>{title}</b><small>{copy}</small><span>{blue ? "Optimise" : "Review"}</span></button>; }
