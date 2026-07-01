import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Briefcase, CreditCard, LogOut, MapPin, MessageCircle, Navigation, RefreshCw, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import "./WorkerNoFuss.css";

const DRAFT_KEY = "churvox-worker-message-draft";
const c = (value) => String(value || "").replace(/\s+/g, " ").trim();
const arr = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.jobs) ? value.jobs : Array.isArray(value?.items) ? value.items : Array.isArray(value?.results) ? value.results : [];
const oid = (value) => !value ? "" : typeof value === "string" || typeof value === "number" ? String(value) : typeof value === "object" ? oid(value.$oid || value.id || value._id || value.job_id || "") : "";
const id = (job) => oid(job?.id || job?._id || job?.job_id);
const name = (job) => c(job?.title || job?.job_name || job?.job_title || job?.service_type || "Job");
const who = (job) => c(job?.client_name || job?.customer_name || job?.client || "Customer");
const where = (job) => c(job?.address || job?.site_address || job?.service_address || job?.location || "");
const what = (job) => c(job?.worker_instructions || job?.instructions || job?.description || job?.notes || "No instructions.");
const msg = (job) => c(job?.worker_message || job?.office_message || job?.boss_message || job?.job_message || job?.message || "");
const day = (job) => c(job?.scheduled_date || job?.date || job?.start).slice(0, 10);
const time = (job) => c(job?.scheduled_time || job?.time);
const stat = (job) => c(job?.status || job?.job_status || job?.workflow_status).toLowerCase();
const done = (job) => /complete|done|finished|cancelled|archived/.test(stat(job));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const map = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
const planText = (user) => c(user?.plan || user?.business_plan || user?.subscription_plan || user?.business?.plan || user?.company?.plan || user?.account?.plan || "").toLowerCase();
const canTakeOnSitePayments = (user) => /operator|command|pro|enterprise/.test(planText(user));
const jobAmount = (job) => {
  const raw = job?.payment_due || job?.amount_due || job?.invoice_total || job?.total || job?.price || job?.quote_total || job?.job_price;
  const number = Number(String(raw || "").replace(/[^0-9.]/g, ""));
  if (!number) return "Office sets amount";
  return `$${number.toFixed(number % 1 === 0 ? 0 : 2)}`;
};
const jobAmountCents = (job) => {
  const raw = job?.payment_due || job?.amount_due || job?.invoice_total || job?.total || job?.price || job?.quote_total || job?.job_price;
  const number = Number(String(raw || "").replace(/[^0-9.]/g, ""));
  return number > 0 ? Math.round(number * 100) : 0;
};

const readDone = () => {
  try { return JSON.parse(localStorage.getItem("churvox-worker-finished") || "[]"); } catch { return []; }
};
const markDone = (jobId) => {
  try { localStorage.setItem("churvox-worker-finished", JSON.stringify(Array.from(new Set([...readDone(), jobId])))); } catch {}
};
const setDraft = (message) => {
  try { localStorage.setItem(DRAFT_KEY, message); } catch {}
};
const takeDraft = () => {
  try {
    const value = localStorage.getItem(DRAFT_KEY) || "";
    localStorage.removeItem(DRAFT_KEY);
    return value;
  } catch { return ""; }
};

function openJobs(jobs) {
  const gone = new Set(readDone());
  return jobs
    .filter((job) => id(job) && !done(job) && !gone.has(id(job)))
    .sort((a, b) => `${day(a) || "9999"} ${time(a) || "99"}`.localeCompare(`${day(b) || "9999"} ${time(b) || "99"}`));
}

function useJobs() {
  const { get } = useApi();
  const [jobs, setJobs] = useState([]);
  const [load, setLoad] = useState(true);
  async function go() {
    setLoad(true);
    try {
      let response = await get("/worker/jobs");
      let rows = arr(response?.data || response);
      if (!rows.length) {
        try {
          response = await get("/jobs");
          rows = arr(response?.data || response);
        } catch {}
      }
      setJobs(rows.filter((item) => id(item)));
    } catch {
      setJobs([]);
    }
    setLoad(false);
  }
  useEffect(() => { go(); }, []);
  return { jobs, load, go };
}

async function beacon(post, job, state) {
  try {
    await post("/onsite/worker-beacon", {
      state,
      source: state === "stop" ? "finish-job" : "start-job",
      job_id: id(job),
      job_title: name(job),
      address: where(job),
      location: where(job),
    });
  } catch {}
}

async function timer(post, job, action, note) {
  try { return await post(`/jobs/${id(job)}/${action}`, { worker_notes: note, source: "worker-app" }); } catch { return null; }
}

function Shell({ tab, title, children }) {
  return (
    <main className="simpleWorkerApp">
      <section className="swHero">
        <span>{tab}</span>
        <h1>{title}</h1>
      </section>
      <section className="swBody">{children}</section>
      <nav className="swNav">
        {[["Today", "/worker/today"], ["Jobs", "/worker/jobs"], ["Messages", "/worker/messages"], ["Help", "/worker/help"], ["Me", "/worker/profile"]].map(([label, href]) => (
          <Link key={label} className={label === tab ? "active" : ""} to={href}>{label}</Link>
        ))}
      </nav>
    </main>
  );
}

function Fact({ label, value }) {
  if (!c(value)) return null;
  return <span className="swFact"><b>{label}</b>{value}</span>;
}

function Alerts() {
  const [ok, setOk] = useState(typeof Notification === "undefined" || Notification.permission === "granted");
  async function on() {
    if (typeof Notification === "undefined") { setOk(true); return; }
    setOk(await Notification.requestPermission() === "granted");
  }
  return ok ? null : (
    <section className="swCard swActionCard">
      <span>Alerts</span>
      <h2>Turn on job alerts</h2>
      <button className="swPrimary" onClick={on}>Turn on alerts</button>
    </section>
  );
}

function InfoCard({ job, count }) {
  if (!job) return <section className="swEmpty"><Briefcase />No jobs today.</section>;
  return (
    <section className="swCard swJob">
      <span>{time(job) || day(job) || "Next"}</span>
      <h2>{name(job)}</h2>
      <div className="swFacts">
        <Fact label="Customer" value={who(job)} />
        <Fact label="Queue" value={count > 1 ? `${count} jobs` : "Last job"} />
      </div>
      {where(job) ? <small><MapPin size={15} />{where(job)}</small> : null}
    </section>
  );
}

function PaymentCard({ job, enabled, onPay, busy }) {
  return (
    <section className={`swCard swActionCard swPayment ${enabled ? "" : "locked"}`}>
      <span>Payment</span>
      <h2>{enabled ? "Take payment on site" : "Payment locked"}</h2>
      <div className="swFacts">
        <Fact label="Plan" value={enabled ? "Operator / Command" : "Operator or Command"} />
        <Fact label="Amount" value={jobAmount(job)} />
      </div>
      <small>Customer taps card. Funds go to the business account, not the worker.</small>
      <button className={enabled ? "swPrimary" : "swLight"} type="button" disabled={busy} onClick={onPay}><CreditCard size={16} />{enabled ? (busy ? "Preparing" : "Take payment") : "Locked"}</button>
    </section>
  );
}

function WorkCard({ job, started, finish, note, setNote, busy, act, canPay, onPay, payBusy }) {
  const address = where(job);
  return (
    <>
      <section className="swCard swActionCard">
        <span>Where</span>
        <h2>{address || "No address"}</h2>
        {address ? <a className="swPrimary" href={map(address)} target="_blank" rel="noreferrer"><Navigation size={16} />Directions</a> : null}
      </section>

      {msg(job) ? (
        <section className="swCard">
          <span>Office</span>
          <h2>{msg(job)}</h2>
        </section>
      ) : null}

      <section className="swCard">
        <span>Do this</span>
        <h2>{what(job)}</h2>
      </section>

      <PaymentCard job={job} enabled={canPay} onPay={onPay} busy={payBusy} />

      <section className="swCard swActionCard">
        <span>{finish ? "Before finish" : "Note"}</span>
        {finish ? <h2>Anything to add?</h2> : null}
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={finish ? "Add note if needed" : "Optional note"} />
        {finish ? <button className="swLight" onClick={() => setNote(note || "No extra note needed.")}>No note</button> : null}
      </section>

      <button className={`swBig ${started ? "finish" : ""}`} disabled={busy} onClick={act}>{busy ? "Saving" : started ? (finish ? "Send to office" : "Finish job") : "Start job"}</button>
    </>
  );
}

export function NoFussToday() {
  const { jobs, load } = useJobs();
  const todayJobs = openJobs(jobs).filter((job) => day(job) === today());
  const queue = todayJobs.length ? todayJobs : openJobs(jobs);
  const first = queue[0];
  return (
    <Shell tab="Today" title="Today">
      <Alerts />
      {load ? <section className="swEmpty"><RefreshCw className="spin" />Loading</section> : null}
      {!load ? <InfoCard job={first} count={queue.length} /> : null}
      {first ? <Link className="swPrimary" to={`/worker/jobs/${id(first)}`}>Open job</Link> : null}
      {first && msg(first) ? <section className="swCard"><span>Office</span><h2>{msg(first)}</h2></section> : <section className="swEmpty"><MessageCircle />No office messages.</section>}
    </Shell>
  );
}

export function NoFussJobs() {
  const { jobs, load, go } = useJobs();
  const [tick, setTick] = useState(0);
  const queue = openJobs(jobs);
  const job = queue[0];
  return (
    <Shell tab="Jobs" title="Jobs">
      {load ? <section className="swEmpty"><RefreshCw className="spin" />Loading</section> : null}
      {!load && job ? <InfoCard job={job} count={queue.length} /> : null}
      {!load && job ? <Link className="swPrimary" to={`/worker/jobs/${id(job)}`}>Start current job</Link> : null}
      {!load && !job ? <section className="swEmpty"><Briefcase />All jobs done.</section> : null}
      <button className="swLight" onClick={() => { setTick(tick + 1); go(); }}>Refresh</button>
    </Shell>
  );
}

export function NoFussJob() {
  const { id: jid } = useParams();
  const { jobs, load, go } = useJobs();
  const { post, patch } = useApi();
  const { user } = useAuth();
  const queue = openJobs(jobs);
  const picked = jobs.find((item) => id(item) === jid && !readDone().includes(id(item))) || queue[0];
  const job = picked;
  const jobId = id(job);
  const [started, setStarted] = useState(false);
  const [finish, setFinish] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const paymentEnabled = canTakeOnSitePayments(user);

  useEffect(() => {
    setStarted(/progress|started|active/.test(stat(job || {})));
    setNote(c(job?.worker_notes || ""));
  }, [jid, load, jobId]);

  async function requestPayment() {
    if (!paymentEnabled) {
      toast.error("On-site payments are Operator and Command only");
      return;
    }
    const amountCents = jobAmountCents(job);
    if (!amountCents) {
      toast.error("Office needs to set the payment amount first");
      return;
    }
    setPayBusy(true);
    try {
      const result = await post("/payments/on-site/payment-intent", { job_id: jobId, amount_cents: amountCents, currency: "nzd", description: `${name(job)} - ${who(job)}` });
      const data = result?.data || result;
      if (data?.client_secret) {
        toast.success("Payment ready. Connect Stripe Terminal reader to tap card.");
      } else {
        toast.info(data?.detail || "Payment setup needs owner attention");
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.message || "Payment setup needs owner attention");
    } finally {
      setPayBusy(false);
    }
  }

  async function act() {
    if (!job) return;
    if (started && !finish) { setFinish(true); return; }
    setBusy(true);
    const end = started;
    await beacon(post, job, end ? "stop" : "start");
    try {
      if (end) {
        await post(`/worker/jobs/${jobId}/proof-passport`, {
          finish_summary: note || "Completed by worker.",
          worker_note: note || "Completed by worker.",
          steps: { finish_summary: true, worker_note: Boolean(note) },
          source: "worker_finish",
        });
        if (/(extra|unsafe|issue|problem|wrong|blocked|customer|material|green waste|price)/i.test(note || "")) {
          await post(`/worker/jobs/${jobId}/field-slip`, {
            type: "worker_issue",
            kind: "worker_issue",
            text: note,
            note,
            summary: note,
            source: "worker_finish_issue",
          });
        }
        await post(`/worker/jobs/${jobId}/complete`, { worker_notes: note });
        await timer(post, job, "complete", note);
      } else {
        await timer(post, job, "start", note);
        await patch(`/worker/jobs/${jobId}/field-update`, { worker_notes: note });
      }
    } catch {}
    if (end) markDone(jobId);
    setBusy(false);
    if (end) {
      toast.success("Sent to office");
      await go();
      window.location.assign("/worker/jobs");
    } else {
      setStarted(true);
      toast.success("Started");
    }
  }

  if (load || !job) {
    return <Shell tab="Jobs" title="Jobs"><section className="swEmpty">{load ? "Loading" : "All jobs done."}</section></Shell>;
  }
  return <Shell tab="Jobs" title={name(job)}><WorkCard job={job} started={started} finish={finish} note={note} setNote={setNote} busy={busy} act={act} canPay={paymentEnabled} onPay={requestPayment} payBusy={payBusy} /></Shell>;
}

export function NoFussMessages() {
  const { post } = useApi();
  const { jobs } = useJobs();
  const [text, setText] = useState(() => takeDraft());
  const [busy, setBusy] = useState(false);
  const job = openJobs(jobs)[0] || jobs[0];

  async function send() {
    const body = c(text);
    if (!body) { toast.error("Type a message first"); return; }
    setBusy(true);
    try {
      const jobId = id(job);
      let result = null;
      if (jobId) {
        result = await post(`/worker/jobs/${jobId}/field-slip`, {
          type: "worker_message",
          kind: "worker_message",
          text: body,
          note: body,
          summary: body,
          source: "worker_messages",
        });
      }
      if (!result || result.success === false) {
        result = await post("/worker/field-slip", {
          type: "worker_message",
          kind: "worker_message",
          text: body,
          note: body,
          summary: body,
          source: "worker_messages_no_job",
        });
      }
      if (!result || result.success === false) {
        result = await post("/command/execute-approved", {
          kind: "command_record",
          item: {
            type: "Worker message",
            title: "Worker message needs owner review",
            summary: body,
            message: body,
            status: "waiting_owner_review",
            source: "worker_messages",
            owner_approved: false,
            auto_sent: false,
          },
        });
      }
      if (result?.success === false) throw new Error(result.error || "Could not send message");
      setText("");
      toast.success("Sent to office and added to Command");
    } catch (error) {
      toast.error(error?.message || "Message could not be sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell tab="Messages" title="Messages">
      <section className="swCard swActionCard">
        <MessageCircle />
        <h2>Office</h2>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Type message" />
        <button className="swPrimary" disabled={busy} onClick={send}>{busy ? "Sending" : "Send to Command"}</button>
      </section>
    </Shell>
  );
}

export function NoFussHelp() {
  const options = ["Wrong address", "Customer issue", "Unsafe work", "Need more info", "Other"];
  function choose(option) {
    setDraft(option === "Other" ? "" : option);
    window.location.assign("/worker/messages");
  }
  return (
    <Shell tab="Help" title="Help">
      <section className="swCard swActionCard">
        <h2>Message office</h2>
        <div className="swChips">
          {options.map((option) => <button key={option} type="button" onClick={() => choose(option)}>{option}</button>)}
        </div>
      </section>
    </Shell>
  );
}

export function NoFussMe() {
  const { user, logout } = useAuth();
  const guide = [
    ["Today", "Next job only"],
    ["Jobs", "Start, finish, send"],
    ["Payments", "Operator and Command only"],
    ["Messages", "Talk to office"],
    ["Help", "Pick a quick reason"],
  ];
  return (
    <Shell tab="Me" title="Me">
      <section className="swCard">
        <UserRound />
        <h2>{c(user?.name || user?.email || "Worker")}</h2>
        <div className="swFacts"><Fact label="Email" value={c(user?.email)} /><Fact label="Payments" value={canTakeOnSitePayments(user) ? "Operator / Command" : "Locked"} /></div>
      </section>
      <section className="swCard">
        <span>App guide</span>
        <div className="swGuide">
          {guide.map(([label, value]) => <span key={label}><b>{label}</b>{value}</span>) }
        </div>
      </section>
      <button className="swPrimary danger" onClick={logout}><LogOut size={16} />Log out</button>
    </Shell>
  );
}

export default function NoFussRoute() {
  const location = useLocation();
  if (location.pathname === "/worker/jobs") return <NoFussJobs />;
  if (location.pathname === "/worker/ops" || location.pathname === "/worker/messages") return <NoFussMessages />;
  if (location.pathname === "/worker/help") return <NoFussHelp />;
  if (location.pathname === "/worker/settings" || location.pathname === "/worker/profile") return <NoFussMe />;
  return <NoFussToday />;
}
