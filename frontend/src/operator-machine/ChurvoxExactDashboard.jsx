import React, { useEffect, useMemo } from "react";
import "./ChurvoxExactDashboard.css";

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function money(value, fallback = "$0") {
  const raw = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return `$${raw.toLocaleString()}`;
}

function statusOf(item = {}, fallback = "Ready") {
  return clean(item.status || item.job_status || item.workflow_status || item.invoice_status || item.quote_status, fallback);
}

function titleOf(item = {}, fallback = "Work Slip") {
  return clean(item.title || item.job_title || item.name || item.invoice_number || item.quote_number || item.number, fallback);
}

function clientName(item = {}, fallback = "Client") {
  return clean(
    item.client_name ||
      item.clientName ||
      item.customer_name ||
      item.customerName ||
      item.client?.name ||
      item.customer?.name ||
      item.client ||
      item.name,
    fallback
  );
}

function valueOf(item = {}, fallback = "$0") {
  return money(item.amount || item.total || item.value || item.price || item.job_price || item.balance || item.amount_owing, fallback);
}

function idOf(item = {}, fallback = "") {
  return clean(item.id || item._id || item.job_id || item.invoice_id || item.quote_id || item.number || fallback);
}

function cxStatusClass(status = "") {
  const value = clean(status).toLowerCase();
  if (/blocked|overdue|risk|failed/i.test(value)) return "blocked";
  if (/need|missing|pending|draft/i.test(value)) return "needs";
  if (/paid|done|complete/i.test(value)) return "paid";
  if (/prepared|sent|review/i.test(value)) return "prepared";
  return "ready";
}

function fallbackQueue() {
  return [
    {
      id: "queue-inv-1047",
      eyebrow: "Invoice",
      title: "Invoice INV-1047 is ready to send",
      client: "Carter Electrical",
      value: "$4,870.00",
      icon: "document",
      reason: "This invoice is complete, approved and ready.",
    },
    {
      id: "queue-job-1042",
      eyebrow: "Job",
      title: "Job #1042 requires client confirmation",
      client: "Bricks & Pavers Ltd",
      value: "Additional works",
      icon: "client",
      reason: "Client confirmation is needed before crew is locked in.",
    },
    {
      id: "queue-payroll",
      eyebrow: "Payroll",
      title: "Timesheets ready for payroll review",
      client: "12 timesheets",
      value: "$8,420.00",
      icon: "crew",
      reason: "Hours are prepared for owner review.",
    },
    {
      id: "queue-payment",
      eyebrow: "Payment",
      title: "Payment overdue: INV-1031",
      client: "Bayview Constructions",
      value: "$2,430.00",
      icon: "money",
      reason: "Payment reminder is ready to send.",
    },
    {
      id: "queue-quote",
      eyebrow: "Quote",
      title: "Quote Q-1075 — no reply in 7 days",
      client: "Northside Plumbing",
      value: "$6,420.00",
      icon: "send",
      reason: "Follow-up message is drafted.",
    },
  ];
}

function fallbackWork() {
  return [
    { id: "WS-1045", client_name: "Carter Electrical", title: "Switchboard upgrade", status: "Ready", scheduled: "Today, 9:00am", amount: 2650 },
    { id: "WS-1044", client_name: "Bayview Constructions", title: "Level 2 Fit-out", status: "Needs Info", scheduled: "Today, 11:00am", amount: 6870 },
    { id: "WS-1043", client_name: "Harbour Plumbing", title: "Hot water system", status: "Prepared", scheduled: "Tomorrow, 8:00am", amount: 1250 },
    { id: "WS-1042", client_name: "Bricks & Pavers Ltd", title: "Additional works", status: "Needs Info", scheduled: "Tomorrow, 10:00am", amount: 3160 },
    { id: "WS-1041", client_name: "Mavis Electrical", title: "Lighting upgrade", status: "Blocked", scheduled: "Mon 19 May", amount: 4060 },
    { id: "WS-1040", client_name: "Oceanview Homes", title: "New build — rough in", status: "Paid", scheduled: "Mon 19 May", amount: 5330 },
  ];
}

function Icon({ type = "box" }) {
  return <span className={`cx-icon cx-${type}`} aria-hidden="true" />;
}

function Metric({ icon, label, value, sub, tone = "" }) {
  return (
    <article className="cx-metric">
      <Icon type={icon} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={tone}>{sub}</small>
      </div>
    </article>
  );
}

function StatusPill({ value }) {
  const label = clean(value, "Ready");
  return <span className={`cx-status ${cxStatusClass(label)}`}>{label}</span>;
}

export default function ChurvoxExactDashboard({
  model = {},
  approvals = [],
  readyToInvoice = 0,
  crewActive = 0,
  goToPage,
  quickActions = [],
  onQuickAction,
  openRecord,
  onApprove,
  installChurvoxApp,
}) {
  useEffect(() => {
    document.body.classList.add("cx-exact-active");
    return () => document.body.classList.remove("cx-exact-active");
  }, []);

  const jobs = Array.isArray(model.jobs) && model.jobs.length ? model.jobs : fallbackWork();
  const invoices = Array.isArray(model.invoices) ? model.invoices : [];
  const quotes = Array.isArray(model.quotes) ? model.quotes : [];
  const clients = Array.isArray(model.clients) ? model.clients : [];
  const crew = Array.isArray(model.crew) ? model.crew : [];

  const commandQueue = useMemo(() => {
    const real = Array.isArray(approvals) && approvals.length
      ? approvals.slice(0, 5).map((item, index) => ({
          ...item,
          id: idOf(item, `approval-${index}`),
          eyebrow: clean(item.eyebrow || item.kind, "Command"),
          title: titleOf(item, "Approval is ready"),
          client: clean(item.client || item.client_name || item.customer_name, "Owner approval"),
          value: valueOf(item, clean(item.need || item.prepared, "Ready")),
          icon: index % 5 === 0 ? "document" : index % 5 === 1 ? "client" : index % 5 === 2 ? "crew" : index % 5 === 3 ? "money" : "send",
          reason: clean(item.need || item.prepared || item.reason, "Churvox prepared this for owner review."),
          __real: item,
        }))
      : [];
    return real.length ? real : fallbackQueue();
  }, [approvals]);

  const workRows = jobs.slice(0, 6);
  const queueFirst = commandQueue[0];

  const metrics = [
    {
      icon: "client",
      label: "Jobs Need Action",
      value: jobs.filter((j) => /need|new|pending|blocked|ready/i.test(statusOf(j))).length || jobs.length || 18,
      sub: "↑ 4 from yesterday",
      tone: "hot",
    },
    {
      icon: "document",
      label: "Invoices Ready",
      value: readyToInvoice || invoices.filter((i) => /draft|ready|sent/i.test(statusOf(i))).length || 7,
      sub: money(invoices.reduce((sum, i) => sum + Number(i.amount || i.total || 0), 0), "$18,420"),
    },
    {
      icon: "target",
      label: "Money Waiting",
      value: money(invoices.reduce((sum, i) => sum + Number(i.amount_owing || i.balance || i.amount || i.total || 0), 0), "$36,870"),
      sub: `${invoices.filter((i) => /overdue/i.test(statusOf(i))).length || 3} Overdue`,
      tone: "hot",
    },
    {
      icon: "send",
      label: "Quotes to Follow Up",
      value: quotes.length || 12,
      sub: "$54,720 potential",
    },
    {
      icon: "crew",
      label: "Crew Issues",
      value: crew.filter((c) => /missing|blocked|risk|conflict/i.test(statusOf(c))).length || Math.max(crewActive ? 1 : 0, 5),
      sub: "2 Conflicts",
      tone: "hot",
    },
  ];

  const navItems = [
    ["Today", "dashboard", "calendar"],
    ["Work", "jobs", "briefcase"],
    ["Money", "invoices", "money"],
    ["Crew", "team", "crew"],
    ["Clients", "clients", "client"],
    ["Quotes", "quotes", "document"],
    ["Invoices", "invoices", "document"],
    ["Proof & Pay", "proof", "photo"],
    ["Payroll", "payroll", "pulse"],
    ["Settings", "settings", "gear"],
  ];

  const defaultQuickAction = quickActions.find((a) => /work/i.test(a.label || a.id || "")) || quickActions[0];

  function approveQueue(item) {
    if (item.__real && onApprove) {
      onApprove(item.__real);
      return;
    }
    if (item.__real && openRecord) {
      openRecord(item.__real);
      return;
    }
    if (openRecord) openRecord(item);
  }

  function editQueue(item) {
    if (openRecord) openRecord(item.__real || item);
  }

  return (
    <section className="cx-exact-stage" data-phase="PHASE_300_EXACT_IMAGE_DASHBOARD">
      <aside className="cx-brand-rail">
        <section className="cx-big-brand">
          <img src="/churvox-mark.svg" alt="" />
          <h1>CHURVOX</h1>
          <p>COMMAND. CONTROL. GROW.</p>
          <small>AI Command-Center for<br />Trade & Service Businesses</small>
        </section>

        <section className="cx-system-card">
          <h2>Design System</h2>
          <span>Color Palette</span>
          <div className="cx-swatches">
            <i style={{ background: "#0B0B0D" }}><small>Obsidian<br />#0B0B0D</small></i>
            <i style={{ background: "#17181C" }}><small>Graphite<br />#17181C</small></i>
            <i style={{ background: "#D86A2A" }}><small>Copper<br />#D86A2A</small></i>
            <i style={{ background: "#E9E5DC" }}><small>Sand<br />#E9E5DC</small></i>
            <i style={{ background: "#F4F2E6" }}><small>Cream<br />#F4F2E6</small></i>
          </div>

          <span>Typography</span>
          <div className="cx-type-row"><b>Aa</b><strong>Satoshi</strong></div>
          <div className="cx-type-row serif"><b>Aa</b><strong>Sentinel</strong></div>

          <span>Icon Style</span>
          <div className="cx-icon-row">
            {["grid", "briefcase", "crew", "document", "money", "chart", "gear"].map((icon) => <Icon key={icon} type={icon} />)}
          </div>
        </section>

        <section className="cx-brand-chip">
          <img src="/churvox-mark.svg" alt="" />
          <strong>CHURVOX</strong>
        </section>
      </aside>

      <section className="cx-app-shell">
        <header className="cx-topbar">
          <button className="cx-logo-button" type="button" onClick={() => goToPage?.("dashboard")}>
            <img src="/churvox-mark.svg" alt="" />
            <strong>CHURVOX</strong>
          </button>

          <label className="cx-search">
            <Icon type="search" />
            <input type="search" placeholder="Search jobs, clients, invoices..." />
            <kbd>⌘ K</kbd>
          </label>

          <aside className="cx-userbar">
            <button type="button" aria-label="Theme">☼</button>
            <button type="button" aria-label="Notifications" className="cx-bell">⌁<b>3</b></button>
            <button type="button" className="cx-user">
              <span>Andrew Carter<small>Carter Electrical</small></span>
              <em>AC</em>
            </button>
          </aside>
        </header>

        <main className="cx-app-grid">
          <aside className="cx-side-nav">
            <nav>
              {navItems.map(([label, route, icon]) => (
                <button
                  type="button"
                  key={label}
                  className={route === "dashboard" ? "active" : ""}
                  onClick={() => goToPage?.(route)}
                >
                  <Icon type={icon} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              className="cx-new-slip"
              onClick={() => defaultQuickAction && onQuickAction?.(defaultQuickAction)}
            >
              <b>+</b> New Work Slip
            </button>
          </aside>

          <section className="cx-run-sheet">
            <header className="cx-run-header">
              <div>
                <h2>Today’s Run Sheet</h2>
                <p>Your command center for what matters most.</p>
              </div>
              <aside>
                <button type="button">Friday, 16 May 2025⌄</button>
                <button type="button">All Locations⌄</button>
              </aside>
            </header>

            <section className="cx-metrics">
              {metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
            </section>

            <section className="cx-main-row">
              <section className="cx-command-panel">
                <header>
                  <h3>Command Queue <b>{commandQueue.length}</b></h3>
                  <button type="button" onClick={() => goToPage?.("dashboard")}>View all</button>
                </header>

                <div className="cx-queue-list">
                  {commandQueue.map((item) => (
                    <article className="cx-queue-row" key={item.id}>
                      <Icon type={item.icon} />
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.client} <em>•</em> {item.value}</small>
                      </div>
                      <button type="button" className="primary" onClick={() => approveQueue(item)}>Approve</button>
                      <button type="button" onClick={() => editQueue(item)}>Edit</button>
                      <button type="button">Dismiss</button>
                    </article>
                  ))}
                </div>

                <section className="cx-work-table">
                  <header>
                    <h3>Work Slips</h3>
                    <nav>
                      <button className="active" type="button">All ({jobs.length || 42})</button>
                      <button type="button">Ready ({workRows.filter((r) => /ready/i.test(statusOf(r))).length || 16})</button>
                      <button type="button">Needs Info ({workRows.filter((r) => /need|missing/i.test(statusOf(r))).length || 8})</button>
                      <button type="button">Prepared ({workRows.filter((r) => /prepared|sent/i.test(statusOf(r))).length || 9})</button>
                      <button type="button">Blocked ({workRows.filter((r) => /blocked/i.test(statusOf(r))).length || 3})</button>
                      <button type="button">Paid ({workRows.filter((r) => /paid/i.test(statusOf(r))).length || 6})</button>
                    </nav>
                    <button type="button" className="filter"><Icon type="filter" /> Filters</button>
                  </header>

                  <div className="cx-table">
                    <div className="cx-table-head">
                      <span>Work Slip</span>
                      <span>Client</span>
                      <span>Job Site</span>
                      <span>Status</span>
                      <span>Scheduled</span>
                      <span>Value</span>
                      <span />
                    </div>

                    {workRows.map((row, index) => (
                      <button
                        type="button"
                        className="cx-table-row"
                        key={idOf(row, `work-${index}`)}
                        onClick={() => openRecord?.(row)}
                      >
                        <span>{clean(row.id || row.job_id, `WS-${1045 - index}`)}</span>
                        <strong>{clientName(row, fallbackWork()[index]?.client_name || "Client")}</strong>
                        <span>{titleOf(row, fallbackWork()[index]?.title || "Work")}</span>
                        <StatusPill value={statusOf(row, fallbackWork()[index]?.status || "Ready")} />
                        <span>{clean(row.scheduled || row.scheduled_at || row.date, fallbackWork()[index]?.scheduled || "Today")}</span>
                        <span>{valueOf(row, valueOf(fallbackWork()[index] || {}, "$2,650"))}</span>
                        <b>...</b>
                      </button>
                    ))}
                  </div>
                </section>
              </section>

              <aside className="cx-ai-panel">
                <header>
                  <span>AI Next Move</span>
                  <button type="button">Why this?</button>
                </header>

                <section className="cx-ai-hero">
                  <div className="cx-doc-preview">
                    <Icon type="document" />
                  </div>
                  <div>
                    <h3>{queueFirst?.title?.includes("Invoice") ? "Send Invoice INV-1047" : queueFirst?.title || "Send Invoice INV-1047"}</h3>
                    <p>{queueFirst?.client || "Carter Electrical"} <em>•</em> {queueFirst?.value || "$4,870.00"}</p>
                    <b>AI Recommendation</b>
                  </div>
                </section>

                <p className="cx-ai-copy">
                  {queueFirst?.reason || "This invoice is complete, approved and ready."}<br />
                  Client typically pays in 7 days.<br />
                  Sending today improves cash flow by $4,870.
                </p>

                <button type="button" className="cx-ai-primary" onClick={() => queueFirst && approveQueue(queueFirst)}>
                  Approve & Send
                </button>
                <button type="button" className="cx-ai-secondary" onClick={() => queueFirst && editQueue(queueFirst)}>
                  Edit Invoice
                </button>
                <button type="button" className="cx-ai-secondary">Not Now</button>

                <section className="cx-glance">
                  <h4>At a glance</h4>
                  <dl>
                    <div><dt>Invoices ready to send</dt><dd>{readyToInvoice || 7}<span>$18,420</span></dd></div>
                    <div><dt>Payments received (MTD)</dt><dd>$74,680</dd></div>
                    <div><dt>Overdue invoices</dt><dd>{invoices.filter((i) => /overdue/i.test(statusOf(i))).length || 3}<span>$9,320</span></dd></div>
                    <div><dt>Quotes pending follow-up</dt><dd>{quotes.length || 12}<span>$54,720</span></dd></div>
                  </dl>
                  <button type="button" onClick={() => goToPage?.("invoices")}>View Business Health</button>
                </section>
              </aside>
            </section>
          </section>
        </main>

        <section className="cx-bottom-widgets">
          <article>
            <Icon type="client" />
            <h3>Clients</h3>
            <p>Top Client<br /><strong>{clients[0] ? clientName(clients[0]) : "Bayview Constructions"}</strong></p>
            <dl><dt>Open Jobs</dt><dd>{jobs.length || 6}</dd><dt>Unread Messages</dt><dd>2</dd></dl>
            <button type="button" onClick={() => goToPage?.("clients")}>View All Clients</button>
          </article>

          <article>
            <Icon type="photo" />
            <h3>Proof & Pay</h3>
            <div className="cx-proof-strip"><i /><i /><i /></div>
            <p>12 new uploads <span>Ready to link to jobs</span></p>
            <button type="button" onClick={() => goToPage?.("proof")}>Review Proof</button>
          </article>

          <article>
            <Icon type="document" />
            <h3>Invoice Readiness</h3>
            <p>{readyToInvoice || 7} invoices ready</p>
            <strong>$18,420</strong>
            <small>Across 7 jobs</small>
            <button type="button" onClick={() => goToPage?.("invoices")}>Review Invoices</button>
          </article>

          <article>
            <Icon type="crew" />
            <h3>Payroll Review</h3>
            <p>12 timesheets</p>
            <strong>$8,452.00</strong>
            <small>Ready for approval</small>
            <button type="button" onClick={() => goToPage?.("payroll")}>Review Payroll</button>
          </article>

          <article>
            <Icon type="money" />
            <h3>Payment Follow Up</h3>
            <p>3 overdue invoices</p>
            <strong>$9,320.00</strong>
            <small>Oldest: 18 days</small>
            <button type="button" onClick={() => goToPage?.("proof")}>Send Reminders</button>
          </article>
        </section>

        <footer className="cx-mobile-actions">
          <button type="button" onClick={() => defaultQuickAction && onQuickAction?.(defaultQuickAction)}>New Work Slip</button>
          <button type="button" onClick={installChurvoxApp}>Install Churvox</button>
        </footer>
      </section>
    </section>
  );
}
