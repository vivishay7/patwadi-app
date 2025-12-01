import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ConfirmOrder">;

export default function ConfirmOrderScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Static placeholders for now – later we pass real data via params / store
  const summary = {
    pickup: "Pickup: Connaught Place, Delhi",
    dropoff: "Drop: Bani Park, Jaipur",
    parcel: "Parcel: Books • ~1.5kg",
    price: "Estimated: ₹199 - ₹249",
  };

  const handleConfirm = () => {
    // Later: create order in Supabase + trigger WhatsApp
    navigation.navigate("Main");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Confirm Order</Text>
        <Text style={styles.subtitle}>
          Review your details before we schedule your parcel on a bus.
        </Text>

        <View style={styles.card}>
          <Text style={styles.line}>{summary.pickup}</Text>
          <Text style={styles.line}>{summary.dropoff}</Text>
          <Text style={styles.line}>{summary.parcel}</Text>
          <Text style={[styles.line, styles.priceLine]}>{summary.price}</Text>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmText}>Confirm & Create Order</Text>
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
  line: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  priceLine: {
    fontWeight: "700",
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.xxxl,
  },
  confirmText: {
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
