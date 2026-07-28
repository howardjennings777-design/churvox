import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./ChurvoxPublic2026.css";
import "./ChurvoxPublicWorld.css";
import "./ChurvoxPublicTouchTargets.css";
import "./ChurvoxPublicReadableHotfix.css";
import "./ChurvoxPremiumPublic.css";
import "./ChurvoxPremiumScenes.css";
import "./ChurvoxPublicContrastFixes.css";

const DEFAULT_TRIAL_PATH = "/signup/?plan=operator";
const navItems = [["/product/", "Product"], ["/features/", "Features"], ["/pricing/", "Pricing"], ["/demo/", "Demo"], ["/security/", "Security"], ["/contact/", "Contact"]];

const PUBLIC_COPY = new Map([
  ["Churvox access layer", "Secure sign in"],
  ["Open the right room.", "Sign in to Churvox."],
  ["Your account decides what opens next—Command for owners, the field view for workers, and the correct access gate for everyone else.", "Enter your email and password. Churvox will open the correct account area."],
  ["Identity check", "Sign in"],
  ["Waiting for identity", "Ready to sign in"],
  ["Checking identity", "Signing in"],
  ["Preparing secure entry", "Loading"],
  ["Secure office entry", "Owner sign in"],
  ["Encrypted session", "Secure session"],
  ["Role-aware entry", "Correct account access"],
  ["No hidden action", "No business action on sign in"],
  ["Trial path", "Free trial"],
  ["Verification first. Billing never starts during signup.", "Verify your email, then start your 14-day trial."],
  ["Tester path", "Tester signup"],
  ["Tester access skips billing, not verification or setup.", "Tester access still requires email verification and business setup."],
  ["Account consent is recorded by the server.", "Your agreement to the terms is recorded."],
  ["Churvox opens with the business type you selected.", "Your selected business type is used to set up Churvox."],
]);

const FULL_ELEMENT_COPY = new Map([
  ["One login.The right room opens.", "Sign in to Churvox."],
  ["One login. The right room opens.", "Sign in to Churvox."],
]);

function applyPublicCopy() {
  const root = document.body;
  if (!root) return;

  root.querySelectorAll("h1,h2,h3,p,small,b,span,button,li").forEach((element) => {
    const text = String(element.textContent || "").trim();
    const replacement = FULL_ELEMENT_COPY.get(text);
    if (replacement) element.textContent = replacement;
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const raw = node.nodeValue || "";
    const trimmed = raw.trim();
    const replacement = PUBLIC_COPY.get(trimmed);
    if (!replacement) return;
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    node.nodeValue = `${leading}${replacement}${trailing}`;
  });
}

function PublicCopyCleanup() {
  React.useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyPublicCopy();
      });
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

function withTrailingSlash(value = "") {
  const [path, suffix = ""] = String(value).split(/(?=[?#])/u, 2);
  if (!path || path === "/" || path.endsWith("/")) return value;
  return `${path}/${suffix}`;
}

export function PublicNav({ active = "" }) {
  const [open, setOpen] = React.useState(false);
  const activePath = withTrailingSlash(active);
  return <><PublicCopyCleanup /><header className="cp26Topbar cpWorldTopbar">
    <Link className="cp26Brand" to="/" aria-label="Churvox home" onClick={() => setOpen(false)}>
      <span className="cp26BrandMark"><ChurvoxLogo variant="mark" size="lg" /></span>
      <span className="cp26BrandWords"><b>Churvox</b><small>job management for service businesses</small></span>
      <span className="cpWorldBrandCode"><i />Now available</span>
    </Link>
    <button className="cpWorldMenu" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Menu</button>
    <nav className={`cp26NavLinks cpWorldNavLinks${open ? " open" : ""}`} aria-label="Public navigation">
      {navItems.map(([to, label]) => <Link key={to} to={to} aria-current={activePath === to ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
      <a href="/testers/">Testers</a>
    </nav>
    <div className="cp26NavActions">
      <span className="cpWorldOnline"><i />Ready</span>
      <Link className="cp26TextLink" to="/login/">Log in</Link>
      <Link className="cp26Button cp26ButtonSmall" to={DEFAULT_TRIAL_PATH}>Start free trial</Link>
    </div>
  </header></>;
}

function FooterLink({ to, children }) {
  const openPageAtTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  };

  return <Link to={to} onClick={openPageAtTop}>{children}</Link>;
}

export function PublicFooter() {
  return <footer className="cpWorldFooter">
    <div className="cpWorldFooterGrid">
      <div className="cpWorldFooterLead cp26FooterLead"><span className="cp26BrandMark"><ChurvoxLogo variant="mark" size="md" /></span><div><b>Churvox</b><p>Manage jobs, clients, workers, quotes and invoices in one place. Churvox prepares the admin; the owner reviews and approves.</p></div></div>
      <div className="cpWorldFooterGroup"><b>Product</b><nav><FooterLink to="/product/">Product overview</FooterLink><FooterLink to="/features/">Features</FooterLink><FooterLink to="/demo/">Demo</FooterLink><FooterLink to="/pricing/">Pricing</FooterLink><FooterLink to="/industries/landscaping/">Industries</FooterLink></nav></div>
      <div className="cpWorldFooterGroup"><b>Help and trust</b><nav><FooterLink to="/about/">About</FooterLink><FooterLink to="/security/">Security</FooterLink><FooterLink to="/support/">Support</FooterLink><FooterLink to="/refunds-cancellations/">Billing and cancellations</FooterLink><FooterLink to="/contact/">Contact</FooterLink></nav></div>
      <div className="cpWorldFooterGroup"><b>Account and legal</b><nav><FooterLink to="/login/">Log in</FooterLink><FooterLink to={DEFAULT_TRIAL_PATH}>Start trial</FooterLink><FooterLink to="/legal/privacy/">Privacy</FooterLink><FooterLink to="/legal/terms/">Terms</FooterLink><FooterLink to="/delete-account">Delete account</FooterLink></nav></div>
    </div>
    <div className="cpWorldFooterBase"><span>© {new Date().getFullYear()} Churvox · hello@churvox.com</span><span>Nothing important sends, charges, syncs or changes without owner approval.</span></div>
  </footer>;
}

export function Eyebrow({ children, light = false }) { return <span className={`cp26Eyebrow${light ? " light" : ""}`}>{children}</span>; }
export function SectionHeading({ eyebrow, title, text, align = "left" }) { return <header className={`cp26SectionHeading ${align === "center" ? "center" : ""}`}>{eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}<h2>{title}</h2>{text ? <p>{text}</p> : null}</header>; }

export function CommandPreview() {
  const queue = [["Invoice check", "Example client", "$340 example", "Money"], ["Worker update", "Example cleaning job", "Photo missing", "Quality"], ["Client reply", "Example Friday booking", "Time needed", "Bookings"]];
  return <aside className="cp26CommandPreview" aria-label="Example Churvox Command workspace"><div className="cp26PreviewTop"><div><small>Example workspace · sample data only</small><strong>Command</strong></div><span>3 decisions</span></div><div className="cp26PreviewNav"><span>Today</span><span className="active">Command</span><span>Jobs</span><span>Clients</span><span>Money</span></div><div className="cp26PreviewBody"><section className="cp26PreviewQueue"><small>Items waiting for review</small>{queue.map(([title, client, detail, tray], index) => <article key={title} className={index === 0 ? "selected" : ""}><div><b>{title}</b><span>{client}</span></div><em>{tray}</em><strong>{detail}</strong></article>)}</section><section className="cp26PreviewSlip"><small>Owner review</small><h3>Invoice check</h3><dl><div><dt>Client</dt><dd>Example client</dd></div><div><dt>Completed work</dt><dd>Example hedge trim</dd></div><div><dt>Checked</dt><dd>Job, price, proof</dd></div><div><dt>Still needed</dt><dd>Confirm example green-waste amount</dd></div></dl><div className="cp26PreviewActions"><span>Approve</span><span>Edit</span><span>Park</span></div><p>Preview only. Nothing is sent, synced, charged or changed from this example.</p></section></div></aside>;
}

export const serviceTypes = ["Lawn care", "Landscaping", "Cleaning", "Property maintenance", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Gardening", "Hair & beauty", "Mobile services"];
export const coreAreas = [["Today", "See today's work and anything needing attention."], ["Command", "Review decisions, corrections and exceptions."], ["Jobs", "Keep schedule, recurring work, proof, notes and status together."], ["Clients", "Keep useful history and preferences with each client."], ["Workers", "Simple field updates feed the office record without double handling."], ["Quotes & invoices", "Prepare them from real client and job information, ready for review."]];
