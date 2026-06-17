import React from "react";
import { Briefcase, CalendarDays, HelpCircle, Settings } from "lucide-react";

const items = [
  { key: "today", label: "Today", to: "/worker/jobs#today", icon: CalendarDays },
  { key: "jobs", label: "Jobs", to: "/worker/jobs#jobs", icon: Briefcase },
  { key: "help", label: "Help", to: "/worker/settings#help", icon: HelpCircle },
  { key: "settings", label: "Settings", to: "/worker/settings#top", icon: Settings },
];

function go(to) {
  if (typeof window === "undefined") return;
  const url = new URL(to, window.location.origin);
  const samePage = window.location.pathname === url.pathname;

  if (samePage) {
    window.history.replaceState(null, "", `${url.pathname}${url.hash}`);
    setTimeout(() => {
      const target = url.hash ? document.querySelector(url.hash) : null;
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 40);
    return;
  }

  window.location.assign(`${url.pathname}${url.hash}`);
}

export default function WorkerBottomNav({ active = "today" }) {
  return (
    <nav className="worker-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--cx-border)] bg-[rgba(17,21,27,0.95)] backdrop-blur-xl shadow-[0_-12px_32px_rgba(0,0,0,0.5)]">
      <div className="mx-auto grid max-w-2xl grid-cols-4 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item.to)}
              className={`worker-bottom-nav__item flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
                isActive
                  ? "bg-[var(--cx-accent-soft)] text-[var(--cx-accent)] shadow-sm"
                  : "text-[var(--cx-muted)] hover:bg-[var(--cx-surface-2)] hover:text-[var(--cx-text)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
