import React, { useState } from "react";

export default function AccountDeletionPage() {

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handlePermanentDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to permanently delete your account? This cannot be undone.");
    if (!confirmed) return;

    setDeleteLoading(true);
    setDeleteError("");

    const backendBase =
      (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : "").replace(/\/$/, "");

    const tries = [
      { url: "/api/auth/delete-account", method: "DELETE" },
      { url: "/api/auth/delete-account", method: "POST" },
      { url: "/api/auth/account-delete", method: "DELETE" },
      { url: "/api/auth/account-delete", method: "POST" },
    ];

    try {
      let success = false;
      let lastMessage = "Delete account failed";

      for (const attempt of tries) {
        try {
          const res = await fetch(`${backendBase}${attempt.url}`, {
            method: attempt.method,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok && data?.success !== false) {
            success = true;
            break;
          }

          lastMessage = data?.detail || data?.message || `${attempt.method} ${attempt.url} failed`;
        } catch (err) {
          lastMessage = err?.message || `${attempt.method} ${attempt.url} failed`;
        }
      }

      if (!success) throw new Error(lastMessage);

      try { localStorage.clear(); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}

      alert("Your account has been deleted.");
      window.location.href = "/login";
    } catch (err) {
      setDeleteError(err?.message || "Could not delete account");
    } finally {
      setDeleteLoading(false);
    }
  };


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
      

          {deleteError ? (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {deleteError}
            </div>
          ) : null}

          <button
            onClick={handlePermanentDelete}
            disabled={deleteLoading}
            className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {deleteLoading ? "Deleting Account..." : "Permanently Delete My Account"}
          </button>

        </div>
      </div>
  );
}
