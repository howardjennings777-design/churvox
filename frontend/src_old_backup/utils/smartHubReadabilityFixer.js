export function startSmartHubReadabilityFixer() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const apply = () => {
    if (!window.location.pathname.includes("smart-hub")) return;

    document.querySelectorAll(".cx-page .smart-hub-force-light-text").forEach((node) => {
      node.style.setProperty("color", "#0f172a", "important");
      node.style.setProperty("opacity", "1", "important");
    });

    document.querySelectorAll(".cx-page .smart-hub-force-dark-text").forEach((node) => {
      node.style.setProperty("color", "#ffffff", "important");
      node.style.setProperty("opacity", "1", "important");
    });
  };

  window.addEventListener("load", apply);
  window.addEventListener("popstate", () => setTimeout(apply, 50));
  apply();
}
