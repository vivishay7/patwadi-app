import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { AppState, Linking, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "./AuthContext";
import { useRole } from "./RoleContext";
import { useLocale } from "./LocaleContext";
import { LinehaulTripTransferRequest } from "../lib/db/types";
import { computeLinehaulParcelsActionRequired } from "../lib/domain/linehaulActionRequired";
import {
  ensureNotificationPermission,
  notifyOperatorAlert,
} from "../lib/notifications/operatorNotifications";
import { buildSupportDeepLink } from "../lib/support/buildSupportDeepLink";
import { fetchCustodyEventsForParcels } from "../services/custodyService";
import {
  acceptTripTransfer,
  fetchMyTrips,
  fetchPendingIncomingTransfers,
  fetchTripAttachedParcels,
} from "../services/tripService";
import {
  fetchAvailableParcelsForLinehaul,
  getAvailableOrders,
} from "../services/orderService";

type OperatorAlertsContextType = {
  availableJobsCount: number;
  pendingTransfers: LinehaulTripTransferRequest[];
  parcelsActionRequired: boolean;
  refresh: () => Promise<void>;
  acceptTransfer: (transferId: string) => Promise<void>;
};

const OperatorAlertsContext = createContext<OperatorAlertsContextType | null>(null);

export function OperatorAlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { role } = useRole();
  const { locale, t } = useLocale();
  const isOperator = role === "linehaul" || role === "lmp";
  const isLinehaul = role === "linehaul";

  const [availableJobsCount, setAvailableJobsCount] = useState(0);
  const [pendingTransfers, setPendingTransfers] = useState<LinehaulTripTransferRequest[]>([]);
  const [parcelsActionRequired, setParcelsActionRequired] = useState(false);

  const prevJobs = useRef(0);
  const prevTransferCount = useRef(0);

  const refresh = useCallback(async () => {
    if (!isOperator || !user?.id) {
      setAvailableJobsCount(0);
      setPendingTransfers([]);
      setParcelsActionRequired(false);
      return;
    }

    try {
      const jobsPromise = isLinehaul
        ? fetchAvailableParcelsForLinehaul()
        : getAvailableOrders();
      const [jobs, transfers] = await Promise.all([
        jobsPromise,
        isLinehaul ? fetchPendingIncomingTransfers(user.id) : Promise.resolve([]),
      ]);

      setAvailableJobsCount(jobs.length);
      setPendingTransfers(transfers);

      if (isLinehaul) {
        const trips = await fetchMyTrips(user.id);
        const activeTrips = trips.filter((t) => t.status === "closed" || t.status === "completed");
        if (!activeTrips.length) {
          setParcelsActionRequired(false);
        } else {
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
          setParcelsActionRequired(
            computeLinehaulParcelsActionRequired({
              trips: activeTrips,
              parcelIdsByTrip,
              eventsByParcel,
            })
          );
        }
      } else {
        setParcelsActionRequired(false);
      }

      if (transfers.length > prevTransferCount.current) {
        const newest = transfers[transfers.length - 1];
        void notifyOperatorAlert({
          id: `transfer-${newest?.id ?? Date.now()}`,
          titleKey: "notificationTransferTitle",
          bodyKey: "notificationTransferBody",
          locale,
        });
      }
      prevTransferCount.current = transfers.length;

      if (jobs.length > 0 && prevJobs.current === 0) {
        void notifyOperatorAlert({
          id: `jobs-${Date.now()}`,
          titleKey: "notificationJobsTitle",
          bodyKey: "notificationJobsBody",
          bodyArgs: String(jobs.length),
          locale,
        });
      }
      prevJobs.current = jobs.length;
    } catch (e) {
      console.error("OperatorAlertsProvider.refresh:", e);
    }
  }, [isOperator, isLinehaul, user?.id, locale]);

  const acceptTransfer = useCallback(
    async (transferId: string) => {
      const result = await acceptTripTransfer(transferId);
      if ("error" in result) {
        if (result.code === "rejected_timeout") {
          const url = buildSupportDeepLink(
            {
              audience: "operator",
              operatorId: user?.id,
              stepOrState: "transfer_timeout",
            },
            "Transfer problem",
            "Transfer acceptance window expired."
          );
          Alert.alert("Transfer expired", result.error, [
            { text: "Contact support", onPress: () => Linking.openURL(url) },
            { text: "OK" },
          ]);
        } else {
          Alert.alert("Cannot accept", result.error);
        }
      } else {
        Alert.alert("Load accepted", t("transferOfferTitle"));
      }
      await refresh();
    },
    [refresh, t, user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!isOperator) return;
    void ensureNotificationPermission();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const interval = setInterval(() => void refresh(), 60_000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [isOperator, refresh]);

  return (
    <OperatorAlertsContext.Provider
      value={{
        availableJobsCount,
        pendingTransfers,
        parcelsActionRequired,
        refresh,
        acceptTransfer,
      }}
    >
      {children}
    </OperatorAlertsContext.Provider>
  );
}

export function useOperatorAlerts() {
  const ctx = useContext(OperatorAlertsContext);
  if (!ctx) {
    return {
      availableJobsCount: 0,
      pendingTransfers: [] as LinehaulTripTransferRequest[],
      parcelsActionRequired: false,
      refresh: async () => {},
      acceptTransfer: async () => {},
    };
  }
  return ctx;
}
