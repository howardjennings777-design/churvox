const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PUBLIC_PAGES = require("../src/config/publicSeoPages.json");
const {
  NOINDEX_ROBOTS,
  publicPage,
  renderRouteHtml,
  routeSeoPolicy,
} = require("../server/publicSeo.cjs");

const indexHtml = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf-8");

function routeHtml(route) {
  return renderRouteHtml(indexHtml, route);
}

test("pricing response contains pricing content and route metadata before JavaScript", () => {
  const html = routeHtml("/pricing");
  assert.match(html, /CHURVOX_SERVER_ROUTE_SEO_20260720/);
  assert.match(html, /<title>Churvox pricing — Start, Crew, Operator and Command plans<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.churvox\.com\/pricing" \/>/);
  assert.match(html, /Pay for the level of admin Churvox handles\./);
  assert.match(html, /Start — \$39\/month \+ GST/);
  assert.match(html, /Command — \$299\/month \+ GST/);
  assert.doesNotMatch(html, /<h1>Your business handled\. Your decisions waiting\.<\/h1>/);
});

test("demo and trade responses expose distinct crawlable headings", () => {
  const demo = routeHtml("/demo");
  const cleaning = routeHtml("/industries/cleaning");
  assert.match(demo, /Watch Churvox handle a field service job\./);
  assert.match(demo, /Request and plan/);
  assert.match(cleaning, /Make recurring visits, access notes and proof easier to manage\./);
  assert.match(cleaning, /site checklists, key and access notes, cleaner updates/i);
  assert.match(cleaning, /https:\/\/www\.churvox\.com\/industries\/cleaning/);
  assert.notEqual(demo, cleaning);
});

test("every configured public route gets its own canonical, description and fallback", () => {
  for (const [route, page] of Object.entries(PUBLIC_PAGES)) {
    const html = routeHtml(route);
    assert.ok(publicPage(route), `${route} should resolve to public SEO data`);
    assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/title>`));
    assert.match(html, /name="description"/i, `${route} should have a description`);
    assert.match(html, /data-churvox-route-fallback="true"/i, `${route} should have a no-JavaScript fallback`);
    assert.match(html, /data-churvox-route-schema="true"/i, `${route} should have route schema`);
    assert.equal(routeSeoPolicy(route).indexable, true);
  }
});

test("account, app and unknown routes are noindex in the server response", () => {
  for (const route of ["/login", "/signup", "/dashboard", "/worker/today", "/invoice/private-token", "/not-a-real-page"]) {
    const html = routeHtml(route);
    assert.equal(routeSeoPolicy(route).indexable, false);
    assert.equal(routeSeoPolicy(route).robots, NOINDEX_ROBOTS);
    assert.match(html, /noindex, nofollow, noarchive, nosnippet/);
    assert.match(html, /data-churvox-route-fallback="private"/);
    assert.doesNotMatch(html, /rel="canonical"/);
  }
});
