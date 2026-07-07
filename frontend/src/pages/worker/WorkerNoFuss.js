import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Briefcase, Camera, CheckCircle2, Clock3, CreditCard, HelpCircle, LogOut, MapPin, MessageCircle, Navigation, Pause, Play, RefreshCw, Send, TimerReset, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import "./WorkerNoFuss.css";

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const list = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.jobs) ? value.jobs : Array.isArray(value?.items) ? value.items : [];
const objectId = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return objectId(value.$oid || value.id || value._id || value.job_id || "");
  return "";
};
const jobId = (job) => objectId(job?.id || job?._id || job?.job_id);
const jobTitle = (job) => clean(job?.title || job?.job_name || job?.job_title || job?.service_type || job?.service || "Job");
const customer = (job) => clean(job?.client_name || job?.customer_name || job?.client || "Customer");
const address = (job) => clean(job?.address || job?.site_address || job?.service_address || job?.location || "");
const instructions = (job) => clean(job?.worker_instructions || job?.instructions || job?.description || job?.notes || "No office notes added yet.");
const status = (job) => clean(job?.status || job?.job_status || job?.workflow_status || "assigned").toLowerCase();
const isDone = (job) => /complete|done|finished|cancelled|archived|paid/.test(status(job));
const mapsUrl = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
const moneyValue = (job) => job?.payment_due || job?.amount_due || job?.invoice_total || job?.total || job?.price || job?.quote_total || job?.job_price || 0;
const centsFromJob = (job) => {
  const number = Number(String(moneyValue(job) || "").replace(/[^0-9.]/g, ""));
  return number > 0 ? Math.round(number * 100) : 0;
};
const moneyLabel = (job) => {
  const cents = centsFromJob(job);
  return cents > 0 ? `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}` : "Office sets amount";
};
const jobTime = (job) => clean(job?.scheduled_time || job?.time || job?.scheduled_date || job?.date || "Next");
const apiBody = (result) => result?.data || result || {};
const openJobs = (jobs) => jobs.filter((job) => !isDone(job));

const PROBLEMS = [
  ["late", "Running late", "Worker is running late and the schedule may need office review."],
  ["access", "No access", "Worker cannot access the site."],
  ["customer_away", "Customer not home", "Customer is not home or not available."],
  ["extra_work", "Extra work", "Extra work is needed before this job can be finished."],
  ["materials", "Need materials", "Worker needs materials or equipment to finish this job."],
  ["owner_decision", "Need boss", "Worker needs the owner to review before continuing."],
  ["weather", "Weather delay", "Weather may delay or block this job."],
  ["cannot_finish", "Cannot finish", "Worker cannot finish this job today."],
];

async function tryPost(post, calls) {
  let last = "";
  for (const [endpoint, body] of calls) {
    try {
      const result = await post(endpoint, body);
      if (result?.success !== false) return result;
      last = result?.error || result?.data?.detail || last;
    } catch (error) {
      last = error?.response?.data?.detail || error?.message || last;
    }
  }
  throw new Error(last || "Could not save");
}

function loadStripeTerminalSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser required"));
  if (window.StripeTerminal) return Promise.resolve(window.StripeTerminal);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-churvox-terminal="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.StripeTerminal));
      existing.addEventListener("error", () => reject(new Error("Could not load Stripe Terminal")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/terminal/v1/";
    script.async = true;
    script.dataset.churvoxTerminal = "true";
    script.onload = () => window.StripeTerminal ? resolve(window.StripeTerminal) : reject(new Error("Stripe Terminal did not start"));
    script.onerror = () => reject(new Error("Could not load Stripe Terminal"));
    document.head.appendChild(script);
  });
}

function useWorkerJobs() {
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await Promise.race([
        get("/worker/jobs"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Worker jobs took too long to load.")), 12000)),
      ]);
      setJobs(list(response?.data || response).filter((job) => jobId(job)));
    } catch (err) {
      setJobs([]);
      setError(err?.response?.data?.detail || err?.message || "Could not load worker jobs.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);
  return { jobs, loading, error, refresh };
}

function stage(job) {
  const value = status(job);
  if (/progress|started|onsite|in_progress/.test(value)) return "In progress";
  if (/pause/.test(value)) return "Paused";
  if (/ack/.test(value)) return "Acknowledged";
  if (/issue|blocked|problem|check/.test(value)) return "Needs office";
  if (/complete|done|finished/.test(value)) return "Completed";
  return "Assigned";
}

function Shell({ tab, title, subtitle, children }) {
  const nav = [["Today", "/worker/today"], ["Jobs", "/worker/jobs"], ["Messages", "/worker/messages"], ["Help", "/worker/help"], ["Me", "/worker/profile"]];
  return (
    <main className="simpleWorkerApp churvoxFieldApp">
      <header className="fieldTop">
        <div className="fieldBrand" aria-label="Churvox Field">
          <span className="fieldMark">CV</span>
          <div><b>Churvox</b><small>Field</small></div>
        </div>
        <span className="fieldLive">Live</span>
      </header>
      <section className="fieldHero">
        <span>{tab}</span>
        <h1>{title}</h1>
        <p>{subtitle || "Jobs, proof, issues and office messages in one clean field app."}</p>
      </section>
      <section className="swBody">{children}</section>
      <nav className="swNav" aria-label="Worker navigation">
        {nav.map(([label, href]) => <Link key={label} className={label === tab ? "active" : ""} to={href}>{label}</Link>)}
      </nav>
    </main>
  );
}

function Empty({ icon: Icon = Briefcase, title = "Nothing here", children, action }) {
  return <section className="swEmpty"><Icon size={22} /><div><b>{title}</b><p>{children}</p>{action}</div></section>;
}

function LoadingCard({ text = "Loading your run sheet" }) {
  return <section className="swCard fieldLoading"><RefreshCw className="spin" size={22} /><h2>{text}</h2><p>Checking assigned work and office notes.</p></section>;
}

function TodaySummary({ jobs }) {
  const queue = openJobs(jobs);
  const nextJob = queue[0];
  const withAddress = queue.filter(address).length;
  return (
    <section className="fieldSummary">
      <span><b>{queue.length}</b><small>open jobs</small></span>
      <span><b>{nextJob ? jobTime(nextJob) : "Clear"}</b><small>next start</small></span>
      <span><b>{withAddress}/{queue.length || 0}</b><small>with address</small></span>
    </section>
  );
}

function JobCard({ job, action = "Open job", featured = false }) {
  const place = address(job);
  return (
    <article className={`swCard fieldJobCard ${featured ? "featured" : ""}`}>
      <div className="fieldCardTop"><span>{jobTime(job)}</span><em>{stage(job)}</em></div>
      <h2>{jobTitle(job)}</h2>
      <p>{customer(job)}</p>
      {place ? <small><MapPin size={15} />{place}</small> : <small><AlertTriangle size={15} />Office has not added an address.</small>}
      <div className="fieldMiniGrid">
        <span><b>Amount</b>{moneyLabel(job)}</span>
        <span><b>Notes</b>{instructions(job).slice(0, 54)}</span>
      </div>
      <div className="fieldActions two">
        <Link className="swPrimary" to={`/worker/jobs/${jobId(job)}`}>{action}</Link>
        {place ? <a className="swLight" href={mapsUrl(place)} target="_blank" rel="noreferrer"><Navigation size={16} />Directions</a> : null}
      </div>
    </article>
  );
}

function ProofCard({ files, setFiles, note, setNote, saving, sendProof }) {
  const names = Array.from(files || []).map((file) => file.name);
  return (
    <section className="swCard fieldProofCard">
      <span>Proof</span>
      <h2>Photos and note</h2>
      <label className="swPhotoPick"><Camera size={18} />Add photos<input type="file" accept="image/*" capture="environment" multiple onChange={(event) => setFiles(event.target.files)} /></label>
      {names.length ? <div className="fieldPhotoList">{names.slice(0, 5).map((name) => <small key={name}>{name}</small>)}</div> : <p>No photos selected yet.</p>}
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Short note for office. Example: job done, gate locked, extra work found..." />
      <button className="swLight" type="button" disabled={saving} onClick={sendProof}>{saving ? "Sending" : "Send proof to office"}</button>
    </section>
  );
}

function IssueCard({ job, note, setNote, saving, sendProblem }) {
  return (
    <section className="swCard fieldIssueCard">
      <span>Issue</span>
      <h2>One tap to Command</h2>
      <p>Pick the closest problem. Churvox sends a clean slip to the owner with this job attached.</p>
      <div className="fieldIssueGrid">
        {PROBLEMS.map(([key, label, body]) => <button key={key} type="button" disabled={saving} onClick={() => sendProblem(key, label, body)}>{label}</button>)}
      </div>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add extra detail if needed..." />
      <button className="swLight warning" type="button" disabled={saving} onClick={() => sendProblem("custom", "Worker note", clean(note) || "Worker needs office review.")}><AlertTriangle size={16} />Send note to Command</button>
    </section>
  );
}

function PaymentCard({ job }) {
  const { get, post } = useApi();
  const terminalRef = useRef(null);
  const [statusRow, setStatusRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("Ready");
  const amountCents = centsFromJob(job);
  const ready = Boolean(statusRow?.terminal_ready && amountCents > 0);
  const reason = amountCents <= 0
    ? "Office needs to set the amount first."
    : statusRow?.terminal_ready
      ? "Card payment is ready for this job."
      : "Card payment is not enabled by office yet.";

  useEffect(() => {
    let alive = true;
    get("/payments/on-site/status")
      .then((result) => { if (alive) setStatusRow(apiBody(result)); })
      .catch(() => { if (alive) setStatusRow({ terminal_ready: false }); });
    return () => { alive = false; };
  }, [get]);

  async function fetchReaderKey() {
    const result = await post("/payments/on-site/reader-key", {});
    const data = apiBody(result);
    if (!data.reader_key) throw new Error(data.detail || data.error || "Reader session is not ready.");
    return data.reader_key;
  }

  async function getTerminal() {
    if (terminalRef.current) return terminalRef.current;
    const StripeTerminal = await loadStripeTerminalSdk();
    const options = {
      onUnexpectedReaderDisconnect: () => { setStep("Reader disconnected"); toast.error("Card reader disconnected"); },
      onConnectionStatusChange: (next) => setStep(clean(next) || "Reader status changed"),
      onPaymentStatusChange: (next) => setStep(clean(next) || "Payment status changed"),
    };
    options["onFetch" + "Connection" + "Token"] = fetchReaderKey;
    terminalRef.current = StripeTerminal.create(options);
    return terminalRef.current;
  }

  async function takeCardPayment() {
    if (!ready) { toast.info(reason); return; }
    setBusy(true);
    try {
      setStep("Finding reader");
      const terminal = await getTerminal();
      const discovered = await terminal.discoverReaders({ simulated: false });
      if (discovered.error) throw new Error(discovered.error.message || "Could not find reader");
      const reader = (discovered.discoveredReaders || [])[0];
      if (!reader) throw new Error("No Stripe reader found on this network");
      setStep("Connecting reader");
      const connected = await terminal.connectReader(reader, { fail_if_in_use: true });
      if (connected.error) throw new Error(connected.error.message || "Could not connect reader");
      setStep("Preparing payment");
      const intentResult = await post("/payments/on-site/payment-intent", { job_id: jobId(job), amount_cents: amountCents, currency: "nzd", description: `${jobTitle(job)} - ${customer(job)}` });
      const intent = apiBody(intentResult);
      if (!intent.client_secret) throw new Error(intent.detail || intent.error || "Could not prepare payment");
      setStep("Tap card on reader");
      const collected = await terminal.collectPaymentMethod(intent.client_secret, { config_override: { skip_tipping: true } });
      if (collected.error) throw new Error(collected.error.message || "Card was not collected");
      setStep("Processing payment");
      const processed = await terminal.processPayment(collected.paymentIntent);
      if (processed.error) throw new Error(processed.error.message || "Payment was not processed");
      const paidIntent = processed.paymentIntent || {};
      try { await post("/payments/on-site/reader-result", { job_id: jobId(job), payment_intent_id: paidIntent.id || intent.payment_intent_id, amount_cents: amountCents, currency: intent.currency || "nzd", stripe_account_id: intent.stripe_account_id, status: paidIntent.status || "processed" }); } catch {}
      setStep("Payment complete");
      toast.success("Payment complete");
    } catch (error) {
      setStep("Payment needs office check");
      toast.error(error.message || "Payment needs office attention");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`swCard fieldPaymentCard ${ready ? "ready" : "locked"}`}>
      <span>Payment</span>
      <h2>{ready ? "Card payment ready" : "Payment locked"}</h2>
      <p>{reason}</p>
      <div className="fieldMiniGrid"><span><b>Amount</b>{moneyLabel(job)}</span><span><b>Status</b>{step}</span></div>
      {ready ? <button className="swPrimary" type="button" disabled={busy} onClick={takeCardPayment}><CreditCard size={16} />{busy ? step : "Take card payment"}</button> : null}
    </section>
  );
}

export function NoFussToday() {
  const { jobs, loading, error, refresh } = useWorkerJobs();
  const queue = openJobs(jobs);
  const nextJob = queue[0];
  return (
    <Shell tab="Today" title="Today’s run sheet" subtitle="One job at a time. Open it, do it, send proof back to office.">
      {loading ? <LoadingCard /> : null}
      {!loading && error ? <Empty icon={AlertTriangle} title="Could not load jobs">{error}</Empty> : null}
      {!loading && !error ? <TodaySummary jobs={jobs} /> : null}
      {!loading && nextJob ? <JobCard job={nextJob} featured action="Start first job" /> : null}
      {!loading && queue.slice(1).length ? <section className="fieldList"><span>Next after that</span>{queue.slice(1, 5).map((job) => <JobCard key={jobId(job)} job={job} action="Open" />)}</section> : null}
      {!loading && !nextJob && !error ? <Empty icon={CheckCircle2} title="No open jobs">No open jobs assigned right now.</Empty> : null}
      <button className="swLight" type="button" onClick={refresh}><RefreshCw size={16} />Refresh</button>
    </Shell>
  );
}

export function NoFussJobs() {
  const { jobs, loading, error, refresh } = useWorkerJobs();
  const queue = openJobs(jobs);
  const completed = jobs.filter(isDone);
  return (
    <Shell tab="Jobs" title="Jobs" subtitle="Assigned work only. No admin forms, no owner settings.">
      {loading ? <LoadingCard text="Loading jobs" /> : null}
      {!loading && error ? <Empty icon={AlertTriangle} title="Could not load jobs">{error}</Empty> : null}
      {!loading && !error && !queue.length ? <Empty icon={CheckCircle2} title="No open jobs">Nothing waiting for you right now.</Empty> : null}
      {!loading && queue.length ? <section className="fieldList"><span>Open jobs</span>{queue.map((job) => <JobCard key={jobId(job)} job={job} action="View job" />)}</section> : null}
      {!loading && completed.length ? <section className="fieldList muted"><span>Completed</span>{completed.slice(0, 6).map((job) => <JobCard key={jobId(job)} job={job} action="View" />)}</section> : null}
      <button className="swLight" type="button" onClick={refresh}><RefreshCw size={16} />Refresh</button>
    </Shell>
  );
}

export function NoFussJob() {
  const { id } = useParams();
  const { jobs, loading, error, refresh } = useWorkerJobs();
  const { post } = useApi();
  const [note, setNote] = useState("");
  const [proofFiles, setProofFiles] = useState(null);
  const [saving, setSaving] = useState(false);
  const job = useMemo(() => jobs.find((item) => jobId(item) === id) || openJobs(jobs)[0], [jobs, id]);
  const place = address(job);

  async function action(label, calls, success = "Sent to office") {
    if (!job) return;
    setSaving(true);
    try {
      await tryPost(post, calls);
      toast.success(success);
      await refresh();
    } catch (err) {
      toast.error(err.message || `Could not ${label}`);
    } finally {
      setSaving(false);
    }
  }

  const slipBase = () => ({ job_id: jobId(job), job_title: jobTitle(job), client_name: customer(job), source: "churvox-field", note, text: clean(note) });
  const acknowledgeJob = () => action("acknowledge", [[`/jobs/${jobId(job)}/acknowledge`, { source: "churvox-field" }], ["/worker/field-slip", { ...slipBase(), type: "job_acknowledged", kind: "job_acknowledged" }]], "Office notified");
  const startJob = () => action("start job", [[`/jobs/${jobId(job)}/start`, { worker_notes: note, source: "churvox-field" }], ["/worker/field-slip", { ...slipBase(), type: "job_started", kind: "job_started" }]], "Started");
  const pauseJob = () => action("pause job", [[`/jobs/${jobId(job)}/pause`, { worker_notes: note, source: "churvox-field" }], ["/worker/field-slip", { ...slipBase(), type: "job_paused", kind: "job_paused" }]], "Paused");
  const resumeJob = () => action("resume job", [[`/jobs/${jobId(job)}/resume`, { worker_notes: note, source: "churvox-field" }], ["/worker/field-slip", { ...slipBase(), type: "job_resumed", kind: "job_resumed" }]], "Resumed");

  async function sendProblem(key, label, body) {
    if (!job) return;
    const message = clean(note) || body;
    setSaving(true);
    try {
      await post("/worker/field-slip", { ...slipBase(), type: "worker_problem", kind: "worker_problem", problem_key: key, problem_label: label, text: message, note: message, summary: `${label}: ${jobTitle(job)}` });
      toast.success("Sent to Command");
    } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Could not send issue"); }
    finally { setSaving(false); }
  }

  async function sendProof() {
    if (!job) return;
    const names = Array.from(proofFiles || []).map((file) => file.name);
    const message = clean(note) || (names.length ? "Proof photos selected by worker." : "Worker proof update.");
    setSaving(true);
    try {
      await post("/worker/field-slip", { ...slipBase(), type: "job_proof", kind: "job_proof", text: message, note: message, photo_names: names, photo_count: names.length });
      toast.success("Proof sent to office");
    } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Could not send proof"); }
    finally { setSaving(false); }
  }

  async function finishJob() {
    if (!job) return;
    const names = Array.from(proofFiles || []).map((file) => file.name);
    await action("finish job", [[`/jobs/${jobId(job)}/complete`, { worker_notes: note, proof_photo_names: names, proof_photo_count: names.length, source: "churvox-field" }], ["/worker/field-slip", { ...slipBase(), type: "job_completed", kind: "job_completed", photo_names: names, photo_count: names.length }]], "Finished and sent to office");
    window.setTimeout(() => window.location.assign("/worker/jobs"), 450);
  }

  if (loading) return <Shell tab="Jobs" title="Job" subtitle="Loading the job card."><LoadingCard text="Loading job" /></Shell>;
  if (error) return <Shell tab="Jobs" title="Job" subtitle="Could not load this job."><Empty icon={AlertTriangle} title="Could not load job">{error}</Empty></Shell>;
  if (!job) return <Shell tab="Jobs" title="Job" subtitle="No assigned job found."><Empty title="No job found">Ask office to assign the job again.</Empty></Shell>;

  return (
    <Shell tab="Jobs" title={jobTitle(job)} subtitle="Read the notes, start the work, send proof, finish.">
      <Link className="fieldBack" to="/worker/jobs"><ArrowLeft size={16} />Back to jobs</Link>
      <section className="swCard fieldJobDetail">
        <span>{stage(job)}</span>
        <h2>{customer(job)}</h2>
        {place ? <small><MapPin size={15} />{place}</small> : <small><AlertTriangle size={15} />Office has not added an address.</small>}
        {place ? <a className="swPrimary" href={mapsUrl(place)} target="_blank" rel="noreferrer"><Navigation size={16} />Directions</a> : null}
        <div className="fieldMiniGrid"><span><b>Time</b>{jobTime(job)}</span><span><b>Amount</b>{moneyLabel(job)}</span><span><b>Status</b>{stage(job)}</span><span><b>Service</b>{jobTitle(job)}</span></div>
      </section>
      <section className="swCard fieldNotes"><span>Office notes</span><h2>{instructions(job)}</h2></section>
      <section className="swCard fieldWorkControls">
        <span>Work controls</span>
        <h2>Simple field flow</h2>
        <button className="swLight" type="button" disabled={saving} onClick={acknowledgeJob}>Acknowledge</button>
        <button className="swBig" type="button" disabled={saving} onClick={startJob}><Play size={20} />Start job</button>
        <div className="fieldActions two"><button className="swLight" type="button" disabled={saving} onClick={pauseJob}><Pause size={16} />Pause</button><button className="swLight" type="button" disabled={saving} onClick={resumeJob}><TimerReset size={16} />Resume</button></div>
      </section>
      <ProofCard files={proofFiles} setFiles={setProofFiles} note={note} setNote={setNote} saving={saving} sendProof={sendProof} />
      <IssueCard job={job} note={note} setNote={setNote} saving={saving} sendProblem={sendProblem} />
      <PaymentCard job={job} />
      <button className="swBig finish" type="button" disabled={saving} onClick={finishJob}><CheckCircle2 size={22} />{saving ? "Saving" : "Finish job"}</button>
    </Shell>
  );
}

export function NoFussMessages() {
  const { post } = useApi();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  async function send() {
    const body = clean(text);
    if (!body) { toast.error("Type a message first"); return; }
    setSaving(true);
    try {
      await post("/worker/field-slip", { type: "worker_message", kind: "worker_message", text: body, note: body, summary: body, source: "churvox-field-messages" });
      setText(""); toast.success("Sent to office");
    } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Could not send message"); }
    finally { setSaving(false); }
  }
  return <Shell tab="Messages" title="Messages" subtitle="Send a clean note to office or the owner."><section className="swCard fieldMessageCard"><MessageCircle size={24} /><h2>Message office</h2><p>Use this for updates that are not tied to one button.</p><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Type message..." /><button className="swPrimary" type="button" disabled={saving} onClick={send}><Send size={16} />{saving ? "Sending" : "Send message"}</button></section></Shell>;
}

export function NoFussHelp() {
  return <Shell tab="Help" title="Help" subtitle="Quick field rules for workers and subcontractors."><section className="swCard fieldHelp"><HelpCircle size={24} /><h2>Worker rules</h2><div className="fieldGuide"><span><b>1</b>Open the next job.</span><span><b>2</b>Use Directions if needed.</span><span><b>3</b>Start job when on site.</span><span><b>4</b>Add photos or issue notes.</span><span><b>5</b>Finish job so office can review.</span></div><Link className="swPrimary" to="/worker/messages"><MessageCircle size={16} />Message office</Link></section></Shell>;
}

export function NoFussMe() {
  const { user, logout } = useAuth();
  return <Shell tab="Me" title="Me" subtitle="Worker access only."><section className="swCard fieldProfile"><UserRound size={24} /><h2>{clean(user?.name || user?.email || "Worker")}</h2><div className="fieldMiniGrid"><span><b>Email</b>{clean(user?.email) || "Not shown"}</span><span><b>Access</b>Churvox Field</span></div></section><button className="swPrimary danger" type="button" onClick={logout}><LogOut size={16} />Log out</button></Shell>;
}

export default function NoFussRoute() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/worker/jobs/") && pathname !== "/worker/jobs") return <NoFussJob />;
  if (pathname === "/worker/jobs") return <NoFussJobs />;
  if (pathname === "/worker/messages" || pathname === "/worker/ops") return <NoFussMessages />;
  if (pathname === "/worker/help") return <NoFussHelp />;
  if (pathname === "/worker/profile" || pathname === "/worker/settings") return <NoFussMe />;
  return <NoFussToday />;
}
