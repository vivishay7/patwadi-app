import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { createProfile } from "../lib/api/auth";
import { UserRole } from "../lib/db/types";
import { isProfileIdentityComplete } from "../lib/userDisplayName";
import { getPendingCheckout } from "../lib/checkout/pendingCheckout";
import { tryResumeCheckoutNavigation } from "../lib/auth/navigateAfterAuth";
import { resolvePostAuthRoute } from "../lib/auth/postAuthRoute";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "RoleSelect">;

const customerRole = {
  role: "customer" as UserRole,
  title: "I'm a Customer",
  description: "Send parcels on select corridors and track custody updates.",
  icon: "cube-outline" as const,
};

export default function RoleSelectScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);

  React.useEffect(() => {
    void getPendingCheckout().then((p) => setCheckoutPending(!!p));
  }, []);

  React.useEffect(() => {
    if (!user?.id) {
      navigation.replace("Login");
      return;
    }

    if (user.isAdmin) {
      navigation.replace("Admin");
      return;
    }

    if (!isProfileIdentityComplete(user.full_name)) {
      navigation.replace("CompleteProfile");
      return;
    }

    if (user.role) {
      const route = resolvePostAuthRoute(user);
      navigation.replace(route);
      return;
    }
  }, [user, navigation]);

  const handleSelectCustomer = async () => {
    if (!user?.id) {
      Alert.alert("Error", "Please sign up first to create an account.");
      navigation.replace("Login");
      return;
    }

    setLoading(true);

    try {
      const result = await createProfile(user.id, {
        phone: user.phone || undefined,
        role: "customer",
        full_name: user.pendingFullName || user.full_name || undefined,
        email: user.pendingEmail || user.email || undefined,
      });

      if (result.error) {
        setLoading(false);
        Alert.alert("Account Creation Failed", result.error, [{ text: "OK" }]);
        return;
      }

      const updatedUser = {
        ...user,
        role: "customer" as UserRole,
        full_name: user.pendingFullName || user.full_name,
        email: user.pendingEmail || user.email,
        approval_status: "approved" as const,
        operator_status: "inactive" as const,
        isNewUser: false,
        pendingFullName: undefined,
        pendingEmail: undefined,
      };

      setUser(updatedUser);

      if (await tryResumeCheckoutNavigation(navigation, updatedUser)) {
        return;
      }

      navigation.replace("Main");
    } catch (error) {
      console.error("Account creation error:", error);
      setLoading(false);
      Alert.alert("Error", "Something went wrong while creating your account. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  if (user?.role === "lmp" || user?.role === "linehaul") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.operatorBlock}>
          <Ionicons name="bus-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.operatorTitle}>Operator account</Text>
          <Text style={styles.operatorBody}>
            Operator accounts are created by Patwadi ops. If you are an operator, sign in with the
            credentials provided to you.
          </Text>
          <TouchableOpacity
            style={styles.operatorBtn}
            onPress={() => navigation.replace(resolvePostAuthRoute(user))}
            activeOpacity={0.85}
          >
            <Text style={styles.operatorBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>How will you use Patwadi?</Text>
          <Text style={styles.subtitle}>
            {checkoutPending
              ? "Create your customer account to finish checkout. Your parcel details are saved."
              : "Patwadi is for sending parcels. Operator accounts are set up by Patwadi ops."}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.card, loading && styles.cardDisabled]}
          onPress={() => {
            if (!loading) void handleSelectCustomer();
          }}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={customerRole.icon} size={32} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>{customerRole.title}</Text>
          <Text style={styles.cardDescription}>{customerRole.description}</Text>
          {loading && (
            <View style={styles.loadingBadge}>
              <ActivityIndicator size="small" color={colors.white} style={{ marginRight: spacing.xs }} />
              <Text style={styles.loadingText}>Setting up...</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          Want to operate on Patwadi corridors? Contact Patwadi ops to onboard as an operator.
        </Text>
      </View>
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
    padding: spacing.xl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  loadingBadge: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...typography.caption,
    color: colors.white,
  },
  footer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xxxl,
  },
  operatorBlock: {
    flex: 1,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  operatorTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  operatorBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  operatorBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
  },
  operatorBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
