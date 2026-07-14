import React from "react";
import { Link } from "react-router-dom";
import { PublicFooter, PublicNav } from "../marketing/ChurvoxPublicShell";

const UPDATED = "12 July 2026";
const CONTACT = "hello@churvox.com";
const LINK_CLASS = "inline-flex min-h-7 items-center px-1 font-black text-orange-700";

function Section({ title, id, children }) {
  return <section id={id} className="scroll-mt-24 border-t border-slate-200 pt-6"><h2 className="mb-3 text-xl font-black text-slate-950">{title}</h2><div className="space-y-3">{children}</div></section>;
}

export default function TermsOfServicePage() {
  return (
    <main className="cp26Site" data-version="CHURVOX_TERMS_PAID_LAUNCH_20260712">
      <PublicNav />
      <section className="bg-[#f7f3ea] px-4 py-10 text-slate-950 md:py-16">
        <article className="mx-auto max-w-4xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.08)] md:p-10">
          <header className="mb-8">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-orange-800">Service terms</span>
            <h1 className="mt-4 text-4xl font-black tracking-[-.06em] md:text-6xl">Terms of Service</h1>
            <p className="mt-3 text-sm font-bold text-slate-600">Last updated: {UPDATED}</p>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-700">These terms govern access to the Churvox website, owner app, worker app, public customer links, subscriptions, trials and connected services. By creating an account or using Churvox, you agree to them.</p>
          </header>

          <div className="space-y-7 text-sm font-medium leading-7 text-slate-700">
            <Section title="1. The service">
              <p>Churvox provides job-management and business-admin tools for service businesses, including jobs, clients, workers, schedules, messages, quotes, invoices, proof, owner review and optional integrations.</p>
              <p>Features may be released, improved, restricted or retired as the service develops. We will not deliberately change the published base price of an active plan without communicating the change before it takes effect.</p>
            </Section>

            <Section title="2. Accounts and authority">
              <p>You must provide accurate account information, protect login credentials and promptly remove access for people who should no longer use the business workspace. The person creating or administering a business account confirms they have authority to act for that business.</p>
              <p>You are responsible for invited office, worker, payroll and subcontractor users and for assigning the correct role. Users must not share accounts or attempt to access another business’s records.</p>
            </Section>

            <Section title="3. Business and customer data">
              <p>You retain responsibility for client details, worker information, jobs, messages, quotes, invoices, photos, notes and other content entered into Churvox. You confirm you have a lawful basis and permission to collect, use and store that information.</p>
              <p>Public quote, invoice, proof and client-portal links act like secure bearer links. You must send them only to the intended recipient and tell Churvox promptly if a link is shared incorrectly.</p>
            </Section>

            <Section title="4. Prepared admin and owner approval">
              <p>Churvox may organise records, identify missing information and prepare drafts or suggested actions. Churvox does not replace the owner’s judgement. The authorised business remains responsible for checking dates, amounts, tax treatment, client details, worker time, compliance and the final action.</p>
              <p>Important external sends, customer charges, accounting changes, tax filing, record changes and payouts are not intended to happen without deliberate authorised approval. A prepared draft is not evidence that an action was sent, filed, paid or completed.</p>
            </Section>

            <Section title="5. Quotes, invoices and customer actions">
              <p>Quotes and invoices are issued by the business using Churvox, not by Churvox as a party to the underlying work. The business is responsible for scope, pricing, tax, payment terms, refunds and resolving disputes with its customer.</p>
              <p>A customer accepting a public quote records approval to proceed but does not automatically take payment. A customer approving completed work records that response but does not automatically create or pay an invoice.</p>
            </Section>

            <Section id="billing-cancellations" title="6. Plans, trials, cancellations and subscriptions">
              <p>Current plan prices, included features, trial length, currency and applicable tax are shown on the pricing and checkout screens. A trial begins only when the required checkout is completed. Stripe handles subscription checkout and card details.</p>
              <p>Unless cancelled, a subscription may renew at the end of the trial or billing period at the price shown for the selected plan. Keep billing details current. Failed payment, misuse or an inactive subscription may restrict access.</p>
              <p>You can cancel future renewal through the available billing controls or by contacting <a className={LINK_CLASS} href={`mailto:${CONTACT}?subject=Churvox%20billing%20or%20cancellation`}>{CONTACT}</a>. Cancellation does not automatically create a refund for a completed billing period. Refund requests are assessed against applicable law, the checkout information and the circumstances of the request. Any mandatory consumer rights remain unaffected.</p>
            </Section>

            <Section title="7. Testers and free access">
              <p>Tester access may be time-limited, changed or revoked. Testers are expected to use real but appropriate business workflows, protect client information and provide honest feedback. Tester access is not a paid subscription and is not counted as paid recurring revenue.</p>
            </Section>

            <Section title="8. Workers, time and payroll review">
              <p>Businesses are responsible for employment, contractor, wage, break, leave, tax and record-keeping obligations. Churvox time and payroll-review tools assist with records but do not submit payroll to government agencies, file tax or create bank payout files.</p>
              <p>Workers must only access assigned work and must not enter false time, proof, location or completion information.</p>
            </Section>

            <Section title="9. Accounting and integrations">
              <p>Accounting integrations are optional and may depend on the connected provider. Churvox prepares or syncs records according to the authorised workflow, but the business remains responsible for checking invoices, tax codes, payments and accounting records.</p>
              <p>Churvox does not provide legal, tax or accounting advice and does not file tax returns. A failed external integration should not be treated as proof that the underlying Churvox invoice or record failed.</p>
            </Section>

            <Section title="10. Acceptable use">
              <p>You must not use Churvox unlawfully, impersonate another person, send spam, upload malicious code, probe security, bypass access controls, scrape private records, abuse public links, interfere with the service or use the platform to exploit workers or customers.</p>
            </Section>

            <Section title="11. Third-party services">
              <p>Churvox relies on third-party hosting, database, email, payment, analytics and integration providers. Their availability and terms may affect parts of the service. Churvox is not responsible for a third-party service outside our reasonable control, but we will take reasonable steps to restore or provide a safe fallback where practical.</p>
            </Section>

            <Section title="12. Availability, backups and changes">
              <p>We aim to keep Churvox available and protect business records, but uninterrupted or error-free operation is not guaranteed. Maintenance, incidents, provider failures and security work may temporarily affect access.</p>
              <p>Businesses should keep exports or copies of records they are legally required to retain and should not rely on Churvox as the only copy of critical legal, tax or safety documents.</p>
            </Section>

            <Section title="13. Suspension and termination">
              <p>We may suspend or restrict access for non-payment, security risk, misuse, unlawful activity, material breach or where necessary to protect Churvox, users or third parties. Where reasonable, we will give notice and an opportunity to fix the issue.</p>
              <p>You may stop using Churvox or request account deletion. Some records may remain where required for billing, disputes, fraud prevention, tax, security or law.</p>
            </Section>

            <Section title="14. Liability">
              <p>To the maximum extent permitted by law, Churvox is not liable for indirect or consequential loss, lost profit, loss caused by incorrect business data, unauthorised user actions, third-party outages or decisions made without checking the underlying record.</p>
              <p>Nothing in these terms excludes liability or rights that cannot legally be excluded. Where Churvox is used for business purposes, any permitted contracting-out or limitation applies only to the extent allowed by law.</p>
            </Section>

            <Section title="15. Intellectual property">
              <p>Churvox and its product design, software, branding and documentation remain owned by Churvox or its licensors. You retain ownership of business content you enter and grant Churvox the limited permission needed to host, process, display and transmit that content to provide the service.</p>
            </Section>

            <Section title="16. Privacy, changes and governing law">
              <p>Use of personal information is explained in the <Link className={LINK_CLASS} to="/legal/privacy">Privacy Policy</Link>. We may update these terms and will date material changes on this page.</p>
              <p>These terms are governed by New Zealand law, subject to any mandatory rights or jurisdiction that applies to you. Questions can be sent to <a className={LINK_CLASS} href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
            </Section>
          </div>
        </article>
      </section>
      <PublicFooter />
    </main>
  );
}
