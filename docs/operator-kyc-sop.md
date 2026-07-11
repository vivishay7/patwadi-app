# Patwadi Operator KYC Review SOP

| Field | Value |
|-------|-------|
| **Document** | Patwadi Operator KYC Review SOP |
| **Version** | 0.1 |
| **Status** | INTERNAL — pilot only |
| **Effective** | 14 June 2026 |
| **Audience** | Founder or ops team member approving operator applications |

**Sources:** [PATWADI_LAUNCH_ARCHITECTURE.md](../PATWADI_LAUNCH_ARCHITECTURE.md) §20 (especially §20.1, §20.2), [operator-agreement-template.md](operator-agreement-template.md), [pilot-operating-manual.md](pilot-operating-manual.md).

Operators onboard via the Patwadi website (KYC packet). Admin creates the auth user and `profiles` row. At launch, all review and approval is manual in Supabase Table Editor. A future admin UI will replace this (architecture §20.6).

---

## 1. WHAT WE COLLECT AND WHY

Data lives in `operator_kyc_packets` (one row per operator, keyed by `user_id`). Corridor assignment is separate in `operator_corridors`. For linehaul conductors, also note the **bus operator name** stated at onboarding (not stored in `operator_kyc_packets`; bus trip details are captured later at Create Trip).

### Identity documents

| Field | What it is | Why we need it | Valid example | Invalid example |
|-------|------------|----------------|---------------|-----------------|
| `aadhaar_storage_path` | Storage path to uploaded Aadhaar image (front; back if provided) | Verify the applicant is a real person and matches the name on file. Required for KYC before activation (Operator Agreement §6). | Clear photo of Aadhaar card; name and photo readable; not cropped or blurred | Screenshot of a screen, expired or damaged card unreadable, someone else's Aadhaar, blank or placeholder file |
| `pan_storage_path` | Storage path to uploaded PAN card image | Optional. Supports payout and tax record-keeping if provided. | Legible PAN card matching applicant name | Blurry image, PAN belonging to a different person, empty upload when ops expected PAN |
| `selfie_storage_path` | Storage path to a live selfie of the applicant | Manual face match against Aadhaar photo at launch. Confirms the person submitting KYC is the ID holder. | Recent selfie, face fully visible, same person as Aadhaar photo | Sunglasses or mask hiding face, group photo, stock image, selfie that clearly does not match Aadhaar |

### Payment details

One payment method active at a time (`payment_method_type` is either `upi` or `bank_transfer`). Weekly settlement goes to the UPI ID or bank account on file (Operator Agreement §5).

| Field | What it is | Why we need it | Valid example | Invalid example |
|-------|------------|----------------|---------------|-----------------|
| `payment_method_type` | `upi` or `bank_transfer` | Tells ops which payout fields to use. | `upi` with a filled `upi_id` | `upi` selected but bank fields filled instead; both UPI and bank filled as if both are active |
| `upi_id` | UPI VPA for settlement | Required when `payment_method_type = 'upi'`. Weekly earnings are paid here. | `name@paytm`, `9876543210@ybl` — matches applicant or their stated business name | Random third-party UPI, typo VPA, left blank when type is `upi` |
| `bank_account_number` | Bank account number | Required when `payment_method_type = 'bank_transfer'`. | Valid account number with matching IFSC and account name | Wrong length, account clearly not in applicant's name |
| `bank_ifsc_code` | IFSC of the branch | Required for bank transfer. Routes payout to the correct branch. | Valid 11-character IFSC (e.g. `HDFC0001234`) | Invalid or mistyped IFSC, IFSC for a different bank than stated |
| `bank_account_name` | Name on the bank account | Required for bank transfer. Must align with applicant / Aadhaar name. | Same or reasonable match to legal name on Aadhaar | Completely different person's name with no explanation |
| `bank_account_type` | `savings` or `current` | Required for bank transfer. | `savings` for individual operators | Missing when type is `bank_transfer`; value other than `savings` or `current` |

### Emergency contact

Used when the operator is unreachable on an active trip — after `linehaul_trips.driver_phone` for linehaul (architecture §20.1). Surfaced in admin Trip Detail and dispute reports only.

| Field | What it is | Why we need it | Valid example | Invalid example |
|-------|------------|----------------|---------------|-----------------|
| `emergency_contact_name` | Nominated contact's name | Ops can identify who to call if the operator does not answer. | Spouse, business partner, or family member with a real name | Blank, "N/A", obvious fake name |
| `emergency_contact_phone` | Nominated contact's phone | Second-line reachability mid-route (pilot-operating-manual Playbook E). | Working Indian mobile number, different from operator's own phone | Same number as operator, invalid number, missing entirely |

### Corridors and linehaul context

| Item | What it is | Why we need it | Valid example | Invalid example |
|------|------------|----------------|---------------|-----------------|
| Primary corridors | Corridors the operator stated at onboarding; assigned in `operator_corridors` (`corridor_key` per row) | Operators may handle parcels only on assigned corridors (Operator Agreement §1). Drives Create Trip picker and LMP scope. | Applicant states Delhi–Chandigarh and you confirm they actually run that route; you assign `delhi_chandigarh` in `operator_corridors` | Claims a corridor Patwadi does not serve, or corridor they have never operated on |
| Bus operator name (linehaul only) | Name of the bus company / transport operator the conductor works with, as stated at onboarding | Cross-check that the linehaul applicant actually operates on the claimed corridor with a real bus service. Bus number and route details are captured per trip at Create Trip; this name is the upfront sanity check. | "Volvo Travels", "HRTC contract conductor on Delhi–Chandigarh" — consistent with how they describe their work | Vague or changed story, name that does not match any service on the stated corridor, LMP applicant listing a bus company (not applicable to LMP) |

### Metadata (for your awareness)

| Field | What it is | Why it matters |
|-------|------------|----------------|
| `submitted_at` | When the KYC packet was submitted | Queue ordering; how long the applicant has waited |
| `verified_at` | When ops completed review | Record keeping (Section 5) |
| `verified_by` | Admin user who approved or rejected | Audit trail (Section 5) |

---

## 2. HOW TO REVIEW AN APPLICATION (step by step)

### Where to find pending applications

1. Open **Supabase → Table Editor**.
2. **`profiles`:** filter `role` = `lmp` or `linehaul` and `approval_status` = `pending`.
3. **`operator_kyc_packets`:** open the row where `user_id` matches the applicant.
4. Open document files from storage using the `*_storage_path` values.
5. Note corridors stated in the onboarding form or WhatsApp thread (assignment happens at approval).
6. **Future:** Admin Operators tab (architecture §20.6) will replace manual Table Editor steps.

### Review checklist

| Step | Action |
|------|--------|
| 1 | Confirm `operator_kyc_packets` row exists and `submitted_at` is set. |
| 2 | **Aadhaar:** visual check only at launch. Confirm card looks genuine, name and photo are readable. DigiLocker API verification is future — do not block launch on it. |
| 3 | **Face match:** compare `selfie_storage_path` to Aadhaar photo manually. Same person, no obvious disguise. |
| 4 | **Name consistency:** Aadhaar name, `bank_account_name` (if bank transfer), and `profiles.full_name` should align. Flag material mismatches. |
| 5 | **Payment:** correct fields populated for `payment_method_type`. UPI or bank details look real. |
| 6 | **Emergency contact:** name and phone present; phone is not the operator's own number. |
| 7 | **Corridor check:** stated corridors match corridors Patwadi actually operates. Applicant plausibly works that route. |
| 8 | **Linehaul only — bus operator name:** cross-ref stated bus operator against corridor and applicant story. |
| 9 | **Role check:** `profiles.role` is `lmp` OR `linehaul`, not both (architecture §20.1). |

### Red flags — do not approve without escalation (Section 6)

- Name on Aadhaar does not match bank account name or profile name without a clear reason.
- Selfie clearly does not match Aadhaar photo.
- Aadhaar or selfie too low quality to verify.
- Missing or fake emergency contact (same phone as operator, "0000000000", etc.).
- Corridor claimed but not served by Patwadi, or applicant has no credible link to that route.
- Duplicate `emergency_contact_phone` across unrelated applicants (possible shared/fake identity).
- Payment details pointing to a third party with no explanation.

---

## 3. APPROVAL PROCESS

### Database updates

Do all of the following. An operator reaches the app only when **both** gates pass (architecture §20.1):

| Table | Field | Set to |
|-------|-------|--------|
| `profiles` | `approval_status` | `approved` |
| `profiles` | `operator_status` | `active` |
| `operator_kyc_packets` | `verified_at` | current timestamp |
| `operator_kyc_packets` | `verified_by` | your admin `auth.users` id |

### Assign corridors

Insert one row per approved corridor into `operator_corridors`:

- `operator_id` = applicant's `profiles.id`
- `corridor_key` = corridor key from `corridors` table (must exist and be active)
- `assigned_by` = your admin user id
- `assigned_at` = current timestamp

Without at least one corridor, a linehaul operator cannot publish trips; they see "No corridors assigned. Contact Patwadi ops." (architecture §20.4).

### WhatsApp message to operator (approved)

Send from **+91 80918 89969** (support number in operator agreement):

```
Hi [Name],

Your Patwadi operator account is approved.

Login: [email]
Temporary password: [as set in Supabase auth]

Download the app using the link we shared earlier. Sign in with these credentials.

Before your first trip/delivery, read the operator onboarding packet we will send separately (based on docs/operator-agreement-template.md). It covers corridors, custody rules, and weekly payout.

Reply here if you cannot log in.

— Patwadi ops
```

**Note:** `docs/operator-onboarding-packet.md` does not exist yet (pilot-operating-manual.md). For pilot, send the Operator Agreement template and any corridor/rate sheet ops has prepared.

---

## 4. REJECTION PROCESS

### Database updates

| Table | Field | Set to |
|-------|-------|--------|
| `profiles` | `approval_status` | `rejected` |
| `profiles` | `operator_status` | leave `inactive` (default for non-approved) |
| `operator_kyc_packets` | `verified_at` | current timestamp |
| `operator_kyc_packets` | `verified_by` | your admin user id |

Do **not** insert `operator_corridors` rows for rejected applicants.

### WhatsApp message to operator (rejected)

```
Hi [Name],

Thank you for applying to join Patwadi as an operator.

We are unable to approve your application at this time because [brief reason — e.g. identity documents could not be verified / corridor not served in pilot].

You may reapply after 30 days with corrected documents if your situation changes.

If you believe this is an error, reply here and we will take another look.

— Patwadi ops
```

### Reapplication

Yes — after **30 days**, with corrected documents. Treat as a new review. Update or replace `operator_kyc_packets` fields as needed; reset `approval_status` to `pending` only when you accept a resubmission.

---

## 5. RECORD KEEPING

| Field | Purpose |
|-------|---------|
| `operator_kyc_packets.verified_at` | Proof of when KYC review completed |
| `operator_kyc_packets.verified_by` | Which admin performed the review |
| `operator_corridors.assigned_by` | Which admin assigned corridors |
| `operator_corridors.assigned_at` | When corridors were assigned |

**Retention:** Keep KYC records for a **minimum of 3 years** — compliance target aligned with RBI expectations for financial intermediaries. Store paths point to Supabase Storage; do not delete approved or rejected packets before retention period without founder sign-off.

---

## 6. ESCALATION

Escalate to the **founder**. Do **not** approve if:

- Aadhaar and selfie appear to be different people.
- Documents look forged, edited, or reused from another application.
- `emergency_contact_phone` duplicates another operator's contact (possible identity fraud).
- Stated corridor or bus operator name does not match any credible operation on the Patwadi network.
- Anything else feels off — when in doubt, reject or hold; do not approve to "move the queue."

Document the reason in your ops notes (WhatsApp thread or internal log). Founder decides whether to report further or permanently block.

---

## Quick reference — schema fields (§20.2)

**`operator_kyc_packets`:** `user_id`, `aadhaar_storage_path`, `pan_storage_path`, `selfie_storage_path`, `payment_method_type`, `upi_id`, `bank_account_number`, `bank_ifsc_code`, `bank_account_name`, `bank_account_type`, `emergency_contact_name`, `emergency_contact_phone`, `submitted_at`, `verified_at`, `verified_by`

**`operator_corridors`:** `operator_id`, `corridor_key`, `assigned_by`, `assigned_at`

**`profiles` (§20.1 gates):** `approval_status`, `operator_status`
