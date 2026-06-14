import React from "react";
import { useLocation } from "react-router-dom";
import API_BASE from "../../lib/apiBase";

const PLAN_BUCKETS = ["Start", "Crew", "Operator", "Command", "No plan", "Other"];

function token() {
  try { return window.localStorage.getItem("token") || ""; } catch { return ""; }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function planName(user) {
  const raw = String(user?.plan || user?.subscription_plan || user?.plan_type || "").toLowerCase();
  const labels = {
    solo: "Start",
    start: "Start",
    team: "Crew",
    crew: "Crew",
    pro: "Operator",
    operator: "Operator",
    enterprise: "Command",
    command: "Command",
    none: "No plan",
    "": "No plan",
  };
  return labels[raw] || "Other";
}

export default function HQPlanMixFloating() {
  const location = useLocation();
  const [open, setOpen] = React.useState(true);
  const [counts, setCounts] = React.useState({});
  const isHQ = ["/admin", "/owner/dashboard", "/platform-dashboard", "/app-owner"].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

  React.useEffect(() => {
    if (!isHQ) return undefined;
    let alive = true;
    async function loadPlanCounts() {
      try {
        const res = await fetch(`${API_BASE}/api/admin/owner-overview`, {
          credentials: "include",
          headers: { Accept: "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        });
        const body = await res.json().catch(() => ({}));
        if (!alive || !res.ok) return;
        const users = asArray(body?.lists?.all_users || body?.lists?.users);
        const next = PLAN_BUCKETS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
        if (users.length) {
          users.forEach((user) => { next[planName(user)] = Number(next[planName(user)] || 0) + 1; });
        } else {
          Object.entries(body?.metrics?.plan_counts || {}).forEach(([label, value]) => {
            const key = label === "Choose plan" ? "No plan" : PLAN_BUCKETS.includes(label) ? label : "Other";
            next[key] = Number(next[key] || 0) + Number(value || 0);
          });
        }
        setCounts(next);
      } catch {
        // Keep HQ usable even if this panel cannot load.
      }
    }
    loadPlanCounts();
    const timer = window.setInterval(loadPlanCounts, 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [isHQ, location.pathname]);

  if (!isHQ) return null;

  const total = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <aside className="fixed bottom-5 left-5 z-[9998] w-[min(380px,calc(100vw-40px))] rounded-[26px] border border-orange-500/30 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-left">
          <span className="block text-xs font-black uppercase tracking-[0.16em] text-orange-200">HQ plan split</span>
          <b className="text-lg font-black">{total} users by plan</b>
        </button>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200">
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <div className="mt-3 grid gap-2">
          {PLAN_BUCKETS.map((label) => {
            const count = Number(counts[label] || 0);
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="flex justify-between gap-3 text-sm font-black">
                  <span>{label}</span>
                  <span className="text-orange-200">{count}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <i className="block h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
