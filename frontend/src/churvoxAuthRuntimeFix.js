function isAuthPath() {
  const path = `${window.location.pathname || ""} ${window.location.hash || ""} ${window.location.search || ""}`.toLowerCase();

  return (
    path.includes("login") ||
    path.includes("signin") ||
    path.includes("sign-in") ||
    path.includes("signup") ||
    path.includes("sign-up") ||
    path.includes("register") ||
    path.includes("forgot") ||
    path.includes("reset-password")
  );
}

function installAuthReadableStyle() {
  if (typeof document === "undefined") return;

  let style = document.getElementById("churvox-auth-runtime-readable");

  if (!style) {
    style = document.createElement("style");
    style.id = "churvox-auth-runtime-readable";
    document.head.appendChild(style);
  }

  style.textContent = `
    html.churvox-auth-critical,
    body.churvox-auth-readable,
    body.churvox-auth-readable #root {
      background: #f7efe3 !important;
      color: #111827 !important;
      color-scheme: light !important;
      opacity: 1 !important;
      filter: none !important;
    }

    body.churvox-auth-readable #root,
    body.churvox-auth-readable main,
    body.churvox-auth-readable section {
      background: #f7efe3 !important;
      color: #111827 !important;
      opacity: 1 !important;
      filter: none !important;
    }

    body.churvox-auth-readable #root *,
    body.churvox-auth-readable main *,
    body.churvox-auth-readable section *,
    body.churvox-auth-readable form * {
      text-shadow: none !important;
      opacity: 1 !important;
      filter: none !important;
    }

    body.churvox-auth-readable h1,
    body.churvox-auth-readable h2,
    body.churvox-auth-readable h3,
    body.churvox-auth-readable h4,
    body.churvox-auth-readable strong,
    body.churvox-auth-readable b {
      color: #0f172a !important;
      -webkit-text-fill-color: #0f172a !important;
    }

    body.churvox-auth-readable p,
    body.churvox-auth-readable label,
    body.churvox-auth-readable span,
    body.churvox-auth-readable small,
    body.churvox-auth-readable li,
    body.churvox-auth-readable div {
      color: #334155 !important;
      -webkit-text-fill-color: #334155 !important;
    }

    body.churvox-auth-readable a {
      color: #c2410c !important;
      -webkit-text-fill-color: #c2410c !important;
      font-weight: 1000 !important;
    }

    body.churvox-auth-readable input,
    body.churvox-auth-readable select,
    body.churvox-auth-readable textarea {
      background: #ffffff !important;
      color: #0f172a !important;
      -webkit-text-fill-color: #0f172a !important;
      border: 1px solid rgba(15, 23, 42, .28) !important;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .08) !important;
      caret-color: #0f172a !important;
    }

    body.churvox-auth-readable input::placeholder,
    body.churvox-auth-readable textarea::placeholder {
      color: #64748b !important;
      -webkit-text-fill-color: #64748b !important;
      opacity: 1 !important;
    }

    body.churvox-auth-readable input:-webkit-autofill,
    body.churvox-auth-readable input:-webkit-autofill:hover,
    body.churvox-auth-readable input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
      -webkit-text-fill-color: #0f172a !important;
    }

    body.churvox-auth-readable button {
      opacity: 1 !important;
      text-shadow: none !important;
      border: 1px solid rgba(15, 23, 42, .12) !important;
      filter: none !important;
    }

    body.churvox-auth-readable button[type="submit"],
    body.churvox-auth-readable form button:first-of-type {
      background: #f97316 !important;
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
      font-weight: 1000 !important;
      border-color: transparent !important;
    }

    body.churvox-auth-readable form,
    body.churvox-auth-readable [class*="card"],
    body.churvox-auth-readable [class*="Card"],
    body.churvox-auth-readable [class*="panel"],
    body.churvox-auth-readable [class*="Panel"],
    body.churvox-auth-readable [class*="box"],
    body.churvox-auth-readable [class*="Box"] {
      background-color: #fffaf0 !important;
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
      border-color: rgba(15, 23, 42, .16) !important;
      box-shadow: 0 18px 45px rgba(15, 23, 42, .12) !important;
    }
  `;
}

function applyAuthReadableMode() {
  if (typeof document === "undefined") return;

  installAuthReadableStyle();

  const onAuth = isAuthPath();

  document.documentElement.classList.toggle("churvox-auth-critical", onAuth);

  if (document.body) {
    document.body.classList.toggle("churvox-auth-readable", onAuth);
  }

  if (typeof window !== "undefined" && typeof window.__CHURVOX_APPLY_AUTH_CRITICAL_READABLE__ === "function") {
    window.__CHURVOX_APPLY_AUTH_CRITICAL_READABLE__();
  }
}

function start() {
  applyAuthReadableMode();

  window.addEventListener("load", applyAuthReadableMode);
  window.addEventListener("hashchange", applyAuthReadableMode);
  window.addEventListener("popstate", applyAuthReadableMode);
  document.addEventListener("click", () => setTimeout(applyAuthReadableMode, 80), true);

  if (!window.__CHURVOX_AUTH_RUNTIME_HISTORY_PATCHED__) {
    window.__CHURVOX_AUTH_RUNTIME_HISTORY_PATCHED__ = true;

    const originalPushState = window.history.pushState;
    window.history.pushState = function pushStatePatched() {
      const result = originalPushState.apply(this, arguments);
      setTimeout(applyAuthReadableMode, 0);
      setTimeout(applyAuthReadableMode, 120);
      return result;
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function replaceStatePatched() {
      const result = originalReplaceState.apply(this, arguments);
      setTimeout(applyAuthReadableMode, 0);
      setTimeout(applyAuthReadableMode, 120);
      return result;
    };
  }

  const observer = new MutationObserver(() => {
    if (isAuthPath()) applyAuthReadableMode();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}
