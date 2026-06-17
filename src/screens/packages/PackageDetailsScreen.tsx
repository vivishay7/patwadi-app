import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { getOrderById } from "../../services/orderService";
import { fetchCustodyEvents } from "../../services/custodyService";
import { Order, CustodyEvent } from "../../lib/db/types";
import {
  deriveCustomerParcelStatus,
  getCustomerStatusColor,
  formatStatusDate,
} from "../../lib/domain/customerParcelStatus";
import CustomerTrustStrip from "../../components/CustomerTrustStrip";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "PackageDetails">;

function getPackageDetailRows(order: Order): { label: string; value: string; price?: boolean }[] {
  const rows: { label: string; value: string; price?: boolean }[] = [];

  if (order.weight_kg != null) {
    rows.push({ label: "Weight", value: `${order.weight_kg} kg` });
  }
  if (order.dimensions) {
    rows.push({
      label: "Dimensions",
      value: `${order.dimensions.length} × ${order.dimensions.width} × ${order.dimensions.height} cm`,
    });
  }
  if (order.contents) {
    rows.push({ label: "Contents", value: order.contents });
  }
  if (order.corridor_key) {
    rows.push({
      label: "Corridor",
      value: order.corridor_key.replace(/-/g, " → "),
    });
  }
  if (order.payment_status) {
    const payment =
      order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1);
    rows.push({ label: "Payment", value: payment });
  }
  if (order.price_estimate != null) {
    rows.push({ label: "Estimated price", value: `₹${order.price_estimate}`, price: true });
  }
  if (order.final_price != null) {
    rows.push({ label: "Final price", value: `₹${order.final_price}`, price: true });
  }

  return rows;
}

export default function PackageDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const orderId = route.params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const [data, custodyEvents] = await Promise.all([
        getOrderById(orderId),
        fetchCustodyEvents(orderId),
      ]);
      setOrder(data);
      setEvents(custodyEvents);
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };

  const status = order
    ? deriveCustomerParcelStatus({
        events,
        blockedException: order.blocked_exception,
        orderCreatedAt: order.created_at,
      })
    : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
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

  const packageDetailRows = getPackageDetailRows(order);

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
            <Text style={styles.title}>Package Details</Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          {status && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getCustomerStatusColor(status.state) + "20" },
              ]}
            >
              <Text
                style={[styles.statusText, { color: getCustomerStatusColor(status.state) }]}
              >
                {status.label}
              </Text>
            </View>
          )}
          <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>
            Created {new Date(order.created_at).toLocaleString()}
          </Text>
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

          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => navigation.navigate("TrackingDetails", { orderId: order.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={20} color={colors.primary} />
            <Text style={styles.trackButtonText}>View Tracking</Text>
          </TouchableOpacity>
        </View>

        {/* Package Details */}
        {packageDetailRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Package Details</Text>

            {packageDetailRows.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.detailRow,
                  index === packageDetailRows.length - 1 && styles.detailRowLast,
                  row.price && styles.priceRow,
                ]}
              >
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={row.price ? styles.priceValue : styles.detailValue}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        <CustomerTrustStrip style={styles.trustStrip} />
      </ScrollView>
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
    paddingBottom: spacing.xl,
    flexGrow: 1,
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
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  statusText: {
    ...typography.body,
    fontWeight: "700",
  },
  orderId: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  orderDate: {
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
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  trackButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  priceRow: {
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
  trustStrip: {
    marginTop: spacing.xl,
  },
});

