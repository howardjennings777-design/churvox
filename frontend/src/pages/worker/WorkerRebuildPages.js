import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, Briefcase, CheckCircle2, Clock3, HelpCircle, LogOut, MapPin, Navigation, RefreshCw, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import "./WorkerRebuildPages.css";

function listFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data?.jobs)) return value.data.jobs;
  return [];
}

function oid(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return oid(value.$oid || value.oid || value.id || value._id || value.job_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function idOf(job) { return oid(job?.id || job?._id || job?.job_id || job?.uuid); }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function titleOf(job) { return clean(job?.title || job?.job_name || job?.job_title || job?.service_type || job?.description || "Job"); }
function clientOf(job) { return clean(job?.client_name || job?.customer_name || job?.client || job?.customer || "Customer"); }
function addressOf(job) { return clean(job?.address || job?.site_address || job?.service_address || job?.job_address || job?.location || ""); }
function statusOf(job) { return clean(job?.status || job?.job_status || job?.workflow_status || "assigned").toLowerCase().replaceAll(" ", "_"); }
function timeOf(job) { return clean(job?.scheduled_time || job?.time || job?.start_time || ""); }
function dateOf(job) { return clean(job?.scheduled_date || job?.date || job?.start || job?.due_date).slice(0, 10); }
function isDone(job) { return /complete|completed|done|finished|cancelled|archived/.test(statusOf(job)); }
function isActive(job) { return /started|in_progress|active|on_my_way/.test(statusOf(job)); }
function firstName(user) { return clean(user?.name || user?.full_name || user?.display_name || user?.email || "Worker").split(/[ @]/)[0] || "Worker"; }
function todayKey() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function sortJob(a, b) { return `${dateOf(a) || "9999"} ${timeOf(a) || "99:99"}`.localeCompare(`${dateOf(b) || "9999"} ${timeOf(b) || "99:99"}`); }

async function getPosition() {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 45000 },
    );
  });
}

function beaconPayload({ state = "start", job = null, location = null, source = "worker-rebuild" }) {
  const address = clean(location?.address_label || location?.display_name || addressOf(job));
  return {
    state,
    source,
    job_id: job ? idOf(job) : "",
    job_title: job ? titleOf(job) : "Shift clock",
    location: address,
    address,
    latitude: location?.latitude ?? location?.lat ?? null,
    longitude: location?.longitude ?? location?.lng ?? null,
    accuracy: location?.accuracy ?? null,
    live_status: state === "stop" ? "Clocked out" : "Clocked in",
    clock_status: state === "stop" ? "clocked_out" : "clocked_in",
  };
}

async function sendBeacon(post, options) {
  const payload = beaconPayload(options);
  try {
    await post("/onsite/worker-beacon", payload);
    return true;
  } catch {
    try { await post("/worker/gps/status", payload); } catch {}
    return false;
  }
}

function directionsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;
}

function useWorkerJobs() {
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await get("/jobs");
      if (res?.success === false) throw new Error(res?.error || "Could not load jobs");
      setJobs(listFrom(res?.data || res).filter((job) => idOf(job)).sort(sortJob));
    } catch (err) {
      setError(err?.message || "Could not load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { jobs, loading, error, reload: load };
}

function WorkerShell({ active, title, subtitle, children }) {
  return <main className="workerRebuild">
    <section className="wrHero">
      <span>{active}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
    <section className="wrBody">{children}</section>
    <WorkerNav active={active} />
  </main>;
}

function WorkerNav({ active }) {
  const items = [
    ["Today", "/worker/today"],
    ["Jobs", "/worker/jobs"],
    ["Proof", "/worker/ops"],
    ["Help", "/worker/help"],
    ["Me", "/worker/settings"],
  ];
  return <nav className="wrNav" aria-label="Worker navigation">
    {items.map(([label, href]) => <Link key={label} className={label === active ? "active" : ""} to={href}>{label}</Link>)}
  </nav>;
}

function JobMini({ job, cta = "Open job" }) {
  const address = addressOf(job);
  return <article className={`wrJob ${isActive(job) ? "active" : ""}`}>
    <div>
      <span>{isActive(job) ? "Active" : dateOf(job) === todayKey() ? (timeOf(job) || "Today") : (dateOf(job) || "Ready")}</span>
      <h2>{titleOf(job)}</h2>
      <p>{clientOf(job)}</p>
      {address ? <small><MapPin size={15} /> {address}</small> : <small><AlertTriangle size={15} /> No address on job</small>}
    </div>
    <div className="wrActions">
      <Link to={`/worker/jobs/${idOf(job)}`}>{cta}</Link>
      {address ? <a href={directionsUrl(address)} target="_blank" rel="noreferrer"><Navigation size={15} /> Directions</a> : null}
    </div>
  </article>;
}

export function WorkerTodayPage() {
  const { user, logout } = useAuth();
  const { post } = useApi();
  const { jobs, loading, error, reload } = useWorkerJobs();
  const [clockedIn, setClockedIn] = useState(() => localStorage.getItem("churvox-worker-clocked-in") === "1");
  const [busy, setBusy] = useState(false);
  const liveJobs = useMemo(() => jobs.filter((job) => !isDone(job)), [jobs]);
  const nextJob = liveJobs.find((job) => dateOf(job) === todayKey()) || liveJobs[0] || null;

  async function clock(state) {
    setBusy(true);
    const location = await getPosition();
    const ok = await sendBeacon(post, { state, location, job: nextJob, source: state === "stop" ? "worker-clock-out-rebuild" : "worker-clock-in-rebuild" });
    setClockedIn(state !== "stop");
    localStorage.setItem("churvox-worker-clocked-in", state !== "stop" ? "1" : "0");
    setBusy(false);
    toast[ok ? "success" : "info"](state === "stop" ? "Clocked out" : "Clocked in — Onsite updated");
  }

  async function gpsCheck() {
    setBusy(true);
    const location = await getPosition();
    const ok = await sendBeacon(post, { state: "start", location, job: nextJob, source: "worker-gps-check-rebuild" });
    setBusy(false);
    toast[ok ? "success" : "info"](location ? "GPS sent to Onsite" : "Job address sent to Onsite");
  }

  return <WorkerShell active="Today" title={`Morning, ${firstName(user)}`} subtitle="Clock in, open the next job, then move on. Nothing else.">
    <section className="wrClock">
      <div><span>Clock</span><b>{clockedIn ? "Clocked in" : "Off"}</b><p>{clockedIn ? "Onsite gets your live location or job address." : "Clock in when work starts."}</p></div>
      <button disabled={busy} onClick={() => clock(clockedIn ? "stop" : "start")}>{busy ? "Saving…" : clockedIn ? "Clock out" : "Clock in"}</button>
      <button disabled={busy} className="ghost" onClick={gpsCheck}>GPS check</button>
    </section>
    {loading ? <section className="wrEmpty"><RefreshCw className="spin" /> Loading your next job…</section> : null}
    {error ? <section className="wrEmpty danger"><AlertTriangle /> {error}<button onClick={reload}>Retry</button></section> : null}
    {!loading && nextJob ? <JobMini job={nextJob} cta="Open next job" /> : null}
    {!loading && !nextJob ? <section className="wrEmpty"><Briefcase /> No ready job assigned. Message the boss if you expected work.</section> : null}
    <button className="wrLogout" onClick={logout}><LogOut size={16} /> Log out</button>
  </WorkerShell>;
}

export function WorkerJobsPage() {
  const { jobs, loading, error, reload } = useWorkerJobs();
  const visible = jobs.filter((job) => !isDone(job));
  return <WorkerShell active="Jobs" title="Jobs only" subtitle="Open one job. Do not mix proof, payroll, or admin here.">
    <button className="wrRefresh" onClick={reload}><RefreshCw size={16} /> Refresh</button>
    {loading ? <section className="wrEmpty"><RefreshCw className="spin" /> Loading jobs…</section> : null}
    {error ? <section className="wrEmpty danger"><AlertTriangle /> {error}</section> : null}
    {visible.map((job) => <JobMini key={idOf(job)} job={job} />)}
    {!loading && !visible.length ? <section className="wrEmpty"><Briefcase /> No jobs ready.</section> : null}
  </WorkerShell>;
}

export function WorkerJobDetailPage() {
  const { id } = useParams();
  const { get, post, patch } = useApi();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      let found = null;
      try {
        const direct = await get(`/jobs/${encodeURIComponent(id)}`);
        found = direct?.data?.job || direct?.data?.data?.job || direct?.data?.data || direct?.data || null;
      } catch {}
      if (!found || !idOf(found)) {
        const res = await get("/jobs");
        found = listFrom(res?.data || res).find((item) => idOf(item) === String(id));
      }
      setJob(found || null);
      setNote(clean(found?.worker_notes || found?.notes || ""));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function mark(state) {
    if (!job) return;
    setBusy(true);
    const location = await getPosition();
    await sendBeacon(post, { state: state === "stop" ? "stop" : "start", location, job, source: `worker-job-${state}-rebuild` });
    try { await patch(`/worker/jobs/${encodeURIComponent(id)}/field-update`, { worker_status: state, job_status: state, status: state === "started" ? "in_progress" : state, worker_notes: note }); } catch {}
    setBusy(false);
    toast.success(state === "stop" ? "Sent to owner" : `${state.replaceAll("_", " ")} sent to Onsite`);
    if (state === "stop") window.location.assign("/worker/jobs");
  }

  if (loading) return <WorkerShell active="Jobs" title="Loading job" subtitle="Getting job details…"><section className="wrEmpty"><RefreshCw className="spin" /> Loading…</section></WorkerShell>;
  if (!job) return <WorkerShell active="Jobs" title="Job not found" subtitle="This job could not be opened."><Link className="wrPrimary" to="/worker/jobs">Back to jobs</Link></WorkerShell>;
  const address = addressOf(job);
  return <WorkerShell active="Jobs" title={titleOf(job)} subtitle={`${clientOf(job)} · ${dateOf(job) || "No date"} ${timeOf(job) || ""}`}>
    <section className="wrCard">
      <span>Address</span>
      <h2>{address || "No address"}</h2>
      {address ? <a className="wrPrimary" href={directionsUrl(address)} target="_blank" rel="noreferrer"><Navigation size={16} /> Open directions</a> : null}
    </section>
    <section className="wrCard">
      <span>Instructions</span>
      <p>{clean(job?.worker_instructions || job?.instructions || job?.description || job?.notes) || "No special instructions."}</p>
    </section>
    <section className="wrCard">
      <span>Worker note</span>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Quick note for boss…" />
    </section>
    <section className="wrButtonGrid">
      <button disabled={busy} onClick={() => mark("on_my_way")}>On my way</button>
      <button disabled={busy} onClick={() => mark("started")}>Started</button>
      <button disabled={busy} onClick={() => mark("stop")}>Finish / send</button>
    </section>
  </WorkerShell>;
}

export function WorkerProofPage() {
  const { jobs, loading } = useWorkerJobs();
  return <WorkerShell active="Proof" title="Proof" subtitle="Proof belongs inside the job. Open a job, add notes/photos, then finish.">
    {loading ? <section className="wrEmpty"><RefreshCw className="spin" /> Loading…</section> : null}
    {jobs.filter((job) => !isDone(job)).slice(0, 8).map((job) => <JobMini key={idOf(job)} job={job} cta="Add proof" />)}
  </WorkerShell>;
}

export function WorkerHelpPage() {
  return <WorkerShell active="Help" title="Need help?" subtitle="Keep it simple. Message the boss if the job, address, or instructions are wrong.">
    <section className="wrCard"><HelpCircle /><h2>What to do</h2><p>Open the job and use the note before finishing. If it is urgent, call the boss outside Churvox.</p></section>
    <Link className="wrPrimary" to="/worker/jobs">Back to jobs</Link>
  </WorkerShell>;
}

export function WorkerMePage() {
  const { user, logout } = useAuth();
  return <WorkerShell active="Me" title="Me" subtitle="Worker profile and sign out.">
    <section className="wrCard"><UserRound /><h2>{clean(user?.name || user?.full_name || "Worker")}</h2><p>{clean(user?.email)}</p></section>
    <button className="wrPrimary dangerBtn" onClick={logout}><LogOut size={16} /> Log out</button>
  </WorkerShell>;
}

export default WorkerTodayPage;
