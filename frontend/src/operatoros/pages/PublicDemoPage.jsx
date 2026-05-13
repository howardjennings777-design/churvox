
import { useMemo, useState } from "react";
import "./PublicDemoPage.css";

const jobsStart = [
  { id: "j1", title: "Garden clean-up and green waste removal", client: "King Street Rentals", address: "14 King Street", status: "Unassigned", worker: "Unassigned", proof: "Waiting for worker proof", amount: "$280" },
  { id: "j2", title: "Lawns and hedge trim", client: "Harbour Property Group", address: "88 Queens Drive", status: "Completed", worker: "Mia", proof: "4 photos + completion note", amount: "$240" },
  { id: "j3", title: "Rental exterior tidy-up", client: "ECB Property Maintenance", address: "22 Rimu Road", status: "In progress", worker: "Sam", proof: "Timer running", amount: "$190" },
];

const workers = [
  { name: "Sam", area: "Lower Hutt", status: "Available", load: "2 jobs today", match: "Best match: nearby, available, similar job history." },
  { name: "Mia", area: "Wellington", status: "Finishing job", load: "3 jobs today", match: "Good proof history, but already loaded." },
  { name: "Tane", area: "Porirua", status: "Available later", load: "1 job today", match: "Backup option, further from site." },
];

const invoices = [
  { title: "Invoice #1042", client: "Harbour Property Group", value: "$240", status: "Draft ready" },
  { title: "Invoice #1038", client: "Aro Valley Rentals", value: "$180", status: "Reminder drafted" },
];

const quotes = [
  { title: "Quote #221", client: "North City Body Corp", value: "$760", status: "Follow-up ready" },
  { title: "Quote #219", client: "Private landlord", value: "$420", status: "Waiting" },
];

const guide = [
  "This is a safe Churvox demo workspace. No login, no real data, no backend changes.",
  "AI has already scanned jobs, workers, invoices and quote follow-ups, then prepared the next moves.",
  "Approve the dispatch suggestion to see how the owner stays in control.",
  "Open Proof-to-Paid to see how completed work becomes invoice-ready.",
];

export default function PublicDemoPage() {
  const [tab, setTab] = useState("hub");
  const [jobs, setJobs] = useState(jobsStart);
  const [step, setStep] = useState(0);
  const [activity, setActivity] = useState([
    "AI scanned today’s jobs and found 3 useful actions.",
    "Worker match prepared for 14 King Street.",
    "Proof-to-Paid review prepared for Harbour Property Group.",
  ]);

  const stats = useMemo(() => {
    return {
      unassigned: jobs.filter((j) => j.status === "Unassigned").length,
      completed: jobs.filter((j) => j.status === "Completed").length,
      active: jobs.filter((j) => j.status === "In progress").length,
      cash: "$420",
    };
  }, [jobs]);

  function pushActivity(text) {
    setActivity((current) => [text, ...current].slice(0, 6));
  }

  function approveAssign() {
    setJobs((current) =>
      current.map((job) =>
        job.id === "j1"
          ? { ...job, status: "Assigned", worker: "Sam", proof: "Worker will receive this job in the field app" }
          : job
      )
    );
    setTab("jobs");
    pushActivity("Approved in demo: Sam assigned to 14 King Street.");
  }

  function prepareInvoice() {
    setTab("proof");
    pushActivity("Prepared in demo: draft invoice created from completed job proof.");
  }

  function prepareReminder() {
    setTab("cash");
    pushActivity("Prepared in demo: customer reminder drafted, not sent.");
  }

  const nav = [
    ["hub", "Smart Hub"],
    ["queue", "AI Work Queue"],
    ["jobs", "Jobs"],
    ["proof", "Proof-to-Paid"],
    ["cash", "Quotes + Invoices"],
    ["team", "Crew"],
  ];

  return (
    <main className="demo-real">
      <aside className="demo-side">
        <a className="demo-brand" href="/">
          <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
          <div><strong>CHURVOX</strong><small>Demo workspace</small></div>
        </a>

        <div className="demo-business">
          <small>DEMO BUSINESS</small>
          <strong>Property Maintenance Co.</strong>
          <span>Sample data only. Safe to click.</span>
        </div>

        <nav>
          {nav.map(([key, label]) => (
            <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="demo-side-footer">
          <a href="/signup">Start free trial</a>
          <a href="mailto:hello@churvox.com">Email us</a>
        </div>
      </aside>

      <section className="demo-main">
        <header className="demo-top">
          <div>
            <small>LIVE DEMO · AI OPERATOR MODE</small>
            <h1>{tab === "hub" ? "Smart Hub" : nav.find(([key]) => key === tab)?.[1]}</h1>
          </div>
          <div className="demo-top-actions">
            <a href="/">Home</a>
            <a href="/pricing">Pricing</a>
            <a className="primary" href="/signup">Start free trial</a>
          </div>
        </header>

        <section className="demo-guide">
          <div>
            <small>AI GUIDE · STEP {step + 1} OF {guide.length}</small>
            <strong>{guide[step]}</strong>
          </div>
          <div>
            <button onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}>Back</button>
            <button onClick={() => setStep((n) => Math.min(guide.length - 1, n + 1))} disabled={step === guide.length - 1}>Next</button>
          </div>
        </section>

        {tab === "hub" && (
          <>
            <section className="demo-stats">
              <article><span>Needs crew</span><strong>{stats.unassigned}</strong><small>AI can recommend worker</small></article>
              <article><span>In progress</span><strong>{stats.active}</strong><small>Worker running job</small></article>
              <article><span>Proof-to-Paid</span><strong>{stats.completed}</strong><small>Completed job ready</small></article>
              <article><span>Cash actions</span><strong>{stats.cash}</strong><small>Follow-ups prepared</small></article>
            </section>

            <section className="demo-two">
              <article className="demo-card hero">
                <small>AI OPERATOR SUMMARY</small>
                <h2>Today’s admin is already organised.</h2>
                <p>Churvox has found dispatch, proof-to-paid, invoice and quote follow-up actions. The owner approves before anything important happens.</p>
                <div className="demo-actions-row">
                  <button onClick={() => setTab("queue")}>Open AI Work Queue</button>
                  <button onClick={() => setTab("jobs")}>View jobs</button>
                </div>
              </article>

              <article className="demo-card">
                <small>AI ACTIVITY</small>
                <h3>What Churvox prepared</h3>
                <ul className="demo-activity">
                  {activity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                </ul>
              </article>
            </section>
          </>
        )}

        {tab === "queue" && (
          <section className="demo-card">
            <small>AI WORK QUEUE</small>
            <h2>Prepared actions waiting for owner approval.</h2>
            <div className="demo-queue">
              <article>
                <span>Dispatch</span>
                <strong>Assign Sam to 14 King Street</strong>
                <p>Best match by area, availability and similar job history.</p>
                <button onClick={approveAssign}>Approve in demo</button>
              </article>
              <article>
                <span>Proof-to-Paid</span>
                <strong>Prepare invoice for Harbour Property Group</strong>
                <p>Completed job has worker note and proof photos.</p>
                <button onClick={prepareInvoice}>Prepare in demo</button>
              </article>
              <article>
                <span>Cashflow</span>
                <strong>Draft payment reminder for Invoice #1038</strong>
                <p>Reminder is prepared but not sent without approval.</p>
                <button onClick={prepareReminder}>Draft in demo</button>
              </article>
            </div>
          </section>
        )}

        {tab === "jobs" && (
          <section className="demo-card">
            <small>JOBS WORKSPACE</small>
            <h2>Real app style job board.</h2>
            <div className="demo-table">
              {jobs.map((job) => (
                <article key={job.id}>
                  <div><strong>{job.title}</strong><span>{job.client} · {job.address}</span></div>
                  <b className={`status ${job.status.toLowerCase().replaceAll(" ", "-")}`}>{job.status}</b>
                  <span>{job.worker}</span>
                  <span>{job.amount}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "proof" && (
          <section className="demo-card">
            <small>PROOF-TO-PAID</small>
            <h2>Completed work becomes invoice-ready.</h2>
            <div className="demo-proof">
              <article>
                <strong>Lawns and hedge trim</strong>
                <p>Harbour Property Group · 88 Queens Drive</p>
                <div><i>Photo 1</i><i>Photo 2</i><i>Worker note</i></div>
                <button onClick={prepareInvoice}>Prepare draft invoice</button>
              </article>
              <article>
                <strong>AI invoice description</strong>
                <p>“Lawn mowing, hedge trim, green waste tidy-up and site completion proof for 88 Queens Drive.”</p>
                <span>Owner can edit before sending.</span>
              </article>
            </div>
          </section>
        )}

        {tab === "cash" && (
          <section className="demo-two">
            <article className="demo-card">
              <small>INVOICES</small>
              <h2>Invoice actions</h2>
              {invoices.map((item) => (
                <div className="demo-money" key={item.title}>
                  <strong>{item.title}</strong><span>{item.client}</span><b>{item.value}</b><em>{item.status}</em>
                </div>
              ))}
            </article>
            <article className="demo-card">
              <small>QUOTES</small>
              <h2>Quote follow-ups</h2>
              {quotes.map((item) => (
                <div className="demo-money" key={item.title}>
                  <strong>{item.title}</strong><span>{item.client}</span><b>{item.value}</b><em>{item.status}</em>
                </div>
              ))}
            </article>
          </section>
        )}

        {tab === "team" && (
          <section className="demo-card">
            <small>CREW WORKSPACE</small>
            <h2>Worker availability and match reasoning.</h2>
            <div className="demo-workers">
              {workers.map((worker) => (
                <article key={worker.name}>
                  <strong>{worker.name}</strong>
                  <span>{worker.area} · {worker.status}</span>
                  <b>{worker.load}</b>
                  <p>{worker.match}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
