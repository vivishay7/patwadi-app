import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import colors from "../../theme/colors";
import { spacing, radius, typography } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { estimateDimensionsFromImage } from "../../lib/dimensionAI";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import {
  validateDimensions,
  autoSelectPackaging,
  getPackagingCharge,
} from "../../utils/validation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PackageInfo">;
type RouteProps = RouteProp<RootStackParamList, "PackageInfo">;

type PackageType = "document" | "electronics" | "clothing" | "food" | "fragile" | "other";
type PackagingType = "mailer" | "box-small" | "box-medium" | "box-large" | null;
type DeliverySlot = "morning" | "afternoon" | "evening" | "night" | null;
type PriorityType = "24hrs" | "48hrs";

interface PackageInfo {
  packageType: PackageType | null;
  contents: string;
  packageValue: string; // Estimated value in INR
  insuranceOptIn: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  dimensionErrors: {
    length?: string;
    width?: string;
    height?: string;
  };
  unit: "cm" | "inches";
  imageUri: string | null;
  needsPackaging: boolean;
  packagingType: PackagingType;
  packagingCharge: number;
  doorToDoor: boolean;
  priority: PriorityType | null;
  preferredSlot: DeliverySlot;
  discount: number;
  legalAgreed: boolean;
}

type RequiredFieldKey =
  | "packageType"
  | "contents"
  | "packageValue"
  | "dimensions"
  | "weight"
  | "legalAgreed";

type ScrollSectionKey = "contents" | "packageValue" | "dimensions" | "weight" | "extras";

function getMissingFields(info: PackageInfo): RequiredFieldKey[] {
  const missing: RequiredFieldKey[] = [];
  if (!info.packageType) missing.push("packageType");
  if (!info.contents.trim()) missing.push("contents");
  if (!info.packageValue.trim()) missing.push("packageValue");
  const dimsIncomplete =
    !info.dimensions.length.trim() ||
    !info.dimensions.width.trim() ||
    !info.dimensions.height.trim();
  const dimsInvalid =
    !!info.dimensionErrors.length ||
    !!info.dimensionErrors.width ||
    !!info.dimensionErrors.height;
  if (dimsIncomplete || dimsInvalid) missing.push("dimensions");
  const weightNum = parseFloat(info.weight);
  if (!info.weight.trim() || isNaN(weightNum) || weightNum <= 0) missing.push("weight");
  if (!info.legalAgreed) missing.push("legalAgreed");
  return missing;
}

const MISSING_FIELD_LABELS: Record<RequiredFieldKey, string> = {
  packageType: "Package type",
  contents: "Contents",
  packageValue: "Estimated package value",
  dimensions: "Dimensions (L × W × H)",
  weight: "Weight (kg)",
  legalAgreed: "Legal contents confirmation",
};

export default function PackageInfoScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { isGuest } = useAuth();

  const [packageInfo, setPackageInfo] = useState<PackageInfo>({
    packageType: null,
    contents: "",
    packageValue: "",
    insuranceOptIn: false,
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    dimensionErrors: {},
    unit: "cm",
    imageUri: null,
    needsPackaging: false,
    packagingType: null,
    packagingCharge: 0,
    doorToDoor: true,
    priority: null,
    preferredSlot: null,
    discount: 0,
    legalAgreed: false,
  });

  const [loadingAI, setLoadingAI] = useState(false);
  const [showMissingHints, setShowMissingHints] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<ScrollSectionKey, number>>>({});
  const completionRef = useRef({
    packageType: false,
    contents: false,
    packageValue: false,
    dimensions: false,
    weight: false,
  });
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const lengthInputRef = useRef<TextInput>(null);
  const widthInputRef = useRef<TextInput>(null);
  const heightInputRef = useRef<TextInput>(null);
  const canProceedRef = useRef(false);

  // Handle keyboard events to auto-scroll to focused input
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        // Find which input is focused and scroll to it
        const focusedInput = Object.keys(inputRefs.current).find(
          (key) => inputRefs.current[key]?.isFocused()
        );
        if (focusedInput && scrollViewRef.current) {
          // Scroll to the focused input with some padding
          setTimeout(() => {
            inputRefs.current[focusedInput]?.measureLayout(
              scrollViewRef.current as any,
              (x, y) => {
                scrollViewRef.current?.scrollTo({
                  y: y - 100, // Add padding above input
                  animated: true,
                });
              },
              () => {}
            );
          }, 100);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Optionally scroll back when keyboard hides
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Removed BackHandler redirect - allow normal back navigation

  const packageTypes: { type: PackageType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { type: "document", label: "Document", icon: "document-text-outline" },
    { type: "electronics", label: "Electronics", icon: "phone-portrait-outline" },
    { type: "clothing", label: "Clothing", icon: "shirt-outline" },
    { type: "food", label: "Food", icon: "restaurant-outline" },
    { type: "fragile", label: "Fragile", icon: "warning-outline" },
    { type: "other", label: "Other", icon: "cube-outline" },
  ];

  // Auto-select packaging based on dimensions and fragility
  useEffect(() => {
    if (
      packageInfo.needsPackaging &&
      packageInfo.dimensions.length &&
      packageInfo.dimensions.width &&
      packageInfo.dimensions.height
    ) {
      const length = parseFloat(packageInfo.dimensions.length) || 0;
      const width = parseFloat(packageInfo.dimensions.width) || 0;
      const height = parseFloat(packageInfo.dimensions.height) || 0;

      if (length > 0 && width > 0 && height > 0) {
        const isFragile = packageInfo.packageType === "fragile";
        const autoPackaging = autoSelectPackaging(
          length,
          width,
          height,
          packageInfo.unit,
          isFragile
        );

        setPackageInfo({
          ...packageInfo,
          packagingType: autoPackaging as PackagingType,
          packagingCharge: getPackagingCharge(autoPackaging),
        });
      }
    }
  }, [
    packageInfo.dimensions,
    packageInfo.unit,
    packageInfo.needsPackaging,
    packageInfo.packageType,
  ]);

  // Validate dimensions when they change (using ref to avoid stale closure)
  const validateDimensionField = useCallback((
    field: "length" | "width" | "height",
    value: string,
    currentDimensions: { length: string; width: string; height: string },
    unit: "cm" | "inches"
  ) => {
    const numValue = parseFloat(value);
    if (value && !isNaN(numValue) && numValue > 0) {
      // Get other dimensions
      const length =
        field === "length"
          ? numValue
          : parseFloat(currentDimensions.length) || 0;
      const width =
        field === "width"
          ? numValue
          : parseFloat(currentDimensions.width) || 0;
      const height =
        field === "height"
          ? numValue
          : parseFloat(currentDimensions.height) || 0;

      // Validate if all dimensions are present
      if (
        (field === "length" && width > 0 && height > 0) ||
        (field === "width" && length > 0 && height > 0) ||
        (field === "height" && length > 0 && width > 0)
      ) {
        const validation = validateDimensions(
          length,
          width,
          height,
          unit
        );
        if (!validation.isValid) {
          setPackageInfo((prev) => ({
            ...prev,
            dimensionErrors: {
              ...prev.dimensionErrors,
              [field]: validation.error,
            },
          }));
          return;
        }
      }
    }

    // Clear error for this field
    setPackageInfo((prev) => {
      const newErrors = { ...prev.dimensionErrors };
      delete newErrors[field];
      return {
        ...prev,
        dimensionErrors: newErrors,
      };
    });
  }, []);

  const deliverySlots: { slot: DeliverySlot; label: string; time: string }[] = [
    { slot: "morning", label: "Morning", time: "6-9 AM" },
    { slot: "afternoon", label: "Afternoon", time: "12 PM - 3 PM" },
    { slot: "evening", label: "Evening", time: "5 PM - 8 PM" },
    { slot: "night", label: "Night", time: "9 PM - 11 PM" },
  ];

  const handleSectionLayout = useCallback(
    (key: ScrollSectionKey) => (event: LayoutChangeEvent) => {
      sectionOffsets.current[key] = event.nativeEvent.layout.y;
    },
    []
  );

  const scrollToSection = useCallback((key: ScrollSectionKey) => {
    const y = sectionOffsets.current[key];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
  }, []);

  const togglePriority = (selected: PriorityType) => {
    if (packageInfo.priority === selected) {
      setPackageInfo({ ...packageInfo, priority: null, discount: 0 });
    } else {
      setPackageInfo({
        ...packageInfo,
        priority: selected,
        discount: selected === "48hrs" ? 5 : 0,
      });
    }
  };

  // Handle image upload
  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result;
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Camera permission is required to take photos");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setPackageInfo({ ...packageInfo, imageUri: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
      console.error(error);
    }
  };

  // Run AI estimation when image is selected
  useEffect(() => {
    async function runAI() {
      if (!packageInfo.imageUri) return;

      setLoadingAI(true);
      try {
        const result = await estimateDimensionsFromImage(packageInfo.imageUri);
        if (result) {
          const conversionFactor = packageInfo.unit === "inches" ? 0.393701 : 1;
          setPackageInfo({
            ...packageInfo,
            dimensions: {
              length: String((result.estimated_length_cm * conversionFactor).toFixed(1)),
              width: String((result.estimated_width_cm * conversionFactor).toFixed(1)),
              height: String((result.estimated_height_cm * conversionFactor).toFixed(1)),
            },
          });
        }
      } catch (error) {
        console.error("AI estimation error:", error);
      } finally {
        setLoadingAI(false);
      }
    }

    runAI();
  }, [packageInfo.imageUri]);


  const canProceed =
    packageInfo.packageType &&
    packageInfo.contents.trim() &&
    packageInfo.packageValue.trim() &&
    packageInfo.weight.trim() &&
    parseFloat(packageInfo.weight) > 0 &&
    packageInfo.dimensions.length &&
    packageInfo.dimensions.width &&
    packageInfo.dimensions.height &&
    !packageInfo.dimensionErrors.length &&
    !packageInfo.dimensionErrors.width &&
    !packageInfo.dimensionErrors.height &&
    packageInfo.legalAgreed;

  const missingFields = getMissingFields(packageInfo);
  canProceedRef.current = !!canProceed;

  useEffect(() => {
    const prev = completionRef.current;
    const now = {
      packageType: !!packageInfo.packageType,
      contents: !!packageInfo.contents.trim(),
      packageValue: !!packageInfo.packageValue.trim(),
      dimensions:
        !!packageInfo.dimensions.length.trim() &&
        !!packageInfo.dimensions.width.trim() &&
        !!packageInfo.dimensions.height.trim() &&
        !packageInfo.dimensionErrors.length &&
        !packageInfo.dimensionErrors.width &&
        !packageInfo.dimensionErrors.height,
      weight:
        !!packageInfo.weight.trim() &&
        !isNaN(parseFloat(packageInfo.weight)) &&
        parseFloat(packageInfo.weight) > 0,
    };

    if (!prev.packageType && now.packageType) scrollToSection("contents");
    else if (!prev.contents && now.contents) scrollToSection("packageValue");
    else if (!prev.packageValue && now.packageValue) scrollToSection("dimensions");
    else if (!prev.dimensions && now.dimensions) scrollToSection("weight");
    else if (!prev.weight && now.weight) scrollToSection("extras");

    completionRef.current = now;
  }, [
    packageInfo.packageType,
    packageInfo.contents,
    packageInfo.packageValue,
    packageInfo.dimensions.length,
    packageInfo.dimensions.width,
    packageInfo.dimensions.height,
    packageInfo.dimensionErrors.length,
    packageInfo.dimensionErrors.width,
    packageInfo.dimensionErrors.height,
    packageInfo.weight,
    scrollToSection,
  ]);

  useEffect(() => {
    if (canProceed) setShowMissingHints(false);
  }, [canProceed]);

  const revealMissingHintsIfAtScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const scrollableHeight = contentSize.height - layoutMeasurement.height;
      if (scrollableHeight <= 0) {
        if (!canProceedRef.current) setShowMissingHints(true);
        return;
      }
      const scrolledRatio = contentOffset.y / scrollableHeight;
      const atEnd =
        scrolledRatio >= 0.9 ||
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
      if (atEnd && !canProceedRef.current) {
        setShowMissingHints(true);
      }
    },
    []
  );

  const handleDimensionChange = (
    field: "length" | "width" | "height",
    text: string,
    nextInputRef?: React.RefObject<TextInput | null>
  ) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, 2);
    const newDimensions = { ...packageInfo.dimensions, [field]: digitsOnly };
    setPackageInfo({
      ...packageInfo,
      dimensions: newDimensions,
    });
    setTimeout(() => {
      validateDimensionField(field, digitsOnly, newDimensions, packageInfo.unit);
    }, 100);
    if (digitsOnly.length === 2) {
      nextInputRef?.current?.focus();
    }
  };

  const highlight = (field: RequiredFieldKey) =>
    showMissingHints && missingFields.includes(field);

  const handleNextPress = () => {
    if (!canProceed) {
      setShowMissingHints(true);
      return;
    }
    handleNext();
  };

  const handleNext = () => {
    const dimensions = {
      length: parseFloat(packageInfo.dimensions.length) || 0,
      width: parseFloat(packageInfo.dimensions.width) || 0,
      height: parseFloat(packageInfo.dimensions.height) || 0,
    };

    navigation.navigate("Pickup", {
      packageInfo: {
        ...packageInfo,
        weight: parseFloat(packageInfo.weight) || 0,
        dimensions,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          onScroll={revealMissingHintsIfAtScrollEnd}
          onScrollEndDrag={revealMissingHintsIfAtScrollEnd}
          onMomentumScrollEnd={revealMissingHintsIfAtScrollEnd}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (isGuest) {
                  navigation.replace("Splash");
                } else {
                  navigation.goBack();
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Package Details</Text>
              <Text style={styles.subtitle}>Tell us about your package</Text>
            </View>
          </View>

          {/* Progress indicator */}
          <View style={styles.progress}>
            <View style={[styles.progressDot, styles.progressActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepLabel}>Step 1 of 5</Text>

          {/* Package Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, highlight("packageType") && styles.sectionTitleMissing]}>
              Package Type *
            </Text>
            <View style={[styles.typeGrid, highlight("packageType") && styles.typeGridMissing]}>
              {packageTypes.map((pkg) => (
                <TouchableOpacity
                  key={pkg.type}
                  style={[
                    styles.typeCard,
                    packageInfo.packageType === pkg.type && styles.typeCardSelected,
                  ]}
                  onPress={() => setPackageInfo({ ...packageInfo, packageType: pkg.type })}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={pkg.icon}
                    size={24}
                    color={packageInfo.packageType === pkg.type ? colors.white : colors.primary}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      packageInfo.packageType === pkg.type && styles.typeLabelSelected,
                    ]}
                  >
                    {pkg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {highlight("packageType") && (
              <Text style={styles.missingHint}>Select a package type to continue</Text>
            )}
          </View>

          {/* Contents */}
          <View style={styles.section} onLayout={handleSectionLayout("contents")}>
            <Text style={[styles.sectionTitle, highlight("contents") && styles.sectionTitleMissing]}>
              Contents *
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                highlight("contents") && styles.inputError,
              ]}
              placeholder="e.g. Books, clothes, documents..."
              placeholderTextColor={colors.textSecondary}
              value={packageInfo.contents}
              onChangeText={(text) => setPackageInfo({ ...packageInfo, contents: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {highlight("contents") && (
              <Text style={styles.missingHint}>Describe what you are sending</Text>
            )}
          </View>

          {/* Package Value */}
          <View style={styles.section} onLayout={handleSectionLayout("packageValue")}>
            <Text style={[styles.sectionTitle, highlight("packageValue") && styles.sectionTitleMissing]}>
              Estimated Package Value (₹) *
            </Text>
            <TextInput
              style={[styles.input, highlight("packageValue") && styles.inputError]}
              placeholder="e.g., 5000"
              placeholderTextColor={colors.textSecondary}
              value={packageInfo.packageValue}
              onChangeText={(text) => {
                // Only allow digits
                const digitsOnly = text.replace(/\D/g, "");
                setPackageInfo({
                  ...packageInfo,
                  packageValue: digitsOnly,
                  // Disable insurance if value is cleared
                  insuranceOptIn: digitsOnly ? packageInfo.insuranceOptIn : false,
                });
              }}
              keyboardType="number-pad"
            />
            <Text style={styles.hint}>
              Required for insurance coverage
            </Text>
            {highlight("packageValue") && (
              <Text style={styles.missingHint}>Enter estimated value in rupees (digits only)</Text>
            )}
          </View>

          {/* Insurance */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={styles.switchText}>Insurance Coverage</Text>
              </View>
              <Switch
                value={packageInfo.insuranceOptIn}
                onValueChange={(value) => {
                  if (value && !packageInfo.packageValue.trim()) {
                    Alert.alert(
                      "Package Value Required",
                      "Please enter the estimated package value to enable insurance coverage."
                    );
                    return;
                  }
                  setPackageInfo({ ...packageInfo, insuranceOptIn: value });
                }}
                trackColor={{ false: colors.borderLight, true: colors.secondary }}
                thumbColor={packageInfo.insuranceOptIn ? colors.primary : colors.white}
                disabled={!packageInfo.packageValue.trim()}
              />
            </View>
            {!packageInfo.packageValue.trim() && (
              <Text style={styles.hint}>
                Enter package value to enable insurance
              </Text>
            )}
            {packageInfo.insuranceOptIn && packageInfo.packageValue.trim() && (
              <Text style={styles.hint}>
                Insurance charges may apply for ₹{parseInt(packageInfo.packageValue || "0").toLocaleString()}
              </Text>
            )}
          </View>

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Photo (for AI estimation)</Text>
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage("camera")}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => pickImage("gallery")}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text style={styles.imageButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            {packageInfo.imageUri && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: packageInfo.imageUri }} style={styles.previewImage} />
                {loadingAI && (
                  <View style={styles.aiOverlay}>
                    <ActivityIndicator color={colors.white} />
                    <Text style={styles.aiText}>Estimating dimensions...</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Dimensions */}
          <View style={styles.section} onLayout={handleSectionLayout("dimensions")}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, highlight("dimensions") && styles.sectionTitleMissing]}>
                Dimensions *
              </Text>
              <View style={styles.unitToggle}>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    packageInfo.unit === "cm" && styles.unitButtonActive,
                  ]}
                  onPress={() => setPackageInfo({ ...packageInfo, unit: "cm" })}
                >
                  <Text
                    style={[
                      styles.unitText,
                      packageInfo.unit === "cm" && styles.unitTextActive,
                    ]}
                  >
                    cm
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitButton,
                    packageInfo.unit === "inches" && styles.unitButtonActive,
                  ]}
                  onPress={() => setPackageInfo({ ...packageInfo, unit: "inches" })}
                >
                  <Text
                    style={[
                      styles.unitText,
                      packageInfo.unit === "inches" && styles.unitTextActive,
                    ]}
                  >
                    inches
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.dimensionsRow}>
              <TextInput
                ref={lengthInputRef}
                style={[
                  styles.input,
                  styles.dimensionInput,
                  (packageInfo.dimensionErrors.length || (highlight("dimensions") && !packageInfo.dimensions.length.trim())) &&
                    styles.inputError,
                ]}
                placeholder="L"
                placeholderTextColor={colors.textSecondary}
                value={packageInfo.dimensions.length}
                onChangeText={(text) => handleDimensionChange("length", text, widthInputRef)}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
                onSubmitEditing={() => widthInputRef.current?.focus()}
              />
              <TextInput
                ref={widthInputRef}
                style={[
                  styles.input,
                  styles.dimensionInput,
                  (packageInfo.dimensionErrors.width || (highlight("dimensions") && !packageInfo.dimensions.width.trim())) &&
                    styles.inputError,
                ]}
                placeholder="W"
                placeholderTextColor={colors.textSecondary}
                value={packageInfo.dimensions.width}
                onChangeText={(text) => handleDimensionChange("width", text, heightInputRef)}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
                onSubmitEditing={() => heightInputRef.current?.focus()}
              />
              <TextInput
                ref={heightInputRef}
                style={[
                  styles.input,
                  styles.dimensionInput,
                  (packageInfo.dimensionErrors.height || (highlight("dimensions") && !packageInfo.dimensions.height.trim())) &&
                    styles.inputError,
                ]}
                placeholder="H"
                placeholderTextColor={colors.textSecondary}
                value={packageInfo.dimensions.height}
                onChangeText={(text) => handleDimensionChange("height", text)}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
              />
            </View>
            {(packageInfo.dimensionErrors.length || packageInfo.dimensionErrors.width || packageInfo.dimensionErrors.height) && (
              <View style={styles.errorContainer}>
                {packageInfo.dimensionErrors.length && (
                  <Text style={styles.errorTextSmall}>
                    Length: {packageInfo.dimensionErrors.length}
                  </Text>
                )}
                {packageInfo.dimensionErrors.width && (
                  <Text style={styles.errorTextSmall}>
                    Width: {packageInfo.dimensionErrors.width}
                  </Text>
                )}
                {packageInfo.dimensionErrors.height && (
                  <Text style={styles.errorTextSmall}>
                    Height: {packageInfo.dimensionErrors.height}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.hint}>
              Max size: {packageInfo.unit === "cm" ? "70cm x 40cm x 40cm" : '28" x 16" x 16"'} (suitcase size)
            </Text>
            {highlight("dimensions") && !packageInfo.dimensionErrors.length && !packageInfo.dimensionErrors.width && !packageInfo.dimensionErrors.height && (
              <Text style={styles.missingHint}>Enter length, width, and height</Text>
            )}
          </View>

          {/* Weight */}
          <View style={styles.section} onLayout={handleSectionLayout("weight")}>
            <Text style={[styles.sectionTitle, highlight("weight") && styles.sectionTitleMissing]}>
              Weight (kg) *
            </Text>
            <TextInput
              style={[styles.input, highlight("weight") && styles.inputError]}
              placeholder="e.g. 1.5"
              placeholderTextColor={colors.textSecondary}
              value={packageInfo.weight}
              onChangeText={(text) => setPackageInfo({ ...packageInfo, weight: text })}
              keyboardType="decimal-pad"
            />
            {highlight("weight") && (
              <Text style={styles.missingHint}>Enter package weight in kg (must be greater than 0)</Text>
            )}
          </View>

          {/* Extras: packaging, delivery options, legal agreement */}
          <View style={styles.section} onLayout={handleSectionLayout("extras")}>
          {/* Packaging */}
          <View style={styles.subSection}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="cube-outline" size={20} color={colors.primary} />
                <Text style={styles.switchText}>Need Packaging?</Text>
              </View>
              <Switch
                value={packageInfo.needsPackaging}
                onValueChange={(value) =>
                  setPackageInfo({ ...packageInfo, needsPackaging: value, packagingType: null })
                }
                trackColor={{ false: colors.borderLight, true: colors.secondary }}
                thumbColor={packageInfo.needsPackaging ? colors.primary : colors.white}
              />
            </View>
            {packageInfo.needsPackaging && (
              <View style={styles.packagingOptions}>
                <Text style={styles.label}>
                  Packaging Type {packageInfo.packagingType && "(Auto-selected)"}
                </Text>
                <View style={styles.packagingRow}>
                  {/* Mailer */}
                  <TouchableOpacity
                    style={[
                      styles.packagingCard,
                      packageInfo.packagingType === "mailer" && styles.packagingCardSelected,
                    ]}
                    onPress={() =>
                      setPackageInfo({
                        ...packageInfo,
                        packagingType: "mailer",
                        packagingCharge: getPackagingCharge("mailer"),
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={24}
                      color={packageInfo.packagingType === "mailer" ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.packagingLabel,
                        packageInfo.packagingType === "mailer" && styles.packagingLabelSelected,
                      ]}
                    >
                      Mailer
                    </Text>
                    <Text
                      style={[
                        styles.packagingPrice,
                        packageInfo.packagingType === "mailer" && styles.packagingPriceSelected,
                      ]}
                    >
                      ₹{getPackagingCharge("mailer")}
                    </Text>
                  </TouchableOpacity>

                  {/* Small Box */}
                  <TouchableOpacity
                    style={[
                      styles.packagingCard,
                      packageInfo.packagingType === "box-small" && styles.packagingCardSelected,
                    ]}
                    onPress={() =>
                      setPackageInfo({
                        ...packageInfo,
                        packagingType: "box-small",
                        packagingCharge: getPackagingCharge("box-small"),
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={24}
                      color={packageInfo.packagingType === "box-small" ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.packagingLabel,
                        packageInfo.packagingType === "box-small" && styles.packagingLabelSelected,
                      ]}
                    >
                      Small Box
                    </Text>
                    <Text
                      style={[
                        styles.packagingPrice,
                        packageInfo.packagingType === "box-small" && styles.packagingPriceSelected,
                      ]}
                    >
                      ₹{getPackagingCharge("box-small")}
                    </Text>
                  </TouchableOpacity>

                  {/* Medium Box */}
                  <TouchableOpacity
                    style={[
                      styles.packagingCard,
                      packageInfo.packagingType === "box-medium" && styles.packagingCardSelected,
                    ]}
                    onPress={() =>
                      setPackageInfo({
                        ...packageInfo,
                        packagingType: "box-medium",
                        packagingCharge: getPackagingCharge("box-medium"),
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cube"
                      size={24}
                      color={packageInfo.packagingType === "box-medium" ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.packagingLabel,
                        packageInfo.packagingType === "box-medium" && styles.packagingLabelSelected,
                      ]}
                    >
                      Medium Box
                    </Text>
                    <Text
                      style={[
                        styles.packagingPrice,
                        packageInfo.packagingType === "box-medium" && styles.packagingPriceSelected,
                      ]}
                    >
                      ₹{getPackagingCharge("box-medium")}
                    </Text>
                  </TouchableOpacity>

                  {/* Large Box */}
                  <TouchableOpacity
                    style={[
                      styles.packagingCard,
                      packageInfo.packagingType === "box-large" && styles.packagingCardSelected,
                    ]}
                    onPress={() =>
                      setPackageInfo({
                        ...packageInfo,
                        packagingType: "box-large",
                        packagingCharge: getPackagingCharge("box-large"),
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cube"
                      size={28}
                      color={packageInfo.packagingType === "box-large" ? colors.white : colors.primary}
                    />
                    <Text
                      style={[
                        styles.packagingLabel,
                        packageInfo.packagingType === "box-large" && styles.packagingLabelSelected,
                      ]}
                    >
                      Large Box
                    </Text>
                    <Text
                      style={[
                        styles.packagingPrice,
                        packageInfo.packagingType === "box-large" && styles.packagingPriceSelected,
                      ]}
                    >
                      ₹{getPackagingCharge("box-large")}
                    </Text>
                  </TouchableOpacity>
                </View>
                {packageInfo.packagingType && (
                  <Text style={styles.hint}>
                    Auto-selected based on dimensions
                    {packageInfo.packageType === "fragile" && " (Fragile items require box)"}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Door-to-Door (included) */}
          <View style={styles.subSection}>
            <View style={styles.infoCard}>
              <Ionicons name="home-outline" size={24} color={colors.primary} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Door-to-Door Delivery Included</Text>
                <Text style={styles.infoCardText}>
                  A local partner will pick up from your address and deliver directly to the
                  recipient's door.
                </Text>
              </View>
            </View>
          </View>

          {/* Delivery schedule */}
          <View style={styles.subSection}>
            <Text style={styles.sectionTitle}>Delivery schedule (optional)</Text>
            <View style={styles.priorityOptions}>
              <TouchableOpacity
                style={[
                  styles.priorityCard,
                  packageInfo.priority === "24hrs" && styles.priorityCardSelected,
                ]}
                onPress={() => togglePriority("24hrs")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="bus-outline"
                  size={24}
                  color={packageInfo.priority === "24hrs" ? colors.white : colors.primary}
                />
                <Text
                  style={[
                    styles.priorityLabel,
                    packageInfo.priority === "24hrs" && styles.priorityLabelSelected,
                  ]}
                >
                  Next corridor slot
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.priorityCard,
                  packageInfo.priority === "48hrs" && styles.priorityCardSelected,
                ]}
                onPress={() => togglePriority("48hrs")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={packageInfo.priority === "48hrs" ? colors.white : colors.primary}
                />
                <Text
                  style={[
                    styles.priorityLabel,
                    packageInfo.priority === "48hrs" && styles.priorityLabelSelected,
                  ]}
                >
                  Scheduled intercity
                </Text>
                {packageInfo.discount > 0 && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>Save ₹{packageInfo.discount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Preferred Delivery Slot */}
          <View style={styles.subSection}>
            <Text style={styles.sectionTitle}>Preferred Delivery Slot (Optional)</Text>
            <Text style={styles.hint}>We'll try our best to accommodate your preference</Text>
            <View style={styles.slotGrid}>
              {deliverySlots.map((slot) => (
                <TouchableOpacity
                  key={slot.slot}
                  style={[
                    styles.slotCard,
                    packageInfo.preferredSlot === slot.slot && styles.slotCardSelected,
                  ]}
                  onPress={() =>
                    setPackageInfo({
                      ...packageInfo,
                      preferredSlot:
                        packageInfo.preferredSlot === slot.slot ? null : slot.slot,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.slotLabel,
                      packageInfo.preferredSlot === slot.slot && styles.slotLabelSelected,
                    ]}
                  >
                    {slot.label}
                  </Text>
                  <Text
                    style={[
                      styles.slotTime,
                      packageInfo.preferredSlot === slot.slot && styles.slotTimeSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Legal Agreement */}
          <View style={styles.subSection}>
            <TouchableOpacity
              style={[
                styles.legalRow,
                highlight("legalAgreed") && styles.legalRowMissing,
              ]}
              onPress={() =>
                setPackageInfo({ ...packageInfo, legalAgreed: !packageInfo.legalAgreed })
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={packageInfo.legalAgreed ? "checkbox" : "square-outline"}
                size={24}
                color={highlight("legalAgreed") ? colors.error : colors.primary}
              />
              <Text
                style={[
                  styles.legalText,
                  highlight("legalAgreed") && styles.legalTextMissing,
                ]}
              >
                I confirm my package only contains items that are legal to send — no weapons,
                drugs, counterfeit goods, or other prohibited items.
              </Text>
            </TouchableOpacity>
            {highlight("legalAgreed") && (
              <Text style={styles.missingHint}>Please confirm your package contents are legal</Text>
            )}
          </View>
          </View>

          {/* Summary */}
          {(packageInfo.packagingCharge > 0 || packageInfo.discount > 0) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Additional Charges</Text>
              {packageInfo.packagingCharge > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Packaging</Text>
                  <Text style={styles.summaryValue}>+₹{packageInfo.packagingCharge}</Text>
                </View>
              )}
              {packageInfo.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Scheduled intercity discount</Text>
                  <Text style={[styles.summaryValue, styles.discountValue]}>
                    -₹{packageInfo.discount}
                  </Text>
                </View>
              )}
            </View>
          )}
          {showMissingHints && missingFields.length > 0 && (
            <View style={styles.missingSummary}>
              <Text style={styles.missingSummaryTitle}>Still needed to continue:</Text>
              {missingFields.map((field) => (
                <Text key={field} style={styles.missingSummaryItem}>
                  • {MISSING_FIELD_LABELS[field]}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {showMissingHints && missingFields.length > 0 && (
            <Text style={styles.missingSummaryCompact}>
              Complete {missingFields.length} required field{missingFields.length === 1 ? "" : "s"} above
            </Text>
          )}
          <TouchableOpacity
            style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
            onPress={handleNextPress}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>Next → Pickup Location</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl + 100, // Extra padding to prevent scrolling past footer, account for keyboard
    flexGrow: 1,
  },
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
  progress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  section: {
    marginBottom: spacing.xl,
  },
  subSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  sectionTitleMissing: {
    color: colors.error,
  },
  missingHint: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  missingSummary: {
    backgroundColor: colors.error + "12",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  missingSummaryTitle: {
    ...typography.label,
    color: colors.error,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  missingSummaryItem: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.xs,
  },
  missingSummaryCompact: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.sm,
    fontWeight: "500",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  typeGridMissing: {
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  typeCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  typeCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  typeLabelSelected: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  switchText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  imageButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  imageButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: "500",
  },
  imagePreview: {
    position: "relative",
    borderRadius: radius.md,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    backgroundColor: colors.borderLight,
  },
  aiOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  aiText: {
    ...typography.body,
    color: colors.white,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  unitButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
  },
  unitText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  unitTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  dimensionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dimensionInput: {
    flex: 1,
    textAlign: "center",
  },
  errorContainer: {
    marginTop: spacing.xs,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorTextSmall: {
    ...typography.caption,
    color: colors.error,
    fontSize: 10,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  packagingOptions: {
    marginTop: spacing.md,
  },
  packagingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  packagingCard: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    alignItems: "center",
    padding: spacing.md,
  },
  packagingCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  packagingLabel: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontWeight: "500",
  },
  packagingLabelSelected: {
    color: colors.white,
  },
  packagingPrice: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  packagingPriceSelected: {
    color: colors.white,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoCardText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
  },
  legalRowMissing: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.error + "08",
  },
  legalText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  legalTextMissing: {
    color: colors.error,
  },
  priorityOptions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  priorityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    alignItems: "center",
    padding: spacing.lg,
    position: "relative",
  },
  priorityCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priorityLabel: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    fontWeight: "500",
  },
  priorityLabelSelected: {
    color: colors.white,
  },
  discountBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: colors.success,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  discountText: {
    ...typography.caption,
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  slotCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  slotCardSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.primary,
  },
  slotLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  slotLabelSelected: {
    color: colors.primary,
  },
  slotTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  slotTimeSelected: {
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  summaryTitle: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  discountValue: {
    color: colors.success,
  },
  bottomActions: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

