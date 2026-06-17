import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { CustomerTabParamList } from "../../navigation/MainTabs";
import { fetchOrders, getOrderById } from "../../services/orderService";
import { fetchCustodyEventsForParcels } from "../../services/custodyService";
import { useAuth } from "../../context/AuthContext";
import { Order, CustodyEvent } from "../../lib/db/types";
import {
  deriveCustomerParcelStatus,
  getCustomerStatusColor,
  formatStatusDate,
} from "../../lib/domain/customerParcelStatus";
import CustomerTrustStrip from "../../components/CustomerTrustStrip";
import EmptyState from "../../components/EmptyState";
import { LoadingButton } from "../../components/LoadingButton";
import ListSkeleton from "../../components/ListSkeleton";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PackagesRoute = RouteProp<CustomerTabParamList, "Packages">;

export default function MyPackagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PackagesRoute>();
  const trackInputRef = useRef<TextInput>(null);
  const { user, isGuest } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [eventsByOrder, setEventsByOrder] = useState<Record<string, CustodyEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchOrders(user.id);
      setOrders(data);
      const eventsMap = await fetchCustodyEventsForParcels(data.map((o) => o.id));
      setEventsByOrder(eventsMap);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
      if (route.params?.openTrack) {
        setTimeout(() => trackInputRef.current?.focus(), 300);
      }
    }, [loadOrders, route.params?.openTrack])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleTrackOrder = async () => {
    if (!trackingOrderId.trim()) {
      Alert.alert("Error", "Please enter an order ID");
      return;
    }

    setTrackingLoading(true);
    try {
      const order = await getOrderById(trackingOrderId.trim());
      if (order) {
        navigation.navigate("TrackingDetails", { orderId: order.id });
      } else {
        Alert.alert("Order Not Found", "Please check the order ID and try again.");
      }
    } catch (error) {
      console.error("Error tracking order:", error);
      Alert.alert("Error", "Failed to track order. Please try again.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const events = eventsByOrder[item.id] ?? [];
    const { state, label, lastUpdatedAt } = deriveCustomerParcelStatus({
      events,
      blockedException: item.blocked_exception,
      orderCreatedAt: item.created_at,
    });
    const statusColor = getCustomerStatusColor(state);

    return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("PackageDetails", { orderId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {label}
          </Text>
        </View>
      </View>

      <View style={styles.orderRoute}>
        <View style={styles.routePoint}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.pickup_location}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.dropoff_location}
          </Text>
        </View>
      </View>

      {lastUpdatedAt ? (
        <Text style={styles.statusMeta}>
          Updated {formatStatusDate(lastUpdatedAt)}
        </Text>
      ) : null}

      {item.price_estimate != null && (
        <Text style={styles.price}>₹{item.price_estimate}</Text>
      )}

      <View style={styles.orderFooter}>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      title="No packages yet"
      message="Start by sending your first parcel"
      icon={<Ionicons name="cube-outline" size={64} color={colors.textSecondary} />}
      action={
        <LoadingButton title="Send parcel" onPress={() => navigation.navigate("SendParcel")} />
      }
    />
  );

  const renderTrackingSection = () => (
    <View style={styles.trackingSection}>
      <Text style={styles.trackingTitle}>Track a Package</Text>
      <Text style={styles.trackingSubtitle}>Enter your order ID to track your parcel</Text>
      <View style={styles.trackingInputContainer}>
        <TextInput
          ref={trackInputRef}
          style={styles.trackingInput}
          placeholder="Enter Order ID"
          placeholderTextColor={colors.textSecondary}
          value={trackingOrderId}
          onChangeText={setTrackingOrderId}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={handleTrackOrder}
        />
        <TouchableOpacity
          style={[styles.trackButton, trackingLoading && styles.trackButtonDisabled]}
          onPress={handleTrackOrder}
          disabled={trackingLoading || !trackingOrderId.trim()}
          activeOpacity={0.8}
        >
          {trackingLoading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="search" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderListFooter = () =>
    orders.length > 0 ? <CustomerTrustStrip style={styles.listFooter} /> : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <Text style={styles.title}>My Packages</Text>
          <ListSkeleton rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>My Packages</Text>

        {/* Tracking section for guests */}
        {isGuest && renderTrackingSection()}

        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderListFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
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
    padding: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  list: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  orderDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: "600",
  },
  orderRoute: {
    marginBottom: spacing.md,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.borderLight,
    marginLeft: 8,
    marginVertical: spacing.xs,
  },
  routeText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  statusMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  price: {
    ...typography.body,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  orderFooter: {
    alignItems: "flex-end",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.massive * 2,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  emptyButtonText: {
    ...typography.button,
    color: colors.white,
  },
  trackingSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  trackingTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  trackingSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  trackingInputContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  trackingInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  trackButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  trackButtonDisabled: {
    opacity: 0.6,
  },
  listFooter: {
    marginTop: spacing.lg,
  },
});



