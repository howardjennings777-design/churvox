import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { ShieldCheck, Bot, Briefcase, FileText, Receipt, Users } from "lucide-react";

function Card({ title, text, to, icon: Icon }) {
  return (
    <Link to={to} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">{Icon ? <Icon className="h-5 w-5" /> : null}</div>
        <div>
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">{text}</p>
        </div>
      </div>
    </Link>
  );
}

export default function SafeAIAssistantPage() {
  return (
    <Layout>
      <div className="cx-page space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50 to-slate-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Smart Hub safety rebuild</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">AI Business Assistant</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            Churvox is back in safe mode while the broken Financial Radar build is removed. Real Ask Churvox AI remains separate and can be restored after the site is stable.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card title="Jobs" text="Open jobs, assigned work and job details." to="/jobs" icon={Briefcase} />
          <Card title="Quotes" text="Open quotes and follow-ups." to="/quotes" icon={FileText} />
          <Card title="Invoices" text="Invoices, unpaid work and customer billing." to="/invoices" icon={Receipt} />
          <Card title="Team" text="Workers, roles and team setup." to="/team" icon={Users} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Bot className="h-5 w-5 text-blue-600" />AI status</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              The Financial Radar page code caused a blank screen, so this safe Smart Hub is active to keep the app usable.
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-emerald-900"><ShieldCheck className="h-5 w-5" />AI guardrails</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
              AI suggests. You approve. It does not send customer messages, approve payroll, change pricing, mark invoices paid, or sync MYOB automatically.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
