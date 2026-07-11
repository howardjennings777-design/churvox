import React from "react";
import { Link } from "react-router-dom";

export default function PlatformUnlock() {
  return (
    <main className="min-h-screen bg-background text-slate-900 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Platform access is protected</h1>
        <p className="text-slate-600 mb-6">
          The old client-side owner-code unlock has been disabled for paid launch. Use the normal hello@churvox.com admin login to open HQ.
        </p>
        <div className="space-y-3">
          <Link className="block w-full rounded-xl bg-blue-600 hover:bg-blue-700 transition px-4 py-3 text-center font-medium text-white" to="/admin">
            Open Churvox HQ
          </Link>
          <Link className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-medium text-slate-700" to="/login">
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
