import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui/button";
import { AppShell, PageHeader, SectionCard } from "../components/premium/PremiumUI";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";

export default function ComingSoonPage({ title = "Coming soon", description = "This area is being polished before launch so it does not feel half-finished." }) {
  return (
    <Layout>
      <AppShell data-testid="coming-soon-page">
        <PageHeader
          title={title}
          description={description}
          action={<Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/smart-hub">Back to Smart Hub</Link></Button>}
        />
        <SectionCard title="Launch-safe placeholder" action={<Clock className="h-5 w-5 text-blue-600" />}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <Sparkles className="h-5 w-5 text-blue-700" />
              <p className="mt-2 text-sm font-black text-blue-950">Hidden until strong</p>
              <p className="mt-1 text-sm leading-6 text-blue-900">This feature stays out of the main launch path until it is reliable and useful.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <p className="mt-2 text-sm font-black text-emerald-950">No broken clicks</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900">Users see a clear page instead of a weak or half-working tool.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-black text-slate-950">Best next step</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Use Smart Hub, Jobs, Quotes, Invoices, Team, Automation and Timesheets as the core launch flow.</p>
            </div>
          </div>
        </SectionCard>
      </AppShell>
    </Layout>
  );
}
