# Churvox Sites to Render migration

- Keep `grassley-backend` unchanged.
- Move the new public design into the existing React frontend.
- Restore the full Fresh Churvox owner workspace on `/dashboard`.
- Remove the temporary redirect to `chatgpt.site`.
- Build on `main`, allow `grassley-frontend` to auto-deploy, test the Render hostname, then reconnect `churvox.com` and `www.churvox.com` to Render.
- Preserve locked pricing and owner-approval rules.
