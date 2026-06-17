# Patwadi Launch Architecture (Source of Truth) — v6

This document supersedes v5. Adds Section 13: an Emergency Recovery workflow
for parcels whose custody-transferred trip falls through. No new TripStatus
value -- Section 3's state machine is unchanged. Recovery is parcel-level,
reuses the existing blocked_exception flag (so Section 9's customer label is
unchanged), and folds into Phase 2 alongside Section 7, which it directly
extends.

## 1. Product thesis

Patwadi sells certainty, not speed. The moat is corridor network + trust
infrastructure + operator network — not owned assets.

Layered truth model (unchanged):
- **Custody events** = legal/operational truth. Immutable once recorded.
- **Linehaul trips** = operational context for the linehaul leg. Not custody
  proof by itself.
- **WhatsApp** = coordination + evidence layer. Not the primary operating
  system.
- **Location** = contingency signal during assigned trip/load windows.

`Order.status` (legacy) and `SimplifiedParcelState` (derived, customer-facing)
unchanged from v1/v2 — out of scope here.

## 2. Domain model

### 2.1 Existing (unchanged)
- `Order` — `corridor_key`, payment fields, legacy `status` (do not use),
  `trip_id?` (added in v2)
- `CustodyEvent` — `from_role`/`to_role`, `proof_type`, `proof_value`,
  `parcel_id`, `trip_id?` (added in v2)
- `UserRole` = `customer | lmp | linehaul`
- Admin is NOT part of UserRole -- it's `admin_profiles WHERE user_id =
  auth.uid() AND active = true`, a separate table. An admin account may have
  no `profiles.role` at all. LoginScreen checks isAdmin first (-> Admin),
  then role (-> Main), then no role (-> RoleSelect) -- one login screen, no
  separate admin entry point.
- `SimplifiedParcelState`, `HandoffStep`, `SUPPORTED_CORRIDORS` — unchanged

### 2.2 corridors.ts — addition

Each corridor needs origin/destination coordinates to support transfer
geography checks (Section 6). Corridor data now lives in the `corridors`
Supabase table (§18) -- not a static TypeScript object. `corridors.ts`
exports `CorridorEndpoint`, `CorridorDefinition`, `fetchCorridors()`, and
`fetchCorridorByKey()`. Corridor keys are plain `string` values built via
`buildCorridorKey()` (e.g. "delhi_chandigarh") -- no separate CorridorKey
type.

### 2.3 linehaul_trips

```typescript
export type TripStatus = "draft" | "open" | "closed" | "completed" | "cancelled";

export interface LinehaulTrip {
  id: string;
  corridor_id: string;          // FK -> CorridorDefinition.key
  route_label: string;
  bus_number: string;
  driver_name: string;
  driver_phone: string;
  scheduled_departure_at: string;   // ISO timestamp
  expected_arrival_at: string;
  capacity_count?: number;
  capacity_weight?: number;
  bus_proof_photo_path: string;     // mandatory before draft -> open
  status: TripStatus;
  accepts_new_parcels: boolean;
  details_locked: boolean;
  created_by_conductor_id: string;
  created_at: string;
  updated_at?: string;
  closed_to_new_parcels_at?: string; // set when accepts_new_parcels -> false
  details_locked_at?: string;        // set when details_locked -> true
  is_extra_trip: boolean;
  extra_trip_approved_by?: string;
}
```

### 2.4 linehaul_trip_conductors

```typescript
export type ConductorRole = "primary" | "co_conductor";

export interface LinehaulTripConductor {
  id: string;
  trip_id: string;
  conductor_id: string;
  role: ConductorRole;
  added_by: string;          // actor who added this row
  added_at: string;
  active_from?: string;
  active_until?: string;
  reason?: string;
  location_at_add_lat?: number;  // raw capture, no scoring (co-conductor)
  location_at_add_lng?: number;
}
```

No risk_flag / admin_review_required here — co-conductor addition is
operational flexibility, not a risk surface, per this revision. If that
changes later it's a one-column migration.

### 2.5 linehaul_trip_transfer_requests

```typescript
export type TransferStatus = "rejected" | "auto_accepted" | "auto_accepted_with_flag";

export interface LinehaulTripTransferRequest {
  id: string;
  trip_id: string;
  from_conductor_id: string;
  to_conductor_id: string;
  requested_at: string;
  reason?: string;
  from_location_lat?: number;
  from_location_lng?: number;
  to_location_lat?: number;
  to_location_lng?: number;
  risk_reasons: string[];        // empty array if none fired
  admin_review_required: boolean;
  status: TransferStatus;
  not_physically_traveling?: boolean | null; // null = unknown until Phase 4
}
```

### 2.6 trip_audit_logs

```typescript
export interface TripAuditLog {
  id: string;
  trip_id: string;
  actor_id: string;
  action: string;          // e.g. "field_edit", "co_conductor_added",
                            // "parcel_reassigned", "exception_created"
  before_value?: unknown;
  after_value?: unknown;
  created_at: string;
  near_departure: boolean; // true if action occurred within 60min of
                            // scheduled_departure_at -- internal flag only
}
```

## 3. State machine

```
draft -> open -> closed -> completed
              \-> cancelled (from draft, open, or closed)
```

- draft: no bus_proof_photo_path. Not visible to parcel-attachment pool.
  accepts_new_parcels = false, details_locked = false.
- open: photo present, trip live. On entry: accepts_new_parcels = true,
  details_locked = false. Two independent timers then fire:
  - At scheduled_departure_at - 60min: accepts_new_parcels -> false,
    set closed_to_new_parcels_at.
  - At scheduled_departure_at - 10min: details_locked -> true, set
    details_locked_at. After this, all field edits require admin override
    and are written to trip_audit_logs with near_departure = true.
  - Status remains open through both transitions.
- closed: operator marks "departed" (or auto at scheduled_departure_at if
  not marked). By construction accepts_new_parcels = false and
  details_locked = true already. Trip is en route.
- completed: arrival confirmed (operator action or admin), or all attached
  parcels have their next custody event recorded.
- cancelled: see Section 7. Allowed from draft/open/closed.

## 4. Conductor trip limits

Unchanged from v2: one trip per conductor per calendar day
(scheduled_departure_at date, conductor's local timezone), across all
corridors. A second same-day trip sets is_extra_trip = true, starts in
draft, cannot reach open until extra_trip_approved_by is set.

## 5. Co-conductor (simple)

- A trip has exactly one primary conductor (the creator/acceptor).
- "Add co-conductor" becomes available once details_locked = true
  (T-10min) -- matches the locked rule that this exists for last-minute
  reassignments.
- Target must be an approved, available conductor (same check as transfer
  Section 6's hard block).
- Insert a row in linehaul_trip_conductors with role = co_conductor,
  capture location_at_add_lat/lng (one-shot, on-demand -- see Section 8) as
  plain data, no flag/score.
- Write to trip_audit_logs, action = "co_conductor_added".
- Co-conductors may perform custody actions for this trip's parcels once the
  row exists (active_from reached, if set).

## 6. Transfer conductor (risk-flagged, Phase 2)

Transfer = replacing the conductor who owns the trip. Materially different
from co-conductor: ownership moves, not just adds.

### 6.1 Hard block (only one)

- to_conductor_id is not approved, or not currently available ->
  status = "rejected", no admin review needed, requesting conductor sees
  "cannot transfer to this operator." This is the one case the locked rules
  designate as auto-blocked.

### 6.2 Deterministic flags (computed at request time, all others)

On every transfer request that passes 6.1, capture from_location_lat/lng and
to_location_lat/lng via on-demand location read (Section 8), then evaluate:

| # | Flag | Computable now? | Rule (default threshold, admin-tunable) |
|---|------|------------------|------------------------------------------|
| 1 | Original near origin, transfer target isn't | yes | dist(from_loc, corridor.origin) < 15km AND dist(to_loc, corridor.origin) >= 15km |
| 2 | Transfer target not near corridor at all | yes | dist(to_loc, corridor.origin) >= 15km |
| 3 | Transfer close to departure | yes | now >= scheduled_departure_at - 2h |
| 4 | Original conductor accepted but not physically traveling | no -- Phase 4 | requires location history; not_physically_traveling = null until Phase 4 ships, never false by default |
| 5 | Repeated transfers by same conductor | yes | count(transfer_requests WHERE from_conductor_id = X, requested_at > now() - 30d) > 2 |
| 6 | Transfer target has weak/missing location signal | yes | on-demand location read for to_conductor_id failed, denied, or is null |

risk_reasons = array of flag names that fired (1,2,3,5,6 -- flag 4 never
contributes while null). admin_review_required = risk_reasons.length > 0.

### 6.3 Behavior

- If 6.1 doesn't block: transfer proceeds immediately --
  linehaul_trip_conductors.role for from_conductor_id is superseded by
  to_conductor_id as primary, operationally instant.
- status = "auto_accepted" if risk_reasons empty, else
  "auto_accepted_with_flag".
- Flagged transfers surface to admin asynchronously -- they do not block the
  handoff. "Allow, log, flag, review" exactly as specified.
- All thresholds in 6.2 live in one config object so they can be
  recalibrated after real transfer data exists, without schema changes.
- Transfers are permitted at any trip status, including closed (en route).
  Flag 3 (close to departure) will reliably fire in this case -- by design,
  not a bug: an unreachable primary conductor mid-route is the scenario
  transfer exists to handle. Never blocked on this basis.

## 7. Admin override: reassign vs. exception

"Override everything, in the moment" is implemented as two primitives,
applicable at trip level (cascades over all attached parcels) or single-
parcel level:

- Reassign -- for a parcel whose lmp_to_linehaul custody event for this trip
  has not yet been recorded. Instantly clears Order.trip_id, parcel returns
  to the corridor's unattached pool. Nothing in custody_events is touched.
  Logged to trip_audit_logs.
- Exception -- for a parcel whose lmp_to_linehaul custody event for this
  trip has been recorded. The existing custody event is never modified or
  deleted (legal/audit record stays intact). Admin opens an Emergency
  Recovery workflow for the parcel (Section 13); onward routing is handled
  there. Logged to trip_audit_logs.

"Cancel entire trip" = apply reassign-or-exception (per parcel's custody
state) to every attached parcel, then status -> cancelled.
"Rescind one parcel" = the same logic scoped to a single parcel, trip status
unaffected.

## 8. On-demand location capture (Phase 2 -- distinct from Phase 4)

A single client function, captureCurrentLocation(): one-shot foreground GPS
read behind a button press. Used at:
- transfer request (both from_ and to_conductor_id, Section 6.2)
- co-conductor addition (location_at_add_*, Section 5)

This is a one-time foreground location read tied to a user action -- does
not trigger Play Store's ACCESS_BACKGROUND_LOCATION review path. It is the
precursor to, but not the same as, Phase 4's continuous trip-window
tracking.

## 9. Customer-facing status (Tier 1) and detailed reports

Tier 1 -- Customer (consumer + B2B, same view by default): a 5-stage
simplified tracker, derived from SimplifiedParcelState, nothing else.

| SimplifiedParcelState | Customer label |
|---|---|
| created | Booked |
| pickup_confirmed | Picked up |
| in_transit | In transit |
| out_for_delivery | Out for delivery |
| delivered | Delivered |
| blocked_exception | Delivery exception -- our team is resolving it |

- Dates only (e.g. "Picked up -- 12 Jun"), never operational timestamps.
- A single "Last updated -- [date]" line next to the current stage, so a
  multi-day "in transit" doesn't read as stale -- this updates whenever any
  custody event lands, without exposing what that event was.
- No per-step photos, no operator names/phones/bus numbers/trip_id/conductor
  details, no custody-event timeline. None of this is shown to B2B by
  default either.
- At "Delivered," show the final delivery proof photo (POD) by default --
  the one customer-facing photo, framed as proof-of-delivery rather than
  custody evidence.
- Internal custody photos (every handoff) remain Tier 3 (admin) only.

Detailed chain-of-custody report -- generated on request, not shown in-app:
admin (Tier 3) compiles the full custody-event timeline, including internal
photos, with operator identities redacted to the same generic role labels
used internally ("Pickup partner", "Linehaul partner") even in this report,
unless a dispute/insurance/legal context specifically requires real
identities. The request itself is the same support deep-link mechanism as
Section 10, with "Request detailed shipment report" as one of the issue-type
presets -- no separate request flow to build.

Tier 2 -- Operator: own trip/assignment in full. Counterpart's contact
revealed only for the active handoff, expires once that custody event is
recorded.

Tier 3 -- Admin: everything -- trips, conductors, transfers (with risk
flags), co-conductors, audit logs, override controls, and the source data
for on-request reports.

## 10. Support: context-aware WhatsApp deep link (no chat infrastructure)

Not in-app chat. One shared mechanism, buildSupportDeepLink(context,
issueType, message), used from both operator and customer screens.

- Operator (trip/parcel screens, visible from the moment the first parcel
  attaches to the trip until 10 minutes after status -> completed):
  pre-fills trip_id, parcel_id (if applicable), corridor, current step/state,
  operator_id, the selected issue type, and a short editable message.
- Customer (TrackingDetailsScreen): pre-fills order_id, corridor, the current
  Tier-1 stage label from Section 9 (not the raw enum), and a selected issue
  type -- including "Request detailed shipment report" as one preset.

In both cases: a small in-app sheet shows a few context-relevant issue-type
chips plus a free-text field, then opens
https://wa.me/<support_number>?text=<urlencoded context + message> to
Patwadi's support WhatsApp. WhatsApp requires the user to tap send -- this is
pre-fill, not auto-send, which is the platform's actual ceiling either way.

No new infrastructure: same support WhatsApp number already used for
trip-related automation, same deep-link pattern, two small issue-type-preset
lists (operator vs customer).

## 11. Implementation phases

Phase 1 -- Foundation (in progress)
- Build fix, custody-event wiring -- done, pending emulator verification
- Settings (logout, account deletion), operator-onboarding writes, admin
  approval screen

Phase 2 -- LinehaulTrip + transfer risk flagging (this revision's scope)
- linehaul_trips, linehaul_trip_conductors,
  linehaul_trip_transfer_requests, trip_audit_logs (Sections 2.3-2.6)
- Corridor origin/destination coordinates (Section 2.2)
- State machine with accepts_new_parcels / details_locked (Section 3)
- Trip limits + extra-trip approval (Section 4)
- Co-conductor, simple (Section 5)
- Transfer with deterministic risk flags (Section 6) -- flag 4 schema-ready,
  computed null until Phase 4
- Admin reassign/exception override (Section 7) and Emergency Recovery
  workflow (Section 13)
- On-demand location capture (Section 8)
- Tier 1/2/3 visibility (Section 9)
- Operator support chat via WhatsApp (Section 10)

Phase 3 -- Customer status + support deep link
- Section 9's 5-stage label/date mapping over the existing
  SimplifiedParcelState (already derived in Phase 1) -- a presentation
  layer, not a new timeline UI
- POD photo display at "Delivered"
- Section 10's deep-link mechanism, both operator and customer surfaces
- Replaces TrackingDetailsScreen's map placeholder with this simplified card

Phase 4 -- Trip-window continuous location
- Foreground service, trip open->closed->completed / active-assignment
  windows, offline queue + sync
- Activates flag 4 (Section 6.2) -- not_physically_traveling becomes
  computable
- Corridor expected_duration_hours overdue flagging

Phase 5 -- Play Store submission
- Org developer account if possible; otherwise start closed testing now
- Privacy policy / Data Safety / account deletion, written from actual
  permission usage after Phase 4

Phase 6 -- Future enrichment (not launch-blocking)
- AIS-140, operator compliance scores -> corridor-level B2B trust signals,
  insurance, broader fraud heuristics
- Trip confidence rollup (admin dashboard only): healthy / flagged /
  high_risk / exception per trip, derived the same way SimplifiedParcelState
  is derived for parcels -- a deriveTripConfidence() over data already
  captured in Phase 2 (transfer_requests.admin_review_required, risk_reasons,
  any exception records from Section 7). No new data capture; just a
  derive function + a triage view once trip volume makes scrolling
  individual logs impractical.

## 12. Risks and edge cases

- Co-conductor becomes primary via transfer: if a co-conductor is later the
  to_conductor_id of a transfer, they were already "approved/available" by
  definition (added under Section 5's check) -- flag 6 (weak location
  signal) should rarely fire for them if Section 8 ran at co-conductor add
  time too. Worth reusing that captured location as a fallback if a fresh
  on-demand read fails at transfer time.
- Multiple flagged transfers on one trip: admin_review_required is per-
  transfer-request. If a trip accumulates several flagged transfers, admin
  sees each individually -- consider whether the admin trip view should
  surface a trip-level "N flagged transfers" rollup so a pattern within one
  trip isn't only visible by reading each request separately.
- Repeated recovery cycles: Section 13's Order.recovery_of_trip_id /
  recovered_by_trip_id fields reflect only the most recent recovery cycle
  for a parcel. If a recovered parcel's new trip also falls through,
  parcel_recoveries already supports multiple rows per parcel_id -- the
  Order-level fields just won't show the full history. Fine for Phase 2;
  worth a note if recovery cycles turn out to be common enough that the
  Order-level shortcut becomes misleading.
- details_locked true but status still open: between T-10min and actual
  departure, a trip is fully locked but not yet closed. Transfers and
  co-conductor additions are explicitly allowed in this window (that's the
  point) -- but parcel attachment is already blocked since
  accepts_new_parcels flipped at T-60min. Confirm the UI for conductors makes
  this distinction clear (can't add parcels, can still swap people).

## 13. Emergency Recovery workflow (parcel-level, not a trip status)

No new TripStatus value -- Section 3 is unchanged. Recovery is an
operational process tracked per parcel, orthogonal to trip status. A trip
whose primary conductor disappeared mid-route and is never resolved via
transfer simply remains in its current status (typically closed); Phase 6's
trip_confidence rollup may surface it as high_risk/exception for admin
attention, but the trip record itself needs no new terminal state --
resolution happens at the parcel level, below.

### 13.1 Trigger

Recovery opens when Section 7's "exception" override is applied: a parcel
whose lmp_to_linehaul (or later) custody event is already recorded against a
trip that then gets cancelled or can't continue. The existing custody event
is never modified (Section 7 unchanged) -- recovery is the structured
process for what happens next.

### 13.2 New table: parcel_recoveries

```typescript
export type RecoveryStatus = "open" | "in_progress" | "resolved" | "unrecoverable";

export interface ParcelRecovery {
  id: string;
  parcel_id: string;             // Order.id
  recovery_of_trip_id: string;   // trip the parcel was on when recovery opened
  recovered_by_trip_id?: string; // set once reassigned to a trip that
                                  // completes the journey
  status: RecoveryStatus;
  opened_at: string;
  opened_by: string;             // admin user id
  reason: string;
  escalation_level: number;
  last_escalated_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}
```

### 13.3 Order linkage

```typescript
export interface Order {
  // ...existing fields unchanged...
  recovery_of_trip_id?: string;
  recovered_by_trip_id?: string;
}
```

These mirror the active parcel_recoveries row for fast filtering ("show all
orders currently in recovery"); the full record, including history if a
parcel goes through recovery more than once, lives in parcel_recoveries
(see Section 12's note on repeated cycles).

### 13.4 Customer-facing: unchanged

While a recovery is open or in_progress, Order.blocked_exception = true (the
existing flag). deriveParcelState's existing first check
(`if (blockedException) return "blocked_exception"`) already returns
blocked_exception with zero changes to the function, and Section 9's label
("Delivery exception -- our team is resolving it") is shown exactly as for
any other blocked_exception cause (e.g. handoff-code failure). Customers
cannot distinguish "code failed three times" from "the trip fell through" --
nor should they.

### 13.5 Admin: workflow, escalation, reassignment

- Open/in_progress recoveries form their own admin queue -- separate from
  Phase 6's trip_confidence rollup, though a trip in exception/high_risk
  state is often the source of a recovery.
- escalation_level / last_escalated_at: a simple counter, incremented by a
  time-based check (now - opened_at > threshold, status still
  open/in_progress). Shares the same scheduled-job infrastructure Phase 4
  needs anyway for corridor overdue-flagging -- one cron, two checks.
- Reassignment: admin attaches the parcel to a new trip
  (recovered_by_trip_id). This does NOT bypass custody verification -- the
  new trip's first relevant custody event for this parcel still requires
  code + photo per the unchanged custody rules. Recovery gets the parcel
  back into the normal flow; it doesn't create a shortcut around it.
- On a new custody event being recorded against recovered_by_trip_id:
  status -> resolved, resolved_at/resolved_by set,
  Order.blocked_exception -> false (customer view returns to normal
  derivation from custody events).
- unrecoverable: terminal status for parcels that genuinely can't continue
  (lost/damaged). Triggers the existing refund/cancellation path on Order --
  this section defines the trigger point only, not new refund mechanics.

### 13.6 Audit / report stitching

For Section 9's on-request detailed report: if an order has both
recovery_of_trip_id and recovered_by_trip_id set, the report stitches two
custody-event segments (pre-recovery on recovery_of_trip_id, post-recovery
on recovered_by_trip_id) into one timeline, with the parcel_recoveries record
shown as the explanatory gap between them. Both segments use the same
generic-role-label redaction as any other report.

## 14. Operator visibility on orders (operator_order_view)

Session 2 found Tier 2 had no read path on `orders` for the new
lmp_pickup_id/linehaul_id/lmp_delivery_id assignment fields -- only the
legacy driver_id-based policy exists, so an assigned operator currently sees
0 rows. Resolved here rather than deferred: this blocks
DriverParcelsScreen/DriverParcelDetailsScreen entirely, and the decision is
bounded to one table.

A view, operator_order_view, selects from orders for an operator whose
profile id matches lmp_pickup_id, linehaul_id, or lmp_delivery_id on that
row.

Included: id, corridor_key, pickup_location, dropoff_location, weight_kg,
dimensions, contents, payment_status, blocked_exception, trip_id,
recovery_of_trip_id, recovered_by_trip_id, created_at -- everything an
operator needs to locate the parcel, know it's safe to act on, and have
recovery context if applicable.

Excluded: customer_id, price_estimate, razorpay_order_id,
razorpay_payment_id, status (legacy) -- account-level, financial, and
payment-processor fields operators don't need, consistent with status being
"do not use" everywhere.

DriverParcelsScreen and DriverParcelDetailsScreen query this view instead of
orders directly. Admin (Tier 3) continues to query orders directly.

## 15. Operator trip UI (Phase 2's missing screens, part 1)

Sessions 2-5 built the full data model, logic, and edge functions for
linehaul_trips, co-conductor, and transfer -- but no screen lets a
conductor use any of it. Three screens, each wiring existing
services/functions to UI -- no new business logic except where noted.

### 15.1 My Trips (new screen)
List of linehaul_trips where the current conductor is primary
(created_by_conductor_id) or co_conductor (via linehaul_trip_conductors).
Each row: route_label, corridor, scheduled_departure_at, status,
accepts_new_parcels/details_locked as small indicators. Tap -> Trip Detail.
Empty state: "Create your first trip" -> Create Trip.

### 15.2 Trip Detail (new screen)
Trip fields (bus_number, driver_name/phone, departure/arrival,
capacity_count/weight), status + lock-state indicators, attached parcels
(orders where trip_id = this trip), conductors list
(linehaul_trip_conductors, role labels).

Actions (primary conductor only):
- "Add co-conductor" (visible once details_locked) -> conductor picker
  (approved/available conductors) -> addCoConductor()
- "Request transfer" -> conductor picker -> requestTripTransfer(), show
  resulting status (auto_accepted / auto_accepted_with_flag / rejected)

### 15.3 Create Trip (new screen)
Form: corridor (from fetchCorridors({ activeOnly: true }) -- live DB, not
static list), bus_number, driver_name, driver_phone, scheduled_departure_at,
expected_arrival_at, capacity_count/weight, bus proof photo. On submit:
- previewTripCreation() to show is_extra_trip status before creating
- create the linehaul_trips row in draft (new createLinehaulTrip() service
  function if one doesn't exist -- insert + photo upload, no new policy
  decisions)
- once bus_proof_photo_path is set, "Publish" transitions draft -> open
  (blocked if is_extra_trip and extra_trip_approved_by is null -- show
  "pending admin approval")

## 16. Admin Phase 2 UI (Phase 2's missing screens, part 2)

Three additions to the existing AdminDashboard (new tabs/sections,
consistent with its current Login/Dashboard/Parcels/ParcelDetails
structure) -- not new top-level screens.

### 16.1 Recovery queue
fetchActiveRecoveries() -> list (parcel id, recovery_of_trip_id, reason,
status, escalation_level). Actions: "Reassign to trip" (picker of open
linehaul_trips) -> adminReassignRecovery(); "Mark unrecoverable" ->
admin-recovery's mark_unrecoverable.

### 16.2 Flagged transfers
linehaul_trip_transfer_requests where admin_review_required = true -> list
(from/to conductor, trip, risk_reasons, status). Read-only per v6 -- "ops
knows where to look," no action required by the UI itself.

### 16.3 Trips overview
All linehaul_trips -> list + detail. Per trip: attached parcels, "Cancel
trip" -> adminCancelTrip(); per-parcel "Rescind" -> adminRescindParcel().
Where is_extra_trip and extra_trip_approved_by is null: "Approve extra
trip" action.

## 17. Eligible conductor lookup (eligible_conductors_view)

Session 8 found ConductorPickerSheet (§15.2's "Add co-conductor"/"Request
transfer") has no way to list eligible conductors -- profiles RLS is
correctly own-row-only (verified in Session 2's phone-leak check), so a
client query for "other conductors" returns nothing. The current workaround
(recent co-conductor IDs + manual UUID entry) works for testing but isn't
usable by a real conductor.

A view, eligible_conductors_view, exposes only id and a display name (e.g.
full_name) for profiles where role IN ('lmp','linehaul') AND
is_conductor_approved_and_available(id) -- the same eligibility check §6.1's
hard block and §5's co-conductor check already use. No phone, email, or
other fields. ConductorPickerSheet queries this view for its searchable
list; addCoConductor()/requestTripTransfer() are unchanged, since they
already take a conductor id.

**As implemented (Session 8.5)**: list_eligible_linehaul_conductors(), a
SECURITY DEFINER RPC scoped to role = 'linehaul' only (excludes self),
callable only by approved linehaul operators -- narrower than the draft
above, and more correct: linehaul_trips are conducted by linehaul operators,
not LMPs, so the eligible pool for co-conductor/transfer is linehaul-only.

## 18. Corridors as database table (replaces static CORRIDOR_DEFINITIONS)

Session 10 migrates corridors from a hardcoded TypeScript object to a
Supabase table so admin can open new routes without a code change or
redeploy.

### 18.1 Table: corridors

```
id                  uuid, PK
key                 text, unique (e.g. "delhi_chandigarh") -- used as FK
                    in linehaul_trips.corridor_id
origin_city         text
origin_lat          float
origin_lng          float
destination_city    text
destination_lat     float
destination_lng     float
expected_duration_hours  float   -- cargo-vehicle estimate, not car time
active              boolean, default true  -- false = soft-delete, hides
                    from booking and trip creation but preserves history
created_at          timestamptz
```

### 18.2 RLS

- Anyone (including anon): SELECT where active = true -- customers need
  corridor list for booking, no auth required.
- Authenticated operators: SELECT where active = true -- trip creation
  corridor picker.
- Admin only: INSERT, UPDATE, DELETE (soft-delete via active = false,
  never hard-delete -- linehaul_trips.corridor_id references this table).

### 18.3 Code changes

- corridors.ts: keep CorridorEndpoint, CorridorDefinition types. Remove
  CORRIDOR_DEFINITIONS static object. Add fetchCorridors() ->
  CorridorDefinition[] querying the table. Add fetchCorridorByKey(key) for
  single lookups.
- supabase/functions/_shared/corridorOrigins.ts: replace static object with
  a Supabase query using the service role. Cache in module scope per
  invocation.
- linehaul_trips.corridor_id: already references corridor key as text.
- CreateTripScreen corridor picker: fetchCorridors({ activeOnly: true }).
- Admin dashboard: Corridors tab -- list, active toggle, add form. No hard
  delete -- deactivate only.

### 18.4 Seed data (live as of Session 10)

Note: implementation uses `key TEXT PRIMARY KEY` (no separate uuid id
column). `linehaul_trips.corridor_id` references key text -- no change
needed there.

| Key | Origin | Destination | Duration |
|---|---|---|---|
| delhi_chandigarh | Delhi (28.6139, 77.2090) | Chandigarh (30.7333, 76.7794) | 5h |
| delhi_manali | Delhi (28.6139, 77.2090) | Manali (32.2432, 77.1892) | **12h** |
| mandi_chandigarh | Mandi (31.7090, 76.9320) | Chandigarh (30.7333, 76.7794) | 4h |
| shimla_chandigarh | Shimla (31.1048, 77.1734) | Chandigarh (30.7333, 76.7794) | **4h** |
| shimla_delhi | Shimla (31.1048, 77.1734) | Delhi (28.6139, 77.2090) | **9h** |
| mumbai_pune | Mumbai (19.0760, 72.8777) | Pune (18.5204, 73.8567) | 3h |

All durations are editable via the admin Corridors tab without a code
change. These are one-directional -- add reverse rows for corridors
Patwadi runs in both directions.

## 19. Phase 4 — Trip-window location tracking

### 19.1 What this is and is not

Phase 4 adds continuous location tracking during active trip/assignment
windows. It is NOT real-time customer-facing location (that's Phase 6 at
earliest). It is an operational and fraud-detection layer:
- Activates transfer risk flag 4 (not_physically_traveling) from §6.2
- Provides location trail for dispute/insurance/legal reports
- Feeds corridor overdue flagging and recovery escalation timers

### 19.2 Tracking windows per role

Linehaul conductor:
- START: trip status transitions open (conductor publishes trip)
- STOP: lmp_to_linehaul OR linehaul_to_lmp custody event is acknowledged
  AND conductor's location at acknowledgment matches corridor destination
  coordinates within 15km (same threshold as transfer risk flag 1/2).
  If location doesn't match, tracking continues -- the trip isn't done
  operationally even if the status says so.
- If trip is cancelled: stop immediately.

LMP:
- START: order assigned to this LMP (lmp_pickup_id or lmp_delivery_id
  set to their profile id)
- STOP: their final custody handoff for this order is acknowledged
  (customer_to_lmp for pickup LMP, lmp_to_customer for delivery LMP).

### 19.3 Location sample table

```
id              uuid, PK
trip_id         uuid, FK -> linehaul_trips (null for LMP-only tracking)
order_id        uuid, FK -> orders (null for linehaul-only tracking)
conductor_id    uuid, FK -> profiles
role            text ('linehaul' | 'lmp')
lat             float
lng             float
accuracy_m      float       -- GPS accuracy in metres, stored for quality
recorded_at     timestamptz -- device time at capture
synced_at       timestamptz -- server time at upload
UNIQUE (trip_id, conductor_id, recorded_at)  -- per §4 answer: each
  conductor keeps their own trail, two conductors on same trip = two
  trails, both kept, merged for admin view
```

Offline: samples stored in device AsyncStorage queue when no
signal. Synced in batch on reconnect via a new edge function
`sync-location-samples` (bulk insert, upsert on unique key, idempotent).

### 19.4 Cron extension (reuses Session 3's job)

`apply_linehaul_trip_timer_transitions()` gains three new checks,
running on the same 1-minute schedule:

a. Overdue flagging: for each closed trip where
   `now() > closed_at + (corridor.expected_duration_hours * interval '1 hour') * 1.2`
   (20% buffer), set a new `is_overdue = true` flag on linehaul_trips
   and surface in admin's Trips tab. Not customer-facing.

b. Recovery escalation: for each parcel_recoveries row where
   status = 'open' or 'in_progress' and
   `now() > opened_at + (escalation_level + 1) * interval '2 hours'`,
   increment escalation_level and set last_escalated_at. Admin sees
   escalation_level in the Recovery tab already (§16.1).

c. Tracking window cleanup: for each location_samples row where
   the tracking window has ended (per §19.2 stop conditions), mark
   the window closed. No deletion -- samples are retained for audit.

### 19.5 Transfer risk flag 4

Once Phase 4 is live, `not_physically_traveling` in
linehaul_trip_transfer_requests can be computed:
- Query location_samples for from_conductor_id on this trip
- If no samples exist in the last 30 minutes before transfer request:
  not_physically_traveling = true
- If samples exist but show no movement (all within 500m of each other):
  not_physically_traveling = true
- Otherwise: not_physically_traveling = false (never null after Phase 4)

### 19.6 Play Store implications (Phase 5 dependency)

Phase 4 uses expo-location in foreground-service mode during active
windows. This requires:
- ACCESS_FINE_LOCATION (already in app.config.js from Session 4's
  captureCurrentLocation)
- FOREGROUND_SERVICE permission (new, must be declared)
- A persistent notification shown while tracking is active (Android
  requirement for foreground services)

Privacy policy and Data Safety form must be written AFTER Phase 4 is
implemented, from the actual permissions the app uses. This is the
hard dependency Phase 5 has on Phase 4.

## 20. Operator onboarding model (launch)

### 20.1 Locked decisions

- Operators onboard via the Patwadi website (KYC packet), not in-app.
- Admin creates auth user + profiles row manually (Supabase dashboard or
  script). Operator receives credentials and logs into the app.
- In-app operator self-signup is blocked: RoleSelect shows customer-only;
  createProfile rejects non-customer roles at RLS level.
- Pending/rejected operators can sign in but land on OperatorPendingScreen
  -- they cannot reach operational UI until approval_status = 'approved'
  AND operator_status = 'active'.
- Each operator has exactly one role: lmp OR linehaul (not both).
- DriverKycScreen, DriverBusDetailsScreen, DriverTermsScreen removed from
  nav -- KYC is website + admin, bus details captured at Create Trip.
- operator_corridors used for BOTH lmp and linehaul operators.

**Two separate status fields on profiles:**
```
approval_status: 'pending' | 'approved' | 'rejected'
  -- onboarding gate: has admin verified this operator?
operator_status: 'active' | 'suspended' | 'inactive'
  -- operational gate: is this operator currently operational?
```
is_conductor_approved_and_available() (Session 4) updated to check all
three: approval_status = 'approved' AND operator_status = 'active' AND
is_available = true.

**Emergency contact fallback for active trips (admin/dispute context):**
1. linehaul_trips.driver_phone (the bus driver on this specific trip)
2. operator_kyc_packets.emergency_contact_phone (conductor's nominated
   contact)
Surfaced in admin Trip Detail and dispute/insurance reports only.

### 20.2 New tables

**operator_kyc_packets**
```
user_id                   uuid PK, FK -> profiles(id)
aadhaar_storage_path      text
pan_storage_path          text (optional)
selfie_storage_path       text
payment_method_type       text  -- 'upi' | 'bank_transfer'
upi_id                    text  -- non-null if payment_method_type = 'upi'
bank_account_number       text  -- non-null if payment_method_type = 'bank_transfer'
bank_ifsc_code            text  -- non-null if payment_method_type = 'bank_transfer'
bank_account_name         text  -- non-null if payment_method_type = 'bank_transfer'
bank_account_type         text  -- 'savings'|'current', bank_transfer only
emergency_contact_name    text
emergency_contact_phone   text
submitted_at              timestamptz
verified_at               timestamptz
verified_by               uuid FK -> auth.users(id)
```
One payment method active at a time (enforced by CHECK constraint).
Payment method changes go through ops via the existing WhatsApp support
deep link -- admin updates the record. No in-app change request flow.
Admin-only INSERT/UPDATE. Operator SELECT own row only.

**operator_corridors**
```
operator_id   uuid FK -> profiles(id)
corridor_key  text FK -> corridors(key)
assigned_by   uuid FK -> auth.users(id)
assigned_at   timestamptz
PRIMARY KEY (operator_id, corridor_key)
```
RLS: operator SELECT own rows; admin full CRUD.
Drives Create Trip picker (linehaul) and is the source of truth for
which corridors an operator is approved to serve.

### 20.3 Post-auth routing (updated)

1. admin_profiles.active -> Admin Dashboard
2. role = lmp|linehaul AND approval_status = 'approved' AND
   operator_status = 'active' -> Operator Main
3. role = lmp|linehaul AND (approval_status != 'approved' OR
   operator_status != 'active') -> OperatorPendingScreen
4. role = customer -> Customer Main
5. No role -> RoleSelect (customer cards only)

### 20.4 Create Trip corridor picker

Replaces all-active-corridors horizontal chip scroll with:
- fetchApprovedCorridorsForOperator(user.id) -- joins operator_corridors
  -> corridors where active = true
- Empty state: "No corridors assigned. Contact Patwadi ops." Publish
  disabled.
- Preselect if exactly one corridor assigned.
- Search by "origin -> destination" string.
- Vertical FlatList (same interaction pattern as ConductorPickerSheet).
- Server guard: trip insert rejects corridor_id not in operator's
  approved set.

### 20.5 Customer-facing stub removals

Per stub audit (Session 15):
- Send Parcel: Depots, Routes & Coverage, Schedule Pickup buttons hidden
- Debug ingest calls (127.0.0.1:7453) removed from SendParcel,
  Pickup, Dropoff screens
- Corridor rejection copy updated to "We're not live on this corridor yet"
- PriceEstimate depot copy updated (no Depots feature implied)
- RoleSelect: operator cards hidden; footer copy updated

### 20.6 Admin operator UI (post-launch)

AdminOperatorsSection tab (§16 gains a 5th tab post-launch):
- Queue of pending operators (approval_status = 'pending')
- KYC document review (operator_kyc_packets)
- Approve/reject with reason
- Corridor assignment UI (operator_corridors)
For launch: all of the above done manually via Supabase Table Editor.
