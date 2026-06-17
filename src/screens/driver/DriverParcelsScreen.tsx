import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { OperatorTabParamList } from "../../navigation/MainTabs";
import { fetchOperatorOrders, getAvailableOrders, fetchAvailableParcelsForLinehaul, type AvailableParcelRow } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";
import { supabase } from "../../lib/supabase";
import { Order } from "../../lib/db/types";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "../../components/EmptyState";
import ListSkeleton from "../../components/ListSkeleton";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ParcelsRoute = RouteProp<OperatorTabParamList, "Parcels">;

export default function DriverParcelsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ParcelsRoute>();
  const { user } = useAuth();
  const { role } = useRole();
  const isLinehaul = role === "linehaul";
  const [orders, setOrders] = useState<(Order | AvailableParcelRow)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAccountEmail(null);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null);
    });
  }, [user?.id]);

  useEffect(() => {
    if (route.params?.showAvailable) {
      setShowAvailable(true);
    }
  }, [route.params?.showAvailable]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      if (showAvailable) {
        const data = isLinehaul
          ? await fetchAvailableParcelsForLinehaul()
          : await getAvailableOrders();
        setOrders(data);
      } else {
        // Assigned orders via operator_order_view (v6 §14):
        // scoped server-side to lmp_pickup_id / linehaul_id / lmp_delivery_id.
        const data = await fetchOperatorOrders();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, showAvailable, isLinehaul]);

  useEffect(() => {
    if (!user?.id) return;
    setOrders([]);
    setLoading(true);
    loadOrders();
  }, [user?.id, loadOrders]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return colors.warning;
      case "accepted":
        return colors.info;
      case "in_transit":
        return colors.primary;
      case "delivered":
        return colors.success;
      case "cancelled":
        return colors.error;
      default:
        return colors.textSecondary;
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

  const renderOrderItem = ({ item }: { item: Order | AvailableParcelRow }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        if (showAvailable && isLinehaul) {
          const row = item as AvailableParcelRow;
          navigation.navigate("DriverParcelDetails", {
            orderId: row.id,
            availableParcel: row,
          });
        } else {
          navigation.navigate("DriverParcelDetails", { orderId: item.id });
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {/* operator_order_view excludes legacy status (v6 §14) — badge only when present */}
        {item.status && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        )}
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

      {item.price_estimate && (
        <Text style={styles.price}>₹{item.price_estimate}</Text>
      )}

      <View style={styles.orderFooter}>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <EmptyState
      title={showAvailable ? "No available jobs" : "No parcels assigned"}
      message={
        showAvailable
          ? isLinehaul
            ? "No parcels match your open trip corridor right now."
            : "Check back later for new orders"
          : "You don't have any assigned parcels yet"
      }
      icon={<Ionicons name="cube-outline" size={64} color={colors.textSecondary} />}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <Text style={styles.title}>{showAvailable ? "Available Jobs" : "My Parcels"}</Text>
          <ListSkeleton rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {showAvailable ? "Available Jobs" : "My Parcels"}
            </Text>
            {accountEmail ? (
              <Text style={styles.accountEmail}>{accountEmail}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowAvailable(!showAvailable)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {showAvailable ? "My Parcels" : "Available Jobs"}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={renderEmpty}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  accountEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
  },
  list: {
    paddingBottom: spacing.massive,
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
  },
});






