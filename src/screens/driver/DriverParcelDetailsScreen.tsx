import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { getOperatorOrderById, acceptOrder } from "../../services/orderService";
import { attachParcelToTrip, fetchOpenTripsForAttach, requestTripTransfer, transferLinehaulParcel } from "../../services/tripService";
import { captureCurrentLocation } from "../../lib/location/captureCurrentLocation";
import ConductorPickerSheet from "../../components/ConductorPickerSheet";
import { formatTransferStatusMessage } from "../../lib/domain/transferDisplay";
import { fetchCustodyEvents } from "../../services/custodyService";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import { Order, CustodyEvent, LinehaulTrip } from "../../lib/db/types";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { deriveParcelState, getOperatorConfirmHandoffStep } from "../../lib/deriveParcelState";
import {
  getCustomerStatusColor,
  getCustomerStatusLabel,
} from "../../lib/domain/customerParcelStatus";
import SupportSheet from "../../components/SupportSheet";
import { OPERATOR_SUPPORT_ISSUE_TYPES } from "../../lib/support/supportConfig";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "DriverParcelDetails">;

export default function DriverParcelDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { role } = useRole();
  const isLinehaul = role === "linehaul";
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [openTrips, setOpenTrips] = useState<LinehaulTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [transferPickerOpen, setTransferPickerOpen] = useState(false);

  const orderId =
    route.params?.orderId || (route.params?.parcel ? route.params.parcel.id : null);
  const availableParcel = route.params?.availableParcel;

  useEffect(() => {
    if (orderId || availableParcel) {
      loadOrder();
    } else {
      setLoading(false);
    }
  }, [orderId, availableParcel?.id]);

  const loadOrder = async () => {
    if (!orderId && !availableParcel) return;

    try {
      let data: Order | null = null;
      let custodyEvents: CustodyEvent[] = [];

      if (orderId) {
        [data, custodyEvents] = await Promise.all([
          getOperatorOrderById(orderId),
          fetchCustodyEvents(orderId),
        ]);
      }

      if (!data && availableParcel) {
        data = {
          id: availableParcel.id,
          pickup_location: availableParcel.pickup_location,
          dropoff_location: availableParcel.dropoff_location,
          weight_kg: availableParcel.weight_kg ?? undefined,
          corridor_key: availableParcel.corridor_key ?? undefined,
          created_at: availableParcel.created_at,
          status: "pending",
        } as Order;
      }

      setOrder(data);
      setEvents(custodyEvents);
      if (isLinehaul && user?.id && data && !data.trip_id) {
        setOpenTrips(await fetchOpenTripsForAttach(user.id));
      }
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachToTrip = async (tripId: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const result = await attachParcelToTrip(order.id, tripId);
      if ("error" in result) {
        Alert.alert("Cannot attach", result.error);
        return;
      }
      Alert.alert("Attached", "Parcel added to your trip.");
      await loadOrder();
    } finally {
      setUpdating(false);
    }
  };

  const offerTripTransferAfterParcel = (tripId: string, toConductorId: string) => {
    Alert.alert(
      "Also transfer the trip?",
      "The receiving conductor can take the whole trip and remaining parcels. They will need to accept the load.",
      [
        { text: "Parcel only", style: "cancel" },
        {
          text: "Transfer trip too",
          onPress: () => {
            void (async () => {
              setUpdating(true);
              const fromLoc = await captureCurrentLocation();
              const toLoc = await captureCurrentLocation();
              const result = await requestTripTransfer({
                tripId,
                toConductorId,
                fromLocation: fromLoc.ok ? fromLoc.location : null,
                toLocation: toLoc.ok ? toLoc.location : null,
                toLocationReadFailed: !toLoc.ok,
                reason: "Offered after parcel transfer",
              });
              setUpdating(false);
              if ("error" in result) {
                Alert.alert("Trip transfer failed", result.error);
                return;
              }
              Alert.alert(
                "Trip transfer requested",
                formatTransferStatusMessage(result.request, "sender")
              );
            })();
          },
        },
      ]
    );
  };

  const handleTransferParcel = async (toConductorId: string) => {
    if (!order || !user?.id) return;
    const tripId = order.trip_id;
    setUpdating(true);
    try {
      const result = await transferLinehaulParcel(order.id, toConductorId);
      if ("error" in result) {
        Alert.alert("Cannot transfer parcel", result.error);
        return;
      }
      Alert.alert("Parcel transferred", "Custody moved to the other conductor.");
      await loadOrder();
      if (tripId) {
        offerTripTransferAfterParcel(tripId, toConductorId);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleAccept = async () => {
    if (!order || !user?.id) return;

    setUpdating(true);
    try {
      const updated = await acceptOrder(order.id, user.id);
      if (updated) {
        setOrder(updated);
        Alert.alert("Success", "Order accepted successfully");
      } else {
        Alert.alert("Error", "Failed to accept order. It may have been taken by another driver.");
      }
    } catch (error) {
      console.error("Accept order error:", error);
      Alert.alert("Error", "Failed to accept order");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "in_transit":
        return "In Transit";
      case "delivered":
        return "Delivered";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order && !availableParcel) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAvailable =
    order.status === "pending" && !order.driver_id && !order.trip_id;
  const isAssigned =
    !!order.trip_id ||
    !!order.driver_id ||
    !!order.linehaul_id ||
    !!order.lmp_pickup_id ||
    !!order.lmp_delivery_id;
  const canAttachLinehaul =
    isLinehaul && !order.trip_id && openTrips.length > 0;
  const canTransferParcel =
    isLinehaul &&
    !!user?.id &&
    !!order.linehaul_id &&
    order.linehaul_id === user.id &&
    !!order.trip_id;
  const canAccept = isAvailable && user?.id && !isLinehaul;

  // Until the full operator assignment model is wired into UI, we only remove status mutation.
  // Handoffs are confirmed via custody events.
  const derived = deriveParcelState({ events, blockedException: (order as any).blocked_exception });
  const statusLabel = getCustomerStatusLabel(derived);
  const statusColor = getCustomerStatusColor(derived);
  const handoffStep =
    user?.id
      ? getOperatorConfirmHandoffStep({
          events,
          userId: user.id,
          order,
        })
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Parcel Details</Text>
            <Text style={styles.subtitle}>Order #{order.id.slice(0, 8)}</Text>
          </View>
        </View>

        {/* Status Card (derived) */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={[styles.statusValue, { color: statusColor }]}>{statusLabel}</Text>
          {order.updated_at && (
            <Text style={styles.lastUpdate}>
              Last updated: {new Date(order.updated_at).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Route Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          
          <View style={styles.routeSection}>
            <View style={styles.routePoint}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>{order.pickup_location}</Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Dropoff</Text>
                <Text style={styles.routeAddress}>{order.dropoff_location}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Package Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Package Details</Text>
          
          {order.weight_kg && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{order.weight_kg} kg</Text>
            </View>
          )}

          {order.dimensions && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dimensions</Text>
              <Text style={styles.detailValue}>
                {order.dimensions.length} × {order.dimensions.width} × {order.dimensions.height} cm
              </Text>
            </View>
          )}

          {order.contents && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contents</Text>
              <Text style={styles.detailValue}>{order.contents}</Text>
            </View>
          )}

          {order.price_estimate && (
            <View style={[styles.detailRow, styles.priceRow]}>
              <Text style={styles.detailLabel}>Estimated Price</Text>
              <Text style={styles.priceValue}>₹{order.price_estimate}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {canAttachLinehaul && (
          <View style={styles.attachBlock}>
            <Text style={styles.attachTitle}>Attach to trip</Text>
            {openTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.acceptButton}
                onPress={() => handleAttachToTrip(trip.id)}
                disabled={updating}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptButtonText}>
                  {trip.route_label} · {trip.bus_number}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {canAccept && (
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            disabled={updating}
            activeOpacity={0.8}
          >
            {updating ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.acceptButtonText}>Accept Order</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canTransferParcel && (
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => setTransferPickerOpen(true)}
            disabled={updating}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
            <Text style={styles.updateButtonText}>Transfer parcel to conductor</Text>
          </TouchableOpacity>
        )}

        {isAssigned && handoffStep && (
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() =>
              navigation.navigate("ConfirmHandoff", {
                parcelId: order.id,
                step: handoffStep,
              })
            }
            disabled={updating}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            <Text style={styles.updateButtonText}>Confirm Handoff</Text>
          </TouchableOpacity>
        )}

        {isAssigned && !handoffStep && derived !== "delivered" && (
          <View style={styles.waitingCard}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.waitingText}>
              Waiting for the prior custody handoff before you can confirm.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.supportLink}
          onPress={() => setSupportVisible(true)}
          activeOpacity={0.6}
        >
          <Text style={styles.supportLinkText}>Contact support</Text>
        </TouchableOpacity>
      </ScrollView>

      {user?.id && (
        <ConductorPickerSheet
          visible={transferPickerOpen}
          onClose={() => setTransferPickerOpen(false)}
          currentConductorId={user.id}
          title="Transfer parcel to"
          onSelect={(id) => void handleTransferParcel(id)}
        />
      )}

      {user?.id && (
        <SupportSheet
          visible={supportVisible}
          onClose={() => setSupportVisible(false)}
          context={{
            audience: "operator",
            operatorId: user.id,
            tripId: order.trip_id,
            parcelId: order.id,
            corridor: order.corridor_key,
            stepOrState: statusLabel,
          }}
          issueTypes={OPERATOR_SUPPORT_ISSUE_TYPES}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.massive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  backButton: {
    marginRight: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  statusLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  lastUpdate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  routeSection: {
    marginBottom: spacing.md,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  routeContent: {
    flex: 1,
  },
  routeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  routeAddress: {
    ...typography.body,
    color: colors.textPrimary,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.borderLight,
    marginLeft: 10,
    marginVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  priceRow: {
    borderBottomWidth: 0,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  priceValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "700",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  attachBlock: {
    marginTop: spacing.lg,
  },
  attachTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  acceptButtonText: {
    ...typography.button,
    color: colors.white,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  updateButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  supportLink: {
    alignSelf: "center",
    marginTop: spacing.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  supportLinkText: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.65,
    textDecorationLine: "underline",
  },
  waitingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  waitingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
});

