import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
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
  X,
  Zap,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import { useAuth } from "../context/AuthContext";

const css = `
.final-os *{box-sizing:border-box}
.final-os{min-height:100vh;background:#08090b;color:#f8f1e4;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;grid-template-columns:116px minmax(0,1fr)}
.final-os:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 7% 8%,rgba(255,122,72,.34),transparent 27%),radial-gradient(circle at 74% 10%,rgba(39,246,183,.19),transparent 29%),radial-gradient(circle at 93% 82%,rgba(174,91,255,.18),transparent 31%),linear-gradient(135deg,#08090b 0%,#16120f 46%,#0d1114 100%);z-index:0}
.final-rail,.final-main,.final-drawer-bg,.final-tabs{position:relative;z-index:1}
.final-rail{height:100vh;position:sticky;top:0;padding:18px 12px;border-right:1px solid rgba(248,241,228,.09);background:rgba(8,9,11,.74);backdrop-filter:blur(24px);display:flex;flex-direction:column;align-items:center;gap:14px}
.final-mark{width:64px;height:64px;filter:drop-shadow(0 18px 30px rgba(0,0,0,.55))}
.final-word{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;font-weight:950;letter-spacing:.22em;text-transform:uppercase;color:#ffd29a;margin:5px 0 8px}
.final-nav{display:grid;gap:9px;width:100%}
.final-nav button{border:0;background:transparent;color:rgba(248,241,228,.58);cursor:pointer}
.final-nav-btn{height:66px;border-radius:26px!important;display:grid;place-items:center;gap:4px;width:100%;position:relative}
.final-nav-btn svg{width:21px;height:21px}
.final-nav-btn span{font-size:10px;font-weight:900}
.final-nav-btn.active{background:linear-gradient(145deg,#ff7a48,#27f6b7);color:#08090b;box-shadow:0 18px 36px rgba(255,122,72,.23)}
.final-nav-btn.active:after{content:"";position:absolute;right:-13px;width:4px;height:34px;border-radius:99px;background:#27f6b7}
.final-rail-bottom{margin-top:auto;display:grid;gap:9px;width:100%}
.final-mini{height:48px;border:0;border-radius:20px;background:rgba(248,241,228,.07);color:#f8f1e4;display:grid;place-items:center;cursor:pointer}
.final-main{min-width:0;padding:22px 24px 110px;max-width:1720px;width:100%;margin:0 auto}
.final-top{height:74px;border:1px solid rgba(248,241,228,.1);border-radius:34px;background:rgba(248,241,228,.075);backdrop-filter:blur(26px);display:grid;grid-template-columns:auto minmax(260px,1fr) auto auto auto;gap:12px;align-items:center;padding:12px;margin-bottom:20px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
.final-menu{display:none!important}
.final-search{height:50px;border:1px solid rgba(248,241,228,.11);border-radius:999px;background:rgba(248,241,228,.08);display:flex;align-items:center;gap:10px;padding:0 16px;color:rgba(248,241,228,.72)}
.final-search input{width:100%;border:0;outline:0;background:transparent;color:#f8f1e4;font-weight:850}
.final-search input::placeholder{color:rgba(248,241,228,.48)}
.final-primary,.final-ai,.final-icon,.final-soft{height:50px;border:1px solid rgba(248,241,228,.12);border-radius:999px;padding:0 17px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:950;cursor:pointer}
.final-primary{border:0;background:linear-gradient(135deg,#ff7a48,#ffcf75);color:#08090b;box-shadow:0 18px 38px rgba(255,122,72,.24)}
.final-ai{border:0;background:#27f6b7;color:#07100d;box-shadow:0 18px 38px rgba(39,246,183,.16)}
.final-icon,.final-soft{background:rgba(248,241,228,.08);color:#f8f1e4}
.final-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(350px,.85fr);gap:20px;margin-bottom:20px}
.final-hero-main{min-height:360px;border:1px solid rgba(248,241,228,.10);border-radius:44px;background:linear-gradient(145deg,rgba(248,241,228,.12),rgba(248,241,228,.045));position:relative;overflow:hidden;padding:44px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 28px 90px rgba(0,0,0,.32)}
.final-hero-main:before{content:"";position:absolute;inset:-1px;background:radial-gradient(circle at 18% 10%,rgba(255,122,72,.22),transparent 38%),radial-gradient(circle at 90% 20%,rgba(39,246,183,.13),transparent 34%);pointer-events:none}
.final-hero-main>*{position:relative}
.final-kicker{display:inline-flex;align-items:center;gap:8px;color:#27f6b7;font-size:12px;font-weight:950;letter-spacing:.16em;text-transform:uppercase;margin:0 0 18px}
.final-hero-main h1{font-size:clamp(54px,6.8vw,104px);line-height:.84;letter-spacing:-.095em;margin:0;max-width:1050px;text-wrap:balance}
.final-hero-main h1 span{color:#ff7a48}
.final-hero-main p:not(.final-kicker){color:rgba(248,241,228,.72);font-size:18px;line-height:1.55;max-width:850px;margin:20px 0 0}
.final-hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
.final-glass{height:48px;border:1px solid rgba(248,241,228,.14);border-radius:999px;background:rgba(248,241,228,.08);color:#f8f1e4;padding:0 16px;font-weight:950;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.final-engine-card{border:1px solid rgba(248,241,228,.10);border-radius:44px;background:linear-gradient(160deg,#f8f1e4,#f2dac1);color:#08090b;overflow:hidden;position:relative;box-shadow:0 28px 90px rgba(0,0,0,.26)}
.final-engine-top{padding:26px;border-bottom:1px solid rgba(10,11,13,.08);display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.final-engine-top small{display:block;text-transform:uppercase;letter-spacing:.16em;font-weight:950;color:#8a4d33;font-size:11px}
.final-engine-top strong{display:block;font-size:82px;line-height:.9;letter-spacing:-.09em;margin-top:12px}
.final-pulse{width:78px;height:78px;border-radius:28px;background:#08090b;color:#27f6b7;display:grid;place-items:center;box-shadow:0 20px 42px rgba(10,11,13,.22)}
.final-engine-list{padding:20px;display:grid;gap:10px}
.final-engine-list div{border-radius:24px;background:rgba(10,11,13,.06);padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.final-engine-list span{font-weight:950}
.final-engine-list em{font-style:normal;color:#6d5b4a;font-weight:850}
.final-sync{width:fit-content;max-width:100%;border:1px solid rgba(255,207,117,.34);border-radius:999px;background:rgba(255,207,117,.10);color:#ffcf75;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;font-weight:900;margin-bottom:18px}
.final-power,.final-list,.final-rules,.final-memories,.final-feed,.final-checks,.final-records,.final-moves,.final-stats,.final-detail{display:grid;gap:12px}
.final-power{margin-bottom:20px}
.final-power-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin-bottom:16px}
.final-card,.final-panel{border:1px solid rgba(248,241,228,.1);border-radius:38px;background:rgba(248,241,228,.075);backdrop-filter:blur(18px);box-shadow:0 26px 78px rgba(0,0,0,.25);padding:22px}
.final-card.light,.final-panel.light{background:#f8f1e4;color:#08090b}
.final-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}
.final-head p{margin:0 0 7px;color:#27f6b7;font-size:11px;font-weight:950;letter-spacing:.16em;text-transform:uppercase}
.final-card.light .final-head p,.final-panel.light .final-head p{color:#b24e2d}
.final-head h2{margin:0;font-size:31px;letter-spacing:-.06em;line-height:1}
.final-chip{border-radius:999px;background:rgba(39,246,183,.13);color:#27f6b7;padding:7px 10px;font-weight:950;font-size:11px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
.final-card.light .final-chip{background:#e8f9f2;color:#127c54}
.final-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.final-action{border:1px solid rgba(248,241,228,.1);border-radius:25px;background:#f8f1e4;color:#08090b;padding:14px;text-align:left;display:grid;grid-template-columns:42px 1fr;gap:11px;cursor:pointer;transition:.18s}
.final-action:hover,.final-risk:hover,.final-rule:hover,.final-record:hover,.final-move:hover{transform:translateY(-2px)}
.final-action i{width:42px;height:42px;border-radius:16px;background:#08090b;color:#27f6b7;display:grid;place-items:center;font-style:normal;grid-row:span 2}
.final-action b{font-size:15px;letter-spacing:-.035em}
.final-action small{color:#65584a;line-height:1.35}
.final-risk,.final-record{border:1px solid rgba(10,11,13,.08);border-radius:24px;background:#fff9ee;color:#08090b;padding:13px;text-align:left;cursor:pointer}
.final-risk{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center}
.final-risk i{width:40px;height:40px;border-radius:15px;display:grid;place-items:center;font-style:normal;background:#fff0e8;color:#b8322a}
.final-risk.good i{background:#e8f9f2;color:#19784a}
.final-risk b{display:block}
.final-risk small{color:#65584a}
.final-risk strong{font-size:24px;letter-spacing:-.05em}
.final-rules{grid-template-columns:repeat(2,minmax(0,1fr))}
.final-rule{border:1px solid rgba(10,11,13,.08);border-radius:24px;background:#fff9ee;color:#08090b;padding:14px;text-align:left;cursor:pointer}
.final-rule div{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:9px}
.final-toggle{width:46px;height:26px;border-radius:999px;background:#d7c8b7;position:relative;flex:0 0 auto}
.final-toggle:after{content:"";position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:999px;background:#fff;transition:.18s}
.final-toggle.on{background:#27f6b7}
.final-toggle.on:after{left:24px;background:#08090b}
.final-rule small,.final-memory small{color:#65584a;line-height:1.35}
.final-memories{grid-template-columns:repeat(3,minmax(0,1fr))}
.final-memory{border:1px solid rgba(10,11,13,.08);border-radius:24px;background:#fff9ee;color:#08090b;padding:14px;text-align:left}
.final-memory b{display:block;margin:8px 0 5px}
.final-feed-item{border:1px solid rgba(248,241,228,.1);border-radius:22px;background:rgba(248,241,228,.08);padding:13px;display:grid;grid-template-columns:38px 1fr;gap:10px}
.final-feed-item i{width:38px;height:38px;border-radius:14px;background:#27f6b7;color:#08090b;display:grid;place-items:center;font-style:normal}
.final-feed-item b{display:block}
.final-feed-item small{color:rgba(248,241,228,.66)}
.final-checks{grid-template-columns:repeat(4,minmax(0,1fr))}
.final-check{border:1px solid rgba(10,11,13,.08);border-radius:24px;background:#fff9ee;color:#08090b;padding:14px}
.final-check b{display:block;margin:8px 0}
.final-check ul{margin:0;padding-left:18px;color:#65584a;font-size:12px;line-height:1.45}
.final-studio{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.final-studio textarea{width:100%;min-height:118px;border:1px solid rgba(10,11,13,.1);border-radius:22px;background:#fff9ee;color:#08090b;padding:14px;font:inherit;font-weight:700}
.final-output{border:1px solid rgba(10,11,13,.08);border-radius:22px;background:#fff9ee;color:#08090b;padding:14px;line-height:1.5}
.final-tones{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.final-tones button{border:0;border-radius:999px;padding:8px 11px;background:#eadccb;color:#08090b;font-weight:900;cursor:pointer}
.final-tones button.active{background:#27f6b7}
.final-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(340px,.9fr);gap:20px}
.final-move{border:1px solid rgba(248,241,228,.1);border-radius:30px;background:#f8f1e4;color:#08090b;padding:16px;display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:14px;text-align:left;cursor:pointer;box-shadow:0 18px 42px rgba(0,0,0,.22)}
.final-num{height:54px;width:54px;border-radius:20px;background:#08090b;color:#ffcf75;display:grid;place-items:center;font-weight:950}
.final-move-body b{display:block;margin:12px 0 6px;font-size:21px;letter-spacing:-.045em;line-height:1.08}
.final-move-body small{color:#5c5043;line-height:1.45;display:block}
.final-pill{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.11em;background:#e7dacb;color:#08090b}
.final-pill.cash{background:#dff6ea;color:#19784a}.final-pill.urgent{background:#ffe3d6;color:#b8322a}.final-pill.growth,.final-pill.brain{background:#ebe5ff;color:#5b4dff}.final-pill.good{background:#dff6ea;color:#19784a}.final-pill.proof{background:#dcf7f0;color:#087c64}.final-pill.auto{background:#fff0c7;color:#9b6500}
.final-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
.final-wide{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px}
.final-stat{min-height:134px;border:1px solid rgba(10,11,13,.08);border-radius:30px;background:#fff9ee;color:#08090b;padding:18px;text-align:left;display:grid;gap:8px;cursor:pointer}
.final-stat b{font-size:34px;letter-spacing:-.06em}
.final-stat span{color:#65584a;font-weight:850}
.final-stat.cash,.final-stat.good{background:#eaf8ef;color:#19784a}.final-stat.urgent{background:#fff0e8;color:#b8322a}
.final-record{min-height:80px;display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:12px;align-items:center}
.final-record-icon{height:50px;width:50px;border-radius:19px;background:#eadccb;color:#b24e2d;display:grid;place-items:center}
.final-record-text{min-width:0}
.final-record-text b,.final-record-text small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.final-record-text small{margin-top:4px;color:#6d5b4a}
.final-status{border-radius:999px;background:#eadccb;color:#65584a;padding:6px 9px;font-size:12px;font-weight:900}
.final-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.final-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.final-empty{border:1px dashed rgba(248,241,228,.22);border-radius:30px;background:rgba(248,241,228,.06);padding:32px;display:grid;gap:9px;place-items:center;text-align:center;color:rgba(248,241,228,.65)}
.final-card.light .final-empty,.final-panel.light .final-empty{border-color:rgba(10,11,13,.14);background:#fff9ee;color:#6d5b4a}
.final-drawer-bg{position:fixed;inset:0;z-index:100;background:rgba(6,7,8,.58);display:flex;justify-content:flex-end;padding:18px}
.final-drawer{width:min(720px,100%);border:1px solid rgba(248,241,228,.12);border-radius:40px;background:#f8f1e4;color:#08090b;box-shadow:0 44px 130px rgba(0,0,0,.52);overflow:hidden;display:flex;flex-direction:column}
.final-drawer header{padding:23px;border-bottom:1px solid rgba(10,11,13,.08);display:flex;justify-content:space-between;gap:14px}
.final-drawer header p{margin:0 0 6px;color:#b24e2d;font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}
.final-drawer header h2{margin:0;font-size:31px;letter-spacing:-.06em}
.final-drawer header button{height:46px;width:46px;border:1px solid rgba(10,11,13,.1);border-radius:999px;background:#fff9ee}
.final-drawer-body{padding:23px;overflow:auto}
.final-drawer footer{padding:18px 23px;border-top:1px solid rgba(10,11,13,.08);display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.final-move-detail{display:grid;gap:14px}
.final-move-detail h3{font-size:27px;margin:0;letter-spacing:-.055em}
.final-move-detail p,.final-move-detail div{border:1px solid rgba(10,11,13,.08);border-radius:25px;background:#fff9ee;padding:16px;color:#65584a;line-height:1.5}
.final-move-detail div{display:flex;gap:12px}
.final-detail div{border:1px solid rgba(10,11,13,.08);border-radius:20px;background:#fff9ee;padding:13px}
.final-detail span{display:block;margin-bottom:5px;color:#65584a;font-size:12px;text-transform:capitalize}
.final-detail strong{word-break:break-word}
.final-danger{border:0;border-radius:999px;padding:12px 16px;background:#b8322a;color:white;font-weight:950;display:inline-flex;gap:8px;align-items:center}
.final-tabs{display:none}
.final-spin{animation:finalspin 1s linear infinite}
@keyframes finalspin{to{transform:rotate(360deg)}}
@media(max-width:1080px){.final-os{display:block}.final-rail{position:fixed;z-index:110;inset:0 auto 0 0;width:min(330px,88vw);transform:translateX(-105%);transition:.22s;align-items:stretch}.final-rail.open{transform:translateX(0)}.final-word{display:none}.final-close,.final-menu{display:inline-flex!important}.final-main{padding:12px 12px 110px}.final-top{grid-template-columns:auto 1fr auto auto}.final-primary:not(.final-drawer .final-primary),.final-icon{display:none}.final-hero,.final-grid,.final-two,.final-card-grid,.final-wide,.final-stats,.final-power-grid,.final-actions,.final-rules,.final-memories,.final-checks,.final-studio{grid-template-columns:1fr}.final-hero-main{min-height:auto;padding:28px}.final-hero-main h1{font-size:44px;line-height:.95}.final-tabs{position:fixed;z-index:90;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(6,1fr);gap:5px;background:rgba(8,9,11,.94);border:1px solid rgba(248,241,228,.13);border-radius:28px;padding:7px;backdrop-filter:blur(20px)}.final-tabs button{border:0;background:transparent;color:rgba(248,241,228,.66);border-radius:19px;display:grid;place-items:center;gap:3px;padding:7px 2px;font-size:10px}.final-tabs button.active{background:#f8f1e4;color:#c4512d}.final-drawer-bg{align-items:flex-end;padding:8px}.final-drawer{width:100%;max-height:90vh}}
`;

const NAV = [
  ["engine", "Engine", BrainCircuit],
  ["moves", "Moves", Bot],
  ["work", "Work", BriefcaseBusiness],
  ["cash", "Cash", Banknote],
  ["clients", "Clients", ContactRound],
  ["crew", "Crew", UsersRound],
  ["rules", "Rules", Zap],
  ["numbers", "Numbers", Gauge],
  ["setup", "Setup", Settings],
];

const ROUTE = {
  engine: "/dashboard",
  moves: "/ai",
  work: "/work",
  cash: "/money",
  clients: "/clients",
  crew: "/team",
  rules: "/automation",
  numbers: "/reports",
  setup: "/settings",
};

const MAP = {
  dashboard: "engine", overview: "engine", smart: "engine", engine: "engine", brain: "engine",
  ai: "moves", operator: "moves", decisions: "moves", approvals: "moves", moves: "moves",
  jobs: "work", work: "work", dispatch: "work", calendar: "work",
  money: "cash", cash: "cash", quotes: "cash", invoices: "cash", sms: "cash", messages: "cash",
  clients: "clients", team: "crew", crew: "crew", payroll: "crew",
  automation: "rules", rules: "rules", reports: "numbers", numbers: "numbers",
  settings: "setup", setup: "setup", integrations: "setup",
};

const list = (v) => Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : Array.isArray(v?.data) ? v.data : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.approvals) ? v.approvals : [];
const idOf = (x) => x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.client_id || "";
const titleOf = (x, f = "Untitled") => x?.title || x?.name || x?.customer_name || x?.client_name || x?.invoice_number || x?.quote_number || f;
const statusOf = (x) => String(x?.status || x?.job_status || x?.workflow_status || "draft").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const done = (j) => ["completed", "done", "closed"].includes(String(j?.status || j?.job_status || "").toLowerCase());
const noWorker = (j) => !j?.assigned_worker_id && !j?.worker_id && !j?.assigned_worker_name;
const openInv = (i) => !["paid", "cancelled", "canceled"].includes(String(i?.status || "").toLowerCase());
const nzMoney = (n) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(n || 0));

function Mark() {
  return (
    <svg viewBox="0 0 120 120" className="final-mark" aria-hidden="true">
      <defs><linearGradient id="finalg" x1="10" y1="8" x2="112" y2="112"><stop stopColor="#08090B"/><stop offset=".45" stopColor="#FF7A48"/><stop offset=".75" stopColor="#27F6B7"/><stop offset="1" stopColor="#AE5BFF"/></linearGradient></defs>
      <rect x="7" y="7" width="106" height="106" rx="31" fill="url(#finalg)" />
      <path d="M79 34a34 34 0 1 0 0 52" stroke="#F8F1E4" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M42 60h42" stroke="#FFD166" strokeWidth="12" strokeLinecap="round" />
      <path d="M68 42l20 18-20 18" stroke="#27F6B7" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function Pill({ tone = "", children }) {
  return <span className={`final-pill ${tone}`}>{children}</span>;
}

function Empty({ title, text, icon: Icon = Sparkles }) {
  return <div className="final-empty"><Icon size={28} /><b>{title}</b><span>{text}</span></div>;
}

function Drawer({ drawer, close, children, footer }) {
  if (!drawer) return null;
  return (
    <div className="final-drawer-bg" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="final-drawer">
        <header><div><p>{drawer.kicker}</p><h2>{drawer.title}</h2></div><button type="button" onClick={close}><X size={20} /></button></header>
        <div className="final-drawer-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </div>
  );
}

function Panel({ eyebrow, title, action, children, light = false }) {
  return <section className={`final-panel ${light ? "light" : ""}`}><div className="final-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{action}</div>{children}</section>;
}

function Stat({ label, value, tone = "", icon: Icon = Gauge, onClick }) {
  return <button className={`final-stat ${tone}`} type="button" onClick={onClick}><Icon size={18} /><b>{value}</b><span>{label}</span></button>;
}

function Record({ item, type, open }) {
  const Icon = type === "invoice" ? ReceiptText : type === "quote" ? FileText : type === "client" ? ContactRound : type === "worker" ? UsersRound : Hammer;
  return (
    <button className="final-record" type="button" onClick={() => open({ mode: "record", type, item })}>
      <span className="final-record-icon"><Icon size={18} /></span>
      <span className="final-record-text"><b>{titleOf(item, type)}</b><small>{item?.address || item?.customer_email || item?.email || item?.phone || item?.notes || "Tap for command detail"}</small></span>
      <span className="final-status">{statusOf(item)}</span>
    </button>
  );
}

async function request(path, body, method = "POST") {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("json") ? response.json() : response.text();
}

async function tryRequests(requests) {
  let last;
  for (const req of requests) {
    try {
      return await request(req.path, req.body, req.method || "POST");
    } catch (error) {
      last = error;
    }
  }
  throw last || new Error("No endpoint worked");
}

function useData() {
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
      if (result.status === "fulfilled") data[endpoints[index][0]] = list(result.value);
      else failed = true;
    });

    setState({ loading: false, error: failed ? "Live sync running. The OS loaded the rest." : "", data });
  };

  useEffect(() => { refresh(); }, []);
  return { ...state, refresh };
}

function scoreWorker(job, workers) {
  const region = String(job?.region || job?.area || job?.zone || "").toLowerCase();
  const service = String(job?.service_type || job?.service || job?.trade || job?.title || "").toLowerCase();

  return workers
    .filter((worker) => !String(worker.status || "").toLowerCase().includes("inactive"))
    .map((worker) => {
      const hay = JSON.stringify(worker || {}).toLowerCase();
      let score = 55;
      const reasons = ["active worker"];
      if (region && hay.includes(region)) { score += 15; reasons.push("same area"); }
      if (service && hay.includes(service)) { score += 15; reasons.push("job type match"); }
      if (!worker.active_job_id && !worker.current_job_id) { score += 10; reasons.push("not on active job"); }
      return { worker, score: Math.min(score, 98), reasons };
    })
    .sort((a, b) => b.score - a.score)[0] || null;
}

export default function FinalBusinessOS() {
  const navigate = useNavigate();
  const params = useParams();
  const { user, logout } = useAuth();
  const { loading, error, data, refresh } = useData();

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [running, setRunning] = useState("");
  const [rules, setRules] = useState(() => {
    try { return JSON.parse(localStorage.getItem("churvox_ai_power_rules") || "{}"); } catch { return {}; }
  });
  const [tone, setTone] = useState("Friendly");
  const [seed, setSeed] = useState("Hi, just a quick update from Churvox. The work is ready for review.");

  const pathArea = window.location.pathname.split("/").filter(Boolean)[0];
  const current = MAP[String(params.section || params.area || pathArea || "engine").toLowerCase()] || "engine";
  const active = NAV.find(([id]) => id === current) || NAV[0];
  const ActiveIcon = active[2];
  const go = (area) => { setNavOpen(false); navigate(ROUTE[area] || "/dashboard"); };

  const jobs = data.jobs;
  const clients = data.clients;
  const invoices = data.invoices;
  const quotes = data.quotes;
  const workers = data.workers;

  const openJobs = jobs.filter((job) => !done(job));
  const completedJobs = jobs.filter(done);
  const unassignedJobs = jobs.filter(noWorker);
  const openInvoices = invoices.filter(openInv);
  const openInvoiceValue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.subtotal || invoice.amount || 0), 0);
  const quoteFollowups = quotes.filter((quote) => ["draft", "sent"].includes(String(quote.status || "").toLowerCase()));

  const moves = useMemo(() => {
    const output = [];

    completedJobs.slice(0, 6).forEach((job) => {
      const hasInvoice = invoices.some((invoice) => String(invoice.job_id || invoice.source_job_id || invoice.linked_job_id || "") === String(idOf(job)));
      if (!hasInvoice) {
        output.push({ id: `proof-${idOf(job)}`, kind: "proof_to_paid", tone: "proof", title: `Proof-to-paid for ${titleOf(job, "completed job")}`, summary: "Proof package ready", reason: "Worker completion proof can become a summary, invoice wording and a draft invoice.", outcome: "Completed work moves straight toward cash.", item: job });
        output.push({ id: `invoice-${idOf(job)}`, kind: "draft_invoice", tone: "cash", title: `Draft invoice for ${titleOf(job, "completed job")}`, summary: "Completed work not billed", reason: "Finished work has no matching invoice. Churvox can prepare the draft using job notes, client detail and price.", outcome: "Finished work becomes billable cash.", item: job });
      }
    });

    unassignedJobs.slice(0, 6).forEach((job) => {
      const match = scoreWorker(job, workers);
      output.push({ id: `assign-${idOf(job)}`, kind: "assign_worker", tone: "urgent", title: `Put crew on ${titleOf(job, "unassigned job")}`, summary: "Job needs crew", reason: match ? `${match.worker.name || match.worker.email || "A worker"} scored ${match.score}% as the best crew match.` : "No crew is attached to this job yet. Churvox is flagging it before it slips.", outcome: "The run sheet keeps moving.", item: job, match });
    });

    openInvoices.slice(0, 6).forEach((invoice) => output.push({ id: `pay-${idOf(invoice)}`, kind: "invoice_followup", tone: "cash", title: `Prepare payment reminder for ${titleOf(invoice, "invoice")}`, summary: "Cash follow-up", reason: "Churvox found an open invoice and can draft a reminder for owner approval.", outcome: "Cashflow is protected without sounding pushy.", item: invoice }));
    quoteFollowups.slice(0, 5).forEach((quote) => output.push({ id: `quote-${idOf(quote)}`, kind: "quote_followup", tone: "growth", title: `Follow up ${titleOf(quote, "quote")}`, summary: "Quote still open", reason: "Churvox found a quote that has not been accepted and can draft a helpful follow-up.", outcome: "Sales opportunities keep moving.", item: quote }));
    data.approvals.slice(0, 5).forEach((approval, index) => output.push({ id: approval.id || `approval-${index}`, kind: approval.type || "approval", tone: "brain", title: approval.title || approval.name || "AI approval ready", summary: approval.impact || "Prepared action", reason: approval.reason || approval.description || "Churvox prepared this action for owner review.", outcome: "Ready for owner approval.", item: approval }));
    return output.slice(0, 18);
  }, [completedJobs, unassignedJobs, openInvoices, quoteFollowups, invoices, workers, data.approvals]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    const hit = (type, items) => items.filter((item) => JSON.stringify(item || {}).toLowerCase().includes(term)).slice(0, 6).map((item) => ({ type, item }));
    return [...hit("job", jobs), ...hit("client", clients), ...hit("invoice", invoices), ...hit("quote", quotes), ...hit("worker", workers)].slice(0, 22);
  }, [query, jobs, clients, invoices, quotes, workers]);

  const open = (payload) => {
    if (payload.mode === "move") return setDrawer({ ...payload, title: payload.item.title, kicker: "AI prepared move" });
    setDrawer({ ...payload, title: payload.title || titleOf(payload.item, payload.type), kicker: payload.kicker || statusOf(payload.item) });
  };

  const approve = async (move) => {
    setRunning(move.id);
    try {
      if (["draft_invoice", "proof_to_paid"].includes(move.kind)) {
        const job = move.item || {};
        const payload = {
          job_id: idOf(job) || undefined,
          client_id: job.client_id || undefined,
          customer_name: job.customer_name || job.client_name || job.name || "Client",
          customer_email: job.customer_email || job.client_email || undefined,
          address: job.address || job.job_address || "",
          description: job.ai_invoice_description || job.invoice_description_draft || job.notes || `Work completed for ${titleOf(job, "job")}.`,
          subtotal: Number(job.price || job.total || job.subtotal || 0),
          status: "draft",
        };
        await tryRequests([{ path: "/api/invoices", body: payload }, { path: "/api/ai/operator/approve", body: { move, payload } }]);
      } else if (move.kind === "assign_worker") {
        const job = move.item || {};
        const worker = move.match?.worker || {};
        if (!idOf(job) || !idOf(worker)) throw new Error("Missing worker match");
        const body = { assigned_worker_id: idOf(worker), worker_id: idOf(worker), assigned_worker_name: worker.name || worker.email || "Worker", status: job.status || "assigned" };
        await tryRequests([{ path: `/api/jobs/${idOf(job)}/assign`, body }, { path: `/api/jobs/${idOf(job)}`, method: "PATCH", body }, { path: "/api/ai/operator/approve", body: { move, body } }]);
      } else {
        await tryRequests([{ path: "/api/ai/operator/approve", body: { move } }, { path: "/api/automation/runs", body: { source: "final_business_os", move } }]);
      }

      await refresh();
      setDrawer({ mode: "done", title: "Move approved", kicker: "Approved", item: { message: `${move.title || "Prepared move"} was approved.` } });
    } catch (error) {
      setDrawer({ mode: "error", title: "Move could not run", kicker: "Needs review", item: { message: error.message || "This action could not run yet." } });
    } finally {
      setRunning("");
    }
  };

  const approveAll = async () => {
    setRunning("approve-all");
    let approved = 0;
    for (const move of moves) {
      try {
        await approve(move);
        approved += 1;
      } catch {}
    }
    setRunning("");
    setDrawer({ mode: "done", title: "Approve all complete", kicker: "Approved", item: { message: `Approved ${approved} prepared move${approved === 1 ? "" : "s"}.` } });
  };

  const toggleRule = (key) => {
    setRules((current) => {
      const next = { ...current, [key]: current[key] === false };
      localStorage.setItem("churvox_ai_power_rules", JSON.stringify(next));
      return next;
    });
  };

  const risks = [
    ["Jobs missing address", openJobs.filter((job) => !job.address && !job.site_address && !job.job_address).length, "Fix site details before workers leave.", "work"],
    ["Jobs missing price", openJobs.filter((job) => !job.price && !job.total && !job.subtotal && !job.hourly_rate).length, "Invoice creation is weak without pricing.", "work"],
    ["Jobs not acknowledged", openJobs.filter((job) => String(job.status || "").toLowerCase() === "assigned").length, "Follow up before the day slips.", "work"],
    ["Invoice follow-ups", openInvoices.length, "Cash needs attention.", "cash"],
    ["Quote opportunities", quoteFollowups.length, "Quotes need follow-up before they go cold.", "cash"],
  ];

  const presets = {
    "Lawn care": ["Before photo", "After photo", "Gate closed", "Green waste handled", "Customer note"],
    Cleaning: ["Before photo", "After photo", "Rooms checked", "Supplies noted", "Final note"],
    Handyman: ["Before photo", "After photo", "Parts used", "Issue checked", "Customer sign-off"],
    Plumbing: ["Before photo", "Repair photo", "Leak tested", "Parts used", "Safety checked"],
  };

  const detailRows = Object.entries(drawer?.item || {}).filter(([key, value]) => !["item", "match", "worker"].includes(key) && value !== "" && value !== null && value !== undefined).slice(0, 18);

  return (
    <div className="final-os">
      <style>{css}</style>

      <aside className={`final-rail ${navOpen ? "open" : ""}`}>
        <Mark />
        <div className="final-word">Churvox OS</div>
        <nav className="final-nav">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} className={`final-nav-btn ${current === id ? "active" : ""}`} type="button" onClick={() => go(id)}>
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="final-rail-bottom">
          <button className="final-mini final-close" type="button" onClick={() => setNavOpen(false)}><X size={18} /></button>
          <button className="final-mini" type="button" onClick={refresh}><RefreshCw size={18} /></button>
          <button className="final-mini" type="button" onClick={() => open({ mode: "profile", title: user?.name || "Profile", kicker: "Account", item: user || {} })}><UserRound size={18} /></button>
        </div>
      </aside>

      <main className="final-main">
        <header className="final-top">
          <button className="final-icon final-menu" type="button" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
          <label className="final-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the business or ask what needs doing..." /></label>
          <button className="final-primary" type="button" onClick={() => open({ mode: "create", title: "Create from command", kicker: "Fast action", item: {} })}><Plus size={18} />Create</button>
          <button className="final-ai" type="button" onClick={() => go("moves")}><Bot size={18} />{moves.length}</button>
          <button className="final-icon" type="button" onClick={refresh}><RefreshCw size={18} /></button>
        </header>

        {searchResults ? (
          <Panel eyebrow="Search" title={`${searchResults.length} live records found`} light action={<button className="final-soft" type="button" onClick={() => setQuery("")}>Clear</button>}>
            <div className="final-records">{searchResults.map((result, index) => <Record key={`${result.type}-${index}`} type={result.type} item={result.item} open={open} />)}</div>
          </Panel>
        ) : (
          <>
            <section className="final-hero">
              <div className="final-hero-main">
                <div>
                  <p className="final-kicker"><ActiveIcon size={16} /> {active[1]}</p>
                  <h1>The trade business <span>operating system</span> AI actually runs.</h1>
                  <p>Churvox finds the next move, prepares the admin, explains the reason, and waits for owner approval before anything is sent, assigned, synced or charged.</p>
                </div>
                <div className="final-hero-actions">
                  <button className="final-primary" type="button" onClick={() => go("moves")}><Bot size={18} />Approve AI moves</button>
                  <button className="final-glass" type="button" onClick={() => go("work")}><BriefcaseBusiness size={18} />Work board</button>
                  <button className="final-glass" type="button" onClick={() => go("cash")}><CircleDollarSign size={18} />Cash flow</button>
                </div>
              </div>

              <div className="final-engine-card">
                <div className="final-engine-top">
                  <div><small>Engine output</small><strong>{moves.length}</strong></div>
                  <div className="final-pulse"><BrainCircuit size={32} /></div>
                </div>
                <div className="final-engine-list">
                  <div><span>{openJobs.length}</span><em>open jobs</em></div>
                  <div><span>{unassignedJobs.length}</span><em>need crew</em></div>
                  <div><span>{nzMoney(openInvoiceValue)}</span><em>open cash</em></div>
                </div>
              </div>
            </section>

            {error && <div className="final-sync"><AlertTriangle size={18} /><span>{error}</span></div>}

            <section className="final-power">
              <div className="final-power-grid">
                <div className="final-card">
                  <div className="final-head">
                    <div><p>Trade AI advantage</p><h2>10 features built to beat normal job apps</h2></div>
                    <span className="final-chip">{moves.length} prepared</span>
                  </div>
                  <div className="final-actions">
                    <button className="final-action" type="button" onClick={() => go("moves")}><i><Bot size={20} /></i><b>Office work done for you</b><small>AI prepares invoices, reminders, assignments and risk checks.</small></button>
                    <button className="final-action" type="button" onClick={() => go("cash")}><i><FileText size={20} /></i><b>Proof-to-paid</b><small>Worker proof becomes invoice wording and draft cashflow.</small></button>
                    <button className="final-action" type="button" onClick={() => go("work")}><i><UsersRound size={20} /></i><b>AI crew match</b><small>Recommend workers by area, workload and experience.</small></button>
                  </div>
                </div>

                <div className="final-card light">
                  <div className="final-head">
                    <div><p>Risk radar</p><h2>What could go wrong today</h2></div>
                    <span className="final-chip">{risks.reduce((sum, risk) => sum + risk[1], 0)} risks</span>
                  </div>
                  <div className="final-list">
                    {risks.map(([label, count, text, route]) => (
                      <button className={`final-risk ${count ? "" : "good"}`} key={label} type="button" onClick={() => go(route)}>
                        <i>{count ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</i>
                        <span><b>{label}</b><small>{text}</small></span>
                        <strong>{count}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="final-power-grid">
                <div className="final-card light">
                  <div className="final-head">
                    <div><p>AI permissions</p><h2>Business Autopilot rules</h2></div>
                    <span className="final-chip">approval-first</span>
                  </div>
                  <div className="final-rules">
                    {[
                      ["proof", "Proof-to-paid", "Worker proof becomes summary, invoice wording and draft invoice."],
                      ["crew", "AI crew match", "Recommend the best worker by area, workload and job type."],
                      ["risk", "Risk radar", "Find jobs likely to go wrong before the owner notices."],
                      ["studio", "Message studio", "Draft reminders and completion messages."],
                      ["memory", "Customer memory", "Remember access notes, payment habits and patterns."],
                      ["brief", "Daily brief", "Prepare the morning plan for work, crew and cash."],
                    ].map(([key, title, text]) => (
                      <button className="final-rule" type="button" key={key} onClick={() => toggleRule(key)}>
                        <div><b>{title}</b><span className={`final-toggle ${rules[key] !== false ? "on" : ""}`} /></div>
                        <small>{text}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="final-card light">
                  <div className="final-head">
                    <div><p>Dispatch intelligence</p><h2>AI worker match</h2></div>
                    <span className="final-chip">{unassignedJobs[0] && scoreWorker(unassignedJobs[0], workers) ? `${scoreWorker(unassignedJobs[0], workers).score}%` : "waiting"}</span>
                  </div>
                  {unassignedJobs[0] ? (
                    <button className="final-risk" type="button" onClick={() => open({ mode: "record", type: "job", item: unassignedJobs[0] })}>
                      <i><UsersRound size={18} /></i>
                      <span><b>{titleOf(unassignedJobs[0], "Unassigned job")}</b><small>{scoreWorker(unassignedJobs[0], workers)?.worker?.name || scoreWorker(unassignedJobs[0], workers)?.worker?.email || "Add worker details to improve matching."}</small></span>
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button className="final-risk good" type="button" onClick={() => go("work")}>
                      <i><CheckCircle2 size={18} /></i>
                      <span><b>No unassigned jobs</b><small>Dispatch is clear right now.</small></span>
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="final-card light">
                <div className="final-head">
                  <div><p>Worker proof engine</p><h2>Smart checklists by trade</h2></div>
                  <span className="final-chip">proof-to-paid</span>
                </div>
                <div className="final-checks">
                  {Object.entries(presets).map(([name, checks]) => (
                    <div className="final-check" key={name}>
                      <ListChecks size={20} />
                      <b>{name}</b>
                      <ul>{checks.map((check) => <li key={check}>{check}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="final-power-grid">
                <div className="final-card light">
                  <div className="final-head">
                    <div><p>Customer memory</p><h2>Client context AI remembers</h2></div>
                    <span className="final-chip">{clients.length} clients</span>
                  </div>
                  <div className="final-memories">
                    {[
                      ["Contact style", clients[0]?.preferred_contact || "AI will learn preferred contact style"],
                      ["Access notes", clients[0]?.access_notes || clients[0]?.gate_code || "No access issue saved yet"],
                      ["Payment habit", clients[0]?.payment_terms || "Standard payment pattern"],
                    ].map(([label, text]) => (
                      <div className="final-memory" key={label}><ContactRound size={19} /><b>{label}</b><small>{text}</small></div>
                    ))}
                  </div>
                </div>

                <div className="final-card">
                  <div className="final-head">
                    <div><p>Office work done</p><h2>AI activity feed</h2></div>
                    <span className="final-chip">live</span>
                  </div>
                  <div className="final-feed">
                    <div className="final-feed-item"><i><FileText size={18} /></i><span><b>{completedJobs.length} completed jobs checked</b><small>Ready for proof-to-paid and invoice drafting.</small></span></div>
                    <div className="final-feed-item"><i><MessageSquareText size={18} /></i><span><b>{quoteFollowups.length + openInvoices.length} follow-ups found</b><small>AI can draft reminders and quote messages.</small></span></div>
                    <div className="final-feed-item"><i><Zap size={18} /></i><span><b>{openJobs.filter((job) => job.recurring || job.repeat_interval || job.recurrence).length} recurring jobs detected</b><small>Ready for run-sheet automation.</small></span></div>
                  </div>
                </div>
              </div>

              <div className="final-card light">
                <div className="final-head">
                  <div><p>AI message studio</p><h2>Draft customer messages before sending</h2></div>
                  <span className="final-chip">{tone}</span>
                </div>
                <div className="final-studio">
                  <div>
                    <textarea value={seed} onChange={(event) => setSeed(event.target.value)} />
                    <div className="final-tones">
                      {["Friendly", "Firm", "Professional", "Short SMS"].map((item) => <button className={tone === item ? "active" : ""} key={item} type="button" onClick={() => setTone(item)}>{item}</button>)}
                    </div>
                  </div>
                  <div className="final-output">
                    <b>Draft preview</b>
                    <p>{tone}: {seed}</p>
                    <small>Nothing sends until the owner approves.</small>
                  </div>
                </div>
              </div>
            </section>

            {current === "engine" && (
              <div className="final-grid">
                <Panel eyebrow="AI command stack" title="What AI has prepared next">
                  <div className="final-moves">
                    {loading ? <Empty icon={Loader2} title="Reading the business" text="Checking jobs, invoices, quotes, clients and crew." /> :
                      moves.length ? moves.slice(0, 8).map((move, index) => (
                        <button className="final-move" key={move.id} type="button" onClick={() => open({ mode: "move", item: move })}>
                          <span className="final-num">{String(index + 1).padStart(2, "0")}</span>
                          <span className="final-move-body"><Pill tone={move.tone}>{move.summary}</Pill><b>{move.title}</b><small>{move.reason}</small></span>
                          <ChevronRight size={20} />
                        </button>
                      )) : <Empty title="Engine clear" text="No urgent decision was detected." />}
                  </div>
                </Panel>

                <Panel eyebrow="Owner pulse" title="Business heartbeat" light>
                  <div className="final-stats">
                    <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} onClick={() => go("work")} />
                    <Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} onClick={() => go("work")} />
                    <Stat label="Open cash" value={nzMoney(openInvoiceValue)} tone="cash" icon={CircleDollarSign} onClick={() => go("cash")} />
                    <Stat label="Clients" value={clients.length} icon={ContactRound} onClick={() => go("clients")} />
                  </div>
                </Panel>
              </div>
            )}

            {current === "moves" && (
              <Panel eyebrow="AI Operator" title="Approve what AI prepared" action={<button className="final-primary" type="button" onClick={approveAll} disabled={running === "approve-all"}>{running === "approve-all" ? <Loader2 className="final-spin" size={17} /> : <CheckCircle2 size={17} />}Approve all</button>}>
                <div className="final-move-grid">
                  {moves.length ? moves.map((move, index) => (
                    <button className="final-move" key={move.id} type="button" onClick={() => open({ mode: "move", item: move })}>
                      <span className="final-num">{String(index + 1).padStart(2, "0")}</span>
                      <span className="final-move-body"><Pill tone={move.tone}>{move.summary}</Pill><b>{move.title}</b><small>{move.reason}</small></span>
                      <ChevronRight size={20} />
                    </button>
                  )) : <Empty icon={Bot} title="No moves waiting" text="Churvox is watching for the next move." />}
                </div>
              </Panel>
            )}

            {current === "work" && (
              <Panel eyebrow="Work command" title="Jobs, dispatch and proof" light>
                <div className="final-wide">
                  <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} />
                  <Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} />
                  <Stat label="Completed" value={completedJobs.length} tone="good" icon={CheckCircle2} />
                </div>
                <div className="final-records">{jobs.map((job) => <Record key={idOf(job) || titleOf(job)} type="job" item={job} open={open} />)}</div>
              </Panel>
            )}

            {current === "cash" && (
              <Panel eyebrow="Cash command" title="Quotes, invoices and proof-to-paid" light>
                <div className="final-wide">
                  <Stat label="Open invoice value" value={nzMoney(openInvoiceValue)} tone="cash" icon={CreditCard} />
                  <Stat label="Open invoices" value={openInvoices.length} icon={ReceiptText} />
                  <Stat label="Quote follow-ups" value={quoteFollowups.length} tone="urgent" icon={FileText} />
                </div>
                <div className="final-two">
                  <div className="final-records">{invoices.map((invoice) => <Record key={idOf(invoice)} type="invoice" item={invoice} open={open} />)}</div>
                  <div className="final-records">{quotes.map((quote) => <Record key={idOf(quote)} type="quote" item={quote} open={open} />)}</div>
                </div>
              </Panel>
            )}

            {current === "clients" && <Panel eyebrow="Client memory" title="Clients with live context" light><div className="final-card-grid">{clients.map((client) => <Record key={idOf(client) || titleOf(client)} type="client" item={client} open={open} />)}</div></Panel>}
            {current === "crew" && <Panel eyebrow="Crew command" title="Team, workload and payroll-ready time" light><div className="final-card-grid">{workers.map((worker) => <Record key={idOf(worker) || worker.email || worker.name} type="worker" item={worker} open={open} />)}</div></Panel>}
            {current === "rules" && <Panel eyebrow="Automation engine" title="Automations that run the admin" light><div className="final-rules">{[["Proof-to-paid", "Prepare proof and invoice draft after completion."], ["Crew conflict warning", "Warn before assigning a busy worker."], ["Cash follow-up", "Prepare overdue invoice reminders."], ["Quote follow-up", "Prepare friendly quote follow-ups."], ["Recurring work", "Build the next run sheet automatically."], ["Daily owner brief", "Prepare the morning business summary."]].map(([title, text]) => <button className="final-rule" key={title} type="button"><div><b>{title}</b><span className="final-toggle on" /></div><small>{text}</small></button>)}</div></Panel>}
            {current === "numbers" && <Panel eyebrow="Numbers" title="Plain-English performance" light><div className="final-wide"><Stat label="Completed jobs" value={completedJobs.length} tone="good" icon={CheckCircle2} /><Stat label="Open invoice value" value={nzMoney(openInvoiceValue)} tone="cash" icon={CircleDollarSign} /><Stat label="Clients" value={clients.length} icon={ContactRound} /></div></Panel>}
            {current === "setup" && <Panel eyebrow="Control settings" title="Tell AI what it can and cannot do" light><div className="final-rules">{[["Business profile", "Trade, area, defaults and brand."], ["MYOB and payments", "Sync and invoice source controls."], ["AI approval limits", "Control what AI prepares and what needs approval."], ["Customer messages", "Templates for reminders and updates."]].map(([title, text]) => <button className="final-rule" key={title} type="button"><div><b>{title}</b><span className="final-toggle on" /></div><small>{text}</small></button>)}</div></Panel>}
          </>
        )}
      </main>

      <nav className="final-tabs">
        {NAV.slice(0, 5).map(([id, label, Icon]) => <button key={id} className={current === id ? "active" : ""} type="button" onClick={() => go(id)}><Icon size={19} /><span>{label}</span></button>)}
        <button className={current === "moves" ? "active" : ""} type="button" onClick={() => go("moves")}><Bot size={19} /><span>AI</span></button>
      </nav>

      <Drawer
        drawer={drawer}
        close={() => setDrawer(null)}
        footer={
          drawer?.mode === "profile" ? <button className="final-danger" type="button" onClick={logout}><LogOut size={17} />Log out</button> :
          drawer?.mode === "move" ? <button className="final-primary" type="button" onClick={() => approve(drawer.item)} disabled={running === drawer.item?.id}>{running === drawer.item?.id ? <Loader2 className="final-spin" size={17} /> : <CheckCircle2 size={17} />}Approve this move</button> :
          null
        }
      >
        {drawer?.mode === "move" && (
          <div className="final-move-detail">
            <Pill tone={drawer.item.tone}>{drawer.item.summary}</Pill>
            <h3>{drawer.item.title}</h3>
            <p>{drawer.item.reason}</p>
            <div><BrainCircuit size={20} /><span>{drawer.item.outcome}</span></div>
            {drawer.item.match && <div><UsersRound size={20} /><span>{drawer.item.match.worker.name || drawer.item.match.worker.email} · {drawer.item.match.score}% match · {drawer.item.match.reasons.join(", ")}</span></div>}
            <small>Nothing is sent, assigned, charged, deleted or synced without owner approval.</small>
          </div>
        )}

        {["done", "error"].includes(drawer?.mode) && (
          <div className="final-move-detail">
            <Pill tone={drawer.mode === "error" ? "urgent" : "good"}>{drawer.kicker}</Pill>
            <h3>{drawer.title}</h3>
            <p>{drawer.item?.message}</p>
          </div>
        )}

        {drawer && !["move", "done", "error"].includes(drawer.mode) && (
          <div className="final-detail">
            <div><span>Timeline</span><strong>{drawer.type ? `${drawer.type} opened in command sheet` : "Command detail"}</strong></div>
            {detailRows.map(([key, value]) => <div key={key}><span>{key.replace(/_/g, " ")}</span><strong>{typeof value === "object" ? JSON.stringify(value).slice(0, 180) : String(value)}</strong></div>)}
          </div>
        )}
      </Drawer>
    </div>
  );
}
