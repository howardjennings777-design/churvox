import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, CalendarDays, HelpCircle, Settings } from "lucide-react";

const items = [
  { key: "today", label: "Today", to: "/worker/jobs", icon: CalendarDays },
  { key: "jobs", label: "Jobs", to: "/worker/jobs", icon: Briefcase },
  { key: "help", label: "Help", to: "/worker/settings#help", icon: HelpCircle },
  { key: "settings", label: "Settings", to: "/worker/settings", icon: Settings },
];

export default function WorkerBottomNav({ active = "today" }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d8e3f3] bg-white/95 backdrop-blur-xl shadow-[0_-12px_32px_rgba(13,27,52,0.08)]">
      <div className="mx-auto grid max-w-2xl grid-cols-4 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
                isActive
                  ? "bg-[#eff6ff] text-[#1d4ed8] shadow-sm"
                  : "text-[#64748b] hover:bg-[#f6faff] hover:text-[#0d1b34]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
