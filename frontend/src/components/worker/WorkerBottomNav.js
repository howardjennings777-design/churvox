import React from "react";
import { Briefcase, CalendarDays, Camera, MessageCircle, UserCircle2 } from "lucide-react";
// removed broken css import

const items = [
  { key: "today", label: "Today", to: "/worker/today", icon: CalendarDays },
  { key: "jobs", label: "Jobs", to: "/worker/jobs", icon: Briefcase },
  { key: "proof", label: "Proof", to: "/worker/ops", icon: Camera },
  { key: "messages", label: "Help", to: "/worker/help", icon: MessageCircle },
  { key: "profile", label: "Me", to: "/worker/settings", icon: UserCircle2 },
];

function go(to) {
  if (typeof window === "undefined") return;
  window.location.assign(to);
}

export default function WorkerBottomNav({ active = "today" }) {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const activeKey = path === "/worker/today" ? "today" : path === "/worker/jobs" ? "jobs" : path === "/worker/ops" ? "proof" : path === "/worker/help" ? "messages" : path === "/worker/settings" ? "profile" : active;
  return (
    <nav className="worker-bottom-nav fixed left-3 right-3 bottom-3 z-40 rounded-[28px] border border-[rgba(15,23,42,0.12)] bg-white/95 p-2 shadow-[0_-10px_28px_rgba(2,6,23,0.18)] backdrop-blur-xl" aria-label="Worker app navigation">
      <div className="mx-auto grid max-w-2xl grid-cols-5 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item.to)}
              data-worker-nav-key={item.key === "messages" ? "help" : item.key === "profile" ? "me" : item.key}
              aria-current={isActive ? "page" : undefined}
              className={`worker-bottom-nav__item flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] font-black transition ${
                isActive
                  ? "bg-[#111827] text-white shadow-sm"
                  : "bg-[#f8fafc] text-[#111827] hover:bg-[#fff7ed]"
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
