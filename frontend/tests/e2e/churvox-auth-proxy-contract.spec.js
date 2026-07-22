const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), 'utf8');

test.describe('Churvox same-origin authentication proxy contract', () => {
  test('preserves the complete login JSON body after buffering', async () => {
    const server = read('server.cjs');

    expect(server).toContain('function bufferedResponseHeaders(headers = {}, body = Buffer.alloc(0), extraHeaders = {})');
    expect(server).toContain('lower === "content-length" || lower === "content-encoding" || lower === "transfer-encoding"');
    expect(server).toContain('next["content-length"] = String(bodyBuffer.length)');
    expect(server).toContain('if (bufferedLogin) requestHeaders["accept-encoding"] = "identity"');
    expect(server).toContain('const bodyBuffer = Buffer.concat(chunks)');
    expect(server).toContain('res.writeHead(statusCode, bufferedResponseHeaders(responseHeaders, bodyBuffer');
    expect(server).toContain('res.end(bodyBuffer)');
    expect(server).toContain('Login backend returned an empty response.');
  });

  test('does not leak an existing account cookie into a new login attempt', async () => {
    const server = read('server.cjs');

    expect(server).toContain('urlPath === "/api/auth/login"');
    expect(server).toContain('urlPath === "/api/worker/auth/login"');
    expect(server).toContain('delete requestHeaders.cookie');
    expect(server).toContain('delete requestHeaders.Cookie');
  });

  test('seeds API-audit authentication before React starts', async () => {
    const audit = read('tests/e2e/churvox-big-launch-audit.spec.js');

    expect(audit).toContain('await page.addInitScript(({ seededToken }) =>');
    expect(audit).toContain("sessionStorage.removeItem('churvox:logged-out')");
    expect(audit).toContain("window.__CHURVOX_AUTH_STATE__?.status === 'authenticated'");
    expect(audit).toContain('same-origin login returned no token/account JSON');
    expect(audit).toContain('created job never reached the authenticated worker-scoped API');
  });
});
