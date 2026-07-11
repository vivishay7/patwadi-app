# Patwadi Build Journey — Inception to Pilot

A founder- and newcomer-facing map of everything built to get Patwadi from idea to first pilot parcels: brand, legal, product architecture, engineering, operations, and go-to-market.

**What Patwadi is:** Overnight intercity parcel delivery for North India on fixed **corridors** (e.g. Delhi ↔ Chandigarh). Parcels move along verified corridor linehaul with local pickup/delivery partners through a **four-hop custody chain**: customer → LMP → linehaul → LMP → customer. Every handoff is verified in-app (code + photo).

**Status legend:** `COMPLETE` · `IN PROGRESS` · `EXTERNAL` (done outside repo) · `REMAINING`

**How to read this doc:** Git history is sparse (7 commits); the detailed engineering arc is Sessions 1–25 in `PATWADI_EXECUTION_PLAN.md` (Jun 2026). Dates below combine git milestones, doc effective dates, and session completion notes.

---

## Phase overview

| Phase | Name | When | Status |
|-------|------|------|--------|
| **0** | Inception & vision | Pre-2025 → codified 12 Jun 2026 | COMPLETE |
| **1** | Brand & identity | EXTERNAL at inception; in-repo Jun 2026 | COMPLETE (final logo/ads EXTERNAL) |
| **2** | Legal & compliance foundation | Jun 2026 (effective 14 Jun) | MOSTLY COMPLETE |
| **3** | Product architecture | v6 spec 12 Jun 2026; schema phases 2–25 | COMPLETE |
| **4** | App build | Nov–Dec 2025 scaffold → Sessions 1–25 Jun 2026 | MOSTLY COMPLETE |
| **5** | Operations & trust | Jun 2026 docs + in-app enforcement | COMPLETE (lawyer review REMAINING) |
| **6** | Go-to-market | Session 24 + EAS config Jun 2026 | IN PROGRESS |
| **7** | Pilot launch gates | Today | IN PROGRESS |

---

## Diagram 1 — Horizontal timeline (inception → pilot)

```mermaid
gantt
    title Patwadi build journey (inception → pilot)
    dateFormat YYYY-MM-DD
    axisFormat %b %Y

    section Phase 0–1 Vision & brand
    Problem + corridor model (founder)           :done, p0, 2024-01-01, 2025-11-27
    Logo + ad creatives (EXTERNAL)                 :done, p1e, 2024-01-01, 2025-11-27
    Brand system in repo (#FF3A22, tagline)        :done, p1r, 2026-06-17, 2026-06-18

    section Phase 2 Legal
    Privacy, terms, shipping, refund policies      :done, p2, 2026-06-14, 2026-06-17
    Operator agreement template (DRAFT)            :active, p2d, 2026-06-14, 2026-06-18
    Lawyer review (agreement + pilot manual §5)    :p2l, 2026-06-18, 2026-07-15

    section Phase 3–4 Architecture & app
    Expo scaffold (Initial commit)                 :done, p4a, 2025-11-28, 2025-12-01
    Batch 8 customer/operator flows                :done, p4b, 2025-12-07, 2025-12-07
    v6 Launch Architecture + Execution Plan        :done, p3, 2026-06-12, 2026-06-12
    Sessions 1–25 engineering arc                  :done, p4c, 2026-06-12, 2026-06-17
    Full codebase sync to repo root                :done, p4d, 2026-06-17, 2026-06-17

    section Phase 5–7 Ops & launch
    Pilot manual, KYC SOP, notification copy       :done, p5, 2026-06-14, 2026-06-17
    Play Store copy + feature graphic              :done, p6a, 2026-06-17, 2026-06-17
    EAS preview build (a0a0f17c / fa3c8ed)         :active, p6b, 2026-06-18, 2026-06-25
    Session 23 checklist + Razorpay webhook        :p7a, 2026-06-18, 2026-07-01
    Pilot parcels 1–5                              :p7b, 2026-06-25, 2026-07-15
```

---

## Phase 0 — Inception & vision `COMPLETE`

**Problem:** Intercity parcels in North India rely on informal corridor networks with no verified custody chain. Customers lack certainty; operators lack a shared operating layer.

**Solution shape (corridor model):**
- Fixed **corridors** between city pairs — not a depot finder or same-day courier.
- **Custody events** = legal/operational truth (immutable handoffs).
- **Layered truth:** custody > trips > WhatsApp coordination > GPS contingency.
- **Brand promise:** certainty and trust, not speed (*"Patwadi sells certainty, not speed"*).

**Evidence in repo:**
- Early codebase analysis: `PRODUCT_DIRECTION_ANALYSIS.md` (2024) — stubbed customer journey, Mapbox, pricing placeholders.
- Product thesis codified: `PATWADI_LAUNCH_ARCHITECTURE.md` §1 (v6, 12 Jun 2026).
- Plain-language overview: `PATWADI_FOR_TEAM.md`.

**Launch corridors (examples):** Delhi–Chandigarh, Delhi–Manali, Mandi–Chandigarh, Shimla–Chandigarh, Shimla–Delhi, Mumbai–Pune.

---

## Phase 1 — Brand & identity `COMPLETE` (logo/ads `EXTERNAL`)

### EXTERNAL (founder — complete, not in repo)
| Item | Status |
|------|--------|
| Final logo | **EXTERNAL COMPLETE** |
| Ad creatives (marketing) | **EXTERNAL COMPLETE** |
| Corridor network / operator relationships | **EXTERNAL** (ops, not code) |

### In-repo brand system `COMPLETE`
| Item | Location | Notes |
|------|----------|-------|
| Primary red `#FF3A22` | `src/theme/colors.ts`, legal HTML headers | Brand CTA color |
| Tagline **"Every parcel. Verified."** | `scripts/generate-brand-assets.mjs` → `assets/feature-graphic.png` | Play Store feature graphic |
| App icons + splash | `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png` | Generated Jun 17 2026 (`f43033d`) |
| Notification voice | `docs/notification-copy-sheet.md` v0.2 | Humanity → Recognition → Trust |
| Core brand promise (notifications) | Same doc | *"Delivery that works around real life."* |
| Play Store short description (recommended A) | `docs/play-store-listing.md` | *"Intercity parcel delivery on verified corridors. Every handoff verified."* |

**Git:** `f43033d` (2026-06-17) — `scripts/generate-brand-assets.mjs` + sharp dependency.

---

## Phase 2 — Legal & compliance foundation `MOSTLY COMPLETE`

| Document | Effective / updated | Live URL | Status |
|----------|---------------------|----------|--------|
| Privacy policy | June 2026 | https://patwadi.com/docs/privacy-policy | **COMPLETE** (lawyer review noted in HTML) |
| Terms of Service | 14 Jun 2026 | https://patwadi.com/terms.html | **COMPLETE** |
| Terms (long form) | 14 Jun 2026 | `docs/terms-of-service.html` | **COMPLETE** |
| Shipping policy | 14 Jun 2026 | https://patwadi.com/shipping.html | **COMPLETE** |
| Refund/dispute (customer) | 14 Jun 2026 | `docs/refund-dispute-policy-customer.md` | **COMPLETE** |
| Refund/dispute (internal) | 14 Jun 2026 | `docs/refund-dispute-policy-internal.md` | **COMPLETE** |
| Operator agreement | DRAFT | In-app links to terms; template in repo | **REMAINING** — lawyer review |
| Play Data Safety form | — | Play Console | **REMAINING** — must reflect Phase 4 permissions |
| T&C before pay (in-app) | Session 23 | `ConfirmOrderScreen` + `phase23_terms_accepted.sql` | **COMPLETE** |
| Operator agreement gate | Session 25 | `OperatorAgreementScreen` + `phase25_operator_agreement.sql` | **COMPLETE** (template still DRAFT) |

**In-app enforcement:** Checkboxes on checkout; `terms_accepted_at` set server-side; operators blocked until agreement RPC accepted.

---

## Phase 3 — Product architecture `COMPLETE`

**Source of truth:** `PATWADI_LAUNCH_ARCHITECTURE.md` v6 (12 Jun 2026, supersedes v1–v5).

| Pillar | What was defined |
|--------|------------------|
| **Custody model** | `CustodyEvent` chain; `deriveParcelState()` — never trust legacy `Order.status` |
| **4-hop chain** | customer→LMP→linehaul→LMP→customer; code + photo at every handoff |
| **Roles** | `customer` \| `lmp` \| `linehaul`; admin via `admin_profiles` (not a profile role) |
| **Corridors** | DB table (`phase6_corridors.sql`); admin on/off without app release |
| **Linehaul trips** | Draft→open→closed→completed; co-conductor, transfer risk flags, emergency recovery (§13) |
| **Customer UX (§9)** | 5-stage simplified tracker; WhatsApp support deep links (§10) |
| **Operator onboarding (§20)** | Website KYC → admin creates user; app gates on `approval_status` + `operator_status` |
| **Phase 4 GPS (§19)** | Foreground trip-window tracking; `location_samples` + `sync-location-samples` |

**Schema evolution (32 files in `supabase/schema/`):**

| Schema phase | Theme |
|--------------|-------|
| `profiles.sql`, `mvp_custody.sql` | MVP roles, orders, custody_events, handoff_codes |
| `phase2`–`phase5` | Trips, timers, limits, admin recovery |
| `phase6`–`phase13` | Corridors DB, operator parcels, transfer acceptance, trip coverage |
| `phase14`–`phase17` | Saved addresses, profile identity, operator onboarding model |
| `phase20`–`phase25` | Security hardening, payments, custody location, terms, packaging, operator agreement |

**Infrastructure `COMPLETE`:**
- Supabase **patwadi-dev:** `wvxyaqqlqwbbpkgvrali.supabase.co`
- **14 edge functions** (handoff, payments, admin, GPS sync)
- Mapbox geocoding (`EXPO_PUBLIC_MAPBOX_TOKEN`)
- Razorpay via edge functions + `react-native-razorpay`
- Storage: `custody-proofs` bucket + RLS
- Domain: **patwadi.com** (legal URLs + privacy)

---

## Phase 4 — App build `MOSTLY COMPLETE`

### Pre-v6 scaffold (git milestones)

| Milestone | Date | What shipped |
|-----------|------|--------------|
| Initial commit | 2025-11-28 | Expo + RN shell |
| Batch 8 | 2025-12-07 | Auth context, parcel screens, ConfirmOrder expansion, Mapbox dropoff, camera measure UI |
| Codebase sync | 2026-06-17 | Full `src/`, Supabase, docs, team guides at repo root |

### v6 execution arc (Sessions 1–25, Jun 2026)

Map sessions to **product areas** (not just numbers):

| Area | Sessions | Status |
|------|----------|--------|
| Foundation: edge fns, corridor_key, logout | 1, 1.5 | COMPLETE |
| Trips, RLS, transfers, recovery | 2–5 | COMPLETE |
| Customer tracker + WhatsApp support | 6 | COMPLETE |
| Operator trip UI + Admin Phase 2 UI | 8, 9, 8.5 | COMPLETE |
| Home + notifications feed | 6b | COMPLETE |
| Corridors DB + admin tab | 10 | COMPLETE |
| GPS / location samples | 11 | COMPLETE |
| Auth UX, empty states, deletion, offline | 12a–16 | COMPLETE |
| Operator onboarding model (§20) | 17 | COMPLETE |
| OTP, LMP gate, corridor copy fixes | 18 | COMPLETE |
| Store compliance, package ID, privacy URL | 19 | COMPLETE |
| Security: RLS, atomic handoff, delete-account | 20 | COMPLETE |
| Payment integrity + webhook | 21 | COMPLETE |
| 4-hop ordering + LMP assign RPC | 22 | COMPLETE |
| Pre-build checklist (verification only) | 23 | **REMAINING** |
| Play assets + iOS EAS config | 24 | COMPLETE |
| Operator agreement gate | 25 | COMPLETE |
| Visual polish | 7 | **REMAINING** |
| Segmented handoff code input | 14 | **REMAINING** |
| Physical device: payment E2E + GPS smoke | 12 Part B | **IN PROGRESS** (partial) |

**Tech stack today:** React Native 0.81, Expo SDK 54, TypeScript, React Navigation 7, Supabase JS.

**Package ID:** `com.patwadi.app` (`app.config.js`).

---

## Phase 5 — Operations & trust `COMPLETE` (lawyer review `REMAINING`)

| Artifact | Status | Notes |
|----------|--------|-------|
| `docs/pilot-operating-manual.md` v0.1 | COMPLETE | Effective 14 Jun 2026; parcels 1–5 founders+friends |
| `docs/operator-kyc-sop.md` | COMPLETE | Website KYC → Supabase Table Editor workflow |
| `docs/notification-copy-sheet.md` v0.2 | COMPLETE | Push/in-app copy by journey stage; first-parcel CTA |
| `docs/linehaul-ux-issues.md` | IN PROGRESS | Living log (L-UX-13–22) |
| Claims / escalation playbooks | COMPLETE | Pilot manual §3; spreadsheet fields defined |
| In-app vs OPS-only matrix | COMPLETE | Pilot manual §2 |

**Key ops reality:** Pilot scope (who may book) is **OPS ONLY** — no invite code in app. Support: WhatsApp +91 80918 89969, 8am–10pm IST.

---

## Phase 6 — Go-to-market `IN PROGRESS`

| Item | Status |
|------|--------|
| `docs/play-store-listing.md` | COMPLETE |
| `docs/play-store-screenshots.md` (brief) | COMPLETE |
| `assets/feature-graphic.png` 1024×500 | COMPLETE |
| Store screenshots (actual PNGs) | **REMAINING** |
| `eas.json` preview APK + production AAB profiles | COMPLETE |
| EAS project ID in `app.config.js` | COMPLETE |
| EAS preview build `a0a0f17c` on commit `fa3c8ed` | **IN PROGRESS** (`newArchEnabled` fix) |
| iOS TestFlight build | **REMAINING** (profiles configured, build not run) |
| Closed testing (12 testers / 14 days) | **REMAINING** |
| Production AAB + Play submission | **REMAINING** |
| `docs/razorpay-dashboard-setup.md` | **REMAINING** (parked — webhook registration manual) |

---

## Diagram 2 — Swimlane: who built what

```mermaid
flowchart TB
  subgraph lanes["Build journey swimlanes"]
    direction TB

    subgraph F["Founder / Brand"]
      F1["Vision: certainty over speed<br/>corridor model"]
      F2["Logo + ad creatives<br/>EXTERNAL COMPLETE"]
      F3["Corridor operator relationships"]
      F4["Pilot parcel list<br/>founders + friends"]
    end

    subgraph L["Legal / Compliance"]
      L1["Privacy, terms, shipping<br/>14 Jun 2026 COMPLETE"]
      L2["Refund policies<br/>COMPLETE"]
      L3["Operator agreement DRAFT<br/>lawyer REMAINING"]
      L4["Play Data Safety<br/>REMAINING"]
    end

    subgraph E["Engineering"]
      E1["Nov 2025 Expo scaffold"]
      E2["Dec 2025 Batch 8 flows"]
      E3["Jun 2026 v6 spec + Sessions 1–25"]
      E4["32 schema phases + 14 edge fns"]
      E5["Session 7 polish REMAINING"]
      E6["Session 14 handoff UI REMAINING"]
    end

    subgraph O["Operations"]
      O1["Pilot operating manual<br/>14 Jun 2026"]
      O2["KYC SOP + claims playbooks"]
      O3["Notification copy v0.2"]
      O4["linehaul-ux-issues log<br/>IN PROGRESS"]
    end

    subgraph G["GTM / Store"]
      G1["Brand asset script + icons<br/>Jun 17 2026"]
      G2["Play listing + feature graphic<br/>Session 24"]
      G3["EAS preview build<br/>IN PROGRESS"]
      G4["Screenshots + submission<br/>REMAINING"]
    end
  end

  F1 --> E3
  F2 --> G1
  L1 --> E3
  E3 --> O1
  E4 --> G3
  O1 --> F4
  G3 --> F4
```

---

## Phase 7 — Pilot launch gates `IN PROGRESS`

Five must-haves before **pilot parcels 1–5** (`pilot-operating-manual.md` §1):

```mermaid
flowchart LR
  subgraph GATES["Pilot gates"]
    G1["G1 Legal URLs live<br/>patwadi.com privacy + terms + shipping<br/>COMPLETE"]
    G2["G2 Payment integrity<br/>T&C checkboxes + server terms_accepted_at<br/>Razorpay HMAC + amount validation<br/>COMPLETE"]
    G3["G3 Custody chain executable<br/>assign_lmp_to_order + 4-hop + atomic handoff<br/>COMPLETE"]
    G4["G4 Operator compliance<br/>approval + agreement gate + 403 without accept<br/>COMPLETE"]
    G5["G5 Build + ops ready<br/>Edge fns deployed · Razorpay webhook · EAS APK to testers<br/>IN PROGRESS"]
  end

  G1 --> G2 --> G3 --> G4 --> G5
  G5 --> PILOT["Pilot parcels 1–5<br/>founders + named friends<br/>REMAINING"]
```

| Gate | Blockers |
|------|----------|
| G5 | Session 23 checklist not run; Razorpay webhook not registered (`docs/razorpay-dashboard-setup.md`); EAS build `a0a0f17c` in progress |
| Post-G5 | Store screenshots; lawyer review; closed testing track; pilot parcels |

---

## Session quick reference

| Sessions | Area | Status |
|----------|------|--------|
| 1–1.5 | Cleanup, edge functions, logout | COMPLETE |
| 2–5 | Trips, RLS, transfers, recovery | COMPLETE |
| 6, 6b | Customer tracker, home, notifications feed | COMPLETE |
| 7 | Visual polish | REMAINING |
| 8–11 | Operator/admin UI, corridors DB, GPS | COMPLETE |
| 12–16 | Auth UX, empty states, account deletion | COMPLETE |
| 12 (device) | Payment E2E + GPS smoke | IN PROGRESS (Part B partial) |
| 14 | Segmented handoff code input | REMAINING |
| 17–18 | Operator model, corridor copy/OTP fixes | COMPLETE |
| 19–22 | Store config, security, payments, custody | COMPLETE |
| 23 | Pre-build verification only | REMAINING |
| 24–25 | Play assets, operator agreement + edge redeploy | COMPLETE |
| Security session | npm audit, rate limits, CORS | COMPLETE |

---

## Key URLs & artifacts

| Artifact | Location |
|----------|----------|
| Privacy (live) | https://patwadi.com/docs/privacy-policy |
| Terms (checkout) | https://patwadi.com/terms.html |
| Shipping | https://patwadi.com/shipping.html |
| Product spec | `PATWADI_LAUNCH_ARCHITECTURE.md` |
| Build sessions | `PATWADI_EXECUTION_PLAN.md` |
| Team overview | `PATWADI_FOR_TEAM.md` |
| Developer onboarding | `PATWADI_APP_DOCUMENTATION.md` |
| Razorpay webhook URL | `https://wvxyaqqlqwbbpkgvrali.supabase.co/functions/v1/razorpay-webhook` |
| Supabase project | `wvxyaqqlqwbbpkgvrali.supabase.co` (patwadi-dev) |
| EAS preview command | `eas build --platform android --profile preview` (build `a0a0f17c`, commit `fa3c8ed`) |
| Feature graphic | `assets/feature-graphic.png` via `scripts/generate-brand-assets.mjs` |
| Notification copy | `docs/notification-copy-sheet.md` v0.2 |
| Pilot ops manual | `docs/pilot-operating-manual.md` |

---

## What's still open (summary)

- **REMAINING:** Session 7 polish, Session 14 handoff UI, Session 23 checklist, Razorpay dashboard webhook, Play submission + Data Safety, store screenshots, lawyer review (operator agreement + pilot manual §5), pilot parcels 1–5, iOS TestFlight build.
- **IN PROGRESS:** EAS preview build `a0a0f17c` (`fa3c8ed`); physical-device GPS/payment smoke; `linehaul-ux-issues.md`.
- **EXTERNAL COMPLETE:** Final logo and ad creatives (founder-produced).
