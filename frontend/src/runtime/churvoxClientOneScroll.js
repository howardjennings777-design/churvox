// CHURVOX_CLIENT_ONE_SCROLL_20260628
// Clients is a fixed OS workbench: one visible scrollbar only, on the client list.

if (typeof window !== "undefined" && !window.__CHURVOX_CLIENT_ONE_SCROLL__) {
  window.__CHURVOX_CLIENT_ONE_SCROLL__ = true;

  const CLASS_NAME = "churvox-client-one-scroll";

  const isClientRoute = () => {
    const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
    const path = (window.location.pathname || "").toLowerCase();
    return hash === "clients" || path.endsWith("/clients") || Boolean(document.querySelector(".clientWorkbenchOS"));
  };

  const apply = () => {
    const active = isClientRoute();
    document.documentElement.classList.toggle(CLASS_NAME, active);
    document.body?.classList.toggle(CLASS_NAME, active);
  };

  window.addEventListener("load", apply);
  window.addEventListener("hashchange", apply);
  window.addEventListener("popstate", apply);
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
  apply();
}
