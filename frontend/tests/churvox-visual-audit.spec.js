const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const TEST_EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';

const publicPages = [
  ['home', '/'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['plans-public', '/plans'],
  ['privacy', '/privacy'],
  ['terms', '/terms']
];

const appPages = [
 