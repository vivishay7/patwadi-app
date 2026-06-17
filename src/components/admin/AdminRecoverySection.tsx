import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  FlatList,
  RefreshControl,
  ScrollView,
} from "react-native";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import {
  adminMarkUnrecoverable,
  adminReassignRecovery,
  fetchActiveRecoveries,
  fetchOpenTripsForRecovery,
} from "../../services/adminService";
import type { LinehaulTrip, ParcelRecovery } from "../../lib/db/types";
import EmptyState from "../EmptyState";
import ListSkeleton from "../ListSkeleton";
import { LoadingButton } from "../LoadingButton";

export default function AdminRecoverySection() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [recoveries, setRecoveries] = useState<ParcelRecovery[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRecovery, setPickerRecovery] = useState<ParcelRecovery | null>(null);
  const [openTrips, setOpenTrips] = useState<LinehaulTrip[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setRecoveries(await fetchActiveRecoveries());
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load recoveries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openReassignPicker = async (recovery: ParcelRecovery) => {
    setPickerRecovery(recovery);
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      setOpenTrips(await fetchOpenTripsForRecovery());
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load trips");
      setPickerOpen(false);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleReassign = async (trip: LinehaulTrip) => {
    if (!pickerRecovery) return;
    setActionId(pickerRecovery.id);
    try {
      await adminReassignRecovery({
        parcelId: pickerRecovery.parcel_id,
        newTripId: trip.id,
      });
      setPickerOpen(false);
      setPickerRecovery(null);
      await load();
      Alert.alert("Done", `Parcel reassigned to trip ${trip.route_label}`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Reassign failed");
    } finally {
      setActionId(null);
    }
  };

  const handleMarkUnrecoverable = (recovery: ParcelRecovery) => {
    Alert.alert(
      "Mark unrecoverable",
      `Close recovery for parcel ${recovery.parcel_id.slice(0, 8)}…? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark unrecoverable",
          style: "destructive",
          onPress: async () => {
            setActionId(recovery.id);
            try {
              await adminMarkUnrecoverable({ parcelId: recovery.parcel_id });
              await load();
              Alert.alert("Done", "Recovery marked unrecoverable");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Action failed");
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <ListSkeleton rows={2} />;
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {!recoveries.length ? (
        <EmptyState title="No open recoveries" message="Blocked parcels needing recovery will appear here." />
      ) : (
        recoveries.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.id}>Parcel {r.parcel_id.slice(0, 8)}…</Text>
            <Text style={styles.meta}>Trip {r.recovery_of_trip_id.slice(0, 8)}…</Text>
            <Text style={styles.meta}>Status: {r.status} · L{r.escalation_level}</Text>
            <Text style={styles.reason}>{r.reason}</Text>
            <View style={styles.actions}>
              <LoadingButton
                title="Reassign to trip"
                variant="ghost"
                isLoading={actionId === r.id}
                onPress={() => openReassignPicker(r)}
                disabled={actionId === r.id}
                style={styles.actionBtn}
              />
              <LoadingButton
                title="Mark unrecoverable"
                variant="ghost"
                isLoading={actionId === r.id}
                onPress={() => handleMarkUnrecoverable(r)}
                disabled={actionId === r.id}
                style={styles.actionBtnDanger}
              />
            </View>
          </View>
        ))
      )}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Pick recovery trip</Text>
            {pickerLoading ? (
              <ListSkeleton rows={2} />
            ) : (
              <FlatList
                data={openTrips}
                keyExtractor={(t) => t.id}
                ListEmptyComponent={
                  <EmptyState title="No eligible trips" message="No open trips available for reassignment." />
                }
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.tripRow} onPress={() => handleReassign(item)}>
                    <Text style={styles.tripLabel}>{item.route_label}</Text>
                    <Text style={styles.meta}>{item.status} · {item.bus_number}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  reason: { ...typography.bodySmall, color: colors.textPrimary, marginTop: spacing.sm },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  actionBtn: { borderWidth: 1, borderColor: colors.primary },
  actionBtnDanger: { borderWidth: 1, borderColor: colors.error },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: "60%",
  },
  sheetTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  tripRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tripLabel: { ...typography.bodySmall, color: colors.textPrimary },
});
