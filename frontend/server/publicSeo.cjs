const PUBLIC_PAGES = require("../src/config/publicSeoPages.json");

const SITE_ORIGIN = "https://www.churvox.com";
const INDEX_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const NOINDEX_ROBOTS = "noindex, nofollow, noarchive, nosnippet";

function normalizePathname(value) {
  let pathname = String(value || "/").split("?")[0] || "/";
  try { pathname = decodeURIComponent(pathname); } catch {}
  pathname = pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
  return pathname || "/";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function absoluteUrl(value) {
  const path = String(value || "/");
  return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function publicPage(pathname) {
  return PUBLIC_PAGES[normalizePathname(pathname)] || null;
}

function replaceTitle(html, title) {
  const tag = `<title>${escapeHtml(title)}</title>`;
  return /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, tag)
    : html.replace(/<\/head>/i, `${tag}\n</head>`);
}

function upsertMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\s+[^>]*${escapeRegExp(attribute)}=["']${escapeRegExp(key)}["'][^>]*>`, "i");
  const contentValue = escapeHtml(content);
  if (pattern.test(html)) {
    return html.replace(pattern, (tag) => {
      if (/\scontent=["'][\s\S]*?["']/i.test(tag)) {
        return tag.replace(/\scontent=["'][\s\S]*?["']/i, ` content="${contentValue}"`);
      }
      return tag.replace(/\s*\/?\s*>$/, ` content="${contentValue}" />`);
    });
  }
  return html.replace(/<\/head>/i, `  <meta ${attribute}="${escapeHtml(key)}" content="${contentValue}" />\n</head>`);
}

function upsertCanonical(html, href) {
  const pattern = /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;
  const tag = href ? `<link rel="canonical" href="${escapeHtml(href)}" />` : "";
  if (pattern.test(html)) return html.replace(pattern, tag);
  return href ? html.replace(/<\/head>/i, `  ${tag}\n</head>`) : html;
}

function removeExistingRouteSchema(html) {
  return html.replace(/\s*<script\s+type=["']application\/ld\+json["']\s+data-churvox-route-schema=["']true["']>[\s\S]*?<\/script>/i, "");
}

function routeSchema(page, canonical) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    description: page.description,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    about: { "@id": `${SITE_ORIGIN}/#organization` },
  };
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<script type="application/ld+json" data-churvox-route-schema="true">${json}</script>`;
}

function industryLinks() {
  const links = [
    ["Lawn and garden", "/industries/lawn-care"],
    ["Landscaping", "/industries/landscaping"],
    ["Cleaning", "/industries/cleaning"],
    ["Property maintenance", "/industries/property-maintenance"],
    ["Handyman and repairs", "/industries/handyman"],
    ["Painting", "/industries/painting"],
    ["Plumbing, electrical and HVAC", "/industries/plumbing-electrical-hvac"],
    ["Pest control", "/industries/pest-control"],
    ["Barber, hair and beauty", "/industries/barber-hairdresser"],
  ];
  return links.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("");
}

function renderPublicFallback(page) {
  const highlights = (page.highlights || []).map(([title, text]) => (
    `<article><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></article>`
  )).join("");

  return `<noscript data-churvox-route-fallback="true">
    <style>
      .cvSeoFallback{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;background:#f7f3ea;line-height:1.55;min-height:100vh}.cvSeoFallback *{box-sizing:border-box}.cvSeoFallback a{color:inherit}.cvSeoNav{padding:20px clamp(20px,6vw,72px);background:linear-gradient(110deg,#080d16 0%,#111827 62%,#3b1d0a 100%);color:#fff}.cvSeoNav>div{max-width:1160px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}.cvSeoBrand{font-size:22px;font-weight:950;text-decoration:none}.cvSeoNav nav{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;font-weight:800}.cvSeoNav nav a{color:#e2e8f0}.cvSeoNav nav a[href="/testers/"]{color:#fdba74}.cvSeoHero,.cvSeoBody,.cvSeoIndustries{max-width:1160px;margin:auto;padding:64px 22px}.cvSeoHero{padding-bottom:42px}.cvSeoEyebrow{display:block;margin-bottom:14px;color:#c2410c;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.cvSeoHero h1{max-width:940px;margin:0 0 20px;font-size:clamp(42px,7vw,76px);line-height:.98;letter-spacing:-.055em}.cvSeoHero p{max-width:850px;margin:0;color:#334155;font-size:20px;font-weight:650}.cvSeoActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.cvSeoActions a{display:inline-flex;padding:14px 20px;border-radius:12px;background:#f97316;color:#111827;font-weight:950;text-decoration:none}.cvSeoActions a+ a{background:#fff;border:1px solid #cbd5e1}.cvSeoBody{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding-top:20px;padding-bottom:50px}.cvSeoBody article{padding:22px;border:1px solid #d8dee8;border-radius:16px;background:#fff}.cvSeoBody h2{font-size:21px;margin:0 0 8px}.cvSeoBody p{color:#475569;margin:0}.cvSeoIndustries{border-top:1px solid #d8dee8;padding-top:42px}.cvSeoIndustries h2{font-size:32px;margin:0 0 10px}.cvSeoIndustries p{color:#475569}.cvSeoIndustryLinks{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:20px}.cvSeoIndustryLinks a{padding:14px;border:1px solid #d8dee8;border-radius:12px;background:#fff;font-weight:850;text-decoration:none}.cvSeoFooter{padding:30px 22px;border-top:1px solid #d8dee8;background:#fff}.cvSeoFooter>div{max-width:1160px;margin:auto;display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap}.cvSeoFooter nav{display:flex;gap:14px;flex-wrap:wrap}
    </style>
    <main class="cvSeoFallback">
      <header class="cvSeoNav"><div><a class="cvSeoBrand" href="/">Churvox</a><nav aria-label="Public navigation"><a href="/product">Product</a><a href="/pricing">Pricing</a><a href="/demo">Demo</a><a href="/testers/">Become a tester</a><a href="/login">Log in</a></nav></div></header>
      <section class="cvSeoHero"><span class="cvSeoEyebrow">${escapeHtml(page.eyebrow)}</span><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.intro)}</p><div class="cvSeoActions"><a href="/signup?plan=operator">Start 14-day trial</a><a href="/demo">See the Churvox demo</a></div></section>
      <section class="cvSeoBody" aria-label="Page details">${highlights}</section>
      <section class="cvSeoIndustries"><h2>Built for real service businesses.</h2><p>Choose the closest operating fit. The wording changes by profession; owner approval remains the same.</p><div class="cvSeoIndustryLinks">${industryLinks()}</div></section>
      <footer class="cvSeoFooter"><div><strong>Churvox · hello@churvox.com</strong><nav><a href="/about">About</a><a href="/security">Security</a><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></div></footer>
    </main>
  </noscript>`;
}

function renderPrivateFallback() {
  return `<noscript data-churvox-route-fallback="private"><main style="font-family:Inter,system-ui,sans-serif;max-width:760px;margin:80px auto;padding:24px;color:#111827"><h1>JavaScript is required to open this Churvox page.</h1><p>This account or app route is not published to search engines. Enable JavaScript to continue.</p><p><a href="/">Return to the Churvox website</a></p></main></noscript>`;
}

function replaceNoscript(html, fallback) {
  const pattern = /<noscript>[\s\S]*?<\/noscript>/i;
  if (pattern.test(html)) return html.replace(pattern, fallback);
  return html.replace(/<body([^>]*)>/i, `<body$1>${fallback}`);
}

function applyPublicMeta(html, page) {
  const canonical = absoluteUrl(page.canonical);
  let next = replaceTitle(html, page.title);
  next = upsertMeta(next, "name", "description", page.description);
  next = upsertMeta(next, "name", "robots", INDEX_ROBOTS);
  next = upsertMeta(next, "name", "googlebot", INDEX_ROBOTS);
  next = upsertMeta(next, "property", "og:type", "website");
  next = upsertMeta(next, "property", "og:site_name", "Churvox");
  next = upsertMeta(next, "property", "og:title", page.title);
  next = upsertMeta(next, "property", "og:description", page.description);
  next = upsertMeta(next, "property", "og:url", canonical);
  next = upsertMeta(next, "name", "twitter:card", "summary_large_image");
  next = upsertMeta(next, "name", "twitter:title", page.title);
  next = upsertMeta(next, "name", "twitter:description", page.description);
  next = upsertCanonical(next, canonical);
  next = removeExistingRouteSchema(next).replace(/<\/head>/i, `  ${routeSchema(page, canonical)}\n</head>`);
  next = replaceNoscript(next, renderPublicFallback(page));
  return next.replace(/<head>/i, "<head>\n<!-- CHURVOX_SERVER_ROUTE_SEO_20260720 -->");
}

function applyPrivateMeta(html) {
  let next = upsertMeta(html, "name", "robots", NOINDEX_ROBOTS);
  next = upsertMeta(next, "name", "googlebot", NOINDEX_ROBOTS);
  next = upsertCanonical(next, "");
  next = removeExistingRouteSchema(next);
  next = replaceNoscript(next, renderPrivateFallback());
  return next.replace(/<head>/i, "<head>\n<!-- CHURVOX_SERVER_ROUTE_NOINDEX_20260720 -->");
}

function renderRouteHtml(indexHtml, pathname) {
  const page = publicPage(pathname);
  return page ? applyPublicMeta(indexHtml, page) : applyPrivateMeta(indexHtml);
}

function routeSeoPolicy(pathname) {
  const page = publicPage(pathname);
  return {
    indexable: Boolean(page),
    robots: page ? INDEX_ROBOTS : NOINDEX_ROBOTS,
    page,
  };
}

module.exports = {
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  normalizePathname,
  publicPage,
  renderRouteHtml,
  routeSeoPolicy,
};
