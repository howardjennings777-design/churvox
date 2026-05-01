# Render Deploy Checklist

Use this checklist for release deployment validation. Never include secret values in this document or screenshots.

## Pre-deploy
- [ ] Confirm latest commit is on `main`.
- [ ] Confirm GitHub Actions/checks pass.

## Deploy kickoff
- [ ] Confirm Render frontend deploy started.
- [ ] Confirm Render backend deploy started.

## Deploy completion
- [ ] Confirm frontend deploy success.
- [ ] Confirm backend deploy success.

## Environment variable presence check (Render)
- [ ] `MONGO_URL`
- [ ] `DB_NAME`
- [ ] `JWT_SECRET`
- [ ] `FRONTEND_URL`
- [ ] `BACKEND_PUBLIC_URL`
- [ ] Stripe env vars present (if using Stripe)
- [ ] SMS env vars present (if using SMS)
- [ ] MYOB env vars present (if using MYOB)
- [ ] AI env vars present (if using AI)

## Live verification
- [ ] Hard refresh live site.
- [ ] Login test.
- [ ] API health route test (if available).
- [ ] Browser console error check.

## If failure occurs capture
- [ ] Render deploy/build logs
- [ ] Failed route URL + timestamp
- [ ] Browser console output
- [ ] Network request details for failing API
