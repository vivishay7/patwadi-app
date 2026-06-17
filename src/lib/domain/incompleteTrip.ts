import type { LinehaulTrip, LinehaulTripConductor } from "../db/types";

/** Trip declared full at creation but past arrival with no co-conductor on record. */
export function tripNeedsIncompleteCoConductorAction(
  trip: LinehaulTrip,
  conductors: LinehaulTripConductor[],
  nowMs = Date.now()
): boolean {
  if (trip.incomplete_trip_resolved_at) return false;
  if (trip.trip_coverage_type === "partial" || trip.planned_co_conductor_id) return false;
  if (trip.operator_declared_co_conductor_id) return false;

  const hasCoConductor = conductors.some(
    (c) => c.role === "co_conductor" && !c.active_until
  );
  if (hasCoConductor) return false;

  if (!["open", "closed"].includes(trip.status)) return false;

  const pastArrival = nowMs > new Date(trip.expected_arrival_at).getTime();
  if (!pastArrival && trip.admin_flag_reason !== "full_trip_past_arrival_no_co_conductor") {
    return false;
  }

  return (
    trip.admin_flag_reason === "full_trip_past_arrival_no_co_conductor" ||
    (pastArrival && (trip.trip_coverage_type ?? "full") === "full")
  );
}

export function incompleteTripActionMessage(trip: LinehaulTrip): string {
  return `Your trip to ${trip.route_label} passed its expected arrival time. Did another conductor take over partway, or did you run the full route solo?`;
}
