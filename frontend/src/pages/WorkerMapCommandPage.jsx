import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import API_BASE from "../lib/apiBase";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Assign Jobs", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Map", "/crew-map", "MP"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Plans", "/plans", "PL"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
}

async function apiGet(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE || ""}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}

function fmtTime(value) {
  if (!value) return "Not recorded";
  try {
    return new Date(value).toLocaleString("en-NZ");
  } catch {
    return String(value);
  }
}

function fmtMinutes(value) {
  const minutes = Number(value || 0);
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div>
        </div>
      </div>

      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function StatCard({ label, value, tone }) {
  const styles = {
    dark: "border-slate-800 bg-[#0f1722] text-white",
    cyan: "border-cyan-400/30 bg-[#102a3a] text-cyan-100",
    amber: "border-amber-400/35 bg-[#2b2115] text-amber-100",
    green: "border-emerald-400/30 bg-[#102d27] text-emerald-100",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(15,23,42,0.14)] ${styles[tone] || styles.dark}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em]">{value}</div>
    </div>
  );
}

export default function WorkerMapCommandPage() {
  const [active, setActive] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const [mapData, timeData] = await Promise.all([
        apiGet("/crew-map/active"),
        apiGet("/timesheets/summary").catch(() => null),
      ]);
      setActive(mapData?.active_workers || mapData?.data || []);
      setSummary(timeData || null);
    } catch (err) {
      setNotice(err?.message || "Could not load Crew Map");
      toast.error("Could not load Crew Map");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const withLocation = useMemo(() => active.filter((x) => x.lat && x.lng), [active]);
  const noLocation = useMemo(() => active.filter((x) => !x.lat || !x.lng), [active]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                    Active crew map
                  </span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">
                    See who is working right now.
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
                    Crew appear on the map only after they start a job. When they finish, Churvox removes them and saves the timesheet.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button onClick={load} disabled={loading} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200 disabled:opacity-60">
                      {loading ? "Refreshing…" : "Refresh map"}
                    </button>
                    <Link to="/jobs" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                      View jobs
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Tracking rule</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">Active jobs only.</h2>
              <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-black leading-6 text-amber-50">
                This is active-job tracking only, not full-day fleet tracking.
              </div>
              <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-300">
                <p>Start Job makes the worker visible here.</p>
                <p>Finish Job removes the worker from the map and saves daily hours.</p>
              </div>
            </aside>
          </section>

          {notice ? <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-black text-amber-900">{notice}</div> : null}

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <StatCard label="Working now" value={active.length} tone="dark" />
            <StatCard label="Location captured" value={withLocation.length} tone="green" />
            <StatCard label="Waiting for location" value={noLocation.length} tone="amber" />
            <StatCard label="Timesheets today" value={summary?.daily?.[0]?.jobs || 0} tone="cyan" />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="rounded-[32px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Live board</div>
                  <h2 className="mt-1 text-3xl font-black tracking-[-.06em] text-white">Crew working now</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {loading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-sm font-black text-slate-300">Loading active crew…</div>
                ) : active.length ? active.map((item) => (
                  <article key={item.timesheet_id || `${item.worker_id}-${item.job_id}`} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-white">{item.worker_name || "Worker"}</div>
                        <div className="mt-1 text-sm font-bold text-slate-200">{item.job_title || "Active job"}</div>
                        <div className="mt-1 text-xs font-bold text-slate-300/80">{item.client_name || "No client linked"} · {item.job_address || "No address saved"}</div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${item.status === "paused" ? "border-amber-300/40 bg-amber-300/15 text-amber-100" : "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"}`}>
                        {item.status === "paused" ? "Paused" : "Working"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <div className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-100/70">Started</div>
                        <div className="mt-1 text-xs font-bold text-slate-200">{fmtTime(item.started_at)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <div className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-100/70">Worked so far</div>
                        <div className="mt-1 text-sm font-black text-white">{fmtMinutes(item.net_minutes_so_far)}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <div className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-100/70">Last seen</div>
                        <div className="mt-1 text-xs font-bold text-slate-200">{fmtTime(item.last_seen_at)}</div>
                      </div>
                    </div>

                    {item.lat && item.lng ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 no-underline shadow-lg shadow-cyan-300/20 hover:bg-cyan-200"
                      >
                        Open location
                      </a>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
                        Worker is active, but GPS has not been captured yet.
                      </div>
                    )}
                  </article>
                )) : (
                  <div className="rounded-[24px] border border-dashed border-cyan-300/25 bg-white/[0.035] p-8 text-center">
                    <div className="text-2xl font-black text-white">No active workers right now</div>
                    <p className="mt-2 text-sm font-bold text-slate-300">Workers appear here after they start a job.</p>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[32px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Timesheet summary</div>
                <h2 className="mt-1 text-2xl font-black text-white">Daily totals</h2>
                <div className="mt-4 space-y-2">
                  {(summary?.daily || []).slice(0, 7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                      <span className="text-sm font-black text-white">{day.date}</span>
                      <span className="text-sm font-black text-cyan-100">{day.hours}h</span>
                    </div>
                  ))}
                  {!summary?.daily?.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-300">No timesheet totals yet.</div> : null}
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">How this works</div>
                <h2 className="mt-1 text-2xl font-black text-white">Respectful job tracking</h2>
                <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-300">
                  <p>Workers appear here after they start a job.</p>
                  <p>Pause and resume stay on the same timesheet.</p>
                  <p>Finish Job removes the worker from the active map and creates daily/weekly hours.</p>
                  <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-amber-50">This is active-job tracking only, not full-day fleet tracking.</p>
                </div>
              </div>
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}
