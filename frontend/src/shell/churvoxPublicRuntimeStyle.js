export const CHURVOX_PUBLIC_RUNTIME_STYLE = String.raw`
/* PHASE_311_RUNTIME_PUBLIC_LOGIN_THEME_FORCE */

html,
body,
#root {
  background: #050506 !important;
}

.cx-public,
.cx-public-landing,
.cx-command-first-page,
.cx-clean-landing {
  min-height: 100vh !important;
  width: 100% !important;
  color: #faf7f0 !important;
  background:
    radial-gradient(circle at 8% 0%, rgba(240, 138, 42, 0.30), transparent 30rem),
    radial-gradient(circle at 92% 8%, rgba(240, 138, 42, 0.18), transparent 36rem),
    linear-gradient(135deg, #050506 0%, #0b0b0d 55%, #190d08 100%) !important;
  overflow-x: hidden !important;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

.cx-public *,
.cx-public-landing *,
.cx-command-first-page * {
  box-sizing: border-box !important;
}

.cx-grid-bg {
  position: fixed !important;
  inset: 0 !important;
  pointer-events: none !important;
  opacity: 0.22 !important;
  background:
    linear-gradient(rgba(250, 247, 240, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(250, 247, 240, 0.045) 1px, transparent 1px) !important;
  background-size: 46px 46px !important;
  mask-image: linear-gradient(180deg, black, transparent 84%) !important;
}

.cx-glow {
  position: fixed !important;
  pointer-events: none !important;
  border-radius: 999px !important;
  filter: blur(38px) !important;
  opacity: 0.44 !important;
}

.cx-glow-a {
  width: 390px !important;
  height: 390px !important;
  left: -110px !important;
  top: -110px !important;
  background: rgba(240, 138, 42, 0.4) !important;
}

.cx-glow-b {
  width: 500px !important;
  height: 500px !important;
  right: -140px !important;
  top: 70px !important;
  background: rgba(214, 94, 32, 0.32) !important;
}

.cx-public-nav,
.cx-clean-nav {
  position: sticky !important;
  top: 0 !important;
  z-index: 90 !important;
  width: 100% !important;
  min-height: 74px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 18px !important;
  padding: 0 clamp(16px, 4vw, 64px) !important;
  margin: 0 !important;
  border-bottom: 1px solid rgba(250, 247, 240, 0.13) !important;
  background: rgba(5, 5, 6, 0.84) !important;
  box-shadow: none !important;
  backdrop-filter: blur(18px) !important;
}

.cx-logo-link,
.cx-logo,
.cx-public-nav .cx-logo-link,
.cx-clean-nav .cx-logo-link {
  color: #faf7f0 !important;
  text-decoration: none !important;
}

.cx-logo strong,
.cx-logo span {
  color: #faf7f0 !important;
}

.cx-logo span {
  color: #f08a2a !important;
}

.cx-logo-mark {
  background:
    radial-gradient(circle at 35% 32%, #ffb46a, transparent 35%),
    linear-gradient(145deg, #f08a2a 0%, #d65e20 52%, #873214 100%) !important;
  box-shadow: 0 16px 38px rgba(240, 138, 42, 0.26) !important;
}

.cx-logo-mark i {
  display: none !important;
}

.cx-public-nav nav,
.cx-clean-nav nav {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: clamp(10px, 1.8vw, 26px) !important;
  flex-wrap: wrap !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.cx-public-nav nav a,
.cx-public-nav button,
.cx-clean-nav a,
.cx-clean-nav button {
  color: rgba(250, 247, 240, 0.82) !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  text-decoration: none !important;
  font-size: 0.86rem !important;
  font-weight: 850 !important;
  white-space: nowrap !important;
  padding: 0 !important;
}

.cx-public-nav button:last-child,
.cx-clean-nav button:nth-last-child(2),
.cx-clean-actions .cx-tour-cta,
.cx-clean-actions a:first-of-type,
.cx-clean-pricing article button,
.cx-clean-final a:first-child,
.cx-auth-card button[type="submit"],
.cx-clean-access button[type="submit"],
.cx-clean-access form button[type="submit"],
.cx-clean-access article button[type="submit"] {
  min-height: 42px !important;
  border-radius: 13px !important;
  padding: 0 18px !important;
  color: #fff8f0 !important;
  border: 1px solid rgba(240, 138, 42, 0.46) !important;
  background: linear-gradient(135deg, #f08a2a 0%, #d65e20 48%, #873214 100%) !important;
  box-shadow: 0 18px 44px rgba(240, 138, 42, 0.24) !important;
}

.cx-hero,
.cx-clean-hero {
  position: relative !important;
  z-index: 2 !important;
  width: 100% !important;
  max-width: none !important;
  min-height: calc(100vh - 74px) !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, 520px) !important;
  gap: clamp(28px, 5vw, 76px) !important;
  align-items: center !important;
  padding: clamp(42px, 7vw, 96px) clamp(16px, 5vw, 72px) !important;
  margin: 0 !important;
}

.cx-hero-copy,
.cx-clean-hero-copy {
  min-width: 0 !important;
  min-height: auto !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.cx-clean-pill,
.cx-clean-section > header span,
.cx-clean-access span,
.cx-clean-final span,
.cx-clean-movie-top span,
.cx-hero-copy > span,
.cx-auth-card > span {
  display: inline-flex !important;
  align-items: center !important;
  gap: 10px !important;
  color: #f08a2a !important;
  text-transform: uppercase !important;
  letter-spacing: 0.16em !important;
  font-size: 0.72rem !important;
  font-weight: 950 !important;
}

.cx-hero h1,
.cx-clean-hero h1,
.cx-clean-section h2,
.cx-clean-access h2,
.cx-clean-final h2 {
  color: #faf7f0 !important;
  font-family: Georgia, "Times New Roman", serif !important;
  letter-spacing: -0.065em !important;
  line-height: 0.92 !important;
}

.cx-hero h1,
.cx-clean-hero h1 {
  max-width: 960px !important;
  margin: 16px 0 20px !important;
  font-size: clamp(3.3rem, 7.6vw, 7.4rem) !important;
}

.cx-hero h1 em,
.cx-clean-hero h1 em,
.cx-clean-section h2 em,
.cx-clean-access h2 em,
.cx-clean-final h2 em {
  color: #f08a2a !important;
  font-style: normal !important;
}

.cx-hero p,
.cx-clean-hero p {
  max-width: 760px !important;
  color: rgba(250, 247, 240, 0.76) !important;
  font-size: clamp(1rem, 1.2vw, 1.15rem) !important;
  line-height: 1.62 !important;
  font-weight: 620 !important;
}

.cx-clean-actions,
.cx-hero-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 12px !important;
  margin-top: 28px !important;
}

.cx-clean-actions button,
.cx-clean-actions a,
.cx-clean-final a,
.cx-hero-actions a,
.cx-hero-actions button {
  min-height: 44px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 13px !important;
  padding: 0 18px !important;
  text-decoration: none !important;
  font-weight: 900 !important;
}

.cx-clean-actions a,
.cx-clean-final a,
.cx-hero-actions a {
  border: 1px solid rgba(250, 247, 240, 0.13) !important;
  color: #faf7f0 !important;
  background: rgba(250, 247, 240, 0.045) !important;
}

.cx-clean-trust-row {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 10px !important;
  margin-top: 22px !important;
}

.cx-clean-trust-row b {
  border: 1px solid rgba(250, 247, 240, 0.13) !important;
  border-radius: 999px !important;
  padding: 8px 12px !important;
  color: rgba(250, 247, 240, 0.84) !important;
  background: rgba(250, 247, 240, 0.04) !important;
  font-size: 0.78rem !important;
}

.cx-clean-movie,
.cx-operator-preview,
.cx-auth-card,
.cx-clean-section article,
.cx-clean-pricing article,
.cx-clean-access form,
.cx-clean-access article,
.cx-clean-access aside,
.cx-clean-access > div:last-child,
.cx-clean-final,
.cx-flow article,
.cx-feature-list article {
  border: 1px solid rgba(250, 247, 240, 0.13) !important;
  background:
    radial-gradient(circle at 100% 0%, rgba(240, 138, 42, 0.14), transparent 16rem),
    linear-gradient(180deg, rgba(250, 247, 240, 0.08), rgba(250, 247, 240, 0.035)),
    rgba(9, 9, 10, 0.86) !important;
  color: #faf7f0 !important;
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.34) !important;
  backdrop-filter: blur(18px) !important;
}

.cx-clean-movie,
.cx-operator-preview,
.cx-auth-card {
  border-radius: clamp(24px, 2.2vw, 36px) !important;
  padding: clamp(22px, 3vw, 34px) !important;
}

.cx-clean-movie h2,
.cx-operator-preview h2,
.cx-auth-card h2 {
  margin: 20px 0 12px !important;
  color: #faf7f0 !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: clamp(2rem, 3vw, 3.1rem) !important;
  line-height: 0.98 !important;
  letter-spacing: -0.05em !important;
}

.cx-clean-movie p,
.cx-operator-preview p,
.cx-auth-card p,
.cx-clean-section article p,
.cx-clean-pricing article p,
.cx-clean-access p {
  color: rgba(250, 247, 240, 0.72) !important;
  line-height: 1.58 !important;
}

.cx-clean-section,
.cx-flow,
.cx-features,
.cx-clean-pricing,
.cx-clean-runs,
.cx-clean-how {
  position: relative !important;
  z-index: 2 !important;
  width: 100% !important;
  max-width: none !important;
  padding: clamp(44px, 6vw, 86px) clamp(16px, 5vw, 72px) !important;
  border-top: 1px solid rgba(250, 247, 240, 0.13) !important;
  margin: 0 !important;
}

.cx-clean-section > header,
.cx-clean-pricing > header,
.cx-clean-runs > header,
.cx-clean-how > header {
  max-width: 980px !important;
  margin-bottom: 28px !important;
}

.cx-clean-section h2,
.cx-clean-access h2,
.cx-clean-final h2 {
  margin: 12px 0 14px !important;
  font-size: clamp(2.4rem, 5vw, 5.2rem) !important;
}

.cx-clean-how > div,
.cx-clean-runs > div,
.cx-clean-pricing > div,
.cx-flow,
.cx-feature-list {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)) !important;
  gap: 14px !important;
}

.cx-clean-section article,
.cx-clean-pricing article,
.cx-flow article,
.cx-feature-list article {
  min-width: 0 !important;
  border-radius: 24px !important;
  padding: 22px !important;
}

.cx-clean-section article h3,
.cx-clean-pricing article h3,
.cx-flow article h3,
.cx-feature-list article h3 {
  color: #faf7f0 !important;
  font-size: 1.3rem !important;
}

.cx-clean-pricing article strong {
  display: block !important;
  color: #f08a2a !important;
  font-family: Georgia, "Times New Roman", serif !important;
  font-size: 3rem !important;
  line-height: 1 !important;
  margin: 10px 0 !important;
}

.cx-clean-access {
  position: relative !important;
  z-index: 2 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 500px) !important;
  gap: clamp(24px, 4vw, 58px) !important;
  align-items: center !important;
  padding: clamp(44px, 6vw, 86px) clamp(16px, 5vw, 72px) !important;
  border-top: 1px solid rgba(250, 247, 240, 0.13) !important;
}

.cx-auth-card input,
.cx-auth-card textarea,
.cx-auth-card select,
.cx-clean-access input,
.cx-clean-access textarea,
.cx-clean-access select {
  width: 100% !important;
  min-height: 48px !important;
  border: 1px solid rgba(250, 247, 240, 0.13) !important;
  border-radius: 13px !important;
  background: rgba(5, 5, 6, 0.84) !important;
  color: #faf7f0 !important;
  padding: 0 14px !important;
  outline: 0 !important;
}

.cx-auth-card label,
.cx-clean-access label {
  display: grid !important;
  gap: 7px !important;
  margin-top: 14px !important;
  color: rgba(250, 247, 240, 0.82) !important;
  font-weight: 850 !important;
}

.cx-clean-final {
  position: relative !important;
  z-index: 2 !important;
  margin: clamp(20px, 5vw, 72px) clamp(16px, 5vw, 72px) !important;
  border-radius: 34px !important;
  padding: clamp(32px, 5vw, 72px) !important;
}

@media (max-width: 980px) {
  .cx-public-nav,
  .cx-clean-nav {
    align-items: flex-start !important;
    flex-direction: column !important;
    padding: 14px 16px !important;
  }

  .cx-public-nav nav,
  .cx-clean-nav nav {
    width: 100% !important;
    justify-content: flex-start !important;
    overflow-x: auto !important;
    flex-wrap: nowrap !important;
  }

  .cx-hero,
  .cx-clean-hero,
  .cx-clean-access {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 640px) {
  .cx-public-nav nav a:nth-child(n+3),
  .cx-clean-nav nav a:nth-child(n+3) {
    display: none !important;
  }

  .cx-hero h1,
  .cx-clean-hero h1,
  .cx-clean-section h2,
  .cx-clean-access h2,
  .cx-clean-final h2 {
    font-size: clamp(2.6rem, 13vw, 4.2rem) !important;
  }

  .cx-clean-actions,
  .cx-hero-actions {
    display: grid !important;
  }

  .cx-clean-actions > *,
  .cx-hero-actions > * {
    width: 100% !important;
  }
}
`;
