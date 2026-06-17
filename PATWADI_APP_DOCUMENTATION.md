# Patwadi App — Developer Onboarding

Standalone reference for the Patwadi React Native codebase. Derived from the running app, navigation, Supabase schema, and edge functions — not a copy of internal architecture docs.

---

## 1. What Patwadi is

Patwadi is an overnight intercity parcel delivery app built for India. Customers book corridor-based shipments (pickup → linehaul bus → delivery), pay via Razorpay, and track custody-based status updates. Operators move parcels through a four-step handoff chain: customer → LMP (first/last mile) → linehaul conductor → LMP → customer.

Three user types share one mobile app, routed after login:

| Role | Profile value | Purpose |
|------|---------------|---------|
| **Customer** | `customer` | Book parcels, pay, track, contact support |
| **Operator** | `lmp` or `linehaul` (exactly one) | Accept parcels, confirm handoffs, manage trips (linehaul) |
| **Admin** | `admin_profiles` row (not a profile role) | Recovery, blocked parcels, trip overrides, flagged transfers |

**Operator onboarding (launch, v6 §20):** Operators do **not** self-sign up in the app. KYC is collected on the Patwadi website; admin creates the auth user + `profiles` row in Supabase. Operators sign in with credentials they receive. In-app signup is **customer-only** (`RoleSelectScreen`). Pending or inactive operators land on `OperatorPendingScreen` until `approval_status = 'approved'` **and** `operator_status = 'active'`.

**Custody-first:** Parcel state is never inferred from a single `status` column. Every custody transfer is recorded as a `CustodyEvent` (with photo proof and server-validated handoff code); customer-facing labels are derived from that event chain.

---

## 2. Architecture overview

### Tech stack

| Layer | Technology |
|-------|------------|
| Mobile app | React Native 0.81, Expo SDK 54, TypeScript |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| Backend | Supabase (Postgres + Auth + RLS) |
| Server logic | 13 Supabase Edge Functions (Deno) |
| Storage | Supabase Storage buckets (`custody-proofs`, bus proof photos) |
| Maps / geocoding | Mapbox (`EXPO_PUBLIC_MAPBOX_TOKEN`) |
| Payments | Razorpay via edge functions + `react-native-razorpay` |
| Location | `expo-location` — foreground trip tracking (`tripTracking.ts`, Session 11); one-shot `captureCurrentLocation()` for co-conductor/transfer |

### Three-tier data access

1. **Client (anon key)** — Supabase JS client in `src/lib/supabase.ts`. Reads/writes are constrained by Row Level Security on tables such as `orders`, `custody_events`, `handoff_codes`, `profiles`, `linehaul_trips`, and storage policies in `supabase/schema/`.
2. **Edge functions (service role)** — Privileged operations (issue handoff codes, acknowledge handoffs, Razorpay, admin overrides) run in `supabase/functions/` with the user's JWT validated first, then service-role DB access.
3. **Database enforcement** — RLS policies and RPCs (e.g. `parcel_has_lmp_to_linehaul_on_trip`) are the source of truth; the app cannot bypass them with client-only checks.

### Key concepts

**Order** — A booked parcel row in the `orders` table. Defined in `src/lib/db/types.ts` as `Order`. Holds corridor, pickup/dropoff text, weight/dimensions, payment IDs, operator assignment fields (`lmp_pickup_id`, `linehaul_id`, `lmp_delivery_id`), and `trip_id` for linehaul attachment. The legacy `status` column exists but must not be used as custody source of truth.

**CustodyEvent** — Immutable handoff record in `custody_events`. Each row captures `from_role`, `to_role`, `proof_type` (`code` or `photo`), and `proof_value` (storage path for photos). Created only by the `acknowledge-handoff` edge function after code + photo validation. Type: `src/lib/db/types.ts` → `CustodyEvent`.

**LinehaulTrip** — Intercity bus run in `linehaul_trips`. Conductors create trips (`CreateTripScreen` → `tripService`), upload mandatory bus proof photo, publish to `open`, attach parcels, add co-conductors, and request transfers. Type: `src/lib/db/types.ts` → `LinehaulTrip`. Schema: `supabase/schema/phase2_trips.sql` and related phase files.

**SimplifiedParcelState** — Customer-facing lifecycle enum in `src/lib/db/types.ts`: `created` → `pickup_confirmed` → `in_transit` → `out_for_delivery` → `delivered`, plus `blocked_exception`. Labels and colors for UI live in `src/lib/domain/customerParcelStatus.ts`.

**deriveParcelState()** — Pure function in `src/lib/deriveParcelState.ts` that maps an ordered list of `CustodyEvent` rows to `SimplifiedParcelState` by checking which role-to-role transitions have occurred (`customer→lmp`, `lmp→linehaul`, `linehaul→lmp`, `lmp|linehaul→customer`). Used by customer tracking, operator parcel detail, and admin views.

**Operator profile gates (v6 §20)** — Two fields on `profiles`:

| Field | Values | Meaning |
|-------|--------|---------|
| `approval_status` | `pending` \| `approved` \| `rejected` | Has admin verified onboarding/KYC? |
| `operator_status` | `active` \| `suspended` \| `inactive` | Is the operator currently allowed to work? |

`is_conductor_approved_and_available()` (DB) and `checkConductorEligibility()` (client) require `approval_status = 'approved'`, `operator_status = 'active'`, and `is_available = true`.

**operator_corridors** — Junction table (`operator_id`, `corridor_key`). Operators only see corridors assigned by admin. `fetchApprovedCorridorsForOperator()` in `src/lib/domain/corridors.ts` drives the Create Trip picker; trip INSERT is guarded by RLS + `enforce_operator_corridor_on_trip()` trigger (`phase17_operator_onboarding.sql`).

**operator_kyc_packets** — Admin-managed KYC storage (Aadhaar, PAN, selfie, UPI/bank, emergency contact). Not editable in-app at launch. Schema: `phase17_operator_onboarding.sql`.

**Post-auth routing** — `src/lib/auth/postAuthRoute.ts` → `resolvePostAuthRoute()`:

1. `admin_profiles.active` → `Admin`
2. Missing `full_name` → `CompleteProfile`
3. `lmp` \| `linehaul` + approved + active → `Main` (operator tabs)
4. `lmp` \| `linehaul` + not approved or not active → `OperatorPending`
5. `customer` → `Main`
6. No `profiles.role` → `RoleSelect` (customer card only)

---

## 3. Screen map

Routes are registered in `src/navigation/RootNavigator.tsx` unless noted as tab or admin-stack children.

| Screen (file) | Route name | Role | What it does |
|---------------|------------|------|--------------|
| `SplashScreen.tsx` | `Splash` | All | Brand landing; login, sign-up, or guest entry |
| `LoginScreen.tsx` | `Login` | All | Unified email/phone identifier; OTP or password; sign-up for customers |
| `CompleteProfileScreen.tsx` | `CompleteProfile` | New users | Collect name (and optional email) before role select |
| `RoleSelectScreen.tsx` | `RoleSelect` | New customers | Customer-only account creation; `createProfile` rejects operator roles |
| `OperatorPendingScreen.tsx` | `OperatorPending` | Operators (gated) | Shown when operator not approved or not active; support link + sign out |
| `HomeScreen.tsx` | `Home` (tab) | All | Switches between `CustomerHome` and `DriverHome` by role |
| `home/CustomerHome.tsx` | *(embedded)* | Customer | Active parcel card, send-parcel CTA, trust strip |
| `home/DriverHome.tsx` | *(embedded)* | Operator | Links to My Trips, View Parcels, My Handoff Codes |
| `packages/MyPackagesScreen.tsx` | `Packages` (tab) | Customer | List/search orders with derived status |
| `NotificationsScreen.tsx` | `Notifications` (tab) | Customer | Custody-based notification feed |
| `SettingsScreen.tsx` | `Settings` (tab) | All | Account info, address book link, delete account, logout |
| `AddressBookScreen.tsx` | `AddressBook` | Customer | Saved pickup/dropoff addresses with labels |
| `SendParcelScreen.tsx` | `SendParcel` | Customer | Booking entry: Send a Parcel, My Parcels, Notifications |
| `parcel/PackageInfoScreen.tsx` | `PackageInfo` | Customer | Weight, dimensions, contents, packaging, photo estimate |
| `parcel/PickupScreen.tsx` | `Pickup` | Customer | Pickup address (Mapbox autocomplete), contact details |
| `parcel/DropoffScreen.tsx` | `Dropoff` | Customer | Dropoff address; unsupported corridor → *"We're not live on this corridor yet."* |
| `parcel/ParcelDetailsScreen.tsx` | `ParcelDetails` | Customer | Legacy summary screen (kept; flow uses PackageInfo path) |
| `parcel/PriceEstimateScreen.tsx` | `PriceEstimate` | Customer | Price breakdown before payment |
| `parcel/ConfirmOrderScreen.tsx` | `ConfirmOrder` | Customer | Razorpay checkout → order created → navigates to `TrackingDetails` |
| `packages/PackageDetailsScreen.tsx` | `PackageDetails` | Customer | Single order detail (weight, corridor, payment) |
| `packages/TrackingDetailsScreen.tsx` | `TrackingDetails` | Customer | Stage tracker, support sheet, delivery proof |
| `camera/CameraMeasureScreen.tsx` | `CameraMeasure` | Customer | **Stub** — "Camera Coming Soon"; manual dimensions used instead |
| `handoff/ConfirmHandoffScreen.tsx` | `ConfirmHandoff` | Operator | Enter 4-digit code + capture photo; calls acknowledge-handoff |
| `handoff/MyHandoffCodesScreen.tsx` | `MyHandoffCodes` | Operator | Lists active codes where user is receiver (RLS on `handoff_codes`) |
| `driver/DriverParcelsScreen.tsx` | `DriverParcels` | Operator | Parcels visible via `operator_order_view` |
| `driver/DriverParcelDetailsScreen.tsx` | `DriverParcelDetails` | Operator | View parcel, accept pending order, derived custody state |
| `driver/MyTripsScreen.tsx` | `MyTrips` | Operator (linehaul) | List conductor's trips |
| `driver/TripDetailScreen.tsx` | `TripDetail` | Operator (linehaul) | Publish trip, add co-conductor, request transfer, view attached parcels |
| `driver/CreateTripScreen.tsx` | `CreateTrip` | Operator (linehaul) | Draft trip, bus proof photo; **approved corridors only** + search |
| `onboarding/driver/*.tsx` | *(unregistered)* | — | Legacy placeholder files remain in repo; **removed from navigator** (§20) |
| `admin/AdminLoginScreen.tsx` | `AdminLogin` | Admin | **Dead code** — admin uses `LoginScreen` + `admin_profiles.active` |
| `admin/AdminDashboardScreen.tsx` | `AdminDashboard` | Admin | Overview, recovery, flagged transfers, trips tabs |
| `admin/AdminParcelsScreen.tsx` | `AdminParcels` | Admin | Search/filter parcels (blocked filter) |
| `admin/AdminParcelDetailsScreen.tsx` | `AdminParcelDetails` | Admin | Unblock parcel or regenerate handoff code |

Admin screens live under the `Admin` root route (`AdminStack.tsx`), gated by `isAdmin` in `AuthContext`.

---

## 4. Edge functions

All functions live under `supabase/functions/<name>/index.ts`. CORS is handled via `supabase/functions/_shared/cors.ts`.

| Function | What it does | Auth required |
|----------|--------------|---------------|
| `create-razorpay-order` | Creates Razorpay order server-side; inserts `payment_sessions` row | Yes — authenticated customer JWT |
| `verify-razorpay-payment` | Verifies HMAC signature; creates `orders` row on success | Yes — authenticated customer JWT |
| `issue-handoff-code` | Issues one-time 4-digit code for a parcel handoff step (not returned to sender) | Yes — authenticated user JWT |
| `acknowledge-handoff` | Validates code + photo path; inserts `custody_events` row | Yes — authenticated receiver JWT |
| `add-co-conductor` | Adds approved co-conductor to a locked trip; audit log + location capture | Yes — trip conductor JWT |
| `request-trip-transfer` | Primary conductor requests transfer (pending receiver acceptance) | Yes — primary conductor JWT |
| `accept-trip-transfer` | Receiver accepts within window; updates parcels + payee | Yes — receiving conductor JWT |
| `admin-trip-override` | Admin parcel reassignment / exception on a trip (may open recovery) | Yes — active admin JWT |
| `admin-recovery` | Admin recovery workflow: reassign, mark in progress, unrecoverable | Yes — active admin JWT |
| `admin-resolve-blocked` | Unblock parcel and/or regenerate handoff code | Yes — active admin JWT |
| `delete-account` | Deletes auth user + profile (Play Store requirement) | Yes — caller must match `auth.uid()` |
| `sync-location-samples` | Bulk upsert offline GPS queue (Phase 4) | Yes — conductor JWT |
| `skip-dev-payment` | Dev-only payment bypass for physical testing | Yes — authenticated customer JWT |

**Razorpay pair:** Both functions are deployed and wired from `ConfirmOrderScreen` via `src/services/paymentService.ts`, but end-to-end payment has not been verified in this environment — `EXPO_PUBLIC_RAZORPAY_KEY_ID` is not set locally, and Supabase secrets `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` must be configured for shared/EAS builds.

**Rate limiting** (implemented in `supabase/functions/_shared/rateLimit.ts`, backed by `rate_limit_log` table):

| Function | Limit |
|----------|-------|
| `issue-handoff-code` | 5 requests per parcel per 10 minutes |
| `add-co-conductor` | 10 requests per user per hour |
| `request-trip-transfer` | 10 requests per user per hour |
| `admin-trip-override` | 30 requests per admin per hour |
| `admin-recovery` | 30 requests per admin per hour |

Functions without rate limiting in code: `acknowledge-handoff`, `admin-resolve-blocked`, `create-razorpay-order`, `verify-razorpay-payment`.

---

## 5. Environment setup

### Fresh clone

```bash
git clone <repo-url>
cd patwadi
npm install
```

### Version requirements (from `package.json`)

| Tool | Version |
|------|---------|
| Node.js | LTS recommended (18+); not pinned in repo |
| Expo SDK | ~54.0.25 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| TypeScript | ~5.9.2 |
| EAS CLI | Use via `npx eas-cli` (not a project dependency) |

### `.env` variables (names only)

Create `.env` in the project root. Loaded by `app.config.js` via `dotenv`.

| Variable | Status in repo | Purpose |
|----------|----------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Required — real value expected | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON` | Required — real value expected | Supabase anon/public key |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Required — real value expected | Mapbox geocoding / places |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | **Placeholder — not in default `.env`** | Razorpay public key for checkout UI |
| `EXPO_PUBLIC_SUPPORT_WHATSAPP` | Required for production support links | E.164 digits only (no `+`); used in WhatsApp support URLs |

Never commit `.env`. Supabase edge function secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, service role key) are set in Supabase, not in the app `.env`.

### Windows Android path-length fix

If native Android builds fail with path-length errors:

```powershell
$env:GRADLE_USER_HOME = "C:\gr"
```

Optionally set `GRADLE_USER_HOME=C:\gr` as a persistent user environment variable.

### Supabase link

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

Schema SQL files are under `supabase/schema/` (run in order: `profiles.sql`, `mvp_custody.sql`, phase files through **`phase17_operator_onboarding.sql`** for operator gating). Edge functions deploy with `npx supabase functions deploy <name>`.

### `.env` UTF-8 BOM warning

If edge function deploy fails with a parse error mentioning an unexpected character (e.g. `»`) in a variable name, the `.env` file likely has a UTF-8 BOM. Re-save `.env` as UTF-8 **without BOM** (contents unchanged) and redeploy.

### Run on Android (dev)

```bash
npx expo run:android
```

Requires Android Studio / SDK and a device or emulator. Uses `expo-dev-client`.

### Test accounts

All passwords: `Patwadi123!`

| Email | Role |
|-------|------|
| `testcustomer@patwadi.com` | Customer |
| `testlinehaul@patwadi.com` | Linehaul operator (seeded `delhi_chandigarh` after phase17) |
| `testlinehaul2@patwadi.com` | Linehaul operator (transfer/co-conductor tests) |
| `testlmp@patwadi.com` | LMP operator |
| `admin@patwadi.com` | Admin (via `admin_profiles`) |

Sign in via **Login** on `LoginScreen`: one field **Email or phone number** (unified identifier). **Sign up** is customer-only (`mode: signup` from Splash) — email + password + name, or phone OTP then **Complete profile** → **RoleSelect** (customer card). Operators use admin-created accounts only. In dev builds, triple-tap the login title for `testcustomer`, quadruple-tap for `testlinehaul` (password autofill).

### EAS preview APK

`eas.json` defines a `preview` profile that builds a standalone Android APK (no Play Store):

```bash
npx eas-cli build --platform android --profile preview
```

Share the resulting APK for field testing. **Razorpay must be configured** (`EXPO_PUBLIC_RAZORPAY_KEY_ID` in build env + Supabase Razorpay secrets) before payment flows work in shared builds.

---

## 5b. Handoff codes (custody chain)

Four-digit one-time codes validate every custody transfer. **Sender** (current holder) opens **Confirm Handoff** → `issue-handoff-code` creates a code for the **receiver**. Receiver reads it on **My Handoff Codes**; sender enters code + mandatory photo → `acknowledge-handoff` writes a `custody_events` row.

| Step | From → To |
|------|-----------|
| `customer_to_lmp` | Customer → pickup LMP |
| `lmp_to_linehaul` | Pickup LMP → linehaul conductor |
| `linehaul_to_lmp` | Linehaul → delivery LMP |
| `lmp_to_customer` | Delivery LMP → customer |

`DriverParcelDetailsScreen` navigates to `ConfirmHandoff` only when `getOperatorConfirmHandoffStep()` says the logged-in operator is the sender for the next missing step.

**Linehaul compliance (2026-06):** `LinehaulConductorGates` in `App.tsx` — app-lock if handoffs overdue after trip end; one-time +30 min arrival extension when far from destination; see `docs/linehaul-ux-issues.md` L-UX-13–19.

**Trip transfer (2026-06):** Request → `pending_acceptance` → receiver **Accept load** on My Trips before departure (pre-start) or within 10 minutes (mid-trip). On accept, `orders.linehaul_id` moves to receiver; payee is receiver if trip &lt;50% elapsed at accept, else original conductor. Expired → WhatsApp support.

**Shared UX (Sessions 12a–17):** `LoadingButton`, `EmptyState`, `Toast`, `OfflineBanner` (global in `App.tsx`), `PullToRefresh`, `ListSkeleton`, `ScreenScrollView` — wired on list screens and key actions.

**Guest checkout resume:** Parcel draft saved in AsyncStorage at Confirm Order; sign-up mid-checkout resumes to `ConfirmOrder` after auth (`pendingCheckout.ts`).

**Address book (2026-06):** Save pickup/dropoff with labels (Home / Work / custom); **Settings → Address book**; 5 default / 10 after confirm. See `phase14_saved_addresses.sql`, L-UX-22.

**Languages:** EN, Hindi, Punjabi, Tamil, Telugu, Marathi, Gujarati (`LanguageToggle` on dashboard + Settings).

**Launch stub cleanup (Session 15):** Depots, Routes & Coverage, and Schedule Pickup removed from Send Parcel; debug ingest calls removed; corridor rejection uses *"We're not live on this corridor yet."*

---

## 6. Known gaps and next steps

1. **Apply `phase17_operator_onboarding.sql`** — Required on Supabase before operator gating works in production. Adds `operator_status`, `operator_kyc_packets`, `operator_corridors`, corridor trip guard, and seeds test linehaul accounts. Deploy `delete-account` edge function after migration.

2. **Admin operator UI (§20.6)** — No in-app queue for pending operators or KYC review yet. Launch workflow: website KYC → admin enters data in Supabase Table Editor → assigns corridors in `operator_corridors`.

3. **Razorpay** — Edge functions deployed; physical E2E can use `skip-dev-payment`. Production builds need `EXPO_PUBLIC_RAZORPAY_KEY_ID` + Supabase Razorpay secrets.

4. **Phase 4 GPS on physical device** — Foreground tracking implemented (`tripTracking.ts`, `location_samples`); OPPO device smoke still partial (see `PATWADI_EXECUTION_PLAN.md` Session 12 Part B).

5. **Camera dimension-measure** — `CameraMeasureScreen` is a placeholder; `PackageInfoScreen` uses image picker + heuristic instead. Route kept but unreachable from main flow.

6. **Session 14** — Segmented 4-digit handoff code input (auto-submit on 4th digit) not yet implemented.

7. **Play Store submission** — Package ID still `com.anonymous.patwadi`; privacy policy, Data Safety form (must reflect Phase 4 permissions), and production signing outstanding. EAS preview APK workflow for field testing.

8. **LMP corridor scoping** — `operator_corridors` table supports LMP; parcel-pool filtering by assigned corridor may need follow-up RPC work as corridor count grows.

---

*Last updated 2026-06-14 (Sessions 15–17 / v6 §20). **Non-technical overview:** `PATWADI_FOR_TEAM.md`. Product spec: `PATWADI_LAUNCH_ARCHITECTURE.md`. Build sessions: `PATWADI_EXECUTION_PLAN.md`. Operator UX log: `docs/linehaul-ux-issues.md`. Schema: `supabase/schema/`.*
