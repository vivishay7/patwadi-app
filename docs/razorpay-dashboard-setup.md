# Razorpay dashboard setup — parked

**Status:** Not started. Complete when Razorpay account documentation is ready.

This is a manual checklist only. Nothing here is automated.

---

## Prerequisites

- Razorpay account approved and in **Test** or **Live** mode as appropriate
- Supabase edge secrets already set: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Session 21 functions deployed: `create-razorpay-order`, `verify-razorpay-payment`, `razorpay-webhook`
- `phase21_dispute_status.sql` applied on live Supabase (adds `orders.dispute_status`)

---

## 1. Webhook URL

Register in Razorpay Dashboard → **Settings** → **Webhooks** → **Add new webhook**.

| Field | Value |
|-------|-------|
| URL | `https://wvxyaqqlqwbbpkgvrali.supabase.co/functions/v1/razorpay-webhook` |
| Secret | Use the webhook secret Razorpay shows after creation. If it differs from `RAZORPAY_KEY_SECRET`, add it as a Supabase secret (e.g. `RAZORPAY_WEBHOOK_SECRET`) and update `razorpay-webhook` to use it. |

### Events to subscribe

- `payment.dispute.created`
- `payment.dispute.won`
- `payment.dispute.lost`
- `refund.processed`

Optional (if Session 21 gaps are closed in code):

- `payment.failed`
- `payment.captured`

### Expected behaviour

| Event | Effect on order |
|-------|-----------------|
| `payment.dispute.created` | `blocked_exception = true`, `dispute_status = 'disputed'` |
| `payment.dispute.won` | `dispute_status` cleared |
| `payment.dispute.lost` | `dispute_status = 'dispute_lost'` |
| `refund.processed` | `dispute_status = 'refunded'` |

Disputed orders surface in the admin recovery queue via existing `blocked_exception` flow.

---

## 2. Standard Checkout (app payments)

- **Key ID** → `EXPO_PUBLIC_RAZORPAY_KEY_ID` in app `.env` (client-visible, test or live key)
- **Key secret** → Supabase edge secret only (`RAZORPAY_KEY_SECRET`), never in `.env` or git

Test UPI for emulator/device smoke: `success@razorpay`

---

## 3. Verification after setup

1. Razorpay webhook test ping → function logs show 200 (Dashboard → Webhooks → send test)
2. Complete a test payment in the app → order row with `payment_status = confirmed`
3. (Optional) Trigger a test dispute in Razorpay test mode → order gets `dispute_status = 'disputed'` and `blocked_exception = true`

---

## 4. Documentation Razorpay may request

Fill in when you have the list from Razorpay support/onboarding:

- [ ] Business legal name: Patwadi Logistics LLP
- [ ] Website URL: `https://patwadi.com`
- [ ] Privacy policy URL: `https://patwadi.com/privacy-policy.html` (requires PR merge on `vivishay7/patwadi.com`)
- [ ] App package name: `com.patwadi.app`
- [ ] Description of goods/services: intercity bus-cargo parcel delivery
- [ ] Refund / dispute policy summary: _TBD_
- [ ] Other items Razorpay asks for: _TBD_

---

## 5. Related files in this repo

| File | Purpose |
|------|---------|
| `supabase/functions/razorpay-webhook/index.ts` | Webhook handler |
| `supabase/functions/verify-razorpay-payment/index.ts` | Post-checkout verification |
| `supabase/functions/create-razorpay-order/index.ts` | Pre-checkout order creation |
| `supabase/schema/phase21_dispute_status.sql` | `orders.dispute_status` column |

---

*Last parked: June 2026. Pick up when Razorpay account documentation is complete.*
