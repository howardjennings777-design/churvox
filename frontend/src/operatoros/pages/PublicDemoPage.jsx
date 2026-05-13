
import { useMemo, useState } from "react";
import "./PublicDemoPage.css";

const initialJobs = [
  { id: "job-1", title: "Garden clean-up and green waste removal", client: "King Street Rentals", address: "14 King Street", status: "Unassigned", worker: "", proof: "No proof yet" },
  { id: "job-2", title: "Lawns and hedge trim", client: "Harbour Property Group", address: "88 Queens Drive", status: "Completed", worker: "Mia", proof: "4 photos + completion note" },
  { id: "job-3", title: "Rental exterior tidy-up", client: "ECB Property Maintenance", address: "22 Rimu Road", status: "In progress", worker: "Sam", proof: "Worker timer running" },
];

const workers = [
  { name: "Sam", area: "Lower Hutt", fit: "Best match", reason: "Available today, already near King Street, and has similar clean-up jobs completed." },
  { name: "Mia", area: "Wellington", fit: "Good", reason: "Strong proof history but already finished another job today." },
  { name: "Tane", area: "Porirua", fit: "Backup", reason: "Available later, but further away from the site." },
];

const invoices = [
  { id: "inv-1", title: "Invoice #1042", client: "Harbour Property Group", amount: "$240", status: "Draft ready" },
  { id: "inv-2", title: "Invoice #1038", client: "Aro Valley Rentals", amount: "$180", status: "Follow-up prepared" },
];

const quotes = [
  { id: "quote-1", title: "Quote #221", client: "North City Body Corp", status: "Follow-up ready" },
  { id: "quote-2", title: "Quote #219", client: "Private landlord", status: "Waiting" },
];

const guideSteps = [
  ["Welcome to the Churvox demo", "This is a safe sample business. Nothing touches real data. The AI guide shows how Churvox helps owners run jobs, crew and admin."],
  ["AI spots what needs action", "Churvox finds unassigned jobs, completed work waiting for invoices, overdue invoices and quote follow-ups before the owner has to chase them."],
  ["Approve the next best move", "For the King Street job, AI recommends Sam because he is available, nearby and has the right job history. Tap Approve to simulate it."],
  ["Proof-to-Paid", "Completed jobs bring worker notes, photos and time into owner review so the invoice can be prepared without digging through messages."],
  ["Owner stays in control", "AI prepares the work. The owner approves before anything important is sent, assigned, charged, deleted or synced."],
];

export default function PublicDemoPage() {
  const [jobs, setJobs] = useState(initialJobs);
  const [activeTab, setActiveTab] = useState("hub");
  const [step, setStep] = useState(0);
  const [events, setEvents] = useState(["AI scanned today’s work.", "3 jobs checked.", "2 invoice actions prepared."]);

  const unassigned = jobs.filter((job) => job.status === "Unassigned");
  const completed = jobs.filter((job) => job.status === "Completed");
  const [guideTitle, guideCopy] = guideSteps[step];

  const queue = useMemo(() => [
    { id: "assign", title: "Assign Sam to 14 King Street", label: "Dispatch", copy: "Best match by area, availability and similar job history.", action: "assign" },
    { id: "invoice", title: "Prepare draft invoice for Harbour Property Group", label: "Proof-to-Paid", copy: "Completed job has proof photos and worker completion note.", action: "invoice" },
    { id: "followup", title: "Prepare payment reminder for Invoice #1038", label: "Cashflow", copy: "Friendly follow-up drafted for owner review.", action: "reminder" },
  ], []);

  function addEvent(message) {
    setEvents((current) => [message, ...current].slice(0, 6));
  }

  function approve(action) {
    if (action === "assign") {
      setJobs((current) => current.map((job) => job.id === "job-1" ? { ...job, status: "Assigned", worker: "Sam", proof: "Worker will see this in field app" } : job));
      setActiveTab("jobs");
      addEvent("Demo approved: Sam assigned to 14 King Street.");
      return;
    }
    if (action === "invoice") {
      setActiveTab("proof");
      addEvent("Demo prepared: draft invoice created from worker proof.");
      return;
    }
    setActiveTab("cash");
    addEvent("Demo prepared: customer reminder drafted but not sent.");
  }

  return (
    <main className="demoos">
      <header className="demoos-top">
        <a className="demoos-brand" href="/"><span><img src="/brand/churvox-holo-c.svg" alt="" /></span><div><strong>CHURVOX</strong><small>Interactive demo</small></div></a>
        <nav><a href="/">Home</a><a href="/pricing">Pricing</a><a href="/contact">Email us</a><a href="/signup" className="demoos-start">Start free trial</a></nav>
      </header>

      <section className="demoos-shell">
        <aside className="demoos-sidebar">
          <div className="demoos-business"><small>DEMO BUSINESS</small><strong>Property Maintenance Co.</strong><span>Sample data only. Safe to explore.</span></div>
          {[["hub","Smart Hub"],["queue","AI Work Queue"],["jobs","Jobs + Dispatch"],["proof","Proof-to-Paid"],["cash","Invoices + Quotes"]].map(([key,label]) => <button key={key} className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>{label}</button>)}
          <div className="demoos-email"><small>Questions?</small><a href="mailto:hello@churvox.com">hello@churvox.com</a></div>
        </aside>

        <section className="demoos-main">
          <section className="demoos-guide">
            <div><small>AI GUIDE · STEP {step + 1} OF {guideSteps.length}</small><h1>{guideTitle}</h1><p>{guideCopy}</p></div>
            <div className="demoos-guide-actions"><button onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>Back</button><button onClick={() => setStep((current) => Math.min(current + 1, guideSteps.length - 1))} disabled={step === guideSteps.length - 1}>Next</button></div>
          </section>

          {activeTab === "hub" && <section className="demoos-grid"><article className="demoos-hero-card"><small>SMART HUB</small><h2>Today’s business admin is already organised.</h2><p>AI found crew decisions, proof-to-paid work, invoice actions and follow-ups waiting for owner approval.</p><div className="demoos-metrics"><span><b>{unassigned.length}</b> needs crew</span><span><b>{completed.length}</b> proof-to-paid</span><span><b>{invoices.length}</b> invoice actions</span></div></article><article><small>AI ACTIVITY</small><h3>What Churvox just prepared</h3><ul className="demoos-events">{events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ul></article></section>}

          {activeTab === "queue" && <section className="demoos-panel"><div className="demoos-panel-head"><small>AI WORK QUEUE</small><h2>Prepared actions waiting for owner approval.</h2></div><div className="demoos-queue">{queue.map((item) => <article key={item.id}><span>{item.label}</span><strong>{item.title}</strong><p>{item.copy}</p><button onClick={() => approve(item.action)}>Approve in demo</button></article>)}</div></section>}

          {activeTab === "jobs" && <section className="demoos-panel"><div className="demoos-panel-head"><small>JOBS + DISPATCH</small><h2>See the run sheet and worker match reasoning.</h2></div><div className="demoos-jobs"><div>{jobs.map((job) => <article key={job.id}><span>{job.status}</span><strong>{job.title}</strong><p>{job.client} · {job.address}</p><small>Worker: {job.worker || "Unassigned"} · {job.proof}</small></article>)}</div><aside><small>AI WORKER MATCH</small>{workers.map((worker) => <article key={worker.name}><strong>{worker.name} · {worker.fit}</strong><span>{worker.area}</span><p>{worker.reason}</p></article>)}</aside></div></section>}

          {activeTab === "proof" && <section className="demoos-panel"><div className="demoos-panel-head"><small>PROOF-TO-PAID</small><h2>Completed work becomes invoice-ready review.</h2></div><div className="demoos-proof">{completed.map((job) => <article key={job.id}><span>Completed job</span><strong>{job.title}</strong><p>{job.client} · {job.proof}</p><div><i>Photo 1</i><i>Photo 2</i><i>Note</i></div><button onClick={() => approve("invoice")}>Prepare draft invoice in demo</button></article>)}</div></section>}

          {activeTab === "cash" && <section className="demoos-panel"><div className="demoos-panel-head"><small>INVOICES + QUOTES</small><h2>Cashflow follow-ups without manual chasing.</h2></div><div className="demoos-cash"><div><h3>Invoices</h3>{invoices.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.client} · {item.amount}</span><p>{item.status}</p></article>)}</div><div><h3>Quotes</h3>{quotes.map((item) => <article key={item.id}><strong>{item.title}</strong><span>{item.client}</span><p>{item.status}</p></article>)}</div></div></section>}
        </section>
      </section>
    </main>
  );
}
