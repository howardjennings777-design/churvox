// CHURVOX_PUBLIC_COPY_RUNTIME_20260706
// Visible public-page copy polish only. Does not change auth, pricing or app logic.

const COPY_BY_PATH = {
  "/login": {
    h1: "Open your Churvox workspace.",
    intro: "Sign in to see the jobs, workers, messages and owner checks waiting for you.",
    panelKicker: "Owner workspace",
    panelTitle: "The day, the admin and the decisions in one place.",
    bullets: [
      "Today shows what needs attention.",
      "Command holds approvals, edits and parked items.",
      "Jobs, clients, workers and money stay connected.",
      "You stay in control of what moves next.",
    ],
  },
  "/signup": {
    h1: "Start Churvox with a clean workspace.",
    intro: "Create the account, choose the plan you want to test, then set up the business properly.",
    panelKicker: "Trial path",
    panelTitle: "Get in, choose the plan, then build the workspace.",
    bullets: [
      "Create the owner account.",
      "Choose the plan you want to trial.",
      "Add the business details.",
      "Open Command and start from real work.",
    ],
  },
  "/forgot-password": {
    h1: "Get back into Churvox.",
    intro: "Enter your email and we will send the reset link if an account exists.",
    panelKicker: "Account access",
    panelTitle: "Reset it, sign in, keep the day moving.",
    bullets: [
      "Use the email on the account.",
      "Check your inbox for the reset link.",
      "Create the new password.",
      "Return to your workspace.",
    ],
  },
  "/reset-password": {
    h1: "Set a new password.",
    intro: "Choose a new password and return to your Churvox workspace.",
    panelKicker: "Account access",
    panelTitle: "Secure the login, then get back to work.",
    bullets: [
      "Use a strong password.",
      "Keep it private.",
      "Sign in after the reset.",
      "Open the workspace again.",
    ],
  },
};

function setText(el, value) {
  if (el && value && el.textContent !== value) el.textContent = value;
}

function applyPublicCopy() {
  try {
    const path = window.location.pathname || "/";
    const copy = COPY_BY_PATH[path];
    if (!copy) return;

    const card = document.querySelector(".cvPublicAuthCard");
    const panel = document.querySelector(".cvPublicAuthPanel");
    if (!card && !panel) return;

    setText(card?.querySelector("h1"), copy.h1);
    setText(card?.querySelector(".cvPublicAuthIntro"), copy.intro);
    setText(panel?.querySelector("p"), copy.panelKicker);
    setText(panel?.querySelector("h2"), copy.panelTitle);

    const bullets = panel?.querySelectorAll("li") || [];
    copy.bullets.forEach((line, index) => setText(bullets[index], line));
  } catch {
    // Copy runtime must never block the app.
  }
}

applyPublicCopy();
window.addEventListener("load", applyPublicCopy);
window.addEventListener("popstate", applyPublicCopy);
window.addEventListener("hashchange", applyPublicCopy);
setTimeout(applyPublicCopy, 100);
setTimeout(applyPublicCopy, 400);
setTimeout(applyPublicCopy, 1000);

try {
  const observer = new MutationObserver(() => applyPublicCopy());
  observer.observe(document.documentElement, { childList: true, subtree: true });
} catch {}
