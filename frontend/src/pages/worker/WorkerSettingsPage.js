import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, Shield } from "lucide-react";

export default function WorkerSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="chx-worker-shell">
      <header className="chx-worker-header px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs" className="text-slate-300 hover:text-blue-200"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold text-slate-100">Worker Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="chx-worker-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.name || "Worker"}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-slate-400" /><span className="text-slate-700">{user?.email || "-"}</span></div>
            <div className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-slate-400" /><span className="text-slate-700 capitalize">{user?.role || "worker"}</span></div>
            <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-slate-400" /><span className="text-slate-700">{user?.business_name || "Your business"}</span></div>
          </div>
        </div>

        <button onClick={logout} className="w-full rounded-xl py-3 font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors" data-testid="worker-logout-btn">
          Sign Out
        </button>
      </main>
    </div>
  );
}
