# Churvox pre-deploy release sheet

This release is prepared while Render billing is blocking production deployment.

## Already enforced by the build

The existing frontend build begins with `frontend/scripts/churvox-worker-proof-singleton-contract.cjs`. That contract now:

1. runs the consolidated Churvox pre-deploy audit;
2. writes `public/__churvox/release.json` with the exact Render/GitHub commit and service metadata;
3. runs the existing worker-proof singleton contract;
4. allows the normal icon generation and React production build to continue only when those checks pass.

The audit protects:

- locked monthly prices: Start 39, Crew 89, Operator 149, Command 299;
- Operator capacity of 15 active team members;
- Command capacity of 50 active team members;
- the 99 Command Growth Pack adding 50 active team members;
- the Founding 10 tester landing page and sitemap entry;
- campaign attribution before popup submission;
- the same-origin `/api` frontend proxy;
- non-stale HTML and real 404 responses for missing chunks;
- public tester intake plus the owner-only HQ listing;
- a view-only Applications inbox;
- a local-copy-only Promotion Centre.

## When Render billing is cleared

1. Confirm the Render payment warning has disappeared.
2. Deploy `grassley-backend` from latest `main`.
3. Deploy the frontend service attached to `www.churvox.com` from the same latest `main` commit.
4. Open `https://www.churvox.com/__churvox/release.json` and confirm its `git_commit` matches GitHub `main`.
5. Open `https://www.churvox.com/testers/` and submit only a clearly labelled internal test application if a production intake test is needed.
6. Check Churvox HQ Applications for that test record.
7. Verify the homepage, pricing, login, dashboard and worker login before public promotion begins.

## Safety boundary

No direct outreach, account access, plan change, charge, social post or customer record change is performed by this release sheet. Production mutations remain deliberate owner-approved actions.
