# Patwadi Operator Rate Card — Pilot

| Field | Value |
|-------|-------|
| **Corridor** | Delhi–Chandigarh (pilot) |
| **Settlement** | Weekly, every Monday |
| **Status** | PILOT — rates communicated per assignment |
| **Effective** | 14 June 2026 |

This one-page schedule describes how operators earn during the closed pilot. Exact rupee amounts for your corridor and role are confirmed by Patwadi ops when you are assigned — this document explains the structure, not a binding quote.

---

## Settlement cycle

| Item | Detail |
|------|--------|
| **Frequency** | Weekly — every **Monday** |
| **Eligible parcels** | Completed delivery (`lmp_to_customer` custody event) in the prior 7 days |
| **Payment method** | UPI or bank transfer to details on your KYC record |
| **Reserve** | None during pilot |
| **Deductions** | Disputes, custody failures, loss/damage in your custody — capped at 2 settlement periods |

---

## Pilot corridor: Delhi–Chandigarh

| Leg | Role | Rate basis |
|-----|------|------------|
| Customer pickup | LMP | Per completed pickup — **rate communicated at corridor assignment** |
| LMP → linehaul handoff | LMP | Per handoff at boarding — **rate communicated at corridor assignment** |
| Linehaul transport | Linehaul conductor | Per parcel boarded on your trip — **rate communicated at corridor assignment** |
| Linehaul → LMP handoff | Linehaul conductor | Included in linehaul leg or per handoff — **confirmed by ops** |
| Final delivery | LMP | Per completed delivery — **rate communicated at corridor assignment** |

> **Note:** Patwadi does not publish a fixed per-parcel rupee table in this pilot document. Your assignment email or WhatsApp from ops includes the applicable rates for your role and corridor. Rates may be updated with reasonable notice during the pilot.

---

## What counts as “completed” for payout

- The parcel must reach the customer with a valid **lmp_to_customer** custody event (code + photo) in the app.
- Parcels still in transit, held for failed delivery, or under dispute investigation may be deferred to a later Monday.
- Chargebacks or custody investigations may trigger withholding per the [Operator Agreement §5](operator-agreement-template.md).

---

## Peak and bonuses

Peak-corridor bonuses, if offered, are communicated separately by ops. They are not guaranteed in the base rate card.

---

## Questions

WhatsApp **+91 80918 89969** · support@patwadi.com

Related: [Operator Agreement](operator-agreement.html) · [Onboarding Packet](operator-onboarding-packet.md)
