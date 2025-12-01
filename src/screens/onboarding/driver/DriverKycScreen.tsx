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
import { saveDriverKyc } from "../../../lib/api/driver";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "DriverKyc">;

export default function DriverKycScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [photoTaken, setPhotoTaken] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = () => {
    // Placeholder for camera functionality
    Alert.alert(
      "Photo Upload",
      "Camera integration coming soon. For now, we'll proceed without a photo.",
      [{ text: "OK", onPress: () => setPhotoTaken(true) }]
    );
  };

  const handleContinue = async () => {
    if (!user) return;

    // Basic validation
    if (aadhaarNumber.length < 12) {
      Alert.alert("Invalid Aadhaar", "Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    if (licenseNumber.length < 5) {
      Alert.alert("Invalid License", "Please enter a valid driving license number.");
      return;
    }

    setLoading(true);

    try {
      const result = await saveDriverKyc(user.id, {
        aadhaarNumber,
        licenseNumber,
        photoUri: photoTaken ? "placeholder" : undefined,
      });

      if (result.error) {
        Alert.alert("Error", result.error);
        setLoading(false);
        return;
      }

      navigation.navigate("DriverBusDetails");
    } catch (error) {
      console.error("KYC save error:", error);
      Alert.alert("Error", "Failed to save KYC details. Please try again.");
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
          <View style={[styles.progressDot, styles.progressActive]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>

        <Text style={styles.stepLabel}>Step 1 of 3</Text>
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          We need some documents to verify your identity before you can start
          accepting parcels.
        </Text>

        {/* Aadhaar Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Aadhaar Card Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 12-digit Aadhaar number"
            placeholderTextColor={colors.textSecondary}
            value={aadhaarNumber}
            onChangeText={setAadhaarNumber}
            keyboardType="numeric"
            maxLength={12}
          />
        </View>

        {/* License Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Driving License Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter license number"
            placeholderTextColor={colors.textSecondary}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            autoCapitalize="characters"
          />
        </View>

        {/* Photo Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Live Photo</Text>
          <TouchableOpacity
            style={[styles.photoButton, photoTaken && styles.photoButtonSuccess]}
            onPress={handleTakePhoto}
            activeOpacity={0.8}
          >
            <Ionicons
              name={photoTaken ? "checkmark-circle" : "camera-outline"}
              size={24}
              color={photoTaken ? colors.success : colors.primary}
            />
            <Text
              style={[styles.photoButtonText, photoTaken && styles.photoButtonTextSuccess]}
            >
              {photoTaken ? "Photo Added" : "Take a Selfie"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            This helps us verify that you are a real person.
          </Text>
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

        {/* Skip for now */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate("DriverBusDetails")}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
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
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.xs,
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
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Photo button
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
  },
  photoButtonSuccess: {
    borderColor: colors.success,
    borderStyle: "solid",
    backgroundColor: "#E8F5E9",
  },
  photoButtonText: {
    ...typography.button,
    color: colors.primary,
  },
  photoButtonTextSuccess: {
    color: colors.success,
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
  skipButton: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

