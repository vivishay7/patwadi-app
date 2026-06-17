import type { LinehaulTrip } from "../db/types";

/** Whether the UI should show the green "Accepting parcels" chip. */
export function tripShowsAcceptingParcels(trip: LinehaulTrip): boolean {
  return trip.status === "open" && trip.accepts_new_parcels;
}

export function tripShowsDetailsLocked(trip: LinehaulTrip): boolean {
  return trip.status === "open" && trip.details_locked;
}

export function tripShowsExtraPending(trip: LinehaulTrip): boolean {
  return (
    (trip.status === "draft" || trip.status === "open") &&
    trip.is_extra_trip &&
    !trip.extra_trip_approved_by
  );
}

export function tripStatusTone(status: LinehaulTrip["status"]): "active" | "muted" | "danger" {
  if (status === "open" || status === "draft") return "active";
  if (status === "cancelled") return "danger";
  return "muted";
}
