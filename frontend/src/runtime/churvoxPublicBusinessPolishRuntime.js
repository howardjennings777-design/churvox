function isPublicPath(pathname) {
  const path = String(pathname || "/");
  return ["/", "/features", "/pricing", "/signup", "/login"].includes(path.replace(/\/+$/, "") || "/");
}

function redirectSupportLinks() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  document.addEventListener("click", (event) => {
    const link = event.target && event.target.closest ? event.target.closest('a[href="/support"], a[href="/help"]') : null;
    if (!link) return;
    if (!isPublicPath(window.location.pathname)) return;
    event.preventDefault();
    window.location.href = "/contact";
  }, true);
}

function softenPaymentText() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if ((window.location.pathname || "").replace(/\/+$/, "") !== "/pricing") return;

  const replace = () => {
    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        if (node.nodeValue === "On-site card payments") {
          node.nodeValue = "On-site card payments (live activation after Stripe approval)";
        }
      });
    } catch {}
  };

  replace();
  const observer = new MutationObserver(replace);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(replace, 400);
  setTimeout(() => observer.disconnect(), 6000);
}

redirectSupportLinks();
softenPaymentText();
