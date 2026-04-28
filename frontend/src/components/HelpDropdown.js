import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HelpCircle, ChevronDown, X } from "lucide-react";

const HELP_TOPICS = [
  {
    path: "/dashboard",
    label: "Smart Hub",
    title: "Smart Hub help",
    steps: ["Check today’s work first.", "Use urgent actions to see what needs attention.", "Open jobs, quotes, invoices, timesheets or automation from the quick cards."],
  },
  {
    path: "/clients",
    label: "Clients",
    title: "Clients help",
    steps: ["Add or import your customers here.", "Open a client to see their jobs, quotes and invoices.", "Keep phone and email details complete so reminders work later."],
  },
  {
    path: "/jobs",
    label: "Jobs",
    title: "Jobs help",
    steps: ["Create a job with client, address, time and pricing.", "Assign a worker from the job page.", "Track progress, notes, photos and completion from the job detail."],
  },
  {
    path: "/schedule",
    label: "Schedule",
    title: "Schedule help",
    steps: ["Use this to see work by date.", "Check worker clashes before assigning jobs.", "Open a scheduled job to edit or review details."],
  },
  {
    path: "/quotes",
    label: "Quotes",
    title: "Quotes help",
    steps: ["Create quotes for clients before work is approved.", "Send/share quote links when ready.", "Accepted quotes can become jobs."],
  },
  {
    path: "/invoices",
    label: "Invoices",
    title: "Invoices help",
    steps: ["Create invoices from completed work or manually.", "Review totals before sending.", "Use status to track draft, sent, paid and overdue invoices."],
  },
  {
    path: "/team",
    label: "Team",
    title: "Team help",
    steps: ["Invite workers, managers, office admins or timesheet users.", "Keep roles correct so each person only sees what they need.", "Open team members to review their work where available."],
  },
  {
    path: "/automation",
    label: "Automation",
    title: "Automation help",
    steps: ["Turn rules on or off from this page.", "Use Test to check a rule before relying on it.", "Keep launch rules simple: job completion, quote accepted, invoice overdue, worker updates."],
  },
  {
    path: "/timesheets",
    label: "Timesheets",
    title: "Timesheets help",
    steps: ["Review worker time and pending approvals.", "Lock clean periods once hours are checked.", "Export CSV files for your external payroll provider, accountant or bookkeeper."],
  },
  {
    path: "/reports",
    label: "Reports",
    title: "Reports help",
    steps: ["Use this month or last month filters.", "Refresh to pull the latest live records.", "Check revenue, unpaid invoices, completed jobs and launch health."],
  },
  {
    path: "/settings",
    label: "Settings",
    title: "Settings help",
    steps: ["Set business details, region and preferences.", "Check account details before inviting team members.", "Use settings before launch to make your workspace accurate."],
  },
];

function findTopic(pathname) {
  return HELP_TOPICS.find((topic) => pathname === topic.path || pathname.startsWith(topic.path + "/")) || HELP_TOPICS[0];
}

function getPanelPosition(button, sidebar = false) {
  const fallback = { top: 72, left: 12, width: 360, maxHeight: "calc(100vh - 96px)" };
  if (!button || typeof window === "undefined") return fallback;

  const rect = button.getBoundingClientRect();
  const margin = 12;
  const desktop = window.innerWidth >= 768;

  if (sidebar && desktop) {
    const left = Math.min(rect.right + margin, window.innerWidth - 420 - margin);
    const safeLeft = Math.max(margin, left);
    const width = Math.min(860, window.innerWidth - safeLeft - margin);
    return {
      top: 72,
      left: safeLeft,
      width: Math.max(360, width),
      maxHeight: "calc(100vh - 96px)",
    };
  }

  const width = Math.min(390, window.innerWidth - margin * 2);
  const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
  const belowTop = rect.bottom + 8;
  const maxBottom = window.innerHeight - margin;
  const estimatedHeight = Math.min(560, window.innerHeight - margin * 2);
  const top = belowTop + estimatedHeight > maxBottom
    ? Math.max(margin, maxBottom - estimatedHeight)
    : belowTop;

  return {
    top,
    left,
    width,
    maxHeight: `${Math.max(280, window.innerHeight - top - margin)}px`,
  };
}

export default function HelpDropdown({ compact = false, sidebar = false }) {
  const location = useLocation();
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ top: 72, left: 12, width: 360, maxHeight: "calc(100vh - 96px)" });
  const [selectedPath, setSelectedPath] = useState("");
  const currentTopic = useMemo(() => findTopic(location.pathname), [location.pathname]);
  const selectedTopic = HELP_TOPICS.find((topic) => topic.path === selectedPath) || currentTopic;

  useEffect(() => {
    if (!open) return undefined;
    const update = () => setPanelStyle(getPanelPosition(buttonRef.current, sidebar));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, sidebar]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const buttonClass = sidebar
    ? "flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold border border-transparent text-slate-200 hover:bg-[#1a3150] transition-all"
    : `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-600/70 bg-slate-900/55 text-xs font-black text-slate-100 shadow-sm transition hover:bg-slate-800 ${compact ? "h-10 w-10 px-0" : "px-3 py-2"}`;

  return (
    <div className={sidebar ? "relative w-full" : "relative shrink-0"}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={buttonClass}
        data-testid="help-dropdown-button"
        aria-label="Help"
        title="Help"
      >
        <HelpCircle className={sidebar ? "h-[17px] w-[17px] shrink-0 text-cyan-300" : "h-4 w-4 text-cyan-300"} />
        {(!compact || sidebar) && <span>Help</span>}
        {(!compact || sidebar) && <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-400" />}
      </button>

      {open && (
        <div
          className="fixed z-[120] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_22px_70px_rgba(15,23,42,0.22)]"
          style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width, maxHeight: panelStyle.maxHeight }}
          data-testid="help-dropdown-panel"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Need help?</p>
              <h3 className="mt-1 text-base font-black text-slate-950">Pick the page you are stuck on</h3>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-200" aria-label="Close help">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-0 overflow-y-auto md:grid-cols-[155px_1fr]" style={{ maxHeight: "calc(100% - 65px)" }}>
            <div className="border-b border-slate-100 bg-white p-2 md:border-b-0 md:border-r">
              {HELP_TOPICS.map((topic) => {
                const active = selectedTopic.path === topic.path;
                return (
                  <button
                    type="button"
                    key={topic.path}
                    onClick={() => setSelectedPath(topic.path)}
                    className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-xs font-black transition ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              <h4 className="text-lg font-black text-slate-950">{selectedTopic.title}</h4>
              <ol className="mt-3 space-y-2">
                {selectedTopic.steps.map((step, index) => (
                  <li key={step} className="flex gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Link
                to={selectedTopic.path}
                onClick={() => setOpen(false)}
                className="mt-4 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20"
              >
                Open {selectedTopic.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
