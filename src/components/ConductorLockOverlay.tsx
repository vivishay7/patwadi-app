import { useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { ConductorLockState } from "../lib/domain/conductorLock";
import SupportSheet from "./SupportSheet";
import { OPERATOR_SUPPORT_ISSUE_TYPES } from "../lib/support/supportConfig";
import colors from "../theme/colors";
import { spacing, typography } from "../constants";

type Props = {
  lockState: ConductorLockState;
};

export default function ConductorLockOverlay({ lockState }: Props) {
  const { user } = useAuth();
  const { locked, trip, unhandedParcelCount } = lockState;
  const [supportVisible, setSupportVisible] = useState(false);

  if (!locked || !trip || !user?.id) {
    return null;
  }

  return (
    <>
      <Modal visible animationType="fade" statusBarTranslucent>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={48} color={colors.error} />
          </View>
          <Text style={styles.title}>Handoff required</Text>
          <Text style={styles.body}>
            {unhandedParcelCount === 1
              ? "1 parcel on your trip still needs to be handed off to the destination LMP."
              : `${unhandedParcelCount} parcels on your trip still need to be handed off to the destination LMP.`}
          </Text>
          <Text style={styles.bodySecondary}>
            Complete the linehaul handoffs to continue using the app, or contact support
            to resolve this.
          </Text>
          <Text style={styles.tripMeta}>{trip.route_label}</Text>

          <TouchableOpacity
            style={styles.supportLink}
            onPress={() => setSupportVisible(true)}
            activeOpacity={0.6}
          >
            <Text style={styles.supportLinkText}>Contact support</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <SupportSheet
        visible={supportVisible}
        onClose={() => setSupportVisible(false)}
        title="Contact support"
        context={{
          audience: "operator",
          operatorId: user.id,
          tripId: trip.id,
          corridor: trip.corridor_id,
          stepOrState: "conductor_lock_unhanded_parcels",
        }}
        issueTypes={OPERATOR_SUPPORT_ISSUE_TYPES}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  bodySecondary: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  tripMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  supportLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  supportLinkText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
});
