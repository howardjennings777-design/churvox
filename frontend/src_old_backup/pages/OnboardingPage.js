import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const steps = [
  ["Choose industry", "Set your trade profile in Settings.", "/settings"],
  ["Add first client", "Create your first customer record.", "/clients/new"],
  ["Add first job", "Create a job and schedule it.", "/jobs/new"],
  ["Invite first worker", "Add your team and roles.", "/team"],
  ["Choose plan", "Review plans and trial status.", "/plans"],
  ["Set up integrations", "Connect MYOB, SMS, and email when ready.", "/integrations"],
];

export default function OnboardingPage() {
  return (
    <Layout>
      <section className="cx-page space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">First-time setup</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Onboarding checklist</h1>
          <p className="mt-2 text-sm font-semibold text-slate-700">Complete these steps to finish launch setup. This checklist is optional and does not block /jobs.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map(([title, body, href], idx) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-black text-blue-700">Step {idx + 1}</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-700">{body}</p>
              <Link to={href} className="mt-3 inline-flex rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Open</Link>
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
}
