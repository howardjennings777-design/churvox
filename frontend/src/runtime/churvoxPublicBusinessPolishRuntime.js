function isPublicPath(pathname) {
  const path = String(pathname || "/");
  return ["/", "/features", "/pricing", "/about", "/security", "/contact", "/refunds-cancellations", "/signup", "/login"].includes(path.replace(/\/+$/, "") || "/");
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

function injectMobileDeclutter() {
  if (typeof document === "undefined") return;
  if (document.getElementById("churvox-public-mobile-declutter")) return;
  const style = document.createElement("style");
  style.id = "churvox-public-mobile-declutter";
  style.textContent = `
    @media (max-width: 820px) {
      .publicSite,
      .publicSite * {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      .publicNav {
        position: sticky !important;
        top: 8px !important;
        z-index: 80 !important;
        display: grid !important;
        grid-template-columns: 1fr !important;
        align-items: stretch !important;
        gap: 10px !important;
        padding: 10px !important;
        overflow: hidden !important;
      }

      .publicBrand {
        min-width: 0 !important;
      }

      .publicBrand small {
        display: none !important;
      }

      .publicLinks {
        display: flex !important;
        flex: 1 1 auto !important;
        width: 100% !important;
        max-width: 100% !important;
        gap: 7px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding: 2px 2px 4px !important;
        scrollbar-width: thin !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .publicLinks a,
      .publicLinks .publicPrimary {
        display: inline-flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 40px !important;
        min-width: max-content !important;
        border-radius: 999px !important;
        padding: 0 13px !important;
        font-size: 12px !important;
        font-weight: 1000 !important;
        white-space: nowrap !important;
        pointer-events: auto !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      .publicLinks a:not(.publicPrimary) {
        border: 1px solid rgba(15,23,42,.10) !important;
        background: rgba(255,255,255,.76) !important;
      }

      .publicPrimary,
      .publicSecondary {
        min-height: 42px !important;
        padding: 0 14px !important;
        font-size: 13px !important;
      }

      .publicHero {
        padding-top: 22px !important;
        padding-bottom: 18px !important;
      }

      .publicHero h1 {
        margin: 14px 0 10px !important;
        font-size: clamp(38px, 12.6vw, 58px) !important;
        line-height: .9 !important;
      }

      .publicHero p,
      .publicStatement p,
      .publicSplit p {
        font-size: 16px !important;
        line-height: 1.38 !important;
      }

      .publicProof,
      .publicMock,
      .publicFeaturePanel {
        display: none !important;
      }

      .publicBand {
        padding: 18px 14px !important;
        margin-bottom: 12px !important;
        border-radius: 22px !important;
      }

      .publicBand h2 {
        font-size: clamp(30px, 9vw, 44px) !important;
        line-height: .94 !important;
      }

      .publicFlow,
      .publicCardGrid,
      .publicAreaGrid,
      .publicFeatureGrid,
      .publicPlanGrid,
      .publicAddOnGrid {
        gap: 10px !important;
      }

      .publicFlow article,
      .publicCardGrid article,
      .publicAreaGrid article,
      .publicFeatureGrid article,
      .publicPlanGrid article,
      .publicAddOnGrid article {
        padding: 14px !important;
        border-radius: 18px !important;
      }

      .publicAreaGrid article:nth-child(n+5),
      .publicCardGrid article:nth-child(n+5),
      .publicFeatureGrid article:nth-child(n+5) {
        display: none !important;
      }

      .publicCta .publicActions {
        display: grid !important;
        grid-template-columns: 1fr !important;
      }

      .publicFooter {
        padding-bottom: 28px !important;
      }
    }

    @media (max-width: 520px) {
      .publicKicker {
        min-height: 28px !important;
        font-size: 9px !important;
        letter-spacing: .10em !important;
      }

      .publicHero,
      .publicBand,
      .publicFooter,
      .publicNav {
        width: calc(100% - 18px) !important;
      }

      .publicFooter nav {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}

redirectSupportLinks();
softenPaymentText();
injectMobileDeclutter();
