// CHURVOX_COMMAND_FLOOR_V30_RUNTIME_DOCK_20260526
// Frontend-only visual/runtime polish for the Command Floor. No API, auth, backend, route, billing, or data logic.

const STYLE_ID = "churvox-command-v30-runtime-style";
const DOCK_ID = "churvox-command-v30-bottom-dock";

const links = [
  ["/dashboard", "Command"],
  ["/jobs", "Jobs"],
  ["/team", "Live Crew"],
  ["/clients", "Clients"],
  ["/invoices", "Invoices"],
  ["/quotes", "Quotes"],
  ["/dispatch", "Dispatch"],
  ["/notifications", "Issues"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
];

function injectStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
/* CHURVOX_COMMAND_FLOOR_V30_RUNTIME_DOCK_20260526 */
html body main.cc-app .cc-status-strip,
html body main.cc-app:after,
html body main.cc-app section.cc-main:before,
html body main.cc-app section.cc-main:after {
  display: none !important;
  content: none !important;
}

html body main.cc-app {
  background:
    radial-gradient(circle at 11% -10%, rgba(37,99,235,.18), transparent 32%),
    radial-gradient(circle at 88% 0%, rgba(34,211,238,.10), transparent 29%),
    linear-gradient(135deg,#07111f 0%,#0b1628 96px,#eef4f8 97px,#f8fbff 100%) !important;
}

html body main.cc-app .cc-main {
  width: min(1480px, calc(100vw - 38px)) !important;
  max-width: 1480px !important;
  margin: 0 auto !important;
  padding: 12px 0 100px !important;
  grid-template-rows: 42px 84px 78px minmax(0,1fr) !important;
  gap: 11px !important;
  overflow: hidden !important;
  background: transparent !important;
}

html body main.cc-app .cc-modern-hero {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  align-items: end !important;
  justify-content: space-between !important;
  min-height: 84px !important;
  padding: 14px 18px !important;
  border-radius: 24px !important;
  border: 1px solid rgba(15,23,42,.08) !important;
  background:
    radial-gradient(circle at 8% 0%, rgba(37,99,235,.12), transparent 34%),
    linear-gradient(135deg,rgba(255,255,255,.98),rgba(240,247,252,.94)) !important;
  box-shadow: 0 18px 52px rgba(2,6,23,.10), inset 0 1px 0 rgba(255,255,255,.82) !important;
}

html body main.cc-app .cc-modern-hero p {
  margin: 0 0 5px !important;
  color: #2563eb !important;
  font-size: .66rem !important;
  font-weight: 950 !important;
  letter-spacing: .15em !important;
}

html body main.cc-app .cc-modern-hero h1 {
  margin: 0 !important;
  color: #07111f !important;
  font-size: clamp(2.05rem, 2.7vw, 3.35rem) !important;
  line-height: .86 !important;
  letter-spacing: -.08em !important;
  font-weight: 950 !important;
}

html body main.cc-app .cc-modern-hero span {
  display: block !important;
  margin-top: 6px !important;
  color: #475569 !important;
  font-size: clamp(.92rem, 1.08vw, 1.08rem) !important;
  font-weight: 760 !important;
}

html body main.cc-app .cc-modern-hero strong {
  flex: 0 0 auto !important;
  align-self: start !important;
  border-radius: 999px !important;
  padding: 8px 12px !important;
  border: 1px solid rgba(34,197,94,.22) !important;
  background: rgba(34,197,94,.11) !important;
  color: #166534 !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
}

html body main.cc-app .cc-top {
  height: 42px !important;
  border-radius: 18px !important;
}

html body main.cc-app .cc-snapshot {
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  gap: 11px !important;
}

html body main.cc-app .cc-stat {
  min-height: 78px !important;
  border-radius: 20px !important;
  padding: 13px 13px 11px 58px !important;
  background: linear-gradient(145deg,#fff,#f3f8fc) !important;
  box-shadow: 0 14px 36px rgba(15,23,42,.085), inset 0 1px 0 rgba(255,255,255,.90) !important;
}

html body main.cc-app .cc-grid {
  gap: 11px !important;
  grid-template-columns: 1.05fr 1.24fr 1fr !important;
  grid-template-rows: minmax(0,1.05fr) minmax(0,.88fr) !important;
}

html body main.cc-app .cc-panel {
  border-radius: 22px !important;
  box-shadow: 0 18px 54px rgba(15,23,42,.10), inset 0 1px 0 rgba(255,255,255,.78) !important;
}

html body main.cc-app .cc-panel header {
  min-height: 44px !important;
  padding: 11px 15px !important;
}

.cv-v30-bottom-dock {
  position: fixed !important;
  left: 18px !important;
  right: 18px !important;
  bottom: 14px !important;
  z-index: 160 !important;
  min-height: 66px !important;
  display: grid !important;
  grid-template-columns: 132px repeat(10, minmax(0, 1fr)) !important;
  align-items: center !important;
  gap: 7px !important;
  padding: 9px 11px !important;
  border-radius: 30px !important;
  border: 1px solid rgba(147,197,253,.28) !important;
  background:
    radial-gradient(circle at 10% 50%, rgba(14,165,233,.32), transparent 24%),
    radial-gradient(circle at 44% 0%, rgba(99,102,241,.22), transparent 32%),
    linear-gradient(135deg, rgba(3,7,18,.985), rgba(15,23,42,.965)) !important;
  box-shadow: 0 28px 86px rgba(0,0,0,.44), 0 0 44px rgba(37,99,235,.24), inset 0 1px 0 rgba(255,255,255,.13) !important;
  backdrop-filter: blur(24px) saturate(1.35) !important;
  -webkit-backdrop-filter: blur(24px) saturate(1.35) !important;
  overflow: hidden !important;
}

.cv-v30-bottom-dock:before {
  content: "" !important;
  position: absolute !important;
  left: 26px !important;
  right: 26px !important;
  top: 0 !important;
  height: 1px !important;
  background: linear-gradient(90deg, transparent, rgba(125,211,252,.98), rgba(59,130,246,.9), transparent) !important;
  pointer-events: none !important;
}

.cv-v30-dock-brand {
  height: 44px !important;
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
  border-radius: 18px !important;
  padding: 0 10px !important;
  color: #fff !important;
  text-decoration: none !important;
  background: rgba(255,255,255,.06) !important;
  border: 1px solid rgba(255,255,255,.08) !important;
}

.cv-v30-dock-brand i {
  width: 26px !important;
  height: 26px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 10px !important;
  font-style: normal !important;
  font-size: .9rem !important;
  font-weight: 950 !important;
  background: linear-gradient(135deg,#22d3ee,#2563eb) !important;
  color: #fff !important;
}

.cv-v30-dock-brand span {
  display: block !important;
  color: rgba(255,255,255,.78) !important;
  font-size: .56rem !important;
  font-weight: 950 !important;
  line-height: 1.05 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}

.cv-v30-bottom-dock a:not(.cv-v30-dock-brand) {
  height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 18px !important;
  color: rgba(255,255,255,.78) !important;
  text-decoration: none !important;
  font-size: .72rem !important;
  font-weight: 900 !important;
  border: 1px solid transparent !important;
  transition: transform .15s ease, background .15s ease, color .15s ease, box-shadow .15s ease !important;
}

.cv-v30-bottom-dock a:not(.cv-v30-dock-brand):hover {
  transform: translateY(-1px) !important;
  color: #fff !important;
  background: rgba(255,255,255,.08) !important;
}

.cv-v30-bottom-dock a.is-active {
  color: #fff !important;
  background: linear-gradient(135deg,#2563eb,#1d4ed8) !important;
  border-color: rgba(191,219,254,.40) !important;
  box-shadow: 0 12px 28px rgba(37,99,235,.40), inset 0 1px 0 rgba(255,255,255,.18) !important;
}

@media (max-width: 1100px) {
  html body main.cc-app .cc-main { overflow: auto !important; grid-template-rows: 42px auto auto auto !important; }
  html body main.cc-app .cc-snapshot { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
  html body main.cc-app .cc-grid { grid-template-columns: 1fr 1fr !important; grid-template-rows: auto !important; }
  .cv-v30-bottom-dock { grid-template-columns: 116px repeat(10, 92px) !important; overflow-x: auto !important; scrollbar-width: none !important; }
  .cv-v30-bottom-dock::-webkit-scrollbar { display: none !important; }
}

@media (max-width: 760px) {
  html body main.cc-app .cc-main { width: calc(100vw - 20px) !important; padding: 10px 0 92px !important; }
  html body main.cc-app .cc-modern-hero { min-height: auto !important; padding: 16px !important; border-radius: 24px !important; }
  html body main.cc-app .cc-modern-hero h1 { font-size: clamp(2rem, 11vw, 3.25rem) !important; }
  html body main.cc-app .cc-modern-hero strong { display: none !important; }
  html body main.cc-app .cc-snapshot { grid-template-columns: repeat(2, minmax(160px, 1fr)) !important; }
  html body main.cc-app .cc-grid { grid-template-columns: 1fr !important; }
  .cv-v30-bottom-dock { left: 10px !important; right: 10px !important; bottom: 10px !important; min-height: 68px !important; border-radius: 26px !important; grid-template-columns: 96px repeat(10, 84px) !important; }
  .cv-v30-dock-brand span { display: none !important; }
}
`;
  document.head.appendChild(style);
}

function isActive(to) {
  const path = window.location.pathname || "/";
  if (to === "/dashboard") return path === "/" || path === "/dashboard";
  return path === to || path.startsWith(`${to}/`);
}

function mountDock() {
  if (typeof document === "undefined") return;
  const app = document.querySelector("main.cc-app");
  const existing = document.getElementById(DOCK_ID);

  if (!app) {
    if (existing) existing.remove();
    return;
  }

  let dock = existing;
  if (!dock) {
    dock = document.createElement("nav");
    dock.id = DOCK_ID;
    dock.className = "cv-v30-bottom-dock";
    dock.setAttribute("aria-label", "Churvox Command Floor bottom navigation");
    document.body.appendChild(dock);
  }

  const brand = `<a class="cv-v30-dock-brand" href="/dashboard" aria-label="Churvox Command Floor"><i>C</i><span>Churvox<br/>Command</span></a>`;
  const navLinks = links
    .map(([to, label]) => `<a href="${to}" class="${isActive(to) ? "is-active" : ""}">${label}</a>`)
    .join("");
  dock.innerHTML = `${brand}${navLinks}`;
}

function boot() {
  injectStyle();
  mountDock();
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("popstate", boot);
  window.addEventListener("hashchange", boot);
  setTimeout(boot, 0);
  setTimeout(boot, 400);
  setTimeout(boot, 1400);

  const observer = new MutationObserver(() => boot());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
