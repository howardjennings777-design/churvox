function isAuthPath() {
  const path = `${window.location.pathname || ""} ${window.location.hash || ""}`.toLowerCase();

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

  const existing = document.getElementById("churvox-auth-runtime-readable");
  if (existing) return;

  const style = document.createElement("style");
  style.id = "churvox-auth-runtime-readable";
  style.textContent = `
    body.churvox-auth-readable,
    body.churvox-auth-readable #root {
      background: #f7efe3 !important;
      color: #111827 !important;
      -webkit-text-fill-color: #111827 !important;
    }

    body.churvox-auth-readable #root *,
    body.churvox-auth-readable main *,
    body.churvox-auth-readable section *,
    body.churvox-auth-readable form * {
      text-shadow: none !important;
      opacity: 1 !important;
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
      border: 1px solid rgba(15, 23, 42, .24) !important;
      box-shadow: 0 10px 24px rgba(15, 23, 42, .08) !important;
      caret-color: #0f172a !important;
    }

    body.churvox-auth-readable input::placeholder,
    body.churvox-auth-readable textarea::placeholder {
      color: #64748b !important;
      -webkit-text-fill-color: #64748b !important;
      opacity: 1 !important;
    }

    body.churvox-auth-readable button {
      opacity: 1 !important;
      text-shadow: none !important;
      border: 1px solid rgba(15, 23, 42, .12) !important;
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
      border-color: rgba(15, 23, 42, .12) !important;
    }
  `;

  document.head.appendChild(style);
}

function applyAuthReadableMode() {
  if (typeof document === "undefined") return;

  installAuthReadableStyle();

  if (isAuthPath()) {
    document.body.classList.add("churvox-auth-readable");
  } else {
    document.body.classList.remove("churvox-auth-readable");
  }
}

function start() {
  applyAuthReadableMode();

  window.addEventListener("load", applyAuthReadableMode);
  window.addEventListener("hashchange", applyAuthReadableMode);
  window.addEventListener("popstate", applyAuthReadableMode);

  const originalPushState = window.history.pushState;
  window.history.pushState = function pushStatePatched() {
    const result = originalPushState.apply(this, arguments);
    setTimeout(applyAuthReadableMode, 0);
    return result;
  };

  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function replaceStatePatched() {
    const result = originalReplaceState.apply(this, arguments);
    setTimeout(applyAuthReadableMode, 0);
    return result;
  };

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
