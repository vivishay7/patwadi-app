import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { loginWithPhone, verifyOtp } from "../lib/api/auth";
import { isSupabaseConfigured, getSupabaseConfigError } from "../lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

type AuthStep = "phone" | "otp";

export default function LoginScreen({ navigation }: Props) {
  const { setUser, isConfigured, configError } = useAuth();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    // Check Supabase configuration
    if (!isSupabaseConfigured()) {
      Alert.alert(
        "Configuration Error",
        getSupabaseConfigError() || "Supabase is not properly configured.",
        [{ text: "OK" }]
      );
      return;
    }

    // Validate phone number
    if (phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await loginWithPhone(phone);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      Alert.alert("Error", result.error);
      return;
    }

    // Move to OTP step
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    // Validate OTP
    if (otp.length < 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await verifyOtp(phone, otp);

    setLoading(false);

    if (result.error) {
      setError(result.error);
      Alert.alert("Verification Failed", result.error);
      return;
    }

    if (!result.data) {
      setError("Verification failed. Please try again.");
      return;
    }

    // Set user in context
    setUser({
      id: result.data.userId,
      phone,
      role: null,
      isNewUser: result.data.isNewUser,
    });

    // Navigate based on user status
    if (result.data.isNewUser) {
      navigation.replace("RoleSelect");
    } else {
      navigation.replace("Main");
    }
  };

  const handleGuestLogin = () => {
    navigation.replace("Main");
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("phone");
      setOtp("");
      setError(null);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Back button */}
          {step === "otp" && (
            <TouchableOpacity
              style={styles.backHeader}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backHeaderText}>← Back</Text>
            </TouchableOpacity>
          )}

          {/* LOGO + BRAND */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>P</Text>
            </View>
            <Text style={styles.appName}>Patwadi</Text>
            <Text style={styles.tagline}>Haazir overnight.</Text>
          </View>

          {/* AUTH CARD */}
          <View style={styles.card}>
            {step === "phone" ? (
              <>
                <Text style={styles.cardTitle}>Welcome</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your phone number to get started
                </Text>

                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setError(null);
                  }}
                  style={[styles.input, error && styles.inputError]}
                  placeholder="+91 9876543210"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  autoFocus
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Verify OTP</Text>
                <Text style={styles.cardSubtitle}>
                  We sent a 6-digit code to {phone}
                </Text>

                <Text style={styles.label}>Enter OTP</Text>
                <TextInput
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    setError(null);
                  }}
                  style={[styles.input, error && styles.inputError]}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* GUEST LOGIN */}
          <TouchableOpacity onPress={handleGuestLogin} activeOpacity={0.7}>
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>

          {/* Configuration warning */}
          {!isConfigured && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠️ Supabase not configured. Login disabled.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl + 2,
  },

  // Back header
  backHeader: {
    alignSelf: "flex-start",
    marginBottom: spacing.lg,
  },
  backHeaderText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  /* LOGO */
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.xxxl,
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  logoLetter: {
    color: colors.white,
    fontSize: 40,
    fontWeight: "700",
  },
  appName: {
    marginTop: spacing.xl,
    fontSize: 30,
    fontWeight: "800",
    color: colors.black,
  },
  tagline: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.dark,
  },

  /* AUTH CARD */
  card: {
    backgroundColor: colors.surface,
    width: "100%",
    padding: spacing.xxl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },

  /* BUTTONS */
  primaryButton: {
    backgroundColor: colors.primary,
    width: "100%",
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
  resendButton: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  resendText: {
    ...typography.body,
    color: colors.primary,
  },

  /* GUEST */
  guestText: {
    ...typography.body,
    color: colors.dark,
  },

  /* Warning */
  warningBanner: {
    position: "absolute",
    bottom: spacing.massive,
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  warningText: {
    ...typography.caption,
    color: colors.white,
  },
});
