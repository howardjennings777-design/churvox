// Test-only branch server: serves the production build and proxies /api with fetch.
// This is never used by Render. It lets GitHub test the exact PR build against
// the real Churvox backend without browser CORS or cookie-domain differences.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const BUILD_DIR = path.join(__dirname, "build");
const BACKEND = String(process.env.PLAYWRIGHT_API_BASE || "https://grassley-backend.onrender.com").replace(/\/+$/, "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host", "content-length",
  "origin", "referer",
]);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function rewriteCookie(value) {
  return String(value || "")
    .replace(/;\s*Domain=[^;]+/gi, "")
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
}

function requestHeaders(req, urlPath) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (HOP.has(String(key).toLowerCase()) || value == null) continue;
    if (Array.isArray(value)) value.forEach((entry) => headers.append(key, entry));
    else headers.set(key, String(value));
  }
  headers.set("x-forwarded-host", "www.churvox.com");
  headers.set("x-forwarded-proto", "https");
  headers.set("x-churvox-proxy", "github-branch-test");

  if (urlPath === "/api/auth/login" || urlPath === "/api/auth/register" || headers.has("authorization")) {
    headers.delete("cookie");
  }
  return headers;
}

async function proxyApi(req, res, urlPath) {
  try {
    const target = new URL(req.url, BACKEND);
    const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readBody(req);
    const response = await fetch(target, {
      method: req.method,
      headers: requestHeaders(req, urlPath),
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (!HOP.has(key.toLowerCase()) && !["content-encoding", "content-length", "set-cookie"].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    responseHeaders["cache-control"] = "no-store";

    const cookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : [];
    if (cookies.length) responseHeaders["set-cookie"] = cookies.map(rewriteCookie);

    const responseBody = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, responseHeaders);
    res.end(responseBody);
  } catch (error) {
    console.error("BRANCH_TEST_API_PROXY_ERROR", urlPath, error?.message || error);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    }
    res.end(JSON.stringify({ detail: "Branch test proxy could not reach the Churvox API." }));
  }
}

function safeFile(urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(String(urlPath || "").split("?")[0]).replace(/^\/+/, "");
  } catch {
    return null;
  }
  const resolved = path.resolve(BUILD_DIR, clean || "index.html");
  return resolved.startsWith(BUILD_DIR) ? resolved : null;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const isIndex = path.basename(filePath) === "index.html";
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": isIndex ? "no-store, no-cache, must-revalidate" : filePath.includes(`${path.sep}static${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`).pathname;
    if (urlPath === "/api" || urlPath.startsWith("/api/")) {
      await proxyApi(req, res, urlPath);
      return;
    }

    let filePath = safeFile(urlPath);
    if (!filePath) {
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }
    if (urlPath.startsWith("/static/")) {
      res.writeHead(404, { "content-type": MIME[path.extname(urlPath).toLowerCase()] || "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end("");
      return;
    }
    const indexPath = path.join(BUILD_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      sendFile(res, indexPath);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    console.error("BRANCH_TEST_SERVER_ERROR", error?.message || error);
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Churvox branch test server running on ${PORT}`);
  console.log(`Churvox branch test API target ${BACKEND}`);
});
