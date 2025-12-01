import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DriverHome() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Driver Dashboard</Text>

        {/* Availability toggle */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={styles.statusValue}>Available</Text>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Parcels on Your Route</Text>

        {/* CARD 1 */}
        <TouchableOpacity
          style={styles.parcelCard}
          onPress={() => navigation.navigate("DriverParcels")}
          activeOpacity={0.8}
        >
          <View style={styles.parcelInfo}>
            <Text style={styles.parcelTitle}>3 Parcels available</Text>
            <Text style={styles.parcelMeta}>Delhi → Jaipur</Text>
          </View>

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View</Text>
          </View>
        </TouchableOpacity>

        {/* CARD 2 */}
        <TouchableOpacity
          style={styles.parcelCard}
          onPress={() => navigation.navigate("DriverParcels")}
          activeOpacity={0.8}
        >
          <View style={styles.parcelInfo}>
            <Text style={styles.parcelTitle}>1 Parcel available</Text>
            <Text style={styles.parcelMeta}>Gurgaon → Kota</Text>
          </View>

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: spacing.massive + spacing.massive,
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },

  /* Status card */
  statusCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  statusLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statusValue: {
    ...typography.h3,
    color: colors.primary,
  },

  /* Section title */
  sectionTitle: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  /* Parcel card */
  parcelCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  parcelInfo: {
    flex: 1,
  },
  parcelTitle: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  parcelMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  /* View button */
  viewButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  viewButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});
