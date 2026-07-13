const fs = require('fs');
const billing = fs.readFileSync('backend/churvox_paid_launch_billing_final_patch.py', 'utf8');
const wrapperApply = fs.readFileSync('scripts/churvox-paid-launch-billing-final-apply.py', 'utf8');

const checks = [
  ['Start NZ remains $39', billing.includes('"solo": {"NZ": 3900')],
  ['Crew NZ remains $89', billing.includes('"team": {"NZ": 8900')],
  ['Operator NZ remains $149', billing.includes('"pro": {"NZ": 14900')],
  ['Command NZ remains $299', billing.includes('"enterprise": {"NZ": 29900')],
  ['Growth Pack NZ remains $99', billing.includes('"NZ": 9900') && billing.includes('"command_growth_pack"')],
  ['normal trial remains 14 days', billing.includes('"trial_period_days": 14') && billing.includes('"trial_days": 14')],
  ['no-card trial collection mode', billing.includes('"payment_method_collection": "if_required"')],
  ['configured Stripe price IDs preferred', billing.includes('STRIPE_PRICE_') && billing.includes('return {"price": price_id, "quantity": 1}')],
  ['locked dynamic price fallback exists', billing.includes('locked_dynamic_price_data')],
  ['Growth Pack quantity capped 1 to 5', billing.includes('return max(1, min(value, 5))')],
  ['owner-only billing', billing.includes('Only business owners and admins can start checkout')],
  ['Stripe call is bounded off event loop', billing.includes('asyncio.to_thread(stripe_module.checkout.Session.create') && billing.includes('timeout=20')],
  ['blank 500 replaced with safe staged response', billing.includes('Secure checkout is temporarily unavailable. No subscription or charge was created.') && billing.includes('status_code=503')],
  ['raw exception string is not returned', !billing.includes('str(exc)') && !billing.includes('f"Stripe checkout failed: {exc}"')],
  ['plan aliases route to one endpoint', billing.includes('for path in plan_paths:') && billing.includes('app.add_api_route(path, create_plan_checkout')],
  ['Growth Pack route uses same final engine', billing.includes('app.add_api_route(addon_path, create_addon_checkout')],
  ['safe readiness endpoint exists', billing.includes('/api/billing/checkout-readiness')],
  ['wrapper force-installs billing last', wrapperApply.includes('billing_patch.install(legacy, force=True)')],
  ['boot marker reports billing ownership', wrapperApply.includes('/api/billing/create-checkout-session') && wrapperApply.includes('billing_patch_installed')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('PAID_LAUNCH_BILLING_FINAL_CONTRACT_PASS');
