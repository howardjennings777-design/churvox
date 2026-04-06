import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-churvox-dark text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="text-churvox-muted mt-2">How Churvox collects, uses, and protects your information.</p>
        </div>

        <div className="space-y-4 text-sm text-churvox-muted leading-7">
          <section>
            <h2 className="text-white font-semibold mb-2">Information We Collect</h2>
            <p>We may collect account details, business information, customer details, job records, invoices, quotes, team member information, and usage data needed to run the app.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">How We Use Information</h2>
            <p>We use your information to provide job management features, improve reliability, support your account, process subscriptions, and maintain security.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Data Sharing</h2>
            <p>We do not sell your personal data. We may share limited information with service providers needed for hosting, payments, notifications, analytics, and support.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Data Storage and Security</h2>
            <p>We take reasonable steps to protect your data, but no system can guarantee absolute security. You are responsible for keeping your login details secure.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Your Choices</h2>
            <p>You can update your account information inside the app. You can also request account deletion, which removes your account and associated business data subject to legal and operational requirements.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Contact</h2>
            <p>For privacy questions, contact: hello@churvox.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
