// PHASE_144_FORCE_CSS_MIME_AND_CACHE_CLEAR
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const buildDir = path.join(__dirname, "build");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

function safeJoin(base, requestedPath) {
  const decoded = decodeURIComponent(requestedPath.split("?")[0]);
  const normal = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(base, normal);
  return full.startsWith(base) ? full : null;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  const baseName = path.basename(filePath);

  const headers = {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  };

  if (baseName === "sw.js" || baseName === "service-worker.js") {
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    headers["Service-Worker-Allowed"] = "/";
  } else if (baseName === "index.html") {
    headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
  } else if (filePath.includes(`${path.sep}static${path.sep}`)) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    headers["Cache-Control"] = "public, max-age=3600";
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

function sendMissingAsset(res, requestedPath) {
  const ext = path.extname(requestedPath).toLowerCase();

  // PHASE_144_FORCE_CSS_MIME_AND_CACHE_CLEAR
  // If a stale service worker / cached HTML asks for an old hashed CSS file,
  // never return text/plain. Browser strict MIME checking blocks the app if CSS
  // comes back as text/plain. Return safe CSS with text/css so the page can keep
  // running until the fresh HTML bundle is loaded.
  if (ext === ".css") {
    res.writeHead(200, {
      "Content-Type": "text/css; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end("/* stale Churvox CSS asset replaced safely; refresh loads latest bundle */");
    return;
  }

  if (ext === ".js" || ext === ".mjs") {
    res.writeHead(404, {
      "Content-Type": "application/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end("console.warn('Churvox asset expired. Refresh the page.');");
    return;
  }

  const contentType = mimeTypes[ext] || "text/plain; charset=utf-8";
  res.writeHead(404, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });
  res.end("Asset not found");
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = safeJoin(buildDir, requested);

  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }

  const looksLikeAsset = path.extname(urlPath) || urlPath.startsWith("/static/");
  if (looksLikeAsset) {
    sendMissingAsset(res, urlPath);
    return;
  }

  const indexPath = path.join(buildDir, "index.html");
  if (fs.existsSync(indexPath)) {
    sendFile(res, indexPath);
    return;
  }

  res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Build not found");
});

server.listen(PORT, () => {
  console.log(`Churvox frontend running on port ${PORT}`);
});
