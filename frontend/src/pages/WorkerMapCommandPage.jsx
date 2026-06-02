import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import API_BASE from "../lib/apiBase";

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
    return new Date(value).toLocaleString();
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
    <main className="min-h-screen bg-[#f5f7f1] p-4 text-slate-950 md:p-6 xl:p-8">
      <header className="rounded-[32px] bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,.24)]">
        <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">Crew Map</div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black tracking-[-.075em]">Active jobs only.</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-300">
              Workers appear here only after they press Start Job. When they finish, Churvox removes them from the active map and records their timesheet.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {notice ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-900">{notice}</div> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Active crew</div>
          <div className="mt-2 text-4xl font-black">{active.length}</div>
        </div>
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">With location</div>
          <div className="mt-2 text-4xl font-black text-emerald-900">{withLocation.length}</div>
        </div>
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">No GPS yet</div>
          <div className="mt-2 text-4xl font-black text-amber-900">{noLocation.length}</div>
        </div>
        <div className="rounded-[24px] border border-blue-200 bg-blue-50 p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-blue-700">Today records</div>
          <div className="mt-2 text-4xl font-black text-blue-900">{summary?.daily?.[0]?.jobs || 0}</div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Live board</div>
              <h2 className="mt-1 text-3xl font-black tracking-[-.06em]">Workers currently on active jobs</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-black text-slate-500">Loading active crew…</div>
            ) : active.length ? active.map((item) => (
              <article key={item.timesheet_id || `${item.worker_id}-${item.job_id}`} className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black">{item.worker_name}</div>
                    <div className="mt-1 text-sm font-bold text-slate-600">{item.job_title}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">{item.client_name || "No client"} · {item.job_address || "No address"}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === "paused" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
                    {item.status === "paused" ? "Paused" : "Active"}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Started</div>
                    <div className="mt-1 text-xs font-bold text-slate-700">{fmtTime(item.started_at)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Worked so far</div>
                    <div className="mt-1 text-sm font-black">{fmtMinutes(item.net_minutes_so_far)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Last seen</div>
                    <div className="mt-1 text-xs font-bold text-slate-700">{fmtTime(item.last_seen_at)}</div>
                  </div>
                </div>

                {item.lat && item.lng ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white no-underline"
                  >
                    Open location
                  </a>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                    Worker is active, but GPS was not captured yet.
                  </div>
                )}
              </article>
            )) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div className="text-2xl font-black">No active workers right now</div>
                <p className="mt-2 text-sm font-bold text-slate-500">Workers will appear here after they press Start Job.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Timesheet summary</div>
            <h2 className="mt-1 text-2xl font-black">Daily totals</h2>
            <div className="mt-4 space-y-2">
              {(summary?.daily || []).slice(0, 7).map((day) => (
                <div key={day.date} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-black">{day.date}</span>
                  <span className="text-sm font-black text-blue-700">{day.hours}h</span>
                </div>
              ))}
              {!summary?.daily?.length ? <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No timesheet totals yet.</div> : null}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,.055)]">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">Logic</div>
            <h2 className="mt-1 text-2xl font-black">How this works</h2>
            <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-600">
              <p>Start Job makes the worker visible here.</p>
              <p>Pause and resume stay on the same timesheet.</p>
              <p>Finish Job removes the worker from the active map and creates daily/weekly hours.</p>
              <p>This is active-job tracking only, not full-day fleet tracking.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
