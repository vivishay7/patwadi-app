# Policy coverage matrix

Cross-reference of Patwadi policy checklist (Rapido-benchmarked) against **patwadi.com**, **repo docs**, and **in-app surfaces**. Status reflects pilot readiness — not a claim that every gap must be closed before launch. Patwadi uses Rapido as a **coverage benchmark**, not a copy target; see [What Patwadi already has that's sufficient](#what-patwadi-already-has-thats-sufficient-dont-over-copy-rapido) below.

**Docs index:** [docs/README.md](./README.md)

---

## patwadi.com vs repo

Legal pages exist in **both** places:

| Source | Path |
|--------|------|
| **Live site repo** | `E:\GithuB\patwadi.com\` (`terms.html`, `shipping.html`, `privacy-policy.html`) |
| **Repo mirror** | `E:\PatwadiApp\patwadi\docs\` (same three + duplicates `terms-of-service.html` / `shipping-policy.html`) |

They are **not just links** — HTML copies live in `docs/` and deploy from `patwadi.com`. Marketing pages (`how-it-works.html`, `drivers.html`) add policy-like FAQ copy that **does not always match** the legal HTML.

**Not on patwadi.com (before this session):** operator agreement, refund/cancellation standalone page, claims policy, any SOPs (all internal `.md` only).

**Published this session (draft / pilot):** [operator-agreement.html](https://patwadi.com/operator-agreement.html), [refunds.html](https://patwadi.com/refunds.html). Internal operator docs: `operator-onboarding-packet.md`, `operator-rate-card-pilot.md`.

**App policy URLs:** `ConfirmOrderScreen` → `patwadi.com/terms.html` + `shipping.html` + refunds link; `OperatorAgreementScreen` → `operator-agreement.html`.

---

## Part A — 10 main areas

| Area | Status | Where it lives | Gaps vs Rapido-style benchmark |
|------|--------|----------------|--------------------------------|
| **1. Driver/operator onboarding & KYC** | **PARTIAL** | `PATWADI_LAUNCH_ARCHITECTURE.md` §20; `docs/operator-kyc-sop.md`; [`docs/operator-onboarding-packet.md`](./operator-onboarding-packet.md); `E:\GithuB\patwadi.com\partner-onboarding.html` (static stub); `drivers.html` (interest form → Google Sheets) | **Sufficient for pilot:** manual Aadhaar + selfie + corridor assignment; operator onboarding packet published. **Gaps:** website KYC form not wired to `operator_kyc_packets`; marketing roles (rider/fleet/corridor) ≠ app roles (lmp/linehaul). |
| **2. Driver eligibility + background verification** | **PARTIAL** | `operator-kyc-sop.md` §2; architecture §20.1 gates (`approval_status`, `operator_status`) | **Sufficient for pilot:** identity + corridor plausibility checks. **Gaps:** no criminal/police/vehicle verification; no formal eligibility criteria doc; DigiLocker noted as future only. |
| **3. Driver responsibilities & code of conduct** | **PARTIAL** | [`docs/operator-agreement.html`](./operator-agreement.html) (draft); `docs/operator-agreement-template.md` §§1–3, 7–9; in-app `OperatorAgreementScreen` KEY_TERMS; [`docs/operator-onboarding-packet.md`](./operator-onboarding-packet.md) | **Sufficient:** custody duty, account security, corridor scope, refusal rights. **Gaps:** no standalone “Code of Conduct”; lawyer review pending on published agreement. |
| **4. Prohibited items** | **PARTIAL** | `docs/shipping-policy.html` §5; `PackageInfoScreen` legal checkbox; `how-it-works.html` FAQ (aligned to shipping §5, Jul 2026) | **Sufficient for pilot:** core banned categories + LMP refusal playbook (Playbook F). **Gaps:** no standalone prohibited-items policy page; screening is ops-only at pickup. |
| **5. Payment, commissions, cancellations, refunds, compensation** | **PARTIAL** | Customer: `terms.html` §§4–6, `shipping.html` §§6–9, [`docs/refunds.html`](./refunds.html) → [patwadi.com/refunds.html](https://patwadi.com/refunds.html); `docs/refund-dispute-policy-customer.md`. Operator: agreement §5; [`docs/operator-rate-card-pilot.md`](./operator-rate-card-pilot.md); `refund-dispute-policy-internal.md`; `pilot-operating-manual.md` §4 | **Sufficient:** prepay, tiered cancellation, ₹5k cap, weekly operator settlement, deduction rules; refund page published; rate card structure published. **Gaps:** per-corridor rupee rates still ops-communicated only. |
| **6. SOPs: pickup, handling, transit, delivery** | **PARTIAL** | `shipping-policy.html` §§1, 4; architecture custody model; app handoff flows; [`docs/operator-onboarding-packet.md`](./operator-onboarding-packet.md) (4-hop custody); `pilot-operating-manual.md` playbooks | **Sufficient (different model):** code+photo custody chain is stronger than generic courier SOPs. **Gaps:** pickup/transit/delivery steps not in one signed operator doc; many rules ops-only (2 attempts, storage, LMP assignment). |
| **7. Damaged / lost / delayed / stolen** | **PARTIAL** | `shipping.html` §§8–9; `terms.html` §6; [`docs/refunds.html`](./refunds.html); `refund-dispute-policy-customer.md`; playbooks B–D in `pilot-operating-manual.md` | **Sufficient:** damage/lost/delay with custody evidence and caps; FAQ claim window aligned to 48h. **Gaps:** no explicit **theft/stolen** policy; delayed = “overdue” + exception messaging, not a named customer policy. |
| **8. Fraud prevention + account suspension** | **PARTIAL** | Architecture §6 transfer risk flags, §19 location fraud layer; `phase20_security_fixes.sql`; `operator_status = suspended`; [`docs/operator-agreement.html`](./operator-agreement.html) §10 (brief); playbooks + chargeback SOP | **Sufficient for pilot:** technical flags + suspension field + payout freeze + agreement section. **Gaps:** no standalone published suspension/fraud policy; broader fraud heuristics explicitly post-launch (architecture). |
| **9. Customer privacy & data protection** | **PARTIAL** | [`docs/privacy-policy.html`](./privacy-policy.html) → [patwadi.com/privacy-policy.html](https://patwadi.com/privacy-policy.html) | **Sufficient as plain-language pilot summary.** **Gaps:** self-disclaims lawyer review; no DPDPA sections, retention schedules, operator Aadhaar/KYC in privacy policy, grievance officer. Footer legal links updated on main site pages (Jul 2026). |
| **10. Independent contractor / not employees** | **COMPLETE** (draft) | `operator-agreement-template.md` §2; [`docs/operator-agreement.html`](./operator-agreement.html); `OperatorAgreementScreen` term (b) | **Sufficient** for pilot intent. **Gaps:** lawyer review flagged in template + pilot manual §5. |

---

## Part B — 10 document types

| Document | Status | Where it lives (file + live URL) | Gaps |
|----------|--------|----------------------------------|------|
| **Driver/Operator Agreement** | **COMPLETE** (draft) | [`docs/operator-agreement-template.md`](./operator-agreement-template.md) (DRAFT); [`docs/operator-agreement.html`](./operator-agreement.html) → [patwadi.com/operator-agreement.html](https://patwadi.com/operator-agreement.html); in-app [`OperatorAgreementScreen.tsx`](../src/screens/OperatorAgreementScreen.tsx) | Lawyer review still required before treating as final. |
| **Customer Terms & Conditions** | **COMPLETE** | [`docs/terms.html`](./terms.html) / [`terms-of-service.html`](./terms-of-service.html); [patwadi.com/terms.html](https://patwadi.com/terms.html); enforced in [`ConfirmOrderScreen.tsx`](../src/screens/parcel/ConfirmOrderScreen.tsx) | Minor: not in sitemap. |
| **Privacy Policy** | **PARTIAL** | [`docs/privacy-policy.html`](./privacy-policy.html); [patwadi.com/privacy-policy.html](https://patwadi.com/privacy-policy.html) | Lawyer review + DPDPA/operator KYC data + Play Data Safety alignment pending. |
| **Shipping Policy** | **COMPLETE** | [`docs/shipping-policy.html`](./shipping-policy.html) / [`shipping.html`](./shipping.html); [patwadi.com/shipping.html](https://patwadi.com/shipping.html); enforced in [`ConfirmOrderScreen.tsx`](../src/screens/parcel/ConfirmOrderScreen.tsx) | Does not include size/weight limits from `how-it-works.html` FAQ. |
| **Refund & Cancellation Policy** | **COMPLETE** (draft) | [`docs/refunds.html`](./refunds.html) → [patwadi.com/refunds.html](https://patwadi.com/refunds.html); [`refund-dispute-policy-customer.md`](./refund-dispute-policy-customer.md); embedded in [`terms.html`](./terms.html) §5; linked from [`ConfirmOrderScreen.tsx`](../src/screens/parcel/ConfirmOrderScreen.tsx) | Claims content overlaps shipping §§8–9; no separate claims-only page. |
| **Prohibited Items Policy** | **PARTIAL** | [`shipping.html`](./shipping.html) §5; [`PackageInfoScreen.tsx`](../src/screens/parcel/PackageInfoScreen.tsx) checkbox; `how-it-works.html` FAQ (aligned Jul 2026) | Optional standalone page for clarity. |
| **Claims & Compensation Policy** | **PARTIAL** | [`refunds.html`](./refunds.html); [`terms.html`](./terms.html) §6, [`shipping.html`](./shipping.html) §§8–9 | Consolidated on refunds page; internal SOP remains [`refund-dispute-policy-internal.md`](./refund-dispute-policy-internal.md). |
| **Driver Onboarding SOP** | **PARTIAL** | [`docs/operator-kyc-sop.md`](./operator-kyc-sop.md); [`docs/operator-onboarding-packet.md`](./operator-onboarding-packet.md); architecture §20 | Website onboarding form is placeholder, not production KYC flow. |
| **Parcel Handling SOP** | **PARTIAL** | Custody rules in operator agreement + onboarding packet; shipping §1; playbooks in [`pilot-operating-manual.md`](./pilot-operating-manual.md) | Many ops-only rules (2 attempts, storage) not in operator packet. |
| **Incident Reporting SOP** | **PARTIAL** | [`operator-onboarding-packet.md`](./operator-onboarding-packet.md) §7; [`pilot-operating-manual.md`](./pilot-operating-manual.md) §3 (Playbooks A–F); [`refund-dispute-policy-internal.md`](./refund-dispute-policy-internal.md) | Customer “how to report” on refunds page; operator incidents in onboarding packet. |

---

## What Patwadi already has that's sufficient (don't over-copy Rapido)

1. **Custody chain (code + photo)** — operational and legal backbone; better than a generic handling PDF if enforced.
2. **Tiered refund rules + internal dispute SOP** — customer rules in T&C/shipping; ops playbook is detailed.
3. **Pilot-scale KYC SOP** — appropriate without full background-check vendor at current volume.
4. **In-app acceptance gates** — T&C + shipping at payment; operator agreement gate with DB timestamp (`phase25_operator_agreement.sql`).
5. **Independent contractor + indemnity** — already in operator agreement template.

---

## Top 5 gaps to write next (prioritized)

1. **Lawyer review** — operator agreement HTML, privacy policy (DPDPA), and refunds page before formal store / wider launch.
2. **DPDPA-ready privacy policy** — retention schedules, operator Aadhaar/KYC data section, grievance officer; align Play Data Safety.
3. **Per-corridor rupee rate table** — structure exists in `operator-rate-card-pilot.md`; fill actual pilot rates when ops confirms numbers.
4. **Production operator KYC flow** — wire website onboarding to `operator_kyc_packets` (architecture §20.6).
5. **Sitemap + post footers** — add new legal URLs to `sitemap.xml`; update blog post footer templates.

**Done this session (Jul 2026):** operator agreement draft published; refunds page + checkout link; onboarding packet + rate card; FAQ/footer/payout conflicts reconciled on patwadi.com.

---

## Sources

- **Repo docs index:** `E:\PatwadiApp\patwadi\docs\README.md` ([`docs/README.md`](./README.md))
- **Architecture:** `E:\PatwadiApp\patwadi\PATWADI_LAUNCH_ARCHITECTURE.md` §§6, 13, 19, 20 ([`PATWADI_LAUNCH_ARCHITECTURE.md`](../PATWADI_LAUNCH_ARCHITECTURE.md))
- **Website repo:** `E:\GithuB\patwadi.com\`
- **App surfaces:**
  - [`src/screens/parcel/ConfirmOrderScreen.tsx`](../src/screens/parcel/ConfirmOrderScreen.tsx) — customer T&C + shipping links at checkout
  - [`src/screens/parcel/PackageInfoScreen.tsx`](../src/screens/parcel/PackageInfoScreen.tsx) — prohibited-items legal checkbox
  - [`src/screens/OperatorAgreementScreen.tsx`](../src/screens/OperatorAgreementScreen.tsx) — operator agreement acceptance gate
