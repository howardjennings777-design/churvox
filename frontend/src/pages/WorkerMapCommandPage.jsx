import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"]] },
  { title: "Admin", items: [["Team", "/team", "TM"], ["Plans", "/plans", "PL"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleWorkers = [
  { id: "sample-map-1", name: "Mike", region: "Central", status: "on job", assigned_jobs_count: 2, last_lat: -41.2865, last_lng: 174.7762, last_seen: "10 min ago", current_job: "Rental cleanup" },
  { id: "sample-map-2", name: "Tane", region: "North", status: "travelling", assigned_jobs_count: 4, last_lat: -41.2229, last_lng: 174.8059, last_seen: "22 min ago", current_job: "Hedge trim" },
  { id: "sample-map-3", name: "Jo", region: "South", status: "available", assigned_jobs_count: 1, last_lat: -41.3208, last_lng: 174.7944, last_seen: "35 min ago", current_job: "Ready for next job" },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/crew-map") return pathname === "/crew-map" || pathname === "/dispatch/map";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.worker_id || record?.user_id || record?.email || record?.name || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function workerName(worker) {
  return worker?.name || worker?.full_name || worker?.display_name || worker?.email || "Unnamed worker";
}

function statusOf(worker) {
  return String(worker?.status || worker?.availability || worker?.location_status || "unknown").toLowerCase().replaceAll("_", " ");
}

function getNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function latOf(worker) {
  return getNumber(worker?.last_lat, worker?.lat, worker?.latitude, worker?.current_lat, worker?.location?.lat, worker?.location?.latitude, worker?.start_lat, worker?.job_start_lat);
}

function lngOf(worker) {
  return getNumber(worker?.last_lng, worker?.lng, worker?.lon, worker?.longitude, worker?.current_lng, worker?.current_lon, worker?.location?.lng, worker?.location?.lon, worker?.location?.longitude, worker?.start_lng, worker?.job_start_lng);
}

function workerLoad(worker) {
  return Number(worker?.assigned_jobs_count || worker?.jobs_count || worker?.open_jobs || worker?.active_jobs || 0);
}

function lastSeen(worker) {
  return worker?.last_seen || worker?.last_seen_at || worker?.updated_at || worker?.location_updated_at || "Last location not saved";
}

function currentJob(worker, jobs) {
  if (worker?.current_job) return worker.current_job;
  const name = workerName(worker).toLowerCase();
  const match = jobs.find((job) => String(job?.assigned_worker_name || job?.worker_name || "").toLowerCase() === name && ["in_progress", "started", "assigned", "working"].includes(String(job?.status || "").toLowerCase().replaceAll(" ", "_")));
  return match?.title || match?.job_title || match?.service_type || "No active job matched";
}

function mapPosition(worker, index) {
  const lat = latOf(worker);
  const lng = lngOf(worker);
  if (lat !== null && lng !== null) {
    const minLat = -47.4;
    const maxLat = -34.1;
    const minLng = 166.0;
    const maxLng = 179.2;
    const x = Math.max(6, Math.min(94, ((lng - minLng) / (maxLng - minLng)) * 100));
    const y = Math.max(8, Math.min(92, ((maxLat - lat) / (maxLat - minLat)) * 100));
    return { left: `${x}%`, top: `${y}%`, real: true };
  }
  const fallback = [
    { left: "42%", top: "45%" },
    { left: "58%", top: "38%" },
    { left: "48%", top: "57%" },
    { left: "64%", top: "52%" },
    { left: "36%", top: "60%" },
  ];
  return { ...fallback[index % fallback.length], real: false };
}

function statusClass(status) {
  if (status.includes("available") || status.includes("online") || status.includes("ready")) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status.includes("job") || status.includes("working") || status.includes("busy") || status.includes("progress")) return "border-blue-200 bg-blue-50 text-blue-800";
  if (status.includes("travel") || status.includes("route")) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function mapsLink(worker) {
  const lat = latOf(worker);
  const lng = lngOf(worker);
  if (lat === null || lng === null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
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

function WorkerCard({ worker, jobs, active, onSelect }) {
  const status = statusOf(worker);
  const link = mapsLink(worker);
  return (
    <button type="button" onClick={() => onSelect(worker)} className={`w-full rounded-[22px] border p-4 text-left transition ${active ? "border-cyan-300 bg-cyan-50 shadow-[0_16px_38px_rgba(8,145,178,0.16)]" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-black text-slate-950">{workerName(worker)}</div>
          <div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{worker?.region || worker?.area || "No region"}</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(status)}`}>{status}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
        <div>{currentJob(worker, jobs)}</div>
        <div className="text-slate-500">{workerLoad(worker)} open jobs · {lastSeen(worker)}</div>
        <div className="text-slate-400">{latOf(worker) !== null ? "Location saved" : "Waiting for worker check-in/location capture"}</div>
      </div>
      {link ? <a href={link} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-50">Open in maps</a> : null}
    </button>
  );
}

function WorkerMapContent() {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [workersRes, jobsRes] = await Promise.all([get("/team/workers"), get("/jobs")]);
      if (!alive) return;
      if (workersRes?.success) setWorkers(arr(workersRes)); else { setWorkers([]); setError(workersRes?.error || "Could not load workers"); }
      if (jobsRes?.success) setJobs(arr(jobsRes)); else setJobs([]);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [get]);

  const workerList = workers.length ? workers : sampleWorkers;
  const jobList = jobs;
  const selected = workerList.find((worker) => idOf(worker) === selectedId) || workerList[0];
  const selectedKey = selected ? idOf(selected) : "";

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 xl:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-cyan-300/20 bg-[#143658] px-5 py-4 text-white shadow-[0_16px_38px_rgba(12,33,57,0.16)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Crew Map</div><div className="text-sm font-bold text-slate-100">Last known worker location, active job context and quick map links.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/dispatch" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Dispatch</Link><Link to="/team" className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Team</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-slate-900 bg-[#143658] shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <iframe title="Crew map" className="absolute inset-0 h-full w-full opacity-75 mix-blend-screen" src="https://www.openstreetmap.org/export/embed.html?bbox=166.0%2C-47.4%2C179.2%2C-34.1&layer=mapnik" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#143658]/50 via-transparent to-[#07111f]/60" />
              <div className="absolute left-5 top-5 z-10 rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 text-white backdrop-blur">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Map view</div>
                <div className="mt-1 text-sm font-bold text-slate-200">Pins use saved/check-in locations. This is not all-day live tracking.</div>
              </div>
              {workerList.map((worker, index) => {
                const pos = mapPosition(worker, index);
                const key = idOf(worker) || workerName(worker);
                const active = key === selectedKey;
                return (
                  <button key={key} type="button" onClick={() => setSelectedId(key)} style={{ left: pos.left, top: pos.top }} className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 shadow-[0_18px_48px_rgba(2,6,23,0.30)] transition ${active ? "h-12 w-12 border-cyan-200 bg-cyan-300 text-slate-950" : "h-10 w-10 border-white bg-emerald-400 text-slate-950"}`} title={workerName(worker)}>
                    <span className="text-xs font-black">{workerName(worker).slice(0, 2).toUpperCase()}</span>
                  </button>
                );
              })}
              {selected ? (
                <div className="absolute bottom-5 left-5 right-5 z-10 rounded-[24px] border border-white/15 bg-slate-950/80 p-4 text-white backdrop-blur md:right-auto md:w-[420px]">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Selected worker</div>
                  <div className="mt-2 text-2xl font-black tracking-[-0.04em]">{workerName(selected)}</div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-slate-300">{currentJob(selected, jobList)} · {selected?.region || selected?.area || "No region"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">{statusOf(selected)}</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">{lastSeen(selected)}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="flex items-start justify-between gap-4">
                <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Workers</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Crew on the side</h2></div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{workerList.length}</span>
              </div>
              {loading ? <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-black text-slate-600">Loading crew…</div> : null}
              {error ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-800">Showing sample map layout until live worker data is available.</div> : null}
              <div className="mt-5 space-y-3">
                {workerList.map((worker) => {
                  const key = idOf(worker) || workerName(worker);
                  return <WorkerCard key={key} worker={worker} jobs={jobList} active={key === selectedKey} onSelect={(w) => setSelectedId(idOf(w) || workerName(w))} />;
                })}
              </div>
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}

export default function WorkerMapCommandPage() {
  if (typeof document === "undefined") return <WorkerMapContent />;
  return createPortal(<WorkerMapContent />, document.body);
}
