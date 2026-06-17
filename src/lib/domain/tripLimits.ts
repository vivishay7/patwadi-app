import type { LinehaulTrip } from "../db/types";

/** Default conductor local timezone until per-profile TZ is stored (v6 §4). */
export const DEFAULT_CONDUCTOR_TIMEZONE = "Asia/Kolkata";

/** Calendar date of scheduled_departure_at in the conductor's local timezone. */
export function conductorTripCalendarDate(
  scheduledDepartureAt: string | Date,
  timeZone = DEFAULT_CONDUCTOR_TIMEZONE
): string {
  const d = typeof scheduledDepartureAt === "string"
    ? new Date(scheduledDepartureAt)
    : scheduledDepartureAt;
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
}

/** v6 §4 — second+ trip on the same calendar day is an extra trip. */
export function shouldMarkExtraTrip(params: {
  existingTripsOnSameDay: number;
}): boolean {
  return params.existingTripsOnSameDay > 0;
}

/** v6 §4 — extra trips stay draft until admin sets extra_trip_approved_by. */
export function canTransitionTripToOpen(trip: Pick<
  LinehaulTrip,
  "is_extra_trip" | "extra_trip_approved_by" | "bus_proof_photo_path" | "status"
>): { ok: true } | { ok: false; reason: string } {
  if (trip.status !== "draft") {
    return { ok: false, reason: "Trip is not in draft status" };
  }
  if (!trip.bus_proof_photo_path?.trim()) {
    return { ok: false, reason: "Add a bus proof photo before publishing" };
  }
  if (trip.is_extra_trip && !trip.extra_trip_approved_by) {
    return { ok: false, reason: "Extra trip requires admin approval before open" };
  }
  return { ok: true };
}

/** Departure must be in the future; arrival must be strictly after departure. */
export function validateTripSchedule(params: {
  scheduledDepartureAt: string;
  expectedArrivalAt: string;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  const dep = new Date(params.scheduledDepartureAt);
  const arr = new Date(params.expectedArrivalAt);
  const now = params.now ?? new Date();
  if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) {
    return { ok: false, reason: "Invalid departure or arrival time." };
  }
  if (dep.getTime() < now.getTime()) {
    return { ok: false, reason: "Departure must be in the future." };
  }
  if (arr.getTime() <= dep.getTime()) {
    return { ok: false, reason: "Arrival must be after departure." };
  }
  return { ok: true };
}
