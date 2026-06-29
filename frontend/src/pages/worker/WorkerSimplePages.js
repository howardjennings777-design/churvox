import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, Briefcase, HelpCircle, LogOut, MapPin, Navigation, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import "./WorkerSimplePages.css";

const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
const rows = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.items) ? v.items : Array.isArray(v?.results) ? v.results : Array.isArray(v?.data?.jobs) ? v.data.jobs : [];
const oid = (v) => !v ? "" : typeof v === "string" || typeof v === "number" ? String(v) : typeof v === "object" ? oid(v.$oid || v.oid || v.id || v._id || v.job_id || "") : "";
const idOf = (j) => oid(j?.id || j?._id || j?.job_id || j?.uuid);
const titleOf = (j) => clean(j?.title || j?.job_name || j?.job_title || j?.service_type || j?.description || "Job");
const clientOf = (j) => clean(j?.client_name || j?.customer_name || j?.client || j?.customer || "Customer");
const addressOf = (j) => clean(j?.address || j?.site_address || j?.service_address || j?.job_address || j?.location || "");
const notesOf = (j) => clean(j?.worker_instructions || j?.instructions || j?.description || j?.notes || "No special instructions.");
const statusOf = (j) => clean(j?.status || j?.job_status || j?.workflow_status || "assigned").toLowerCase().replaceAll(" ", "_");
const dateOf = (j) => clean(j?.scheduled_date || j?.date || j?.start || j?.due_date).slice(0, 10);
const timeOf = (j) => clean(j?.scheduled_time || j?.time || j?.start_time || "");
const done = (j) => /complete|completed|done|finished|cancelled|archived/.test(statusOf(j));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const directions = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;

async function position() {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
  ));
}

function useJobs() {
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const res = await get("/jobs");
      setJobs(rows(res?.data || res).filter((j) => idOf(j)).sort((a, b) => `${dateOf(a) || "9999"} ${timeOf(a) || "99"}`.localeCompare(`${dateOf(b) || "9999"} ${timeOf(b) || "99"}`)));
    } catch (e) { setError("Could not load jobs"); setJobs([]); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { jobs, loading, error, reload: load };
}

async function beacon(post, job, state, source) {
  const loc = await position();
  const address = addressOf(job);
  const payload = {
    state,
    source,
    job_id: job ? idOf(job) : "",
    job_title: job ? titleOf(job) : "Shift clock",
    address,
    location: address,
    latitude: loc?.latitude ?? null,
    longitude: loc?.longitude ?? null,
    accuracy: loc?.accuracy ?? null,
  };
  try { await post("/onsite/worker-beacon", payload); return true; }
  catch { try { await post("/worker/gps/status", payload); } catch {} return false; }
}

function Shell({ active, title, subtitle, children }) {
  return <main className="simpleWorkerApp">
    <section className="swHero"><span>{active}</span><h1>{title}</h1><p>{subtitle}</p></section>
    <section className="swBody">{children}</section>
    <nav className="swNav">{[["Today","/worker/today"],["Jobs","/worker/jobs"],["Proof","/worker/ops"],["Help","/worker/help"],["Me","/worker/settings"]].map(([l,h]) => <Link key={l} className={l === active ? "active" : ""} to={h}>{l}</Link>)}</nav>
  </main>;
}

function JobCard({ job, label = "Open job" }) {
  const address = addressOf(job);
  return <article className="swCard swJob"><span>{dateOf(job) === today() ? timeOf(job) || "Today" : dateOf(job) || "Ready"}</span><h2>{titleOf(job)}</h2><p>{clientOf(job)}</p>{address ? <small><MapPin size={15} /> {address}</small> : <small><AlertTriangle size={15} /> No address</small>}<Link className="swPrimary" to={`/worker/jobs/${idOf(job)}`}>{label}</Link></article>;
}

export function SimpleToday() {
  const { user } = useAuth();
  const { post } = useApi();
  const { jobs, loading, error, reload } = useJobs();
  const [on, setOn] = useState(() => localStorage.getItem("churvox-worker-clocked-in") === "1");
  const [busy, setBusy] = useState(false);
  const next = useMemo(() => jobs.filter((j) => !done(j)).find((j) => dateOf(j) === today()) || jobs.filter((j) => !done(j))[0] || null, [jobs]);
  async function toggle() { setBusy(true); await beacon(post, next, on ? "stop" : "start", on ? "stop-day" : "start-day"); localStorage.setItem("churvox-worker-clocked-in", on ? "0" : "1"); setOn(!on); setBusy(false); toast.success(on ? "Day stopped" : "Day started"); }
  return <Shell active="Today" title={`Hi ${clean(user?.name || user?.email || "there").split(/[ @]/)[0]}`} subtitle="Start day. Open next job."><button className={`swBig ${on ? "stop" : ""}`} disabled={busy} onClick={toggle}>{busy ? "Saving…" : on ? "Stop day" : "Start day"}</button>{loading ? <section className="swEmpty"><RefreshCw className="spin" /> Loading…</section> : null}{error ? <section className="swEmpty danger"><AlertTriangle /> {error}<button onClick={reload}>Retry</button></section> : null}{!loading && next ? <JobCard job={next} label="Open next job" /> : null}{!loading && !next ? <section className="swEmpty"><Briefcase /> No job ready.</section> : null}</Shell>;
}

export function SimpleJobs() {
  const { jobs, loading, error, reload } = useJobs();
  const visible = jobs.filter((j) => !done(j));
  return <Shell active="Jobs" title="Jobs" subtitle="Open one job."><button className="swLight" onClick={reload}><RefreshCw size={16} /> Refresh</button>{loading ? <section className="swEmpty"><RefreshCw className="spin" /> Loading…</section> : null}{error ? <section className="swEmpty danger"><AlertTriangle /> {error}</section> : null}{visible.map((j) => <JobCard key={idOf(j)} job={j} />)}{!loading && !visible.length ? <section className="swEmpty"><Briefcase /> No jobs ready.</section> : null}</Shell>;
}

export function SimpleJob() {
  const { id } = useParams();
  const { get, post, patch } = useApi();
  const [job, setJob] = useState(null); const [loading, setLoading] = useState(true); const [started, setStarted] = useState(false); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { setLoading(true); let found = null; try { const r = await get(`/jobs/${encodeURIComponent(id)}`); found = r?.data?.job || r?.data?.data || r?.data || null; } catch {} if (!found || !idOf(found)) { try { const r = await get("/jobs"); found = rows(r?.data || r).find((j) => idOf(j) === String(id)); } catch {} } setJob(found || null); setStarted(/progress|started/.test(statusOf(found || {}))); setNote(clean(found?.worker_notes || "")); setLoading(false); })(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function act() { if (!job) return; setBusy(true); const finish = started; await beacon(post, job, finish ? "stop" : "start", finish ? "finish-job" : "start-job"); try { await patch(`/worker/jobs/${encodeURIComponent(id)}/field-update`, { status: finish ? "completed" : "in_progress", worker_status: finish ? "completed" : "started", worker_notes: note }); } catch {} setBusy(false); if (finish) { toast.success("Job sent"); window.location.assign("/worker/jobs"); } else { setStarted(true); toast.success("Job started"); } }
  if (loading) return <Shell active="Jobs" title="Loading" subtitle="Getting job."><section className="swEmpty"><RefreshCw className="spin" /> Loading…</section></Shell>;
  if (!job) return <Shell active="Jobs" title="Not found" subtitle="Could not open job."><Link className="swPrimary" to="/worker/jobs">Back to jobs</Link></Shell>;
  const address = addressOf(job);
  return <Shell active="Jobs" title={titleOf(job)} subtitle={clientOf(job)}><section className="swCard"><span>Where</span><h2>{address || "No address"}</h2>{address ? <a className="swPrimary" href={directions(address)} target="_blank" rel="noreferrer"><Navigation size={16} /> Directions</a> : null}</section><section className="swCard"><span>Do this</span><p>{notesOf(job)}</p></section><section className="swCard"><span>Note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for boss…" /></section><button className={`swBig ${started ? "finish" : ""}`} disabled={busy} onClick={act}>{busy ? "Saving…" : started ? "Finish job" : "Start job"}</button></Shell>;
}

export function SimpleProof() { const { jobs, loading } = useJobs(); const job = jobs.filter((j) => !done(j))[0]; return <Shell active="Proof" title="Proof" subtitle="Open the job to add proof.">{loading ? <section className="swEmpty"><RefreshCw className="spin" /> Loading…</section> : null}{!loading && job ? <JobCard job={job} label="Open job" /> : <section className="swEmpty"><Briefcase /> No job ready.</section>}</Shell>; }
export function SimpleHelp() { return <Shell active="Help" title="Help" subtitle="Keep it simple."><section className="swCard"><HelpCircle /><h2>Need help?</h2><p>Open the job, write the problem in the note, then finish/send it. For urgent problems, call the boss.</p></section><Link className="swPrimary" to="/worker/jobs">Open jobs</Link></Shell>; }
export function SimpleMe() { const { user, logout } = useAuth(); return <Shell active="Me" title="Me" subtitle="Profile."><section className="swCard"><UserRound /><h2>{clean(user?.name || user?.email || "Worker")}</h2><p>{clean(user?.email)}</p></section><button className="swPrimary danger" onClick={logout}><LogOut size={16} /> Log out</button></Shell>; }
export default function WorkerSimpleRoute() { const location = useLocation(); if (location.pathname === "/worker/jobs") return <SimpleJobs />; if (location.pathname === "/worker/ops") return <SimpleProof />; if (location.pathname === "/worker/help") return <SimpleHelp />; if (location.pathname === "/worker/settings") return <SimpleMe />; return <SimpleToday />; }
