#!/usr/bin/env node

/**
 * Private Churvox staging launcher.
 *
 * - Requires HTTP Basic Auth before serving any page or API request.
 * - Adds no-index headers to every response.
 * - Redirects the production-style same-origin API proxy to the private
 *   staging backend supplied by Render.
 */

const http = require("http");
const https = require("https");

const STAGING_USER = String(process.env.CHURVOX_STAGING_USER || "").trim();
const STAGING_PASSWORD = String(process.env.CHURVOX_STAGING_PASSWORD || "");
const BACKEND_INPUT = String(
  process.env.CHURVOX_BACKEND_URL || process.env.CHURVOX_BACKEND_HOSTPORT || ""
).trim();

if (!STAGING_USER || !STAGING_PASSWORD) {
  console.error("Staging refused to start: CHURVOX_STAGING_USER and CHURVOX_STAGING_PASSWORD are required.");
  process.exit(1);
}

if (!BACKEND_INPUT) {
  console.error("Staging refused to start: CHURVOX_BACKEND_URL or CHURVOX_BACKEND_HOSTPORT is required.");
  process.exit(1);
}

const BACKEND_BASE = new URL(
  /^[a-z][a-z0-9+.-]*:\/\//i.test(BACKEND_INPUT) ? BACKEND_INPUT : `http://${BACKEND_INPUT}`
);

const originalCreateServer = http.createServer.bind(http);
const originalHttpRequest = http.request.bind(http);
const originalHttpsRequest = https.request.bind(https);

function credentialsMatch(headerValue) {
  const header = String(headerValue || "");
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const user = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return user === STAGING_USER && password === STAGING_PASSWORD;
  } catch {
    return false;
  }
}

function sendHealth(res) {
  const payload = Buffer.from(JSON.stringify({
    success: true,
    environment: "staging-read-only",
    backend: BACKEND_BASE.host,
  }));
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(payload.length),
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "X-Churvox-Environment": "staging-read-only",
  });
  res.end(payload);
}

http.createServer = function createProtectedStagingServer(handler) {
  return originalCreateServer((req, res) => {
    const pathname = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;

    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("X-Churvox-Environment", "staging-read-only");

    if (pathname === "/healthz") {
      sendHealth(res);
      return;
    }

    if (!credentialsMatch(req.headers.authorization)) {
      const payload = Buffer.from("Private Churvox staging preview");
      res.writeHead(401, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": String(payload.length),
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Basic realm="Churvox staging", charset="UTF-8"',
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "X-Churvox-Environment": "staging-read-only",
      });
      res.end(payload);
      return;
    }

    handler(req, res);
  });
};

function redirectBackendRequest(input, options, callback) {
  const source = input instanceof URL ? input : new URL(String(input));

  if (source.hostname !== "grassley-backend.onrender.com") {
    return originalHttpsRequest(input, options, callback);
  }

  const target = new URL(`${source.pathname}${source.search}`, BACKEND_BASE);
  const nextOptions = {
    ...(options || {}),
    headers: {
      ...((options && options.headers) || {}),
      host: target.host,
      "x-churvox-staging-proxy": "true",
    },
  };

  const requester = target.protocol === "http:" ? originalHttpRequest : originalHttpsRequest;
  return requester(target, nextOptions, callback);
}

https.request = redirectBackendRequest;

console.log(`Starting private Churvox staging frontend against ${BACKEND_BASE.origin}`);
require("./server.cjs");
