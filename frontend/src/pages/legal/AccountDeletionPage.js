import React from "react";

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-churvox-dark text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Deletion</h1>
          <p className="text-churvox-muted mt-2">Last updated: April 2026</p>
        </div>

        <div className="rounded-2xl border border-churvox-border bg-churvox-card p-5 space-y-6 text-sm leading-7 text-churvox-muted">
          <p>
            Deleting your Churvox account is permanent. Once completed, your account and associated
            business data may no longer be recoverable.
          </p>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">What May Be Deleted</h2>
            <p>
              Account deletion may remove your account access, business profile, team members,
              clients, jobs, quotes, invoices, schedules, notes, and other related records connected
              to your workspace.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">What May Be Retained</h2>
            <p>
              Some information may still be retained where required for legal, tax, fraud-prevention,
              billing, dispute resolution, or legitimate business and operational purposes.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Before You Delete</h2>
            <p>
              Before deleting your account, make sure you export or save any important business
              records you may need later. This action cannot be undone.
            </p>
          </div>

          <div className="border-t border-churvox-border pt-6">
            <h2 className="text-white text-xl font-semibold mb-3">Need Help First?</h2>
            <p>
              If you need help before deleting your account, contact hello@churvox.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
