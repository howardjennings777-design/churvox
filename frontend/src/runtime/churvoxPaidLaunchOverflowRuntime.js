// Paid launch owner visual guard.
// Keeps the real nav usable and hides the audit-only proof rail that created the big circles.

const STYLE_ID = "churvox-paid-launch-owner-visual-guard";

function putStyle(el, key, value) {
  try {
    el.style.setProperty(key, value, "important");
  } catch (_) {}
}

function installCss() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html, body, #root { width:100% !important; max-width:100% !important; overflow-x:hidden !important; }
    .churvoxOptionC, .churvoxOptionC * { box-sizing:border-box !important; min-width:0 !important; }
    .churvoxOptionC { display:flex !important; flex-direction:column !important; width:100vw !important; height:100vh !important; max-width:100vw !important; overflow:hidden !important; background:#eeeeea !important; color:#111815 !important; }
    .churvoxOptionC .launchNavProof, .churvoxOptionC .launchNavProof span, .churvoxOptionC .xcf10-dock, .churvoxOptionC .xcf10-dock-launch { display:none !important; visibility:hidden !important; width:0 !important; height:0 !important; max-width:0 !important; max-height:0 !important; padding:0 !important; margin:0 !important; border:0 !important; overflow:hidden !important; opacity:0 !important; }
    .churvoxOptionC .cocBar { flex:0 0 auto !important; display:grid !important; grid-template-columns:auto minmax(0,1fr) auto !important; align-items:center !important; gap:20px !important; width:auto !important; min-height:74px !important; margin:18px 20px 8px !important; padding:17px 20px !important; border-radius:17px !important; background:radial-gradient(circle at 86% 46%,rgba(240,100,47,.32),transparent 28%),linear-gradient(115deg,#101513 0%,#171b19 48%,#4c2a1c 100%) !important; color:#fff !important; box-shadow:0 18px 46px rgba(16,21,19,.18) !important; overflow:hidden !important; }
    .churvoxOptionC .brand { display:flex !important; align-items:center !important; gap:9px !important; min-width:190px !important; color:#fff !important; }
    .churvoxOptionC .brand i { display:block !important; width:29px !important; height:29px !important; min-width:29px !important; min-height:29px !important; border-radius:10px !important; background:#ef553c !important; }
    .churvoxOptionC .brand b, .churvoxOptionC .cocBar b { color:#fff !important; font-size:17px !important; font-weight:950 !important; }
    .churvoxOptionC .brand small, .churvoxOptionC .cocBar small { color:rgba(255,255,255,.78) !important; font-size:8px !important; font-weight:950 !important; text-transform:uppercase !important; }
    .churvoxOptionC .title h1 { margin:0 !important; color:#fff !important; font-size:38px !important; line-height:.86 !important; font-weight:950 !important; }
    .churvoxOptionC .title p { margin:4px 0 0 !important; color:rgba(255,255,255,.82) !important; font-size:11px !important; font-weight:900 !important; }
    .churvoxOptionC .owner { display:none !important; }
    .churvoxOptionC .cocNav { flex:0 0 auto !important; display:flex !important; flex-direction:row !important; align-items:center !important; justify-content:flex-start !important; gap:7px !important; width:auto !important; max-width:none !important; min-height:46px !important; margin:0 20px 12px !important; padding:7px !important; border-radius:16px !important; background:rgba(255,255,255,.72) !important; box-shadow:0 12px 28px rgba(16,21,19,.08) !important; overflow-x:auto !important; overflow-y:hidden !important; }
    .churvoxOptionC .cocNav button { display:inline-flex !important; align-items:center !important; justify-content:center !important; flex:0 0 auto !important; width:auto !important; min-width:auto !important; max-width:none !important; height:auto !important; min-height:32px !important; max-height:36px !important; aspect-ratio:auto !important; padding:8px 14px !important; border:0 !important; border-radius:999px !important; background:#e4e7e7 !important; color:#1e2422 !important; font-size:12px !important; font-weight:950 !important; line-height:1 !important; white-space:nowrap !important; box-shadow:none !important; transform:none !important; opacity:1 !important; }
    .churvoxOptionC .cocNav button.active { background:#ef553c !important; color:#fff !important; box-shadow:0 8px 22px rgba(239,85,60,.28) !important; }
    .churvoxOptionC .workspace { flex:1 1 auto !important; width:auto !important; margin:0 20px 22px !important; padding:0 !important; overflow-y:auto !important; overflow-x:hidden !important; background:transparent !important; }
    @media(max-width:980px){ .churvoxOptionC .cocBar{grid-template-columns:1fr !important; margin:12px !important;} .churvoxOptionC .title h1{font-size:30px !important;} .churvoxOptionC .cocNav{margin:0 12px 10px !important;} .churvoxOptionC .workspace{margin:0 12px 16px !important;} }
  `;
  document.head.appendChild(style);
}

function fixOwnerShell() {
  const root = document.querySelector(".churvoxOptionC");
  if (!root) return;
  installCss();
  root.querySelectorAll(".launchNavProof, .launchNavProof span, .xcf10-dock, .xcf10-dock-launch").forEach((el) => {
    putStyle(el, "display", "none");
    putStyle(el, "visibility", "hidden");
    putStyle(el, "width", "0");
    putStyle(el, "height", "0");
    putStyle(el, "overflow", "hidden");
    el.setAttribute("aria-hidden", "true");
  });
  root.querySelectorAll(".cocNav").forEach((el) => {
    putStyle(el, "display", "flex");
    putStyle(el, "overflow-x", "auto");
  });
  root.querySelectorAll(".cocNav button").forEach((el) => {
    putStyle(el, "width", "auto");
    putStyle(el, "height", "auto");
    putStyle(el, "min-height", "32px");
    putStyle(el, "aspect-ratio", "auto");
    putStyle(el, "border-radius", "999px");
  });
}

function run() {
  [0, 1, 25, 100, 300, 700, 1300, 2200].forEach((ms) => window.setTimeout(fixOwnerShell, ms));
  window.requestAnimationFrame?.(fixOwnerShell);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", run);
  window.addEventListener("resize", run);
  window.addEventListener("hashchange", run);
  window.addEventListener("popstate", run);
  window.addEventListener("churvox:fresh-data-updated", run);
  run();
}
