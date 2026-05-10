/*
  Final worker visual polish.
  Fixes washed-out worker cards/pills caused by old CSS fighting the new Churvox theme.
*/
(function churvoxWorkerPolishTheme() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__churvoxWorkerPolishThemeInstalled) return;
  window.__churvoxWorkerPolishThemeInstalled = true;

  const css = `
    body[data-churvox-worker-final="true"] {
      background: #f3f5f8 !important;
      font-synthesis-weight: none;
    }

    body[data-churvox-worker-final="true"] main {
      padding: 28px !important;
    }

    /* Worker hero */
    body[data-churvox-worker-final="true"] [class*="hero" i],
    body[data-churvox-worker-final="true"] [class*="welcome" i],
    body[data-churvox-worker-final="true"] [class*="summary" i] {
      background:
        radial-gradient(circle at top right, rgba(239, 63, 63, 0.22), transparent 34%),
        linear-gradient(135deg, #070a10 0%, #101720 58%, #151d27 100%) !important;
      color: #ffffff !important;
      border-radius: 34px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 26px 70px rgba(6, 10, 18, 0.25) !important;
      overflow: hidden !important;
    }

    body[data-churvox-worker-final="true"] [class*="hero" i] h1,
    body[data-churvox-worker-final="true"] [class*="welcome" i] h1,
    body[data-churvox-worker-final="true"] [class*="summary" i] h1 {
      color: #ffffff !important;
      font-size: clamp(42px, 9vw, 72px) !important;
      line-height: 0.95 !important;
      letter-spacing: -0.07em !important;
      font-weight: 950 !important;
      margin-bottom: 18px !important;
    }

    body[data-churvox-worker-final="true"] [class*="hero" i] p,
    body[data-churvox-worker-final="true"] [class*="welcome" i] p,
    body[data-churvox-worker-final="true"] [class*="summary" i] p {
      color: rgba(255,255,255,0.86) !important;
      font-size: clamp(20px, 4.8vw, 32px) !important;
      line-height: 1.45 !important;
      letter-spacing: 0.035em !important;
      max-width: 620px !important;
    }

    /* Fix pale label pill like WORKER APP / NEXT UP */
    body[data-churvox-worker-final="true"] [class*="hero" i] :is(span, small, div),
    body[data-churvox-worker-final="true"] [class*="welcome" i] :is(span, small, div),
    body[data-churvox-worker-final="true"] [class*="summary" i] :is(span, small, div) {
      color: inherit;
    }

    body[data-churvox-worker-final="true"] [class*="hero" i] :is(.badge, [class*="badge" i], [class*="pill" i], [class*="tag" i], small:first-child),
    body[data-churvox-worker-final="true"] [class*="welcome" i] :is(.badge, [class*="badge" i], [class*="pill" i], [class*="tag" i], small:first-child),
    body[data-churvox-worker-final="true"] [class*="summary" i] :is(.badge, [class*="badge" i], [class*="pill" i], [class*="tag" i], small:first-child) {
      background: rgba(255,255,255,0.12) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255,255,255,0.16) !important;
      border-radius: 999px !important;
      letter-spacing: 0.42em !important;
      font-weight: 950 !important;
      text-transform: uppercase !important;
      box-shadow: none !important;
      opacity: 1 !important;
    }

    /* Fix the 0m / Today stats: no more white text on white boxes */
    body[data-churvox-worker-final="true"] [class*="hero" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]),
    body[data-churvox-worker-final="true"] [class*="welcome" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]),
    body[data-churvox-worker-final="true"] [class*="summary" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]) {
      background: rgba(255,255,255,0.10) !important;
      border: 1px solid rgba(255,255,255,0.14) !important;
      color: #ffffff !important;
      border-radius: 24px !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08) !important;
      backdrop-filter: blur(12px) !important;
    }

    body[data-churvox-worker-final="true"] [class*="hero" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]) *,
    body[data-churvox-worker-final="true"] [class*="welcome" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]) *,
    body[data-churvox-worker-final="true"] [class*="summary" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]) * {
      color: #ffffff !important;
      opacity: 1 !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.22) !important;
    }

    /* Main worker cards */
    body[data-churvox-worker-final="true"] [class*="card" i],
    body[data-churvox-worker-final="true"] [class*="panel" i],
    body[data-churvox-worker-final="true"] [class*="job" i],
    body[data-churvox-worker-final="true"] section {
      background: #ffffff !important;
      color: #101827 !important;
      border: 1px solid rgba(15, 23, 42, 0.08) !important;
      border-radius: 28px !important;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08) !important;
    }

    body[data-churvox-worker-final="true"] [class*="card" i] h1,
    body[data-churvox-worker-final="true"] [class*="card" i] h2,
    body[data-churvox-worker-final="true"] [class*="card" i] h3,
    body[data-churvox-worker-final="true"] [class*="panel" i] h1,
    body[data-churvox-worker-final="true"] [class*="panel" i] h2,
    body[data-churvox-worker-final="true"] [class*="panel" i] h3,
    body[data-churvox-worker-final="true"] section h1,
    body[data-churvox-worker-final="true"] section h2,
    body[data-churvox-worker-final="true"] section h3 {
      color: #080b12 !important;
      font-weight: 950 !important;
      letter-spacing: -0.05em !important;
    }

    body[data-churvox-worker-final="true"] [class*="card" i] p,
    body[data-churvox-worker-final="true"] [class*="panel" i] p,
    body[data-churvox-worker-final="true"] section p {
      color: #334155 !important;
    }

    /* Keep dark card headers dark but readable */
    body[data-churvox-worker-final="true"] [class*="card" i] [class*="header" i],
    body[data-churvox-worker-final="true"] [class*="panel" i] [class*="header" i],
    body[data-churvox-worker-final="true"] section [class*="header" i] {
      background:
        radial-gradient(circle at top right, rgba(239,63,63,0.22), transparent 32%),
        linear-gradient(135deg, #070a10 0%, #111821 58%, #171d25 100%) !important;
      color: #ffffff !important;
      border-radius: 24px !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
    }

    body[data-churvox-worker-final="true"] [class*="card" i] [class*="header" i] *,
    body[data-churvox-worker-final="true"] [class*="panel" i] [class*="header" i] *,
    body[data-churvox-worker-final="true"] section [class*="header" i] * {
      color: #ffffff !important;
      opacity: 1 !important;
    }

    /* Tabs at bottom */
    body[data-churvox-worker-final="true"] :is([role="tab"], [class*="tab" i], button) {
      color: #334155 !important;
      border-radius: 999px !important;
      border: 1px solid rgba(15,23,42,0.10) !important;
      background: #ffffff !important;
      box-shadow: 0 12px 26px rgba(15,23,42,0.06) !important;
    }

    body[data-churvox-worker-final="true"] :is([role="tab"][aria-selected="true"], [class*="active" i], button[aria-current="page"]) {
      background: linear-gradient(135deg, #ef3f3f, #ff6b54) !important;
      color: #ffffff !important;
      border-color: rgba(239,63,63,0.24) !important;
      box-shadow: 0 16px 32px rgba(239,63,63,0.24) !important;
    }

    @media (max-width: 820px) {
      body[data-churvox-worker-final="true"] main {
        padding: 16px !important;
      }

      body[data-churvox-worker-final="true"] [class*="hero" i],
      body[data-churvox-worker-final="true"] [class*="welcome" i],
      body[data-churvox-worker-final="true"] [class*="summary" i] {
        border-radius: 30px !important;
        padding: 40px !important;
      }

      body[data-churvox-worker-final="true"] [class*="hero" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]),
      body[data-churvox-worker-final="true"] [class*="welcome" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]),
      body[data-churvox-worker-final="true"] [class*="summary" i] :is([class*="stat" i], [class*="metric" i], [class*="tile" i]) {
        min-height: 86px !important;
      }
    }
  `;

  const inject = () => {
    let style = document.getElementById("churvox-worker-polish-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "churvox-worker-polish-theme";
      document.head.appendChild(style);
    }
    style.textContent = css;
  };

  const sync = () => {
    inject();
    if (!document.body) return;

    const path = window.location.pathname || "";
    const pageText = document.body.innerText || "";

    if (
      /worker|workers|my-jobs|worker-jobs/i.test(path) ||
      /Today's Jobs|Your next job|No active jobs|Start job|Complete job|Worker App/i.test(pageText)
    ) {
      document.body.setAttribute("data-churvox-worker-final", "true");
    }
  };

  const patch = (name) => {
    const original = window.history[name];
    if (!original || original.__cvxWorkerPolishPatched) return;
    const patched = function () {
      const result = original.apply(this, arguments);
      setTimeout(sync, 50);
      setTimeout(sync, 300);
      return result;
    };
    patched.__cvxWorkerPolishPatched = true;
    window.history[name] = patched;
  };

  patch("pushState");
  patch("replaceState");

  window.addEventListener("load", sync);
  window.addEventListener("popstate", () => setTimeout(sync, 80));
  window.addEventListener("click", () => setTimeout(sync, 120), true);

  const start = () => {
    sync();
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
