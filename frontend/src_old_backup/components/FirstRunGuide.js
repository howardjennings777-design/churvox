import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, HelpCircle, X, MapPin } from "lucide-react";

const TOUR_STEPS = [
  {
    label: "Welcome",
    title: "Welcome to Churvox",
    text: "This quick setup tour helps a new business owner get the app ready without guessing where to start.",
    checklist: ["Start in Smart Hub", "Use the cards to see jobs, invoices, payroll and urgent work", "Come back here any time from the sidebar"],
    actionLabel: "Open Smart Hub",
    actionPath: "/dashboard",
  },
  {
    label: "Client",
    title: "Step 1 — Add your first client",
    text: "Clients come first because jobs, quotes and invoices all need customer details attached.",
    checklist: ["Open Clients", "Tap Add Client", "Enter name, phone, email and address", "Save the client before creating work"],
    actionLabel: "Open Clients",
    actionPath: "/clients",
  },
  {
    label: "Job",
    title: "Step 2 — Create a job",
    text: "Once a client exists, create a job with the real job address, date, time, pricing and notes.",
    checklist: ["Open Jobs", "Tap New Job", "Choose the client", "Add address, schedule, pricing and job notes", "Save the job"],
    actionLabel: "Open Jobs",
    actionPath: "/jobs",
  },
  {
    label: "Team",
    title: "Step 3 — Invite or assign your team",
    text: "If you have workers, invite them so they can see their own jobs without seeing owner-only business data.",
    checklist: ["Open Team", "Invite worker, manager, office admin or payroll", "Assign the worker to a job", "Workers should only see the worker app"],
    actionLabel: "Open Team",
    actionPath: "/team",
    optional: true,
  },
  {
    label: "Quote",
    title: "Step 4 — Send a quote when work needs approval",
    text: "Quotes help customers approve work before you turn it into a job or invoice.",
    checklist: ["Open Quotes", "Create a quote for a client", "Add line items and totals", "Share the public quote link", "Accepted quotes can become work"],
    actionLabel: "Open Quotes",
    actionPath: "/quotes",
    optional: true,
  },
  {
    label: "Invoice",
    title: "Step 5 — Create or review invoices",
    text: "Invoices should be checked before sending so totals, client details and payment links are correct.",
    checklist: ["Open Invoices", "Create or review an invoice", "Check totals and status", "Open the public invoice link", "Send when ready"],
    actionLabel: "Open Invoices",
    actionPath: "/invoices",
  },
  {
    label: "Help",
    title: "Any time you are stuck, push Help",
    text: "The Help button stays available in the app. Pick the page you are stuck on and it will show the steps for that area.",
    checklist: ["Use Help near the top/sidebar", "Choose the page you need", "Follow the short steps", "You can stop this tour at any time"],
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

  const pause = () => {
    sessionStorage.setItem("churvox_first_run_guide_paused", "true");
    setOpen(false);
  };

  if (!enabled || !open) return null;

  const current = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;
  const next = () => setStep((value) => Math.min(TOUR_STEPS.length - 1, value + 1));
  const previous = () => setStep((value) => Math.max(0, value - 1));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/62 px-4 py-6 backdrop-blur-sm" data-testid="first-run-guide">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-cyan-50 px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Guided setup</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{current.title}</h2>
            {current.optional && <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-amber-600">Optional step</p>}
          </div>
          <button type="button" onClick={pause} className="rounded-xl p-2 text-slate-500 hover:bg-white" aria-label="Close guide">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-5 grid grid-cols-7 gap-2">
            {TOUR_STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setStep(index)}
                className={`h-2 rounded-full transition ${index <= step ? "bg-blue-600" : "bg-slate-200 hover:bg-slate-300"}`}
                aria-label={`Go to ${item.label}`}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-base font-semibold leading-7 text-slate-700">{current.text}</p>
            <div className="mt-4 grid gap-2">
              {current.checklist.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {last && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-900">
              <HelpCircle className="mr-2 inline h-4 w-4" />
              Any time you are stuck, push the Help button and choose the page you need help with.
            </div>
          )}

          {!last && (
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              <MapPin className="mr-2 inline h-4 w-4" />
              You can open the page now, follow the steps, then come back and continue. You can also stop the tour.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={pause} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Stop tour
              </button>
              <button type="button" onClick={finish} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Do not show again
              </button>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {step > 0 && (
                <button type="button" onClick={previous} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">
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
                onClick={() => (last ? finish() : next())}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20"
              >
                {last ? <CheckCircle2 className="h-4 w-4" /> : null}
                {last ? "Finish" : "Next popup"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
