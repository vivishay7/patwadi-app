import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../../theme/colors";
import { spacing, radius, typography } from "../../../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "DriverTerms">;

const TERMS_CONTENT = `
PATWADI DRIVER TERMS & CONDITIONS

Last Updated: December 2024

1. ACCEPTANCE OF TERMS
By registering as a driver on Patwadi, you agree to these terms and conditions. If you do not agree, you may not use the platform.

2. ELIGIBILITY
- You must be at least 18 years old
- You must have a valid driving license
- You must have valid identity documents (Aadhaar)
- You must operate a registered commercial vehicle

3. DRIVER RESPONSIBILITIES
- Handle all parcels with care
- Deliver parcels in a timely manner
- Maintain accurate status updates
- Follow all traffic and transport regulations
- Maintain professional conduct with customers

4. PARCEL HANDLING
- Inspect parcels before accepting
- Report any damaged or suspicious packages
- Do not open or tamper with sealed parcels
- Ensure safe storage during transit

5. PAYMENT TERMS
- Payments processed weekly
- Commission rates as per agreement
- Bank account required for payouts
- Tax compliance is your responsibility

6. LIABILITY
- You are responsible for parcels in your custody
- Insurance coverage details provided separately
- Report incidents immediately

7. TERMINATION
- Either party may terminate with notice
- Immediate termination for policy violations
- Outstanding payments settled within 30 days

8. PRIVACY
- Your data handled per our Privacy Policy
- Location tracking during deliveries
- Data used to improve services

9. CHANGES TO TERMS
We may update these terms. Continued use implies acceptance.

10. CONTACT
For questions: support@patwadi.com
`;

export default function DriverTermsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [agreed, setAgreed] = useState(false);

  const handleAgree = () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Progress indicator */}
        <View style={styles.progress}>
          <View style={[styles.progressDot, styles.progressCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>

        <Text style={styles.stepLabel}>Step 3 of 3</Text>
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>
          Please read and accept our terms to complete registration.
        </Text>

        {/* Terms Content */}
        <View style={styles.termsContainer}>
          <ScrollView
            style={styles.termsScroll}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.termsText}>{TERMS_CONTENT}</Text>
          </ScrollView>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the Terms & Conditions
          </Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !agreed && styles.buttonDisabled]}
          onPress={handleAgree}
          disabled={!agreed}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>I Agree & Continue</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
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
  },

  // Progress
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
  },
  progressActive: {
    backgroundColor: colors.primary,
  },
  progressCompleted: {
    backgroundColor: colors.success,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },
  progressLineCompleted: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },

  // Header
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

  // Terms
  termsContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  termsScroll: {
    padding: spacing.lg,
  },
  termsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.borderDark,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },

  // Buttons
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.white,
  },
  backButton: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

