// CHURVOX_SLIM_PLANS_TAB_20260530
// Adds a small Plans tab to the bottom Command navigation without wrapping the dock.

function makePlansLink() {
  const link = document.createElement("a");
  link.href = "/plans";
  link.textContent = "Plans";
  link.setAttribute("data-churvox-plans-link", "true");
  link.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState({}, "", "/plans");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  return link;
}

function tidyPlanLabels(nav) {
  [...nav.querySelectorAll("a")].forEach((link) => {
    const text = String(link.textContent || "").trim().toLowerCase();
    if (text === "plan command") {
      link.textContent = "Plans";
      link.href = "/plans";
      link.setAttribute("data-churvox-plans-link", "true");
    }
    if (text === "command floor") link.textContent = "Command";
    if (text === "client workbench") link.textContent = "Clients";
  });
}

function ensureSlimPlansTab(nav) {
  if (!nav) return;
  tidyPlanLabels(nav);
  const hasPlans = [...nav.querySelectorAll("a")].some((a) => String(a.textContent || "").trim().toLowerCase() === "plans");
  if (hasPlans) return;

  const links = [...nav.querySelectorAll("a")];
  const money = links.find((a) => /money|invoice/i.test(a.textContent || ""));
  const crew = links.find((a) => /crew|team/i.test(a.textContent || ""));
  const link = makePlansLink();
  if (money?.nextSibling) nav.insertBefore(link, money.nextSibling);
  else if (crew) nav.insertBefore(link, crew);
  else nav.appendChild(link);
}

function ensurePlansTabs() {
  document.querySelectorAll(".xcf10-dock, .xcf-bottom-nav").forEach(ensureSlimPlansTab);
}

if (typeof window !== "undefined") {
  window.addEventListener("load", ensurePlansTabs);
  window.addEventListener("popstate", () => setTimeout(ensurePlansTabs, 50));
  document.addEventListener("click", () => setTimeout(ensurePlansTabs, 80), true);

  const observer = new MutationObserver(() => ensurePlansTabs());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(ensurePlansTabs, 50);
  setTimeout(ensurePlansTabs, 500);
  setTimeout(ensurePlansTabs, 1500);
}
