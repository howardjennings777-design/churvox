import React from "react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-churvox-dark text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          <p className="text-churvox-muted mt-2">Basic rules for using Churvox.</p>
        </div>

        <div className="space-y-4 text-sm text-churvox-muted leading-7">
          <section>
            <h2 className="text-white font-semibold mb-2">Use of Service</h2>
            <p>
              Churvox provides business management tools for jobs, clients, quotes, invoices,
              scheduling, and related workflows. You must use the service lawfully.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Account Responsibility</h2>
            <p>
              You are responsible for your account, login credentials, business data, and activity
              performed by users under your business.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Subscriptions and Billing</h2>
            <p>
              Paid plans renew according to the billing cycle selected unless cancelled.
              Trial access, plan limits, pricing, and included features may be updated over time.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Availability</h2>
            <p>
              We aim to keep the service available and reliable, but we do not guarantee uninterrupted
              access or that all features will always be error-free.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Termination</h2>
            <p>
              We may suspend or terminate access where needed for security, misuse, unpaid charges,
              or breaches of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Contact</h2>
            <p>
              For support or legal questions, contact: hello@churvox.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
