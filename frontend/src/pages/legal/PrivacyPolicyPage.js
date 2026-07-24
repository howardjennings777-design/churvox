import React from "react";
import { Link } from "react-router-dom";
import { PublicFooter, PublicNav } from "../marketing/ChurvoxPublicShell";

const UPDATED = "12 July 2026";
const CONTACT = "hello@churvox.com";
const LINK_CLASS = "inline-flex min-h-7 items-center px-1 font-black text-orange-700";

function Section({ title, children }) {
  return <section className="border-t border-slate-200 pt-6"><h2 className="mb-3 text-xl font-black text-slate-950">{title}</h2><div className="space-y-3">{children}</div></section>;
}

export default function PrivacyPolicyPage() {
  return (
    <main className="cp26Site cp26LegalWorld" data-version="CHURVOX_PRIVACY_PAID_LAUNCH_20260712">
      <PublicNav />
      <section className="bg-[#f7f3ea] px-4 py-10 text-slate-950 md:py-16">
        <article className="mx-auto max-w-4xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,.08)] md:p-10">
          <header className="mb-8">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-orange-800">Privacy and data</span>
            <h1 className="mt-4 text-4xl font-black tracking-[-.06em] md:text-6xl">Privacy Policy</h1>
            <p className="mt-3 text-sm font-bold text-slate-600">Last updated: {UPDATED}</p>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-700">This policy explains how Churvox collects, uses, stores and shares personal information when people use the website, owner app, worker app, public customer links and support channels.</p>
          </header>

          <div className="space-y-7 text-sm font-medium leading-7 text-slate-700">
            <Section title="1. Who this policy covers">
              <p>This policy applies to business owners, office users, workers, invited testers, customers who open public quote, invoice, client-portal or proof links, website visitors and people who contact Churvox.</p>
              <p>A business using Churvox is responsible for deciding what client, worker and business information it enters and for having authority to use that information. Churvox processes that information to provide the service and support the business account.</p>
            </Section>

            <Section title="2. Information we collect">
              <p>Information may include names, email addresses, phone numbers, business details, login and role information, job and appointment details, addresses, client records, messages, notes, quotes, invoices, payment status, worker time, checklist information, photos and other proof uploaded by users.</p>
              <p>We also collect operational information such as device and browser details, approximate location derived from network or settings, login and security events, feature usage, error logs, public-link access, support messages and subscription status.</p>
              <p>Churvox does not need to store full payment-card numbers. Card entry and subscription checkout are handled by the payment provider.</p>
            </Section>

            <Section title="3. Public customer links">
              <p>Businesses may share tokenised links for quotes, invoices, proof packs and client portals. Anyone who has a valid link may be able to view the customer-facing record and use the actions offered on that page. Recipients should not forward these links unless authorised.</p>
              <p>Public pages are designed to show customer-facing information only. Internal notes, credentials, private account controls and unrelated business records should not be exposed through those links.</p>
            </Section>

            <Section title="4. How we use information">
              <p>We use information to create and secure accounts, provide job-management features, prepare owner-reviewed admin, operate Command, show worker assignments, prepare quotes and invoices, provide public customer records, process subscriptions, send transactional messages, provide support, investigate faults, prevent misuse and improve reliability.</p>
              <p>Churvox does not sell personal information. We do not use business client lists for unrelated bulk marketing.</p>
            </Section>

            <Section title="5. Owner approval and prepared admin">
              <p>Churvox may analyse records and prepare drafts, checks or suggested actions. Important external sends, charges, accounting changes, tax filing, record changes and payouts are not intended to happen invisibly. The product is designed so the authorised owner reviews actions that require approval.</p>
            </Section>

            <Section title="6. Service providers and integrations">
              <p>We use service providers for hosting, database storage, authentication, transactional email, payment processing, analytics, monitoring and support. Information may also be shared with an integration chosen by the business, such as an accounting provider, when the authorised user connects or approves that integration.</p>
              <p>Providers receive only the information reasonably needed for their service and may process information outside New Zealand. We take reasonable steps to use providers and safeguards appropriate to the information and service involved.</p>
            </Section>

            <Section title="7. Security and business separation">
              <p>We use authentication, role-aware access, business identifiers, restricted owner routes, secure transport and operational logging to protect information. Businesses are responsible for strong passwords, protecting shared devices, removing old users and ensuring public links are sent to the correct recipients.</p>
              <p>No online service can guarantee absolute security. Report suspected unauthorised access promptly to <a className={LINK_CLASS} href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
            </Section>

            <Section title="8. Retention and deletion">
              <p>Information is kept while needed to provide the service, maintain security, support the account, meet legal or tax obligations, resolve disputes and keep required billing records. Retention periods vary by record type and context.</p>
              <p>Authenticated owners can request account deletion through the <Link className={LINK_CLASS} to="/delete-account">account deletion page</Link>. Deletion may not remove information that must be retained for legal, billing, fraud-prevention, dispute or security reasons.</p>
            </Section>

            <Section title="9. Access, correction and complaints">
              <p>People may ask for access to or correction of personal information Churvox holds about them, subject to applicable law and identity verification. Business clients and workers should normally contact the business account first for information that business entered into Churvox.</p>
              <p>Email <a className={LINK_CLASS} href={`mailto:${CONTACT}?subject=Churvox%20privacy%20request`}>{CONTACT}</a> with the account email, the information involved and the request. You may also raise a complaint with the relevant privacy regulator.</p>
            </Section>

            <Section title="10. Cookies and local storage">
              <p>Churvox uses cookies and browser storage for login sessions, security, selected plan and region, setup progress, preferences and essential product operation. Limited analytics or visit information may be used to understand reliability and public-site usage.</p>
            </Section>

            <Section title="11. Children">
              <p>Churvox is a business service and is not directed to children. Business account holders are responsible for ensuring invited users are legally able and authorised to use the service.</p>
            </Section>

            <Section title="12. Changes and contact">
              <p>We may update this policy as the service, providers or legal requirements change. Material changes will be dated on this page and may also be communicated through the service.</p>
              <p>Privacy questions: <a className={LINK_CLASS} href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
            </Section>
          </div>
        </article>
      </section>
      <PublicFooter />
    </main>
  );
}
