import './churvoxAuthLoginResponseGuard';

// Forces auth input text to remain visible even if global contrast/runtime CSS tries to repaint it.
function isAuthPage() {
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

function setImportant(el, prop, value) {
  if (!el || !el.style) return;
  el.style.setProperty(prop, value, "important");
}

function forceOneInput(input) {
  setImportant(input, "color", "#000000");
  setImportant(input, "-webkit-text-fill-color", "#000000");
  setImportant(input, "caret-color", "#000000");
  setImportant(input, "background", "#ffffff");
  setImportant(input, "background-color", "#ffffff");
  setImportant(input, "opacity", "1");
  setImportant(input, "visibility", "visible");
  setImportant(input, "filter", "none");
  setImportant(input, "text-shadow", "none");
  setImportant(input, "mix-blend-mode", "normal");
  setImportant(input, "font-size", "17px");
  setImportant(input, "font-weight", "800");
  setImportant(input, "letter-spacing", "0");
}

function forceAuthInputsVisible() {
  if (!isAuthPage()) return;

  document
    .querySelectorAll(
      '.cvPublicAuth input, .wh-auth input, input[type="text"], input[type="email"], input[type="password"]'
    )
    .forEach(forceOneInput);
}

function installAuthInputStyle() {
  if (document.getElementById("churvox-auth-input-visible-style")) return;

  const style = document.createElement("style");
  style.id = "churvox-auth-input-visible-style";
  style.textContent = `
    .cvPublicAuth input,
    .cvPublicAuth input[type="text"],
    .cvPublicAuth input[type="email"],
    .cvPublicAuth input[type="password"],
    .wh-auth input,
    .wh-auth input[type="text"],
    .wh-auth input[type="email"],
    .wh-auth input[type="password"] {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      caret-color: #000000 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      opacity: 1 !important;
      visibility: visible !important;
      filter: none !important;
      text-shadow: none !important;
      mix-blend-mode: normal !important;
      font-size: 17px !important;
      font-weight: 800 !important;
      letter-spacing: 0 !important;
    }

    .cvPublicAuth input::placeholder,
    .wh-auth input::placeholder {
      color: #64748b !important;
      -webkit-text-fill-color: #64748b !important;
      opacity: 1 !important;
    }

    .cvPublicAuth input:-webkit-autofill,
    .cvPublicAuth input:-webkit-autofill:hover,
    .cvPublicAuth input:-webkit-autofill:focus,
    .wh-auth input:-webkit-autofill,
    .wh-auth input:-webkit-autofill:hover,
    .wh-auth input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
      -webkit-text-fill-color: #000000 !important;
      caret-color: #000000 !important;
    }
  `;
  document.head.appendChild(style);
}

function startAuthInputVisibilityGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  installAuthInputStyle();
  forceAuthInputsVisible();

  ["input", "change", "keyup", "keydown", "focus", "click"].forEach((eventName) => {
    document.addEventListener(
      eventName,
      (event) => {
        if (event.target && event.target.matches && event.target.matches("input")) {
          forceOneInput(event.target);
        }
        setTimeout(forceAuthInputsVisible, 0);
      },
      true
    );
  });

  window.addEventListener("load", forceAuthInputsVisible);
  window.addEventListener("popstate", forceAuthInputsVisible);
  window.addEventListener("hashchange", forceAuthInputsVisible);

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(forceAuthInputsVisible);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "value"],
  });

  window.setInterval(forceAuthInputsVisible, 400);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAuthInputVisibilityGuard);
} else {
  startAuthInputVisibilityGuard();
}
