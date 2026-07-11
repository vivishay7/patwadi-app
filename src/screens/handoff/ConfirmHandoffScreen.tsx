import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { RootStackParamList } from "../../navigation/RootNavigator";
import {
  acknowledgeHandoff,
  issueHandoffCode,
  PackagingCondition,
} from "../../services/custodyService";
import { evaluateTrackingStopAfterHandoff } from "../../lib/location/tripTracking";
import { LoadingButton } from "../../components/LoadingButton";
import HandoffCodeInput from "../../components/HandoffCodeInput";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../context/AuthContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ConfirmHandoff">;
type RouteProps = RouteProp<RootStackParamList, "ConfirmHandoff">;

type PickupPhase = "packaging" | "risk_ack" | "handoff";

const RISK_ACK_TIMEOUT_SEC = 60;
const RISK_ACK_MESSAGE =
  "I have been informed that my parcel's packaging may not provide full protection during transport. I accept this risk and release Patwadi from liability for damage caused by packaging failure.";
const RISK_ACK_BLOCKED_MESSAGE =
  "Customer did not acknowledge. Do not proceed with this pickup — contact support.";

function formatPackagingCondition(value: PackagingCondition): string {
  if (value === "acceptable") return "Packaging acceptable";
  return "Packaging risk — customer acknowledged";
}

export default function ConfirmHandoffScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const { parcelId, step } = route.params;
  const isPickupStep = step === "customer_to_lmp";
  const isCustomerPickupFlow = isPickupStep && user?.role === "customer";
  const isOperatorPickupFlow = isPickupStep && !isCustomerPickupFlow;

  const [phase, setPhase] = useState<PickupPhase>(
    isOperatorPickupFlow ? "packaging" : "handoff"
  );
  const [packagingCondition, setPackagingCondition] = useState<PackagingCondition | null>(null);
  const [riskAckSecondsLeft, setRiskAckSecondsLeft] = useState(RISK_ACK_TIMEOUT_SEC);
  const riskAckHandledRef = useRef(false);

  const [code, setCode] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [issuing, setIssuing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIssuing(true);
      const res = await issueHandoffCode({ parcelId, step });
      if (cancelled) return;
      if ("error" in res) {
        Alert.alert("Cannot issue code", res.error);
      }
      setIssuing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [parcelId, step]);

  useEffect(() => {
    if (phase !== "risk_ack") return;

    riskAckHandledRef.current = false;
    setRiskAckSecondsLeft(RISK_ACK_TIMEOUT_SEC);

    const blockHandoff = () => {
      if (riskAckHandledRef.current) return;
      riskAckHandledRef.current = true;
      Alert.alert("Pickup blocked", RISK_ACK_BLOCKED_MESSAGE, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    };

    const interval = setInterval(() => {
      setRiskAckSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          blockHandoff();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, navigation]);

  const canSubmit = useMemo(
    () =>
      phase === "handoff" &&
      /^\d{4}$/.test(code) &&
      !!photoUri &&
      !submitting &&
      !issuing &&
      (!isOperatorPickupFlow || !!packagingCondition),
    [phase, code, photoUri, submitting, issuing, isOperatorPickupFlow, packagingCondition]
  );

  const handlePackagingBlocked = () => {
    if (riskAckHandledRef.current) return;
    riskAckHandledRef.current = true;
    Alert.alert("Pickup blocked", RISK_ACK_BLOCKED_MESSAGE, [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const handlePackagingAcceptable = () => {
    setPackagingCondition("acceptable");
    setPhase("handoff");
  };

  const handlePackagingRisk = () => {
    setPhase("risk_ack");
  };

  const handleRiskAcknowledge = () => {
    if (riskAckHandledRef.current) return;
    riskAckHandledRef.current = true;
    setPackagingCondition("risk_acknowledged_by_customer");
    setPhase("handoff");
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Camera permission is required to capture proof photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submitHandoff = async (submitCode: string) => {
    if (!/^\d{4}$/.test(submitCode) || !photoUri || submitting || issuing || phase !== "handoff") {
      return;
    }

    const resolvedPackaging =
      isOperatorPickupFlow && packagingCondition
        ? packagingCondition
        : isCustomerPickupFlow
          ? ("acceptable" as PackagingCondition)
          : undefined;
    if (isOperatorPickupFlow && !resolvedPackaging) return;

    setSubmitting(true);
    try {
      const res = await acknowledgeHandoff({
        parcelId,
        step,
        code: submitCode,
        photoUri,
        mimeType: "image/jpeg",
        ...(resolvedPackaging ? { packagingCondition: resolvedPackaging } : {}),
      });

      if ("error" in res) {
        Alert.alert("Handoff failed", res.error);
        return;
      }

      if (user?.id) {
        await evaluateTrackingStopAfterHandoff({
          step,
          parcelId,
          userId: user.id,
          role: user.role === "linehaul" || user.role === "lmp" ? user.role : null,
        });
      }

      showSuccess(isCustomerPickupFlow ? "Pickup confirmed" : "Handoff confirmed");
      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (!canSubmit) return;
    submitHandoff(code);
  };

  const handleCodeComplete = (completedCode: string) => {
    setCode(completedCode);
    if (photoUri) {
      submitHandoff(completedCode);
    }
  };

  const subtitle =
    phase === "packaging"
      ? "Check packaging condition before capturing photo proof."
      : phase === "risk_ack"
        ? "Show this screen to the customer for acknowledgment."
        : isCustomerPickupFlow
          ? issuing
            ? "Preparing your pickup confirmation…"
            : "Ask your pickup partner for the 4-digit code, then enter it and take a photo of your parcel."
          : "Enter code and capture mandatory photo proof.";

  const screenTitle = isCustomerPickupFlow ? "Confirm Pickup" : "Confirm Handoff";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{screenTitle}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {phase === "packaging" && isOperatorPickupFlow && (
          <View style={styles.card}>
            <Text style={styles.label}>Packaging condition *</Text>
            <Text style={styles.hint}>Choose one option before continuing to photo proof.</Text>

            <TouchableOpacity
              style={styles.packagingOption}
              onPress={handlePackagingAcceptable}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.packagingOptionText}>Packaging is acceptable</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.packagingOption}
              onPress={handlePackagingRisk}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle-outline" size={22} color={colors.warning} />
              <Text style={styles.packagingOptionText}>Packaging risk — customer to acknowledge</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === "risk_ack" && isOperatorPickupFlow && (
          <View style={styles.card}>
            <Text style={styles.riskAckText}>{RISK_ACK_MESSAGE}</Text>
            <Text style={styles.riskAckTimer}>{riskAckSecondsLeft}s remaining</Text>

            <LoadingButton
              title="I Acknowledge"
              onPress={handleRiskAcknowledge}
              style={styles.riskAckBtn}
            />

            <LoadingButton
              title="Cancel"
              variant="ghost"
              onPress={handlePackagingBlocked}
              style={styles.cancelBtn}
            />
          </View>
        )}

        {phase === "handoff" && (
          <>
            {isOperatorPickupFlow && packagingCondition ? (
              <View style={styles.packagingBadge}>
                <Text style={styles.packagingBadgeText}>
                  {formatPackagingCondition(packagingCondition)}
                </Text>
              </View>
            ) : null}

            <View style={styles.card}>
              {issuing && (
                <View style={styles.issuingRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.issuingText}>
                    {isCustomerPickupFlow
                      ? "Generating pickup code for your partner…"
                      : "Issuing code for receiver…"}
                  </Text>
                </View>
              )}
              {isCustomerPickupFlow && !issuing && (
                <Text style={styles.instruction}>
                  Your pickup partner will see a 4-digit code in their app. Enter that code
                  below to confirm they have collected your parcel.
                </Text>
              )}
              <Text style={styles.label}>4-digit handoff code *</Text>
              {isCustomerPickupFlow ? (
                <HandoffCodeInput
                  value={code}
                  onChange={setCode}
                  onComplete={handleCodeComplete}
                  editable={!submitting && !issuing}
                />
              ) : (
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.input}
                  editable={!submitting}
                />
              )}

              <Text style={[styles.label, { marginTop: spacing.lg }]}>Photo proof *</Text>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.preview} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                  <Text style={styles.previewText}>No photo captured yet</Text>
                </View>
              )}

              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} disabled={submitting} activeOpacity={0.8}>
                <Ionicons name="camera" size={18} color={colors.white} />
                <Text style={styles.photoBtnText}>{photoUri ? "Retake photo" : "Capture photo"}</Text>
              </TouchableOpacity>
            </View>

            <LoadingButton
              title={isCustomerPickupFlow ? "Confirm pickup" : "Confirm handoff"}
              isLoading={submitting}
              onPress={handleConfirm}
              disabled={!canSubmit}
              style={styles.confirmBtnWrap}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
  backBtn: { marginRight: spacing.md },
  headerContent: { flex: 1 },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
  },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  instruction: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  packagingOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  packagingOptionText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  riskAckText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  riskAckTimer: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  riskAckBtn: { marginBottom: spacing.sm },
  cancelBtn: { marginTop: spacing.xs },
  packagingBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  packagingBadgeText: { ...typography.caption, color: colors.textPrimary, fontWeight: "700" },
  issuingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  issuingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  label: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 18,
    letterSpacing: 2,
  },
  preview: { width: "100%", height: 200, borderRadius: radius.md, marginBottom: spacing.md },
  previewPlaceholder: {
    width: "100%",
    height: 200,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  previewText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  photoBtnText: { ...typography.buttonSmall, color: colors.white },
  confirmBtnWrap: { marginTop: spacing.xl },
});
