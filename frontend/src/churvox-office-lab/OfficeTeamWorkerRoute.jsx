import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import "./OfficeTeamWorkerRoute.css";
import "./OfficeTeamWorkerHardcore.css";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";
import { useAuth } from "../context/AuthContext";
import { createBackendWorkerPaymentRequest, createBackendWorkerUpdateRequest } from "./OfficeTeamCommandApi";
import { fetchWorkerProofCoach } from "./OfficeTeamIntelligenceApi";
import { syncWorkerEvents } from "./OfficeTeamLaunchHardeningApi";
import { cacheWorkerJobs, filesForOffline, flushWorkerEvents, listWorkerEvents, queueWorkerEvent, readCachedWorkerJobs, subscribeWorkerSync, workerNetworkState } from "./workerOfflineQueue";

const statusSteps = ["Acknowledge", "Start", "Pause", "Resume", "Complete"];
const payKeywords = ["payment", "pay", "invoice", "card", "checkout"];
export const WORKER_MESSAGE_CONTEXT_BUILD = "churvox-worker-message-context-v5-20260713";
const workerViews = {
  today: { label: "Today", title: "Current job", copy: "Do the next job and keep the office updated." },
  jobs: { label: "Jobs", title: "Assigned jobs", copy: "Only your assigned work appears." },
  messages: { label: "Messages", title: "Update the boss", copy: "Send a short job update or ask for a decision." },
  help: { label: "Help", title: "Field help", copy: "Four simple rules for using Churvox on site." },
  settings: { label: "Me", title: "Worker access", copy: "This account can use field tools only." },
};

export default function OfficeTeamWorkerRoute() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, isWorker, logout } = useAuth();
  const live = useOfficeTeamRows("worker", []);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [note, setNote] = useState("");
  const [trail, setTrail] = useState([]);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [stepBusy, setStepBusy] = useState("");
  const [proofFiles, setProofFiles] = useState(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofCoach, setProofCoach] = useState({ checklist: [] });
  const [proofConfirmations, setProofConfirmations] = useState({});
  const [proofCoachBusy, setProofCoachBusy] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [cachedRows, setCachedRows] = useState([]);
  const [network, setNetwork] = useState(() => workerNetworkState());
  const [syncItems, setSyncItems] = useState([]);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncState, setSyncState] = useState("Synced");

  const viewKey = workerView(pathname);
  const view = workerViews[viewKey];
  const liveRows = Array.isArray(live.rows) ? live.rows : [];
  const rows = liveRows.length ? liveRows : cachedRows;
  const visibleJobRows = showAllJobs ? rows : rows.slice(0, 8);
  const hiddenJobCount = Math.max(0, rows.length - visibleJobRows.length);
  const hasWork = rows.length > 0;
  const current = selectedRow(rows, selected, []);
  const title = hasWork ? current?.[1] || "today’s work" : "No assigned work yet";
  const detail = hasWork ? current?.[3] || "Check notes before starting." : "When the boss assigns real work, it will appear here.";
  const badge = hasWork ? current?.[2] || "Ready" : "Waiting";
  const type = hasWork ? current?.[0] || "Assigned" : "Clear";
  const payment = paymentDetails(current);
  const jobId = String(current?.[4]?.jobId || "").trim();
  const quickNotes = useMemo(() => ["Running late", "Need owner check", "Extra work found", "Proof added"], []);
  const proofNames = Array.from(proofFiles || []).map((file) => file.name);
  const showWork = viewKey === "today" || viewKey === "jobs";
  const showMessages = viewKey === "messages";
  const showHelp = viewKey === "help";
  const showMe = viewKey === "settings";
  const proofChecklist = Array.isArray(proofCoach?.checklist) ? proofCoach.checklist : [];
  const proofConfirmationIds = Object.entries(proofConfirmations).filter(([, checked]) => checked).map(([id]) => id);

  React.useEffect(() => {
    let active = true;
    setProofConfirmations({});
    if (!jobId) {
      setProofCoach({ checklist: [] });
      return () => { active = false; };
    }
    fetchWorkerProofCoach(jobId)
      .then((result) => { if (active) setProofCoach(result?.success === false ? { checklist: [] } : result); })
      .catch(() => { if (active) setProofCoach({ checklist: [] }); });
    return () => { active = false; };
  }, [jobId]);

  useEffect(() => {
    if (!liveRows.length) return;
    setCachedRows(liveRows);
    cacheWorkerJobs(liveRows).catch(() => {});
  }, [liveRows]);

  useEffect(() => {
    let active = true;
    Promise.all([readCachedWorkerJobs(), listWorkerEvents()]).then(([snapshot, events]) => {
      if (!active) return;
      setCachedRows((current) => current.length ? current : (Array.isArray(snapshot?.rows) ? snapshot.rows : []));
      setSyncItems(events);
      setSyncState(events.some((item) => ["needs_attention", "denied"].includes(item.status)) ? "Needs attention" : events.length ? workerNetworkState().online ? "Waiting to sync" : "Saved offline" : "Synced");
    }).catch(() => {});
    const unsubscribe = subscribeWorkerSync((state) => {
      if (!active) return;
      setNetwork({ online: state.online });
      refreshSyncState();
      if (state.online) flushQueue();
    });
    return () => { active = false; unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshSyncState() {
    const events = await listWorkerEvents().catch(() => []);
    setSyncItems(events);
    if (events.some((item) => ["needs_attention", "denied"].includes(item.status))) setSyncState("Needs attention");
    else if (events.length) setSyncState(workerNetworkState().online ? "Waiting to sync" : "Saved offline");
    else setSyncState("Synced");
    return events;
  }

  async function flushQueue() {
    if (syncBusy || !workerNetworkState().online) return null;
    setSyncBusy(true);
    setSyncState("Waiting to sync");
    try {
      const result = await flushWorkerEvents(syncWorkerEvents);
      await refreshSyncState();
      if (result?.needs_attention_count) addTrail(`${result.needs_attention_count} saved update${result.needs_attention_count === 1 ? " needs" : "s need"} attention.`);
      else if (result?.applied_count) addTrail(`${result.applied_count} saved update${result.applied_count === 1 ? "" : "s"} synced to the office.`);
      return result;
    } catch (error) {
      await refreshSyncState();
      addTrail(`Queued work is still saved on this phone. Sync will retry. ${error?.message || ""}`.trim());
      return null;
    } finally { setSyncBusy(false); }
  }

  async function queueAndSync(action, payload = {}) {
    const event = await queueWorkerEvent({ jobId, action, payload });
    setSyncState(workerNetworkState().online ? "Waiting to sync" : "Saved offline");
    await refreshSyncState();
    if (workerNetworkState().online) await flushQueue();
    return event;
  }

  async function recordWorkerStep(step) {
    if (!hasWork || stepBusy) { if (!hasWork) addTrail("No saved assigned work to update yet."); return; }
    if (step === "Complete" && proofChecklist.length) {
      const missing = proofChecklist.filter((item) => item.proof === "photo" ? !proofNames.length : item.proof === "note" ? !String(note || "").trim() : item.proof === "confirmation" ? !proofConfirmationIds.includes(item.id) : false);
      if (missing.length) { addTrail(`Finish blocked: ${missing.map((item) => item.label).join(" · ")}.`); return; }
    }
    setStepBusy(step);
    try {
      const action = stepEndpoint(step);
      if (!jobId || !action) throw new Error("A saved assigned job is required.");
      await queueAndSync(action, { note: String(note || workerActionText(step, title)).trim(), photo_names: step === "Complete" ? proofNames : [], confirmations: step === "Complete" ? proofConfirmationIds : [], industry: proofCoach?.industry || "" });
      setStatus(step);
      addTrail(workerNetworkState().online ? `${step} saved. Churvox is confirming it with the office.` : `${step} saved offline. It will sync when reception returns.`);
    } catch (error) { addTrail(`${step} could not be saved on this phone. ${error?.message || ""}`.trim()); }
    finally { setStepBusy(""); }
  }

  async function sendBossUpdate(text = note) {
    if (updateBusy || live.isLoading) return;
    const clean = String(text || "Worker update from phone view").trim();
    setUpdateBusy(true);
    try {
      const needsDecision = /owner check|extra work|issue|problem|decision|blocked|cannot|help/i.test(clean);
      if (hasWork && jobId) {
        await queueAndSync(needsDecision ? "worker_problem" : "worker_message", { text: clean, note: clean, photo_names: [] });
        addTrail(workerNetworkState().online ? `Update saved for the office: ${clean}` : `Update saved offline: ${clean}`);
      } else {
        await createBackendWorkerUpdateRequest({ title, update: clean, updateType: needsDecision ? "Worker problem" : "Worker update", status: needsDecision ? "Owner review" : "General update" });
        addTrail(needsDecision ? `Issue sent to owner Command: ${clean}` : `Update sent to the office: ${clean}`);
      }
      setNote("");
    } catch (error) { addTrail(`Update remains unsent. Check the saved queue. ${error?.message || ""}`.trim()); }
    finally { setUpdateBusy(false); }
  }

  async function sendProof() {
    if (!hasWork || proofBusy) return;
    if (!proofNames.length && !String(note || "").trim()) { addTrail("Choose at least one photo or add a proof note first."); return; }
    setProofBusy(true);
    try {
      const photos = await filesForOffline(proofFiles);
      await queueAndSync("job_proof", { text: String(note || "Worker added job proof.").trim(), note: String(note || "Worker added job proof.").trim(), photo_names: proofNames, photos });
      addTrail(workerNetworkState().online ? "Proof saved and queued for the office." : "Proof saved offline on this phone.");
      setProofFiles(null);
    } catch (error) { addTrail(`Proof could not be saved. ${error?.message || ""}`.trim()); }
    finally { setProofBusy(false); }
  }

  async function copyPaymentLink() {
    if (!payment.link) { await requestPaymentLink(); return; }
    try {
      await navigator.clipboard.writeText(payment.link);
      setPaymentNotice("Payment link copied. No charge was created by Churvox.");
      addTrail("Customer payment link copied. Payment still completes through the secure invoice page.");
    } catch {
      setPaymentNotice(payment.link);
    }
  }

  async function openPaymentLink() {
    if (!payment.link) { await requestPaymentLink(); return; }
    window.open(payment.link, "_blank", "noopener,noreferrer");
    setPaymentNotice("Payment page opened. Churvox will only mark paid after the real provider confirms it.");
    addTrail("Payment page opened for customer card payment.");
  }

  async function requestPaymentLink() {
    if (paymentBusy) return;
    setPaymentBusy(true);
    try {
      await createBackendWorkerPaymentRequest({ title, amount: payment.amount || current?.[2] || "Amount check", invoice: payment.invoice, customer: payment.customer, paymentLink: payment.link });
      setPaymentNotice("Payment request sent to owner Command. Worker cannot charge a card without an approved link.");
      addTrail("Payment link request sent to Command for owner approval.");
    } catch (error) {
      setPaymentNotice("Payment request was not sent. Check the connection and retry. No card was charged.");
      addTrail(`Payment request did not reach Command. ${error?.message || ""}`.trim());
    } finally {
      setPaymentBusy(false);
    }
  }

  async function handleLogout() {
  await logout();
  navigate("/login?worker=1", { replace: true });
}

  function addTrail(text) {
    setTrail((currentTrail) => [{ id: `${Date.now()}-${text}`, text }, ...currentTrail].slice(0, 6));
  }

  if (authLoading) return <main className="cvWorkerRouteShell"><section className="cvWorkerHero"><div><span>Churvox Worker</span><h1>Loading field access</h1></div></section></main>;
  if (!user || !isWorker) return <Navigate to={user ? "/dashboard" : "/login?worker=1"} replace />;

  return (
    <main className="cvWorkerRouteShell" data-worker-view={viewKey}>
      <section className="cvWorkerHero">
        <div><span>Churvox Worker</span><h1>{view.title}</h1><p>{view.copy}</p></div>
        <strong>{hasWork ? live.label : "Waiting for assigned work"}</strong>
      </section>

      <nav className="cvWorkerRouteNav" aria-label="Worker pages">
        {[["Today", "/worker/today"], ["Jobs", "/worker/jobs"], ["Messages", "/worker/messages"], ["Help", "/worker/help"], ["Me", "/worker/settings"]].map(([label, href]) => <Link key={href} className={view.label === label ? "active" : ""} to={href}>{label}</Link>)}
        <button className="cvWorkerLogout" type="button" onClick={handleLogout}>Log out</button>
      </nav>

      <section className={`cvWorkerSyncBar ${syncState === "Needs attention" ? "attention" : network.online ? "online" : "offline"}`} aria-label="Worker sync status"><div><span>{network.online ? "Connection available" : "No reception"}</span><strong>{syncState}</strong><small>{syncItems.length ? `${syncItems.length} update${syncItems.length === 1 ? "" : "s"} saved on this phone` : "All saved updates confirmed"}</small></div><button type="button" disabled={syncBusy || !network.online || !syncItems.length} onClick={flushQueue}>{syncBusy ? "Syncing…" : syncItems.length ? "Sync now" : "Synced"}</button></section>

      <section className="cvWorkerRoutePhone" aria-label="Churvox worker phone app">
        <header><div><span>{view.label}</span><h2>{view.title}</h2></div><strong>{hasWork ? status : "Waiting"}</strong></header>

        {showWork ? <>
          <article className={`cvWorkerRouteJob ${hasWork ? "" : "cvWorkerRouteEmptyJob"}`}><small>{type}</small><h3>{title}</h3><p>{detail}</p><em>{badge}</em></article>
          {viewKey === "jobs" ? <section className="cvWorkerRouteQueue" aria-label="Assigned worker jobs"><h3>Job queue</h3>{hasWork ? <>{visibleJobRows.map((row) => <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button"><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></button>)}{rows.length > 8 ? <button className="cvWorkerQueueToggle" type="button" onClick={() => setShowAllJobs((value) => !value)}>{showAllJobs ? "Show fewer jobs" : `Show all ${rows.length} jobs`}{hiddenJobCount && !showAllJobs ? ` · ${hiddenJobCount} more` : ""}</button> : null}</> : <p>No assigned jobs.</p>}</section> : null}
          <div className="cvWorkerRouteSteps">{statusSteps.map((step) => <button key={step} type="button" disabled={!hasWork || Boolean(stepBusy) || proofCoachBusy} onClick={() => recordWorkerStep(step)}>{proofCoachBusy && step === "Complete" ? "Checking proof…" : stepBusy === step ? "Saving…" : step}</button>)}</div>
          <section className="cvWorkerPaymentPanel" aria-label="Worker payment panel">
            <div><span>Payment</span><h3>{payment.link ? "Customer pay link" : "Link needed"}</h3><p>{payment.copy}</p></div>
            <div className={`cvWorkerPayCode ${payment.link ? "ready" : "locked"}`} aria-hidden="true"><b>{payment.code}</b></div>
            <dl><div><dt>Amount</dt><dd>{payment.amount || "Owner check"}</dd></div><div><dt>Invoice</dt><dd>{payment.invoice || "Not linked"}</dd></div></dl>
            <div className="cvWorkerPaymentActions"><button type="button" disabled={!hasWork || paymentBusy} onClick={openPaymentLink}>{paymentBusy ? "Preparing…" : payment.link ? "Open pay page" : "Request link"}</button><button type="button" disabled={!hasWork || paymentBusy} onClick={copyPaymentLink}>{payment.link ? "Copy link" : "Prepare request"}</button></div>
            <small>Worker View never charges cards. Use an approved invoice link.</small>
            {paymentNotice ? <p className="cvWorkerPaymentNotice">{paymentNotice}</p> : null}
          </section>
          {proofChecklist.length ? <section className="cvWorkerProofCoach" aria-label="Worker Proof Coach"><span>Worker Proof Coach</span><h3>Before you leave</h3><p>Churvox checks the proof needed for this exact job. Complete stays blocked until required evidence is present.</p><div>{proofChecklist.map((item) => item.proof === "confirmation" ? <label key={item.id}><input type="checkbox" checked={Boolean(proofConfirmations[item.id])} onChange={(event) => setProofConfirmations((current) => ({ ...current, [item.id]: event.target.checked }))} /><span>{item.label}</span></label> : <article key={item.id} className={(item.proof === "photo" ? proofNames.length > 0 : String(note || "").trim()) ? "ready" : "missing"}><b>{item.proof === "photo" ? proofNames.length > 0 ? "Photo ready" : "Photo needed" : String(note || "").trim() ? "Note ready" : "Note needed"}</b><span>{item.label}</span></article>)}</div><small>{proofCoach?.industry ? `Checklist: ${proofCoach.industry}` : "Trade-aware checklist"}</small></section> : null}
          <section className="cvWorkerRouteProof"><label className="cvWorkerProofPicker">Photo proof<input type="file" accept="image/*" capture="environment" multiple disabled={!hasWork || proofBusy} onChange={(event) => setProofFiles(event.target.files)} /></label><button type="button" disabled={!hasWork || proofBusy} onClick={sendProof}>{proofBusy ? "Sending…" : proofNames.length ? `Send ${proofNames.length} proof item${proofNames.length === 1 ? "" : "s"}` : "Send proof note"}</button><button type="button" disabled={!hasWork || updateBusy} onClick={() => sendBossUpdate(`Timer needs office review for ${title}. ${note || "Please check the recorded time."}`)}>Timer note</button></section>
        </> : null}

        {showMessages ? <><section className="cvWorkerRouteNoteBox"><span>Boss update</span><h3>Send one clear update</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed?" /><button type="button" disabled={updateBusy || live.isLoading} onClick={() => sendBossUpdate()}>{updateBusy ? "Sending…" : live.isLoading ? "Loading assigned job…" : "Send to Command"}</button></section><div className="cvWorkerRouteQuickNotes">{quickNotes.map((item) => <button key={item} type="button" disabled={!hasWork || updateBusy} onClick={() => sendBossUpdate(item)}>{item}</button>)}</div><section className="cvWorkerRouteTrail"><h3>This phone</h3>{trail.length ? trail.map((item) => <p key={item.id}>{item.text}</p>) : <p>No updates saved this session.</p>}</section></> : null}
        {showHelp ? <section className="cvWorkerRouteHelp"><h3>Four field rules</h3><ol><li>Open the assigned job.</li><li>Update the status when it changes.</li><li>Save proof or a short issue note.</li><li>Complete only when the work is ready for owner review.</li></ol><p>When reception drops out, look for <b>Saved offline</b>. Churvox will show <b>Waiting to sync</b>, <b>Synced</b> or <b>Needs attention</b> rather than silently losing the update.</p></section> : null}
        {showMe ? <section className="cvWorkerRouteProfile"><h3>Worker access only</h3><p>No owner settings, pricing, billing or admin controls are available here.</p><Link to="/worker/help">Open field help</Link></section> : null}
      </section>

      <aside className="cvWorkerRouteDesk"><span>Office link</span><h2>{view.title}</h2><p>{view.copy}</p><strong>{hasWork ? live.label : "No live assigned work found"}</strong><section><h3>Worker queue</h3>{hasWork ? <><p>{rows.length} active job{rows.length === 1 ? "" : "s"} assigned.</p><strong>{title}</strong><small>{badge}</small></> : <p>No assigned work yet.</p>}</section><section><h3>Phone trail</h3>{trail.length ? trail.map((item) => <p key={item.id}>{item.text}</p>) : <p>No worker actions yet.</p>}</section></aside>
    </main>
  );
}

function workerView(pathname = "") {
  const path = String(pathname || "").toLowerCase();
  if (path.includes("/messages") || path.includes("/ops")) return "messages";
  if (path.includes("/help")) return "help";
  if (path.includes("/settings") || path.includes("/profile")) return "settings";
  if (path.includes("/jobs")) return "jobs";
  return "today";
}

function workerActionText(step, title) {
  const verb = { Acknowledge: "acknowledged", Start: "started", Pause: "paused", Resume: "resumed", Complete: "completed" }[step] || String(step || "updated").toLowerCase();
  return `Worker ${verb} ${title}.`;
}

function stepEndpoint(step = "") {
  const key = String(step || "").toLowerCase();
  if (key === "acknowledge") return "acknowledge";
  if (key === "start") return "start";
  if (key === "pause") return "pause";
  if (key === "resume") return "resume";
  if (key === "complete") return "complete";
  return "";
}

function paymentDetails(row = []) {
  const meta = row?.[4] && typeof row[4] === "object" ? row[4] : {};
  const fromText = [row?.[1], row?.[2], row?.[3]].map((part) => String(part || "")).join(" ");
  const linkFromText = fromText.match(/https?:\/\/\S+/i)?.[0] || "";
  const link = meta.paymentLink || linkFromText;
  const amount = meta.amountDue || (payKeywords.some((word) => fromText.toLowerCase().includes(word)) ? row?.[2] : "");
  const invoice = meta.invoiceNumber || (String(row?.[1] || "").match(/inv[-\s#]*\w+/i)?.[0] || "");
  const customer = meta.customerName || titleFromText(row?.[1]) || "Customer";
  const code = link ? shortCode(link) : "LOCKED";
  const copy = link ? "Open or copy the approved invoice link." : "Ask the owner for an approved payment link.";
  return { link, amount, invoice, customer, code, copy };
}

function titleFromText(value = "") { return String(value || "").split("—")[0].trim(); }
function shortCode(value = "") { const safe = String(value || "PAY").replace(/[^a-z0-9]/gi, "").toUpperCase(); return safe.slice(-6) || "READY"; }
