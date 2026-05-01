import React from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  Users,
  FileText,
  Receipt,
  BellRing,
  Bot,
  UserCog,
  Settings,
  Rocket,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import Layout from '../components/Layout';

const commandCards = [
  { title: 'Jobs', to: '/jobs', icon: Briefcase, description: 'View and manage all active jobs.' },
  { title: 'Schedule', to: '/schedule', icon: Calendar, description: 'Plan your team calendar and runs.' },
  { title: 'Clients', to: '/clients', icon: Users, description: 'Access client records and details.' },
  { title: 'Quotes', to: '/quotes', icon: FileText, description: 'Create and review customer quotes.' },
  { title: 'Invoices', to: '/invoices', icon: Receipt, description: 'Open invoice workflows and status.' },
  { title: 'Follow-ups', to: '/follow-ups', icon: BellRing, description: 'Track pending callbacks and actions.' },
  { title: 'Automation', to: '/automation', icon: Bot, description: 'Open automation controls and checks.' },
  { title: 'Team', to: '/team', icon: UserCog, description: 'Manage people, roles, and permissions.' },
  { title: 'Settings', to: '/settings', icon: Settings, description: 'Adjust business and platform settings.' },
  { title: 'Launch Check', to: '/launch-check', icon: Rocket, description: 'Run launch readiness and safeguards.' },
];

export default function SafeAIAssistantPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-8 text-white shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Churvox command centre</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Smart Hub</h1>
            <p className="mt-4 max-w-3xl text-base text-slate-200 sm:text-lg">
              Advanced live widgets are paused while core launch testing is protected. Use this stable Smart Hub to
              open key areas instantly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/jobs"
                className="inline-flex items-center rounded-lg bg-white px-4 py-2 font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                Open Jobs
              </Link>
              <Link
                to="/jobs/new"
                className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-400"
              >
                New Job
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-slate-600"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </section>

          <section className="mt-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {commandCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.title}
                    to={card.to}
                    className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-900 group-hover:text-blue-700">{card.title}</h2>
                        <p className="mt-1 text-sm text-slate-700">{card.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <h3 className="text-base font-semibold text-emerald-900">Safe mode notice</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
                  <li>No messages are auto-sent.</li>
                  <li>No invoices are auto-changed.</li>
                  <li>No payroll is changed.</li>
                  <li>No MYOB data is changed.</li>
                  <li>This is a stable launcher while the advanced dashboard is rebuilt.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Advanced Smart Hub widgets paused</h3>
                <p className="mt-1 text-sm text-amber-900">
                  The advanced data widgets were paused to keep the app stable. Rebuild them later one section at a
                  time.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
