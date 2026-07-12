import React from "react";
import { Link } from "react-router-dom";
import { PublicNav, PublicFooter, Eyebrow, SectionHeading } from "./ChurvoxPublicShell";

const SUPPORT_EMAIL = "hello@churvox.com";

function Page({ active, eyebrow, title, intro, panelTitle, panelText, children, closingTitle, closingText }) {
  return (
    <main className="cp26Site" data-version="CHURVOX_PUBLIC_TRUST_PAGES_20260712">
      <PublicNav active={active} />
      <section className="cp26PageHero">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className="cp26HeroActions">
            <a className="cp26Button" href={`mailto:${SUPPORT_EMAIL}`}>Email {SUPPORT_EMAIL}</a>
            <Link className="cp26Button cp26ButtonGhost" to="/pricing">View pricing</Link>
          </div>
        </div>
        <div className="cp26HeroPanel">
          <small>Churvox standard</small>
          <b>{panelTitle}</b>
          <span>{panelText}</span>
        </div>
      </section>
      {children}
      <section className="cp26Closing">
        <div>
          <Eyebrow light>Clear before checkout</Eyebrow>
          <h2>{closingTitle}</h2>
          <p>{closingText}</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to="/signup?plan=operator">Start free trial</Link>
          <Link className="cp26Button cp26ButtonGhost" to="/contact">Contact Churvox</Link>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

export function AboutPage() {
  return (
    <Page
      active="/about"
      eyebrow="About Churvox"
      title="Built to reduce the admin between finishing the work and running the business."
      intro="Churvox is job-management software for service businesses. Jobs, clients, workers, quotes and invoices stay connected, while Command gives the owner one place to review decisions and exceptions."
      panelTitle="The owner stays in control."
      panelText="Churvox prepares admin from the business record. External sends, accounting changes, charges and other important actions still require deliberate owner approval."
      closingTitle="See the workflow before creating an account."
      closingText="The public demo uses clearly labelled sample records and does not add anything to your account."
    >
      <section className="cp26Section">
        <SectionHeading eyebrow="Why it exists" title="Less double handling. Fewer scattered decisions." text="Service businesses should not need to rebuild the same facts across messages, spreadsheets, job notes and invoice drafts." />
        <div className="cp26AreaGrid">
          <article><b>Connected records</b><span>Client, job, worker, proof, quote and invoice information remains connected.</span></article>
          <article><b>Prepared admin</b><span>Routine next steps are prepared from real records instead of guessed or silently executed.</span></article>
          <article><b>Owner approval</b><span>Command keeps important decisions visible, editable and deliberate.</span></article>
          <article><b>Multi-trade wording</b><span>The system can use jobs, visits, appointments, workers, cleaners, stylists or technicians to match the business.</span></article>
        </div>
      </section>
    </Page>
  );
}

export function SecurityPage() {
  return (
    <Page
      active="/security"
      eyebrow="Security and control"
      title="Important actions stay deliberate, visible and attributable."
      intro="Churvox is designed around business isolation, authenticated access and owner approval. It does not need your card details stored inside Churvox, because subscription checkout is handled by Stripe."
      panelTitle="Nothing important should happen invisibly."
      panelText="External sends, charges, accounting syncs, record changes, tax filing and payouts are not treated as silent background actions."
      closingTitle="Have a security or privacy question?"
      closingText="Send the page, concern and expected behaviour to hello@churvox.com so it can be checked properly."
    >
      <section className="cp26Section">
        <SectionHeading eyebrow="Safeguards" title="Practical controls for a working service business." text="Security includes access control, data separation and safe product behaviour—not just a password screen." />
        <div className="cp26FeatureGrid">
          <article><b>Account access</b><span>Owner, office, payroll and worker experiences use authenticated routes and role-aware access.</span></article>
          <article><b>Business isolation</b><span>Business records are filtered by the authenticated business context.</span></article>
          <article><b>Stripe checkout</b><span>Stripe handles subscription checkout and card entry. Churvox receives checkout and subscription status rather than raw card details.</span></article>
          <article><b>Owner approval</b><span>Command is the approval desk for decisions that need the owner’s review.</span></article>
          <article><b>Accounting caution</b><span>Accounting work is prepared as drafts or owner-controlled sync actions. Churvox does not file tax.</span></article>
          <article><b>Payroll limits</b><span>Payroll review does not submit to government agencies or create bank payout files.</span></article>
        </div>
      </section>
    </Page>
  );
}

export function PublicSupportPage() {
  return (
    <Page
      active="/support"
      eyebrow="Churvox support"
      title="Get help without being forced through the app."
      intro="Use public support for signup, billing, tester access, login, password reset or a problem that stops you reaching the owner or worker app."
      panelTitle={SUPPORT_EMAIL}
      panelText="Include your business name, account email, page, what you clicked and what happened. Never email a password or full card details."
      closingTitle="Still deciding whether Churvox fits?"
      closingText="Open the demo and pricing first, then send the question that remains."
    >
      <section className="cp26Section">
        <SectionHeading eyebrow="Common help" title="Go straight to the right next step." text="These routes remain public so a locked-out or pre-signup customer can still get help." />
        <div className="cp26ContactGrid">
          <article><b>Login or password</b><span>Use password reset first. Contact support if the email does not arrive or the reset link fails.</span><Link to="/forgot-password">Reset password</Link></article>
          <article><b>Billing or cancellation</b><span>Check the cancellation terms and send the account email if billing status does not update after checkout.</span><Link to="/refunds-cancellations">Billing and cancellations</Link></article>
          <article><b>Tester access</b><span>Use the exact invited email. Include the invitation email address when asking for help.</span><a href={`mailto:${SUPPORT_EMAIL}?subject=Churvox%20tester%20access`}>Email tester support</a></article>
          <article><b>Technical problem</b><span>Include a screenshot, route and the result you expected. Remove private client information where possible.</span><a href={`mailto:${SUPPORT_EMAIL}?subject=Churvox%20technical%20issue`}>Report a problem</a></article>
        </div>
      </section>
    </Page>
  );
}

export function RefundsCancellationsPage() {
  return (
    <Page
      active="/refunds-cancellations"
      eyebrow="Billing and cancellations"
      title="Trial, cancellation and refund information in plain language."
      intro="Churvox plans begin with the trial shown at checkout. Subscription changes and cancellation requests should be made using the account email so the correct billing record can be identified."
      panelTitle="No card is required before signup."
      panelText="When a customer chooses to start the Stripe trial, Stripe securely collects the billing details required for the selected subscription."
      closingTitle="Need a billing record checked?"
      closingText="Email hello@churvox.com from the account email and include the business name and the plan involved."
    >
      <section className="cp26Section">
        <SectionHeading eyebrow="Billing policy" title="Know what happens before starting checkout." text="This page explains the operational process. Any mandatory rights under applicable consumer law remain unaffected." />
        <div className="cp26AreaGrid">
          <article><b>Trial</b><span>The selected plan’s trial length and price are shown before Stripe checkout is completed.</span></article>
          <article><b>Cancellation</b><span>Request cancellation before the next renewal date. Access may continue until the current paid period ends, depending on the Stripe subscription state.</span></article>
          <article><b>Refund review</b><span>Refund requests are reviewed against the billing record, timing, service access and applicable consumer law. A refund is not promised automatically.</span></article>
          <article><b>Checkout cancelled</b><span>Leaving Stripe before completion should not activate or change the selected plan.</span></article>
          <article><b>Incorrect charge</b><span>Contact Churvox promptly from the account email with the date, amount and business name. Do not send full card details.</span></article>
          <article><b>Plan changes</b><span>Plan and add-on changes remain visible and should not silently alter the published base plan price.</span></article>
        </div>
      </section>
    </Page>
  );
}
