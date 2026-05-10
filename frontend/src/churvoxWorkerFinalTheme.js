/*
  Churvox worker final theme override.
  This runs in the browser and injects the worker theme last,
  so older worker CSS cannot beat it.
*/

(function churvoxWorkerFinalTheme() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__churvoxWorkerFinalThemeInstalled) return;
  window.__churvoxWorkerFinalThemeInstalled = true;

  const css = `
    :root {
      --cvx-bg: #f4f6fa;
      --cvx-ink: #080b12;
      --cvx-muted: #64748b;
      --cvx-card: #ffffff;
      --cvx-border: rgba(15, 23, 42, 0.10);
      --cvx-red: #ef3f3f;
      --cvx-red-soft: #ff6b54;
      --cvx-dark: #070a10;
      --cvx-dark-2: #111821;
      --cvx-dark-3: #171d25;
    }

    body[data-churvox-worker-final="true"] {
      background: var(--cvx-bg) !important;
      color: var(--cvx-ink) !important;
    }

    body[data-churvox-worker-final="true"] #root,
    body[data-churvox-worker-final="true"] main,
    body[data-churvox-worker-final="true"] .app,
    body[data-churvox-worker-final="true"] [class*="layout" i],
    body[data-churvox-worker-final="true"] [class*="page" i],
    body[data-churvox-worker-final="true"] [class*="dashboard" i],
    body[data-churvox-worker-final="true"] [class*="worker" i] {
      background: var(--cvx-bg) !important;
      color: var(--cvx-ink) !important;
    }

    body[data-churvox-worker-final="true"] header,
    body[data-churvox-worker-final="true"] aside,
    body[data-churvox-worker-final="true"] nav,
    body[data-churvox-worker-final="true"] [class*="header" i],
    body[data-churvox-worker-final="true"] [class*="topbar" i],
    body[data-churvox-worker-final="true"] [class*="navbar" i],
    body[data-churvox-worker-final="true"] [class*="sidebar" i],
    body[data-churvox-worker-final="true"] [class*="navigation" i],
    body[data-churvox-worker-final="true"] [class*="bottom" i][class*="nav" i] {
      background:
        radial-gradient(circle at top right, rgba(239,63,63,0.24), transparent 32%),
        linear-gradient(135deg, var(--cvx-dark) 0%, var(--cvx-dark-2) 58%, var(--cvx-dark-3) 100%) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      box-shadow: 0 22px 60px rgba(6,10,18,0.24) !important;
    }

    body[data-churvox-worker-final="true"] header *,
    body[data-churvox-worker-final="true"] aside *,
    body[data-churvox-worker-final="true"] nav *,
    body[data-churvox-worker-final="true"] [class*="header" i] *,
    body[data-churvox-worker-final="true"] [class*="topbar" i] *,
    body[data-churvox-worker-final="true"] [class*="navbar" i] *,
    body[data-churvox-worker-final="true"] [class*="sidebar" i] *,
    body[data-churvox-worker-final="true"] [class*="navigation" i] * {
      color: inherit !important;
    }

    body[data-churvox-worker-final="true"] header a,
    body[data-churvox-worker-final="true"] header button,
    body[data-churvox-worker-final="true"] aside a,
    body[data-churvox-worker-final="true"] aside button,
    body[data-churvox-worker-final="true"] nav a,
    body[data-churvox-worker-final="true"] nav button,
    body[data-churvox-worker-final="true"] [class*="header" i] a,
    body[data-churvox-worker-final="true"] [class*="header" i] button,
    body[data-churvox-worker-final="true"] [class*="topbar" i] a,
    body[data-churvox-worker-final="true"] [class*="topbar" i] button,
    body[data-churvox-worker-final="true"] [class*="sidebar" i] a,
    body[data-churvox-worker-final="true"] [class*="sidebar" i] button,
    body[data-churvox-worker-final="true"] [class*="navigation" i] a,
    body[data-churvox-worker-final="true"] [class*="navigation" i] button {
      background: rgba(255,255,255,0.065) !important;
      color: rgba(255,255,255,0.86) !important;
      border: 1px solid rgba(255,255,255,0.09) !important;
      border-radius: 999px !important;
      font-weight: 850 !important;
      min-height: 38px !important;
      padding: 9px 13px !important;
      text-decoration: none !important;
      box-shadow: none !important;
    }

    body[data-churvox-worker-final="true"] a[aria-current="page"],
    body[data-churvox-worker-final="true"] .active,
    body[data-churvox-worker-final="true"] [class*="active" i],
    body[data-churvox-worker-final="true"] button[aria-current="page"] {
      background: linear-gradient(135deg, var(--cvx-red), var(--cvx-red-soft)) !important;
      color: #ffffff !important;
      border-color: rgba(255,255,255,0.18) !important;
      box-shadow: 0 14px 30px rgba(239,63,63,0.28) !important;
    }

    body[data-churvox-worker-final="true"] [class*="hero" i],
    body[data-churvox-worker-final="true"] [class*="banner" i],
    body[data-churvox-worker-final="true"] [class*="welcome" i],
    body[data-churvox-worker-final="true"] [class*="summary" i],
    body[data-churvox-worker-final="true"] [class*="command" i],
    body[data-churvox-worker-final="true"] [class*="overview" i] {
      background:
        radial-gradient(circle at top right, rgba(239,63,63,0.26), transparent 34%),
        linear-gradient(135deg, var(--cvx-dark) 0%, var(--cvx-dark-2) 58%, var(--cvx-dark-3) 100%) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      border-radius: 30px !important;
      box-shadow: 0 24px 70px rgba(6,10,18,0.26) !important;
    }

    body[data-churvox-worker-final="true"] [class*="hero" i] *,
    body[data-churvox-worker-final="true"] [class*="banner" i] *,
    body[data-churvox-worker-final="true"] [class*="welcome" i] *,
    body[data-churvox-worker-final="true"] [class*="summary" i] *,
    body[data-churvox-worker-final="true"] [class*="command" i] *,
    body[data-churvox-worker-final="true"] [class*="overview" i] * {
      color: inherit !important;
    }

    body[data-churvox-worker-final="true"] article,
    body[data-churvox-worker-final="true"] section,
    body[data-churvox-worker-final="true"] [class*="card" i],
    body[data-churvox-worker-final="true"] [class*="panel" i],
    body[data-churvox-worker-final="true"] [class*="tile" i],
    body[data-churvox-worker-final="true"] [class*="job" i],
    body[data-churvox-worker-final="true"] [class*="task" i],
    body[data-churvox-worker-final="true"] [class*="shift" i] {
      border-radius: 24px !important;
      border: 1px solid var(--cvx-border) !important;
      background: var(--cvx-card) !important;
      color: var(--cvx-ink) !important;
      box-shadow: 0 18px 45px rgba(15,23,42,0.08) !important;
    }

    body[data-churvox-worker-final="true"] article article,
    body[data-churvox-worker-final="true"] section section,
    body[data-churvox-worker-final="true"] [class*="card" i] [class*="card" i],
    body[data-churvox-worker-final="true"] [class*="panel" i] [class*="panel" i] {
      box-shadow: none !important;
      border-color: rgba(15,23,42,0.07) !important;
    }

    body[data-churvox-worker-final="true"] h1,
    body[data-churvox-worker-final="true"] h2,
    body[data-churvox-worker-final="true"] h3 {
      color: inherit !important;
      letter-spacing: -0.045em !important;
      font-weight: 900 !important;
    }

    body[data-churvox-worker-final="true"] p,
    body[data-churvox-worker-final="true"] small,
    body[data-churvox-worker-final="true"] span {
      color: inherit;
    }

    body[data-churvox-worker-final="true"] button,
    body[data-churvox-worker-final="true"] a[role="button"],
    body[data-churvox-worker-final="true"] .btn {
      border-radius: 999px !important;
      font-weight: 850 !important;
      letter-spacing: -0.01em !important;
    }

    body[data-churvox-worker-final="true"] button[type="submit"],
    body[data-churvox-worker-final="true"] .btn-primary,
    body[data-churvox-worker-final="true"] [class*="primary" i],
    body[data-churvox-worker-final="true"] .bg-blue-600,
    body[data-churvox-worker-final="true"] .bg-indigo-600,
    body[data-churvox-worker-final="true"] .bg-green-600,
    body[data-churvox-worker-final="true"] .bg-emerald-600 {
      background: linear-gradient(135deg, var(--cvx-red), var(--cvx-red-soft)) !important;
      color: #ffffff !important;
      border-color: rgba(239,63,63,0.22) !important;
      box-shadow: 0 14px 30px rgba(239,63,63,0.24) !important;
    }

    body[data-churvox-worker-final="true"] input,
    body[data-churvox-worker-final="true"] select,
    body[data-churvox-worker-final="true"] textarea {
      border-radius: 18px !important;
      border: 1px solid rgba(15,23,42,0.12) !important;
      background: #ffffff !important;
      color: var(--cvx-ink) !important;
    }

    @media (max-width: 820px) {
      body[data-churvox-worker-final="true"] header,
      body[data-churvox-worker-final="true"] aside,
      body[data-churvox-worker-final="true"] nav,
      body[data-churvox-worker-final="true"] [class*="header" i],
      body[data-churvox-worker-final="true"] [class*="topbar" i],
      body[data-churvox-worker-final="true"] [class*="navbar" i],
      body[data-churvox-worker-final="true"] [class*="sidebar" i],
      body[data-churvox-worker-final="true"] [class*="navigation" i] {
        border-radius: 22px !important;
        margin: 10px !important;
        padding: 12px !important;
      }

      body[data-churvox-worker-final="true"] [class*="hero" i],
      body[data-churvox-worker-final="true"] [class*="banner" i],
      body[data-churvox-worker-final="true"] [class*="welcome" i],
      body[data-churvox-worker-final="true"] [class*="summary" i] {
        border-radius: 24px !important;
      }

      body[data-churvox-worker-final="true"] article,
      body[data-churvox-worker-final="true"] section,
      body[data-churvox-worker-final="true"] [class*="card" i],
      body[data-churvox-worker-final="true"] [class*="panel" i],
      body[data-churvox-worker-final="true"] [class*="tile" i],
      body[data-churvox-worker-final="true"] [class*="job" i] {
        border-radius: 20px !important;
      }
    }
  `;

  const inject = () => {
    let style = document.getElementById("churvox-worker-final-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "churvox-worker-final-theme";
      document.head.appendChild(style);
    }
    style.textContent = css;
  };

  const looksLikeWorkerScreen = () => {
    const path = window.location.pathname || "";
    const text = (document.body && document.body.innerText ? document.body.innerText : "").toLowerCase();

    return (
      /worker|my-jobs|assigned-jobs|worker-jobs/i.test(path) ||
      document.querySelector('[class*="worker" i], [href*="worker" i], [data-role="worker"]') ||
      (
        text.includes("my jobs") ||
        text.includes("assigned jobs") ||
        text.includes("start job") ||
        text.includes("complete job") ||
        text.includes("pause job") ||
        text.includes("resume job") ||
        text.includes("today's jobs") ||
        text.includes("worker")
      )
    );
  };

  const sync = () => {
    inject();

    if (!document.body) return;

    if (looksLikeWorkerScreen()) {
      document.body.setAttribute("data-churvox-worker-final", "true");
    } else {
      document.body.removeAttribute("data-churvox-worker-final");
    }
  };

  const patchHistory = (name) => {
    const original = window.history[name];
    if (!original || original.__churvoxPatched) return;

    const patched = function patchedHistory() {
      const result = original.apply(this, arguments);
      setTimeout(sync, 30);
      setTimeout(sync, 250);
      return result;
    };

    patched.__churvoxPatched = true;
    window.history[name] = patched;
  };

  patchHistory("pushState");
  patchHistory("replaceState");

  window.addEventListener("load", sync);
  window.addEventListener("popstate", () => setTimeout(sync, 50));
  window.addEventListener("click", () => setTimeout(sync, 120), true);

  const observer = new MutationObserver(() => sync());
  const startObserver = () => {
    if (!document.body) return;
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }

  setInterval(sync, 1200);
})();
