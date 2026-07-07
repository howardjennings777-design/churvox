import React from "react";
import API_BASE from "../../lib/apiBase";

function token() {
  try { return window.localStorage.getItem("token") || ""; } catch { return ""; }
}

export default function RemoveCustomerDataCard({ onRemoved }) {
  const [email, setEmail] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");

  async function removeCustomerRecords() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/owner/delete-by-email`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), confirm }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok === false) throw new Error(body?.detail || body?.message || `Request failed: ${res.status}`);
      setResult(body);
      setEmail("");
      setConfirm("");
      onRemoved?.();
    } catch (err) {
      setError(err?.message || "Could not remove this customer record.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[30px] border border-red-200 bg-red-50 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
      <h3 className="mb-2 text-xl font-black text-red-800">Remove customer records by email</h3>
      <p className="max-w-2xl text-sm font-bold leading-6 text-red-700">
        Owner-only data removal for a customer email and connected Churvox workspace records. Type DELETE to confirm.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-red-400" />
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type DELETE" className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-red-400" />
        <button type="button" onClick={removeCustomerRecords} disabled={busy || confirm !== "DELETE" || !email} className="rounded-2xl border border-red-500 bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">
          {busy ? "Removing…" : "Remove records"}
        </button>
      </div>
      {error ? <p className="mt-3 rounded-2xl border border-red-200 bg-white p-3 text-sm font-black text-red-700">{error}</p> : null}
      {result ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-700">
          <p>{result.message}</p>
          <pre className="mt-2 overflow-auto text-xs text-emerald-700">{JSON.stringify(result.deleted || {}, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
