// CHURVOX_CLEAN_COMMAND_NAV_FINAL_20260602_SAFE
// CSS-only safety fix. No DOM mutation, no history patching, no MutationObserver.

function injectStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById("churvox-clean-command-nav-final-style")) return;

  const style = document.createElement("style");
  style.id = "churvox-clean-command-nav-final-style";
  style.textContent = `
    @media (min-width: 900px) {
      .fixed.bottom-0,
      .fixed.bottom-3,
      .fixed.bottom-4,
      .fixed.bottom-5,
      .fixed.bottom-6,
      .fixed.bottom-8 {
        display: none !important;
      }
    }

    aside {
      background: #0f1722 !important;
      border-right: 1px solid rgba(148,163,184,.18) !important;
    }

    aside a[href] {
      background-image: none !important;
      box-shadow: none !important;
      min-height: 40px !important;
      height: auto !important;
      padding: 10px 12px !important;
      border-radius: 14px !important;
      transform: none !important;
      text-align: left !important;
      justify-content: flex-start !important;
    }

    aside a[href]:not(.bg-white):not([aria-current='page']) {
      background: transparent !important;
      color: #cbd5e1 !important;
    }

    aside a[href]:not(.bg-white):not([aria-current='page']):hover {
      background: rgba(255,255,255,.08) !important;
      color: #fff !important;
    }

    aside a[href].bg-white,
    aside a[href][aria-current='page'] {
      background: #22d3ee !important;
      color: #06111f !important;
    }

    aside a[href] span:first-child {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      border-radius: 10px !important;
      display: grid !important;
      place-items: center !important;
      font-size: 10px !important;
      font-weight: 950 !important;
      letter-spacing: 0 !important;
    }

    aside a[href]:not(.bg-white):not([aria-current='page']) span:first-child {
      background: rgba(255,255,255,.10) !important;
      color: #67e8f9 !important;
    }

    aside a[href].bg-white span:first-child,
    aside a[href][aria-current='page'] span:first-child {
      background: rgba(15,23,42,.95) !important;
      color: #fff !important;
    }

    aside a[href] span:last-child,
    aside a[href] span.truncate {
      color: inherit !important;
      font-size: 14px !important;
      line-height: 18px !important;
      font-weight: 850 !important;
      letter-spacing: 0 !important;
      opacity: 1 !important;
    }

    /* Dashboard hero was stretching to match the tall queue beside it. Keep it compact. */
    main.fixed.inset-0 > div.flex.min-h-screen > section > section.grid:first-of-type {
      align-items: start !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section.grid:first-of-type > div:first-child {
      align-self: start !important;
      min-height: 0 !important;
      height: auto !important;
      max-height: none !important;
      padding: 22px !important;
      border-radius: 24px !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section.grid:first-of-type > div:first-child h1 {
      margin-top: 14px !important;
      font-size: clamp(30px, 4vw, 52px) !important;
      line-height: .96 !important;
      max-width: 760px !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section.grid:first-of-type > div:first-child p {
      margin-top: 14px !important;
      max-width: 680px !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section.grid:first-of-type > div:first-child button {
      margin-top: 18px !important;
      padding: 10px 16px !important;
      border-radius: 14px !important;
    }

    /* Keep the dashboard focused: show only the next few prepared forms, not a huge wall. */
    main.fixed.inset-0 > div.flex.min-h-screen > section > section.grid:first-of-type aside div.mt-5.space-y-3 > button:nth-of-type(n+5),
    main.fixed.inset-0 > div.flex.min-h-screen > section > section:nth-of-type(3) > div.mt-5.grid > button:nth-of-type(n+5) {
      display: none !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section:nth-of-type(3) {
      padding: 18px !important;
      border-radius: 24px !important;
      max-height: 520px !important;
      overflow: hidden !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section:nth-of-type(3) h2 {
      font-size: clamp(24px, 3vw, 34px) !important;
      line-height: 1 !important;
      margin: 0 !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section:nth-of-type(3) > div.mt-5.grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 12px !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section:nth-of-type(3) > div.mt-5.grid > button {
      padding: 14px !important;
      border-radius: 18px !important;
      min-height: 118px !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section:nth-of-type(3) > div.mt-5.grid > button p {
      display: none !important;
    }

    main.fixed.inset-0 > div.flex.min-h-screen > section > section:nth-of-type(3) > div.mt-5.grid > button > div.mt-4 {
      margin-top: 10px !important;
      padding: 8px 12px !important;
      border-radius: 12px !important;
      font-size: 12px !important;
    }
  `;
  document.head.appendChild(style);
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectStyle, { once: true });
  } else {
    injectStyle();
  }
}

export default null;
