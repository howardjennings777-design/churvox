import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import SmartHubErrorBoundary from "../components/SmartHubErrorBoundary";

const asArray = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.actions) ? v.actions : [];

const idOf = (x) => String(x?.id || x?._id || "");
const money = (n) => `$${Number(n || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

function actionMove(a) {
  const id = idOf(a);
  return {
    id: `a-${id}`,
    lane: "approve",
    label: "AI prepared",
    title: a.title || "Prepared owner action",
    detail: a.reason || a.owner_facing_explanation || a.summary || "Churvox prepared this admin move for owner review.",
    cta: "Review",
    facts: [
      ["Type", a.action_type || "Action"],
      ["Status", a.status || "Pending"],
      ["Source", a.related_type || "Churvox"],
    ],
  };
}

function jobMove(j, lane) {
  const title = j.title || j.job_name || j.client_name || "Job";
  const client = j.client_name || j.customer_name || "Client";
  const worker = j.assigned_worker_name || j.worker_name || "Unassigned";
  return {
    id: `j-${lane}-${idOf(j)}`,
    lane,
    label: lane === "fix" ? "Needs fixing" : lane === "money" ? "Money move" : "Field move",
    title,
    detail:
      lane === "fix"
        ? "This work needs a worker or missing details before it can move cleanly."
        : lane === "money"
        ? "Completed work is ready to be checked for invoice/admin follow-up."
        : "This job is active or scheduled in the field.",
    cta: lane === "fix" ? "Fix" : lane === "money" ? "Prepare" : "Open",
    facts: [
      ["Client", client],
      ["Worker", worker],
      ["Status", j.status || "Open"],
    ],
  };
}

function invoiceMove(i) {
  const customer = i.customer_name || i.client_name || "Client";
  const total = i.balance_due || i.balance || i.total || i.amount || 0;
  return {
    id: `i-${idOf(i)}`,
    lane: "money",
    label: "Money desk",
    title: `${customer} · ${money(total)}`,
    detail: "This invoice needs review, payment follow-up, or cashflow attention.",
    cta: "Review",
    facts: [
      ["Customer", customer],
      ["Amount", money(total)],
      ["Status", i.status || "Open"],
    ],
  };
}

function WorkhorseDashboard() {
  const { get, post } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [lane, setLane] = useState("approve");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, j, i] = await Promise.all([
      get("/ai-operator/actions"),
      get("/jobs"),
      get("/invoices"),
    ]);
    if (a.success) setActions(asArray(a.data));
    if (j.success) setJobs(asArray(j.data));
    if (i.success) setInvoices(asArray(i.data));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const approve = useMemo(
    () => actions.filter((a) => ["pending", "ready", "edited", ""].includes(String(a.status || "").toLowerCase())).slice(0, 12).map(actionMove),
    [actions]
  );

  const fix = useMemo(
    () => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "fix")),
    [jobs]
  );

  const field = useMemo(
    () => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(String(j.status || "").toLowerCase())).slice(0, 12).map((j) => jobMove(j, "field")),
    [jobs]
  );

  const moneyLane = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(String(j.status || "").toLowerCase()) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 8).map((j) => jobMove(j, "money"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(String(i.status || "").toLowerCase())).slice(0, 8).map(invoiceMove);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const lanes = { approve, fix, field, money: moneyLane };
  const visible = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : visible[0];
  const total = approve.length + fix.length + field.length + moneyLane.length;

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) {
      toast.success("Churvox scan complete");
      load();
    } else {
      toast.error(res.error || "Scan failed");
    }
  };

  return (
    <main className="wh-shell">
      <section className="px-hero">
        <p className="px-hero__eyebrow">Churvox Workhorse Command Desk</p>
        <h1 className="px-hero__title">Churvox has prepared the next move.</h1>
        <p className="px-hero__sub">
          Work comes in, Churvox prepares the admin, and the owner reviews one clear decision at a time.
        </p>
        <div className="px-hero__actions">
          <button className="px-btn px-btn--primary" onClick={runScan} disabled={scanning}>
            {scanning ? "Scanning…" : "Run scan"}
          </button>
          <Link className="px-btn" to="/jobs">Open jobs</Link>
          <Link className="px-btn" to="/invoices">Money desk</Link>
        </div>
      </section>

      <section className="wh-board">
        <aside className="px-card">
          <div className="px-card__body">
            <p className="wh-kicker">Operating lanes</p>
            <div className="wh-zone-stack">
              {[
                ["approve", "Ready to approve", approve.length],
                ["fix", "Needs fixing", fix.length],
                ["field", "Field & crew", field.length],
                ["money", "Money desk", moneyLane.length],
              ].map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={`wh-zone ${lane === key ? "is-active" : ""}`}
                  onClick={() => {
                    setLane(key);
                    setSelected(null);
                  }}
                >
                  <span>{label}</span>
                  <strong>{count}</strong>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <article className="px-card">
          <div className="px-card__body">
            {loading ? (
              <p className="px-hero__sub">Loading command desk…</p>
            ) : current ? (
              <>
                <p className="wh-kicker">{current.label}</p>
                <h2 className="wh-slip-title">{current.title}</h2>
                <p className="px-hero__sub">{current.detail}</p>
                <div className="wh-facts">
                  {current.facts.map(([a, b]) => (
                    <div className="wh-fact" key={a}>
                      <span>{a}</span>
                      <strong>{b}</strong>
                    </div>
                  ))}
                </div>
                <button className="px-btn px-btn--primary" style={{ marginTop: 18 }}>
                  {current.cta} work slip
                </button>
              </>
            ) : (
              <p className="px-hero__sub">No prepared moves in this lane.</p>
            )}
          </div>
        </article>

        <aside className="px-card">
          <div className="px-card__body">
            <p className="wh-kicker">Machine state</p>
            <div className="px-stat">
              <span className="px-stat__label">Prepared work</span>
              <strong className="px-stat__value">{total}</strong>
              <span className="px-stat__delta">Across admin, field, and money desk</span>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <Link className="px-btn" to="/clients">Client vault</Link>
              <Link className="px-btn" to="/quotes">Quote press</Link>
              <Link className="px-btn" to="/team">Crew rack</Link>
            </div>
          </div>
        </aside>
      </section>

      <section className="px-card" style={{ marginTop: 14 }}>
        <div className="px-card__body">
          <p className="wh-kicker">Prepared queue</p>
          <div className="wh-queue">
            {visible.length ? visible.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`wh-task ${current?.id === item.id ? "is-active" : ""}`}
                onClick={() => setSelected(item)}
              >
                <span className="wh-pill">{item.cta}</span>
                <h3>{item.title}</h3>
                <p className="px-row__sub">{item.detail}</p>
              </button>
            )) : (
              <p className="px-hero__sub">No work waiting here.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <SmartHubErrorBoundary>
      <WorkhorseDashboard />
    </SmartHubErrorBoundary>
  );
}
