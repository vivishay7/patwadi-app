/**
 * CameraMeasureScreen
 * Camera interface for capturing parcel images for AI dimension estimation
 * Falls back to image picker if camera module is not available (Expo Go)
 */

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { HomeStackParamList } from "../../navigation/HomeStack";

// Try to import camera - it may not be available in Expo Go
let CameraView: any = null;
let useCameraPermissions: any = null;
let CameraType: any = null;

try {
  const cameraModule = require("expo-camera");
  CameraView = cameraModule.CameraView;
  useCameraPermissions = cameraModule.useCameraPermissions;
  CameraType = cameraModule.CameraType;
} catch (error) {
  console.log("Camera module not available, using image picker fallback");
}

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "CameraMeasure">;
type RouteProps = RouteProp<HomeStackParamList, "CameraMeasure">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isCameraAvailable = !!CameraView && !!useCameraPermissions;

export default function CameraMeasureScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  
  // Camera state (only if camera is available)
  const [cameraPermission, requestCameraPermission] = isCameraAvailable 
    ? useCameraPermissions() 
    : [null, null];
  const [facing, setFacing] = useState<any>("back");
  const [flash, setFlash] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  // Image picker state (fallback)
  const [imagePickerPermission, setImagePickerPermission] = useState<boolean | null>(null);

  // Request permissions on mount
  useEffect(() => {
    if (isCameraAvailable && cameraPermission && !cameraPermission.granted) {
      requestCameraPermission?.();
    } else if (!isCameraAvailable) {
      // Request image picker permissions as fallback
      ImagePicker.requestMediaLibraryPermissionsAsync().then(({ status }) => {
        setImagePickerPermission(status === "granted");
      });
    }
  }, []);

  const toggleFlash = () => {
    setFlash(!flash);
  };

  const takePhotoWithCamera = async () => {
    if (!cameraRef.current || isCapturing || !isCameraAvailable) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (photo?.uri) {
        navigation.navigate("CameraMeasureResult", {
          imagePath: photo.uri,
        });
      } else {
        Alert.alert("Error", "Failed to capture photo. Please try again.");
      }
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        navigation.navigate("CameraMeasureResult", {
          imagePath: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhotoWithPicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          "Camera Permission Required",
          "We need camera access to scan your parcel. Please grant permission in settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => ImagePicker.requestCameraPermissionsAsync() },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        navigation.navigate("CameraMeasureResult", {
          imagePath: result.assets[0].uri,
        });
      }
    } catch (error) {
      console.error("Camera picker error:", error);
      Alert.alert("Error", "Failed to open camera. Please try again.");
    }
  };

  // If camera module is not available, show image picker UI
  if (!isCameraAvailable) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Capture Parcel Image</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Text style={styles.infoText}>
              Using image picker. For best experience, build a custom development build with camera support.
            </Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsIcon}>
              <Ionicons name="cube-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.instructionsTitle}>Scan Your Parcel</Text>
            <Text style={styles.instructionsText}>
              Take or select a photo of your parcel. Make sure the parcel is clearly visible and well-lit.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={takePhotoWithPicker}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={24} color={colors.white} />
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={pickImageFromLibrary}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={24} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Tips for best results</Text>
            <View style={styles.tipItem}>
              <Ionicons name="sunny-outline" size={16} color={colors.warning} />
              <Text style={styles.tipText}>Use good lighting</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="cube-outline" size={16} color={colors.primary} />
              <Text style={styles.tipText}>Keep camera steady</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="resize-outline" size={16} color={colors.info} />
              <Text style={styles.tipText}>Show the full parcel</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera UI (if camera module is available)
  const permission = cameraPermission;
  const requestPermission = requestCameraPermission;

  // Permission not yet determined
  if (!permission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.permissionText}>Checking camera permission...</Text>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan and estimate your parcel dimensions.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={flash}
      >
        {/* Top Bar */}
        <SafeAreaView style={styles.topBar} edges={["top"]}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>

          <Text style={styles.topTitle}>Scan Parcel</Text>

          <TouchableOpacity
            style={styles.topButton}
            onPress={toggleFlash}
            activeOpacity={0.7}
          >
            <Ionicons
              name={flash ? "flash" : "flash-off"}
              size={24}
              color={colors.white}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Overlay Guide Box */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanBox}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionsBadge}>
            <Ionicons name="cube-outline" size={18} color={colors.white} />
            <Text style={styles.instructionsText}>
              Align your parcel within the frame
            </Text>
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          {/* Tips */}
          <View style={styles.tips}>
            <Text style={styles.tipText}>• Good lighting improves accuracy</Text>
            <Text style={styles.tipText}>• Keep camera steady</Text>
          </View>

          {/* Capture Button */}
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={takePhotoWithCamera}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>

          {/* Manual Entry Link */}
          <TouchableOpacity
            style={styles.manualLink}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.manualLinkText}>Enter manually instead</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
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
  camera: {
    flex: 1,
  },

  // Header (for image picker fallback)
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {},
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 28,
  },

  // Info Banner
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E3F2FD",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
  },

  // Instructions Card
  instructionsCard: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  instructionsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  instructionsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  instructionsText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Actions Container
  actionsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tipsTitle: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // Top Bar (camera view)
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  topButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    ...typography.h3,
    color: colors.white,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTop: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayMiddle: {
    flexDirection: "row",
  },
  overlaySide: {
    width: (SCREEN_WIDTH - SCREEN_WIDTH * 0.8) / 2,
    height: SCREEN_WIDTH * 0.75 * 0.75,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayBottom: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanBox: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.75 * 0.75,
    position: "relative",
  },

  // Corner markers
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },

  // Instructions
  instructionsContainer: {
    position: "absolute",
    top: "25%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  instructionsText: {
    ...typography.bodySmall,
    color: colors.white,
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.xl,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  tips: {
    marginBottom: spacing.xl,
  },
  tipText: {
    ...typography.caption,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
  },
  manualLink: {
    paddingVertical: spacing.sm,
  },
  manualLinkText: {
    ...typography.bodySmall,
    color: colors.white,
    textDecorationLine: "underline",
  },

  // Permission Screen
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  permissionContent: {
    alignItems: "center",
    maxWidth: 300,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.white,
  },
  backLink: {
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
