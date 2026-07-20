import PUBLIC_PAGES from "../config/publicSeoPages.json";

const SITE_ORIGIN = "https://www.churvox.com";
const INDEX_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const NOINDEX_ROBOTS = "noindex, nofollow, noarchive, nosnippet";

function pathname() {
  const value = String(window.location.pathname || "/");
  return value.length > 1 ? value.replace(/\/+$/, "") : "/";
}

function meta(attribute, key) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  return node;
}

function setMeta(attribute, key, content) {
  meta(attribute, key).setAttribute("content", content);
}

function canonicalNode() {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }
  return node;
}

function canonicalUrl(value) {
  return value === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${value}`;
}

export function applyPublicSeo() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const page = PUBLIC_PAGES[pathname()];
  const canonical = canonicalNode();

  if (!page) {
    setMeta("name", "robots", NOINDEX_ROBOTS);
    setMeta("name", "googlebot", NOINDEX_ROBOTS);
    canonical.removeAttribute("href");
    return;
  }

  const href = canonicalUrl(page.canonical || pathname());
  document.title = page.title;
  setMeta("name", "description", page.description);
  setMeta("name", "robots", INDEX_ROBOTS);
  setMeta("name", "googlebot", INDEX_ROBOTS);
  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", "Churvox");
  setMeta("property", "og:title", page.title);
  setMeta("property", "og:description", page.description);
  setMeta("property", "og:url", href);
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", page.title);
  setMeta("name", "twitter:description", page.description);
  canonical.setAttribute("href", href);
}

if (typeof window !== "undefined" && !window.__CHURVOX_PUBLIC_SEO_RUNTIME__) {
  window.__CHURVOX_PUBLIC_SEO_RUNTIME__ = true;
  applyPublicSeo();
  window.addEventListener("popstate", () => setTimeout(applyPublicSeo, 0));
  window.addEventListener("hashchange", () => setTimeout(applyPublicSeo, 0));
  document.addEventListener("click", () => setTimeout(applyPublicSeo, 50), true);
}
