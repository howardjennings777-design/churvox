#!/usr/bin/env node

// Private Render staging wrapper for the Churvox Office OS review build.
// It starts the normal production-like frontend server behind Basic Auth,
// adds an unmistakable staging banner/no-index headers, and blocks every
// mutating API request except sign-in, sign-out and token refresh.

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 3000);
const INTERNAL_PORT = Number(process.env.CHURVOX_STAGING_INTERNAL_PORT || 3100);
const STAGING_USER = String(process.env.CHURVOX_STAGING_USER || 'churvox');
const STAGING_PASSWORD = String(process.env.CHURVOX_STAGING_PASSWORD || '');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOWED_AUTH_MUTATIONS = new Set([
  '/api/auth/login',
  '/api/worker/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
]);
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

let childReady = false;
let shuttingDown = false;

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function authorised(req) {
  if (!STAGING_PASSWORD) return false;
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return false;
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return safeEqual(username, STAGING_USER) && safeEqual(password, STAGING_PASSWORD);
  } catch {
    return false;
  }
}

function json(res, statusCode, body, extraHeaders = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(payload.length),
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Churvox-Environment': 'private-staging-read-only',
    ...extraHeaders,
  });
  res.end(payload);
}

function filteredHeaders(headers = {}) {
  const next = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP.has(String(key).toLowerCase())) next[key] = value;
  }
  next['x-robots-tag'] = 'noindex, nofollow, noarchive';
  next['x-churvox-environment'] = 'private-staging-read-only';
  return next;
}

function injectStagingBanner(html) {
  const banner = `
<style id="churvox-staging-banner-style">
  #churvox-staging-banner{position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#111;color:#fff;border-bottom:3px solid #ff6a00;font:700 12px/1.2 Arial,sans-serif;letter-spacing:.08em;text-align:center;padding:10px 44px;box-sizing:border-box}
  #churvox-staging-banner strong{color:#ff8a2b}
</style>
<div id="churvox-staging-banner" role="status"><strong>PRIVATE STAGING</strong> · READ ONLY · SEND, CHARGE, DELETE, PAY AND RECORD-CHANGE ACTIONS ARE BLOCKED</div>
`;

  if (/<body[^>]*>/i.test(html)) return html.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
  return `${banner}${html}`;
}

function isBlockedMutation(req, pathname) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!pathname.startsWith('/api')) return false;
  if (SAFE_METHODS.has(method)) return false;
  return !ALLOWED_AUTH_MUTATIONS.has(pathname);
}

function proxyToFrontend(req, res) {
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: INTERNAL_PORT,
    method: req.method,
    path: req.url,
    headers: { ...req.headers, host: req.headers.host || `127.0.0.1:${INTERNAL_PORT}` },
    timeout: 30000,
  }, (upstreamRes) => {
    const contentType = String(upstreamRes.headers['content-type'] || '');
    const shouldInject = contentType.includes('text/html');

    if (!shouldInject) {
      res.writeHead(upstreamRes.statusCode || 502, filteredHeaders(upstreamRes.headers));
      upstreamRes.pipe(res);
      return;
    }

    const chunks = [];
    upstreamRes.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    upstreamRes.on('end', () => {
      const payload = Buffer.from(injectStagingBanner(Buffer.concat(chunks).toString('utf8')));
      const headers = filteredHeaders(upstreamRes.headers);
      delete headers['content-length'];
      delete headers['content-encoding'];
      headers['content-length'] = String(payload.length);
      headers['cache-control'] = 'no-store';
      res.writeHead(upstreamRes.statusCode || 200, headers);
      res.end(payload);
    });
  });

  upstream.on('timeout', () => upstream.destroy(new Error('Staging upstream timeout')));
  upstream.on('error', (error) => {
    console.error('STAGING_PROXY_ERROR', error);
    if (!res.headersSent) json(res, 502, { success: false, detail: 'Staging frontend is temporarily unavailable.' });
  });
  req.pipe(upstream);
}

const child = spawn(process.execPath, [path.join(__dirname, 'server.cjs')], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(INTERNAL_PORT) },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  childReady = false;
  console.error(`STAGING_CHILD_EXIT code=${code} signal=${signal || ''}`);
  if (!shuttingDown) process.exit(code || 1);
});

function probeChild() {
  const probe = http.get({ hostname: '127.0.0.1', port: INTERNAL_PORT, path: '/', timeout: 2000 }, (response) => {
    childReady = Boolean(response.statusCode && response.statusCode < 500);
    response.resume();
  });
  probe.on('timeout', () => probe.destroy());
  probe.on('error', () => { childReady = false; });
}

const probeTimer = setInterval(probeChild, 1000);
probeTimer.unref();
probeChild();

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;

  if (pathname === '/__staging_health') {
    json(res, childReady ? 200 : 503, {
      ok: childReady,
      environment: 'private-staging-read-only',
      accessConfigured: Boolean(STAGING_PASSWORD),
    });
    return;
  }

  if (!STAGING_PASSWORD) {
    json(res, 503, {
      success: false,
      detail: 'Private staging access has not been configured in Render yet.',
    });
    return;
  }

  if (!authorised(req)) {
    json(res, 401, { success: false, detail: 'Private staging authentication required.' }, {
      'WWW-Authenticate': 'Basic realm="Churvox Private Staging", charset="UTF-8"',
    });
    return;
  }

  if (!childReady) {
    json(res, 503, { success: false, detail: 'Private staging is starting.' });
    return;
  }

  if (isBlockedMutation(req, pathname)) {
    json(res, 403, {
      success: false,
      staging_read_only: true,
      detail: 'This action is blocked in private staging. Nothing was sent, charged, paid, deleted, synced or changed.',
    });
    return;
  }

  proxyToFrontend(req, res);
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(probeTimer);
  server.close(() => process.exit(0));
  if (!child.killed) child.kill(signal);
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Churvox private staging wrapper listening on ${PORT}`);
  console.log(`Churvox production-like frontend listening internally on ${INTERNAL_PORT}`);
  console.log('Staging API mutations are blocked except authentication lifecycle requests.');
});
