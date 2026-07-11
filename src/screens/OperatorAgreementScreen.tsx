import { useState } from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/RootNavigator";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { LoadingButton } from "../components/LoadingButton";
import { useAuth } from "../context/AuthContext";
import { acceptOperatorAgreement } from "../services/operatorService";
import { useToast } from "../hooks/useToast";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

const OPERATOR_AGREEMENT_URL = "https://patwadi.com/operator-agreement.html";

const KEY_TERMS = [
  {
    id: "a",
    title: "Your role",
    body:
      "Handle parcels only on corridors Patwadi assigns you. Use the app for every custody handoff (verification code + photo). WhatsApp or verbal confirmations do not replace app records.",
  },
  {
    id: "b",
    title: "Independent contractor",
    body:
      "You are not a Patwadi employee. You are responsible for safe transport and for accidents or third-party claims that arise during your work.",
  },
  {
    id: "c",
    title: "Custody duty",
    body:
      "Keep parcels secure at all times. Accept and release custody only with the correct code and photo in the app. Never falsify handoff records.",
  },
  {
    id: "d",
    title: "Prohibited items",
    body:
      "Refuse parcels that may contain banned items under Patwadi's Shipping Policy and contact Patwadi support immediately if you suspect a prohibited item.",
  },
  {
    id: "e",
    title: "Payments",
    body:
      "Earnings settle weekly (Mondays) to the UPI or bank details on your KYC record. Patwadi may withhold or deduct during disputes, custody failures, or chargebacks.",
  },
  {
    id: "f",
    title: "Account security",
    body:
      "Your Patwadi login is personal and non-transferable. Do not share credentials or handoff codes. Keep payment and emergency contact details accurate.",
  },
] as const;

type Nav = NativeStackNavigationProp<RootStackParamList, "OperatorAgreement">;

export default function OperatorAgreementScreen() {
  const navigation = useNavigation<Nav>();
  const { refreshUser } = useAuth();
  const { showError } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const openAgreement = () => {
    void Linking.openURL(OPERATOR_AGREEMENT_URL);
  };

  const handleStart = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      const result = await acceptOperatorAgreement();
      if (result.error) {
        showError(result.error);
        return;
      }
      await refreshUser();
      navigation.replace("Main");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Before you begin</Text>
        <Text style={styles.subtitle}>
          Review these operator agreement terms. You must accept them before handling parcels on
          the Patwadi network.
        </Text>

        <View style={styles.termsCard}>
          {KEY_TERMS.map((term) => (
            <View key={term.id} style={styles.termBlock}>
              <Text style={styles.termLabel}>
                {term.id.toUpperCase()}. {term.title}
              </Text>
              <Text style={styles.termBody}>{term.body}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={openAgreement} activeOpacity={0.7}>
          <Text style={styles.linkText}>Read full operator agreement on patwadi.com</Text>
        </TouchableOpacity>

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            onPress={() => setAccepted((v) => !v)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={accepted ? "checkbox" : "square-outline"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.checkboxText}>
            I have read and agree to the Patwadi operator agreement, including the{" "}
            <Text style={styles.inlineLink} onPress={openAgreement}>
              operator agreement
            </Text>
            .
          </Text>
        </View>

        <LoadingButton
          title="Start operating"
          onPress={() => void handleStart()}
          disabled={!accepted}
          isLoading={loading}
          style={styles.cta}
        />
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  termsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  termBlock: {
    marginBottom: spacing.lg,
  },
  termLabel: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  termBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  linkText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: spacing.xl,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  checkboxText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  inlineLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  cta: {
    marginTop: spacing.sm,
  },
});
