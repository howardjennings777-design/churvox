import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
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
  ["Invoice draft", "Belmont Villas", "$340", "Approve"],
  ["Worker issue", "Gate locked", "Check"],
  ["Quote follow-up", "Garden tidy", "$780", "Park"],
];

const stack = ["Today", "Command", "Jobs", "Workers", "Money"];

const proof = ["14-day trial", "No card upfront", "Owner-approved", "Built for service crews"];

const flow = [
  ["01", "Work comes in", "Jobs, worker updates, customer requests, quotes and invoices."],
  ["02", "Churvox prepares", "The record is organised into the next admin step."],
  ["03", "Owner approves", "Important decisions wait in Command before they move."],
];

const commandCards = [
  ["Approve", "Ready items move forward."],
  ["Edit", "Fix details before anything goes out."],
  ["Park", "Hold unclear work until later."],
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
          <span>Owner command floor</span>
          <b>3 decisions waiting</b>
        </div>
        <em>Demo</em>
      </div>
      <div className="cv2ScreenNav">
        {stack.map((name, index) => <span key={name} className={index === 1 ? "active" : ""}>{name}</span>)}
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
            <div><dt>Proof</dt><dd>Photos + note</dd></div>
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
    <main className="publicSite cv2Site publicPageSlim" data-version="CHURVOX_PUBLIC_HOME_SLIM_20260706">
      <Nav />

      <section className="cv2Hero slimHero">
        <div className="cv2HeroCopy">
          <span className="publicKicker cv2Kicker">Owner approval desk for service businesses</span>
          <h1>Run the day from one Command floor.</h1>
          <p>
            Churvox keeps jobs, workers, clients, quotes, invoices and messages connected. It prepares the admin. You approve.
          </p>
          <div className="publicActions cv2HeroActions">
            <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
            <Link to="/demo" className="publicSecondary">Open demo</Link>
          </div>
          <div className="cv2ProofRail">{proof.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        <CommandScreen />
      </section>

      <section className="cv2Section cv2FlowSection slimBand">
        <div className="cv2SectionHead compactHead">
          <span className="publicKicker">How it works</span>
          <h2>Work goes in. Clear decisions come out.</h2>
        </div>
        <div className="cv2FlowCards">
          {flow.map(([num, title, text]) => <article key={title}><i>{num}</i><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cv2Section cv2SplitFeature slimBand">
        <div>
          <span className="publicKicker">Command</span>
          <h2>One place for owner decisions.</h2>
          <p>Approve, edit and park stay in Command so important admin is not scattered through the product.</p>
          <Link to="/product" className="publicPrimary">View product</Link>
        </div>
        <div className="cv2DecisionStack">
          {commandCards.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="cv2Section cv2PricingTeaser slimBand">
        <div className="cv2SectionHead row">
          <div>
            <span className="publicKicker">Plans</span>
            <h2>Start simple. Add power when needed.</h2>
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
        <span>Churvox does the admin. You approve.</span>
        <h2>Try the public demo or start the trial.</h2>
        <div className="publicActions cv2HeroActions">
          <Link to="/demo" className="publicPrimary">Open demo</Link>
          <Link to="/signup" className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
