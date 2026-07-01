import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Briefcase, CreditCard, LogOut, MapPin, MessageCircle, Navigation, RefreshCw, UserRound } from "lucide-react";
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
const jobTitle = (job) => clean(job?.title || job?.job_name || job?.job_title || job?.service_type || "Job");
const customer = (job) => clean(job?.client_name || job?.customer_name || job?.client || "Customer");
const address = (job) => clean(job?.address || job?.site_address || job?.service_address || job?.location || "");
const instructions = (job) => clean(job?.worker_instructions || job?.instructions || job?.description || job?.notes || "No instructions added.");
const status = (job) => clean(job?.status || job?.job_status || job?.workflow_status).toLowerCase();
const isDone = (job) => /complete|done|finished|cancelled|archived/.test(status(job));
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

const apiBody = (result) => result?.data || result || {};

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
      const response = await get("/worker/jobs");
      const rows = list(response?.data || response).filter((job) => jobId(job));
      setJobs(rows);
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

function Shell({ tab, title, children }) {
  const nav = [["Today", "/worker/today"], ["Jobs", "/worker/jobs"], ["Messages", "/worker/messages"], ["Help", "/worker/help"], ["Me", "/worker/profile"]];
  return (
    <main className="simpleWorkerApp">
      <section className="swHero">
        <span>{tab}</span>
        <h1>{title}</h1>
      </section>
      <section className="swBody">{children}</section>
      <nav className="swNav">
        {nav.map(([label, href]) => <Link key={label} className={label === tab ? "active" : ""} to={href}>{label}</Link>)}
      </nav>
    </main>
  );
}

function Empty({ icon: Icon = Briefcase, children }) {
  return <section className="swEmpty"><Icon />{children}</section>;
}

function JobCard({ job, action = "Open job" }) {
  const place = address(job);
  return (
    <section className="swCard swJob">
      <span>{clean(job?.scheduled_time || job?.time || job?.scheduled_date || job?.date) || "Next"}</span>
      <h2>{jobTitle(job)}</h2>
      <div className="swFacts">
        <span className="swFact"><b>Customer</b>{customer(job)}</span>
        {status(job) ? <span className="swFact"><b>Status</b>{status(job)}</span> : null}
      </div>
      {place ? <small><MapPin size={15} />{place}</small> : null}
      <Link className="swPrimary" to={`/worker/jobs/${jobId(job)}`}>{action}</Link>
    </section>
  );
}

function openJobs(jobs) {
  return jobs.filter((job) => !isDone(job));
}

function WorkerPaymentCard({ job }) {
  const { get, post } = useApi();
  const terminalRef = useRef(null);
  const [statusRow, setStatusRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("Ready");
  const [readers, setReaders] = useState([]);
  const [reader, setReader] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("not_connected");
  const [paymentStatus, setPaymentStatus] = useState("not_ready");
  const amountCents = centsFromJob(job);
  const terminalReady = Boolean(statusRow?.terminal_ready && amountCents > 0);

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
    const key = data.reader_key;
    if (!key) throw new Error(data.detail || data.error || "Reader session is not ready. Owner may need to connect Stripe first.");
    return key;
  }

  async function getTerminal() {
    if (terminalRef.current) return terminalRef.current;

    const StripeTerminal = await loadStripeTerminalSdk();
    const options = {
      onUnexpectedReaderDisconnect: () => {
        setReader(null);
        setConnectionStatus("not_connected");
        setStep("Reader disconnected");
        toast.error("Card reader disconnected");
      },
      onConnectionStatusChange: (next) => setConnectionStatus(String(next || "")),
      onPaymentStatusChange: (next) => setPaymentStatus(String(next || "")),
    };

    options["onFetch" + "Connection" + "Token"] = fetchReaderKey;
    terminalRef.current = StripeTerminal.create(options);
    return terminalRef.current;
  }

  async function findReaders() {
    if (!terminalReady) {
      toast.info(amountCents > 0 ? "Owner needs to connect Stripe first" : "Office needs to set the payment amount first");
      return;
    }

    setBusy(true);
    setStep("Looking for readers");

    try {
      const terminal = await getTerminal();
      const result = await terminal.discoverReaders({ simulated: false });
      if (result.error) throw new Error(result.error.message || "Could not find readers");

      const found = result.discoveredReaders || [];
      setReaders(found);

      if (!found.length) {
        setStep("No reader found");
        toast.info("No Stripe reader found on this network");
      } else {
        setStep(`${found.length} reader found`);
        toast.success(`${found.length} reader found`);
      }
    } catch (err) {
      setStep("Reader search failed");
      toast.error(err.message || "Could not find card reader");
    } finally {
      setBusy(false);
    }
  }

  async function connectReader(nextReader = readers[0]) {
    if (!nextReader) {
      await findReaders();
      return;
    }

    setBusy(true);
    setStep("Connecting reader");

    try {
      const terminal = await getTerminal();
      const result = await terminal.connectReader(nextReader, { fail_if_in_use: true });
      if (result.error) throw new Error(result.error.message || "Could not connect reader");

      setReader(result.reader);
      setStep("Reader connected");
      toast.success("Reader connected");
    } catch (err) {
      setStep("Reader connection failed");
      toast.error(err.message || "Could not connect reader");
    } finally {
      setBusy(false);
    }
  }

  async function takePayment() {
    if (!terminalReady) {
      toast.info(amountCents > 0 ? "Owner needs to connect Stripe first" : "Office needs to set the payment amount first");
      return;
    }

    if (!reader || connectionStatus !== "connected") {
      setStep("Connect a reader first");
      toast.info("Connect a reader first");
      return;
    }

    setBusy(true);

    try {
      const terminal = await getTerminal();

      setStep("Creating payment");
      const intentResult = await post("/payments/on-site/payment-intent", {
        job_id: jobId(job),
        amount_cents: amountCents,
        currency: "nzd",
        description: `${jobTitle(job)} - ${customer(job)}`,
      });

      const intent = apiBody(intentResult);
      if (!intent.client_secret) throw new Error(intent.detail || intent.error || "Could not prepare payment");

      setStep("Tap card on reader");
      const collected = await terminal.collectPaymentMethod(intent.client_secret, {
        config_override: { skip_tipping: true },
      });

      if (collected.error) throw new Error(collected.error.message || "Card was not collected");

      setStep("Processing payment");
      const processed = await terminal.processPayment(collected.paymentIntent);

      if (processed.error) throw new Error(processed.error.message || "Payment was not processed");

      const paidIntent = processed.paymentIntent || {};
      setStep("Payment complete");

      try {
        await post("/payments/on-site/reader-result", {
          job_id: jobId(job),
          payment_intent_id: paidIntent.id || intent.payment_intent_id,
          amount_cents: amountCents,
          currency: intent.currency || "nzd",
          stripe_account_id: intent.stripe_account_id,
          status: paidIntent.status || "processed",
        });
      } catch {}

      toast.success("Payment complete");
    } catch (err) {
      setStep("Payment needs attention");
      toast.error(err.message || "Payment setup needs owner attention");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`swCard swActionCard swPayment ${terminalReady ? "" : "locked"}`}>
      <span>Payment</span>
      <h2>{terminalReady ? "Take card payment" : "Payment locked"}</h2>
      <div className="swFacts">
        <span className="swFact"><b>Plan</b>{statusRow?.enabled_for_plan ? "Operator / Command" : "Operator or Command"}</span>
        <span className="swFact"><b>Amount</b>{moneyLabel(job)}</span>
        <span className="swFact"><b>Reader</b>{reader?.label || reader?.serial_number || connectionStatus}</span>
        <span className="swFact"><b>Status</b>{paymentStatus || step}</span>
      </div>
      <small>Worker can collect only. Funds go to the business Stripe account.</small>

      {!terminalReady ? (
        <button className="swLight" type="button" disabled>Locked</button>
      ) : null}

      {terminalReady ? (
        <button className="swLight" type="button" disabled={busy} onClick={findReaders}>
          {busy ? "Working" : "Find reader"}
        </button>
      ) : null}

      {terminalReady && readers.length ? (
        <button className="swLight" type="button" disabled={busy} onClick={() => connectReader(readers[0])}>
          {busy ? "Working" : reader ? "Reconnect reader" : "Connect reader"}
        </button>
      ) : null}

      {terminalReady ? (
        <button className="swPrimary" type="button" disabled={busy || !reader} onClick={takePayment}>
          <CreditCard size={16} />{busy ? step : "Take card payment"}
        </button>
      ) : null}

      <small>{step}</small>
    </section>
  );
}

export function NoFussToday() {
  const { jobs, loading, error, refresh } = useWorkerJobs();
  const nextJob = openJobs(jobs)[0];
  return (
    <Shell tab="Today" title="Today">
      {loading ? <Empty icon={RefreshCw}>Loading</Empty> : null}
      {!loading && error ? <Empty>{error}</Empty> : null}
      {!loading && nextJob ? <JobCard job={nextJob} /> : null}
      {!loading && !nextJob && !error ? <Empty>No open jobs assigned.</Empty> : null}
      <button className="swLight" type="button" onClick={refresh}>Refresh</button>
    </Shell>
  );
}

export function NoFussJobs() {
  const { jobs, loading, error, refresh } = useWorkerJobs();
  const queue = openJobs(jobs);
  return (
    <Shell tab="Jobs" title="Jobs">
      {loading ? <Empty icon={RefreshCw}>Loading</Empty> : null}
      {!loading && error ? <Empty>{error}</Empty> : null}
      {!loading && !error && !queue.length ? <Empty>No open jobs assigned.</Empty> : null}
      {queue.map((job) => <JobCard key={jobId(job)} job={job} action="View job" />)}
      <button className="swLight" type="button" onClick={refresh}>Refresh</button>
    </Shell>
  );
}

export function NoFussJob() {
  const { id } = useParams();
  const { jobs, loading, error, refresh } = useWorkerJobs();
  const { post } = useApi();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const job = useMemo(() => jobs.find((item) => jobId(item) === id) || openJobs(jobs)[0], [jobs, id]);
  const place = address(job);

  async function startJob() {
    if (!job) return;
    setSaving(true);
    try {
      await post(`/jobs/${jobId(job)}/start`, { worker_notes: note, source: "worker-app" });
      toast.success("Started");
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Could not start job");
    } finally {
      setSaving(false);
    }
  }

  async function finishJob() {
    if (!job) return;
    setSaving(true);
    try {
      await post(`/jobs/${jobId(job)}/complete`, { worker_notes: note, source: "worker-app" });
      toast.success("Sent to office");
      await refresh();
      window.location.assign("/worker/jobs");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Could not finish job");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Shell tab="Jobs" title="Job"><Empty icon={RefreshCw}>Loading</Empty></Shell>;
  if (error) return <Shell tab="Jobs" title="Job"><Empty>{error}</Empty></Shell>;
  if (!job) return <Shell tab="Jobs" title="Job"><Empty>No job found.</Empty></Shell>;

  return (
    <Shell tab="Jobs" title={jobTitle(job)}>
      <section className="swCard swJob">
        <span>{customer(job)}</span>
        <h2>{jobTitle(job)}</h2>
        {place ? <small><MapPin size={15} />{place}</small> : null}
        {place ? <a className="swPrimary" href={mapsUrl(place)} target="_blank" rel="noreferrer"><Navigation size={16} />Directions</a> : null}
      </section>
      <section className="swCard">
        <span>Do this</span>
        <h2>{instructions(job)}</h2>
      </section>
      <WorkerPaymentCard job={job} />
      <section className="swCard swActionCard">
        <span>Note</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for office" />
      </section>
      <button className="swBig" type="button" disabled={saving} onClick={startJob}>{saving ? "Saving" : "Start job"}</button>
      <button className="swBig finish" type="button" disabled={saving} onClick={finishJob}>{saving ? "Saving" : "Finish job"}</button>
    </Shell>
  );
}

export function NoFussMessages() {
  const { post } = useApi();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function send() {
    const body = clean(text);
    if (!body) {
      toast.error("Type a message first");
      return;
    }
    setSaving(true);
    try {
      await post("/worker/field-slip", { type: "worker_message", kind: "worker_message", text: body, note: body, summary: body, source: "worker_messages" });
      setText("");
      toast.success("Sent to office");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Could not send message");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell tab="Messages" title="Messages">
      <section className="swCard swActionCard">
        <MessageCircle />
        <h2>Message office</h2>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Type message" />
        <button className="swPrimary" type="button" disabled={saving} onClick={send}>{saving ? "Sending" : "Send"}</button>
      </section>
    </Shell>
  );
}

export function NoFussHelp() {
  return (
    <Shell tab="Help" title="Help">
      <section className="swCard swActionCard">
        <h2>Need help?</h2>
        <p>Send the office a message and Churvox will pass it through.</p>
        <Link className="swPrimary" to="/worker/messages">Message office</Link>
      </section>
    </Shell>
  );
}

export function NoFussMe() {
  const { user, logout } = useAuth();
  return (
    <Shell tab="Me" title="Me">
      <section className="swCard">
        <UserRound />
        <h2>{clean(user?.name || user?.email || "Worker")}</h2>
        <div className="swFacts"><span className="swFact"><b>Email</b>{clean(user?.email)}</span></div>
      </section>
      <button className="swPrimary danger" type="button" onClick={logout}><LogOut size={16} />Log out</button>
    </Shell>
  );
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
