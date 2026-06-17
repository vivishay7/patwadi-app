import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { computeLinehaulParcelsActionRequired } from "../lib/domain/linehaulActionRequired";
import { fetchCustodyEventsForParcels } from "../services/custodyService";
import { fetchMyTrips, fetchTripAttachedParcels } from "../services/tripService";

export function useLinehaulParcelsActionRequired(): boolean {
  const { user } = useAuth();
  const { role } = useRole();
  const isLinehaul = role === "linehaul";
  const [actionRequired, setActionRequired] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLinehaul || !user?.id) {
      setActionRequired(false);
      return;
    }

    try {
      const trips = await fetchMyTrips(user.id);
      const activeTrips = trips.filter((t) => t.status === "closed" || t.status === "completed");
      if (!activeTrips.length) {
        setActionRequired(false);
        return;
      }

      const parcelRows = await Promise.all(
        activeTrips.map((trip) => fetchTripAttachedParcels(trip.id))
      );
      const parcelIdsByTrip: Record<string, string[]> = {};
      const allParcelIds: string[] = [];

      activeTrips.forEach((trip, index) => {
        const ids = parcelRows[index]
          .map((p) => p.id)
          .filter((id): id is string => !!id);
        parcelIdsByTrip[trip.id] = ids;
        allParcelIds.push(...ids);
      });

      const eventsByParcel = allParcelIds.length
        ? await fetchCustodyEventsForParcels(allParcelIds)
        : {};

      setActionRequired(
        computeLinehaulParcelsActionRequired({
          trips: activeTrips,
          parcelIdsByTrip,
          eventsByParcel,
        })
      );
    } catch (error) {
      console.error("useLinehaulParcelsActionRequired:", error);
      setActionRequired(false);
    }
  }, [isLinehaul, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return actionRequired;
}
