// CHURVOX_FRONTEND_MIME_SERVER_20260530
// Serves React build with correct MIME types and no stale index caching.

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const BUILD_DIR = path.join(__dirname, "build");
const DEFAULT_BACKEND_URL = "https://churvox-backend.onrender.com";

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

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function clean(value) {
  return String(value || "").replace(/\/+$/, "");
}

function backendBaseUrl() {
  const configured =
    process.env.BACKEND_URL ||
    process.env.CHURVOX_BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    DEFAULT_BACKEND_URL;

  return clean(configured).replace(/\/api$/i, "");
}

function filterHeaders(headers = {}) {
  return Object.entries(headers).reduce((next, [key, value]) => {
    if (!HOP_BY_HOP_HEADERS.has(String(key).toLowerCase())) next[key] = value;
    return next;
  }, {});
}

function rewriteSetCookieHeader(value) {
  return String(value || "")
    .replace(/;\s*Domain=churvox-backend\.onrender\.com/gi, "")
    .replace(/;\s*Domain=\.onrender\.com/gi, "");
}

function proxyApiRequest(req, res, urlPath) {
  const base = backendBaseUrl();
  let target;

  try {
    target = new URL(req.url, base);
  } catch (err) {
    console.error("API_PROXY_BAD_TARGET", err);
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ detail: "API proxy target is invalid." }));
    return;
  }

  const client = target.protocol === "http:" ? http : https;
  const requestHeaders = filterHeaders(req.headers);
  requestHeaders.host = target.host;
  requestHeaders["x-forwarded-host"] = req.headers.host || "";
  requestHeaders["x-forwarded-proto"] = "https";
  requestHeaders["x-churvox-proxy"] = "frontend";

  const proxyReq = client.request(
    target,
    {
      method: req.method,
      headers: requestHeaders,
      timeout: 25000,
    },
    (proxyRes) => {
      const responseHeaders = filterHeaders(proxyRes.headers);

      if (responseHeaders["set-cookie"]) {
        const cookies = Array.isArray(responseHeaders["set-cookie"])
          ? responseHeaders["set-cookie"]
          : [responseHeaders["set-cookie"]];
        responseHeaders["set-cookie"] = cookies.map(rewriteSetCookieHeader);
      }

      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("timeout", () => {
    proxyReq.destroy(new Error(`API proxy timeout for ${urlPath}`));
  });

  proxyReq.on("error", (err) => {
    console.error("API_PROXY_ERROR", err);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ detail: "Churvox API is temporarily unreachable." }));
  });

  req.pipe(proxyReq);
}

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const resolved = path.resolve(BUILD_DIR, clean || "index.html");
  if (!resolved.startsWith(BUILD_DIR)) return null;
  return resolved;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";

  const isIndex = path.basename(filePath) === "index.html";
  const isStaticAsset = filePath.includes(`${path.sep}static${path.sep}`);

  res.setHeader("Content-Type", type);

  if (isIndex) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  } else if (isStaticAsset) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    res.setHeader("Cache-Control", "no-cache");
  }

  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (urlPath === "/api" || urlPath.startsWith("/api/")) {
      proxyApiRequest(req, res, urlPath);
      return;
    }

    let filePath = safePath(urlPath);

    if (!filePath) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }

    // Do not return index.html for missing hashed assets.
    // This avoids CSS/JS requests receiving HTML/text with the wrong MIME type.
    if (urlPath.startsWith("/static/")) {
      const ext = path.extname(urlPath).toLowerCase();
      const type = MIME[ext] || "text/plain; charset=utf-8";
      res.writeHead(404, {
        "Content-Type": type,
        "Cache-Control": "no-store",
      });
      res.end("");
      return;
    }

    // SPA route fallback.
    const indexPath = path.join(BUILD_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      sendFile(res, indexPath);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (err) {
    console.error("STATIC_SERVER_ERROR", err);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Churvox frontend server running on ${PORT}`);
  console.log(`Churvox API proxy target ${backendBaseUrl()}`);
});
