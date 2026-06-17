import type { CustodyEvent, LinehaulTrip, LinehaulTripConductor } from "../db/types";
import { parcelNeedsLinehaulHandoff } from "./linehaulActionRequired";

/** Grace period after expected_arrival_at before locking on closed trips. */
export const LOCK_GRACE_AFTER_ARRIVAL_MS = 3 * 60 * 60 * 1000;

/** Show extension prompt when this much time remains until expected_arrival_at. */
export const ARRIVAL_EXTENSION_WINDOW_MS = 30 * 60 * 1000;

/** Minimum distance from corridor destination to offer a 30-minute extension. */
export const FAR_FROM_DESTINATION_KM = 50;

export function isConductorActiveOnTrip(
  conductorId: string,
  trip: LinehaulTrip,
  conductors: LinehaulTripConductor[]
): boolean {
  const activeMembership = conductors.find(
    (c) => c.conductor_id === conductorId && !c.active_until
  );
  if (activeMembership) return true;

  if (trip.created_by_conductor_id !== conductorId) return false;

  const activePrimary = conductors.find(
    (c) => c.role === "primary" && !c.active_until
  );
  if (!activePrimary) return true;
  return activePrimary.conductor_id === conductorId;
}

/** Transferred-away conductors see the trip as cancelled in the app. */
export function effectiveTripStatusForConductor(
  trip: LinehaulTrip,
  conductorId: string,
  conductors: LinehaulTripConductor[]
): LinehaulTrip["status"] {
  const wasEverOnTrip =
    trip.created_by_conductor_id === conductorId ||
    conductors.some((c) => c.conductor_id === conductorId);

  if (
    wasEverOnTrip &&
    !isConductorActiveOnTrip(conductorId, trip, conductors) &&
    trip.status !== "cancelled"
  ) {
    return "cancelled";
  }
  return trip.status;
}

export function isTripPastLockDeadline(trip: LinehaulTrip, nowMs = Date.now()): boolean {
  if (trip.status === "completed") return true;
  if (trip.status === "closed") {
    const deadline =
      new Date(trip.expected_arrival_at).getTime() + LOCK_GRACE_AFTER_ARRIVAL_MS;
    return nowMs >= deadline;
  }
  return false;
}

export function tripHasUnhandedParcels(
  parcelIds: string[],
  eventsByParcel: Record<string, CustodyEvent[]>
): boolean {
  return parcelIds.some((id) => {
    const events = eventsByParcel[id] ?? [];
    return parcelNeedsLinehaulHandoff(events);
  });
}

export function shouldLockConductorForTrip(params: {
  conductorId: string;
  trip: LinehaulTrip;
  conductors: LinehaulTripConductor[];
  parcelIds: string[];
  eventsByParcel: Record<string, CustodyEvent[]>;
  nowMs?: number;
}): boolean {
  const {
    conductorId,
    trip,
    conductors,
    parcelIds,
    eventsByParcel,
    nowMs = Date.now(),
  } = params;

  if (!isConductorActiveOnTrip(conductorId, trip, conductors)) return false;

  const effectiveStatus = effectiveTripStatusForConductor(trip, conductorId, conductors);
  if (effectiveStatus === "cancelled") return false;
  if (trip.status === "cancelled") return false;

  if (!isTripPastLockDeadline(trip, nowMs)) return false;
  if (!parcelIds.length) return false;

  return tripHasUnhandedParcels(parcelIds, eventsByParcel);
}

export type ConductorLockState = {
  locked: boolean;
  trip: LinehaulTrip | null;
  unhandedParcelCount: number;
};

export function evaluateConductorLock(params: {
  conductorId: string;
  trips: LinehaulTrip[];
  conductorsByTrip: Record<string, LinehaulTripConductor[]>;
  parcelIdsByTrip: Record<string, string[]>;
  eventsByParcel: Record<string, CustodyEvent[]>;
  nowMs?: number;
}): ConductorLockState {
  const {
    conductorId,
    trips,
    conductorsByTrip,
    parcelIdsByTrip,
    eventsByParcel,
    nowMs = Date.now(),
  } = params;

  for (const trip of trips) {
    const conductors = conductorsByTrip[trip.id] ?? [];
    const parcelIds = parcelIdsByTrip[trip.id] ?? [];

    if (
      !shouldLockConductorForTrip({
        conductorId,
        trip,
        conductors,
        parcelIds,
        eventsByParcel,
        nowMs,
      })
    ) {
      continue;
    }

    const unhandedParcelCount = parcelIds.filter((id) =>
      parcelNeedsLinehaulHandoff(eventsByParcel[id] ?? [])
    ).length;

    return { locked: true, trip, unhandedParcelCount };
  }

  return { locked: false, trip: null, unhandedParcelCount: 0 };
}

export function shouldPromptArrivalExtension(params: {
  trip: LinehaulTrip;
  conductorId: string;
  conductors: LinehaulTripConductor[];
  distanceToDestinationKm: number | null;
  nowMs?: number;
}): boolean {
  const { trip, conductorId, conductors, distanceToDestinationKm, nowMs = Date.now() } =
    params;

  if (trip.arrival_extension_used_at) return false;
  if (!isConductorActiveOnTrip(conductorId, trip, conductors)) return false;
  if (trip.status !== "closed") return false;

  const arrivalMs = new Date(trip.expected_arrival_at).getTime();
  const remainingMs = arrivalMs - nowMs;
  if (remainingMs <= 0 || remainingMs > ARRIVAL_EXTENSION_WINDOW_MS) return false;

  if (distanceToDestinationKm === null) return false;
  return distanceToDestinationKm >= FAR_FROM_DESTINATION_KM;
}

export function findTripNeedingArrivalExtension(params: {
  conductorId: string;
  trips: LinehaulTrip[];
  conductorsByTrip: Record<string, LinehaulTripConductor[]>;
  distanceByTrip: Record<string, number | null>;
  nowMs?: number;
}): LinehaulTrip | null {
  const { conductorId, trips, conductorsByTrip, distanceByTrip, nowMs = Date.now() } =
    params;

  for (const trip of trips) {
    if (
      shouldPromptArrivalExtension({
        trip,
        conductorId,
        conductors: conductorsByTrip[trip.id] ?? [],
        distanceToDestinationKm: distanceByTrip[trip.id] ?? null,
        nowMs,
      })
    ) {
      return trip;
    }
  }
  return null;
}
