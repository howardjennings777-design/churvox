import React from "react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-churvox-dark text-slate-900 p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-slate-500 mt-2">Last updated: April 2026</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-6 text-sm leading-7 text-slate-500">
          <p>
            These Terms of Service govern your use of the Churvox app and related services. By using
            Churvox, you agree to these terms.
          </p>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-slate-900 text-xl font-semibold mb-3">Use of the Service</h2>
            <p>
              Churvox provides business management tools for jobs, clients, quotes, invoices,
              scheduling, time tracking, and related workflow features. You agree to use the service
              only for lawful purposes and in a way that does not interfere with the operation,
              security, or availability of the platform.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-slate-900 text-xl font-semibold mb-3">Accounts</h2>
            <p>
              You are responsible for your account, your password, the users you invite, and the
              activity carried out under your business. You must provide accurate information and keep
              your login details secure.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-slate-900 text-xl font-semibold mb-3">Plans, Billing, and Trials</h2>
            <p>
              Some features may require a paid subscription. Trial offers, pricing, limits, and plan
              features may change over time. Unless cancelled, paid subscriptions may renew according
              to the billing cycle connected to your account.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-slate-900 text-xl font-semibold mb-3">Data and Content</h2>
            <p>
              You retain responsibility for the data you enter into Churvox, including client details,
              jobs, quotes, invoices, messages, and uploaded files. You confirm that you have the
              right to use and store that information in the service.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-slate-900 text-xl font-semibold mb-3">Availability</h2>
            <p>
              We aim to keep Churvox available and reliable, but we do not guarantee uninterrupted or
              error-free service at all times. Features may be updated, changed, paused, or removed as
              the platform develops.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-slate-900 text-xl font-semibold mb-3">Termination</h2>
            <p>
              We may suspend or terminate access if these terms are breached, if payment is not made,
              if misuse is detected, or if it is necessary for security, legal, or operational
              reasons. You may stop using the service at any time.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-slate-900 text-xl font-semibold mb-3">Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, contact us at hello@churvox.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
