#!/usr/bin/env node

// Private Render staging wrapper for the Churvox Office OS review build.
// It starts the normal production-like frontend server behind a private
// password gate, adds a staging banner/no-index headers, and blocks every
// mutating API request except sign-in, sign-out and token refresh.

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 3000);
const INTERNAL_PORT = Number(process.env.CHURVOX_STAGING_INTERNAL_PORT || 3100);
const STAGING_PASSWORD = String(process.env.CHURVOX_STAGING_PASSWORD || '');
const ACCESS_COOKIE = 'churvox_staging_access';

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

function accessToken() {
  return crypto.createHash('sha256').update(`churvox-private-staging:${STAGING_PASSWORD}`).digest('hex');
}

function cookiesFrom(header = '') {
  return String(header).split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function withoutAccessCookie(header = '') {
  return String(header)
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${ACCESS_COOKIE}=`))
    .join('; ');
}

function authorised(req) {
  if (!STAGING_PASSWORD) return false;
  const token = cookiesFrom(req.headers.cookie || '')[ACCESS_COOKIE] || '';
  return safeEqual(token, accessToken());
}

function baseHeaders(extraHeaders = {}) {
  return {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Churvox-Environment': 'private-staging-read-only',
    ...extraHeaders,
  };
}

function json(res, statusCode, body, extraHeaders = {}) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(statusCode, baseHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(payload.length),
    ...extraHeaders,
  }));
  res.end(payload);
}

function html(res, statusCode, body, extraHeaders = {}) {
  const payload = Buffer.from(body);
  res.writeHead(statusCode, baseHeaders({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': String(payload.length),
    ...extraHeaders,
  }));
  res.end(payload);
}

function redirect(res, location, extraHeaders = {}) {
  res.writeHead(303, baseHeaders({ Location: location, ...extraHeaders }));
  res.end('');
}

function accessPage(error = '') {
  const errorMarkup = error ? `<p class="error">${error}</p>` : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Churvox Private Staging</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1115;color:#f7f7f7;font-family:Arial,sans-serif;padding:24px}.card{width:min(440px,100%);background:#191d24;border:1px solid #303640;border-top:4px solid #ff6a00;border-radius:18px;padding:30px;box-shadow:0 24px 70px rgba(0,0,0,.35)}h1{margin:0 0 8px;font-size:26px}.eyebrow{color:#ff8a2b;font-weight:800;letter-spacing:.12em;font-size:12px}.muted{color:#b8bec9;line-height:1.55}.error{background:#3a1b1b;border:1px solid #773737;padding:10px 12px;border-radius:10px}label{display:block;margin:22px 0 8px;font-weight:700}input{width:100%;padding:13px 14px;border-radius:10px;border:1px solid #4a5260;background:#0f1115;color:#fff;font-size:16px}button{width:100%;margin-top:14px;padding:13px;border:0;border-radius:10px;background:#ff6a00;color:#111;font-size:16px;font-weight:900;cursor:pointer}.lock{margin-top:18px;padding-top:18px;border-top:1px solid #303640;color:#9fa7b4;font-size:13px;line-height:1.5}
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">PRIVATE · READ ONLY</div>
    <h1>Churvox staging review</h1>
    <p class="muted">Use the private staging password. Sending, charging, paying, deleting, syncing and record-changing requests are blocked here.</p>
    ${errorMarkup}
    <form method="post" action="/__staging_access" autocomplete="off">
      <label for="password">Staging password</label>
      <input id="password" name="password" type="password" required autofocus>
      <button type="submit">Open private staging</button>
    </form>
    <div class="lock">This gate is separate from your Churvox owner or worker login. After entering staging, sign in normally to review protected screens.</div>
  </main>
</body>
</html>`;
}

function readBody(req, callback) {
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > 64 * 1024) {
      req.destroy(new Error('Staging access request too large'));
      return;
    }
    chunks.push(Buffer.from(chunk));
  });
  req.on('end', () => callback(null, Buffer.concat(chunks)));
  req.on('error', (error) => callback(error));
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

function injectStagingBanner(source) {
  const banner = `
<style id="churvox-staging-banner-style">
  #churvox-staging-banner{position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#111;color:#fff;border-bottom:3px solid #ff6a00;font:700 12px/1.2 Arial,sans-serif;letter-spacing:.08em;text-align:center;padding:10px 44px;box-sizing:border-box}
  #churvox-staging-banner strong{color:#ff8a2b}#churvox-staging-banner a{color:#fff;margin-left:12px}
</style>
<div id="churvox-staging-banner" role="status"><strong>PRIVATE STAGING</strong> · READ ONLY · LIVE MUTATIONS BLOCKED <a href="/__staging_logout">Lock</a></div>
`;
  if (/<body[^>]*>/i.test(source)) return source.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
  return `${banner}${source}`;
}

function isBlockedMutation(req, pathname) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!pathname.startsWith('/api')) return false;
  if (SAFE_METHODS.has(method)) return false;
  return !ALLOWED_AUTH_MUTATIONS.has(pathname);
}

function proxyToFrontend(req, res) {
  const forwardedHeaders = { ...req.headers, host: req.headers.host || `127.0.0.1:${INTERNAL_PORT}` };
  const forwardedCookies = withoutAccessCookie(req.headers.cookie || '');
  if (forwardedCookies) forwardedHeaders.cookie = forwardedCookies;
  else delete forwardedHeaders.cookie;

  const upstream = http.request({
    hostname: '127.0.0.1',
    port: INTERNAL_PORT,
    method: req.method,
    path: req.url,
    headers: forwardedHeaders,
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
    json(res, 503, { success: false, detail: 'Private staging access has not been configured in Render yet.' });
    return;
  }

  if (pathname === '/__staging_access') {
    if (req.method === 'GET') {
      html(res, 200, accessPage());
      return;
    }
    if (req.method !== 'POST') {
      json(res, 405, { success: false, detail: 'Method not allowed.' }, { Allow: 'GET, POST' });
      return;
    }

    readBody(req, (error, body) => {
      if (error) {
        html(res, 400, accessPage('Could not read the staging password.'));
        return;
      }
      const params = new URLSearchParams(body.toString('utf8'));
      const supplied = String(params.get('password') || '');
      if (!safeEqual(supplied, STAGING_PASSWORD)) {
        html(res, 401, accessPage('That staging password is not correct.'));
        return;
      }
      redirect(res, '/new-command-lab', {
        'Set-Cookie': `${ACCESS_COOKIE}=${encodeURIComponent(accessToken())}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict`,
      });
    });
    return;
  }

  if (pathname === '/__staging_logout') {
    redirect(res, '/__staging_access', {
      'Set-Cookie': `${ACCESS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
    });
    return;
  }

  if (!authorised(req)) {
    redirect(res, '/__staging_access');
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
