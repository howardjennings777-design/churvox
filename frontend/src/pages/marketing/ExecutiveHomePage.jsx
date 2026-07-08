import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { BusinessCoverageSection, ProfessionStrip, TradeFlowSection } from "./PublicProfessionSections";
import "../../runtime/churvoxPublicCopyRuntime";
import "./SimplePublic.css";

const navLinks = [
  ["/product", "Product", "route"],
  ["/demo", "Demo", "route"],
  ["/pricing", "Pricing", "route"],
  ["/request", "Request", "route"],
  ["/contact", "Contact", "route"],
  ["/login", "Log in", "route"],
];

const commandQueue = [
  ["Invoice ready", "Belmont Villas", "$340", "Approve"],
  ["Gate issue", "Northwood", "Check", "Edit"],
  ["Quote viewed", "Garden tidy", "$780", "Park"],
];

const stack = ["Today", "Command", "Jobs", "Workers", "Money"];

const proof = ["14-day trial", "No card upfront", "Owner approval built in", "For service trades and crews"];

const flow = [
  ["01", "Work lands", "Jobs, requests, worker notes and invoice drafts arrive in one place."],
  ["02", "Churvox sorts it", "The record is cleaned up with the client, job, price, proof and next step together."],
  ["03", "You decide", "Anything important waits in Command until the owner approves, edits or parks it."],
];

const commandCards = [
  ["Approve", "Send the ready work forward."],
  ["Edit", "Fix the detail before it leaves."],
  ["Park", "Hold anything unclear without losing it."],
];

const planLadder = [
  ["Start", "$39/mo + GST", "Core jobs, clients, quotes and invoices."],
  ["Crew", "$89/mo + GST", "Worker flow, team messages and field updates."],
  ["Operator", "$149/mo + GST", "Prepared admin plus Command.", "Most Popular"],
  ["Command", "$299/mo + GST", "Full owner approval desk and controls."],
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
        <Link to="/product">Product</Link>
        <Link to="/demo">Demo</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/request">Request</Link>
        <Link to="/contact">Contact</Link>
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
          <span>Command</span>
          <b>3 owner checks waiting</b>
        </div>
        <em>Live style</em>
      </div>
      <div className="cv2ScreenNav">
        {stack.map((name, index) => <span key={name} className={index === 1 ? "active" : ""}>{name}</span>)}
      </div>
      <div className="cv2ScreenGrid">
        <section className="cv2Queue">
          <small>Ready for review</small>
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
          <h3>Invoice ready</h3>
          <dl>
            <div><dt>Client</dt><dd>Belmont Villas</dd></div>
            <div><dt>Work</dt><dd>Hedge trim</dd></div>
            <div><dt>Proof</dt><dd>Photos + worker note</dd></div>
            <div><dt>Owner</dt><dd>Approve, edit or park</dd></div>
          </dl>
          <div className="cv2SlipActions"><button>Approve</button><button>Edit</button><button>Park</button></div>
        </section>
      </div>
    </aside>
  );
}

export default function ExecutiveHomePage() {
  return (
    <main className="publicSite cv2Site publicPageSlim" data-version="CHURVOX_PUBLIC_SERVICE_PLATFORM_20260708">
      <Nav />

      <section className="cv2Hero slimHero">
        <div className="cv2HeroCopy">
          <span className="publicKicker cv2Kicker">For field-service businesses drowning in admin</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p>
            Built for lawn care, cleaning, landscaping, property maintenance, handyman work, painting, pest control, plumbing, electrical, HVAC and mobile service crews that need jobs, workers, quotes, invoices and messages connected.
          </p>
          <div className="publicActions cv2HeroActions">
            <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
            <Link to="/demo" className="publicSecondary">See the demo</Link>
          </div>
          <div className="cv2ProofRail">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <CommandScreen />
      </section>

      <ProfessionStrip />

      <section className="cv2Section cv2FlowSection slimBand">
        <div className="cv2SectionHead compactHead">
          <span className="publicKicker">The Churvox loop</span>
          <h2>No chasing. No scattered decisions.</h2>
        </div>
        <div className="cv2FlowCards">
          {flow.map(([num, title, text]) => <article key={title}><i>{num}</i><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <TradeFlowSection />

      <section className="cv2Section cv2SplitFeature slimBand">
        <div>
          <span className="publicKicker">Command</span>
          <h2>The owner desk for the work that matters.</h2>
          <p>Command is where prepared admin becomes a decision. It keeps approvals out of random pages and puts the owner back in control.</p>
          <Link to="/product" className="publicPrimary">See product</Link>
        </div>
        <div className="cv2DecisionStack">
          {commandCards.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <BusinessCoverageSection />

      <section className="cv2Section cv2PricingTeaser slimBand">
        <div className="cv2SectionHead row">
          <div>
            <span className="publicKicker">Plans</span>
            <h2>Start with the level that fits today.</h2>
          </div>
          <Link to="/pricing" className="publicSecondary">View pricing</Link>
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

      <section className="cv2FinalCta slimCta">
        <span>Ready when you are</span>
        <h2>Open the demo, then start the trial.</h2>
        <div className="publicActions cv2HeroActions">
          <Link to="/demo" className="publicPrimary">See the demo</Link>
          <Link to="/signup" className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
