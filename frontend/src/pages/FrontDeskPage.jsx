import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { CxButton, CxBadge } from "../components/cx";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import ZoneCard from "../components/frontdesk/ZoneCard";
import WorkSlipModal from "../components/frontdesk/WorkSlipModal";
import OnboardingChecklist from "../components/frontdesk/OnboardingChecklist";

const safeArray = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.data)
    ? v.data
    : Array.isArray(v?.items)
    ? v.items
    : Array.isArray(v?.actions)
    ? v.actions
    : [];

const ACTION_TYPE_LABELS = {
  create_invoice_draft: "Invoice draft",
  invoice_draft: "Invoice draft",
  invoice_reminder: "Invoice reminder",
  assign_worker: "Worker assignment",
  quote_follow_up: "Quote follow-up",
  job_instruction: "Job instruction",
  customer_update: "Customer update",
  client_cleanup: "Client cleanup",
  missing_contact: "Client cleanup",
  missing_price: "Missing pricing",
  schedule_conflict: "Schedule conflict",
  crew_workload: "Crew workload",
  job_to_quote_or_invoice: "Convert to quote/invoice",
  today_plan: "Today's plan",
  payroll_review: "Payroll review",
};

const fmtMoney = (n) => {
  const num = Number(n || 0);
  if (!isFinite(num)) return "$0";
  return `$${num.toLocaleString("en-NZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const fmtDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

function actionToWorkItem(a) {
  const reason =
    a.reason || a.owner_facing_explanation || a.subtitle || "Churvox prepared this action for your review.";
  return {
    id: String(a.id || a._id),
    zone: "approve",
    title: a.title || "AI prepared action",
    subtitle: reason,
    summary: a.what_happens || reason,
    reasoning: reason,
    type_label: ACTION_TYPE_LABELS[a.action_type] || (a.action_type || "AI action").replace(/_/g, " "),
    risk: String(a.risk || a.risk_level || "").toLowerCase() || null,
    created_at: a.created_at,
    action_id: String(a.id || a._id),
    cta: "Review",
    facts: [
      a.recommendation ? { label: "Recommendation", value: a.recommendation } : null,
      a.generated_message ? { label: "Drafted message", value: a.generated_message } : null,
      a.data_used ? { label: "Source", value: a.data_used } : null,
      a.related_type ? { label: "Related", value: String(a.related_type) } : null,
    ].filter(Boolean),
    related: a.related_id ? { type: String(a.related_type || ""), id: String(a.related_id) } : null,
  };
}

function jobToFixItem(job, kind) {
  const titleBase = job.title || job.client_name || "Job";
  const id = String(job.id || job._id);
  if (kind === "unassigned") {
    return {
      id: `unassigned-${id}`,
      zone: "fixing",
      title: `Unassigned: ${titleBase}`,
      subtitle: `${job.client_name || "No client"} · ${job.address || job.location || "No address"}`,
      summary: `This job has no worker assigned. Status is "${job.status || "new"}".`,
      reasoning:
        "Churvox flagged this because the job has no crew assigned. Assign a worker so it appears on their run sheet.",
      type_label: "Unassigned job",
      cta: "Assign",
      facts: [
        { label: "Client", value: job.client_name || "—" },
        { label: "Address", value: job.address || job.location || "—" },
        { label: "Status", value: job.status || "—" },
        job.scheduled_date ? { label: "Scheduled", value: fmtDate(job.scheduled_date) } : null,
      ].filter(Boolean),
      related: { type: "job", id },
    };
  }
  if (kind === "ready-invoice") {
    return {
      id: `ready-invoice-${id}`,
      zone: "money",
      title: `Ready to invoice: ${titleBase}`,
      subtitle: `${job.client_name || "No client"} · completed`,
      summary: "Job is completed but no invoice has been created. You can draft one from the job record.",
      reasoning:
        "Churvox surfaced this because the job status is completed but no invoice exists. Convert it to keep cashflow tight.",
      type_label: "Completed · no invoice",
      cta: "Invoice",
      facts: [
        { label: "Client", value: job.client_name || "—" },
        { label: "Address", value: job.address || job.location || "—" },
        job.completed_at ? { label: "Completed", value: fmtDate(job.completed_at) } : null,
      ].filter(Boolean),
      related: { type: "job", id },
    };
  }
  // active today
  return {
    id: `field-${id}`,
    zone: "field",
    title: titleBase,
    subtitle: `${job.assigned_worker_name || "Unassigned"} · ${job.address || job.location || "No address"}`,
    summary: `Status: ${job.status || "—"}. ${job.description || ""}`.trim(),
    reasoning: "Active job on today's run sheet. Review crew assignment, status, and notes.",
    type_label: "Active job",
    cta: "Open",
    facts: [
      { label: "Worker", value: job.assigned_worker_name || "Unassigned" },
      { label: "Client", value: job.client_name || "—" },
      { label: "Address", value: job.address || job.location || "—" },
      { label: "Status", value: job.status || "—" },
    ],
    related: { type: "job", id },
  };
}

function invoiceToMoneyItem(inv, kind) {
  const id = String(inv.id || inv._id);
  const total = inv.balance_due || inv.balance || inv.total || inv.amount || 0;
  if (kind === "overdue") {
    return {
      id: `overdue-${id}`,
      zone: "money",
      title: `Overdue: ${inv.customer_name || inv.client_name || "Client"} · ${fmtMoney(total)}`,
      subtitle: `Invoice ${inv.invoice_number || id.slice(-6)} · due ${fmtDate(inv.due_date)}`,
      summary: `This invoice is past due. Owner approval required before any follow-up is sent.`,
      reasoning:
        "Churvox flagged this as overdue based on its due date. Review and send a reminder, or update the due date.",
      type_label: "Overdue invoice",
      cta: "Chase",
      facts: [
        { label: "Customer", value: inv.customer_name || inv.client_name || "—" },
        { label: "Amount", value: fmtMoney(total) },
        { label: "Due", value: fmtDate(inv.due_date) || "—" },
        { label: "Status", value: inv.status || "—" },
      ],
      related: { type: "invoice", id },
    };
  }
  // draft / open
  return {
    id: `open-invoice-${id}`,
    zone: "money",
    title: `${inv.customer_name || inv.client_name || "Client"} · ${fmtMoney(total)}`,
    subtitle: `Invoice ${inv.invoice_number || id.slice(-6)} · ${inv.status || "open"}`,
    summary: "Open invoice awaiting payment or send.",
    reasoning: "Open invoice surfaced from the money desk view.",
    type_label: "Open invoice",
    cta: "Open",
    facts: [
      { label: "Customer", value: inv.customer_name || inv.client_name || "—" },
      { label: "Amount", value: fmtMoney(total) },
      { label: "Due", value: fmtDate(inv.due_date) || "—" },
      { label: "Status", value: inv.status || "—" },
    ],
    related: { type: "invoice", id },
  };
}

const QUICK_LINKS = [
  { to: "/jobs", label: "Jobs" },
  { to: "/dispatch", label: "Dispatch" },
  { to: "/clients", label: "Clients" },
  { to: "/quotes", label: "Quotes" },
  { to: "/invoices", label: "Invoices" },
  { to: "/team", label: "Team" },
  { to: "/proof-to-paid", label: "Proof" },
  { to: "/payroll", label: "Payroll" },
  { to: "/ai-operator/settings", label: "AI settings" },
  { to: "/settings", label: "Settings" },
];

export default function FrontDeskPage() {
  const { get, post } = useApi();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [openItem, setOpenItem] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [snapRes, actRes, jobsRes, invRes] = await Promise.all([
      get("/ai-operator/command-snapshot"),
      get("/ai-operator/actions"),
      get("/jobs"),
      get("/invoices"),
    ]);
    if (snapRes.success) setSnapshot(snapRes.data || null);
    if (actRes.success) setActions(safeArray(actRes.data));
    if (jobsRes.success) setJobs(safeArray(jobsRes.data));
    if (invRes.success) setInvoices(safeArray(invRes.data));
    setLoading(false);
  }, [get]);

  useEffect(() => {
    load();
  }, [load]);

  const runScan = useCallback(async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) {
      toast.success("AI scan complete");
      load();
    } else {
      toast.error(res.error || "Scan failed");
    }
  }, [post, load]);

  // === ZONE 1: Ready to approve ===
  const approveItems = useMemo(() => {
    return actions
      .filter((a) => ["pending", "edited"].includes(String(a.status || "").toLowerCase()))
      .slice(0, 12)
      .map(actionToWorkItem);
  }, [actions]);

  // === ZONE 2: Needs fixing ===
  const fixItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const closedStatuses = new Set(["completed", "complete", "done", "cancelled", "closed"]);
    const unassignedJobs = jobs
      .filter(
        (j) =>
          !j.assigned_worker_id &&
          !j.worker_id &&
          !closedStatuses.has(String(j.status || "").toLowerCase())
      )
      .slice(0, 6)
      .map((j) => jobToFixItem(j, "unassigned"));

    const overdueQuoteCount = snapshot?.urgent?.open_quotes || 0;
    const quoteItem =
      overdueQuoteCount > 0
        ? [
            {
              id: `quotes-followup`,
              zone: "fixing",
              title: `${overdueQuoteCount} open quote${overdueQuoteCount === 1 ? "" : "s"} could use a follow-up`,
              subtitle: "Quotes that have been sent but not actioned by the client.",
              summary:
                "Churvox spotted open quotes that haven't been accepted or declined. Review and decide on a follow-up message.",
              reasoning:
                "These quotes have been waiting for a client decision. A short follow-up message often unlocks the next step.",
              type_label: "Quote follow-ups",
              cta: "Review",
              facts: [{ label: "Open quotes", value: String(overdueQuoteCount) }],
              related: { type: "quote", id: "" },
            },
          ]
        : [];

    const overdueOnly = invoices
      .filter((inv) => {
        const st = String(inv.status || "").toLowerCase();
        if (!["sent", "open", "overdue", "unpaid", "pending", "pending_payment"].includes(st)) return false;
        const due = String(inv.due_date || "").slice(0, 10);
        return due && due < today;
      })
      .slice(0, 4)
      .map((inv) => ({ ...invoiceToMoneyItem(inv, "overdue"), zone: "fixing", cta: "Chase" }));

    // de-dupe by id
    const seen = new Set();
    return [...unassignedJobs, ...overdueOnly, ...quoteItem].filter((it) =>
      seen.has(it.id) ? false : (seen.add(it.id), true)
    );
  }, [jobs, invoices, snapshot]);

  // === ZONE 3: Field & crew ===
  const fieldItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const activeStatuses = new Set([
      "in_progress",
      "in progress",
      "started",
      "on_site",
      "active",
      "assigned",
      "scheduled",
    ]);
    return jobs
      .filter((j) => {
        const st = String(j.status || "").toLowerCase();
        if (activeStatuses.has(st)) return true;
        const sched = String(j.scheduled_date || j.start_date || "").slice(0, 10);
        return sched === today;
      })
      .slice(0, 8)
      .map((j) => jobToFixItem(j, "field"));
  }, [jobs]);

  // === ZONE 4: Money desk ===
  const moneyItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const closedStatuses = new Set(["completed", "complete", "done"]);
    const readyToInvoice = jobs
      .filter((j) => {
        if (!closedStatuses.has(String(j.status || "").toLowerCase())) return false;
        return !(j.invoice_id || j.draft_invoice_id || j.invoiced || j.invoice_created);
      })
      .slice(0, 4)
      .map((j) => jobToFixItem(j, "ready-invoice"));

    const overdue = invoices
      .filter((inv) => {
        const st = String(inv.status || "").toLowerCase();
        if (!["sent", "open", "overdue", "unpaid", "pending", "pending_payment"].includes(st)) return false;
        const due = String(inv.due_date || "").slice(0, 10);
        return due && due < today;
      })
      .slice(0, 4)
      .map((inv) => invoiceToMoneyItem(inv, "overdue"));

    const open = invoices
      .filter((inv) => {
        const st = String(inv.status || "").toLowerCase();
        return ["draft", "sent", "open", "pending", "unpaid", "pending_payment"].includes(st);
      })
      .slice(0, 6)
      .map((inv) => invoiceToMoneyItem(inv, "open"));

    const seen = new Set();
    return [...readyToInvoice, ...overdue, ...open].filter((it) =>
      seen.has(it.id) ? false : (seen.add(it.id), true)
    );
  }, [jobs, invoices]);

  const approveItem = useCallback(
    async (item) => {
      if (!item?.action_id) return;
      setActionBusy(true);
      const res = await post(`/ai-operator/actions/${item.action_id}/approve`, {});
      setActionBusy(false);
      if (res.success) {
        toast.success("Action approved");
        setOpenItem(null);
        load();
      } else {
        toast.error(res.error || "Failed to approve");
      }
    },
    [post, load]
  );

  const rejectItem = useCallback(
    async (item) => {
      if (!item?.action_id) return;
      setActionBusy(true);
      const res = await post(`/ai-operator/actions/${item.action_id}/reject`, {});
      setActionBusy(false);
      if (res.success) {
        toast.success("Action dismissed");
        setOpenItem(null);
        load();
      } else {
        toast.error(res.error || "Failed to reject");
      }
    },
    [post, load]
  );

  const urgent = snapshot?.urgent || {};
  const approvalsTotal = snapshot?.approvals?.total_pending ?? approveItems.length;
  const nextBest = snapshot?.next_best_move;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (_e) {
      /* noop */
    }
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cx-bg)",
        color: "var(--cx-text)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
      data-testid="front-desk-page"
    >
      {/* === TOP BAR (no sidebar) === */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(247,243,234,0.92)",
          backdropFilter: "saturate(160%) blur(10px)",
          borderBottom: "1px solid var(--cx-border)",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "14px clamp(16px, 4vw, 28px)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            <ChurvoxLogo />
          </Link>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 11px",
              borderRadius: 999,
              background: "var(--cx-accent-soft)",
              border: "1px solid rgba(200,255,77,0.5)",
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--cx-accent)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
            data-testid="front-desk-badge"
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "var(--cx-accent-hover)",
              }}
            />
            AI Operator Front Desk
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {snapshot?.scanned_at ? (
              <span style={{ fontSize: 12.5, color: "var(--cx-muted)" }} className="cx-hide-sm">
                Scanned {new Date(snapshot.scanned_at).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
            <CxButton
              variant="primary"
              size="sm"
              onClick={runScan}
              loading={scanning}
              data-testid="run-ai-scan-btn"
            >
              Run AI scan
            </CxButton>
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account menu"
                data-testid="account-menu-btn"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: "1px solid var(--cx-border-strong)",
                  background: "var(--cx-surface)",
                  color: "var(--cx-text)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  onMouseLeave={() => setMenuOpen(false)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "var(--cx-surface)",
                    border: "1px solid var(--cx-border)",
                    borderRadius: 14,
                    boxShadow: "var(--cx-shadow-md)",
                    minWidth: 220,
                    padding: 6,
                  }}
                >
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--cx-border-soft)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cx-text)" }}>
                      {user?.name || "User"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cx-muted)" }}>{user?.email || ""}</div>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "9px 12px",
                      fontSize: 13.5,
                      color: "var(--cx-text)",
                      textDecoration: "none",
                      borderRadius: 8,
                    }}
                  >
                    Settings
                  </Link>
                  <Link
                    to="/plans"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "9px 12px",
                      fontSize: 13.5,
                      color: "var(--cx-text)",
                      textDecoration: "none",
                      borderRadius: 8,
                    }}
                  >
                    Plan &amp; billing
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    data-testid="logout-btn"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: 13.5,
                      color: "var(--cx-danger)",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      borderRadius: 8,
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* === HERO STRIP === */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "clamp(20px, 3.6vw, 36px) clamp(16px, 4vw, 28px) 18px",
        }}
      >
        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr", alignItems: "end" }} className="cx-fd-hero-grid">
          <div>
            <h1
              style={{
                fontFamily: "Outfit, Inter, sans-serif",
                fontSize: "clamp(28px, 3.4vw, 40px)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                margin: 0,
                color: "var(--cx-text)",
              }}
              data-testid="front-desk-headline"
            >
              Churvox prepares the admin.{" "}
              <span
                style={{
                  background: "var(--cx-accent)",
                  padding: "0 10px",
                  borderRadius: 10,
                  display: "inline-block",
                }}
              >
                You approve.
              </span>
            </h1>
            <p
              style={{
                marginTop: 10,
                fontSize: 15,
                color: "var(--cx-muted)",
                maxWidth: 620,
                lineHeight: 1.5,
              }}
            >
              {nextBest || "Live view of your business. Tap any item to open its Work Slip in place."}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
            className="cx-fd-kpis"
          >
            <Kpi label="Pending approvals" value={approvalsTotal} tone="accent" testId="kpi-approvals" />
            <Kpi label="Active jobs" value={urgent.active_jobs || 0} tone="info" testId="kpi-active-jobs" />
            <Kpi label="Open invoices" value={fmtMoney(urgent.open_invoices_total)} tone="success" testId="kpi-open-invoices" />
            <Kpi label="Needs fixing" value={fixItems.length} tone="warning" testId="kpi-needs-fixing" />
          </div>
        </div>
      </section>

      {/* === 4-ZONE GRID === */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "0 clamp(16px, 4vw, 28px) 28px",
        }}
      >
        <OnboardingChecklist />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
          className="cx-fd-zones"
          data-testid="front-desk-zones"
        >
        <ZoneCard
          zone="approve"
          title="Ready to approve"
          count={approveItems.length}
          items={approveItems}
          onItemClick={setOpenItem}
          loading={loading}
          emptyText="No approvals waiting"
          testId="zone-approve"
        />
        <ZoneCard
          zone="fixing"
          title="Needs fixing"
          count={fixItems.length}
          items={fixItems}
          onItemClick={setOpenItem}
          loading={loading}
          emptyText="Nothing to fix"
          testId="zone-fixing"
        />
        <ZoneCard
          zone="field"
          title="Field & crew"
          count={fieldItems.length}
          items={fieldItems}
          onItemClick={setOpenItem}
          loading={loading}
          emptyText="No active jobs today"
          testId="zone-field"
        />
        <ZoneCard
          zone="money"
          title="Money desk"
          count={moneyItems.length}
          items={moneyItems}
          onItemClick={setOpenItem}
          loading={loading}
          emptyText="Money desk clear"
          testId="zone-money"
        />
        </div>
      </section>

      {/* === SECONDARY NAV (quick links) === */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "8px clamp(16px, 4vw, 28px) 36px",
        }}
      >
        <div
          style={{
            background: "var(--cx-surface)",
            border: "1px solid var(--cx-border)",
            borderRadius: 18,
            padding: "14px 16px",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--cx-muted)",
              marginRight: 6,
            }}
          >
            Workspaces
          </span>
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`quick-link-${l.to.replace(/\//g, "")}`}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: "var(--cx-bg-soft)",
                border: "1px solid var(--cx-border)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--cx-text)",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "var(--cx-muted)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Approval-first AI · Nothing auto-sends or syncs without your tap.
        </div>
      </section>

      <WorkSlipModal
        open={!!openItem}
        onClose={() => setOpenItem(null)}
        item={openItem}
        onApprove={approveItem}
        onReject={rejectItem}
        busy={actionBusy}
      />

      <style>{`
        @media (min-width: 980px) {
          .cx-fd-hero-grid { grid-template-columns: 1.2fr 1fr !important; }
          .cx-fd-zones { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 720px) {
          .cx-fd-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .cx-hide-sm { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, tone = "accent", testId }) {
  const toneBg = {
    accent: "var(--cx-accent-soft)",
    info: "var(--cx-info-soft)",
    success: "var(--cx-success-soft)",
    warning: "var(--cx-warning-soft)",
  }[tone];
  const toneInk = {
    accent: "var(--cx-accent)",
    info: "#1F4E7A",
    success: "#14532D",
    warning: "#7C2D12",
  }[tone];
  return (
    <div
      data-testid={testId}
      style={{
        background: "var(--cx-surface)",
        border: "1px solid var(--cx-border)",
        borderRadius: 16,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: toneInk }}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: 999,
            background: toneInk,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        {label}
      </div>
      <div
        style={{
          fontFamily: "Outfit, Inter, sans-serif",
          fontSize: 24,
          fontWeight: 800,
          color: "var(--cx-text)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div style={{ display: "none" }}>
        <CxBadge tone={tone === "accent" ? "accent" : tone}>{label}</CxBadge>
      </div>
    </div>
  );
}
