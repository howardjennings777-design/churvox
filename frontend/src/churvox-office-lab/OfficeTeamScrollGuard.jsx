import { useEffect } from "react";

const OFFSET = 92;

function targetFromLink(link) {
  const hash = link?.getAttribute?.("href") || "";
  if (!hash.startsWith("#")) return null;
  return document.getElementById(hash.slice(1));
}

function scrollToTarget(target) {
  if (!target) return;
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - OFFSET);
  window.scrollTo({ top, behavior: "smooth" });
}

export default function OfficeTeamScrollGuard() {
  useEffect(() => {
    function onClick(event) {
      const link = event.target?.closest?.(".cvOfficeTopbar a[href^='#']");
      if (!link) return;
      const target = targetFromLink(link);
      if (!target) return;
      event.preventDefault();
      const hash = link.getAttribute("href");
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
      requestAnimationFrame(() => scrollToTarget(target));
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
