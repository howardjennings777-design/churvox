import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Route,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import {
  CHURVOX_PROMISE,
  CUSTOMER_PAGES,
  INDUSTRIES,
  OFFICE_DESKS,
  PLANS,
  PUBLIC_PAGES,
  SURFACES,
  WHOLE_SITE_RELEASE_GATES,
} from "./siteContract";
import "./siteNext.css";

const ICONS = [BriefcaseBusiness, CalendarDays, ClipboardCheck, ShieldCheck, CreditCard, Users2, Route, FileCheck2];

function previewHref(page = "home") {
  return `/new-command-lab?surface=public&page=${encodeURIComponent(page)}`;
}

function readPage(search) {
  const page = new URLSearchParams(search || "").get("page") || "home";
  const allowed = new Set([
    ...PUBLIC_PAGES.map((item) => item.key),
    "login",
    "signup",
    ...CUSTOMER_PAGES.map((item) => `customer-${item[0]}`),
  ]);
  return allowed.has(page) ? page : "home";
}

function SurfaceBar() {
  return (
    <div className="cvnextSurfaceBar" role="navigation" aria-label="Private rebuild surfaces">
      <span>Private rebuild preview</span>
      <div>
        {SURFACES.map((surface) => (
          <a key={surface.key} href={surface.href} className={surface.key === "public" ? "active" : ""}>{surface.label}</a>
        ))}
      </div>
      <small>Live Churvox is unchanged</small>
    </div>
  );
}

function Header({ page }) {
  return (
    <header className="cvnextHeader">
      <Link className="cvnextBrand" to={previewHref("home")}>
        <ChurvoxLogo variant="mark" size="lg" />
        <span><strong>Churvox</strong><small>the office working in the background</small></span>
      </Link>
      <nav aria-label="Public preview navigation">
        {PUBLIC_PAGES.slice(0, 6).map((item) => (
          <Link key={item.key} className={page === item.key ? "active" : ""} to={previewHref(item.key)}>{item.label}</Link>
        ))}
      </nav>
      <div className="cvnextHeaderActions">
        <Link className="cvnextTextButton" to={previewHref("login")}>Log in</Link>
        <Link className="cvnextButton compact" to={previewHref("signup")}>Start 14-day trial</Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="cvnextFooter">
      <div className="cvnextFooterBrand">
        <ChurvoxLogo variant="mark" size="md" />
        <div><strong>Churvox</strong><p>{CHURVOX_PROMISE}</p></div>
      </div>
      <div className="cvnextFooterLinks">
        {PUBLIC_PAGES.map((page) => <Link key={page.key} to={previewHref(page.key)}>{page.label}</Link>)}
        <Link to={previewHref("customer-portal")}>Customer pages</Link>
        <a href="mailto:hello@churvox.com">hello@churvox.com</a>
      </div>
      <small>Private preview only · Pricing unchanged · Nothing here sends, charges, syncs or changes records.</small>
    </footer>
  );
}

function Eyebrow({ children }) {
  return <span className="cvnextEyebrow">{children}</span>;
}

function HeroActions({ secondary = "See how it works" }) {
  return (
    <div className="cvnextActions">
      <Link className="cvnextButton" to={previewHref("signup")}>Start 14-day trial <ArrowRight size={17} /></Link>
      <Link className="cvnextButton secondary" to={previewHref("demo")}>{secondary}</Link>
    </div>
  );
}

function OfficeFloor() {
  return (
    <aside className="cvnextOfficeFloor" aria-label="Example Churvox background office">
      <header>
        <div><small>Sample workspace · no real records</small><strong>Background office</strong></div>
        <span className="cvnextLiveDot">Working</span>
      </header>
      <div className="cvnextOfficeList">
        {OFFICE_DESKS.slice(0, 6).map(([name], index) => (
          <article key={name}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{name}</strong><small>{index === 0 ? "2 requests checked" : index === 1 ? "18 visits reviewed" : index === 2 ? "6 jobs moving" : index === 3 ? "3 proof packs checked" : index === 4 ? "$275 prepared" : "4 promises protected"}</small></div>
            <em>{index === 4 ? "1 needs you" : "Clear"}</em>
          </article>
        ))}
      </div>
      <footer><span>Routine work stays behind the scenes.</span><strong>Only genuine decisions reach Command.</strong></footer>
    </aside>
  );
}

function HomePage() {
  const outcomes = [
    ["One owner briefing", "Today shows work, money, field state and the few things that genuinely need attention."],
    ["One approval desk", "Command explains what happened, what Churvox checked and what is ready to approve."],
    ["One connected record", "Requests, quotes, jobs, proof, invoices and client history stay joined together."],
    ["One quiet office", "Specialist desks prepare admin and Churvox Guard catches forgotten promises and missing proof."],
  ];
  return (
    <>
      <section className="cvnextHero">
        <div className="cvnextHeroCopy">
          <Eyebrow>Built for owners who are tired of carrying the office</Eyebrow>
          <h1>Your field team does the work. <span>Churvox runs the admin behind it.</span></h1>
          <p>Requests become organised jobs. Field updates become complete records. Completed work becomes an invoice draft. You open one approval desk and decide what matters.</p>
          <HeroActions secondary="Open the working-day demo" />
          <div className="cvnextTrustRail"><span>No card upfront</span><span>Nothing important auto-sends</span><span>Owner approval stays in control</span></div>
        </div>
        <OfficeFloor />
      </section>

      <section className="cvnextSection">
        <header className="cvnextSectionHead"><Eyebrow>The product in plain English</Eyebrow><h2>Less software to manage. More of the business already prepared.</h2><p>Churvox is organised around the questions an owner actually asks, not a pile of modules competing for attention.</p></header>
        <div className="cvnextOutcomeGrid">
          {outcomes.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="cvnextSection dark">
        <header className="cvnextSectionHead"><Eyebrow>A complete operating loop</Eyebrow><h2>From the first request to verified payment.</h2></header>
        <div className="cvnextFlow">
          {["Customer asks", "Reception prepares", "Owner approves", "Worker completes", "Quality checks", "Invoice prepared", "Payment verified"].map((label, index) => (
            <article key={label}><b>{String(index + 1).padStart(2, "0")}</b><strong>{label}</strong><span>{index === 0 ? "Email, form or portal" : index === 1 ? "Client, scope and next step" : index === 2 ? "Price, timing or message" : index === 3 ? "Time, notes and proof" : index === 4 ? "Checklist and missing evidence" : index === 5 ? "Scope, extras and totals" : "Signed payment evidence"}</span></article>
          ))}
        </div>
      </section>

      <section className="cvnextSection split">
        <div>
          <Eyebrow>Designed for the real first win</Eyebrow>
          <h2>Do one proper job before setting up everything.</h2>
          <p>New owners should reach a complete client → job → proof → invoice flow quickly. Imports, settings and integrations can follow when the product has already proved useful.</p>
          <HeroActions secondary="See the product" />
        </div>
        <div className="cvnextStepStack">
          {["Add one real client and property", "Create their next job", "Assign the worker and instructions", "Complete it with proof", "Approve the prepared invoice"].map((item, index) => <article key={item}><b>{index + 1}</b><span>{item}</span><CheckCircle2 size={19} /></article>)}
        </div>
      </section>
    </>
  );
}

function ProductPage() {
  return (
    <>
      <section className="cvnextPageHero">
        <div><Eyebrow>Churvox Office OS</Eyebrow><h1>A field-service operating system with an office working behind it.</h1><p>The owner app stays simple because Reception, Scheduling, Job Control, Quality, Money and Churvox Guard do the checking underneath.</p><HeroActions secondary="Run the demo" /></div>
        <div className="cvnextHeroPanel"><Sparkles size={28} /><strong>Prepared, not automatic</strong><p>Churvox can prepare messages, records, schedules and money work. Authority remains with the owner.</p></div>
      </section>
      <section className="cvnextSection">
        <header className="cvnextSectionHead"><Eyebrow>The office behind the screen</Eyebrow><h2>Specialist desks with one shared business record.</h2></header>
        <div className="cvnextDeskGrid">
          {OFFICE_DESKS.map(([name, text], index) => { const Icon = ICONS[index % ICONS.length]; return <article key={name}><Icon size={23} /><h3>{name}</h3><p>{text}</p><span>{index === OFFICE_DESKS.length - 1 ? "Always watching" : "Feeds Command when needed"}</span></article>; })}
        </div>
      </section>
      <section className="cvnextSection dark">
        <header className="cvnextSectionHead"><Eyebrow>What the owner sees</Eyebrow><h2>Nine areas. Each has one job.</h2></header>
        <div className="cvnextAreaList">
          {[
            ["Today", "Briefing"], ["Command", "Approvals"], ["Work", "Schedule and jobs"], ["Clients", "Relationship memory"], ["Money", "Quotes, invoices and margin"], ["Messages", "Connected conversations"], ["Team", "People and access"], ["Reports", "Business truth"], ["Settings", "Rules and integrations"],
          ].map(([name, purpose], index) => <article key={name}><b>{String(index + 1).padStart(2, "0")}</b><strong>{name}</strong><span>{purpose}</span></article>)}
        </div>
      </section>
      <section className="cvnextSection">
        <header className="cvnextSectionHead"><Eyebrow>The field experience</Eyebrow><h2>Workers get a job tool—not the owner’s office.</h2><p>Today → current job → instructions → start → proof → issue → finish. Large controls, offline safety and no owner-only financial noise.</p></header>
        <div className="cvnextDeviceRow">
          <div className="cvnextPhone"><small>Worker · Today</small><h3>Harbour View Apartments</h3><p>Grounds maintenance · 8:00am</p><button>Open job</button><span>3 steps · instructions downloaded</span></div>
          <div className="cvnextProofCard"><ClipboardCheck size={28} /><h3>Proof-to-invoice</h3><ul><li>Scope and agreed price</li><li>Actual time and materials</li><li>Photos and checklist</li><li>Extras and worker notes</li><li>Customer sign-off</li></ul><strong>Invoice draft prepared for owner review</strong></div>
        </div>
      </section>
    </>
  );
}

function PricingPage() {
  return (
    <>
      <section className="cvnextPageHero">
        <div><Eyebrow>Locked Churvox pricing</Eyebrow><h1>Choose the level of office help the business needs today.</h1><p>Every plan starts with a 14-day free trial and no card upfront. The prices below remain unchanged.</p></div>
        <div className="cvnextHeroPanel"><CreditCard size={28} /><strong>NZD pricing</strong><p>GST is shown separately. Country-ready pricing will remain driven by one trusted plan source.</p></div>
      </section>
      <section className="cvnextSection">
        <div className="cvnextPlanGrid">
          {PLANS.map((plan) => <article key={plan.name} className={plan.featured ? "featured" : ""}>{plan.featured ? <span className="cvnextBadge">Most popular</span> : null}<h3>{plan.name}</h3><div className="cvnextPrice">{plan.price}<small>{plan.suffix}</small></div><p>{plan.fit}</p><ul>{plan.features.map((feature) => <li key={feature}><Check size={17} />{feature}</li>)}</ul><Link className="cvnextButton" to={previewHref("signup")}>Start free trial</Link></article>)}
        </div>
      </section>
      <section className="cvnextSection dark split">
        <div><Eyebrow>Add-on</Eyebrow><h2>Command Growth Pack</h2><p>Extra active-team capacity and additional Command headroom for larger operations.</p></div>
        <div className="cvnextAddon"><strong>$99</strong><span>/month + GST</span><p>Command already includes 50 active team members. Inactive or old staff do not count as active.</p></div>
      </section>
    </>
  );
}

function IndustriesPage() {
  return (
    <>
      <section className="cvnextPageHero"><div><Eyebrow>One strong operating model</Eyebrow><h1>Built for service businesses that organise people, places, work and money.</h1><p>Churvox changes the words, playbooks and proof rules—not the promise that the office prepares and the owner approves.</p></div><div className="cvnextHeroPanel"><BriefcaseBusiness size={28} /><strong>Multi-trade by design</strong><p>Each business chooses its terms, job types, proof, recurrence and customer flow.</p></div></section>
      <section className="cvnextSection"><div className="cvnextIndustryGrid">{INDUSTRIES.map(([name, text]) => <article key={name}><h3>{name}</h3><p>{text}</p><span>Industry playbook</span></article>)}</div></section>
      <section className="cvnextClosing"><div><Eyebrow>Do not see your trade?</Eyebrow><h2>The operating loop matters more than the label.</h2><p>Email the real workflow and Churvox can map the correct client, job, worker, proof and money rules.</p></div><a className="cvnextButton" href="mailto:hello@churvox.com">Email Churvox</a></section>
    </>
  );
}

function DemoPage() {
  const steps = [
    ["Request arrives", "Harbour Property Services receives a new grounds-maintenance request."],
    ["Reception prepares", "Client, property, scope and a cautious quote draft are assembled."],
    ["Owner approves", "The owner reviews price and timing in Command."],
    ["Scheduling prepares", "Worker skill, travel, duration and recurrence are checked."],
    ["Worker completes", "Time, checklist, photos and an extra-work note are saved."],
    ["Quality checks", "The missing after-photo is caught before the job is cleared."],
    ["Money prepares", "The agreed scope and approved extra become an invoice draft."],
    ["Payment verifies", "Only signed payment evidence changes the invoice to paid."],
  ];
  return (
    <>
      <section className="cvnextPageHero"><div><Eyebrow>Two-minute product story</Eyebrow><h1>Watch one job travel through the whole Churvox office.</h1><p>Every record below is invented sample data. The point is the connected workflow, not a polished fake dashboard.</p></div><div className="cvnextHeroPanel"><ShieldCheck size={28} /><strong>Safe demo</strong><p>Nothing sends, syncs, charges, pays or changes records from this preview.</p></div></section>
      <section className="cvnextSection"><div className="cvnextDemoTimeline">{steps.map(([title, text], index) => <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><div><h3>{title}</h3><p>{text}</p></div><span>{index === 2 || index === 6 ? "Owner decision" : "Office work"}</span></article>)}</div></section>
      <section className="cvnextClosing"><div><Eyebrow>Ready for a real first win?</Eyebrow><h2>Run one real client and one real job through the same loop.</h2></div><Link className="cvnextButton" to={previewHref("signup")}>Start 14-day trial</Link></section>
    </>
  );
}

function TrustPage() {
  const protections = [
    ["Owner authority", "Important messages, financial actions, accounting handoffs and destructive changes require clear authority."],
    ["Business isolation", "Every client, worker, job, quote, invoice, file and audit record is scoped to the correct business."],
    ["Execution safety", "Approved actions run once, use idempotency keys and return failures to Command instead of guessing."],
    ["Audit history", "The source record, preparation, owner decision, execution result and actor remain traceable."],
    ["Data ownership", "Businesses can export records, request deletion and understand retention and backup controls."],
    ["AI boundaries", "AI can prepare and explain. Deterministic services control identity, permission, money and record truth."],
  ];
  return (
    <>
      <section className="cvnextPageHero"><div><Eyebrow>Trust is an operating feature</Eyebrow><h1>Helpful automation without silent authority.</h1><p>Churvox is designed to reduce owner effort without hiding actions, inventing certainty or making irreversible decisions by itself.</p></div><div className="cvnextHeroPanel"><LockKeyhole size={28} /><strong>Fail closed</strong><p>If authority, source data or execution state cannot be verified, Churvox stops and explains the issue.</p></div></section>
      <section className="cvnextSection"><div className="cvnextTrustGrid">{protections.map(([title, text]) => <article key={title}><ShieldCheck size={22} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="cvnextSection dark"><header className="cvnextSectionHead"><Eyebrow>Release discipline</Eyebrow><h2>The replacement does not go live because it looks finished.</h2></header><div className="cvnextGateList">{WHOLE_SITE_RELEASE_GATES.map((gate) => <article key={gate}><CheckCircle2 size={20} /><span>{gate}</span></article>)}</div></section>
    </>
  );
}

function SupportPage() {
  const cards = [
    ["Getting started", "Business setup, first client, first job and first approved invoice."],
    ["Migration", "CSV preview, duplicate checks, blocked rows, counts and rollback support."],
    ["Workers", "Invites, mobile setup, field flow, proof, offline sync and messages."],
    ["Billing", "Plans, trial status, subscription questions, cancellations and refunds."],
    ["Integrations", "Xero connection, approved sync, exports and troubleshooting."],
    ["Something is wrong", "Account access, failed actions, missing records or urgent product issues."],
  ];
  return <><section className="cvnextPageHero"><div><Eyebrow>Email-first support</Eyebrow><h1>Clear help without forcing owners onto a phone call.</h1><p>Support should understand the business record, explain the next step and never make account or money changes without proper control.</p></div><div className="cvnextHeroPanel"><Mail size={28} /><strong>hello@churvox.com</strong><p>Include the business name, affected record and what you expected to happen.</p></div></section><section className="cvnextSection"><div className="cvnextSupportGrid">{cards.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p><a href={`mailto:hello@churvox.com?subject=${encodeURIComponent(`Churvox help — ${title}`)}`}>Email support <ArrowRight size={16} /></a></article>)}</div></section></>;
}

function ContactPage() {
  return <><section className="cvnextPageHero"><div><Eyebrow>Talk to Churvox</Eyebrow><h1>Tell us what the office work is costing you.</h1><p>No sales call is required. Send the number of workers, the type of work and the admin task that keeps falling back on the owner.</p></div><div className="cvnextHeroPanel"><MessageSquareText size={28} /><strong>Email only is fine</strong><p>hello@churvox.com</p></div></section><section className="cvnextSection"><form className="cvnextContactForm" onSubmit={(event) => event.preventDefault()}><label><span>Name</span><input placeholder="Your name" /></label><label><span>Email</span><input type="email" placeholder="you@business.co.nz" /></label><label><span>Business</span><input placeholder="Business name" /></label><label><span>Team size</span><input placeholder="Solo, 3 people, 20 people…" /></label><label className="wide"><span>What admin is wearing you down?</span><textarea rows="5" placeholder="Describe the real workflow or problem" /></label><button type="submit" className="cvnextButton">Preview only — no message sent</button><p>This private rebuild form performs no action.</p></form></section></>;
}

function AuthPage({ mode }) {
  const signup = mode === "signup";
  return <section className="cvnextAuth"><div className="cvnextAuthStory"><ChurvoxLogo variant="mark" size="xl" /><Eyebrow>{signup ? "Start with one real job" : "Welcome back"}</Eyebrow><h1>{signup ? "Create the business office behind your field team." : "Open your Churvox office."}</h1><p>{signup ? "14-day trial. No card upfront. Pricing and permissions confirmed before access changes." : "Owners, workers and Churvox HQ enter through separate role-safe paths."}</p><ul><li><CheckCircle2 size={18} />Email verification</li><li><CheckCircle2 size={18} />Secure session</li><li><CheckCircle2 size={18} />Correct role destination</li></ul></div><form className="cvnextAuthForm" onSubmit={(event) => event.preventDefault()}><h2>{signup ? "Start free trial" : "Log in"}</h2>{signup ? <><label><span>Your name</span><input /></label><label><span>Business name</span><input /></label></> : null}<label><span>Email</span><input type="email" /></label><label><span>Password</span><input type="password" /></label>{signup ? <label><span>Starting plan</span><select defaultValue="operator"><option value="start">Start</option><option value="crew">Crew</option><option value="operator">Operator</option><option value="command">Command</option></select></label> : null}<button className="cvnextButton" type="submit">Preview only</button><small>No account is created from the private design preview.</small></form></section>;
}

function CustomerPage({ type }) {
  const meta = CUSTOMER_PAGES.find(([key]) => key === type) || CUSTOMER_PAGES[0];
  return <section className="cvnextCustomerShell"><div className="cvnextCustomerBrand"><ChurvoxLogo variant="mark" size="md" /><span><strong>Harbour Property Services</strong><small>Secure customer page · sample data</small></span></div><article className="cvnextCustomerCard"><Eyebrow>{meta[1]}</Eyebrow><h1>{type === "request" ? "What work do you need help with?" : type === "quote" ? "Grounds maintenance quote" : type === "invoice" ? "Invoice INV-1042" : type === "proof" ? "Job completion proof" : "Your service portal"}</h1><p>{meta[2]}</p>{type === "request" ? <div className="cvnextCustomerForm"><input placeholder="Service address" /><textarea placeholder="Describe the work" /><button>Preview request</button></div> : type === "quote" ? <div className="cvnextQuote"><div><span>Fortnightly grounds maintenance</span><strong>$190 + GST</strong></div><p>Includes mowing, edging, paths and green-waste removal.</p><button>Preview accept quote</button></div> : type === "invoice" ? <div className="cvnextQuote"><div><span>Completed grounds maintenance</span><strong>$218.50</strong></div><p>Status: Sent · Payment status only changes from verified evidence.</p><button>Preview secure payment</button></div> : type === "proof" ? <div className="cvnextProofGrid"><span>Before photo</span><span>After photo</span><span>Checklist complete</span><span>Worker note</span></div> : <div className="cvnextPortalRows"><span>Next visit · Friday 8:00am</span><span>Open quote · $340</span><span>Invoice · Paid</span><span>Request a change</span></div>}<small>Private preview. No request, acceptance, payment or record change occurs.</small></article><nav className="cvnextCustomerNav">{CUSTOMER_PAGES.map(([key, label]) => <Link key={key} className={key === type ? "active" : ""} to={previewHref(`customer-${key}`)}>{label}</Link>)}</nav></section>;
}

function PageBody({ page }) {
  if (page === "product") return <ProductPage />;
  if (page === "pricing") return <PricingPage />;
  if (page === "industries") return <IndustriesPage />;
  if (page === "demo") return <DemoPage />;
  if (page === "security") return <TrustPage />;
  if (page === "support") return <SupportPage />;
  if (page === "contact") return <ContactPage />;
  if (page === "login" || page === "signup") return <AuthPage mode={page} />;
  if (page.startsWith("customer-")) return <CustomerPage type={page.replace("customer-", "")} />;
  return <HomePage />;
}

export default function PublicSiteNext() {
  const location = useLocation();
  const page = readPage(location.search);
  const isCustomer = page.startsWith("customer-");
  return (
    <main className="cvnext" data-version="CHURVOX_WHOLE_PUBLIC_REBUILD_20260721">
      <SurfaceBar />
      {!isCustomer ? <Header page={page} /> : null}
      <PageBody page={page} />
      {!isCustomer ? <Footer /> : null}
    </main>
  );
}
