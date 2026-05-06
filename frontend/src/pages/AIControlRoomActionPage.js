import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { ChurvoxLogo } from "../components/ChurvoxLogo";

const asList = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.results) ? v.results : Array.isArray(v?.actions) ? v.actions : [];
const txt = (v) => String(v || "").toLowerCase();
const cash = (v) => `$${Number(v || 0).toFixed(2)}`;
const recId = (x) => x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.email;
const recTitle = (x, fallback = "Record") => x?.title || x?.name || x?.job_title || x?.customer_name || x?.client_name || x?.description || x?.email || fallback;
const recSub = (x) => x?.client_name || x?.customer_name || x?.client || x?.email || x?.address || x?.status || "Live Churvox record";
const hasWorker = (j) => Boolean(j?.worker_id || j?.assigned_worker_id || j?.assigned_worker || j?.assigned_worker_name || j?.worker_name);

const panelDefs = {
  approvals: ["AI approvals", "/ai-operator/approvals?embedded=1", "approvals", "Review AI prepared work before it is applied."],
  crew: ["Dispatch / assign worker", "/dispatch?embedded=1", "crew", "Assign unassigned jobs to the right worker."],
  invoices: ["Invoice follow-up", "/invoices?embedded=1", "invoices", "Prepare payment reminders and invoice actions."],
  followups: ["Customer follow-up", "/sms?embedded=1", "followups", "Prepare customer messages, reminders and updates."],
  proof: ["Proof-to-Paid", "/proof-to-paid?embedded=1", "proof", "Review completed job proof before invoicing."],
  jobs: ["Active jobs", "/jobs?embedded=1", "jobs", "Open and work live jobs."],
  team: ["Team", "/team?embedded=1", "team", "Invite, review and assign workers."],
  quotes: ["Quotes", "/quotes?embedded=1", "quotes", "Prepare quote follow-ups."],
  sms: ["Buy SMS credits", "/sms?embedded=1", "sms", "Buy SMS credits and prepare customer updates."],
  settings: ["Settings", "/settings?embedded=1", "settings", "Update GST, trade, MYOB and account settings."],
};

const shortcuts = [
  ["Jobs", "Create jobs, view details, assign work", "/jobs?embedded=1", "jobs"],
  ["Clients", "Add clients and view client history", "/clients?embedded=1", "clients"],
  ["Quotes", "Create, review and follow up quotes", "/quotes?embedded=1", "quotes"],
  ["Invoices", "Create invoices and chase payments", "/invoices?embedded=1", "invoices"],
  ["Team", "Invite workers and manage roles", "/team?embedded=1", "team"],
  ["Dispatch", "Assign jobs and plan the day", "/dispatch?embedded=1", "crew"],
  ["Proof-to-Paid", "Review proof before billing", "/proof-to-paid?embedded=1", "proof"],
  ["Automation", "Rules and safe runs", "/automation?embedded=1", "automation"],
  ["SMS Credits", "Buy SMS credits and send customer updates", "/sms?embedded=1", "sms", true],
  ["Settings", "Business setup, GST, MYOB and legal links", "/settings?embedded=1", "settings"],
];

export default function AIControlRoomActionPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [], workers: [], approvals: [], sms: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [panelKey, setPanelKey] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [jobs, invoices, quotes, workers, approvals, sms] = await Promise.all([
      get("/jobs").catch(() => null),
      get("/invoices").catch(() => null),
      get("/quotes").catch(() => null),
      get("/team/workers").catch(() => null),
      get("/ai-operator/actions").catch(() => get("/command-hub/actions").catch(() => null)),
      get("/sms/history?limit=10").catch(() => null),
    ]);
    setData({
      jobs: asList(jobs),
      invoices: asList(invoices),
      quotes: asList(quotes),
      workers: asList(workers),
      approvals: asList(approvals?.data?.actions || approvals),
      sms: asList(sms?.data?.messages || sms),
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const state = useMemo(() => {
    const activeJobs = data.jobs.filter((j) => !["completed", "cancelled", "closed", "done"].includes(txt(j.status)));
    const crew = activeJobs.filter((j) => !hasWorker(j));
    const proof = data.jobs.filter((j) => ["completed", "done"].includes(txt(j.status)));
    const invoices = data.invoices.filter((i) => ["open", "sent", "overdue", "unpaid", "pending", "pending_payment", "draft"].includes(txt(i.status)));
    const quotes = data.quotes.filter((q) => ["sent", "pending", "draft"].includes(txt(q.status)));
    const money = invoices.reduce((t, i) => t + Number(i.balance_due || i.balance || i.total || i.amount || 0), 0);
    const team = data.workers.filter((w) => txt(w.status) !== "inactive");
    return { activeJobs, crew, proof, invoices, quotes, money, team, followups: [...invoices, ...quotes] };
  }, [data]);

  const openWorkspace = (title, route) => setWorkspace({ title, route: withEmbedded(route) });
  const runAi = async () => { setNotice("Refreshing AI work plan..."); await post("/smart-hub/scan", {}).catch(() => null); await load(); setNotice("AI plan refreshed. Open a card to edit the prepared action or open the real workspace."); };

  const metrics = [
    ["Approvals", data.approvals.length, "Owner sign-off", "approvals"],
    ["Need Crew", state.crew.length, "Jobs to assign", "crew"],
    ["Money Waiting", cash(state.money), "Invoices to chase", "invoices"],
    ["Follow-ups", state.followups.length, "Messages to prepare", "followups"],
    ["Proof", state.proof.length, "Jobs to review", "proof"],
    ["Workers", state.team.length, "Available team", "team"],
  ];

  return <Layout smartHubMode><main style={s.page}>
    <section style={s.hero}>
      <div><ChurvoxLogo size="lg" /><h1 style={s.h1}>AI Control Room</h1><p style={s.heroText}>AI finds the work and prepares the admin. The owner edits, reviews and applies the action inside the real workspace.</p><div style={s.row}><button style={s.orange} onClick={runAi}>Run AI Plan</button><button style={s.white} onClick={() => setPanelKey("approvals")}>Review approvals</button><button style={s.white} onClick={() => navigate("/ai-operator/settings")}>Operator settings</button></div></div>
      <div style={s.live}><b>LIVE CONTROL CENTRE</b><div style={s.liveGrid}>{metrics.slice(0,4).map(([a,b,c,k]) => <button key={k} style={s.liveItem} onClick={() => setPanelKey(k)}><small>{a}</small><strong>{b}</strong><em>{c}</em></button>)}</div></div>
    </section>
    <section style={s.safety}>Owner approval first: AI prepares drafts, assignments and reminders, then the owner applies them.</section>
    {notice && <div style={s.notice}>{notice}</div>}{loading && <div style={s.notice}>Loading live Churvox data...</div>}
    <section style={s.metricGrid}>{metrics.map(([a,b,c,k]) => <button key={k} style={s.metric} onClick={() => setPanelKey(k)}><small>{a}</small><strong>{b}</strong><em>{c}</em><b>Work this →</b></button>)}</section>
    <section style={s.two}><Card title="Next Best Moves"><Move label="Dispatch the day" text={`${state.crew.length} unassigned jobs to match with a worker.`} onClick={() => setPanelKey("crew")}/><Move label="Move money" text={`${cash(state.money)} waiting across invoice follow-ups.`} onClick={() => setPanelKey("invoices")}/><Move label="Proof & updates" text={`${state.proof.length} completed jobs can be reviewed.`} onClick={() => setPanelKey("proof")}/></Card><Card title="Active Work Board"><List rows={state.activeJobs} empty="No active jobs right now." onOpen={() => setPanelKey("jobs")}/><button style={s.link} onClick={() => openWorkspace("Jobs", "/jobs?embedded=1")}>Open Jobs workspace</button></Card></section>
    <section style={s.card}><h2>Owner Workspaces</h2><p>Clear shortcuts. Tap a card to open the real workspace in a pop-up.</p><div style={s.shortcuts}>{shortcuts.map(([a,t,r,k,hi]) => <button key={a} style={{...s.shortcut, ...(hi ? s.sms : {})}} onClick={() => openWorkspace(a,r)}>{hi && <span style={s.pill}>BUY CREDITS</span>}<strong>{a}</strong><small>{t}</small><b>Open →</b></button>)}</div></section>
    <ActionModal panelKey={panelKey} close={() => setPanelKey(null)} data={data} state={state} openWorkspace={openWorkspace} runAi={runAi}/>
    <WorkspaceModal workspace={workspace} close={() => setWorkspace(null)}/>
  </main></Layout>;
}

function Card({ title, children }) { return <article style={s.card}><h2>{title}</h2>{children}</article>; }
function Move({ label, text, onClick }) { return <button style={s.move} onClick={onClick}><strong>{label}</strong><span>{text}</span><b>Open action →</b></button>; }
function List({ rows, empty, onOpen }) { return rows.length ? <div>{rows.slice(0,6).map((r) => <button key={recId(r)||recTitle(r)} style={s.listRow} onClick={() => onOpen(r)}><span><strong>{recTitle(r,"Job")}</strong><small>{recSub(r)}</small></span><em>{r.status || "active"}</em></button>)}</div> : <div style={s.empty}>{empty}</div>; }

function ActionModal({ panelKey, close, data, state, openWorkspace, runAi }) {
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState({ message:"", note:"", decision:"review_later", worker:"", schedule:"", tone:"Friendly" });
  const [msg, setMsg] = useState("");
  const cfg = panelKey ? panelDefs[panelKey] || panelDefs.jobs : null;
  const records = useMemo(() => cfg ? recordsFor(cfg[2], data, state) : [], [cfg, data, state]);
  const selected = records.find((x) => String(recId(x)) === String(selectedId)) || records[0];
  useEffect(() => { if (!cfg) return; const first = records[0]; setSelectedId(first ? String(recId(first) || "") : ""); setDraft({ message: suggest(panelKey, first, state), note:"", decision:"review_later", worker:"", schedule:"", tone:"Friendly" }); setMsg(""); }, [panelKey]);
  if (!cfg) return null;
  const [name, route, kind, empty] = cfg;
  const recordRoute = selected ? routeFor(kind, selected) : route;
  const copy = async () => { try { await navigator.clipboard.writeText([draft.message, draft.note].filter(Boolean).join("\n\n")); setMsg("Draft copied. Open the real record and paste/apply it there."); } catch { setMsg("Copy failed. Select the draft text and copy manually."); } };
  return <div style={s.backdrop} onClick={close}><div style={s.modal} onClick={(e) => e.stopPropagation()}><div style={s.modalHead}><div><h2>{name}</h2><p>{records.length ? `${records.length} live records. Select one, edit the draft, then open the real record.` : empty}</p></div><button style={s.x} onClick={close}>×</button></div>{msg && <div style={s.ok}>{msg}</div>}<div style={s.modalGrid}><section style={s.section}><h3>Live records</h3>{records.length ? records.slice(0,10).map((r,i) => <button key={recId(r)||i} style={{...s.record, ...(String(recId(r))===String(selectedId)?s.active:{})}} onClick={() => setSelectedId(String(recId(r)||""))}><strong>{recTitle(r)}</strong><small>{recSub(r)}</small><em>{r.status || r.role || "open"}</em></button>) : <div style={s.empty}><b>{empty}</b><button style={s.whiteSmall} onClick={runAi}>Run AI Plan again</button></div>}</section><section style={s.section}><h3>Editable owner action</h3><label style={s.label}>Draft / action message</label><textarea style={s.textarea} value={draft.message} onChange={(e)=>setDraft({...draft,message:e.target.value})}/><div style={s.formGrid}><label><span>Decision</span><select value={draft.decision} onChange={(e)=>setDraft({...draft,decision:e.target.value})}><option value="review_later">Review later</option><option value="prepare_action">Prepare action</option><option value="open_record">Open selected record</option><option value="owner_approved">Owner approved</option></select></label><label><span>Tone</span><select value={draft.tone} onChange={(e)=>setDraft({...draft,tone:e.target.value})}><option>Friendly</option><option>Professional</option><option>Direct</option><option>Urgent</option></select></label>{["crew","team"].includes(kind) && <label><span>Worker</span><select value={draft.worker} onChange={(e)=>setDraft({...draft,worker:e.target.value})}><option value="">Select worker</option>{state.team.map(w=><option key={recId(w)||w.email}>{w.name||w.email}</option>)}</select></label>}<label><span>Schedule / due note</span><input value={draft.schedule} onChange={(e)=>setDraft({...draft,schedule:e.target.value})} placeholder="e.g. Today / tomorrow"/></label></div><label style={s.label}>Owner internal note</label><textarea style={{...s.textarea,minHeight:70}} value={draft.note} onChange={(e)=>setDraft({...draft,note:e.target.value})} placeholder="Add instructions before applying this."/></section></div><div style={s.actions}><button style={s.primary} onClick={()=>setDraft({...draft,message:suggest(panelKey, selected, state)})}>Prepare draft</button><button style={s.whiteSmall} onClick={copy}>Copy edited draft</button><button style={s.whiteSmall} onClick={()=>openWorkspace(recTitle(selected,name),recordRoute)}>Open selected record</button><button style={s.whiteSmall} onClick={()=>openWorkspace(name,route)}>Open full workspace</button><button style={s.ghost} onClick={close}>Close</button></div></div></div>;
}

function WorkspaceModal({ workspace, close }) { if (!workspace) return null; return <div style={s.workspaceBack} onClick={close}><div style={s.workspaceModal} onClick={(e)=>e.stopPropagation()}><div style={s.workspaceHead}><h2>{workspace.title}</h2><button onClick={close}>×</button></div><iframe title={workspace.title} src={workspace.route} style={s.frame}/></div></div>; }
function withEmbedded(route){return !route?"/dashboard?embedded=1":route.includes("embedded=")?route:`${route}${route.includes("?")?"&":"?"}embedded=1`;}
function recordsFor(kind,data,state){ if(kind==="approvals")return data.approvals; if(kind==="invoices")return state.invoices; if(kind==="followups")return state.followups; if(kind==="crew")return state.crew; if(kind==="proof")return state.proof; if(kind==="jobs")return state.activeJobs; if(kind==="team")return state.team; if(kind==="quotes")return state.quotes; if(kind==="sms")return data.sms; return []; }
function routeFor(kind,x){ const i=recId(x); if(kind==="invoices"&&i)return`/invoices/${i}?embedded=1`; if(kind==="quotes"&&i)return`/quotes/${i}?embedded=1`; if(["jobs","crew","proof"].includes(kind)&&i)return`/jobs/${i}?embedded=1`; if(kind==="approvals")return"/ai-operator/approvals?embedded=1"; if(kind==="team")return"/team?embedded=1"; if(kind==="sms")return"/sms?embedded=1"; return"/dashboard?embedded=1"; }
function suggest(key,x,state){ if(["invoices","followups"].includes(key)){const r=x||state.invoices[0]||state.quotes[0]; return r?`Hi ${r.customer_name||r.client_name||"there"}, just following up on ${r.invoice_number?`invoice ${r.invoice_number}`:"the quote/work"}. Let me know if you need anything from us.`:"No follow-up is due right now."} if(key==="crew"){const j=x||state.crew[0], w=state.team[0]; return j&&w?`Recommended assignment: ${w.name||w.email} for ${recTitle(j,"the job")}. Check the schedule, then open Dispatch to apply.`:j?`${recTitle(j)} needs a worker. Open Dispatch to assign someone.`:"No unassigned jobs right now."} if(key==="proof")return"Review job proof, photos and notes, then approve before invoice preparation."; if(key==="sms")return"Buy SMS credits if needed, then prepare a customer update. Owner approval is required before sending."; return"Review this live record, edit the draft, then open the matching workspace to apply it." }

const s={page:{padding:24,minHeight:"100vh",background:"#b4aa9b"},hero:{display:"grid",gridTemplateColumns:"minmax(0,1.4fr) minmax(300px,.8fr)",gap:20,background:"linear-gradient(135deg,#070b14,#101827 60%,#0b1220)",borderRadius:32,padding:28,color:"white",boxShadow:"0 24px 70px rgba(15,23,42,.32)"},h1:{fontSize:48,lineHeight:1,margin:"26px 0 12px",color:"#fff"},heroText:{color:"#dbeafe",fontSize:16,maxWidth:680},row:{display:"flex",flexWrap:"wrap",gap:10,marginTop:22},orange:{border:0,borderRadius:16,padding:"13px 18px",fontWeight:900,background:"#ff5a12",color:"white",cursor:"pointer"},white:{border:"1px solid #d8e3f3",borderRadius:16,padding:"13px 18px",fontWeight:900,background:"white",color:"#0f172a",cursor:"pointer"},live:{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.14)",borderRadius:24,padding:18},liveGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16},liveItem:{display:"grid",gap:4,textAlign:"left",border:"1px solid rgba(255,255,255,.12)",background:"rgba(15,23,42,.44)",borderRadius:18,padding:14,color:"white",cursor:"pointer"},safety:{marginTop:14,borderRadius:18,padding:14,background:"#0f172a",color:"#dbeafe",fontWeight:800},notice:{marginTop:14,borderRadius:14,padding:12,background:"#065f46",color:"white",fontWeight:700},metricGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginTop:18},metric:{display:"flex",flexDirection:"column",gap:7,minHeight:140,textAlign:"left",border:"1px solid rgba(117,108,95,.42)",background:"linear-gradient(135deg,#fff,#f7f3ea 62%,#eef4ff)",borderRadius:24,padding:18,boxShadow:"0 12px 34px rgba(15,23,42,.10)",cursor:"pointer"},two:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:18,marginTop:18},card:{background:"rgba(255,255,255,.9)",border:"1px solid rgba(117,108,95,.35)",borderRadius:26,padding:20,boxShadow:"0 14px 38px rgba(15,23,42,.10)"},move:{display:"flex",flexDirection:"column",gap:6,width:"100%",textAlign:"left",border:"1px solid #d8e3f3",borderRadius:18,padding:14,background:"white",marginTop:10,cursor:"pointer"},listRow:{display:"flex",justifyContent:"space-between",gap:10,width:"100%",textAlign:"left",border:"1px solid #d8e3f3",borderRadius:16,background:"white",padding:12,marginTop:10,cursor:"pointer"},empty:{border:"1px dashed #cbd5e1",borderRadius:16,padding:18,color:"#475569",background:"#f8fafc"},link:{marginTop:14,border:0,background:"transparent",color:"#155eef",fontWeight:900,cursor:"pointer"},shortcuts:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12},shortcut:{position:"relative",display:"grid",gap:6,textAlign:"left",border:"1px solid #d8e3f3",borderRadius:18,padding:14,background:"white",cursor:"pointer",minHeight:112},sms:{border:"3px solid #ff5a12",background:"linear-gradient(135deg,#fff7ed,#fff,#eff6ff)"},pill:{position:"absolute",top:-10,right:10,background:"#ff5a12",color:"white",borderRadius:999,padding:"4px 8px",fontSize:10,fontWeight:900},backdrop:{position:"fixed",inset:0,zIndex:160,background:"rgba(15,23,42,.58)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18},modal:{width:"min(1020px,100%)",maxHeight:"90vh",overflow:"auto",background:"#fff",borderRadius:28,padding:22,boxShadow:"0 28px 90px rgba(0,0,0,.30)"},modalHead:{display:"flex",justifyContent:"space-between",gap:16,borderBottom:"1px solid #e2e8f0",paddingBottom:14,marginBottom:14},x:{border:0,background:"transparent",fontSize:28,cursor:"pointer"},ok:{border:"1px solid #a7f3d0",background:"#ecfdf5",color:"#065f46",borderRadius:14,padding:10,marginBottom:12,fontWeight:700},modalGrid:{display:"grid",gridTemplateColumns:"minmax(260px,.85fr) minmax(300px,1.15fr)",gap:14},section:{border:"1px solid #e2e8f0",borderRadius:18,padding:14,background:"#fbfdff"},record:{display:"grid",gap:3,width:"100%",textAlign:"left",border:"1px solid #d8e3f3",borderRadius:14,padding:12,background:"white",cursor:"pointer",marginTop:8},active:{borderColor:"#155eef",boxShadow:"0 0 0 3px rgba(21,94,239,.12)"},label:{display:"block",margin:"12px 0 6px",fontWeight:900,color:"#0f172a"},textarea:{width:"100%",minHeight:120,border:"2px solid #cbd5e1",borderRadius:14,padding:12,color:"#0f172a",background:"white"},formGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginTop:10},actions:{display:"flex",flexWrap:"wrap",gap:10,marginTop:14},primary:{border:0,borderRadius:12,padding:"10px 12px",fontWeight:900,background:"#155eef",color:"white",cursor:"pointer"},whiteSmall:{border:"1px solid #d8e3f3",borderRadius:12,padding:"10px 12px",fontWeight:900,background:"white",color:"#0f172a",cursor:"pointer"},ghost:{border:"1px solid transparent",borderRadius:12,padding:"10px 12px",fontWeight:900,background:"transparent",color:"#475569",cursor:"pointer"},workspaceBack:{position:"fixed",inset:0,zIndex:170,background:"rgba(15,23,42,.62)",display:"flex",alignItems:"center",justifyContent:"center",padding:18},workspaceModal:{width:"min(1200px,100%)",height:"88vh",background:"white",borderRadius:28,overflow:"hidden",boxShadow:"0 28px 90px rgba(0,0,0,.32)"},workspaceHead:{height:62,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",borderBottom:"1px solid #e2e8f0"},frame:{width:"100%",height:"calc(88vh - 62px)",border:0}};
