import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { buildSupportDeepLink } from "../lib/support/buildSupportDeepLink";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

export default function OperatorPendingScreen() {
  const { user, signOut } = useAuth();

  const openSupport = () => {
    if (!user?.id) return;
    const url = buildSupportDeepLink(
      {
        audience: "operator",
        operatorId: user.id,
        stepOrState:
          user.approval_status !== "approved"
            ? "approval_pending"
            : `operator_${user.operator_status ?? "inactive"}`,
      },
      "Operator account access",
      "My operator account is not active yet. Please help with onboarding status."
    );
    void Linking.openURL(url);
  };

  const statusMessage =
    user?.approval_status !== "approved"
      ? "Your operator application is being reviewed by Patwadi ops."
      : user?.operator_status === "suspended"
        ? "Your operator account is temporarily suspended."
        : "Your operator account is not active yet.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Operator access pending</Text>
        <Text style={styles.body}>{statusMessage}</Text>
        <Text style={styles.hint}>
          Operators are onboarded by Patwadi via our website. You will receive credentials once
          approved. Contact ops if you believe this is an error.
        </Text>

        <TouchableOpacity style={styles.supportBtn} onPress={openSupport} activeOpacity={0.85}>
          <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
          <Text style={styles.supportText}>Contact Patwadi ops</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => void signOut()} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  supportText: { ...typography.button, color: colors.white },
  signOutBtn: { padding: spacing.md },
  signOutText: { ...typography.body, color: colors.textSecondary, fontWeight: "600" },
});
