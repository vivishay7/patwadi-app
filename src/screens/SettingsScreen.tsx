import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { Ionicons } from "@expo/vector-icons";
import { useRole } from "../context/RoleContext";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const menuItems: MenuItem[] = [
  { id: 1, label: "Manage Availability", icon: "time-outline" },
  { id: 2, label: "Edit Signature", icon: "pencil-outline" },
  { id: 3, label: "Auto Message", icon: "chatbox-ellipses-outline" },
  { id: 4, label: "Saved Locations", icon: "location-outline" },
  { id: 5, label: "Automation", icon: "repeat-outline" },
  { id: 6, label: "Help & Support", icon: "help-circle-outline" },
];

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { role, setRole, canSwitchRole, isAuthenticatedRole } = useRole();
  const { user, isGuest, signOut } = useAuth();

  const handleRoleSwitch = () => {
    if (!canSwitchRole) {
      Alert.alert(
        "Cannot Switch Role",
        "You are logged in with a specific role. To change your role, please contact support or create a new account.",
        [{ text: "OK" }]
      );
      return;
    }

    setRole(role === "customer" ? "driver" : "customer");
  };

  const handleLogout = async () => {
    if (isGuest) {
      // Guest users just go back to splash
      navigation.reset({
        index: 0,
        routes: [{ name: "Splash" }],
      });
      return;
    }

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: "Splash" }],
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Settings</Text>

        {/* User Info Card */}
        {!isGuest && user && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={24} color={colors.white} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userPhone}>{user.phone || "No phone"}</Text>
              <Text style={styles.userRole}>
                {role === "driver" ? "🚌 Driver" : "📦 Customer"}
              </Text>
            </View>
          </View>
        )}

        {/* Guest Banner */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.guestText}>You're browsing as a guest</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Grid */}
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={colors.white}
                style={styles.icon}
              />
              <Text style={styles.label}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ROLE SWITCHER */}
        <TouchableOpacity
          style={[
            styles.roleBtn,
            !canSwitchRole && styles.roleBtnDisabled,
          ]}
          onPress={handleRoleSwitch}
          activeOpacity={canSwitchRole ? 0.8 : 1}
        >
          <Text style={[styles.roleText, !canSwitchRole && styles.roleTextDisabled]}>
            {canSwitchRole
              ? `Switch to ${role === "customer" ? "Driver" : "Customer"} Mode`
              : `Role: ${role === "customer" ? "Customer" : "Driver"} (Locked)`}
          </Text>
        </TouchableOpacity>

        {!canSwitchRole && (
          <Text style={styles.roleHint}>
            Role is locked for logged-in users. Guest users can switch freely.
          </Text>
        )}

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>
            {isGuest ? "Exit Guest Mode" : "Logout"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.massive,
  },

  heading: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.xxl,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  userInfo: {
    flex: 1,
  },
  userPhone: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  userRole: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Guest banner
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  guestText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  loginButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    backgroundColor: colors.primary,
    width: "48%",
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: "center",
  },

  icon: {
    marginBottom: spacing.md,
  },

  label: {
    ...typography.buttonSmall,
    color: colors.white,
    textAlign: "center",
  },

  // Role button
  roleBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: "center",
    marginTop: spacing.md,
  },
  roleBtnDisabled: {
    backgroundColor: colors.dark,
    opacity: 0.6,
  },
  roleText: {
    ...typography.button,
    color: colors.white,
  },
  roleTextDisabled: {
    color: colors.textSecondary,
  },
  roleHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },

  // Logout
  logoutBtn: {
    marginTop: spacing.xxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
  },
});
