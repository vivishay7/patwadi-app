import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  fetchMyTrips,
  fetchTripConductorsForTrips,
} from "../services/tripService";
import { tripNeedsIncompleteCoConductorAction } from "../lib/domain/incompleteTrip";
import type { LinehaulTrip } from "../lib/db/types";

export function useIncompleteTripAction() {
  const { user } = useAuth();
  const { role } = useRole();
  const [trip, setTrip] = useState<LinehaulTrip | null>(null);
  const [dismissedTripId, setDismissedTripId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (role !== "linehaul" || !user?.id) {
      setTrip(null);
      return;
    }

    const trips = await fetchMyTrips(user.id);
    const candidates = trips.filter(
      (t) => t.id !== dismissedTripId && !t.incomplete_trip_resolved_at
    );
    if (!candidates.length) {
      setTrip(null);
      return;
    }

    const conductorsByTrip = await fetchTripConductorsForTrips(
      candidates.map((t) => t.id)
    );

    const needing = candidates.find((t) =>
      tripNeedsIncompleteCoConductorAction(t, conductorsByTrip[t.id] ?? [])
    );
    setTrip(needing ?? null);
  }, [role, user?.id, dismissedTripId]);

  const dismiss = useCallback(() => {
    if (trip) setDismissedTripId(trip.id);
    setTrip(null);
  }, [trip]);

  return { trip, refresh, dismiss };
}
