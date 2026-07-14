# Churvox HQ Tester Outreach Desk

The private Tester Outreach desk lives inside Churvox HQ. It lets the platform owner save personalised tester drafts, explicitly approve and send them, track replies and interest, and grant selected businesses 30 days of tester access. The public Churvox trial remains 14 days.

## Safety rules

- Nothing sends until the owner presses **Approve & send**.
- Tester communication is email-only. The default copy does not request phone calls or meetings.
- Selected tester access defaults to 30 days.
- Public 14-day Stripe trials are unchanged.
- Do-not-contact and unsubscribe records block future sends.
- The HQ routes remain locked to `hello@churvox.com`.

## Render environment variables

The existing Postmark settings are reused:

- `POSTMARK_SERVER_TOKEN`
- `POSTMARK_FROM_EMAIL=hello@churvox.com`

Optional outreach settings:

- `POSTMARK_TESTER_MESSAGE_STREAM=outbound`
- `POSTMARK_TESTER_REPLY_TO=hello@churvox.com`
- `POSTMARK_INBOUND_SECRET=<long-random-secret>`

`POSTMARK_TESTER_REPLY_TO` may contain `{token}` when a tokenised inbound address is available, for example `tester+{token}@your-postmark-inbound-domain`. When no token template is configured, inbound replies are matched to prospects by sender email.

## Postmark webhooks

After deployment, configure these server webhooks in Postmark. Replace `<backend>` and `<secret>` with the live backend host and `POSTMARK_INBOUND_SECRET` value.

Inbound reply webhook:

`https://<backend>/api/postmark/inbound/tester-outreach?secret=<secret>`

Delivery webhook:

`https://<backend>/api/postmark/delivery/tester-outreach?secret=<secret>`

The existing Namecheap mailbox does not need to move. With the default reply-to setting, normal replies still go to `hello@churvox.com`; the inbound webhook is what also records them in HQ when Postmark inbound forwarding is configured.

## Data collections

- `tester_outreach_prospects`
- `tester_outreach_messages`
- `tester_outreach_events`

No sample prospects are inserted by this feature.
