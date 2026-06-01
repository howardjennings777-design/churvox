// CHURVOX_CREW_MAP_NAV_PATCH_20260601
// Adds Crew Map into older hard-coded command sidebars without rewriting every page shell.

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

function patchCrewMapNav() {
  document.querySelectorAll("aside").forEach(addCrewMapToSidebar);
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", patchCrewMapNav);
  window.addEventListener("load", patchCrewMapNav);
  const observer = new MutationObserver(patchCrewMapNav);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
