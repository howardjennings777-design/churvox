import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, HelpCircle, X } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "Welcome to Churvox",
    text: "This is your field-service hub for jobs, clients, quotes, invoices, team work, payroll and automation.",
    actionLabel: "Open Smart Hub",
    actionPath: "/dashboard",
  },
  {
    title: "Start with your clients",
    text: "Add or import clients first so jobs, quotes and invoices have the right customer details attached.",
    actionLabel: "Open Clients",
    actionPath: "/clients",
  },
  {
    title: "Create and schedule jobs",
    text: "Create jobs with client, address, time, worker and pricing details. Then track notes, photos and completion from the job page.",
    actionLabel: "Open Jobs",
    actionPath: "/jobs",
  },
  {
    title: "Invite your team",
    text: "Add workers, managers, office admins or payroll users so everyone only sees the area they need.",
    actionLabel: "Open Team",
    actionPath: "/team",
  },
  {
    title: "You can get help any time",
    text: "Any time you are stuck, push the Help button near the top of the app and choose the page you need help with.",
    actionLabel: "Finish tour",
    actionPath: null,
  },
];

function storageKey(user) {
  const email = String(user?.email || "unknown").trim().toLowerCase();
  return `churvox_first_run_guide_done_${email}`;
}

export default function FirstRunGuide({ user, enabled = true }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const key = useMemo(() => storageKey(user), [user]);

  useEffect(() => {
    if (!enabled || !user?.email) return;
    if (localStorage.getItem(key) === "true") return;
    const timer = setTimeout(() => setOpen(true), 650);
    return () => clearTimeout(timer);
  }, [enabled, key, user?.email]);

  const finish = () => {
    localStorage.setItem(key, "true");
    setOpen(false);
  };

  if (!enabled || !open) return null;

  const current = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/62 px-4 py-6 backdrop-blur-sm" data-testid="first-run-guide">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-cyan-50 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Getting started</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{current.title}</h2>
          </div>
          <button type="button" onClick={finish} className="rounded-xl p-2 text-slate-500 hover:bg-white" aria-label="Close guide">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-5 flex gap-2">
            {TOUR_STEPS.map((item, index) => (
              <span key={item.title} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-blue-600" : "bg-slate-200"}`} />
            ))}
          </div>

          <p className="text-base font-semibold leading-7 text-slate-700">{current.text}</p>

          {last && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-900">
              <HelpCircle className="mr-2 inline h-4 w-4" />
              The Help button stays available later, so users can choose the page they are stuck on.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={finish} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">
              Skip
            </button>

            <div className="flex gap-2 sm:justify-end">
              {step > 0 && (
                <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Back
                </button>
              )}
              {current.actionPath && (
                <Link to={current.actionPath} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-100">
                  {current.actionLabel}
                </Link>
              )}
              <button
                type="button"
                onClick={() => (last ? finish() : setStep((value) => value + 1))}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20"
              >
                {last ? <CheckCircle2 className="h-4 w-4" /> : null}
                {last ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
