const { test, expect } = require('@playwright/test');

function collectKeys(value, keys = []) {
  if (!value || typeof value !== 'object') return keys;
  Object.entries(value).forEach(([key, child]) => {
    keys.push(String(key).toLowerCase());
    collectKeys(child, keys);
  });
  return keys;
}

test('production exposes a safe exact release fingerprint', async ({ request }) => {
  const response = await request.get('/__churvox/release.json', {
    headers: { 'cache-control': 'no-cache' },
  });

  expect(response.status()).toBe(200);
  const release = await response.json();

  expect(release.schema_version).toBe('churvox-release-v1');
  expect(release.repository).toBe('howardjennings777-design/churvox');
  expect(release.git_commit).toBeTruthy();
  expect(release.generated_at).toBeTruthy();

  expect(release.safeguards).toMatchObject({
    public_trial_days: 14,
    selected_tester_days: 30,
    automatic_access_grant: false,
    automatic_social_publish: false,
    automatic_customer_contact: false,
    owner_approval_required: true,
  });

  expect(release.features).toMatchObject({
    tester_page: true,
    tester_campaign_attribution: true,
    hq_tester_application_inbox: true,
    hq_promotion_centre: true,
    tester_backend_intake: true,
    public_sitemap: true,
    first_party_api_proxy: true,
  });

  const keys = collectKeys(release);
  expect(keys.some((key) => /password|secret|private_key|access_token|auth_token/.test(key))).toBe(false);
});
