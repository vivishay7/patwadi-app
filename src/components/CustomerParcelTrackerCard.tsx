import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CustodyEvent, SimplifiedParcelState } from "../lib/db/types";
import {
  CUSTOMER_STATUS_LABELS,
  TRACKER_STAGE_ORDER,
  formatStatusDate,
  deriveCustomerParcelStatus,
  getDeliveryProofPath,
  trackerStageIndex,
} from "../lib/domain/customerParcelStatus";
import { getCustodyProofDisplayUri } from "../services/custodyService";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

interface CustomerParcelTrackerCardProps {
  events: CustodyEvent[];
  blockedException?: boolean;
  orderCreatedAt?: string;
  compact?: boolean;
}

export default function CustomerParcelTrackerCard({
  events,
  blockedException,
  orderCreatedAt,
  compact = false,
}: CustomerParcelTrackerCardProps) {
  const status = deriveCustomerParcelStatus({ events, blockedException, orderCreatedAt });
  const currentIndex = trackerStageIndex(status.state);
  const [podUrl, setPodUrl] = useState<string | null>(null);
  const [podLoading, setPodLoading] = useState(false);
  const [podFailed, setPodFailed] = useState(false);

  useEffect(() => {
    if (status.state !== "delivered") {
      setPodUrl(null);
      return;
    }
    const path = getDeliveryProofPath(events);
    if (!path) return;

    let cancelled = false;
    setPodLoading(true);
    setPodFailed(false);
    getCustodyProofDisplayUri(path)
      .then((uri) => {
        if (!cancelled) {
          setPodUrl(uri);
          if (!uri) setPodFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setPodLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [events, status.state]);

  if (status.state === "blocked_exception") {
    return (
      <View style={styles.card}>
        <View style={styles.exceptionRow}>
          <Ionicons name="alert-circle" size={22} color={colors.error} />
          <Text style={styles.exceptionText}>{status.label}</Text>
        </View>
        {status.lastUpdatedAt && (
          <Text style={styles.lastUpdated}>
            Last updated — {formatStatusDate(status.lastUpdatedAt)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {!compact && status.lastUpdatedAt && (
        <Text style={styles.lastUpdated}>
          Last updated — {formatStatusDate(status.lastUpdatedAt)}
        </Text>
      )}

      {TRACKER_STAGE_ORDER.map((stage, index) => {
        const reached = currentIndex >= index;
        const isCurrent = currentIndex === index;
        const stageDate = status.stageDates[stage];
        const label = CUSTOMER_STATUS_LABELS[stage];

        return (
          <View key={stage} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View
                style={[
                  styles.dot,
                  reached && styles.dotReached,
                  isCurrent && styles.dotCurrent,
                ]}
              />
              {index < TRACKER_STAGE_ORDER.length - 1 && (
                <View style={[styles.connector, reached && styles.connectorReached]} />
              )}
            </View>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent && styles.stepLabelCurrent,
                  !reached && styles.stepLabelFuture,
                ]}
              >
                {label}
                {stageDate && reached ? ` — ${formatStatusDate(stageDate)}` : ""}
              </Text>
              {isCurrent && compact && status.lastUpdatedAt && (
                <Text style={styles.stepMeta}>
                  Last updated — {formatStatusDate(status.lastUpdatedAt)}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      {status.state === "delivered" && (
        <View style={styles.podSection}>
          <Text style={styles.podTitle}>Proof of delivery</Text>
          {podLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.podLoader} />
          ) : podUrl ? (
            <Image
              source={{ uri: podUrl }}
              style={styles.podImage}
              resizeMode="cover"
              onError={() => setPodFailed(true)}
            />
          ) : podFailed ? (
            <Text style={styles.podMissing}>Delivery photo could not be loaded.</Text>
          ) : (
            <Text style={styles.podMissing}>Delivery photo will appear here when available.</Text>
          )}
        </View>
      )}

      <Text style={styles.hint}>
        Status is derived from custody acknowledgments (code + mandatory photo proof).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 44,
  },
  stepRail: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderDark,
    backgroundColor: colors.surface,
  },
  dotReached: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  dotCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderLight,
    marginVertical: 2,
  },
  connectorReached: {
    backgroundColor: colors.secondary,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  stepLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  stepLabelCurrent: {
    fontWeight: "700",
    color: colors.primary,
  },
  stepLabelFuture: {
    color: colors.textSecondary,
  },
  stepMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  exceptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exceptionText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
    fontWeight: "600",
  },
  podSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  podTitle: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  podImage: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  podLoader: {
    marginVertical: spacing.lg,
  },
  podMissing: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
