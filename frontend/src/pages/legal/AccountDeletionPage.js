import React, { useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";
import { confirmDialog } from "../../lib/confirmDialog";
import { PublicNav, PublicFooter, Eyebrow, SectionHeading } from "../marketing/ChurvoxPublicShell";

function authHeaders() {
  let token = "";
  try { token = localStorage.getItem("token") || localStorage.getItem("authToken") || ""; } catch {}
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AccountDeletionPage() {
  const { user, loading, logout } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handlePermanentDelete = async () => {
    if (confirmation.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Type DELETE in the confirmation box first.');
      return;
    }

    const confirmed = await confirmDialog({
      title: "Permanently delete your Churvox account?",
      message: "This cannot be undone. Account access and business records connected to this workspace will be removed subject to required legal and billing retention.",
      danger: true,
      confirmLabel: "Permanently delete",
    });
    if (!confirmed) return;

    setDeleteLoading(true);
    setDeleteError("");

    const tries = [
      { url: "/api/auth/delete-account", method: "DELETE" },
      { url: "/api/auth/delete-account", method: "POST" },
      { url: "/api/auth/account-delete", method: "DELETE" },
      { url: "/api/auth/account-delete", method: "POST" },
    ];

    try {
      let success = false;
      let lastMessage = "Account deletion failed.";

      for (const attempt of tries) {
        let response;
        try {
          response = await fetch(`${API_BASE}${attempt.url}`, {
            method: attempt.method,
            credentials: "include",
            headers: authHeaders(),
            body: JSON.stringify({ confirmation: "DELETE" }),
          });
        } catch (error) {
          lastMessage = error?.message || `${attempt.method} ${attempt.url} could not be reached`;
          continue;
        }

        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.success !== false) {
          success = true;
          break;
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error("Your session is no longer authorised. Sign in again before deleting the account.");
        }

        lastMessage = data?.detail || data?.message || `${attempt.method} ${attempt.url} failed`;
        if (response.status !== 404 && response.status !== 405) {
          throw new Error(lastMessage);
        }
      }

      if (!success) throw new Error(lastMessage);

      setDeleteSuccess(true);
      setConfirmation("");
      try { await logout?.(); } catch {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
      }
      window.setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch (error) {
      setDeleteError(error?.message || "Could not delete the account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="cp26Site" data-version="CHURVOX_ACCOUNT_DELETION_FINAL_20260720">
      <PublicNav />
      <section className="cp26PageHero">
        <div>
          <Eyebrow>Account and data control</Eyebrow>
          <h1>Delete a Churvox account deliberately.</h1>
          <p>Account deletion is permanent. Export any records you need first and check outstanding billing, tax or dispute records before continuing.</p>
        </div>
        <div className="cp26HeroPanel">
          <small>Before deleting</small>
          <b>This action cannot be undone.</b>
          <span>Some information may still be retained where required for billing, fraud prevention, disputes, tax records or applicable law.</span>
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading eyebrow="Deletion scope" title="Understand what will be affected." text="Deletion targets the authenticated account and its connected workspace. It is not a substitute for exporting records that must be kept." />
        <div className="cp26AreaGrid">
          <article><b>Account access</b><span>The owner account and access to the connected workspace may be removed.</span></article>
          <article><b>Business records</b><span>Clients, jobs, workers, quotes, invoices, notes, schedules and related workspace records may be deleted.</span></article>
          <article><b>Required retention</b><span>Billing, security, fraud-prevention, dispute or legally required records may be retained for the necessary period.</span></article>
          <article><b>Need help first?</b><span>Email hello@churvox.com from the account email before deleting if anything is unclear.</span></article>
        </div>
      </section>

      <section className="cp26Section">
        <div className="cp26ContactGrid">
          <article>
            <b>Export before deletion</b>
            <span>Open the owner app and export any client, job, quote, invoice, payroll-review or accounting records you need to retain.</span>
            <Link to="/dashboard#settings">Open settings</Link>
          </article>
          <article>
            <b>Billing questions</b>
            <span>Check trial, cancellation and refund information before deleting an account with an active Stripe subscription.</span>
            <Link to="/legal/terms#billing-cancellations">Billing and cancellations</Link>
          </article>
          <article>
            <b>Contact support</b>
            <span>Never email your password or complete card details. Include the account email and business name.</span>
            <a href="mailto:hello@churvox.com?subject=Churvox%20account%20deletion">Email Churvox</a>
          </article>
        </div>
      </section>

      <section className="cp26Section cp26SectionDark">
        <SectionHeading eyebrow="Permanent action" title="Confirm the account from an authenticated session." text="Type DELETE, review the final confirmation, and only continue when you are certain." />
        {loading ? <p>Checking your account session…</p> : !user ? (
          <div className="cp26ContactGrid">
            <article>
              <b>Sign in required</b>
              <span>The permanent deletion control is only available after signing into the account being deleted.</span>
              <Link className="cp26Button" to="/login?next=%2Fdelete-account">Sign in to continue</Link>
            </article>
          </div>
        ) : (
          <div className="cp26ContactGrid">
            <article>
              <b>Authenticated account</b>
              <span>{user.email || "Current signed-in account"}</span>
              <label style={{ display: "grid", gap: 8, marginTop: 14 }}>
                <span>Type DELETE to confirm</span>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  style={{ minHeight: 46, borderRadius: 12, border: "1px solid rgba(255,255,255,.25)", padding: "10px 12px", background: "#fff", color: "#111" }}
                />
              </label>
              {deleteError ? <p style={{ color: "#fecaca", fontWeight: 800 }}>{deleteError}</p> : null}
              {deleteSuccess ? <p style={{ color: "#bbf7d0", fontWeight: 800 }}>Account deleted. Returning to the Churvox home page…</p> : null}
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={deleteLoading || confirmation.trim().toUpperCase() !== "DELETE" || deleteSuccess}
                style={{ marginTop: 14, minHeight: 46, border: 0, borderRadius: 999, padding: "11px 18px", background: "#b91c1c", color: "#fff", fontWeight: 900, cursor: "pointer", opacity: deleteLoading || confirmation.trim().toUpperCase() !== "DELETE" ? .55 : 1 }}
              >
                {deleteLoading ? "Deleting account…" : "Permanently delete my account"}
              </button>
            </article>
          </div>
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
