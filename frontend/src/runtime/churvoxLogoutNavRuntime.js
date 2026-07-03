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

function makeButton(id, className, text = "Out") {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.setAttribute("aria-label", "Log out of Churvox");
  button.title = "Logout";
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
  if (!button) button = makeButton(LOGOUT_ID, "cocLogoutHeaderChip", "Out");
  button.className = "cocLogoutHeaderChip";
  if (button.parentElement !== target) target.appendChild(button);
}

function installWorkerLogout() {
  const nav = document.querySelector(".swNav");
  if (!nav || document.getElementById(WORKER_LOGOUT_ID)) return;
  const button = makeButton(WORKER_LOGOUT_ID, "swLogoutNavButton", "Out");
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
      border:1px solid rgba(239,68,68,.22)!important;
      background:rgba(17,24,39,.72)!important;
      color:#fecaca!important;
      cursor:pointer!important;
      font-weight:950!important;
      text-decoration:none!important;
      width:auto!important;
      min-width:0!important;
      max-width:max-content!important;
      box-shadow:none!important;
      transform:none!important;
      z-index:90!important;
    }
    .cocLogoutHeaderChip:hover,
    .swLogoutNavButton:hover{
      border-color:rgba(248,113,113,.62)!important;
      background:rgba(239,68,68,.14)!important;
      color:#fff!important;
    }
    .cocLogoutHeaderChip{
      position:absolute!important;
      top:8px!important;
      right:8px!important;
      border-radius:999px!important;
      padding:3px 7px!important;
      min-height:20px!important;
      height:20px!important;
      max-height:20px!important;
      font-size:8px!important;
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
      padding:3px 7px!important;
      min-height:22px!important;
      height:22px!important;
      max-height:22px!important;
      font-size:9px!important;
      line-height:1!important;
    }
    @media(max-width:760px){
      .cocLogoutHeaderChip{
        top:6px!important;
        right:6px!important;
        padding:2px 6px!important;
        min-height:18px!important;
        height:18px!important;
        max-height:18px!important;
        font-size:8px!important;
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
