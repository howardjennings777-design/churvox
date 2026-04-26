import React from "react";
import Layout from "@/components/Layout";
import { DollarSign, Clock, Users, FileText } from "lucide-react";

export default function PayrollPage() {
  return (
    <Layout>
      <div className="cx-page">
        <div className="cx-page-hero">
          <h1 className="cx-page-title">Payroll</h1>
          <p className="cx-page-subtitle">Manage timesheets, hours, pay periods, and export-ready summaries.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="cx-panel p-5 space-y-2">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Timesheets</h3>
            <p className="text-sm text-slate-500">View tracked hours and approved time entries from team members.</p>
          </div>

          <div className="cx-panel p-5 space-y-2">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Pay Summary</h3>
            <p className="text-sm text-slate-500">Review pay calculations based on approved timesheets.</p>
          </div>

          <div className="cx-panel p-5 space-y-2">
            <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Team Hours</h3>
            <p className="text-sm text-slate-500">See a breakdown of hours logged by each team member.</p>
          </div>

          <div className="cx-panel p-5 space-y-2">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Reports</h3>
            <p className="text-sm text-slate-500">Export payroll reports for your records.</p>
          </div>
        </div>

        <div className="cx-panel p-4 text-center bg-[#eaf2ff] border-[#d3e2ff]">
          <p className="text-sm text-blue-700">Payroll data will populate automatically as your team tracks time on jobs.</p>
        </div>
      </div>
    </Layout>
  );
}
