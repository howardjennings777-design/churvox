const LOGOUT_ID = "churvox-runtime-logout-button";
const WORKER_LOGOUT_ID = "churvox-worker-runtime-logout-button";

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
  button.title = "Log out";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    logout();
  });
  return button;
}

function installOwnerLogout() {
  const target = document.querySelector(".cocBar") || document.querySelector(".churvoxOptionC");
  if (!target) return;
  let button = document.getElementById(LOGOUT_ID);
  if (!button) button = makeButton(LOGOUT_ID, "cocLogoutHeaderChip", "Log out");
  button.className = "cocLogoutHeaderChip";
  button.textContent = "Log out";
  if (button.parentElement !== target) target.appendChild(button);
}

function installWorkerLogout() {
  const nav = document.querySelector(".swNav");
  if (!nav || document.getElementById(WORKER_LOGOUT_ID)) return;
  const button = makeButton(WORKER_LOGOUT_ID, "swLogoutNavButton", "Log out");
  nav.appendChild(button);
}

function installLogoutButtons() {
  installOwnerLogout();
  installWorkerLogout();
}

function installStyles() {
  if (document.getElementById("churvox-logout-nav-style")) return;
  const style = document.createElement("style");
  style.id = "churvox-logout-nav-style";
  style.textContent = `
    .cocBar{position:relative!important;}
    .cocLogoutHeaderChip,
    .swLogoutNavButton{
      border:1px solid rgba(239,68,68,.28)!important;
      background:rgba(17,24,39,.82)!important;
      color:#fecaca!important;
      cursor:pointer!important;
      font-weight:950!important;
      text-decoration:none!important;
      width:auto!important;
      min-width:max-content!important;
      max-width:max-content!important;
      box-shadow:0 8px 18px rgba(15,23,42,.12)!important;
      transform:none!important;
      z-index:90!important;
    }
    .cocLogoutHeaderChip:hover,
    .swLogoutNavButton:hover{
      border-color:rgba(248,113,113,.70)!important;
      background:rgba(239,68,68,.18)!important;
      color:#fff!important;
    }
    .cocLogoutHeaderChip{
      position:absolute!important;
      top:9px!important;
      right:10px!important;
      border-radius:999px!important;
      padding:6px 12px!important;
      min-height:30px!important;
      height:30px!important;
      max-height:30px!important;
      font-size:12px!important;
      line-height:1!important;
      letter-spacing:.01em!important;
      white-space:nowrap!important;
    }
    .cocNav .cocLogoutNavButton,
    .cocNav .cocLogoutHeaderChip{
      display:none!important;
    }
    .swNav .swLogoutNavButton{
      border-radius:999px!important;
      padding:6px 10px!important;
      min-height:30px!important;
      height:30px!important;
      max-height:30px!important;
      font-size:12px!important;
      line-height:1!important;
    }
    @media(max-width:760px){
      .cocLogoutHeaderChip{
        top:7px!important;
        right:7px!important;
        padding:5px 10px!important;
        min-height:28px!important;
        height:28px!important;
        max-height:28px!important;
        font-size:11px!important;
      }
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
  window.setInterval(installLogoutButtons, 800);
  boot();
}
