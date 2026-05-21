import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { CxButton } from "../cx";

const DISMISS_KEY = "cx_onboarding_checklist_dismissed_v1";

const safeArrayLen = (v) => {
  if (Array.isArray(v)) return v.length;
  if (Array.isArray(v?.data)) return v.data.length;
  if (Array.isArray(v?.items)) return v.items.length;
  return 0;
};

/**
 * OnboardingChecklist
 * Real-state first-run guidance for new business owners. Shown on the Front Desk
 * dashboard when any step is incomplete and the owner hasn't dismissed it.
 * Non-blocking: dismissible, collapsible, never gates the app.
 */
export default function OnboardingChecklist() {
  const { get } = useApi();
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" && window.localStorage?.getItem(DISMISS_KEY) === "1"
  );
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    business: false,
    clients: 0,
    jobs: 0,
    workers: 0,
    quotesOrInvoices: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [status, clients, jobs, workers, quotes, invoices] = await Promise.all([
      get("/onboarding/status"),
      get("/clients"),
      get("/jobs"),
      get("/team/workers"),
      get("/quotes"),
      get("/invoices"),
    ]);
    setCounts({
      business: !!(status?.success && status.data?.onboarding_completed),
      clients: safeArrayLen(clients?.data),
      jobs: safeArrayLen(jobs?.data),
      workers: safeArrayLen(workers?.data),
      quotesOrInvoices: safeArrayLen(quotes?.data) + safeArrayLen(invoices?.data),
    });
    setLoading(false);
  }, [get]);

  useEffect(() => {
    if (dismissed) return;
    load();
  }, [load, dismissed]);

  const steps = useMemo(
    () => [
      { id: "business", label: "Add your business details", cta: "Open setup", to: "/onboarding", done: counts.business },
      { id: "client", label: "Add your first client", cta: "Add client", to: "/clients", done: counts.clients > 0 },
      { id: "job", label: "Create your first job", cta: "New job", to: "/jobs/new", done: counts.jobs > 0 },
      { id: "worker", label: "Invite your first worker", cta: "Open Team", to: "/team", done: counts.workers > 0 },
      { id: "quote", label: "Send a quote or invoice", cta: "New quote", to: "/quotes/new", done: counts.quotesOrInvoices > 0 },
    ],
    [counts]
  );

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;

  // Hide entirely if dismissed, still loading the first response, or everything is done
  if (dismissed) return null;
  if (!loading && completedCount === totalCount) return null;

  const dismiss = () => {
    try {
      window.localStorage?.setItem(DISMISS_KEY, "1");
    } catch (_e) {
      /* noop */
    }
    setDismissed(true);
  };

  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <section
      data-testid="onboarding-checklist"
      style={{
        background: "var(--cx-surface)",
        border: "1px solid var(--cx-border)",
        borderRadius: 22,
        padding: "18px 20px",
        marginBottom: 18,
        boxShadow: "0 6px 18px rgba(14,14,14,0.05)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#355C00",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: "var(--cx-accent)",
                boxShadow: "0 0 0 3px var(--cx-accent-soft)",
              }}
            />
            Welcome to Churvox
          </div>
          <h3
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "-0.018em",
              margin: 0,
              color: "var(--cx-text)",
              lineHeight: 1.15,
            }}
          >
            First steps to get your Front Desk running
          </h3>
          <div style={{ fontSize: 13, color: "var(--cx-muted)", marginTop: 4, lineHeight: 1.45 }}>
            {completedCount} of {totalCount} done · Churvox will fill the zones as you go.
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          data-testid="onboarding-checklist-dismiss"
          aria-label="Dismiss onboarding checklist"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--cx-muted)",
            fontSize: 13,
            cursor: "pointer",
            padding: "6px 8px",
            borderRadius: 8,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Dismiss
        </button>
      </header>

      {/* progress bar */}
      <div
        aria-hidden="true"
        style={{
          height: 6,
          background: "var(--cx-bg-soft)",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--cx-accent)",
            transition: "width 280ms ease",
          }}
        />
      </div>

      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 8,
        }}
        className="cx-onboarding-list"
      >
        {steps.map((s) => (
          <li
            key={s.id}
            data-testid={`onboarding-step-${s.id}`}
            data-done={s.done ? "1" : "0"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              background: s.done ? "var(--cx-accent-soft)" : "var(--cx-bg-soft)",
              border: `1px solid ${s.done ? "rgba(200,255,77,0.5)" : "var(--cx-border)"}`,
              borderRadius: 12,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: s.done ? "var(--cx-accent)" : "var(--cx-surface)",
                border: `1.5px solid ${s.done ? "var(--cx-accent-hover)" : "var(--cx-border-strong)"}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0E0E0E",
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {s.done ? "✓" : ""}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--cx-text)",
                textDecoration: s.done ? "line-through" : "none",
                opacity: s.done ? 0.7 : 1,
              }}
            >
              {s.label}
            </span>
            {!s.done ? (
              <Link to={s.to} style={{ textDecoration: "none" }}>
                <CxButton variant="primary" size="sm" data-testid={`onboarding-cta-${s.id}`}>
                  {s.cta}
                </CxButton>
              </Link>
            ) : null}
          </li>
        ))}
      </ol>

      <style>{`
        @media (min-width: 980px) {
          .cx-onboarding-list { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
    </section>
  );
}
