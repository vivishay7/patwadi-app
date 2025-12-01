import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PriceEstimate">;

export default function PriceEstimateScreen() {
  const navigation = useNavigation<NavigationProp>();

  // For now, static values - later we compute using real data
  const estimate = "₹199 - ₹249";
  const eta = "Overnight on bus corridor";
  const route = "Delhi → Jaipur (example)";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Price Estimate</Text>
        <Text style={styles.subtitle}>
          This is an early estimate. Final price may change based on exact depot
          & weight.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Estimated Price</Text>
          <Text style={styles.price}>{estimate}</Text>

          <Text style={styles.label}>Route</Text>
          <Text style={styles.value}>{route}</Text>

          <Text style={styles.label}>Delivery Speed</Text>
          <Text style={styles.value}>{eta}</Text>
        </View>

        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => navigation.navigate("ConfirmOrder")}
          activeOpacity={0.8}
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
