import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { fetchOrders } from "../services/orderService";
import { fetchCustodyEventsForParcels } from "../services/custodyService";
import { buildCustomerNotificationFeed } from "../lib/domain/customerNotifications";
import EmptyState from "../components/EmptyState";
import ListSkeleton from "../components/ListSkeleton";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, isGuest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ReturnType<typeof buildCustomerNotificationFeed>>([]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const orders = await fetchOrders(user.id);
      const eventsMap = await fetchCustodyEventsForParcels(orders.map((o) => o.id));
      setItems(buildCustomerNotificationFeed(orders, eventsMap));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.heading}>Shipment activity</Text>
        <Text style={styles.subheading}>
          Status updates from your orders (in-app feed — not push).
        </Text>

        {loading ? (
          <ListSkeleton rows={3} />
        ) : isGuest || !user?.id ? (
          <EmptyState
            title="Sign in to see activity"
            message="Shipment updates appear here once you are signed in."
            icon={<Ionicons name="notifications-outline" size={56} color={colors.textSecondary} />}
            action={
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.8}
              >
                <Text style={styles.signInText}>Sign in</Text>
              </TouchableOpacity>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No activity yet"
            message="Shipment updates will show up here when your parcels move."
            icon={<Ionicons name="cube-outline" size={56} color={colors.textSecondary} />}
          />
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("TrackingDetails", { orderId: item.orderId })
              }
            >
              <View style={styles.iconCircle}>
                <Ionicons name="cube-outline" size={20} color={colors.white} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.dark}
                style={styles.chevron}
              />
            </TouchableOpacity>
          ))
        )}
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
    flexGrow: 1,
  },
  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  signInText: {
    ...typography.button,
    color: colors.white,
  },
});
