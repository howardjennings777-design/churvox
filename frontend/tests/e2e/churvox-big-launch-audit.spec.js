const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PLAYWRIGHT_EMAIL || process.env.CHURVOX_TEST_EMAIL || '';
const PASSWORD = process.env.PLAYWRIGHT_PASSWORD || process.env.CHURVOX_TEST_PASSWORD || '';
const HAS_LOGIN = Boolean(EMAIL && PASSWORD);

const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/features',
  '/login',
  '/signup',
  '/privacy-policy',
  '/terms-of