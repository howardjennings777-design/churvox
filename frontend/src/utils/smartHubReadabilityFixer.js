export function startSmartHubReadabilityFixer() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const dark = "#0f172a";
  const body = "#334155";

  const makeReadable = () => {
    if (!window.location.pathname.includes("smart-hub")) return;

    const keywords = [
      "Advanced",
      "Overall score",
      "Live snapshot",
      "Business Health",
      "Jobs",
      "Cashflow",
      "Quote pipeline",
      "Team activity",
      "Automation",
      "Follow-ups",
    ];

    const nodes = Array.from(document.querySelectorAll(".cx-page h1, .cx-page h2, .cx-page h3, .cx-page h4, .cx-page p, .cx-page span, .cx-page a"));

    nodes.forEach((node) => {
      const text = (node.textContent || "").trim();
      if (!text) return;
      const isTarget = keywords.some((word) => text.includes(word));
      const card = node.closest("section, div");
      const classText = card?.className ? String(card.className) : "";
      const isLightCard = classText.includes("bg-white") || classText.includes("bg-slate-50") || classText.includes("from-white") || classText.includes("to-slate");
      if (!isTarget && !isLightCard) return;

      const tag = node.tagName.toLowerCase();
      const isHeading = ["h1", "h2", "h3", "h4"].includes(tag) || node.className.includes("font-black");
      node.style.color = isHeading ? dark : body;
      node.style.opacity = "1";
      node.style.filter = "none";
    });
  };

  window.addEventListener("load", makeReadable);
  window.addEventListener("popstate", () => setTimeout(makeReadable, 150));
  setTimeout(makeReadable, 300);
  setTimeout(makeReadable, 1000);
  setTimeout(makeReadable, 2500);

  const observer = new MutationObserver(() => makeReadable());
  observer.observe(document.body, { childList: true, subtree: true });
}
