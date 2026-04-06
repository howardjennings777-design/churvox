import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-churvox-dark text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-churvox-muted mt-2">Last updated: April 2026</p>
        </div>

        <div className="rounded-2xl border border-churvox-border bg-churvox-card p-5 space-y-6 text-sm leading-7 text-churvox-muted">
          <p>
            Churvox respects your privacy. This Privacy Policy explains what information we collect,
            how we use it, and the choices you have when using the Churvox app and related services.
          </p>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Information We Collect</h2>
            <p>
              We may collect information you provide directly to us, including your name, email
              address, business name, contact details, billing details, client records, job details,
              quotes, invoices, schedules, team member details, and any notes, files, or images you
              upload to the service.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">How We Use Your Information</h2>
            <p>
              We use your information to operate the service, manage your account, support your
              workflow, process payments, improve app performance, provide customer support, maintain
              security, and communicate important product or account updates.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share limited information with trusted
              service providers that help us run Churvox, such as hosting, payment, analytics,
              authentication, notification, and support providers. We may also disclose information
              where required by law or to protect the security, rights, or operation of the service.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Data Security</h2>
            <p>
              We take reasonable steps to protect your information from unauthorized access, loss,
              misuse, or disclosure. However, no system is completely secure, and we cannot guarantee
              absolute security.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Data Retention</h2>
            <p>
              We keep information for as long as needed to provide the service, meet legal or tax
              obligations, resolve disputes, enforce agreements, and maintain business records. If
              you delete your account, some records may be retained where required for legal,
              compliance, fraud-prevention, or operational reasons.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Your Choices</h2>
            <p>
              You can review and update some account information inside the app. You may also request
              account deletion. You are responsible for keeping your login details secure and for the
              information entered by users under your business account.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at hello@churvox.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
