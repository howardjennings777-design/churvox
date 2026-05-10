import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
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

const css = `
.v8-shell *{box-sizing:border-box}
.v8-shell{min-height:100vh;display:grid;grid-template-columns:320px minmax(0,1fr);background:radial-gradient(circle at 12% -8%,rgba(196,81,45,.28),transparent 34%),radial-gradient(circle at 90% 2%,rgba(93,72,255,.22),transparent 32%),linear-gradient(135deg,#ead6bd,#f8efe0 48%,#e6ccb0);color:#140f0b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.v8-rail{position:sticky;top:0;height:100vh;overflow:auto;padding:22px;background:radial-gradient(circle at 22% 0%,rgba(196,81,45,.35),transparent 34%),radial-gradient(circle at 95% 18%,rgba(93,72,255,.2),transparent 32%),linear-gradient(180deg,#17100b,#070403);color:#fff7e8;border-right:1px solid rgba(255,247,232,.13)}
.v8-brand{display:flex;align-items:center;gap:13px;margin-bottom:25px}
.v8-mark{width:56px;height:56px;filter:drop-shadow(0 18px 26px rgba(0,0,0,.42))}
.v8-brand strong{display:block;font-size:26px;letter-spacing:-.08em;line-height:1}
.v8-brand span{display:block;margin-top:6px;color:#f0c15b;font-size:10px;font-weight:950;letter-spacing:.17em;text-transform:uppercase}
.v8-close{display:none}
.v8-nav{display:grid;gap:9px}
.v8-nav button{border:1px solid transparent;border-radius:24px;min-height:64px;padding:14px;background:transparent;color:#fff7e8;display:grid;grid-template-columns:25px 1fr;gap:12px;text-align:left;cursor:pointer}
.v8-nav svg{color:#d8b77a;margin-top:2px}
.v8-nav b{display:block;font-size:15px}
.v8-nav small{display:block;margin-top:4px;color:rgba(255,247,232,.58);font-size:11px}
.v8-nav button.active,.v8-nav button:hover{border-color:rgba(255,247,232,.16);background:linear-gradient(135deg,rgba(196,81,45,.44),rgba(93,72,255,.2));box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.v8-operator{margin-top:24px;border:1px solid rgba(255,247,232,.15);border-radius:30px;padding:18px;background:radial-gradient(circle at 10% 0%,rgba(240,193,91,.18),transparent 45%),linear-gradient(145deg,rgba(255,247,232,.11),rgba(93,72,255,.17))}
.v8-operator div{display:flex;align-items:center;gap:10px;font-weight:950}
.v8-operator p{color:rgba(255,247,232,.72);font-size:13px;line-height:1.45}
.v8-operator button,.v8-primary,.v8-brain-btn{border:0;border-radius:999px;min-height:46px;padding:12px 17px;background:#c4512d;color:#fff7e8;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 16px 34px rgba(196,81,45,.26)}
.v8-operator button:hover,.v8-primary:hover{background:#963719}
.v8-main{min-width:0;width:100%;max-width:1640px;margin:0 auto;padding:22px 22px 110px}
.v8-top{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:auto minmax(260px,1fr) auto auto auto auto;gap:10px;align-items:center;min-height:70px;padding:10px;margin-bottom:18px;border:1px solid rgba(69,45,29,.15);border-radius:32px;background:rgba(239,226,209,.86);backdrop-filter:blur(24px);box-shadow:0 20px 60px rgba(44,31,20,.10)}
.v8-menu{display:none}
.v8-search{height:50px;border:1px solid rgba(69,45,29,.16);border-radius:999px;background:rgba(255,253,247,.94);display:flex;align-items:center;gap:10px;padding:0 16px}
.v8-search input{width:100%;border:0;outline:0;background:transparent;color:#140f0b;font-weight:800}
.v8-icon,.v8-menu,.v8-soft{height:46px;border:1px solid rgba(69,45,29,.16);border-radius:999px;background:rgba(255,253,247,.92);color:#140f0b;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 15px;cursor:pointer}
.v8-brain-btn{background:#140f0b}
.v8-hero{display:grid;grid-template-columns:minmax(0,1fr)300px;gap:18px;margin-bottom:18px}
.v8-hero-main,.v8-core,.v8-panel{border:1px solid rgba(69,45,29,.15);border-radius:38px;background:rgba(255,253,247,.94);box-shadow:0 28px 84px rgba(54,38,24,.11),inset 0 1px 0 rgba(255,255,255,.9)}
.v8-hero-main{min-height:280px;padding:42px 46px;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(circle at 8% 8%,rgba(196,81,45,.16),transparent 34%),linear-gradient(135deg,rgba(255,253,247,.99),rgba(255,247,232,.94))}
.v8-hero-main p{margin:0 0 16px;color:#963719;display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}
.v8-hero-main h1{margin:0;max-width:1080px;font-size:clamp(48px,5.7vw,82px);line-height:.9;letter-spacing:-.08em;text-wrap:balance}
.v8-hero-main span{display:block;margin-top:18px;max-width:840px;color:#5f5244;line-height:1.55;font-size:17px}
.v8-core{position:relative;overflow:hidden;padding:28px;color:#fff7e8;background:radial-gradient(circle at 50% 16%,rgba(93,72,255,.44),transparent 38%),radial-gradient(circle at 20% 100%,rgba(196,81,45,.4),transparent 43%),linear-gradient(160deg,#17100b,#050302);border-color:rgba(255,247,232,.15)}
.v8-core:before{content:"";position:absolute;inset:18px;border:1px solid rgba(255,247,232,.08);border-radius:30px}
.v8-core small,.v8-core span{color:rgba(255,247,232,.7);font-weight:850}
.v8-core strong{display:block;margin:16px 0 5px;font-size:94px;line-height:1;letter-spacing:-.08em;text-shadow:0 18px 36px rgba(0,0,0,.36)}
.v8-sync{width:fit-content;max-width:100%;margin-bottom:16px;border:1px solid rgba(217,154,43,.35);border-radius:999px;background:rgba(255,244,216,.76);color:#7c4e00;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px;font-weight:850}
.v8-layout{display:grid;grid-template-columns:minmax(0,1.55fr)minmax(340px,.82fr);gap:20px}
.v8-layout .v8-dark{grid-row:span 2}
.v8-panel{padding:20px}
.v8-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
.v8-panel-head p{margin:0 0 6px;color:#c4512d;font-size:11px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}
.v8-panel-head h2{margin:0;font-size:29px;letter-spacing:-.055em}
.v8-dark{color:#fff7e8;border-color:rgba(255,247,232,.13);background:radial-gradient(circle at 14% 0%,rgba(196,81,45,.23),transparent 35%),radial-gradient(circle at 91% 12%,rgba(93,72,255,.18),transparent 36%),linear-gradient(160deg,#17100b,#23170f)}
.v8-dark .v8-panel-head p{color:#f0c15b}
.v8-dark .v8-panel-head h2{color:#fff7e8;font-size:32px}
.v8-stack,.v8-records,.v8-move-grid,.v8-rules,.v8-detail,.v8-move-detail{display:grid;gap:12px}
.v8-move-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
.v8-move{border:1px solid rgba(69,45,29,.14);border-radius:30px;padding:17px;background:radial-gradient(circle at 0% 0%,rgba(240,193,91,.12),transparent 35%),linear-gradient(135deg,rgba(255,253,247,.99),rgba(255,247,232,.96));display:grid;grid-template-columns:46px minmax(0,1fr)auto;gap:14px;text-align:left;cursor:pointer;box-shadow:0 18px 44px rgba(0,0,0,.14);transition:.18s}
.v8-move:hover,.v8-record:hover,.v8-rules button:hover,.v8-stat:hover{transform:translateY(-2px);border-color:rgba(196,81,45,.45);box-shadow:0 20px 48px rgba(54,38,24,.16)}
.v8-num{width:46px;height:46px;border-radius:18px;display:grid;place-items:center;background:#17100b;color:#f0c15b;font-weight:950}
.v8-move-body{min-width:0}
.v8-move-body strong{display:block;margin:13px 0 7px;color:#140f0b;font-size:21px;line-height:1.1;letter-spacing:-.045em}
.v8-move-body small{display:block;color:#5f5244;line-height:1.45}
.v8-pill{border-radius:999px;padding:6px 10px;display:inline-flex;font-size:10.5px;font-weight:950;text-transform:uppercase;letter-spacing:.10em;background:#efe2d1;color:#140f0b}
.v8-pill.cash{background:#e6f4e9;color:#2f8f5b}.v8-pill.urgent{background:#ffe6df;color:#b8322a}.v8-pill.growth,.v8-pill.brain{background:#efecff;color:#5b4dff}.v8-pill.good{background:#e6f4e9;color:#2f8f5b}
.v8-stats,.v8-wide{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.v8-wide{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px}
.v8-stat{min-height:132px;border:1px solid rgba(69,45,29,.15);border-radius:30px;background:#fffaf0;padding:17px;text-align:left;display:grid;gap:8px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);transition:.18s}
.v8-stat strong{font-size:33px;letter-spacing:-.055em}.v8-stat span{color:#756451;font-weight:850}.v8-stat.cash,.v8-stat.good{background:#edf8ef;color:#2f8f5b}.v8-stat.urgent{background:#fff0e9;color:#b8322a}
.v8-record{min-height:78px;border:1px solid rgba(69,45,29,.15);border-radius:27px;background:#fffaf0;padding:13px;display:grid;grid-template-columns:48px minmax(0,1fr)auto;gap:12px;align-items:center;text-align:left;cursor:pointer;transition:.18s}
.v8-record-icon{width:48px;height:48px;border-radius:18px;background:#efe2d1;color:#c4512d;display:grid;place-items:center}.v8-record-text{min-width:0}.v8-record-text strong,.v8-record-text small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v8-record-text small{margin-top:4px;color:#756451}.v8-status{border-radius:999px;background:#efe2d1;padding:6px 9px;color:#5f5244;font-size:12px;font-weight:900}
.v8-two{display:grid;grid-template-columns:1fr 1fr;gap:14px}.v8-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v8-rules{grid-template-columns:repeat(4,minmax(0,1fr))}
.v8-rules button{border:1px solid rgba(69,45,29,.15);border-radius:30px;padding:18px;background:#fffaf0;text-align:left;cursor:pointer}.v8-rules button strong{display:block;margin:12px 0 5px}.v8-rules button span{color:#756451;line-height:1.4}
.v8-empty{border:1px dashed #d2c2ad;border-radius:30px;background:rgba(255,250,240,.62);padding:30px;display:grid;gap:9px;place-items:center;text-align:center;color:#756451}.v8-empty strong{color:#140f0b}
.v8-drawer-bg{position:fixed;inset:0;z-index:90;display:flex;justify-content:flex-end;padding:18px;background:rgba(18,13,9,.5)}.v8-drawer{width:min(660px,100%);background:#fffdf7;border:1px solid rgba(69,45,29,.15);border-radius:38px;box-shadow:0 42px 120px rgba(18,13,9,.44);overflow:hidden;display:flex;flex-direction:column}.v8-drawer header{padding:22px;border-bottom:1px solid rgba(69,45,29,.15);display:flex;justify-content:space-between;gap:14px}.v8-drawer header p{margin:0 0 6px;color:#c4512d;font-size:11px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.v8-drawer header h2{margin:0;font-size:30px;letter-spacing:-.055em}.v8-drawer header button{width:44px;height:44px;border:1px solid rgba(69,45,29,.15);border-radius:999px;background:#fffaf0}.v8-drawer-body{padding:22px;overflow:auto}.v8-drawer footer{padding:17px 22px;border-top:1px solid rgba(69,45,29,.15);display:flex;justify-content:flex-end}
.v8-move-detail h3{margin:0;font-size:26px;letter-spacing:-.05em}.v8-move-detail p,.v8-move-detail div{border:1px solid rgba(69,45,29,.15);border-radius:24px;background:#fffaf0;padding:16px;color:#756451;line-height:1.5}.v8-move-detail div{display:flex;gap:12px}.v8-move-detail small{color:#756451;font-weight:850}
.v8-detail div{border:1px solid rgba(69,45,29,.15);border-radius:20px;background:#fffaf0;padding:13px}.v8-detail span{display:block;margin-bottom:5px;color:#756451;font-size:12px;text-transform:capitalize}.v8-detail strong{word-break:break-word}.v8-danger{border:0;border-radius:999px;padding:12px 16px;background:#b8322a;color:white;font-weight:900;display:inline-flex;align-items:center;gap:8px}
.v8-tabs{display:none}.v8-spin{animation:v8spin 1s linear infinite}@keyframes v8spin{to{transform:rotate(360deg)}}
@media(max-width:1080px){.v8-shell{display:block}.v8-rail{position:fixed;z-index:100;inset:0 auto 0 0;width:min(340px,88vw);transform:translateX(-105%);transition:.22s}.v8-rail.is-open{transform:translateX(0)}.v8-close,.v8-menu{display:inline-flex}.v8-main{padding:12px 12px 110px}.v8-top{grid-template-columns:auto 1fr auto auto}.v8-primary:not(.v8-drawer .v8-primary),.v8-icon{display:none}.v8-hero,.v8-layout,.v8-two,.v8-card-grid,.v8-rules,.v8-wide,.v8-stats,.v8-move-grid{grid-template-columns:1fr}.v8-hero-main{min-height:auto;padding:27px}.v8-hero-main h1{font-size:42px;line-height:.96}.v8-tabs{position:fixed;z-index:80;left:10px;right:10px;bottom:10px;display:grid;grid-template-columns:repeat(6,1fr);gap:5px;background:rgba(18,13,9,.94);border:1px solid rgba(255,247,232,.14);border-radius:26px;padding:7px;backdrop-filter:blur(18px)}.v8-tabs button{border:0;background:transparent;color:rgba(255,247,232,.68);border-radius:18px;display:grid;place-items:center;gap:3px;padding:7px 2px;font-size:10px}.v8-tabs button.active{background:#fff7e8;color:#c4512d}.v8-drawer-bg{align-items:flex-end;padding:8px}.v8-drawer{width:100%;max-height:90vh}}

/* V8 FINAL PREMIUM POLISH */
.v8-hero-main h1 {
  font-size: clamp(42px, 4.9vw, 68px) !important;
  line-height: 1.01 !important;
  letter-spacing: -0.055em !important;
  word-spacing: 0.015em !important;
  max-width: 980px !important;
}

.v8-hero-main {
  padding: 44px 48px !important;
  min-height: 310px !important;
}

.v8-hero-main span {
  font-size: 16.5px !important;
  line-height: 1.62 !important;
  max-width: 760px !important;
}

.v8-core {
  padding: 32px !important;
}

.v8-core strong {
  font-size: 92px !important;
}

.v8-panel-head h2 {
  font-size: 31px !important;
  line-height: 1.05 !important;
}

.v8-dark .v8-panel-head h2 {
  font-size: 34px !important;
}

.v8-move-body strong {
  font-size: 20px !important;
  line-height: 1.18 !important;
}

.v8-move-body small {
  font-size: 13.5px !important;
  line-height: 1.5 !important;
}

.v8-record-text strong {
  font-size: 15.5px !important;
}

.v8-record-text small {
  font-size: 12.5px !important;
  line-height: 1.35 !important;
}

.v8-nav button {
  border-radius: 20px !important;
}

.v8-nav b {
  font-size: 13.5px !important;
}

.v8-nav small {
  font-size: 10.5px !important;
}

.v8-operator {
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 18px 38px rgba(0,0,0,.2);
}

.v8-panel {
  border-radius: 34px !important;
}

.v8-move,
.v8-record,
.v8-rules button,
.v8-stat {
  border-radius: 24px !important;
}

@media(max-width:1080px) {
  .v8-hero-main {
    padding: 28px !important;
    min-height: auto !important;
  }

  .v8-hero-main h1 {
    font-size: 38px !important;
    line-height: 1.02 !important;
  }
}


/* V8 10 OUT OF 10 FINAL POLISH */
.v8-hero {
  grid-template-columns: minmax(0, 1.35fr) 315px !important;
  align-items: stretch !important;
}

.v8-hero-main {
  min-height: 335px !important;
  padding: 46px 52px !important;
  background:
    radial-gradient(circle at 9% 10%, rgba(196,81,45,.20), transparent 34%),
    radial-gradient(circle at 84% 0%, rgba(91,77,255,.13), transparent 32%),
    linear-gradient(135deg, rgba(255,253,247,.99), rgba(255,247,232,.94)) !important;
}

.v8-hero-main h1 {
  max-width: 1040px !important;
  margin: 0 !important;
  letter-spacing: -0.062em !important;
  line-height: 0.95 !important;
}

.v8-hero-main h1 span,
.v8-hero-main h1 em {
  display: block !important;
  font-style: normal !important;
}

.v8-hero-main h1 span {
  font-size: clamp(44px, 5.1vw, 76px) !important;
  color: #fff7e8 !important;
  text-shadow:
    0 1px 0 rgba(255,255,255,.15),
    0 18px 42px rgba(0,0,0,.26) !important;
  mix-blend-mode: difference;
}

.v8-hero-main h1 em {
  margin-top: 4px !important;
  font-size: clamp(34px, 4.1vw, 62px) !important;
  color: #c4512d !important;
}

.v8-hero-main > span {
  margin-top: 20px !important;
  max-width: 790px !important;
  color: #4f4337 !important;
  font-size: 17px !important;
  line-height: 1.62 !important;
  font-weight: 650 !important;
}

.v8-core {
  min-height: 335px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  padding: 34px !important;
}

.v8-core strong {
  font-size: 100px !important;
}

.v8-owner-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: -2px 0 18px;
}

.v8-owner-actions button {
  border: 1px solid rgba(69,45,29,.16);
  border-radius: 30px;
  padding: 18px;
  min-height: 132px;
  background:
    radial-gradient(circle at 0% 0%, rgba(240,193,91,.13), transparent 34%),
    linear-gradient(135deg, rgba(255,253,247,.98), rgba(255,247,232,.94));
  color: #140f0b;
  text-align: left;
  cursor: pointer;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 13px;
  align-items: start;
  box-shadow: 0 18px 48px rgba(54,38,24,.10), inset 0 1px 0 rgba(255,255,255,.88);
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.v8-owner-actions button:hover {
  transform: translateY(-2px);
  border-color: rgba(196,81,45,.45);
  box-shadow: 0 22px 56px rgba(54,38,24,.16);
}

.v8-owner-actions button span {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: #17100b;
  color: #f0c15b;
  grid-row: span 2;
}

.v8-owner-actions button strong {
  display: block;
  font-size: 18px;
  letter-spacing: -.035em;
  line-height: 1.05;
}

.v8-owner-actions button small {
  display: block;
  margin-top: 6px;
  color: #756451;
  line-height: 1.42;
  font-size: 13px;
}

.v8-sync {
  background: rgba(23,16,11,.82) !important;
  border-color: rgba(240,193,91,.28) !important;
  color: #f0c15b !important;
  box-shadow: 0 12px 30px rgba(0,0,0,.16);
}

.v8-dark {
  background:
    radial-gradient(circle at 14% 0%, rgba(196,81,45,.28), transparent 35%),
    radial-gradient(circle at 92% 12%, rgba(93,72,255,.22), transparent 36%),
    linear-gradient(160deg, #150e09, #25170e) !important;
}

.v8-dark .v8-panel-head h2 {
  font-size: 35px !important;
  letter-spacing: -0.06em !important;
}

.v8-move {
  border-radius: 28px !important;
  min-height: 132px !important;
}

.v8-move-body strong {
  font-size: 21px !important;
  line-height: 1.13 !important;
}

.v8-move-body small {
  font-size: 13.5px !important;
  line-height: 1.5 !important;
}

.v8-num {
  background:
    radial-gradient(circle at 30% 20%, rgba(240,193,91,.18), transparent 40%),
    #100a06 !important;
  color: #f0c15b !important;
}

.v8-panel {
  border-radius: 36px !important;
}

.v8-panel-head h2 {
  font-size: 32px !important;
  line-height: 1.06 !important;
}

.v8-record {
  border-radius: 27px !important;
  min-height: 80px !important;
}

.v8-record-text strong {
  font-size: 15.5px !important;
}

.v8-status {
  font-size: 11.5px !important;
}

.v8-rules button {
  min-height: 150px !important;
}

.v8-rules button strong {
  font-size: 16px !important;
  line-height: 1.15 !important;
}

.v8-operator {
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 20px 44px rgba(0,0,0,.26) !important;
}

.v8-nav button.active {
  position: relative;
}

.v8-nav button.active::after {
  content: "";
  position: absolute;
  right: 10px;
  top: 50%;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #31d181;
  box-shadow: 0 0 0 5px rgba(49,209,129,.12);
  transform: translateY(-50%);
}

@media(max-width:1080px){
  .v8-hero,
  .v8-owner-actions {
    grid-template-columns: 1fr !important;
  }

  .v8-hero-main {
    min-height: auto !important;
    padding: 30px !important;
  }

  .v8-hero-main h1 span {
    font-size: 42px !important;
    mix-blend-mode: normal !important;
    color: #140f0b !important;
    text-shadow: none !important;
  }

  .v8-hero-main h1 em {
    font-size: 34px !important;
  }

  .v8-core {
    min-height: 210px !important;
  }

  .v8-owner-actions button {
    min-height: 112px !important;
  }
}

`;

const NAV = [
  { id: "brain", label: "Brain", sub: "AI runs today", icon: BrainCircuit },
  { id: "moves", label: "Moves", sub: "Approve actions", icon: Bot },
  { id: "work", label: "Work", sub: "Jobs + dispatch", icon: BriefcaseBusiness },
  { id: "cash", label: "Cash", sub: "Quotes + invoices", icon: Banknote },
  { id: "clients", label: "Clients", sub: "Context", icon: ContactRound },
  { id: "crew", label: "Crew", sub: "Team + payroll", icon: UsersRound },
  { id: "rules", label: "Rules", sub: "Automation", icon: Zap },
  { id: "numbers", label: "Numbers", sub: "Reports", icon: Gauge },
  { id: "setup", label: "Setup", sub: "Controls", icon: Settings },
];

const MAP = {
  dashboard: "brain", overview: "brain", smart: "brain", brain: "brain",
  ai: "moves", operator: "moves", decisions: "moves", approvals: "moves", moves: "moves",
  jobs: "work", work: "work", dispatch: "work", calendar: "work",
  money: "cash", cash: "cash", quotes: "cash", invoices: "cash", sms: "cash", messages: "cash",
  clients: "clients", team: "crew", crew: "crew", payroll: "crew",
  automation: "rules", rules: "rules", reports: "numbers", numbers: "numbers",
  settings: "setup", setup: "setup", integrations: "setup",
};

const ROUTE = { brain: "/dashboard", moves: "/ai", work: "/work", cash: "/money", clients: "/clients", crew: "/team", rules: "/automation", numbers: "/reports", setup: "/settings" };

const list = (v) => Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : Array.isArray(v?.data) ? v.data : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.approvals) ? v.approvals : [];
const idOf = (x) => x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.client_id || "";
const titleOf = (x, f = "Untitled") => x?.title || x?.name || x?.customer_name || x?.client_name || x?.invoice_number || x?.quote_number || f;
const statusOf = (x) => String(x?.status || x?.job_status || x?.workflow_status || "draft").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const done = (j) => ["completed", "done", "closed"].includes(String(j?.status || j?.job_status || "").toLowerCase());
const noWorker = (j) => !j?.assigned_worker_id && !j?.worker_id && !j?.assigned_worker_name;
const openInv = (i) => !["paid", "cancelled", "canceled"].includes(String(i?.status || "").toLowerCase());
const money = (n) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(n || 0));

function Mark() {
  return (
    <svg viewBox="0 0 120 120" className="v8-mark" aria-hidden="true">
      <defs><linearGradient id="v8m" x1="9" y1="8" x2="112" y2="112"><stop stopColor="#110C08"/><stop offset=".48" stopColor="#C4512D"/><stop offset=".76" stopColor="#6B4EFF"/><stop offset="1" stopColor="#F0C15B"/></linearGradient></defs>
      <rect x="7" y="7" width="106" height="106" rx="30" fill="url(#v8m)" />
      <path d="M78 34a34 34 0 1 0 0 52" stroke="#FFF7E8" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M42 60h42" stroke="#F0C15B" strokeWidth="12" strokeLinecap="round" />
      <path d="M68 42l20 18-20 18" stroke="#7C6CFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="91" cy="28" r="6" fill="#FFF7E8" />
    </svg>
  );
}

function Brand() {
  return <div className="v8-brand"><Mark /><div><strong>Churvox</strong><span>AI Business Brain</span></div></div>;
}

function Pill({ tone = "", children }) {
  return <span className={`v8-pill ${tone}`}>{children}</span>;
}

function Stat({ label, value, tone = "", icon: Icon = Gauge, onClick }) {
  return <button className={`v8-stat ${tone}`} type="button" onClick={onClick}><Icon size={18}/><strong>{value}</strong><span>{label}</span></button>;
}

function Panel({ eyebrow, title, action, children, dark = false }) {
  return <section className={`v8-panel ${dark ? "v8-dark" : ""}`}><div className="v8-panel-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{action}</div>{children}</section>;
}

function Empty({ title, text, icon: Icon = Sparkles }) {
  return <div className="v8-empty"><Icon size={28}/><strong>{title}</strong><span>{text}</span></div>;
}

function Drawer({ drawer, close, children, footer }) {
  if (!drawer) return null;
  return <div className="v8-drawer-bg" onMouseDown={(e) => e.target === e.currentTarget && close()}><aside className="v8-drawer"><header><div><p>{drawer.kicker}</p><h2>{drawer.title}</h2></div><button type="button" onClick={close}><X size={20}/></button></header><div className="v8-drawer-body">{children}</div>{footer && <footer>{footer}</footer>}</aside></div>;
}

function Record({ item, type, open }) {
  const Icon = type === "invoice" ? ReceiptText : type === "quote" ? FileText : type === "client" ? ContactRound : type === "worker" ? UsersRound : Hammer;
  return <button className="v8-record" type="button" onClick={() => open({ mode: "record", type, item })}><span className="v8-record-icon"><Icon size={18}/></span><span className="v8-record-text"><strong>{titleOf(item, type)}</strong><small>{item?.address || item?.customer_email || item?.email || item?.phone || item?.notes || "Tap to open command sheet"}</small></span><span className="v8-status">{statusOf(item)}</span></button>;
}

function useData() {
  const [state, setState] = useState({ loading: true, error: "", data: { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] } });

  const refresh = async () => {
    setState((p) => ({ ...p, loading: true, error: "" }));
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const get = async (path) => {
      const r = await fetch(`${API_BASE}${path}`, { headers, credentials: "include" });
      if (!r.ok) throw new Error(path);
      return r.json();
    };
    const eps = [["jobs", "/api/jobs"], ["clients", "/api/clients"], ["invoices", "/api/invoices"], ["quotes", "/api/quotes"], ["workers", "/api/team/workers"], ["approvals", "/api/ai/operator/approvals"]];
    const settled = await Promise.allSettled(eps.map(([, path]) => get(path)));
    const data = { jobs: [], clients: [], invoices: [], quotes: [], workers: [], approvals: [] };
    let failed = false;
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") data[eps[i][0]] = list(r.value);
      else failed = true;
    });
    setState({ loading: false, error: failed ? "Live sync running. The brain loaded the rest." : "", data });
  };

  useEffect(() => { refresh(); }, []);
  return { ...state, refresh };
}

export default function V8CommandBrain() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { loading, error, data, refresh } = useData();

  const [drawer, setDrawer] = useState(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [running, setRunning] = useState("");

  const pathArea = window.location.pathname.split("/").filter(Boolean)[0];
  const current = MAP[String(params.section || params.area || pathArea || "brain").toLowerCase()] || "brain";
  const active = NAV.find((n) => n.id === current) || NAV[0];
  const ActiveIcon = active.icon;

  const go = (area) => { setNavOpen(false); navigate(ROUTE[area] || "/dashboard"); };

  const openJobs = data.jobs.filter((j) => !done(j));
  const completedJobs = data.jobs.filter(done);
  const unassignedJobs = data.jobs.filter(noWorker);
  const openInvoices = data.invoices.filter(openInv);
  const openInvoiceValue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.subtotal || invoice.amount || 0), 0);
  const quoteFollowups = data.quotes.filter((q) => ["draft", "sent"].includes(String(q.status || "").toLowerCase()));

  const moves = useMemo(() => {
    const out = [];

    completedJobs.slice(0, 6).forEach((job) => {
      const hasInvoice = data.invoices.some((invoice) => String(invoice.job_id || invoice.source_job_id || invoice.linked_job_id || "") === String(idOf(job)));
      if (!hasInvoice) {
        out.push({ id: `invoice-${idOf(job)}`, kind: "draft_invoice", tone: "cash", title: `Draft invoice for ${titleOf(job, "completed job")}`, summary: "Completed work not billed", reason: "Churvox found a completed job with no matching invoice. It can prepare the invoice draft from job notes, client details and price.", outcome: "Turns finished work into billable cash.", item: job });
      }
    });

    unassignedJobs.slice(0, 6).forEach((job) => {
      const worker = data.workers.find((person) => String(person.status || "active").toLowerCase() !== "inactive") || data.workers[0];
      out.push({ id: `assign-${idOf(job)}`, kind: "assign_worker", tone: "urgent", title: `Place crew on ${titleOf(job, "unassigned job")}`, summary: "Job needs crew", reason: worker ? `${worker.name || worker.email || "A crew member"} is the first crew match Churvox found. Owner approval is required before assignment.` : "No crew member is attached to this job yet. Churvox is flagging it before it slips.", outcome: "Keeps the run sheet moving.", item: job, worker });
    });

    openInvoices.slice(0, 6).forEach((invoice) => {
      out.push({ id: `follow-${idOf(invoice)}`, kind: "invoice_followup", tone: "cash", title: `Prepare payment reminder for ${titleOf(invoice, "invoice")}`, summary: "Open invoice follow-up", reason: "Churvox found an open invoice. It can prepare a customer reminder for owner approval without sending anything automatically.", outcome: "Protects cashflow without sounding pushy.", item: invoice });
    });

    quoteFollowups.slice(0, 5).forEach((quote) => {
      out.push({ id: `quote-${idOf(quote)}`, kind: "quote_followup", tone: "growth", title: `Follow up quote for ${titleOf(quote, "client")}`, summary: "Quote still open", reason: "Churvox found a quote that has not been accepted. It can draft a helpful follow-up.", outcome: "Keeps sales moving.", item: quote });
    });

    data.approvals.slice(0, 5).forEach((approval, index) => {
      out.push({ id: approval.id || `approval-${index}`, kind: approval.type || "approval", tone: "brain", title: approval.title || approval.name || "AI approval ready", summary: approval.impact || "Prepared action", reason: approval.reason || approval.description || "Churvox prepared this action for owner review.", outcome: "Ready for owner approval.", item: approval });
    });

    return out.slice(0, 14);
  }, [completedJobs, unassignedJobs, openInvoices, quoteFollowups, data.invoices, data.workers, data.approvals]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    const hit = (type, items) => items.filter((item) => JSON.stringify(item || {}).toLowerCase().includes(term)).slice(0, 6).map((item) => ({ type, item }));
    return [...hit("job", data.jobs), ...hit("client", data.clients), ...hit("invoice", data.invoices), ...hit("quote", data.quotes), ...hit("worker", data.workers)].slice(0, 18);
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

  const detailRows = Object.entries(drawer?.item || {}).filter(([key, value]) => !["item", "worker"].includes(key) && value !== "" && value !== null && value !== undefined).slice(0, 18);

  return (
    <div className="v8-shell">
      <style>{css}</style>

      <aside className={`v8-rail ${navOpen ? "is-open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Brand />
          <button className="v8-icon v8-close" type="button" onClick={() => setNavOpen(false)}><X size={18}/></button>
        </div>

        <nav className="v8-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={current === item.id ? "active" : ""} type="button" onClick={() => go(item.id)}><Icon size={20}/><span><b>{item.label}</b><small>{item.sub}</small></span></button>;
          })}
        </nav>

        <div className="v8-operator">
          <div><BrainCircuit size={22}/><strong>Operator mode</strong></div>
          <p>{moves.length ? `${moves.length} moves prepared from live work, cash and crew data.` : "No urgent moves. Churvox is watching."}</p>
          <button type="button" onClick={() => go("moves")}>Approve moves</button>
        </div>
      </aside>

      <main className="v8-main">
        <header className="v8-top">
          <button className="v8-menu" type="button" onClick={() => setNavOpen(true)}><Menu size={22}/></button>
          <label className="v8-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the business or ask what needs doing..." /></label>
          <button className="v8-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "Create from command", kicker: "Fast action", item: {} })}><Plus size={18}/>Create</button>
          <button className="v8-brain-btn" type="button" onClick={() => go("moves")}><Bot size={18}/>{moves.length}</button>
          <button className="v8-icon" type="button" onClick={refresh}><RefreshCw size={18}/></button>
          <button className="v8-icon" type="button" onClick={() => setDrawer({ mode: "profile", title: user?.name || "Profile", kicker: "Account", item: user || {} })}><UserRound size={18}/></button>
        </header>

        {searchResults ? (
          <Panel eyebrow="Search" title={`${searchResults.length} live records found`} action={<button className="v8-soft" type="button" onClick={() => setQuery("")}>Clear</button>}>
            <div className="v8-records">{searchResults.map((result, index) => <Record key={`${result.type}-${index}`} type={result.type} item={result.item} open={open}/>)}</div>
          </Panel>
        ) : (
          <>
            <section className="v8-hero">
              <div className="v8-hero-main">
                <p><ActiveIcon size={16}/>{active.label}</p>
                <h1><span>Your AI business brain is on.</span><em>It finds the next move before you do.</em></h1>
                <span>Churvox reads work, cash, clients and crew, prepares the admin, explains the reason, and waits for owner approval. No maze. No full-page jumping.</span>
              </div>
              <div className="v8-core">
                <small>AI moves ready</small>
                <strong>{moves.length}</strong>
                <span>ready for owner approval</span>
              </div>
            </section>

            <section className="v8-owner-actions" aria-label="Owner command actions">
              <button type="button" onClick={() => go("moves")}>
                <span><Bot size={21} /></span>
                <strong>Approve AI moves</strong>
                <small>Invoices, dispatch, reminders and follow-ups prepared by Churvox.</small>
              </button>
              <button type="button" onClick={() => go("work")}>
                <span><BriefcaseBusiness size={21} /></span>
                <strong>Run today’s work</strong>
                <small>Open jobs, unassigned work, crew and proof in one place.</small>
              </button>
              <button type="button" onClick={() => go("cash")}>
                <span><CircleDollarSign size={21} /></span>
                <strong>Collect cash</strong>
                <small>Draft invoices, open invoices and quote follow-ups ready to review.</small>
              </button>
            </section>

            {error && <div className="v8-sync"><AlertTriangle size={18}/><span>{error}</span></div>}

            {current === "brain" && (
              <div className="v8-layout">
                <Panel eyebrow="AI Command Stack" title="What AI has prepared next" dark>
                  <div className="v8-stack">
                    {loading ? <Empty icon={Loader2} title="Reading the business" text="Checking jobs, invoices, quotes, clients and crew."/> :
                    moves.length ? moves.slice(0,7).map((move, index) => (
                      <button className="v8-move" key={move.id} type="button" onClick={() => open({ mode: "move", item: move })}>
                        <span className="v8-num">{String(index + 1).padStart(2, "0")}</span>
                        <span className="v8-move-body"><Pill tone={move.tone}>{move.summary}</Pill><strong>{move.title}</strong><small>{move.reason}</small></span>
                        <ChevronRight size={20}/>
                      </button>
                    )) : <Empty title="Brain is clear" text="No urgent work, cash or crew decision was detected."/>}
                  </div>
                </Panel>

                <Panel eyebrow="Owner pulse" title="Business heartbeat">
                  <div className="v8-stats">
                    <Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness} onClick={() => go("work")}/>
                    <Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle} onClick={() => go("work")}/>
                    <Stat label="Cash flow" value={money(openInvoiceValue)} tone="cash" icon={CircleDollarSign} onClick={() => go("cash")}/>
                    <Stat label="Clients" value={data.clients.length} icon={ContactRound} onClick={() => go("clients")}/>
                  </div>
                </Panel>

                <Panel eyebrow="Live lane" title="Work Churvox is watching">
                  <div className="v8-records">{openJobs.slice(0,6).map((job) => <Record key={idOf(job) || titleOf(job)} type="job" item={job} open={open}/>)}{!openJobs.length && <Empty title="No open jobs" text="When work is added, Churvox starts building the run sheet."/>}</div>
                </Panel>
              </div>
            )}

            {current === "moves" && <Panel eyebrow="AI Operator" title="Approve what AI prepared" dark><div className="v8-move-grid">{moves.length ? moves.map((move, index) => <button className="v8-move" key={move.id} type="button" onClick={() => open({ mode: "move", item: move })}><span className="v8-num">{String(index + 1).padStart(2, "0")}</span><span className="v8-move-body"><Pill tone={move.tone}>{move.summary}</Pill><strong>{move.title}</strong><small>{move.reason}</small></span><ChevronRight size={20}/></button>) : <Empty icon={Bot} title="No moves waiting" text="Churvox is watching for the next job, cash or crew move."/>}</div></Panel>}

            {current === "work" && <Panel eyebrow="Work command" title="Jobs, dispatch and proof" action={<button className="v8-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New job", kicker: "Fast action", item: {} })}><Plus size={17}/>Job</button>}><div className="v8-wide"><Stat label="Open jobs" value={openJobs.length} icon={BriefcaseBusiness}/><Stat label="Need crew" value={unassignedJobs.length} tone="urgent" icon={AlertTriangle}/><Stat label="Completed" value={completedJobs.length} tone="good" icon={CheckCircle2}/></div><div className="v8-records">{data.jobs.map((job) => <Record key={idOf(job) || titleOf(job)} type="job" item={job} open={open}/>)}</div></Panel>}

            {current === "cash" && <Panel eyebrow="Cash command" title="Quotes, invoices and follow-up" action={<button className="v8-primary" type="button" onClick={() => setDrawer({ mode: "create", title: "New invoice", kicker: "Fast action", item: {} })}><Plus size={17}/>Invoice</button>}><div className="v8-wide"><Stat label="Open invoice value" value={money(openInvoiceValue)} tone="cash" icon={CreditCard}/><Stat label="Open invoices" value={openInvoices.length} icon={ReceiptText}/><Stat label="Quote follow-ups" value={quoteFollowups.length} tone="urgent" icon={FileText}/></div><div className="v8-two"><div className="v8-records">{data.invoices.map((invoice) => <Record key={idOf(invoice)} type="invoice" item={invoice} open={open}/>)}</div><div className="v8-records">{data.quotes.map((quote) => <Record key={idOf(quote)} type="quote" item={quote} open={open}/>)}</div></div></Panel>}

            {current === "clients" && <Panel eyebrow="Client memory" title="Clients with live business context"><div className="v8-card-grid">{data.clients.map((client) => <Record key={idOf(client) || titleOf(client)} type="client" item={client} open={open}/>)}{!data.clients.length && <Empty icon={ContactRound} title="No clients loaded" text="Add clients so AI can connect jobs, quotes and invoices."/>}</div></Panel>}

            {current === "crew" && <Panel eyebrow="Crew command" title="Team, workload and payroll-ready time"><div className="v8-card-grid">{data.workers.map((worker) => <Record key={idOf(worker) || worker.email || worker.name} type="worker" item={worker} open={open}/>)}{!data.workers.length && <Empty icon={UsersRound} title="No crew loaded" text="Invite workers so AI can recommend assignments."/>}</div></Panel>}

            {current === "rules" && <Panel eyebrow="Automation brain" title="Automations that run the admin"><div className="v8-rules">{[["Invoice after completion","Draft invoice when a job is marked complete."],["Crew conflict warning","Warn before assigning a busy worker."],["Cash follow-up","Prepare overdue invoice reminders."],["Quote follow-up","Prepare friendly quote follow-ups."],["Recurring work","Build the next run sheet automatically."],["Proof alert","Notify owner when job proof is uploaded."],["Missing details","Find jobs or clients missing key info."],["Daily owner brief","Prepare the morning business summary."]].map(([title,text]) => <button key={title} type="button" onClick={() => setDrawer({ mode:"rule", title, kicker:"AI rule", item:{ title, text, control:"Approval-first" }})}><ListChecks size={20}/><strong>{title}</strong><span>{text}</span></button>)}</div></Panel>}

            {current === "numbers" && <Panel eyebrow="Numbers" title="Plain-English business performance"><div className="v8-wide"><Stat label="Completed jobs" value={completedJobs.length} tone="good" icon={CheckCircle2}/><Stat label="Open invoice value" value={money(openInvoiceValue)} tone="cash" icon={CircleDollarSign}/><Stat label="Clients" value={data.clients.length} icon={ContactRound}/></div></Panel>}

            {current === "setup" && <Panel eyebrow="Control settings" title="Tell the brain what it can and cannot do"><div className="v8-rules">{[["Business profile","Trade, area, defaults and brand."],["MYOB and payments","Sync, invoice source and payment rules."],["AI approval limits","Control what AI prepares and what needs approval."],["Customer messages","Templates for reminders and updates."]].map(([title,text]) => <button key={title} type="button" onClick={() => setDrawer({ mode:"setup", title, kicker:"Setup", item:{ title,text }})}><ShieldCheck size={20}/><strong>{title}</strong><span>{text}</span></button>)}</div></Panel>}
          </>
        )}
      </main>

      <nav className="v8-tabs">{NAV.slice(0,5).map((item) => { const Icon = item.icon; return <button key={item.id} className={current === item.id ? "active" : ""} type="button" onClick={() => go(item.id)}><Icon size={19}/><span>{item.label}</span></button>; })}<button className={current === "moves" ? "active" : ""} type="button" onClick={() => go("moves")}><Bot size={19}/><span>AI</span></button></nav>

      <Drawer drawer={drawer} close={() => setDrawer(null)} footer={drawer?.mode === "profile" ? <button className="v8-danger" type="button" onClick={logout}><LogOut size={17}/>Log out</button> : drawer?.mode === "move" ? <button className="v8-primary" type="button" onClick={() => approveMove(drawer.item)} disabled={running === drawer.item.id}>{running === drawer.item.id ? <Loader2 size={17} className="v8-spin"/> : <CheckCircle2 size={17}/>}Approve move</button> : null}>
        {drawer?.mode === "move" && <div className="v8-move-detail"><Pill tone={drawer.item.tone}>{drawer.item.summary}</Pill><h3>{drawer.item.title}</h3><p>{drawer.item.reason}</p><div><BrainCircuit size={20}/><span>{drawer.item.outcome}</span></div><small>Nothing is sent, assigned, charged, deleted or synced without owner approval.</small></div>}
        {drawer?.mode === "create" && <div className="v8-move-detail"><Pill tone="brain">Fast command</Pill><h3>Create without leaving the cockpit</h3><p>V8 keeps creation inside this command sheet. Final job, client, quote and invoice forms plug in here without sending the owner into old full-page flows.</p></div>}
        {["done", "prepared", "error"].includes(drawer?.mode) && <div className="v8-move-detail"><Pill tone={drawer.mode === "error" ? "urgent" : "good"}>{drawer.kicker}</Pill><h3>{drawer.title}</h3><p>{drawer.item?.message}</p></div>}
        {drawer && !["move","create","done","prepared","error"].includes(drawer.mode) && <div className="v8-detail">{detailRows.map(([key,value]) => <div key={key}><span>{key.replace(/_/g," ")}</span><strong>{typeof value === "object" ? JSON.stringify(value).slice(0,170) : String(value)}</strong></div>)}</div>}
      </Drawer>
    </div>
  );
}
