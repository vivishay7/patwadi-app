import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Dropoff">;

export default function DropoffScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Dropoff Location</Text>
        <Text style={styles.subtitle}>
          Select or confirm your dropoff address.
        </Text>

        {/* Placeholder for location picker */}
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            📍 Location picker coming soon
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("ParcelDetails")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Next → Parcel Details</Text>
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
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  placeholder: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonText: {
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
