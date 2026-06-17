import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import { AdminStackParamList } from "../../navigation/AdminStack";
import { adminResolveBlocked, fetchAdminParcelDetails } from "../../services/adminService";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";

type RouteProps = RouteProp<AdminStackParamList, "AdminParcelDetails">;

export default function AdminParcelDetailsScreen() {
  const route = useRoute<RouteProps>();
  const orderId = route.params.orderId;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await fetchAdminParcelDetails(orderId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const unblock = async () => {
    setActing(true);
    try {
      await adminResolveBlocked({ parcelId: orderId, unblock: true, reason: "Reviewed by admin" });
      Alert.alert("Success", "Parcel unblocked");
      await load();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setActing(false);
    }
  };

  const regen = async () => {
    setActing(true);
    try {
      await adminResolveBlocked({ parcelId: orderId, unblock: false, reason: "Regenerate handoff code" });
      Alert.alert("Success", "Handoff code regenerated");
      await load();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;
  const { order, events, codes } = data;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Parcel #{order.id.slice(0, 8)}</Text>
        <Text style={styles.meta}>Payment: {order.payment_status || "pending"}</Text>
        <Text style={styles.meta}>Blocked: {(order as any).blocked_exception ? "yes" : "no"}</Text>
        <Text style={styles.meta}>Corridor: {order.corridor_key || "-"}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custody events</Text>
          {events.length ? (
            events.map((e: any) => (
              <View key={e.id} style={styles.item}>
                <Text style={styles.itemTitle}>{e.from_role} → {e.to_role}</Text>
                <Text style={styles.itemMeta}>{new Date(e.created_at).toLocaleString()}</Text>
                <Text style={styles.itemMeta}>proof: {e.proof_type} | {e.proof_value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No custody events yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Handoff codes</Text>
          {codes.length ? (
            codes.map((c: any) => (
              <View key={c.id} style={styles.item}>
                <Text style={styles.itemTitle}>{c.step}</Text>
                <Text style={styles.itemMeta}>
                  attempts: {c.attempts}/{c.max_attempts} | blocked: {c.blocked ? "yes" : "no"} | used: {c.used_at ? "yes" : "no"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No handoff codes.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.primary} onPress={unblock} disabled={acting}>
          <Text style={styles.primaryText}>Unblock Parcel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={regen} disabled={acting}>
          <Text style={styles.secondaryText}>Regenerate Active Step Code</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: spacing.xl, paddingBottom: spacing.massive },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  meta: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  sectionTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "700", marginBottom: spacing.sm },
  item: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  itemTitle: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: "600" },
  itemMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  empty: { ...typography.caption, color: colors.textSecondary },
  primary: { marginTop: spacing.xl, backgroundColor: colors.primary, paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: "center" },
  primaryText: { ...typography.button, color: colors.white },
  secondary: { marginTop: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: "center" },
  secondaryText: { ...typography.buttonSmall, color: colors.primary },
});

