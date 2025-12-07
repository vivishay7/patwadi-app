import React, { useEffect, useState, Component, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

function SplashContent({ navigation }: Props) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, role, needsKyc } = useProfile();
  const [checking, setChecking] = useState(true);

  // Debug log to see what's happening
  useEffect(() => {
    console.log("🚀 SplashScreen state:", {
      authLoading,
      profileLoading,
      isAuthenticated,
      checking,
      profile: profile?.id,
      role,
    });
  }, [authLoading, profileLoading, isAuthenticated, checking, profile, role]);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (authLoading || profileLoading) return;

    // Only auto-redirect after a short delay to show splash
    const timer = setTimeout(() => {
      setChecking(false);

      if (isAuthenticated) {
        if (!profile || !role) {
          // User is authenticated but has no profile yet
          navigation.replace("RoleSelect");
        } else if (role === "driver" && needsKyc) {
          // Driver needs to complete KYC
          navigation.replace("DriverKyc");
        } else {
          // User is fully set up, go to main app
          navigation.replace("Main");
        }
      }
    }, 1000); // 1 second splash delay

    return () => clearTimeout(timer);
  }, [authLoading, profileLoading, isAuthenticated, profile, role, needsKyc, navigation]);

  // Always show the splash screen - loading indicator if still loading
  const isLoading = checking && (authLoading || profileLoading);
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoInitial}>P</Text>
          </View>
          <Text style={styles.brand}>Patwadi</Text>
          <Text style={styles.subTitle}>Overnight Intercity Parcels</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  // Show splash screen with actions if not authenticated
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoInitial}>P</Text>
        </View>
        <Text style={styles.brand}>Patwadi</Text>
        <Text style={styles.subTitle}>Overnight Intercity Parcels</Text>
        <Text style={styles.tagline}>Bus-first delivery for real India.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonPrimaryText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outline]}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonOutlineText}>Sign up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.replace("Main")}
          activeOpacity={0.7}
        >
          <Text style={styles.guest}>Continue as guest</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Intercity • Bus corridors • Same-day potential
        </Text>
      </View>
    </View>
  );
}

// Error boundary wrapper
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("SplashScreen Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Main export with error boundary
export default function SplashScreen(props: Props) {
  return (
    <ErrorBoundary>
      <SplashContent {...props} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl + 2,
    paddingVertical: spacing.massive,
    justifyContent: "space-between",
  },
  logoContainer: {
    marginTop: spacing.massive,
    alignItems: "center",
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: radius.xxl,
    backgroundColor: colors.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
  },
  logoInitial: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.primary,
  },
  brand: {
    marginTop: spacing.xl,
    ...typography.display2,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subTitle: {
    marginTop: spacing.xs,
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tagline: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  loader: {
    marginBottom: spacing.massive,
  },
  actions: {
    gap: spacing.md + 2,
  },
  button: {
    borderRadius: radius.xxl,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonPrimaryText: {
    ...typography.button,
    color: colors.textOnDark,
  },
  buttonOutlineText: {
    ...typography.button,
    color: colors.primary,
  },
  guest: {
    marginTop: spacing.md,
    textAlign: "center",
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footerText: {
    marginTop: spacing.xl,
    textAlign: "center",
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.error,
    marginBottom: spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
