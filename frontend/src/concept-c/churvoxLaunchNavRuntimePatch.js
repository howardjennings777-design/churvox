// CHURVOX_LAUNCH_NAV_RUNTIME_PATCH_20260528
// Safe additive final-nav cleanup. Keeps main menu simple and moves advanced tools under Tools.

const mainLinks = [
  ["/dashboard", "Command"],
  ["/jobs", "Jobs"],
  ["/clients", "Clients"],
  ["/invoices", "Money"],
  ["/team", "Crew"],
  ["/operator-tools", "Tools"],
];

const topLinks = [
  ["/dashboard", "Command Floor"],
  ["/jobs", "Jobs"],
  ["/invoices", "Money"],
  ["/team", "Crew"],
  ["/operator-tools", "Tools"],
];

function addStyle() {
  if (document.getElementById("cv-launch-nav-style")) return;
  const style = document.createElement("style");
  style.id = "cv-launch-nav-style";
  style.textContent = `
    .xcf-topbar nav a[href='/operator-tools'],
    .xcf-bottom-nav a[href='/operator-tools']{
      background:rgba(190,242,100,.24)!important;
      color:#365314!important;
      border-color:rgba(77,124,15,.22)!important;
    }
    .xcf-bottom-nav{
      grid-template-columns:repeat(6,minmax(0,1fr))!important;
    }
    @media(max-width:520px){
      .xcf-bottom-nav{gap:6px!important;padding:8px!important}
      .xcf-bottom-nav a{font-size:11px!important;padding:9px 6px!important}
    }
  `;
  document.head.appendChild(style);
}

function rebuildNav(nav, links) {
  if (!nav || nav.dataset.cvLaunchNav === "yes") return;
  nav.dataset.cvLaunchNav = "yes";
  nav.innerHTML = "";
  links.forEach(([href, label]) => {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    nav.appendChild(a);
  });
}

function addToolsHint() {
  const shell = document.querySelector(".xcf-approval-desk");
  const proof = shell?.querySelector(".xcf-operator-proof-panel");
  if (!shell || !proof || shell.querySelector(".cv-launch-tools-hint")) return;
  const hint = document.createElement("section");
  hint.className = "cv-launch-tools-hint xcf-field-strip";
  hint.innerHTML = `<span><small>Operator tools</small><b>Proof packs, messages, dispatch, presets and offline sync now live under Tools.</b></span><a href="/operator-tools">Open Tools</a>`;
  proof.insertAdjacentElement("afterend", hint);
}

function tick() {
  addStyle();
  rebuildNav(document.querySelector(".xcf-topbar nav"), topLinks);
  rebuildNav(document.querySelector(".xcf-bottom-nav"), mainLinks);
  addToolsHint();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", tick);
  window.addEventListener("load", tick);
  setInterval(tick, 1000);
  const observer = new MutationObserver(tick);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
