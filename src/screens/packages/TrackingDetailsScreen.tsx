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
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import CustomerParcelTrackerCard from "../../components/CustomerParcelTrackerCard";
import CustomerTrustStrip from "../../components/CustomerTrustStrip";
import SupportSheet from "../../components/SupportSheet";
import { deriveCustomerParcelStatus } from "../../lib/domain/customerParcelStatus";
import { CUSTOMER_SUPPORT_ISSUE_TYPES } from "../../lib/support/supportConfig";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "TrackingDetails">;
type RouteProps = RouteProp<RootStackParamList, "TrackingDetails">;

export default function TrackingDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const orderId = route.params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<CustodyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportVisible, setSupportVisible] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Tracking</Text>
            <Text style={styles.subtitle}>Order #{order.id.slice(0, 8)}</Text>
          </View>
        </View>

        <CustomerParcelTrackerCard
          events={events}
          blockedException={order.blocked_exception}
          orderCreatedAt={order.created_at}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>

          <View style={styles.routeRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={styles.routeText}>{order.pickup_location}</Text>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeRow}>
            <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.routeText}>{order.dropoff_location}</Text>
          </View>

          {order.corridor_key && (
            <Text style={styles.corridor}>Corridor: {order.corridor_key}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => setSupportVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
          <Text style={styles.supportButtonText}>Get help on WhatsApp</Text>
        </TouchableOpacity>

        <CustomerTrustStrip style={styles.trustStrip} />
      </ScrollView>

      {status && (
        <SupportSheet
          visible={supportVisible}
          onClose={() => setSupportVisible(false)}
          context={{
            audience: "customer",
            orderId: order.id,
            corridor: order.corridor_key,
            stageLabel: status.label,
          }}
          issueTypes={CUSTOMER_SUPPORT_ISSUE_TYPES}
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
    paddingBottom: spacing.xl,
    flexGrow: 1,
    gap: spacing.lg,
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
    marginBottom: spacing.sm,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  routeText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: colors.borderLight,
    marginLeft: 10,
    marginVertical: spacing.sm,
  },
  corridor: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  supportButtonText: {
    ...typography.body,
    color: colors.success,
    fontWeight: "600",
  },
  trustStrip: {
    marginTop: spacing.sm,
  },
});
