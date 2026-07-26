(() => {
  "use strict";

  const OWNER_SHELL = 'main[data-churvox-layout="fresh-studio"]';

  function compact(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function forceJobsLabel() {
    const nav = document.querySelector(".cvsWorkstream");
    if (nav) {
      const buttons = Array.from(nav.querySelectorAll("button"));
      const jobsButton = buttons.find((button) => /^(work|jobs)\b/i.test(compact(button.getAttribute("aria-label") || button.textContent))) || buttons[1];
      if (jobsButton) {
        const label = jobsButton.querySelector("span");
        if (label) label.textContent = "Jobs";
        jobsButton.setAttribute("aria-label", "Jobs");
        jobsButton.dataset.cvDestination = "jobs";
      }
    }

    document.querySelectorAll(".cvsMobileDock button, .cvsMobileMore button").forEach((button) => {
      const current = compact(button.getAttribute("aria-label") || button.textContent);
      if (!/^work\b/i.test(current)) return;
      const label = button.querySelector("span");
      if (label) label.textContent = "Jobs";
      else if (/^work$/i.test(compact(button.textContent))) button.textContent = "Jobs";
      button.setAttribute("aria-label", "Jobs");
    });
  }

  function makeElement(tag, text, styles = {}) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    Object.assign(node.style, styles);
    return node;
  }

  function ensureHelpIsUsable() {
    const shell = document.querySelector(OWNER_SHELL);
    const workspace = shell?.querySelector(".cvsWorkspace");
    if (!shell || !workspace) return;

    const page = compact(shell.dataset.screen || window.location.hash.replace(/^#/, "")).toLowerCase();
    let fallback = workspace.querySelector(":scope > .cvHelpReadyFallback");
    const realHelp = workspace.querySelector(".cvsSupportStudio");

    if (page !== "support" || realHelp) {
      fallback?.remove();
      return;
    }

    const visibleWords = compact(workspace.innerText);
    const waiting = Boolean(workspace.querySelector(".cvsLoading")) || visibleWords.length < 80;
    if (!waiting) {
      fallback?.remove();
      return;
    }

    if (fallback) return;

    fallback = document.createElement("section");
    fallback.className = "cvHelpReadyFallback";
    fallback.setAttribute("aria-label", "Help and support");
    Object.assign(fallback.style, {
      padding: "clamp(22px, 4vw, 42px)",
      border: "1px solid rgba(17, 24, 39, 0.16)",
      borderRadius: "22px",
      background: "#fffaf2",
      color: "#161a17",
      boxShadow: "0 18px 45px rgba(17, 24, 39, 0.08)",
    });

    fallback.append(
      makeElement("span", "Help and support", { fontWeight: "900", textTransform: "uppercase", letterSpacing: ".08em", fontSize: "12px" }),
      makeElement("h1", "Tell us exactly where you are stuck.", { margin: "10px 0", fontSize: "clamp(30px, 5vw, 52px)", lineHeight: "1", letterSpacing: "-.045em" }),
      makeElement("p", "Include the page name, the client or job, what happened, and what you expected. Churvox support can then work from the right record without making you repeat the whole story.", { maxWidth: "760px", fontSize: "17px", lineHeight: "1.6", margin: "0 0 18px" }),
    );

    const actions = document.createElement("div");
    Object.assign(actions.style, { display: "flex", gap: "12px", flexWrap: "wrap" });

    const email = makeElement("a", "Email hello@churvox.com", {
      display: "inline-flex", padding: "12px 16px", borderRadius: "12px", background: "#161a17", color: "#fff", fontWeight: "900", textDecoration: "none",
    });
    email.href = "mailto:hello@churvox.com?subject=Churvox%20support";

    const retry = makeElement("button", "Retry live data", {
      padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(17,24,39,.25)", background: "#fff", color: "#161a17", fontWeight: "900", cursor: "pointer",
    });
    retry.type = "button";
    retry.addEventListener("click", () => window.location.reload());

    actions.append(email, retry);
    fallback.append(actions);
    workspace.prepend(fallback);
  }

  let frame = 0;
  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      forceJobsLabel();
      ensureHelpIsUsable();
    });
  }

  schedule();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-screen", "aria-label"] });
  window.addEventListener("hashchange", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("resize", schedule);
})();
