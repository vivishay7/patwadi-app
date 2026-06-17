import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../lib/api/auth";
import { validateEmail } from "../utils/validation";
import { tryResumeCheckoutNavigation } from "../lib/auth/navigateAfterAuth";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { InputField } from "../components/InputField";
import { LoadingButton } from "../components/LoadingButton";
import { OfflineBanner } from "../components/OfflineBanner";
import { useToast } from "../hooks/useToast";
import colors from "../theme/colors";
import { spacing, typography } from "../constants";

type Nav = NativeStackNavigationProp<RootStackParamList, "CompleteProfile">;

export default function CompleteProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, setUser } = useAuth();
  const { showError } = useToast();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const phoneOnly = !user?.email && !!user?.phone;

  const handleContinue = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setNameError("Your name is required");
      return;
    }
    if (trimmedName.length < 2) {
      setNameError("Please enter your full name");
      return;
    }
    setNameError(undefined);

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const check = validateEmail(trimmedEmail);
      if (!check.isValid) {
        setEmailError(check.error);
        return;
      }
    }
    setEmailError(undefined);

    if (!user?.id) {
      navigation.replace("Login");
      return;
    }

    setLoading(true);
    try {
      const nextUser = {
        ...user,
        full_name: trimmedName,
        email: trimmedEmail || user.email || null,
        pendingFullName: trimmedName,
        pendingEmail: trimmedEmail || undefined,
      };

      if (user.role) {
        const result = await updateProfile(user.id, {
          full_name: trimmedName,
          email: trimmedEmail || undefined,
        });
        if (result.error) {
          showError(result.error);
          return;
        }
        const updated = {
          ...nextUser,
          isNewUser: false,
        };
        setUser(updated);
        if (await tryResumeCheckoutNavigation(navigation, updated)) {
          return;
        }
        navigation.replace("Main");
        return;
      }

      setUser(nextUser);
      navigation.replace("RoleSelect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <OfflineBanner />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScreenScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Almost there</Text>
          <Text style={styles.subtitle}>
            {phoneOnly
              ? "We have your number — what should we call you?"
              : "Tell us your name so we can personalize your experience."}
          </Text>

          <InputField
            placeholder="Full name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (nameError) setNameError(undefined);
            }}
            autoCapitalize="words"
            error={nameError}
            containerStyle={styles.field}
          />

          {phoneOnly ? (
            <InputField
              placeholder="Email (optional)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(undefined);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
              containerStyle={styles.field}
            />
          ) : null}

          <LoadingButton title="Continue" isLoading={loading} onPress={handleContinue} />
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: "center",
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  field: { width: "100%" },
});
