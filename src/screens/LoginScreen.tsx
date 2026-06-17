import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import {
  loginWithPhone,
  loginWithEmailOtp,
  verifyOtp,
  verifyEmailOtp,
  resetPasswordForEmail,
  fetchProfile,
  signUpWithEmail,
  buildAppUser,
} from "../lib/api/auth";
import { navigateAfterAuth } from "../lib/auth/navigateAfterAuth";
import { adminSignInWithPassword, fetchAdminProfile } from "../lib/api/adminAuth";
import { supabase } from "../lib/supabase";
import colors from "../theme/colors";
import { spacing, typography } from "../constants";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { LoadingButton } from "../components/LoadingButton";
import { InputField } from "../components/InputField";
import { OfflineBanner } from "../components/OfflineBanner";
import { useToast } from "../hooks/useToast";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;
type LoginRoute = RouteProp<RootStackParamList, "Login">;

type IdentifierType = "email" | "phone";
type AuthMode = "signin" | "signup";
type FlowStep =
  | "identifier"
  | "email-password"
  | "signup-details"
  | "signup-email-sent"
  | "verify-otp"
  | "forgot-password"
  | "forgot-sent";
type OtpChannel = "email" | "phone";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectIdentifierType(value: string): IdentifierType | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@") || /[a-zA-Z]/.test(trimmed)) return "email";
  if (/^\+?\d/.test(trimmed.replace(/\s/g, ""))) return "phone";
  return null;
}

function formatPhoneNumber(phone: string): string {
  let formatted = phone.trim().replace(/\s/g, "");
  if (!formatted.startsWith("+")) {
    if (formatted.startsWith("0")) {
      formatted = "+91" + formatted.substring(1);
    } else if (formatted.length === 10) {
      formatted = "+91" + formatted;
    } else {
      formatted = "+91" + formatted;
    }
  }
  return formatted;
}

function validateIdentifier(value: string, type: IdentifierType | null): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Email or phone number is required";
  if (type === "email" && !EMAIL_REGEX.test(trimmed)) return "Please enter a valid email address";
  if (type === "phone") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10) return "Phone number must be at least 10 digits";
  }
  if (!type) return "Please enter a valid email or phone number";
  return undefined;
}

/**
 * Login screen with unified identifier and stepped auth flow.
 * Post-auth routing (shared entry for all users):
 * - active admin_profiles row → Admin stack
 * - profiles.role set → Main tabs (Home branches customer vs lmp/linehaul via RoleContext)
 * - authenticated, no role → RoleSelect (account creation)
 */
export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LoginRoute>();
  const { user, setUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [authMode, setAuthMode] = useState<AuthMode>(route.params?.mode ?? "signin");

  const [identifier, setIdentifier] = useState("");
  const [identifierError, setIdentifierError] = useState<string | undefined>();
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [identifierType, setIdentifierType] = useState<IdentifierType | null>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>("identifier");
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("phone");

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | undefined>();

  const [continueLoading, setContinueLoading] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullNameError, setFullNameError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();
  const [signUpLoading, setSignUpLoading] = useState(false);

  const [devTapCount, setDevTapCount] = useState(0);

  const handleDevTitleTap = () => {
    if (!__DEV__) return;
    const next = devTapCount + 1;
    setDevTapCount(next);
    if (next === 5) {
      setIdentifier("testlinehaul2@patwadi.com");
      setPassword("Patwadi123!");
      setIdentifierType("email");
      setFlowStep("email-password");
      setDevTapCount(0);
    } else if (next === 4) {
      setIdentifier("testlinehaul@patwadi.com");
      setPassword("Patwadi123!");
      setIdentifierType("email");
      setFlowStep("email-password");
      setDevTapCount(0);
    } else if (next === 3) {
      setIdentifier("testcustomer@patwadi.com");
      setPassword("Patwadi123!");
      setIdentifierType("email");
      setFlowStep("email-password");
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    void navigateAfterAuth(navigation, user);
  }, [user, navigation]);

  const hydrateUserFromSession = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser?.id) {
      showError("No authenticated session");
      return;
    }

    const profileResult = await fetchProfile(authUser.id);
    const adminResult = await fetchAdminProfile(authUser.id);
    setUser(
      buildAppUser({
        userId: authUser.id,
        authPhone: authUser.phone,
        authEmail: authUser.email,
        profile: profileResult.data,
        isAdmin: !!adminResult.data,
      })
    );
  };

  const handleIdentifierBlur = useCallback(() => {
    setIdentifierTouched(true);
    const type = detectIdentifierType(identifier);
    setIdentifierType(type);
    setIdentifierError(validateIdentifier(identifier, type));
  }, [identifier]);

  const handleContinue = async () => {
    const type = detectIdentifierType(identifier);
    setIdentifierType(type);
    setIdentifierTouched(true);
    const error = validateIdentifier(identifier, type);
    setIdentifierError(error);
    if (error || !type) return;

    if (type === "email") {
      if (authMode === "signup") {
        setFlowStep("signup-details");
      } else {
        setFlowStep("email-password");
      }
      return;
    }

    setContinueLoading(true);
    const formattedPhone = formatPhoneNumber(identifier);
    const result = await loginWithPhone(formattedPhone);
    setContinueLoading(false);

    if (result.error) {
      showError(result.error);
      return;
    }

    setOtpChannel("phone");
    setFlowStep("verify-otp");
    showSuccess(authMode === "signup" ? "OTP sent — verify to create your account" : "OTP sent — check your phone");
  };

  const handleSignUp = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFullNameError("Please enter your full name");
      return;
    }
    setFullNameError(undefined);

    if (!password.trim() || password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);

    setSignUpLoading(true);
    try {
      const result = await signUpWithEmail(identifier.trim(), password, trimmedName);
      if (result.error || !result.data) {
        showError(result.error || "Sign up failed");
        return;
      }

      if (!result.data.sessionCreated) {
        setFlowStep("signup-email-sent");
        showSuccess("Check your email to confirm your account");
        return;
      }

      await hydrateUserFromSession();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const profileResult = await fetchProfile(authUser.id);
        const adminResult = await fetchAdminProfile(authUser.id);
        setUser({
          ...buildAppUser({
            userId: authUser.id,
            authPhone: authUser.phone,
            authEmail: authUser.email,
            profile: profileResult.data,
            isAdmin: !!adminResult.data,
          }),
          full_name: trimmedName,
          email: identifier.trim(),
          pendingFullName: trimmedName,
          pendingEmail: identifier.trim(),
        });
      }
    } finally {
      setSignUpLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode((m) => (m === "signin" ? "signup" : "signin"));
    setFlowStep("identifier");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);
    setFullNameError(undefined);
    setOtpCode("");
    setOtpError(undefined);
  };

  const handleEmailSignIn = async () => {
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }
    setPasswordError(undefined);

    setSignInLoading(true);
    try {
      const signIn = await adminSignInWithPassword(identifier.trim(), password);
      if (signIn.error) {
        showError(signIn.error);
        return;
      }
      await hydrateUserFromSession();
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    setOtpSendLoading(true);
    const result = await loginWithEmailOtp(identifier.trim());
    setOtpSendLoading(false);

    if (result.error) {
      showError(result.error);
      return;
    }

    setOtpChannel("email");
    setFlowStep("verify-otp");
    showSuccess("OTP sent — check your email");
  };

  const handleResendOtp = async () => {
    if (otpChannel === "email") {
      await handleSendEmailOtp();
    } else {
      setOtpSendLoading(true);
      const result = await loginWithPhone(formatPhoneNumber(identifier));
      setOtpSendLoading(false);
      if (result.error) {
        showError(result.error);
        return;
      }
      showSuccess("OTP resent");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setOtpError("Verification code is required");
      return;
    }
    setOtpError(undefined);

    setVerifyLoading(true);
    let verifyResult;

    if (otpChannel === "email") {
      verifyResult = await verifyEmailOtp(identifier.trim(), otpCode.trim());
    } else {
      verifyResult = await verifyOtp(formatPhoneNumber(identifier), otpCode.trim());
    }
    setVerifyLoading(false);

    if (verifyResult.error || !verifyResult.data) {
      showError(verifyResult.error || "OTP verification failed");
      return;
    }

    const userId = verifyResult.data.userId;
    const profileResult = await fetchProfile(userId);
    const adminResult = await fetchAdminProfile(userId);

    const appUser = buildAppUser({
      userId,
      authPhone: otpChannel === "phone" ? formatPhoneNumber(identifier) : profileResult.data?.phone,
      authEmail: otpChannel === "email" ? identifier.trim() : profileResult.data?.email,
      profile: profileResult.data,
      isAdmin: !!adminResult.data,
    });

    setUser(appUser);
  };

  const handleForgotPassword = async () => {
    const email = identifier.trim();
    if (!EMAIL_REGEX.test(email)) {
      setIdentifierError("Please enter a valid email address");
      return;
    }

    setForgotLoading(true);
    const result = await resetPasswordForEmail(email);
    setForgotLoading(false);

    if (result.error) {
      showError(result.error);
      return;
    }

    setFlowStep("forgot-sent");
  };

  const handleBackToIdentifier = () => {
    setFlowStep("identifier");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setPasswordError(undefined);
    setConfirmPasswordError(undefined);
    setFullNameError(undefined);
    setOtpCode("");
    setOtpError(undefined);
    setShowPassword(false);
  };

  const resumeCheckout = route.params?.resumeCheckout;

  const subtitle =
    flowStep === "verify-otp"
      ? otpChannel === "email"
        ? "Enter the code sent to your email"
        : authMode === "signup"
          ? "Verify your number to create your account"
          : "Enter the code sent to your phone"
      : flowStep === "forgot-password"
        ? "We'll send a reset link to your email"
        : flowStep === "forgot-sent" || flowStep === "signup-email-sent"
          ? "Check your email for the next step"
          : flowStep === "email-password"
            ? "Enter your password to sign in"
            : flowStep === "signup-details"
              ? "Create your Patwadi account"
              : authMode === "signup"
                ? resumeCheckout
                  ? "Sign up to finish your parcel order — details are saved"
                  : "Sign up with email or phone number"
                : resumeCheckout
                  ? "Sign in to finish your parcel order — details are saved"
                  : "Sign in with email or phone number";

  const screenTitle = authMode === "signup" ? "Create account" : "Sign in";

  return (
    <View style={styles.screen}>
      <OfflineBanner />
      <ScreenScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title} onPress={handleDevTitleTap}>
          {screenTitle}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {(flowStep === "identifier" ||
          flowStep === "email-password" ||
          flowStep === "signup-details" ||
          flowStep === "verify-otp") && (
          <InputField
            placeholder="Email or phone number"
            placeholderTextColor={colors.textSecondary}
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (identifierTouched) {
                const type = detectIdentifierType(text);
                setIdentifierType(type);
                setIdentifierError(validateIdentifier(text, type));
              }
            }}
            onBlur={handleIdentifierBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={flowStep === "identifier" && !continueLoading}
            error={identifierTouched ? identifierError : undefined}
            containerStyle={styles.field}
          />
        )}

        {flowStep === "identifier" && (
          <>
            <LoadingButton
              title={authMode === "signup" ? "Continue" : "Continue"}
              isLoading={continueLoading}
              onPress={handleContinue}
            />
            <TouchableOpacity style={styles.linkButton} onPress={toggleAuthMode}>
              <Text style={styles.linkText}>
                {authMode === "signin"
                  ? "New to Patwadi? Create an account"
                  : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {flowStep === "signup-details" && (
          <>
            <InputField
              placeholder="Full name"
              placeholderTextColor={colors.textSecondary}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (fullNameError) setFullNameError(undefined);
              }}
              autoCapitalize="words"
              editable={!signUpLoading}
              error={fullNameError}
              containerStyle={styles.field}
            />
            <InputField
              placeholder="Password (min 8 characters)"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(undefined);
              }}
              secureTextEntry={!showPassword}
              editable={!signUpLoading}
              error={passwordError}
              containerStyle={styles.field}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              }
            />
            <InputField
              placeholder="Confirm password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmPasswordError) setConfirmPasswordError(undefined);
              }}
              secureTextEntry={!showPassword}
              editable={!signUpLoading}
              error={confirmPasswordError}
              containerStyle={styles.field}
            />
            <LoadingButton
              title="Create account"
              isLoading={signUpLoading}
              onPress={handleSignUp}
            />
            <TouchableOpacity style={styles.linkButton} onPress={handleBackToIdentifier}>
              <Text style={styles.linkTextMuted}>Use a different email</Text>
            </TouchableOpacity>
          </>
        )}

        {flowStep === "email-password" && (
          <>
            <InputField
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(undefined);
              }}
              secureTextEntry={!showPassword}
              editable={!signInLoading}
              error={passwordError}
              containerStyle={styles.field}
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              }
            />

            <LoadingButton title="Sign in" isLoading={signInLoading} onPress={handleEmailSignIn} />

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleSendEmailOtp}
              disabled={otpSendLoading || signInLoading}
            >
              <Text style={styles.linkText}>
                {otpSendLoading ? "Sending OTP..." : "Sign in with OTP instead"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setFlowStep("forgot-password")}
              disabled={signInLoading}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={handleBackToIdentifier}>
              <Text style={styles.linkTextMuted}>Use a different account</Text>
            </TouchableOpacity>
          </>
        )}

        {flowStep === "verify-otp" && (
          <>
            <InputField
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={colors.textSecondary}
              value={otpCode}
              onChangeText={(text) => {
                const digitsOnly = text.replace(/\D/g, "");
                if (digitsOnly.length <= 6) {
                  setOtpCode(digitsOnly);
                  if (otpError) setOtpError(undefined);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              editable={!verifyLoading}
              error={otpError}
              containerStyle={styles.field}
            />

            <LoadingButton
              title="Verify OTP"
              isLoading={verifyLoading}
              onPress={handleVerifyOtp}
              disabled={!otpCode.trim()}
            />

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleResendOtp}
              disabled={otpSendLoading || verifyLoading}
            >
              <Text style={styles.linkText}>{otpSendLoading ? "Sending..." : "Resend OTP"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={handleBackToIdentifier}>
              <Text style={styles.linkTextMuted}>Use a different account</Text>
            </TouchableOpacity>
          </>
        )}

        {flowStep === "forgot-password" && (
          <>
            <InputField
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!forgotLoading}
              containerStyle={styles.field}
            />

            <LoadingButton
              title="Send reset link"
              isLoading={forgotLoading}
              onPress={handleForgotPassword}
            />

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setFlowStep("email-password")}
              disabled={forgotLoading}
            >
              <Text style={styles.linkText}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        )}

        {flowStep === "forgot-sent" && (
          <>
            <Text style={styles.forgotSentText}>
              Check your email for a link to reset your password.
            </Text>
            <LoadingButton
              title="Back to sign in"
              variant="ghost"
              onPress={() => setFlowStep("email-password")}
            />
          </>
        )}

        {flowStep === "signup-email-sent" && (
          <>
            <Text style={styles.forgotSentText}>
              We sent a confirmation link to {identifier.trim()}. Open it, then sign in to finish
              setting up your account.
            </Text>
            <LoadingButton
              title="Back to sign in"
              variant="ghost"
              onPress={() => {
                setAuthMode("signin");
                setFlowStep("email-password");
              }}
            />
          </>
        )}
      </ScreenScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  field: {
    width: "100%",
  },
  linkButton: {
    marginTop: spacing.md,
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  linkText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "500",
  },
  linkTextMuted: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  forgotSentText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
});
