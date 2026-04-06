import React from "react";

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-churvox-dark text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account Deletion</h1>
          <p className="text-churvox-muted mt-2">What happens when you permanently delete your account.</p>
        </div>

        <div className="space-y-4 text-sm text-churvox-muted leading-7">
          <p>
            Deleting your account permanently removes your account and associated business data,
            including jobs, clients, invoices, quotes, schedules, and team records, unless some
            information must be retained for legal, tax, fraud-prevention, or operational reasons.
          </p>

          <p>
            This action cannot be undone. Make sure you export any important records before deleting.
          </p>

          <p>
            If you need help before deleting your account, contact: hello@churvox.com
          </p>
        </div>
      </div>
    </div>
  );
}
