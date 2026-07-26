// CHURVOX_FRONTEND_MIME_SERVER_20260723_AUTH_PROXY_BODY_FIX
// Serves React build with correct MIME types, same-origin API proxying and no stale index caching.

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const BUILD_DIR = path.join(__dirname, "build");
const DEFAULT_BACKEND_URL = "https://grassley-backend.onrender.com";

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
  return clean(DEFAULT_BACKEND_URL);
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
    .replace(/;\s*Domain=grassley-backend\.onrender\.com/gi, "")
    .replace(/;\s*Domain=\.onrender\.com/gi, "");
}

function bufferedResponseHeaders(headers = {}, body = Buffer.alloc(0), extraHeaders = {}) {
  const next = filterHeaders(headers);
  for (const key of Object.keys(next)) {
    const lower = String(key).toLowerCase();
    if (lower === "content-length" || lower === "content-encoding" || lower === "transfer-encoding") {
      delete next[key];
    }
  }
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body || ""));
  next["content-length"] = String(bodyBuffer.length);
  return { ...next, ...extraHeaders };
}

function sendJson(res, statusCode, body, extraHeaders = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(payload.length),
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(payload);
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end("");
}

function readRequestBody(req, done) {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  req.on("end", () => done(null, Buffer.concat(chunks)));
  req.on("error", (err) => done(err));
}

function normalizeCheckoutProxyResponse(req, res, urlPath) {
  readRequestBody(req, (readErr, bodyBuffer) => {
    if (readErr) {
      console.error("CHECKOUT_PROXY_READ_ERROR", readErr);
      sendJson(res, 502, { success: false, detail: "Could not read checkout request body." });
      return;
    }

    const base = backendBaseUrl();
    let target;
    try {
      target = new URL(req.url, base);
    } catch (err) {
      console.error("CHECKOUT_PROXY_BAD_TARGET", err);
      sendJson(res, 502, { success: false, detail: "Checkout proxy target is invalid." });
      return;
    }

    const client = target.protocol === "http:" ? http : https;
    const requestHeaders = filterHeaders(req.headers);
    requestHeaders.host = target.host;
    requestHeaders["x-forwarded-host"] = req.headers.host || "";
    requestHeaders["x-forwarded-proto"] = "https";
    requestHeaders["x-churvox-proxy"] = "frontend-checkout-normalizer";
    requestHeaders["content-length"] = String(bodyBuffer.length);
    requestHeaders["accept-encoding"] = "identity";
    if (requestHeaders.authorization || requestHeaders.Authorization) {
      delete requestHeaders.cookie;
      delete requestHeaders.Cookie;
    }

    const proxyReq = client.request(
      target,
      {
        method: req.method,
        headers: requestHeaders,
        timeout: 25000,
      },
      (proxyRes) => {
        const responseHeaders = filterHeaders(proxyRes.headers);
        const chunks = [];

        proxyRes.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        proxyRes.on("end", () => {
          const statusCode = proxyRes.statusCode || 502;
          const location = responseHeaders.location || responseHeaders.Location || "";
          const responseBuffer = Buffer.concat(chunks);
          const responseText = responseBuffer.toString("utf-8");

          let cookieHeaders = {};
          if (responseHeaders["set-cookie"]) {
            const cookies = Array.isArray(responseHeaders["set-cookie"])
              ? responseHeaders["set-cookie"]
              : [responseHeaders["set-cookie"]];
            cookieHeaders["set-cookie"] = cookies.map(rewriteSetCookieHeader);
          }

          if (statusCode >= 300 && statusCode < 400 && location) {
            sendJson(res, 200, {
              success: true,
              url: location,
              checkout_url: location,
              proxied_redirect: true,
              status: statusCode,
            }, cookieHeaders);
            return;
          }

          if (!responseText.trim()) {
            sendJson(res, statusCode >= 400 ? statusCode : 502, {
              success: false,
              detail: "Checkout backend returned an empty response.",
              status: statusCode,
              location: location || null,
              endpoint: urlPath,
            }, cookieHeaders);
            return;
          }

          const contentType = responseHeaders["content-type"] || responseHeaders["Content-Type"] || "";
          if (contentType.includes("application/json")) {
            res.writeHead(statusCode, bufferedResponseHeaders(responseHeaders, responseBuffer, {
              "cache-control": "no-store",
              ...cookieHeaders,
            }));
            res.end(responseBuffer);
            return;
          }

          sendJson(res, statusCode >= 400 ? statusCode : 502, {
            success: false,
            detail: "Checkout backend returned non-JSON response.",
            status: statusCode,
            location: location || null,
            body: responseText.slice(0, 500),
          }, cookieHeaders);
        });
      }
    );

    proxyReq.on("timeout", () => {
      proxyReq.destroy(new Error(`Checkout proxy timeout for ${urlPath}`));
    });

    proxyReq.on("error", (err) => {
      console.error("CHECKOUT_PROXY_ERROR", err);
      if (!res.headersSent) {
        sendJson(res, 502, { success: false, detail: "Checkout API is temporarily unreachable." });
      }
    });

    proxyReq.end(bodyBuffer);
  });
}

function proxyApiRequest(req, res, urlPath) {
  if (req.method === "POST" && urlPath === "/api/billing/create-checkout-session") {
    normalizeCheckoutProxyResponse(req, res, urlPath);
    return;
  }

  const base = backendBaseUrl();
  let target;

  try {
    target = new URL(req.url, base);
  } catch (err) {
    console.error("API_PROXY_BAD_TARGET", err);
    sendJson(res, 502, { detail: "API proxy target is invalid." });
    return;
  }

  const client = target.protocol === "http:" ? http : https;
  const requestHeaders = filterHeaders(req.headers);
  const bufferedLogin = req.method === "POST" && urlPath === "/api/auth/login";
  requestHeaders.host = target.host;
  requestHeaders["x-forwarded-host"] = req.headers.host || "";
  requestHeaders["x-forwarded-proto"] = "https";
  requestHeaders["x-churvox-proxy"] = "frontend";
  if (bufferedLogin) requestHeaders["accept-encoding"] = "identity";

  // Login and signup must never forward an old browser auth cookie.
  // Otherwise one account can remain active when another email is typed.
  if (urlPath === "/api/auth/login" || urlPath === "/api/auth/register" || urlPath === "/api/worker/auth/login") {
    delete requestHeaders.cookie;
    delete requestHeaders.Cookie;
  }
  if (requestHeaders.authorization || requestHeaders.Authorization) {
    delete requestHeaders.cookie;
    delete requestHeaders.Cookie;
  }

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

      if (bufferedLogin) {
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        proxyRes.on("end", () => {
          const bodyBuffer = Buffer.concat(chunks);
          const bodyText = bodyBuffer.toString("utf-8");
          let statusCode = proxyRes.statusCode || 502;

          try {
            const data = JSON.parse(bodyText || "{}");
            const detail = String(data.detail || data.message || "").toLowerCase();
            const hasRealLogin =
              Boolean(data.token || data.access_token || data.auth_token) ||
              Boolean(data.user?.email || data.email || data.id || data._id);

            if (statusCode < 400 && !hasRealLogin && (
              detail.includes("invalid email") ||
              detail.includes("invalid password") ||
              detail.includes("please complete your account setup")
            )) {
              statusCode = detail.includes("please complete") ? 403 : 401;
            }
          } catch {
            statusCode = statusCode < 400 ? 502 : statusCode;
          }

          if (!bodyBuffer.length) {
            sendJson(res, statusCode >= 400 ? statusCode : 502, {
              success: false,
              detail: "Login backend returned an empty response.",
            }, responseHeaders["set-cookie"] ? { "set-cookie": responseHeaders["set-cookie"] } : {});
            return;
          }

          res.writeHead(statusCode, bufferedResponseHeaders(responseHeaders, bodyBuffer, {
            "cache-control": "no-store",
          }));
          res.end(bodyBuffer);
        });
        return;
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
      sendJson(res, 502, { detail: "Churvox API is temporarily unreachable." });
    }
  });

  req.pipe(proxyReq);
}

function safePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const resolved = path.resolve(BUILD_DIR, cleanPath || "index.html");
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

function workerFallbackPath(urlPath) {
  if (urlPath === "/worker/today" || urlPath === "/worker/today/") {
    return path.join(BUILD_DIR, "worker", "today", "index.html");
  }
  if (urlPath === "/worker/jobs" || urlPath === "/worker/jobs/") {
    return path.join(BUILD_DIR, "worker", "jobs", "index.html");
  }
  return null;
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (req.method === "GET" && (urlPath === "/jobs/new" || urlPath === "/jobs/new/")) {
      redirect(res, "/dashboard#jobs-new");
      return;
    }

    if (req.method === "GET") {
      const workerFile = workerFallbackPath(urlPath);
      if (workerFile && fs.existsSync(workerFile)) {
        sendFile(res, workerFile);
        return;
      }
    }

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
