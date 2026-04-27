import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Building2, Shield } from "lucide-react";

export default function WorkerSettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs" className="text-slate-400 hover:text-slate-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold text-slate-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.name || "Worker"}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{user?.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600 capitalize">{user?.role || "worker"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">{user?.business_name || "Your business"}</span>
            </div>
          </div>
        </div>

        <button onClick={logout}
          className="w-full bg-white border border-red-200 text-red-600 rounded-xl py-3 font-medium hover:bg-red-50 transition-colors"
          data-testid="worker-logout-btn">
          Sign Out
        </button>
      </main>
    </div>
  );
}
