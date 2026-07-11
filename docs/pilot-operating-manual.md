# Patwadi Pilot Operating Manual

| Field | Value |
|-------|-------|
| **Document** | Patwadi Pilot Operating Manual |
| **Version** | 0.1 |
| **Status** | PILOT — not for public distribution |
| **Effective** | 14 June 2026 |
| **Owner** | [founder name — placeholder] |
| **Review trigger** | When volume exceeds 50 parcels/month, or after the first incident of each type — whichever comes first |

---

## Section 1 — PILOT SCOPE

### Who may book

| Phase | Who may book |
|-------|----------------|
| Parcels 1–5 | Founders and named friends only |
| Parcels 6–30 | Friends, family, and 2–3 known SME contacts |
| Not yet | Public Play Store or App Store listing |

**Enforcement:** OPS ONLY. The app has no invite code or pilot flag. Anyone with the APK can sign up. Only share the app with approved people.

### Platform

Android APK only until iOS TestFlight is ready.

### Payment

Razorpay prepay only — no cash on delivery. Booking is confirmed only after payment is processed. The price at checkout is final, subject to weight verification at pickup. Refunds follow [Terms of Service](terms-of-service.html) Section 5.

### Support

| Item | Detail |
|------|--------|
| Hours | 8am–10pm IST daily |
| Channel | WhatsApp +91 80918 89969 |
| Active in-transit exception | Response within 30 minutes during support hours |
| Payment or booking issue | Response within 2 hours during support hours |
| General inquiry | Response before end of support hours on the day received |

SLA is human — there is no ticket system in the app.

### After 10pm orders

Orders placed after 10pm IST are assigned a pickup partner the following morning. Communicate this at booking. **OPS ONLY** — the app does not block late-night bookings or auto-delay assignment.

---

## Section 2 — WHAT THE APP ENFORCES VS OPS-ONLY

| Policy | Enforcement | Notes |
|--------|-------------|-------|
| T&C acceptance before payment | **IN APP** | Required checkboxes on ConfirmOrderScreen; `terms_accepted_at` set server-side on payment |
| Value cap ₹10,000 general | **IN APP** | PackageInfoScreen UI only; server TODO in `create-razorpay-order` |
| Value cap ₹5,000 electronics | **IN APP** | PackageInfoScreen UI only; server TODO in `create-razorpay-order` |
| Cash on delivery | **IN APP** | Not possible — Razorpay prepay only |
| Operator approval before access | **IN APP** | OperatorPendingScreen until `approval_status = approved` and `operator_status = active` |
| Prohibited items check | **OPS ONLY** | LMP judgment at pickup; no in-app screening |
| 2 delivery attempts | **OPS ONLY** | Per Shipping Policy §6; no attempt counter in app |
| Storage fees ₹100/day | **OPS ONLY** | Manual invoice or Razorpay link |
| Storage starts after 2nd failure, no grace period | **OPS ONLY** | Per Shipping Policy §7 |
| Return-to-sender after 7 days | **OPS ONLY** | Per Shipping Policy §7; no automated return booking |
| Damage claim 48h window | **OPS ONLY** | WhatsApp + manual review; no damage ticket table |
| Lost parcel 48h escalation | **IN APP** | `is_overdue` on `linehaul_trips` (cron); `parcel_recoveries` admin queue; customer sees “Delivery exception”, not “lost” |
| LMP assignment within 30 min of payment | **OPS ONLY** | Admin RPC `assign_lmp_to_order` |
| Packaging condition at pickup | **IN APP** | Handoff step on ConfirmHandoffScreen (`packaging_condition` on custody event). Customer-initiated pickup from TrackingDetailsScreen skips packaging UI — train LMPs to use operator-led pickup when packaging must be recorded |

---

## Section 3 — INCIDENT PLAYBOOKS

Each playbook ends with a row in the **claims spreadsheet** (see field list under Playbook A).

---

### PLAYBOOK A — PARCEL NOT PICKED UP

**Trigger:** Customer says the LMP never arrived, or the LMP says the customer was not reachable.

**Steps:**

1. Check admin: is `lmp_pickup_id` set? If not — assign immediately via `assign_lmp_to_order`.
2. If assigned but no `customer_to_lmp` event: contact the LMP directly.
3. If the customer was not home: confirm whether they had the “Confirm pickup” CTA visible in their app.
4. Rebook for the next available slot. No charge for the first failure.
5. Record: order ID, issue type `pickup failure`, resolution, date.

**Resolution:** Either `customer_to_lmp` is recorded in the app, or the order is cancelled and refunded per Terms §5 (before pickup partner assigned / pickup not initiated).

**Claims register:** issue type `not_picked_up`; note refund amount if applicable.

---

### PLAYBOOK B — PARCEL OVERDUE IN TRANSIT

**Trigger:** `is_overdue = true` in admin Trips tab.

**Steps:**

1. Call `driver_phone` on the trip.
2. No answer in 15 minutes: call `emergency_contact_phone` from `operator_kyc_packets`.
3. No answer in 30 minutes: open `parcel_recovery` for all parcels on the trip. Customer sees “Delivery exception — our team is resolving it.”
4. `escalation_level` increments every 2 hours automatically while recovery is open or in progress.
5. Recovery within 48 hours: reroute to the next available trip (`recovered_by_trip_id`). New trip still requires code + photo at the next handoff.
6. No recovery after 48 hours: follow Playbook D (lost parcel).
7. Record per parcel.

**Resolution:** Parcel delivered via recovery reroute, or escalated to Playbook D.

**Claims register:** issue type `overdue_in_transit`; one row per parcel.

---

### PLAYBOOK C — PARCEL DAMAGED AT DELIVERY

**Trigger:** Customer contacts support within 48 hours of delivery (Shipping Policy §8).

**Steps:**

1. Request order ID, customer damage photos, and packaging photos.
2. Pull the custody chain from Admin Parcel Details. Compare against all handoff photos in the chain.
3. If damage is visible in the POD photo: Patwadi liable. Settlement: lesser of declared value or ₹5,000 (Terms §6).
4. If damage is not in the POD photo: investigate packaging condition. If `packaging_condition = risk_acknowledged_by_customer`: reduced or no liability (Shipping Policy §4).
5. Issue Razorpay refund for the agreed amount.
6. Deduct from the responsible operator’s next payout (Operator Agreement §5).
7. Record: order ID, issue type `damage claim`, evidence, decision, amount.

**Resolution:** Compensation paid or claim denied with written explanation to the customer.

**Claims register:** issue type `damage`; resolution, amount, date.

---

### PLAYBOOK D — PARCEL LOST

**Trigger:** `parcel_recovery` status = `unrecoverable`, or 48 hours past expected corridor arrival with no custody progress (Shipping Policy §9).

**Steps:**

1. Founder confirms “lost” — human decision, not automatic.
2. WhatsApp the customer: “We were unable to recover your parcel. We will refund your freight plus up to ₹[lesser of declared value or ₹5,000] within 5–7 business days.”
3. Issue Razorpay refund.
4. Identify the custody leg at fault from the chain.
5. Deduct from the responsible operator’s payout (spread over two settlement periods if needed — Operator Agreement §5).
6. Record full resolution details.

**Resolution:** Refund and compensation processed; recovery marked `unrecoverable`.

**Claims register:** issue type `lost`; resolution `unrecoverable`; amounts and date.

---

### PLAYBOOK E — CONDUCTOR UNREACHABLE MID-ROUTE

**Trigger:** No custody progress, conductor phone off, 30 minutes elapsed.

**Steps:**

1. Call `driver_phone` on the trip (bus driver — may differ from the conductor).
2. Call `emergency_contact_phone` from `operator_kyc_packets`.
3. If the bus is en route: request transfer to an approved linehaul conductor on the same corridor via admin (or conductor uses Request transfer in the app).
4. If the bus arrived and the conductor is missing: contact the bus depot.
5. Open `parcel_recovery` for all affected parcels. Set `blocked_exception = true` if not already set.
6. Customer comms: “Delivery exception.” No timeline until known.
7. Resolved: close recovery; customer status updates automatically when custody events resume.
8. Unresolved: follow Playbook D.

**Resolution:** Transfer completes and parcel continues, or recovery reroute succeeds, or Playbook D.

**Claims register:** issue type `conductor_unreachable`; trip ID, transfer attempts, recovery ID, resolution.

---

### PLAYBOOK F — PROHIBITED ITEM AT PICKUP

**Trigger:** LMP calls support — the customer’s parcel contains a prohibited item (Shipping Policy §5).

**Steps:**

1. LMP does **not** complete the handoff.
2. Admin contacts the customer: cancellation and full refund.
3. Issue full Razorpay refund.
4. If the item is illegal: follow applicable law.
5. Flag the customer account. Note on the operator record.

**Resolution:** Order cancelled; full refund issued; account flagged if appropriate.

**Claims register:** issue type `prohibited_item`; refund amount, date, operator note.

---

### Claims spreadsheet fields

Maintain one row per incident (Google Sheet or equivalent):

| Field | Description |
|-------|-------------|
| Order ID | Patwadi order UUID |
| Issue type | e.g. `not_picked_up`, `overdue_in_transit`, `damage`, `lost`, `conductor_unreachable`, `prohibited_item` |
| Date opened | When ops first logged the incident |
| Date resolved | When the customer was informed of the final outcome |
| Resolution | e.g. `delivered`, `refunded`, `compensated`, `unrecoverable`, `no_action` |
| Freight amount (₹) | Original booking freight |
| Compensation amount (₹) | Paid to customer, if any |
| Refund amount (₹) | Razorpay refund, if any |
| Operator deduction (₹) | Withheld from operator payout, if any |
| Notes | Custody findings, evidence summary |

---

## Section 4 — WEEKLY OPS CHECKLIST (every Monday before payout)

Run this checklist every Monday before operator settlement (Operator Agreement §5).

- [ ] All prior week’s deliveries have `lmp_to_customer` events. Missing events → investigate before paying.
- [ ] Open `parcel_recoveries`: check `escalation_level`. Level > 2 and unresolved → escalate immediately.
- [ ] Claims spreadsheet: any open claims older than 48 hours?
- [ ] Calculate operator payouts from delivered parcels. Apply deductions. Send via UPI or bank.
- [ ] Any `dispute_status = 'disputed'` on orders? Check Razorpay dashboard. Respond within their window.
- [ ] Review flagged transfers from the prior week (admin Flagged tab).

---

## Section 5 — PRE-WIDER-LAUNCH LEGAL CHECKLIST

Items needing lawyer review before widening beyond friends and family:

- Liability cap enforceability (Consumer Protection Act 2019)
- Carriage by Road Rules 2011 applicability
- Independent contractor and accident liability clause in the operator agreement
- DPDPA compliance for location data and Aadhaar storage
- Arbitration clause jurisdiction

---

## Section 6 — OPS-ONLY ITEMS — TRACKING TABLE

| Item | Current handling | Trigger for app solution | Ops-only forever or future build |
|------|------------------|--------------------------|----------------------------------|
| LMP assignment (admin RPC, 30 min SLA from payment) | Founder assigns pickup and delivery LMPs via `assign_lmp_to_order` within 30 minutes of payment | Volume exceeds 50 parcels/month or repeated SLA misses | Future build — auto-assignment when volume justifies it |
| Storage fee billing (manual Razorpay link) | Ops sends a manual Razorpay payment link per Shipping Policy §7 | More than one storage-fee case per month | Future build — in-app billing |
| Delivery attempt counter (LMP WhatsApp notes) | LMP records attempts via WhatsApp; ops tracks against Shipping Policy §6 | Failed-delivery disputes or missed second-attempt timing | Future build — attempt counter in app |
| Damage report (WhatsApp + custody photos) | Customer WhatsApp with photos; ops compares custody chain in admin | First damage claim in pilot, or claims older than 48h unresolved | Future build — damage ticket table |
| Operator payout (spreadsheet, weekly manual) | Monday settlement: spreadsheet, UPI or bank transfer, log in payout sheet | More than 5 operators or payout errors | Future build — payout module |
| After-10pm booking queue (manual next-morning assignment) | T&C §4 states next-morning assignment; ops assigns LMP manually | Regular after-10pm order volume | Future build — app queue or assignment delay |
| Packaging risk WhatsApp message (LMP backup if app step missed) | LMP sends WhatsApp acknowledgment when customer confirms pickup from their phone (packaging UI skipped) | Packaging-related damage dispute | Future build — require operator-led pickup for packaging capture; backup may remain ops-only |
| Prohibited item refusal (LMP judgment, no in-app refusal flow) | LMP refuses at pickup and calls support; Playbook F | First prohibited-item incident | Ops-only forever for judgment; future build may add in-app refusal logging only |

---

## References

- [PATWADI_LAUNCH_ARCHITECTURE.md](../PATWADI_LAUNCH_ARCHITECTURE.md) — §6 transfer, §7 override, §13 emergency recovery, §19 overdue flagging, §20 operator onboarding
- [Terms of Service](terms-of-service.html)
- [Shipping Policy](shipping-policy.html)
- [Operator Agreement (template)](operator-agreement-template.md)

---

*Internal use only. Do not distribute to customers or operators without founder approval.*
