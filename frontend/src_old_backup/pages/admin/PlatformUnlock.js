import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function PlatformUnlock() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-cyan-200/15 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/30">
        <ShieldCheck className="mx-auto h-12 w-12 text-cyan-300" />
        <h1 className="mt-4 text-3xl font-black">Platform owner access</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
          Sign in with the approved Churvox owner account, then open the owner command centre.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/login" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25">Login</Link>
          <Link to="/admin" className="rounded-2xl border border-cyan-200/25 bg-white/10 px-5 py-3 text-sm font-black text-white">Open owner dashboard</Link>
        </div>
      </div>
    </div>
  );
}
