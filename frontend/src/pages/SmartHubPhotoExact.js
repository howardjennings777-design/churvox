import React from "react";
import "../styles/smartHubPhotoExact.css";

const nav = ["AI Control Room", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Settings"];
const jobs = [
  ["J-1056", "Smith Residence", "Sarah Smith", "In Progress", "Install air con unit", "Today 2:30pm", "Northridge"],
  ["J-1047", "Wilson Plumbing", "Matt Wilson", "Needs Crew", "Assign technician", "Today 11:00am", "Fremantle"],
  ["J-1042", "Taylor Electrical", "Lisa Taylor", "Scheduled", "Tomorrow 9:00am", "Tomorrow 9:00am", "Osborne Park"],
  ["J-1038", "Brown Renovation", "Daniel Brown", "In Progress", "Plastering stage", "Today 4:00pm", "South Perth"],
  ["J-1031", "Davis Property", "Chris Davis", "Completed", "Invoice sent", "Today 8:45am", "Cottesloe"],
];
const work = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];
const icons = ["◎", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "⚙"];

export default function SmartHubPhotoExact() {
  return (
    <main className="cc-root cc-photo-exact">
      <aside className="cc-sidebar">
        <button className="cc-brand"><span>C</span><b>CHURVOX</b></button>
        <nav className="cc-nav">{nav.map((n, i) => <button key={n} className={i === 0 ? "active" : ""}><i>{icons[i]}</i><span>{n}</span></button>)}</nav>
        <div className="cc-side-card"><div><strong>12,540</strong><i>▣</i></div><p>SMS Credits</p><small>credits remaining</small><span><em style={{ width: "78%" }} /></span><b>78% remaining</b><button>Buy Credits</button></div>
        <div className="cc-owner"><i /><b>Alex Thompson</b><span>Owner</span><small>● Online</small><button>⌄</button></div>
      </aside>
      <section className="cc-canvas">
        <div className="cc-topbar"><span /><button>♟<b>3</b></button><button>?</button><button>Thompson Trade Services ⌄</button></div>
        <section className="cc-hero">
          <div className="cc-intro"><p>Good morning, Alex</p><h1>AI Control Room</h1><span>Your AI co-pilot is ready. Here's what needs your attention today.</span><button><i /> AI Readiness <b>High</b></button></div>
          <div className="cc-actions"><p>What would you like to do?</p><button className="primary"><i>✦</i><b>Run AI Plan</b><span>→</span></button><button><i>▱</i><b>Review approvals</b><em>8</em></button><button><i>⚙</i><b>Operator settings</b><span>→</span></button></div>
          <div className="cc-live"><div><i /><b>Live Control Centre</b><span>›</span></div><small>All systems operational</small><Metric icon="▦" label="Jobs in progress" value="23" tone="blue" /><Metric icon="♨" label="Jobs needing crew" value="6" tone="orange" /><Metric icon="▱" label="Approvals" value="8" tone="blue" /><Metric icon="▣" label="Money waiting" value="$6,820.00" tone="green" /></div>
        </section>
        <section className="cc-grid">
          <article className="cc-card cc-queue"><Title title="Priority Queue" icon="⚑" badge="7" /><Queue title="Approval needed" text="4 quotes over $5,000" time="2m" /><Queue title="Jobs need crew" text="6 jobs unassigned" time="15m" /><Queue title="Follow-up due" text="12 messages pending" time="35m" /><Queue blue title="Invoices overdue" text="5 invoices • $4,250" time="1h" /><Queue blue title="Proofs to review" text="3 submissions" time="2h" /><button className="cc-link">View all priorities →</button></article>
          <article className="cc-card cc-board"><Title title="Live Jobs Board" icon="⌁" action={<button>View all jobs →</button>} /><div className="cc-stat-row"><span><b>23</b>In Progress</span><span><b>6</b>Needs Crew</span><span><b>4</b>Tomorrow</span><span><b>8</b>Completed Today</span></div><div className="cc-table"><div className="head"><span>Job</span><span>Client</span><span>Status</span><span>Next Step</span><span>ETA</span><span /></div>{jobs.map((j) => <Job key={j[0]} j={j} />)}</div><button className="cc-dispatch">⌁ Open dispatch board →</button></article>
          <aside className="cc-stack"><Mini title="Cash Flow" value="$6,820.00" text="8 invoices to chase" link="View" /><Mini ring title="Proofs Pending" value="3" text="3 submissions waiting review" link="View proofs" /><Mini title="Follow-ups" value="12" text="Client replies awaiting your response" link="Open inbox" /><div className="cc-sms"><em>HOT</em><h3>SMS Credits</h3><strong>12,540</strong><p>credits remaining</p><div><b>78%</b><span>remaining</span></div><button>Buy SMS Credits →</button></div></aside>
        </section>
        <section className="cc-bottom"><article className="cc-card cc-recs"><Title title="AI Recommendations" icon="✦" /><p>Smart actions tailored for your business</p><div><Rec tone="orange" title="Rebalance workloads" text="3 techs are at 92% capacity this week." /><Rec tone="green" title="Chase high-value invoices" text="8 invoices over $2,000 are overdue." /><Rec tone="blue" title="Fill tomorrow's gaps" text="4 job slots open for tomorrow. Consider rescheduling." action="Optimise" /></div><button className="cc-link">View all recommendations →</button></article><article className="cc-card cc-work"><Title title="Owner Workspaces" icon="▦" /><p>Jump into the tools you use most</p><div>{work.map((w) => <button key={w}><i>▦</i><b>{w}</b><small>{w === "Jobs" ? "View & manage" : w === "Clients" ? "Manage contacts" : w === "Automation" ? "Rules & alerts" : w === "Reports" ? "Business insights" : "Create & send"}</small></button>)}</div></article></section>
      </section>
    </main>
  );
}
function Metric({ icon, label, value, tone }) { return <button><i>{icon}</i><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>; }
function Title({ title, icon, badge, action }) { return <div className="cc-title"><h2><i>{icon}</i>{title}</h2>{badge ? <b>{badge}</b> : action}</div>; }
function Queue({ title, text, time, blue }) { return <button className="cc-q"><i className={blue ? "blue" : ""} /><span><b>{title}</b><small>{text}</small></span><em>{time}</em></button>; }
function Mini({ title, value, text, link, ring }) { return <button className="cc-mini"><h3>{title}</h3><strong>{value}</strong><p>{text}</p>{ring ? <span className="ring">{value}</span> : <span className="curve" />}<b>{link} →</b></button>; }
function Rec({ title, text, tone, action = "Review" }) { return <button className={`cc-rec ${tone}`}><i /><b>{title}</b><small>{text}</small><span>{action}</span></button>; }
function Job({ j }) { const cls = j[3].includes("Crew") ? "needs" : j[3].includes("Scheduled") ? "scheduled" : j[3].includes("Completed") ? "done" : "progress"; return <button className="row"><span><b>{j[0]}</b><small>⌖ {j[6]}</small></span><span className="person"><i>{j[1].split(" ").map((x) => x[0]).join("").slice(0, 2)}</i><b>{j[1]}</b><small>{j[2]}</small></span><span><em className={cls}>{j[3]}</em></span><span>{j[4]}</span><span>{j[5]}</span><span>•••</span></button>; }
