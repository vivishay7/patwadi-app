import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { getUserDisplayName } from "../../lib/userDisplayName";
import { fetchOrders } from "../../services/orderService";
import { fetchCustodyEventsForParcels } from "../../services/custodyService";
import { Order, CustodyEvent } from "../../lib/db/types";
import {
  deriveCustomerParcelStatus,
  formatStatusDate,
} from "../../lib/domain/customerParcelStatus";
import CustomerParcelTrackerCard from "../../components/CustomerParcelTrackerCard";
import CustomerTrustStrip from "../../components/CustomerTrustStrip";
import LanguageToggle from "../../components/LanguageToggle";
import { useLocale } from "../../context/LocaleContext";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function welcomeName(user: { full_name?: string | null; email?: string | null; phone?: string | null }, accountEmail: string | null): string {
  return getUserDisplayName({
    fullName: user.full_name,
    email: user.email || accountEmail,
    phone: user.phone,
  });
}

function findMostRecentActiveOrder(
  orders: Order[],
  eventsByOrder: Record<string, CustodyEvent[]>
): Order | null {
  for (const order of orders) {
    const events = eventsByOrder[order.id] ?? [];
    const { state } = deriveCustomerParcelStatus({
      events,
      blockedException: order.blocked_exception,
      orderCreatedAt: order.created_at,
    });
    if (state !== "delivered") return order;
  }
  return null;
}

export default function CustomerHome() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeEvents, setActiveEvents] = useState<CustodyEvent[]>([]);
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

  const load = useCallback(async () => {
    if (!user?.id) {
      setActiveOrder(null);
      setActiveEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const orders = await fetchOrders(user.id);
      const eventsMap = await fetchCustodyEventsForParcels(orders.map((o) => o.id));
      const active = findMostRecentActiveOrder(orders, eventsMap);
      setActiveOrder(active);
      setActiveEvents(active ? eventsMap[active.id] ?? [] : []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeStatus = activeOrder
    ? deriveCustomerParcelStatus({
        events: activeEvents,
        blockedException: activeOrder.blocked_exception,
        orderCreatedAt: activeOrder.created_at,
      })
    : null;

  const corridorLabel =
    activeOrder?.corridor_key?.replace("-", " → ") ||
    (activeOrder
      ? `${activeOrder.pickup_location} → ${activeOrder.dropoff_location}`
      : null);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {user?.id ? (
          <>
            <Text style={styles.title}>
              {t("welcome")}, {welcomeName(user ?? {}, accountEmail)}
            </Text>
            <Text style={styles.subtitle}>{t("welcomeSubtitleCustomer")}</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Send a Parcel</Text>
            <Text style={styles.subtitle}>Intercity parcel delivery</Text>
          </>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("PackageInfo")}
          activeOpacity={0.8}
        >
          <Ionicons name="cube-outline" size={24} color={colors.white} />
          <Text style={styles.primaryButtonText}>Send Parcel</Text>
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Main", { screen: "Packages" })}
            activeOpacity={0.7}
          >
            <Ionicons name="cube-outline" size={32} color={colors.primary} />
            <Text style={styles.actionLabel}>My Packages</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate("Main", { screen: "Packages", params: { openTrack: true } })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="navigate-outline" size={32} color={colors.primary} />
            <Text style={styles.actionLabel}>Track Package</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.sectionLoader} />
        ) : activeOrder && activeStatus ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active shipment</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("TrackingDetails", { orderId: activeOrder.id })
                }
              >
                <Text style={styles.sectionLink}>View tracking</Text>
              </TouchableOpacity>
            </View>
            {corridorLabel ? (
              <Text style={styles.corridor}>{corridorLabel}</Text>
            ) : null}
            <Text style={styles.stageMeta}>
              {activeStatus.label}
              {activeStatus.lastUpdatedAt
                ? ` — ${formatStatusDate(activeStatus.lastUpdatedAt)}`
                : ""}
            </Text>
            <CustomerParcelTrackerCard
              events={activeEvents}
              blockedException={activeOrder.blocked_exception}
              orderCreatedAt={activeOrder.created_at}
              compact
            />
          </View>
        ) : (
          <CustomerTrustStrip style={styles.trustStripSpacing} />
        )}

        <LanguageToggle />
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
    padding: spacing.xl,
    paddingBottom: spacing.massive,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xxl,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: spacing.md,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  actionCard: {
    backgroundColor: colors.surface,
    width: "48%",
    padding: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginTop: spacing.md,
    fontWeight: "500",
  },
  sectionLoader: {
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sectionLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  corridor: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  stageMeta: {
    ...typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  trustStripSpacing: {
    marginTop: spacing.md,
  },
});
