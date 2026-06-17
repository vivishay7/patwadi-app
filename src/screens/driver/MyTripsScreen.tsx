import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../context/AuthContext";
import { deleteDraftTrip, fetchMyTrips, fetchTripConductorsForTrips, fetchPendingIncomingTransfers, acceptTripTransfer } from "../../services/tripService";
import { LinehaulTrip, LinehaulTripConductor, LinehaulTripTransferRequest } from "../../lib/db/types";
import { effectiveTripStatusForConductor } from "../../lib/domain/conductorLock";
import { formatTransferStatusMessage } from "../../lib/domain/transferDisplay";
import { buildSupportDeepLink } from "../../lib/support/buildSupportDeepLink";
import {
  tripShowsAcceptingParcels,
  tripShowsDetailsLocked,
  tripShowsExtraPending,
} from "../../lib/domain/tripDisplay";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import ConfirmDialog from "../../components/ConfirmDialog";
import EmptyState from "../../components/EmptyState";
import ListSkeleton from "../../components/ListSkeleton";
import { LoadingButton } from "../../components/LoadingButton";
import { supabase } from "../../lib/supabase";

type Nav = NativeStackNavigationProp<RootStackParamList, "MyTrips">;

export default function MyTripsScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [trips, setTrips] = useState<LinehaulTrip[]>([]);
  const [conductorsByTrip, setConductorsByTrip] = useState<
    Record<string, LinehaulTripConductor[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<LinehaulTrip | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [incomingTransfers, setIncomingTransfers] = useState<LinehaulTripTransferRequest[]>([]);
  const [acceptLoadingId, setAcceptLoadingId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const [data, incoming] = await Promise.all([
      fetchMyTrips(user.id),
      fetchPendingIncomingTransfers(user.id),
    ]);
    setTrips(data);
    setIncomingTransfers(incoming);
    setConductorsByTrip(await fetchTripConductorsForTrips(data.map((t) => t.id)));
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setAccountEmail(null);
      setTrips([]);
      setIncomingTransfers([]);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null);
    });
    setLoading(true);
    load();
  }, [user?.id, load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visibleTrips = trips.filter((t) => {
    const conductors = conductorsByTrip[t.id] ?? [];
    const status =
      user?.id != null
        ? effectiveTripStatusForConductor(t, user.id, conductors)
        : t.status;
    return showCancelled || status !== "cancelled";
  });

  const displayStatus = (item: LinehaulTrip) => {
    const conductors = conductorsByTrip[item.id] ?? [];
    return user?.id != null
      ? effectiveTripStatusForConductor(item, user.id, conductors)
      : item.status;
  };

  const handleDeleteDraft = (trip: LinehaulTrip) => {
    if (!user?.id) return;
    setDraftToDelete(trip);
  };

  const confirmDeleteDraft = async () => {
    if (!user?.id || !draftToDelete) return;
    setDeleteLoading(true);
    const result = await deleteDraftTrip(draftToDelete.id, user.id);
    setDeleteLoading(false);
    setDraftToDelete(null);
    if ("error" in result) {
      Alert.alert("Cannot delete", result.error);
      return;
    }
    load();
  };

  const handleAcceptTransfer = async (transfer: LinehaulTripTransferRequest) => {
    setAcceptLoadingId(transfer.id);
    const result = await acceptTripTransfer(transfer.id);
    setAcceptLoadingId(null);

    if ("error" in result) {
      if (result.code === "rejected_timeout") {
        const url = buildSupportDeepLink(
          {
            audience: "operator",
            operatorId: user?.id,
            tripId: transfer.trip_id,
            stepOrState: "transfer_timeout",
          },
          "Transfer problem",
          "My trip transfer acceptance window expired."
        );
        Alert.alert("Transfer expired", result.error, [
          { text: "Contact support", onPress: () => Linking.openURL(url) },
          { text: "OK" },
        ]);
      } else {
        Alert.alert("Cannot accept", result.error);
      }
      load();
      return;
    }

    Alert.alert("Load accepted", formatTransferStatusMessage(result.request, "receiver"));
    load();
  };

  const renderIncomingTransfer = (transfer: LinehaulTripTransferRequest) => (
    <View key={transfer.id} style={styles.incomingCard}>
      <Text style={styles.incomingTitle}>Trip transfer offered to you</Text>
      <Text style={styles.incomingMeta}>
        {formatTransferStatusMessage(transfer, "receiver")}
      </Text>
      <TouchableOpacity
        style={styles.acceptBtn}
        onPress={() => handleAcceptTransfer(transfer)}
        disabled={acceptLoadingId === transfer.id}
        activeOpacity={0.85}
      >
        {acceptLoadingId === transfer.id ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.acceptBtnText}>Accept load</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: LinehaulTrip }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => navigation.navigate("TripDetail", { tripId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.route}>{item.route_label}</Text>
          <Text
            style={[
              styles.status,
              displayStatus(item) === "cancelled" && styles.statusCancelled,
            ]}
          >
            {displayStatus(item)}
          </Text>
        </View>
        <Text style={styles.meta}>{item.corridor_id}</Text>
        <Text style={styles.meta}>
          Departs {new Date(item.scheduled_departure_at).toLocaleString()}
        </Text>
        <View style={styles.flags}>
          {tripShowsAcceptingParcels(item) && (
            <Text style={styles.flagOpen}>Accepting parcels</Text>
          )}
          {tripShowsDetailsLocked(item) && (
            <Text style={styles.flagLocked}>Details locked</Text>
          )}
          {tripShowsExtraPending(item) && (
            <Text style={styles.flagExtra}>Extra trip — pending approval</Text>
          )}
        </View>
      </TouchableOpacity>
      {item.status === "draft" && item.created_by_conductor_id === user?.id && (
        <TouchableOpacity
          style={styles.deleteRow}
          onPress={() => handleDeleteDraft(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.deleteText}>Delete draft</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.container}>
          <Text style={styles.title}>My Trips</Text>
          <ListSkeleton rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          {navigation.canGoBack() ? (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Text style={styles.title}>My Trips</Text>
          {accountEmail ? (
            <Text style={styles.accountEmail} numberOfLines={1}>
              {accountEmail}
            </Text>
          ) : null}
          <TouchableOpacity onPress={() => navigation.navigate("CreateTrip")}>
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.filterRow}
          onPress={() => setShowCancelled((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showCancelled ? "checkbox" : "square-outline"}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.filterText}>Show cancelled trips</Text>
        </TouchableOpacity>

        <FlatList
          data={visibleTrips}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={
            incomingTransfers.length > 0 ? (
              <View style={styles.incomingBlock}>
                {incomingTransfers.map(renderIncomingTransfer)}
              </View>
            ) : null
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          contentContainerStyle={visibleTrips.length ? undefined : styles.emptyList}
          ListEmptyComponent={
            <EmptyState
              title="No trips yet"
              message="Create a trip to start accepting parcels on your corridor"
              icon={<Ionicons name="bus-outline" size={56} color={colors.textSecondary} />}
              action={
                <LoadingButton
                  title="Create your first trip"
                  onPress={() => navigation.navigate("CreateTrip")}
                />
              }
            />
          }
        />
      </View>

      <ConfirmDialog
        visible={!!draftToDelete}
        title="Delete draft trip?"
        message={
          draftToDelete
            ? `${draftToDelete.route_label} will be permanently removed.`
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onCancel={() => setDraftToDelete(null)}
        onConfirm={() => {
          void confirmDeleteDraft();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },
  loader: { flex: 1, justifyContent: "center" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backPlaceholder: { width: 24 },
  title: { ...typography.h1, color: colors.textPrimary, flex: 1, marginLeft: spacing.md },
  accountEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    maxWidth: 140,
    textAlign: "right",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterText: { ...typography.bodySmall, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
  route: { ...typography.body, fontWeight: "700", color: colors.textPrimary, flex: 1 },
  status: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusCancelled: { color: colors.error },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  flagOpen: { ...typography.caption, color: colors.success },
  flagLocked: { ...typography.caption, color: colors.warning },
  flagExtra: { ...typography.caption, color: colors.error },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  deleteText: { ...typography.caption, color: colors.error, fontWeight: "600" },
  incomingBlock: { marginBottom: spacing.lg, gap: spacing.md },
  incomingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  incomingTitle: { ...typography.body, fontWeight: "700", color: colors.primary, marginBottom: spacing.xs },
  incomingMeta: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  acceptBtnText: { ...typography.button, color: colors.white },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: spacing.massive },
  emptyTitle: { ...typography.h2, color: colors.textSecondary, marginBottom: spacing.lg },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  createBtnText: { ...typography.button, color: colors.white },
});
