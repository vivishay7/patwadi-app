import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { calculatePriceEstimate } from "../../services/orderService";
import { LocationData } from "../../types/location";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PriceEstimate">;
type RouteProps = RouteProp<RootStackParamList, "PriceEstimate">;

export default function PriceEstimateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const pickup = route.params?.pickup;
  const dropoff = route.params?.dropoff;
  const packageInfo = route.params?.packageInfo;
  const corridorKey = route.params?.corridorKey;

  // Extract data from packageInfo or fallback to route params
  const weight = packageInfo?.weight;
  const dimensions = packageInfo?.dimensions;
  const contents = packageInfo?.contents;

  // Calculate base price estimate
  const basePrice = pickup && dropoff ? calculatePriceEstimate(pickup, dropoff) : 0;

  // Add packaging charges
  const packagingCharge = packageInfo?.packagingCharge || 0;

  // Apply discount for 48hrs priority only
  const discount = packageInfo?.discount || 0;

  // Calculate final price
  const finalPrice = Math.max(0, basePrice + packagingCharge - discount);

  const estimate = finalPrice > 0 ? `₹${finalPrice}` : "Calculating...";
  const baseEstimate = basePrice > 0 ? `Base: ₹${basePrice}` : "";
  const priorityLabel =
    packageInfo?.priority === "24hrs"
      ? "Next corridor slot"
      : packageInfo?.priority === "48hrs"
        ? "Scheduled intercity (₹5 off)"
        : "Standard corridor";
  const eta =
    packageInfo?.priority === "24hrs"
      ? "Next available corridor departure"
      : packageInfo?.priority === "48hrs"
        ? "Scheduled intercity delivery"
        : "Standard corridor timing";
  const routeText = pickup && dropoff
    ? `${pickup.placeName?.split(",")[0] || pickup.address} → ${dropoff.placeName?.split(",")[0] || dropoff.address}`
    : "Route";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Price Estimate</Text>
        <Text style={styles.subtitle}>
          This is an early estimate. Final price may change based on measured weight
          and packaging.
        </Text>

        {/* Progress indicator */}
        <View style={styles.progress}>
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, styles.progressActive]} />
        </View>
        <Text style={styles.stepLabel}>Step 4 of 5</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Estimated Price</Text>
          <Text style={styles.price}>{estimate}</Text>
          {baseEstimate && <Text style={styles.basePrice}>{baseEstimate}</Text>}
          {packagingCharge > 0 && (
            <Text style={styles.charge}>Packaging: +₹{packagingCharge}</Text>
          )}
          {discount > 0 && (
            <Text style={styles.discount}>Discount: -₹{discount}</Text>
          )}

          <Text style={styles.label}>Route</Text>
          <Text style={styles.value}>{routeText}</Text>

          <Text style={styles.label}>Delivery Speed</Text>
          <Text style={styles.value}>{eta}</Text>
          <Text style={styles.value}>{priorityLabel}</Text>

          <Text style={styles.value}>Door-to-Door Delivery</Text>
          {packageInfo?.preferredSlot && (
            <Text style={styles.value}>
              Preferred Slot: {packageInfo.preferredSlot}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => {
            navigation.navigate("ConfirmOrder", {
              pickup,
              dropoff,
              packageInfo,
              priceEstimate: finalPrice > 0 ? finalPrice : undefined,
              corridorKey,
            });
          }}
          activeOpacity={0.8}
          disabled={finalPrice === 0 || !pickup || !dropoff}
        >
          <Text style={styles.nextText}>Continue to confirmation →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
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
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
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
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.xs,
  },
  basePrice: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  charge: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  discount: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.xs,
    fontWeight: "600",
  },
  value: {
    ...typography.body,
    fontWeight: "500",
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.xxxl,
  },
  nextText: {
    ...typography.button,
    color: colors.white,
  },
  backBtn: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
