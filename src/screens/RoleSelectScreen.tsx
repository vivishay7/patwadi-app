import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { createProfile } from "../lib/api/auth";
import { UserRole } from "../lib/db/types";
import { useState } from "react";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "RoleSelect">;
type RouteProps = RouteProp<RootStackParamList, "RoleSelect">;

interface RoleOption {
  role: UserRole;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const roles: RoleOption[] = [
  {
    role: "customer",
    title: "I'm a Customer",
    description: "Book parcels, track deliveries, and get overnight intercity shipping.",
    icon: "cube-outline",
  },
  {
    role: "driver",
    title: "I'm a Driver",
    description: "Accept parcels on your bus routes and earn extra income.",
    icon: "bus-outline",
  },
];

export default function RoleSelectScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user, setUser, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleSelectRole = async (role: UserRole) => {
    if (!user) return;

    setLoading(true);
    setSelectedRole(role);

    try {
      // Create profile in database
      const result = await createProfile(user.id, user.phone || "", role);

      if (result.error) {
        console.error("Error creating profile:", result.error);
        setLoading(false);
        setSelectedRole(null);
        return;
      }

      // Update local user state
      setUser({
        ...user,
        role,
        isNewUser: false,
      });

      // Navigate based on role
      if (role === "driver") {
        navigation.replace("DriverKyc");
      } else {
        navigation.replace("Main");
      }
    } catch (error) {
      console.error("Role selection error:", error);
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>
            Select how you'll be using Patwadi. You can always change this later.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {roles.map((option) => {
            const isSelected = selectedRole === option.role;
            const isDisabled = loading && !isSelected;

            return (
              <TouchableOpacity
                key={option.role}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isDisabled && styles.cardDisabled,
                ]}
                onPress={() => handleSelectRole(option.role)}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isSelected && styles.iconContainerSelected,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={32}
                    color={isSelected ? colors.white : colors.primary}
                  />
                </View>

                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>

                {isSelected && loading && (
                  <View style={styles.loadingBadge}>
                    <Text style={styles.loadingText}>Setting up...</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.footer}>
          Your selection helps us personalize your experience.
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
  cardsContainer: {
    gap: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
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
  iconContainerSelected: {
    backgroundColor: colors.primary,
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
});

