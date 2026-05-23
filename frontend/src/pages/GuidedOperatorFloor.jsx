import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.logs) ? v.logs : [];
const idOf = (v) => String(v?.id || v?._id || "");
const low = (v) => String(v || "").toLowerCase();
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);
const doneSet = new Set(["completed", "approved", "dismissed", "rejected"]);
const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const lineTotal = (items) => arr(items).reduce((sum, item) => sum + Number(item?.amount ?? item?.total ?? item?.price ?? item?.unit_price ?? 0) * Number(item?.qty || item?.quantity || 1), 0);

function kindLabel(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminder ready";
  if (t.includes("invoice")) return "Invoice draft ready";
  if (t.includes("assign")) return "Crew assignment ready";
  if (t.includes("quote")) return "Quote follow-up ready";
  if (t.includes("customer")) return "Customer update ready";
  return "Admin decision ready";
}

function groupLabel(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminders";
  if (t.includes("invoice")) return "Invoice drafts";
  if (t.includes("assign")) return "Crew assignments";
  if (t.includes("quote")) return "Quote follow-ups";
  if (t.includes("customer")) return "Customer updates";
  return "Admin decisions";
}

function toAction(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";
  return {
    id: `action-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    type,
    lane: "approvals",
    label: kindLabel(type),
    group: groupLabel(type),
    title: raw.title || raw.summary || "Churvox prepared a decision",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Review it, then approve or skip.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function jobItem(job, lane) {
  return {
    id: `job-${lane}-${idOf(job)}`,
    lane,
    type: lane,
    label: lane === "money" ? "Ready to invoice" : lane === "crew" ? "Crew work" : "Job needs attention",
    group: lane === "money" ? "Ready to invoice" : lane === "crew" ? "Crew work" : "Jobs needing attention",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: lane === "money" ? "Completed work can become invoice/admin follow-up." : lane === "crew" ? "This work is active or scheduled." : "This job needs assignment or an owner decision.",
    status: job.status || "open",
    client: job.client_name || job.customer_name || "Client",
    worker: job.assigned_worker_name || job.worker_name || "Unassigned",
  };
}

function invoiceItem(inv) {
  return {
    id: `invoice-${idOf(inv)}`,
    lane: "money",
    type: "invoice_follow_up",
    label: "Money decision",
    group: "Invoice follow-ups",
    title: `${inv.customer_name || inv.client_name || "Client"} · ${money(inv.balance_due || inv.balance || inv.total || inv.amount)}`,
    detail: "Invoice is open, unpaid, overdue, or waiting for follow-up.",
    status: inv.status || "open",
    client: inv.customer_name || inv.client_name || "Client",
  };
}

function patchFor(item) {
  const p = item?.payload || item?.raw?.payload || item?.raw?.draft_payload || {};
  const type = low(item?.type || item?.raw?.type || item?.raw?.action_type);
  const patch = {};
  if (type === "assign_worker") {
    const workerId = first(p.worker_id, p.recommended_worker_id, p.assigned_worker_id, p.suggested_worker_id, item?.raw?.worker_id);
    if (workerId) {
      patch.worker_id = String(workerId);
      patch.recommended_worker_id = String(workerId);
    }
  }
  if (["create_invoice_draft", "invoice_draft"].includes(type)) {
    const subtotal = Number(first(p.subtotal, p.amount, p.total, lineTotal(p.line_items)) || 0);
    if (subtotal > 0) {
      patch.subtotal = subtotal;
      patch.amount = subtotal;
      patch.total = subtotal;
    }
    patch.gst_rate = Number(first(p.gst_rate, 0.15));
    const description = first(p.description, arr(p.line_items)[0]?.description, item?.title);
    if (description) patch.description = String(description);
    if (p.job_id) patch.job_id = String(p.job_id);
    if (p.client_id) patch.client_id = String(p.client_id);
  }
  if (["invoice_reminder", "quote_follow_up", "quote_followup", "customer_update"].includes(type)) {
    const message = first(p.message, item?.raw?.generated_message, item?.detail);
    if (message) patch.message = String(message);
  }
  return patch;
}

function grouped(items) {
  const map = new Map();
  for (const item of items) {
    const key = low(item.group || item.type || item.title).replace(/[^a-z0-9]+/g, "_");
    if (!map.has(key)) map.set(key, { key, title: item.group || groupLabel(item.type), count: 0, first: item });
    map.get(key).count += 1;
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function reasonLines(item) {
  if (!item) return ["Press Review next decision to start."];
  const p = item.payload || {};
  const lines = [];
  if (item.rawId) lines.push("Churvox has already prepared this admin step.");
  if (item.type?.includes("invoice")) lines.push("This affects money, invoices, or follow-up.");
  if (item.type?.includes("assign")) lines.push("This helps get work assigned without digging through jobs.");
  if (p.message || p.description) lines.push("Draft wording is ready to review.");
  if (p.job_id) lines.push("It is linked to a real job record.");
  lines.push("Nothing sends or changes until you approve.");
  return lines.slice(0, 5);
}

const styles = `
.gof{min-height:100vh;padding:clamp(14px,2vw,30px);background:radial-gradient(circle at 18% 0,rgba(185,244,80,.18),transparent 28%),radial-gradient(circle at 92% 12%,rgba(196,112,46,.23),transparent 30%),linear-gradient(135deg,#0d0d0a,#18140f 48%,#321e0f);color:#fff8e6}.gof button,.gof a{font:inherit}.gof-start{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.36fr);gap:18px;align-items:stretch}.gof-hero,.gof-start-card,.gof-panel{border:1px solid rgba(255,255,255,.12);border-radius:32px;background:linear-gradient(135deg,rgba(255,248,230,.09),rgba(255,248,230,.03));box-shadow:0 24px 90px rgba(0,0,0,.3);padding:clamp(22px,3vw,42px)}.gof-kicker{margin:0 0 12px;color:#b9f450;font-size:12px;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.gof-hero h1{max-width:960px;margin:0;font-size:clamp(48px,8vw,102px);line-height:.84;letter-spacing:-.085em}.gof-hero p{max-width:760px;margin:20px 0 0;color:rgba(255,248,230,.74);font-size:18px;line-height:1.55}.gof-start-card{display:grid;align-content:center;background:linear-gradient(180deg,#fffaf0,#efd8ad);color:#11120d}.gof-start-card strong{font-size:clamp(48px,7vw,78px);line-height:.9;letter-spacing:-.07em}.gof-start-card span{color:#6d5f4d;font-weight:850}.gof-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.gof-btn,.gof a.gof-btn{border:0;border-radius:999px;background:#b9f450;color:#172006;padding:14px 18px;font-weight:950;text-decoration:none;text-align:center;cursor:pointer}.gof-btn.secondary{background:#fff2d6;color:#11120d}.gof-pulse{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.gof-pulse button{border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(255,248,230,.08);color:#fff8e6;padding:16px;text-align:left;cursor:pointer}.gof-pulse button.active{background:#fff8e8;color:#11120d}.gof-pulse span{display:block;color:#b9f450;font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.gof-pulse button.active span{color:#7c5518}.gof-pulse strong{display:block;margin-top:10px;font-size:36px;line-height:1}.gof-work{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.55fr);gap:14px}.gof-slip{position:relative;overflow:hidden;background:linear-gradient(180deg,#fffaf0,#f3dfbb);color:#11120d;min-height:430px}.gof-slip:before{content:"";position:absolute;inset:24px;border-radius:30px;background:#e7d2aa;transform:rotate(-2deg)}.gof-slip-inner{position:relative;border:1px solid #ead9b8;border-radius:28px;background:#fffdf7;min-height:360px;padding:clamp(22px,3vw,38px);box-shadow:0 20px 50px rgba(64,38,10,.13)}.gof-slip h2{margin:0 0 14px;font-size:clamp(38px,5vw,70px);line-height:.9;letter-spacing:-.075em}.gof-slip p{color:#6c6256;font-size:17px;line-height:1.55}.gof-meta{display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px;margin:20px 0}.gof-meta div,.gof-why li{border:1px solid #ead9b8;border-radius:16px;background:#fff6e4;padding:12px}.gof-meta span{display:block;color:#7c6b58;font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.gof-meta strong{display:block;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gof-why{background:linear-gradient(180deg,#fffaf0,#f1dfc0);color:#11120d}.gof-why h3{margin:0 0 14px;font-size:34px;line-height:.95;letter-spacing:-.055em}.gof-why ul{display:grid;gap:10px;margin:0;padding:0;list-style:none}.gof-why li{color:#4d4338;font-weight:830;line-height:1.35}.gof-groups{margin-top:14px;background:linear-gradient(180deg,#fffaf0,#f3dfbb);color:#11120d}.gof-groups-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.gof-groups-head h3{margin:0;font-size:28px;letter-spacing:-.05em}.gof-group-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px}.gof-group-grid button{display:grid;gap:8px;min-height:140px;border:1px solid #ead9b8;border-radius:24px;background:#fff6e4;color:#11120d;padding:16px;text-align:left;cursor:pointer}.gof-group-grid button>span{display:grid;width:44px;height:44px;place-items:center;border-radius:14px;background:#11120d;color:#fff;font-size:22px;font-weight:950}.gof-history{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.gof-log{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #ead9b8;padding:10px 0;color:#11120d}.gof-log strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gof-log span{border-radius:999px;background:#ddfca8;color:#304707;padding:5px 8px;font-size:12px;font-weight:950}@media(max-width:980px){.gof-start,.gof-work,.gof-history{grid-template-columns:1fr}.gof-pulse{grid-template-columns:repeat(2,1fr)}.gof-meta{grid-template-columns:1fr}}@media(max-width:560px){.gof{padding:10px 10px 92px}.gof-hero,.gof-start-card,.gof-panel{border-radius:24px;padding:22px}.gof-hero h1{font-size:44px}.gof-pulse{grid-template-columns:1fr}.gof-slip h2{font-size:36px}.gof-groups-head{display:grid}.gof-group-grid{grid-template-columns:1fr}}`;

export default function GuidedOperatorFloor() {
  const { get, post, patch } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lane, setLane] = useState("approvals");
  const [selected, setSelected] = useState(null);
  const [handled, setHandled] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const once = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, logRes, j, i] = await Promise.all([get("/ai-operator/actions"), get("/ai-operator/command-snapshot"), get("/ai-operator/audit-log"), get("/jobs"), get("/invoices")]);
    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
    if (logRes.success) setLogs(arr(logRes.logs || logRes.data || logRes).slice(0, 8));
    if (j.success) setJobs(arr(j.data || j));
    if (i.success) setInvoices(arr(i.data || i));
    setLoading(false);
  }, [get]);

  const scan = useCallback(async (quiet = false) => {
    setBusy("scan");
    const res = await post("/ai/operator/run-daily-check", {});
    setBusy("");
    if (res.success) {
      if (!quiet) toast.success("Churvox prepared your next decisions");
      await load();
      return true;
    }
    if (!quiet) toast.error(res.error || "AI scan failed");
    return false;
  }, [load, post]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (once.current) return; once.current = true; const k = "churvox_guided_floor_scan"; const last = Number(localStorage.getItem(k) || 0); if (!last || Date.now() - last > 600000) { localStorage.setItem(k, String(Date.now())); scan(true); } }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);
  const approvals = useMemo(() => actions.filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status))).slice(0, 60).map(toAction), [actions, hidden]);
  const completed = useMemo(() => actions.filter((a) => doneSet.has(low(a.status))).slice(0, 8).map(toAction), [actions]);
  const attention = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(low(j.status))).slice(0, 16).map((j) => jobItem(j, "attention")), [jobs]);
  const crew = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status))).slice(0, 16).map((j) => jobItem(j, "crew")), [jobs]);
  const moneyItems = useMemo(() => [...jobs.filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 12).map((j) => jobItem(j, "money")), ...invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status))).slice(0, 12).map(invoiceItem)], [jobs, invoices]);
  const lanes = { approvals, attention, crew, money: moneyItems, done: completed };
  const items = lanes[lane] || [];
  const current = selected && selected.lane === lane ? selected : items[0];
  const groups = useMemo(() => grouped(approvals), [approvals]);
  const urgent = snapshot?.urgent || {};

  const approveOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);
    const payload = patchFor(item);
    if (Object.keys(payload).length) {
      const prep = await patch(`/ai-operator/actions/${item.rawId}`, payload);
      if (!prep.success) { setBusy(""); toast.error(prep.error || "Could not prepare final payload"); return; }
    }
    const res = await post(`/ai-operator/actions/${item.rawId}/approve`, {});
    setBusy("");
    if (res.success) { toast.success("Approved. Churvox completed it."); setHandled((p) => [...new Set([...p, item.rawId])]); setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId)); setSelected(null); await load(); }
    else toast.error(res.error || "Could not approve action");
  };

  const rejectOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);
    const res = await post(`/ai-operator/actions/${item.rawId}/reject`, {});
    setBusy("");
    if (res.success) { toast.success("Skipped."); setHandled((p) => [...new Set([...p, item.rawId])]); setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId)); setSelected(null); await load(); }
    else toast.error(res.error || "Could not skip action");
  };

  const pulse = [["approvals", "Approvals", approvals.length], ["attention", "Jobs", urgent.unassigned_jobs ?? attention.length], ["money", "Money", nzMoney(urgent.open_invoices_total || 0)], ["crew", "Crew", crew.length]];

  return (
    <main className="gof" data-version="CHURVOX_GUIDED_OPERATOR_FLOOR_20260524">
      <style>{styles}</style>
      <section className="gof-start">
        <div className="gof-hero"><p className="gof-kicker">Start here</p><h1>Churvox has prepared the work.</h1><p>{snapshot?.next_best_move || "Review the next decision, then approve, skip, or open the money desk. No digging through pages first."}</p><div className="gof-actions"><button className="gof-btn" onClick={() => { setLane("approvals"); setSelected(approvals[0] || null); }}>Review next decision</button><button className="gof-btn secondary" onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Scanning…" : "Run AI scan"}</button><Link className="gof-btn secondary" to="/invoices">Money desk</Link></div></div>
        <aside className="gof-start-card"><span>Waiting for you</span><strong>{approvals.length}</strong><span>decisions ready</span></aside>
      </section>
      <section className="gof-pulse">{pulse.map(([key, label, value]) => <button key={key} className={lane === key ? "active" : ""} onClick={() => { setLane(key); setSelected(null); }}><span>{label}</span><strong>{value}</strong></button>)}</section>
      <section className="gof-work"><article className="gof-panel gof-slip"><div className="gof-slip-inner">{loading ? <p>Loading Churvox…</p> : current ? <><p className="gof-kicker">Next decision · {current.label}</p><h2>{current.title}</h2><p>{current.detail}</p><div className="gof-meta"><div><span>Risk</span><strong>{current.risk || "low"}</strong></div><div><span>Status</span><strong>{current.status || "ready"}</strong></div><div><span>Prepared detail</span><strong>{current.payload?.description || current.payload?.message || current.payload?.job_id || current.client || "ready"}</strong></div></div>{current.rawId ? <div className="gof-actions"><button className="gof-btn" onClick={() => approveOne(current)} disabled={busy === current.rawId}>{busy === current.rawId ? "Running…" : "Approve & run"}</button><button className="gof-btn secondary" onClick={() => rejectOne(current)} disabled={busy === current.rawId}>Skip</button></div> : <button className="gof-btn" onClick={() => scan(false)}>Prepare next move</button>}</> : <><p className="gof-kicker">All clear</p><h2>No decision waiting here.</h2><p>Run AI scan or tap a pulse area above.</p></>}</div></article><aside className="gof-panel gof-why"><p className="gof-kicker">Why Churvox picked this</p><h3>{current ? "Reasoning in plain English" : "Nothing selected"}</h3><ul>{reasonLines(current).map((line) => <li key={line}>{line}</li>)}</ul></aside></section>
      <section className="gof-panel gof-groups"><div className="gof-groups-head"><div><p className="gof-kicker">Prepared work</p><h3>Grouped so it does not look like spam.</h3></div><button className="gof-btn" onClick={() => { setLane("approvals"); setSelected(approvals[0] || null); }}>Review queue</button></div>{groups.length ? <div className="gof-group-grid">{groups.map((g) => <button key={g.key} onClick={() => { setLane("approvals"); setSelected(g.first); }}><span>{g.count}</span><strong>{g.title}</strong><small>{g.first.detail}</small></button>)}</div> : <p>No grouped approval work waiting.</p>}</section>
      <section className="gof-history"><div className="gof-panel"><p className="gof-kicker">Recently completed</p>{completed.length ? completed.map((i) => <div className="gof-log" key={i.id}><strong>{i.title}</strong><span>{i.status}</span></div>) : <p>Nothing completed yet.</p>}</div><div className="gof-panel"><p className="gof-kicker">Operator history</p>{logs.length ? logs.map((l) => <div className="gof-log" key={idOf(l)}><strong>{l.message || l.event_type || "AI log"}</strong><span>{l.event_type || "log"}</span></div>) : <p>No operator history yet.</p>}</div></section>
    </main>
  );
}
