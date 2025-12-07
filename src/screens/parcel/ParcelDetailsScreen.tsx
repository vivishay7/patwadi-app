/**
 * ParcelDetailsScreen
 * Collects parcel weight, dimensions, and contents
 * Integrates with AI camera for dimension estimation
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { HomeStackParamList, LocationData } from "../../navigation/HomeStack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, "ParcelDetails">,
  NativeStackNavigationProp<RootStackParamList>
>;
type RouteProps = RouteProp<HomeStackParamList, "ParcelDetails">;

export default function ParcelDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  // Get location data from previous screens
  const pickup = route.params?.pickup;
  const dropoff = route.params?.dropoff;
  const capturedImage = route.params?.capturedImage;
  const aiDimensions = route.params?.aiDimensions;

  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [contents, setContents] = useState("");
  const [hasAIDimensions, setHasAIDimensions] = useState(false);

  // Apply AI dimensions when returning from camera
  useEffect(() => {
    if (aiDimensions) {
      setLength(String(aiDimensions.length));
      setWidth(String(aiDimensions.width));
      setHeight(String(aiDimensions.height));
      setHasAIDimensions(true);
    }
  }, [aiDimensions]);

  const handleScanWithCamera = () => {
    navigation.navigate("CameraMeasure");
  };

  const handleNext = () => {
    const weightNum = parseFloat(weight) || 0;
    const dimensions = {
      l: parseFloat(length) || 0,
      w: parseFloat(width) || 0,
      h: parseFloat(height) || 0,
    };

    navigation.navigate("PriceEstimate", {
      pickup,
      dropoff,
      weight: weightNum,
      contents: contents.trim(),
      dimensions,
    } as any);
  };

  const canProceed = weight.trim() !== "" && contents.trim() !== "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Parcel Details</Text>
              <Text style={styles.subtitle}>
                Tell us about the parcel for pricing
              </Text>
            </View>
          </View>

          {/* Progress indicator */}
          <View style={styles.progress}>
            <View style={[styles.progressDot, styles.progressCompleted]} />
            <View style={[styles.progressLine, styles.progressLineCompleted]} />
            <View style={[styles.progressDot, styles.progressCompleted]} />
            <View style={[styles.progressLine, styles.progressLineCompleted]} />
            <View style={[styles.progressDot, styles.progressActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepLabel}>Step 3 of 4</Text>

          {/* Route Summary */}
          {pickup && dropoff && (
            <View style={styles.routeSummary}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, styles.routeDotPickup]} />
                <Text style={styles.routeText} numberOfLines={1}>{pickup.placeName || pickup.address}</Text>
              </View>
              <View style={styles.routeConnector} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, styles.routeDotDropoff]} />
                <Text style={styles.routeText} numberOfLines={1}>{dropoff.placeName || dropoff.address}</Text>
              </View>
            </View>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: capturedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              {hasAIDimensions && (
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={14} color={colors.white} />
                  <Text style={styles.aiBadgeText}>AI Estimated</Text>
                </View>
              )}
            </View>
          )}

          {/* AI Camera Scan Button */}
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanWithCamera}
            activeOpacity={0.8}
          >
            <View style={styles.scanButtonIcon}>
              <Ionicons name="scan-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.scanButtonContent}>
              <Text style={styles.scanButtonTitle}>Scan with AI Camera</Text>
              <Text style={styles.scanButtonSubtitle}>
                Auto-estimate dimensions from photo
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.label}>Weight (kg) *</Text>
            <TextInput
              placeholder="e.g. 1.5"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>Dimensions (cm)</Text>
              {hasAIDimensions && (
                <View style={styles.aiIndicator}>
                  <Ionicons name="sparkles" size={12} color={colors.primary} />
                  <Text style={styles.aiIndicatorText}>AI</Text>
                </View>
              )}
            </View>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>L</Text>
                <TextInput
                  placeholder="—"
                  value={length}
                  onChangeText={(text) => {
                    setLength(text);
                    setHasAIDimensions(false);
                  }}
                  style={[styles.input, styles.inputSmall]}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>W</Text>
                <TextInput
                  placeholder="—"
                  value={width}
                  onChangeText={(text) => {
                    setWidth(text);
                    setHasAIDimensions(false);
                  }}
                  style={[styles.input, styles.inputSmall]}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>H</Text>
                <TextInput
                  placeholder="—"
                  value={height}
                  onChangeText={(text) => {
                    setHeight(text);
                    setHasAIDimensions(false);
                  }}
                  style={[styles.input, styles.inputSmall]}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <Text style={styles.label}>Contents *</Text>
            <TextInput
              placeholder="e.g. Books, clothes, documents..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.multiline]}
              multiline
              value={contents}
              onChangeText={setContents}
            />
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Tips for accurate pricing</Text>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>Weigh your parcel if possible</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>Describe fragile items in contents</Text>
            </View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canProceed}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>Next → Get Estimate</Text>
          </TouchableOpacity>
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
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  backButton: {
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Progress
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.borderLight,
  },
  progressActive: {
    backgroundColor: colors.primary,
  },
  progressCompleted: {
    backgroundColor: colors.success,
  },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },
  progressLineCompleted: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },

  // Route Summary
  routeSummary: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  routeDotPickup: {
    backgroundColor: colors.primary,
  },
  routeDotDropoff: {
    backgroundColor: colors.success,
  },
  routeConnector: {
    width: 2,
    height: 16,
    backgroundColor: colors.borderLight,
    marginLeft: 4,
    marginVertical: spacing.xs,
  },
  routeText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },

  // Image Preview
  imagePreview: {
    width: "100%",
    height: 160,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  aiBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  aiBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },

  // Scan Button
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
  },
  scanButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  scanButtonContent: {
    flex: 1,
  },
  scanButtonTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  scanButtonSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Form
  formSection: {},
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  aiIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  aiIndicatorText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    padding: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 15,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  inputSmall: {
    textAlign: "center",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Tips Card
  tipsCard: {
    backgroundColor: colors.secondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
  tipsTitle: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // Bottom Actions
  bottomActions: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextText: {
    ...typography.button,
    color: colors.white,
  },
});
