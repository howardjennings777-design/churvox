// Final visual authority for the Churvox owner product.
// Keeps the app as a modern top-command workbench and re-applies after chunk CSS loads.

const STYLE_ID = 'churvox-product-premium-visual-runtime';

const css = `
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"]{
  --cvx-ink:#111513;
  --cvx-muted:#68736d;
  --cvx-line:rgba(17,21,19,.10);
  --cvx-paper:#f6f2ea;
  --cvx-card:rgba(255,255,252,.88);
  --cvx-orange:#f36b21;
  min-height:100vh!important;
  display:block!important;
  background:
    radial-gradient(circle at 8% -18%,rgba(243,107,33,.16),transparent 34%),
    radial-gradient(circle at 100% 0%,rgba(17,21,19,.08),transparent 30%),
    linear-gradient(180deg,#faf7f1 0%,#f1ece3 48%,#ebe5da 100%)!important;
  color:var(--cvx-ink)!important;
  overflow-x:hidden!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxTop{
  position:sticky!important;
  top:0!important;
  z-index:60!important;
  min-height:70px!important;
  display:grid!important;
  grid-template-columns:220px minmax(0,1fr) 170px!important;
  align-items:center!important;
  gap:18px!important;
  padding:12px 24px!important;
  background:linear-gradient(135deg,#0b0e0d 0%,#111713 52%,#351607 100%)!important;
  color:#fff!important;
  border-bottom:1px solid rgba(255,255,255,.09)!important;
  box-shadow:0 16px 42px rgba(17,21,19,.24)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxTop:before{
  content:""!important;
  position:absolute!important;
  inset:0!important;
  background:
    linear-gradient(115deg,transparent 0 58%,rgba(243,107,33,.18) 78%,rgba(243,107,33,.30) 100%),
    repeating-linear-gradient(135deg,rgba(255,255,255,.04) 0 1px,transparent 1px 18px)!important;
  opacity:1!important;
  pointer-events:none!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxBrand{
  padding:0!important;
  background:transparent!important;
  border:0!important;
  color:#fff!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxBrand i{
  width:34px!important;
  height:34px!important;
  border-radius:12px!important;
  background:linear-gradient(135deg,#ef4444,#f36b21 55%,#ffb15c)!important;
  box-shadow:0 12px 24px rgba(243,107,33,.28)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxBrand b{
  font-size:19px!important;
  letter-spacing:-.055em!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxBrand small,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxAccount small{
  color:#ffbf87!important;
  font-size:9px!important;
  letter-spacing:.10em!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxTitle h1{
  margin:0!important;
  color:#fff!important;
  font-size:25px!important;
  line-height:1!important;
  font-weight:1000!important;
  letter-spacing:-.055em!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxTitle p{
  margin:5px 0 0!important;
  max-width:900px!important;
  color:rgba(255,255,255,.74)!important;
  font-size:12px!important;
  line-height:1.25!important;
  font-weight:780!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxAccount{
  text-align:right!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxAccount b{
  color:#fff!important;
  font-size:13px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxNav{
  position:sticky!important;
  top:70px!important;
  z-index:55!important;
  height:auto!important;
  display:flex!important;
  flex-direction:row!important;
  gap:8px!important;
  padding:10px 24px!important;
  overflow-x:auto!important;
  border-right:0!important;
  border-bottom:1px solid var(--cvx-line)!important;
  background:rgba(250,247,241,.86)!important;
  backdrop-filter:blur(18px)!important;
  box-shadow:0 12px 28px rgba(17,21,19,.07)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxNav button{
  width:auto!important;
  flex:0 0 auto!important;
  min-height:36px!important;
  justify-content:center!important;
  border:1px solid rgba(17,21,19,.07)!important;
  border-radius:999px!important;
  padding:8px 13px!important;
  background:rgba(255,255,252,.78)!important;
  color:#34403a!important;
  font-size:12px!important;
  font-weight:950!important;
  box-shadow:none!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxNav button:hover{
  background:#fff!important;
  border-color:rgba(243,107,33,.25)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxNav button.active{
  color:#fff!important;
  border-color:#111713!important;
  background:#111713!important;
  box-shadow:0 10px 22px rgba(17,21,19,.18)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxWorkspace{
  width:min(1520px,100%)!important;
  max-width:1520px!important;
  margin:0 auto!important;
  padding:18px 26px 42px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPage{
  display:grid!important;
  grid-template-columns:repeat(12,minmax(0,1fr))!important;
  gap:14px!important;
  align-items:start!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHero{
  min-height:92px!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) minmax(250px,340px)!important;
  align-items:center!important;
  gap:14px!important;
  padding:16px 18px!important;
  border:1px solid rgba(255,255,255,.72)!important;
  border-left:4px solid var(--cvx-orange)!important;
  border-radius:22px!important;
  color:#fff!important;
  background:linear-gradient(135deg,rgba(17,21,19,.96),rgba(28,37,32,.95) 60%,rgba(92,37,13,.88))!important;
  box-shadow:0 16px 40px rgba(17,21,19,.14)!important;
  overflow:hidden!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHero:after{
  width:190px!important;
  height:190px!important;
  right:20px!important;
  top:-56px!important;
  border-radius:42px!important;
  background:radial-gradient(circle,rgba(243,107,33,.28),transparent 68%)!important;
  opacity:.9!important;
  transform:rotate(18deg)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHero small{
  margin-bottom:6px!important;
  padding:4px 7px!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.10)!important;
  color:#ffc08d!important;
  font-size:9px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHero h2{
  margin:0!important;
  max-width:900px!important;
  color:#fff!important;
  font-size:clamp(24px,2.7vw,36px)!important;
  line-height:1!important;
  letter-spacing:-.064em!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHero p{
  margin:7px 0 0!important;
  max-width:900px!important;
  color:rgba(255,255,255,.76)!important;
  font-size:12px!important;
  line-height:1.32!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHeroChips{
  gap:7px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHeroChips span{
  min-height:42px!important;
  display:grid!important;
  grid-template-columns:auto 1fr!important;
  gap:10px!important;
  align-items:center!important;
  padding:8px 10px!important;
  border:1px solid rgba(255,255,255,.13)!important;
  border-radius:14px!important;
  background:rgba(255,255,255,.075)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHeroChips b{
  color:#fff!important;
  font-size:17px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHeroChips small{
  color:rgba(255,230,211,.84)!important;
  font-size:9px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxToolbar,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPanel,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxKpis span,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPipeline>div,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPlans article{
  border:1px solid rgba(17,21,19,.075)!important;
  background:var(--cvx-card)!important;
  box-shadow:0 12px 30px rgba(17,21,19,.065)!important;
  backdrop-filter:blur(16px)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxToolbar{
  padding:9px!important;
  border-radius:18px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxToolbar button,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPanelHead button,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxRecordTop button,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxDrawerActions button{
  min-height:36px!important;
  border-radius:999px!important;
  padding:8px 12px!important;
  font-size:12px!important;
  font-weight:1000!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPanel{
  min-height:138px!important;
  border-radius:20px!important;
  padding:14px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPanel.dark{
  background:linear-gradient(135deg,#111713,#1e2924)!important;
  color:#fff!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPanelHead h3{
  font-size:17px!important;
  letter-spacing:-.04em!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxKpis span{
  min-height:68px!important;
  border-radius:18px!important;
  padding:12px 14px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxKpis b{
  font-size:22px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxList{
  gap:7px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxRow{
  min-height:52px!important;
  grid-template-columns:8px minmax(0,1fr) auto!important;
  padding:9px 10px!important;
  border:1px solid rgba(17,21,19,.075)!important;
  border-radius:15px!important;
  background:rgba(255,255,255,.70)!important;
  box-shadow:none!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxRow:hover{
  transform:translateY(-1px)!important;
  border-color:rgba(243,107,33,.35)!important;
  background:#fff!important;
  box-shadow:0 12px 26px rgba(17,21,19,.08)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxRow b{
  font-size:13px!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxRow small{
  font-size:11px!important;
  color:var(--cvx-muted)!important;
}

html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxField input,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxField textarea,
html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxField select{
  min-height:39px!important;
  border-radius:12px!important;
  font-size:13px!important;
  background:#fff!important;
}

@media(max-width:820px){
  html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxTop{grid-template-columns:1fr!important;min-height:102px!important;gap:6px!important;}
  html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxNav{top:102px!important;}
  html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxWorkspace{padding:12px!important;}
  html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxPage{grid-template-columns:1fr!important;}
  html.cvxPremiumActive body .cvxProduct[data-product-version="v2"] .cvxHero{grid-template-columns:1fr!important;}
}
`;

function applyPremiumVisual() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('cvxPremiumActive');
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  } else if (style.textContent !== css) {
    style.textContent = css;
  }
  if (style.parentNode === document.head && document.head.lastElementChild !== style) {
    document.head.appendChild(style);
  }
}

if (typeof window !== 'undefined' && !window.__CHURVOX_PRODUCT_PREMIUM_VISUAL_RUNTIME__) {
  window.__CHURVOX_PRODUCT_PREMIUM_VISUAL_RUNTIME__ = true;
  applyPremiumVisual();
  window.addEventListener('load', () => setTimeout(applyPremiumVisual, 80));
  window.addEventListener('hashchange', () => setTimeout(applyPremiumVisual, 80));
  window.addEventListener('popstate', () => setTimeout(applyPremiumVisual, 80));
  setTimeout(applyPremiumVisual, 300);
  setTimeout(applyPremiumVisual, 1200);
  setInterval(applyPremiumVisual, 2500);
}

export {};
