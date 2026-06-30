# Churvox next 10 priorities

Saved direction: stop adding random features and make Churvox solid, obvious, real, and impossible to misunderstand.

Core promise: **Churvox does the admin. You approve.**

## 1. Finish the current audit and fix real failures first

Do not judge the product from stale failures or dead local ports. When the current test finishes, fix only real blockers in order:

1. Owner/worker login.
2. Blank owner or worker pages.
3. Mobile overflow, double scrollbars, and covered buttons.
4. Broken buttons, drawers, or forms.
5. Rerun until clean.

## 2. Replace runtime layers with native page code

The OS v2/clarity layer helped move fast, but the long-term clean version should live inside the real pages:

- Today natively has the cockpit.
- Command natively owns approvals.
- Drawers natively show Admin Trail.
- Save buttons natively save to real endpoints.
- Demo rows are removed from source, not hidden after render.

## 3. Make every form truly save

Jobs, Clients, Quotes, Invoices, and Workers need real editable forms:

- Tap item.
- Modal opens.
- Edit fields.
- Save.
- Card updates immediately.
- Backend stores the change.
- No fake save.
- No UI that looks saved but is not saved.

## 4. Make Command the real engine

Command should generate real approval slips from:

- Worker messages.
- Missing job details.
- Quote follow-ups.
- Invoice-ready jobs.
- Accounting sync decisions.
- Customer requests.
- Overdue invoices.
- Worker time, notes, and photos.

Each slip should show:

- What happened.
- What Churvox prepared.
- Why it needs approval.
- Approve / edit / park.
- What changes after approval.

## 5. Polish the public website live after deploy

After Render deploys, inspect:

- Desktop homepage.
- Mobile homepage.
- Pricing page.
- Features page.
- Signup/login transition.
- Logo size.
- Spacing.
- Whether the black/orange industrial look feels premium or too heavy.

## 6. Add real static/prerendered public pages later

Current metadata and no-JavaScript fallback are improved. Long-term, the public marketing pages should be static/prerendered so crawlers and link previews see full content without needing JavaScript.

## 7. Build better onboarding

First-run setup should guide a new business through:

1. Add business details.
2. Add first client.
3. Add first job.
4. Invite worker.
5. Create quote or invoice.
6. Open Command.

## 8. Worker app final polish

Worker side must stay dead simple:

- Today: info only.
- Jobs: one job at a time.
- Job detail: address, directions, instructions, office message, start, finish.
- Messages: sent history.
- Help: message office.
- Me: profile/logout.

No office admin language. No approval language. No accounting language.

## 9. Billing/signup plan persistence

After Stripe/signup, the app must clearly show:

- Current plan.
- Trial status.
- Days left.
- Upgrade path.
- Accounting add-on status if relevant.

## 10. Add product screenshots/demo blocks

Public website should eventually show polished product shots/mockups for:

- Today.
- Command.
- Jobs form.
- Worker app.
- Invoice/quote approval slip.

## Priority order

1. Current audit result.
2. Real failures.
3. Truly saving forms.
4. Real Command slips.
5. Live public-site screenshot polish.
6. Onboarding.
7. Marketing push.
