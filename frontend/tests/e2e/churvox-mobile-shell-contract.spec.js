const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readFreshSource(filename) {
  const roots = [process.cwd(), path.join(process.cwd(), 'frontend'), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', 'frontend')];

  for (const root of roots) {
    const candidates = [
      path.join(root, 'src', 'churvox-fresh', filename),
      path.join(root, 'frontend', 'src', 'churvox-fresh', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    }
  }

  throw new Error(`Unable to find frontend/src/churvox-fresh/${filename} from ${process.cwd()}`);
}

test.describe('Churvox mobile shell contracts', () => {
  test('mobile notification bell cannot cover Log out', () => {
    const styles = readFreshSource('freshOwnerShellFinal.css');

    expect(styles).toContain('CHURVOX_MOBILE_BELL_LOGOUT_CLEARANCE_20260625');
    expect(styles).toMatch(/\.freshMobileAppTop\s*{[\s\S]*padding-right:\s*92px\s*!important/);
    expect(styles).toMatch(/\.freshMobileAppTop\s+button\.freshMobileLogout\s*{[\s\S]*z-index:\s*2\s*!important/);
    expect(styles).toMatch(/\.freshNotifyBell\s*{[\s\S]*top:\s*calc\(13px \+ env\(safe-area-inset-top\)\)\s*!important/);
    expect(styles).toMatch(/\.freshNotifyButton\s*{[\s\S]*width:\s*50px\s*!important/);
  });

  test('mobile bottom navigation keeps inactive and active pills readable', () => {
    const styles = readFreshSource('freshOwnerShellFinal.css');

    expect(styles).toContain('CHURVOX_MOBILE_BOTTOM_NAV_CONTRAST_20260625');
    expect(styles).toMatch(/\.freshMobileNav\s+button:not\(\.active\)\s+span\s*{[\s\S]*#f8fafc/);
    expect(styles).toMatch(/\.freshMobileNav\s+button:not\(\.active\)\s+i\s*{[\s\S]*background:\s*#f8fafc\s*!important/);
    expect(styles).toMatch(/\.freshMobileNav\s+button:not\(\.active\)\s+i\s*{[\s\S]*-webkit-text-fill-color:\s*#111827\s*!important/);
    expect(styles).toMatch(/\.freshMobileNav\s+button\.active\s+span\s*{[\s\S]*-webkit-text-fill-color:\s*#111827\s*!important/);
    expect(styles).toMatch(/\.freshMobileNav\s+button\.active\s+i\s*{[\s\S]*background:\s*#111827\s*!important/);
  });
});
