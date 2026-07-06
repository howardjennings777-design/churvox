const LOGOUT_ID = "churvox-runtime-logout-button";
const WORKER_LOGOUT_ID = "churvox-worker-runtime-logout-button";
const PRODUCT_LOGOUT_ID = "churvox-product-runtime-logout-button";

function clearAuthStorage() {
  try {
    [
      "token",
      "authToken",
      "access_token",
      "owner_portal_session",
      "platform_owner_email",
      "churvox_plan_choice_required",
      "churvox_first_setup_pending",
    ].forEach((key) => window.localStorage.removeItem(key));
  } catch {}
  try {
    ["token", "authToken", "access_token"].forEach((key) => window.sessionStorage.removeItem(key));
  } catch {}
}

async function callLogout() {
  try {
    const base = window.__CHURVOX_API_BASE__ || process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE || "https://churvox-backend.onrender.com";
    const cleanBase = String(base || "").replace(/\/$/, "");
    const token = (() => {
      try { return window.localStorage.getItem("token") || ""; } catch { return ""; }
    })();
    await window.fetch(`${cleanBase}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: "{}",
    });
  } catch {}
}

async function logout() {
  await callLogout();
  clearAuthStorage();
  try {
    window.dispatchEvent(new Event("churvox-auth-refresh"));
  } catch {}
  window.location.href = "/login";
}

function makeButton(id, className, text = "Log out") {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.setAttribute("aria-label", "Log out of Churvox");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    logout();
  });
  return button;
}

function installOwnerLogout() {
  const nav = document.querySelector(".cocNav");
  if (!nav || document.getElementById(LOGOUT_ID)) return;
  const button = makeButton(LOGOUT_ID, "cocLogoutNavButton", "Log out");
  nav.appendChild(button);
}

function installProductLogout() {
  const nav = document.querySelector(".cvxProduct .cvxNav");
  if (!nav || document.getElementById(PRODUCT_LOGOUT_ID)) return;
  const button = makeButton(PRODUCT_LOGOUT_ID, "cvxLogoutNavButton", "Log out");
  nav.appendChild(button);
}

function installWorkerLogout() {
  const nav = document.querySelector(".swNav");
  if (!nav || document.getElementById(WORKER_LOGOUT_ID)) return;
  const button = makeButton(WORKER_LOGOUT_ID, "swLogoutNavButton", "Log out");
  nav.appendChild(button);
}

function installLogoutButtons() {
  installOwnerLogout();
  installProductLogout();
  installWorkerLogout();
}

function installStyles() {
  if (document.getElementById("churvox-logout-nav-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-logout-nav-style";
  style.textContent = `
    .cocLogoutNavButton,
    .cvxLogoutNavButton,
    .swLogoutNavButton{
      border:1px solid rgba(239,68,68,.35)!important;
      background:rgba(239,68,68,.10)!important;
      color:#fecaca!important;
      cursor:pointer!important;
      font-weight:950!important;
      text-decoration:none!important;
    }
    .cocLogoutNavButton:hover,
    .cvxLogoutNavButton:hover,
    .swLogoutNavButton:hover{
      border-color:rgba(248,113,113,.75)!important;
      background:rgba(239,68,68,.18)!important;
      color:#fff!important;
    }
    .cocNav .cocLogoutNavButton{
      margin-left:auto!important;
      border-radius:999px!important;
      padding:10px 14px!important;
      min-height:40px!important;
      white-space:nowrap!important;
    }
    .cvxProduct .cvxNav .cvxLogoutNavButton{
      margin-left:auto!important;
      min-width:94px!important;
      min-height:44px!important;
      border-radius:16px!important;
      padding:8px 11px!important;
      font-size:12px!important;
      color:#991b1b!important;
      background:#fff1f2!important;
      border-color:rgba(220,38,38,.22)!important;
    }
    .cvxProduct .cvxNav .cvxLogoutNavButton:hover{
      color:#7f1d1d!important;
      background:#ffe4e6!important;
      border-color:rgba(220,38,38,.42)!important;
    }
    .swNav .swLogoutNavButton{
      border-radius:16px!important;
      padding:8px 10px!important;
      font-size:12px!important;
      line-height:1.1!important;
    }
    @media(max-width:760px){
      .cocNav .cocLogoutNavButton,
      .cvxProduct .cvxNav .cvxLogoutNavButton{margin-left:0!important;}
    }
  `;
  document.head.appendChild(style);
}

function boot() {
  installStyles();
  installLogoutButtons();
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("hashchange", () => window.setTimeout(boot, 50));
  window.addEventListener("popstate", () => window.setTimeout(boot, 50));
  window.addEventListener("churvox-owner-app-ready", () => window.setTimeout(boot, 50));
  window.setInterval(installLogoutButtons, 800);
  boot();
}
