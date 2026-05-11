import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./operator-os.css";

const NAV = [
  { key: "operator", label: "Operator", paths: ["/dashboard", "/ai", "/automation", "/reports"] },
  { key: "work", label: "Work", paths: ["/work", "/jobs", "/dispatch", "/calendar"] },
  { key: "cash", label: "Cash", paths: ["/money", "/quotes", "/invoices", "/sms"] },
  { key: "clients", label: "Clients", paths: ["/clients"] },
  { key: "team", label: "Team", paths: ["/team", "/payroll"] },
  { key: "settings", label: "Settings", paths: ["/settings", "/plans", "/integrations", "/contact"] },
];
const aiModes = ["AI Off", "AI Assist", "AI Prepare", "AI Operator", "AI Auto-Safe"];

const getSectionFromPath = (pathname) => NAV.find((n) => n.paths.some((p) => pathname.startsWith(p)))?.key || "operator";
const api = async (path) => {
  const token = localStorage.getItem("token");
  const r = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
};

export default function OwnerOperatorOS() {
  const location = useLocation();
  const navigate = useNavigate();
  const [section, setSection] = useState(getSectionFromPath(location.pathname));
  const [aiMode, setAiMode] = useState(localStorage.getItem("churvox-ai-mode") || "AI Prepare");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [data, setData] = useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => setSection(getSectionFromPath(location.pathname)), [location.pathname]);
  useEffect(() => { localStorage.setItem("churvox-ai-mode", aiMode); }, [aiMode]);
  useEffect(() => { (async () => {
    setLoading(true);
    const out = {};
    for (const [k, p] of Object.entries({ jobs: "/api/jobs", clients: "/api/clients", invoices: "/api/invoices", quotes: "/api/quotes", workers: "/api/team/workers" })) {
      try { out[k] = await api(p); } catch { out[k] = []; }
    }
    setData({ jobs: out.jobs || [], clients: out.clients || [], invoices: out.invoices || [], quotes: out.quotes || [], workers: out.workers || [] });
    setLoading(false);
  })(); }, []);

  const jobs = Array.isArray(data.jobs) ? data.jobs : data.jobs?.items || [];
  const invoices = Array.isArray(data.invoices) ? data.invoices : data.invoices?.items || [];
  const quotes = Array.isArray(data.quotes) ? data.quotes : data.quotes?.items || [];

  const moves = useMemo(() => {
    const unassigned = jobs.filter((j) => !(j.worker_id || j.assigned_to));
    const completed = jobs.filter((j) => ["complete", "completed", "done"].includes(String(j.status || "").toLowerCase()));
    const openInv = invoices.filter((i) => !["paid", "void"].includes(String(i.status || "").toLowerCase()));
    const openQ = quotes.filter((q) => ["sent", "open", "pending"].includes(String(q.status || "").toLowerCase()));
    return [
      { id: "m1", risk: "Low", title: `${unassigned.length} unassigned jobs`, action: "Prepare crew matches" },
      { id: "m2", risk: "Medium", title: `${completed.length} completed jobs`, action: "Prepare proof-to-paid invoices" },
      { id: "m3", risk: "Low", title: `${openInv.length} open invoices`, action: "Prepare payment reminder queue" },
      { id: "m4", risk: "Low", title: `${openQ.length} open quotes`, action: "Prepare quote follow-ups" },
    ];
  }, [jobs, invoices, quotes]);

  const onAsk = (e) => {
    const v = e.target.value.toLowerCase(); setQuery(e.target.value);
    if (v.includes("unassigned")) setSection("work");
    if (v.includes("import clients")) { setSection("clients"); setDrawer({ title: "Client CSV Import" }); }
    if (v.includes("import workers")) { setSection("team"); setDrawer({ title: "Worker CSV Import" }); }
    if (v.includes("cash")) setSection("cash");
    if (v.includes("settings")) setSection("settings");
    if (v.includes("turn ai off")) setAiMode("AI Off");
  };

  return <div className="os-wrap">
    <aside className="os-rail">{NAV.map(n => <button key={n.key} className={section===n.key?"active":""} onClick={()=>{setSection(n.key);navigate(n.paths[0]);}}>{n.label}</button>)}</aside>
    <main className="os-main">
      <header className="os-top"><input value={query} onChange={onAsk} placeholder="Ask Churvox: show unassigned jobs, import clients..."/><select value={aiMode} onChange={(e)=>setAiMode(e.target.value)}>{aiModes.map(m=><option key={m}>{m}</option>)}</select><button className="ember">Create</button></header>
      {loading ? <p>Loading command data…</p> : <section>
        {section==="operator" && <div><h2>Today’s command</h2><button className="mint">Approve safe moves</button><div className="grid">{moves.map(m=><article key={m.id} onClick={()=>setDrawer(m)}><h3>{m.title}</h3><p>{m.action}</p><small>{m.risk} risk</small></article>)}</div></div>}
        {section==="work" && <div><h2>Work command</h2><p>Open jobs {jobs.length} · Unassigned {jobs.filter(j=>!(j.worker_id||j.assigned_to)).length}</p></div>}
        {section==="cash" && <div><h2>Cash command</h2><p>Open invoice value: ${invoices.reduce((a,i)=>a+(Number(i.total||i.amount||0)||0),0).toFixed(2)}</p><p>MYOB: Solo/Team none · Pro add-on · Enterprise included.</p></div>}
        {section==="clients" && <div><h2>Clients</h2><button onClick={()=>setDrawer({title:"Client CSV Import"})}>Upload CSV</button></div>}
        {section==="team" && <div><h2>Team</h2><button onClick={()=>setDrawer({title:"Worker CSV Import"})}>Import Workers CSV</button><p>Timesheets & Pay Export with owner approval.</p></div>}
        {section==="settings" && <div><h2>Settings</h2><p>Plans, Legal, Contact hello@churvox.com, AI controls, Audit trail / undo.</p></div>}
      </section>}
      {drawer && <div className="os-drawer"><div className="panel"><h3>{drawer.title || "Prepared move"}</h3><p>What I found · Why it matters · Risk · Prepared action.</p><button className="mint">Approve</button><button>Review</button><button>Dismiss</button><button onClick={()=>setDrawer(null)}>Close</button></div></div>}
      <nav className="os-mobile">{NAV.map(n=><button key={n.key} onClick={()=>{setSection(n.key);navigate(n.paths[0]);}}>{n.label}</button>)}</nav>
    </main>
  </div>;
}
