import "./PublicSite.css";

const features = [
  ["AI Work Queue", "AI prepares dispatch, invoice drafts, quote follow-ups and reminders for owner approval."],
  ["Smart Hub", "One command view for jobs, crew, clients, quotes, invoices, proof photos and cashflow."],
  ["Proof to Paid", "Completed job proof can become an invoice draft without the owner digging through notes."],
  ["Crew Dispatch", "Match workers by area, workload, availability and job type before assigning work."],
  ["Quotes + Invoices", "Create, review, follow up and keep customer admin moving from one place."],
  ["Owner Approval", "No risky customer message, invoice send, worker assignment or sync happens without approval."],
];

const flows = [
  ["01", "AI scans the business", "Jobs, crew, proof photos, quotes, invoices, unpaid work and open follow-ups stay visible."],
  ["02", "AI prepares the next move", "Churvox turns messy admin into clear actions with the job, client and reason attached."],
  ["03", "Owner approves", "You review the prepared action, edit if needed, then approve. Churvox keeps the admin moving."],
];

const operatorJobs = [
  ["Unassigned jobs", "Finds jobs without a worker and prepares a dispatch recommendation."],
  ["Completed work", "Turns job notes and proof photos into invoice-ready context."],
  ["Open quotes", "Surfaces quotes that should be followed up before the lead goes cold."],
  ["Unpaid invoices", "Prepares polite payment follow-ups while keeping the owner in control."],
  ["Crew workload", "Shows who is busy, who is free, and where work can be assigned next."],
  ["Client admin", "Keeps client, job, quote and invoice context together instead of scattered."],
];

const proofToPaid = [
  "Worker completes job and uploads notes/photos.",
  "Churvox prepares the invoice description from the job context.",
  "Owner reviews proof, price and wording before anything is sent.",
  "Invoice can move from completed work to cashflow without retyping the job.",
];

const guardrails = [
  ["No auto-send", "Customer messages and invoice sends wait for owner approval."],
  ["No blind assignment", "Worker matches show why that worker was recommended."],
  ["No payroll changes", "Payroll-related actions stay review-first and role protected."],
  ["No accounting surprises", "MYOB/accounting syncs stay controlled by approved actions."],
];

const roles = [
  ["Owner", "Full command centre, approvals, billing, jobs, quotes, invoices and reports."],
  ["Manager", "Daily operational control without owner-only billing access."],
  ["Office Admin", "Clients, jobs, quotes, invoices and customer follow-up workflows."],
  ["Worker", "Assigned jobs, job notes, photos, start/finish workflow and simple mobile view."],
  ["Payroll", "Approved hours, pay-period review, payroll notes and exports without broad business access."],
];

const trades = [
  "Lawn care",
  "Property maintenance",
  "Cleaning",
  "Landscaping",
  "Handyman",
  "Painting",
  "Plumbing",
  "Electrical",
  "Pest control",
  "Gardening",
  "Maintenance crews",
  "Mobile service teams",
];

function Nav() {
  return (
    <header className="cvx-nav cvx-vision-nav">
      <a className="cvx-brand" href="/">
        <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
        <div><strong>CHURVOX</strong><small>AI OPERATOR OS</small></div>
      </a>

      <nav>
        <a href="/">Home</a>
        <a href="#how-it-works">How it works</a>
        <a href="#operator">AI Operator</a>
        <a href="#features">Features</a>
        <a href="/pricing">Pricing</a>
        <a href="/demo">Demo</a>
        <a href="/login">Sign in</a>
      </nav>

      <a className="cvx-nav-cta" href="/signup">Start free trial</a>
    </header>
  );
}

function MiniFeed({ title, meta, status }) {
  return (
    <article className="cvx-mini-feed">
      <div><strong>{title}</strong><span>{meta}</span></div>
      <b>{status}</b>
    </article>
  );
}

function ProductPreview() {
  return (
    <aside className="cvx-command-preview" aria-label="Churvox AI command centre preview">
      <div className="cvx-preview-grid" />
      <div className="cvx-preview-glow" />
      <div className="cvx-preview-orbit orbit-one" />
      <div className="cvx-preview-orbit orbit-two" />

      <div className="cvx-preview-core">
        <img src="/brand/churvox-holo-c.svg" alt="" />
        <strong>27</strong>
        <span>owner approvals prepared</span>
      </div>

      <div className="cvx-floating-chip chip-top"><small>AI OPERATOR</small><b>Live scan active</b></div>
      <div className="cvx-floating-chip chip-left"><small>DISPATCH</small><b>5 need crew</b></div>
      <div className="cvx-floating-chip chip-right"><small>CASHFLOW</small><b>$1,278 waiting</b></div>
    </aside>
  );
}

function InfoCard({ title, body }) {
  return (
    <article>
      <strong>{title}</strong>
      <span>{body}</span>
    </article>
  );
}

export default function PublicLandingPage() {
  return (
    <main className="cvx-site cvx-public-vision">
      <Nav />

      <section className="cvx-hero cvx-vision-hero">
        <div className="cvx-vision-copy">
          <div className="cvx-vision-pill"><img src="/brand/churvox-holo-c.svg" alt="" /><span>AI COMMAND CENTRE FOR TRADIES</span></div>
          <p className="cvx-kicker">CHURVOX AI OPERATOR OS</p>
          <h1>AI runs the admin layer.<span>You approve the work.</span></h1>
          <p className="cvx-lede">
            Churvox helps trade and service owners run jobs, crews, quotes, invoices,
            proof photos and follow-ups from one command centre. The AI prepares the
            admin work, explains the next move, and waits for owner approval.
          </p>
          <div className="cvx-actions">
            <a className="cvx-primary" href="/signup">Start free trial</a>
            <a className="cvx-secondary" href="/demo">Try live demo</a>
          </div>
          <div className="cvx-proofbar">
            <span>Approval-first AI</span>
            <span>Built for mobile crews</span>
            <span>No auto-send without owner approval</span>
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="cvx-vision-strip">
        <MiniFeed title="Invoice draft" meta="Completed job proof checked" status="Ready" />
        <MiniFeed title="Worker match" meta="Area and workload scanned" status="Match" />
        <MiniFeed title="Quote recovery" meta="Follow-up can be drafted" status="Draft" />
        <MiniFeed title="Cashflow" meta="Unpaid invoices monitored" status="Watch" />
      </section>

      <section className="cvx-section cvx-vision-section cvx-rich-section" id="how-it-works">
        <div className="cvx-section-head">
          <p className="cvx-kicker">HOW IT WORKS</p>
          <h2>Churvox turns field-service chaos into owner-approved next moves.</h2>
          <p className="cvx-section-copy">
            The point is not to give owners another dashboard to stare at. Churvox watches the daily admin, prepares the next action, and puts it in front of the owner with enough context to approve quickly.
          </p>
        </div>

        <div className="cvx-step-grid cvx-large-grid">
          {flows.map(([number, title, body]) => (
            <article key={title}>
              <b>{number}</b>
              <strong>{title}</strong>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section cvx-rich-section" id="operator">
        <div className="cvx-section-head">
          <p className="cvx-kicker">AI OPERATOR</p>
          <h2>It looks for the admin work owners normally have to remember.</h2>
          <p className="cvx-section-copy">
            Churvox does not just say “something needs doing.” It prepares the action — assign the worker, draft the invoice description, prepare the quote follow-up, or surface overdue cashflow — then waits for approval.
          </p>
        </div>

        <div className="cvx-feature-grid cvx-dense-grid">
          {operatorJobs.map(([title, body]) => <InfoCard key={title} title={title} body={body} />)}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section cvx-split-section" id="proof-to-paid">
        <div>
          <p className="cvx-kicker">PROOF TO PAID</p>
          <h2>Finished work should not turn into more office work.</h2>
          <p className="cvx-section-copy">
            When a worker completes a job, Churvox can help turn proof, notes, service type and client context into invoice-ready admin. The owner still reviews the price and wording before sending.
          </p>
          <div className="cvx-actions"><a className="cvx-primary" href="/demo">See the workflow</a><a className="cvx-secondary" href="/pricing">View pricing</a></div>
        </div>

        <div className="cvx-timeline">
          {proofToPaid.map((item, index) => (
            <article key={item}><b>{index + 1}</b><span>{item}</span></article>
          ))}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section cvx-rich-section" id="features">
        <div className="cvx-section-head">
          <p className="cvx-kicker">WHAT IT RUNS</p>
          <h2>The daily AI control room for service-business owners.</h2>
          <p className="cvx-section-copy">
            Jobs, clients, quotes, invoices, payments, crew activity and proof stay connected. Owners get a cleaner command centre instead of scattered tools and forgotten follow-ups.
          </p>
        </div>

        <div className="cvx-feature-grid">
          {features.map(([title, body]) => <InfoCard key={title} title={title} body={body} />)}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section cvx-rich-section" id="guardrails">
        <div className="cvx-section-head">
          <p className="cvx-kicker">APPROVAL-FIRST GUARDRAILS</p>
          <h2>AI prepares the admin. It does not take risky action without you.</h2>
          <p className="cvx-section-copy">
            Churvox is designed around owner approval. The AI can prepare and explain the work, but the business owner keeps control over customer communication, invoices, worker assignments and sensitive records.
          </p>
        </div>

        <div className="cvx-feature-grid cvx-dense-grid">
          {guardrails.map(([title, body]) => <InfoCard key={title} title={title} body={body} />)}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section cvx-split-section" id="roles">
        <div>
          <p className="cvx-kicker">ROLE-SAFE WORKSPACE</p>
          <h2>Built for owners, office staff, payroll and mobile workers.</h2>
          <p className="cvx-section-copy">
            Churvox keeps the worker app simple, the owner command centre powerful, and payroll/admin access limited to what each role needs.
          </p>
        </div>
        <div className="cvx-role-list">
          {roles.map(([title, body]) => <InfoCard key={title} title={title} body={body} />)}
        </div>
      </section>

      <section className="cvx-section cvx-vision-section cvx-rich-section" id="trades">
        <div className="cvx-section-head">
          <p className="cvx-kicker">BUILT FOR FIELD SERVICE</p>
          <h2>For owners running crews, sites, customers and proof-based billing.</h2>
          <p className="cvx-section-copy">Start with your trade, then run the business from the same Churvox command centre.</p>
        </div>

        <div className="cvx-cloud">{trades.map((trade) => <span key={trade}>{trade}</span>)}</div>
      </section>

      <section className="cvx-final cvx-vision-final cvx-final-rich">
        <p className="cvx-kicker">READY TO SEE IT WORK?</p>
        <h2>Open the demo or start your free trial.</h2>
        <p className="cvx-section-copy">See how Churvox prepares dispatch, proof-to-paid, invoice follow-ups and owner approvals before you commit.</p>
        <div><a className="cvx-primary" href="/demo">Try live demo</a><a className="cvx-secondary" href="/signup">Start free trial</a></div>
      </section>

      <footer className="cvx-footer cvx-vision-footer">
        <div><strong>CHURVOX</strong><span>AI command centre for trade and service businesses.</span></div>
        <nav><a href="/pricing">Pricing</a><a href="/demo">Try demo</a><a href="/contact">Email us</a><a href="/login">Sign in</a></nav>
      </footer>
    </main>
  );
}
