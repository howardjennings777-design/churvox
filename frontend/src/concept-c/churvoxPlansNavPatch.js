// CHURVOX_PLANS_BOTTOM_NAV_PATCH_20260530
// Adds Plans to every bottom Command navigation, including the dashboard dock.

function makePlansLink(className = "") {
  const link = document.createElement("a");
  link.href = "/plans";
  link.textContent = "Plans";
  link.setAttribute("data-churvox-plans-link", "true");
  if (className) link.className = className;
  link.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState({}, "", "/plans");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  return link;
}

function insertPlansLink(nav) {
  if (!nav || nav.querySelector('[data-churvox-plans-link="true"]')) return;
  const links = [...nav.querySelectorAll("a")];
  const money = links.find((a) => /money|invoice/i.test(a.textContent || ""));
  const crew = links.find((a) => /crew|team/i.test(a.textContent || ""));
  const link = makePlansLink();
  if (money?.nextSibling) nav.insertBefore(link, money.nextSibling);
  else if (crew) nav.insertBefore(link, crew);
  else nav.appendChild(link);
}

function ensurePlansLink() {
  // Top nav is currently hidden, but keep this harmless in case it comes back later.
  insertPlansLink(document.querySelector(".xcf-topbar nav"));

  // Real pages bottom nav.
  document.querySelectorAll(".xcf-bottom-nav").forEach(insertPlansLink);

  // Command Floor dashboard dock.
  document.querySelectorAll(".xcf10-dock").forEach(insertPlansLink);
}

if (typeof window !== "undefined") {
  window.addEventListener("load", ensurePlansLink);
  window.addEventListener("popstate", () => setTimeout(ensurePlansLink, 50));
  document.addEventListener("click", () => setTimeout(ensurePlansLink, 80), true);

  const observer = new MutationObserver(() => ensurePlansLink());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(ensurePlansLink, 50);
  setTimeout(ensurePlansLink, 500);
  setTimeout(ensurePlansLink, 1500);
}
