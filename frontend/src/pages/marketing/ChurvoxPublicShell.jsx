import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ChurvoxPublic2026.css";
import "./ChurvoxPublicTouchTargets.css";
import "./ChurvoxPublicReadableHotfix.css";

const DEFAULT_TRIAL_PATH = "/signup?plan=operator";
const navItems = [
  ["/product", "Product"],
  ["/pricing", "Pricing"],
  ["/demo", "Demo"],
  ["/contact", "Contact"],
];

export function PublicNav({ active = "" }) {
  return (
    <header className="cp26Topbar">
      <Link className="cp26Brand" to="/" aria-label="Churvox home">
        <span className="cp26BrandMark"><ChurvoxLogo variant="mark" size="lg" /></span>
        <span className="cp26BrandWords"><b>Churvox</b><small>the admin engine for service businesses</small></span>
      </Link>
      <nav className="cp26NavLinks" aria-label="Public navigation">
        {navItems.map(([to, label]) => (
          <Link key={to} to={to} aria-current={active === to ? "page" : undefined}>{label}</Link>
        ))}
        <a href="/testers/">Testers</a>
      </nav>
      <div className="cp26NavActions">
        <Link className="cp26TextLink" to="/login">Log in</Link>
        <Link className="cp26Button cp26ButtonSmall" to={DEFAULT_TRIAL_PATH}>Start free trial</Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="cp26Footer">
      <div className="cp26FooterLead">
        <span className="cp26BrandMark"><ChurvoxLogo variant="mark" size="md" /></span>
        <div><b>Churvox</b><p>Routine admin happens behind the scenes. The owner approves what matters.</p></div>
      </div>
      <nav aria-label="Footer navigation">
        <Link to="/product">Product</Link>
        <Link to="/pricing">Pricing</Link>
        <Link to="/demo">Demo</Link>
        <a href="/testers/">Tester programme</a>
        <Link to="/about">About</Link>
        <Link to="/security">Security</Link>
        <Link to="/support">Support</Link>
        <Link to="/refunds-cancellations">Billing &amp; cancellations</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/legal/privacy">Privacy</Link>
        <Link to="/legal/terms">Terms</Link>
        <Link to="/delete-account">Delete account</Link>
        <Link to="/login">Log in</Link>
      </nav>
      <small>© {new Date().getFullYear()} Churvox · hello@churvox.com</small>
    </footer>
  );
}

export function Eyebrow({ children, light = false }) {
  return <span className={`cp26Eyebrow${light ? " light" : ""}`}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, text, align = "left" }) {
  return (
    <header className={`cp26SectionHeading ${align === "center" ? "center" : ""}`}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </header>
  );
}

export function CommandPreview() {
  const queue = [
    ["Invoice check", "Example client", "$340 example", "Money"],
    ["Worker update", "Example cleaning job", "Photo missing", "Quality"],
    ["Client reply", "Example Friday booking", "Time needed", "Bookings"],
  ];
  return (
    <aside className="cp26CommandPreview" aria-label="Example Churvox Command workspace">
      <div className="cp26PreviewTop">
        <div><small>Example workspace · sample data only</small><strong>Command</strong></div>
        <span>3 example decisions</span>
      </div>
      <div className="cp26PreviewNav">
        <span>Today</span><span className="active">Command</span><span>Jobs</span><span>Clients</span><span>Money</span>
      </div>
      <div className="cp26PreviewBody">
        <section className="cp26PreviewQueue">
          <small>Example items prepared for review</small>
          {queue.map(([title, client, detail, tray], index) => (
            <article key={title} className={index === 0 ? "selected" : ""}>
              <div><b>{title}</b><span>{client}</span></div>
              <em>{tray}</em>
              <strong>{detail}</strong>
            </article>
          ))}
        </section>
        <section className="cp26PreviewSlip">
          <small>Example owner decision slip</small>
          <h3>Invoice check</h3>
          <dl>
            <div><dt>Client</dt><dd>Example client</dd></div>
            <div><dt>Completed work</dt><dd>Example hedge trim</dd></div>
            <div><dt>Checked</dt><dd>Job, price, proof</dd></div>
            <div><dt>Still needed</dt><dd>Confirm example green-waste amount</dd></div>
          </dl>
          <div className="cp26PreviewActions"><span>Approve</span><span>Edit</span><span>Park</span></div>
          <p>Preview only. Nothing is sent, synced, charged or changed from this example.</p>
        </section>
      </div>
    </aside>
  );
}

export const serviceTypes = [
  "Lawn care", "Landscaping", "Cleaning", "Property maintenance", "Handyman", "Painting",
  "Plumbing", "Electrical", "Pest control", "Gardening", "Hair & beauty", "Mobile services",
];

export const coreAreas = [
  ["Today", "A short owner briefing instead of another dashboard to manage."],
  ["Command", "One approval desk for decisions, corrections and exceptions."],
  ["Jobs", "Schedule, recurring work, proof, notes and job status stay together."],
  ["Clients", "Useful history and preferences stay attached to the relationship."],
  ["Workers", "Simple field updates feed the office record without double handling."],
  ["Quotes & invoices", "Prepared from real client and job information, ready for review."],
];
