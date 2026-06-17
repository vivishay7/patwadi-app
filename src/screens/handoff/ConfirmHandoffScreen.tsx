import { useEffect, useMemo, useState } from "react";
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
import { acknowledgeHandoff, issueHandoffCode } from "../../services/custodyService";
import { evaluateTrackingStopAfterHandoff } from "../../lib/location/tripTracking";
import { LoadingButton } from "../../components/LoadingButton";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../context/AuthContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ConfirmHandoff">;
type RouteProps = RouteProp<RootStackParamList, "ConfirmHandoff">;

export default function ConfirmHandoffScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { showSuccess } = useToast();

  const { parcelId, step } = route.params;

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

  const canSubmit = useMemo(
    () => /^\d{4}$/.test(code) && !!photoUri && !submitting && !issuing,
    [code, photoUri, submitting, issuing]
  );

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

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await acknowledgeHandoff({
        parcelId,
        step,
        code,
        photoUri: photoUri!,
        mimeType: "image/jpeg",
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

      showSuccess("Handoff confirmed");
      navigation.goBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Confirm Handoff</Text>
            <Text style={styles.subtitle}>Enter code and capture mandatory photo proof.</Text>
          </View>
        </View>

        <View style={styles.card}>
          {issuing && (
            <View style={styles.issuingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.issuingText}>Issuing code for receiver…</Text>
            </View>
          )}
          <Text style={styles.label}>4-digit handoff code *</Text>
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
          title="Confirm handoff"
          isLoading={submitting}
          onPress={handleConfirm}
          disabled={!canSubmit}
          style={styles.confirmBtnWrap}
        />
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
  confirmBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { ...typography.button, color: colors.white },
});

