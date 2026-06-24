const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readFrontendSource(filename) {
  const roots = [process.cwd(), path.join(process.cwd(), 'frontend'), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', 'frontend')];

  for (const root of roots) {
    const candidates = [
      path.join(root, 'src', filename),
      path.join(root, 'frontend', 'src', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    }
  }

  throw new Error(`Unable to find frontend/src/${filename} from ${process.cwd()}`);
}

test.describe('Churvox public copy contracts', () => {
  test('public marketing pages do not show MYOB wording', () => {
    const publicFiles = [
      'pages/marketing/ExecutiveHomePage.jsx',
      'pages/marketing/ExecutivePricingPage.jsx',
      'pages/marketing/ExecutiveFeaturesPage.jsx',
    ];

    for (const filename of publicFiles) {
      const source = readFrontendSource(filename);
      expect(source, `${filename} should stay accounting-neutral on public pages`).not.toMatch(/MYOB|Xero\/MYOB/i);
    }
  });
});
