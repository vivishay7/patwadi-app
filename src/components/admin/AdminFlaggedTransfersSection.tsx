import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, RefreshControl, ScrollView } from "react-native";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { fetchFlaggedTransfers } from "../../services/adminService";
import type { LinehaulTripTransferRequest } from "../../lib/db/types";
import EmptyState from "../EmptyState";
import ListSkeleton from "../ListSkeleton";

export default function AdminFlaggedTransfersSection() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<LinehaulTripTransferRequest[]>([]);

  const load = useCallback(async () => {
    try {
      setRows(await fetchFlaggedTransfers());
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load transfers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <ListSkeleton rows={2} />;
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
      }
      showsVerticalScrollIndicator={false}
    >
      {!rows.length ? (
        <EmptyState
          title="No flagged transfers"
          message="Transfers requiring admin review will appear here."
        />
      ) : (
        rows.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.id}>Trip {r.trip_id.slice(0, 8)}…</Text>
            <Text style={styles.meta}>
              {r.from_conductor_id.slice(0, 8)}… → {r.to_conductor_id.slice(0, 8)}…
            </Text>
            <Text style={styles.meta}>Status: {r.status}</Text>
            {r.risk_reasons?.length ? (
              <Text style={styles.flags}>Flags: {r.risk_reasons.join(", ")}</Text>
            ) : (
              <Text style={styles.flags}>Flags: (none recorded)</Text>
            )}
            {r.reason ? <Text style={styles.reason}>{r.reason}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  id: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  flags: { ...typography.bodySmall, color: colors.textPrimary, marginTop: spacing.sm },
  reason: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
