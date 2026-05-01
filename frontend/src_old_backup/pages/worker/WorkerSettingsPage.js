import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, Shield, LogOut, Briefcase, Sparkles } from "lucide-react";

export default function WorkerSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="chx-worker-shell worker-premium-shell">
      <header className="worker-premium-header sticky top-0 z-20 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link to="/worker/jobs" className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-sm backdrop-blur transition hover:bg-white/15">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Worker profile</p>
            <h1 className="truncate text-xl font-black tracking-tight text-white">Settings</h1>
          </div>
        </div>
      </header>

      <main className="worker-premium-page mx-auto max-w-3xl px-4 pb-10 pt-5 space-y-4">
        <section className="worker-premium-hero overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="relative z-10 flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-600/25">
              <User className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">
                <Sparkles className="h-3.5 w-3.5" /> Churvox worker
              </div>
              <h2 className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950">{user?.name || "Worker"}</h2>
              <p className="truncate text-sm font-semibold text-slate-500">{user?.email || "No email saved"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-500">Account details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><Mail className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Email</p>
                <p className="truncate text-sm font-bold text-slate-800">{user?.email || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><Shield className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Role</p>
                <p className="text-sm font-bold capitalize text-slate-800">{user?.role || "worker"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><Building2 className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Business</p>
                <p className="truncate text-sm font-bold text-slate-800">{user?.business_name || "Your business"}</p>
              </div>
            </div>
          </div>
        </section>

        <Link to="/worker/jobs" className="flex items-center justify-between rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 text-blue-800 shadow-sm transition hover:bg-blue-100">
          <span className="flex items-center gap-3 text-sm font-black"><Briefcase className="h-5 w-5" /> Back to assigned work</span>
          <ArrowLeft className="h-4 w-4 rotate-180" />
        </Link>

        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] border border-red-200 bg-red-50 py-3.5 font-black text-red-700 shadow-sm transition hover:bg-red-100" data-testid="worker-logout-btn">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </main>
    </div>
  );
}
