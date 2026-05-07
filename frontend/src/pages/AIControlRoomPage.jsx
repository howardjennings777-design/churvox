import React from "react";

export default function AIControlRoomPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Churvox AI Operator
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            AI Control Room
          </h1>

          <p className="mt-3 max-w-3xl text-base text-slate-600">
            This is the command centre for AI-prepared actions, approvals, urgent work,
            unassigned jobs, invoice follow-ups, quote follow-ups, and daily business admin.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Approval Queue</h2>
              <p className="mt-2 text-sm text-slate-600">
                AI-prepared actions will appear here for owner approval.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Unassigned Jobs</h2>
              <p className="mt-2 text-sm text-slate-600">
                AI can recommend the best worker based on workload, area, and experience.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold text-slate-900">Admin Follow-ups</h2>
              <p className="mt-2 text-sm text-slate-600">
                Draft invoice reminders, quote follow-ups, and job admin tasks for review.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
