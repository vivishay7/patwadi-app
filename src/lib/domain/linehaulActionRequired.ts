import type { CustodyEvent, LinehaulTrip } from "../db/types";

const ARRIVAL_WINDOW_MS = 5 * 60 * 1000;

export function isTripNearArrival(trip: LinehaulTrip, nowMs = Date.now()): boolean {
  if (trip.status !== "closed") return false;
  const arrivalMs = new Date(trip.expected_arrival_at).getTime();
  return nowMs >= arrivalMs - ARRIVAL_WINDOW_MS;
}

/** Parcel on trip still needs a custody handoff before the linehaul leg can finish. */
export function parcelNeedsLinehaulHandoff(events: CustodyEvent[]): boolean {
  const has = (fromRole: string, toRole: string) =>
    events.some((e) => e.from_role === fromRole && e.to_role === toRole);

  const hasLmpToLinehaul = has("lmp", "linehaul");
  const hasLinehaulToLmp = has("linehaul", "lmp");

  if (hasLmpToLinehaul && !hasLinehaulToLmp) return true;
  if (!hasLmpToLinehaul) return true;
  return false;
}

export function computeLinehaulParcelsActionRequired(params: {
  trips: LinehaulTrip[];
  parcelIdsByTrip: Record<string, string[]>;
  eventsByParcel: Record<string, CustodyEvent[]>;
  nowMs?: number;
}): boolean {
  const { trips, parcelIdsByTrip, eventsByParcel, nowMs = Date.now() } = params;

  for (const trip of trips) {
    if (isTripNearArrival(trip, nowMs)) return true;
  }

  for (const trip of trips) {
    if (trip.status !== "completed") continue;
    const parcelIds = parcelIdsByTrip[trip.id] ?? [];
    for (const parcelId of parcelIds) {
      const events = eventsByParcel[parcelId] ?? [];
      if (parcelNeedsLinehaulHandoff(events)) return true;
    }
  }

  return false;
}
