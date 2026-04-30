export function startSmartHubReadabilityFixer() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const dark = "#0f172a";
  const body = "#334155";
  const muted = "#475569";

  const force = (node, color) => {
    if (!node || !node.style) return;
    node.style.setProperty("color", color, "important");
    node.style.setProperty("opacity", "1", "important");
    node.style.setProperty("filter", "none", "important");
    node.style.setProperty("text-shadow", "none", "important");
  };

  const makeReadable = () => {
    if (!window.location.pathname.includes("smart-hub")) return;

    const all = Array.from(document.querySelectorAll(".cx-page h1, .cx-page h2, .cx-page h3, .cx-page h4, .cx-page p, .cx-page span, .cx-page a, .cx-page div"));

    all.forEach((node) => {
      const text = (node.textContent || "").trim();
      if (!text) return;

      const closest = node.closest("section, div");
      const cardClass = closest?.className ? String(closest.className) : "";
      const ownClass = node.className ? String(node.className) : "";
      const looksLikeLightCard =
        cardClass.includes("bg-white") ||
        cardClass.includes("bg-slate-50") ||
        cardClass.includes("bg-slate-100") ||
        cardClass.includes("from-white") ||
        cardClass.includes("to-slate") ||
        cardClass.includes("via-slate-50") ||
        ownClass.includes("text-slate-300") ||
        ownClass.includes("text-slate-400") ||
        ownClass.includes("text-slate-500") ||
        ownClass.includes("text-white");

      const keyText = /Advanced|Overall score|Live snapshot|Business Health|Health|Jobs|Cashflow|Quote pipeline|Team activity|Automation|Follow-ups|Daily Digest|Urgent Action|Smart Follow-up|Open area/i.test(text);

      if (!looksLikeLightCard && !keyText) return;

      const tag = node.tagName.toLowerCase();
      const isHeading = ["h1", "h2", "h3", "h4"].includes(tag) || ownClass.includes("font-black") || /Overall score|Business Health|Advanced|Daily Digest/i.test(text);
      const isButtonText = node.closest("button, a") && (node.closest("button, a")?.className || "").toString().includes("bg-blue");

      if (isButtonText) {
        force(node, "#ffffff");
      } else if (isHeading) {
        force(node, dark);
      } else if (keyText) {
        force(node, body);
      } else {
        force(node, muted);
      }
    });

    // Exact card repair: find the Overall score card and force all its labels readable.
    const scoreLabels = Array.from(document.querySelectorAll(".cx-page *")).filter((el) => (el.textContent || "").trim() === "Overall score");
    scoreLabels.forEach((label) => {
      const card = label.closest("div");
      if (!card) return;
      card.querySelectorAll("h1,h2,h3,h4,p,span,div,a").forEach((el) => {
        const text = (el.textContent || "").trim();
        if (!text) return;
        if (/^\d+%$/.test(text) || text === "Overall score") force(el, dark);
        else force(el, body);
      });
      card.style.setProperty("background", "#ffffff", "important");
      card.style.setProperty("border", "1px solid #cbd5e1", "important");
    });
  };

  const runMany = () => {
    makeReadable();
    setTimeout(makeReadable, 100);
    setTimeout(makeReadable, 500);
    setTimeout(makeReadable, 1200);
    setTimeout(makeReadable, 2500);
    setTimeout(makeReadable, 5000);
  };

  window.addEventListener("load", runMany);
  window.addEventListener("popstate", () => setTimeout(runMany, 150));
  window.addEventListener("click", () => setTimeout(makeReadable, 100));
  runMany();

  const observer = new MutationObserver(() => makeReadable());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
}
