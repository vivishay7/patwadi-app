import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  evaluateConductorLock,
  type ConductorLockState,
} from "../lib/domain/conductorLock";
import { fetchCustodyEventsForParcels } from "../services/custodyService";
import {
  fetchMyTrips,
  fetchTripAttachedParcels,
  fetchTripConductorsForTrips,
} from "../services/tripService";

const REFRESH_INTERVAL_MS = 60_000;

const EMPTY_LOCK: ConductorLockState = {
  locked: false,
  trip: null,
  unhandedParcelCount: 0,
};

export function useConductorLock(): ConductorLockState {
  const { user } = useAuth();
  const { role } = useRole();
  const isLinehaul = role === "linehaul";
  const [lockState, setLockState] = useState<ConductorLockState>(EMPTY_LOCK);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isLinehaul || !user?.id || loadingRef.current) {
      if (!isLinehaul || !user?.id) setLockState(EMPTY_LOCK);
      return;
    }

    loadingRef.current = true;
    try {
      const trips = await fetchMyTrips(user.id);
      const candidateTrips = trips.filter(
        (t) => t.status === "closed" || t.status === "completed"
      );
      if (!candidateTrips.length) {
        setLockState(EMPTY_LOCK);
        return;
      }

      const tripIds = candidateTrips.map((t) => t.id);
      const [conductorsByTrip, ...parcelRows] = await Promise.all([
        fetchTripConductorsForTrips(tripIds),
        ...candidateTrips.map((trip) => fetchTripAttachedParcels(trip.id)),
      ]);

      const parcelIdsByTrip: Record<string, string[]> = {};
      const allParcelIds: string[] = [];
      candidateTrips.forEach((trip, index) => {
        const ids = parcelRows[index]
          .map((p) => p.id)
          .filter((id): id is string => !!id);
        parcelIdsByTrip[trip.id] = ids;
        allParcelIds.push(...ids);
      });

      const eventsByParcel = allParcelIds.length
        ? await fetchCustodyEventsForParcels(allParcelIds)
        : {};

      setLockState(
        evaluateConductorLock({
          conductorId: user.id,
          trips: candidateTrips,
          conductorsByTrip,
          parcelIdsByTrip,
          eventsByParcel,
        })
      );
    } catch (error) {
      console.error("useConductorLock:", error);
      setLockState(EMPTY_LOCK);
    } finally {
      loadingRef.current = false;
    }
  }, [isLinehaul, user?.id]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === "active") void refresh();
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [refresh]);

  return lockState;
}
