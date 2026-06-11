# Fresh Main Cutover

Fresh is now the main authenticated owner app.

## Main route
- `/dashboard` opens the Fresh Churvox app.
- `/fresh` redirects to `/dashboard`.
- Old dashboard is kept temporarily at `/legacy/dashboard`.

## Kept live
These are not deleted yet because they are needed for real launch testing:
- auth pages
- public quote/invoice/client portal pages
- worker routes
- job/client/quote/invoice detail and form pages
- admin/platform owner pages
- legal pages

## Deletion rule
Delete old legacy pages only after real live testing passes:
1. owner signup/login
2. worker job flow
3. Command slips
4. invoice PDF email
5. public quote/invoice links
6. roles check
