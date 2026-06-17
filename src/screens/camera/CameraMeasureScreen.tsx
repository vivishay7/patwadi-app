import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { Ionicons } from "@expo/vector-icons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "CameraMeasure">;

/**
 * CameraMeasureScreen - Placeholder
 *
 * Camera functionality is temporarily disabled.
 * To enable:
 * 1. Install react-native-vision-camera
 * 2. Configure camera permissions
 * 3. Uncomment the camera implementation
 */
export default function CameraMeasureScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Placeholder Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          </View>

          <Text style={styles.title}>Camera Coming Soon</Text>
          <Text style={styles.subtitle}>
            The camera feature is being set up.{"\n"}
            You can manually enter dimensions for now.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Go Back & Enter Manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// FULL CAMERA IMPLEMENTATION (to be enabled later)
/*
import { useState, useRef } from "react";
import { Camera, useCameraDevices } from "react-native-vision-camera";

export default function CameraMeasureScreenFull() {
  const navigation = useNavigation<NavigationProp>();
  const devices = useCameraDevices();
  const device = devices.back;

  const cameraRef = useRef<Camera>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  if (!device) {
    return (
      <View style={styles.center}>
        <Text>No camera available</Text>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePhoto({
        flash: "off",
      });

      navigation.navigate("ParcelDetails", {
        capturedImage: photo.path,
      });
    } catch (error) {
      console.log("Capture error:", error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.captureBtn}
          onPress={takePhoto}
          disabled={isCapturing}
        />
      </View>

      <TouchableOpacity
        style={styles.backBtnCamera}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backTextCamera}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}
*/

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
  },
  backBtn: {
    marginBottom: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },

  // Camera styles (for future use)
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  backBtnCamera: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
    backgroundColor: colors.overlayLight,
    borderRadius: 10,
  },
  backTextCamera: {
    color: colors.white,
    fontSize: 16,
  },
});
