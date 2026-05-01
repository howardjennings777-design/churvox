import React from "react";
import { Link } from "react-router-dom";

const assistantPrompts = [
  {
    id: "attention",
    label: "What needs attention today?",
    response:
      "Start with open jobs, unpaid invoices, open quotes, and team availability. Open Jobs first, then check Invoices and Quotes before applying any workflow changes.",
  },
  {
    id: "invoice-follow-up",
    label: "Draft invoice follow-up",
    response:
      "Draft only: Hi, just a friendly reminder this invoice is still awaiting payment. Please let us know if you want payment details resent or a copy attached.",
  },
  {
    id: "jobs-summary",
    label: "Summarise today’s jobs",
    response:
      "Use Jobs and Schedule to confirm each job has a client, address, assigned worker, and clear status. Prioritise overdue and unassigned jobs first.",
  },
  {
    id: "automations",
    label: "Suggest automations",
    response:
      "Recommended launch automations: completed job creates a draft invoice, quote follow-up draft after 3 days, unpaid invoice reminder draft, and worker status alerts.",
  },
  {
    id: "action-jobs",
    label: "Find jobs needing action",
    response:
      "Open Jobs and filter for unassigned, overdue, in progress, or missing client/address details. Resolve these first to keep the day moving smoothly.",
  },
];

const snapshotCards = [
  {
    title: "Today’s Command Centre",
    body: "Prioritise daily operations with fast access to jobs, team capacity, client communication, and financial follow-through.",
  },
  {
    title: "Core Workflows",
    body: "Move smoothly from job planning to quoting and invoicing with reliable handoffs between office and field.",
  },
  {
    title: "Approval-First Automation",
    body: "Keep critical messages and workflow changes in draft state until an approved team member confirms them.",
  },
  {
    title: "Launch Testing Ready",
    body: "Use launch checks and mobile tap testing to verify every key route is clear, responsive, and ready for the team.",
  },
];

const shortcuts = [
  ["🛠️", "Jobs", "Plan, assign, and complete work.", "/jobs"],
  ["🗓️", "Schedule", "View and organise the day.", "/schedule"],
  ["👥", "Clients", "Manage people and businesses.", "/clients"],
  ["🧾", "Quotes", "Draft and track approvals.", "/quotes"],
  ["💳", "Invoices", "Issue and monitor payments.", "/invoices"],
  ["📬", "Follow-ups", "Keep customer actions moving.", "/follow-ups"],
  ["⚙️", "Automation", "Review and tune rule flows.", "/automation"],
  ["🤝", "Team", "Access team and roles.", "/team"],
  ["🔧", "Settings", "Manage account preferences.", "/settings"],
  ["✅", "Launch Check", "Test key experiences quickly.", "/launch-check"],
];

const checklist = [
  ["Create job", "/jobs/new"],
  ["Add/open client", "/clients"],
  ["Create quote", "/quotes/new"],
  ["Create invoice", "/invoices/new"],
  ["Invite/check team", "/team"],
  ["Test mobile taps", "/launch-check"],
];

export default function SmartHubPage() {
  const [activePromptId, setActivePromptId] = React.useState(assistantPrompts[0].id);
  const [copied, setCopied] = React.useState(false);

  const activePrompt = assistantPrompts.find((prompt) => prompt.id === activePromptId) || assistantPrompts[0];

  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt.response);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 shadow-xl ring-1 ring-blue-900 md:p-7">
          <div className="grid gap-5 lg:grid-cols-3 lg:items-center">
            <div className="lg:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-100">CHURVOX COMMAND CENTRE</p>
              <h1 className="mt-2 text-4xl font-black text-white md:text-5xl">Smart Hub</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-100 md:text-lg">
                Run the day from one place: jobs, clients, quotes, invoices, team, schedule, follow-ups, automation, and AI assistance.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/jobs/new" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700">New job</Link>
                <Link to="/jobs" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100">Open jobs</Link>
                <Link to="/clients/new" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100">New client</Link>
                <Link to="/quotes/new" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100">New quote</Link>
                <Link to="/invoices/new" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100">New invoice</Link>
              </div>
            </div>

            <div className="grid gap-3">
              {["AI Assistant: On", "Default landing: Jobs", "Approval-first: Yes"].map((item) => (
                <div key={item} className="rounded-2xl border border-blue-800 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-100">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-700" aria-hidden>✦</div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950">AI Business Assistant</h2>
              <p className="mt-1 text-sm text-slate-700">Approval-first assistant guidance for daily operations, message drafting, and workflow decisions.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {assistantPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => setActivePromptId(prompt.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    activePromptId === prompt.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-900 hover:bg-blue-50"
                  }`}
                >
                  {prompt.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold text-slate-100">Assistant response</p>
              <p className="mt-3 text-sm leading-6 text-slate-100">{activePrompt.response}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={copyResponse} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                  {copied ? "Copied" : "Copy response"}
                </button>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <Link to="/jobs" className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-100 hover:border-blue-400">Jobs</Link>
                  <Link to="/invoices" className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-100 hover:border-blue-400">Invoices</Link>
                  <Link to="/quotes" className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-100 hover:border-blue-400">Quotes</Link>
                  <Link to="/automation" className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-100 hover:border-blue-400">Automation</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshotCards.map((card) => (
            <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700" aria-hidden>●</div>
              <h3 className="mt-3 text-base font-bold text-slate-950">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{card.body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">Command shortcuts</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map(([icon, title, description, href]) => (
              <Link key={title} to={href} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-700" aria-hidden>
                  {icon}
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-1 text-sm text-slate-700">{description}</p>
                <p className="mt-3 text-sm font-semibold text-blue-700">Open →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-950">Today’s operating checklist</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {checklist.map(([label, href]) => (
                <Link key={label} to={href} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-700">
                  {label}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Approval-first automation</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Draft reminders only.</li>
              <li>• No auto-send without approval.</li>
              <li>• Payroll stays manual/approved.</li>
              <li>• Accounting/MYOB changes stay manual/approved.</li>
              <li>
                • Review automation rules from {" "}
                <Link to="/automation" className="font-semibold text-blue-700">/automation</Link>.
              </li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}
