/**
 * PriceEstimateScreen
 * Shows estimated price and allows user to proceed to confirmation
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { HomeStackParamList } from "../../navigation/HomeStack";
import { calculatePriceEstimate } from "../../services/orderService";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "PriceEstimate">;
type RouteProps = RouteProp<HomeStackParamList, "PriceEstimate">;

export default function PriceEstimateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { pickup, dropoff, weight, contents } = route.params || {};

  // Calculate price estimate
  const priceEstimate = pickup && dropoff && weight
    ? calculatePriceEstimate(pickup, dropoff, weight)
    : 199;

  // Format route display
  const routeDisplay = pickup && dropoff
    ? `${pickup.placeName || pickup.address.split(",")[0]} → ${dropoff.placeName || dropoff.address.split(",")[0]}`
    : "Delhi → Jaipur (example)";

  const handleNext = () => {
    if (pickup && dropoff) {
      navigation.navigate("ConfirmOrder", {
        pickup,
        dropoff,
        weight,
        contents,
        priceEstimate,
      });
    }
  };

  const canProceed = pickup && dropoff;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.title}>Price Estimate</Text>
            <Text style={styles.subtitle}>
              Review your estimated cost
            </Text>
          </View>
        </View>

        {/* Progress indicator */}
        <View style={styles.progress}>
          <View style={[styles.progressDot, styles.progressCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>
        <Text style={styles.stepLabel}>Step 4 of 4</Text>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Estimated Price</Text>
          <Text style={styles.price}>₹{priceEstimate}</Text>
          <Text style={styles.priceNote}>
            Final price may vary based on actual weight
          </Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="navigate" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Route</Text>
              <Text style={styles.detailValue}>{routeDisplay}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="scale-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{weight || 0} kg</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Contents</Text>
              <Text style={styles.detailValue}>{contents || "Not specified"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Estimated Delivery</Text>
              <Text style={styles.detailValue}>Overnight on bus corridor</Text>
            </View>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Your parcel will be transported via our trusted bus network. 
            You'll receive updates at every stage.
          </Text>
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
          <Text style={styles.nextText}>Continue to Confirmation</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
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

  // Price Card
  priceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  priceLabel: {
    ...typography.bodySmall,
    color: "rgba(255,255,255,0.8)",
    marginBottom: spacing.sm,
  },
  price: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.white,
  },
  priceNote: {
    ...typography.caption,
    color: "rgba(255,255,255,0.7)",
    marginTop: spacing.md,
  },

  // Details Card
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },

  // Info Banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E3F2FD",
    padding: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
    lineHeight: 20,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextText: {
    ...typography.button,
    color: colors.white,
  },
});
