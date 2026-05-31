import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./ExecutiveHomePage.css";
import "./ExecutiveMarketingPolish.css";
import "./ExecutivePricingPagePolish.css";

// CHURVOX_PRICING_OVERHAUL_20260601
// Public pricing aligned with Command Floor / AI Operator positioning.
// Customer-facing names: Start, Crew, Operator, Command.
// Migration aliases (solo/team/pro/enterprise) are kept internal-only in backend plan_rules.

const plans = [
  {
    key: "start",
    name: "Start",
    price: "$39",
    tag: "Owner-operator",
    audience: "Solo trade owner who wants admin clean from day one.",
    summary: "Core job, client and invoice control. No more chasing details across notebooks, texts and email.",
    cta: "Start free trial",
    features: [
      "Jobs, clients, quotes and invoices",
      "Command Floor — your daily owner view",
      "Work Slips for owner review and approval",
      "Public quote and invoice links",
      "GST-ready NZ/AU invoice format",
    ],
  },
  {
    key: "crew",
    name: "Crew",
    price: "$89",
    tag: "Small team",
    audience: "Growing crew who needs worker assignment and job proof in one flow.",
    summary: "Bring your workers into Churvox. See who's on what, get proof back, and turn finished work into invoices.",
    cta: "Start free trial",
    features: [
      "Everything in Start",
      "Worker mobile app and assignment lane",
      "Job photos, notes and time proof",
      "Dispatch view by day or worker",
      "More job and client capacity",
    ],
  },
  {
    key: "operator",
    name: "Operator",
    price: "$149",
    tag: "Most popular",
    audience: "Owners who want Churvox to prepare the admin so they only approve what matters.",
    summary: "AI Operator prepares draft invoices, customer messages, dispatch suggestions and overdue reminders. Owner approves.",
    cta: "Start Operator trial",
    features: [
      "Everything in Crew",
      "AI Operator real actions (approve-first)",
      "Draft invoices auto-prepared from completed jobs",
      "Quote and overdue follow-up drafts",
      "Automation rules with owner approval",
      "MYOB add-on available (+$39/mo)",
    ],
    featured: true,
  },
  {
    key: "command",
    name: "Command",
    price: "$299",
    tag: "Full command",
    audience: "Established operators with multiple crews who need accounting sync and payroll workspace.",
    summary: "The full Churvox setup. MYOB sync included, payroll workspace, advanced roles, and team capacity built for scale.",
    cta: "Start Command trial",
    features: [
      "Everything in Operator",
      "MYOB sync included (no add-on cost)",
      "Payroll workspace and crew summaries",
      "Advanced roles and permissions",
      "Up to 50 active team members",
      "Priority support and onboarding",
    ],
    serious: true,
  },
];

const addons = [
  {
    name: "Command Growth Pack",
    price: "$99/month + GST",
    detail: "Adds 50 more active team members plus extra job, AI Operator and automation capacity. Stack as many as you need.",
    eligible: "Command only",
  },
  {
    name: "MYOB add-on",
    price: "$39/month + GST",
    detail: "Connect Churvox invoices to MYOB. Optional on Operator. Included by default on Command.",
    eligible: "Operator (optional) · Command (included)",
  },
];

const smsBlocks = [
  { credits: "100", price: "$10", note: "Light reminders and small follow-up runs." },
  { credits: "500", price: "$45", note: "Best for active crews using reminders regularly." },
  { credits: "1,000", price: "$80", note: "Lowest cost per credit for busy operators." },
];

// Comparison matrix — rows × plans
const compareRows = [
  ["Core", true],
  ["Jobs, clients, quotes, invoices", "✓", "✓", "✓", "✓"],
  ["Command Floor (owner view)", "✓", "✓", "✓", "✓"],
  ["Public quote / invoice links", "✓", "✓", "✓", "✓"],
  ["Crew & dispatch", true],
  ["Worker mobile app", "—", "✓", "✓", "✓"],
  ["Job photo & time proof", "—", "✓", "✓", "✓"],
  ["Dispatch board", "—", "✓", "✓", "✓"],
  ["AI Operator", true],
  ["AI Operator real actions", "—", "—", "✓", "✓"],
  ["Auto-draft invoices from jobs", "—", "—", "✓", "✓"],
  ["Quote & overdue follow-up drafts", "—", "—", "✓", "✓"],
  ["Automation rules", "—", "—", "✓", "✓"],
  ["Accounting & scale", true],
  ["MYOB sync", "—", "—", "Add-on", "Included"],
  ["Payroll workspace", "—", "—", "—", "✓"],
  ["Advanced roles & permissions", "—", "—", "—", "✓"],
  ["Active team members included", "1", "5", "15", "50"],
  ["Growth Pack eligible", "—", "—", "—", "✓"],
  ["Support", true],
  ["Email support", "✓", "✓", "✓", "✓"],
  ["Priority support & onboarding", "—", "—", "—", "✓"],
];

const faqs = [
  {
    q: "Do I need a credit card to start a trial?",
    a: "No. Start a 14-day trial of any plan with just an email. You can choose to subscribe before the trial ends.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrade or downgrade from your /plans page. Annual prepayments are pro-rated.",
  },
  {
    q: "How does the MYOB add-on work?",
    a: "On Operator, MYOB is an optional $39/month + GST add-on. On Command, MYOB sync is included by default — no extra charge.",
  },
  {
    q: "What about GST?",
    a: "All prices are shown ex-GST. Churvox invoices and quotes generate with GST inclusive/exclusive totals using your business GST rate.",
  },
  {
    q: "How is SMS billed?",
    a: "SMS is separate from your plan. Buy credit blocks ($10 / 100, $45 / 500, $80 / 1,000). Credits don't expire while your account is active.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from /plans and your subscription stops at the end of the current billing period. Your data stays accessible.",
  },
  {
    q: "Will the AI send messages to my customers without me?",
    a: "No. Every customer-facing action — invoices, messages, follow-ups — is drafted by the AI Operator and waits for the owner to approve, edit or reject.",
  },
  {
    q: "Is my business data safe?",
    a: "Yes. Each business is isolated by business_id; no business can access another business's records. Logins are JWT-protected; passwords are bcrypt-hashed.",
  },
];

function CompareCell({ value }) {
  if (value === "✓") return <span className="cv-cmp-yes" aria-label="included">✓</span>;
  if (value === "—") return <span className="cv-cmp-no" aria-label="not included">—</span>;
  return <span className="cv-cmp-text">{value}</span>;
}

export default function ExecutivePricingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="cvx-home cvx-public-page cvx-pricing-page" data-version="CHURVOX_PRICING_OVERHAUL_20260601">
      <Nav />

      <section className="cvx-public-hero">
        <p className="cvx-eyebrow">PRICING BUILT AROUND AI OPERATOR ACTIONS</p>
        <h1>Churvox does the admin. You approve.</h1>
        <span>
          Work comes in → Churvox organises it → crew do the job → proof comes back → AI prepares admin → owner approves → invoice goes out → money gets tracked. Pick the level of help you want.
        </span>
        <div className="cvx-hero-ctas">
          <Link to="/signup" className="cvx-btn cvx-btn-primary">Start free trial</Link>
          <Link to="/features" className="cvx-btn cvx-btn-secondary">See how it works</Link>
        </div>
        <p className="cvx-hero-microcopy">14-day trial · No credit card required · Cancel anytime</p>
      </section>

      <section className="cvx-plan-grid cvx-plan-grid-v2">
        {plans.map((plan) => (
          <article
            key={plan.key}
            className={`${plan.featured ? "is-featured" : ""} ${plan.serious ? "is-serious" : ""}`.trim()}
          >
            {plan.featured && <div className="cvx-plan-badge">Most popular</div>}
            {plan.serious && <div className="cvx-plan-badge cvx-plan-badge-serious">Full command</div>}
            <small>{plan.tag}</small>
            <h2>{plan.name}</h2>
            <strong>{plan.price}<em>/month + GST</em></strong>
            <p className="cvx-plan-audience"><b>For:</b> {plan.audience}</p>
            <p className="cvx-plan-summary">{plan.summary}</p>
            <ul>
              {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
            </ul>
            <Link
              to="/signup"
              className={plan.featured ? "cvx-btn cvx-btn-primary" : (plan.serious ? "cvx-btn cvx-btn-serious" : "cvx-btn cvx-btn-secondary")}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="cvx-compare-section">
        <div className="cvx-compare-head">
          <p className="cvx-eyebrow">PLAN COMPARISON</p>
          <h2>What's actually included.</h2>
          <span>No fine-print surprises — every plan boundary, in one table.</span>
        </div>
        <div className="cvx-compare-table-wrap">
          <table className="cvx-compare-table">
            <thead>
              <tr>
                <th aria-label="Feature" />
                <th>Start<br /><small>$39/mo</small></th>
                <th>Crew<br /><small>$89/mo</small></th>
                <th className="is-featured">Operator<br /><small>$149/mo</small></th>
                <th className="is-serious">Command<br /><small>$299/mo</small></th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, idx) => {
                if (row.length === 2 && row[1] === true) {
                  return (
                    <tr key={`group-${idx}`} className="cv-cmp-group">
                      <th colSpan={5}>{row[0]}</th>
                    </tr>
                  );
                }
                const [label, ...vals] = row;
                return (
                  <tr key={`row-${idx}`}>
                    <th scope="row">{label}</th>
                    {vals.map((v, i) => <td key={i} className={i === 2 ? "is-featured" : i === 3 ? "is-serious" : ""}><CompareCell value={v} /></td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cvx-split cvx-pricing-story">
        <div>
          <p className="cvx-eyebrow">WHAT YOU APPROVE</p>
          <h2>Every owner-facing action is approval-first.</h2>
          <span>
            Churvox prepares. The owner approves. Nothing goes to a customer, no money moves, no payroll changes — without you saying yes.
          </span>
        </div>
        <div className="cvx-feature-list">
          <article><b>Approve work</b><span>Finished jobs, photos and worker notes ready in one Work Slip.</span></article>
          <article><b>Approve invoices</b><span>Drafts auto-prepared from approved work, not typed from scratch.</span></article>
          <article><b>Assign workers</b><span>Unassigned jobs become clear dispatch decisions with AI suggestions.</span></article>
          <article><b>Review messages</b><span>Customer updates are drafted first, owner-approved before sending.</span></article>
        </div>
      </section>

      <section className="cvx-addon-section">
        <div>
          <p className="cvx-eyebrow">ADD-ONS</p>
          <h2>Scale without changing systems.</h2>
          <span>Command includes the bigger operating setup. Operator can add MYOB when ready. SMS stays as credit blocks so you only buy what you use.</span>
        </div>
        <div className="cvx-addon-grid">
          {addons.map((addon) => (
            <article key={addon.name}>
              <small>{addon.eligible}</small>
              <h3>{addon.name}</h3>
              <b>{addon.price}</b>
              <span>{addon.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-addon-section cvx-sms-blocks">
        <div>
          <p className="cvx-eyebrow">SMS CREDIT BLOCKS</p>
          <h2>SMS is separate, simple and approval-first.</h2>
          <span>Use SMS credits for customer reminders, job updates and payment follow-ups. Every message is drafted for owner approval before sending.</span>
        </div>
        <div className="cvx-addon-grid">
          {smsBlocks.map((pack) => (
            <article key={pack.credits}>
              <small>{pack.credits} SMS credits</small>
              <b>{pack.price} + GST</b>
              <span>{pack.note}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-faq-section">
        <div className="cvx-faq-head">
          <p className="cvx-eyebrow">FAQ</p>
          <h2>The questions you'd ask before signing up.</h2>
        </div>
        <div className="cvx-faq-list">
          {faqs.map((faq, idx) => (
            <article key={faq.q} className={openFaq === idx ? "is-open" : ""}>
              <button type="button" onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)} aria-expanded={openFaq === idx}>
                <span>{faq.q}</span>
                <i aria-hidden>{openFaq === idx ? "−" : "+"}</i>
              </button>
              {openFaq === idx && <p>{faq.a}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="cvx-trust-strip">
        <div><b>NZ & AU built</b><span>Designed for trade owners on both sides of the Tasman.</span></div>
        <div><b>Owner-approve guardrails</b><span>AI Operator can prepare, not perform without owner approval.</span></div>
        <div><b>Business data isolation</b><span>Every business's records are scoped and private.</span></div>
        <div><b>GST-ready</b><span>Quotes and invoices with GST inclusive/exclusive built-in.</span></div>
      </section>

      <section className="cvx-cta-final">
        <h2>Ready to let Churvox prepare the admin?</h2>
        <p>14-day free trial of any plan. No credit card. Cancel anytime.</p>
        <div className="cvx-hero-ctas">
          <Link to="/signup" className="cvx-btn cvx-btn-primary">Start free trial</Link>
          <Link to="/login" className="cvx-btn cvx-btn-secondary">Sign in</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
