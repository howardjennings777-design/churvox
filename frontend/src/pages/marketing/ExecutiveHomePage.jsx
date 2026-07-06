import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./SimplePublic.css";

const navLinks = [
  ["/features", "Product", "route"],
  ["/demo", "Demo", "route"],
  ["/pricing", "Pricing", "route"],
  ["/request", "Request", "route"],
  ["/#contact", "Contact", "external"],
  ["/login", "Log in", "route"],
];

const commandQueue = [
  ["Invoice draft", "Belmont Villas", "$340", "Approve"],
  ["Worker issue", "Gate locked", "Check"],
  ["Quote follow-up", "Garden tidy", "$780", "Park"],
];

const stack = [
  ["Today", "What needs doing now."],
  ["Command", "What needs your decision."],
  ["Jobs", "The run sheet and job forms."],
  ["Workers", "Field updates, photos and notes."],
  ["Money", "Quotes, invoices and safe handoff."],
];

const proof = ["14-day trial", "No card upfront", "Owner-approved", "Built for service crews"];

const outcomes = [
  ["Less hunting", "Jobs, workers, messages and money stop living in different places."],
  ["Cleaner decisions", "Important admin waits in Command with the context beside it."],
  ["Faster follow-up", "Quotes, invoices, customer replies and issue slips are prepared from records."],
  ["Safer control", "Churvox prepares the next step, but the owner still checks and approves."],
];

const flow = [
  ["01", "Work comes in", "Add jobs, receive worker updates, capture customer requests or build quotes."],
  ["02", "Churvox organises it", "The records connect: client, worker, price, proof, messages and next step."],
  ["03", "Command decides", "The owner approves, edits or parks anything important before it moves."],
];

const smart = [
  ["Assign", "Worker suggested by run, area and workload."],
  ["Schedule", "Time and recurrence kept practical."],
  ["Quote", "Draft built from service and client details."],
  ["Invoice", "Draft built from job notes, proof and price."],
  ["Problem slip", "Worker issues become owner decisions."],
  ["Day close", "Tomorrow and unfinished admin surfaced cleanly."],
];

const tradeCards = [
  ["Landscaping", "Recurring jobs, proof photos, quotes and clean invoice drafts."],
  ["Cleaning", "Team runs, client access notes, messages and follow-ups."],
  ["Property maintenance", "Issue slips, site history, worker notes and customer updates."],
  ["Repairs", "One-off work, quotes, job proof and owner-approved next steps."],
];

const planLadder = [
  ["Start", "$39/mo + GST", "Jobs, clients, quotes and invoices."],
  ["Crew", "$89/mo + GST", "Workers, messages and team flow."],
  ["Operator", "$149/mo + GST", "Prepared admin plus Command.", "Most Popular"],
  ["Command", "$299/mo + GST", "Full approval desk and controls."],
];

function PublicNavLink({ to, label, type }) {
  if (type === "external") return <a href={to}>{label}</a>;
  return <Link to={to}>{label}</Link>;
}

export function Nav() {
  return (
    <nav className="publicNav cv2Nav" aria-label="Public navigation">
      <Link to="/" className="publicBrand cv2Brand" aria-label="Churvox home">
        <ChurvoxLogo variant="mark" size="lg" />
        <span>
          <b>Churvox</b>
          <small>does the admin</small>
        </span>
      </Link>
      <div className="publicLinks cv2Links">
        {navLinks.map(([to, label, type]) => <PublicNavLink key={to} to={to} label={label} type={type} />)}
        <Link to="/signup" className="publicPrimary cv2NavCta">Start trial</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="publicFooter cv2Footer">
      <div className="publicFooterBrand">
        <ChurvoxLogo variant="mark" size="md" />
        <span>
          <b>Churvox</b>
          <small>Churvox does the admin. You approve.</small>
        </span>
      </div>
      <nav aria-label="Footer navigation">
        <Link to="/features">Product</Link>
        <Link to="/demo">Demo</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/request">Request</Link>
        <a href="/#contact">Contact</a>
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-of-service">Terms</Link>
        <Link to="/login">Log in</Link>
      </nav>
    </footer>
  );
}

function CommandScreen() {
  return (
    <aside className="cv2CommandScreen" aria-label="Churvox Command preview">
      <div className="cv2ScreenTop">
        <div>
          <span>Owner command floor</span>
          <b>Today needs 3 decisions</b>
        </div>
        <em>Live demo</em>
      </div>
      <div className="cv2ScreenNav">
        {stack.map(([name], index) => <span key={name} className={index === 1 ? "active" : ""}>{name}</span>)}
      </div>
      <div className="cv2ScreenGrid">
        <section className="cv2Queue">
          <small>Waiting for owner</small>
          {commandQueue.map(([type, client, value, action]) => (
            <article key={`${type}-${client}`}>
              <div><b>{type}</b><span>{client}</span></div>
              <strong>{value}</strong>
              <em>{action}</em>
            </article>
          ))}
        </section>
        <section className="cv2Slip">
          <small>Approval slip</small>
          <h3>Invoice draft ready</h3>
          <dl>
            <div><dt>Client</dt><dd>Belmont Villas</dd></div>
            <div><dt>Job</dt><dd>Hedge trim</dd></div>
            <div><dt>Proof</dt><dd>3 photos + worker note</dd></div>
            <div><dt>Next</dt><dd>Approve, edit or park</dd></div>
          </dl>
          <div className="cv2SlipActions"><button>Approve</button><button>Edit</button><button>Park</button></div>
        </section>
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="publicSite cv2Site" data-version="CHURVOX_PUBLIC_REBUILD_20260706">
      <Nav />

      <section className="cv2Hero">
        <div className="cv2HeroCopy">
          <span className="publicKicker cv2Kicker">Owner approval desk for service businesses</span>
          <h1>Run the day from one Command floor.</h1>
          <p>
            Churvox keeps jobs, workers, clients, quotes, invoices and messages connected. It prepares the admin, then brings important decisions back to the owner.
          </p>
          <div className="publicActions cv2HeroActions">
            <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
            <Link to="/demo" className="publicSecondary">Open public demo</Link>
          </div>
          <div className="cv2ProofRail">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <CommandScreen />
      </section>

      <section className="cv2OutcomeStrip">
        {outcomes.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
      </section>

      <section className="cv2Section cv2FlowSection">
        <div className="cv2SectionHead">
          <span className="publicKicker">How it works</span>
          <h2>From messy work to clear approval.</h2>
          <p>Churvox is built around one simple rule: admin can be prepared, but the owner approves the important stuff.</p>
        </div>
        <div className="cv2FlowCards">
          {flow.map(([num, title, text]) => <article key={title}><i>{num}</i><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cv2Section cv2SplitFeature">
        <div>
          <span className="publicKicker">Command</span>
          <h2>Approve, edit and park are not scattered everywhere.</h2>
          <p>Other pages show the work. Command is where decisions happen: invoice drafts, quote follow-ups, worker issues, missing details and customer replies.</p>
          <Link to="/features" className="publicPrimary">See product flow</Link>
        </div>
        <div className="cv2DecisionStack">
          {smart.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cv2Section">
        <div className="cv2SectionHead row">
          <div>
            <span className="publicKicker">Built for real work</span>
            <h2>Simple enough for a busy owner.</h2>
          </div>
          <p>Different trades, same admin problem: work moves fast, records get messy, and owners need one clear place to decide.</p>
        </div>
        <div className="cv2TradeGrid">
          {tradeCards.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cv2Section cv2PricingTeaser">
        <div className="cv2SectionHead row">
          <div>
            <span className="publicKicker">Plans</span>
            <h2>Start small. Add Command when the business needs it.</h2>
          </div>
          <Link to="/pricing" className="publicSecondary">View full pricing</Link>
        </div>
        <div className="cv2PlanRail">
          {planLadder.map(([name, price, text, badge]) => (
            <article key={name} className={badge ? "featured" : ""}>
              {badge ? <small>{badge}</small> : null}
              <b>{name}</b>
              <strong>{price}</strong>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="cv2Section cv2ContactBand">
        <div>
          <span className="publicKicker">Contact</span>
          <h2>Talk to Churvox.</h2>
          <p>Email <b>hello@churvox.com</b> for setup help, trial support, demos or tester access.</p>
        </div>
        <div className="cv2ContactCards">
          <article><b>Email</b><span>hello@churvox.com</span></article>
          <article><b>Public demo</b><span>Use churvox.com/demo to show the workflow without logging in.</span></article>
          <article><b>Customer request</b><span>Use the request form when a customer wants work reviewed by the owner.</span></article>
        </div>
      </section>

      <section className="cv2FinalCta">
        <span>Churvox does the admin. You approve.</span>
        <h2>Put the business into one clean Command floor.</h2>
        <div className="publicActions cv2HeroActions">
          <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
          <Link to="/pricing" className="publicSecondary">View plans</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
