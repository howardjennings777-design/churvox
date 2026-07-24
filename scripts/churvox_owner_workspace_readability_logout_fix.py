from pathlib import Path

runtime_path = Path('frontend/src/runtime/churvoxExplicitLogoutGuardRuntime.js')
css_path = Path('frontend/src/churvox-office-lab/OfficeTeamOwnerReady.css')

runtime = runtime_path.read_text(encoding='utf-8')

runtime = runtime.replace(
    'const CACHE_RESET_VERSION = "owner-readable-logout-20260724-v4";',
    'const CACHE_RESET_VERSION = "owner-readable-logout-20260724-v5";'
)

old_install = '''function installOwnerReadableStyle() {
  if (typeof document === "undefined") return;
  let style = document.getElementById(OWNER_STYLE_ID);'''
new_install = '''function installOwnerReadableStyle() {
  if (typeof document === "undefined") return;
  if (isOwnerPath()) document.documentElement.classList.add("churvoxOwnerReadableMode");
  else document.documentElement.classList.remove("churvoxOwnerReadableMode");
  let style = document.getElementById(OWNER_STYLE_ID);'''
if old_install not in runtime:
    raise SystemExit('installOwnerReadableStyle anchor not found')
runtime = runtime.replace(old_install, new_install, 1)

old_auth_gate = '''  const fallback = document.getElementById(FALLBACK_LOGOUT_ID);
  if (!hasAuthProof()) {
    fallback?.remove();
    return;
  }

  const candidates = Array.from(document.querySelectorAll('''
new_auth_gate = '''  // The owner session can be cookie-only, so localStorage is not reliable proof.
  // On a protected owner route, always keep a visible logout control available.
  const fallback = document.getElementById(FALLBACK_LOGOUT_ID);

  const candidates = Array.from(document.querySelectorAll('''
if old_auth_gate not in runtime:
    raise SystemExit('cookie-only auth gate anchor not found')
runtime = runtime.replace(old_auth_gate, new_auth_gate, 1)

old_schedule = '''  scheduleOwnerRepair();
  window.addEventListener("load", scheduleOwnerRepair);'''
new_schedule = '''  scheduleOwnerRepair();
  window.setInterval(ensureOwnerLogout, 1500);
  window.addEventListener("load", scheduleOwnerRepair);'''
if old_schedule not in runtime:
    raise SystemExit('schedule anchor not found')
runtime = runtime.replace(old_schedule, new_schedule, 1)

old_css_anchor = '''  .cvOwnerReady {
    font-size: 18px !important;
    line-height: 1.55 !important;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
'''
new_css_anchor = '''  html.churvoxOwnerReadableMode,
  html.churvoxOwnerReadableMode body,
  html.churvoxOwnerReadableMode #root,
  .cvOwnerReady {
    font-size: 18px !important;
    line-height: 1.55 !important;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  html.churvoxOwnerReadableMode body :where(p, li, dd, dt, label, td, th),
  .cvOwnerReady :where(p, li, dd, dt, label, td, th) {
    font-size: 17px !important;
    line-height: 1.55 !important;
  }

  html.churvoxOwnerReadableMode body :where(button, a, input, textarea, select),
  .cvOwnerReady :where(button, a, input, textarea, select) {
    font-size: 16px !important;
    line-height: 1.4 !important;
  }

  html.churvoxOwnerReadableMode body :where(small),
  html.churvoxOwnerReadableMode body :where(.cvSiteScreen span, .cvSiteStatus span, .cvSiteTopbar span, .cvOwnerMoreMenu span, .cvCommandSlip span),
  .cvOwnerReady :where(small, .cvSiteScreen span, .cvSiteStatus span, .cvSiteTopbar span, .cvOwnerMoreMenu span, .cvCommandSlip span) {
    font-size: 15px !important;
    line-height: 1.45 !important;
  }
'''
if old_css_anchor not in runtime:
    raise SystemExit('runtime readable CSS anchor not found')
runtime = runtime.replace(old_css_anchor, new_css_anchor, 1)

runtime_path.write_text(runtime, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
marker = '/* owner-workspace-readable-logout-20260724-v5 */'
if marker not in css:
    css += f'''\n\n{marker}\nhtml.churvoxOwnerReadableMode body {{\n  font-size: 18px !important;\n  line-height: 1.55 !important;\n}}\n\nhtml.churvoxOwnerReadableMode body :where(.cvSiteScreen, .cvSiteStatus, .cvSitePanel, .cvSiteCard, .cvCommandSlip) :where(p, li, dd, dt, label, td, th) {{\n  font-size: 17px !important;\n  line-height: 1.55 !important;\n}}\n\nhtml.churvoxOwnerReadableMode body :where(.cvSiteScreen, .cvSiteStatus, .cvSitePanel, .cvSiteCard, .cvCommandSlip) small,\nhtml.churvoxOwnerReadableMode body :where(.cvSiteScreen, .cvSiteStatus, .cvSitePanel, .cvSiteCard, .cvCommandSlip) span {{\n  font-size: max(15px, .94rem) !important;\n  line-height: 1.45 !important;\n}}\n\nhtml.churvoxOwnerReadableMode body :where(button, a, input, textarea, select) {{\n  font-size: 16px !important;\n}}\n\nhtml.churvoxOwnerReadableMode .cvSiteTopbar {{\n  overflow: visible !important;\n  padding-right: 132px !important;\n}}\n\nhtml.churvoxOwnerReadableMode :where(.cvSiteLogout, .cvEmergencyLogoutPinned),\nhtml.churvoxOwnerReadableMode #churvox-owner-fallback-logout {{\n  position: fixed !important;\n  top: max(12px, env(safe-area-inset-top, 0px)) !important;\n  right: 12px !important;\n  z-index: 2147483000 !important;\n  display: inline-flex !important;\n  visibility: visible !important;\n  align-items: center !important;\n  justify-content: center !important;\n  width: 110px !important;\n  min-width: 110px !important;\n  max-width: 110px !important;\n  min-height: 44px !important;\n  margin: 0 !important;\n  padding: 0 15px !important;\n  border: 2px solid #f97316 !important;\n  border-radius: 999px !important;\n  color: #fff !important;\n  background: #17120e !important;\n  box-shadow: 0 12px 30px rgba(0,0,0,.34) !important;\n  opacity: 1 !important;\n  pointer-events: auto !important;\n  font-size: 16px !important;\n  font-weight: 950 !important;\n  line-height: 1 !important;\n  white-space: nowrap !important;\n}}\n'''
css_path.write_text(css, encoding='utf-8')

print('Applied owner workspace readable text and cookie-session logout fix.')
