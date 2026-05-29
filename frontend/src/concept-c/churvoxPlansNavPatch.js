// CHURVOX_PLANS_NAV_PATCH_20260530
// Adds Plans to the Command navigation without touching existing routes.

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

function ensurePlansLink() {
  const topNav = document.querySelector(".xcf-topbar nav");
  if (topNav && !topNav.querySelector('[data-churvox-plans-link="true"]')) {
    const money = [...topNav.querySelectorAll("a")].find((a) => /money/i.test(a.textContent || ""));
    const link = makePlansLink();
    if (money?.nextSibling) topNav.insertBefore(link, money.nextSibling);
    else topNav.appendChild(link);
  }

  const bottomNav = document.querySelector(".xcf-bottom-nav");
  if (bottomNav && !bottomNav.querySelector('[data-churvox-plans-link="true"]')) {
    const link = makePlansLink();
    const money = [...bottomNav.querySelectorAll("a")].find((a) => /money/i.test(a.textContent || ""));
    if (money?.nextSibling) bottomNav.insertBefore(link, money.nextSibling);
    else bottomNav.appendChild(link);
  }
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
