import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { findTripNeedingArrivalExtension } from "../lib/domain/conductorLock";
import { fetchCorridorByKey } from "../lib/domain/corridors";
import { haversineKm } from "../lib/geo/haversineKm";
import { captureCurrentLocation } from "../lib/location/captureCurrentLocation";
import type { LinehaulTrip } from "../lib/db/types";
import {
  extendTripArrival,
  fetchLatestLocationSample,
  fetchMyTrips,
  fetchTripConductorsForTrips,
} from "../services/tripService";

const POLL_INTERVAL_MS = 90_000;

export function useTripArrivalExtension() {
  const { user } = useAuth();
  const { role } = useRole();
  const isLinehaul = role === "linehaul";
  const [trip, setTrip] = useState<LinehaulTrip | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [extending, setExtending] = useState(false);
  const dismissedTripIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isLinehaul || !user?.id || loadingRef.current) {
      if (!isLinehaul || !user?.id) setTrip(null);
      return;
    }

    loadingRef.current = true;
    try {
      const trips = await fetchMyTrips(user.id);
      const enRoute = trips.filter((t) => t.status === "closed" && !t.arrival_extension_used_at);
      if (!enRoute.length) {
        setTrip(null);
        return;
      }

      const tripIds = enRoute.map((t) => t.id);
      const conductorsByTrip = await fetchTripConductorsForTrips(tripIds);

      const distanceByTrip: Record<string, number | null> = {};
      for (const t of enRoute) {
        const corridor = await fetchCorridorByKey(t.corridor_id);
        if (!corridor) {
          distanceByTrip[t.id] = null;
          continue;
        }

        let loc = await fetchLatestLocationSample({
          conductorId: user.id,
          tripId: t.id,
        });
        if (!loc) {
          const captured = await captureCurrentLocation();
          if (captured.ok) loc = captured.location;
        }

        if (!loc) {
          distanceByTrip[t.id] = null;
          continue;
        }

        distanceByTrip[t.id] = haversineKm(
          loc.lat,
          loc.lng,
          corridor.destination.lat,
          corridor.destination.lng
        );
      }

      const candidate = findTripNeedingArrivalExtension({
        conductorId: user.id,
        trips: enRoute,
        conductorsByTrip,
        distanceByTrip,
      });

      if (!candidate || candidate.id === dismissedTripIdRef.current) {
        setTrip(null);
        setDistanceKm(null);
        return;
      }

      setTrip(candidate);
      setDistanceKm(distanceByTrip[candidate.id] ?? null);
    } catch (error) {
      console.error("useTripArrivalExtension:", error);
      setTrip(null);
    } finally {
      loadingRef.current = false;
    }
  }, [isLinehaul, user?.id]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === "active") void refresh();
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [refresh]);

  const dismiss = useCallback(() => {
    if (trip) dismissedTripIdRef.current = trip.id;
    setTrip(null);
  }, [trip]);

  const acceptExtension = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!trip) return { ok: false, error: "No trip selected" };
    setExtending(true);
    const result = await extendTripArrival(trip.id);
    setExtending(false);
    if ("error" in result) return { ok: false, error: result.error };
    dismissedTripIdRef.current = trip.id;
    setTrip(null);
    void refresh();
    return { ok: true };
  }, [trip, refresh]);

  return {
    trip,
    distanceKm,
    extending,
    dismiss,
    acceptExtension,
    refresh,
  };
}
