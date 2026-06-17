import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import {
  fetchEligibleLinehaulConductors,
  fetchRecentCoConductorIds,
  type EligibleLinehaulConductor,
} from "../services/tripService";

interface ConductorPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  currentConductorId: string;
  title: string;
  onSelect: (conductorId: string) => void;
}

function conductorLabel(c: EligibleLinehaulConductor): string {
  if (c.phone) return c.phone;
  return `${c.id.slice(0, 8)}…${c.id.slice(-4)}`;
}

export default function ConductorPickerSheet({
  visible,
  onClose,
  currentConductorId,
  title,
  onSelect,
}: ConductorPickerSheetProps) {
  const [eligible, setEligible] = useState<EligibleLinehaulConductor[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([
      fetchEligibleLinehaulConductors(),
      fetchRecentCoConductorIds(currentConductorId),
    ])
      .then(([conductors, recent]) => {
        setEligible(
          conductors.filter((c) => c.id !== currentConductorId)
        );
        setRecentIds(recent.filter((id) => id !== currentConductorId));
      })
      .finally(() => setLoading(false));
  }, [visible, currentConductorId]);

  const eligibleById = useMemo(
    () => new Map(eligible.map((c) => [c.id, c])),
    [eligible]
  );

  const recentEligible = recentIds
    .map((id) => eligibleById.get(id))
    .filter((c): c is EligibleLinehaulConductor => !!c);

  const otherEligible = eligible.filter((c) => !recentIds.includes(c.id));

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  const renderRow = (c: EligibleLinehaulConductor) => (
    <TouchableOpacity
      key={c.id}
      style={styles.row}
      onPress={() => handleSelect(c.id)}
    >
      <Text style={styles.rowText}>{conductorLabel(c)}</Text>
      {c.phone ? (
        <Text style={styles.rowSub}>{c.id.slice(0, 8)}…</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Approved, available linehaul operators (§5 / §6.1). Same list used for
            co-conductor add and transfer.
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : eligible.length === 0 ? (
            <Text style={styles.empty}>
              No other eligible linehaul conductors right now.
            </Text>
          ) : (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              {recentEligible.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent co-conductors</Text>
                  {recentEligible.map(renderRow)}
                </View>
              ) : null}
              {otherEligible.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {recentEligible.length > 0 ? "All eligible" : "Eligible conductors"}
                  </Text>
                  {otherEligible.map(renderRow)}
                </View>
              ) : null}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { ...typography.h2, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  loader: { marginVertical: spacing.lg },
  scroll: { maxHeight: 360 },
  section: { marginBottom: spacing.md, gap: spacing.sm },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  rowText: { ...typography.bodySmall, color: colors.textPrimary },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
});
