import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CheckCircle2,
  DollarSign,
  FileText,
  HelpCircle,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { get } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import "../styles/v3.css";

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.team)) return value.team;
  return [];
};

const lower = (value) => String(value || "").toLowerCase();

function isOwnerRole(role) {
  return ["owner", "employer", "admin", "manager"].includes(lower(role));
}

function isCompletedJob(job) {
  const status = lower(job?.status || job?.job_status || job?.workflow_status);
  return ["completed", "done", "finished"].includes(status) || job?.completed === true || Boolean(job?.completed_at);
}

function hasWorker(job) {
  return Boolean(
    job?.assigned_worker_id ||
    job?.worker_id ||
    job?.assigned_to ||
    job?.assigned_worker_name ||
    job?.worker_name
  );
}

function isMoneyWaiting(invoice) {
  const status = lower(invoice?.status || invoice?.invoice_status);
  return ["draft", "sent", "overdue", "unpaid", "pending", ""].includes(status);
}

function isQuoteOpen(quote) {
  const status = lower(quote?.status || quote?.quote_status);
  return ["draft", "sent", "pending", "open", ""].includes(status);
}

function actionKey(action) {
  return `${action.title}-${action.path}-${action.kind}`;
}

export default function V3AiSiteGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, normalizedRole } = useAuth();

  const role = normalizedRole || user?.role || "owner";
  const ownerMode = isOwnerRole(role);

  const [open, setOpen] = useState(false);
  const [autoShown, setAutoShown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [aiActions, setAiActions] = useState([]);

  const load = async () => {
    if (!ownerMode) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const results = await Promise.allSettled([
      get("/clients"),
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/team/workers"),
      get("/ai/operator/queue"),
    ]);

    const value = (index) => results[index]?.status === "fulfilled" ? results[index].value : null;

    setClients(safeArray(value(0)?.data || value(0)));
    setJobs(safeArray(value(1)?.data || value(1)));
    setQuotes(safeArray(value(2)?.data || value(2)));
    setInvoices(safeArray(value(3)?.data || value(3)));
    setWorkers(safeArray(value(4)?.data || value(4)));
    setAiActions(safeArray(value(5)?.data?.actions || value(5)?.actions || value(5)?.data || value(5)));

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [ownerMode, location.pathname]);

  const actions = useMemo(() => {
    if (!ownerMode) return [];

    const unassignedJobs = jobs.filter((job) => !hasWorker(job) && !isCompletedJob(job));
    const completedJobs = jobs.filter(isCompletedJob);
    const moneyWaiting = invoices.filter(isMoneyWaiting);
    const openQuotes = quotes.filter(isQuoteOpen);
    const pendingAi = aiActions.filter((action) =>
      ["pending", "edited", "needs_review", ""].includes(lower(action?.status || action?.queue_status))
    );

    const list = [];

    if (!clients.length) {
      list.push({
        kind: "new-owner",
        icon: Users,
        title: "Add your first client",
        copy: "Start here. Clients connect your jobs, quotes and invoices.",
        path: "/v3/clients",
        button: "Open Clients",
        priority: 1,
      });
    }

    if (!workers.length) {
      list.push({
        kind: "new-owner",
        icon: Users,
        title: "Invite your first worker",
        copy: "Add your crew so Churvox can help with dispatch and job assignment.",
        path: "/v3/team",
        button: "Open Crew",
        priority: 2,
      });
    }

    if (!jobs.length) {
      list.push({
        kind: "new-owner",
        icon: Briefcase,
        title: "Create your first job",
        copy: "Once a job exists, Churvox can help assign it, track it and prepare billing.",
        path: "/v3/jobs",
        button: "Open Jobs",
        priority: 3,
      });
    }

    if (pendingAi.length) {
      list.push({
        kind: "needs-action",
        icon: Sparkles,
        title: `${pendingAi.length} owner decision${pendingAi.length === 1 ? "" : "s"} waiting`,
        copy: "AI has prepared actions. Review before anything important happens.",
        path: "/v3/decisions",
        button: "Review Decisions",
        priority: 0,
      });
    }

    if (unassignedJobs.length) {
      list.push({
        kind: "needs-action",
        icon: AlertTriangle,
        title: `${unassignedJobs.length} job${unassignedJobs.length === 1 ? "" : "s"} need a worker`,
        copy: "Crew Match can help recommend who should take the job.",
        path: "/v3/dispatch",
        button: "Open Crew Match",
        priority: 4,
      });
    }

    if (completedJobs.length && !invoices.length) {
      list.push({
        kind: "needs-action",
        icon: DollarSign,
        title: "Completed work may need invoicing",
        copy: "You have completed jobs but no invoices yet. Check Proof-to-Paid.",
        path: "/v3/proof",
        button: "Open Proof-to-Paid",
        priority: 5,
      });
    }

    if (moneyWaiting.length) {
      list.push({
        kind: "needs-action",
        icon: DollarSign,
        title: `${moneyWaiting.length} money item${moneyWaiting.length === 1 ? "" : "s"} waiting`,
        copy: "Draft, unpaid or overdue invoices need review.",
        path: "/v3/invoices",
        button: "Open Money Board",
        priority: 6,
      });
    }

    if (openQuotes.length) {
      list.push({
        kind: "needs-action",
        icon: FileText,
        title: `${openQuotes.length} quote${openQuotes.length === 1 ? "" : "s"} need movement`,
        copy: "Open quotes may need follow-up, approval or conversion to jobs.",
        path: "/v3/quotes",
        button: "Open Quote Desk",
        priority: 7,
      });
    }

    if (!list.length) {
      list.push({
        kind: "clear",
        icon: CheckCircle2,
        title: "You are looking good",
        copy: "No urgent setup or owner actions found right now.",
        path: "/dashboard",
        button: "Back to Smart Hub",
        priority: 99,
      });
    }

    return list
      .sort((a, b) => a.priority - b.priority)
      .filter((item, index, arr) => arr.findIndex((other) => actionKey(other) === actionKey(item)) === index)
      .slice(0, 6);
  }, [ownerMode, clients, workers, jobs, invoices, quotes, aiActions]);

  const isNewOwner = ownerMode && (clients.length === 0 || workers.length === 0 || jobs.length === 0);
  const hasNeedsDoing = ownerMode && actions.some((action) => action.kind === "needs-action" || action.kind === "new-owner");

  useEffect(() => {
    if (!ownerMode || loading || autoShown) return;

    const storageKey = `churvox-ai-guide-seen-${user?.email || "owner"}`;
    const alreadySeen = window.localStorage.getItem(storageKey);

    if (!alreadySeen && (isNewOwner || hasNeedsDoing)) {
      setOpen(true);
      setAutoShown(true);
      window.localStorage.setItem(storageKey, "1");
    }
  }, [ownerMode, loading, autoShown, user?.email, isNewOwner, hasNeedsDoing]);

  if (!ownerMode) return null;

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const mainTitle = isNewOwner ? "Let’s set Churvox up properly" : "AI found what needs doing";
  const mainCopy = isNewOwner
    ? "I’ll guide you through the first owner steps so the app starts working like an operator, not just empty pages."
    : "Here are the next useful actions inside the site. Tap one to go straight to the right workspace.";

  return (
    <>
      <button type="button" className="v3-ai-guide-button" onClick={() => setOpen(true)}>
        <Bot size={20} />
        <span>AI Help</span>
        {hasNeedsDoing && <em>{actions.length}</em>}
      </button>

      {open && (
        <div className="v3-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="v3-modal v3-ai-guide-modal" onClick={(event) => event.stopPropagation()}>
            <div className="v3-modal-head">
              <div>
                <p className="v3-eyebrow">Churvox AI Guide</p>
                <h2>{mainTitle}</h2>
              </div>
              <button type="button" className="v3-icon-button" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="v3-ai-guide-intro">
              <div className="v3-ai-guide-orb">
                <Sparkles size={22} />
              </div>
              <div>
                <b>{loading ? "Checking your workspace..." : mainCopy}</b>
                <span>
                  Cards open the correct Churvox workspace. Nothing risky is sent, deleted or changed without owner approval.
                </span>
              </div>
            </div>

            <div className="v3-ai-guide-list">
              {actions.map((action) => {
                const Icon = action.icon || HelpCircle;
                return (
                  <button type="button" key={actionKey(action)} className={`v3-ai-guide-card ${action.kind}`} onClick={() => go(action.path)}>
                    <span className="v3-ai-guide-card-icon">
                      <Icon size={18} />
                    </span>
                    <span className="v3-ai-guide-card-copy">
                      <b>{action.title}</b>
                      <small>{action.copy}</small>
                    </span>
                    <strong>{action.button}</strong>
                  </button>
                );
              })}
            </div>

            <div className="v3-actions">
              <button type="button" className="v3-button dark" onClick={() => go(actions[0]?.path || "/dashboard")}>
                Do first step
              </button>
              <button type="button" className="v3-button secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
