import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../context/AuthContext";
import {
  addCoConductor,
  attachBusProofToDraft,
  deleteDraftTrip,
  fetchPendingOutgoingTransfer,
  fetchTripAttachedParcels,
  fetchTripById,
  fetchTripConductors,
  publishTripToOpen,
  requestTripTransfer,
} from "../../services/tripService";
import { captureCurrentLocation } from "../../lib/location/captureCurrentLocation";
import { startTripTracking } from "../../lib/location/tripTracking";
import { LinehaulTrip, LinehaulTripConductor, LinehaulTripTransferRequest } from "../../lib/db/types";
import { isConductorActiveOnTrip } from "../../lib/domain/conductorLock";
import { formatTransferStatusMessage } from "../../lib/domain/transferDisplay";
import {
  tripShowsAcceptingParcels,
  tripShowsDetailsLocked,
  tripShowsExtraPending,
} from "../../lib/domain/tripDisplay";
import ConductorPickerSheet from "../../components/ConductorPickerSheet";
import ConfirmDialog from "../../components/ConfirmDialog";
import { LoadingButton } from "../../components/LoadingButton";
import { useToast } from "../../hooks/useToast";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";

type Nav = NativeStackNavigationProp<RootStackParamList, "TripDetail">;
type RouteProps = RouteProp<RootStackParamList, "TripDetail">;

export default function TripDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const tripId = route.params.tripId;

  const [trip, setTrip] = useState<LinehaulTrip | null>(null);
  const [conductors, setConductors] = useState<LinehaulTripConductor[]>([]);
  const [parcels, setParcels] = useState<Partial<{ id: string; pickup_location: string; dropoff_location: string }>[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pickerMode, setPickerMode] = useState<"co_conductor" | "transfer" | null>(null);
  const [busProofUri, setBusProofUri] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<LinehaulTripTransferRequest | null>(null);

  const hasBusProof = !!trip?.bus_proof_photo_path?.trim();

  const pickBusProof = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Camera permission needed",
          "Open Settings → Patwadi → Permissions and allow Camera, then try again."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setBusProofUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error("pickBusProof:", e);
      Alert.alert(
        "Camera unavailable",
        "Could not open the camera. Rebuild the app after updating permissions, or pick a photo from your gallery.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Choose from gallery",
            onPress: () => {
              void (async () => {
                try {
                  const lib = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ["images"],
                    quality: 0.8,
                    allowsEditing: true,
                  });
                  if (!lib.canceled && lib.assets[0]?.uri) {
                    setBusProofUri(lib.assets[0].uri);
                  }
                } catch (err) {
                  console.error("pickBusProof gallery:", err);
                  Alert.alert("Photo picker failed", "Please try again.");
                }
              })();
            },
          },
        ]
      );
    }
  };

  const handleSaveBusProof = async () => {
    if (!user?.id || !trip || !busProofUri) return;
    setActionLoading(true);
    const result = await attachBusProofToDraft(trip.id, user.id, busProofUri);
    setActionLoading(false);
    if ("error" in result) {
      Alert.alert("Photo not saved", result.error);
      return;
    }
    setBusProofUri(null);
    setTrip(result.trip);
    Alert.alert("Saved", "Bus proof photo added. You can publish when ready.");
  };

  const handleDeleteDraft = () => {
    if (!user?.id || !trip) return;
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteDraft = async () => {
    if (!user?.id || !trip) return;
    setActionLoading(true);
    const result = await deleteDraftTrip(trip.id, user.id);
    setActionLoading(false);
    setDeleteConfirmVisible(false);
    if ("error" in result) {
      Alert.alert("Cannot delete", result.error);
      return;
    }
    navigation.goBack();
  };

  const load = useCallback(async () => {
    const [t, c, p, pending] = await Promise.all([
      fetchTripById(tripId),
      fetchTripConductors(tripId),
      fetchTripAttachedParcels(tripId),
      fetchPendingOutgoingTransfer(tripId),
    ]);
    setTrip(t);
    setConductors(c);
    setParcels(p);
    setPendingTransfer(pending);
    setLoading(false);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const isPrimary =
    !!trip && !!user?.id && isConductorActiveOnTrip(user.id, trip, conductors);

  const handlePublish = async () => {
    if (!user?.id || !trip) return;
    setActionLoading(true);
    const result = await publishTripToOpen(trip.id, user.id);
    setActionLoading(false);
    if ("error" in result) {
      Alert.alert("Cannot publish", result.error);
      return;
    }
    setTrip(result.trip);
    await startTripTracking({
      tripId: result.trip.id,
      role: "linehaul",
      corridorId: result.trip.corridor_id,
    });
    showSuccess("Trip published — your trip is now open.");
  };

  const runWithLocation = async (
    mode: "co_conductor" | "transfer",
    targetId: string
  ) => {
    if (!user?.id || !trip) return;
    setActionLoading(true);
    const fromLoc = await captureCurrentLocation();
    const toLoc = await captureCurrentLocation();

    if (mode === "co_conductor") {
      const result = await addCoConductor({
        tripId: trip.id,
        targetConductorId: targetId,
        location: fromLoc.ok ? fromLoc.location : null,
      });
      setActionLoading(false);
      if ("error" in result) {
        Alert.alert("Add co-conductor failed", result.error);
        return;
      }
      showSuccess("Co-conductor added");
      load();
      return;
    }

    const result = await requestTripTransfer({
      tripId: trip.id,
      toConductorId: targetId,
      fromLocation: fromLoc.ok ? fromLoc.location : null,
      toLocation: toLoc.ok ? toLoc.location : null,
      toLocationReadFailed: !toLoc.ok,
    });
    setActionLoading(false);
    if ("error" in result) {
      Alert.alert("Transfer failed", result.error);
      return;
    }
    setPendingTransfer(result.request);
    Alert.alert(
      "Transfer requested",
      formatTransferStatusMessage(result.request, "sender")
    );
    load();
  };

  if (loading || !trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </SafeAreaView>
    );
  }

  const isActiveConductor =
    !!user?.id && isConductorActiveOnTrip(user.id, trip, conductors);

  if (!isActiveConductor) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Trip transferred</Text>
          <Text style={styles.muted}>
            This trip is no longer assigned to your account. Parcels and actions are
            only visible to the active conductor.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>{trip.route_label}</Text>
        <Text style={styles.subtitle}>{trip.corridor_id} · {trip.status}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip details</Text>
          <Text style={styles.row}>Bus {trip.bus_number}</Text>
          <Text style={styles.row}>Driver {trip.driver_name} · {trip.driver_phone}</Text>
          <Text style={styles.row}>
            Departure {new Date(trip.scheduled_departure_at).toLocaleString()}
          </Text>
          <Text style={styles.row}>
            Arrival {new Date(trip.expected_arrival_at).toLocaleString()}
          </Text>
          {trip.capacity_count != null && (
            <Text style={styles.row}>Capacity {trip.capacity_count} parcels</Text>
          )}
          <View style={styles.flagRow}>
            {tripShowsAcceptingParcels(trip) && (
              <Text style={styles.flagOpen}>Accepting parcels</Text>
            )}
            {tripShowsDetailsLocked(trip) && (
              <Text style={styles.flagLocked}>Details locked</Text>
            )}
            {tripShowsExtraPending(trip) && (
              <Text style={styles.flagExtra}>Extra trip — pending admin approval</Text>
            )}
          </View>
        </View>

        {pendingTransfer && (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Transfer pending</Text>
            <Text style={styles.muted}>
              {formatTransferStatusMessage(pendingTransfer, "sender")}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conductors</Text>
          <Text style={styles.row}>Primary · {trip.created_by_conductor_id.slice(0, 8)}…</Text>
          {conductors.map((c) => (
            <Text key={c.id} style={styles.row}>
              {c.role} · {c.conductor_id.slice(0, 8)}…
            </Text>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Attached parcels ({parcels.length})</Text>
          {parcels.length === 0 ? (
            <Text style={styles.muted}>No parcels attached yet.</Text>
          ) : (
            parcels.map((p) => (
              <Text key={p.id} style={styles.row}>
                #{p.id?.slice(0, 8)} · {p.pickup_location} → {p.dropoff_location}
              </Text>
            ))
          )}
        </View>

        {isPrimary && trip.status === "draft" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bus proof photo *</Text>
            {hasBusProof ? (
              <Text style={styles.muted}>Photo on file — ready to publish.</Text>
            ) : (
              <Text style={styles.muted}>
                Required before publishing. Take a clear photo of the bus.
              </Text>
            )}
            {busProofUri && (
              <Image source={{ uri: busProofUri }} style={styles.busProofPreview} />
            )}
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickBusProof} disabled={actionLoading}>
              <Text style={styles.secondaryBtnText}>
                {hasBusProof ? "Retake bus photo" : "Take bus photo"}
              </Text>
            </TouchableOpacity>
            {busProofUri && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSaveBusProof}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {hasBusProof ? "Update bus photo" : "Save bus photo"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {isPrimary && trip.status === "draft" && (
          <View style={styles.draftActions}>
            <LoadingButton
              title={
                trip.is_extra_trip && !trip.extra_trip_approved_by
                  ? "Pending admin approval (extra trip)"
                  : "Publish draft"
              }
              isLoading={actionLoading}
              onPress={handlePublish}
              disabled={trip.is_extra_trip && !trip.extra_trip_approved_by}
              style={styles.publishBtn}
            />
            <TouchableOpacity
              style={styles.deleteLink}
              onPress={handleDeleteDraft}
              disabled={actionLoading}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={styles.deleteLinkText}>Delete draft</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPrimary && trip.details_locked && (
          <LoadingButton
            title="Add co-conductor"
            variant="ghost"
            isLoading={actionLoading && pickerMode === "co_conductor"}
            onPress={() => setPickerMode("co_conductor")}
            disabled={actionLoading}
            style={styles.secondaryBtnLoading}
          />
        )}

        {isPrimary && !pendingTransfer && (
          <LoadingButton
            title="Request transfer"
            variant="ghost"
            isLoading={actionLoading && pickerMode === "transfer"}
            onPress={() => setPickerMode("transfer")}
            disabled={actionLoading}
            style={styles.secondaryBtnLoading}
          />
        )}
      </ScrollView>

      {user?.id && pickerMode && (
        <ConductorPickerSheet
          visible={!!pickerMode}
          onClose={() => setPickerMode(null)}
          currentConductorId={user.id}
          title={pickerMode === "co_conductor" ? "Add co-conductor" : "Transfer to conductor"}
          onSelect={(id) => runWithLocation(pickerMode, id)}
        />
      )}

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete draft trip?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={actionLoading}
        onCancel={() => setDeleteConfirmVisible(false)}
        onConfirm={() => {
          void confirmDeleteDraft();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: "center" },
  content: { padding: spacing.xl, paddingBottom: spacing.massive },
  back: { marginBottom: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardTitle: { ...typography.body, fontWeight: "700", marginBottom: spacing.sm },
  row: { ...typography.bodySmall, color: colors.textPrimary, marginBottom: spacing.xs },
  muted: { ...typography.caption, color: colors.textSecondary },
  flagRow: { marginTop: spacing.sm, gap: spacing.xs },
  flag: { ...typography.caption, color: colors.textSecondary },
  flagOpen: { ...typography.caption, color: colors.success },
  flagLocked: { ...typography.caption, color: colors.warning },
  flagExtra: { ...typography.caption, color: colors.error },
  pendingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  pendingTitle: { ...typography.body, fontWeight: "700", color: colors.warning, marginBottom: spacing.xs },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  primaryBtnText: { ...typography.button, color: colors.white },
  primaryBtnDisabled: { opacity: 0.55 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  secondaryBtnText: { ...typography.button, color: colors.primary },
  busProofPreview: {
    width: "100%",
    height: 160,
    borderRadius: radius.md,
    marginVertical: spacing.md,
  },
  draftActions: { marginTop: spacing.sm },
  publishBtn: { marginBottom: spacing.md },
  secondaryBtnLoading: { marginBottom: spacing.md },
  deleteLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  deleteLinkText: { ...typography.caption, color: colors.error, fontWeight: "600" },
});
