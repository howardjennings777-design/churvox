import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import "../styles/operatorFloorDashboard.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.logs) ? v.logs : [];
const idOf = (v) => String(v?.id || v?._id || "");
const low = (v) => String(v || "").toLowerCase();
const nzMoney = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const pending = new Set(["", "pending", "ready", "edited", "draft", "watching"]);
const doneStatuses = new Set(["completed", "approved", "dismissed", "rejected"]);
const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const lineTotal = (items) => arr(items).reduce((sum, item) => sum + Number(item?.amount ?? item?.total ?? item?.price ?? item?.unit_price ?? 0) * Number(item?.qty || item?.quantity || 1), 0);

function labelFor(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminder";
  if (t.includes("invoice")) return "Invoice draft";
  if (t.includes("assign")) return "Crew assignment";
  if (t.includes("quote")) return "Quote follow-up";
  if (t.includes("customer")) return "Customer update";
  return "Admin decision";
}

function trayFor(type = "") {
  const t = low(type);
  if (t.includes("invoice_reminder")) return "Payment reminders";
  if (t.includes("invoice")) return "Invoice drafts";
  if (t.includes("assign")) return "Crew assignments";
  if (t.includes("quote")) return "Quote follow-ups";
  if (t.includes("customer")) return "Customer updates";
  return "Admin moves";
}

function actionFrom(raw) {
  const payload = raw.payload || raw.draft_payload || {};
  const type = raw.action_type || raw.type || "prepared_action";
  return {
    id: `a-${idOf(raw)}`,
    rawId: idOf(raw),
    raw,
    source: "ai",
    lane: "approvals",
    type,
    label: labelFor(type),
    tray: trayFor(type),
    title: raw.title || raw.summary || "Prepared admin decision",
    detail: raw.recommendation || raw.reason || raw.owner_facing_explanation || raw.summary || "Churvox prepared this so you can approve the next move.",
    status: raw.status || "pending",
    risk: raw.risk || raw.risk_level || "low",
    payload,
  };
}

function jobItem(job, lane) {
  return {
    id: `j-${lane}-${idOf(job)}`,
    lane,
    source: "job",
    type: lane === "money" ? "invoice_ready" : "job_attention",
    label: lane === "money" ? "Invoice opportunity" : lane === "crew" ? "Crew work" : "Job needs decision",
    tray: lane === "money" ? "Ready to invoice" : lane === "crew" ? "Crew today" : "Jobs needing attention",
    title: job.title || job.job_name || job.client_name || "Job",
    detail: lane === "money" ? "Completed work can be converted into invoice/admin follow-up." : lane === "crew" ? "This work is active, scheduled, or assigned." : "This job needs assignment, follow-up, or an owner decision.",
    status: job.status || "open",
    client: job.client_name || job.customer_name || "Client",
    worker: job.assigned_worker_name || job.worker_name || "Unassigned",
  };
}

function invoiceItem(invoice) {
  return {
    id: `i-${idOf(invoice)}`,
    lane: "money",
    source: "invoice",
    type: "invoice_follow_up",
    label: "Money decision",
    tray: "Invoice follow-ups",
    title: `${invoice.customer_name || invoice.client_name || "Client"} · ${nzMoney(invoice.balance_due || invoice.balance || invoice.total || invoice.amount)}`,
    detail: "Invoice is draft, open, unpaid, overdue, or ready for follow-up.",
    status: invoice.status || "open",
    client: invoice.customer_name || invoice.client_name || "Client",
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

function groupItems(items) {
  const map = new Map();
  for (const item of items) {
    const key = low(item.tray || item.type || item.title).replace(/[^a-z0-9]+/g, "_");
    if (!map.has(key)) map.set(key, { key, title: item.tray || trayFor(item.type), count: 0, first: item, items: [] });
    const group = map.get(key);
    group.count += 1;
    group.items.push(item);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

function whyFor(item) {
  if (!item) return [];
  const p = item.payload || {};
  const lines = [];
  if (item.source === "ai") lines.push("AI has already prepared the admin step.");
  if (item.type?.includes("invoice")) lines.push("Money is waiting to be turned into a draft or follow-up.");
  if (item.type?.includes("assign")) lines.push("Crew allocation can be handled from this approval slip.");
  if (p.job_id) lines.push("Linked to a real job record.");
  if (p.message || p.description) lines.push("Draft wording is ready for review.");
  lines.push(`Risk level is ${item.risk || "normal"}.`);
  lines.push("Nothing is sent, charged, or changed until you approve.");
  return lines.slice(0, 6);
}

const floorStyles = `
.lof{min-height:100vh;margin:0;padding:clamp(14px,2vw,28px);background:radial-gradient(circle at 18% 4%,rgba(185,244,80,.16),transparent 26%),radial-gradient(circle at 90% 15%,rgba(190,109,42,.25),transparent 28%),linear-gradient(135deg,#0d0d0a,#17130f 42%,#2c1b0e);color:#fff7e6;overflow:hidden}.lof button,.lof a{font:inherit}.lof-top{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end;border:1px solid rgba(255,255,255,.12);border-radius:32px;background:linear-gradient(135deg,rgba(255,248,230,.08),rgba(255,248,230,.02));box-shadow:0 24px 90px rgba(0,0,0,.32);padding:clamp(22px,3.5vw,46px)}.lof-mark{margin:0 0 12px;color:#b9f450;font-size:12px;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.lof-top h1{max-width:980px;margin:0;font-size:clamp(46px,8vw,104px);line-height:.84;letter-spacing:-.085em}.lof-top p{max-width:760px;margin:20px 0 0;color:rgba(255,247,230,.72);font-size:clamp(16px,1.35vw,20px);line-height:1.55}.lof-actions{display:grid;gap:10px;min-width:230px}.lof-action,.lof-actions a,.lof-btn{border:0;border-radius:999px;background:#b9f450;color:#172006;padding:13px 18px;font-weight:950;text-align:center;text-decoration:none;cursor:pointer}.lof-action.secondary,.lof-btn.secondary{background:#fff1d4;color:#15120d;border:1px solid rgba(255,255,255,.18)}.lof-action:disabled,.lof-btn:disabled{opacity:.55;cursor:not-allowed}.lof-pulse{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.lof-pulse button{border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(255,248,230,.08);color:#fff7e6;padding:16px;text-align:left;cursor:pointer}.lof-pulse button.active{background:#fff8e8;color:#11120d}.lof-pulse span{display:block;color:#b9f450;font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.lof-pulse button.active span{color:#6b4c13}.lof-pulse strong{display:block;margin-top:10px;font-size:clamp(28px,3vw,44px);line-height:1;letter-spacing:-.05em}.lof-main{display:grid;grid-template-columns:minmax(190px,.65fr) minmax(0,1.6fr) minmax(260px,.82fr);gap:14px;align-items:stretch}.lof-panel{border:1px solid rgba(58,39,16,.2);border-radius:28px;background:linear-gradient(180deg,#fffaf0,#f3e3c5);color:#11120d;box-shadow:0 26px 90px rgba(0,0,0,.28);padding:18px}.lof-trays{display:grid;align-content:start;gap:10px}.lof-trays button{display:flex;justify-content:space-between;gap:12px;border:1px solid #e1d0ad;border-radius:18px;background:#fff6e4;color:#11120d;padding:14px;font-weight:900;cursor:pointer}.lof-trays button.active{background:#11120d;color:#fff8e6}.lof-trays strong{font-size:26px;line-height:1}.lof-stack{position:relative;min-height:520px;padding:clamp(22px,3vw,34px);background:linear-gradient(180deg,#fffaf0,#f4e1be)}.lof-stack:before,.lof-stack:after{content:"";position:absolute;inset:18px;border-radius:26px;background:#ead8b8;transform:rotate(-2deg);z-index:0}.lof-stack:after{inset:28px;background:#dcc49b;transform:rotate(2deg)}.lof-slip{position:relative;z-index:1;border:1px solid #e1d0ad;border-radius:28px;background:#fffdf7;min-height:430px;padding:clamp(22px,3vw,34px);box-shadow:0 20px 50px rgba(66,42,13,.16)}.lof-slip h2{margin:0 0 14px;font-size:clamp(40px,5.4vw,76px);line-height:.88;letter-spacing:-.075em}.lof-slip p{color:#6b6255;font-size:17px;line-height:1.55}.lof-meta{display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px;margin:22px 0}.lof-meta div{border:1px solid #ead8b8;border-radius:16px;background:#fff6e4;padding:12px}.lof-meta span,.lof-why li:before{color:#8a5c17}.lof-meta span{display:block;font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.lof-meta strong{display:block;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lof-slip-actions{display:flex;gap:10px;flex-wrap:wrap}.lof-why{display:grid;align-content:start;gap:12px}.lof-why h3{margin:0;font-size:34px;line-height:.95;letter-spacing:-.055em}.lof-why ul{display:grid;gap:10px;margin:0;padding:0;list-style:none}.lof-why li{border:1px solid #ead8b8;border-radius:16px;background:#fff6e4;padding:12px;color:#4b3f31;font-weight:800;line-height:1.35}.lof-why li:before{content:"• ";font-weight:950}.lof-groupbar{margin-top:14px}.lof-group-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.lof-group-head h3{margin:0;font-size:30px;line-height:1;letter-spacing:-.05em}.lof-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px}.lof-groups button{display:grid;gap:8px;min-height:146px;border:1px solid #e1d0ad;border-radius:24px;background:#fff6e4;color:#11120d;padding:16px;text-align:left;cursor:pointer}.lof-groups button>span{display:grid;width:44px;height:44px;place-items:center;border-radius:14px;background:#11120d;color:#fff;font-size:22px;font-weight:950}.lof-groups strong{font-size:19px;line-height:1.08}.lof-groups small{color:#6b6255;line-height:1.35}.lof-history{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.lof-log{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #ead8b8;padding:10px 0}.lof-log strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lof-log span{border-radius:999px;background:#dafba2;color:#304707;padding:5px 8px;font-size:12px;font-weight:950}@media(max-width:1040px){.lof-top,.lof-main,.lof-history{grid-template-columns:1fr}.lof-actions{min-width:0}.lof-pulse{grid-template-columns:repeat(2,1fr)}.lof-meta{grid-template-columns:1fr}.lof-stack{min-height:auto}}@media(max-width:560px){.lof{padding:10px 10px 92px}.lof-top{border-radius:24px;padding:24px}.lof-top h1{font-size:44px}.lof-pulse{grid-template-columns:1fr}.lof-slip h2{font-size:38px}.lof-group-head{display:grid}.lof-groups{grid-template-columns:1fr}}`;

export default function OperatorFloorDashboard() {
  const { get, post, patch } = useApi();
  const [actions, setActions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [setup, setSetup] = useState(null);
  const [logs, setLogs] = useState([]);
  const [lane, setLane] = useState("approvals");
  const [selected, setSelected] = useState(null);
  const [handled, setHandled] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const once = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, setRes, logRes, j, i] = await Promise.all([
      get("/ai-operator/actions"), get("/ai-operator/command-snapshot"), get("/ai-operator/setup-status"), get("/ai-operator/audit-log"), get("/jobs"), get("/invoices"),
    ]);
    if (a.success) setActions(arr(a.actions || a.data || a));
    if (s.success) setSnapshot(s.data || s);
    if (setRes.success) setSetup(setRes.data || setRes);
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
      if (!quiet) toast.success("Churvox prepared the next decisions");
      await load();
      return true;
    }
    if (!quiet) toast.error(res.error || "AI scan failed");
    return false;
  }, [load, post]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const key = "churvox_live_floor_last_scan";
    const last = Number(localStorage.getItem(key) || 0);
    if (!last || Date.now() - last > 10 * 60 * 1000) {
      localStorage.setItem(key, String(Date.now()));
      scan(true);
    }
  }, [scan]);

  const hidden = useMemo(() => new Set(handled), [handled]);
  const approvals = useMemo(() => actions.filter((a) => !hidden.has(idOf(a)) && pending.has(low(a.status))).slice(0, 60).map(actionFrom), [actions, hidden]);
  const completed = useMemo(() => actions.filter((a) => doneStatuses.has(low(a.status))).slice(0, 8).map(actionFrom), [actions]);
  const attention = useMemo(() => jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !["completed", "done", "cancelled"].includes(low(j.status))).slice(0, 16).map((j) => jobItem(j, "attention")), [jobs]);
  const crew = useMemo(() => jobs.filter((j) => ["assigned", "scheduled", "in_progress", "in progress", "started"].includes(low(j.status))).slice(0, 16).map((j) => jobItem(j, "crew")), [jobs]);
  const moneyItems = useMemo(() => {
    const readyJobs = jobs.filter((j) => ["completed", "done", "complete"].includes(low(j.status)) && !(j.invoice_id || j.draft_invoice_id || j.invoiced)).slice(0, 12).map((j) => jobItem(j, "money"));
    const openInvoices = invoices.filter((i) => ["draft", "sent", "open", "overdue", "unpaid", "pending", ""].includes(low(i.status))).slice(0, 12).map(invoiceItem);
    return [...readyJobs, ...openInvoices];
  }, [jobs, invoices]);

  const lanes = { approvals, attention, crew, money: moneyItems, done: completed };
  const laneItems = lanes[lane] || [];
  const visible = useMemo(() => {
    const seen = new Set();
    return laneItems.filter((item) => {
      const key = `${item.type}|${item.title}|${item.detail}`.toLowerCase().replace(/\s+/g, " ").slice(0, 180);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [laneItems]);

  const current = selected && selected.lane === lane ? selected : visible[0];
  const groups = useMemo(() => groupItems(approvals), [approvals]);
  const urgent = snapshot?.urgent || {};
  const why = whyFor(current);
  const markHandled = (ids) => setHandled((prev) => Array.from(new Set([...prev, ...arr(ids).map(String).filter(Boolean)])));

  const approveOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);
    const payload = patchFor(item);
    if (Object.keys(payload).length) {
      const prep = await patch(`/ai-operator/actions/${item.rawId}`, payload);
      if (!prep.success) {
        setBusy("");
        toast.error(prep.error || "Churvox could not prepare the final payload");
        return;
      }
    }
    const res = await post(`/ai-operator/actions/${item.rawId}/approve`, {});
    setBusy("");
    if (res.success) {
      toast.success("Approved. Churvox completed the admin move.");
      markHandled([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await load();
    } else toast.error(res.error || "Churvox could not complete that action");
  };

  const rejectOne = async (item) => {
    if (!item?.rawId) return;
    setBusy(item.rawId);
    const res = await post(`/ai-operator/actions/${item.rawId}/reject`, {});
    setBusy("");
    if (res.success) {
      toast.success("Skipped. Churvox removed it from the floor.");
      markHandled([item.rawId]);
      setActions((prev) => prev.filter((a) => idOf(a) !== item.rawId));
      setSelected(null);
      await load();
    } else toast.error(res.error || "Could not skip action");
  };

  const approveVisible = async () => {
    const items = approvals.filter((a) => a.rawId).slice(0, 12);
    if (!items.length) return toast.message("No decisions waiting");
    setBusy("bulk");
    for (const item of items) {
      const payload = patchFor(item);
      if (Object.keys(payload).length) await patch(`/ai-operator/actions/${item.rawId}`, payload);
    }
    const res = await post("/ai-operator/actions/bulk-approve", { action_ids: items.map((a) => a.rawId) });
    setBusy("");
    if (res.success) {
      markHandled(items.map((a) => a.rawId));
      setActions((prev) => prev.filter((a) => !items.some((item) => item.rawId === idOf(a))));
      toast.success(`Approved ${res.succeeded || items.length} prepared moves`);
      setSelected(null);
      await load();
    } else toast.error(res.error || "Bulk approve failed");
  };

  const pulse = [["approvals", "Approvals", approvals.length], ["attention", "Jobs", urgent.unassigned_jobs ?? attention.length], ["money", "Money", nzMoney(urgent.open_invoices_total || 0)], ["crew", "Crew", crew.length]];
  const trays = [["approvals", "Approvals", approvals.length], ["attention", "Needs attention", attention.length], ["crew", "Crew", crew.length], ["money", "Money", moneyItems.length], ["done", "Done", completed.length]];

  return (
    <main className="lof" data-version="CHURVOX_LIVE_OPERATOR_FLOOR_20260524">
      <style>{floorStyles}</style>
      <section className="lof-top">
        <div>
          <p className="lof-mark">Churvox Live Operator Floor</p>
          <h1>Churvox brings the decisions to you.</h1>
          <p>{snapshot?.next_best_move || "The AI sorts jobs, money, crew and customer follow-ups into a decision stack. You approve the move."}</p>
        </div>
        <div className="lof-actions">
          <button className="lof-action" onClick={() => setLane("approvals")}>Review decisions</button>
          <button className="lof-action secondary" onClick={() => scan(false)} disabled={busy === "scan"}>{busy === "scan" ? "Scanning…" : "Run AI scan"}</button>
          <Link to="/invoices">Money desk</Link>
        </div>
      </section>

      <section className="lof-pulse">
        {pulse.map(([key, label, value]) => <button key={key} className={lane === key ? "active" : ""} onClick={() => { setLane(key); setSelected(null); }}><span>{label}</span><strong>{value}</strong></button>)}
      </section>

      <section className="lof-main">
        

        <article className="lof-panel lof-stack">
          <div className="lof-slip">
            {loading ? <p>Loading the operator floor…</p> : current ? <>
              <p className="lof-mark">Decision stack · {current.label}</p>
              <h2>{current.title}</h2>
              <p>{current.detail}</p>
              <div className="lof-meta"><div><span>Risk</span><strong>{current.risk || "normal"}</strong></div><div><span>Status</span><strong>{current.status || "ready"}</strong></div><div><span>Prepared detail</span><strong>{current.payload?.description || current.payload?.message || current.payload?.job_id || current.client || "ready"}</strong></div></div>
              {current.rawId ? <div className="lof-slip-actions"><button className="lof-btn" onClick={() => approveOne(current)} disabled={busy === current.rawId}>{busy === current.rawId ? "Completing…" : "Approve & run"}</button><button className="lof-btn secondary" onClick={() => rejectOne(current)} disabled={busy === current.rawId}>Skip</button></div> : <div className="lof-slip-actions"><button className="lof-btn" onClick={() => scan(false)}>Prepare next move</button></div>}
            </> : <><p className="lof-mark">All clear</p><h2>No work slips waiting here.</h2><p>Run an AI scan or open another tray.</p></>}
          </div>
        </article>

        
      </section>

      <section className="lof-panel lof-groupbar">
        <div className="lof-group-head"><div><p className="lof-mark">Bottom action trays</p><h3>Grouped work, not repeated cards.</h3></div><button className="lof-btn" onClick={approveVisible} disabled={!approvals.length || busy === "bulk"}>{busy === "bulk" ? "Processing…" : `Approve safe batch (${approvals.length})`}</button></div>
        {groups.length ? <div className="lof-groups">{groups.map((group) => <button key={group.key} onClick={() => { setLane("approvals"); setSelected(group.first); }}><span>{group.count}</span><strong>{group.title}</strong><small>{group.first.detail}</small></button>)}</div> : <p>No grouped approval work waiting.</p>}
      </section>

      <section className="lof-history"><div className="lof-panel"><p className="lof-mark">Recently completed</p>{completed.length ? completed.map((item) => <div className="lof-log" key={item.id}><strong>{item.title}</strong><span>{item.status}</span></div>) : <p>Nothing completed yet.</p>}</div><div className="lof-panel"><p className="lof-mark">Operator history</p>{logs.length ? logs.map((log) => <div className="lof-log" key={idOf(log)}><strong>{log.message || log.event_type || "AI log"}</strong><span>{log.event_type || "log"}</span></div>) : <p>No operator history yet.</p>}</div></section>
    </main>
  );
}
