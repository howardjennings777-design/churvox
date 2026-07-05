// Real Churvox owner app hardening.
// Keeps the fresh owner app pointed at the proper work pages and removes old visual noise.
(function churvoxRealSiteHardeningRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  function replaceUrl(pathAndHash) {
    try {
      const url = new URL(window.location.href);
      const [path, hash = ""] = pathAndHash.split("#");
      url.pathname = path;
      url.hash = hash ? `#${hash}` : "";
      window.history.replaceState({}, document.title, url.toString());
    } catch (_) {}
  }

  const path = window.location.pathname;
  if (path === "/payroll" || path === "/payroll-board") replaceUrl("/dashboard#payroll");
  if (path === "/support" || path === "/support-board") replaceUrl("/dashboard#support");
  if (path === "/messages" || path === "/messages-board") replaceUrl("/dashboard#messages");

  function tidy(root) {
    const app = root || document.querySelector(".churvoxOptionC");
    if (!app) return;

    document.documentElement.classList.add("churvox-real-site");
    document.body.classList.add("churvox-real-site");
    app.setAttribute("data-real-site", "true");

    app.querySelectorAll("#churvox-page-checked-note,[data-page-check-note],.open-command-pill,.owner-checks-pill").forEach((node) => {
      node.remove();
    });

    app.querySelectorAll(".cocNav button").forEach((button) => {
      const label = (button.textContent || "").trim().toLowerCase();
      if (label === "ai guide") button.textContent = "Today";
    });

    const title = app.querySelector(".title h1");
    const subtitle = app.querySelector(".title p");
    if (title && title.textContent.trim() === "AI Guide") title.textContent = "Today";
    if (subtitle && /setup, first jobs/i.test(subtitle.textContent || "")) {
      subtitle.textContent = "Run the day, open real records, and approve only what needs the boss.";
    }

    app.querySelectorAll("button.cocRow,button.workTile,button.ledgerRow").forEach((button) => {
      if (!button.getAttribute("aria-label")) {
        const text = (button.textContent || "Open record").replace(/\s+/g, " ").trim();
        button.setAttribute("aria-label", text ? `Open ${text}` : "Open record");
      }
    });
  }

  function run() {
    tidy();
  }

  run();
  window.addEventListener("hashchange", () => setTimeout(run, 50));
  window.addEventListener("popstate", () => setTimeout(run, 50));
  document.addEventListener("DOMContentLoaded", run);

  const observer = new MutationObserver(() => run());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
