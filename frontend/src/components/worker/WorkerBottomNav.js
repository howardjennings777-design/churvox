import React from "react";
import { Briefcase, CalendarDays, MessageCircle, UserCircle2 } from "lucide-react";
import "./WorkerIphoneFix.css";

const items = [
  { key: "today", label: "Today", to: "/worker/jobs#today", icon: CalendarDays },
  { key: "jobs", label: "Jobs", to: "/worker/jobs#jobs", icon: Briefcase },
  { key: "messages", label: "Messages", to: "/worker/settings#help", icon: MessageCircle },
  { key: "profile", label: "Profile", to: "/worker/settings#top", icon: UserCircle2 },
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
    <nav className="worker-bottom-nav fixed left-3 right-3 bottom-3 z-40 rounded-[28px] border border-[rgba(15,23,42,0.12)] bg-white/95 p-2 shadow-[0_-10px_28px_rgba(2,6,23,0.18)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item.to)}
              className={`worker-bottom-nav__item flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] text-[12px] font-black transition ${
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
