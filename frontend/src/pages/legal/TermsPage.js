import React from "react";
import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow">
        <h1 className="text-3xl font-black">Terms of Service</h1>
        <p className="mt-3 text-slate-600 font-bold">Read the complete Churvox terms before creating or using an account.</p>
        <Link
          to="/terms-of-service"
          aria-label="Open full Terms of Service"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-700 px-4 py-3 font-black text-white"
          style={{ minHeight: 44, touchAction: "manipulation" }}
        >
          Open full Terms of Service
        </Link>
      </section>
    </main>
  );
}
