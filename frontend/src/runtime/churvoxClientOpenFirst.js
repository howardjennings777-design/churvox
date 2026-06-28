// CHURVOX_CLIENT_OPEN_FIRST_20260628
// Add-client controls are hidden on Clients, so open the first real record by default.

if (typeof window !== "undefined" && !window.__CHURVOX_CLIENT_OPEN_FIRST__) {
  window.__CHURVOX_CLIENT_OPEN_FIRST__ = true;

  const isClients = () => {
    const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
    const path = (window.location.pathname || "").toLowerCase();
    return hash === "clients" || path.endsWith("/clients");
  };

  const run = () => {
    if (!isClients()) return;
    const title = document.querySelector(".clientWorkbenchOS .clientEditPanel h2");
    const first = document.querySelector(".clientWorkbenchOS .clientRecordList button");
    if (title?.textContent?.trim() === "Add client" && first) first.click();
  };

  window.addEventListener("load", () => setTimeout(run, 120));
  window.addEventListener("hashchange", () => setTimeout(run, 120));
  new MutationObserver(() => setTimeout(run, 60)).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(run, 120);
}
