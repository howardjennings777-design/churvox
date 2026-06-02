/*
  CHURVOX LAUNCH FORCE RUNTIME
  This style is injected into the browser after the app loads, so it wins over old CSS/theme files.
  Purpose: readable words, one clean launch theme, no dark-on-dark cards.
*/

const css = `
:root {
  --cv-bg: #f5f7f1;
  --cv-ink: #0f172a;
  --cv-muted: #475569;
  --cv-dark: #143658;
  --cv-dark-strong: #0f1722;
  --cv-border: #dbe4f0;
  --cv-white: #ffffff;
  --cv-cyan: #67e8f9;
  --cv-blue: #2563eb;
  --cv-green: #16a34a;
  --cv-amber: #f59e0b;
  --cv-red: #dc2626;
}

html,
body,
#root {
  background: var(--cv-bg) !important;
  color: var(--cv-ink) !important;
}

body {
  -webkit-font-smoothing: antialiased !important;
  text-rendering: geometricPrecision !important;
}

main,
main.fixed,
main.fixed.inset-0 {
  background: var(--cv-bg) !important;
  color: var(--cv-ink) !important;
  padding-bottom: max(130px, env(safe-area-inset-bottom)) !important;
}

/* Every normal light card must be dark readable text */
main [class*="bg-white"],
main [class*="bg-slate-50"],
main [class*="bg-slate-100"],
main [class*="bg-blue-50"],
main [class*="bg-emerald-50"],
main [class*="bg-amber-50"],
main [class*="bg-red-50"],
main [class*="bg-[#f5f7f1]"],
main [class*="bg-[#f8fafc]"] {
  background-color: #ffffff !important;
  color: var(--cv-ink) !important;
  border-color: var(--cv-border) !important;
}

main [class*="bg-white"] :is(h1,h2,h3,h4,p,div,span,label,small,strong,input,textarea,select),
main [class*="bg-slate-50"] :is(h1,h2,h3,h4,p,div,span,label,small,strong,input,textarea,select),
main [class*="bg-slate-100"] :is(h1,h2,h3,h4,p,div,span,label,small,strong,input,textarea,select),
main [class*="bg-blue-50"] :is(h1,h2,h3,h4,p,div,span,label,small,strong,input,textarea,select),
main [class*="bg-emerald-50"] :is(h1,h2,h3,h4,p,div,span,label,small,strong,input,textarea,select),
main [class*="bg-amber-50"] :is(h1,h2,h3,h4,p,div,span,label,small,strong,input,textarea,select),
main [class*="bg-red-50"] :is(h1,h2,h3,h4,p,div,span,label,small,strong,input,textarea,select) {
  color: var(--cv-ink) !important;
  opacity: 1 !important;
  text-shadow: none !important;
}

/* Dark command cards must be white readable text */
main [class*="bg-slate-950"],
main [class*="bg-slate-900"],
main [class*="bg-[#143658]"],
main [class*="bg-[#0f1722]"],
main [class*="bg-[#0b2545]"],
main [class*="bg-[#0f2f4f]"],
main [class*="bg-[#0c2b49]"] {
  background-color: var(--cv-dark) !important;
  color: var(--cv-white) !important;
  border-color: rgba(255,255,255,.16) !important;
}

main [class*="bg-slate-950"] :is(h1,h2,h3,h4,p,div,span,label,small,strong),
main [class*="bg-slate-900"] :is(h1,h2,h3,h4,p,div,span,label,small,strong),
main [class*="bg-[#143658]"] :is(h1,h2,h3,h4,p,div,span,label,small,strong),
main [class*="bg-[#0f1722]"] :is(h1,h2,h3,h4,p,div,span,label,small,strong),
main [class*="bg-[#0b2545]"] :is(h1,h2,h3,h4,p,div,span,label,small,strong),
main [class*="bg-[#0f2f4f]"] :is(h1,h2,h3,h4,p,div,span,label,small,strong),
main [class*="bg-[#0c2b49]"] :is(h1,h2,h3,h4,p,div,span,label,small,strong) {
  color: var(--cv-white) !important;
  opacity: 1 !important;
  text-shadow: none !important;
}

/* White pills/cards inside dark panels still need dark text */
main [class*="bg-slate-950"] [class*="bg-white"],
main [class*="bg-slate-900"] [class*="bg-white"],
main [class*="bg-[#143658]"] [class*="bg-white"],
main [class*="bg-[#0f1722]"] [class*="bg-white"],
main [class*="bg-slate-950"] [class*="bg-slate-50"],
main [class*="bg-slate-900"] [class*="bg-slate-50"],
main [class*="bg-[#143658]"] [class*="bg-slate-50"],
main [class*="bg-[#0f1722]"] [class*="bg-slate-50"] {
  background-color: #ffffff !important;
  color: var(--cv-ink) !important;
}

main [class*="bg-slate-950"] [class*="bg-white"] *,
main [class*="bg-slate-900"] [class*="bg-white"] *,
main [class*="bg-[#143658]"] [class*="bg-white"] *,
main [class*="bg-[#0f1722]"] [class*="bg-white"] *,
main [class*="bg-slate-950"] [class*="bg-slate-50"] *,
main [class*="bg-slate-900"] [class*="bg-slate-50"] *,
main [class*="bg-[#143658]"] [class*="bg-slate-50"] *,
main [class*="bg-[#0f1722]"] [class*="bg-slate-50"] * {
  color: var(--cv-ink) !important;
}

/* Buttons */
main button,
main a {
  opacity: 1 !important;
  text-shadow: none !important;
}

main button[class*="bg-blue"],
main a[class*="bg-blue"],
main button[class*="bg-emerald"],
main a[class*="bg-emerald"],
main button[class*="bg-slate-950"],
main a[class*="bg-slate-950"],
main button[class*="bg-[#143658]"],
main a[class*="bg-[#143658]"] {
  color: #ffffff !important;
}

main button[class*="bg-cyan"],
main a[class*="bg-cyan"],
main button[class*="bg-amber"],
main a[class*="bg-amber"],
main button[class*="bg-white"],
main a[class*="bg-white"] {
  color: var(--cv-ink) !important;
}

/* Inputs */
main input,
main textarea,
main select {
  background: #ffffff !important;
  color: var(--cv-ink) !important;
  border-color: var(--cv-border) !important;
}

main input::placeholder,
main textarea::placeholder {
  color: #64748b !important;
  opacity: 1 !important;
}

/* Labels and tiny words must not vanish */
main [class*="text-slate-300"],
main [class*="text-slate-400"],
main [class*="text-slate-500"],
main [class*="text-blue-300"],
main [class*="text-blue-400"],
main [class*="text-cyan-200"] {
  opacity: 1 !important;
}

/* Make laptop/tablet text readable */
main h1 {
  letter-spacing: -0.045em !important;
}

main h2 {
  letter-spacing: -0.035em !important;
}

main p,
main div,
main span,
main label,
main button,
main a {
  line-height: 1.35 !important;
}

/* Command pages should not hide behind the Windows/browser bottom bar */
main article,
main section,
main aside {
  overflow-wrap: anywhere !important;
}

@media (max-width: 1280px) {
  main .text-\\[10px\\],
  main .text-xs {
    font-size: 0.78rem !important;
    line-height: 1.15rem !important;
  }

  main .text-sm {
    font-size: 0.94rem !important;
    line-height: 1.38rem !important;
  }
}

@media (max-width: 900px) {
  main,
  main.fixed,
  main.fixed.inset-0 {
    padding: 12px !important;
    padding-bottom: 140px !important;
  }

  main h1 {
    font-size: clamp(2rem, 7.2vw, 3rem) !important;
    line-height: 1 !important;
  }

  main h2 {
    font-size: clamp(1.35rem, 5vw, 2rem) !important;
    line-height: 1.08 !important;
  }

  main [class*="rounded-[32px]"],
  main [class*="rounded-[34px]"],
  main [class*="rounded-[28px]"],
  main [class*="rounded-[24px]"] {
    border-radius: 20px !important;
  }
}
`;

function applyChurvoxLaunchForce() {
  if (typeof document === "undefined") return;
  let el = document.getElementById("churvox-launch-force-runtime");
  if (!el) {
    el = document.createElement("style");
    el.id = "churvox-launch-force-runtime";
    document.head.appendChild(el);
  }
  el.textContent = css;
}

applyChurvoxLaunchForce();

if (typeof window !== "undefined") {
  window.addEventListener("load", applyChurvoxLaunchForce);
  setTimeout(applyChurvoxLaunchForce, 500);
  setTimeout(applyChurvoxLaunchForce, 1500);
}
