import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { TRUST_STATS } from "../constants/marketing";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.trustItem}>
      <Text style={styles.trustValue}>{value}</Text>
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

export default function CustomerTrustStrip({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.trustStrip, style]}>
      <Text style={styles.trustTitle}>Why Patwadi</Text>
      <View style={styles.trustRow}>
        <TrustStat value={TRUST_STATS.onTimePercent} label="on-time" />
        <TrustStat value={TRUST_STATS.deliveriesLabel} label="deliveries" />
        <TrustStat value={TRUST_STATS.statesLabel} label="coverage" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trustStrip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  trustTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  trustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trustItem: {
    flex: 1,
    alignItems: "center",
  },
  trustValue: {
    ...typography.h2,
    color: colors.primary,
  },
  trustLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
