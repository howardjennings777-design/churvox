import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ContactRound,
  CreditCard,
  FileText,
  Gauge,
  Hammer,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import { useAuth } from "../context/AuthContext";
import "../styles/churvox-final-visual.css";

const css = `
.v9 *{box-sizing:border-box}
.v9{min-height:100vh;background:#0a0b0d;color:#f8f1e4;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;grid-template-columns:112px minmax(0,1fr)}
.v9::before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 7% 8%,rgba(255,122,72,.34),transparent 26%),radial-gradient(circle at 74% 10%,rgba(39,246,183,.18),transparent 28%),radial-gradient(circle at 92% 82%,rgba(174,91,255,.18),transparent 31%),linear-gradient(135deg,#0a0b0d 0%,#15120f 45%,#0d1013 100%);z-index:0}
.v9-rail,.v9-main,.v9-dock,.v9-drawer-bg{position:relative;z-index:1}
.v9-rail{height:100vh;position:sticky;top:0;padding:18px 12px;border-right:1px solid rgba(248,241,228,.08);background:rgba(8,9,11,.72);backdrop-filter:blur(24px);display:flex;flex-direction:column;align-items:center;gap:14px}
.v9-mark{width:62px;height:62px;display:block;filter:drop-shadow(0 18px 28px rgba(0,0,0,.52))}
.v9-brand-word{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;font-weight:950;letter-spacing:.22em;text-transform:uppercase;color:#ffd29a;margin:5px 0 8px}
.v9-rail nav{display:grid;gap:9px;width:100%}
.v9-rail button{border:0;background:transparent;color:rgba(248,241,228,.58);cursor:pointer}
.v9-nav-btn{height:66px;border-radius:26px!important;display:grid;place-items:center;gap:4px;width:100%;position:relative}
.v9-nav-btn svg{width:21px;height:21px}
.v9-nav-btn span{font-size:10px;font-weight:900;letter-spacing:-.02em}
.v9-nav-btn.active{background:linear-gradient(145deg,#ff7a48,#27f6b7);color:#0a0b0d;box-shadow:0 18px 36px rgba(255,122,72,.22)}
.v9-nav-btn.active::after{content:"";position:absolute;right:-13px;width:4px;height:34px;border-radius:99px;background:#27f6b7}
.v9-rail-bottom{margin-top:auto;display:grid;gap:9px;width:100%}
.v9-mini-btn{height:48px;border-radius:20px!important;background:rgba(248,241,228,.07)!important;color:#f8f1e4!important}
.v9-main{min-width:0;padding:22px 24px 110px;max-width:1680px;width:100%;margin:0 auto}
.v9-top{height:74px;border:1px solid rgba(248,241,228,.1);border-radius:34px;background:rgba(248,241,228,.075);backdrop-filter:blur(26px);display:grid;grid-template-columns:auto minmax(260px,1fr) auto auto auto;gap:12px;align-items:center;padding:12px;margin-bottom:20px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
.v9-mobile-menu{display:none!important}
.v9-search{height:50px;border:1px solid rgba(248,241,228,.11);border-radius:999px;background:rgba(248,241,228,.08);display:flex;align-items:center;gap:10px;padding:0 16px;color:rgba(248,241,228,.72)}
.v9-search input{width:100%;border:0;outline:0;background:transparent;color:#f8f1e4;font-weight:850}
.v9-search input::placeholder{color:rgba(248,241,228,.48)}
.v9-primary,.v9-ai-btn,.v9-icon,.v9-soft{height:50px;border:1px solid rgba(248,241,228,.12);border-radius:999px;padding:0 17px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:950;cursor:pointer}
.v9-primary{border:0;background:linear-gradient(135deg,#ff7a48,#ffcf75);color:#0a0b0d;box-shadow:0 18px 38px rgba(255,122,72,.24)}
.v9-ai-btn{background:#27f6b7;color:#07100d;border:0;box-shadow:0 18px 38px rgba(39,246,183,.16)}
.v9-icon,.v9-soft{background:rgba(248,241,228,.08);color:#f8f1e4}
.v9-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(350px,.85fr);gap:20px;margin-bottom:20px}
.v9-hero-main{min-height:360px;border:1px solid rgba(248,241,228,.10);border-radius:44px;background:linear-gradient(145deg,rgba(248,241,228,.12),rgba(248,241,228,.045));position:relative;overflow:hidden;padding:44px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 28px 90px rgba(0,0,0,.32)}
.v9-hero-main::before{content:"";position:absolute;inset:-1px;background:radial-gradient(circle at 18% 10%,rgba(255,122,72,.22),transparent 38%),radial-gradient(circle at 90% 20%,rgba(39,246,183,.13),transparent 34%);pointer-events:none}
.v9-hero-main>*{position:relative}
.v9-kicker{display:inline-flex;align-items:center;gap:8px;color:#27f6b7;font-size:12px;font-weight:950;letter-spacing:.16em;text-transform:uppercase;margin:0 0 18px}
.v9-hero-main h1{font-size:clamp(54px,6.8vw,104px);line-height:.84;letter-spacing:-.095em;margin:0;max-width:1050px;text-wrap:balance}
.v9-hero-main h1 span{color:#ff7a48}
.v9-hero-main p:not(.v9-kicker){color:rgba(248,241,228,.72);font-size:18px;line-height:1.55;max-width:820px;margin:20px 0 0}
.v9-hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
.v9-glass-btn{height:48px;border:1px solid rgba(248,241,228,.14);border-radius:999px;background:rgba(248,241,228,.08);color:#f8f1e4;padding:0 16px;font-weight:950;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.v9-engine-card{border:1px solid rgba(248,241,228,.10);border-radius:44px;background:linear-gradient(160deg,#f8f1e4,#f2dac1);color:#0a0b0d;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.26)}
.v9-engine-top{padding:26px;border-bottom:1px solid rgba(10,11,13,.08);display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.v9-engine-top small{display:block;text-transform:uppercase;letter-spacing:.16em;font-weight:950;color:#8a4d33;font-size:11px}.v9-engine-top strong{display:block;font-size:82px;line-height:.9;letter-spacing:-.09em;margin-top:12px}
.v9-pulse{width:78px;height:78px;border-radius:28px;background:#0a0b0d;color:#27f6b7;display:grid;place-items:center;box-shadow:0 20px 42px rgba(10,11,13,.22)}
.v9-engine-list{padding:20px;display:grid;gap:10px}.v9-engine-list div{border-radius:24px;background:rgba(10,11,13,.06);padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}.v9-engine-list span{font-weight:950}.v9-engine-list em{font-style:normal;color:#6d5b4a;font-weight:850}
.v9-sync{width:fit-content;max-width:100%;border:1px solid rgba(255,207,117,.34);border-radius:999px;background:rgba(255,207,117,.10);color:#ffcf75;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;font-weight:900;margin-bottom:18px}
.v9-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(340px,.9fr);gap:20px}
.v9-panel{border:1px solid rgba(248,241,228,.1);border-radius:38px;background:rgba(248,241,228,.075);backdrop-filter:blur(18px);box-shadow:0 26px 78px rgba(0,0,0,.25);padding:22px}
.v9-panel.light{background:#f8f1e4;color:#0a0b0d}
.v9-panel.dark{background:linear-gradient(150deg,rgba(248,241,228,.12),rgba(248,241,228,.045))}
.v9-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}
.v9-panel-head p{margin:0 0 7px;color:#27f6b7;font-size:11px;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.v9-panel.light .v9-panel-head p{color:#b24e2d}
.v9-panel-head h2{margin:0;font-size:31px;letter-spacing:-.06em;color:inherit}
.v9-moves,.v9-records,.v9-stats,.v9-rules,.v9-detail,.v9-move-grid{display:grid;gap:12px}
.v9-move-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.v9-move{border:1px solid rgba(248,241,228,.1);border-radius:30px;background:#f8f1e4;color:#0a0b0d;padding:16px;display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:14px;text-align:left;cursor:pointer;box-shadow:0 18px 42px rgba(0,0,0,.22);transition:.18s}
.v9-move:hover,.v9-record:hover,.v9-stat:hover,.v9-rules button:hover{transform:translateY(-2px)}
.v9-num{height:54px;width:54px;border-radius:20px;background:#0a0b0d;color:#ffcf75;display:grid;place-items:center;font-weight:950}
.v9-move-body b{display:block;margin:12px 0 6px;font-size:21px;letter-spacing:-.045em;line-height:1.08}.v9-move-body small{color:#5c5043;line-height:1.45;display:block}
.v9-pill{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.11em;background:#e7dacb;color:#0a0b0d}.v9-pill.cash{background:#dff6ea;color:#19784a}.v9-pill.urgent{background:#ffe3d6;color:#b8322a}.v9-pill.growth,.v9-pill.brain{background:#ebe5ff;color:#5b4dff}.v9-pill.good{background:#dff6ea;color:#19784a}
.v9-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.v9-wide{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px}
.v9-stat{min-height:134px;border:1px solid rgba(10,11,13,.08);border-radius:30px;background:#fff9ee;color:#0a0b0d;padding:18px;text-align:left;display:grid;gap:8px;cursor:pointer}.v9-stat b{font-size:34px;letter-spacing:-.06em}.v9-stat span{color:#65584a;font-weight:850}.v9-stat.cash,.v9-stat.good{background:#eaf8ef;color:#19784a}.v9-stat.urgent{background:#fff0e8;color:#b8322a}
.v9-record{min-height:80px;border:1px solid rgba(10,11,13,.08);border-radius:28px;background:#fff9ee;color:#0a0b0d;padding:13px;display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:12px;align-items:center;text-align:left;cursor:pointer}
.v9-record-icon{height:50px;width:50px;border-radius:19px;background:#eadccb;color:#b24e2d;display:grid;place-items:center}.v9-record-text{min-width:0}.v9-record-text b,.v9-record-text small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v9-record-text small{margin-top:4px;color:#6d5b4a}.v9-status{border-radius:999px;background:#eadccb;color:#65584a;padding:6px 9px;font-size:12px;font-weight:900}
.v9-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.v9-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v9-rules{grid-template-columns:repeat(4,minmax(0,1fr))}
.v9-rules button{border:1px solid rgba(10,11,13,.08);border-radius:30px;background:#fff9ee;color:#0a0b0d;padding:18px;text-align:left;cursor:pointer}.v9-rules button b{display:block;margin:12px 0 5px}.v9-rules button span{color:#6d5b4a;line-height:1.4}
.v9-empty{border:1px dashed rgba(248,241,228,.22);border-radius:30px;background:rgba(248,241,228,.06);padding:32px;display:grid;gap:9px;place-items:center;text-align:center;color:rgba(248,241,228,.65)}.v9-panel.light .v9-empty{border-color:rgba(10,11,13,.14);background:#fff9ee;color:#6d5b4a}.v9-empty b{color:inherit}
.v9-drawer-bg{position:fixed;inset:0;z-index:100;background:rgba(6,7,8,.58);display:flex;justify-content:flex-end;padding:18px}.v9-drawer{width:min(680px,100%);border:1px solid rgba(248,241,228,.12);border-radius:40px;background:#f8f1e4;color:#0a0b0d;box-shadow:0 44px 130px rgba(0,0,0,.52);overflow:hidden;display:flex;flex-direction:column}.v9-drawer header{padding:23px;border-bottom:1px solid rgba(10,11,13,.08);display:flex;justify-content:space-between;gap:14px}.v9-drawer header p{margin:0 0 6px;color:#b24e2d;font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.v9-drawer header h2{margin:0;font-size:31px;letter-spacing:-.06em}.v9-drawer header button{height:46px;width:46px;border:1px solid rgba(10,11,13,.1);border-radius:999px;background:#fff9ee}.v9-drawer-body{padding:23px;overflow:auto}.v9-drawer footer{padding:18px 23px;border-top:1px solid rgba(10,11,13,.08);display:flex;justify-content:flex-end}
.v9-move-detail{display:grid;gap:14px}.v9-move-detail h3{font-size:27px;margin:0;letter-spacing:-.055em}.v9-move-detail p,.v9-move-detail div{border:1px solid rgba(10,11,13,.08);border-radius:25px;background:#fff9ee;padding:16px;color:#65584a;line-height:1.5}.v9-move-detail div{display:flex;gap:12px}.v9-move-detail small{font-weight:850;color:#65584a}
.v9-detail div{border:1px solid rgba(10,11,13,.08);border-radius:20px;background:#fff9ee;padding:13px}.v9-detail span{display:block;margin-bottom:5px;color:#65584a;font-size:12px;text-transform:capitalize}.v9-detail strong{word-break:break-word}.v9-danger{border:0;border-radius:999px;padding:12px 16px;background:#b8322a;color:white;font-weight:950;display:inline-flex;gap:8px;align-items:center}.v9-tabs{display:none}.v9-spin{animation:v9spin 1s linear infinite}@keyframes v9spin{to{transform:rotate(360deg)}}
@media(max-width:1080px){.v9{display:block}.v9-rail{position:fixed;z-index:110;inset:0 auto 0 0;width:min(330px,88vw);transform:translateX(-105%);transition:.22s;align-items:stretch}.v9-rail.open{transform:translateX(0)}.v9-brand-word{display:none}.v9-close,.v9-mobile-menu{display:inline-flex!important}.v9-main{padding:12px 12px 110px}.v9-top{grid-template-columns:auto 1fr auto auto}.v9-primary:not(.v9-drawer .v9-primary),.v9-icon{display:none}.v9-hero,.v9-grid,.v9-two,.v9-card-grid,.v9-rules,.v9-wide,.v9-stats,.v9-move-grid{grid-template-columns:1fr}.v9-hero-main{min-height:auto;padding:28px}.v9-hero-main h1{font-size:44px;line-height:.95}.v9-tabs{position:fixed;z-index:90;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(6,1fr);gap:5px;background:rgba(8,9,11,.94);border:1px solid rgba(248,241,228,.13);border-radius:28px;padding:7px;backdrop-filter:blur(20px)}.v9-tabs button{border:0;background:transparent;color:rgba(248,241,228,.66);border-radius:19px;display:grid;place-items:center;gap:3px;padding:7px 2px;font-size:10px}.v9-tabs button.active{background:#f8f1e4;color:#c4512d}.v9-drawer-bg{align-items:flex-end;padding:8px}.v9-drawer{width:100%;max-height:90vh}}

/* visible approve buttons */
.v9-approve-all{
  min-height:48px;
  border:0;
  border-radius:999px;
  padding:0 18px;
  background:linear-gradient(135deg,#27f6b7,#ffcf75);
  color:#07100d;
  font-weight:950;
  display:inline-flex!important;
  align-items:center;
  justify-content:center;
  gap:8px;
  cursor:pointer;
  box-shadow:0 18px 38px rgba(39,246,183,.18);
}
.v9-approve-all:disabled{
  opacity:.55;
  cursor:not-allowed;
}
.v9-drawer-approve-main{
  width:100%;
  margin-bottom:4px;
}
.v9-panel-head .v9-primary,
.v9-panel-head .v9-approve-all,
.v9-drawer .v9-approve-all{
  display:inline-flex!important;
}
@media(max-width:1080px){
  .v9-panel-head .v9-primary,
  .v9-panel-head .v9-approve-all,
  .v9-drawer .v9-approve-all{
    display:inline-flex!important;
  }
}

`;

const NAV = [
  { id: "engine", label: "Engine", sub: "AI command", icon: BrainCircuit },
  { id: "moves", label: "Moves", sub: "Approve", icon: Bot },
  { id: "work", label: "Work", sub: "Jobs", icon: BriefcaseBusiness },
  { id: "cash", label: "Cash", sub: "Money", icon: Banknote },
  { id: "clients", label: "Clients", sub: "Context", icon: ContactRound },
  { id: "crew", label: "Crew", sub: "Team", icon: UsersRound },
  { id: "rules", label: "Rules", sub: "Automation", icon: Zap },
  { id: "numbers", label: "Numbers", sub: "Reports", icon: Gauge },
  { id: "setup", label: "Setup", sub: "Controls", icon: Settings },
];

const MAP = {
  dashboard: "engine", overview: "engine", smart: "engine", engine: "engine", brain: "engine",
  ai: "moves", operator: "moves", decisions: "moves", approvals: "moves", moves: "moves",
  jobs: "work", work: "work", dispatch: "work", calendar: "work",
  money: "cash", cash: "cash", quotes: "cash", invoices: "cash", sms: "cash", messages: "cash",
  clients: "clients", team: "crew", crew: "crew", payroll: "crew",
  automation: "rules", rules: "rules", reports: "numbers", numbers: "numbers",
  settings: "setup", setup: "setup", integrations: "setup",
};

const ROUTE = { engine: "/dashboard", moves: "/ai", work: "/work", cash: "/money", clients: "/clients", crew: "/team", rules: "/automation", numbers: "/reports", setup: "/settings" };
const toList = (v) => Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : Array.isArray(v?.data) ? v.data : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.approvals) ? v.approvals : [];
const idOf = (x) => x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.client_id || "";
const titleOf = (x, f = "Untitled") => x?.title || x?.name || x?.customer_name || x?.client_name || x?.invoice_number || x?.quote_number || f;
const statusOf = (x) => String(x?.status || x?.job_status || x?.workflow_status || "draft").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const done = (j) => ["completed", "done", "closed"].includes(String(j?.status || j?.job_status || "").toLowerCase());
const noWorker = (j) => !j?.assigned_worker_id && !j?.worker_id && !j?.assigned_worker_name;
const openInv = (i) => !["paid", "cancelled", "canceled"].includes(String(i?.status || "").toLowerCase());
const money = (n) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(n || 0));

function Mark() {
  return (
    <svg viewBox="0 0 120 120" className="v9-mark" aria-hidden="true">
      <defs><linearGradient id="v9g" x1="10" y1="8" x2="112" y2="112"><stop stopColor="#08090B"/><stop offset=".45" stopColor="#FF7A48"/><stop offset=".75" stopColor="#27F6B7"/><stop offset="1" stopColor="#AE5BFF"/></linearGradient></defs>
      <rect x="7" y="7" width="106" height="106" rx="31" fill="url(#v9g)" />
      <path d="M79 34a34 34 0 1 0 0 52" stroke="#F8F1E4" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M42 60h42" stroke="#FFD166" strokeWidth="12" strokeLinecap="round" />
      <path d="M68 42l20 18-20 18" stroke="#27F6B7" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function Brand() {
  return <><Mark /><div className="v9-brand-word">Churvox Engine</div></>;
}

function Pill({ tone = "", children }) {
  return <span className={`v9-pill ${tone}`}>{children}</span>;
}

function Stat({ label, value, tone = "", icon: Icon = Gauge, onClick }) {
  return <button className={`v9-stat ${tone}`} type="button" onClick={onClick}><Icon size={18} /><b>{value}</b><span>{label}</span></button>;
}

function Panel({ eyebrow, title, action, children, dark = false, light = false }) {
  return <section className={`v9-panel ${dark ? "dark" : ""} ${light ? "light" : ""}`}><div className="v9-panel-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{action}</div>{children}</section>;
}

function Empty({ title, text, icon: Icon = Sparkles }) {
  return <div className="v9-empty"><Icon size={28} /><b>{title}</b><span>{text}</span></div>;
}

function Drawer({ drawer, close, children, footer }) {
  if (!drawer) return null;
  return <div className="v9-drawer-bg" onMouseDown={(e) => e.target === e.currentTarget && close()}><aside className="v9-drawer"><header><div><p>{drawer.kicker}</p><h2>{drawer.title}</h2></div><button type="button" onClick={close}><X size={20} /></button></header><div className="v9-drawer-body">{children}</div>{footer && <footer>{footer}</footer>}</aside></div>;
}

function Record({ item, type, open }) {
  const Icon = type === "invoice" ? ReceiptText : type === "quote" ? FileText : type === "client" ? ContactRound : type === "worker" ? UsersRound : Hammer;
  return <button className="v9-record" type="button" onClick={() => open({ mode: "record", type, item })}><span className="v9-record-icon"><Icon size={18} /></span><span className="v9-record-text"><b>{titleOf(item, type)}</b><small>{item?.address || item?.customer_email || item?.email || item?.phone || item?.notes || "Tap for command detail"}</small></span><span className="v9-status">{statusOf(item)}</span></button>;
}

function useBusinessData() {
  const [state, setState] = useState({ loading: true, error: "", data: { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] } });

  const refresh = async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const get = async (path) => {
      const response = await fetch(`${API_BASE}${path}`, { headers, credentials: "include" });
      if (!response.ok) throw new Error(path);
      return response.json();
    };

    const endpoints = [["jobs", "/api/jobs"], ["clients", "/api/clients"], ["invoices", "/api/invoices"], ["quotes", "/api/quotes"], ["workers", "/api/team/workers"], ["approvals", "/api/ai/operator/approvals"]];
    const settled = await Promise.allSettled(endpoints.map(([, path]) => get(path)));
    const data = { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] };
    let failed = false;

    settled.forEach((result, index) => {
      if (result.status === "fulfilled") data[endpoints[index][0]] = toList(result.value);
      else failed = true;
    });

    setState({ loading: false, error: failed ? "One live source is still loading. The engine loaded the rest." : "", data });
  };

  useEffect(() => { refresh(); }, []);
  return { ...state, refresh };
}

export default function V9BusinessEngine() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { loading, error, data, refresh } = useBusinessData();

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [running, setRunning] = useState("");

  const pathArea = window.location.pathname.split("/").filter(Boolean)[0];
  const current = MAP[String(params.section || params.area || pathArea || "engine").toLowerCase()] || "engine";
  const active = NAV.find((item) => item.id === current) || NAV[0];
  const ActiveIcon = active.icon;
  const showCommandHero = current === "engine" || current === "moves";

  const go = (area) => { setNavOpen(false); navigate(ROUTE[area] || "/dashboard"); };

  const openJobs = data.jobs.filter((job) => !done(job));
  const completedJobs = data.jobs.filter(done);
  const unassignedJobs = data.jobs.filter(noWorker);
  const openInvoices = data.invoices.filter(openInv);
  const openInvoiceValue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.subtotal || invoice.amount || 0), 0);
  const quoteFollowups = data.quotes.filter((quote) => ["draft", "sent"].includes(String(quote.status || "").toLowerCase()));

  const moves = useMemo(() => {
    const output = [];

    completedJobs.slice(0, 6).forEach((job) => {
      const hasInvoice = data.invoices.some((invoice) => String(invoice.job_id || invoice.source_job_id || invoice.linked_job_id || "") === String(idOf(job)));
      if (!hasInvoice) {
        output.push({ id: `invoice-${idOf(job)}`, kind: "draft_invoice", tone: "cash", title: `Turn ${titleOf(job, "completed job")} into an invoice`, summary: "Completed work not billed", reason: "Churvox found finished work with no matching invoice. It can prepare the draft using job notes, client detail and price.", outcome: "Finished work becomes billable cash.", item: job });
      }
    });

    unassignedJobs.slice(0, 6).forEach((job) => {
      const worker = data.workers.find((person) => String(person.status || "active").toLowerCase() !== "inactive") || data.workers[0];
      output.push({ id: `assign-${idOf(job)}`, kind: "assign_worker", tone: "urgent", title: `Put crew on ${titleOf(job, "unassigned job")}`, summary: "Job needs crew", reason: worker ? `${worker.name || worker.email || "A crew member"} is the first crew match Churvox found. Owner approval stays required before assignment.` : "No crew is attached to this job yet. Churvox is flagging it before it slips.", outcome: "The run sheet keeps moving.", item: job, worker });
    });

    openInvoices.slice(0, 6).forEach((invoice) => {
      output.push({ id: `follow-${idOf(invoice)}`, kind: "invoice_followup", tone: "cash", title: `Chase ${titleOf(invoice, "open invoice")} properly`, summary: "Open cash follow-up", reason: "Churvox found an open invoice. It can draft a clear reminder for owner approval without sending anything automatically.", outcome: "Cashflow is protected without sounding pushy.", item: invoice });
    });

    quoteFollowups.slice(0, 5).forEach((quote) => {
      output.push({ id: `quote-${idOf(quote)}`, kind: "quote_followup", tone: "growth", title: `Follow up ${titleOf(quote, "quote")}`, summary: "Quote still open", reason: "Churvox found a quote that has not been accepted. It can draft a helpful follow-up.", outcome: "Sales opportunities keep moving.", item: quote });
    });

    data.approvals.slice(0, 5).forEach((approval, index) => {
      output.push({ id: approval.id || `approval-${index}`, kind: approval.type || "approval", tone: "brain", title: approval.title || approval.name || "AI approval ready", summary: approval.impact || "Prepared action", reason: approval.reason || approval.description || "Churvox prepared this action for owner review.", outcome: "Ready for owner approval.", item: approval });
    });

    return output.slice(0, 14);
  }, [completedJobs, unassignedJobs, openInvoices, quoteFollowups, data.invoices, data.workers, data.approvals]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;

    const hit = (type, items) =>
      items
        .filter((item) => JSON.stringify(item || {}).toLowerCase().includes(term))
        .slice(0, 6)
        .map((item) => ({ type, item }));

    return [
      ...hit("job", data.jobs),
      ...hit("client", data.clients),
      ...hit("invoice", data.invoices),
      ...hit("quote", data.quotes),
      ...hit("worker", data.workers),
    ].slice(0, 18);
  }, [query, data]);

  const open = (payload) => {
    if (payload.mode === "move") {
      setDrawer({ ...payload, title: payload.item.title, kicker: "AI prepared move" });
      return;
    }

    setDrawer({ ...payload, title: titleOf(payload.item, payload.type), kicker: statusOf(payload.item) });
  };

  const approveMove = async (move) => {
    setRunning(move.id);
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    try {
      if (move.kind === "draft_invoice") {
        const job = move.item || {};
        const payload = {
          job_id: idOf(job) || undefined,
          client_id: job.client_id || undefined,
          customer_name: job.customer_name || job.client_name || job.name || "Client",
          customer_email: job.customer_email || job.client_email || undefined,
          address: job.address || job.job_address || "",
          description: job.ai_invoice_description || job.invoice_description_draft || job.notes || `Work completed for ${titleOf(job, "job")}.`,
          subtotal: Number(job.price || job.total || job.subtotal || 0),
        };

        const response = await fetch(`${API_BASE}/api/invoices`, { method: "POST", headers, credentials: "include", body: JSON.stringify(payload) });
        if (!response.ok) throw new Error("Could not create draft invoice.");

        await refresh();
        setDrawer({ mode: "done", title: "Draft invoice created", kicker: "Approved", item: { message: "Churvox created the draft invoice. Open Cash to review it." } });
        return;
      }

      setDrawer({ mode: "prepared", title: "Move approved", kicker: "Ready", item: { message: "This move is approved in the command sheet. Backend execution can be wired safely for this action." } });
    } catch (err) {
      setDrawer({ mode: "error", title: "Move could not run", kicker: "Needs review", item: { message: err.message || "This action could not run yet." } });
    } finally {
      setRunning("");
    }
  };


  const sendJsonForApproveAll = async (path, body, method = "POST") => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body || {}),
    });

    if (!response.ok) {
      throw new Error(`${path} failed with ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("json") ? response.json() : response.text();
  };

  const tryApproveAllRequests = async (requests) => {
    let lastError = null;

    for (const request of requests) {
      try {
        return await sendJsonForApproveAll(request.path, request.body, request.method || "POST");
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No approval endpoint worked.");
  };

  const runPreparedMoveForApproveAll = async (move) => {
    if (!move) throw new Error("Missing move.");

    if (move.kind === "draft_invoice") {
      const job = move.item || {};
      const payload = {
        job_id: idOf(job) || undefined,
        client_id: job.client_id || undefined,
        customer_name: job.customer_name || job.client_name || job.name || "Client",
        customer_email: job.customer_email || job.client_email || undefined,
        address: job.address || job.job_address || "",
        description:
          job.ai_invoice_description ||
          job.invoice_description_draft ||
          job.notes ||
          `Work completed for ${titleOf(job, "job")}.`,
        subtotal: Number(job.price || job.total || job.subtotal || 0),
        status: "draft",
      };

      return tryApproveAllRequests([
        { path: "/api/invoices", method: "POST", body: payload },
        { path: "/api/ai/operator/approve", method: "POST", body: { move, payload } },
      ]);
    }

    if (move.kind === "assign_worker") {
      const job = move.item || {};
      const worker = move.worker || move.match?.worker || {};
      const jobId = idOf(job);
      const workerId = idOf(worker);

      if (!jobId || !workerId) {
        throw new Error("Missing job or worker for assignment.");
      }

      const payload = {
        assigned_worker_id: workerId,
        worker_id: workerId,
        assigned_worker_name: worker.name || worker.email || "Worker",
        status: job.status || "assigned",
      };

      return tryApproveAllRequests([
        { path: `/api/jobs/${jobId}/assign`, method: "POST", body: payload },
        { path: `/api/jobs/${jobId}`, method: "PATCH", body: payload },
        { path: "/api/ai/operator/approve", method: "POST", body: { move, payload } },
      ]);
    }

    return tryApproveAllRequests([
      { path: "/api/ai/operator/approve", method: "POST", body: { move } },
      { path: "/api/automation/runs", method: "POST", body: { source: "v9_approve_all", move } },
    ]);
  };

  const approveAllPreparedMoves = async () => {
    const prepared = Array.isArray(moves) ? moves.filter(Boolean) : [];

    if (!prepared.length || running === "approve-all") {
      return;
    }

    setRunning("approve-all");

    let approved = 0;
    const failed = [];

    for (const move of prepared) {
      try {
        await runPreparedMoveForApproveAll(move);
        approved += 1;
      } catch (error) {
        failed.push({
          title: move.title || move.id || "Prepared move",
          message: error?.message || "Could not approve this move.",
        });
      }
    }

    try {
      await refresh();
    } catch {}

    setRunning("");

    setDrawer({
      mode: failed.length ? "error" : "done",
      title: failed.length ? "Approve all finished with checks needed" : "All prepared moves approved",
      kicker: failed.length ? "Needs review" : "Approved",
      item: {
        message: failed.length
          ? `Approved ${approved} move${approved === 1 ? "" : "s"}. ${failed.length} move${failed.length === 1 ? "" : "s"} need review.`
          : `Approved ${approved} prepared move${approved === 1 ? "" : "s"}.`,
        failed,
      },
    });
  };



  const postVisibleApproval = async (path, body, method = "POST") => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body || {}),
    });

    if (!response.ok) {
      throw new Error(`${path} failed with ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("json") ? response.json() : response.text();
  };

  const tryVisibleApproval = async (requests) => {
    let lastError = null;

    for (const request of requests) {
      try {
        return await postVisibleApproval(request.path, request.body, request.method || "POST");
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No approval endpoint worked.");
  };

  const approveVisibleMove = async (move) => {
    if (!move || running === move.id || running === "approve-all") return;

    setRunning(move.id);

    try {
      if (move.kind === "draft_invoice") {
        const job = move.item || {};
        const payload = {
          job_id: idOf(job) || undefined,
          client_id: job.client_id || undefined,
          customer_name: job.customer_name || job.client_name || job.name || "Client",
          customer_email: job.customer_email || job.client_email || undefined,
          address: job.address || job.job_address || "",
          description:
            job.ai_invoice_description ||
            job.invoice_description_draft ||
            job.notes ||
            `Work completed for ${titleOf(job, "job")}.`,
          subtotal: Number(job.price || job.total || job.subtotal || 0),
          status: "draft",
        };

        await tryVisibleApproval([
          { path: "/api/invoices", method: "POST", body: payload },
          { path: "/api/ai/operator/approve", method: "POST", body: { move, payload } },
        ]);
      } else if (move.kind === "assign_worker") {
        const job = move.item || {};
        const worker = move.worker || move.match?.worker || {};
        const jobId = idOf(job);
        const workerId = idOf(worker);

        if (!jobId || !workerId) {
          throw new Error("Missing job or worker for assignment.");
        }

        const payload = {
          assigned_worker_id: workerId,
          worker_id: workerId,
          assigned_worker_name: worker.name || worker.email || "Worker",
          status: job.status || "assigned",
        };

        await tryVisibleApproval([
          { path: `/api/jobs/${jobId}/assign`, method: "POST", body: payload },
          { path: `/api/jobs/${jobId}`, method: "PATCH", body: payload },
          { path: "/api/ai/operator/approve", method: "POST", body: { move, payload } },
        ]);
      } else {
        await tryVisibleApproval([
          { path: "/api/ai/operator/approve", method: "POST", body: { move } },
          { path: "/api/automation/runs", method: "POST", body: { source: "v9_visible_approve", move } },
        ]);
      }

      try {
        await refresh();
      } catch {}

      setDrawer({
        mode: "done",
        title: "Move approved",
        kicker: "Approved",
        item: { message: `${move.title || "Prepared move"} was approved.` },
      });
    } catch (error) {
      setDrawer({
        mode: "error",
        title: "Move could not run",
        kicker: "Needs review",
        item: { message: error?.message || "This action could not run yet." },
      });
    } finally {
      setRunning("");
    }
  };

  const approveAllVisibleMoves = async () => {
    const prepared = Array.isArray(moves) ? moves.filter(Boolean) : [];
    if (!prepared.length || running === "approve-all") return;

    setRunning("approve-all");

    let approved = 0;
    const failed = [];

    for (const move of prepared) {
      try {
        await approveVisibleMove(move);
        approved += 1;
      } catch (error) {
        failed.push(move.title || move.id || "Prepared move");
      }
    }

    try {
      await refresh();
    } catch {}

    setRunning("");

    setDrawer({
      mode: failed.length ? "error" : "done",
      title: failed.length ? "Approve all finished with checks needed" : "All prepared moves approved",
      kicker: failed.length ? "Needs review" : "Approved",
      item: {
        message: failed.length
          ? `Approved ${approved} move${approved === 1 ? "" : "s"}. ${failed.length} need review.`
          : `Approved ${approved} prepared move${approved === 1 ? "" : "s"}.`,
      },
    });
  };


  const detailRows = Object.entries(drawer?.item || {})
    .filter(([key, value]) => !["item", "worker"].includes(key) && value !== "" && value !== null && value !== undefined)
    .slice(0, 18);

  return (
    <div className="v9">
      <style>{css}</style>

      <aside className={`v9-rail ${navOpen ? "open" : ""}`}>
        <div style={{ display: "grid", placeItems: "center" }}>
          <Brand />
          <button className="v9-icon v9-close" type="button" onClick={() => setNavOpen(false)}><X size={18} /></button>
        </div>

        <nav>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`v9-nav-btn ${current === item.id ? "active" : ""}`} type="button" onClick={() => go(item.id)}>
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="v9-rail-bottom">
          <button className="v9-mini-btn" type="button" onClick={refresh}><RefreshCw size={18} /></button>
          <button className="v9-mini-btn" type="button" onClick={() => setDrawer({ mode: "profile", title: user?.name || "Profile", kicker: "Account", item: user || {} })}><UserRound size={18} /></button>
        </div>
      </aside>

      <main className="v9-main">
        <header className="v9-top">
          <button className="v9-icon v9-mobile-menu" type="button" onClick={() => setNavOpen(true)}><Menu size={22} /></button>
          <label className="v9-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the business or find a command..." />
          </label>
          <button className="v9-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "Create from command", kicker: "Fast action", item: {} })}><Plus size={18} /> Create</button>
          <button className="v9-ai-btn" type="button" onClick={() => go("moves")}><Bot size={18} /> {moves.length}</button>
          <button className="v9-icon" type="button" onClick={() => setDrawer({ mode: "profile", title: user?.name || "Profile", kicker: "Account", item: user || {} })}><UserRound size={18} /></button>
        </header>

          {!showCommandHero && (
            <section className="v9-page-intro">
              <div>
                <p><ActiveIcon size={16} /> {active.label}</p>
                <h1>
                  {{
                    work: "Work command centre",
                    cash: "Cash and invoice control",
                    clients: "Client memory and history",
                    crew: "Crew and workload control",
                    rules: "Automation rules",
                    numbers: "Business numbers",
                    setup: "Business setup",
                  }[current] || "Business command centre"}
                </h1>
                <span>{active.sub} · Tap anything to open it here, not another full-page maze.</span>
              </div>
            </section>
          )}



        {searchResults ? (
          <Panel eyebrow="Search engine" title={`${searchResults.length} live records found`} light action={<button className="v9-soft" type="button" onClick={() => setQuery("")}>Clear</button>}>
            <div className="v9-records">{searchResults.map((result, index) => <Record key={`${result.type}-${index}`} type={result.type} item={result.item} open={open} />)}</div>
          </Panel>
        ) : (
          <>
            <section className="v9-hero">
              <div className="v9-hero-main">
                <div>
                  <p className="v9-kicker"><ActiveIcon size={16} /> {active.label}</p>
                  <h1>The business <span>engine</span> that tells the owner what to do next.</h1>
                  <p>Churvox reads jobs, cash, clients and crew. It prepares the work, explains the reason, and waits for owner approval. No maze. No full-page jumping.</p>
                </div>
                <div className="v9-hero-actions">
                  <button className="v9-primary" type="button" onClick={() => go("moves")}><Bot size={18} /> Review AI moves</button>
                  <button className="v9-glass-btn" type="button" onClick={() => go("work")}><BriefcaseBusiness size={18} /> Open work</button>
                  <button className="v9-glass-btn" type="button" onClick={() => go("cash")}><Banknote size={18} /> Open cash</button>
                </div>
              </div>

              <div className="v9-engine-card">
                <div className="v9-engine-top">
                  <div>
                    <small>Engine output</small>
                    <strong>{moves.length}</strong>
                  </div>
                  <div className="v9-pulse"><BrainCircuit size={34} /></div>
                </div>
                <div className="v9-engine-list">
                  <div><span>{openJobs.length}</span><em>open jobs</em></div>
                  <div><span>{unassignedJobs.length}</span><em>need crew</em></div>
                  <div><span>{money(openInvoiceValue)}</span><em>open cash</em></div>
                </div>
              </div>
            </section>

            {error && <div className="v9-sync"><AlertTriangle size={18} /><span>{error}</span></div>}
{current === "engine" && (
              <div className="v9-grid">
                <Panel eyebrow="AI command engine" title="Moves ready for owner approval" dark>
                  <div className="v9-moves">
                    {loading ? <Empty icon={Loader2} title="Engine is reading the business" text="Checking jobs, invoices, quotes, clients and crew." /> :
                    moves.length ? moves.slice(0, 7).map((move, index) => (
                      <button className="v9-move" key={move.id} type="button" onClick={() => open({ mode: "move", item: move })}>
                        <span className="v9-num">{String(index + 1).padStart(2, "0")}</span>
                        <span className="v9-move-body"><Pill tone={move.tone}>{move.summary}</Pill><b>{move.title}</b><small>{move.reason}</small></span>
                        <ChevronRight size={20} />
                      </button>
                    )) : <Empty title="Engine is clear" text="No urgent work, cash or crew move was detected." />}
                  </div>
                </Panel>

                <Panel eyebrow="Owner pulse" title="Business heartbeat" light>
                  <div className="v9-stats">
                    <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} onClick={() => go("work")} />
                    <Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} onClick={() => go("work")} />
                    <Stat label="Open cash" value={money(openInvoiceValue)} tone="cash" icon={CircleDollarSign} onClick={() => go("cash")} />
                    <Stat label="Clients" value={data.clients.length} icon={ContactRound} onClick={() => go("clients")} />
                  </div>
                </Panel>

                <Panel eyebrow="Live work lane" title="Jobs being watched" light>
                  <div className="v9-records">
                    {openJobs.slice(0, 6).map((job) => <Record key={idOf(job) || titleOf(job)} type="job" item={job} open={open} />)}
                    {!openJobs.length && <Empty title="No open jobs" text="When work is added, Churvox starts building the run sheet." />}
                  </div>
                </Panel>
              </div>
            )}

            {current === "moves" && (
              <Panel eyebrow="AI operator" title="Prepared moves for approval" dark>
                <div className="v9-move-grid">
                  {moves.length ? moves.map((move, index) => (
                    <button className="v9-move" key={move.id} type="button" onClick={() => open({ mode: "move", item: move })}>
                      <span className="v9-num">{String(index + 1).padStart(2, "0")}</span>
                      <span className="v9-move-body"><Pill tone={move.tone}>{move.summary}</Pill><b>{move.title}</b><small>{move.reason}</small></span>
                      <ChevronRight size={20} />
                    </button>
                  )) : <Empty icon={Bot} title="No moves waiting" text="Churvox is watching for the next job, cash or crew move." />}
                </div>
              </Panel>
            )}

            {current === "work" && (
              <Panel eyebrow="Work engine" title="Jobs, dispatch and proof" light action={<button className="v9-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New job", kicker: "Fast action", item: {} })}><Plus size={17} /> Job</button>}>
                <div className="v9-stats v9-wide">
                  <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} />
                  <Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} />
                  <Stat label="Completed" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                </div>
                <div className="v9-records">{data.jobs.map((job) => <Record key={idOf(job) || titleOf(job)} type="job" item={job} open={open} />)}</div>
              </Panel>
            )}

            {current === "cash" && (
              <Panel eyebrow="Cash engine" title="Quotes, invoices and follow-up" light action={<button className="v9-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New invoice", kicker: "Fast action", item: {} })}><Plus size={17} /> Invoice</button>}>
                <div className="v9-stats v9-wide">
                  <Stat label="Open invoice value" value={money(openInvoiceValue)} tone="cash" icon={CreditCard} />
                  <Stat label="Open invoices" value={openInvoices.length} icon={ReceiptText} />
                  <Stat label="Quote follow-ups" value={quoteFollowups.length} tone="urgent" icon={FileText} />
                </div>
                <div className="v9-two">
                  <div className="v9-records">{data.invoices.map((invoice) => <Record key={idOf(invoice)} type="invoice" item={invoice} open={open} />)}</div>
                  <div className="v9-records">{data.quotes.map((quote) => <Record key={idOf(quote)} type="quote" item={quote} open={open} />)}</div>
                </div>
              </Panel>
            )}

            {current === "clients" && (
              <Panel eyebrow="Client engine" title="Clients with live business context" light>
                <div className="v9-card-grid">
                  {data.clients.map((client) => <Record key={idOf(client) || titleOf(client)} type="client" item={client} open={open} />)}
                  {!data.clients.length && <Empty icon={ContactRound} title="No clients loaded" text="Add clients so AI can connect jobs, quotes and invoices." />}
                </div>
              </Panel>
            )}

            {current === "crew" && (
              <Panel eyebrow="Crew engine" title="Team, workload and payroll-ready time" light>
                <div className="v9-card-grid">
                  {data.workers.map((worker) => <Record key={idOf(worker) || worker.email || worker.name} type="worker" item={worker} open={open} />)}
                  {!data.workers.length && <Empty icon={UsersRound} title="No crew loaded" text="Invite workers so AI can recommend assignments." />}
                </div>
              </Panel>
            )}

            {current === "rules" && (
              <Panel eyebrow="Automation engine" title="Rules that let AI run the admin" light>
                <div className="v9-rules">
                  {[
                    ["Invoice after completion", "Draft invoice when a job is marked complete."],
                    ["Crew conflict warning", "Warn before assigning a busy worker."],
                    ["Cash follow-up", "Prepare overdue invoice reminders."],
                    ["Quote follow-up", "Prepare friendly quote follow-ups."],
                    ["Recurring work", "Build the next run sheet automatically."],
                    ["Proof alert", "Notify owner when job proof is uploaded."],
                    ["Missing details", "Find jobs or clients missing key info."],
                    ["Daily owner brief", "Prepare the morning business summary."],
                  ].map(([title, text]) => (
                    <button key={title} type="button" onClick={() => setDrawer({ mode: "rule", title, kicker: "AI rule", item: { title, text, control: "Approval-first" } })}>
                      <ListChecks size={20} /><b>{title}</b><span>{text}</span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {current === "numbers" && (
              <Panel eyebrow="Numbers engine" title="Plain-English business performance" light>
                <div className="v9-stats v9-wide">
                  <Stat label="Completed jobs" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                  <Stat label="Open invoice value" value={money(openInvoiceValue)} tone="cash" icon={CircleDollarSign} />
                  <Stat label="Clients" value={data.clients.length} icon={ContactRound} />
                </div>
              </Panel>
            )}

            {current === "setup" && (
              <Panel eyebrow="Control engine" title="Tell AI what it can and cannot do" light>
                <div className="v9-rules">
                  {[
                    ["Business profile", "Trade, area, defaults and brand."],
                    ["MYOB and payments", "Sync, invoice source and payment rules."],
                    ["AI approval limits", "Control what AI prepares and what needs approval."],
                    ["Customer messages", "Templates for reminders and updates."],
                  ].map(([title, text]) => (
                    <button key={title} type="button" onClick={() => setDrawer({ mode: "setup", title, kicker: "Setup", item: { title, text } })}>
                      <ShieldCheck size={20} /><b>{title}</b><span>{text}</span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}
      </main>

      <nav className="v9-tabs">
        {NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={current === item.id ? "active" : ""} type="button" onClick={() => go(item.id)}><Icon size={19} /><span>{item.label}</span></button>;
        })}
        <button className={current === "moves" ? "active" : ""} type="button" onClick={() => go("moves")}><Bot size={19} /><span>AI</span></button>
      </nav>

      <Drawer
        drawer={drawer}
        close={() => setDrawer(null)}
        footer={
          drawer?.mode === "profile" ? (
            <button className="v9-danger" type="button" onClick={logout}><LogOut size={17} /> Log out</button>
          ) : drawer?.mode === "move" ? (
            <button className="v9-primary" type="button" onClick={() => approveMove(drawer.item)} disabled={running === drawer.item.id}>
              {running === drawer.item.id ? <Loader2 size={17} className="v9-spin" /> : <CheckCircle2 size={17} />} Approve move
            </button>
          ) : null
        }
      >
        {drawer?.mode === "move" && (
          <div className="v9-move-detail">
            <Pill tone={drawer.item.tone}>{drawer.item.summary}</Pill>
            <h3>{drawer.item.title}</h3>
            <p>{drawer.item.reason}</p>
            <div><BrainCircuit size={20} /><span>{drawer.item.outcome}</span></div>
            <small>Nothing is sent, assigned, charged, deleted or synced without owner approval.</small>
          </div>
        )}

        {drawer?.mode === "create" && (
          <div className="v9-move-detail">
            <Pill tone="brain">Fast command</Pill>
            <h3>Create without leaving the engine</h3>
            <p>V9 keeps creation inside this command sheet. Final job, client, quote and invoice forms plug in here without sending the owner into old full-page flows.</p>
          </div>
        )}

        {["done", "prepared", "error"].includes(drawer?.mode) && (
          <div className="v9-move-detail">
            <Pill tone={drawer.mode === "error" ? "urgent" : "good"}>{drawer.kicker}</Pill>
            <h3>{drawer.title}</h3>
            <p>{drawer.item?.message}</p>
          </div>
        )}

        {drawer && !["move", "create", "done", "prepared", "error"].includes(drawer.mode) && (
          <div className="v9-detail">
            {detailRows.map(([key, value]) => (
              <div key={key}>
                <span>{key.replace(/_/g, " ")}</span>
                <strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 170) : String(value)}</strong>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
