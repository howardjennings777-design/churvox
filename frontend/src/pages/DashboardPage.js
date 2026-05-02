import { useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import useAiDraft from "../hooks/useAiDraft";
import {
  Briefcase, Calendar, CheckCircle, FileText, Users, Plus, ArrowRight,
  AlertTriangle, Receipt, UserPlus, Clock3, MessageSquareWarning, RefreshCw,
  ClipboardList, MapPin, Truck, Sparkles, Zap, Send, MessageSquare, DollarSign,
  ShieldCheck, ListChecks, FileSignature, BellRing,
} from "lucide-react";
import { safeArray, safeNumber, safeText } from "../utils/safeRender";
import {
  PremiumPage, PremiumHero, PremiumCard, PremiumStatCard, PremiumActionCard,
  PremiumSection, PremiumButton, PremiumBadge, PremiumAIBox, PremiumListRow,
  PremiumLoadingState, PremiumErrorState, PremiumEmptyState,
} from "../components/premium";
import PremiumStatusBadge from "../components/premium/PremiumStatusBadge";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, normalizedRole } = useAuth();
  const { get } = useApi();
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [myobSettings, setMyobSettings] = useState(null);
  const [aiInput, setAiInput] = useState("");
  const { loading: aiLoading, draft, llmAvailable, setDraft, generate } = useAiDraft('smart_hub');

  const isAdmin = normalizedRole === "owner" || normalizedRole === "manager" || normalizedRole === "office_admin";

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    try {
      const [statsRes, jobsRes, quotesRes, invoicesRes, workersRes, myobRes] = await Promise.all([
        get("/dashboard/stats"),
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
        get("/team/workers"),
        get("/myob/settings"),
      ]);
      setStats(statsRes?.success ? (statsRes.data || {}) : {});
      setJobs(safeArray(jobsRes?.success ? jobsRes.data : []));
      setQuotes(safeArray(quotesRes?.success ? quotesRes.data : []));
      setInvoices(safeArray(invoicesRes?.success ? invoicesRes.data : []));
      setWorkers(safeArray(workersRes?.success ? workersRes.data : []));
      setMyobSettings(myobRes?.success ? (myobRes.data || null) : null);
    } catch (err) {
      setPageError(safeText(err, "Failed to load Smart Hub"));
    } finally {
      setPageLoading(false);
    }
  }, [get]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const smart = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const activeJobs = jobs.filter((j) => ["assigned", "acknowledged", "in_progress", "paused"].includes(String(j.status || "")));
    const completedJobs = jobs.filter((j) => String(j.status || "") === "completed");
    const todayJobs = jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey);
    const unassignedJobs = jobs.filter((j) => !j.assigned_worker_id);
    const overdueInvoices = invoices.filter((inv) => String(inv.status || "") === "overdue");
    const pendingInvoices = invoices.filter((inv) => ["draft", "sent"].includes(String(inv.status || "")));
    const quotesWaiting = quotes.filter((q) => ["sent", "draft"].includes(String(q.status || "")));
    const inProgress = jobs.filter((j) => String(j.status || "") === "in_progress");

    return {
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      teamCount: safeNumber(stats.team_count, workers.length),
      todayJobs: todayJobs.length,
      unassignedJobs: unassignedJobs.length,
      overdueInvoices: overdueInvoices.length,
      pendingInvoices: pendingInvoices.length,
      quotesWaiting: quotesWaiting.length,
      lowSmsCredits: safeNumber(stats.sms_credits, 0) > 0 && safeNumber(stats.sms_credits, 0) <= 10 ? 1 : 0,
      myobIssues: myobSettings && myobSettings.connected === false ? 1 : 0,
      workersActive: inProgress.filter((j) => j.assigned_worker_id).length,
      todayList: todayJobs,
      activeList: activeJobs,
    };
  }, [jobs, invoices, quotes, stats, workers, myobSettings]);

  // AI suggestions derived from real data
  const aiSuggestions = useMemo(() => {
    const out = [];
    if (smart.unassignedJobs > 0) {
      out.push({
        icon: <UserPlus className="h-4 w-4" />,
        title: `${smart.unassignedJobs} job${smart.unassignedJobs === 1 ? "" : "s"} need${smart.unassignedJobs === 1 ? "s" : ""} a worker assigned`,
        description: "Open dispatch and assign the right crew member.",
        action: <PremiumButton size="sm" variant="secondary" onClick={() => navigate("/dispatch")}>Open</PremiumButton>,
      });
    }
    if (smart.quotesWaiting > 0) {
      out.push({
        icon: <FileSignature className="h-4 w-4" />,
        title: `${smart.quotesWaiting} quote${smart.quotesWaiting === 1 ? "" : "s"} awaiting customer response`,
        description: "Draft a polite follow-up. AI will prepare wording — you approve before sending.",
        action: <PremiumButton size="sm" variant="secondary" onClick={() => navigate("/quotes")}>Review</PremiumButton>,
      });
    }
    if (smart.overdueInvoices > 0 || smart.pendingInvoices > 0) {
      out.push({
        icon: <Receipt className="h-4 w-4" />,
        title: `${smart.overdueInvoices} overdue and ${smart.pendingInvoices} open invoice${smart.pendingInvoices === 1 ? "" : "s"}`,
        description: "AI can draft a friendly payment reminder — review before sending.",
        action: <PremiumButton size="sm" variant="secondary" onClick={() => navigate("/invoices")}>Open</PremiumButton>,
      });
    }
    if (smart.completedJobs > 0) {
      out.push({
        icon: <CheckCircle className="h-4 w-4" />,
        title: `${smart.completedJobs} completed job${smart.completedJobs === 1 ? "" : "s"} ready to invoice`,
        description: "Convert finished work into invoices and keep cash flowing.",
        action: <PremiumButton size="sm" variant="secondary" onClick={() => navigate("/jobs?status=completed")}>Convert</PremiumButton>,
      });
    }
    if (out.length === 0) {
      out.push({
        icon: <Sparkles className="h-4 w-4" />,
        title: "All clear — no urgent actions",
        description: "Your business is running smoothly. Use the Ask box to draft messages or summaries.",
      });
    }
    return out.slice(0, 4);
  }, [smart, navigate]);

  if (pageLoading) {
    return (
      <Layout>
        <PremiumPage>
          <PremiumLoadingState title="Loading your Smart Hub" subtitle="Pulling jobs, quotes, invoices and team activity…" />
        </PremiumPage>
      </Layout>
    );
  }
  if (pageError) {
    return (
      <Layout>
        <PremiumPage>
          <PremiumErrorState title="Smart Hub unavailable" subtitle={pageError} action={<PremiumButton onClick={fetchData}>Retry</PremiumButton>} />
        </PremiumPage>
      </Layout>
    );
  }

  const todayList = smart.todayList.slice(0, 5);
  const activeList = smart.activeList.slice(0, 5);

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          eyebrow={<><Sparkles className="h-3 w-3" /> Command Centre</>}
          icon={<Briefcase className="h-7 w-7" />}
          title={`Welcome back, ${safeText(user?.name?.split(" ")?.[0], "there")}`}
          subtitle="Today’s run sheet, urgent actions, and AI-suggested follow-ups for your trade business — all in one premium command centre."
          actions={
            isAdmin ? (
              <>
                <PremiumButton onClick={() => navigate("/jobs/new")} iconLeft={<Plus className="h-4 w-4" />}>New job</PremiumButton>
                <PremiumButton variant="secondary" onClick={() => navigate("/quotes/new")}>New quote</PremiumButton>
                <PremiumButton variant="secondary" onClick={() => navigate("/invoices/new")}>New invoice</PremiumButton>
                <PremiumButton variant="secondary" onClick={() => navigate("/clients/new")}>Add client</PremiumButton>
                <PremiumButton variant="ghost" onClick={() => navigate("/dispatch")} iconLeft={<Calendar className="h-4 w-4" />}>Dispatch board</PremiumButton>
              </>
            ) : null
          }
        />

        {/* AI Business Assistant — top of Smart Hub */}
        <PremiumAIBox
          title="AI Business Assistant"
          subtitle="Today’s summary, urgent actions, and suggested follow-ups for your business"
          chip="Approval-first"
          suggestions={aiSuggestions}
          actions={
            <PremiumBadge tone="violet" icon={<ShieldCheck className="h-3 w-3" />}>Review before sending</PremiumBadge>
          }
        >
          <div className="bg-white rounded-2xl border border-[#d8e3f3] p-3 shadow-sm">
            <label className="block text-[12px] font-semibold text-[#1a2c4d] mb-2">Ask your business</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="e.g. Draft a polite reminder for unpaid invoices over 14 days"
                className="px-input flex-1"
              />
              <PremiumButton iconLeft={<Send className="h-4 w-4" />} disabled={aiLoading} onClick={() => generate(aiInput)}>
                Generate draft
              </PremiumButton>
            </div>
            {draft ? <div className="mt-3 rounded-xl border border-[#d8e3f3] bg-[#f6faff] p-3 text-[13px] text-[#1a2c4d] whitespace-pre-wrap">{draft}</div> : null}
            {!llmAvailable ? <p className="mt-2 text-[11.5px] text-[#b45309]">Fallback draft — connect AI key for live AI.</p> : null}
            {draft ? <div className="mt-2 flex gap-2"><PremiumButton size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(draft)}>Copy draft</PremiumButton><PremiumButton size="sm" variant="ghost" onClick={() => setDraft('')}>Clear</PremiumButton></div> : null}
            <p className="text-[11.5px] text-[#5b6c87] mt-2">
              Drafts appear here for your review. AI never auto-sends customer messages and never makes payroll, legal or tax decisions.
            </p>
          </div>
        </PremiumAIBox>

        {/* Stat grid */}
        <div className="px-grid px-grid--4">
          <PremiumStatCard label="Jobs today" value={safeNumber(smart.todayJobs, 0)} icon={<ClipboardList className="h-4 w-4" />} onClick={() => navigate("/dispatch")} dataTestId="stat-jobs-today" />
          <PremiumStatCard label="Active jobs" value={safeNumber(smart.activeJobs, 0)} icon={<Briefcase className="h-4 w-4" />} tone="sky" onClick={() => navigate("/jobs")} dataTestId="stat-active-jobs" />
          <PremiumStatCard label="Crew on site" value={safeNumber(smart.workersActive, 0)} icon={<Users className="h-4 w-4" />} tone="teal" onClick={() => navigate("/team")} dataTestId="stat-crew" />
          <PremiumStatCard label="Ready to invoice" value={safeNumber(smart.completedJobs, 0)} icon={<Receipt className="h-4 w-4" />} tone="violet" onClick={() => navigate("/jobs?status=completed")} dataTestId="stat-ready-invoice" />
          <PremiumStatCard label="Quotes waiting" value={safeNumber(smart.quotesWaiting, 0)} icon={<FileText className="h-4 w-4" />} tone="amber" onClick={() => navigate("/quotes")} dataTestId="stat-quotes" />
          <PremiumStatCard label="Open invoices" value={safeNumber(smart.pendingInvoices, 0)} icon={<DollarSign className="h-4 w-4" />} tone="blue" onClick={() => navigate("/invoices")} dataTestId="stat-open-invoices" />
          <PremiumStatCard label="Overdue invoices" value={safeNumber(smart.overdueInvoices, 0)} icon={<AlertTriangle className="h-4 w-4" />} tone="red" onClick={() => navigate("/invoices?status=overdue")} dataTestId="stat-overdue" />
          <PremiumStatCard label="Unassigned jobs" value={safeNumber(smart.unassignedJobs, 0)} icon={<Clock3 className="h-4 w-4" />} tone="amber" onClick={() => navigate("/dispatch")} dataTestId="stat-unassigned" />
        </div>

        {/* Today + Active */}
        <div className="px-grid px-grid--2">
          <PremiumCard
            icon={<Calendar className="h-4 w-4" />}
            title="Today’s run sheet"
            subtitle={todayList.length > 0 ? `${todayList.length} job${todayList.length === 1 ? "" : "s"} scheduled today` : "Nothing scheduled today"}
            actions={<Link to="/dispatch" className="px-link text-[13px] inline-flex items-center gap-1">Dispatch <ArrowRight className="h-3 w-3" /></Link>}
            bodyClassName="space-y-2"
          >
            {todayList.length === 0 ? (
              <PremiumEmptyState
                icon={<Calendar className="h-5 w-5" />}
                title="No jobs scheduled today"
                subtitle="Schedule new work or open the dispatch board to plan the day."
                action={<PremiumButton variant="secondary" onClick={() => navigate("/dispatch")}>Open dispatch</PremiumButton>}
              />
            ) : (
              todayList.map((job) => (
                <PremiumListRow
                  key={job.id || job._id}
                  avatar={<Briefcase className="h-4 w-4" />}
                  title={safeText(job.title, "Untitled job")}
                  subtitle={safeText(job.customer_name || job.client_name || job.address, "No client details")}
                  right={<PremiumStatusBadge status={job.status} />}
                  onClick={() => navigate(`/jobs/${job.id || job._id}`)}
                />
              ))
            )}
          </PremiumCard>

          <PremiumCard
            icon={<Zap className="h-4 w-4" />}
            title="Active work"
            subtitle="In-progress, paused or assigned jobs"
            actions={<Link to="/jobs" className="px-link text-[13px] inline-flex items-center gap-1">All jobs <ArrowRight className="h-3 w-3" /></Link>}
            bodyClassName="space-y-2"
          >
            {activeList.length === 0 ? (
              <PremiumEmptyState
                icon={<Briefcase className="h-5 w-5" />}
                title="No active jobs"
                subtitle="Create or assign new work to keep the crew moving."
                action={<PremiumButton variant="secondary" onClick={() => navigate("/jobs/new")} iconLeft={<Plus className="h-4 w-4" />}>New job</PremiumButton>}
              />
            ) : (
              activeList.map((job) => (
                <PremiumListRow
                  key={job.id || job._id}
                  avatar={<Briefcase className="h-4 w-4" />}
                  title={safeText(job.title, "Untitled job")}
                  subtitle={safeText(job.customer_name || job.client_name, "No client")}
                  right={<PremiumStatusBadge status={job.status} />}
                  onClick={() => navigate(`/jobs/${job.id || job._id}`)}
                />
              ))
            )}
          </PremiumCard>
        </div>

        {/* Quick actions */}
        {isAdmin && (
          <PremiumSection title="Quick actions" subtitle="Most-used flows on Churvox">
            <div className="px-grid px-grid--3">
              <PremiumActionCard tone="blue"   icon={<Plus className="h-5 w-5" />}     title="New job"           description="Schedule and assign work" onClick={() => navigate("/jobs/new")} />
              <PremiumActionCard tone="violet" icon={<FileSignature className="h-5 w-5" />} title="New quote"     description="Send a professional quote" onClick={() => navigate("/quotes/new")} />
              <PremiumActionCard tone="teal"   icon={<Receipt className="h-5 w-5" />}  title="New invoice"       description="Bill for completed work" onClick={() => navigate("/invoices/new")} />
              <PremiumActionCard tone="sky"    icon={<UserPlus className="h-5 w-5" />} title="Invite worker"     description="Grow your crew" onClick={() => navigate("/team")} />
              <PremiumActionCard tone="amber"  icon={<MessageSquare className="h-5 w-5" />} title="Communications" description="SMS reminders" onClick={() => navigate("/sms")} />
              <PremiumActionCard tone="blue"   icon={<Zap className="h-5 w-5" />}      title="Automation"        description="Rules & templates" onClick={() => navigate("/automation")} />
            </div>
          </PremiumSection>
        )}

        {/* Issues alert strip */}
        {(smart.lowSmsCredits + smart.myobIssues + smart.overdueInvoices) > 0 && (
          <PremiumCard icon={<BellRing className="h-4 w-4" />} title="Needs attention" subtitle="Things to check today" bodyClassName="grid grid-cols-1 md:grid-cols-3 gap-3">
            {smart.overdueInvoices > 0 && (
              <button onClick={() => navigate("/invoices?status=overdue")} className="text-left rounded-2xl border border-[#fecaca] bg-[#fff7f7] p-4 hover:bg-[#ffefef]">
                <p className="text-[11px] font-bold uppercase text-[#b91c1c] tracking-wide">Overdue invoices</p>
                <p className="text-[20px] font-bold text-[#0d1b34] mt-1">{smart.overdueInvoices}</p>
                <p className="text-[12.5px] text-[#5b6c87] mt-1">Send a friendly reminder via AI assistant.</p>
              </button>
            )}
            {smart.lowSmsCredits > 0 && (
              <button onClick={() => navigate("/sms")} className="text-left rounded-2xl border border-[#fde68a] bg-[#fffbed] p-4 hover:bg-[#fff7d6]">
                <p className="text-[11px] font-bold uppercase text-[#b45309] tracking-wide">SMS credits low</p>
                <p className="text-[20px] font-bold text-[#0d1b34] mt-1">Top up</p>
                <p className="text-[12.5px] text-[#5b6c87] mt-1">Keep customer reminders flowing.</p>
              </button>
            )}
            {smart.myobIssues > 0 && (
              <button onClick={() => navigate("/integrations")} className="text-left rounded-2xl border border-[#bfdbfe] bg-[#eef4ff] p-4 hover:bg-[#e2ecff]">
                <p className="text-[11px] font-bold uppercase text-[#1e40af] tracking-wide">MYOB sync</p>
                <p className="text-[20px] font-bold text-[#0d1b34] mt-1">Reconnect</p>
                <p className="text-[12.5px] text-[#5b6c87] mt-1">Restore accounting sync.</p>
              </button>
            )}
          </PremiumCard>
        )}
      </PremiumPage>
    </Layout>
  );
}
