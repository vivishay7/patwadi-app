import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { deleteUserAccount } from "../lib/api/auth";
import { clearPendingCheckout } from "../lib/checkout/pendingCheckout";
import LanguageToggle from "../components/LanguageToggle";
import { useAuth } from "../context/AuthContext";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, signOut, setUser } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This removes your Patwadi profile. You will be signed out. Contact support if you have active parcels.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) return;
            setDeleting(true);
            try {
              const result = await deleteUserAccount(user.id);
              if (result.error) {
                Alert.alert("Could not delete", result.error);
                return;
              }
              await clearPendingCheckout();
              setUser(null);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {user?.id ? (
        <View style={styles.card}>
          <Text style={styles.accountLabel}>Signed in</Text>
          {user.full_name ? (
            <Text style={styles.accountValue}>{user.full_name}</Text>
          ) : null}
          <Text style={[styles.accountValue, user.full_name && styles.accountSub]}>
            {user.email || user.phone || user.id}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.accountLabel}>Browsing as guest</Text>
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>Log in</Text>
          </TouchableOpacity>
        </View>
      )}

      <LanguageToggle compact />

      {user?.id && (
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => navigation.navigate("AddressBook")}
          activeOpacity={0.7}
        >
          <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
          <Text style={styles.menuRowText}>Address book</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {user?.id && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleting || signingOut}
          activeOpacity={0.7}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={styles.deleteText}>Delete account</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {user?.id && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Log out</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  accountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  accountValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  accountSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  loginLink: {
    marginTop: spacing.sm,
  },
  loginLinkText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.primary,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  menuRowText: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  deleteText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  logoutText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.error,
  },
});
