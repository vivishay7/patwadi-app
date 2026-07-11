# Refund & Dispute Policy — Internal SOP

| Field | Value |
|-------|-------|
| **Audience** | Patwadi operations team |
| **Version** | 0.1 |
| **Effective** | 14 June 2026 |
| **Status** | Internal — not for customers |

**Principle:** The custody chain (`custody_events` photos and timestamps) is the primary evidence for every refund, damage, lost-parcel, and chargeback decision. Cross-reference Admin Parcel Details and the on-request detailed shipment report (architecture §9) before any settlement.

**Related systems:** `custody_events`, `parcel_recoveries`, `orders.blocked_exception`, `orders.dispute_status`, Razorpay Dashboard.

**Claims register:** Log every incident per [pilot-operating-manual.md](pilot-operating-manual.md) Section 5.

---

## 1. Pre-pickup cancellation

**When:** Customer cancels before `customer_to_lmp` custody event is recorded.

| Step | Action |
|------|--------|
| 1 | Confirm in Admin Parcel Details: no `customer_to_lmp` row in `custody_events`. |
| 2 | Cancel the order in admin (or mark cancelled per existing flow). |
| 3 | Issue **full refund** via Razorpay Dashboard → Payments → Refund. |
| 4 | Tell customer: refund will appear in **5–7 business days** on the original payment method (Terms §5). |
| 5 | Claims register: issue type per cancellation reason; note full refund amount. |

**No recovery required.** Parcel has not entered operator custody.

---

## 2. Post-pickup, pre-transit cancellation

**When:** `customer_to_lmp` recorded, but `lmp_to_linehaul` not yet recorded.

| Step | Action |
|------|--------|
| 1 | Confirm custody state: `customer_to_lmp` exists; no `lmp_to_linehaul`. |
| 2 | Issue **50% refund** via Razorpay (Terms §5). |
| 3 | Open **parcel recovery** (`parcel_recoveries`, architecture §13): reason = customer cancellation after pickup. Set `orders.blocked_exception = true` if customer still sees an active booking. |
| 4 | WhatsApp pickup LMP: return parcel to sender. New custody events (return handoffs) still require code + photo — recovery does not bypass custody rules. |
| 5 | On return complete: resolve recovery (`status → resolved`), clear `blocked_exception` if no other exception. |
| 6 | Claims register: note 50% refund, recovery ID, return custody events. |

---

## 3. In-transit cancellation

**When:** `lmp_to_linehaul` (or later linehaul custody) recorded — parcel is on the bus.

| Step | Action |
|------|--------|
| 1 | **Default:** No refund. Parcel completes its journey to the destination city (Terms §5). Inform customer; do not cancel in Razorpay. |
| 2 | **Exception — Patwadi cannot complete delivery:** Trip cancelled with no viable reassignment, recovery marked `unrecoverable`, or other ops failure where delivery is impossible. Issue **full refund** + follow Playbook D (lost) if parcel is also unrecoverable. |
| 3 | If recovery is in progress: ensure `parcel_recoveries` row is open; customer sees `blocked_exception` (“Delivery exception — our team is resolving it”, architecture §13.4). |
| 4 | Claims register: `in_transit_cancel` or `overdue_in_transit` as appropriate. |

---

## 4. Non-delivery (recipient unavailable)

Aligns with [shipping-policy.html](shipping-policy.html) §§6–7.

| Step | Action |
|------|--------|
| 1 | **Attempt 1:** Delivery LMP tries delivery. No charge. Log attempt in claims register (OPS ONLY — no app counter). |
| 2 | **Attempt 2:** Within **24 hours** of attempt 1. No charge. |
| 3 | **After 2nd failure:** Storage **₹100/day** begins **immediately** — no grace period. Send customer WhatsApp with daily rate and 7-day max hold. Bill via manual Razorpay link or UPI (pilot-operating-manual §2). |
| 4 | **Day 1–7:** Parcel held at destination LMP. Customer may arrange redelivery (₹150 per extra attempt after the free two — Shipping Policy §6) or pay storage. |
| 5 | **After 7 days:** Initiate **return-to-sender**. Customer pays **return freight** at the same rate as the original booking. Record return custody chain. |
| 6 | If sender unreachable for 30 days: follow Shipping Policy §7 disposal clause. |
| 7 | Claims register: issue type `non_delivery`; note attempts, storage days, return freight. |

---

## 5. Damage claim

**Window:** **48 hours** after delivery (pilot). **Note for ops:** tighten to **24 hours** when cargo insurance is active.

| Step | Action |
|------|--------|
| 1 | Customer contacts support with order ID and damage photos (WhatsApp). |
| 2 | Pull full `custody_events` chain and delivery POD photo (`lmp_to_customer` proof). |
| 3 | **Gate — POD comparison:** |
| | • Damage **visible in POD photo**: Patwadi liable → investigate which custody leg introduced damage using intermediate handoff photos. |
| | • Damage **not visible in POD photo**: **No claim accepted.** Close with written explanation to customer. |
| 4 | Check packaging: if `packaging_condition` / `risk_acknowledged_by_customer` on pickup event, reduce Patwadi liability per Shipping Policy §4. |
| 5 | **Settlement:** `min(declared_value, ₹5,000)` until cargo insurance is in place (Terms §6). Partial damage: compensation only — no automatic freight refund unless total loss. |
| 6 | Process via Razorpay refund or UPI. Notify customer in writing. |
| 7 | If operator at fault: see Section 8. Claims register: issue type `damage`. |

---

## 6. Lost parcel

**Definition:** No delivery **48 hours** past corridor `expected_duration_hours` (Shipping Policy §9; `is_overdue` on linehaul trip per architecture §19).

| Step | Action |
|------|--------|
| 1 | **At 24 hours overdue:** Admin starts **emergency recovery** — open `parcel_recoveries`, set `blocked_exception = true` (Playbook B; architecture §13). |
| 2 | Pull custody chain; contact conductor (`driver_phone`, then emergency contact per architecture §20). Attempt reassignment (`recovered_by_trip_id`) if trip is dead. |
| 3 | **At 48 hours unrecoverable:** Admin marks recovery `unrecoverable` → parcel officially **lost**. |
| 4 | **Settlement:** `min(declared_value, ₹5,000)` **+ full freight refund** (Shipping Policy §9). |
| 5 | **Fault leg:** Identify last reliable custody event and responsible operator from `custody_events`. Document in claims register. |
| 6 | **Operator deduction:** Deduct settlement amount attributable to operator fault from **next weekly payout** (Section 8). |
| 7 | Process customer refund/compensation via Razorpay. Claims register: issue type `lost`; resolution `unrecoverable`. |

---

## 7. Chargeback received

Per [razorpay-dashboard-setup.md](razorpay-dashboard-setup.md) (when webhook is live).

| Step | Action |
|------|--------|
| 1 | Razorpay webhook `payment.dispute.created` → `orders.blocked_exception = true`, `dispute_status = 'disputed'`. Until webhook is live: set these manually when chargeback notice arrives. |
| 2 | **Freeze operator payout** for the delivery leg(s) the disputed operator completed. Do not include that order in Monday settlement (pilot-operating-manual §4, Operator Agreement §5a). |
| 3 | Compile evidence: full `custody_events` timeline, POD photo, handoff codes, corridor and order metadata. |
| 4 | Submit package to **Razorpay dispute portal** within Razorpay’s deadline. |
| 5 | **Won** (`payment.dispute.won`): clear `dispute_status`; release withheld operator payout for that delivery. |
| 6 | **Lost** (`payment.dispute.lost`): `dispute_status = 'dispute_lost'`; **deduct chargeback amount from operator future payout** (Section 8). Customer refund already handled by Razorpay/chargeback flow — do not double-refund. |
| 7 | Claims register: issue type `chargeback`; note outcome and operator deduction. |

---

## 8. Operator at fault — payout deduction

Applies to damage, lost parcel, custody failure, chargeback lost, or prohibited-item acceptance (Operator Agreement §5).

| Step | Action |
|------|--------|
| 1 | Document fault leg from `custody_events` and investigation notes. |
| 2 | Calculate deduction amount (compensation paid to customer and/or chargeback loss attributable to that operator). |
| 3 | **Deduct from next weekly payout** (Monday settlement). Notify operator within **24 hours** of settlement with reason and amount (Operator Agreement §5). |
| 4 | **If deduction exceeds one week’s earnings:** spread over **two consecutive payout periods** (Operator Agreement: deductions will not exceed earnings for two consecutive settlement periods). |
| 5 | Log in claims register: `operator_deduction` column and spreadsheet payout log. |

---

## References

- [PATWADI_LAUNCH_ARCHITECTURE.md](../PATWADI_LAUNCH_ARCHITECTURE.md) — §9 visibility, §13 emergency recovery, custody model §1
- [Terms of Service](terms-of-service.html) — §§5–6
- [Shipping Policy](shipping-policy.html) — §§6–9
- [Pilot Operating Manual](pilot-operating-manual.md) — playbooks B–D, claims register
- [Operator Agreement (template)](operator-agreement-template.md) — §5 withhold/deduct

---

*Internal use only. Do not distribute to customers.*
