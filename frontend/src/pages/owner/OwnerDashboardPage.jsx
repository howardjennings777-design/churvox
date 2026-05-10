import React from "react";
import { Link } from "react-router-dom";
import PlatformOwnerDashboard from "../admin/PlatformOwnerDashboard";

function clearOwnerSession() {
  localStorage.removeItem("owner_portal_session");
}

export default function OwnerDashboardPage() {
  return (
    <div className="min-h-screen bg-background text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Owner Dashboard</h1>
            <p className="text-sm text-slate-600">Platform controls and live stats</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/usage"
              className="rounded-lg rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Usage
            </Link>
            <button
              onClick={() => {
                clearOwnerSession();
                window.location.href = "/owner/login";
              
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <PlatformOwnerDashboard />
    </div>
  );
}
