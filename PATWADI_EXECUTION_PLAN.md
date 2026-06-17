# Patwadi Execution Plan — Sessions for v6

Companion to PATWADI_LAUNCH_ARCHITECTURE.md (v6). Run sessions IN ORDER.
Each has: model, a /goal condition (bounded — stops on completion or the
stated turn limit, whichever first), and the prompt. Do not start session
N+1 until session N's PAUSE/report has been reviewed.

**Run order differs from document order below 6**: 6 -> 8 -> 9 -> 6b -> 7.
Sessions 8 and 9 (operator/admin Phase 2 UI — §15/§16) appear physically
after 6b and 7 in this document because they were added later, but should
run BEFORE 6b/7: 8/9 close a functional gap (an entire role has no UI for
four sessions' worth of backend), while 6b/7 are cosmetic (existing screens
look sparse). Session 6 itself is independent and can run anytime relative
to all of this.

General rule for every session: no new .md/.mdc files, no scope beyond what
the prompt states, report exact errors verbatim and stop on failure.

**Build environment note (from Session 1)**: if `npx expo run:android` fails
with `ninja: error: ... Filename longer than 260 characters`, set
`GRADLE_USER_HOME=C:\gr` and delete all `.cxx` directories under
`node_modules/*/android` and `android/app` before rebuilding — Gradle's
cache was redirected into a long sandbox temp path baked into generated
CMake configs. `C:\gr` is now the warm cache for this project.

**Build environment note (from Session 1.5)**: if `supabase functions
deploy` fails with `failed to parse environment file: .env (unexpected
character '»' in variable name)`, `.env` has a UTF-8 BOM — rewrite it
BOM-free (contents unchanged) and redeploy.

**Build environment note**: `adb shell input` doesn't reliably type special
characters (e.g. `!`) into React Native controlled TextInputs — emulator
login can fail with "Invalid login credentials" even when the same password
works via REST. If a test account's password contains special characters
and emulator login via adb fails this way, do a 30-second manual login on
the device/emulator UI rather than debugging adb input syntax. Relevant to
Session 9 (admin@patwadi.com / Patwadi123!).

**Storage & test fixtures note**: the `custody-proofs` bucket + RLS
(`storage/objects`, customer/operator SELECT + authenticated INSERT) now
exist live -- created during the Delivered-handoff check, where the upload
step initially failed with "bucket does not exist." Before this, any real
handoff with a real photo would have failed at the upload step regardless
of edge-function/code correctness -- now resolved. Consequence:
add323df's first 3 custody events (customer->lmp, lmp->linehaul,
linehaul->lmp) have placeholder proof_value paths (test/1.jpg, etc.) with
no real files behind them -- only the 4th (lmp->customer, Delivered/POD)
has a real object. If AdminParcelDetailsScreen or §16 ever displays photos
for those 3 events, expect broken images -- known test-data gap, not a
Session 9 bug to chase. All current test accounts now use Patwadi123!:
testcustomer, testlinehaul, testlinehaul2, testlmp, admin.

---

## Session 1 — Cleanup + Phase 1 verification

**Model: Fable 5** (this is the "ambiguous problem / root-cause debugging"
category Fable is built for — if anything in steps 1-6 fails, that's exactly
where the 2x burn rate earns its keep; if everything passes, the session is
short anyway).

**/goal**: `all 6 verification steps below report PASS or FAIL with concrete
evidence (order id, derived state shown, or exact error text), or stop after
40 turns`

```
PART 0 — CLEANUP
Delete from the project root if present: FORENSIC_AUDIT_REPORT.md,
PROJECT_AUDIT_REPORT.md, RESYNC_REPORT.md, BROKEN_ISSUES.md,
FIXES_NEEDED.md, FIXES_COMPLETE.md, CURRENT_STATE_AND_FIXES.md,
MAPBOX_FIX_SUMMARY.md, AUDIT_SUMMARY.md, java.lang.Thread,
patwadi.code-workspace_03.20.26.code-workspace (keep
patwadi.code-workspace), the ".expo copy" directory.

PART 1 — VERIFY (stop and report exact error if any step fails — do not
attempt fixes beyond what the step itself describes)
1. Confirm .env.local has real (non-placeholder) Supabase URL, anon key,
   Mapbox token, Razorpay key.
2. npx expo run:android — confirm Splash loads without a red-screen error.
3. Customer: guest checkout through ConfirmOrder + test payment. Confirm an
   order row with payment_status = confirmed. Report the order id.
4. Operator: confirm that order appears in their parcel list.
5. Seed 1-2 custody_events for that order. Confirm TrackingDetailsScreen and
   DriverParcelDetailsScreen show a derived state other than "created".
6. Admin: confirm the order appears correctly in AdminParcels and
   AdminParcelDetails.

PART 1B — VERIFY REMAINING PHASE 1 SCOPE (same stop-on-fail rule)
7. Does a Settings screen exist with a working logout? Report yes/no.
8. Submit the operator onboarding (KYC/bus details) form as a test
   operator. Confirm a row is written to Supabase (not a mock success).
   Report table + row, or report that it's still mocked.
9. Does an admin screen exist to approve pending operators? Report yes/no.

OUTPUT: PASS/FAIL per step (1-9), with evidence. If 7-9 are FAIL/missing,
do not build them now — just report, so Session 2's scope can be adjusted
if needed.
```

PAUSE. Step 7 (Settings/logout) and the edge-function/order-field gaps below
are addressed in Session 1.5, next. Steps 8-9 (operator onboarding has zero
form fields; no admin-approval screen exists) are bigger than v6 assumed —
flagged as a future session at the end of this plan, not blocking. As a
stopgap, an operator's approval_status can be set directly via Supabase's
Table Editor (free, no new tooling) so Session 4's "approved/available"
transfer check has something real to check in the meantime.

---

## Session 1.5 — Foundation: edge functions + order-creation data (NEW)

Session 1 found two gaps upstream of everything in Session 2:

- None of the 5 edge functions (`create-razorpay-order`,
  `verify-razorpay-payment`, `issue-handoff-code`, `acknowledge-handoff`,
  `admin-resolve-blocked`) are deployed — they exist in `supabase/functions/`
  but return 404 on the live project. `issue-handoff-code` and
  `acknowledge-handoff` are how custody_events get created from a real
  handoff; the only custody events that currently exist were seeded directly
  into the database.
- The seeded order has `corridor_key`, `driver_id`, `lmp_pickup_id`, and
  `linehaul_id` all null. v6's Phase 2 (corridors, trips, transfer
  eligibility) assumes real orders carry these.

Until both are fixed, Session 2+'s work would be verified the same way Step
5 was — against seeded data, not data the app actually produces.

**Model: Fable 5** ("why is this field null" and "diagnose + fix 404s on
deployed functions" are both root-cause-investigation work).

**/goal**: `all 5 edge functions respond (not 404) on the live project, a
guest checkout produces a confirmed order with corridor_key and
operator-assignment fields populated (or documented as intentionally
null-until-assigned), a real handoff via issue-handoff-code +
acknowledge-handoff produces a custody_event visible under customer RLS, and
SettingsScreen has a working logout, or stop after 35 turns`

```
1. Deploy the 5 edge functions in supabase/functions/ to the live project
   (wvxyaqqlqwbbpkgvrali.supabase.co). Set RAZORPAY_KEY_ID/
   RAZORPAY_KEY_SECRET as Supabase secrets, and add
   EXPO_PUBLIC_RAZORPAY_KEY_ID to .env (app.config.js loads .env, not
   .env.local -- confirmed in Session 1).

2. Read ConfirmOrderScreen / orderService.createOrder. Find why
   corridor_key, driver_id, lmp_pickup_id, linehaul_id aren't populated on
   order creation, and fix it -- corridor_key should derive from the
   booking's pickup/dropoff cities. If operator-assignment fields being null
   until a trip claims the order is the INTENDED design (consistent with
   v6 -- orders attach to trips, not the reverse), say so explicitly and
   leave them null; don't force values prematurely.

3. Re-run a REAL (non-seeded) end-to-end check: guest checkout with test
   Razorpay payment -> confirmed order with corridor_key set -> use
   issue-handoff-code + acknowledge-handoff (with a test photo) to create a
   real customer->lmp custody event -> confirm it's visible under customer
   RLS and TrackingDetailsScreen reflects it.

4. SettingsScreen: add a logout button calling the existing signOut from
   AuthContext (same one AdminDashboardScreen already uses).

OUTPUT: edge function deploy status (5/5), the new order's id with its
corridor_key/operator fields (or the documented intentional-null finding),
confirmation the real handoff produced a visible custody_event, and
SettingsScreen logout confirmed.
```

PAUSE. This is the real gate for Session 2 -- confirm whether
operator-assignment-on-orders is "Phase 2 attaches it" by design before
Session 2 builds trips expecting orders to already carry it.

**Update**: item 2 resolved (operator-assignment is null-until-assigned by
design, confirmed -- Session 2's gate is clear). Item 4 (Settings/logout)
done and verified live. Items 1/3 split: deploying all 5 functions only
needs the Supabase token (now provided); only create-razorpay-order/
verify-razorpay-payment need Razorpay secrets to be *called*. The
handoff half of item 3 can use the existing seeded order add323df
(payment_status already confirmed) as its test subject, deferring only the
checkout half to whenever Razorpay test keys are set up.

---

## Session 2 — Data model + RLS (v6 §2.2-2.6, §13.2-13.3)

**Model: default** (well-specified by v6 — this is "follow the spec," not
ambiguous investigation).

**/goal**: `linehaul_trips, linehaul_trip_conductors,
linehaul_trip_transfer_requests, trip_audit_logs, and parcel_recoveries
exist with RLS policies per §9's tiers, corridors.ts has origin/destination
coordinates, and the existing custody_events/handoff_codes RLS findings are
reported, or stop after 30 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §2.2-2.6 and §13.2-13.3.

1. Add origin/destination coordinates to corridors.ts per §2.2.
2. Create linehaul_trips, linehaul_trip_conductors,
   linehaul_trip_transfer_requests, trip_audit_logs, parcel_recoveries per
   §2.3-2.6 and §13.2. Add Order.trip_id, recovery_of_trip_id,
   recovered_by_trip_id per §2.4/§13.3.
3. For each new table, write RLS policies matching §9: customers (Tier 1) —
   no access; operators (Tier 2) — own trip/conductor rows, counterpart
   contact only for the active handoff; admin (Tier 3) — everything.
4. Spot-check existing custody_events and handoff_codes RLS against the same
   tiers — can one lmp read another lmp's phone number through these
   tables? Report findings only; fix only if trivial, otherwise flag.

OUTPUT: tables created, RLS policy summary per table, existing-table RLS
findings.
```

PAUSE.

---

## Session 2.5 — Operator visibility on orders (operator_order_view)

v6 §14, resolved during Session 2's review — bounded, single-table, and
blocks DriverParcelsScreen/DriverParcelDetailsScreen entirely, so it runs
before Session 3 even though Session 3 doesn't depend on it.

**Model: default**.

**/goal**: `operator_order_view exists per §14, DriverParcelsScreen and
DriverParcelDetailsScreen query it instead of orders, and
testlinehaul@patwadi.com sees order add323df in their parcel list via the
real UI (already assigned to them from Session 1.5), or stop after 20 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §14.

1. Create operator_order_view per §14's included/excluded column lists, with
   access such that an authenticated operator only sees rows where their
   profile id matches lmp_pickup_id, linehaul_id, or lmp_delivery_id.
2. Point DriverParcelsScreen and DriverParcelDetailsScreen at this view
   instead of orders.
3. Verify live: log in as testlinehaul@patwadi.com on the emulator, confirm
   order add323df now appears in DriverParcelsScreen, and that
   DriverParcelDetailsScreen shows the operationally-relevant fields (not
   price_estimate/razorpay IDs).

OUTPUT: view + access definition, screens changed, confirmation add323df is
now visible to the linehaul test user through the real UI.
```

PAUSE.

---

## Session 3 — State machine timing (v6 §3)

**Model: Fable 5** (the genuinely ambiguous piece — v6 deliberately left the
mechanism open: "use the simplest mechanism that fits existing patterns... say
which and why").

**/goal**: `accepts_new_parcels and details_locked transition correctly at
T-60min and T-10min respectively, the chosen mechanism is named with a
one-paragraph justification, or stop after 20 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §3.

Implement the accepts_new_parcels (T-60min) and details_locked (T-10min)
transitions for linehaul_trips. Choose the simplest mechanism that fits this
codebase's existing patterns (options include: a scheduled Supabase Edge
Function / pg_cron, or a derived/computed check evaluated on read, similar
to how SimplifiedParcelState is derived rather than stored). State which you
chose and why in one paragraph.

If you choose a scheduled job, note that Phase 4 will eventually need similar
scheduled-job infrastructure (corridor overdue flagging, recovery escalation
timers) — mention whether this session's choice could be reused later, but
do not build those Phase 4 pieces now.
```

PAUSE.

---

## Session 4 — Trip limits, co-conductor, transfer (v6 §4-6, §8)

**Model: default**.

**/goal**: `daily trip limits with extra-trip admin approval, co-conductor
addition, on-demand location capture, and transfer with the 6-flag table
from §6.2 are all implemented and traceable in code, or stop after 30 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §4, §5, §6, §8.

Note: linehaul_trips is empty and no UI exists yet for a conductor to create
a trip. Test §4-6/§8's logic the same way Session 3 did its timers — seeded
test trips/conductors, verified via direct queries, cleaned up afterward.
Don't build trip-creation UI to enable this. If you find there's genuinely
no surface for conductors to create/manage trips at all, flag that as a
future item (same treatment as operator onboarding and the Confirm Handoff
button) — it's separate scope from §4-6's logic itself.

1. One-trip-per-operator-per-day default + is_extra_trip/
   extra_trip_approved_by per §4.
2. Co-conductor addition per §5 (approved/available check, audit log entry,
   location_at_add capture, no risk scoring).
3. captureCurrentLocation() per §8 — one-shot foreground GPS read.
4. Transfer per §6: hard block (§6.1) if target not approved/available;
   otherwise compute the 6 flags in §6.2's table (flag 4 = null, deferred to
   Phase 4) and set risk_reasons / admin_review_required per §6.3. Transfers
   permitted at any trip status including closed, per §6.3's explicit note.

OUTPUT: what was implemented per item, and where in the code each piece
lives.
```

PAUSE.

---

## Session 5 — Admin override + Emergency Recovery (v6 §7, §13)

**Model: default**.

**/goal**: `reassign and exception overrides (§7) and the Emergency Recovery
workflow (§13) are implemented, Order.blocked_exception correctly toggles on
open/resolved recovery, or stop after 25 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §7 and §13.

Note: linehaul_trips is empty (Session 4 cleaned up its test trips) and no
order currently has trip_id set, so §7/§13 have nothing to operate on yet.
Test the same way Sessions 3-4 did: seed a test trip, set an order's
trip_id to it, and (for the exception/recovery path specifically) record
the lmp_to_linehaul custody event that distinguishes "reassign" from
"exception" per §7 -- then verify, then clean up.

1. Reassign (pre-custody-transfer) and exception (post-custody-transfer)
   admin overrides per §7, at both trip-level (cascade) and single-parcel
   level.
2. parcel_recoveries workflow per §13: opening a recovery sets
   Order.blocked_exception = true; resolving it (new custody event against
   recovered_by_trip_id) sets it back to false. escalation_level /
   last_escalated_at as plain counter fields (no timer logic yet — that's
   Phase 4-adjacent, don't build it now).
3. Confirm deriveParcelState requires NO changes — blockedException already
   short-circuits to "blocked_exception" per §13.4. If you find you need to
   change deriveParcelState, stop and report why before proceeding.

OUTPUT: what was implemented, confirmation deriveParcelState is unchanged
(or explanation if it had to change).
```

PAUSE.

---

## Session 6 — Customer status card + support deep link (v6 §9-10)

**Model: default**.

**/goal**: `My Packages list items and Package Details' status badge show
§9's derived label (not Order.status's "Pending"), TrackingDetailsScreen
shows the 5-stage label/date mapping from §9 (no map placeholder, no
per-step photos/timeline), and the support deep-link from §10 works from
both an operator and a customer screen, or stop after 25 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §9 and §10.

0. Screenshots from the running app show My Packages and Package Details
   displaying a "Pending" badge from the legacy Order.status field, while
   TrackingDetailsScreen (one tap deeper, same order) correctly shows
   "In Transit" from deriveParcelState. Apply §9's derivation + label table
   to the status shown in My Packages list items and Package Details'
   status badge as well -- same function, same labels, two more places.
   This is the highest-priority item in this session: two screens, one tap
   apart, currently disagree about the parcel's status.

1. Replace TrackingDetailsScreen's map placeholder with the 5-stage tracker
   per §9's table (including the blocked_exception label), "Last updated"
   date line, and POD photo at "Delivered". No per-step photos, no operator
   details, no custody-event timeline.
2. Implement buildSupportDeepLink() per §10 — issue-type sheet + wa.me deep
   link, with the operator context fields on trip/parcel screens and the
   customer context fields (including "Request detailed shipment report")
   on TrackingDetailsScreen.

OUTPUT: screens changed, confirm map placeholder is gone, confirm My
Packages / Package Details / TrackingDetails now agree on status for the
same order.
```

PAUSE. **This completes Phases 1-3.** Recommend re-running a shortened
version of Session 1's Part 1 (steps 1-6) end-to-end before moving on —
six sessions of changes since the last full verification is enough that
"probably still works" shouldn't be assumed.

---

## Phase 4 — Trip-window location (NOT YET SPECIFIED)

v6 currently has only a 4-line summary for this phase (foreground service,
offline queue, sync, corridor overdue flagging) — it hasn't been through the
kind of architecture pass that made Phase 2 promptable. Before a session
prompt can be written here, these need answers (this would be its own
short doc, the way v1-v6 was for Phase 2):

- Exact start/stop triggers for the foreground service per role (conductor:
  trip status open->closed vs closed->completed? LMP: per-assignment or
  per-active-window?)
- Offline location sample table schema + sync/conflict behavior (what
  happens if the same operator has samples queued on two devices?)
- Real expected_duration_hours values per corridor (these are currently
  placeholders in §2.2's type — someone needs to fill in actual numbers per
  corridor, e.g. Delhi-Manali vs Chandigarh-Shimla)
- Whether the scheduled-job mechanism chosen in Session 3 gets reused here,
  per that session's note

---

## Phase 5 — Play Store submission (BLOCKED ON PHASE 4)

v6 is explicit: privacy policy and Data Safety form must be written from
Phase 4's *actual* permission usage. Do not draft these before Phase 4
exists in code — a privacy policy describing permissions that don't exist
yet is itself a Play Store compliance problem, not just inaccurate.

One Phase 5 item is NOT blocked and can happen any time: starting closed
testing (12 testers, 14 days) on an org developer account, or switching to
one if currently on personal. This has no dependency on app features — only
on having *a* build, which exists after Session 1.

---

## Phase 6 — Future enrichment (ROADMAP ONLY)

AIS-140, operator compliance scores, trip_confidence rollup, insurance,
broader fraud heuristics. Per v6 and prior agreement: not launch-blocking,
no session prompts in this plan.

---

## Session 6b — Home screen + notifications restoration (run after Session
9, not immediately after 6 — see run-order note at top of document)

**Model: default** (layout spec, reuses Session 6's component — not
investigation).

**/goal**: `CustomerHome shows an active-shipment §9 tracker card (or a
trust-stat strip if no active orders) in the space below the action cards,
the bottom nav has a restored Notifications tab, and NotificationsScreen
shows real order-status events instead of the dummy array, or stop after 25
turns`

```
This builds on Session 6's §9 tracker card component — reuse it, do not
reimplement.

1. CustomerHome: below Send Parcel / My Packages / Track Package, replace
   the empty space with:
   - If the customer has any order not yet "delivered": Session 6's §9
     tracker card for their most recent active order (corridor, current
     stage label, last-updated date).
   - If no active orders: a short trust-stat strip (96.7% on-time, 1,100+
     deliveries, 13 states) — find these in existing marketing
     copy/constants; if not present as constants, add them as one.

2. MainTabs: restore a 4th tab for Notifications. If git history shows the
   prior icon/position, match it; otherwise Home / Packages / Notifications
   / Account is reasonable.

3. NotificationsScreen currently renders a hardcoded dummy array. Replace
   with a simple in-app feed: for the customer's orders, list status-change
   events using §9's labels and dates ("Order #1234 — In transit — 11 Jun").
   This is derived from existing order/custody data — no push
   notifications/FCM, that's a separate future phase.

OUTPUT: description or screenshots of the new CustomerHome, bottom nav, and
Notifications screen.
```

---

## Session 7 — Visual polish pass (AFTER Session 6b — queued, not now)

This is the session built from the My Packages / Package Details / Tracking
Details screenshots. Run it after 6 and 6b have landed, attaching: the three
screenshots provided (My Packages, Package Details, Tracking Details — the
"Pending" badge issue is already fixed in Session 6, so these become
before/after references) plus fresh screenshots of 6/6b's output.

**Model: default**, unless the screenshots reveal something that needs
investigation rather than a known fix, in which case Fable 5 for that part.

**/goal**: `Package Details' empty "Package Details" section either shows
real content or is removed, and the dead-space pattern visible across My
Packages / Package Details / Tracking Details is addressed consistently
with whatever CustomerHome ended up with in Session 6b, or stop after 25
turns`

```
Attached: screenshots of My Packages, Package Details, and Tracking Details
(pre-Session-6), plus current screenshots of CustomerHome/TrackingDetails
post-6/6b.

1. Package Details has a "Package Details" section header with nothing
   under it. Find what this was meant to show (likely parcel
   weight/dimensions/contents from PackageInfoScreen) and either populate it
   from real order data or remove the empty section.

2. My Packages, Package Details, and Tracking Details all have substantial
   empty space below their content, the same pattern Session 6b addressed
   on CustomerHome. Apply a consistent approach -- if 6b introduced a
   reusable pattern (e.g. the §9 tracker card, trust-stat strip), consider
   whether it applies here too (e.g. My Packages' order cards could show the
   §9 progress inline).

3. The "Status is derived from custody acknowledgments (code + mandatory
   photo proof)" caption on Tracking Details is a good trust signal worth
   preserving in whatever Session 6's redesign produces, if it isn't already.

OUTPUT: screenshots of the updated screens.
```

---

## Future, unscheduled — Operator onboarding forms + admin approval screen

Session 1 found steps 8-9 are worse than v6 assumed: DriverKycScreen and
DriverBusDetailsScreen have no form fields at all (just a Continue button),
and no admin-approval screen exists anywhere. This is a build, not a wiring
fix -- it needs its own short spec pass (what KYC/bus-detail fields, what the
admin approval queue looks like) the way Phase 2 went through v1-v6 before
being promptable. Not blocking Sessions 1.5-7 (the Table Editor stopgap in
Session 1.5's pause note covers approval_status in the meantime) -- but
don't let it get lost the way the original nine reports got lost.

---

## Security session — COMPLETE

**Item 1 — npm audit: DONE.** `npm audit fix` ran, 72 packages updated,
all high/critical findings cleared (including shell-quote CVE). 14 moderate
remain in Expo toolchain (postcss, uuid) — fixing requires
`npm audit fix --force` (Expo 56 upgrade), a breaking change, deferred to
manual planning. Exit code 1 is expected post-fix (moderates still open),
not a failure. Re-run `npm audit` after any major Expo upgrade to re-check.

**Item 2 — Payment verification: PASS.** HMAC-SHA256 confirmed server-side
before any order write. Raw-body HMAC correctly NOT used (that's for
webhooks; Standard Checkout signs order_id|payment_id, not the HTTP body --
confirmed correct, changing it would break valid payments).

**Item 3 — Rate limiting: PASS (already implemented).** rate_limit_log
table + shared rateLimit.ts. issue-handoff-code: 5/10min per parcel_id;
add-co-conductor + request-trip-transfer: 10/hour per conductor;
admin-trip-override + admin-recovery: 30/hour per admin. Live-tested: 6th
handoff-code call returns 429 with retryAfterSec: 600.

**Item 4 — CORS: PASS (already implemented).** Shared cors.ts sets
Access-Control-Allow-Origin to the Supabase project URL. No wildcard.
All 9 edge functions use handleCorsPreflight() + corsJson(). Live-tested
via OPTIONS.

**Item 5 — Secret scan: NEEDS MANUAL ACTION (owner task, not Cursor).**
.env holds Supabase anon key, Mapbox pk. token, support WhatsApp number
locally. Both anon key and Mapbox pk. are designed to be client-visible
(RLS is the actual security layer). Real secrets (Razorpay, service role)
are in Supabase edge secrets only -- correct. Action: confirm .env is in
.gitignore and was never committed. If ever committed, rotate Supabase
anon key + Mapbox token. Razorpay secret must stay as Supabase edge
secret only -- never in .env.

**Item 1 — npm audit: DONE.** `npm audit fix` ran, 72 packages updated,
all high/critical findings cleared (including shell-quote CVE). 14 moderate
remain in Expo toolchain (postcss, uuid) — fixing requires
`npm audit fix --force` (Expo 56 upgrade), a breaking change, deferred to
manual planning. Exit code 1 is expected post-fix (moderates still open),
not a failure. Re-run `npm audit` after any major Expo upgrade to re-check.

Items 2-5 below must run BEFORE Razorpay keys go into the system.

**Model: Fable 5 for item 3 (brute-force surface analysis); default for
items 2, 4, 5.**

**/goal**: `verify-razorpay-payment HMAC check confirmed correct, rate
limiting implemented on issue-handoff-code / transfer / admin functions,
CORS origins locked, no hardcoded secrets found, or stop after 30 turns`

```
Security items 2-5. Do NOT migrate auth to any other provider -- Supabase
Auth is correct for this stack. Item 1 (npm audit) is already done.

2. PAYMENT VERIFICATION
Read supabase/functions/verify-razorpay-payment/index.ts in full.
Confirm: (a) Razorpay signature is verified server-side using HMAC-SHA256
before any order row is written, (b) the RAW request body (not parsed JSON)
is used for the signature check -- Razorpay's signature is computed over
the raw body, not the parsed object. Report exactly where in the code each
check happens. If either is missing, fix it.

3. RATE LIMITING
Implement per-user rate limiting on these functions, in priority order:

a. issue-handoff-code: 4-digit code space + 10-minute window = real
   brute-force surface. Limit: max 5 attempts per parcel_id per 10 minutes
   (per parcel_id, not per IP -- a shared network shouldn't block all
   operators at a site). Use a simple counter in a new Supabase table
   (rate_limit_log) -- no Redis, no external service.

b. add-co-conductor and request-trip-transfer: max 10 requests per
   conductor per hour.

c. admin-trip-override and admin-recovery: max 30 requests per admin
   per hour.

Deploy updated functions after implementing.

4. CORS
Read the CORS headers currently set in each edge function's Response.
Set Access-Control-Allow-Origin to the Supabase project URL
(https://wvxyaqqlqwbbpkgvrali.supabase.co) rather than *. If any function
currently uses a wildcard *, report and fix it. Note: CORS is not
browser-enforced in React Native, but locking origins is defense-in-depth.

5. SECRET SCAN
Read these files in full and report any hardcoded secrets, API keys, or
credentials (actual values, not env var references):
.env, app.config.js, src/lib/supabase.ts, src/lib/adminAuth.ts,
and any file in supabase/functions/_shared/.
Report findings only -- do not commit fixes for secrets, report them so
they can be rotated manually.

OUTPUT per item: what was found, what was changed (if anything), file
locations for any new rate-limit logic, and a one-line verdict
(PASS / FIXED / NEEDS MANUAL ACTION) for each of items 2-5.
```

Session 2.5 found this button keys off legacy `driver_id` (unused/null) and
so doesn't render for orders sourced from `operator_order_view`. Pre-existing
gap, not a regression -- exposed because operators can now reach this screen
at all. Not blocking: the Handoff Codes flow covers the same action today.

Session 11 update: `evaluateTrackingStopAfterHandoff()` is now wired to
ConfirmHandoffScreen (the screen exists as pre-existing code). Phase 4's
tracking-stop logic is already attached. What remains is navigation only --
no path in the parcel UI leads to ConfirmHandoffScreen yet. Fix: add a
"Confirm handoff" CTA on DriverParcelDetailsScreen/TripDetailScreen that
navigates there. The operator_order_view WHERE clause already proves
assignment -- no new auth check needed.

---

## Future, unscheduled — captureCurrentLocation() real-device check

Session 4 implemented §8's one-shot location capture with "when-in-use"
permission, but only exercised it by passing simulated lat/lng into the
co-conductor/transfer edge functions -- not via a real permission prompt on a
device. The entire point of §8 was staying out of Play Store's
ACCESS_BACKGROUND_LOCATION review path, which is a claim about what the
permission dialog actually says on a real device, not about the code as
written. Cheap to check (one tap, one screenshot of the permission prompt)
but worth doing before Phase 5, not assumed correct because the code reads
right.

---

## Session 8 — Operator trip UI (v6 §15) — run before 6b/7 despite appearing
later in this document; see run-order note at top

The "Sessions 2-5 built the backend, nothing calls it" gap, operator side.

**Model: default** (every action maps to an existing service/function from
Sessions 4-5; §15 specifies the screens).

**/goal**: `My Trips, Trip Detail, and Create Trip screens exist per §15,
a test conductor can create a trip through the UI and see it in My Trips,
and Trip Detail's co-conductor/transfer actions call the existing
addCoConductor()/requestTripTransfer() functions, or stop after 30 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §15.

1. My Trips (§15.1) and Trip Detail (§15.2) -- list/detail over
   linehaul_trips, linehaul_trip_conductors, and attached orders. Wire
   "Add co-conductor" and "Request transfer" to addCoConductor() /
   requestTripTransfer() from Session 4.
2. Create Trip (§15.3) -- form + previewTripCreation() preview +
   createLinehaulTrip() (new, if it doesn't exist -- insert + photo upload
   only, no new policy) + Publish (draft -> open, respecting
   is_extra_trip/extra_trip_approved_by from Session 4).
3. Verify live as testlinehaul@patwadi.com: create a trip, see it in My
   Trips, open Trip Detail.

OUTPUT: screens added, confirmation of the live create -> list -> detail
flow, and createLinehaulTrip()'s location in code if newly added.
```

PAUSE.

---

## Session 9 — Admin Phase 2 UI (v6 §16)

The same gap, admin side. Independent of Session 8 -- either order is fine.

**Model: default** (same reasoning -- §16 specifies the screens, Sessions
2-5 already built every action behind them).

**/goal**: `recovery queue, flagged transfers, and trips overview exist as
sections/tabs in AdminDashboard per §16, and admin@patwadi.com can view all
three and successfully call adminReassignRecovery() / adminCancelTrip() /
adminRescindParcel() on seeded test data, or stop after 25 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §16.

1. Recovery queue (§16.1) -- fetchActiveRecoveries(), reassign/mark
   unrecoverable actions.
2. Flagged transfers (§16.2) -- read-only list where admin_review_required
   = true.
3. Trips overview (§16.3) -- all linehaul_trips, cancel trip / rescind
   parcel / approve extra trip actions.
4. Verify live as admin@patwadi.com using seeded test trips/recoveries
   (same seed-verify-cleanup pattern as Sessions 3-5) for each action.

OUTPUT: screens/tabs added, confirmation each action works against seeded
data, cleanup confirmed.
```

PAUSE. **After Session 9, Phase 2's backend (Sessions 2-5) has a complete UI
surface on both operator and admin sides** -- the "flagged, no consumer"
items (trip-management UI, Confirm Handoff, fetchActiveRecoveries) are now
either resolved or, for Confirm Handoff specifically, ready to resolve since
Trip Detail (§15.2) gives operators a real trip-aware screen it could live
on instead.

---

## Completed (out of sequence) — Unified login, admin entry point removed

LoginScreen now routes isAdmin -> Admin, then role -> Main, then no role ->
RoleSelect (AuthContext already loaded isAdmin via fetchAdminProfile but
LoginScreen hadn't used it). Splash's separate Admin Login link removed;
AdminLoginScreen flagged dead code, route kept in RootNavigator per the
flag-don't-delete pattern. RoleSelectScreen got a defensive isAdmin guard,
needed because admin@patwadi.com has no profiles.role at all and would
otherwise land on RoleSelect. Verified live: testcustomer -> Main ->
CustomerHome, testlinehaul -> Main -> DriverHome, admin@patwadi.com -> Admin
-> AdminStack, all through one LoginScreen.

One thing to keep in mind, not urgent: isAdmin is checked *first*, so any
account that is both an active admin and has a profiles.role would always
route to Admin and never reach Main. Fine while admin@patwadi.com has no
role -- worth remembering if a real admin account ever also needs
customer/operator access for testing.

---

## Session 8.5 — Eligible conductor lookup (v6 §17)

Closes Session 8's ConductorPickerSheet gap. Small, same shape as 2.5.
Independent of Session 9 -- either order is fine, but same area as 8.

**Model: default**.

**/goal**: `eligible_conductors_view exists per §17, ConductorPickerSheet
shows a real searchable list of approved/available conductors (not manual
UUID entry), and addCoConductor()/requestTripTransfer() still work end to
end through it, or stop after 15 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §17.

1. Create eligible_conductors_view per §17.
2. ConductorPickerSheet queries it instead of recent-co-conductor-IDs +
   manual entry.
3. Verify live: as testlinehaul@patwadi.com, open the picker on a
   details_locked test trip, confirm testlinehaul2@patwadi.com (and other
   approved/available conductors) appear by name, select one, confirm
   addCoConductor()/requestTripTransfer() still succeed.

OUTPUT: view definition, picker changed, live verification.
```

PAUSE.

---

## Session 10 — Corridors as database table (v6 §18)

Replaces CORRIDOR_DEFINITIONS with a Supabase table so admin can add
routes without a code change.

**Model: default** (well-specified, no ambiguous judgment calls).

**/goal**: `corridors table exists with seed data and correct RLS, fetchCorridors()
replaces CORRIDOR_DEFINITIONS throughout the codebase, _shared/corridorOrigins.ts
queries the table, CreateTripScreen corridor picker shows live DB corridors,
and admin dashboard has a Corridors tab for adding/toggling routes, or stop
after 25 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §18.

1. Create corridors table per §18.1 with RLS per §18.2. Seed the 6 rows
   from §18.4. Verify: anon session can SELECT active corridors, admin can
   INSERT, operator can SELECT.

2. corridors.ts: keep types, remove CORRIDOR_DEFINITIONS static object,
   add fetchCorridors() and fetchCorridorByKey(key) querying the table.
   Update every import of CORRIDOR_DEFINITIONS in the codebase to use
   fetchCorridors() instead.

3. supabase/functions/_shared/corridorOrigins.ts: replace static object
   with a Supabase service-role query. Cache result in module scope per
   invocation. Deploy affected edge functions (at minimum
   request-trip-transfer which uses corridor geography for risk flags).

4. CreateTripScreen corridor picker: switch from CORRIDOR_DEFINITIONS to
   fetchCorridors().

5. Admin dashboard: add Corridors tab (4th tab in §16's dashboard) with:
   - List of all corridors (active + inactive)
   - Toggle active/inactive (no hard delete)
   - Add new corridor form: origin city, origin lat/lng, destination city,
     destination lat/lng, expected_duration_hours. Key auto-generated from
     origin_city + destination_city (lowercase, underscore-separated).

6. Verify live: add a test corridor (e.g. chandigarh_kullu) via admin
   dashboard, confirm it appears in CreateTripScreen's corridor picker,
   then deactivate it and confirm it disappears.

OUTPUT: table + RLS confirmed, CORRIDOR_DEFINITIONS removed from codebase
(grep confirms 0 remaining references), edge function redeployed, admin
Corridors tab verified, test corridor add/deactivate cycle confirmed.
```

PAUSE.

---

## Session 11 — Phase 4: trip-window location tracking (v6 §19)

**Model: Fable 5** (foreground service + offline sync is the most
technically complex session so far -- judgment calls on expo-location
foreground service setup, SQLite vs AsyncStorage for offline queue,
and the sync-on-reconnect pattern all benefit from stronger reasoning).

**/goal**: `location_samples table exists with correct schema and RLS,
expo-location foreground service starts/stops per §19.2's window
definitions for both linehaul and LMP roles, offline queue syncs on
reconnect via sync-location-samples edge function, the three cron checks
from §19.4 are added to apply_linehaul_trip_timer_transitions(), and
transfer risk flag 4 (not_physically_traveling) is computed from real
samples, or stop after 35 turns`

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §19 in full before writing any code.

1. DATABASE
   Create location_samples table per §19.3 with the unique constraint
   (trip_id, conductor_id, recorded_at). RLS: conductors can INSERT their
   own rows (conductor_id = auth.uid()); admin can SELECT all; operators
   can SELECT rows where conductor_id = auth.uid(). No customer access.

2. OFFLINE QUEUE + SYNC EDGE FUNCTION
   Client: store location samples in an AsyncStorage queue when offline
   (key: 'location_queue', value: JSON array of sample objects). On
   reconnect (NetInfo change to connected), flush the queue via the new
   sync-location-samples edge function (bulk upsert, idempotent on the
   unique key). Clear the queue only after a confirmed successful sync.

   Edge function sync-location-samples: accepts array of samples, bulk
   upserts to location_samples, returns count of rows written.

3. FOREGROUND SERVICE (expo-location)
   Implement startTripTracking(tripId, role) and stopTripTracking():
   - Uses expo-location's startLocationUpdatesAsync with a background/
     foreground task (use TaskManager from expo-task-manager)
   - Sample interval: 60 seconds (balance between accuracy and battery)
   - On each sample: append to AsyncStorage queue, attempt immediate
     sync if network available, otherwise leave for reconnect flush
   - Android foreground service notification: "Patwadi — trip tracking
     active" (required by Android for foreground services)
   - Add FOREGROUND_SERVICE permission to app.config.js

   Start/stop triggers per §19.2:
   - Linehaul: start when trip status -> open, stop when custody
     acknowledgment location matches corridor destination within 15km
   - LMP: start when assigned order appears, stop on final handoff ack

4. CRON EXTENSION
   Add the three checks from §19.4 to
   apply_linehaul_trip_timer_transitions(). Do not create a new cron
   job -- extend the existing one. The three checks are:
   a. Overdue flagging (add is_overdue boolean to linehaul_trips if not
      present, set when now() > closed_at + duration * 1.2)
   b. Recovery escalation (increment escalation_level per §19.4b)
   c. Tracking window cleanup (mark ended windows, no deletion)

5. TRANSFER FLAG 4
   In request-trip-transfer edge function: after the existing 6-flag
   checks, compute not_physically_traveling per §19.5 using
   location_samples. Update the field (previously always null) to true
   or false based on sample recency and movement. Add to risk_reasons
   if true.

6. VERIFY
   Seed a test linehaul session: create a trip, confirm tracking starts,
   let it run for 2 minutes (2 samples), kill network, confirm samples
   queue in AsyncStorage, restore network, confirm sync-location-samples
   receives the queued samples and inserts them. Check location_samples
   table as admin. Clean up test data.

OUTPUT: table + RLS, edge function deployed, foreground service wiring
confirmed, cron extension deployed, flag 4 computing real values.
```

PAUSE. Phase 4 complete after this session. Phase 5 (Play Store) becomes
unblocked -- privacy policy and Data Safety form can now be written from
actual permission usage.

---

## Session 12a — Auth + core UX foundations

**Model: Fable 5** (pattern decisions: shared components, KeyboardAvoidingView
strategy, toast system choice, validation approach -- these are judgment calls
that affect every screen in 12b).

**/goal**: `LoginScreen has unified identifier field, show/hide password,
KeyboardAvoidingView, OTP for email+phone, Forgot Password, button loading
states; shared components exist for EmptyState, Toast, LoadingButton,
OfflineBanner, and PullToRefresh; inline validation pattern is established
on at least one form; or stop after 35 turns`

```
Read src/screens/LoginScreen.tsx, AuthContext, and src/lib/adminAuth.ts
before writing anything. Also scan src/components/ for any existing
Toast, Snackbar, or feedback components before building new ones.

## 1. UNIFIED LOGIN IDENTIFIER
Replace separate email/phone inputs with one field "Email or phone number".
Detection:
- Contains @ or has letters → email path
- 10 digits or +91 prefix → phone path
On Continue (email): show password field + "Sign in with OTP instead" link.
On Continue (phone): send OTP immediately via supabase.auth.signInWithOtp.

## 2. PASSWORD FIELD UX
- Show/hide toggle: ti-eye / ti-eye-off Tabler icon, inside the field.
- Forgot Password link (email path only): inline state change, no new
  screen. supabase.auth.resetPasswordForEmail → "Check your email."
- Error specificity: parse Supabase error.message for 404/401/429 and
  show human-readable messages.

## 3. KEYBOARD AVOIDING
Wrap LoginScreen form in KeyboardAvoidingView (behavior="padding",
Android). Extract this as a shared <ScreenScrollView> wrapper or
similar -- every form screen (CreateTrip, PackageDetails, KYC) needs
the same fix in Session 12b. Build it once here.

## 4. BUTTON LOADING STATE
Build a shared <LoadingButton> component: accepts isLoading boolean,
disables + shows ActivityIndicator inside when true, re-enables on
resolve. Wire it on LoginScreen's Sign In / Continue button. This
component gets applied to every action button in 12b.

## 5. SHARED COMPONENTS (build these, don't wire everywhere yet --
   12b applies them across the app)

<EmptyState title="" subtitle="" action?={label, onPress}>
  Generic empty state card. Used when a list returns 0 rows.

<Toast> / useToast()
  Simple bottom-of-screen toast. Variants: success (teal), error
  (coral), info (gray). Auto-dismiss after 3s. Use this for action
  confirmations and errors throughout. If a library already exists
  in the project (react-native-toast-message etc.), use it -- don't
  duplicate.

<OfflineBanner>
  Thin banner at top of screen, visible when NetInfo reports no
  connection. Already have @react-native-community/netinfo from
  Session 11 -- reuse it. Text: "You're offline — some features
  may be unavailable."

<PullToRefresh>
  RefreshControl wrapper for ScrollView/FlatList. Accepts onRefresh
  callback, handles loading state internally.

## 6. INLINE VALIDATION PATTERN
Establish on LoginScreen: red border + error text below field on blur
if invalid (empty required field, invalid email format, phone too
short). This is the pattern 12b applies to all forms.

## 7. ADMIN ROUTING
Confirm admin@patwadi.com still routes correctly through the unified
identifier field after all changes.

OUTPUT: each of 7 items -- what changed, where the shared components
live, confirm admin routing still works.
```

PAUSE. Review shared components before Session 12b applies them
everywhere.

---

## Session 12b — Apply patterns everywhere + Play Store requirements

**Model: default** (applying established patterns from 12a -- not judgment
calls, execution work).

**/goal**: all list screens have empty states and pull-to-refresh, all
action buttons use LoadingButton, all destructive actions have confirmation
dialogs, account deletion exists in Settings, post-payment lands on
TrackingDetails, RoleSelect has plain-language labels, offline banner is
global, or stop after 35 turns`

```
Read Session 12a's output before starting -- this session applies the
shared components built there. Do not rebuild Toast, EmptyState,
LoadingButton, OfflineBanner, or PullToRefresh -- import and use them.

## 1. EMPTY STATES (apply <EmptyState> to every list screen)
- My Packages: "No shipments yet — tap Send Parcel to get started"
- My Trips: "No trips yet — tap Create Trip to get started"  
- My Parcels (operator): "No parcels assigned yet"
- Notifications: "No activity yet — your shipment updates will appear here"
- Admin Recovery queue: "No parcels in recovery"
- Admin Flagged transfers: "No flagged transfers"
- Admin Trips: "No trips found"

## 2. PULL-TO-REFRESH (apply <PullToRefresh> to every list screen)
My Packages, My Trips, My Parcels, Notifications, Admin Parcels,
Admin Recovery, Admin Flagged, Admin Trips, Admin Corridors.

## 3. LOADING BUTTON (apply <LoadingButton> to every action button)
Priority actions: Publish trip, Add co-conductor, Request transfer,
Confirm handoff, Cancel trip, Rescind parcel, Reassign recovery,
Mark unrecoverable, Approve extra trip, Activate/deactivate corridor.

## 4. TOAST FEEDBACK (apply useToast() after key actions)
Success: "Trip published", "Co-conductor added", "Transfer requested",
"Handoff confirmed", "Trip cancelled", "Parcel rescinded", "Recovery
reassigned", "Corridor added".
Error: show toast on any catch block that currently fails silently.

## 5. CONFIRMATION DIALOGS (destructive actions only)
- Cancel trip: "Cancel this trip? All attached parcels will be
  reassigned or flagged for recovery."
- Mark unrecoverable: "Mark as unrecoverable? This cannot be undone."
- Deactivate corridor: "Deactivate this corridor? It will no longer
  appear for new trips or bookings."
- Account deletion (see item 7).

## 6. KEYBOARD AVOIDING
Apply the shared ScreenScrollView wrapper from 12a to:
CreateTripScreen, PackageDetailsScreen (customer booking),
DriverKycScreen, DriverBusDetailsScreen (once onboarding is built).

## 7. ACCOUNT DELETION (Play Store hard requirement)
In Settings: "Delete account" option. Confirmation dialog: "This
permanently deletes your account and all personal data. This cannot
be undone." On confirm: call a new delete-account edge function
(service role, deletes auth.users row + profiles row + sets
customer_id null on their orders). Show loading, then sign out.
Build the edge function; deploy it.

## 8. POST-PAYMENT NAVIGATION
After verify-razorpay-payment succeeds: navigate to TrackingDetails
for the newly created order (pass order id from the payment
response). Currently lands somewhere unclear -- fix this so the
customer immediately sees their "Booked" status after paying.

## 9. ROLESELECT PLAIN LANGUAGE
Current labels: "LMP", "linehaul" (or similar technical strings).
Replace with: "I deliver parcels locally" (LMP) and "I transport
parcels between cities" (linehaul). Keep the underlying role value
unchanged -- only the display label changes.

## 10. OFFLINE BANNER
Mount <OfflineBanner> globally in App.tsx or the root navigator
so it appears across all screens when NetInfo reports offline.

## 11. ANDROID BACK BUTTON
On screens where pressing back would exit the app unexpectedly
(CustomerHome, DriverHome, AdminDashboard -- the root screens of
each stack): intercept the hardware back button and either show
"Exit Patwadi?" confirmation or no-op. Use useFocusEffect +
BackHandler.

## 12. OPERATOR UX IMPROVEMENTS
- TripDetailScreen: show attached parcel count vs capacity
  (e.g. "3 / 10 parcels") where capacity_count is set.
- ConductorPickerSheet: display full_name prominently, profile
  role and corridor as subtitle -- not raw UUID.
- Transfer request: show a summary of which flags fired before
  the conductor confirms ("2 flags: geography mismatch, close to
  departure — proceed anyway?").

OUTPUT: one line per item confirming done or skipped (with reason).
Confirm account deletion edge function is deployed. Confirm
post-payment navigation reaches TrackingDetails.
```

PAUSE. After both sessions, run a manual walkthrough of the 3
main user flows (customer books, operator publishes + handoff,
admin views flagged transfer) before the EAS build.

---

## Session 12 — Physical device: payment E2E + Phase 4 GPS smoke

**Model: default** (known scope, no judgment calls).

**/goal**: real booking produces confirmed order with corridor_key set,
foreground tracking notification appears, 2+ location samples written in
2 minutes, offline flush confirmed, tracking stops on cancel, or stop
after 25 turns.

```
Prerequisites: physical Android device connected via USB, USB debugging
enabled, Metro running on 8082.

Run:
  adb reverse tcp:8082 tcp:8082
  npx expo run:android --device

PART A — Payment E2E (testcustomer@patwadi.com / Patwadi123!)
1. Send Parcel -> package details -> Delhi pickup -> Chandigarh dropoff
   -> price estimate -> Confirm.
2. Razorpay sheet: UPI success@razorpay (simplest test path).
3. Confirm success state in app.
4. Query orders as admin: confirm new row with payment_status = confirmed
   AND corridor_key = 'delhi_chandigarh'. Report new order id.
5. Check My Packages: confirm new order shows "Booked" label (not
   "Pending"). Report what's shown.

PART B — Phase 4 GPS smoke (testlinehaul@patwadi.com / Patwadi123!)
6. Create and publish a test trip (any corridor, departure 2h+ out).
7. Confirm foreground notification: "Patwadi -- trip tracking active".
8. Wait 2 minutes (real GPS available). Query location_samples as admin:
   confirm 2+ rows for this trip. Report lat/lng.
9. Toggle airplane mode 60s then off. Confirm offline queue flushed --
   sync-location-samples received queued samples.
10. Cancel test trip. Confirm notification disappears, no new samples
    written after cancellation.

OUTPUT: Part A -- new order id, corridor_key, My Packages label.
Part B -- notification confirmed, sample count + lat/lng, offline flush
confirmed, tracking stop confirmed.
Cleanup: delete test trip. Leave the booking order intact -- first real
booking, worth keeping.
```

PAUSE.

---

## Session 13 — Login & auth improvements

**Model: default**.

**/goal**: unified identifier field (email or phone), show/hide password,
KeyboardAvoidingView, OTP option for email users, Forgot Password, button
loading state, specific error messages, and correct keyboard/autofill hints
on all fields, or stop after 25 turns.

```
Read src/screens/LoginScreen.tsx, src/lib/adminAuth.ts, and AuthContext
before touching anything. Do not change admin routing (isAdmin check
runs after successful auth, unchanged).

1. UNIFIED IDENTIFIER FIELD
   Replace separate email/phone inputs with one field labelled
   "Email or phone number". Detect which it is:
   - Contains @ or non-numeric: treat as email
   - 10 digits or +91 prefixed: treat as phone
   On Continue:
   - Phone -> send OTP via supabase.auth.signInWithOtp({ phone })
   - Email -> show password field + two options:
     a. Sign in with password (existing flow)
     b. "Sign in with OTP instead" -> signInWithOtp({ email })

2. SHOW/HIDE PASSWORD
   Eye icon toggle (ti-eye / ti-eye-off, Tabler outline) inside the
   password field. Default hidden. Tap to reveal.

3. KEYBOARD AVOIDING
   Wrap form in KeyboardAvoidingView (behavior="padding" on Android).
   Sign In button stays visible when keyboard is open.

4. FORGOT PASSWORD
   "Forgot password?" link below password field (email path only).
   Tap: prompt for email -> supabase.auth.resetPasswordForEmail(email)
   -> inline success message "Check your email for a reset link."
   No new screen -- inline state on LoginScreen.

5. BUTTON LOADING STATE
   During any async operation: disable button, show ActivityIndicator
   inside it. Re-enable on success or error.

6. ERROR MESSAGES
   Parse Supabase error.message:
   - No account found
   - Incorrect password
   - Too many attempts -- try again in X minutes
   Replace generic "Invalid login credentials" with these.

7. INPUT HINTS + AUTOFILL
   - Identifier: keyboardType="email-address" until numeric detected,
     then keyboardType="phone-pad". autoCapitalize="none".
     textContentType="emailAddress".
   - Password: textContentType="password", autoCapitalize="none".
   - OTP: keyboardType="number-pad", textContentType="oneTimeCode"
     (triggers SMS autofill on iOS).
   Segmented OTP input: 4 individual single-character TextInputs in a
   row. Focus auto-advances on input, retreats on backspace. 4th digit
   entered -> auto-submit.

OUTPUT: what changed per item. Confirm admin@patwadi.com still routes
correctly through unified field. Confirm testcustomer and testlinehaul
still log in correctly.
```

PAUSE.

---

## Session 14 — Handoff code segmented input

**Model: default**.

**/goal**: wherever operators enter the 4-digit handoff code, it is a
segmented 4-box input that auto-submits on the 4th digit, auto-reads
from SMS on iOS, and handles paste, or stop after 10 turns.

```
Find wherever operators enter the 4-digit handoff code to acknowledge
a handoff. Replace the plain TextInput with a segmented 4-box component:

- 4 single-character TextInputs side by side
- Focus auto-advances on each digit entered
- Backspace retreats focus to previous box
- 4th digit entered -> auto-calls acknowledge-handoff, no Confirm tap
- keyboardType="number-pad", textContentType="oneTimeCode"
- Paste support: if user pastes "6344", distribute across all 4 boxes
  and auto-submit

Also check: does the customer-facing OTP entry (if any separate screen
exists for reading back the code to the LMP) use the same component?
If yes, apply there too.

OUTPUT: component location, confirm auto-submit fires on 4th digit,
confirm paste distributes correctly.
```

PAUSE.

---

## Session 15 — Empty states, loading, pull-to-refresh, post-payment nav,
## stub cleanup

**Model: default**.

**/goal**: every list screen has a meaningful empty state, every list
has pull-to-refresh, action buttons disable during async operations,
screens show loading skeletons before data arrives, payment success
routes directly to TrackingDetails, and all customer-facing stubs and
debug noise are removed, or stop after 30 turns.

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §20.5 before starting.

PART A — STUB CLEANUP (do this first, it's small)
1. SendParcelScreen: hide the Depots, Routes & Coverage, and Schedule
   Pickup action buttons entirely. Remove the debug ingest fetch call
   on mount (http://127.0.0.1:7453/ingest/...).
2. PickupScreen / DropoffScreen: remove all debug ingest fetch calls
   (127.0.0.1:7453 references). Update corridor rejection alert copy
   to: "We're not live on this corridor yet."
3. ConfirmOrderScreen: update corridor guard alert to same copy.
4. PriceEstimateScreen: remove/replace any copy implying a Depots
   feature (e.g. "Final price may change based on exact depot").

PART B — EMPTY STATES
Add a meaningful empty state to each screen (Tabler icon + heading +
one-line description + optional CTA):
- My Packages: "No shipments yet" + CTA -> Send Parcel
- My Trips: "No trips yet" + CTA -> Create Trip
- My Parcels (operator): "No parcels assigned yet"
- Notifications: "No activity yet"
- Admin Recovery queue: "No active recoveries"
- Admin Flagged transfers: "No flagged transfers"

PART C — PULL-TO-REFRESH
Add RefreshControl to: My Packages, My Trips, My Parcels,
Notifications, AdminParcels, Admin Recovery, Admin Flagged,
Admin Trips overview.

PART D — LOADING SKELETONS
2-3 placeholder rows (gray rounded rects, opacity pulse) on list
screens before data arrives.

PART E — BUTTON LOADING STATES
Disable + ActivityIndicator during async calls on: Publish Trip,
Add co-conductor, Request transfer, Confirm handoff, all admin action
buttons (cancel, rescind, reassign, approve).

PART F — POST-PAYMENT NAVIGATION
After verify-razorpay-payment succeeds: navigate directly to
TrackingDetails for the new order id.

PART G — SUCCESS TOASTS
Brief 2s toast after: trip published, handoff confirmed, co-conductor
added, parcel rescinded.

OUTPUT: stubs removed (grep confirms 0 remaining 127.0.0.1 references
in src/), empty states per screen, post-payment nav confirmed.
```

PAUSE.

---

## Session 16 — Account deletion, confirmations, offline banner,
## RoleSelect labels

**Model: default**.

**/goal**: account deletion works end-to-end (Play Store hard requirement),
destructive actions have confirmation dialogs, an offline banner appears
when connectivity is lost, and RoleSelect uses plain-language labels,
or stop after 20 turns.

```
1. ACCOUNT DELETION (Play Store hard requirement -- not optional)
   Settings screen: add "Delete account" below Logout. Tapping it:
   a. Alert: "This will permanently delete your account and all your
      data. This cannot be undone." Confirm / Cancel.
   b. On confirm: call supabase.auth.admin.deleteUser (requires a new
      edge function delete-account -- service role only, verifies
      auth.uid() matches the requesting user before deleting).
   c. On success: sign out and return to LoginScreen.
   Add the edge function to supabase/functions/delete-account/ and
   deploy it.

2. DESTRUCTIVE ACTION CONFIRMATIONS
   Add Alert.alert confirmation before:
   - Cancel trip (admin): "Cancel this trip? All attached parcels will
     be reassigned or flagged for recovery."
   - Mark unrecoverable (admin): "Mark as unrecoverable? This cannot
     be undone."
   - Rescind parcel (admin): "Remove this parcel from the trip?"
   - Delete account (covered above)
   Pattern: Alert.alert(title, message, [Cancel, Confirm]) -- Cancel
   is first (Android convention).

3. OFFLINE BANNER
   Use @react-native-community/netinfo (already installed from
   Session 11) to detect connectivity. When offline: show a persistent
   banner at the top of the screen "No internet connection -- some
   features unavailable" in amber. Dismiss automatically when
   connection returns. Apply globally (App.tsx level, not per screen).

4. ROLESELECT CUSTOMER-ONLY
   Per §20.1: hide LMP and Linehaul cards. Show only the customer
   option ("I'm sending a parcel" -> role = customer). Update footer
   copy: remove "contact support to change this later" -- operators
   are created by admin, not self-service. If an operator somehow
   reaches RoleSelect (shouldn't happen post-§20.3's post-auth gate),
   show "Operator accounts are set up by Patwadi. Please contact ops."

OUTPUT: delete-account edge function deployed, confirm deletion works
end-to-end for testcustomer (then recreate the account), confirmation
dialogs on all three admin actions, offline banner visible in emulator
with airplane mode, RoleSelect labels updated.
```

PAUSE. After Sessions 12-16 are complete, the app is ready for:
- EAS preview build (eas build --platform android --profile preview)
- Operator onboarding forms (separate spec pass needed)
- Phase 5 (Play Store -- privacy policy, Data Safety, written from
  actual Phase 4 permissions)

---

## Session 17 — Operator onboarding model (v6 §20)

**Model: default**.

**/goal**: operator_kyc_packets and operator_corridors tables exist with
correct RLS, operator_status added to profiles, OperatorPendingScreen
shown for non-approved/non-active operators, post-auth routing matches
§20.3, RoleSelect blocks operator self-signup at client AND RLS level,
DriverKycScreen/DriverBusDetailsScreen/DriverTermsScreen removed from nav,
is_conductor_approved_and_available() updated to check all three conditions,
and Create Trip shows only the operator's approved corridors, or stop after
30 turns.

```
Read PATWADI_LAUNCH_ARCHITECTURE.md §20 in full before writing any code.
All decisions are locked -- do not re-propose alternatives.

1. SCHEMA (supabase/schema/phase17_operator_onboarding.sql)

   a. Add to profiles table:
      - operator_status text DEFAULT 'inactive'
        CHECK (operator_status IN ('active','suspended','inactive'))
      Existing rows: set operator_status = 'active' where
      approval_status = 'approved', else 'inactive'.

   b. operator_kyc_packets per §20.2:
      - payment_method_type text CHECK ('upi','bank_transfer')
      - upi_id text (non-null if payment_method_type = 'upi')
      - bank_account_number, bank_ifsc_code, bank_account_name,
        bank_account_type (non-null if payment_method_type = 'bank_transfer')
      - emergency_contact_name, emergency_contact_phone
      - All other fields per §20.2
      - CHECK constraint: payment fields match payment_method_type
      - RLS: admin INSERT/UPDATE; operator SELECT own row only

   c. operator_corridors per §20.2:
      - Works for BOTH lmp and linehaul roles
      - RLS: operator SELECT own rows; admin full CRUD
      - Seed: assign testlinehaul@patwadi.com to delhi_chandigarh

   d. Update is_conductor_approved_and_available() (from Session 4):
      Add operator_status = 'active' to the existing checks alongside
      approval_status = 'approved' AND is_available = true.

2. POST-AUTH ROUTING (src/lib/auth/postAuthRoute.ts or equivalent)
   Implement §20.3 order:
   1. admin_profiles.active -> Admin
   2. role lmp|linehaul + approval_status='approved' +
      operator_status='active' -> Operator Main
   3. role lmp|linehaul + (approval_status != 'approved' OR
      operator_status != 'active') -> OperatorPending
   4. role = customer -> Customer Main
   5. no role -> RoleSelect

3. OPERATOR PENDING SCREEN (src/screens/OperatorPendingScreen.tsx)
   - Message: "Your operator account is being reviewed. You'll be able
     to start once Patwadi ops approves your account."
   - Support WhatsApp deep link (buildSupportDeepLink, issue type
     "Account approval status")
   - Sign out button

4. NAVIGATOR CLEANUP (src/navigation/RootNavigator.tsx)
   - Unregister DriverKycScreen, DriverBusDetailsScreen, DriverTermsScreen
   - Register OperatorPendingScreen
   - CameraMeasureScreen: keep registered, ensure no entry point

5. ROLESELECT + CLIENT BLOCK
   - RoleSelectScreen: show customer card only, hide lmp/linehaul
   - Footer: remove "contact support to change this later"
   - src/lib/api/auth.ts createProfile: reject role != customer
   - RLS on profiles INSERT: block role = lmp|linehaul from client
     (service role / admin only can set these)

6. CREATE TRIP CORRIDOR PICKER (§20.4)
   - fetchApprovedCorridorsForOperator(userId): joins operator_corridors
     -> corridors where active = true. Works for both lmp and linehaul.
   - Replace fetchCorridors({ activeOnly: true }) in CreateTripScreen
     with fetchApprovedCorridorsForOperator(auth.uid()).
   - Empty state: "No corridors assigned. Contact Patwadi ops." --
     disable Publish.
   - Preselect if exactly one corridor.
   - Vertical FlatList with search (ConductorPickerSheet pattern).
   - Server guard: trip insert rejects corridor_id not in operator's
     approved set.

7. VERIFY
   a. testlinehaul@patwadi.com logs in -> Operator Main (approved +
      active). Create Trip shows delhi_chandigarh only.
   b. Set testlinehaul operator_status='suspended' -> logs in ->
      OperatorPendingScreen. Restore to 'active'.
   c. Set testlinehaul approval_status='pending' -> logs in ->
      OperatorPendingScreen. Restore to 'approved'.
   d. New customer account -> RoleSelect shows customer card only.
   e. Attempt profiles INSERT with role='linehaul' from client ->
      rejected by RLS.

OUTPUT: schema applied (all three tables/columns), routing confirmed
for all 5 cases in §20.3, picker shows approved corridors only,
is_conductor_approved_and_available() updated and re-tested.
```

PAUSE. After Session 17, the operator onboarding model is complete for
launch. Admin creates operators manually via Supabase; the app correctly
gates on both approval_status and operator_status.

---

## Session 18 — Critical bug fixes + UX repositioning

**Model: default**.

**/goal**: phone OTP login works, LMP role is gated from linehaul Trips
tab, Home "Track Package" opens tracking directly, q-commerce copy is
replaced with bus-cargo copy throughout, and microphone permission is
removed, or stop after 25 turns.

```
Read PATWADI_LAUNCH_ARCHITECTURE.md before starting. These are all
targeted fixes — no new features, no new screens.

1. PHONE OTP BUG (BLOCKER)
   LoginScreen.tsx handleVerifyOtp references an undefined userId.
   Find the correct user id source after OTP verification (should
   come from the Supabase session returned by verifyOtp) and fix
   the reference. Test: phone OTP login completes without crash.

2. LMP ROLE GATE ON TRIPS TAB
   MainTabs.tsx (or DriverHome): the Trips tab and "Create Trip" CTA
   are linehaul-only concepts. LMP operators should not see them.
   Gate by role: show Trips tab only when role = linehaul.
   LMP bottom nav: Home | Parcels | Settings (no Trips tab).

3. HOME "TRACK PACKAGE" NAVIGATION
   CustomerHome currently has both "My Packages" and "Track Package"
   navigating to the same Packages tab. Fix "Track Package" to either:
   a. Open a direct tracking input (enter order ID) -- preferred
   b. Or remove it entirely if (a) is too much scope -- acceptable
   Report which you did and why.

4. Q-COMMERCE COPY REMOVAL
   Find and replace all of these strings throughout src/:
   - "Fast intercity delivery" -> "Intercity parcel delivery"
   - "Same-day potential" -> remove entirely
   - Any "24hrs / 48hrs" framing that implies speed as the primary
     value -> replace with "Next-corridor delivery" or "Scheduled
     intercity delivery"
   - CustomerHome subtitle if it implies speed
   Patwadi sells certainty, not speed. Copy should reflect that.
   Do a grep for "fast", "same-day", "quick", "express" in src/
   and evaluate each one.

5. MICROPHONE PERMISSION
   react-native-vision-camera registers microphone permission in
   app.config.js. CameraMeasureScreen (the only vision-camera user)
   is unreachable in the main flow. Remove the microphone permission
   declaration. If removing vision-camera plugin entirely is cleaner
   (since the camera measure feature is a stub), do that instead and
   note it.

OUTPUT: OTP fix confirmed (test login via phone), LMP tab count
confirmed (3 tabs not 4), Track Package behavior confirmed, grep
results for speed-related copy with what was changed, microphone
permission removal confirmed.
```

PAUSE.

---

## Session 19 — Store compliance + production build profile

**Model: default**.

**/goal**: package name changed to com.patwadi.app, real app icon and
splash exist, production EAS build profile configured for AAB upload,
POST_NOTIFICATIONS permission added for Android 13+, privacy policy
placeholder page exists at a real URL, or stop after 25 turns.

```
1. PACKAGE NAME (BLOCKER)
   Change com.anonymous.patwadi to com.patwadi.app across:
   - app.config.js (android.package)
   - eas.json (if hardcoded anywhere)
   - Any google-services.json or firebase config if present
   Note: this invalidates the existing preview APK signing. A new
   EAS build after this will generate new keys. That is expected.
   Do NOT change the package name mid-session and then build --
   report the change and pause for confirmation before any build.

2. APP ICON + SPLASH
   assets/ currently has Expo placeholder grid icon. Patwadi's brand
   color is red (#E53935 or similar from existing UI). Create:
   - A simple branded icon: red background, white "P" or parcel box
     icon, 1024×1024px. Use a script (sharp, canvas) to generate it
     programmatically -- do not require a design file from the user.
   - Adaptive icon foreground on white background.
   - Splash screen: white background, red "Patwadi" wordmark centered.
   These do not need to be final brand assets -- they need to not be
   the Expo grid. The team can replace them later with real design.
   Update app.config.js icon/splash/adaptiveIcon paths accordingly.

3. PRODUCTION EAS PROFILE
   eas.json currently has only "preview" (APK). Add:
   - "production" profile: Android AAB (buildType: "app-bundle"),
     with autoIncrement: "version" for versionCode management.
   - "preview" profile stays as-is for team APK distribution.
   Do NOT run eas build -- just configure the profile.

4. POST_NOTIFICATIONS PERMISSION
   Android 13+ (API 33+) requires explicit POST_NOTIFICATIONS
   permission for push notifications. Add to app.config.js
   android.permissions array. expo-notifications plugin may handle
   this automatically -- check and add only if not already present.

5. PRIVACY POLICY PLACEHOLDER
   Patwadi needs a live privacy policy URL for Play Store submission
   and the in-app delete account flow. Create a minimal
   privacy-policy.html file that can be hosted on GitHub Pages
   (alongside the existing patwadi.com site) covering:
   - What data is collected (location for operators, photos for
     handoffs, name/email/phone for accounts, payment metadata)
   - How it's used (custody verification, dispute resolution)
   - Third parties (Supabase, Mapbox, Razorpay)
   - How to delete your account (in-app Settings → Delete account)
   - Contact email for privacy requests
   Do not fabricate legal language -- use plain English. A real
   lawyer should review before Play Store submission, but a
   placeholder is needed now to unblock the listing.
   Also: add the URL to app.config.js (android.privacyPolicyUrl).

OUTPUT: package name change confirmed (show the diff), icon/splash
generation confirmed (show file sizes), eas.json production profile
shown, POST_NOTIFICATIONS confirmed, privacy-policy.html location
and URL reported.
```

PAUSE. After Session 19, run:
  eas build --platform android --profile preview
(new build required after package name change -- old APK is invalid)

---

## Session 20 — Critical security fixes (small, targeted)

**Model: default** (all well-specified, no ambiguity).

**/goal**: client INSERT on orders is blocked, profile self-escalation is
blocked, handoff code consumption is atomic, skip-dev-payment is hidden
in production, delete account blocks on active parcels, or stop after
20 turns.

```
Security fixes only. No new features. Read the relevant file before
touching it. Reference PATWADI_LAUNCH_ARCHITECTURE.md for context on
the custody model.

1. ORDERS RLS — BLOCK CLIENT INSERT (HIGH)
   supabase/schema/profiles.sql ~L136-138: customers can INSERT orders
   directly with arbitrary payment_status. This bypasses the entire
   payment flow.
   Fix: revoke the customer INSERT policy on orders entirely. Orders
   should only be created by verify-razorpay-payment (service role) or
   skip-dev-payment. No client-side INSERT on orders, ever.
   After fix: confirm testcustomer@patwadi.com cannot insert an order
   directly via supabase-js (expect 403/RLS violation).

2. PROFILE SELF-ESCALATION — COLUMN GUARD (HIGH)
   profiles UPDATE policy has no column guard. Any authenticated user
   can UPDATE their own role, approval_status, operator_status.
   Fix: either:
   a. Replace the open UPDATE policy with a restrictive WITH CHECK that
      only permits changes to allowed columns (full_name, phone, avatar,
      etc.) and blocks role/approval_status/operator_status/is_available
   b. OR add a Postgres trigger BEFORE UPDATE that raises an exception
      if NEW.role != OLD.role or NEW.approval_status != OLD.approval_status
      or NEW.operator_status != OLD.operator_status
   After fix: confirm testcustomer@patwadi.com cannot update their own
   role to 'linehaul' via supabase-js.

3. HANDOFF CODE RACE — ATOMIC TRANSACTION (HIGH)
   acknowledge-handoff/index.ts: mark code used + insert custody_event
   are separate operations. Concurrent requests can duplicate custody
   events.
   Fix: wrap both operations in a single Postgres RPC (stored function)
   using SELECT FOR UPDATE on the handoff code row, then insert the
   custody event, then mark used — all in one transaction. Replace the
   two separate Supabase calls in the edge function with a single RPC
   call.
   Deploy updated function.

4. SKIP-DEV-PAYMENT IN PRODUCTION (MEDIUM)
   ConfirmOrderScreen.tsx shows a dev payment skip button. The env flag
   ALLOW_DEV_PAYMENT_SKIP gates the edge function but the UI button is
   visible regardless.
   Fix: wrap the dev skip button in __DEV__ check so it never renders
   in production builds. Also add a CI note: if ALLOW_DEV_PAYMENT_SKIP
   is set to true in Supabase production secrets, fail loudly.

5. DELETE ACCOUNT WITH ACTIVE PARCELS (MEDIUM)
   delete-account/index.ts deletes the user even if they have active
   in-transit parcels. ON DELETE SET NULL on orders.customer_id weakens
   the evidence chain for open disputes.
   Fix: in delete-account, before deletion, check for any orders where
   customer_id = auth.uid() AND payment_status = 'confirmed' AND no
   lmp_to_customer custody event exists yet. If found, return 409 with
   message: "You have active parcels. Please contact support before
   deleting your account." Do not delete.
   Update the in-app delete flow to surface this message gracefully.

OUTPUT per fix: what was changed, file + line, and a one-line
verification confirming the attack vector is now blocked.
```

PAUSE.

---

## Session 21 — Payment integrity + Razorpay webhook

**Model: default**.

**/goal**: create-razorpay-order validates amount server-side against
a corridor pricing source, verify-razorpay-payment compares paid amount
to expected amount, and a razorpay-webhook edge function exists that
freezes parcels on chargeback/dispute events, or stop after 25 turns.

```
Read verify-razorpay-payment/index.ts and create-razorpay-order/index.ts
in full before writing anything.

1. SERVER-SIDE AMOUNT VALIDATION (HIGH)
   create-razorpay-order/index.ts accepts client-supplied amountInPaise
   with no server-side check. A client can submit ₹1 for a ₹500 parcel.

   Fix: create-razorpay-order should:
   a. Read the payment_session row (it writes this) and use its
      amount_in_paise -- not the client-supplied value.
   b. If no payment_session exists for this corridor/weight/dims
      combination yet, compute the price server-side from corridor_key +
      weight_kg (use a simple flat-rate lookup per corridor for now --
      a pricing table can come later; hardcode reasonable defaults if no
      table exists).
   c. Reject if client amountInPaise differs from server-computed amount
      by more than 1 rupee (rounding tolerance).

   verify-razorpay-payment should:
   a. After HMAC check passes, fetch the Razorpay order via API
      (GET /v1/orders/{razorpay_order_id}) using RAZORPAY_KEY_SECRET.
   b. Confirm the Razorpay order's amount_paid matches
      payment_sessions.amount_in_paise.
   c. If it doesn't match, reject with 402 and do NOT create the order.

2. RAZORPAY WEBHOOK (HIGH)
   No webhook handler exists. Chargebacks and payment reversals go
   undetected -- parcel stays confirmed.

   Create supabase/functions/razorpay-webhook/index.ts:
   a. Verify X-Razorpay-Signature header using HMAC-SHA256 over raw
      request body with RAZORPAY_KEY_SECRET (raw body, not parsed JSON
      -- this is the webhook pattern, different from checkout verify).
   b. Handle these events:
      - payment.failed: set payment_sessions.status = failed
      - payment.captured: confirm capture (informational log)
      - refund.processed: add dispute_status = refunded to order
      - payment.dispute.created: set orders.dispute_status = disputed,
        orders.blocked_exception = true (triggers customer-facing
        "Delivery exception" label, routes to admin recovery queue)
      - payment.dispute.won: clear dispute_status, restore blocked state
      - payment.dispute.lost: mark order as dispute_lost (admin handles)
   c. Add dispute_status column to orders table:
      dispute_status text DEFAULT NULL
        CHECK (dispute_status IN (
          'disputed', 'refunded', 'dispute_lost', 'dispute_won'
        ))
   d. Deploy webhook function. Note in OUTPUT: the webhook URL to
      register in Razorpay dashboard
      (https://wvxyaqqlqwbbpkgvrali.supabase.co/functions/v1/razorpay-webhook)
      and that RAZORPAY_KEY_SECRET must be set as a Supabase secret
      (already done).

3. RATE LIMIT ON VERIFY-RAZORPAY-PAYMENT (MEDIUM)
   Currently no rate limit. Add rate limiting using existing rate_limit_log
   pattern: max 10 verify attempts per user per hour. Prevents HMAC
   brute force.

OUTPUT: amount validation confirmed (test: submit wrong amount, expect
rejection), webhook function deployed with URL, dispute_status column
added, rate limit added.
```

PAUSE.

---

## Session 22 — Handoff chain hardening + LMP assignment

**Model: Fable 5** (the LMP assignment gap requires judgment on the
right lightweight ops mechanism -- this is ambiguous enough to warrant it).

**/goal**: acknowledge-handoff enforces custody step ordering, photo
path is validated, location is captured at handoff, acknowledge-handoff
has rate limiting, AND lmp_pickup_id/lmp_delivery_id can be set via a
real mechanism so the 4-hop custody chain can actually execute,
or stop after 30 turns.

```
Read acknowledge-handoff/index.ts, issue-handoff-code/index.ts, and
mvp_custody.sql in full before writing anything.

1. CUSTODY STEP ORDERING (HIGH)
   acknowledge-handoff inserts a custody event without checking that the
   prior step exists. An operator can skip the linehaul leg entirely.

   Fix: in acknowledge-handoff, before inserting the custody event,
   query custody_events for this parcel and verify the required
   predecessor step exists. The required order is:
   customer_to_lmp → lmp_to_linehaul → linehaul_to_lmp → lmp_to_customer
   If the prior step is missing, return 409: "Prior handoff step not yet
   completed."

2. PHOTO PATH VALIDATION (MEDIUM)
   Server accepts any photoPath string without checking the object
   exists or that the path follows the expected format.

   Fix in acknowledge-handoff:
   a. Validate photoPath format: must match
      {parcelId}/{step}/{anything} regex.
   b. Call Supabase storage API to confirm the object exists in the
      custody-proofs bucket before inserting the custody event.
   c. Tighten storage INSERT policy: require path to start with
      {auth.uid()} OR {parcelId} that belongs to the uploader's
      assignment. Current policy is bucket-wide.

3. LOCATION AT HANDOFF (MEDIUM)
   No location captured in custody_events or acknowledge-handoff.
   If a ghost pickup is disputed, there is no location evidence.

   Fix:
   a. Add lat, lng, location_accuracy_m columns to custody_events
      (nullable -- not all handoffs will have location).
   b. Client already requests location permission (and Phase 4's
      captureCurrentLocation() exists). Pass lat/lng from the device
      to acknowledge-handoff in the request body.
   c. acknowledge-handoff stores these in the custody_event row.
   No UI change needed -- this is invisible to users.

4. RATE LIMIT ON ACKNOWLEDGE-HANDOFF (MEDIUM)
   issue-handoff-code has a rate limit; acknowledge-handoff does not.
   Add rate limiting using existing rate_limit_log: max 10 acknowledge
   attempts per (user_id, parcel_id) per hour.

5. LMP ASSIGNMENT (HIGH — LAUNCH BLOCKER)
   lmp_pickup_id and lmp_delivery_id are never set by application code.
   issue-handoff-code fails if these are null (L103-105). The 4-hop
   custody chain cannot execute.

   This needs the lightest-touch mechanism that works at launch without
   building a full assignment UI. Options (evaluate and pick one):
   a. Admin RPC: create assign_lmp_to_order(order_id, lmp_pickup_id,
      lmp_delivery_id) callable by admin only. Wire to a simple form
      in the Admin Parcels detail screen.
   b. Corridor-based auto-assignment: when an order is created for a
      corridor, automatically assign any available approved LMP for that
      corridor's origin city as lmp_pickup_id, and destination city as
      lmp_delivery_id. Simpler operationally, less admin work, but
      requires operator_corridors to have city-level granularity.
   c. LMP self-assignment: available LMPs in a corridor pool can claim
      a parcel (similar to how linehaul_trips attach parcels). Adds a
      "Available jobs" list for LMPs.

   State which you chose and why -- this is the judgment call this
   session is for. Then implement it.

   After implementation: run the full 4-hop custody chain for order
   add323df (or a new test order) end to end:
   - Assign lmp_pickup_id + lmp_delivery_id
   - customer_to_lmp handoff (issue code + acknowledge)
   - lmp_to_linehaul handoff
   - linehaul_to_lmp handoff
   - lmp_to_customer handoff (POD)
   Confirm all 4 custody_events created, deriveParcelState = delivered.

OUTPUT: step ordering enforcement confirmed (test: skip a step, expect
409), photo validation confirmed, lat/lng in custody_events confirmed,
rate limit added, LMP assignment mechanism chosen + implemented + full
4-hop chain verified.
```

PAUSE. After Session 22, Patwadi can run a real parcel through the
full custody chain with genuine fraud resistance at every step. That
is the gate for the first real corridor.

---

## Session 23 — Pre-build checklist (non-code verification)

**Model: default** (checklist only — no implementation).

**/goal**: every non-code prerequisite for the EAS build is confirmed
live, or specific blockers reported so they can be resolved before
building, or stop after 10 turns.

```
Do NOT write any code or make any changes. Read and verify only.
This session gates the EAS build — nothing gets built until this
passes.

1. PRIVACY POLICY LIVE
   Fetch https://patwadi.com/privacy-policy.html via HTTP.
   Confirm it returns 200 and contains the privacy policy content
   (not a 404 or redirect to the homepage).
   If not live: report exactly what needs to be pushed to GitHub Pages
   and what the URL in app.config.js currently says.

2. ALL EDGE FUNCTIONS DEPLOYED
   Run: supabase functions list
   Confirm all of these are present and show a recent updated_at:
   - acknowledge-handoff (Session 20 atomic RPC version)
   - delete-account (Session 20 active-parcel check version)
   - verify-razorpay-payment (Session 21 amount validation version)
   - create-razorpay-order (Session 21 server-side amount version)
   - razorpay-webhook (Session 21 — new)
   - issue-handoff-code, add-co-conductor, request-trip-transfer,
     accept-trip-transfer, admin-trip-override, admin-recovery,
     admin-resolve-blocked, sync-location-samples, skip-dev-payment
   Flag any that are missing or show an old updated_at.

3. RAZORPAY WEBHOOK REGISTERED
   The webhook URL to register is:
   https://wvxyaqqlqwbbpkgvrali.supabase.co/functions/v1/razorpay-webhook
   This cannot be verified from code — report the URL and confirm
   whether the user has registered it in the Razorpay dashboard
   (Settings → Webhooks). If not yet registered, surface the exact
   steps and URL so the user can do it manually in 2 minutes.

4. SQL MIGRATIONS DEPLOYED
   Confirm these schema files have been applied to the live database
   (check by querying for their artifacts):
   - phase20_security_fixes.sql: confirm orders INSERT RLS is gone
     (SELECT policy_name FROM pg_policies WHERE tablename='orders'
     AND cmd='INSERT' AND roles::text LIKE '%authenticated%' should
     return 0 rows for customer insert policy)
   - dispute_status column on orders (Session 21):
     SELECT column_name FROM information_schema.columns
     WHERE table_name='orders' AND column_name='dispute_status'
   - lat, lng, location_accuracy_m on custody_events (Session 22,
     if run): same check

5. APP CONFIG SANITY
   Read app.config.js and confirm:
   - android.package = "com.patwadi.app"
   - ios.bundleIdentifier = "com.patwadi.app"
   - android.privacyPolicyUrl is set to the live URL from item 1
   - expo.name is "Patwadi" (not "patwadi" lowercase)
   - version and buildNumber are set

6. EAS.JSON SANITY
   Read eas.json and confirm:
   - "preview" profile exists with buildType: "apk"
   - "production" profile exists with buildType: "app-bundle"
   - No hardcoded package name conflicts

OUTPUT: PASS / FAIL / NEEDS MANUAL ACTION per item. If all 6 pass:
"Clear to build — run eas build --platform android --profile preview"
If any fail: list exactly what needs resolving and by whom (Cursor
vs manual action by user).
```

**Only after this session returns "Clear to build":**
```powershell
eas build --platform android --profile preview
```
