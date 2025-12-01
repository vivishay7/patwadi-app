import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../../theme/colors";
import { spacing, radius, typography } from "../../../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/RootNavigator";
import { useAuth } from "../../../context/AuthContext";
import { saveDriverBusData } from "../../../lib/api/driver";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "DriverBusDetails">;

export default function DriverBusDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [operatorName, setOperatorName] = useState("");
  const [routes, setRoutes] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!user) return;

    // Basic validation
    if (!operatorName.trim()) {
      Alert.alert("Required", "Please enter the bus operator name.");
      return;
    }

    if (!routes.trim()) {
      Alert.alert("Required", "Please enter at least one route.");
      return;
    }

    setLoading(true);

    try {
      const routeList = routes.split(",").map((r) => r.trim()).filter(Boolean);

      const result = await saveDriverBusData(user.id, {
        operatorName,
        routes: routeList,
        vehicleNumber,
        capacity: parseInt(capacity, 10) || 0,
      });

      if (result.error) {
        Alert.alert("Error", result.error);
        setLoading(false);
        return;
      }

      navigation.navigate("DriverTerms");
    } catch (error) {
      console.error("Bus details save error:", error);
      Alert.alert("Error", "Failed to save bus details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress indicator */}
        <View style={styles.progress}>
          <View style={[styles.progressDot, styles.progressCompleted]} />
          <View style={[styles.progressLine, styles.progressLineCompleted]} />
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>

        <Text style={styles.stepLabel}>Step 2 of 3</Text>
        <Text style={styles.title}>Bus & Route Details</Text>
        <Text style={styles.subtitle}>
          Tell us about the buses you operate and your regular routes.
        </Text>

        {/* Operator Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bus Operator Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Rajasthan Roadways"
            placeholderTextColor={colors.textSecondary}
            value={operatorName}
            onChangeText={setOperatorName}
          />
        </View>

        {/* Routes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Routes (comma separated)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="e.g., Delhi-Jaipur, Jaipur-Udaipur"
            placeholderTextColor={colors.textSecondary}
            value={routes}
            onChangeText={setRoutes}
            multiline
          />
          <Text style={styles.helperText}>
            Enter all routes you regularly cover, separated by commas.
          </Text>
        </View>

        {/* Vehicle Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Number (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., RJ-14-PA-1234"
            placeholderTextColor={colors.textSecondary}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            autoCapitalize="characters"
          />
        </View>

        {/* Capacity */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parcel Capacity (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="How many kg can you carry?"
            placeholderTextColor={colors.textSecondary}
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {loading ? "Saving..." : "Continue"}
          </Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Back</Text>
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
    paddingBottom: spacing.massive,
  },

  // Progress
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderLight,
  },
  progressActive: {
    backgroundColor: colors.primary,
  },
  progressCompleted: {
    backgroundColor: colors.success,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
  },
  progressLineCompleted: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },

  // Header
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },

  // Inputs
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Buttons
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.white,
  },
  backButton: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  backText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

