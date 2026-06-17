import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

type HandoffCodeRow = {
  id: string;
  parcel_id: string;
  step: string;
  expected_code: string;
  expires_at: string;
  used_at: string | null;
  blocked: boolean;
  attempts: number;
  max_attempts: number;
  created_at: string;
};

export default function MyHandoffCodesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<HandoffCodeRow[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("handoff_codes")
      .select("*")
      .eq("to_user_id", user.id)
      .is("used_at", null)
      .eq("blocked", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("MyHandoffCodes:", error);
      setCodes([]);
    } else {
      setCodes((data || []) as any);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: HandoffCodeRow }) => {
    const expiresInMin = Math.max(
      0,
      Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (60 * 1000))
    );
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.code}>{item.expected_code}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{expiresInMin} min</Text>
          </View>
        </View>
        <Text style={styles.meta}>Step: {item.step}</Text>
        <Text style={styles.meta}>Parcel: {item.parcel_id.slice(0, 8)}</Text>
        <Text style={styles.meta}>
          Attempts: {item.attempts}/{item.max_attempts}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Handoff Codes</Text>
          <TouchableOpacity onPress={load} style={styles.refreshBtn} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={codes}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="key-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No active codes</Text>
                <Text style={styles.emptySubtitle}>
                  When a sender issues a handoff, your code will appear here.
                </Text>
              </View>
            }
            contentContainerStyle={codes.length ? undefined : { flex: 1 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: { ...typography.h2, color: colors.textPrimary },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  refreshText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { ...typography.body, color: colors.textPrimary, marginTop: spacing.md, fontWeight: "700" },
  emptySubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  code: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  badge: {
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: { ...typography.caption, color: colors.textPrimary, fontWeight: "700" },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});

