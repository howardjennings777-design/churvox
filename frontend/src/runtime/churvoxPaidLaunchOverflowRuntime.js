// Owner app visual guard.
// Hides the audit-only proof rail, lets real FreshApp pages render, and restores Payroll when old routing points it at Team.

const STYLE_ID = "churvox-owner-original-pages-visual-guard";
const PAYROLL_ID = "churvox-payroll-page-restore";

function putStyle(el, key, value) {
  try { el.style.setProperty(key, value, "important"); } catch (_) {}
}

function removeStyle(el, key) {
  try { el.style.removeProperty(key); } catch (_) {}
}

function installCss() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html, body, #root { width:100% !important; max-width:100% !important; overflow-x:hidden !important; }
    body:has(.churvoxOptionC) { margin:0 !important; background:#eeeeea !important; }
    .churvoxOptionC, .churvoxOptionC * { box-sizing:border-box !important; min-width:0 !important; }
    .churvoxOptionC { display:flex !important; flex-direction:column !important; width:100vw !important; height:100vh !important; max-width:100vw !important; overflow:hidden !important; background:#eeeeea !important; color:#111815 !important; }

    .churvoxOptionC .launchNavProof,
    .churvoxOptionC .launchNavProof span,
    .churvoxOptionC .xcf10-dock,
    .churvoxOptionC .xcf10-dock-launch {
      display:none !important; visibility:hidden !important; width:0 !important; height:0 !important; max-width:0 !important; max-height:0 !important; padding:0 !important; margin:0 !important; border:0 !important; overflow:hidden !important; opacity:0 !important;
    }

    .churvoxOptionC .cocBar { flex:0 0 auto !important; display:grid !important; grid-template-columns:auto minmax(0,1fr) auto !important; align-items:center !important; gap:20px !important; width:auto !important; min-height:74px !important; margin:18px 20px 8px !important; padding:17px 20px !important; border-radius:17px !important; background:radial-gradient(circle at 86% 46%,rgba(240,100,47,.32),transparent 28%),linear-gradient(115deg,#101513 0%,#171b19 48%,#4c2a1c 100%) !important; color:#fff !important; box-shadow:0 18px 46px rgba(16,21,19,.18) !important; overflow:hidden !important; }
    .churvoxOptionC .brand { display:flex !important; align-items:center !important; gap:9px !important; min-width:190px !important; color:#fff !important; }
    .churvoxOptionC .brand i { display:block !important; width:29px !important; height:29px !important; min-width:29px !important; min-height:29px !important; border-radius:10px !important; background:#ef553c !important; box-shadow:0 0 0 4px rgba(239,85,60,.15) !important; }
    .churvoxOptionC .brand b, .churvoxOptionC .cocBar b { color:#fff !important; font-size:17px !important; font-weight:950 !important; }
    .churvoxOptionC .brand small, .churvoxOptionC .cocBar small { color:rgba(255,255,255,.78) !important; font-size:8px !important; font-weight:950 !important; text-transform:uppercase !important; }
    .churvoxOptionC .title h1 { margin:0 !important; color:#fff !important; font-size:38px !important; line-height:.86 !important; font-weight:950 !important; letter-spacing:-.05em !important; }
    .churvoxOptionC .title p { margin:4px 0 0 !important; color:rgba(255,255,255,.82) !important; font-size:11px !important; font-weight:900 !important; }
    .churvoxOptionC .owner { display:none !important; }

    .churvoxOptionC .cocNav { flex:0 0 auto !important; display:flex !important; flex-direction:row !important; align-items:center !important; justify-content:flex-start !important; gap:7px !important; width:auto !important; max-width:none !important; min-height:46px !important; margin:0 20px 12px !important; padding:7px !important; border-radius:16px !important; background:rgba(255,255,255,.72) !important; box-shadow:0 12px 28px rgba(16,21,19,.08) !important; overflow-x:auto !important; overflow-y:hidden !important; }
    .churvoxOptionC .cocNav button { display:inline-flex !important; align-items:center !important; justify-content:center !important; flex:0 0 auto !important; width:auto !important; min-width:auto !important; max-width:none !important; height:auto !important; min-height:32px !important; max-height:36px !important; aspect-ratio:auto !important; padding:8px 14px !important; border:0 !important; border-radius:999px !important; background:#e4e7e7 !important; color:#1e2422 !important; font-size:12px !important; font-weight:950 !important; line-height:1 !important; white-space:nowrap !important; box-shadow:none !important; transform:none !important; opacity:1 !important; }
    .churvoxOptionC .cocNav button.active { background:#ef553c !important; color:#fff !important; box-shadow:0 8px 22px rgba(239,85,60,.28) !important; }

    .churvoxOptionC .workspace { flex:1 1 auto !important; width:auto !important; margin:0 20px 22px !important; padding:0 !important; overflow-y:auto !important; overflow-x:hidden !important; background:transparent !important; }
    .churvoxOptionC .cocPage { display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:12px !important; align-items:start !important; padding:0 0 22px !important; background:transparent !important; }
    .churvoxOptionC .cocPanel { border:1px solid rgba(16,21,19,.08) !important; border-radius:16px !important; background:rgba(255,255,255,.82) !important; color:#111815 !important; box-shadow:0 13px 30px rgba(16,21,19,.06) !important; padding:16px !important; overflow:hidden !important; }
    .churvoxOptionC .cocPanel.full, .churvoxOptionC .cocPanel.wide { grid-column:1/-1 !important; }
    .churvoxOptionC .cocPanel h2 { margin:0 0 10px !important; color:#111815 !important; font-size:16px !important; font-weight:950 !important; letter-spacing:-.02em !important; }
    .churvoxOptionC .cocPanel h3 { margin:0 0 8px !important; color:#111815 !important; font-size:18px !important; font-weight:950 !important; }
    .churvoxOptionC .cocPanel p, .churvoxOptionC .cocPanel span, .churvoxOptionC .cocPanel small { color:#44504c !important; font-weight:800 !important; }
    .churvoxOptionC .toolbar { grid-column:1/-1 !important; display:flex !important; gap:8px !important; flex-wrap:wrap !important; }
    .churvoxOptionC .toolbar button, .churvoxOptionC .action { border:0 !important; border-radius:999px !important; min-height:34px !important; padding:8px 14px !important; background:#111815 !important; color:#fff !important; font-size:12px !important; font-weight:950 !important; cursor:pointer !important; }
    .churvoxOptionC .cocRow { display:grid !important; grid-template-columns:auto minmax(0,1fr) auto !important; gap:10px !important; align-items:center !important; min-height:54px !important; width:100% !important; border:1px solid rgba(16,21,19,.08) !important; border-radius:13px !important; background:#fff !important; color:#111815 !important; padding:10px 12px !important; text-align:left !important; box-shadow:0 8px 18px rgba(16,21,19,.04) !important; }
    .churvoxOptionC .cocRow i { width:10px !important; height:10px !important; border-radius:999px !important; background:#ef553c !important; }
    .churvoxOptionC .scroll, .churvoxOptionC .cocRows, .churvoxOptionC .ledgerList, .churvoxOptionC .jobCards, .churvoxOptionC .workerCards, .churvoxOptionC .workCards { display:grid !important; gap:8px !important; }
    .churvoxOptionC .jobCards, .churvoxOptionC .workerCards, .churvoxOptionC .workCards { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .churvoxOptionC .jobCard, .churvoxOptionC .workerCard, .churvoxOptionC .workCard, .churvoxOptionC .ledgerRow { border:1px solid rgba(16,21,19,.08) !important; border-radius:14px !important; background:#fff !important; padding:12px !important; color:#111815 !important; text-align:left !important; box-shadow:0 10px 22px rgba(16,21,19,.05) !important; }
    .churvoxOptionC .miniStats, .churvoxOptionC .proofGrid, .churvoxOptionC .moneyStrip, .churvoxOptionC .ownerActions { display:flex !important; flex-wrap:wrap !important; gap:8px !important; }
    .churvoxOptionC .miniStat, .churvoxOptionC .moneyStrip span { border-radius:13px !important; background:#eef2ed !important; padding:10px 12px !important; color:#151c19 !important; }
    .churvoxOptionC .map, .churvoxOptionC .googleMapShell { min-height:280px !important; border-radius:16px !important; overflow:hidden !important; background:#eef2ed !important; }
    .churvoxOptionC .googleMap iframe { width:100% !important; height:100% !important; min-height:280px !important; border:0 !important; }
    .churvoxOptionC .formGrid { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:10px !important; }
    .churvoxOptionC .cocField { display:grid !important; gap:5px !important; }
    .churvoxOptionC .cocField input, .churvoxOptionC .cocField textarea, .churvoxOptionC .cocField select { width:100% !important; min-height:40px !important; border:1px solid rgba(16,21,19,.12) !important; border-radius:12px !important; padding:9px 10px !important; background:#fff !important; color:#151c19 !important; font-weight:850 !important; }

    #${PAYROLL_ID} { grid-column:1/-1 !important; display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:12px !important; }
    #${PAYROLL_ID} section { border:1px solid rgba(16,21,19,.08) !important; border-radius:16px !important; background:rgba(255,255,255,.84) !important; color:#111815 !important; box-shadow:0 13px 30px rgba(16,21,19,.06) !important; padding:16px !important; }
    #${PAYROLL_ID} .payHero { grid-column:1/-1 !important; background:radial-gradient(circle at 88% 18%,rgba(239,85,60,.22),transparent 32%),linear-gradient(135deg,#101513,#1f2925 68%,#ef553c) !important; color:#fff !important; }
    #${PAYROLL_ID} h2, #${PAYROLL_ID} h3 { margin:0 0 8px !important; font-weight:950 !important; letter-spacing:-.03em !important; }
    #${PAYROLL_ID} .payHero h2 { color:#fff !important; font-size:28px !important; }
    #${PAYROLL_ID} .payHero p { color:rgba(255,255,255,.86) !important; }
    #${PAYROLL_ID} p, #${PAYROLL_ID} span, #${PAYROLL_ID} small { color:#44504c !important; font-weight:800 !important; }
    #${PAYROLL_ID} .payRow { display:grid !important; grid-template-columns:minmax(0,1fr) auto !important; gap:10px !important; align-items:center !important; min-height:48px !important; border-radius:12px !important; background:#fff !important; border:1px solid rgba(16,21,19,.08) !important; padding:10px 12px !important; margin-top:8px !important; }
    #${PAYROLL_ID} .payActions { display:flex !important; flex-wrap:wrap !important; gap:8px !important; margin-top:10px !important; }
    #${PAYROLL_ID} button { border:0 !important; border-radius:999px !important; min-height:34px !important; padding:8px 14px !important; background:#111815 !important; color:#fff !important; font-size:12px !important; font-weight:950 !important; }

    @media(max-width:980px){ .churvoxOptionC .cocBar{grid-template-columns:1fr !important; margin:12px !important;} .churvoxOptionC .title h1{font-size:30px !important;} .churvoxOptionC .cocNav{margin:0 12px 10px !important;} .churvoxOptionC .workspace{margin:0 12px 16px !important;} .churvoxOptionC .cocPage, .churvoxOptionC .jobCards, .churvoxOptionC .workerCards, .churvoxOptionC .workCards, .churvoxOptionC .formGrid, #${PAYROLL_ID}{grid-template-columns:1fr !important;} }
  `;
  document.head.appendChild(style);
}

function payrollRows(root) {
  const cards = Array.from(root.querySelectorAll('.workerCard, .cocRow')).slice(0, 6);
  const rows = cards.map((card) => {
    const title = card.querySelector('b')?.textContent || card.textContent?.trim()?.slice(0, 40) || 'Worker';
    const meta = card.querySelector('small, span')?.textContent || 'Timesheet ready for review';
    return `<div class="payRow"><span><b>${title}</b><small>${meta}</small></span><em>review</em></div>`;
  }).join('');
  return rows || `<div class="payRow"><span><b>No workers yet</b><small>Timesheets will appear when staff clock time.</small></span><em>empty</em></div>`;
}

function restorePayrollPage() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  const isPayroll = hash === 'payroll' || window.location.pathname === '/payroll' || window.location.pathname === '/payroll-board';
  const pageRoot = document.querySelector('.churvoxOptionC .workspace .cocPage');
  if (!pageRoot) return;

  const existing = document.getElementById(PAYROLL_ID);
  if (!isPayroll) {
    existing?.remove();
    pageRoot.querySelectorAll('[data-churvox-payroll-hidden="true"]').forEach((el) => {
      removeStyle(el, 'display');
      el.removeAttribute('data-churvox-payroll-hidden');
    });
    return;
  }

  pageRoot.querySelectorAll(':scope > *').forEach((el) => {
    if (el.id === PAYROLL_ID) return;
    el.setAttribute('data-churvox-payroll-hidden', 'true');
    putStyle(el, 'display', 'none');
  });

  let node = existing;
  if (!node) {
    node = document.createElement('div');
    node.id = PAYROLL_ID;
    pageRoot.prepend(node);
  }
  node.innerHTML = `
    <section class="payHero"><h2>Payroll review</h2><p>Review worker time, slips and pay periods. Churvox does not file tax and does not create bank payout files.</p></section>
    <section><h3>Pay period</h3><div class="payActions"><button>Weekly</button><button>Fortnightly</button><button>Monthly</button><button>Export CSV</button></div><p>Use this page to review hours before exporting records.</p></section>
    <section><h3>Timesheets</h3>${payrollRows(pageRoot)}</section>
    <section><h3>Locked guardrails</h3><div class="payRow"><span><b>No tax filing</b><small>Review and export only.</small></span><em>locked</em></div><div class="payRow"><span><b>No bank payout files</b><small>Owner keeps payment control.</small></span><em>locked</em></div></section>
  `;
}

function fixOwnerShell() {
  const root = document.querySelector(".churvoxOptionC");
  if (!root) return;
  installCss();
  root.querySelectorAll("#churvox-decided-page-deck, .launchNavProof, .launchNavProof span, .xcf10-dock, .xcf10-dock-launch").forEach((el) => {
    putStyle(el, "display", "none");
    putStyle(el, "visibility", "hidden");
    putStyle(el, "width", "0");
    putStyle(el, "height", "0");
    putStyle(el, "overflow", "hidden");
    el.setAttribute("aria-hidden", "true");
  });
  root.querySelectorAll(".cocNav").forEach((el) => { putStyle(el, "display", "flex"); putStyle(el, "overflow-x", "auto"); });
  root.querySelectorAll(".cocNav button").forEach((el) => { putStyle(el, "width", "auto"); putStyle(el, "height", "auto"); putStyle(el, "min-height", "32px"); putStyle(el, "aspect-ratio", "auto"); putStyle(el, "border-radius", "999px"); });
  restorePayrollPage();
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
  window.addEventListener("click", run, true);
  window.addEventListener("churvox:fresh-data-updated", run);
  run();
}
