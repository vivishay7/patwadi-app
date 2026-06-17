# Linehaul operator UX issues (logged 2026-06-14)

Issues reported during Part B smoke test (`testlinehaul@patwadi.com` on physical device).

## L-UX-01 — Duplicate “My Trips” on operator dashboard

**Severity:** Medium (redundant navigation)  
**Status:** Fixed in `DriverHome.tsx`

**What happened:** Operator Home showed “My Trips” twice — once as a large primary button and again in the quick-actions grid. “View Parcels” / “My Parcels” was similarly duplicated.

**Root cause:** `DriverHome.tsx` wired the same `navigation.navigate("MyTrips")` in both the hero CTA block and the quick-actions row.

---

## L-UX-02 — “My Trips” not in bottom tab bar

**Severity:** High (core operator workflow buried in stack)  
**Status:** Fixed in `MainTabs.tsx` (role-aware tabs for linehaul/LMP)

**What happened:** Linehaul operators only reach trips via Home → stack push. Bottom nav still showed customer tabs (Packages, etc.).

**Root cause:** `MainTabs.tsx` is customer-centric; `MyTrips` lives only on `RootNavigator` stack (`HomeScreen` → `DriverHome` → `MyTrips`).

**Expected:** Operators should have **Trips** (and **Parcels**) as first-class tab destinations.

---

## L-UX-03 — `bus_proof_photo_path` required but no photo UI on Trip Detail

**Severity:** Blocker (cannot publish draft)  
**Status:** Fixed in `TripDetailScreen.tsx`

**What happened:** Tapping **Publish** shows `bus_proof_photo_path is required before open` with no way to add a photo on that screen.

**Root cause:**
- Bus proof capture exists only on `CreateTripScreen.tsx` (camera required at draft creation).
- `TripDetailScreen.tsx` has publish but **no** bus-proof section.
- Drafts created via smoke scripts / API without a photo path hit this wall in the UI.
- Error string in `tripLimits.ts` exposed internal column name to users.

**Note:** Any JPEG uploads today — no content validation (dark/blank photo would pass). Product may want minimum quality checks later.

---

## L-UX-04 — No delete draft action

**Severity:** Medium (draft clutter, blocks retesting)  
**Status:** Fixed in `TripDetailScreen.tsx` + `tripService.deleteDraftTrip`

**What happened:** Stuck drafts (e.g. failed publish, smoke test trips) cannot be removed from the app.

**Root cause:** No delete API or UI for `linehaul_trips` in draft status.

---

## L-UX-05 — Draft auto-expiry after 6 hours (not implemented)

**Severity:** Low (expectation gap)  
**Status:** Open — not built

**What happened:** User expected abandoned drafts to auto-delete after ~6 hours.

**Actual behavior:** `apply_linehaul_trip_timer_transitions()` only handles **open** trips (T−60min stop accepting parcels, T−10min lock details). No cron/job deletes or cancels stale **draft** rows.

**Spec gap:** `PATWADI_LAUNCH_ARCHITECTURE.md` describes draft lifecycle but does not define 6-hour draft TTL in schema or timers.

**Suggested fix:** Add draft TTL (e.g. `created_at < now() - interval '6 hours'`) to timer function or separate cron; optionally notify conductor before deletion.

---

## L-UX-06 — Operator flow feels redundant end-to-end

**Severity:** Medium (holistic UX debt)  
**Status:** Open (tracking)

**Examples:**
- Home dashboard + tabs + stack all expose similar destinations.
- Create trip requires photo at creation, but publish gate checks photo again without guiding user on Trip Detail (until L-UX-03 fix).
- ISO datetime fields on Create Trip (`scheduled_departure_at`) are not operator-friendly.

**Follow-up:** Single operator IA pass — dashboard, tabs, and create/publish funnel.

---

## L-UX-07 — Cancelled trips still show “Accepting parcels”

**Severity:** High (misleading UI + bad data)  
**Status:** Fixed (UI + cancel handler + DB backfill)

**Root cause:** `MyTripsScreen` showed `accepts_new_parcels` regardless of `status`. `admin-trip-override` `cancel_trip` set `status=cancelled` but left `accepts_new_parcels=true`.

---

## L-UX-08 — Available Jobs empty for linehaul despite open trip

**Severity:** Blocker  
**Status:** Fixed (`phase8_operator_parcels.sql` RPC + app wiring)

**Root causes (layered):**
1. `getAvailableOrders()` queries `orders` with legacy `driver_id` — linehaul RLS returns **zero rows**.
2. No v6 parcel-pool query (corridor + `payment_status=confirmed` + `trip_id IS NULL`).
3. User’s open `PARTB-SMOKE` trip is **`is_extra_trip` without `extra_trip_approved_by`** — even with RPC, parcels stay hidden until admin approves (by design §4).
4. `DriverParcelDetails` used legacy `acceptOrder(driver_id)` — not trip attachment.

---

## L-UX-09 — Delete draft only on Trip Detail (easy to miss)

**Severity:** Medium  
**Status:** Fixed — **Delete draft** on each draft card in My Trips list + at top of Trip Detail

---

## L-UX-10 — Trip list clutter (many cancelled/draft smoke trips)

**Severity:** Low  
**Status:** Partially fixed — cancelled hidden by default; toggle “Show cancelled trips”. Manual cleanup via delete draft still needed.

---

## L-UX-11 — Available Job tap crashes (`isAssigned` undefined)

**Severity:** Blocker  
**Status:** Fixed in `DriverParcelDetailsScreen.tsx`

**What happened:** Tapping an Available Job in My Parcels → red screen: `Property 'isAssigned' doesn't exist`.

**Root cause:** Handoff CTA block referenced `isAssigned` without defining it (regression when linehaul attach-to-trip UI was added).

**Fix:** `isAssigned` derived from `trip_id`, `driver_id`, `linehaul_id`, `lmp_pickup_id`, `lmp_delivery_id`.

---

## L-UX-12 — Create/publish trip UX (dates, plate, photo, labels)

**Severity:** Medium  
**Status:** Fixed in `CreateTripScreen.tsx`, `tripService.ts`, `vehiclePlate.ts`, storage bucket

**Changes:**
- Screen title/button: **Publish Trip** (creates + uploads bus proof + publishes in one flow).
- Dates: DD/MM/YYYY + HH:MM (IST), not raw ISO strings.
- Driver phone: 10 digits max.
- Bus plate: Indian state (`CH01AB1234`) or Bharat (`22BH1234`) validation.
- Bus photo: `expo-file-system` upload path, gallery fallback, `custody-proofs` bucket live.
- Schedule rule: departure must be in the future; arrival after departure (`validateTripSchedule`).

---

## L-UX-13 — Conductor app-lock + arrival extension (Session 12 Part B)

**Severity:** High (custody compliance + en-route ETA accuracy)  
**Status:** Fixed

**Conductor app-lock (linehaul only):**
- Full-screen overlay blocks normal app use when a trip is `completed`, or `closed` more than **3 hours** after `expected_arrival_at`, and attached parcels still lack a `linehaul_to_lmp` custody handoff.
- Only **Contact support** is available (grey link + `SupportSheet`).
- Transferred-away conductors are excluded (`linehaul_trip_conductors.active_until` + `created_by_conductor_id`); they see the trip as **cancelled** in My Trips.
- Logic: `src/lib/domain/conductorLock.ts`, `useConductorLock`, `ConductorLockOverlay`.

**Trip arrival extension (linehaul only):**
- Modal when ~**30 minutes** remain until `expected_arrival_at`, latest GPS is **≥50 km** from corridor destination, trip is `closed`, and extension not yet used.
- Accept adds 30 minutes to `expected_arrival_at` via RPC `extend_linehaul_trip_arrival`; sets `admin_flag_arrival_extension` and writes `trip_audit_logs` action `arrival_extension_requested`.
- Schema: `supabase/schema/phase11_trip_arrival_extension.sql`.

**Apply schema:** `supabase db push` or run `phase11_trip_arrival_extension.sql` against the project.

**50 km note:** Destination coords come from the `corridors` table (`fetchCorridorByKey(trip.corridor_id)`). GPS uses latest `location_samples` for the trip, with `captureCurrentLocation` fallback. If corridor row is missing or GPS unavailable, the extension prompt is skipped (no false positives).

**50 km note:** Destination coords come from the `corridors` table (`fetchCorridorByKey(trip.corridor_id)`). GPS uses latest `location_samples` for the trip, with `captureCurrentLocation` fallback. If corridor row is missing or GPS unavailable, the extension prompt is skipped (no false positives).

**Mid-trip reassignment (product rule):** When a trip is transferred to another conductor, the **original** conductor sees the trip as **cancelled** in My Trips and is **not** app-locked. App-lock applies only to the active conductor who still holds unhanded parcels. Ops recovery / `reassign_to_trip` for parcels on a broken-down bus remains admin-driven (see `PATWADI_LAUNCH_ARCHITECTURE.md` §7/§13).

**Schema applied:** `phase11_trip_arrival_extension.sql` via `npx supabase db query --linked -f …` (2026-06-14).

---

## L-UX-19 — Transfer: parcels stuck on sender + auto-accept without receiver window

**Severity:** High  
**Status:** Fixed (`phase12_transfer_acceptance.sql`, `request-trip-transfer`, `accept-trip-transfer`)

**What happened:** After **Request transfer**, sender still saw parcels in My Parcels / Available Jobs. Alert showed raw `auto_accepted_with_flag`. `startTripTracking` LogBox error on OPPO (foreground service manifest).

**Root causes:**
1. Transfer swapped conductors but **`orders.linehaul_id` was not updated** — `operator_order_view` still scoped parcels to the sender.
2. `list_available_parcels_for_linehaul` used **`created_by_conductor_id`** only — transferred-away creator still saw the corridor pool.
3. v6 **auto-accepted** transfers with no receiver acceptance window.

**Fix:**
- Transfer is now **`pending_acceptance`** until receiver taps **Accept load** on My Trips.
- **Accept by:** trip departure (pre-start) or **+10 minutes** (mid-trip, `closed`).
- On accept: swap primary conductor, set **`orders.linehaul_id`** to receiver, record **`payee_conductor_id`** (receiver pays if trip &lt;50% complete at accept; original keeps pay if ≥50%).
- Expired accept → `rejected_timeout` + WhatsApp support deep link.
- RPCs use **`is_active_trip_conductor`**; backfill syncs `linehaul_id` for attached parcels.
- GPS tracking only for **active** trip membership (not trip creator after transfer).
- Human-readable transfer messages (`transferDisplay.ts`).

**Deploy:** `phase12_transfer_acceptance.sql` + edge functions `request-trip-transfer`, `accept-trip-transfer`.

---

## L-UX-20 — Both conductors see identical UI (session / stale lists)

**Severity:** High (testing confusion)  
**Status:** Fixed (2026-06-14)

**DB truth (diagnostic `scripts/diag-conductor-scope.mjs`):**
- `testlinehaul` — 5 created trips, **0** assigned parcels (transferred away)
- `testlinehaul2` — **1** active trip (`d9c8691a`), **1** parcel (`23c0458a`)

If both accounts look the same on device, the usual cause is **still signed in as testlinehaul** (no logout between logins) or **lists not refetching** after account switch.

**Fixes:**
- **Signed-in email** shown on Operator Dashboard, My Trips, My Parcels headers.
- Lists **clear and reload** when `user.id` changes.
- `fetchMyTrips` returns only trips where user is **active** conductor (not transferred-away creator).
- `fetchTripAttachedParcels` uses `operator_order_view` (scoped to active `linehaul_id`).
- Trip Detail blocks transferred-away conductors with “Trip transferred” screen.
- `is_trip_member` RLS → `is_active_trip_conductor` only (`phase12b_trip_member_active.sql`).
- Dev login: **5× tap** Sign In title → `testlinehaul2@patwadi.com` (4× = testlinehaul, 3× = testcustomer).

---

## L-UX-14 — Parcel Details showed raw status `created` not “Booked”

**Severity:** Medium (operator/customer label mismatch)  
**Status:** Fixed in `DriverParcelDetailsScreen.tsx`

**What happened:** Current Status displayed `derived.replaceAll("_", " ")` → lowercase `created` for new parcels.

**Fix:** Use `getCustomerStatusLabel()` / `getCustomerStatusColor()` from `customerParcelStatus.ts` (same labels as customer app: `created` → **Booked**).

---

## L-UX-15 — Confirm Handoff showed useless placeholder alert

**Severity:** Blocker (custody flow unreachable)  
**Status:** Fixed in `DriverParcelDetailsScreen.tsx`

**What happened:** Tapping **Confirm Handoff** on an assigned parcel showed Alert: “Use Confirm Handoff from the custody flow” — no navigation.

**Fix:** `getOperatorConfirmHandoffStep()` in `deriveParcelState.ts` picks the step the current user can confirm as custody holder; navigates to `ConfirmHandoff` with `{ parcelId, step }`. If not yet their turn (e.g. linehaul attached but no `lmp_to_linehaul` yet), show waiting message instead of the button.

---

## L-UX-16 — Contact support too prominent on operator parcel screen

**Severity:** Low (support abuse / distraction)  
**Status:** Fixed in `DriverParcelDetailsScreen.tsx`

**Change:** Green bordered WhatsApp button → small grey underlined **Contact support** text link. `SupportSheet` unchanged. Same pattern on `ConductorLockOverlay` (lock screen).

---

## L-UX-17 — Parcels tab: no “action required” indicator

**Severity:** Medium  
**Status:** Fixed in `MainTabs.tsx` + `linehaulActionRequired.ts`

**When red dot shows (linehaul only):**
- En-route trip (`closed`) within **5 minutes** of `expected_arrival_at`, **or**
- Trip `completed` with attached parcels still missing required linehaul handoffs (`lmp_to_linehaul` or `linehaul_to_lmp` not recorded).

**Hook:** `useLinehaulParcelsActionRequired` refreshes on tab focus.

---

## L-UX-18 — Console error `getOrderById: PGRST116` on operator parcel open

**Severity:** Low (LogBox noise; screen often still rendered)  
**Status:** Fixed in `orderService.ts`

**Cause:** `getOperatorOrderById` fell back to `getOrderById` on `orders` with `.single()` when `operator_order_view` returned no row — linehaul RLS → 0 rows.

**Fix:** Removed orders-table fallback for operator reads; `getOrderById` uses `.maybeSingle()` elsewhere. Available-job navigation still passes `availableParcel` route params as synthetic order when view row is missing.

---

## L-UX-21 — Operator welcome, job alerts, language toggle, trip coverage

**Severity:** Medium (operator engagement + custody accuracy)  
**Status:** Fixed (2026-06-15)

**Operator dashboard & nav:**
- **Welcome, &lt;Name&gt;** on `DriverHome` (email local-part).
- **Green dot** on Home / Trips / Parcels when new corridor jobs or pending trip transfers exist (`OperatorAlertsContext` + `MainTabs` badges).
- **Local notifications** via `expo-notifications` when jobs appear or a transfer is offered (requires native rebuild after adding plugin — see below).
- **Language toggle** EN / Hindi / **Punjabi** / Tamil / Telugu / Marathi / Gujarati on operator dashboard and Settings (`LocaleProvider`, `LanguageToggle`).

**Customer home:** `welcomeSubtitleCustomer` in `strings.ts` for signed-in customers.

**Trip coverage at creation (`CreateTripScreen`):**
- MCQ: **Full trip** vs **Partial trip** (co-conductor required).
- Stored on `linehaul_trips.trip_coverage_type` + `planned_co_conductor_id`; `seed_planned_co_conductor` RPC adds co-conductor row.

**Parcel transfer → optional trip transfer (`DriverParcelDetailsScreen`):**
- **Transfer parcel to conductor** updates `linehaul_id` via `transfer_linehaul_parcel` RPC.
- After success, prompt **Also transfer the trip?** → existing `requestTripTransfer` / `pending_acceptance` flow.

**Incomplete full trip (past expected arrival, no co-conductor):**
- Cron flags `admin_review_required` + `admin_flag_reason = full_trip_past_arrival_no_co_conductor`.
- Operator modal (`TripIncompleteActionPrompt`): declare co-conductor or confirm solo run.

**Schema:** `supabase/schema/phase13_trip_coverage.sql` — apply with `npx supabase db query --linked -f …`.

**Native rebuild for push notifications:** `expo-notifications` added to `app.config.js` plugins — run `npx expo prebuild` + `npx expo run:android` (or iOS) so OS permission prompts and background delivery work on device.

---

## L-UX-22 — Customer address book

**Severity:** Low (convenience)  
**Status:** Fixed (2026-06-15)

- Save while booking on pickup/dropoff with Home / Work / custom labels.
- Saved-address chips; Settings → Address book.
- Limits: 5 default, confirm to extend to 10.
- Schema: `phase14_saved_addresses.sql`.
- Nav fixes: `CreateTripScreen` import; Send Parcel Notifications tab.
