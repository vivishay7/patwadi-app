# Razorpay dashboard setup

**Status:** Test mode webhook registered (20 Jun 2026). **Live setup blocked** until Razorpay account is activated (KYC / active status).

Manual checklist only — nothing here is automated.

---

## Done (test mode — 20 Jun 2026)

- [x] **Webhook registered** — Razorpay Dashboard → Settings → Webhooks (Test mode)
  - URL: `https://wvxyaqqlqwbbpkgvrali.supabase.co/functions/v1/razorpay-webhook`
  - Status: Enabled
  - Alert email: `admin@patwadi.com`
  - Events (8): `payment.failed`, `payment.captured`, `payment.dispute.created`, `payment.dispute.won`, `payment.dispute.lost`, `payment.dispute.action_required`, `refund.processed` (+ 1 more)
  - Webhook secret: not shown / not saved yet in dashboard

Handler only updates orders for dispute + refund events; other subscribed events return `skipped: unhandled event` (harmless).

---

## Blocked until live account activation

- [ ] Razorpay KYC / account moved to **active** status
- [ ] **Live** API keys → `EXPO_PUBLIC_RAZORPAY_KEY_ID` (app) + `RAZORPAY_KEY_SECRET` (Supabase edge secret)
- [ ] **Live** webhook — duplicate registration in Live mode with same URL and event set
- [ ] Live webhook secret → Supabase (see below) once Razorpay shows it
- [ ] Razorpay onboarding documentation (section 4 below)
- [ ] Post-setup verification (section 3 below) — run after keys + webhook secret are confirmed

Until then, payments and webhooks operate in **test mode only**.

---

## Prerequisites (already in repo)

- Supabase edge secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (test keys today)
- Functions deployed: `create-razorpay-order`, `verify-razorpay-payment`, `razorpay-webhook`
- `phase21_dispute_status.sql` applied on patwadi-dev (`orders.dispute_status`)

---

## Webhook secret (optional but recommended)

`razorpay-webhook` verifies `X-Razorpay-Signature` using **`RAZORPAY_KEY_SECRET`** today (not a separate env var).

When Razorpay displays the webhook secret at creation (or under webhook settings):

1. Save it — dashboard may show “Not provided” until you reveal/regenerate it.
2. If webhook test pings return **401 Invalid signature**, Razorpay is signing with the webhook secret, not the API key secret. Add `RAZORPAY_WEBHOOK_SECRET` in Supabase and update `razorpay-webhook/index.ts` to use it for HMAC (small code change).

---

## Expected webhook behaviour

| Event | Effect on order |
|-------|-----------------|
| `payment.dispute.created` | `blocked_exception = true`, `dispute_status = 'disputed'` |
| `payment.dispute.won` | `dispute_status` cleared |
| `payment.dispute.lost` | `dispute_status = 'dispute_lost'` |
| `refund.processed` | `dispute_status = 'refunded'` |

Disputed orders surface in the admin recovery queue via existing `blocked_exception` flow.

---

## Standard Checkout (app payments)

- **Key ID** → `EXPO_PUBLIC_RAZORPAY_KEY_ID` in app `.env` (client-visible, test or live key)
- **Key secret** → Supabase edge secret only (`RAZORPAY_KEY_SECRET`), never in `.env` or git

Test UPI for emulator/device smoke: `success@razorpay`

---

## Verification after live activation

1. Razorpay webhook test ping → function logs show 200 (Dashboard → Webhooks → send test)
2. Complete a test payment in the app → order row with `payment_status = confirmed`
3. (Optional) Trigger a test dispute in Razorpay test mode → order gets `dispute_status = 'disputed'` and `blocked_exception = true`

---

## Documentation Razorpay may request

Fill in when you have the list from Razorpay support/onboarding:

- [ ] Business legal name: Patwadi Logistics LLP
- [ ] Website URL: `https://patwadi.com`
- [ ] Privacy policy URL: `https://patwadi.com/docs/privacy-policy`
- [ ] App package name: `com.patwadi.app`
- [ ] Description of goods/services: intercity bus-cargo parcel delivery
- [ ] Refund / dispute policy summary: _TBD_
- [ ] Other items Razorpay asks for: _TBD_

---

## Pilot gaps (tighten before public launch)

- [ ] **Declared value caps (UI-only today):** Fine for pilot — server does not validate declared value against electronics ₹5,000 / general ₹10,000 caps. Enforcement is UI-only on `PackageInfoScreen`. Extend `create-razorpay-order` validation before public launch.

---

## Related files in this repo

| File | Purpose |
|------|---------|
| `supabase/functions/razorpay-webhook/index.ts` | Webhook handler |
| `supabase/functions/verify-razorpay-payment/index.ts` | Post-checkout verification |
| `supabase/functions/create-razorpay-order/index.ts` | Pre-checkout order creation |
| `supabase/schema/phase21_dispute_status.sql` | `orders.dispute_status` column |

---

*Updated: 20 Jun 2026 — test webhook registered; live steps parked on account activation.*
