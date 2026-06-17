import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import {
  adminApproveExtraTrip,
  adminCancelTrip,
  adminRescindParcel,
  fetchAdminTripParcels,
  fetchAdminTrips,
} from "../../services/adminService";
import type { LinehaulTrip, Order } from "../../lib/db/types";
import EmptyState from "../EmptyState";
import ListSkeleton from "../ListSkeleton";
import { LoadingButton } from "../LoadingButton";
import { useToast } from "../../hooks/useToast";

export default function AdminTripsSection() {
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionTripId, setActionTripId] = useState<string | null>(null);
  const [trips, setTrips] = useState<LinehaulTrip[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [parcelsByTrip, setParcelsByTrip] = useState<Record<string, Partial<Order>[]>>({});

  const load = useCallback(async () => {
    try {
      setTrips(await fetchAdminTrips());
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load trips");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = async (tripId: string) => {
    if (expandedId === tripId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(tripId);
    if (!parcelsByTrip[tripId]) {
      try {
        const parcels = await fetchAdminTripParcels(tripId);
        setParcelsByTrip((prev) => ({ ...prev, [tripId]: parcels }));
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to load parcels");
      }
    }
  };

  const handleCancelTrip = (trip: LinehaulTrip) => {
    if (trip.status === "cancelled" || trip.status === "completed") return;
    Alert.alert("Cancel trip", `Cancel ${trip.route_label}? Parcels may be reassigned or flagged.`, [
      { text: "Back", style: "cancel" },
      {
        text: "Cancel trip",
        style: "destructive",
        onPress: async () => {
          setActionTripId(trip.id);
          try {
            const res = await adminCancelTrip({ tripId: trip.id });
            await load();
            Alert.alert("Done", `Trip cancelled (${res.outcomes.length} parcel outcomes)`);
          } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Cancel failed");
          } finally {
            setActionTripId(null);
          }
        },
      },
    ]);
  };

  const handleRescind = (tripId: string, parcelId: string) => {
    Alert.alert("Rescind parcel", `Remove parcel ${parcelId.slice(0, 8)}… from trip?`, [
      { text: "Back", style: "cancel" },
      {
        text: "Rescind",
        style: "destructive",
        onPress: async () => {
          setActionTripId(tripId);
          try {
            const res = await adminRescindParcel({ tripId, parcelId });
            const parcels = await fetchAdminTripParcels(tripId);
            setParcelsByTrip((prev) => ({ ...prev, [tripId]: parcels }));
            await load();
            showSuccess(`Parcel rescinded (${res.action})`);
          } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Rescind failed");
          } finally {
            setActionTripId(null);
          }
        },
      },
    ]);
  };

  const handleApproveExtra = async (trip: LinehaulTrip) => {
    setActionTripId(trip.id);
    try {
      await adminApproveExtraTrip({ tripId: trip.id });
      await load();
      Alert.alert("Done", "Extra trip approved");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActionTripId(null);
    }
  };

  if (loading) {
    return <ListSkeleton rows={3} />;
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }
      showsVerticalScrollIndicator={false}
    >
      {!trips.length ? (
        <EmptyState title="No linehaul trips" message="Operator trips will appear here." />
      ) : (
        trips.map((trip) => {
          const parcels = parcelsByTrip[trip.id] ?? [];
          const expanded = expandedId === trip.id;
          const busy = actionTripId === trip.id;
          const needsExtraApproval = trip.is_extra_trip && !trip.extra_trip_approved_by;

          return (
            <View key={trip.id} style={styles.card}>
              <TouchableOpacity onPress={() => toggleExpand(trip.id)} activeOpacity={0.8}>
                <Text style={styles.id}>{trip.route_label}</Text>
                <Text style={styles.meta}>
                  {trip.status} · {trip.bus_number} · dep{" "}
                  {new Date(trip.scheduled_departure_at).toLocaleDateString()}
                </Text>
                {needsExtraApproval ? (
                  <Text style={styles.badge}>Extra trip — pending approval</Text>
                ) : null}
                {trip.is_overdue ? (
                  <Text style={[styles.badge, styles.overdueBadge]}>Overdue</Text>
                ) : null}
              </TouchableOpacity>

              {expanded ? (
                <View style={styles.detail}>
                  <Text style={styles.detailTitle}>Attached parcels</Text>
                  {parcels.length === 0 ? (
                    <Text style={styles.meta}>None</Text>
                  ) : (
                    parcels.map((p) => (
                      <View key={p.id} style={styles.parcelRow}>
                        <Text style={styles.meta}>
                          #{p.id?.slice(0, 8)}… {p.pickup_location} → {p.dropoff_location}
                        </Text>
                        {trip.status !== "cancelled" && trip.status !== "completed" ? (
                          <TouchableOpacity
                            disabled={busy}
                            onPress={() => handleRescind(trip.id, p.id!)}
                          >
                            <Text style={styles.link}>Rescind</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))
                  )}

                  {needsExtraApproval ? (
                    <LoadingButton
                      title="Approve extra trip"
                      variant="ghost"
                      isLoading={busy}
                      onPress={() => handleApproveExtra(trip)}
                      disabled={busy}
                      style={styles.adminBtn}
                    />
                  ) : null}

                  {trip.status !== "cancelled" && trip.status !== "completed" ? (
                    <LoadingButton
                      title="Cancel trip"
                      variant="ghost"
                      isLoading={busy}
                      onPress={() => handleCancelTrip(trip)}
                      disabled={busy}
                      style={styles.adminBtnDanger}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  id: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  badge: { ...typography.caption, color: colors.warning, marginTop: spacing.xs, fontWeight: "600" },
  overdueBadge: { color: colors.error },
  detail: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  detailTitle: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  parcelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  link: { ...typography.caption, color: colors.error, fontWeight: "600" },
  adminBtn: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.primary },
  adminBtnDanger: { marginTop: spacing.sm, borderWidth: 1, borderColor: colors.error },
});
