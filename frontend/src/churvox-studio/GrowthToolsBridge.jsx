import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  QrCode,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { clean, money, useControlBoardData } from "../churvox-product/controlBoardData";
import { trackPlatformEvent } from "../lib/platformTelemetry";
import "./growthToolsBridge.css";

const ACTIVATION_KEY = "churvox:funnel:activation:v1";

function rowsFrom(payload, key) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "records", "results", "data", "jobs", "clients", "invoices"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function activationState() {
  try {
    return JSON.parse(window.localStorage.getItem(ACTIVATION_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveActivationState(value) {
  try {
    window.localStorage.setItem(ACTIVATION_KEY, JSON.stringify(value));
  } catch {}
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function go(page) {
  window.history.pushState({}, "", `/dashboard#${page}`);
  window.dispatchEvent(new Event("hashchange"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function buildGuardSignals(data) {
  const signals = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  (data.jobs || []).forEach((job) => {
    const status = clean(job.status).toLowerCase();
    const recurring = clean(job.recurring).toLowerCase();
    const extras = Number(job.extrasTotal || job.extras_total || 0);
    const total = Number(job.price || 0) + extras;

    if (/complete/.test(status) && !clean(job.invoiceId || job.invoice_id || job.linked_invoice_id)) {
      signals.push({
        id: `job-invoice-${job.id}`,
        level: "high",
        title: "Completed job has no linked invoice",
        detail: `${job.title} for ${job.client} is complete, but Churvox cannot see a linked invoice yet.`,
        value: total,
        route: "jobs",
        action: "Open completed work",
      });
    } else if (extras > 0 && !clean(job.invoiceId || job.invoice_id || job.linked_invoice_id)) {
      signals.push({
        id: `job-extras-${job.id}`,
        level: "high",
        title: "Extras may still be unbilled",
        detail: `${job.title} carries ${money(extras)} of extras without a linked invoice.`,
        value: extras,
        route: "jobs",
        action: "Review job extras",
      });
    }

    if (/complete/.test(status) && recurring && recurring !== "one-off" && !clean(job.nextRecurringJobId || job.next_generated_job_id)) {
      signals.push({
        id: `job-repeat-${job.id}`,
        level: "medium",
        title: "Repeat work has no next visit linked",
        detail: `${job.client} is marked ${job.recurring}, but the next generated job is not visible.`,
        value: 0,
        route: "recurring",
        action: "Open repeat work",
      });
    }

    if (job.issue || /needs check|late|unassigned|blocked/.test(`${status} ${clean(job.worker).toLowerCase()}`)) {
      signals.push({
        id: `job-attention-${job.id}`,
        level: "medium",
        title: "A job needs an owner check",
        detail: `${job.title}: ${job.issue || job.status || "Check the assignment and timing."}`,
        value: 0,
        route: "jobs",
        action: "Open job",
      });
    }
  });

  (data.invoices || []).forEach((invoice) => {
    if (/overdue/.test(clean(invoice.status).toLowerCase())) {
      signals.push({
        id: `invoice-overdue-${invoice.id}`,
        level: "high",
        title: "Overdue money needs a move",
        detail: `${invoice.number} for ${invoice.client} is overdue and still shows ${money(invoice.amount)} outstanding.`,
        value: Number(invoice.amount || 0),
        route: "invoices",
        action: "Open invoice",
      });
    }
  });

  (data.quotes || []).forEach((quote) => {
    const status = clean(quote.status).toLowerCase();
    const followUp = safeDate(quote.followUp || quote.follow_up);
    if (/sent|viewed/.test(status) && followUp && followUp <= today) {
      signals.push({
        id: `quote-followup-${quote.id}`,
        level: "medium",
        title: "Quote follow-up is due",
        detail: `${quote.title} for ${quote.client} reached its follow-up date without an accepted or declined status.`,
        value: Number(quote.amount || 0),
        route: "quotes",
        action: "Open quote",
      });
    }
  });

  return signals
    .filter((signal, index, rows) => rows.findIndex((item) => item.id === signal.id) === index)
    .sort((left, right) => (left.level === right.level ? Number(right.value || 0) - Number(left.value || 0) : left.level === "high" ? -1 : 1));
}

function ActivationTracker({ user }) {
  const api = useApi();
  const apiRef = React.useRef(api);
  const running = React.useRef(false);
  apiRef.current = api;

  React.useEffect(() => {
    if (!user) return undefined;
    let alive = true;

    const probe = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const results = await Promise.allSettled([apiRef.current.get("/clients"), apiRef.current.get("/jobs"), apiRef.current.get("/invoices")]);
        if (!alive) return;
        const counts = {
          client: results[0].status === "fulfilled" ? rowsFrom(results[0].value, "clients").length : 0,
          job: results[1].status === "fulfilled" ? rowsFrom(results[1].value, "jobs").length : 0,
          invoice: results[2].status === "fulfilled" ? rowsFrom(results[2].value, "invoices").length : 0,
        };
        const saved = activationState();
        const next = { ...saved };
        Object.entries(counts).forEach(([type, count]) => {
          if (count > 0 && !saved[type]) {
            trackPlatformEvent(`activation_${type}_present`, { record_type: type, count, dedupe_key: type });
            next[type] = new Date().toISOString();
          }
        });
        saveActivationState(next);
      } finally {
        running.current = false;
      }
    };

    probe();
    window.addEventListener("churvox:data-refresh", probe);
    return () => {
      alive = false;
      window.removeEventListener("churvox:data-refresh", probe);
    };
  }, [user?.email]);

  return null;
}

function GetWorkModal({ user, close }) {
  const [notice, setNotice] = React.useState("");
  const [showQr, setShowQr] = React.useState(false);
  const email = clean(user?.email || user?.user_email || user?.login_email).toLowerCase();
  const businessName = clean(user?.business_name || user?.company_name || user?.name) || "Your business";
  const requestUrl = email ? `https://www.churvox.com/request?owner=${encodeURIComponent(email)}` : "";
  const websiteButton = requestUrl ? `<a href="${requestUrl}">Request a quote</a>` : "";
  const socialText = requestUrl ? `Need a quote from ${businessName}? Send the job details here: ${requestUrl}` : "";
  const qrUrl = requestUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=20&data=${encodeURIComponent(requestUrl)}` : "";

  React.useEffect(() => {
    trackPlatformEvent("get_work_tool_opened", { dedupe_key: "owner_get_work" });
  }, []);

  const copied = async (value, event, message) => {
    try {
      await copyText(value);
      setNotice(message);
      trackPlatformEvent(event, { dedupe_key: event });
    } catch {
      setNotice("Could not copy automatically. Select the text and copy it manually.");
    }
  };

  const share = async () => {
    if (!requestUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${businessName} quote request`, text: `Send your job details to ${businessName}.`, url: requestUrl });
        setNotice("Share sheet opened.");
        trackPlatformEvent("get_work_link_shared", { method: "native", dedupe_key: "native" });
      } else {
        await copied(socialText, "get_work_social_text_copied", "Share text copied.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setNotice("Sharing was cancelled or unavailable.");
    }
  };

  return (
    <div className="cvGrowthLayer" role="dialog" aria-modal="true" aria-label="Get work link">
      <button type="button" className="cvGrowthScrim" aria-label="Close Get Work" onClick={close} />
      <section className="cvGrowthModal cvGetWorkModal">
        <header>
          <div><span>Get Work</span><h2>Give customers one clean place to request a quote.</h2><p>They can send the work, timing, address, notes and photos. The request lands in Churvox for owner review.</p></div>
          <button type="button" className="cvGrowthClose" onClick={close}><X size={20} /></button>
        </header>

        {!requestUrl ? <div className="cvGrowthWarning"><AlertTriangle size={20} /><span>Your account email is missing, so Churvox cannot create the request link yet.</span></div> : (
          <>
            <div className="cvGetWorkLink"><Link2 size={20} /><div><small>Your public request link</small><b>{requestUrl}</b></div><button type="button" onClick={() => copied(requestUrl, "get_work_link_copied", "Request link copied.")}><Copy size={17} />Copy</button></div>
            <div className="cvGetWorkActions">
              <button type="button" onClick={share}><Share2 size={18} /><span>Share link</span></button>
              <button type="button" onClick={() => window.open(requestUrl, "_blank", "noopener,noreferrer")}><ExternalLink size={18} /><span>Open form</span></button>
              <button type="button" onClick={() => { setShowQr((value) => !value); trackPlatformEvent("get_work_qr_requested", { dedupe_key: "qr" }); }}><QrCode size={18} /><span>{showQr ? "Hide QR" : "Show QR"}</span></button>
            </div>

            {showQr ? <section className="cvGetWorkQr"><img src={qrUrl} alt={`QR code for ${businessName} quote request`} /><div><h3>Print or display this QR</h3><p>The QR contains only the public request link. Opening the preview sends that public link to the QR image service.</p><a href={qrUrl} target="_blank" rel="noreferrer"><QrCode size={17} />Open full-size QR</a></div></section> : null}

            <section className="cvGetWorkCopyGrid">
              <article><span>Facebook or text</span><p>{socialText}</p><button type="button" onClick={() => copied(socialText, "get_work_social_text_copied", "Share wording copied.")}><Clipboard size={17} />Copy wording</button></article>
              <article><span>Website button</span><code>{websiteButton}</code><button type="button" onClick={() => copied(websiteButton, "get_work_website_button_copied", "Website button code copied.")}><FileText size={17} />Copy code</button></article>
            </section>
          </>
        )}
        {notice ? <div className="cvGrowthNotice" role="status"><CheckCircle2 size={17} />{notice}</div> : null}
        <footer><ShieldCheck size={17} />Requests are saved for owner review. Nothing is quoted or booked automatically.</footer>
      </section>
    </div>
  );
}

function GuardModal({ data, loading, failures, refresh, close }) {
  const signals = React.useMemo(() => buildGuardSignals(data), [data]);
  const protectedValue = signals.reduce((sum, signal) => sum + Number(signal.value || 0), 0);

  React.useEffect(() => {
    trackPlatformEvent("churvox_guard_opened", { signal_count: signals.length, dedupe_key: "guard" });
  }, [signals.length]);

  return (
    <div className="cvGrowthLayer" role="dialog" aria-modal="true" aria-label="Churvox Guard">
      <button type="button" className="cvGrowthScrim" aria-label="Close Churvox Guard" onClick={close} />
      <section className="cvGrowthModal cvGuardModal">
        <header>
          <div><span>Churvox Guard</span><h2>Catch money and admin gaps before they disappear.</h2><p>Guard checks the live records Churvox already has. It points to the risk; the owner still decides what happens.</p></div>
          <button type="button" className="cvGrowthClose" onClick={close}><X size={20} /></button>
        </header>

        <section className="cvGuardSummary"><article><small>Checks waiting</small><b>{loading ? "…" : signals.length}</b></article><article><small>Value connected to checks</small><b>{loading ? "…" : money(protectedValue)}</b></article><button type="button" onClick={refresh} disabled={loading}><RefreshCw size={17} className={loading ? "spin" : ""} />Refresh checks</button></section>

        {failures?.length ? <div className="cvGrowthWarning"><AlertTriangle size={20} /><span>{failures.map((failure) => `${failure.source}: ${failure.message}`).join(" · ")}</span></div> : null}
        <div className="cvGuardList">
          {loading ? <div className="cvGuardEmpty"><Sparkles size={30} /><h3>Checking the live business</h3><p>Looking across work, quotes and invoices.</p></div> : signals.length ? signals.map((signal, index) => (
            <article key={signal.id} className={`level-${signal.level}`}>
              <span className="cvGuardIndex">{String(index + 1).padStart(2, "0")}</span>
              <div><small>{signal.level === "high" ? "Act soon" : "Review"}</small><h3>{signal.title}</h3><p>{signal.detail}</p></div>
              <aside>{signal.value ? <b>{money(signal.value)}</b> : null}<button type="button" onClick={() => { trackPlatformEvent("churvox_guard_signal_opened", { signal_id: signal.id, route: signal.route, dedupe_key: signal.id }); close(); go(signal.route); }}>{signal.action}<ArrowRight size={16} /></button></aside>
            </article>
          )) : <div className="cvGuardEmpty"><CheckCircle2 size={36} /><h3>No obvious gaps found</h3><p>Guard could not see a missed invoice, overdue invoice, repeat-work gap or due quote follow-up in the loaded records.</p></div>}
        </div>
        <footer><ShieldCheck size={17} />Guard never sends, invoices, reminds or changes a record by itself.</footer>
      </section>
    </div>
  );
}

export default function GrowthToolsBridge() {
  const { user } = useAuth();
  const [modal, setModal] = React.useState("");
  const guardEnabled = Boolean(user && modal === "guard");
  const { data, loading, failures, refresh } = useControlBoardData(guardEnabled);

  React.useEffect(() => {
    if (!modal) return undefined;
    const escape = (event) => { if (event.key === "Escape") setModal(""); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [modal]);

  if (!user) return null;

  return (
    <>
      <ActivationTracker user={user} />
      <div className="cvGrowthLauncher" aria-label="Churvox growth tools">
        <button type="button" className="get-work" onClick={() => setModal("get-work")}><Link2 size={18} /><span>Get work</span></button>
        <button type="button" className="guard" onClick={() => setModal("guard")}><ShieldCheck size={18} /><span>Guard</span></button>
      </div>
      {modal === "get-work" ? <GetWorkModal user={user} close={() => setModal("")} /> : null}
      {modal === "guard" ? <GuardModal data={data} loading={loading} failures={failures} refresh={refresh} close={() => setModal("")} /> : null}
    </>
  );
}
