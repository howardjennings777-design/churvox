// CHURVOX_SIDEBAR_LABEL_CSS_FIX_20260601_V3
// CSS/runtime visual label cleanup. No backend, auth, route, payment, or form changes.

function addCrewMapToSidebar(sidebar) {
  if (!sidebar || sidebar.dataset.crewMapPatched === "true") return;
  const dispatchLink = sidebar.querySelector('a[href="/dispatch"]');
  if (!dispatchLink || sidebar.querySelector('a[href="/crew-map"]')) return;

  const crewMapLink = dispatchLink.cloneNode(true);
  crewMapLink.setAttribute("href", "/crew-map");
  crewMapLink.classList.remove("bg-white", "text-slate-950");
  crewMapLink.classList.add("text-slate-300");

  const parts = crewMapLink.querySelectorAll("span");
  if (parts[0]) parts[0].textContent = "MP";
  if (parts[1]) parts[1].textContent = "Crew Map";

  dispatchLink.insertAdjacentElement("afterend", crewMapLink);
  sidebar.dataset.crewMapPatched = "true";
}

function injectSidebarLabelCssFix() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("aside").forEach(addCrewMapToSidebar);
  if (document.getElementById("churvox-sidebar-label-css-fix")) return;

  const style = document.createElement("style");
  style.id = "churvox-sidebar-label-css-fix";
  style.textContent = `
    aside a[href='/crew-map'] span.truncate,
    nav a[href='/crew-map'] span.truncate,
    aside a[href='/notifications'] span.truncate,
    nav a[href='/notifications'] span.truncate,
    aside a[href='/dispatch'] span.truncate,
    nav a[href='/dispatch'] span.truncate,
    aside a[href='/dispatch-board'] span.truncate,
    nav a[href='/dispatch-board'] span.truncate,
    aside a[href='/clients'] span.truncate,
    nav a[href='/clients'] span.truncate,
    aside a[href='/quotes'] span.truncate,
    nav a[href='/quotes'] span.truncate,
    aside a[href='/invoices'] span.truncate,
    nav a[href='/invoices'] span.truncate,
    aside a[href='/money-desk'] span.truncate,
    nav a[href='/money-desk'] span.truncate,
    aside a[href='/money'] span.truncate,
    nav a[href='/money'] span.truncate,
    aside a[href='/reports'] span.truncate,
    nav a[href='/reports'] span.truncate,
    aside a[href='/automation'] span.truncate,
    nav a[href='/automation'] span.truncate,
    aside a[href='/integrations'] span.truncate,
    nav a[href='/integrations'] span.truncate,
    aside a[href='/plans'] span.truncate,
    nav a[href='/plans'] span.truncate,
    aside a[href='/settings'] span.truncate,
    nav a[href='/settings'] span.truncate{
      color:transparent!important;
      position:relative!important;
      display:inline-block!important;
      min-width:118px!important;
      min-height:18px!important;
    }

    aside a[href='/crew-map'] span.truncate::after,
    nav a[href='/crew-map'] span.truncate::after,
    aside a[href='/notifications'] span.truncate::after,
    nav a[href='/notifications'] span.truncate::after,
    aside a[href='/dispatch'] span.truncate::after,
    nav a[href='/dispatch'] span.truncate::after,
    aside a[href='/dispatch-board'] span.truncate::after,
    nav a[href='/dispatch-board'] span.truncate::after,
    aside a[href='/clients'] span.truncate::after,
    nav a[href='/clients'] span.truncate::after,
    aside a[href='/quotes'] span.truncate::after,
    nav a[href='/quotes'] span.truncate::after,
    aside a[href='/invoices'] span.truncate::after,
    nav a[href='/invoices'] span.truncate::after,
    aside a[href='/money-desk'] span.truncate::after,
    nav a[href='/money-desk'] span.truncate::after,
    aside a[href='/money'] span.truncate::after,
    nav a[href='/money'] span.truncate::after,
    aside a[href='/reports'] span.truncate::after,
    nav a[href='/reports'] span.truncate::after,
    aside a[href='/automation'] span.truncate::after,
    nav a[href='/automation'] span.truncate::after,
    aside a[href='/integrations'] span.truncate::after,
    nav a[href='/integrations'] span.truncate::after,
    aside a[href='/plans'] span.truncate::after,
    nav a[href='/plans'] span.truncate::after,
    aside a[href='/settings'] span.truncate::after,
    nav a[href='/settings'] span.truncate::after{
      color:#cbd5e1!important;
      position:absolute!important;
      left:0!important;
      top:0!important;
      white-space:nowrap!important;
      font-size:14px!important;
      line-height:18px!important;
      font-weight:900!important;
      letter-spacing:0!important;
    }

    aside a.bg-white[href='/crew-map'] span.truncate::after,
    aside a.bg-white[href='/notifications'] span.truncate::after,
    aside a.bg-white[href='/dispatch'] span.truncate::after,
    aside a.bg-white[href='/dispatch-board'] span.truncate::after,
    aside a.bg-white[href='/clients'] span.truncate::after,
    aside a.bg-white[href='/quotes'] span.truncate::after,
    aside a.bg-white[href='/invoices'] span.truncate::after,
    aside a.bg-white[href='/money-desk'] span.truncate::after,
    aside a.bg-white[href='/money'] span.truncate::after,
    aside a.bg-white[href='/reports'] span.truncate::after,
    aside a.bg-white[href='/automation'] span.truncate::after,
    aside a.bg-white[href='/integrations'] span.truncate::after,
    aside a.bg-white[href='/plans'] span.truncate::after,
    aside a.bg-white[href='/settings'] span.truncate::after{
      color:#0f172a!important;
    }

    aside a[href='/crew-map'] span.truncate::after,
    nav a[href='/crew-map'] span.truncate::after{content:'Crew Map';}
    aside a[href='/notifications'] span.truncate::after,
    nav a[href='/notifications'] span.truncate::after{content:'Notifications';}
    aside a[href='/dispatch'] span.truncate::after,
    nav a[href='/dispatch'] span.truncate::after,
    aside a[href='/dispatch-board'] span.truncate::after,
    nav a[href='/dispatch-board'] span.truncate::after{content:'Dispatch';}
    aside a[href='/clients'] span.truncate::after,
    nav a[href='/clients'] span.truncate::after{content:'Clients';}
    aside a[href='/quotes'] span.truncate::after,
    nav a[href='/quotes'] span.truncate::after{content:'Quotes';}
    aside a[href='/invoices'] span.truncate::after,
    nav a[href='/invoices'] span.truncate::after{content:'Invoices';}
    aside a[href='/money-desk'] span.truncate::after,
    nav a[href='/money-desk'] span.truncate::after,
    aside a[href='/money'] span.truncate::after,
    nav a[href='/money'] span.truncate::after{content:'Money Desk';}
    aside a[href='/reports'] span.truncate::after,
    nav a[href='/reports'] span.truncate::after{content:'Reports';}
    aside a[href='/automation'] span.truncate::after,
    nav a[href='/automation'] span.truncate::after{content:'Automation';}
    aside a[href='/integrations'] span.truncate::after,
    nav a[href='/integrations'] span.truncate::after{content:'Integrations';}
    aside a[href='/plans'] span.truncate::after,
    nav a[href='/plans'] span.truncate::after{content:'Plans';}
    aside a[href='/settings'] span.truncate::after,
    nav a[href='/settings'] span.truncate::after{content:'Settings';}
  `;
  document.head.appendChild(style);
}

if (typeof window !== "undefined") {
  injectSidebarLabelCssFix();
  window.addEventListener("DOMContentLoaded", injectSidebarLabelCssFix);
  window.addEventListener("load", injectSidebarLabelCssFix);
  const observer = new MutationObserver(injectSidebarLabelCssFix);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export default null;
