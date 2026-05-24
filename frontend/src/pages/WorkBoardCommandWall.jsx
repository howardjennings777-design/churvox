import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/churvoxWorkBoardCommandWall.css";

const list = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.jobs) ? v.jobs :
  Array.isArray(v?.invoices) ? v.invoices :
  Array.isArray(v?.quotes) ? v.quotes : [];

const id = (x) => String(x?.id || x?._id || "");
const low = (x) => String(x || "").toLowerCase();
const money = (x) => `$${Number(x || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);

function makeAI(a) {
  const type = a.action_type || a.type || "ai_action";
  const payload = a.payload || a.draft_payload || {};
  const t = low(type);
  let board = "do";
  if (t.includes("assign") || t.includes("quote")) board = "fix";
  if (t.includes("invoice") && !t.includes("reminder")) board = "bill";
  if (t.includes("reminder")) board = "owing";

  return {
    id: `ai-${id(a)}`,
    rawId: id(a),
    board,
    source: "AI",
    type,
    payload,
    title: a.title || a.summary || "AI action ready",
    detail: a.recommendation || a.reason || a.owner_facing_explanation || a.summary || "Review before anything happens.",
    label: t.includes("reminder") ? "Payment reminder" : t.includes("invoice") ? "Invoice draft" : t.includes("assign") ? "Assign crew" : t.includes("quote") ? "Quote follow-up" : "AI action",
    risk: a.risk || a.risk_level || "low",
  };
}

function makeJob(j) {
  const status = low(j.status);
  const worker = j.assigned_worker_name || j.worker_name || "";
  const unassigned = !worker && !j.assigned_worker_id;
  let board = unassigned ? "fix" : "today";
  if (["completed", "done", "complete"].includes(status) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)) board = "bill";

  return {
    id: `job-${id(j)}`,
    board,
    source: "Job",
    type: "job",
    title: j.title || j.job_name || j.client_name || "Job",
    detail: j.address || j.description || "Job record",
    label: board === "bill" ? "Ready to bill" : unassigned ? "Unassigned job" : status || "Job",
    client: j.client_name || j.customer_name || "Client",
    worker: worker || "Unassigned",
    amount: j.price || j.job_price || j.fixed_price || j.total || j.amount || 0,
    risk: unassigned ? "needs fixing" : "low",
  };
}

function makeInvoice(i) {
  const amount = i.balance_due || i.balance || i.total || i.amount || 0;
  return {
    id: `invoice-${id(i)}`,
    board: "owing",
    source: "Invoice",
    type: "invoice",
    title: `${i.customer_name || i.client_name || "Client"} · ${money(amount)}`,
    detail: i.description || "Money is waiting. Follow up payment.",
    label: low(i.status) === "overdue" ? "Overdue" : "Waiting payment",
    client: i.customer_name || i.client_name || "Client",
    amount,
    risk: low(i.status) === "overdue" ? "high" : "medium",
  };
}

function makeQuote(q) {
  return {
    id: `quote-${id(q)}`,
    board: "fix",
    source: "Quote",
    type: "quote",
    title: q.title || q.customer_name || q.client_name || "Quote follow-up",
    detail: q.description || "Quote needs review or follow-up.",
    label: "Quote",
    client: q.customer_name || q.client_name || "Client",
    amount: q.total || q.amount || q.price || 0,
    risk: "medium",
  };
}

function mainTitle(item) {
  if (!item) return "Nothing waiting";
  const p = item.payload || {};
  const type = low(item.type);
  const client = p.client_name || p.customer_name || item.client || "";
  if (type.includes("invoice_reminder")) return `Send reminder${client ? ` to ${client}` : ""}`;
  if (type.includes("invoice")) return `Create invoice${client ? ` for ${client}` : ""}`;
  if (type.includes("assign")) return "Assign crew to job";
  if (type.includes("quote")) return `Follow up quote${client ? ` for ${client}` : ""}`;
  return item.title;
}

function mainDetail(item) {
  if (!item) return "No action selected.";
  const p = item.payload || {};
  const amount = p.amount_due || p.balance_due || p.amount || p.total || item.amount;
  const days = p.days_overdue || p.overdue_days;
  if (low(item.type).includes("reminder")) {
    return `${days ? `${days} days overdue. ` : ""}${amount ? `${money(amount)} owing. ` : ""}Churvox has this ready. Nothing sends until you approve.`;
  }
  return item.detail || "Review this before anything changes.";
}

export default function WorkBoardCommandWall() {
  const { get, post, patch } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [board, setBoard] = useState("do");
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState("");
  const [editing, setEditing] = useState(false);
  const [ask, setAsk] = useState("");

  const load = useCallback(async () => {
    const [a, j, i, q] = await Promise.all([
      get("/ai-operator/actions"),
      get("/jobs"),
      get("/invoices"),
      get("/quotes"),
    ]);
    if (a.success) setActions(list(a.actions || a.data || a));
    if (j.success) setJobs(list(j.data || j));
    if (i.success) setInvoices(list(i.data || i));
    if (q.success) setQuotes(list(q.data || q));
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const ai = useMemo(() => actions.filter((a) => pending.has(low(a.status))).map(makeAI), [actions]);
  const all = useMemo(() => [
    ...ai,
    ...jobs.map(makeJob),
    ...invoices.filter((x) => ["sent", "open", "overdue", "unpaid", "pending", ""].includes(low(x.status))).map(makeInvoice),
    ...quotes.map(makeQuote),
  ], [ai, jobs, invoices, quotes]);

  const boards = {
    do: all.filter((x) => x.board === "do"),
    fix: all.filter((x) => x.board === "fix"),
    today: all.filter((x) => x.board === "today"),
    bill: all.filter((x) => x.board === "bill"),
    owing: all.filter((x) => x.board === "owing"),
  };

  const current = selected || boards.do[0] || boards.fix[0] || boards.owing[0] || boards.today[0] || boards.bill[0];
  const owingTotal = boards.owing.reduce((s, x) => s + Number(x.amount || 0), 0);
  const billTotal = boards.bill.reduce((s, x) => s + Number(x.amount || 0), 0);

  const runAI = async () => {
    setBusy("ai");
    const res = await post("/ai/operator/run-daily-check", {});
    setBusy("");
    if (res.success) {
      toast.success("Work Board updated");
      await load();
    } else {
      toast.error(res.error || "AI check failed");
    }
  };

  const approve = async () => {
    if (!current?.rawId) return;
    setBusy(current.rawId);

    const p = current.payload || {};
    const update = {};
    if (editing && edit) {
      if (low(current.type).includes("reminder") || low(current.type).includes("quote")) update.message = edit;
      if (low(current.type).includes("invoice")) update.description = edit;
    }
    if (p.worker_id || p.recommended_worker_id) update.worker_id = String(p.worker_id || p.recommended_worker_id);

    if (Object.keys(update).length) await patch(`/ai-operator/actions/${current.rawId}`, update);

    const res = await post(`/ai-operator/actions/${current.rawId}/approve`, {});
    setBusy("");
    if (res.success) {
      toast.success("Approved");
      setSelected(null);
      setEditing(false);
      await load();
    } else {
      toast.error(res.error || "Could not approve");
    }
  };

  const skip = async () => {
    if (!current?.rawId) return;
    setBusy(current.rawId);
    const res = await post(`/ai-operator/actions/${current.rawId}/reject`, {});
    setBusy("");
    if (res.success) {
      toast.success("Skipped");
      setSelected(null);
      await load();
    } else {
      toast.error(res.error || "Could not skip");
    }
  };

  const askMove = () => {
    const q = low(ask);
    if (q.includes("fix") || q.includes("issue")) setBoard("fix");
    else if (q.includes("today") || q.includes("job")) setBoard("today");
    else if (q.includes("bill") || q.includes("invoice")) setBoard("bill");
    else if (q.includes("owe") || q.includes("pay") || q.includes("overdue")) setBoard("owing");
    else setBoard("do");
  };

  const stats = [
    ["DO NOW", boards.do.length, "Approve next", "do"],
    ["NEEDS FIXING", boards.fix.length, "Blocked or missing", "fix"],
    ["TODAY'S WORK", boards.today.length, "Jobs moving", "today"],
    ["READY TO BILL", boards.bill.length, money(billTotal), "bill"],
    ["MONEY OWING", boards.owing.length, money(owingTotal), "owing"],
  ];

  return (
    <main className="cwb" data-version="CHURVOX_WORK_BOARD_COMMAND_WALL_SMALL_20260524">
      <header className="cwb-top">
        <div>
          <p>CHURVOX WORK BOARD</p>
          <h1>See what needs doing, fixing, working and chasing.</h1>
        </div>
        <div className="cwb-live-line">
          <span>{ai.length} AI ready</span>
          <span>{boards.fix.length} need fixing</span>
          <span>{boards.today.length} jobs today</span>
          <span>{money(owingTotal)} owing</span>
        </div>
        <div className="cwb-actions">
          <button onClick={runAI} disabled={busy === "ai"}>{busy === "ai" ? "Checking…" : "Run AI"}</button>
          <button className="hot" onClick={() => { setBoard("do"); setSelected(boards.do[0] || null); }}>Review next</button>
        </div>
      </header>

      <section className="cwb-status-strip">
        {stats.map(([name, count, note, key]) => (
          <button key={key} className={board === key ? "active" : ""} onClick={() => { setBoard(key); setSelected(null); }}>
            <span>{name}</span>
            <strong>{count}</strong>
            <em>{note}</em>
          </button>
        ))}
      </section>

      <section className="cwb-wall">
        <section className="cwb-now">
          <div className="cwb-section-head">
            <div>
              <p>DO NOW</p>
              <h2>{mainTitle(current)}</h2>
            </div>
            <span>{current?.source || "Board"}</span>
          </div>

          <p className="cwb-command">{mainDetail(current)}</p>

          <div className="cwb-proof">
            <div><span>Outcome</span><strong>{current?.rawId ? "Runs after approval" : "Open item"}</strong></div>
            <div><span>Record</span><strong>{current?.client || current?.worker || current?.status || "Ready"}</strong></div>
            <div><span>Risk</span><strong>{current?.risk || "low"}</strong></div>
          </div>

          {editing ? (
            <label className="cwb-editor">
              <span>Edit before approving</span>
              <textarea value={edit} onChange={(e) => setEdit(e.target.value)} />
            </label>
          ) : null}

          <div className="cwb-now-actions">
            {current?.rawId ? (
              <>
                <button className="hot" onClick={approve} disabled={busy === current.rawId}>{busy === current.rawId ? "Running…" : "Approve"}</button>
                <button onClick={() => { setEditing((v) => !v); setEdit(current?.payload?.message || current?.payload?.description || current?.detail || ""); }}>Edit</button>
                <button onClick={skip} disabled={busy === current.rawId}>Skip</button>
              </>
            ) : (
              <>
                <button className="hot" onClick={runAI}>Prepare actions</button>
                <button onClick={() => setBoard("fix")}>Needs fixing</button>
              </>
            )}
          </div>
        </section>

        <WorkColumn title="NEEDS FIXING" count={boards.fix.length} items={boards.fix} onPick={(x) => { setBoard("fix"); setSelected(x); }} tone="fix" />
        <WorkColumn title="TODAY'S WORK" count={boards.today.length} items={boards.today} onPick={(x) => { setBoard("today"); setSelected(x); }} tone="today" />
        <section className="cwb-board money">
          <div className="cwb-money-top">
            <p>MONEY OWING</p>
            <h2>{money(owingTotal)}</h2>
            <span>{boards.bill.length} ready to bill · {boards.owing.length} waiting payment</span>
          </div>
          <div className="cwb-money-split">
            <button onClick={() => setBoard("bill")}><span>READY BILL</span><strong>{boards.bill.length}</strong><em>{money(billTotal)}</em></button>
            <button onClick={() => setBoard("owing")}><span>CHASE</span><strong>{boards.owing.length}</strong><em>{money(owingTotal)}</em></button>
          </div>
          <div className="cwb-ticket-list">
            {(boards.owing.length ? boards.owing : [{ id: "none", label: "Clear", title: "No money owing loaded", detail: "Open invoices will appear here." }]).slice(0, 4).map((x) => (
              <button key={x.id} onClick={() => setSelected(x)}><span>{x.label}</span><strong>{x.title}</strong><em>{x.detail}</em></button>
            ))}
          </div>
        </section>
      </section>

      <section className="cwb-open-board">
        <div>
          <p>OPEN BOARD</p>
          <h3>{board}</h3>
        </div>
        <div className="cwb-open-list">
          {(boards[board] || []).slice(0, 12).map((x) => (
            <button key={x.id} className={selected?.id === x.id ? "active" : ""} onClick={() => setSelected(x)}>
              <span>{x.label}</span>
              <strong>{x.title}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="cwb-ask">
        <input value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") askMove(); }} placeholder="Ask Churvox… what needs fixing, what is owing, what is ready to bill" />
        <button onClick={askMove}>Ask</button>
      </section>
    </main>
  );
}

function WorkColumn({ title, count, items, onPick, tone }) {
  const fallback = [{ id: `empty-${title}`, label: "Clear", title: `No ${title.toLowerCase()} loaded`, detail: "Items will appear here automatically." }];
  return (
    <section className={`cwb-board ${tone}`}>
      <div className="cwb-board-title">
        <p>{title}</p>
        <strong>{count}</strong>
      </div>
      <div className="cwb-ticket-list">
        {(items.length ? items : fallback).slice(0, 7).map((x) => (
          <button key={x.id} onClick={() => onPick(x)}>
            <span>{x.label}</span>
            <strong>{x.title}</strong>
            <em>{x.detail}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
