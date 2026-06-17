import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "../../navigation/AdminStack";
import { fetchAdminParcels } from "../../services/adminService";
import { fetchCustodyEventsForParcels } from "../../services/custodyService";
import { deriveParcelState } from "../../lib/deriveParcelState";
import { CustodyEvent, Order } from "../../lib/db/types";
import EmptyState from "../../components/EmptyState";
import ListSkeleton from "../../components/ListSkeleton";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";

type Nav = NativeStackNavigationProp<AdminStackParamList, "AdminParcels">;

export default function AdminParcelsScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [eventsByParcel, setEventsByParcel] = useState<Record<string, CustodyEvent[]>>({});
  const [query, setQuery] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminParcels({ blockedOnly });
      const eventsMap = await fetchCustodyEventsForParcels(data.map((o) => o.id));
      setOrders(data);
      setEventsByParcel(eventsMap);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [blockedOnly]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const filtered = orders.filter((o) => o.id.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Parcels Overview</Text>
          <TouchableOpacity onPress={() => setBlockedOnly((b) => !b)} style={styles.filter}>
            <Text style={styles.filterText}>{blockedOnly ? "Show All" : "Blocked Only"}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search by parcel/order id"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />

        {loading ? (
          <ListSkeleton rows={3} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            contentContainerStyle={filtered.length === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={
              <EmptyState title="No parcels" message="Orders will appear here as customers book." />
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("AdminParcelDetails", { orderId: item.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.id}>#{item.id.slice(0, 8)}</Text>
                <Text style={styles.route}>{item.pickup_location} → {item.dropoff_location}</Text>
                <View style={styles.row}>
                  <Text style={styles.meta}>pay: {item.payment_status || "pending"}</Text>
                  <Text style={styles.meta}>
                    state: {deriveParcelState({
                      events: eventsByParcel[item.id] || [],
                      blockedException: (item as any).blocked_exception,
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  filter: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, backgroundColor: colors.surface },
  filterText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, marginBottom: spacing.sm },
  id: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  route: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  meta: { ...typography.caption, color: colors.textSecondary },
  emptyList: { flexGrow: 1 },
});

